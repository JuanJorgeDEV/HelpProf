/**
 * listagem-dominios.html — lista ferramentas (categories) com link para guia de domínio.
 * Requer js/hp-config.js e js/tool-assets.js antes deste script.
 */
(function () {
  "use strict";

  var allCategories = [];
  var activeGroup = "";

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
    var brand = typeof window.resolveToolBrand === "function"
      ? window.resolveToolBrand(cat)
      : { logo: cat.logo_url || "assets/Logo.jpeg", color: color, label: name };
    var logo = brand.logo || "assets/Logo.jpeg";
    color = brand.color || color;
    name = brand.label || name;

    var li = document.createElement("li");
    li.className = "domain-card-wrap";
    li.dataset.name = name.toLowerCase();
    li.dataset.slug = slug.toLowerCase();

    var a = document.createElement("a");
    a.className = "domain-card glass-card";
    a.href = "pilula.html?category=" + encodeURIComponent(slug) + "&mode=domain";
    a.setAttribute("aria-label", "Guia de domínio — " + name);
    a.style.setProperty("--domain-card-accent", color);
    a.style.borderTopColor = color;

    var iconWrap = document.createElement("div");
    iconWrap.className = "domain-card__icon";
    iconWrap.setAttribute("aria-hidden", "true");
    iconWrap.style.background = hexAlpha(color, 0.12);

    if (logo && logo !== "assets/Logo.jpeg") {
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
    var base = activeGroup
      ? allCategories.filter(function (c) { return String(c.group_tag || "") === activeGroup; })
      : allCategories;
    if (!t) return base;
    return base.filter(function (c) {
      var slug = String(c.slug || "").toLowerCase();
      var name = String(c.name || "").toLowerCase();
      return slug.indexOf(t) >= 0 || name.indexOf(t) >= 0;
    });
  }

  function syncFilterUrl() {
    var p = new URLSearchParams(window.location.search);
    if (activeGroup) p.set("grupo", activeGroup);
    else p.delete("grupo");
    var next = p.toString() ? "listagem-dominios.html?" + p.toString() : "listagem-dominios.html";
    window.history.replaceState({}, "", next);
  }

  function currentSearchValue() {
    var input = $("domain-search");
    return input ? input.value : "";
  }

  function renderFilteredGrid() {
    renderGrid(filterBySearch(currentSearchValue()));
  }

  function wireSearch() {
    var input = $("domain-search");
    if (!input) return;
    input.addEventListener("input", function () {
      renderFilteredGrid();
    });
  }

  function wireGroupFilters() {
    var wrap = $("domain-listing-filters");
    if (!wrap) return;
    wrap.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-group]");
      if (!btn) return;
      activeGroup = btn.dataset.group || "";
      wrap.querySelectorAll(".domain-objective-chip").forEach(function (chip) {
        chip.classList.toggle("is-active", chip === btn);
      });
      syncFilterUrl();
      renderFilteredGrid();
    });
  }

  function initGroupFromUrl() {
    var p = new URLSearchParams(window.location.search);
    activeGroup = (p.get("grupo") || "").trim();
    var wrap = $("domain-listing-filters");
    if (!wrap) return;
    var found = false;
    wrap.querySelectorAll(".domain-objective-chip").forEach(function (chip) {
      var active = (chip.dataset.group || "") === activeGroup;
      if (active) found = true;
      chip.classList.toggle("is-active", active);
    });
    if (!found) {
      activeGroup = "";
      var all = wrap.querySelector('[data-group=""]');
      if (all) all.classList.add("is-active");
    }
  }

  async function loadCategories(apiBase) {
    setStatus("Carregando…");
    try {
      var res = await fetch(apiBase + "/categories?limit=500&has_domain_guide=true", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Erro " + res.status);
      var rows = await res.json();
      allCategories = Array.isArray(rows) ? rows : [];
      if (typeof window.upsertToolBrand === "function") {
        allCategories.forEach(function (cat) { window.upsertToolBrand(cat); });
      }
      allCategories.sort(function (a, b) {
        var so = (a.sort_order || 0) - (b.sort_order || 0);
        if (so !== 0) return so;
        return String(a.name || "").localeCompare(String(b.name || ""), "pt");
      });
      renderFilteredGrid();
    } catch (e) {
      setStatus(e && e.message ? e.message : "Falha ao carregar ferramentas.");
    }
  }

  function boot() {
    var c = cfg();
    initGroupFromUrl();
    wireSearch();
    wireGroupFilters();
    if (c && c.apiBase) {
      loadCategories(c.apiBase);
    } else {
      setStatus("Configure js/hp-config.js com apiBase.");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
