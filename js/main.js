(function () {
  "use strict";

  /* ==========================================================================
   * Carrossel — Pílulas mais acessadas (index)
   * Rola o viewport horizontalmente ao clicar nas setas; largura do passo = 1 slide + gap.
   * ========================================================================== */
  function getCarouselStepPx(track) {
    if (!track) return 300;
    var slide = track.querySelector(".pill-carousel__slide");
    if (!slide) return 300;
    var styles = window.getComputedStyle(track);
    var gap = parseFloat(styles.columnGap || styles.gap) || 16;
    return slide.offsetWidth + gap;
  }

  function bindOneCarousel(root) {
    if (!(root instanceof Element) || root.getAttribute("data-hp-carousel-bound") === "1") return;
    root.setAttribute("data-hp-carousel-bound", "1");
    var viewport = root.querySelector(".pill-carousel__viewport");
    var prevBtn = root.querySelector(".pill-carousel__arrow--prev");
    var nextBtn = root.querySelector(".pill-carousel__arrow--next");
    var track = root.querySelector(".pill-carousel__track");
    if (!viewport || !prevBtn || !nextBtn || !track) return;

    function scrollBy(delta) {
      viewport.scrollBy({ left: delta, behavior: "smooth" });
    }

    prevBtn.addEventListener("click", function () {
      scrollBy(-getCarouselStepPx(track));
    });
    nextBtn.addEventListener("click", function () {
      scrollBy(getCarouselStepPx(track));
    });
  }

  function bindCarousels() {
    document.querySelectorAll(".pill-carousel").forEach(bindOneCarousel);
  }

  bindCarousels();
  window.HP_bindCarousels = bindCarousels;

  /* ==========================================================================
   * Animações de entrada — fade-in ao entrar no viewport
   * ========================================================================== */
  var revealSections = document.querySelectorAll(".section-reveal");

  function initReveal() {
    if (!revealSections.length) return;

    if (!("IntersectionObserver" in window)) {
      revealSections.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
    );

    revealSections.forEach(function (el) {
      observer.observe(el);
    });
  }

  initReveal();

  /* ==========================================================================
   * Dual Guide — abas (página pilulaOneDrive)
   * ========================================================================== */
  var tabButtons = document.querySelectorAll(".tab-switcher__btn[data-tab]");
  var panelPassos = document.getElementById("panel-passos");
  var panelDetalhe = document.getElementById("panel-detalhe");

  function setActiveTab(tabName) {
    tabButtons.forEach(function (btn) {
      var name = btn.getAttribute("data-tab");
      var isActive = name === tabName;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });

    if (panelPassos && panelDetalhe) {
      if (tabName === "passos") {
        panelPassos.removeAttribute("hidden");
        panelDetalhe.setAttribute("hidden", "hidden");
      } else {
        panelDetalhe.removeAttribute("hidden");
        panelPassos.setAttribute("hidden", "hidden");
      }
    }
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-tab");
      if (name) setActiveTab(name);
    });
  });

  /* ==========================================================================
   * Lume — troca de imagem (mao-abaixada / mao-levantada ou data-src-*)
   * ========================================================================== */
  var lumeImg = document.getElementById("lume-mascot");
  var lumeSpeech = document.getElementById("lume-speech");

  var srcDown =
    (lumeImg && lumeImg.getAttribute("data-src-down")) ||
    (lumeImg && lumeImg.getAttribute("src")) ||
    "mao-abaixada.png";
  var srcUp =
    (lumeImg && lumeImg.getAttribute("data-src-up")) || "mao-levantada.png";

  function lumeActivate() {
    if (!lumeImg) return;
    lumeImg.src = srcUp;
    if (lumeSpeech) {
      lumeSpeech.removeAttribute("hidden");
    }
  }

  function lumeDeactivate() {
    if (!lumeImg) return;
    lumeImg.src = srcDown;
    if (lumeSpeech) {
      lumeSpeech.setAttribute("hidden", "hidden");
    }
  }

  if (lumeImg) {
    lumeImg.addEventListener("mouseenter", lumeActivate);
    lumeImg.addEventListener("mouseleave", lumeDeactivate);
    lumeImg.addEventListener("mousedown", lumeActivate);
    lumeImg.addEventListener("touchstart", function (e) {
      lumeActivate();
      e.preventDefault();
    }, { passive: false });
    lumeImg.addEventListener("touchend", function () {
      window.setTimeout(lumeDeactivate, 450);
    });
    lumeImg.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        lumeActivate();
        window.setTimeout(lumeDeactivate, 1400);
      }
    });
  }
})();
