/**
 * home.js — carrega trending pills e quick-access dinâmico
 * Requer js/hp-config.js e js/tool-assets.js antes deste script.
 */
(function () {
  "use strict";

  function cfg() { return window.HP_CONFIG || {}; }

  /* ── Quick-access: logos dos ícones de ferramenta ──────────────────── */
  function initQuickAccess() {
    var btns = document.querySelectorAll(".quick-access-btn");
    if (!btns.length) return;
    btns.forEach(function (btn) {
      var label = btn.querySelector(".quick-access-btn__label");
      if (!label) return;
      var slug = label.textContent.trim().toUpperCase();
      if (typeof window.resolveToolBrand !== "function") return;
      var brand = window.resolveToolBrand(slug);
      if (!brand.logo || brand.logo === "Logo.jpeg") return;
      var glyph = btn.querySelector(".quick-access-btn__glyph");
      if (!glyph) return;
      var img = document.createElement("img");
      img.src = brand.logo;
      img.alt = brand.label || slug;
      img.width = 24;
      img.height = 24;
      img.style.cssText = "width:24px;height:24px;object-fit:contain;border-radius:4px";
      glyph.replaceWith(img);
      if (brand.color) btn.style.setProperty("--quick-color", brand.color);
    });
  }

  /* ── Carousel ─────────────────────────────────────────────────────── */
  function buildCard(pill) {
    var brand = typeof window.resolveToolBrand === "function"
      ? window.resolveToolBrand((pill.tool_category || "").toUpperCase())
      : { logo: "Logo.jpeg", color: "#6366f1", label: pill.tool_category || "" };

    var li = document.createElement("li");
    li.className = "pill-carousel__slide";

    var a = document.createElement("a");
    a.className = "pill-card pill-card--link glass-card";
    a.href = "pilula.html?id=" + encodeURIComponent(pill.id);
    a.title = pill.title;
    if (brand.color) a.style.setProperty("--pill-card-accent", brand.color);

    /* ícone / logo */
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
      /* SVG genérico */
      iconDiv.className += " pill-card__icon--doc";
      iconDiv.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    }
    if (brand.color) iconDiv.style.background = hexAlpha(brand.color, 0.12);

    var title = document.createElement("h3");
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

  function hexAlpha(hex, alpha) {
    var m = String(hex).match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return "rgba(99,102,241," + alpha + ")";
    return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + alpha + ")";
  }

  function renderCarousel(pills) {
    var track = document.getElementById("pill-carousel-track");
    if (!track) return;
    track.innerHTML = "";
    if (!pills || pills.length === 0) {
      var li = document.createElement("li");
      li.className = "pill-carousel__slide";
      li.innerHTML = '<article class="pill-card glass-card"><p class="pill-card__title" style="color:var(--text-muted);font-weight:500">Nenhuma pílula cadastrada ainda.</p></article>';
      track.appendChild(li);
      return;
    }
    pills.forEach(function (pill) { track.appendChild(buildCard(pill)); });
  }

  function fetchTrending(apiBase) {
    fetch(apiBase + "/pills/trending", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        var pills = Array.isArray(data) ? data : (data.pills || []);
        renderCarousel(pills);
      })
      .catch(function () { renderCarousel([]); });
  }

  /* ── Bootstrap ───────────────────────────────────────────────────── */
  function boot() {
    var c = cfg();
    initQuickAccess();
    if (c && c.apiBase) {
      fetchTrending(c.apiBase);
    } else {
      renderCarousel([]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
