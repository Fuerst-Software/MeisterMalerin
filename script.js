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
     LEISTUNGEN CAROUSEL — GPU SMOOTH LOOP (LEFT -> RIGHT)
     - Autoplay via translate3d (no scrollLeft jitter)
     - Arrows: snap to next/prev card (EXACT)
     - Swipe left/right on mobile (pointer events)
     - Stop autoplay after first interaction (arrow/drag/swipe)
     - TAP on card ALWAYS navigates via data-href (pointer-capture safe)
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

      let offset = 0;
      let setWidth = 0;
      let cardStep = 0;
      let rafId = 0;
      let lastTs = 0;
      let paused = false;
      let seeking = false;
      let seekTarget = 0;

      let userInteracted = false;

      // Drag/Swipe state
      let dragging = false;
      let pid = null;
      let startX = 0;
      let startOffset = 0;
      let movedPx = 0;
      let didDrag = false;

      // CRITICAL: remember intended navigation target on pointerdown
      let tapHref = null;

      const DRAG_TOL = 10;
      const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const SPEED = prefersReduced ? 0 : 22;

      const gapPx = () => {
        const cs = getComputedStyle(track);
        const g = parseFloat(cs.columnGap || cs.gap || "16");
        return Number.isFinite(g) ? g : 16;
      };

      const measure = () => {
        const gap = gapPx();
        let w = 0;
        for (let i = 0; i < originals.length; i++) {
          const rect = originals[i].getBoundingClientRect();
          w += rect.width;
          if (i !== originals.length - 1) w += gap;
        }
        const cs = getComputedStyle(track);
        const padL = parseFloat(cs.paddingLeft || "0") || 0;
        const padR = parseFloat(cs.paddingRight || "0") || 0;
        setWidth = w + padL + padR;

        const firstCard = originals[0];
        cardStep = firstCard ? firstCard.getBoundingClientRect().width + gap : 380;

        offset = normalizeOffset(offset);
        applyTransform(offset);
        setCenterFocus();
      };

      const normalizeOffset = (x) => {
        if (!setWidth) return x;
        let n = x % setWidth;
        if (n > 0) n -= setWidth;
        return n;
      };

      const applyTransform = (x) => {
        track.style.transform = `translate3d(${x}px, 0, 0)`;
      };

      const setCenterFocus = () => {
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

      const snapToGrid = (x) => {
        if (!cardStep) return x;
        const snapped = Math.round(x / cardStep) * cardStep;
        return normalizeOffset(snapped);
      };

      const animate = (ts) => {
        if (!lastTs) lastTs = ts;
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;

        if (!paused && !userInteracted && SPEED > 0 && !seeking) {
          offset += SPEED * dt;
          offset = normalizeOffset(offset);
          applyTransform(offset);
        }

        if (seeking) {
          const diff = seekTarget - offset;
          offset += diff * 0.22;

          if (Math.abs(diff) < 0.6) {
            offset = seekTarget;
            seeking = false;
          }

          offset = normalizeOffset(offset);
          applyTransform(offset);
        }

        if (ts % 120 < 16) setCenterFocus();
        rafId = requestAnimationFrame(animate);
      };

      const pause = () => { paused = true; };
      const resume = () => { if (!prefersReduced && !userInteracted) paused = false; };

      const snapBy = (dir) => {
        userInteracted = true;
        paused = true;
        seeking = true;

        const target = dir > 0 ? (offset - cardStep) : (offset + cardStep);
        seekTarget = snapToGrid(target);

        window.setTimeout(() => { paused = false; }, 350);
      };

      nextBtn?.addEventListener("click", () => snapBy(+1));
      prevBtn?.addEventListener("click", () => snapBy(-1));

      viewport.addEventListener("mouseenter", pause);
      viewport.addEventListener("mouseleave", resume);
      viewport.addEventListener("focusin", pause);
      viewport.addEventListener("focusout", resume);

      viewport.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { userInteracted = true; snapBy(+1); }
        if (e.key === "ArrowLeft")  { userInteracted = true; snapBy(-1); }
      });

      viewport.addEventListener("scroll", () => {
        if (viewport.scrollLeft !== 0) viewport.scrollLeft = 0;
      });

      track.style.willChange = "transform";
      track.style.transform = "translate3d(0,0,0)";

      const swipeThreshold = () => Math.min(90, viewport.getBoundingClientRect().width * 0.18);

      const onPointerDown = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;

        userInteracted = true;
        paused = true;
        seeking = false;

        dragging = true;
        pid = e.pointerId;
        startX = e.clientX;
        startOffset = offset;
        movedPx = 0;
        didDrag = false;

        // ✅ capture the intended target href (data-href preferred)
        const card = e.target.closest(".serviceCard");
        tapHref = card?.getAttribute("data-href") || card?.getAttribute("href") || null;

        viewport.setPointerCapture?.(pid);
      };

      const onPointerMove = (e) => {
        if (!dragging || e.pointerId !== pid) return;

        const dx = e.clientX - startX;
        movedPx = dx;

        if (!didDrag && Math.abs(dx) > DRAG_TOL) didDrag = true;

        offset = normalizeOffset(startOffset + dx);
        applyTransform(offset);
      };

      const finishDrag = () => {
        dragging = false;

        // ✅ TAP -> navigate (pointer-capture safe, click independent)
        if (!didDrag && tapHref) {
          const href = tapHref;
          tapHref = null;
          movedPx = 0;
          pid = null;
          window.location.href = href;
          return;
        }

        const thr = swipeThreshold();

        if (movedPx <= -thr) {
          snapBy(+1);
        } else if (movedPx >= thr) {
          snapBy(-1);
        } else {
          paused = true;
          seeking = true;
          seekTarget = snapToGrid(offset);
          window.setTimeout(() => { paused = false; }, 220);
        }

        tapHref = null;
        movedPx = 0;
        pid = null;
      };

      const onPointerUp = (e) => {
        if (!dragging || e.pointerId !== pid) return;
        finishDrag();
      };

      const onPointerCancel = (e) => {
        if (!dragging || e.pointerId !== pid) return;
        finishDrag();
      };

      viewport.addEventListener("pointerdown", onPointerDown, { passive: true });
      viewport.addEventListener("pointermove", onPointerMove, { passive: true });
      viewport.addEventListener("pointerup", onPointerUp, { passive: true });
      viewport.addEventListener("pointercancel", onPointerCancel, { passive: true });

      // Optional safety: If a real drag happened, block click so no accidental navigation happens.
      viewport.addEventListener("click", (e) => {
        if (didDrag) {
          e.preventDefault();
          e.stopPropagation();
          didDrag = false;
        }
      }, true);

      requestAnimationFrame(() => {
        measure();
        offset = normalizeOffset(-setWidth * 0.35);
        offset = snapToGrid(offset);
        applyTransform(offset);
        setCenterFocus();
        rafId = requestAnimationFrame(animate);
      });

      window.addEventListener("resize", () => {
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
