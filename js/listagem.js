/**
 * listagem.html — filtros (?q= & ?categoria=), combobox de ferramentas, paginação offset.
 * Requer js/hp-config.js e js/tool-assets.js.
 */
(function () {
  "use strict";

  var PAGE_SIZE = 24;
  var state = { offset: 0, loading: false, done: false };
  var categories = [];

  var mqDesktop = typeof window.matchMedia === "function"
    ? window.matchMedia("(min-width: 980px)")
    : { matches: true, addEventListener: function () {} };

  function $(id) {
    return document.getElementById(id);
  }

  function cfg() {
    return window.HP_CONFIG || {};
  }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      q: (p.get("q") || "").trim(),
      categoria: (p.get("categoria") || p.get("tool_category") || "").trim().toUpperCase(),
    };
  }

  function getHiddenCategoryInput() {
    return $("listing-category");
  }

  function getCategoryFilterValue() {
    var h = getHiddenCategoryInput();
    return h ? h.value.trim().toUpperCase() : "";
  }

  function setHiddenCategory(slug) {
    var h = getHiddenCategoryInput();
    if (h) h.value = slug ? String(slug).trim().toUpperCase() : "";
  }

  function syncFormFromUrl() {
    var u = readUrlParams();
    var qEl = $("listing-q");
    if (qEl) qEl.value = u.q;
    setHiddenCategory(u.categoria);
    var cq = $("listing-category-q");
    if (cq) cq.value = "";
    updateCategoryTagUI();
  }

  function pushUrlFromForm() {
    var qEl = $("listing-q");
    var q = qEl ? qEl.value.trim() : "";
    var categoria = getCategoryFilterValue();
    var p = new URLSearchParams();
    if (q) p.set("q", q);
    if (categoria) p.set("categoria", categoria);
    var next = p.toString() ? "listagem.html?" + p.toString() : "listagem.html";
    window.history.replaceState({}, "", next);
  }

  function findCategoryBySlug(slug) {
    var u = String(slug || "").toUpperCase();
    for (var i = 0; i < categories.length; i++) {
      if (String(categories[i].slug || "").toUpperCase() === u) return categories[i];
    }
    return null;
  }

  function updateCategoryTagUI() {
    var wrap = $("listing-category-tag-wrap");
    var labelEl = $("listing-category-tag-label");
    if (!wrap || !labelEl) return;
    var slug = getCategoryFilterValue();
    if (!slug) {
      wrap.hidden = true;
      labelEl.textContent = "";
      return;
    }
    var cat = findCategoryBySlug(slug);
    labelEl.textContent = cat ? cat.name + " (" + cat.slug + ")" : slug;
    wrap.hidden = false;
  }

  function hideListbox() {
    var box = $("listing-category-listbox");
    var input = $("listing-category-q");
    if (box) {
      box.hidden = true;
      box.innerHTML = "";
    }
    if (input) input.setAttribute("aria-expanded", "false");
  }

  function filterCategoriesForQuery(q) {
    var t = String(q || "").trim().toLowerCase();
    if (!t) return categories.slice(0, 18);
    return categories
      .filter(function (c) {
        var slug = String(c.slug || "").toLowerCase();
        var name = String(c.name || "").toLowerCase();
        return slug.indexOf(t) >= 0 || name.indexOf(t) >= 0;
      })
      .slice(0, 50);
  }

  function refreshCategoryListbox() {
    var input = $("listing-category-q");
    var box = $("listing-category-listbox");
    if (!input || !box) return;
    var matches = filterCategoriesForQuery(input.value);
    box.innerHTML = "";
    matches.forEach(function (c, idx) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.className = "listing-combobox__option";
      li.id = "listing-cat-opt-" + idx;
      li.dataset.slug = c.slug;
      li.textContent = c.name + " (" + c.slug + ")";
      box.appendChild(li);
    });
    var open = matches.length > 0 && document.activeElement === input;
    box.hidden = !open;
    input.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function selectCategory(slug) {
    var input = $("listing-category-q");
    setHiddenCategory(slug);
    if (input) input.value = "";
    hideListbox();
    updateCategoryTagUI();
    pushUrlFromForm();
    collapseSidebarMobile();
    loadPage(false);
  }

  function clearCategoryFilter() {
    setHiddenCategory("");
    var input = $("listing-category-q");
    if (input) input.value = "";
    hideListbox();
    updateCategoryTagUI();
    pushUrlFromForm();
    loadPage(false);
  }

  function hexAlpha(hex, alpha) {
    var m = String(hex).match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return "rgba(99,102,241," + alpha + ")";
    return (
      "rgba(" +
      parseInt(m[1], 16) +
      "," +
      parseInt(m[2], 16) +
      "," +
      parseInt(m[3], 16) +
      "," +
      alpha +
      ")"
    );
  }

  function setStatus(msg) {
    var el = $("listing-status");
    if (el) el.textContent = msg || "";
  }

  function buildQuery(offset) {
    var qEl = $("listing-q");
    var q = qEl ? qEl.value.trim() : "";
    var categoria = getCategoryFilterValue();
    var p = new URLSearchParams();
    if (categoria) p.set("tool_category", categoria);
    if (q) p.set("q", q);
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    return p.toString();
  }

  function buildCard(pill) {
    var brand =
      typeof window.resolveToolBrand === "function"
        ? window.resolveToolBrand((pill.tool_category || "").toUpperCase())
        : { logo: "Logo.jpeg", color: "#6366f1", label: pill.tool_category || "" };
    var li = document.createElement("li");
    li.className = "listing-grid__item";

    var a = document.createElement("a");
    a.className = "pill-card pill-card--link glass-card listing-card listing-card--vertical";
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
      img.width = 30;
      img.height = 30;
      img.style.cssText = "width:30px;height:30px;object-fit:contain;border-radius:6px";
      iconDiv.appendChild(img);
    } else {
      iconDiv.className += " pill-card__icon--doc";
      iconDiv.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
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

  function renderLumeCardVisibility() {
    var lume = $("listing-lume-card");
    var grid = $("listing-results");
    if (!lume || !grid) return;
    lume.hidden = false;
  }

  async function fetchCategories(apiBase) {
    if (!apiBase) return;
    try {
      var res = await fetch(apiBase + "/categories?limit=500", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      var rows = await res.json();
      categories = Array.isArray(rows) ? rows : [];
    } catch (_) {
      categories = [];
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

    try {
      var res = await fetch(c.apiBase + "/pills?" + buildQuery(state.offset), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Erro " + res.status);
      var pills = await res.json();
      if (!Array.isArray(pills)) pills = [];

      pills.forEach(function (p) {
        grid.appendChild(buildCard(p));
      });
      if (pills.length < PAGE_SIZE) state.done = true;
      else state.offset += pills.length;

      if (grid.children.length === 0) setStatus("Nenhuma pílula encontrada com estes filtros.");
      else setStatus(grid.children.length + " pílula(s) exibida(s).");

      if (btn) {
        btn.hidden = state.done || grid.children.length === 0;
        btn.disabled = false;
      }
      renderLumeCardVisibility();
    } catch (e) {
      setStatus(e && e.message ? e.message : "Falha ao carregar.");
      if (btn) btn.hidden = true;
      renderLumeCardVisibility();
    } finally {
      state.loading = false;
    }
  }

  function wireCombobox() {
    var input = $("listing-category-q");
    var box = $("listing-category-listbox");
    var removeBtn = $("listing-category-remove");
    if (!input || !box) return;

    input.addEventListener("input", function () {
      if (getCategoryFilterValue()) {
        setHiddenCategory("");
        updateCategoryTagUI();
      }
      refreshCategoryListbox();
    });

    input.addEventListener("focus", function () {
      refreshCategoryListbox();
    });

    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        hideListbox();
        return;
      }
      if (ev.key === "Enter" && !box.hidden) {
        var first = box.querySelector("[role=option]");
        if (first && first.dataset.slug) {
          ev.preventDefault();
          selectCategory(first.dataset.slug);
        }
      }
    });

    box.addEventListener("mousedown", function (ev) {
      var li = ev.target && ev.target.closest("li[role=option]");
      if (!li || !li.dataset.slug) return;
      ev.preventDefault();
      selectCategory(li.dataset.slug);
    });

    document.addEventListener("mousedown", function (ev) {
      if (!box || box.hidden) return;
      var t = ev.target;
      if (input.contains(t) || box.contains(t)) return;
      hideListbox();
    });

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        clearCategoryFilter();
      });
    }
  }

  function syncSidebarForViewport() {
    var aside = $("listing-sidebar");
    var toggle = $("listing-filters-toggle");
    if (!aside || !toggle) return;
    if (mqDesktop.matches) {
      aside.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    } else {
      aside.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function collapseSidebarMobile() {
    if (mqDesktop.matches) return;
    var aside = $("listing-sidebar");
    var toggle = $("listing-filters-toggle");
    if (!aside || !toggle) return;
    aside.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function wireMobileSidebar() {
    var aside = $("listing-sidebar");
    var toggle = $("listing-filters-toggle");
    if (!aside || !toggle) return;

    toggle.addEventListener("click", function () {
      if (mqDesktop.matches) return;
      var open = !aside.classList.contains("is-open");
      aside.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    if (mqDesktop.addEventListener) {
      mqDesktop.addEventListener("change", syncSidebarForViewport);
    }
  }

  function boot() {
    var c = cfg();
    var form = $("listing-filters");
    var btn = $("listing-load-more");

    if (!c.apiBase) {
      setStatus("Configure js/hp-config.js com apiBase.");
      return;
    }
    syncFormFromUrl();
    wireCombobox();
    wireMobileSidebar();

    fetchCategories(c.apiBase).then(function () {
      syncFormFromUrl();
      loadPage(false);
    });

    syncSidebarForViewport();

    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        hideListbox();
        pushUrlFromForm();
        collapseSidebarMobile();
        loadPage(false);
      });
    }
    if (btn) btn.addEventListener("click", function () {
      loadPage(true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
