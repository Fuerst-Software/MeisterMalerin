/* script.js — Clean Nav + Hero Slideshow + Smooth Services Carousel (left->right)
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
     HERO SLIDESHOW – CLEAN CROSSFADE
  ========================= */
  const slideHost = document.querySelector(".hero__slides");

  if (slideHost) {
    const images = [
      "img/malerinwand.png",
      "img/malerinausenwand.png",
      "img/malerindecke.png",
      "img/hausfasade.png",
      "img/bodenarbeit.png",
      "img/zweimaler.png"
    ];

    const INTERVAL = 5000;
    let current = 0;
    const slides = [];

    images.forEach((src, i) => {
      const div = document.createElement("div");
      div.className = "slide" + (i === 0 ? " is-active" : "");
      div.style.backgroundImage = `url("${src}")`;
      slideHost.appendChild(div);
      slides.push(div);

      const img = new Image();
      img.src = src;
    });

    setInterval(() => {
      slides[current].classList.remove("is-active");
      current = (current + 1) % slides.length;
      slides[current].classList.add("is-active");
    }, INTERVAL);
  }

  /* ==================================================
     LEISTUNGEN CAROUSEL — GPU SMOOTH LOOP (LEFT -> RIGHT)
     - Autoplay via translate3d (no scrollLeft jitter)
     - Arrows: snap to next/prev card
     - Pause on hover/focus, keyboard support
  ================================================== */
  const viewport = document.querySelector("[data-carousel-viewport]");
  const track = document.querySelector("[data-carousel-track]");
  const prevBtn = document.querySelector("[data-carousel-prev]");
  const nextBtn = document.querySelector("[data-carousel-next]");

  if (viewport && track) {
    const originals = Array.from(track.children);
    if (originals.length >= 2) {
      // Create a seamless second set (append clones once)
      const cloneFrag = document.createDocumentFragment();
      originals.forEach((el) => cloneFrag.appendChild(el.cloneNode(true)));
      track.appendChild(cloneFrag);

      // We animate the track inside the viewport using translateX
      let offset = 0;           // px, negative moves left, positive moves right
      let setWidth = 0;         // width of one original set (before clones)
      let cardStep = 0;         // one-card step including gap
      let rafId = 0;
      let lastTs = 0;
      let paused = false;
      let seeking = false;      // when arrow click animates to a snap point
      let seekTarget = 0;

      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

      // Speed: px per second (slow & premium)
      const SPEED = prefersReduced ? 0 : 22; // <- adjust if you want slower/faster

      const gapPx = () => {
        const cs = getComputedStyle(track);
        const g = parseFloat(cs.columnGap || cs.gap || "16");
        return Number.isFinite(g) ? g : 16;
      };

      const measure = () => {
        // Measure one original set width by summing first N original children widths + gaps
        const gap = gapPx();
        let w = 0;
        for (let i = 0; i < originals.length; i++) {
          const rect = originals[i].getBoundingClientRect();
          w += rect.width;
          if (i !== originals.length - 1) w += gap;
        }
        // track has padding via CSS (8px on each side in your file) -> include it
        // We'll read actual padding to be correct.
        const cs = getComputedStyle(track);
        const padL = parseFloat(cs.paddingLeft || "0") || 0;
        const padR = parseFloat(cs.paddingRight || "0") || 0;
        setWidth = w + padL + padR;

        // Step size (card width + gap)
        const firstCard = originals[0];
        cardStep = firstCard ? firstCard.getBoundingClientRect().width + gap : 380;

        // Ensure offset stays in range after resize
        offset = normalizeOffset(offset);
        applyTransform(offset);
        setCenterFocus();
      };

      const normalizeOffset = (x) => {
        // We loop using two sets: when we've shifted one full set, wrap seamlessly
        // Since we want left->right motion, offset increases.
        // Keep x in (-setWidth .. 0] range for stable transforms:
        // We'll represent positions as negative or 0 values.
        // Convert any x to within [-setWidth, 0)
        if (!setWidth) return x;

        // Bring into range using modulo
        let n = x % setWidth;
        // Make negative range [-setWidth,0)
        if (n > 0) n -= setWidth;
        return n;
      };

      const applyTransform = (x) => {
        // GPU transform
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      };

      const setCenterFocus = () => {
        // highlight card nearest viewport center for premium feel
        const cards = Array.from(track.querySelectorAll(".serviceCard"));
        if (!cards.length) return;

        const vr = viewport.getBoundingClientRect();
        const cx = vr.left + vr.width / 2;

        let best = null;
        let bestDist = Infinity;

        for (const c of cards) {
          const r = c.getBoundingClientRect();
          const dist = Math.abs((r.left + r.width / 2) - cx);
          if (dist < bestDist) {
            bestDist = dist;
            best = c;
          }
        }

        cards.forEach((c) => c.classList.remove("is-center"));
        if (best) best.classList.add("is-center");
      };

      const animate = (ts) => {
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000); // cap delta (stability)
        lastTs = ts;

        if (!paused && SPEED > 0 && !seeking) {
          // left->right: increase offset toward 0 (less negative)
          offset += SPEED * dt;
          // keep in [-setWidth,0)
          offset = normalizeOffset(offset);
          applyTransform(offset);
        }

        if (seeking) {
          // Smooth snap toward target
          const diff = seekTarget - offset;
          const step = diff * 0.18; // easing
          offset += step;

          // Stop condition
          if (Math.abs(diff) < 0.6) {
            offset = seekTarget;
            seeking = false;
          }

          offset = normalizeOffset(offset);
          applyTransform(offset);
        }

        // center focus (not every frame to save cpu)
        // do it every ~120ms
        if (ts % 120 < 16) setCenterFocus();

        rafId = requestAnimationFrame(animate);
      };

      const pause = () => { paused = true; };
      const resume = () => { if (!prefersReduced) paused = false; };

      // Snap helpers:
      // We want current center card to align nicely after arrow clicks.
      // We'll move by exactly one cardStep in desired direction.
      const snapBy = (dir /* +1 right, -1 left */) => {
        // Pause autoplay during snap
        paused = true;
        seeking = true;

        // We store offset in [-setWidth,0)
        // For "next" (right arrow): move content to LEFT visually -> offset becomes more negative
        // But user asked left->right autoplay; arrow semantics: right arrow = next item (to the right),
        // meaning we should shift track LEFT so new items appear from right.
        // So: next => offset -= cardStep
        // prev => offset += cardStep
        const target = dir > 0 ? (offset - cardStep) : (offset + cardStep);

        seekTarget = normalizeOffset(target);
        // After snap completes, resume after a tiny delay
        window.setTimeout(() => { paused = false; }, 350);
      };

      nextBtn?.addEventListener("click", () => snapBy(+1));
      prevBtn?.addEventListener("click", () => snapBy(-1));

      viewport.addEventListener("mouseenter", pause);
      viewport.addEventListener("mouseleave", resume);
      viewport.addEventListener("focusin", pause);
      viewport.addEventListener("focusout", resume);

      viewport.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") snapBy(+1);
        if (e.key === "ArrowLeft") snapBy(-1);
      });

      // Important: track must not scroll; we control it via transform.
      // Ensure viewport scrollLeft stays 0
      viewport.addEventListener("scroll", () => {
        if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
      });

      // Init styles for transform carousel (avoid selection weirdness)
      track.style.willChange = "transform";
      track.style.transform = "translate3d(0,0,0)";

      // Start with a stable negative offset so we see the original set nicely
      requestAnimationFrame(() => {
        measure();
        offset = normalizeOffset(-setWidth * 0.35); // start a bit "inside" the band
        applyTransform(offset);
        setCenterFocus();
        rafId = requestAnimationFrame(animate);
      });

      window.addEventListener("resize", () => {
        // Re-measure after fonts/layout settle
        window.setTimeout(measure, 50);
      });
    }
  }

  /* =========================
     Contact Form Demo
  ========================= */
  const form = $("#contactForm");
  const note = $("#formNote");
  if (form && note) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.textContent = "Danke! Ihre Anfrage ist eingegangen – ich melde mich zeitnah.";
      form.reset();
    });
  }
})();
(() => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
