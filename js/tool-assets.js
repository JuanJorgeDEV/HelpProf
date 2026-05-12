/** Mapeamento categoria da API → logo local e cor da marca (header da pílula). */
window.TOOL_ASSETS = {
  ONEDRIVE: { logo: "assets/onedrive.png", color: "#0078d4", label: "OneDrive" },
  WORD: { logo: "assets/word.png", color: "#2b579a", label: "Microsoft Word" },
  EXCEL: { logo: "assets/excel.png", color: "#217346", label: "Microsoft Excel" },
  WHATSAPP: { logo: "assets/whatsapp.png", color: "#25D366", label: "WhatsApp" },
  CANVA: { logo: "assets/canva.png", color: "#00C4CC", label: "Canva" },
  KAHOOT: { logo: "assets/kahoot.png", color: "#ec4899", label: "Kahoot" },
  SED: { logo: "assets/sed.png", color: "#1e40af", label: "SED" },
  CMSP: { logo: "assets/cmsp.png", color: "#7c3aed", label: "CMSP" },
};

function normalizeToolKey(value) {
  return (value || "").toString().trim().toLowerCase();
}

function readStaticToolAsset(key) {
  var ta = window.TOOL_ASSETS || {};
  var normalized = normalizeToolKey(key);
  var foundKey = Object.keys(ta).find(function (k) {
    return normalizeToolKey(k) === normalized;
  });
  return foundKey ? ta[foundKey] : null;
}

/**
 * Registra/atualiza uma ferramenta retornada pela API no dicionário local.
 * Isso permite que cards de pílula (que só recebem tool_category) usem logo_url dinâmico.
 */
window.upsertToolBrand = function upsertToolBrand(category) {
  if (!category || !category.slug) return;
  if (!window.TOOL_ASSETS) window.TOOL_ASSETS = {};
  var slug = String(category.slug || "").trim();
  var staticBrand = readStaticToolAsset(slug) || {};
  var brand = {
    logo: category.logo_url || staticBrand.logo || "Logo.jpeg",
    color: category.brand_color || staticBrand.color || "#6366f1",
    label: category.name || staticBrand.label || slug.toUpperCase(),
  };
  window.TOOL_ASSETS[slug.toUpperCase()] = brand;
  window.TOOL_ASSETS[slug.toLowerCase()] = brand;
};

/**
 * @param {string|object} key valor de tool_category da API ou objeto category retornado pela API.
 * @returns {{ logo: string, color: string, label: string }}
 */
window.resolveToolBrand = function resolveToolBrand(key) {
  if (key && typeof key === "object") {
    var category = key;
    var slugFromCategory = category.slug || category.tool_category || category.name || "";
    var categoryStatic = readStaticToolAsset(slugFromCategory) || {};
    return {
      logo: category.logo_url || categoryStatic.logo || "Logo.jpeg",
      color: category.brand_color || categoryStatic.color || "#6366f1",
      label: category.name || categoryStatic.label || String(slugFromCategory || "HelpProf").toUpperCase(),
    };
  }
  var k = (key || "").toString().trim();
  var asset = readStaticToolAsset(k);
  if (asset) return asset;
  return {
    logo: "Logo.jpeg",
    color: "#6366f1",
    label: k ? k.toUpperCase() : "HelpProf",
  };
};
