/**
 * home.js — carrega trending pills e quick-access dinâmico
 * Requer js/hp-config.js e js/tool-assets.js antes deste script.
 */
(function () {
  "use strict";

  var domainCategories = [];
  var activeDomainGroup = "";

  function cfg() { return window.HP_CONFIG || {}; }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

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

  function domainDescription(cat) {
    var name = cat.name || cat.slug || "esta ferramenta";
    var group = cat.group_tag || "Ferramenta";
    var byGroup = {
      "Gamificação": "Manual para criar atividades com desafio, participação e feedback rápido em sala.",
      "Documentos": "Manual para produzir, organizar e compartilhar materiais com mais segurança.",
      "Planejamento": "Manual para estruturar aulas, rotinas e recursos antes da prática.",
      "Interatividade": "Manual para conduzir atividades mais participativas e visuais com a turma.",
    };
    return byGroup[group] || ("Manual completo para dominar " + name + " no cotidiano pedagógico.");
  }

  function resolveCategoryBrand(cat) {
    var slug = String(cat.slug || "").toUpperCase();
    var brand = typeof window.resolveToolBrand === "function"
      ? window.resolveToolBrand(cat)
      : { logo: "Logo.jpeg", color: "#6366f1", label: cat.name || slug };
    return {
      logo: brand.logo || "Logo.jpeg",
      color: brand.color || "#6366f1",
      label: brand.label || cat.name || String(cat.slug || "").toUpperCase(),
    };
  }

  function buildDomainCard(cat) {
    var slug = String(cat.slug || "").toUpperCase();
    var brand = resolveCategoryBrand(cat);

    var li = document.createElement("li");
    li.className = "home-domain-grid__item";

    var a = document.createElement("a");
    a.className = "home-domain-card glass-card";
    a.href = "pilula.html?category=" + encodeURIComponent(slug) + "&mode=domain";
    a.setAttribute("aria-label", "Abrir guia de domínio — " + brand.label);
    a.style.setProperty("--domain-card-accent", brand.color);
    a.style.background = "linear-gradient(180deg, " + hexAlpha(brand.color, 0.14) + " 0%, rgba(255,255,255,0.82) 48%)";
    a.style.borderColor = hexAlpha(brand.color, 0.34);

    var logoWrap = document.createElement("div");
    logoWrap.className = "home-domain-card__logo";
    logoWrap.style.background = hexAlpha(brand.color, 0.12);

    if (brand.logo && brand.logo !== "Logo.jpeg") {
      var img = document.createElement("img");
      img.src = brand.logo;
      img.alt = "";
      img.width = 58;
      img.height = 58;
      img.style.cssText = "width:58px;height:58px;object-fit:contain;border-radius:12px";
      logoWrap.appendChild(img);
    } else {
      logoWrap.textContent = slug.slice(0, 2);
      logoWrap.classList.add("home-domain-card__logo--glyph");
      logoWrap.style.color = brand.color;
    }

    var body = document.createElement("div");
    body.className = "home-domain-card__body";

    var group = document.createElement("span");
    group.className = "home-domain-card__group";
    group.textContent = cat.group_tag || "Manual";

    var title = document.createElement("h3");
    title.className = "home-domain-card__name";
    title.textContent = brand.label;

    var desc = document.createElement("p");
    desc.className = "home-domain-card__desc";
    desc.textContent = domainDescription(cat);

    body.appendChild(group);
    body.appendChild(title);
    body.appendChild(desc);
    a.appendChild(logoWrap);
    a.appendChild(body);
    li.appendChild(a);
    return li;
  }

  function filteredDomainCategories() {
    if (!activeDomainGroup) return domainCategories;
    return domainCategories.filter(function (cat) {
      return String(cat.group_tag || "") === activeDomainGroup;
    });
  }

  function updateDomainSeeMore() {
    var link = document.getElementById("home-domain-see-more");
    if (!link) return;
    link.href = activeDomainGroup
      ? "listagem-dominios.html?grupo=" + encodeURIComponent(activeDomainGroup)
      : "listagem-dominios.html";
  }

  function renderDomainShowcase() {
    var grid = document.getElementById("home-domain-grid");
    var empty = document.getElementById("home-domain-empty");
    if (!grid) return;
    var rows = filteredDomainCategories().slice(0, 6);
    grid.innerHTML = "";
    updateDomainSeeMore();
    if (empty) empty.hidden = rows.length > 0;
    grid.hidden = rows.length === 0;
    if (!rows.length) return;
    rows.forEach(function (cat) {
      grid.appendChild(buildDomainCard(cat));
    });
  }

  function wireDomainFilters() {
    var wrap = document.getElementById("home-domain-filters");
    if (!wrap) return;
    wrap.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-group]");
      if (!btn) return;
      activeDomainGroup = btn.dataset.group || "";
      wrap.querySelectorAll(".domain-objective-chip").forEach(function (chip) {
        chip.classList.toggle("is-active", chip === btn);
      });
      renderDomainShowcase();
    });
  }

  function renderDomainError() {
    var grid = document.getElementById("home-domain-grid");
    var empty = document.getElementById("home-domain-empty");
    if (grid) grid.hidden = true;
    if (empty) {
      empty.hidden = false;
      var text = empty.querySelector(".home-domain-empty__text");
      if (text) text.textContent = "Não consegui carregar os guias agora. A Lume pode te ajudar enquanto isso?";
    }
  }

  function fetchDomainCategories(apiBase) {
    fetch(apiBase + "/categories?limit=500&has_domain_guide=true", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        domainCategories = Array.isArray(rows) ? rows : [];
        if (typeof window.upsertToolBrand === "function") {
          domainCategories.forEach(function (cat) { window.upsertToolBrand(cat); });
        }
        domainCategories.sort(function (a, b) {
          var so = (a.sort_order || 0) - (b.sort_order || 0);
          if (so !== 0) return so;
          return String(a.name || "").localeCompare(String(b.name || ""), "pt");
        });
        renderDomainShowcase();
      })
      .catch(renderDomainError);
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

  function renderLumeResult(data) {
    var result = document.getElementById("lume-result");
    var status = document.getElementById("lume-result-status");
    var answer = document.getElementById("lume-answer");
    var suggestions = document.getElementById("lume-suggestions");
    if (!result || !status || !answer || !suggestions) return;

    result.hidden = false;
    status.textContent = data.low_confidence
      ? "A Lume encontrou pouca correspondência. Use como orientação inicial."
      : "Resposta da Lume";
    status.classList.toggle("is-low-confidence", !!data.low_confidence);
    answer.innerHTML = esc(data.answer || "").replace(/\n/g, "<br>");
    suggestions.innerHTML = "";

    var pills = Array.isArray(data.suggested_pills) ? data.suggested_pills : [];
    var questions = Array.isArray(data.suggested_questions) ? data.suggested_questions : [];
    if (!pills.length && !questions.length) {
      suggestions.hidden = true;
      return;
    }

    suggestions.hidden = false;
    if (pills.length) {
      var title = document.createElement("h3");
      title.className = "lume-result__subtitle";
      title.textContent = "Pílulas sugeridas";
      suggestions.appendChild(title);
      var list = document.createElement("ul");
      list.className = "lume-result__cards";
      pills.slice(0, 4).forEach(function (pill) {
        list.appendChild(buildCard(pill));
      });
      suggestions.appendChild(list);
    }

    if (questions.length) {
      var qTitle = document.createElement("h3");
      qTitle.className = "lume-result__subtitle";
      qTitle.textContent = "Tente perguntar";
      suggestions.appendChild(qTitle);
      var qWrap = document.createElement("div");
      qWrap.className = "lume-result__chips";
      questions.slice(0, 5).forEach(function (question) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "domain-objective-chip";
        btn.textContent = question;
        btn.addEventListener("click", function () {
          var input = document.getElementById("lume-search-input");
          if (input) {
            input.value = question;
            input.focus();
          }
        });
        qWrap.appendChild(btn);
      });
      suggestions.appendChild(qWrap);
    }
  }

  function bindLumeSearch() {
    var form = document.getElementById("lume-search-form");
    var input = document.getElementById("lume-search-input");
    var result = document.getElementById("lume-result");
    var status = document.getElementById("lume-result-status");
    var answer = document.getElementById("lume-answer");
    if (!form || !input || !result || !status || !answer) return;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var c = cfg();
      var query = input.value.trim();
      if (!query) {
        result.hidden = false;
        status.textContent = "Descreva sua dúvida para a Lume orientar melhor.";
        answer.textContent = "";
        return;
      }
      if (!c.apiBase) {
        result.hidden = false;
        status.textContent = "Configure js/hp-config.js com apiBase.";
        answer.textContent = "";
        return;
      }

      result.hidden = false;
      status.textContent = "Consultando a Lume...";
      answer.textContent = "";
      var suggestions = document.getElementById("lume-suggestions");
      if (suggestions) {
        suggestions.innerHTML = "";
        suggestions.hidden = true;
      }

      fetch(c.apiBase + "/lume/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: query, "scenario": "home" }),
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) {
              var msg = (data && data.error && (data.error.message || data.error.detail))
                || (data && data.detail)
                || ("Erro " + r.status);
              throw new Error(msg);
            }
            return data;
          });
        })
        .then(renderLumeResult)
        .catch(function (err) {
          status.textContent = "Não consegui consultar a Lume agora.";
          answer.textContent = err && err.message ? err.message : "Tente novamente em instantes.";
        });
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────────────── */
  function boot() {
    var c = cfg();
    initQuickAccess();
    wireDomainFilters();
    bindLumeSearch();
    if (c && c.apiBase) {
      fetchTrending(c.apiBase);
      fetchDomainCategories(c.apiBase);
    } else {
      renderCarousel([]);
      renderDomainError();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
