-- HelpProf — slides_url opcional + categorias fixas para tool_category em pills.

ALTER TABLE public.pills ADD COLUMN IF NOT EXISTS slides_url TEXT NULL;
COMMENT ON COLUMN public.pills.slides_url IS
  'URL de incorporação do Google Slides (formato …/presentation/d/e/…/pubembed), opcional.';

-- Normalização best-effort (listas explícitas; linhas órfãs farão o CHECK falhar até correção manual).
UPDATE public.pills SET tool_category = upper(trim(tool_category));

UPDATE public.pills SET tool_category = 'ONEDRIVE'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(replace(trim(tool_category), ' ', '')) IN ('ONEDRIVE', 'ONEDRIVEESCOLAR', 'ONE_DRIVE', 'ONE-DRIVE');

UPDATE public.pills SET tool_category = 'WORD'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(trim(tool_category)) IN ('WORD', 'MS WORD', 'MICROSOFT WORD', 'MSWORD');

UPDATE public.pills SET tool_category = 'EXCEL'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(trim(tool_category)) IN ('EXCEL', 'MS EXCEL', 'MICROSOFT EXCEL', 'MSEXCEL');

UPDATE public.pills SET tool_category = 'WHATSAPP'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(trim(tool_category)) IN ('WHATSAPP', 'WPP', 'ZAP');

UPDATE public.pills SET tool_category = 'CANVA'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(trim(tool_category)) IN ('CANVA');

UPDATE public.pills SET tool_category = 'SED'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(trim(tool_category)) IN ('SED', 'S.E.D.');

UPDATE public.pills SET tool_category = 'CMSP'
  WHERE tool_category NOT IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP')
    AND upper(trim(tool_category)) IN ('CMSP', 'C.M.S.P.');

ALTER TABLE public.pills DROP CONSTRAINT IF EXISTS pills_tool_category_check;
ALTER TABLE public.pills ADD CONSTRAINT pills_tool_category_check
  CHECK (tool_category IN ('ONEDRIVE', 'WORD', 'EXCEL', 'WHATSAPP', 'CANVA', 'SED', 'CMSP'));
