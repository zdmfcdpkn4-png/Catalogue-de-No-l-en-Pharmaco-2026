/* Menu des quatre pages : catalogue, sapin de l'Avent, Pharmacogames, palmarès.
   Propre au site Vercel. Quatre logos inspirés de la pharmacotechnie remplacent les boutons d'accès de l'en-tête ;
   la page ouverte est repérée. Les logos du concours et du palmarès n'apparaissent que si leur page existe,
   c'est-à-dire si le serveur répond. Sans ce fichier, les boutons d'origine restent en place. */
(() => {
  const q = s => document.querySelector(s);
  const ancre = q(".hero .pensee") || q(".hero .lead");
  if (!ancre) return;
  const LOGOS = {
    // la boîte de médicament qui contient un jeu
    catalogue: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#F59A62" stroke="#26076D" stroke-width="2.5"/><path d="M12 17l4-6.5h16l4 6.5z" fill="#FFFBF2" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><rect x="9" y="17" width="30" height="22" rx="3" fill="#FFFBF2" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 23h30" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M10.2 18.2h27.6v3.7H10.2z" fill="#ECD567"/><path d="M14 29.5h3v-3h3.4v3h3v3.4h-3v3h-3.4v-3h-3z" fill="#3E9B76" stroke="#26076D" stroke-width="1.5" stroke-linejoin="round"/><g transform="translate(25.6 24.8) scale(.125)"><path d="M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z" fill="#EC7739" stroke="#26076D" stroke-width="13" stroke-linejoin="round"/></g></svg>',
    // l'erlenmeyer vert, étoile au goulot, bulles en guise de boules
    sapin: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#F2E39A" stroke="#26076D" stroke-width="2.5"/><path d="M21 14v7L11.6 36.4C10.3 38.6 11.8 41 14.4 41h19.2c2.6 0 4.1-2.4 2.8-4.6L27 21v-7z" fill="#FFFBF2" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M17.6 27h12.8l6 9.4c1.3 2.2-.2 4.6-2.8 4.6H14.4c-2.6 0-4.1-2.4-2.8-4.6z" fill="#3E9B76" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M19.5 14h9" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="19" cy="34" r="2" fill="#ECD567" stroke="#26076D" stroke-width="1.2"/><circle cx="27.5" cy="36.6" r="2" fill="#EC7739" stroke="#26076D" stroke-width="1.2"/><circle cx="24.6" cy="30.6" r="1.7" fill="#FFFBF2" stroke="#26076D" stroke-width="1.2"/><path d="M24.0 3.2L25.5 6.6L29.1 6.9L26.4 9.4L27.2 13.0L24.0 11.1L20.8 13.0L21.6 9.4L18.9 6.9L22.5 6.6Z" fill="#ECD567" stroke="#26076D" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    // la gélule et le dé
    pharmacogames: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#B9A6F0" stroke="#26076D" stroke-width="2.5"/><g transform="rotate(-42 19 19)"><rect x="4.5" y="13" width="29" height="12" rx="6" fill="#FFFBF2" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M19 13h8.5a6 6 0 0 1 0 12H19z" fill="#EC7739" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="rotate(9 30 31)"><rect x="20.5" y="21.5" width="19" height="19" rx="4.5" fill="#ECD567" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="25.5" cy="26.5" r="1.9" fill="#26076D"/><circle cx="34.5" cy="26.5" r="1.9" fill="#26076D"/><circle cx="30" cy="31" r="1.9" fill="#26076D"/><circle cx="25.5" cy="35.5" r="1.9" fill="#26076D"/><circle cx="34.5" cy="35.5" r="1.9" fill="#26076D"/></g></svg>',
    // le mortier d'or, pilon compris
    vote: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#EFC7E4" stroke="#26076D" stroke-width="2.5"/><path d="M31.5 5.5l4.2 2.4-7.4 13-3.4-2z" fill="#FFFBF2" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M13 19.5c-5.5-.4-5.5 8 1.8 8M35 19.5c5.5-.4 5.5 8-1.8 8" fill="none" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M11.5 17h25c0 9.5-4.5 15.5-12.5 15.5S11.5 26.5 11.5 17z" fill="#ECD567" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M21.3 32.3h5.4v4.2h-5.4z" fill="#ECD567" stroke="#26076D" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><rect x="15.5" y="36.5" width="17" height="5" rx="1.6" fill="#26076D"/><path d="M24.0 19.4L25.2 22.3L28.4 22.6L26.0 24.7L26.7 27.7L24.0 26.1L21.3 27.7L22.0 24.7L19.6 22.6L22.8 22.3Z" fill="#EC7739" stroke="#26076D" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  };
  const n = typeof G !== "undefined" && Array.isArray(G) ? G.length : 0;
  // sel : la section qui doit exister pour que le logo s'affiche.
  const PAGES = [
    { id: "catalogue", href: "#", t: "Catalogue", s: n ? n + " jeux à prescrire" : "Les jeux à prescrire" },
    { id: "sapin", href: "#sapin", t: "Sapin de l'Avent", s: "Une dose par jour", sel: "#avent" },
    { id: "pharmacogames", href: "#pharmacogames", t: "Pharmacogames", s: "Le concours à points", sel: "#pharmacogames" },
    { id: "vote", href: "#vote", t: "Palmarès", s: "Votez pour votre jeu", sel: "#vote" },
  ];

  const st = document.createElement("style");
  st.textContent = `
.hero .avgo{display:none!important}
.pm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:58ch;margin:20px 0 0}
.pm a{display:flex;align-items:center;gap:10px;min-width:0;padding:7px 12px 7px 7px;background:var(--surface);color:var(--on-surface);border:3px solid var(--line);border-radius:16px;box-shadow:4px 4px 0 var(--shadow);text-decoration:none;transition:transform .12s,box-shadow .12s}
.pm svg{flex:0 0 auto;width:52px;height:52px}
.pm span{min-width:0}
.pm b{display:block;font-weight:800;font-size:1rem;line-height:1.1}
.pm small{display:block;margin-top:3px;font:600 .66rem/1.2 var(--mono);letter-spacing:.03em;text-transform:uppercase;color:var(--muted)}
@media(hover:hover){.pm a:hover{transform:translate(-1px,-1px);box-shadow:6px 6px 0 var(--shadow)}}
.pm a:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--shadow)}
.pm a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
.pm a[aria-current="page"]{background:var(--pressed);color:var(--pressed-on)}
.pm a[aria-current="page"] small{color:inherit;opacity:.85}
.pm a.att{visibility:hidden}
.pm a[hidden]{display:none}
@media(max-width:560px){.pm{gap:10px}.pm a{flex-direction:column;gap:6px;padding:10px 6px 9px;text-align:center}.pm svg{width:48px;height:48px}.pm b{font-size:.95rem}}
@media(prefers-reduced-motion:reduce){.pm a{transition:none}}`;
  document.head.appendChild(st);

  const nav = document.createElement("nav");
  nav.className = "pm";
  nav.setAttribute("aria-label", "Les quatre pages du site");
  nav.innerHTML = PAGES.map(p => '<a href="' + p.href + '" data-page="' + p.id + '"' + (p.sel && !q(p.sel) ? ' class="att"' : "") + ">" + LOGOS[p.id] + "<span><b>" + p.t + "</b><small>" + p.s + "</small></span></a>").join("");
  ancre.insertAdjacentElement("afterend", nav);

  const page = () => (location.hash === "#sapin" ? "sapin" : location.hash === "#vote" ? "vote" : location.hash === "#pharmacogames" || location.hash === "#enigme" ? "pharmacogames" : "catalogue");
  function repere() {
    const ici = page();
    nav.querySelectorAll("a").forEach(a => { if (a.dataset.page === ici) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  // Le logo du catalogue ramène aux fiches, pas seulement en haut de page.
  nav.addEventListener("click", e => {
    const a = e.target.closest('a[data-page="catalogue"]');
    if (!a) return;
    setTimeout(() => { const c = q(".bar") || q("main"); if (c && !c.hidden) c.scrollIntoView({ block: "start" }); }, 0);
  });
  // Les pages du vote et du concours arrivent après la réponse du serveur : leur logo se montre à ce moment-là.
  const montrer = () => PAGES.forEach(p => { if (p.sel && q(p.sel)) { const a = nav.querySelector('[data-page="' + p.id + '"]'); a.classList.remove("att"); a.hidden = false; } });
  const obs = new MutationObserver(montrer);
  obs.observe(document.body, { childList: true });
  // Serveur muet : on retire les logos restés en attente plutôt que de laisser deux cases vides.
  setTimeout(() => { nav.querySelectorAll("a.att").forEach(a => { a.hidden = true; }); }, 6000);
  window.addEventListener("hashchange", repere);
  repere();
})();
