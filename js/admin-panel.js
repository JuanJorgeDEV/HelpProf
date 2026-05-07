/**
 * Painel Triad Support — admin.html
 * Depende de js/hp-config.js (window.HP_CONFIG) e js/tool-assets.js.
 */
(function () {
  "use strict";

  var cfg = window.HP_CONFIG;
  if (!cfg || !cfg.apiBase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    document.body.innerHTML =
      '<div style="padding:2rem;font-family:sans-serif;max-width:560px;margin:auto">' +
      "<h1>Configuração ausente</h1>" +
      "<p>Crie <code>js/hp-config.js</code> copiando <code>js/hp-config.example.js</code> " +
      "e preencha <code>apiBase</code>, <code>supabaseUrl</code> e <code>supabaseAnonKey</code>.</p>" +
      "</div>";
    return;
  }

  var supabase = null;
  var accessToken = null;
  var categoriesCache = [];

  // ── elementos UI ─────────────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };

  var ui = {
    loginSection: $("adm-login"),
    panelSection: $("adm-panel"),
    loginStatus: $("adm-login-status"),
    status: $("adm-status"),
    userLabel: $("adm-user-label"),
    btnLogin: $("btn-login"),
    btnLogout: $("btn-logout"),
    // pill form
    pillForm: $("pill-form"),
    pillFormTitle: $("pill-form-title"),
    pillEditId: $("pill-edit-id"),
    pillTitle: $("pill-title"),
    pillCategoryInput: $("pill-category-input"),
    pillCategoryHidden: $("pill-category"),
    pillTags: $("pill-tags"),
    pillContent: $("pill-content"),
    pillSlidesUrl: $("pill-slides-url"),
    btnPillSubmit: $("btn-pill-submit"),
    btnPillCancel: $("btn-pill-cancel"),
    pillsTbody: $("pills-tbody"),
    includeDeleted: $("include-deleted"),
    btnRefreshPills: $("btn-refresh-pills"),
    catDropdown: $("cat-dropdown"),
    // category form
    catForm: $("cat-form"),
    catFormTitle: $("cat-form-title"),
    catEditId: $("cat-edit-id"),
    catSlug: $("cat-slug"),
    catName: $("cat-name"),
    catLogoUrl: $("cat-logo-url"),
    catBrandColor: $("cat-brand-color"),
    catSortOrder: $("cat-sort-order"),
    btnCatSubmit: $("btn-cat-submit"),
    btnCatCancel: $("btn-cat-cancel"),
    catsTbody: $("cats-tbody"),
    btnRefreshCats: $("btn-refresh-cats"),
  };

  // ── utilidades ───────────────────────────────────────────────────────────
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  /** Espelha o backend: iframe → src, http→https, /pub→/pubembed, só docs.google.com/presentation/d/… */
  var SLIDES_FINAL_RE =
    /^https:\/\/docs\.google\.com\/presentation\/d\/e\/[^/\s#?]+\/pubembed(\?[^\s#]*)?$/i;
  var SLIDES_PREFIX = "https://docs.google.com/presentation/d/";

  function extractIframeSrcIfPresent(value) {
    var s = String(value).trim();
    if (!/^<iframe/i.test(s)) return s;
    var m = /\bsrc\s*=\s*"([^"]+)"|\bsrc\s*=\s*'([^']+)'|\bsrc\s*=\s*([^\s>]+)/i.exec(s);
    if (!m) throw new Error("HTML de iframe sem atributo src reconhecível.");
    return (m[1] || m[2] || m[3]).trim();
  }

  function sanitizeGoogleSlidesUrl(raw) {
    var s = extractIframeSrcIfPresent(raw);
    s = s.replace(/^["'\s]+|["'\s]+$/g, "");
    if (!s) return "";
    if (/^\/\//i.test(s)) s = "https:" + s;
    if (/^http:\/\//i.test(s)) s = "https://" + s.slice(7);
    if (s.toLowerCase().indexOf(SLIDES_PREFIX) !== 0) {
      throw new Error(
        "O link deve ser do Google Slides (Publicar na Web / Incorporar), começando com " + SLIDES_PREFIX
      );
    }
    var url;
    try {
      url = new URL(s);
    } catch (e) {
      throw new Error("URL dos slides inválida.");
    }
    if (url.protocol !== "https:") throw new Error("Use apenas HTTPS.");
    if (url.hostname.toLowerCase() !== "docs.google.com") {
      throw new Error("Apenas links em docs.google.com são permitidos.");
    }
    var path = url.pathname.replace(/\/$/, "") || "/";
    if (path.toLowerCase().indexOf("/presentation/d/") !== 0) {
      throw new Error("Caminho deve ser de uma apresentação (presentation/d/…).");
    }
    var pl = path.toLowerCase();
    if (pl.endsWith("/pub") && !pl.endsWith("/pubembed")) {
      path = path.slice(0, -4) + "/pubembed";
    }
    url.protocol = "https:";
    url.hostname = "docs.google.com";
    url.pathname = path;
    url.hash = "";
    var out = url.href.split("#")[0];
    if (!SLIDES_FINAL_RE.test(out)) {
      throw new Error(
        "Formato não reconhecido. Use o link «Publicar na Web» (…/presentation/d/e/…/pub ou incorporar)."
      );
    }
    return out;
  }

  function tryNormalizeSlidesField() {
    if (!ui.pillSlidesUrl) return;
    var v = ui.pillSlidesUrl.value.trim();
    if (!v) return;
    try {
      ui.pillSlidesUrl.value = sanitizeGoogleSlidesUrl(v);
    } catch (_) {
      /* mantém o texto; submit ou backend avisam */
    }
  }

  function setStatus(msg, isError) {
    ui.status.textContent = msg;
    ui.status.style.color = isError ? "#b91c1c" : "#475569";
  }

  function setLoginStatus(msg, isError) {
    ui.loginStatus.textContent = msg;
    ui.loginStatus.style.color = isError ? "#b91c1c" : "#475569";
  }

  // ── apiFetch ─────────────────────────────────────────────────────────────
  async function apiFetch(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (accessToken) headers.Authorization = "Bearer " + accessToken;
    var res = await fetch(cfg.apiBase + path, Object.assign({}, opts, { headers: headers }));
    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
    if (!res.ok) {
      var msg = (data && data.error && (data.error.message || data.error.detail))
        || (data && data.detail)
        || res.statusText
        || "Erro " + res.status;
      if (Array.isArray(msg)) msg = msg.map(function (e) { return e.msg || JSON.stringify(e); }).join("; ");
      throw new Error(msg);
    }
    return data;
  }

  // ── auth ─────────────────────────────────────────────────────────────────
  async function initSupabase() {
    var mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabase = mod.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    var { data } = await supabase.auth.getSession();
    if (data.session && data.session.access_token) {
      accessToken = data.session.access_token;
      showPanel(data.session.user);
    } else {
      showLogin();
    }
    supabase.auth.onAuthStateChange(function (_ev, session) {
      accessToken = session ? session.access_token : null;
      if (accessToken) {
        showPanel(session.user);
      } else {
        showLogin();
      }
    });
  }

  function showLogin() {
    ui.loginSection.hidden = false;
    ui.panelSection.hidden = true;
  }

  function showPanel(user) {
    ui.loginSection.hidden = true;
    ui.panelSection.hidden = false;
    if (user && ui.userLabel) ui.userLabel.textContent = user.email || "";
    loadCategories().then(function () {
      refreshPills();
      refreshCats();
    });
  }

  ui.btnLogin.addEventListener("click", async function () {
    setLoginStatus("Entrando…");
    try {
      var { data, error } = await supabase.auth.signInWithPassword({
        email: ui.btnLogin.closest("section").querySelector("#adm-email").value.trim(),
        password: ui.btnLogin.closest("section").querySelector("#adm-password").value,
      });
      if (error) throw error;
      accessToken = data.session.access_token;
    } catch (e) {
      setLoginStatus(e.message || String(e), true);
    }
  });

  ui.btnLogout.addEventListener("click", async function () {
    await supabase.auth.signOut();
    accessToken = null;
    setStatus("");
    showLogin();
  });

  // ── abas ─────────────────────────────────────────────────────────────────
  document.querySelectorAll(".adm-tab[data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".adm-tab").forEach(function (b) {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".adm-pane").forEach(function (p) {
        p.classList.remove("is-active");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      var pane = document.getElementById("pane-" + btn.getAttribute("data-tab"));
      if (pane) pane.classList.add("is-active");
    });
  });

  // ── categorias – autocomplete + cache ────────────────────────────────────
  async function loadCategories() {
    try {
      categoriesCache = await apiFetch("/categories?limit=500");
    } catch (_) { categoriesCache = []; }
    updateToolAssets();
  }

  function updateToolAssets() {
    if (!window.TOOL_ASSETS) window.TOOL_ASSETS = {};
    categoriesCache.forEach(function (c) {
      window.TOOL_ASSETS[c.slug] = {
        logo: c.logo_url || "Logo.jpeg",
        color: c.brand_color || "#6366f1",
        label: c.name || c.slug,
      };
    });
  }

  var catDropdownVisible = false;

  function buildDropdown(query) {
    var q = (query || "").toLowerCase().trim();
    var matches = q
      ? categoriesCache.filter(function (c) {
          return (
            c.slug.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q)
          );
        })
      : categoriesCache.slice();

    ui.catDropdown.innerHTML = "";

    if (matches.length === 0 && q) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.textContent = 'Criar "' + q.toUpperCase() + '" como nova ferramenta…';
      li.dataset.createSlug = q.toUpperCase();
      ui.catDropdown.appendChild(li);
    } else {
      matches.slice(0, 10).forEach(function (c) {
        var li = document.createElement("li");
        li.setAttribute("role", "option");
        li.dataset.slug = c.slug;
        li.textContent = c.name + " (" + c.slug + ")";
        ui.catDropdown.appendChild(li);
      });
    }

    ui.catDropdown.hidden = ui.catDropdown.children.length === 0;
    catDropdownVisible = !ui.catDropdown.hidden;
  }

  ui.pillCategoryInput.addEventListener("input", function () {
    buildDropdown(this.value);
    // Limpar hidden enquanto digita
    ui.pillCategoryHidden.value = "";
  });

  ui.pillCategoryInput.addEventListener("focus", function () {
    buildDropdown(this.value);
  });

  ui.catDropdown.addEventListener("click", async function (e) {
    var li = e.target.closest("li");
    if (!li) return;
    if (li.dataset.createSlug) {
      // criar on-the-fly: muda para aba categorias e preenche o formulário
      var slug = li.dataset.createSlug;
      setStatus('Preencha os dados da ferramenta "' + slug + '" e depois volte à aba Pílulas.');
      document.querySelector('.adm-tab[data-tab="categories"]').click();
      ui.catSlug.value = slug;
      ui.catName.value = slug.charAt(0) + slug.slice(1).toLowerCase();
      ui.catSlug.focus();
    } else {
      ui.pillCategoryInput.value = li.textContent.replace(/\s*\([^)]+\)$/, "").trim();
      ui.pillCategoryHidden.value = li.dataset.slug;
    }
    ui.catDropdown.hidden = true;
    catDropdownVisible = false;
  });

  document.addEventListener("click", function (e) {
    if (catDropdownVisible && !ui.catDropdown.contains(e.target) && e.target !== ui.pillCategoryInput) {
      ui.catDropdown.hidden = true;
      catDropdownVisible = false;
    }
  });

  // ── pílulas ───────────────────────────────────────────────────────────────
  async function refreshPills() {
    var qs = ui.includeDeleted.checked ? "?include_deleted=true" : "";
    try {
      var rows = await apiFetch("/admin/pills" + qs);
      renderPillsTable(rows);
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  function renderPillsTable(rows) {
    ui.pillsTbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="6" style="color:var(--text-muted);font-style:italic">Nenhuma pílula encontrada.</td>';
      ui.pillsTbody.appendChild(tr);
      return;
    }
    rows.forEach(function (p) {
      var tr = document.createElement("tr");
      var archived = p.deleted_at ? '<span class="adm-badge adm-badge--arch">arquivada</span>' : "";
      var slideIcon = p.slides_url
        ? '<a href="' + esc(p.slides_url) + '" target="_blank" rel="noopener" title="Ver slides">▶</a>'
        : "—";
      var tags = (p.tags || []).map(function (t) { return esc(t); }).join(", ");
      tr.innerHTML =
        "<td>" + esc(p.title) + " " + archived + "</td>" +
        "<td>" + esc(p.tool_category) + "</td>" +
        "<td style='max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='" + tags + "'>" + tags + "</td>" +
        "<td>" + esc(p.views_count) + "</td>" +
        "<td>" + slideIcon + "</td>" +
        '<td><button class="btn-ghost" data-action="edit-pill" data-id="' + esc(p.id) + '">Editar</button>' +
        (p.deleted_at
          ? ""
          : ' <button class="btn-danger" data-action="archive-pill" data-id="' + esc(p.id) + '" style="margin-left:.5rem;font-size:.8rem">Arquivar</button>') +
        "</td>";
      ui.pillsTbody.appendChild(tr);
    });
  }

  ui.pillsTbody.addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var id = btn.dataset.id;
    if (btn.dataset.action === "archive-pill") {
      if (!confirm("Arquivar esta pílula?")) return;
      try {
        await apiFetch("/admin/pills/" + encodeURIComponent(id), { method: "DELETE" });
        setStatus("Pílula arquivada.");
        refreshPills();
      } catch (e) { setStatus(e.message, true); }
    }
    if (btn.dataset.action === "edit-pill") {
      var rows = ui.pillsTbody.querySelectorAll("tr");
      // buscar a pílula na listagem já renderizada pela API (via dado do data-id)
      loadPillForEdit(id);
    }
  });

  async function loadPillForEdit(id) {
    try {
      var p = await apiFetch("/pills/" + encodeURIComponent(id));
      ui.pillEditId.value = p.id;
      ui.pillTitle.value = p.title;
      var cat = categoriesCache.find(function (c) { return c.slug === p.tool_category; });
      ui.pillCategoryInput.value = cat ? cat.name + " (" + cat.slug + ")" : p.tool_category;
      ui.pillCategoryHidden.value = p.tool_category;
      ui.pillTags.value = (p.tags || []).join(", ");
      ui.pillContent.value = p.survival_content || "";
      ui.pillSlidesUrl.value = p.slides_url || "";
      ui.pillFormTitle.textContent = "Editar pílula";
      ui.btnPillSubmit.textContent = "Salvar alterações";
      ui.btnPillCancel.hidden = false;
      document.querySelector('.adm-tab[data-tab="pills"]').click();
      ui.pillTitle.focus();
      setStatus("Editando pílula: " + p.title);
    } catch (e) { setStatus(e.message, true); }
  }

  function resetPillForm() {
    ui.pillEditId.value = "";
    ui.pillForm.reset();
    ui.pillCategoryHidden.value = "";
    ui.pillFormTitle.textContent = "Nova pílula";
    ui.btnPillSubmit.textContent = "Criar pílula";
    ui.btnPillCancel.hidden = true;
  }

  ui.btnPillCancel.addEventListener("click", resetPillForm);

  ui.pillSlidesUrl.addEventListener("blur", tryNormalizeSlidesField);
  ui.pillSlidesUrl.addEventListener("paste", function () {
    setTimeout(tryNormalizeSlidesField, 0);
  });

  ui.pillForm.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var editId = ui.pillEditId.value.trim();
    var slug = ui.pillCategoryHidden.value.trim() || ui.pillCategoryInput.value.trim().toUpperCase();
    var tagsRaw = ui.pillTags.value;
    var tags = tagsRaw.split(/[,;]/).map(function (t) { return t.trim(); }).filter(Boolean);
    var body = {
      title: ui.pillTitle.value.trim(),
      tool_category: slug,
      survival_content: ui.pillContent.value,
      tags: tags,
    };
    var slidesRaw = ui.pillSlidesUrl.value.trim();
    if (slidesRaw) {
      try {
        slidesRaw = sanitizeGoogleSlidesUrl(slidesRaw);
        ui.pillSlidesUrl.value = slidesRaw;
        body.slides_url = slidesRaw;
      } catch (err) {
        setStatus(err && err.message ? err.message : "URL dos slides inválida.", true);
        return;
      }
    }

    setStatus("Salvando…");
    try {
      if (editId) {
        await apiFetch("/admin/pills/" + encodeURIComponent(editId), {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setStatus("Pílula atualizada.");
      } else {
        await apiFetch("/admin/pills", { method: "POST", body: JSON.stringify(body) });
        setStatus("Pílula criada.");
      }
      resetPillForm();
      refreshPills();
    } catch (e) { setStatus(e.message, true); }
  });

  ui.btnRefreshPills.addEventListener("click", function () {
    refreshPills().catch(function (e) { setStatus(e.message, true); });
  });
  ui.includeDeleted.addEventListener("change", function () {
    refreshPills().catch(function (e) { setStatus(e.message, true); });
  });

  // ── categorias ────────────────────────────────────────────────────────────
  async function refreshCats() {
    try {
      categoriesCache = await apiFetch("/categories?limit=500");
      updateToolAssets();
      renderCatsTable(categoriesCache);
    } catch (e) { setStatus(e.message, true); }
  }

  function renderCatsTable(rows) {
    ui.catsTbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="6" style="color:var(--text-muted);font-style:italic">Nenhuma ferramenta cadastrada.</td>';
      ui.catsTbody.appendChild(tr);
      return;
    }
    rows.forEach(function (c) {
      var tr = document.createElement("tr");
      var logo = c.logo_url
        ? '<img src="' + esc(c.logo_url) + '" alt="" width="28" height="28" style="object-fit:contain;border-radius:4px;background:#f1f5f9;padding:2px">'
        : "—";
      tr.innerHTML =
        "<td><strong>" + esc(c.slug) + "</strong></td>" +
        "<td>" + esc(c.name) + "</td>" +
        '<td><span class="swatch" style="background:' + esc(c.brand_color) + '"></span>' + esc(c.brand_color) + "</td>" +
        "<td>" + logo + "</td>" +
        "<td>" + esc(c.sort_order) + "</td>" +
        '<td><button class="btn-ghost" data-action="edit-cat" data-id="' + esc(c.id) + '" data-slug="' + esc(c.slug) + '">Editar</button>' +
        ' <button class="btn-danger" data-action="delete-cat" data-id="' + esc(c.id) + '" data-slug="' + esc(c.slug) + '" style="margin-left:.5rem;font-size:.8rem">Apagar</button></td>';
      ui.catsTbody.appendChild(tr);
    });
  }

  ui.catsTbody.addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var id = btn.dataset.id, slug = btn.dataset.slug;
    if (btn.dataset.action === "delete-cat") {
      if (!confirm('Apagar a ferramenta "' + slug + '"? Ela será removida permanentemente.')) return;
      try {
        await apiFetch("/categories/" + encodeURIComponent(id), { method: "DELETE" });
        setStatus("Ferramenta apagada.");
        refreshCats();
      } catch (e) { setStatus(e.message, true); }
    }
    if (btn.dataset.action === "edit-cat") {
      var cat = categoriesCache.find(function (c) { return c.id === id; });
      if (!cat) return;
      ui.catEditId.value = cat.id;
      ui.catSlug.value = cat.slug;
      ui.catSlug.disabled = true;
      ui.catName.value = cat.name;
      ui.catLogoUrl.value = cat.logo_url || "";
      ui.catBrandColor.value = cat.brand_color || "#6366f1";
      ui.catSortOrder.value = cat.sort_order;
      ui.catFormTitle.textContent = "Editar ferramenta: " + cat.slug;
      ui.btnCatSubmit.textContent = "Salvar alterações";
      ui.btnCatCancel.hidden = false;
      ui.catName.focus();
    }
  });

  function resetCatForm() {
    ui.catEditId.value = "";
    ui.catSlug.disabled = false;
    ui.catForm.reset();
    ui.catBrandColor.value = "#6366f1";
    ui.catFormTitle.textContent = "Nova ferramenta / categoria";
    ui.btnCatSubmit.textContent = "Criar ferramenta";
    ui.btnCatCancel.hidden = true;
  }

  ui.btnCatCancel.addEventListener("click", resetCatForm);

  ui.catForm.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var editId = ui.catEditId.value.trim();
    setStatus("Salvando ferramenta…");
    try {
      if (editId) {
        var patch = {
          name: ui.catName.value.trim(),
          logo_url: ui.catLogoUrl.value.trim() || null,
          brand_color: ui.catBrandColor.value.trim(),
          sort_order: parseInt(ui.catSortOrder.value, 10) || 0,
        };
        await apiFetch("/categories/" + encodeURIComponent(editId), {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        setStatus("Ferramenta atualizada.");
      } else {
        var body = {
          slug: ui.catSlug.value.trim().toUpperCase(),
          name: ui.catName.value.trim(),
          logo_url: ui.catLogoUrl.value.trim() || null,
          brand_color: ui.catBrandColor.value.trim(),
          sort_order: parseInt(ui.catSortOrder.value, 10) || 0,
        };
        await apiFetch("/categories", { method: "POST", body: JSON.stringify(body) });
        setStatus("Ferramenta criada.");
      }
      resetCatForm();
      refreshCats();
    } catch (e) { setStatus(e.message, true); }
  });

  ui.btnRefreshCats.addEventListener("click", function () {
    refreshCats().catch(function (e) { setStatus(e.message, true); });
  });

  // ── bootstrap ────────────────────────────────────────────────────────────
  initSupabase().catch(function (e) {
    setLoginStatus(e.message || String(e), true);
  });
})();
