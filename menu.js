/* Menu des quatre pages : catalogue, sapin de l'Avent, Pharmacogames, palmarès.
   Propre au site Vercel. Quatre boutons ronds remplacent les boutons d'accès de l'en-tête : chacun reprend le logo
   de la pharmacotechnie (le P et sa fleur de gouttes), recoloré selon la page et coiffé d'un accessoire.
   Les images img/menu-*.webp sont tirées de img/logo-p-verre.png : seul le P garde sa couleur.
   Chaque bouton est un jeton épais qui se retourne en trois dimensions ; sa tranche et son dos sont en verre,
   le dos porte l'accessoire en grand.
   Les boutons du concours et du palmarès n'apparaissent que si leur page existe, c'est-à-dire si le serveur répond.
   Sans ce fichier, les boutons d'origine restent en place. */
(() => {
  const q = s => document.querySelector(s);
  const ancre = q(".hero .pensee") || q(".hero .lead");
  if (!ancre) return;
  // Accessoire dessiné par-dessus le logo, dans un repère de 100 sur 100.
  const PLUS = {
    // un pion au pied du P
    catalogue: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="translate(60 55) scale(.38)"><path d="M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z" fill="none" stroke="#FFFBF2" stroke-width="22" stroke-linejoin="round"/><path d="M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z" fill="#EC7739" stroke="#26076D" stroke-width="8" stroke-linejoin="round"/></g></svg>',
    // la fleur devient couronne de Noël, étoile au sommet
    sapin: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M38.0 -2.0L42.1 7.4L52.3 8.4L44.6 15.1L46.8 25.1L38.0 19.9L29.2 25.1L31.4 15.1L23.7 8.4L33.9 7.4Z" fill="none" stroke="#FFFBF2" stroke-width="7" stroke-linejoin="round"/><path d="M38.0 -2.0L42.1 7.4L52.3 8.4L44.6 15.1L46.8 25.1L38.0 19.9L29.2 25.1L31.4 15.1L23.7 8.4L33.9 7.4Z" fill="#ECD567" stroke="#26076D" stroke-width="2.6" stroke-linejoin="round"/></svg>',
    // un dé roule au pied du P
    pharmacogames: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="rotate(12 76 74)"><rect x="60" y="58" width="32" height="32" rx="8" fill="none" stroke="#FFFBF2" stroke-width="7"/><rect x="60" y="58" width="32" height="32" rx="8" fill="#ECD567" stroke="#26076D" stroke-width="2.8"/><circle cx="68" cy="66" r="3.1" fill="#26076D"/><circle cx="84" cy="66" r="3.1" fill="#26076D"/><circle cx="76" cy="74" r="3.1" fill="#26076D"/><circle cx="68" cy="82" r="3.1" fill="#26076D"/><circle cx="84" cy="82" r="3.1" fill="#26076D"/></g></svg>',
    // le P couronné
    vote: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="translate(39 11) rotate(-10) scale(1.08)"><path d="M-17 9V-7l8.5 8L0-11l8.5 12L17-7V9z" fill="none" stroke="#FFFBF2" stroke-width="7" stroke-linejoin="round"/><path d="M-17 9V-7l8.5 8L0-11l8.5 12L17-7V9z" fill="#ECD567" stroke="#26076D" stroke-width="2.6" stroke-linejoin="round"/><circle cx="-17" cy="-8" r="2.6" fill="#EC7739" stroke="#26076D" stroke-width="1.6"/><circle cx="0" cy="-12" r="2.6" fill="#EC7739" stroke="#26076D" stroke-width="1.6"/><circle cx="17" cy="-8" r="2.6" fill="#EC7739" stroke="#26076D" stroke-width="1.6"/></g></svg>',
  };
  // Le dos de chaque jeton, visible quand il se retourne : l'accessoire de la page, en grand.
  const DOS = {
    catalogue: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="translate(21 20) scale(.58)"><path d="M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z" fill="#EC7739" stroke="#26076D" stroke-width="7" stroke-linejoin="round"/></g></svg>',
    sapin: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect x="44" y="76" width="12" height="11" rx="2" fill="#A9440F" stroke="#26076D" stroke-width="4"/><path d="M50 20L65 42H58L71 60H62L76 79H24L38 60H29L42 42H35Z" fill="#3E9B76" stroke="#26076D" stroke-width="4" stroke-linejoin="round"/><path d="M50 8L53.2 15.3L61 16.1L55.1 21.3L56.8 29L50 25L43.2 29L44.9 21.3L39 16.1L46.8 15.3Z" fill="#ECD567" stroke="#26076D" stroke-width="3" stroke-linejoin="round"/></svg>',
    pharmacogames: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="rotate(12 50 50)"><rect x="26" y="26" width="48" height="48" rx="11" fill="#ECD567" stroke="#26076D" stroke-width="4.5"/><circle cx="38" cy="38" r="4.6" fill="#26076D"/><circle cx="62" cy="38" r="4.6" fill="#26076D"/><circle cx="50" cy="50" r="4.6" fill="#26076D"/><circle cx="38" cy="62" r="4.6" fill="#26076D"/><circle cx="62" cy="62" r="4.6" fill="#26076D"/></g></svg>',
    vote: '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="translate(50 54) scale(2)"><path d="M-17 9V-7l8.5 8L0-11l8.5 12L17-7V9z" fill="#ECD567" stroke="#26076D" stroke-width="2.3" stroke-linejoin="round"/><circle cx="-17" cy="-8" r="2.6" fill="#EC7739" stroke="#26076D" stroke-width="1.5"/><circle cx="0" cy="-12" r="2.6" fill="#EC7739" stroke="#26076D" stroke-width="1.5"/><circle cx="17" cy="-8" r="2.6" fill="#EC7739" stroke="#26076D" stroke-width="1.5"/></g></svg>',
  };
  // La tranche du jeton : onze disques empilés entre la face et le dos.
  const TRANCHE = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(z => '<span class="pm-t" style="--z:' + z + 'px"></span>').join("");
  const n = typeof G !== "undefined" && Array.isArray(G) ? G.length : 0;
  // bientot : la page n'est pas encore ouverte ; une étiquette de travers le dit sous le bouton, avec son motif.
  // sel : la section qui doit exister pour que le bouton s'affiche ; img : la déclinaison du logo ; fond : la teinte du disque.
  const PAGES = [
    { id: "catalogue", href: "#", t: "Catalogue", s: n ? n + " jeux à prescrire" : "Les jeux à prescrire", img: "menu-catalogue.webp", fond: "#F59A62" },
    { id: "sapin", href: "#sapin", t: "Sapin de l'Avent", s: "Une dose par jour", sel: "#avent", img: "menu-sapin.webp", fond: "#BFE3C9", bientot: "lot en quarantaine" },
    { id: "pharmacogames", href: "#pharmacogames", t: "Pharmacogames", s: "Le concours à points", sel: "#pharmacogames", img: "menu-pharmacogames.webp", fond: "#B9A6F0", bientot: "libération en cours" },
    { id: "vote", href: "#vote", t: "Palmarès", s: "Votez pour votre jeu", sel: "#vote", img: "menu-palmares.webp", fond: "#F2E39A" },
  ];

  const st = document.createElement("style");
  st.textContent = `
.hero .avgo{display:none!important}
.pm{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 10px;max-width:640px;margin:24px 0 0}
.pm a{display:grid;justify-items:center;align-content:start;gap:7px;min-width:0;text-align:center;color:var(--on-bg);text-decoration:none;-webkit-tap-highlight-color:transparent}
.pm-d{position:relative;display:block;width:86px;height:86px;border-radius:50%;perspective:520px;transition:transform .12s}
.pm-o{position:absolute;inset:0;display:block;border-radius:50%;background:var(--shadow);transform:translate(4px,4px);transition:transform .12s}
.pm-j{position:absolute;inset:0;display:block;transform-style:preserve-3d}
.pm-f,.pm-v,.pm-t{position:absolute;inset:0;display:block;border-radius:50%;border:3px solid var(--line)}
.pm-f,.pm-v{-webkit-backface-visibility:hidden;backface-visibility:hidden}
.pm-f{background:radial-gradient(120% 120% at 30% 18%,#fff,#FFFBF2 46%,var(--fond) 100%);transform:translateZ(6px)}
.pm-v{border-color:rgba(255,255,255,.85);background:radial-gradient(70% 55% at 30% 20%,rgba(255,255,255,.9),rgba(255,255,255,0) 70%),linear-gradient(135deg,rgba(255,255,255,.72),color-mix(in srgb,var(--fond) 55%,transparent) 60%,rgba(255,255,255,.5));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45),inset -5px -7px 12px rgba(38,7,109,.14),inset 4px 5px 10px rgba(255,255,255,.7);transform:rotateY(180deg) translateZ(6px)}
.pm-t{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.07);box-shadow:inset 0 0 6px rgba(255,255,255,.35);transform:translateZ(var(--z))}
.pm-t:nth-child(odd){border-color:color-mix(in srgb,var(--fond) 60%,rgba(255,255,255,.55))}
.pm-d img{position:absolute;left:8%;top:8%;width:84%;height:84%}
.pm-d svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pm a.tourne .pm-j{animation:pmTour 1.6s linear both}
.pm a.tourne .pm-o{animation:pmOmbre 1.6s linear both}
@keyframes pmTour{0%{transform:rotateX(0) rotateY(0)}12%{transform:rotateX(14deg) rotateY(-24deg)}30%{transform:translateY(-5px) rotateX(10deg) rotateY(60deg)}40%{transform:translateY(-7px) rotateX(8deg) rotateY(90deg)}55%{transform:translateY(-7px) rotateX(8deg) rotateY(180deg)}68%{transform:translateY(-5px) rotateX(6deg) rotateY(270deg)}80%{transform:rotateX(2deg) rotateY(345deg)}90%{transform:rotateX(0) rotateY(367deg)}100%{transform:rotateX(0) rotateY(360deg)}}
@keyframes pmOmbre{0%{transform:translate(4px,4px) scaleX(1)}12%{transform:translate(4px,5px) scaleX(.91)}30%{transform:translate(6px,8px) scaleX(.5)}40%{transform:translate(7px,9px) scaleX(.12)}55%{transform:translate(7px,9px) scaleX(1)}68%{transform:translate(6px,8px) scaleX(.12)}80%{transform:translate(4px,5px) scaleX(.97)}90%,100%{transform:translate(4px,4px) scaleX(1)}}
.pm b{display:block;padding:2px 8px;border-radius:999px;font-weight:800;font-size:1rem;line-height:1.15;white-space:nowrap}
.pm small{display:block;font:600 .64rem/1.2 var(--mono);letter-spacing:.03em;text-transform:uppercase}
@media(hover:hover){.pm a:hover .pm-d{transform:translate(-1px,-2px)}.pm a:hover .pm-o{transform:translate(7px,9px)}}
.pm a:active .pm-d{transform:translate(2px,2px)}
.pm a:active .pm-o{transform:translate(-1px,-1px)}
.pm a:focus-visible{outline:0}
.pm a:focus-visible .pm-d{outline:3px solid var(--focus);outline-offset:4px}
.pm-s{display:block;margin-top:3px;padding:3px 8px 4px;background:var(--li);color:#26076D;border:2px solid var(--line);border-radius:8px;box-shadow:2px 2px 0 var(--shadow);font:600 .64rem/1.2 var(--mono);font-style:normal;letter-spacing:.03em;text-transform:uppercase;transform:rotate(-4deg);transform-origin:50% 0;animation:pmPend 2.6s ease-in-out infinite}
.pm a:nth-child(odd) .pm-s{transform:rotate(3deg);animation-delay:-1.3s}
.pm-s i{display:block;font-style:normal;font-weight:500;font-size:.9em;text-transform:none;letter-spacing:0}
@keyframes pmPend{0%,100%{rotate:-2deg}50%{rotate:2deg}}
.pm a[aria-current="page"] .pm-f{box-shadow:0 0 0 4px var(--mu),0 0 0 7px var(--line)}
.pm a[aria-current="page"] .pm-o{opacity:0}
.pm a[aria-current="page"] b{background:var(--pressed);color:var(--pressed-on)}
.pm a.att{visibility:hidden}
.pm a[hidden]{display:none}
@media(max-width:720px){.pm{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 10px;max-width:420px}}
@media(max-width:360px){.pm b{font-size:.86rem;padding:2px 6px}}
@media(prefers-reduced-motion:reduce){.pm-d,.pm-o{transition:none}.pm a.tourne .pm-j,.pm a.tourne .pm-o,.pm-s{animation:none}}`;
  document.head.appendChild(st);

  const nav = document.createElement("nav");
  nav.className = "pm";
  nav.setAttribute("aria-label", "Les quatre pages du site");
  nav.innerHTML = PAGES.map(p => '<a href="' + p.href + '" data-page="' + p.id + '"' + (p.sel && !q(p.sel) ? ' class="att"' : "") + '><span class="pm-d" style="--fond:' + p.fond + '">'
    + '<span class="pm-o"></span><span class="pm-j"><span class="pm-f"><img src="img/' + p.img + '" alt="" width="224" height="224" decoding="async">' + PLUS[p.id] + "</span>" + TRANCHE
    + '<span class="pm-v" style="--fond:' + p.fond + '">' + DOS[p.id] + "</span></span></span><b>" + p.t + "</b><small>" + p.s + "</small>" + (p.bientot ? '<em class="pm-s">Bientôt disponible<i>' + p.bientot + "</i></em>" : "") + "</a>").join("");
  ancre.insertAdjacentElement("afterend", nav);

  const page = () => (location.hash === "#sapin" ? "sapin" : location.hash === "#vote" ? "vote" : location.hash === "#pharmacogames" || location.hash === "#enigme" ? "pharmacogames" : "catalogue");
  function repere() {
    const ici = page();
    nav.querySelectorAll("a").forEach(a => { if (a.dataset.page === ici) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  // Le bouton du catalogue ramène aux fiches, pas seulement en haut de page.
  nav.addEventListener("click", e => {
    const a = e.target.closest('a[data-page="catalogue"]');
    if (!a || e.defaultPrevented) return;
    setTimeout(() => { const c = q(".bar") || q("main"); if (c && !c.hidden) c.scrollIntoView({ block: "start" }); }, 0);
  });
  // Le jeton fait un tour sur lui-même au survol de la souris et au clic. Rien ne bouge si l'animation est réduite.
  const calme = window.matchMedia("(prefers-reduced-motion:reduce)");
  const tourner = a => { if (a && !calme.matches && !a.hidden && !a.classList.contains("att")) a.classList.add("tourne"); };
  nav.addEventListener("animationend", e => { if (e.animationName === "pmTour") e.target.closest("a").classList.remove("tourne"); });
  let attente = 0;
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") tourner(a); });
    a.addEventListener("click", e => {
      tourner(a);
      // Clic ou toucher simple : la page attend que le jeton montre son dos, sinon elle défile et l'emporte hors de l'écran.
      // Pas d'attente au clavier (detail à 0), avec une touche de modification (nouvel onglet), ni en animation réduite.
      if (calme.matches || e.detail === 0 || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      clearTimeout(attente);
      attente = setTimeout(() => a.click(), 800);
    });
  });
  // Les pages du vote et du concours arrivent après la réponse du serveur : leur bouton se montre à ce moment-là.
  const montrer = () => PAGES.forEach(p => { if (p.sel && q(p.sel)) { const a = nav.querySelector('[data-page="' + p.id + '"]'); a.classList.remove("att"); a.hidden = false; } });
  const obs = new MutationObserver(montrer);
  obs.observe(document.body, { childList: true });
  // Serveur muet : on retire les boutons restés en attente plutôt que de laisser deux places vides.
  setTimeout(() => { nav.querySelectorAll("a.att").forEach(a => { a.hidden = true; }); }, 6000);
  window.addEventListener("hashchange", repere);
  repere();
})();
