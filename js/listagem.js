/**
 * listagem.html — filtros via query (?q= & ?tool_category=) + paginação offset.
 * Requer js/hp-config.js e js/tool-assets.js.
 */
(function () {
  "use strict";

  var PAGE_SIZE = 24;
  var state = { offset: 0, loading: false, done: false, lastCount: 0 };

  function $(id) { return document.getElementById(id); }

  function cfg() {
    return window.HP_CONFIG || {};
  }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      q: (p.get("q") || "").trim(),
      tool_category: (p.get("tool_category") || "").trim().toUpperCase(),
    };
  }

  function syncFormFromUrl() {
    var u = readUrlParams();
    var qEl = $("listing-q");
    var cEl = $("listing-category");
    if (qEl) qEl.value = u.q;
    if (cEl && u.tool_category) cEl.value = u.tool_category;
  }

  function pushUrlFromForm() {
    var qEl = $("listing-q");
    var cEl = $("listing-category");
    var q = qEl ? qEl.value.trim() : "";
    var cat = cEl ? cEl.value.trim().toUpperCase() : "";
    var p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("tool_category", cat);
    var qs = p.toString();
    var next = qs ? "listagem.html?" + qs : "listagem.html";
    window.history.replaceState({}, "", next);
  }

  function hexAlpha(hex, alpha) {
    var m = String(hex).match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return "rgba(99,102,241," + alpha + ")";
    return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + alpha + ")";
  }

  function buildCard(pill) {
    var brand = typeof window.resolveToolBrand === "function"
      ? window.resolveToolBrand((pill.tool_category || "").toUpperCase())
      : { logo: "Logo.jpeg", color: "#6366f1", label: pill.tool_category || "" };

    var li = document.createElement("li");
    li.className = "listing-grid__item";

    var a = document.createElement("a");
    a.className = "pill-card pill-card--link glass-card listing-card";
    a.href = "pilula.html?id=" + encodeURIComponent(pill.id);
    a.title = pill.title;
    if (brand.color) a.style.setProperty("--pill-card-accent", brand.color);

    var iconDiv = document.createElement("div");
    iconDiv.className = "pill-card__icon";
    iconDiv.setAttribute("aria-hidden", "true");
    if (brand.logo && brand.logo !== "Logo.jpeg") {
      var img = document.createElement("img");
      img.src = brand.logo;
      img.alt = brand.label || pill.tool_category || "";
      img.width = 32;
      img.height = 32;
      img.style.cssText = "width:32px;height:32px;object-fit:contain;border-radius:6px";
      iconDiv.appendChild(img);
    } else {
      iconDiv.className += " pill-card__icon--doc";
      iconDiv.innerHTML =
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    }
    if (brand.color) iconDiv.style.background = hexAlpha(brand.color, 0.12);

    var title = document.createElement("h2");
    title.className = "pill-card__title";
    title.textContent = pill.title;

    var meta = document.createElement("p");
    meta.className = "pill-card__meta";
    meta.textContent = (brand.label || pill.tool_category || "").replace(/_/g, " ");

    a.appendChild(iconDiv);
    a.appendChild(title);
    a.appendChild(meta);
    li.appendChild(a);
    return li;
  }

  function setStatus(msg) {
    var el = $("listing-status");
    if (el) el.textContent = msg || "";
  }

  function buildQuery(offset) {
    var qEl = $("listing-q");
    var cEl = $("listing-category");
    var q = qEl ? qEl.value.trim() : "";
    var cat = cEl ? cEl.value.trim().toUpperCase() : "";
    var p = new URLSearchParams();
    if (cat) p.set("tool_category", cat);
    if (q) p.set("q", q);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    return p.toString();
  }

  async function fetchCategories(apiBase) {
    var sel = $("listing-category");
    if (!sel || !apiBase) return;
    sel.innerHTML = "";
    var base = document.createElement("option");
    base.value = "";
    base.textContent = "Todas as ferramentas";
    sel.appendChild(base);
    try {
      var res = await fetch(apiBase + "/categories?limit=500", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      var rows = await res.json();
      if (!Array.isArray(rows)) return;
      rows.forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.slug;
        o.textContent = c.name + " (" + c.slug + ")";
        sel.appendChild(o);
      });
    } catch (_) {
      /* mantém apenas “Todas” */
    }
  }

  async function loadPage(append) {
    var c = cfg();
    var grid = $("listing-results");
    var btn = $("listing-load-more");
    if (!c.apiBase || !grid) {
      setStatus("Configure js/hp-config.js com apiBase.");
      return;
    }
    if (state.loading) return;
    if (append && state.done) return;

    state.loading = true;
    if (!append) {
      state.offset = 0;
      state.done = false;
      grid.innerHTML = "";
      setStatus("Carregando…");
    }
    if (btn) btn.disabled = true;

    var qs = buildQuery(state.offset);
    try {
      var res = await fetch(c.apiBase + "/pills?" + qs, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Erro " + res.status);
      var pills = await res.json();
      if (!Array.isArray(pills)) pills = [];

      state.lastCount = pills.length;
      pills.forEach(function (p) {
        grid.appendChild(buildCard(p));
      });

      if (pills.length < PAGE_SIZE) state.done = true;
      else state.offset += pills.length;

      if (append && pills.length === 0) state.done = true;

      if (grid.children.length === 0) {
        setStatus("Nenhuma pílula encontrada com estes filtros.");
      } else {
        setStatus(grid.children.length + " pílula(s) exibida(s).");
      }

      if (btn) {
        btn.hidden = state.done || grid.children.length === 0;
        btn.disabled = false;
      }
    } catch (e) {
      setStatus(e && e.message ? e.message : "Falha ao carregar.");
      if (btn) btn.hidden = true;
    } finally {
      state.loading = false;
    }
  }

  function boot() {
    var form = $("listing-filters");
    var btn = $("listing-load-more");
    var c = cfg();

    if (!c.apiBase) {
      setStatus("Configure js/hp-config.js com apiBase.");
      return;
    }
    syncFormFromUrl();
    fetchCategories(c.apiBase).then(function () {
      syncFormFromUrl();
      loadPage(false);
    });

    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        pushUrlFromForm();
        loadPage(false);
      });
    }
    if (btn) {
      btn.addEventListener("click", function () {
        loadPage(true);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
