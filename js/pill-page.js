/**
 * Visualização dinâmica de pílula: pilula.html?id=<uuid>
 * Modo domínio: pilula.html?category=<SLUG>&mode=mastery
 * Compat legado: pilula.html?category=<SLUG>&view=domain
 *               pilula.html?id=<uuid>&view=domain
 * Requer js/hp-config.js e js/tool-assets.js antes deste script.
 * Usa marked.js (CDN) para renderizar Markdown completo.
 */
(function () {
  "use strict";

  /** Alinha com o backend: iframe usa só /pubembed (converte legado /pub). */
  var SLIDES_RE = /^https:\/\/docs\.google\.com\/presentation\/d\/e\/[^/\s#?]+\/pubembed(\?[^\s#]*)?$/i;
  var currentPillId = null;

  function coerceSlidesEmbedUrl(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    if (!/^https:\/\/docs\.google\.com\/presentation\/d\/e\//i.test(s)) return s;
    if (!/\/pubembed/i.test(s)) s = s.replace(/\/pub(?=\?|#|$)/i, "/pubembed");
    return s;
  }

  function qs(sel) { return document.getElementById(sel); }
  function param(name) { return new URLSearchParams(window.location.search).get(name); }

  /* ── Modo domínio ──────────────────────────────────────────────────────── */
  var IS_DOMAIN_VIEW = param("view") === "domain" || param("mode") === "mastery" || param("mode") === "domain";

  function enterDomainView() {
    document.body.classList.add("is-domain-view");
    /* Mostra diretamente o painel de domínio */
    var panelPassos  = qs("panel-passos");
    var panelDetalhe = qs("panel-detalhe");
    var tabSwitcher  = document.querySelector(".tab-switcher");
    var domainHeading = document.querySelector(".tab-panel__heading");
    if (panelPassos)  { panelPassos.hidden = true;  panelPassos.setAttribute("aria-hidden", "true"); }
    if (panelDetalhe) { panelDetalhe.hidden = false; panelDetalhe.removeAttribute("aria-hidden"); }
    if (tabSwitcher)  tabSwitcher.hidden = true;
    if (domainHeading) domainHeading.hidden = true;
  }

  /* ── Slide embed ─────────────────────────────────────────────────────── */
  function setSlideEmbed(url, containerId) {
    var id   = containerId || "pill-slide-wrap";
    var wrap = qs(id);
    if (!wrap) return;
    var src   = coerceSlidesEmbedUrl(url);
    var valid = src && SLIDES_RE.test(src);
    if (!valid) {
      wrap.hidden = true;
      wrap.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    wrap.style.display = "";
    wrap.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.setAttribute("frameborder", "0");
    iframe.width  = "100%";
    iframe.height = "100%";
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
  }

  /* ── Markdown → HTML (marked.js com fallback manual) ────────────────── */
  function normalizeMarkdown(md) {
    return String(md || "")
      .replace(/\r\n/g, "\n")
      .replace(/^(#{1,6})([^\s#])/gm, "$1 $2");
  }

  function renderMarkdown(md) {
    var normalized = normalizeMarkdown(md);
    if (typeof window.marked !== "undefined") {
      return window.marked.parse(normalized, { breaks: true, gfm: true });
    }
    var lines  = normalized.split(/\r?\n/);
    var html   = [];
    var inList = false;
    var listTag = "ul";

    function closeList() {
      if (inList) { html.push("</" + listTag + ">"); inList = false; }
    }

    lines.forEach(function (raw) {
      var line    = raw.trimEnd();
      var h       = line.match(/^(#{1,6})\s+(.+)/);
      var ordered = line.match(/^\s*\d+\.\s+(.+)/);
      var bullet  = line.match(/^\s*[-*+]\s+(.+)/);

      if (h) {
        closeList();
        var lv = Math.min(h[1].length + 1, 4);
        html.push("<h" + lv + ">" + esc(h[2]) + "</h" + lv + ">");
      } else if (ordered) {
        if (!inList || listTag !== "ol") { closeList(); html.push("<ol class='steps-list'>"); inList = true; listTag = "ol"; }
        html.push("<li class='steps-list__item'>" + esc(ordered[1]) + "</li>");
      } else if (bullet) {
        if (!inList || listTag !== "ul") { closeList(); html.push("<ul class='icon-list'>"); inList = true; listTag = "ul"; }
        html.push("<li class='icon-list__item'><span>" + esc(bullet[1]) + "</span></li>");
      } else if (line.trim() === "") {
        closeList();
      } else {
        closeList();
        html.push("<p>" + esc(line) + "</p>");
      }
    });
    closeList();
    return html.join("\n");
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderContent(md) {
    var container = qs("pill-content-area");
    if (!container) return;
    container.innerHTML = renderMarkdown(md);
  }

  /* ── Brand bar ───────────────────────────────────────────────────────── */
  function doApplyBrand(brand) {
    var bar    = qs("pill-brand-bar");
    var logoEl = qs("pill-brand-logo");
    var lbl    = qs("pill-brand-label");
    if (!bar) return;
    var color = brand.color || "#6366f1";
    bar.hidden = false;
    bar.style.setProperty("--pill-brand-color", color);
    bar.style.background = hexAlpha(color, 0.11);
    bar.style.borderLeftColor = color;
    bar.style.borderColor = hexAlpha(color, 0.28);
    bar.style.borderLeftColor = color;
    if (logoEl) { logoEl.src = brand.logo || "assets/Logo.jpeg"; logoEl.alt = brand.label || ""; }
    if (lbl) lbl.textContent = brand.label || "";
    document.documentElement.style.setProperty("--pill-brand-accent", color);
  }

  function hexAlpha(hex, alpha) {
    var m = String(hex).match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return "rgba(99,102,241," + alpha + ")";
    return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + alpha + ")";
  }

  function applyDynamicBrand(slug, apiBase) {
    slug = (slug || "").trim().toUpperCase();

    function fromStatic() {
      var b = typeof window.resolveToolBrand === "function"
        ? window.resolveToolBrand(slug)
        : { logo: "assets/Logo.jpeg", color: "#6366f1", label: slug };
      doApplyBrand(b);
    }

    fetch(apiBase + "/categories/" + encodeURIComponent(slug), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cat) {
        if (cat) {
          if (typeof window.upsertToolBrand === "function") window.upsertToolBrand(cat);
          doApplyBrand(
            typeof window.resolveToolBrand === "function"
              ? window.resolveToolBrand(cat)
              : { logo: cat.logo_url, color: cat.brand_color, label: cat.name },
          );
        } else {
          fromStatic();
        }
      })
      .catch(fromStatic);
  }

  /* ── Painel Domínio ──────────────────────────────────────────────────── */
  function setDomainFallback(slug) {
    var el = document.querySelector(".tab-panel__lede-dynamic");
    if (!el) return;
    var b = typeof window.resolveToolBrand === "function" ? window.resolveToolBrand(slug) : { label: slug };
    el.textContent = "Guia aprofundado sobre " + (b.label || slug) + ".";
  }

  function loadDomainGuide(apiBase, slug) {
    var lede = document.querySelector(".tab-panel__lede-dynamic");
    var box  = qs("domain-guide-content");
    var title = qs("dual-guide-title");
    if (!box) return;
    box.innerHTML = "";
    if (!slug) {
      box.innerHTML = '<p class="steps-list__item steps-list__item--muted">Categoria não informada para carregar o guia.</p>';
      return;
    }
    fetch(apiBase + "/domain-guides/by-category/" + encodeURIComponent(slug), {
      headers: { Accept: "application/json" },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (guide) {
        if (!guide) {
          if (lede) lede.textContent = "Ainda não há guia de domínio cadastrado para esta ferramenta.";
          box.innerHTML = '<p class="steps-list__item steps-list__item--muted">Guia de domínio ainda não cadastrado.</p>';
          return;
        }
        var guideTitle = guide.title || ("Guia de domínio — " + slug);
        if (lede) lede.textContent = guideTitle;
        if (IS_DOMAIN_VIEW && title) {
          title.textContent = guideTitle;
          document.title = "HelpProf — " + guideTitle;
        }
        box.innerHTML = renderMarkdown(guide.deep_content || "");
        if (guide.slides_embed) setSlideEmbed(guide.slides_embed, "domain-slide-wrap");
      })
      .catch(function () {
        box.innerHTML = '<p class="steps-list__item steps-list__item--muted">Não foi possível carregar o guia agora.</p>';
      });
  }

  function recordView(apiBase, id) {
    fetch(apiBase + "/pills/" + encodeURIComponent(id) + "/view", { method: "POST" }).catch(function () {});
  }

  function renderPillLumeResult(data) {
    var result = qs("pill-lume-result");
    var status = qs("pill-lume-status");
    var answer = qs("pill-lume-answer");
    var mascot = qs("lume-mascot");
    if (!result || !status || !answer) return;
    result.hidden = false;
    status.textContent = data.low_confidence ? "Resposta com baixa confiança" : "Resposta da Lume";
    status.classList.toggle("is-low-confidence", !!data.low_confidence);
    answer.innerHTML = renderMarkdown(data.answer || "");
    if (mascot) {
      var srcDown = mascot.getAttribute("data-src-down") || "assets/Mao abaixada.png";
      mascot.src = srcDown;
    }
  }

  function bindPillLume(cfg) {
    var form = qs("pill-lume-form");
    var input = qs("pill-lume-input");
    var result = qs("pill-lume-result");
    var status = qs("pill-lume-status");
    var answer = qs("pill-lume-answer");
    if (!form || !input || !result || !status || !answer) return;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var query = input.value.trim();
      if (!query) {
        result.hidden = false;
        status.textContent = "Digite sua dúvida sobre esta pílula.";
        answer.textContent = "";
        return;
      }
      if (!currentPillId) {
        result.hidden = false;
        status.textContent = "Aguarde a pílula terminar de carregar.";
        answer.textContent = "";
        return;
      }

      result.hidden = false;
      status.innerHTML =
        'Lume está pensando... <span class="lume-thinking" aria-label="Consultando a Lume">' +
        '<span class="lume-thinking__dot"></span>' +
        '<span class="lume-thinking__dot"></span>' +
        '<span class="lume-thinking__dot"></span>' +
        '</span>';
      answer.innerHTML =
        '<div class="lume-skeleton-line" style="width:88%"></div>' +
        '<div class="lume-skeleton-line" style="width:72%"></div>' +
        '<div class="lume-skeleton-line" style="width:82%"></div>' +
        '<div class="lume-skeleton-line" style="width:55%"></div>';

      var mascot = qs("lume-mascot");
      if (mascot) {
        var srcUp = mascot.getAttribute("data-src-up") || "assets/Mao levantada.png";
        mascot.src = srcUp;
      }

      fetch(cfg.apiBase + "/lume/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: query, "scenario": "pill", pill_id: currentPillId }),
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
        .then(renderPillLumeResult)
        .catch(function (err) {
          status.textContent = "Ops! Ocorreu um contratempo.";
          answer.innerHTML = renderMarkdown(err && err.message ? err.message : "*Não consegui me conectar com a Lume agora. Que tal tentar de novo em instantes?*");
          if (mascot) {
            var srcDown = mascot.getAttribute("data-src-down") || "assets/Mao abaixada.png";
            mascot.src = srcDown;
          }
        });
    });
  }

  /* ── Cards do carrossel «Relacionadas» ───────────────────────────────── */
  function buildRelatedCard(pill) {
    var brand = typeof window.resolveToolBrand === "function"
      ? window.resolveToolBrand((pill.tool_category || "").toUpperCase())
      : { logo: "assets/Logo.jpeg", color: "#6366f1", label: pill.tool_category || "" };

    var li = document.createElement("li");
    li.className = "pill-carousel__slide pill-carousel__slide--related";

    var a = document.createElement("a");
    a.className = "pill-card pill-card--link glass-card pill-card--compact";
    a.href = "pilula.html?id=" + encodeURIComponent(pill.id);
    a.title = pill.title;
    if (brand.color) a.style.setProperty("--pill-card-accent", brand.color);

    var iconDiv = document.createElement("div");
    iconDiv.className = "pill-card__icon";
    iconDiv.setAttribute("aria-hidden", "true");
    if (brand.logo && brand.logo !== "assets/Logo.jpeg") {
      var img = document.createElement("img");
      img.src = brand.logo;
      img.alt = brand.label || pill.tool_category || "";
      img.width = 28;
      img.height = 28;
      img.style.cssText = "width:28px;height:28px;object-fit:contain;border-radius:6px";
      iconDiv.appendChild(img);
    } else {
      iconDiv.className += " pill-card__icon--doc";
      iconDiv.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    }
    if (brand.color) iconDiv.style.background = hexAlpha(brand.color, 0.12);

    var titleEl = document.createElement("h4");
    titleEl.className = "pill-card__title";
    titleEl.textContent = pill.title;

    var meta = document.createElement("p");
    meta.className = "pill-card__meta";
    meta.textContent = (brand.label || pill.tool_category || "").replace(/_/g, " ");

    a.appendChild(iconDiv);
    a.appendChild(titleEl);
    a.appendChild(meta);
    li.appendChild(a);
    return li;
  }

  function loadRelatedPills(apiBase, slugOrPill, excludeId) {
    var track      = qs("pill-related-track");
    var emptyEl    = qs("pill-related-empty");
    var carouselEl = document.querySelector(".pill-carousel--related");
    var seeMore    = qs("pill-related-see-more");

    var slug = typeof slugOrPill === "string"
      ? slugOrPill.trim().toUpperCase()
      : (slugOrPill.tool_category || "").trim().toUpperCase();

    if (seeMore) {
      seeMore.href = slug
        ? "listagem.html?categoria=" + encodeURIComponent(slug)
        : "listagem.html";
    }

    if (!track || !apiBase || !slug) {
      if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = "Categoria não definida."; }
      if (carouselEl) carouselEl.hidden = true;
      return;
    }

    var url = apiBase + "/pills?tool_category=" + encodeURIComponent(slug) + "&limit=8";
    if (excludeId) url += "&exclude_id=" + encodeURIComponent(excludeId);

    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!Array.isArray(rows)) rows = [];
        track.innerHTML = "";
        if (rows.length === 0) {
          if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = "Não há pílulas desta ferramenta no momento."; }
          if (carouselEl) carouselEl.hidden = true;
          return;
        }
        if (emptyEl) emptyEl.hidden = true;
        if (carouselEl) carouselEl.hidden = false;
        rows.forEach(function (p) { track.appendChild(buildRelatedCard(p)); });
        if (typeof window.HP_bindCarousels === "function") window.HP_bindCarousels();
      })
      .catch(function () {
        track.innerHTML = "";
        if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = "Não foi possível carregar sugestões agora."; }
        if (carouselEl) carouselEl.hidden = true;
      });
  }

  function showError(msg) {
    var main = qs("conteudo-principal");
    if (main) main.innerHTML = '<div class="wrap main__inner"><p class="tab-panel__lede" style="padding:2rem">' + (msg || "Informe <code>?id=</code> ou <code>?category=</code> na URL.") + "</p></div>";
  }

  /* ── Modo: domínio por categoria (sem id de pílula) ─────────────────── */
  function bootDomainByCategory(cfg, slug) {
    enterDomainView();
    var titleEl = qs("dual-guide-title");
    if (titleEl) {
      var b = typeof window.resolveToolBrand === "function" ? window.resolveToolBrand(slug) : { label: slug };
      titleEl.textContent = "Guia de Domínio — " + (b.label || slug);
      document.title = "HelpProf — " + titleEl.textContent;
    }
    applyDynamicBrand(slug, cfg.apiBase);
    loadDomainGuide(cfg.apiBase, slug);
    loadRelatedPills(cfg.apiBase, slug, null);
  }

  /* ── Modo: pílula normal (com ou sem view=domain) ────────────────────── */
  function fetchPill(cfg, id) {
    fetch(cfg.apiBase + "/pills/" + encodeURIComponent(id), { headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status === 404 ? "Pílula não encontrada." : "Erro " + r.status);
        return r.json();
      })
      .then(function (pill) {
        currentPillId = pill.id;
        document.title = "HelpProf — " + pill.title;
        var h = qs("dual-guide-title");
        if (h) h.textContent = pill.title;
        applyDynamicBrand(pill.tool_category, cfg.apiBase);
        setSlideEmbed(pill.slides_url);
        renderContent(pill.survival_content);
        setDomainFallback(pill.tool_category);
        loadDomainGuide(cfg.apiBase, (pill.tool_category || "").trim().toUpperCase());
        loadRelatedPills(cfg.apiBase, pill, id);
        recordView(cfg.apiBase, id);
        if (IS_DOMAIN_VIEW) enterDomainView();
      })
      .catch(function (err) { showError(err && err.message ? err.message : "Erro ao carregar."); });
  }

  /* ── Bootstrap ───────────────────────────────────────────────────────── */
  function boot() {
    var cfg = window.HP_CONFIG;
    if (!cfg || !cfg.apiBase) { showError("Configure <code>js/hp-config.js</code>."); return; }
    bindPillLume(cfg);

    var id       = param("id");
    var category = (param("category") || "").trim().toUpperCase();

    /* Carregar marked.js antes de buscar conteúdo */
    var markedScript = document.createElement("script");
    markedScript.src = "https://cdn.jsdelivr.net/npm/marked@12/marked.min.js";
    markedScript.onload = function () {
      if (!id && category && IS_DOMAIN_VIEW) {
        bootDomainByCategory(cfg, category);
      } else if (id) {
        fetchPill(cfg, id);
      } else {
        showError();
      }
    };
    markedScript.onerror = function () {
      if (!id && category && IS_DOMAIN_VIEW) {
        bootDomainByCategory(cfg, category);
      } else if (id) {
        fetchPill(cfg, id);
      } else {
        showError();
      }
    };
    document.head.appendChild(markedScript);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
