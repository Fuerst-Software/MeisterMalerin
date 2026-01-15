/* script.js — Leistungen: Mobile Nav + Accordion Details (ohne Leerraum) + Chips
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
     Details Wrapper Toggle (keine Lücke)
  ========================= */
  const detailsWrap = $("[data-details-wrap]");
  const details = $$("[data-detail]");
  const openers = $$("[data-open-detail]");
  const chips = $$("[data-chipbar] .chip");
  const closers = $$("[data-close-detail]");

  const setWrapOpen = (isOpen) => {
    if (!detailsWrap) return;
    detailsWrap.setAttribute("data-has-open", isOpen ? "true" : "false");
  };

  const topbarH = 78;
  const chipbarH = 52;
  const scrollOffset = topbarH + chipbarH + 16;

  const getIdFromHash = (hash) => (hash || "").replace("#", "").trim();

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

  const expand = (id, { scroll = true } = {}) => {
    const target = document.getElementById(id);
    if (!target) return;

    // Wrapper sichtbar machen -> JETZT erst entsteht Platz (gewollt)
    setWrapOpen(true);

    // nur eins offen lassen
    collapseAll(id);
    target.setAttribute("data-collapsed", "false");
    setActiveChip(id);

    if (scroll) {
      // WICHTIG: scroll erst nachdem wrapper sichtbar ist (sonst falsche Position)
      requestAnimationFrame(() => {
        const y = target.getBoundingClientRect().top + window.pageYOffset - scrollOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    }
  };

  const closeCard = (card) => {
    if (!card) return;
    card.setAttribute("data-collapsed", "true");
    clearActiveChips();

    // wenn danach nix mehr offen -> wrapper wieder weg (kein Leerraum)
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
     Close Buttons in Detail
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
  // default: alles zu, wrapper weg
  collapseAll(null);
  setWrapOpen(false);

  // deep link -> öffnet korrekt & positioniert richtig
  const initial = getIdFromHash(location.hash);
  if (initial) {
    requestAnimationFrame(() => expand(initial, { scroll: true }));
  }

  /* =========================
     Active Chip on Scroll (nur wenn offen)
  ========================= */
  const obs = new IntersectionObserver(
    (entries) => {
      if (!anyOpen()) return;

      const best = entries
        .filter((x) => x.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (best?.target?.id) setActiveChip(best.target.id);
    },
    { threshold: [0.35, 0.5, 0.65] }
  );

  details.forEach((d) => obs.observe(d));
})();
