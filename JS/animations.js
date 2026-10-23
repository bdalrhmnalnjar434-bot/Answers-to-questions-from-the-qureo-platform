
/* =========================================
   TXT VAULT — MOTION CONTROLLER
   ========================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const selectors = [
    ".hero",
    ".section-heading",
    ".search",
    ".file-card",
    ".file-item",
    ".panel",
    ".form-wrap",
    ".reader",
    ".counter",
    "footer"
  ];

  let observer = null;

  function revealElements() {
    if (reduceMotion) return;

    const elements = document.querySelectorAll(selectors.join(","));

    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => {
        el.classList.add("vault-reveal", "is-visible");
      });
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: "0px 0px -20px 0px"
      });
    }

    elements.forEach((el, index) => {
      if (el.dataset.motionReady === "true") return;

      el.dataset.motionReady = "true";
      el.classList.add("vault-reveal");
      el.style.setProperty(
        "--reveal-delay",
        `${Math.min(index % 5, 4) * 70}ms`
      );

      observer.observe(el);
    });
  }

  function initialize() {
    if (reduceMotion) return;

    revealElements();

    document.querySelectorAll("table tbody tr").forEach((row, index) => {
      if (row.dataset.motionRowReady === "true") return;

      row.dataset.motionRowReady = "true";
      row.classList.add("vault-table-row");
      row.style.animationDelay = `${Math.min(index, 8) * 40}ms`;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

  window.TXTVaultMotion = Object.freeze({
    refresh: initialize
  });
})();
