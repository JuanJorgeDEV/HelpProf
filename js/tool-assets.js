/** Mapeamento categoria da API → logo local e cor da marca (header da pílula). */
window.TOOL_ASSETS = {
  ONEDRIVE: { logo: "assets/onedrive.png", color: "#0078d4", label: "OneDrive" },
  WORD: { logo: "assets/word.png", color: "#2b579a", label: "Microsoft Word" },
  EXCEL: { logo: "assets/excel.png", color: "#217346", label: "Microsoft Excel" },
  WHATSAPP: { logo: "assets/whatsapp.png", color: "#25D366", label: "WhatsApp" },
  CANVA: { logo: "assets/canva.png", color: "#00C4CC", label: "Canva" },
  SED: { logo: "assets/sed.png", color: "#1e40af", label: "SED" },
  CMSP: { logo: "assets/cmsp.png", color: "#7c3aed", label: "CMSP" },
};

/**
 * @param {string} key valor de tool_category da API (ex.: ONEDRIVE)
 * @returns {{ logo: string, color: string, label: string }}
 */
window.resolveToolBrand = function resolveToolBrand(key) {
  var k = (key || "").toString().trim().toUpperCase();
  var ta = window.TOOL_ASSETS;
  if (ta && ta[k]) return ta[k];
  return {
    logo: "Logo.jpeg",
    color: "#6366f1",
    label: k || "HelpProf",
  };
};
