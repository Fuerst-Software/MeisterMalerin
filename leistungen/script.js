/* script.js — Leistungen: Mobile Nav + PERFECT Sticky-Offset Scroll + Accordion
   Ready to publish.
*/
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* =========================
     Mobile Navigation
  ========================= */
  const burger = $(".nav__burger");
  const navMobile = $("#navMobile");

  const openMenu = () => {
    if (!navMobile) return;
    navMobile.hidden = false;
    burger?.setAttribute("aria-expanded", "true");
  };
  const closeMenu = () => {
    if (!navMobile) return;
    navMobile.hidden = true;
    burger?.setAttribute("aria-expanded", "false");
  };

  if (burger && navMobile) {
    burger.addEventListener("click", () => (navMobile.hidden ? openMenu() : closeMenu()));
    $$("a", navMobile).forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
    document.addEventListener("click", (e) => {
      if (navMobile.hidden) return;
      const inside = navMobile.contains(e.target) || burger.contains(e.target);
      if (!inside) closeMenu();
    });
  }

  /* =========================
     PERFECT Sticky Offset (dynamisch)
  ========================= */
  const topbar = $(".topbar");
  const chipBar = $(".chipBar");

  const getStickyOffset = () => {
    const topH = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
    const chipH = chipBar ? Math.ceil(chipBar.getBoundingClientRect().height) : 0;

    // CSS Variablen immer aktuell -> scroll-margin-top passt auch perfekt
    document.documentElement.style.setProperty("--topbarH", `${topH}px`);
    document.documentElement.style.setProperty("--chipbarH", `${chipH}px`);

    return topH + chipH + 16;
  };

  let scrollOffset = 0;
  const recalc = () => (scrollOffset = getStickyOffset());

  // initial + nach Laden (Fonts können Höhen ändern)
  recalc();
  window.addEventListener("load", recalc, { once: true });
  window.addEventListener("resize", recalc, { passive: true });

  /* =========================
     Details / Accordion
  ========================= */
  const detailsWrap = $("[data-details-wrap]");
  const details = $$("[data-detail]");
  const openers = $$("[data-open-detail]");
  const chips = $$("[data-chipbar] .chip");
  const closers = $$("[data-close-detail]");

  const getIdFromHash = (hash) => (hash || "").replace("#", "").trim();

  const setWrapOpen = (isOpen) => {
    if (!detailsWrap) return;
    detailsWrap.setAttribute("data-has-open", isOpen ? "true" : "false");
  };

  const collapseAll = (exceptId = null) => {
    details.forEach((d) => {
      if (exceptId && d.id === exceptId) return;
      d.setAttribute("data-collapsed", "true");
    });
  };

  const anyOpen = () => details.some((d) => d.getAttribute("data-collapsed") === "false");

  const setActiveChip = (id) => {
    chips.forEach((c) => c.classList.toggle("is-active", c.getAttribute("href") === `#${id}`));
  };
  const clearActiveChips = () => chips.forEach((c) => c.classList.remove("is-active"));

  const scrollToPerfect = (target) => {
    if (!target) return;
    recalc();

    // Bild oben perfekt sichtbar
    const media = target.querySelector(".detailMedia") || target;

    // 2x rAF: wartet auf Layout (Wrapper wird gerade eingeblendet)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        recalc();
        const y = media.getBoundingClientRect().top + window.pageYOffset - scrollOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  };

  const expand = (id, { scroll = true } = {}) => {
    const target = document.getElementById(id);
    if (!target) return;

    setWrapOpen(true);

    // nur eins offen
    collapseAll(id);
    target.setAttribute("data-collapsed", "false");
    setActiveChip(id);

    if (scroll) scrollToPerfect(target);
  };

  const closeCard = (card) => {
    if (!card) return;
    card.setAttribute("data-collapsed", "true");
    clearActiveChips();
    if (!anyOpen()) setWrapOpen(false);
  };

  /* =========================
     Click: Overview Cards
  ========================= */
  openers.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();

      const id = getIdFromHash(href);
      history.replaceState(null, "", href);
      expand(id, { scroll: true });
    });
  });

  /* =========================
     Click: Chips
  ========================= */
  chips.forEach((chip) => {
    chip.addEventListener("click", (e) => {
      const href = chip.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();

      const id = getIdFromHash(href);
      history.replaceState(null, "", href);
      expand(id, { scroll: true });
    });
  });

  /* =========================
     Close Buttons
  ========================= */
  closers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-detail]");
      closeCard(card);
    });
  });

  /* =========================
     Initial State
  ========================= */
  collapseAll(null);
  setWrapOpen(false);

  const initial = getIdFromHash(location.hash);
  if (initial) {
    // kurz warten bis Layout/Fonts sitzen, dann öffnen & perfekt scrollen
    requestAnimationFrame(() => expand(initial, { scroll: true }));
  }

  /* =========================
     Year in Footer
  ========================= */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
