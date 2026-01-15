/* responsive.js — v2 (hardening)
   Target: deine gelieferten HTML-Strukturen (Start + Unterseiten)

   Features:
   - Mobile Nav: garantiert funktionierend (toggle, outside click, ESC, focus, scroll-lock)
   - Header-Layout-Sicherung für Mobile (Anfrage + Burger sauber vertikal zentriert)
   - Safe-area + iOS 100vh Fix
   - Anchor scrolling mit Topbar-Offset (damit nix unter dem Header verschwindet)
*/

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isMobileBP = () => window.innerWidth < 900;

  /* =========================================
     0) iOS / Mobile viewport height fix
  ========================================= */
  function setVHVar() {
    // 1vh auf Mobile ist oft buggy -> wir setzen --vh
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }
  setVHVar();
  window.addEventListener("resize", setVHVar, { passive: true });
  window.addEventListener("orientationchange", setVHVar, { passive: true });

  /* =========================================
     1) HEADER LAYOUT HARDENING (Mobile)
     Ziel: Logo links, rechts (Anfrage + Burger + Telefon) sauber zentriert
  ========================================= */
  function hardenHeaderLayout() {
    const topbar = $(".topbar");
    const nav = $(".nav");
    const brand = $(".brand");
    const navRight = $(".nav__right");
    const navBtn = $(".nav__btn");
    const navIcon = $(".nav__icon");
    const burger = $(".nav__burger");

    if (!topbar || !nav || !navRight || !brand) return;

    // Safe-area padding (iPhone notch)
    topbar.style.paddingTop = "max(8px, env(safe-area-inset-top))";

    // Grundlayout absichern
    nav.style.display = "flex";
    nav.style.alignItems = "center";
    nav.style.justifyContent = "space-between";
    nav.style.gap = "14px";

    // Brand absichern
    brand.style.display = "flex";
    brand.style.alignItems = "center";
    brand.style.flex = "0 0 auto";

    // Rechte Seite absichern
    navRight.style.display = "flex";
    navRight.style.alignItems = "center";
    navRight.style.justifyContent = "center";
    navRight.style.gap = isMobileBP() ? "10px" : "12px";
    navRight.style.flex = "0 0 auto";

    // Buttons/Icons vertikal zentrieren + nicht abgeschnitten
    [navBtn, navIcon, burger].forEach((el) => {
      if (!el) return;
      el.style.display = "inline-flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.lineHeight = "1";
    });

    // Mobile: Anfrage darf nicht “zu breit” werden
    if (navBtn) {
      navBtn.style.whiteSpace = "nowrap";
      if (isMobileBP()) {
        navBtn.style.paddingLeft = "12px";
        navBtn.style.paddingRight = "12px";
      }
    }

    // Burger tap-area absichern
    if (burger) {
      burger.style.width = burger.style.width || "44px";
      burger.style.height = burger.style.height || "44px";
    }
  }

  hardenHeaderLayout();
  window.addEventListener("resize", hardenHeaderLayout, { passive: true });

  /* =========================================
     2) SCROLL LOCK (wenn Mobile-Nav offen)
  ========================================= */
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

  /* =========================================
     3) MOBILE NAV (GARANTIERT)
     HTML:
       button.nav__burger[aria-controls="navMobile"]
       #navMobile.navMobile (hidden)
  ========================================= */
  const burger = $(".nav__burger");
  const navMobile = $("#navMobile");
  const nav = $(".nav");
  const topbar = $(".topbar");

  function setNavState(open) {
    if (!burger || !navMobile) return;

    burger.setAttribute("aria-expanded", open ? "true" : "false");

    // wir arbeiten mit "hidden" weil du es in HTML so hast
    navMobile.hidden = !open;

    // extra hooks (falls CSS nutzt)
    navMobile.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("mm-nav-open", open);

    // a11y
    navMobile.setAttribute("aria-hidden", open ? "false" : "true");

    if (open) {
      scrollLock.lock();
      // Focus: erster Link
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

  // Falls script.js irgendwas verkackt hat: wir erzwingen initial korrekt
  if (burger && navMobile) {
    // aria-controls absichern
    burger.setAttribute("aria-controls", "navMobile");
    // initial zu
    setNavState(false);

    // Wir hängen unseren Listener als "capture" dran, um Konflikte zu überstimmen
    burger.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        setNavState(!isNavOpen());
      },
      true
    );

    // Klick auf Link => schließen
    navMobile.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      setNavState(false);
    });

    // Outside click => schließen
    document.addEventListener(
      "click",
      (e) => {
        if (!isNavOpen()) return;
        const inside = (nav && nav.contains(e.target)) || navMobile.contains(e.target);
        if (!inside) setNavState(false);
      },
      true
    );

    // ESC => schließen
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isNavOpen()) setNavState(false);
    });

    // Resize: wenn Desktop -> schließen
    window.addEventListener(
      "resize",
      () => {
        if (!isNavOpen()) return;
        if (!isMobileBP()) setNavState(false);
      },
      { passive: true }
    );
  }

  /* =========================================
     4) ANCHOR OFFSET (Sticky header safe)
     - verhindert "abgeschnitten" bei #kontakt/#versprechen etc.
  ========================================= */
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

  // Klicks auf interne Hash-Links abfangen (nur same-page)
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

  // Direkt beim Laden mit Hash sauber positionieren
  window.addEventListener("load", () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      setTimeout(() => scrollToHash(hash, "auto"), 60);
    }
  });

  window.addEventListener("popstate", () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) scrollToHash(hash, "auto");
  });

  /* =========================================
     5) LAST SAFETY: Prevent “cut off” content under topbar
     - setzt CSS-Variable --topbar-h (falls du im CSS nutzen willst)
  ========================================= */
  function setTopbarVar() {
    const h = topbar?.offsetHeight || 0;
    document.documentElement.style.setProperty("--topbar-h", `${h}px`);
  }
  setTopbarVar();
  window.addEventListener("resize", setTopbarVar, { passive: true });

})();
