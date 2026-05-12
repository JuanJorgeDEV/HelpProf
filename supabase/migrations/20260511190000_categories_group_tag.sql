-- HelpProf — objetivos pedagógicos para categorias/domínios
-- Permite filtrar a vitrine de Guias de Domínio por objetivo.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS group_tag VARCHAR(80) NULL;

COMMENT ON COLUMN public.categories.group_tag IS
  'Objetivo pedagógico usado na vitrine de domínio. Ex.: Gamificação, Documentos, Planejamento, Interatividade.';

CREATE INDEX IF NOT EXISTS idx_categories_group_tag
  ON public.categories (group_tag);

UPDATE public.categories
SET group_tag = CASE slug
  WHEN 'KAHOOT' THEN 'Gamificação'
  WHEN 'WORDWALL' THEN 'Gamificação'
  WHEN 'WORD' THEN 'Documentos'
  WHEN 'EXCEL' THEN 'Documentos'
  WHEN 'ONEDRIVE' THEN 'Documentos'
  WHEN 'CANVA' THEN 'Planejamento'
  WHEN 'SED' THEN 'Planejamento'
  WHEN 'CMSP' THEN 'Interatividade'
  WHEN 'WHATSAPP' THEN 'Interatividade'
  ELSE group_tag
END
WHERE group_tag IS NULL;
