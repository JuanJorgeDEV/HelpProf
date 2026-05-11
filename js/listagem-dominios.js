/**
 * listagem-dominios.html — lista ferramentas (categories) com link para guia de domínio.
 * Requer js/hp-config.js e js/tool-assets.js antes deste script.
 */
(function () {
  "use strict";

  var allCategories = [];

  function $(id) { return document.getElementById(id); }
  function cfg() { return window.HP_CONFIG || {}; }

  function hexAlpha(hex, alpha) {
    var m = String(hex || "").match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return "rgba(99,102,241," + alpha + ")";
    return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + alpha + ")";
  }

  function setStatus(msg) {
    var el = $("domain-listing-status");
    if (el) el.textContent = msg || "";
  }

  function buildCard(cat) {
    var slug  = String(cat.slug || "").toUpperCase();
    var name  = cat.name || slug;
    var color = cat.brand_color || "#6366f1";
    var logo  = cat.logo_url || null;

    /* resolve logo do tool-assets como fallback */
    if (!logo && typeof window.resolveToolBrand === "function") {
      var b = window.resolveToolBrand(slug);
      if (b.logo && b.logo !== "Logo.jpeg") logo = b.logo;
      if (!cat.brand_color && b.color) color = b.color;
    }

    var li = document.createElement("li");
    li.className = "domain-card-wrap";
    li.dataset.name = name.toLowerCase();
    li.dataset.slug = slug.toLowerCase();

    var a = document.createElement("a");
    a.className = "domain-card glass-card";
    a.href = "pilula.html?category=" + encodeURIComponent(slug) + "&view=domain";
    a.setAttribute("aria-label", "Guia de domínio — " + name);
    a.style.setProperty("--domain-card-accent", color);
    a.style.borderTopColor = color;

    var iconWrap = document.createElement("div");
    iconWrap.className = "domain-card__icon";
    iconWrap.setAttribute("aria-hidden", "true");
    iconWrap.style.background = hexAlpha(color, 0.12);

    if (logo) {
      var img = document.createElement("img");
      img.src = logo;
      img.alt = "";
      img.width = 48;
      img.height = 48;
      img.style.cssText = "width:48px;height:48px;object-fit:contain;border-radius:10px";
      iconWrap.appendChild(img);
    } else {
      iconWrap.textContent = slug.slice(0, 2);
      iconWrap.classList.add("domain-card__icon--glyph");
      iconWrap.style.color = color;
    }

    var body = document.createElement("div");
    body.className = "domain-card__body";

    var nameEl = document.createElement("h2");
    nameEl.className = "domain-card__name";
    nameEl.textContent = name;

    var badge = document.createElement("span");
    badge.className = "domain-card__badge";
    badge.textContent = "Guia completo";

    var arrow = document.createElement("span");
    arrow.className = "domain-card__arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    body.appendChild(nameEl);
    body.appendChild(badge);

    a.appendChild(iconWrap);
    a.appendChild(body);
    a.appendChild(arrow);
    li.appendChild(a);
    return li;
  }

  function renderGrid(list) {
    var grid = $("domain-listing-grid");
    if (!grid) return;
    grid.innerHTML = "";
    if (list.length === 0) {
      setStatus("Nenhuma ferramenta encontrada.");
      return;
    }
    list.forEach(function (cat) { grid.appendChild(buildCard(cat)); });
    setStatus(list.length + " ferramenta(s) com guia de domínio.");
  }

  function filterBySearch(q) {
    var t = String(q || "").trim().toLowerCase();
    if (!t) return allCategories;
    return allCategories.filter(function (c) {
      var slug = String(c.slug || "").toLowerCase();
      var name = String(c.name || "").toLowerCase();
      return slug.indexOf(t) >= 0 || name.indexOf(t) >= 0;
    });
  }

  function wireSearch() {
    var input = $("domain-search");
    if (!input) return;
    input.addEventListener("input", function () {
      renderGrid(filterBySearch(input.value));
    });
  }

  async function loadCategories(apiBase) {
    setStatus("Carregando…");
    try {
      var res = await fetch(apiBase + "/categories?limit=500", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Erro " + res.status);
      var rows = await res.json();
      allCategories = Array.isArray(rows) ? rows : [];
      allCategories.sort(function (a, b) {
        var so = (a.sort_order || 0) - (b.sort_order || 0);
        if (so !== 0) return so;
        return String(a.name || "").localeCompare(String(b.name || ""), "pt");
      });
      renderGrid(allCategories);
    } catch (e) {
      setStatus(e && e.message ? e.message : "Falha ao carregar ferramentas.");
    }
  }

  function boot() {
    var c = cfg();
    wireSearch();
    if (c && c.apiBase) {
      loadCategories(c.apiBase);
    } else {
      setStatus("Configure js/hp-config.js com apiBase.");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
