(function () {
  "use strict";

  var root = document.getElementById("carousel-pills");
  var track = document.getElementById("pills-track");
  var viewport = root ? root.querySelector(".carousel__viewport") : null;
  var prevBtn = root ? root.querySelector(".carousel__btn--prev") : null;
  var nextBtn = root ? root.querySelector(".carousel__btn--next") : null;
  var dotsContainer = root ? root.querySelector(".carousel__dots") : null;
  var slides = track
    ? Array.prototype.slice.call(track.querySelectorAll(".carousel__slide"))
    : [];
  var total = slides.length;
  var index = 0;

  function setActive(i) {
    index = Math.max(0, Math.min(total - 1, i));
    slides.forEach(function (s, j) {
      s.classList.toggle("is-active", j === index);
    });
    if (!dotsContainer) return;
    var dots = dotsContainer.querySelectorAll(".carousel__dot");
    dots.forEach(function (d, j) {
      d.setAttribute("aria-selected", j === index ? "true" : "false");
      d.tabIndex = j === index ? 0 : -1;
    });
  }

  function scrollToIndex(i) {
    var el = slides[i];
    if (!el || !viewport) return;
    var maxScroll = viewport.scrollWidth - viewport.clientWidth;
    var target =
      el.offsetLeft - (viewport.clientWidth - el.offsetWidth) / 2;
    if (target < 0) target = 0;
    if (target > maxScroll) target = maxScroll;
    viewport.scrollTo({ left: target, behavior: "smooth" });
    setActive(i);
  }

  function nearestIndex() {
    if (!viewport || !slides.length) return 0;
    var mid = viewport.scrollLeft + viewport.clientWidth / 2;
    var best = 0;
    var bestDist = Infinity;
    slides.forEach(function (s, j) {
      var c = s.offsetLeft + s.offsetWidth / 2;
      var d = Math.abs(c - mid);
      if (d < bestDist) {
        bestDist = d;
        best = j;
      }
    });
    return best;
  }

  if (total && dotsContainer) {
    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Slide " + (i + 1));
      dot.addEventListener("click", function () {
        scrollToIndex(i);
      });
      dotsContainer.appendChild(dot);
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        scrollToIndex(index - 1 < 0 ? total - 1 : index - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        scrollToIndex(index + 1 >= total ? 0 : index + 1);
      });
    }

    var scrollTimer;
    viewport.addEventListener(
      "scroll",
      function () {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(function () {
          setActive(nearestIndex());
        }, 80);
      },
      { passive: true }
    );

    setActive(0);
  }

  document.querySelectorAll(".pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      var input = document.getElementById("chat-input");
      if (input) input.value = pill.textContent.trim();
    });
  });

  /* Assistente — botão canto + painel */
  var panel = document.getElementById("assistant-panel");
  var toggle = document.getElementById("assistant-toggle");
  var closeBtn = document.getElementById("assistant-close");
  var chatInput = document.getElementById("chat-input");

  function setAssistantOpen(open) {
    if (!panel || !toggle) return;
    if (open) {
      panel.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
      window.setTimeout(function () {
        if (chatInput) chatInput.focus();
      }, 50);
    } else {
      panel.setAttribute("hidden", "hidden");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  }

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = panel.hasAttribute("hidden");
      setAssistantOpen(open);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      setAssistantOpen(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel && !panel.hasAttribute("hidden")) {
      setAssistantOpen(false);
    }
  });

  window.addEventListener("resize", function () {
    if (viewport && track) {
      window.requestAnimationFrame(function () {
        if (typeof nearestIndex === "function") setActive(nearestIndex());
      });
    }
  });

  /* Ver todas — dúvidas extras */
  var verTodas = document.getElementById("faq-ver-todas");
  var faqExtra = document.getElementById("faq-all-extra");
  if (verTodas && faqExtra) {
    verTodas.addEventListener("click", function () {
      var aberto = !faqExtra.hasAttribute("hidden");
      if (aberto) {
        faqExtra.setAttribute("hidden", "hidden");
        verTodas.setAttribute("aria-expanded", "false");
        verTodas.textContent = "Ver todas";
      } else {
        faqExtra.removeAttribute("hidden");
        verTodas.setAttribute("aria-expanded", "true");
        verTodas.textContent = "Ver menos";
        faqExtra.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  }
})();
