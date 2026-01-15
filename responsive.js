/* responsive.js — FINAL (hard-centering + nav hardening)
   For your provided HTML structure.

   Fixes:
   - Mobile nav always works (capture click, hidden handling, scroll lock, outside click, ESC)
   - Hero center card: forced centered + auto-correct if it drifts (scrollbar/vw/transform issues)
   - Header right side: request + burger vertically centered
   - Anchor offset under sticky topbar
   - iOS viewport height fix + safe-area padding
*/
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isMobileBP = () => window.innerWidth < 900;

  /* =========================================================
     0) Mobile viewport height var (iOS 100vh fix)
  ========================================================= */
  function setVHVar() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }
  setVHVar();
  window.addEventListener("resize", setVHVar, { passive: true });
  window.addEventListener("orientationchange", setVHVar, { passive: true });

  /* =========================================================
     Helpers
  ========================================================= */
  const raf = (fn) => requestAnimationFrame(fn);

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* =========================================================
     1) Header hardening (mobile align)
  ========================================================= */
  function hardenHeaderLayout() {
    const topbar = $(".topbar");
    const nav = $(".nav");
    const brand = $(".brand");
    const navRight = $(".nav__right");
    const navBtn = $(".nav__btn");
    const navIcon = $(".nav__icon");
    const burger = $(".nav__burger");

    if (!topbar || !nav || !navRight || !brand) return;

    // Safe-area for notch
    topbar.style.paddingTop = "max(8px, env(safe-area-inset-top))";

    nav.style.display = "flex";
    nav.style.alignItems = "center";
    nav.style.justifyContent = "space-between";
    nav.style.gap = "14px";

    brand.style.display = "flex";
    brand.style.alignItems = "center";
    brand.style.flex = "0 0 auto";

    navRight.style.display = "flex";
    navRight.style.alignItems = "center";
    navRight.style.justifyContent = "center";
    navRight.style.gap = isMobileBP() ? "10px" : "12px";
    navRight.style.flex = "0 0 auto";

    [navBtn, navIcon, burger].forEach((el) => {
      if (!el) return;
      el.style.display = "inline-flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.lineHeight = "1";
    });

    if (navBtn) {
      navBtn.style.whiteSpace = "nowrap";
      if (isMobileBP()) {
        navBtn.style.paddingLeft = "12px";
        navBtn.style.paddingRight = "12px";
      }
    }

    if (burger) {
      burger.style.width = burger.style.width || "44px";
      burger.style.height = burger.style.height || "44px";
    }
  }
  hardenHeaderLayout();
  window.addEventListener("resize", hardenHeaderLayout, { passive: true });

  /* =========================================================
     2) Scroll lock (for mobile nav)
  ========================================================= */
  const scrollLock = (() => {
    let locked = false;
    let y = 0;

    function lock() {
      if (locked) return;
      locked = true;
      y = window.scrollY || document.documentElement.scrollTop || 0;

      document.body.style.position = "fixed";
      document.body.style.top = `-${y}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    }

    function unlock() {
      if (!locked) return;
      locked = false;

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";

      window.scrollTo(0, y);
    }

    return { lock, unlock };
  })();

  /* =========================================================
     3) Mobile Nav (guaranteed)
     HTML:
       button.nav__burger (aria-controls="navMobile")
       div#navMobile.hidden
  ========================================================= */
  const burger = $(".nav__burger");
  const navMobile = $("#navMobile");
  const nav = $(".nav");

  function setNavState(open) {
    if (!burger || !navMobile) return;

    burger.setAttribute("aria-controls", "navMobile");
    burger.setAttribute("aria-expanded", open ? "true" : "false");

    navMobile.hidden = !open; // your HTML uses hidden
    navMobile.classList.toggle("is-open", open);
    navMobile.setAttribute("aria-hidden", open ? "false" : "true");

    document.documentElement.classList.toggle("mm-nav-open", open);

    if (open) {
      scrollLock.lock();
      const firstLink = navMobile.querySelector("a");
      if (firstLink) firstLink.focus({ preventScroll: true });
    } else {
      scrollLock.unlock();
      burger.focus({ preventScroll: true });
    }
  }

  function isNavOpen() {
    if (!burger || !navMobile) return false;
    return burger.getAttribute("aria-expanded") === "true" && navMobile.hidden === false;
  }

  if (burger && navMobile) {
    // force a clean start state (even if script.js messed it up)
    setNavState(false);

    // capture listener to override conflicting handlers
    burger.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        setNavState(!isNavOpen());
      },
      true
    );

    // close when clicking any link in mobile menu
    navMobile.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      setNavState(false);
    });

    // outside click closes
    document.addEventListener(
      "click",
      (e) => {
        if (!isNavOpen()) return;
        const inside = (nav && nav.contains(e.target)) || navMobile.contains(e.target);
        if (!inside) setNavState(false);
      },
      true
    );

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isNavOpen()) setNavState(false);
    });

    // if we resize to desktop, close
    window.addEventListener(
      "resize",
      () => {
        if (!isNavOpen()) return;
        if (!isMobileBP()) setNavState(false);
      },
      { passive: true }
    );
  }

  /* =========================================================
     4) Anchor offset under sticky topbar
  ========================================================= */
  const topbar = $(".topbar");

  function topbarOffset() {
    const h = topbar?.offsetHeight || 0;
    return Math.max(0, h + 10);
  }

  function scrollToHash(hash, behavior = "smooth") {
    if (!hash || hash === "#") return false;
    const id = hash.startsWith("#") ? hash.slice(1) : hash;
    const el = document.getElementById(id);
    if (!el) return false;

    const y = el.getBoundingClientRect().top + window.scrollY - topbarOffset();
    window.scrollTo({
      top: Math.max(0, y),
      behavior: prefersReducedMotion() ? "auto" : behavior,
    });
    return true;
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href === "#") return;

    e.preventDefault();
    if (isNavOpen()) setNavState(false);

    const ok = scrollToHash(href, "smooth");
    if (ok) history.pushState(null, "", href);
  });

  window.addEventListener("load", () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) setTimeout(() => scrollToHash(hash, "auto"), 60);
  });

  window.addEventListener("popstate", () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) scrollToHash(hash, "auto");
  });

  /* =========================================================
     5) HERO CENTER — pixel-perfect centering + auto-correct
     Problem: your hero panel sometimes drifts slightly to the right.
     Solution:
       - enforce centering styles
       - measure drift and apply translateX correction if needed
  ========================================================= */
  function hardCenterHero() {
    const hero = $(".hero");
    const panel = $(".hero__center");
    if (!hero || !panel) return;

    // Ensure hero is the positioning context
    const heroCS = getComputedStyle(hero);
    if (heroCS.position === "static") hero.style.position = "relative";

    // Force panel to center baseline (independent from CSS drift)
    panel.style.position = "absolute";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.margin = "0";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.maxWidth = "min(720px, calc(100vw - 32px))";
    panel.style.width = "min(720px, calc(100vw - 32px))";
    panel.style.boxSizing = "border-box";

    // Now measure & correct if it still drifts (scrollbar/vw/transform stacking)
    raf(() => {
      const r = panel.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const viewportCenter = window.innerWidth / 2;
      const drift = center - viewportCenter; // + => too far right

      // Only correct meaningful drift
      if (Math.abs(drift) > 2) {
        const correction = clamp(drift, -30, 30); // safety clamp
        // apply correction in px while keeping base transform
        panel.style.transform = `translate(calc(-50% - ${correction}px), -50%)`;
      }
    });
  }

  // run at key moments
  hardCenterHero();
  window.addEventListener("resize", hardCenterHero, { passive: true });
  window.addEventListener("orientationchange", hardCenterHero, { passive: true });
  window.addEventListener("load", hardCenterHero);

  // also when fonts/images load late (can shift layout)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => hardCenterHero()).catch(() => {});
  }

  /* =========================================================
     6) Expose topbar height var (optional CSS use)
  ========================================================= */
  function setTopbarVar() {
    const h = topbar?.offsetHeight || 0;
    document.documentElement.style.setProperty("--topbar-h", `${h}px`);
  }
  setTopbarVar();
  window.addEventListener("resize", setTopbarVar, { passive: true });

})();
/* =========================
   HERO TEXT – PERFECT CENTER FIX
========================= */
(function () {
  "use strict";

  const centerHeroText = () => {
    const hero = document.querySelector(".hero__center");
    const title = document.querySelector(".hero__name");

    if (!hero || !title) return;

    // Reset
    title.style.transform = "";
    title.style.marginLeft = "";
    title.style.marginRight = "";

    // tatsächliche Breiten messen
    const heroWidth = hero.clientWidth;
    const titleWidth = title.scrollWidth;

    // Wenn Text breiter als Container → sauber korrigieren
    if (titleWidth > heroWidth) {
      const diff = (titleWidth - heroWidth) / 2;

      title.style.transform = `translateX(-${diff}px)`;
    }

    // harte Absicherung gegen Überlaufen
    title.style.maxWidth = "100%";
    title.style.overflowWrap = "anywhere";
    title.style.textAlign = "center";
  };

  // Initial
  window.addEventListener("load", centerHeroText);

  // Bei Resize / Orientation Change
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(centerHeroText);
  });
})();
