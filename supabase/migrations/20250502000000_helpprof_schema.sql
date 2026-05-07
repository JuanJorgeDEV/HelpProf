-- HelpProf — schema, pgvector (768), RLS, hybrid search helpers, embedding webhook trigger (pg_net)
-- Substitua referências marcadas <<< ... >>> antes de aplicar ou use Supabase Secrets + configuração manual da URL da Edge Function.

-- Extensões
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  tool_category VARCHAR(120) NOT NULL,
  survival_content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  views_count INT NOT NULL DEFAULT 0 CONSTRAINT pills_views_nonneg CHECK (views_count >= 0),
  embedding extensions.vector(768),
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_pills_tool_category ON public.pills (tool_category)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pills_deleted_at_null ON public.pills (deleted_at)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pills_tags_gin ON public.pills USING gin (tags);
-- HNSW (ajuste para ivfflat se o seu projeto não suportar hnsw)
CREATE INDEX IF NOT EXISTS idx_pills_embedding_hnsw ON public.pills
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE deleted_at IS NULL AND embedding IS NOT NULL;

COMMENT ON COLUMN public.pills.embedding IS '768 dims — compatível text-embedding-004 (Gemini/Google)';

CREATE TABLE IF NOT EXISTS public.domain_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_category VARCHAR(120) NOT NULL,
  title VARCHAR(500) NOT NULL,
  deep_content TEXT NOT NULL,
  slides_embed TEXT NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_domain_guides_tool ON public.domain_guides (tool_category)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term TEXT NOT NULL,
  found_results BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_search_logs_created ON public.search_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger updated_at pills / domain_guides
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_pills_updated_at ON public.pills;
CREATE TRIGGER tr_pills_updated_at
  BEFORE UPDATE ON public.pills
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS tr_domain_guides_updated_at ON public.domain_guides;
CREATE TRIGGER tr_domain_guides_updated_at
  BEFORE UPDATE ON public.domain_guides
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Busca lexical (titulo/tags)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_pills_lexical(search_query text, result_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  title varchar,
  tool_category varchar,
  survival_content text,
  tags text[],
  views_count int,
  lexical_score double precision
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    p.id,
    p.title,
    p.tool_category,
    p.survival_content,
    p.tags,
    p.views_count,
    CASE
      WHEN lower(p.title) LIKE '%' || lower(trim(search_query)) || '%' THEN 1.0::double precision
      ELSE 0.6::double precision
    END AS lexical_score
  FROM public.pills p
  WHERE p.deleted_at IS NULL
    AND trim(search_query) <> ''
    AND (
      lower(p.title) LIKE '%' || lower(trim(search_query)) || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(p.tags) t(tag)
        WHERE lower(tag) LIKE '%' || lower(trim(search_query)) || '%'
      )
    )
  ORDER BY lexical_score DESC, p.views_count DESC
  LIMIT result_limit;
$$;

-- Similaridade vetorial (cosine): operador pgvector cosine distance `<=>`; score = 1 - distância (limite superior 1 quando vetores paralelos normalizados)
CREATE OR REPLACE FUNCTION public.match_pills_semantic(
  query_embedding extensions.vector(768),
  similarity_threshold double precision DEFAULT 0.25,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title varchar,
  tool_category varchar,
  survival_content text,
  tags text[],
  views_count integer,
  similarity double precision
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT
    p.id,
    p.title,
    p.tool_category,
    p.survival_content,
    p.tags,
    p.views_count,
    (1::double precision - (p.embedding <=> query_embedding))::double precision AS similarity
  FROM public.pills p
  WHERE p.deleted_at IS NULL
    AND p.embedding IS NOT NULL
    AND (1::double precision - (p.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT result_limit;
$$;

-- ---------------------------------------------------------------------------
-- RLS — leituras públicas apenas linhas não deletadas; search_logs apenas via service_role (backend).
-- ---------------------------------------------------------------------------

ALTER TABLE public.pills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pills_select_public" ON public.pills;
CREATE POLICY "pills_select_public" ON public.pills
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "domain_guides_select_public" ON public.domain_guides;
CREATE POLICY "domain_guides_select_public" ON public.domain_guides
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "search_logs_insert_authenticated" ON public.search_logs;
DROP POLICY IF EXISTS "search_logs_select_own_service" ON public.search_logs;

-- ---------------------------------------------------------------------------
-- Fila pg_net → Edge Function (URL e segredo devem ser configurados no Dashboard ou via Vault)
-- Substitua EMBED_FUNCTION_URL e WEBHOOK_SECRET na função auxiliar seguinte usando supabase_dashboard,
-- OU defina placeholders e execute REPLACE após migração.
-- ---------------------------------------------------------------------------

-- Função parametrizável: use supabase Secrets em conjunto com `current_setting` após:
-- ALTER DATABASE postgres SET app.embed_function_url = 'https://<ref>.supabase.co/functions/v1/embed-pill';
-- ALTER DATABASE postgres SET app.embed_webhook_secret = '...';
-- (Requer permissões de superuser no Postgres gerenciado — na prática, use Vault + `vault.get_secret` na função; aqui usamos settings com default vazio para não quebrar deploy.)

CREATE OR REPLACE FUNCTION public.enqueue_pill_embedding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  fn_url text;
  secret text;
  body jsonb;
  headers jsonb;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.survival_content IS NOT DISTINCT FROM NEW.survival_content THEN
    RETURN NEW;
  END IF;

  fn_url := nullif(trim(current_setting('app.embed_function_url', true)), '');
  secret := nullif(trim(current_setting('app.embed_webhook_secret', true)), '');

  IF fn_url IS NULL OR secret IS NULL THEN
    RAISE WARNING 'HelpProf embedding queue skipped: set app.embed_function_url and app.embed_webhook_secret on the database (ou use Vault).';
    RETURN NEW;
  END IF;

  body := jsonb_build_object(
    'pill_id', NEW.id::text,
    'text', NEW.survival_content
  );

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'X-Embed-Webhook-Secret', secret
  );

  PERFORM net.http_post(
    url := fn_url,
    headers := headers::jsonb,
    body := body::jsonb,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_pills_enqueue_embedding ON public.pills;
CREATE TRIGGER tr_pills_enqueue_embedding
  AFTER INSERT OR UPDATE OF survival_content ON public.pills
  FOR EACH ROW
  EXECUTE PROCEDURE public.enqueue_pill_embedding();

COMMENT ON FUNCTION public.enqueue_pill_embedding IS
  'Dispara chamada HTTP assíncrona (pg_net) para Edge Function de embeddings quando survival_content é inserido/alterado.';

-- Atualização assíncrona do vetor (chamada pela Edge Function com service_role)
CREATE OR REPLACE FUNCTION public.set_pill_embedding(p_id uuid, p_vec double precision[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.pills
  SET embedding = p_vec::extensions.vector(768)
  WHERE id = p_id AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.set_pill_embedding(uuid, double precision[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_pill_embedding(uuid, double precision[]) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_pill_views(p_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vc int;
BEGIN
  UPDATE public.pills
  SET views_count = views_count + 1
  WHERE id = p_id AND deleted_at IS NULL
  RETURNING views_count INTO vc;
  RETURN COALESCE(vc, -1);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_pill_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_pill_views(uuid) TO service_role;

-- Busca híbrida (FastAPI com service_role)
GRANT EXECUTE ON FUNCTION public.match_pills_lexical(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_pills_semantic(extensions.vector(768), double precision, integer) TO service_role;
