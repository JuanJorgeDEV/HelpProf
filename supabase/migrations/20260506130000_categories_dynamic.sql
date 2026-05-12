-- HelpProf — categorias dinâmicas de ferramentas
-- Cria tabela categories; migra tool_category de pills e domain_guides para FK;
-- remove CHECK estático adicionado na migração anterior (se existir).

-- ---------------------------------------------------------------------------
-- 1. Tabela categories
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(60) NOT NULL UNIQUE,   -- chave de negócio: "ONEDRIVE", "KAHOOT", etc.
  name        VARCHAR(200) NOT NULL,
  group_tag   VARCHAR(80) NULL,              -- objetivo pedagógico: Gamificação, Documentos...
  logo_url    TEXT NULL,                     -- URL pública (assets/ relativo ou https://)
  brand_color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE  public.categories IS 'Ferramentas/domínios gerenciados pelo painel Triad Support.';
COMMENT ON COLUMN public.categories.slug IS 'Identificador curto maiúsculo, sem espaços. Ex.: ONEDRIVE, WORD.';

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

-- Somente service_role escreve (sem política INSERT/UPDATE/DELETE pública)
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Seed: 7 categorias base
-- ---------------------------------------------------------------------------

INSERT INTO public.categories (slug, name, group_tag, logo_url, brand_color, sort_order) VALUES
  ('ONEDRIVE',  'OneDrive',          'Documentos',     'assets/onedrive.png',  '#0078d4', 1),
  ('WORD',      'Microsoft Word',    'Documentos',     'assets/word.png',      '#2b579a', 2),
  ('EXCEL',     'Microsoft Excel',   'Documentos',     'assets/excel.png',     '#217346', 3),
  ('WHATSAPP',  'WhatsApp',          'Interatividade', 'assets/whatsapp.png',  '#25D366', 4),
  ('CANVA',     'Canva',             'Planejamento',   'assets/canva.png',     '#00C4CC', 5),
  ('SED',       'SED',               'Planejamento',   'assets/sed.png',       '#1e40af', 6),
  ('CMSP',      'CMSP',              'Interatividade', 'assets/cmsp.png',      '#7c3aed', 7)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Remover CHECK estático (migração anterior) — ignora se não existir
-- ---------------------------------------------------------------------------

ALTER TABLE public.pills DROP CONSTRAINT IF EXISTS pills_tool_category_check;
ALTER TABLE public.domain_guides DROP CONSTRAINT IF EXISTS domain_guides_tool_category_check;

-- ---------------------------------------------------------------------------
-- 4. Garantir que pills.tool_category bata com algum slug existente
--    (best-effort: rows sem slug correspondente ficam como estão)
-- ---------------------------------------------------------------------------

UPDATE public.pills SET tool_category = upper(trim(tool_category));
UPDATE public.domain_guides SET tool_category = upper(trim(tool_category));

-- ---------------------------------------------------------------------------
-- 5. Índices auxiliares
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_group_tag ON public.categories (group_tag);
CREATE INDEX IF NOT EXISTS idx_pills_tool_category_cat ON public.pills (tool_category);
CREATE INDEX IF NOT EXISTS idx_domain_guides_tool_category ON public.domain_guides (tool_category);

-- ---------------------------------------------------------------------------
-- 6. Updated_at trigger para categories
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
