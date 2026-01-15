/* responsive.js
   Clean mobile UX helpers for Meistermalerin
   - Mobile nav: a11y + scroll lock + outside click + ESC
   - Anchor offset for sticky topbar
   - Services carousel swipe support
   - Chipbar scroll + active chip highlight
   - Leistungen detail open/close improvements on mobile
   - Projekte lightbox swipe support (if present)
*/
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isCoarsePointer = () =>
    window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const raf = (fn) => requestAnimationFrame(fn);

  /* =========================
     1) MOBILE NAV (BURGER)
  ========================= */
  const nav = $(".nav");
  const burger = $(".nav__burger");
  const navMobile = $("#navMobile");
  const topbar = $(".topbar");

  const scrollLock = (() => {
    let locked = false;
    let scrollY = 0;

    const lock = () => {
      if (locked) return;
      locked = true;
      scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };

    const unlock = () => {
      if (!locked) return;
      locked = false;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };

    return { lock, unlock };
  })();

  function setNavOpen(open) {
    if (!burger || !navMobile) return;

    burger.setAttribute("aria-expanded", open ? "true" : "false");
    navMobile.hidden = !open;
    navMobile.toggleAttribute("data-open", open);

    // Optional: class hook for CSS if you want
    document.documentElement.classList.toggle("nav-open", open);

    if (open) scrollLock.lock();
    else scrollLock.unlock();
  }

  function isNavOpen() {
    return burger?.getAttribute("aria-expanded") === "true" && navMobile && !navMobile.hidden;
  }

  // Close nav when navigating
  function closeNavOnLinkClick(e) {
    const a = e.target.closest("a");
    if (!a) return;
    // allow normal navigation
    if (isNavOpen()) setNavOpen(false);
  }

  if (burger && navMobile) {
    // Ensure initial state
    setNavOpen(false);

    burger.addEventListener("click", () => {
      setNavOpen(!isNavOpen());
    });

    navMobile.addEventListener("click", closeNavOnLinkClick);

    // Outside click closes
    document.addEventListener("click", (e) => {
      if (!isNavOpen()) return;
      const inside = nav?.contains(e.target) || navMobile.contains(e.target);
      if (!inside) setNavOpen(false);
    });

    // ESC closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isNavOpen()) setNavOpen(false);
    });

    // Resize: if we go to desktop, close and unlock
    window.addEventListener("resize", () => {
      if (!isNavOpen()) return;
      // If viewport is wide enough that desktop nav shows, close.
      if (window.innerWidth >= 900) setNavOpen(false);
    }, { passive: true });
  }

  /* =========================
     2) ANCHOR OFFSET (STICKY TOPBAR)
     - makes #kontakt etc land nicely below header
  ========================= */
  function getTopbarOffset() {
    const h = topbar?.offsetHeight || 0;
    // small breathing room
    return Math.max(0, h + 10);
  }

  function scrollToHash(hash, behavior = "smooth") {
    if (!hash || hash === "#") return false;
    const el = document.getElementById(hash.slice(1));
    if (!el) return false;

    const y = el.getBoundingClientRect().top + window.scrollY - getTopbarOffset();

    window.scrollTo({
      top: Math.max(0, y),
      behavior: prefersReducedMotion() ? "auto" : behavior
    });

    return true;
  }

  // Intercept in-page hash clicks for correct offset
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href === "#") return;

    // close nav if open (mobile)
    if (isNavOpen()) setNavOpen(false);

    // handle offset scroll
    e.preventDefault();
    const ok = scrollToHash(href, "smooth");
    if (ok) history.pushState(null, "", href);
  });

  // If page loads with a hash in URL
  window.addEventListener("load", () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      // wait for layout/fonts
      setTimeout(() => scrollToHash(hash, "auto"), 50);
    }
  });

  // Back/forward hash navigation
  window.addEventListener("popstate", () => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) scrollToHash(hash, "auto");
  });

  /* =========================
     3) SERVICES CAROUSEL SWIPE (Startseite)
     markup uses:
     - [data-carousel-viewport]
     - [data-carousel-track]
     - [data-carousel-prev], [data-carousel-next]
  ========================= */
  const viewport = $('[data-carousel-viewport]');
  const prevBtn = $('[data-carousel-prev]');
  const nextBtn = $('[data-carousel-next]');

  function carouselStep(direction = 1) {
    if (!viewport) return;
    // Step by one card width
    const card = viewport.querySelector(".serviceCard");
    const cardW = card ? card.getBoundingClientRect().width : Math.min(320, viewport.clientWidth * 0.8);
    const gap = 16;
    viewport.scrollBy({
      left: direction * (cardW + gap),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  if (viewport) {
    prevBtn?.addEventListener("click", () => carouselStep(-1));
    nextBtn?.addEventListener("click", () => carouselStep(1));

    // keyboard on viewport
    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") carouselStep(-1);
      if (e.key === "ArrowRight") carouselStep(1);
    });

    // touch swipe
    let sx = 0, sy = 0, touching = false;
    viewport.addEventListener("touchstart", (e) => {
      if (!isCoarsePointer()) return;
      touching = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });

    viewport.addEventListener("touchend", (e) => {
      if (!touching) return;
      touching = false;
      const ex = (e.changedTouches?.[0]?.clientX ?? sx);
      const ey = (e.changedTouches?.[0]?.clientY ?? sy);
      const dx = ex - sx;
      const dy = ey - sy;

      // horizontal swipe threshold
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        carouselStep(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  /* =========================
     4) CHIP BAR (Leistungen)
     - Smooth horizontal scroll into view
     - Active chip based on section in view
  ========================= */
  const chipbar = document.querySelector("[data-chipbar]");
  if (chipbar) {
    const chips = $$("a.chip", chipbar);
    const targets = chips
      .map((c) => {
        const id = (c.getAttribute("href") || "").slice(1);
        return id ? document.getElementById(id) : null;
      })
      .filter(Boolean);

    function setActiveChipById(id) {
      chips.forEach((c) => {
        const isActive = (c.getAttribute("href") || "") === `#${id}`;
        c.toggleAttribute("aria-current", isActive);
        c.classList.toggle("is-active", isActive);
        if (isActive) {
          // ensure chip is visible in scroll container
          c.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            inline: "center",
            block: "nearest",
          });
        }
      });
    }

    // click -> scroll with top offset
    chipbar.addEventListener("click", (e) => {
      const a = e.target.closest("a.chip");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href?.startsWith("#")) return;

      e.preventDefault();
      const id = href.slice(1);
      setActiveChipById(id);
      scrollToHash(href, "smooth");
    });

    // observe sections
    const obs = new IntersectionObserver((entries) => {
      // pick the most visible
      const visible = entries
        .filter((x) => x.isIntersecting)
        .sort((a, b) => (b.intersectionRatio - a.intersectionRatio))[0];
      if (visible?.target?.id) setActiveChipById(visible.target.id);
    }, {
      root: null,
      threshold: [0.2, 0.35, 0.5, 0.65],
      rootMargin: `-${getTopbarOffset()}px 0px -55% 0px`,
    });

    targets.forEach((t) => obs.observe(t));
  }

  /* =========================
     5) LEISTUNGEN DETAILS (Accordion cards)
     data-open-detail on overview cards
     data-detail on detailCard, with data-collapsed="true|false"
     data-close-detail buttons
  ========================= */
  const detailsWrap = document.querySelector("[data-details-wrap]");
  const detailCards = detailsWrap ? $$("[data-detail]", detailsWrap) : [];

  function closeAllDetails() {
    if (!detailsWrap) return;
    detailCards.forEach((card) => card.setAttribute("data-collapsed", "true"));
    detailsWrap.setAttribute("data-has-open", "false");
  }

  function openDetailById(id) {
    if (!detailsWrap) return;
    const card = document.getElementById(id);
    if (!card || !card.matches("[data-detail]")) return;

    // close others
    detailCards.forEach((c) => {
      if (c !== card) c.setAttribute("data-collapsed", "true");
    });

    card.setAttribute("data-collapsed", "false");
    detailsWrap.setAttribute("data-has-open", "true");

    // smooth scroll to card on mobile (so it feels "opening under the grid")
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    raf(() => {
      const y = card.getBoundingClientRect().top + window.scrollY - getTopbarOffset();
      window.scrollTo({ top: Math.max(0, y - 8), behavior });

      // focus heading for a11y
      const h = card.querySelector("h2, h3, .detailBody h2");
      if (h) h.setAttribute("tabindex", "-1"), h.focus({ preventScroll: true });
    });
  }

  // Open from overview cards
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-detail]");
    if (!trigger) return;

    const href = trigger.getAttribute("href");
    if (!href?.startsWith("#")) return;

    e.preventDefault();
    const id = href.slice(1);
    openDetailById(id);
    history.replaceState(null, "", `#${id}`);
  });

  // Close buttons inside details
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-close-detail]");
    if (!btn) return;
    const card = e.target.closest("[data-detail]");
    if (!card) return;

    card.setAttribute("data-collapsed", "true");
    const anyOpen = detailCards.some((c) => c.getAttribute("data-collapsed") === "false");
    detailsWrap?.setAttribute("data-has-open", anyOpen ? "true" : "false");
  });

  /* =========================
     6) PROJEKTE LIGHTBOX SWIPE (if present)
     ids:
     - #lightbox
     - #lbImg
     data-lb-prev / data-lb-next / data-lb-close
  ========================= */
  const lightbox = $("#lightbox");
  const lbImg = $("#lbImg");

  if (lightbox && lbImg) {
    const btnPrev = lightbox.querySelector("[data-lb-prev]");
    const btnNext = lightbox.querySelector("[data-lb-next]");

    // Swipe on image panel
    let sx = 0, sy = 0, touching = false;

    const media = lightbox.querySelector(".lightbox__media") || lbImg;

    media.addEventListener("touchstart", (e) => {
      if (!isCoarsePointer()) return;
      touching = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });

    media.addEventListener("touchend", (e) => {
      if (!touching) return;
      touching = false;

      const ex = (e.changedTouches?.[0]?.clientX ?? sx);
      const ey = (e.changedTouches?.[0]?.clientY ?? sy);
      const dx = ex - sx;
      const dy = ey - sy;

      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) btnNext?.click();
        else btnPrev?.click();
      }
    }, { passive: true });

    // Prevent background scroll when lightbox open (if your script doesn't already)
    const observer = new MutationObserver(() => {
      const open = !lightbox.hidden && lightbox.getAttribute("aria-hidden") === "false";
      if (open) scrollLock.lock();
      else scrollLock.unlock();
    });
    observer.observe(lightbox, { attributes: true, attributeFilter: ["hidden", "aria-hidden"] });
  }

})();
