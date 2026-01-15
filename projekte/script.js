(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* =========================
     1) PFLEGE-LEICHTE BILDERLISTE
     -> Nur hier Bilder hinzufügen / löschen
     -> cat: innen | fassade | detail | boden | ...
  ========================= */
  const PROJECTS = [
    {
      cat: "innen",
      title: "Innenarbeiten – Saubere Kanten",
      img: "../img/malerinwand.png",
      desc: "Klarer Anstrich, saubere Abklebung, ruhiges Gesamtbild.",
      subtitle: "Sauber & gleichmäßig"
    },
    {
      cat: "detail",
      title: "Stuckprofile – Detailfinish",
      img: "../img/stuckdecke.png",
      desc: "Saubere Übergänge und elegante Akzente für Räume.",
      subtitle: "Elegant & präzise"
    },
    {
      cat: "fassade",
      title: "Fassadengestaltung – Frischer Look",
      img: "../img/hausfasade.png",
      desc: "Witterungsschutz + Optik: gleichmäßig & langlebig.",
      subtitle: "Schutz & Optik"
    },
    {
      cat: "detail",
      title: "Tapeten – Saubere Übergänge",
      img: "../img/tapeterolle.png",
      desc: "Exakte Anschlüsse – ohne Blasen, ohne Kanten.",
      subtitle: "Ruhiges Gesamtbild"
    },
    {
      cat: "boden",
      title: "Boden – Vorbereitung & Finish",
      img: "../img/bodenarbeit.png",
      desc: "Sauber vorbereitet, exakte Übergänge – langlebig.",
      subtitle: "Exakte Anschlüsse"
    },
    {
      cat: "innen",
      title: "Spachtelarbeiten – Basis für Perfektion",
      img: "../img/malerindecke.png",
      desc: "Gerade Flächen und saubere Übergänge als Grundlage.",
      subtitle: "Perfekte Grundlage"
    },
    {
      cat: "detail",
      title: "Lackierarbeiten – Sauberes Finish",
      img: "../img/zweimaler.png",
      desc: "Gleichmäßiger Verlauf, robustes Ergebnis, sauber abgeklebt.",
      subtitle: "Robust & sauber"
    },
    {
      cat: "fassade",
      title: "Renovierung – Reparatur & Auffrischung",
      img: "../img/malerinausenwand.png",
      desc: "Schadstellen ausgebessert – Ergebnis wie neu.",
      subtitle: "Schnell & sauber"
    }
  ];

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
     2) Filter + Search + Pagination
  ========================= */
  const chipsWrap = $("#filterChips");
  const searchInput = $("#searchInput");
  const grid = $("#projectGrid");
  const emptyNote = $("#emptyNote");
  const loadMoreBtn = $("#loadMoreBtn");

  // Pagination
  const PAGE_SIZE = 12;
  let visibleCount = PAGE_SIZE;

  // Filter state
  let activeFilter = "all";
  let query = "";

  const normalize = (s) => (s || "").toLowerCase().trim();

  // Kategorien aus Daten generieren (automatisch!)
  const categories = Array.from(new Set(PROJECTS.map(p => p.cat))).sort();

  function renderChips() {
    if (!chipsWrap) return;

    const btn = (label, val, active) => `
      <button class="chip ${active ? "is-active" : ""}" type="button"
        data-filter="${val}" role="tab" aria-selected="${active ? "true" : "false"}">${label}</button>`;

    chipsWrap.innerHTML =
      btn("Alle", "all", true) +
      categories.map(c => btn(c.charAt(0).toUpperCase() + c.slice(1), c, false)).join("");

    // click handler
    $$("[data-filter]", chipsWrap).forEach((b) => {
      b.addEventListener("click", () => {
        activeFilter = b.getAttribute("data-filter") || "all";
        visibleCount = PAGE_SIZE;

        $$("[data-filter]", chipsWrap).forEach((x) => {
          const on = x === b;
          x.classList.toggle("is-active", on);
          x.setAttribute("aria-selected", on ? "true" : "false");
        });

        applyAndRender();
      });
    });
  }

  function matches(p) {
    const matchesCat = activeFilter === "all" || p.cat === activeFilter;
    const hay = normalize(`${p.title} ${p.desc} ${p.subtitle} ${p.cat}`);
    const matchesText = !query || hay.includes(query);
    return matchesCat && matchesText;
  }

  function filtered() {
    return PROJECTS.filter(matches);
  }

  function cardTemplate(p, idx) {
    // button (keyboard friendly)
    return `
      <button class="projectCard" type="button"
        data-idx="${idx}"
        aria-label="${p.title}">
        <div class="projectMedia">
          <img src="${p.img}" alt="${p.title}" loading="lazy" decoding="async">
        </div>
        <div class="projectBody">
          <h3>${p.title.split(" – ")[0]}</h3>
          <p>${p.subtitle || ""}</p>
          <span class="tag">${p.cat}</span>
        </div>
      </button>
    `;
  }

  // Render grid with pagination
  function renderGrid(list) {
    if (!grid) return;

    const slice = list.slice(0, visibleCount);
    grid.innerHTML = slice.map((p, i) => cardTemplate(p, i)).join("");

    // empty note
    if (emptyNote) emptyNote.hidden = list.length !== 0;

    // load more visibility
    if (loadMoreBtn) {
      loadMoreBtn.hidden = !(list.length > visibleCount);
    }

    // click open lightbox
    $$(".projectCard", grid).forEach((card) => {
      card.addEventListener("click", () => openLightboxFromFiltered(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightboxFromFiltered(card);
        }
      });
    });
  }

  function applyAndRender() {
    const list = filtered();
    renderGrid(list);
    // keep current list for lightbox navigation
    currentList = list;
  }

  searchInput?.addEventListener("input", () => {
    query = normalize(searchInput.value);
    visibleCount = PAGE_SIZE;
    applyAndRender();
  });

  loadMoreBtn?.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    applyAndRender();
  });

  /* =========================
     3) Lightbox (navigiert nur in gefilterter Liste)
  ========================= */
  const lb = $("#lightbox");
  const lbImg = $("#lbImg");
  const lbTitle = $("#lbTitle");
  const lbDesc = $("#lbDesc");
  const closeEls = $$("[data-lb-close]");
  const prevBtn = $("[data-lb-prev]");
  const nextBtn = $("[data-lb-next]");

  let currentList = filtered();
  let lbIndex = 0;

  function openLightboxFromFiltered(cardEl) {
    const idx = Number(cardEl.getAttribute("data-idx") || "0");
    lbIndex = Math.max(0, Math.min(idx, currentList.length - 1));
    openLightboxItem(currentList[lbIndex]);
  }

  function openLightboxItem(item) {
    if (!item || !lb) return;

    if (lbImg) { lbImg.src = item.img; lbImg.alt = item.title; }
    if (lbTitle) lbTitle.textContent = item.title;
    if (lbDesc) lbDesc.textContent = item.desc;

    lb.hidden = false;
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function step(dir) {
    if (!currentList.length) return;
    lbIndex = (lbIndex + dir + currentList.length) % currentList.length;
    openLightboxItem(currentList[lbIndex]);
  }

  closeEls.forEach((el) => el.addEventListener("click", closeLightbox));
  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));

  document.addEventListener("keydown", (e) => {
    if (!lb || lb.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* =========================
     Init
  ========================= */
  renderChips();
  applyAndRender();
})();
