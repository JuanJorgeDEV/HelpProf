-- Garante arquitetura 1:1 entre category e domain_guide ativo.
-- Um guia de domínio ativo por ferramenta (tool_category).

BEGIN;

-- Normalização defensiva dos slugs.
UPDATE public.domain_guides
SET tool_category = upper(trim(tool_category))
WHERE tool_category IS NOT NULL;

-- Deduplicação: mantém o guia ativo mais recente por categoria.
WITH ranked AS (
  SELECT
    id,
    tool_category,
    row_number() OVER (
      PARTITION BY tool_category
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.domain_guides
  WHERE deleted_at IS NULL
),
to_archive AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE public.domain_guides d
SET deleted_at = timezone('utc', now())
FROM to_archive x
WHERE d.id = x.id;

-- Regra 1:1 somente para registros ativos (soft-delete preservado).
CREATE UNIQUE INDEX IF NOT EXISTS uq_domain_guides_tool_active
  ON public.domain_guides (tool_category)
  WHERE deleted_at IS NULL;

COMMIT;
