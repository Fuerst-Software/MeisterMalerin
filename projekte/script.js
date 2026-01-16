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
  // Innen / Malerarbeiten
  { cat:"innen", title:"Innenarbeiten – Wand",      img:"../img/malerinwand.png",        desc:"Gleichmäßiger Anstrich und saubere Kanten – ruhiges Gesamtbild.", },
  { cat:"innen", title:"Innenarbeiten – Action",    img:"../img/malerinaction.png",     desc:"Präzise Ausführung im Detail – sauber abgeklebt und ordentlich umgesetzt.", },
  { cat:"innen", title:"Innenarbeiten – Decke",     img:"../img/malerindecke.png",      desc:"Deckenflächen sauber vorbereitet und gleichmäßig ausgeführt.", },
  { cat:"innen", title:"Innenarbeiten – Dach",      img:"../img/malerdachgeschoss.png", desc:"Sauberer Ablauf im Dachgeschoss – klar, ordentlich, professionell.",  },

  // Außen / Fassade
  { cat:"fassade", title:"Außen – Haus",            img:"../img/hausganz.png",          desc:"Außenansicht – saubere Gesamtwirkung und klare Linien.", },
  { cat:"fassade", title:"Außen – Garten",          img:"../img/hausgarten.png",        desc:"Außenwirkung im Gesamtbild – gepflegt, sauber, stimmig.",  },
  { cat:"fassade", title:"Außen – Eingang/Geländer",img:"../img/hausundgelander.png",   desc:"Außenbereiche sauber umgesetzt – klare Linien, ordentliches Ergebnis.", },
  { cat:"fassade", title:"Außen – Renovierung",     img:"../img/malerinausenwand.png",  desc:"Auffrischung und Ausbesserung – Ergebnis wirkt wie neu.", },

  // Details / Stuck / Tapete / Lack
  { cat:"detail", title:"Stuck – Decke",            img:"../img/stuckdecke.png",        desc:"Stuckdetails als eleganter Abschluss – sauber montiert und integriert.", },
  { cat:"detail", title:"Tapete – Rolle",           img:"../img/tapeterolle.png",       desc:"Saubere Anschlüsse ohne Blasen – ruhiges Gesamtbild.",  },
  { cat:"detail", title:"Lackierarbeiten – Finish", img:"../img/zweimaler.png",         desc:"Sauberer Verlauf und hochwertiges Finish – robust und pflegeleicht.", },
  { cat:"detail", title:"Rolle/Abkleben",           img:"../img/malerrolle.png",        desc:"Saubere Vorbereitung – die Basis für ein perfektes Finish.", },

  // Treppen (Details)
  { cat:"detail", title:"Treppe – Braun",           img:"../img/treppebraun.png",       desc:"Treppenbereich sauber bearbeitet – gleichmäßiges Finish.", },
  { cat:"detail", title:"Treppe – In Arbeit",       img:"../img/treppeinarbeit.png",    desc:"Vorbereitung und Bearbeitung im Prozess – ordentlich und präzise.", },
  { cat:"detail", title:"Treppe – Weiß",            img:"../img/treppeweiss.png",       desc:"Klare, saubere Optik – gleichmäßig und hochwertig ausgeführt.", },
  { cat:"detail", title:"Wendeltreppe",             img:"../img/wendltreppe.png",       desc:"Detailarbeit an der Wendeltreppe – saubere Anschlüsse.", },
  { cat:"detail", title:"Wendeltreppe – Unten",     img:"../img/wendltreppeunten.png",  desc:"Präzise Ausführung bis in den unteren Bereich.",  },

  // Terrasse / Sonstiges
  { cat:"fassade", title:"Terrasse",               img:"../img/terasse.png",            desc:"Außenfläche sauber gepflegt – ordentliches Finish.",  },

  // Optional (wenn du’s drin haben willst)
  { cat:"detail", title:"Melanie – Portrait",      img:"../img/melanie.png",            desc:"Portraitaufnahme – optional für Vertrauen/Authentizität.",  },
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
