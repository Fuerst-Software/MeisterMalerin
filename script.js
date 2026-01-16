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
      "img/malerrolle.png",
      "img/melanie.png",
      "img/stuckdecke.png",
      "img/badezimmerschon.png",
      "img/malerinwand.png",
      "img/malerinausenwand.png",
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
   LEISTUNGEN CAROUSEL — SNAP + SWIPE + STOP ON INTERACTION
   - Swipe/Drag (touch + mouse)
   - Arrows: snap exakt auf nächste/vorherige Card
   - Autoplay läuft nur bis zur ersten Interaktion, dann STOP dauerhaft
================================================== */
const viewport = document.querySelector("[data-carousel-viewport]");
const track = document.querySelector("[data-carousel-track]");
const prevBtn = document.querySelector("[data-carousel-prev]");
const nextBtn = document.querySelector("[data-carousel-next]");

if (viewport && track) {
  const originals = Array.from(track.children);
  if (originals.length >= 2) {
    // Clone set once for seamless looping
    const cloneFrag = document.createDocumentFragment();
    originals.forEach((el) => cloneFrag.appendChild(el.cloneNode(true)));
    track.appendChild(cloneFrag);

    let offset = 0;      // translateX in px (negative moves left)
    let setWidth = 0;    // width of one original set
    let cardStep = 0;    // card width + gap
    let rafId = 0;
    let lastTs = 0;

    let userInteracted = false; // <- sobald true: autoplay AUS forever
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startOffset = 0;
    let moved = 0;

    let seeking = false;
    let seekTarget = 0;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const SPEED = prefersReduced ? 0 : 22; // px/s

    const gapPx = () => {
      const cs = getComputedStyle(track);
      const g = parseFloat(cs.columnGap || cs.gap || "16");
      return Number.isFinite(g) ? g : 16;
    };

    const apply = (x) => {
      track.style.transform = `translate3d(${x}px,0,0)`;
    };

    const normalize = (x) => {
      if (!setWidth) return x;
      // keep in [-setWidth, 0)
      let n = x % setWidth;
      if (n > 0) n -= setWidth;
      return n;
    };

    const measure = () => {
      const gap = gapPx();
      let w = 0;
      for (let i = 0; i < originals.length; i++) {
        w += originals[i].getBoundingClientRect().width;
        if (i !== originals.length - 1) w += gap;
      }
      const cs = getComputedStyle(track);
      const padL = parseFloat(cs.paddingLeft || "0") || 0;
      const padR = parseFloat(cs.paddingRight || "0") || 0;

      setWidth = w + padL + padR;
      cardStep = (originals[0]?.getBoundingClientRect().width || 360) + gap;

      offset = normalize(offset);
      apply(offset);
    };

    // --- Snap logic: immer exakt auf cardStep Raster
    const snapNearest = (x) => {
      if (!cardStep) return x;
      const snapped = Math.round(x / cardStep) * cardStep;
      return normalize(snapped);
    };

    const currentIndex = () => {
      // Index bezogen auf Raster: je negativer offset, desto weiter "next"
      if (!cardStep) return 0;
      return Math.round((-offset) / cardStep);
    };

    const snapToIndex = (idx) => {
      userInteracted = true;      // stop autoplay forever
      seeking = true;
      seekTarget = normalize(-(idx * cardStep));
    };

    const snapBy = (dir /* +1 next, -1 prev */) => {
      userInteracted = true;      // stop autoplay forever
      const idx = currentIndex();
      snapToIndex(idx + (dir > 0 ? 1 : -1));
    };

    // Smooth seek animation
    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      // Autoplay nur solange der User NICHT interagiert hat
      if (!userInteracted && !dragging && !seeking && SPEED > 0) {
        // left->right look: move offset toward 0 (less negative)
        offset += SPEED * dt;
        offset = normalize(offset);
        apply(offset);
      }

      if (seeking) {
        const diff = seekTarget - offset;
        offset += diff * 0.22; // easing
        if (Math.abs(diff) < 0.6) {
          offset = seekTarget;
          seeking = false;
        }
        offset = normalize(offset);
        apply(offset);
      }

      rafId = requestAnimationFrame(tick);
    };

    // Buttons
    nextBtn?.addEventListener("click", () => snapBy(+1));
    prevBtn?.addEventListener("click", () => snapBy(-1));

    // Keyboard (optional nice)
    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") snapBy(+1);
      if (e.key === "ArrowLeft") snapBy(-1);
    });

    // Prevent any scrollLeft jitter (we use transform)
    viewport.addEventListener("scroll", () => {
      if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
    });

    // --- Swipe / Drag (Pointer Events)
    // Wichtig: in CSS am besten: [data-carousel-viewport]{ touch-action: pan-y; }
    const onDown = (e) => {
      // only primary button / touch
      if (e.pointerType === "mouse" && e.button !== 0) return;

      userInteracted = true; // sobald anfassen: autoplay aus
      dragging = true;
      seeking = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startOffset = offset;
      moved = 0;

      viewport.setPointerCapture?.(pointerId);
    };

    const onMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      moved = dx;

      // Drag feel: move with finger (dx positive -> move right)
      offset = normalize(startOffset + dx);
      apply(offset);
    };

    const onUp = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;

      const threshold = Math.min(90, viewport.getBoundingClientRect().width * 0.18);

      // swipe decision
      if (moved <= -threshold) {
        // dragged left => next card
        snapBy(+1);
      } else if (moved >= threshold) {
        // dragged right => prev card
        snapBy(-1);
      } else {
        // not enough => snap to nearest raster
        userInteracted = true;
        seeking = true;
        seekTarget = snapNearest(offset);
      }

      pointerId = null;
    };

    viewport.addEventListener("pointerdown", onDown, { passive: true });
    viewport.addEventListener("pointermove", onMove, { passive: true });
    viewport.addEventListener("pointerup", onUp, { passive: true });
    viewport.addEventListener("pointercancel", onUp, { passive: true });

    // Init
    track.style.willChange = "transform";
    track.style.transform = "translate3d(0,0,0)";

    requestAnimationFrame(() => {
      measure();
      // Startposition: leicht “innen”, aber trotzdem rasterbar
      offset = snapNearest(normalize(-setWidth * 0.35));
      apply(offset);
      rafId = requestAnimationFrame(tick);
    });

    window.addEventListener("resize", () => setTimeout(measure, 50));
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
