/* Pharmacogames de Noël : le concours individuel à points (d'abord appelé « la grande énigme de Noël »).
   À ne pas confondre avec le vote du jeu préféré, qui vit dans vote.js.
   Propre au site Vercel : ce module parle à /api/enigme (prénom et code d'équipe exigés).
   Une porte par jour du 1er au 25 décembre, classée son jour et les cinq suivants ; les questions, les solutions et les points
   viennent du serveur, rien n'est écrit ici. L'énoncé d'une question n'arrive qu'avec son chrono ; les jeux
   d'adresse (jeux.js, chargé à la demande) renvoient une note de 0 à 10. Sans serveur, par exemple dans l'artefact claude.ai, rien ne s'affiche. */
(() => {
  const API = "/api/enigme", KEY = "pharmacotechnie-enigme-2026", KEY_VOTE = "pharmacotechnie-vote-2026";
  const q = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'").toLowerCase();
  const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;
  const fr = s => h(s).replace(/ ([?!:;»])/g, "\u00A0$1").replace(/« /g, "«\u00A0");
  const pl = (n, un, des) => n + " " + (n > 1 ? des : un);
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { mem = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} };
  // Vidéo d'ouverture : jouée une fois par porte et par appareil, au premier clic sur une porte disponible.
  // Le panneau est déjà affiché dessous. Le voile n'apparaît que si la lecture démarre : sans fichier, sans
  // démarrage sous 1,5 s ou en mouvement réduit, rien ne se montre et rien n'est bloqué. Elle ne lance rien.
  const KEY_VUES = KEY + "-portes";
  const ouverture = n => {
    let vues = {};
    try { vues = JSON.parse(localStorage.getItem(KEY_VUES) || "{}") || {}; } catch (e) {}
    if (vues[n] || q(".eg-ouv") || (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches)) return;
    const o = document.createElement("button"), v = document.createElement("video"), avant = document.activeElement;
    o.type = "button"; o.className = "eg-ouv"; o.setAttribute("aria-label", "Passer l'animation d'ouverture de la porte " + n);
    // Son de la vidéo : coupé par défaut, activable par un bouton posé à côté du voile ; le choix reste sur l'appareil.
    const KEY_SON = KEY + "-son", sonVoulu = () => { try { return localStorage.getItem(KEY_SON) === "1"; } catch (e) { return false; } };
    const s = document.createElement("button"), etatSon = () => { s.textContent = v.muted ? "Son : coupé" : "Son : activé"; s.setAttribute("aria-pressed", String(!v.muted)); };
    s.type = "button"; s.className = "eg-son";
    s.addEventListener("click", e => { e.stopPropagation(); v.muted = !v.muted; try { localStorage.setItem(KEY_SON, v.muted ? "0" : "1"); } catch (x) {} etatSon(); });
    v.muted = !sonVoulu(); v.playsInline = true; v.preload = "auto"; v.setAttribute("aria-hidden", "true"); v.src = "video/porte-ouverture.mp4";
    o.appendChild(v); o.insertAdjacentHTML("beforeend", '<span class="eg-passer" aria-hidden="true">Passer</span>'); etatSon();
    let fini = false, garde = setTimeout(() => fermer(true), 1500);
    const fermer = net => {
      if (fini) return;
      fini = true; clearTimeout(garde);
      try { v.pause(); } catch (e) {}
      const oter = () => { const f = document.activeElement === o || document.activeElement === s; o.remove(); s.remove(); if (f && avant && avant.isConnected) avant.focus({ preventScroll: true }); };
      if (net || !o.classList.contains("on")) return oter();
      o.classList.add("off"); setTimeout(oter, 450);
    };
    v.addEventListener("playing", () => {
      if (fini || o.classList.contains("on")) return;
      clearTimeout(garde); garde = setTimeout(() => fermer(false), 7000);
      vues[n] = 1; try { localStorage.setItem(KEY_VUES, JSON.stringify(vues)); } catch (e) {}
      o.classList.add("on"); s.classList.add("on"); o.focus({ preventScroll: true });
    });
    v.addEventListener("timeupdate", () => { if (v.currentTime >= 3.75) fermer(false); });
    v.addEventListener("ended", () => fermer(false));
    v.addEventListener("error", () => fermer(true));
    o.addEventListener("click", () => fermer(false));
    o.addEventListener("keydown", e => { if (e.key === "Escape") fermer(false); });
    s.addEventListener("keydown", e => { if (e.key === "Escape") fermer(false); });
    document.body.appendChild(o); document.body.appendChild(s);
    // Lecture avec le son refusée par le navigateur : on repart en muet plutôt que de ne rien montrer.
    const p = v.play();
    if (p && p.catch) p.catch(() => { if (v.muted) return fermer(true); v.muted = true; etatSon(); const p2 = v.play(); if (p2 && p2.catch) p2.catch(() => fermer(true)); });
  };
  // E : dernier état reçu du serveur ; choix : porte affichée ; brouillon : réponse en cours de saisie.
  // echeance : fin du chrono de chaque question lancée, à l'horloge de l'appareil ; enJeu : arrêt du jeu en cours.
  let E = null, choix = 0, brouillon = null, aConfirmer = false, relecture = "", occupe = false, sec;
  let echeance = {}, tic = 0, enJeu = null;
  // enFiche : la fiche d'identification (avatar, brigade) occupe le panneau ; participants.js la dessine.
  let enFiche = false;
  // versFiche : arrivée par la pastille « Pharmacomeeple » du menu (#pharmacomeeple) ; la fiche s'ouvre dès que le calendrier est chargé.
  let versFiche = false;

  const call = async body => {
    const r = await fetch(API, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    return { status: r.status, j };
  };

  // Booster de l'enquête dans le sapin : les cartes d'un jour de décembre, pour le joueur mémorisé sur cet appareil.
  // PharmacoBooster.cartes(jour) rend une promesse de { identifie, cartes }. Sans code d'équipe, sans fiche ou sans brigade :
  // identifie faux, aucune carte (le sapin montre alors des cartes de dos). Sinon, dans l'ordre : l'énigme de ce jour
  // ({ type: "enigme", k, jour, titre, texte, options, finale }), puis les révélations parues ce jour-là pour sa brigade
  // ({ type: "revelation", k, titre, texte, elimine: { id, nom } si elle innocente une carte }). Tout vient du serveur,
  // qui ne livre un texte qu'à l'étape qui le dévoile : rien n'est écrit ici.
  window.PharmacoBooster = {
    async cartes(jour) {
      const vide = { identifie: false, cartes: [] };
      if (!mem.code || !mem.prenom || !Number.isInteger(jour)) return vide;
      let r;
      try { r = await call({ code: mem.code, prenom: mem.prenom }); } catch (e) { return vide; }
      if (r.status !== 200 || !r.j.profil || r.j.profil.b === undefined) return vide;
      const Q = r.j.enquete, C = [], date = "2026-12-" + String(jour).padStart(2, "0");
      if (!Q || !Array.isArray(Q.enigmes)) return { identifie: true, cartes: C };
      const nom = id => ((Q.fiches || []).find(f => f.id === id) || {}).nom || "";
      for (const e of Q.enigmes) if (e.jour === jour && !e.quete && e.enonce) C.push({ type: "enigme", k: e.k, jour: e.jour, titre: e.titre || "", texte: e.enonce, options: Array.isArray(e.options) ? e.options : undefined, finale: e.k > 21 });
      for (const e of Q.enigmes) if (e.revelation && e.paru === date) C.push({ type: "revelation", k: e.k, titre: e.titre || "", texte: e.revelation, elimine: e.elimine ? { id: e.elimine, nom: nom(e.elimine) } : undefined });
      return { identifie: true, cartes: C };
    },
  };

  // Contrôle d'accès du sapin : le sapin demande le code d'équipe, puis le joueur touche son avatar. Simple affichage :
  // le contenu du sapin est public, la barrière des jeux reste le serveur. La mémoire est celle du concours (même appareil,
  // même joueur dans le sapin et aux Pharmacogames).
  //   identite()           : { pseudo } si un joueur est mémorisé sur cet appareil avec son code, sinon null.
  //   joueurs(code)        : promesse de { joueurs: [{ pseudo, avatar, brigade }] } (ceux qui ont une fiche, par ordre
  //                          alphabétique), ou de { erreur: "code" | "serveur" }. Le code n'est gardé qu'après choisir().
  //   choisir(code, pseudo): mémorise le joueur ; rend son identité.
  //   oublier()            : oublie le joueur de cet appareil (le code d'équipe reste).
  //   dessin(avatar, brigade) : promesse du SVG de l'avatar (participants.js, chargé à la demande).
  window.PharmacoAcces = {
    // Avatar et brigade : ceux de la fiche chargée dans la page, sinon ceux gardés sur l'appareil à la dernière visite.
    identite: () => (mem.code && mem.prenom ? Object.assign({ pseudo: mem.prenom }, Array.isArray(mem.av) ? { avatar: mem.av, brigade: mem.br } : {}) : null),
    // Le joueur mémorisé, demandé au serveur avec le code gardé sur l'appareil ; rien n'est demandé sans joueur identifié.
    async moi() {
      if (!mem.code || !mem.prenom) return null;
      let r;
      try { r = await call({ code: mem.code, prenom: mem.prenom }); } catch (e) { return null; }
      const P = r.status === 200 && r.j && r.j.profil;
      if (!P || !Array.isArray(P.a)) return null;
      mem.av = P.a; mem.br = P.b; save();
      return { pseudo: mem.prenom, avatar: P.a, brigade: P.b };
    },
    async joueurs(code) {
      let r;
      try { r = await call({ code: String(code || "").trim() }); } catch (e) { return { erreur: "serveur" }; }
      if (r.status === 401 || r.j.relecture) return { erreur: "code" };
      if (r.status !== 200) return { erreur: "serveur" };
      return { joueurs: (r.j.classement || []).filter(x => Array.isArray(x.a) && x.b !== undefined).map(x => ({ pseudo: x.p, avatar: x.a, brigade: x.b })).sort((x, y) => x.pseudo.localeCompare(y.pseudo, "fr")) };
    },
    choisir(code, pseudo) {
      if (!code || !pseudo) return null;
      mem.code = String(code).trim(); mem.prenom = String(pseudo); delete mem.nom; save();
      return { pseudo: mem.prenom };
    },
    oublier() { delete mem.prenom; delete mem.nom; save(); },
    dessin: (avatar, brigade) => chargerParticipants().then(() => window.PharmacoParticipants.avatar(avatar, { brigade })),
  };

  fetch(API, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.ready) init(); }).catch(() => {});

  // Dates : le serveur parle en AAAA-MM-JJ, heure de Paris.
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dt = (iso, plus) => { const [a, m, j] = iso.split("-").map(Number); return new Date(a, m - 1, j + (plus || 0)); };
  const jour = (d, court) => (court ? "" : JOURS[d.getDay()] + " ") + d.getDate() + (d.getDate() === 1 ? "er" : "") + " " + (court ? MOIS[d.getMonth()].slice(0, 3) + "." : MOIS[d.getMonth()]);
  const val = (p, v) => (p.type === "qcm" ? p.options[v].t : p.prefixe ? p.prefixe + String(v).padStart(2, "0") : v + (p.unite ? " " + p.unite : ""));

  const NOTICE = `<details class="eg-panel eg-notice" id="egNotice"><summary>Notice des Pharmacogames : à lire avant la première prise</summary>
<p class="eg-bd-aide" id="egBdAide">Mode d'emploi en six cases : faites glisser.</p>
<div class="eg-bd" role="region" aria-labelledby="egBdAide" tabindex="0"><img src="img/notice-pharmacogames-1.svg" alt="Case 1, Étiquetage. Le flacon montre son avatar en forme de meeple et un badge de brigade : « Nom, pseudo, avatar : flacon bien étiqueté ! Le sort me range dans l'une des cinq brigades. »" width="400" height="300" loading="lazy"><img src="img/notice-pharmacogames-2.svg" alt="Case 2, Le sapin d'abord. Une flèche va du sapin à la porte du jour : « La goutte du sapin avant la porte, et les portes dans l'ordre : on ne saute pas d'étape en ZAC. »" width="400" height="300" loading="lazy"><img src="img/notice-pharmacogames-3.svg" alt="Case 3, Au chrono. Un chronomètre tourne à côté du flacon concentré : « Cinq questions, 30 ou 40 secondes chacune, une seule prise, 2 points pièce. Dose : 2 points à 2 près, 1 point à 10 près. »" width="400" height="300" loading="lazy"><img src="img/notice-pharmacogames-4.svg" alt="Case 4, Jeux d'adresse. Une cible touchée et un podium : « Deux essais, je garde le meilleur. Au rang : 10 points au premier, 1 au dernier. Le 25, double dose : 20 points ! »" width="400" height="300" loading="lazy"><img src="img/notice-pharmacogames-5.svg" alt="Case 5, Quarantaine. Six jours au calendrier et une enveloppe scellée : « Porte ouverte six jours. Les résultats ? En quarantaine jusqu'à la clôture. Patience ! »" width="400" height="300" loading="lazy"><img src="img/notice-pharmacogames-6.svg" alt="Case 6, En brigade. Trois meeples entourent le flacon : « Enquête d'équipe : un avis chacun, la majorité tranche. Jusqu'à 40 points pour la brigade. »" width="400" height="300" loading="lazy"></div>
<p class="eg-fx">Effet indésirable très fréquent : consultation compulsive du classement.</p></details>`;
  const SCEAU = '<svg class="eg-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.2 2 3-.3.7 2.9 2.6 1.5-1.2 2.7 1.2 2.7-2.6 1.5-.7 2.9-3-.3-2.2 2-2.2-2-3 .3-.7-2.9L1.5 13l1.2-2.7L1.5 7.6l2.6-1.5.7-2.9 3 .3z" fill="currentColor"/><path d="M6.4 10.3l2.4 2.4 4.6-4.9" fill="none" stroke="#26076D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CADENAS = '<svg class="eg-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 9V6.5a4 4 0 0 1 8 0V9" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="3.5" y="9" width="13" height="9.5" rx="2.5" fill="currentColor"/></svg>';
  // Symbole d'une porte ouverte : un par jeu d'adresse, un pour les cases de questions, un pour la finale. Dessins originaux,
  // repère de 24 sur 24, trait et aplats du logo. Une porte sous scellé n'en porte jamais : le serveur ne dit pas ce qu'elle cache.
  const SYMBOLES = {
    bowling: '<circle cx="8" cy="16" r="5" fill="#EC7739"/><circle cx="6.6" cy="14.4" r="0.8" fill="#26076D" stroke="none"/><circle cx="9" cy="14" r="0.8" fill="#26076D" stroke="none"/><rect x="15" y="9" width="6" height="12" rx="1.6" fill="#FFFBF2"/><path d="M15 14.5h6"/><rect x="16.4" y="5.5" width="3.2" height="3.5" fill="#26076D"/>',
    tir: '<circle cx="12" cy="12" r="9" fill="#FFFBF2"/><circle cx="12" cy="12" r="5.6" fill="#E5B4D9"/><circle cx="12" cy="12" r="2.2" fill="#EC7739"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
    flipper: '<path d="M2.5 13.5l7.5 4.6-1.2 2.2-7-3.6z" fill="#EC7739"/><path d="M21.5 13.5l-7.5 4.6 1.2 2.2 7-3.6z" fill="#EC7739"/><circle cx="12" cy="7.5" r="3.4" fill="#ECD567"/>',
    tennis: '<ellipse cx="9.5" cy="9" rx="5.6" ry="6.6" fill="#FFFBF2"/><path d="M6 4.5v9M9.5 2.6v12.8M13 4.5v9M4.4 7h10.2M4.4 11h10.2" stroke-width="1"/><path d="M13.2 14.4l5.6 6.4" stroke-width="2.8"/><circle cx="19" cy="6" r="2.5" fill="#ECD567"/>',
    labyrinthe: '<rect x="3" y="3" width="18" height="18" rx="2" fill="#FFFBF2"/><path d="M7 7h10v10H9.5v-6H14v3"/>',
    basket: '<circle cx="12" cy="5.2" r="3.7" fill="#EC7739"/><path d="M6 11.5l2.6 9h6.8l2.6-9z" fill="#FFFBF2"/><path d="M9.4 11.5l1.3 9M14.6 11.5l-1.3 9M7 15h10" stroke-width="1"/><ellipse cx="12" cy="11.5" rx="6.4" ry="1.7" fill="#ECD567"/>',
    penalty: '<path d="M3 20V6h18v14" stroke-width="2.4"/><path d="M7.5 6v9M12 6v6M16.5 6v9M3 10.5h18" stroke-width="1"/><circle cx="12" cy="17.5" r="3.2" fill="#FFFBF2"/><circle cx="12" cy="17.5" r="1" fill="#26076D" stroke="none"/>',
    volley: '<circle cx="12" cy="12" r="9.5" fill="#ECD567"/><path d="M12 2.5c-1.5 3.5-1 7 1.5 10M13.5 12.5c3.5-1 6-.5 7.5 1.5M13.5 12.5c-1 3.5-3.5 6-7 7M3 9.5c3 1.5 6 1.5 9-.5" stroke-width="1.4"/>',
    haies: '<path d="M6.5 9l-2 12M17.5 9l2 12M2.5 21h4M17.5 21h4"/><rect x="3" y="5" width="18" height="4.4" rx="1" fill="#FFFBF2"/><path d="M7.5 5v4.4M12 5v4.4M16.5 5v4.4" stroke="#EC7739" stroke-width="2.6" stroke-linecap="butt"/><rect x="3" y="5" width="18" height="4.4" rx="1"/>',
    etageres: '<rect x="3" y="3" width="18" height="18" rx="1.5" fill="#FFFBF2"/><path d="M3 9.2h18M3 15.2h18"/><rect x="5.5" y="5" width="4" height="4.2" fill="#EC7739"/><rect x="12" y="11.4" width="5.5" height="3.8" fill="#B9A6F0"/><rect x="6.5" y="17" width="3.6" height="4" fill="#ECD567"/><rect x="14.5" y="5.8" width="3" height="3.4" fill="#E5B4D9"/>',
    pastilles: '<circle cx="7.5" cy="8.5" r="4.6" fill="#E5B4D9"/><path d="M4.6 11.4l5.8-5.8" stroke-width="1.1"/><circle cx="16.5" cy="8.5" r="4.6" fill="#ECD567"/><path d="M13.6 11.4l5.8-5.8" stroke-width="1.1"/><circle cx="12" cy="16.5" r="4.6" fill="#EC7739"/><path d="M9.1 19.4l5.8-5.8" stroke-width="1.1"/>',
    twirling: '<path d="M4.5 9.5c2.5-4.5 5.5 1.5 8.5-1.500s3-4 6.5-2" stroke="#EC7739" stroke-width="2.2"/><path d="M5.5 19.500L18.5 5.5" stroke-width="2.2"/><circle cx="5" cy="20" r="2.2" fill="#FFFBF2"/><circle cx="19" cy="5" r="2.2" fill="#FFFBF2"/>',
    tour: '<rect x="6.5" y="15.5" width="11" height="6" rx="1" fill="#EC7739"/><rect x="8" y="9.8" width="8.5" height="5.7" rx="1" fill="#ECD567"/><rect x="10" y="4.6" width="5.5" height="5.2" rx="1" fill="#E5B4D9"/><path d="M3.5 21.500h17"/>',
    seringue: '<g transform="rotate(45 12 12)"><path d="M12 .5v4M9.3 .5h5.400M12 18.500v5"/><rect x="8.7" y="5.5" width="6.6" height="13" rx="1.2" fill="#FFFBF2"/><rect x="8.7" y="11.5" width="6.6" height="7" rx="1.2" fill="#EC7739"/><path d="M7 5.500h10"/></g>',
    minigolf: '<ellipse cx="8" cy="19.5" rx="5.5" ry="2" fill="#26076D"/><path d="M8 19V3"/><path d="M8 3.200l9 3.3-9 3.300z" fill="#EC7739"/><circle cx="18.5" cy="17.5" r="2.7" fill="#FFFBF2"/>',
    badminton: '<path d="M9.8 13.200L13.5 2.500l8 8-10.7 3.700z" fill="#FFFBF2"/><path d="M11.5 13.400l4.8-8.200M12.6 14.300l7-4.3" stroke-width="1"/><circle cx="8" cy="16" r="3.8" fill="#EC7739"/>',
    quiz: '<rect x="5.5" y="8" width="13" height="13.5" rx="2.8" fill="#FFFBF2"/><rect x="8.8" y="2.8" width="6.4" height="5.2" rx="1" fill="#26076D"/><path d="M9.7 12.600a2.4 2.4 0 1 1 3.5 2.100c-.9.5-1.2 1-1.2 1.8" stroke-width="2"/><circle cx="12" cy="19" r="1.15" fill="#26076D" stroke="none"/>',
    duo: '<path d="M12 2.200l3 6.2 6.8.800-5 4.7 1.3 6.700L12 17.300l-6.1 3.3 1.3-6.7-5-4.7 6.8-.8z" fill="#ECD567"/>',
    placard: '<rect x="3.5" y="12" width="17" height="8.5" rx="1.5" fill="#EC7739"/><rect x="6" y="4.5" width="12" height="7.5" rx="1.5" fill="#ECD567"/><path d="M9 8.2h6M7.5 16.2h9"/>',
    fiche: '<rect x="5" y="3" width="14" height="18" rx="2" fill="#FFFBF2"/><rect x="8" y="6" width="5" height="5" rx="1" fill="#E5B4D9"/><path d="M15.2 7h1.3M15.2 10h1.3M8 14.2h8M8 17.2h5.5"/>',
    quilles: '<rect x="4.5" y="9" width="4.6" height="11.5" rx="2.2" fill="#FFFBF2"/><rect x="10.6" y="5.5" width="4.6" height="15" rx="2.2" fill="#ECD567"/><circle cx="19" cy="17.3" r="3.2" fill="#EC7739"/><path d="M4.5 12.600h4.600M10.6 9.500h4.6"/>',
    bulle: '<path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5.500L7 20.500V16a3 3 0 0 1-3-3z" fill="#E5B4D9"/><path d="M8 7.800h8M8 11.300h5"/>',
    loupe: '<circle cx="10.5" cy="10.5" r="6.8" fill="#DCD3F7"/><path d="M15.6 15.600L21 21" stroke-width="2.8"/><path d="M7.3 10.500a3.2 3.2 0 0 1 3.2-3.2" stroke-width="1.2"/>',
    boulier: '<rect x="3.5" y="4" width="17" height="16" rx="2" fill="#FFFBF2"/><path d="M3.5 9.300h17M3.5 14.700h17"/><circle cx="8" cy="9.3" r="1.9" fill="#EC7739"/><circle cx="12" cy="9.3" r="1.9" fill="#EC7739"/><circle cx="14.5" cy="14.7" r="1.9" fill="#ECD567"/><circle cx="18" cy="14.7" r="1.9" fill="#ECD567"/>',
    fiole: '<path d="M10.3 3.500v5.700L5 19.300a1.2 1.2 0 0 0 1.1 1.700h11.800a1.2 1.2 0 0 0 1.1-1.700L13.7 9.200V3.500z" fill="#FFFBF2"/><path d="M7.7 15h8.600l2.2 4.200a.9.9 0 0 1-.8 1.300H6.300a.9.9 0 0 1-.8-1.300z" fill="#7FC8A9" stroke="none"/><path d="M9 3.500h6M10.3 3.500v5.700L5 19.300a1.2 1.2 0 0 0 1.1 1.700h11.800a1.2 1.2 0 0 0 1.1-1.700L13.7 9.200V3.5"/><circle cx="11" cy="17.8" r=".9" fill="#26076D" stroke="none"/>',
    parchemin: '<rect x="5" y="3.5" width="13" height="17" rx="1.5" fill="#F8EFC0"/><path d="M8 7.500h7M8 10.500h7M8 13.500h3.5"/><circle cx="15.5" cy="16.8" r="2.7" fill="#EC7739"/>',
    des: '<rect x="3.5" y="9" width="10.5" height="10.5" rx="2.5" fill="#FFFBF2"/><rect x="12.3" y="3.5" width="8.2" height="8.2" rx="2" fill="#E5B4D9"/><circle cx="6.7" cy="12.2" r="1" fill="#26076D" stroke="none"/><circle cx="8.750" cy="14.250" r="1" fill="#26076D" stroke="none"/><circle cx="10.8" cy="16.3" r="1" fill="#26076D" stroke="none"/><circle cx="16.4" cy="7.6" r="1" fill="#26076D" stroke="none"/>',
    trophee: '<path d="M7.5 4h9v4.500a4.5 4.5 0 0 1-9 0z" fill="#ECD567"/><path d="M7.5 5.500h-3a3 3 0 0 0 3.3 3.600M16.5 5.500h3a3 3 0 0 1-3.3 3.600M12 13v3.500M8 20.500h8"/><rect x="9.5" y="16.5" width="5" height="4" rx=".8" fill="#EC7739"/>',
    de: '<rect x="4" y="4" width="16" height="16" rx="3.5" fill="#ECD567"/><circle cx="8.5" cy="8.5" r="1.3" fill="#26076D" stroke="none"/><circle cx="15.5" cy="8.5" r="1.3" fill="#26076D" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="#26076D" stroke="none"/><circle cx="8.5" cy="15.5" r="1.3" fill="#26076D" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="#26076D" stroke="none"/>',
  };
  const symbole = p => {
    const k = p.duo || p.type === "duo" ? "duo" : p.type === "jeu" ? (SYMBOLES[p.jeu] ? p.jeu : "de") : (p.sym && SYMBOLES[p.sym] ? p.sym : "quiz");
    return '<span class="eg-sym"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="#26076D" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">' + SYMBOLES[k] + "</svg></span>";
  };

  const CSS = `
.eg [hidden]{display:none!important}
.eg .adv-intro a{color:inherit;font-weight:800;text-underline-offset:3px}
.eg-body{display:grid;grid-template-columns:minmax(0,470px) minmax(0,1fr);gap:24px 28px;align-items:start;margin-top:18px}
.eg-panel{min-width:0;padding:16px 18px 18px;background:var(--surface);color:var(--on-surface);border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.eg-gate{max-width:420px;margin-top:18px}
.eg-panel h3{margin:0;font-weight:800;font-size:1.3rem;line-height:1.1}
.eg-panel label{display:block;margin:14px 0 5px;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-gate input,.eg-gate select{display:block;width:100%;min-height:46px;font:700 1rem var(--display);color:var(--on-surface);background:#fff;border:2.5px solid var(--line);border-radius:12px;padding:8px 10px}
.eg-hint{margin:8px 0 0;font-size:.82rem;color:var(--muted)}
.eg-warn{margin:12px 0 0;padding:10px 12px;border:2.5px solid var(--line);border-radius:12px;background:#F8EFC0;color:#26076D;font-weight:700;font-size:.9rem;line-height:1.35}
.eg-d{margin:10px 0 0;font-size:1rem}
.eg-msg{margin:12px 0 0;font-size:.95rem;font-weight:800}
.eg-msg:empty{display:none}
.eg-msg.err{color:var(--off)}.eg-msg.ok{color:var(--ok)}
.eg-notice{margin-top:18px;padding:8px 16px}
.eg-notice[open]{padding-bottom:16px}
.eg-notice>summary{display:flex;align-items:center;gap:10px;min-height:40px;font-weight:800;font-size:1.08rem;line-height:1.15;cursor:pointer;list-style:none}
.eg-notice>summary::-webkit-details-marker{display:none}
.eg-notice>summary::before{content:"+";display:inline-grid;place-items:center;flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--mu);color:#26076D;border:2px solid var(--line);font-weight:800;line-height:1}
.eg-notice[open]>summary::before{content:"\\2212"}
.eg-rules{display:grid;gap:9px;margin:8px 0 0;padding:0;list-style:none;counter-reset:eg}
.eg-rules li{position:relative;min-height:26px;padding-left:36px;font-size:.92rem;line-height:1.4}
.eg-rules li::before{counter-increment:eg;content:counter(eg);position:absolute;left:0;top:-1px;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--pressed);color:var(--pressed-on);font:800 .82rem/1 var(--display)}
.eg-rules b{font-weight:800}
.eg-bd-aide{margin:6px 0 8px;font-size:.84rem;font-weight:700;color:var(--muted)}
.eg-bd{display:grid;grid-auto-flow:column;grid-auto-columns:88%;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;padding:2px 2px 8px;border-radius:12px}
.eg-bd img{display:block;width:100%;height:auto;scroll-snap-align:start}
.eg-bd:focus-visible{outline:3px solid var(--line);outline-offset:2px}
@media(min-width:861px){.eg-bd{grid-auto-columns:calc((100% - 20px) / 3)}}
.eg-gate .eg-bd{grid-auto-columns:88%}
.eg-gate .eg-notice{margin:10px 0 4px;padding:0}.eg-gate .eg-notice>summary{font-size:.98rem}
.eg-fx{margin:12px 0 0;padding:8px 11px;border:2.5px dashed var(--line);border-radius:12px;font-size:.86rem;font-weight:700}
.eg-banner{margin:18px 0 0;padding:10px 14px;background:var(--mu);color:#26076D;border:3px solid var(--line);border-radius:14px;box-shadow:5px 5px 0 var(--shadow);font-weight:800}
/* Calendrier : 25 portes */
.eg-sheet{position:relative;min-width:0;padding:12px 12px 14px;color:var(--on-surface);background:linear-gradient(135deg,var(--foil-a),var(--foil-b) 52%,var(--foil-a));border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.eg-cap{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;font:600 .68rem/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.eg-cap b{min-width:0;font-weight:600;text-align:right;overflow-wrap:anywhere}
.eg-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px 8px}
.eg-cell{position:relative;aspect-ratio:5/6;min-width:0;margin:0;padding:0;border:0;background:none;color:var(--on-surface);font:800 clamp(.56rem,2.3vw,.78rem)/1.1 var(--display);cursor:pointer;-webkit-tap-highlight-color:transparent}
/* Portes : les deux images viennent de la vidéo d'ouverture (porte fermée au cadenas, porte ouverte sur sa lumière).
   Fermée : le numéro sur le battant. Ouverte : l'illustration du contenu dans l'embrasure, le numéro en pastille, l'état en étiquette. */
.eg-door{position:relative;display:block;width:100%;height:100%;border-radius:46% 46% 10% 10%/38% 38% 8% 8%;background:url(img/porte-fermee.webp) center/contain no-repeat;filter:drop-shadow(2px 3px 0 rgba(38,7,109,.28));transition:transform .2s cubic-bezier(.2,.8,.2,1)}
.eg-door b{position:absolute;left:6%;right:6%;top:21%;text-align:center;font-size:2.1em;line-height:1;font-variant-numeric:tabular-nums;color:#26076D;text-shadow:0 0 2px #FFFBF2,0 0 2px #FFFBF2,0 0 5px #FFFBF2,0 0 5px #FFFBF2}
.eg-door small{position:absolute;left:50%;bottom:-4%;transform:translateX(-50%);display:flex;align-items:center;gap:3px;padding:1px 5px 2px;font:600 .8em/1.15 var(--mono);letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;color:var(--on-surface);background:var(--surface);border:2px solid var(--line);border-radius:999px}
.eg-ic{width:1.15em;height:1.15em;flex:0 0 auto}
.eg-cell.av .eg-ic{width:1.5em;height:1.5em}
.eg-cell.av .eg-door small{display:none}
@media(hover:hover){.eg-cell:hover .eg-door{transform:translateY(-2px)}}
.eg-cell:active .eg-door{transform:scale(.95)}
.eg-door.op{background-image:url(img/porte-ouverte.webp)}
.eg-door.op b{left:-5%;right:auto;top:-4%;min-width:1.75em;padding:.2em .28em;font-size:1em;color:#FFFBF2;background:#26076D;border:2px solid #FFFBF2;border-radius:999px;text-shadow:none}
.eg-sym{position:absolute;left:27%;right:11%;top:16%;bottom:21%;display:grid;place-items:center}
.eg-sym svg{display:block;width:100%;height:100%;overflow:visible}
.eg-cell.ou .eg-door{animation:egPulse 1.9s ease-in-out infinite}
@keyframes egPulse{0%,100%{filter:drop-shadow(2px 3px 0 rgba(38,7,109,.28)) drop-shadow(0 0 0 rgba(255,205,90,0))}50%{filter:drop-shadow(2px 3px 0 rgba(38,7,109,.28)) drop-shadow(0 0 7px rgba(255,205,90,.98))}}
.eg-cell.ou .eg-door small{background:var(--mu)}
.eg-cell.sc .eg-door small{color:var(--pressed-on);background:var(--pressed)}
.eg-cell.ok .eg-door small{font-weight:800;background:var(--tE)}
.eg-cell.ok.max .eg-door small{background:#ECD567}
.eg-cell.ko .eg-door{filter:grayscale(.9) opacity(.72)}
.eg-cell.rl .eg-door small{background:var(--tF)}
.eg-cell.sel .eg-door{outline:3.5px solid #EC7739;outline-offset:2px;transform:translateY(-2px)}
.eg-cell:focus-visible{outline:0}
.eg-cell:focus-visible .eg-door{outline:3.5px solid var(--focus);outline-offset:2px}
.eg-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:12px 0 0;font:600 .64rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase}
.eg-legend span{display:inline-flex;align-items:center;gap:5px}
.eg-legend i{width:12px;height:14px;border-radius:45% 45% 3px 3px/35% 35% 3px 3px;border:2px solid var(--line)}
.eg-legend .k0{background:var(--foil-b)}.eg-legend .k1{background:var(--mu)}.eg-legend .k2{background:var(--pressed)}.eg-legend .k3{background:var(--surface)}
.eg-score{margin:10px 0 0;padding-top:10px;border-top:3px dashed color-mix(in srgb,var(--line) 35%,transparent);font-weight:800;font-size:.95rem}
.eg-tools{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin:0}
/* Porte ouverte : illustration, question, réponse */
.eg-ill{margin:12px 0 0;border:3px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
.eg-ill svg{display:block;width:100%;height:auto;font-family:var(--display)}
.eg-q{margin:12px 0 0;font-size:1.08rem;font-weight:800;line-height:1.3}
.eg-plus{margin:8px 0 0;font-size:.9rem;line-height:1.4}.eg-plus summary{display:inline-block;cursor:pointer;font-weight:800;text-decoration:underline;text-underline-offset:3px;list-style:none}.eg-plus summary::-webkit-details-marker{display:none}.eg-plus summary::before{content:"+ "}.eg-plus[open] summary::before{content:"\\2212  "}.eg-plus p{margin:6px 0 0}
.eg-sub{margin-top:18px;padding-top:14px;border-top:2.5px dashed var(--line)}
.eg-sub h4{margin:2px 0 0;font-weight:800;font-size:1.1rem;line-height:1.15}
.eg-opts{display:grid;gap:9px;margin:12px 0 0}
.eg-opts.img{grid-template-columns:repeat(2,minmax(0,1fr))}
.eg-opt{display:flex;align-items:center;gap:10px;min-width:0;min-height:50px;margin:0;padding:8px 12px;text-align:left;font:700 .98rem/1.25 var(--display);color:var(--on-surface);background:#fff;border:2.5px solid var(--line);border-radius:12px;cursor:pointer}
.eg-opt i{display:grid;place-items:center;flex:0 0 auto;width:28px;height:28px;border-radius:50%;border:2px solid var(--line);background:var(--foil-a);font:800 .85rem/1 var(--display);font-style:normal}
.eg-opt span{min-width:0;overflow-wrap:anywhere}
.eg-opts.img .eg-opt{flex-direction:column;align-items:center;text-align:center;padding:10px 8px}
.eg-opts.img .eg-opt img{display:block;width:100%;max-width:120px;aspect-ratio:1;object-fit:contain}
.eg-opts.img .eg-opt i{position:absolute;left:7px;top:7px}
.eg-opts.img .eg-opt{position:relative}
button.eg-opt[aria-pressed="true"]{background:var(--pressed);color:var(--pressed-on);box-shadow:3px 3px 0 var(--shadow)}
button.eg-opt[aria-pressed="true"] i{background:var(--mu);color:#26076D}
div.eg-opt{cursor:default}
div.eg-opt.mien{background:var(--foil-a);border-style:dashed}
div.eg-opt.bon{background:#DDF3E6;border-color:var(--ok)}
div.eg-opt.bon i{background:var(--ok);border-color:var(--ok);color:#fff}
.eg-opt em{display:block;margin-top:3px;font:600 .64rem/1.2 var(--mono);font-style:normal;letter-spacing:.04em;text-transform:uppercase}
.eg-dose{margin:14px 0 0;padding:12px 12px 8px;background:#fff;border:2.5px solid var(--line);border-radius:14px}
.eg-val{display:block;text-align:center;font:800 2.5rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-val small{display:block;margin-top:2px;font:600 .72rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-slide{display:flex;align-items:center;gap:10px;margin-top:10px}
.eg-step{flex:0 0 auto;width:44px;height:44px;border:2.5px solid var(--line);border-radius:50%;background:var(--mu);color:#26076D;font:800 1.4rem/1 var(--display);cursor:pointer}
.eg-slide input{flex:1 1 auto;min-width:0;height:44px;margin:0;accent-color:#EC7739}
.eg-scale{display:flex;justify-content:space-between;margin:0 54px;font:600 .68rem/1 var(--mono);color:var(--muted)}
.eg-chrono{display:flex;align-items:center;gap:14px;margin:14px 0 0;padding:12px 14px;background:var(--mu);color:#26076D;border:2.5px solid var(--line);border-radius:14px}
.eg-chrono b{flex:0 0 auto;display:grid;place-items:center;width:66px;height:66px;border-radius:50%;background:var(--surface);border:3px solid var(--line);font:800 1.2rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-chrono span{font-size:.92rem;font-weight:700;line-height:1.35}
.eg-time{display:flex;align-items:center;gap:10px;margin:12px 0 0}
.eg-time b{flex:0 0 auto;min-width:3.4em;font:800 1.5rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-time span{flex:1 1 auto;height:14px;border:2.5px solid var(--line);border-radius:999px;background:var(--foil-a);overflow:hidden}
.eg-time i{display:block;height:100%;width:100%;background:var(--ok);transition:width .2s linear}
.eg-time.fin b{color:var(--off)}.eg-time.fin i{background:var(--off)}
.eg-ill.jeu{border:0;border-radius:0;background:none;overflow:visible}
.pj-cv{display:block;margin:0 auto;border:3px solid var(--line);border-radius:14px;box-shadow:4px 4px 0 var(--shadow);touch-action:none;outline-offset:3px}
.eg-tent{display:grid;gap:6px;margin:12px 0 0;padding:0;list-style:none}
.eg-tent li{display:flex;justify-content:space-between;gap:10px;padding:7px 12px;background:#fff;border:2.5px solid var(--line);border-radius:12px;font-weight:800}
.eg-tent li.top{background:var(--tI)}
.eg-tent span{font:600 .72rem/1.6 var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.eg-seal{display:flex;align-items:center;gap:12px;margin:14px 0 0;padding:12px 14px;background:var(--pressed);color:var(--pressed-on);border:2.5px solid var(--line);border-radius:14px}
.eg-seal .eg-ic{width:34px;height:34px}
.eg-seal small{display:block;font:600 .68rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase}
.eg-seal b{display:block;font-size:1.25rem;line-height:1.15;overflow-wrap:anywhere}
.eg-cible{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0 0}
.eg-cible div{padding:10px 12px;border:2.5px solid var(--line);border-radius:12px;background:#fff}
.eg-cible .bon{background:#DDF3E6;border-color:var(--ok)}
.eg-cible small{display:block;font:600 .66rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-cible b{display:block;margin-top:2px;font-size:1.3rem;line-height:1.1;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.eg-pts{display:inline-block;margin:12px 0 0;padding:5px 12px;background:var(--mu);color:#26076D;border:2.5px solid var(--line);border-radius:999px;font-weight:800}
.eg-pts.zero{background:var(--foil-b)}
.eg-ex{margin:12px 0 0;padding:10px 12px;border:2.5px dashed var(--line);border-radius:12px;font-size:.95rem}
.eg-src{margin:8px 0 0;font-size:.8rem;color:var(--muted)}
.eg-src a{color:inherit}
/* Classement */
.eg-rank{margin-top:24px}
.eg-rhead{display:flex;align-items:baseline;justify-content:space-between;gap:6px 12px;flex-wrap:wrap}
.eg-sum{margin:3px 0 0;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-rbody{display:grid;gap:14px 26px;margin-top:14px;align-items:start}
.eg-rcol{display:grid;gap:14px;min-width:0}
/* Bulletin de libération */
.eg-lib{background:#fff;border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-lib h4{margin:0;padding:8px 12px;background:var(--pressed);color:var(--pressed-on);font-weight:800;font-size:1rem;line-height:1.2}
.eg-lib div{display:grid;gap:8px;padding:10px 12px 12px}
.eg-lib p{margin:0;font-size:.95rem}
.eg-gain{display:flex;flex-wrap:wrap;gap:8px}
.eg-gain>span{padding:3px 12px;background:var(--mu);border:2.5px solid var(--line);border-radius:999px;font-weight:800}
.eg-gain>span+span{background:var(--li)}
.eg-lib .linkbtn{justify-self:start}
.eg-lib.neuf{animation:eg-pose .5s cubic-bezier(.2,1.4,.4,1) both}
.eg-lib.neuf .eg-gain>span{animation:eg-tampon .45s .35s cubic-bezier(.2,1.5,.4,1) both}
.eg-lib.neuf .eg-gain>span+span{animation-delay:.6s}
@keyframes eg-pose{from{transform:translateY(-10px) scale(.97)}to{transform:none}}
@keyframes eg-tampon{from{transform:scale(1.5) rotate(-6deg)}to{transform:none}}
/* Ma fiche */
.eg-moi{padding:12px;background:var(--tI);border:2.5px solid var(--line);border-radius:14px;box-shadow:4px 4px 0 var(--shadow)}
.eg-moi-h{display:flex;align-items:center;gap:12px}
.eg-moi-rg{flex:0 0 auto;display:grid;place-items:center;width:58px;height:58px;border-radius:50%;border:2.5px solid var(--line);background:#fff;font:800 1.4rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-moi sup{font-size:.6em}
.eg-moi-h b{display:block;font-weight:800;font-size:1.12rem;line-height:1.15;overflow-wrap:anywhere}
.eg-moi-h small{font:600 .72rem var(--mono);color:var(--muted)}
.eg-moi ul{display:grid;gap:6px;margin:10px 0 0;padding:0;list-style:none}
.eg-moi li{padding:5px 10px;background:#fff;border:2px solid var(--line);border-radius:10px;font-size:.9rem}
.eg-moi li b{font-weight:800}
/* Podium */
.eg-pod{display:flex;justify-content:center;align-items:flex-end;gap:8px;max-width:520px;width:100%;margin:0 auto;padding:0;list-style:none}
.eg-marche{flex:1 1 0;min-width:0;max-width:46%;display:grid;gap:6px;justify-items:center;text-align:center}
.eg-marche.s1{order:2}.eg-marche.s2{order:1}.eg-marche.s3{order:3}
.eg-marche ul{display:grid;gap:4px;justify-items:center;width:100%;margin:0;padding:0;list-style:none}
.eg-marche .eg-row{max-width:100%;padding:1px 8px;border-radius:8px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.eg-marche .eg-row.me{background:var(--pressed);color:var(--pressed-on)}
.eg-socle{display:grid;place-items:center;align-content:center;gap:1px;width:100%;padding:6px 2px;border:2.5px solid var(--line);border-radius:12px 12px 6px 6px}
.eg-socle b{font-weight:800;font-size:1.5rem;line-height:1;font-variant-numeric:tabular-nums}
.eg-socle span{font:600 .7rem var(--mono);white-space:nowrap}
.s1 .eg-socle{min-height:92px;background:var(--mu);box-shadow:4px 4px 0 var(--shadow)}
.s2 .eg-socle{min-height:68px;background:var(--li)}
.s3 .eg-socle{min-height:50px;background:var(--tE)}
.eg-up{margin-left:6px;font:600 .7rem var(--mono);color:var(--ok);white-space:nowrap}
.eg-row.me .eg-up{color:inherit}
/* Suite du classement */
.eg-list{margin:0;padding:0;list-style:none;background:#fff;border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-list:empty{display:none}
.eg-list .eg-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:7px 12px;font-variant-numeric:tabular-nums}
.eg-list li+li{border-top:2px solid var(--foil-b)}
.eg-rk{font:600 .78rem var(--mono);color:var(--muted)}
.eg-nm{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-pt{font:600 .78rem var(--mono);white-space:nowrap}
.eg-list .eg-row.me{background:var(--tI);box-shadow:inset 5px 0 0 var(--line)}
.eg-vous{display:inline-block;white-space:nowrap;margin-left:8px;padding:1px 7px;background:var(--pressed);color:var(--pressed-on);border-radius:999px;font:600 .68rem var(--mono);letter-spacing:.05em;text-transform:uppercase}
.eg-gap{padding:2px 12px;background:var(--foil-a);text-align:center;font:600 .72rem var(--mono);color:var(--muted)}
.eg-more{margin:0;text-align:center}
/* Avatars et symbole de brigade */
.eg-rank .eg-av{flex:0 0 auto;display:block;width:28px;height:28px;margin:0}
.eg-av0{border:2px solid var(--line);border-radius:50%;background:var(--foil-a)}
.eg-rank .eg-emb{flex:0 0 auto;display:block;width:16px;height:16px}
.eg-nm{display:flex;align-items:center;flex-wrap:wrap;gap:3px 7px}
.eg-nm>b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-nm .eg-vous,.eg-nm .eg-up{margin-left:0}
.eg-list .eg-row{align-items:center}
.eg-marche .eg-row{display:grid;justify-items:center;gap:2px}
.eg-marche .eg-row>span{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:2px 5px;max-width:100%}
.eg-marche .eg-av{width:44px;height:44px}
.eg-marche .eg-up{margin-left:0}
/* Remise des prix : la scène filmée du classement final, les lauréats posés sur les marches */
.eg-scene{margin-top:14px}
.eg-scene-c{position:relative;width:100%;max-width:360px;margin:0 auto;aspect-ratio:3/4;background:var(--pressed);border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow);overflow:hidden;container-type:inline-size}
.eg-scene-c video{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover}
.eg-face{position:absolute;display:grid;justify-items:center;align-content:center;gap:2px;padding:0 3px;overflow:hidden;text-align:center;color:var(--on-surface);font-weight:800;font-size:10px;font-size:max(10px,3.7cqw);line-height:1.1;opacity:0;transition:opacity .7s}
.eg-face.f1{left:35%;top:49%;width:28%;height:21.5%}
.eg-face.f2{left:8.5%;top:56.5%;width:24%;height:13%}
.eg-face.f3{left:66%;top:57%;width:24%;height:12.5%}
.eg-scene.fin .eg-face{opacity:1}
.eg-face>span{display:flex;justify-content:center;gap:2px;max-width:100%}
.eg-face b{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:800}
.eg-rank .eg-face .eg-av{width:22px;width:max(20px,9cqw);height:auto;aspect-ratio:1}
.eg-rank .eg-face.f1 .eg-av{width:30px;width:max(26px,12cqw)}
.eg-scene-b{display:flex;flex-wrap:wrap;justify-content:center;gap:0 14px;margin:8px 0 0}
.eg-scene-b .go{margin-right:0}
.eg-scene-r{margin:8px 0 0}
/* Les classements : blocs repliables, rang dans la fleur du logo, médailles des trois premiers */
.eg-cls{display:grid;gap:10px;min-width:0}
.eg-cl{padding:0;background:#fff;border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-cl>summary{display:grid;grid-template-columns:34px minmax(0,1fr) auto 14px;gap:10px;align-items:center;min-height:52px;padding:6px 12px;background:var(--tI);cursor:pointer;list-style:none}
.eg-cl>summary::-webkit-details-marker{display:none}
.eg-cl>summary::before,.eg-cl[open]>summary::before{content:none;display:none}
.eg-cl>summary:focus-visible{outline:3px solid var(--focus,var(--line));outline-offset:-3px}
.eg-cl>summary>b{min-width:0;font-weight:800;font-size:1.05rem;line-height:1.15}
.eg-cl>summary>svg{display:block;width:34px;height:34px}
.eg-cl-t{display:flex;align-items:center;gap:4px}
.eg-rank .eg-cl-t .eg-av,.eg-rank .eg-cl-t .eg-emb{width:26px;height:26px}
.eg-cl>summary>i{width:9px;height:9px;border:solid var(--line);border-width:0 2.5px 2.5px 0;transform:rotate(45deg);justify-self:center}
.eg-cl[open]>summary>i{transform:rotate(-135deg)}
.eg-cl[open]>summary{border-bottom:2.5px solid var(--line)}
.eg-cl-c{display:grid;gap:10px;padding:10px 10px 12px;min-width:0}
.eg-cl-c>p{margin:0}
.eg-cl-n{font:600 .7rem var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.eg-seg{display:inline-grid;grid-auto-flow:column;justify-self:start;border:2.5px solid var(--line);border-radius:999px;overflow:hidden}
.eg-seg button{min-height:40px;padding:4px 14px;background:none;border:0;color:inherit;font:800 .86rem var(--display);cursor:pointer}
.eg-seg button[aria-pressed="true"]{background:var(--pressed);color:var(--pressed-on)}
.eg-seg button:focus-visible{outline:3px solid var(--focus,var(--line));outline-offset:-4px}
.eg-fl,.eg-med{flex:0 0 auto;display:block}
.eg-fl text,.eg-med text{font-family:var(--display);font-weight:800}
.eg-lns{display:grid;margin:0;padding:0;list-style:none}
.eg-ln{display:grid;grid-template-columns:42px auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:5px 4px;font-variant-numeric:tabular-nums}
.eg-ln+.eg-ln,.eg-ln+.eg-gap,.eg-gap+.eg-ln{border-top:2px solid var(--foil-b)}
.eg-ln.me{background:var(--tI);box-shadow:inset 5px 0 0 var(--line)}
.eg-ln .eg-fl,.eg-ln .eg-med{width:42px;height:42px}
.eg-rank .eg-ln .eg-emb{width:28px;height:28px}
.eg-ln>div{min-width:0}
.eg-ln>div>b{display:block;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
.eg-bar{display:flex;height:8px;margin-top:4px;border-radius:999px;background:var(--foil-a);overflow:hidden}
.eg-bar u{display:block;height:100%}
.eg-bar .q{background:var(--li)}.eg-bar .j{background:var(--or)}.eg-bar .e{background:var(--pressed)}.eg-bar .t{background:var(--mu)}
.eg-leg{display:flex;flex-wrap:wrap;gap:4px 12px;font:600 .68rem var(--mono);color:var(--muted)}
.eg-leg span::before{content:"";display:inline-block;width:10px;height:10px;margin-right:5px;border-radius:3px;vertical-align:-1px;background:var(--c)}
.eg-list .eg-row{grid-template-columns:42px minmax(0,1fr) auto}
.eg-list .eg-rk .eg-fl{width:42px;height:42px}
@media(max-width:380px){.eg-list .eg-row{gap:6px;padding:7px 6px}.eg-ln{gap:6px}.eg-list .eg-pt,.eg-ln .eg-pt{font-size:.72rem}.eg-cl-c{padding:10px 6px 12px}.eg-nm{gap:3px 5px}}
.eg-nm .eg-bar{flex:1 0 100%;margin-top:0}
.eg-marche .eg-med{width:64px;height:auto}
.eg-marche.s1 .eg-med{width:84px}
.eg-pts3{font:600 .72rem var(--mono);color:var(--muted);white-space:nowrap}
.eg-brig summary .eg-fl,.eg-brig summary .eg-med{width:34px;height:34px}
/* Un pseudo tient sur une ligne : au-delà, points de suspension (le texte complet reste dans la page et en infobulle) */
.eg-ps{display:block;min-width:0;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.eg-nm>.eg-ps{flex:0 1 auto;max-width:calc(100% - 36px)}
.eg-marche .eg-row,.eg-marche .eg-row>span{min-width:0;max-width:100%}
.eg-marche ul{min-width:0}
.eg-brig-m li{min-width:0}
.eg-cls,.eg-cl-c,.eg-brigs ol{grid-template-columns:minmax(0,1fr)}
.eg-brig-c{grid-template-columns:minmax(0,1fr)}
.eg-brig-c>div{min-width:0}
.eg-brig-c p{overflow-wrap:anywhere}
/* Classement des brigades */
.eg-brigs{margin:0}
.eg-brigs h4{margin:0;font-weight:800;font-size:1.05rem;line-height:1.2}
.eg-brigs>p{margin:3px 0 0;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-brigs ol{display:grid;gap:8px;margin:10px 0 0;padding:0;list-style:none}
.eg-brig{padding:0;background:var(--surface);border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-brig.me{box-shadow:4px 4px 0 var(--shadow)}
.eg-brig summary{display:grid;grid-template-columns:34px auto minmax(0,1fr) 14px;gap:8px;align-items:center;min-height:46px;padding:6px 12px;background:var(--bf);cursor:pointer;list-style:none;font-variant-numeric:tabular-nums}
.eg-brig summary::-webkit-details-marker{display:none}
.eg-brig>summary::before,.eg-brig[open]>summary::before{content:none;display:none}
.eg-brig-t{display:grid;gap:1px;min-width:0}
.eg-brig-t b{font-size:1rem;line-height:1.2}
.eg-brig-t .eg-pt{white-space:normal}
.eg-brig summary:focus-visible{outline:3px solid var(--focus,var(--line));outline-offset:-3px}
.eg-brig summary .eg-emb{width:22px;height:22px}
.eg-brig summary b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-brig summary i{width:9px;height:9px;border:solid var(--line);border-width:0 2.5px 2.5px 0;transform:rotate(45deg);justify-self:center}
.eg-brig[open] summary i{transform:rotate(-135deg)}
.eg-brig[open] summary{border-bottom:2.5px solid var(--line)}
.eg-brig-c{display:grid;gap:8px;padding:10px 12px 12px}
.eg-brig-c p{margin:0;font-size:.92rem}
.eg-brig-c small{display:block;font:600 .68rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-brig-j{display:flex;align-items:center;gap:10px}
.eg-brig-j img{flex:0 0 auto;width:44px;height:44px;object-fit:contain}
.eg-brig-j b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-brig-m{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.eg-brig-m li{display:flex;align-items:center;gap:5px;max-width:100%;padding:2px 9px 2px 3px;background:var(--chip);border:2px solid var(--line);border-radius:999px;font-size:.84rem;font-weight:800;overflow-wrap:break-word}
.eg-brig-m li.me{background:var(--pressed);color:var(--pressed-on)}
.eg-brig-m .eg-av{width:24px;height:24px}
@media(min-width:861px){.eg-rules{grid-template-columns:1fr 1fr;gap:11px 30px}.eg-rbody.duo{grid-template-columns:minmax(0,5fr) minmax(0,6fr)}}
@media(max-width:860px){.eg-body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.eg-sheet{padding:10px 8px 12px}.eg-grid{gap:8px 6px}.eg-notice{padding:6px 12px}.eg-notice[open]{padding-bottom:14px}.eg-panel{padding:14px 14px 16px}}
.eg-ouv{position:fixed;inset:0;z-index:60;display:grid;place-items:center;margin:0;padding:0;border:0;background:rgba(24,10,58,.94);opacity:0;pointer-events:none;cursor:pointer;transition:opacity .25s ease;-webkit-tap-highlight-color:transparent}
.eg-ouv.on{opacity:1;pointer-events:auto}
.eg-ouv.off{opacity:0;pointer-events:none;transition-duration:.45s}
.eg-ouv video{display:block;width:min(100vw,100vh);aspect-ratio:1;background:#EC7739}
.eg-passer{position:fixed;right:14px;top:14px;padding:7px 14px;font:800 .9rem/1 var(--display);color:#26076D;background:#FFFBF2;border:2.5px solid #26076D;border-radius:999px;box-shadow:3px 3px 0 #26076D}
.eg-son{position:fixed;left:14px;top:14px;z-index:61;padding:7px 14px;font:800 .9rem/1 var(--display);color:#FFFBF2;background:#26076D;border:2.5px solid #FFFBF2;border-radius:999px;opacity:0;pointer-events:none;cursor:pointer;transition:opacity .25s ease}
.eg-son.on{opacity:1;pointer-events:auto}
.eg-son:focus-visible{outline:3.5px solid var(--focus);outline-offset:3px}
.eg-ouv:focus-visible video{outline:3.5px solid var(--focus);outline-offset:3px}
@media(prefers-reduced-motion:reduce){.eg-face{transition:none}.eg-brig summary i{transition:none}.eg-lib.neuf,.eg-lib.neuf .eg-gain>span{animation:none}.eg-cell.ou .eg-door,.eg-cell.ou .eg-door.op{animation:none}.eg-door,.eg-door.op b{transition:none}}`;

  // Icônes des blocs de classement et bascule Joueurs / Brigades (gabarit).
  const TR = 'stroke="#26076D" stroke-width="3"';
  const ICO = {
    gen: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M10 2h6l4 11h-6Z" fill="#EC7739" ' + TR + ' stroke-linejoin="round"/><path d="M24 2h-6l-4 11h6Z" fill="#E5B4D9" ' + TR + ' stroke-linejoin="round"/><circle cx="17" cy="21" r="10" fill="#ECD567" ' + TR + "/></svg>",
    cal: '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="4" y="6" width="26" height="24" rx="5" fill="#fff" ' + TR + '/><path d="M4 13h26M11 3v6M23 3v6" ' + TR + ' stroke-linecap="round"/><path d="M11 21l4 4 8-8" fill="none" ' + TR + ' stroke-linecap="round" stroke-linejoin="round"/></svg>',
    quiz: '<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="#E5B4D9" ' + TR + '/><path d="M13 13.5a4 4 0 1 1 6 3.4c-1.4.9-2 1.6-2 3.1" fill="none" ' + TR + ' stroke-linecap="round"/><circle cx="17" cy="24.5" r="1.8" fill="#26076D"/></svg>',
    jeu: '<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="#EC7739" ' + TR + '/><circle cx="17" cy="17" r="7" fill="#fff" ' + TR + '/><circle cx="17" cy="17" r="2" fill="#26076D"/></svg>',
    enq: '<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="14" cy="14" r="9" fill="#F2E39A" ' + TR + '/><path d="M21 21l9 9" stroke="#26076D" stroke-width="4.5" stroke-linecap="round"/></svg>',
  };
  const SEG = (k, nom) => '<div class="eg-seg" id="egSeg-' + k + '" role="group" aria-label="' + nom + ' : joueurs ou brigades" hidden><button type="button" data-seg="' + k + '" data-v="j" aria-pressed="true">Joueurs</button><button type="button" data-seg="' + k + '" data-v="b" aria-pressed="false">Brigades</button></div>';

  function init() {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    sec = document.createElement("section");
    sec.className = "wrap adv eg";
    sec.id = "pharmacogames";
    sec.hidden = true;
    sec.setAttribute("aria-labelledby", "pharmacogames-t");
    sec.innerHTML = '<p class="adv-back"><a class="go" href="#">Retour au catalogue</a></p>'
      + '<div class="adv-head"><h2 id="pharmacogames-t">Pharmacogames <span>de Noël</span></h2>'
      + '<p class="adv-intro">25 portes, une par jour du 1<sup>er</sup> au 25 décembre : cinq questions au chrono ou un jeu d\'adresse. Vos points comptent aussi pour votre brigade.</p></div>'
      + NOTICE
      + '<form class="eg-panel eg-gate" id="egGate" novalidate><h3>Entrer dans le calendrier</h3>'
      + '<details class="eg-notice" id="egProfil"><summary>Première connexion : votre fiche en quatre cases</summary><p class="eg-bd-aide" id="egBdProfil">Faites glisser.</p><div class="eg-bd" role="region" aria-labelledby="egBdProfil" tabindex="0"><img src="img/notice-profil-1.svg" alt="Case 1, Le code. Un champ de saisie masqué et un cadenas, le flacon dit : « Tapez le code d\'équipe, puis choisissez votre nom dans la liste : on entre en zone. »" width="400" height="300" loading="lazy"><img src="img/notice-profil-2.svg" alt="Case 2, Le pseudo. Le flacon montre une étiquette « Dr Meeple » : « Choisissez un pseudo : c\'est lui qui paraîtra au classement. Étiquette obligatoire ! »" width="400" height="300" loading="lazy"><img src="img/notice-profil-3.svg" alt="Case 3, L\'avatar. Trois meeples coiffés d\'une couronne, d\'un bonnet et d\'un chapeau : « Couleur, coiffe, accessoire : composez le meeple qui vous ressemble. Dosage libre. »" width="400" height="300" loading="lazy"><img src="img/notice-profil-4.svg" alt="Case 4, La brigade. Cinq jetons numérotés, le troisième tiré au sort, le flacon dit : « Le sort vous range dans une des cinq brigades. Nom, emblème et devise : au vote jusqu\'au 10 décembre. »" width="400" height="300" loading="lazy"></div></details>'
      + '<label for="egCode">Code d\'équipe</label><input id="egCode" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="64" required>'
      + '<div id="egListe" hidden><label for="egNom">Votre nom</label><select id="egNom"></select></div>'
      + '<div id="egLibre"><label for="egPrenom">Pseudo ou prénom</label><input id="egPrenom" type="text" autocomplete="given-name" maxlength="24" required></div>'
      + '<p class="eg-hint">Choisissez votre nom dans la liste : votre fiche vous suit sur tous vos appareils.</p>'
      + '<div id="egConf" hidden><p class="eg-warn" id="egConfQui" role="alert"></p><label for="egConfPrenom">Les 3 premières lettres de votre prénom</label><input id="egConfPrenom" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40"><button class="linkbtn" type="button" id="egConfNon">Ce n\'est pas moi</button></div>'
      + '<p class="eg-msg err" id="egGateMsg" role="status"></p><button class="go main" type="submit" id="egOuvrir">Ouvrir mon calendrier</button></form>'
      + '<p class="eg-banner" id="egBanner" hidden>Mode relecture : les 25 portes s\'affichent avec leur solution. Rien n\'est enregistré.</p>'
      + '<div class="eg-body" id="egBody" hidden>'
      + '<div class="eg-sheet"><div class="eg-cap"><span>Calendrier des 25 portes</span><b id="egWho"></b></div>'
      + '<p class="pp-brig" id="egBrig" hidden></p>'
      + '<div class="eg-grid" id="egGrid" role="group" aria-label="Calendrier des 25 portes"></div>'
      + '<p class="eg-legend" aria-hidden="true"><span><i class="k0"></i>Sous scellé</span><span><i class="k1"></i>Ouverte</span><span><i class="k2"></i>Réponse scellée</span><span><i class="k3"></i>Résultat libéré</span></p>'
      + '<p class="eg-score" id="egScore" role="status"></p>'
      + '<p class="eg-tools"><button class="go" type="button" id="egReload">Actualiser</button><button class="linkbtn" type="button" id="egBrigade" hidden>Ma brigade</button><button class="linkbtn" type="button" id="egAvatar" hidden>Retoucher ma fiche</button><button class="linkbtn" type="button" id="egChange">Changer de prénom</button></p></div>'
      + '<aside class="eg-panel" id="egPanel" aria-live="polite"></aside>'
      + "</div>"
      + '<section id="egEnquete" aria-label="L\'enquête des brigades" hidden></section>'
      + '<div class="eg-panel eg-rank" id="egRank" hidden><div class="eg-rhead"><h3>Classement des Pharmacogames</h3><p class="eg-sum" id="egSum"></p></div>'
      + '<p class="eg-d" id="egRankMsg"></p>'
      + '<section class="eg-scene" id="egScene" aria-label="Remise des prix" hidden><div class="eg-scene-c" id="egSceneC" aria-hidden="true"><div class="eg-face f1"></div><div class="eg-face f2"></div><div class="eg-face f3"></div></div>'
      + '<p class="eg-scene-b"><button class="go" type="button" id="egScenePasser">Passer</button><button class="linkbtn" type="button" id="egSceneRejouer" hidden>Revoir</button><button class="linkbtn" type="button" id="egSceneReplier" hidden>Replier la scène</button></p></section>'
      + '<p class="eg-scene-r" id="egSceneR" hidden><button class="linkbtn" type="button" id="egSceneRevoir">Revoir la remise des prix</button></p>'
      + '<div class="eg-rbody" id="egRBody">'
      + '<div class="eg-rcol" id="egCol"><section class="eg-lib" id="egLib" aria-live="polite" hidden></section><section class="eg-moi" id="egMoi" aria-label="Ma fiche" hidden></section></div>'
      + '<div class="eg-rcol eg-cls" id="egCls">'
      + '<details class="eg-cl" data-k="gen" open><summary>' + ICO.gen + '<b>Général</b><span class="eg-cl-t" id="egT-gen"></span><i aria-hidden="true"></i></summary><div class="eg-cl-c">'
      + SEG("gen", "Général")
      + '<div class="eg-cl-c" id="egGenJ" style="padding:0"><ol class="eg-pod" id="egPod" aria-label="Podium" hidden></ol><ol class="eg-list" id="egList" aria-label="Suite du classement"></ol>'
      + '<p class="eg-more" id="egMore" hidden><button class="linkbtn" type="button" id="egTout"></button></p></div>'
      + '<section class="eg-brigs" id="egBrigs" aria-labelledby="egBrigsT" hidden><h4 class="sr" id="egBrigsT">Classement des brigades</h4><p id="egBrigsS"></p><ol id="egBrigsL"></ol></section>'
      + '<p class="eg-leg" id="egLeg-gen" hidden></p></div></details>'
      + '<details class="eg-cl" data-k="cal" hidden><summary>' + ICO.cal + '<b>Calendrier</b><span class="eg-cl-t" id="egT-cal"></span><i aria-hidden="true"></i></summary><div class="eg-cl-c"><p class="eg-cl-n">Les 25 portes, moyenne par membre actif</p><ol class="eg-lns" id="egL-cal"></ol></div></details>'
      + '<details class="eg-cl" data-k="quiz" hidden><summary>' + ICO.quiz + '<b>Questions</b><span class="eg-cl-t" id="egT-quiz"></span><i aria-hidden="true"></i></summary><div class="eg-cl-c">' + SEG("quiz", "Questions") + '<ol class="eg-lns" id="egL-quiz"></ol><p class="eg-more" hidden><button class="linkbtn" type="button" data-tout="quiz"></button></p></div></details>'
      + '<details class="eg-cl" data-k="jeu" hidden><summary>' + ICO.jeu + '<b>Jeux d\'adresse</b><span class="eg-cl-t" id="egT-jeu"></span><i aria-hidden="true"></i></summary><div class="eg-cl-c">' + SEG("jeu", "Jeux d'adresse") + '<ol class="eg-lns" id="egL-jeu"></ol><p class="eg-more" hidden><button class="linkbtn" type="button" data-tout="jeu"></button></p></div></details>'
      + '<details class="eg-cl" data-k="enq" hidden><summary>' + ICO.enq + '<b>Enquête</b><span class="eg-cl-t" id="egT-enq"></span><i aria-hidden="true"></i></summary><div class="eg-cl-c"><p class="eg-cl-n">Par brigade, 30 points au plus</p><ol class="eg-lns" id="egL-enq"></ol></div></details>'
      + "</div></div></div>";
    (q("#vote") || q("#avent") || q("header.hero")).insertAdjacentElement("afterend", sec);

    const a = document.createElement("a");
    a.className = "go avgo";
    a.href = "#pharmacogames";
    a.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M2 21V9a7 7 0 0 1 14 0v12z" fill="currentColor"/><circle cx="12.4" cy="14" r="1.6" fill="#ECD567"/></svg>Jouer aux Pharmacogames de Noël';
    const boutons = document.querySelectorAll(".avgo");
    const ancre = boutons.length ? boutons[boutons.length - 1] : q(".lead");
    if (ancre) ancre.insertAdjacentElement("afterend", a);

    q("#egGate").addEventListener("submit", entrer);
    q("#egCode").addEventListener("change", () => chercherListe(q("#egCode").value.trim()));
    q("#egNom").addEventListener("change", () => { finConfirmation(); dire("#egGateMsg", ""); });
    q("#egCode").addEventListener("input", finConfirmation);
    q("#egConfNon").addEventListener("click", () => { finConfirmation(); q("#egNom").value = ""; q("#egNom").focus(); dire("#egGateMsg", "Choisissez votre nom dans la liste.", "ok"); });
    q("#egGrid").addEventListener("click", e => {
      const c = e.target.closest(".eg-cell");
      if (!c) return;
      choisir(Number(c.dataset.n));
      q("#egPanel").scrollIntoView({ block: "nearest" });
      if (c.classList.contains("ou") && !relecture) ouverture(Number(c.dataset.n));
    });
    q("#egPanel").addEventListener("click", e => {
      const o = e.target.closest("button.eg-opt"), s = e.target.closest(".eg-step");
      if (o) noter(Number(o.dataset.v));
      else if (s) { const r = q("#egRange"); r.value = Math.max(0, Math.min(100, Number(r.value) + Number(s.dataset.d))); noter(Number(r.value)); }
      else if (e.target.closest("#egSend")) envoyer();
      else if (e.target.closest("#egStart")) avertir("#egStart", lancer);
      else if (e.target.closest("#egPlay")) avertir("#egPlay", () => jouer(true));
      else if (e.target.closest("#egNon")) panneau();
      else if (e.target.closest("#egTry")) jouer(false);
      else if (e.target.closest("[data-try]")) jouer(false, Number(e.target.closest("[data-try]").dataset.try));
    });
    q("#egPanel").addEventListener("click", e => { const b = e.target.closest("#egAvant"); if (b) { choix = Number(b.dataset.n); brouillon = null; aConfirmer = false; grille(); panneau(); } });
    q("#egPanel").addEventListener("input", e => { if (e.target.id === "egRange") noter(Number(e.target.value)); });
    q("#egChange").addEventListener("click", sortir);
    q("#egAvatar").addEventListener("click", () => { if (!enJeu && brouillon === null && !q("#egTime")) identifier(); });
    q("#egBrigade").addEventListener("click", () => { if (!enJeu && brouillon === null && !q("#egTime")) carnet(); });
    q("#egTout").addEventListener("click", () => { toutVoir = !toutVoir; rang(); });
    q("#egScenePasser").addEventListener("click", () => sceneFin(true));
    q("#egSceneRejouer").addEventListener("click", sceneJouer);
    q("#egSceneRevoir").addEventListener("click", sceneJouer);
    q("#egSceneReplier").addEventListener("click", () => sceneEtat("replie"));
    q("#egCls").addEventListener("toggle", e => { const k = e.target.dataset && e.target.dataset.k; if (k && e.target.classList.contains("eg-cl")) clsOuvert[k] = e.target.open; }, true);
    q("#egCls").addEventListener("click", e => {
      const b = e.target.closest("button");
      if (b && b.dataset.seg) { clsVue[b.dataset.seg] = b.dataset.v; rang(); }
      else if (b && b.dataset.tout) { clsTout[b.dataset.tout] = !clsTout[b.dataset.tout]; rang(); }
    });
    q("#egBrigsL").addEventListener("toggle", e => { const b = e.target.dataset && e.target.dataset.b; if (b !== undefined) brigOuvertes[e.target.open ? "add" : "delete"](b); }, true);
    q("#egLib").addEventListener("click", e => { if (e.target.id === "egVu") { vuLib(); rang(); } });
    q("#egReload").addEventListener("click", () => charger("Calendrier à jour."));

    // Prénom et code déjà donnés pour le vote sur cet appareil : on les propose, sans les imposer.
    let v = {};
    try { v = JSON.parse(localStorage.getItem(KEY_VOTE) || "{}") || {}; } catch (e) {}
    q("#egPrenom").value = String(mem.prenom || v.prenom || "").slice(0, 24);
    q("#egCode").value = String(mem.code || v.code || "").slice(0, 64);

    window.addEventListener("hashchange", view);
    // Retour sur l'onglet resté ouvert : le calendrier se remet à jour, sauf si une réponse est en cours de saisie.
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !sec.hidden && E && brouillon === null && !enJeu && !enFiche) charger(); });
    view();
  }

  function view() {
    if (location.hash === "#enigme") history.replaceState(null, "", "#pharmacogames"); // ancienne adresse de la page
    const on = location.hash === "#pharmacogames" || location.hash === "#pharmacomeeple";
    sec.hidden = !on;
    if (!on) { if (enTirage) devoiler(); if (enFiche) { enFiche = false; if (E) panneau(); } return; } // en quittant la page, la fiche ouverte se referme
    versFiche = location.hash === "#pharmacomeeple";
    document.querySelectorAll("#avent,.ind,.bar,main").forEach(e => { e.hidden = true; });
    sec.scrollIntoView({ block: "start" });
    if (relecture || ((mem.prenom || mem.nom) && mem.code)) charger();
    else if (q("#egCode").value.trim()) chercherListe(q("#egCode").value.trim());
  }
  // Liste des participants : elle n'arrive du serveur qu'avec le bon code d'équipe. Quand elle existe, l'entrée se fait par
  // un menu déroulant, sans saisie libre (liste fermée : le serveur refuse une fiche hors liste) ; sans liste, la saisie libre reste seule.
  // liste : null tant qu'on ne sait pas, [] s'il n'y en a pas ; listeCode : le code avec lequel on l'a demandée.
  let liste = null, listeCode = "";
  async function chercherListe(code) {
    if (!code || code === listeCode) return;
    let r;
    try { r = await call({ code, action: "liste" }); } catch (e) { r = { status: 0, j: {} }; }
    if (r.status !== 200) { liste = null; return; }
    listeCode = code;
    liste = Array.isArray(r.j.liste) ? r.j.liste : [];
    const sel = q("#egNom"), avec = liste.length > 0;
    sel.innerHTML = '<option value="">Choisir dans la liste</option>' + liste.map(n => '<option value="' + h(n) + '">' + h(n) + "</option>").join("");
    if (mem.nom && liste.includes(mem.nom)) sel.value = mem.nom;
    q("#egListe").hidden = !avec;
    q("#egLibre").hidden = avec;
  }
  // Entrée par un nom de la liste : la fiche existe déjà (on la retrouve, avec son pseudo), ou elle reste à créer.
  async function entrerParNom(code, nom) {
    let r;
    try { r = await call({ code, action: "entrer", nom }); } catch (x) { r = { status: 0, j: {} }; }
    if (r.status === 400) { listeCode = ""; return dire("#egGateMsg", "Ce nom n'est plus dans la liste. Choisissez-le de nouveau.", "err"); }
    if (r.status !== 200) return dire("#egGateMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err");
    // Une fiche existe déjà sous ce nom : on la montre et on demande le prénom avant d'entrer, pour ne pas ouvrir la fiche d'un collègue par erreur.
    if (!r.j.nouveau && r.j.prenom) return confirmer(code, nom, r.j);
    ouvrir(code, nom, r.j);
  }
  function ouvrir(code, nom, j) {
    relecture = "";
    mem.code = code; mem.nom = nom;
    if (j.prenom) mem.prenom = j.prenom; else delete mem.prenom;
    save();
    dire("#egGateMsg", "");
    if (j.nouveau) versFiche = true; // première visite : la fiche s'ouvre d'elle-même
    recevoir(j);
  }
  // Confirmation d'identité (simple garde-fou contre l'erreur, pas un contrôle d'accès) : les lettres saisies (trois au moins,
  // ou le mot entier s'il est plus court) doivent ouvrir l'un des mots du nom choisi dans la liste, accents et casse ignorés.
  // attente : { code, nom, j } tant qu'elle est affichée.
  let attente = null;
  const plat = t => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  const memePrenom = (saisi, nom) => { const t = plat(saisi), n = plat(nom); return t.length >= 2 && (t === n || n.split(/[ .]+/).some(m => m.length >= 2 && t.length >= Math.min(3, m.length) && (m.startsWith(t) || n.slice(n.indexOf(m)).startsWith(t)))); };
  function finConfirmation() {
    if (!attente) return;
    attente = null;
    q("#egConf").hidden = true; q("#egConfPrenom").value = ""; q("#egOuvrir").textContent = "Ouvrir mon calendrier";
  }
  function confirmer(code, nom, j) {
    attente = { code, nom, j };
    const texte = "<span>Une fiche existe déjà sous ce nom : <b>" + h(j.prenom) + "</b> (" + h(nom) + "). C'est bien vous ?</span>";
    q("#egConfQui").innerHTML = texte;
    q("#egConf").hidden = false; q("#egOuvrir").textContent = "Oui, c'est moi : entrer";
    dire("#egGateMsg", "");
    q("#egConfPrenom").value = ""; q("#egConfPrenom").focus({ preventScroll: true });
    q("#egOuvrir").scrollIntoView({ block: "nearest" }); // la question, le champ et le bouton tiennent à l'écran
    // L'avatar de la fiche, quand le module est chargé : un repère de plus pour se reconnaître.
    if (j.profil && j.profil.a) chargerParticipants().then(() => { if (attente && attente.j === j) { q("#egConfQui").innerHTML = window.PharmacoParticipants.avatar(j.profil.a, { cls: "pp-mini" }) + texte; q("#egOuvrir").scrollIntoView({ block: "nearest" }); } }).catch(() => {});
  }
  // Pastille « Pharmacomeeple » : une fois le joueur entré, sa fiche d'identification s'ouvre (création ou retouche).
  // Avant l'ouverture de l'identification (le 26 novembre), rien ne s'ouvre : la mention « sous scellé » en tête du calendrier suffit.
  function allerFiche() {
    if (!versFiche || !E || relecture) return;
    versFiche = false;
    if (E.fiche && E.fiche.etat !== "avenir" && !enJeu && !enFiche && brouillon === null && !q("#egTime")) identifier();
  }

  const dire = (id, t, cls) => { const el = q(id); if (el) { el.textContent = t || ""; el.className = "eg-msg " + (cls || "ok"); } };

  async function entrer(e) {
    e.preventDefault();
    const p = q("#egPrenom").value.trim().replace(/’/g, "'"), code = q("#egCode").value.trim();
    if (!code) return dire("#egGateMsg", "Le code d'équipe est demandé : il circule dans l'unité.", "err");
    if (attente) {
      const a = attente;
      if (a.code === code && q("#egNom").value === a.nom) {
        if (!memePrenom(q("#egConfPrenom").value, a.nom)) { q("#egConfPrenom").focus(); return dire("#egGateMsg", "Ces lettres ne correspondent pas à « " + a.nom + " ». Vérifiez le nom choisi dans la liste.", "err"); }
        finConfirmation();
        return ouvrir(a.code, a.nom, a.j);
      }
      finConfirmation(); // le code ou le nom a changé : on repart de la liste
    }
    dire("#egGateMsg", "Ouverture…", "ok");
    await chercherListe(code);
    if (liste && liste.length && listeCode === code) {
      const nom = q("#egNom").value;
      if (!nom) { q("#egNom").focus(); return dire("#egGateMsg", "Choisissez votre nom dans la liste. Il n'y est pas ? Prévenez l'équipe de pharmacotechnie.", "err"); }
      return entrerParNom(code, nom);
    }
    let r;
    // Un prénom mal formé n'empêche pas la relecture : le serveur tranche d'après le code.
    try { r = await call(p.length >= 2 && p.length <= 24 && PRENOM.test(p) ? { code, prenom: p } : { code }); } catch (x) { r = { status: 0, j: {} }; }
    if (r.status === 401) return dire("#egGateMsg", "Code d'équipe inconnu. Vérifiez la casse et les tirets.", "err");
    if (r.status !== 200) return dire("#egGateMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err");
    if (r.j.relecture) relecture = code;
    else {
      if (!(p.length >= 2 && p.length <= 24 && PRENOM.test(p))) return dire("#egGateMsg", "Un pseudo ou un prénom en un seul mot, de 2 à 24 lettres, sans espace ni chiffre.", "err");
      relecture = "";
      mem.prenom = p; mem.code = code; delete mem.nom;
      save();
    }
    dire("#egGateMsg", "");
    recevoir(r.j);
  }

  function sortir() {
    if (enJeu) { enJeu(); enJeu = null; }
    clearInterval(tic); echeance = {};
    relecture = "";
    E = null; enFiche = false; enTirage = false; majEnquete();
    q("#egBody").hidden = true; q("#egRank").hidden = true; q("#egBanner").hidden = true;
    q("#egGate").hidden = false;
    (q("#egLibre").hidden ? q("#egNom") : q("#egPrenom")).focus();
  }

  async function charger(msg) {
    if (occupe || enJeu || enTirage) return; // pendant le tirage, rien ne rafraîchit la page : la brigade ne se dévoile qu'à la révélation
    occupe = true;
    let r;
    // Entré par la liste sans fiche encore : on redemande par le nom, au cas où la fiche aurait été créée sur un autre appareil.
    try { r = await call(relecture ? { code: relecture } : mem.prenom ? { code: mem.code, prenom: mem.prenom } : mem.nom ? { code: mem.code, action: "entrer", nom: mem.nom } : { code: mem.code }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    if (r.status === 200 && !relecture && !mem.prenom && r.j.prenom) { mem.prenom = r.j.prenom; save(); }
    if (r.status === 401 || r.status === 400) { if (!relecture) { delete mem.code; save(); } sortir(); return dire("#egGateMsg", "Code d'équipe à ressaisir.", "err"); }
    if (r.status !== 200) return E ? dire("#egMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err") : dire("#egGateMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err");
    recevoir(r.j, msg);
  }

  // Une porte ouverte reste « à faire » tant que la question n'a pas reçu de réponse ou qu'il reste une tentative de jeu.
  const tentatives = p => (p.scores || []).length;
  const aFaire = p => p.etat === "ouverte" && (p.type === "jeu" ? tentatives(p) < p.essais : p.type === "quiz" || p.type === "duo" ? !p.fini : p.rep === undefined && !p.hors);
  // Porte montrée d'office : la plus ancienne encore à faire, sinon la dernière ouverte, sinon la dernière close.
  function parDefaut() {
    if (relecture) return 1;
    const P = E.portes, ouvertes = P.filter(p => p.etat === "ouverte"), closes = P.filter(p => p.etat === "close");
    const f = ouvertes.find(aFaire);
    return f ? f.n : ouvertes.length ? ouvertes[ouvertes.length - 1].n : closes.length ? closes[closes.length - 1].n : 0;
  }

  function recevoir(j, msg, cls) {
    const premier = !E;
    E = j;
    // Avatar et brigade du joueur, gardés sur l'appareil pour le sapin (PharmacoAcces.identite) ; effacés pour un joueur sans fiche.
    if (!relecture && mem.prenom) {
      const P = j.profil && Array.isArray(j.profil.a) ? j.profil : null, avant = JSON.stringify([mem.av, mem.br]);
      if (P) { mem.av = P.a; mem.br = P.b; } else { delete mem.av; delete mem.br; }
      if (JSON.stringify([mem.av, mem.br]) !== avant) save();
    }
    // Chronos en cours : le serveur donne le temps restant, on le convertit en échéance locale.
    const vus = {};
    E.portes.forEach(p => { if (p.reste !== undefined) vus[p.n] = echeance[p.n] || Date.now() + p.reste * 1000; });
    echeance = vus;
    q("#egGate").hidden = true;
    q("#egBody").hidden = false;
    q("#egRank").hidden = false;
    q("#egBanner").hidden = !relecture;
    if (premier) { q("#egNotice").open = false; choix = parDefaut(); brouillon = null; aConfirmer = false; }
    q("#egWho").textContent = relecture ? "Relecture" : mem.prenom || String(mem.nom || "").split(/[ .]/)[0]; // sans fiche : le prénom seul (premier mot du nom de la liste)
    majBrigades();
    identite();
    grille();
    panneau(msg, cls);
    rang();
    allerFiche();
  }
  // Le sapin d'abord : il retient dans le navigateur les gouttes ouvertes ; on les déclare au serveur, qui libère la porte du
  // même jour. Chaque goutte n'est déclarée qu'une fois par visite, et jamais pendant un jeu ou un chrono.
  const sapinDit = new Set();
  async function declarerSapin() {
    if (relecture || !E || !E.profil || !mem.prenom || enJeu || q("#egTime")) return;
    let L = [];
    try { L = JSON.parse(localStorage.getItem("pharmacotechnie-avent-2026") || "[]") || []; } catch (e) {}
    const vus = E.sapin || [], N = L.filter(n => Number.isInteger(n) && n >= 1 && n <= 25 && !vus.includes(n) && !sapinDit.has(n));
    if (!N.length) return;
    N.forEach(n => sapinDit.add(n));
    let r;
    try { r = await call({ code: mem.code, prenom: mem.prenom, action: "sapin", jours: N }); } catch (e) { return; }
    if (r.status === 200 && r.j.portes && !enJeu && !enFiche && brouillon === null && !q("#egTime")) recevoir(r.j);
  }

  // Participants : l'avatar et la brigade du joueur. Le dessin vient de participants.js, chargé à la demande ;
  // le choix de l'avatar est validé par le serveur, qui tire seul la brigade.
  const chargerParticipants = () => new Promise((ok, ko) => {
    if (window.PharmacoParticipants) return ok();
    const sc = document.createElement("script");
    sc.src = "participants.js"; sc.onload = () => { majBrigades(); return window.PharmacoParticipants ? ok() : ko(); }; sc.onerror = ko;
    document.head.appendChild(sc);
  });
  const fiche = () => !relecture && E && E.profil && E.profil.a;
  // Nom et emblème votés par les brigades : participants.js les reporte dans ses brigades, pour tout ce qui les affiche.
  const majBrigades = () => { if (window.PharmacoParticipants && E) window.PharmacoParticipants.maj(E.brigades); };
  // En tête du calendrier : l'avatar devant le nom, la brigade dessous. Le texte de #egWho reste le nom seul.
  function identite() {
    const P = !relecture && E && E.profil, bouton = q("#egAvatar");
    // Sans avatar, le même bouton sert à créer sa fiche, sans attendre la première porte.
    bouton.hidden = Boolean(relecture) || !E;
    bouton.textContent = P && P.a ? "Retoucher ma fiche" : "Créer ma fiche";
    q("#egBrigade").hidden = !(P && P.a && P.b !== undefined);
    // Avant l'ouverture du calendrier : la rubrique est annoncée, sous scellé comme les portes, sans rien d'actif.
    const scelle = !relecture && E && E.fiche && E.fiche.etat === "avenir";
    q("#egBrig").className = scelle ? "eg-hint" : "pp-brig";
    q("#egBrig").style.margin = scelle ? "6px 0 10px" : "";
    if (scelle) { q("#egBrig").innerHTML = CADENAS + " Fiche d'identification, avatar et brigades : sous scellé jusqu'au " + jour(dt(E.fiche.ouvre)) + (E.fiche.heure ? " à " + E.fiche.heure + " h" : "") + "."; q("#egBrig").hidden = false; bouton.hidden = true; q("#egBrigade").hidden = true; return; }
    if (!P) { q("#egBrig").hidden = true; return; }
    chargerParticipants().then(() => {
      if (!E || E.profil !== P) return;
      const W = window.PharmacoParticipants, B = W.BRIGADES[P.b];
      if (P.a) q("#egWho").innerHTML = W.avatar(P.a, { brigade: P.b, cls: "pp-mini" }) + h(mem.prenom);
      q("#egBrig").hidden = !B;
      const ligne = (E.brigades || []).find(x => x.b === P.b), devise = W.devise(ligne);
      if (B) q("#egBrig").innerHTML = W.embleme(P.b) + "<span>" + h(B.nom) + (devise ? " · « " + h(devise) + " »" : "") + "</span>";
    }).catch(() => {});
  }
  // Carnet de brigade : membres, nom, emblème, devise et jeu emblème, et les voix du joueur tant que le vote est ouvert (serveur : du 26 novembre au 10 décembre).
  async function carnet() {
    if (relecture || occupe || enJeu || !fiche()) return;
    try { await chargerParticipants(); } catch (e) { return dire("#egMsg", "Le carnet de brigade ne s'est pas chargé. Vérifiez la connexion et réessayez.", "err"); }
    const b = E.profil.b, ligne = () => (E.brigades || []).find(x => x.b === b) || {};
    enFiche = true;
    clearInterval(tic);
    window.PharmacoParticipants.brigade(q("#egPanel"), {
      pseudo: mem.prenom, brigade: b, ligne: ligne(), lignes: () => E.brigades || [], moi: E.profil, choix: E.choix,
      membres: (E.classement || []).filter(x => x.b === b).sort((x, y) => x.p.localeCompare(y.p, "fr")),
      jeux: typeof G !== "undefined" ? G : [], familles: typeof CATS !== "undefined" ? CATS : {},
      voter: async v => {
        let r;
        try { r = await call({ code: mem.code, prenom: mem.prenom, action: "brigade", titre: v.titre, embleme: v.embleme, devise: v.devise, jeu: v.jeu }); } catch (e) { r = { status: 0, j: {} }; }
        if (r.status === 403 && r.j.error === "fige") return { ok: false, message: "Trop tard : les paramètres de la brigade sont scellés." };
        if (r.status === 403 && r.j.error === "scellee") return { ok: false, message: "Le vote de la brigade est encore sous scellé." };
        if (r.status === 400 && r.j.error === "devise") return { ok: false, message: "Cette devise n'a pas été acceptée : de 5 à 120 caractères, des lettres, des chiffres et une ponctuation simple." };
        if (r.status !== 200 || !r.j.profil) return { ok: false };
        E = r.j;
        majBrigades(); identite(); rang();
        return { ok: true, ligne: ligne(), moi: E.profil };
      },
      onFin: () => { enFiche = false; panneau(); },
    });
    q("#egPanel").scrollIntoView({ block: "nearest" });
  }
  // La fiche d'identification prend la place de la porte dans le panneau : à la première porte lancée, ou pour une retouche.
  async function identifier() {
    if (relecture || occupe || enJeu) return;
    try { await chargerParticipants(); } catch (e) { return dire("#egMsg", "La fiche d'identification ne s'est pas chargée. Vérifiez la connexion et réessayez.", "err"); }
    const P = E.profil || {};
    enFiche = true;
    clearInterval(tic);
    window.PharmacoParticipants.fiche(q("#egPanel"), {
      pseudo: mem.prenom || E.suggestion || "", avatar: P.a, brigade: P.b,
      // Entré par la liste, sans fiche encore : la fiche demande aussi le pseudo.
      choisirPseudo: !mem.prenom && Boolean(mem.nom), nom: mem.nom,
      versCarnet: E.choix && E.choix.etat === "ouvert" ? () => { devoiler(); enFiche = false; carnet(); } : undefined,
      renommer: async neuf => {
        let r;
        try { r = await call({ code: mem.code, prenom: mem.prenom, action: "renommer", pseudo: neuf }); } catch (e) { r = { status: 0, j: {} }; }
        if (r.status === 409) return { ok: false, message: "Ce pseudo est déjà porté par un autre joueur. Ajoutez une initiale collée, par exemple " + neuf + "B." };
        if (r.status === 400) return { ok: false, message: "Un pseudo ou un prénom en un seul mot, de 2 à 24 lettres, sans espace ni chiffre." };
        if (r.status !== 200 || !r.j.profil) return { ok: false };
        if (mem.vu && mem.vu.p === norm(mem.prenom)) mem.vu.p = norm(neuf);
        mem.prenom = neuf; save();
        E = r.j;
        q("#egWho").textContent = neuf; q("#egPrenom").value = neuf;
        identite(); grille(); rang();
        return { ok: true };
      },
      enregistrer: async (a, pseudo) => {
        let r;
        try { r = await call({ code: mem.code, prenom: pseudo || mem.prenom, action: "profil", avatar: a, nom: pseudo ? mem.nom : undefined }); } catch (e) { r = { status: 0, j: {} }; }
        if (r.status === 409 && r.j.error === "pris") return { ok: false, message: "Ce pseudo est déjà porté par un autre joueur. Ajoutez une initiale collée, par exemple " + pseudo + "B." };
        if (r.status === 409) return { ok: false, message: "Ce nom de la liste a déjà sa fiche. Revenez à l'entrée et choisissez-le de nouveau pour la retrouver." };
        if (r.status === 400 && r.j.error === "prenom") return { ok: false, message: "Un pseudo en un seul mot, de 2 à 24 lettres, sans espace ni chiffre." };
        if (r.status === 200 && r.j.profil && pseudo) { mem.prenom = pseudo; save(); q("#egWho").textContent = pseudo; q("#egPrenom").value = pseudo; }
        if (r.status === 403 && r.j.error === "scellee") return { ok: false, message: "La fiche d'identification est encore sous scellé." };
        if (r.status === 403 && r.j.error === "complet") return { ok: false, message: "Le calendrier affiche complet : plus de place pour un nouveau joueur." };
        if (r.status !== 200 || !r.j.profil) return { ok: false };
        E = r.j;
        // Brigade tout juste tirée : la page ne la montre nulle part (en-tête, classement) avant la révélation de la fiche,
        // qui vient après la vidéo du tirage. Une retouche, elle, se voit tout de suite.
        if (P.b === undefined) enTirage = true; else devoiler();
        const b = E.profil.b, ligne = (E.brigades || []).find(x => x.b === b);
        return { ok: true, brigade: b, effectif: ligne ? ligne.n : 0 };
      },
      reveler: devoiler,
      onFin: msg => { devoiler(); enFiche = false; panneau(msg); },
    });
    q("#egPanel").scrollIntoView({ block: "nearest" });
  }
  // enTirage : la brigade vient d'être tirée et n'est pas encore révélée. devoiler() met la page à jour une fois la révélation faite.
  let enTirage = false;
  function devoiler() {
    enTirage = false;
    if (!E) return;
    majBrigades(); identite(); grille(); rang();
  }

  function grille() {
    q("#egGrid").innerHTML = E.portes.map(p => {
      let k, lab, dit;
      if (relecture) { k = "rl"; lab = p.type === "qcm" ? "QCM" : p.type === "jeu" ? "Jeu" : p.type === "duo" ? "2 jeux" : p.type === "quiz" ? "5 Q" : "Dose"; dit = "relecture"; }
      else if (p.etat === "avenir") { k = "av"; lab = CADENAS; dit = "sous scellé jusqu'au " + jour(dt(p.ouvre)); }
      else if (p.etat === "ouverte") {
        if (p.type === "jeu") {
          const nb = tentatives(p);
          if (!nb && p.duo && p.duo.i > 1) { k = "ou"; lab = (p.duo.i - 1) + "/" + p.duo.nb; dit = pl(p.duo.i - 1, "jeu joué", "jeux joués") + " sur " + p.duo.nb; }
          else if (!nb) { k = "ou"; lab = "Ouverte"; dit = p.duo ? "finale ouverte, deux jeux d'adresse" : "jeu d'adresse ouvert"; }
          else if (nb < p.essais) { k = "ou"; lab = p.meilleur + "/10"; dit = "note " + p.meilleur + " sur 10, une tentative restante"; }
          else { k = "sc"; lab = SCEAU + p.meilleur + "/10"; dit = "note scellée, " + p.meilleur + " sur 10"; }
        } else if (p.type === "duo") { k = "sc"; lab = SCEAU + "Scellée"; dit = "finale jouée, notes scellées"; }
        else if (p.type === "quiz") { k = "sc"; lab = SCEAU + "Scellée"; dit = "cinq questions jouées, réponses scellées"; }
        else if (p.quiz && p.reste === undefined) { k = "ou"; lab = p.quiz.i > 1 ? (p.quiz.i - 1) + "/" + p.quiz.nb : "Ouverte"; dit = p.quiz.i > 1 ? pl(p.quiz.i - 1, "question jouée", "questions jouées") + " sur " + p.quiz.nb : "ouverte, cinq questions à faire"; }
        else if (p.rep !== undefined) { k = "sc"; lab = SCEAU + "Scellée"; dit = "réponse scellée"; }
        else if (p.hors) { k = "ko"; lab = "Hors délai"; dit = "chrono écoulé sans réponse"; }
        else if (p.reste !== undefined) { k = "ou"; lab = "Chrono"; dit = "chrono en cours"; }
        else { k = "ou"; lab = "Ouverte"; dit = "ouverte, à faire"; }
      } else { const f = p.pts !== undefined; k = f ? "ok" + (p.pts === (p.type === "duo" ? 10 * p.nb : 10) ? " max" : "") : "ko"; lab = f ? "+" + p.pts : "Manquée"; dit = f ? pl(p.pts, "point", "points") : "manquée"; }
      return '<button class="eg-cell ' + k + (p.n === choix ? " sel" : "") + '" type="button" data-n="' + p.n + '" aria-pressed="' + (p.n === choix) + '" aria-label="' + h("Porte " + p.n + " : " + dit) + '">'
        + '<span class="eg-door' + (k === "av" ? "" : " op") + '">' + (k === "av" ? "" : symbole(p)) + "<b>" + p.n + "</b><small>" + lab + "</small></span></button>";
    }).join("");
    const clos = E.portes.filter(p => p.etat === "close").length;
    const att = E.portes.filter(p => p.etat === "ouverte" && (p.rep !== undefined || tentatives(p) > 0 || p.type === "quiz" || p.type === "duo" || (p.quiz && p.quiz.i > 1) || (p.duo && p.duo.i > 1))).length;
    q("#egScore").textContent = relecture ? "25 portes à relire, solutions comprises."
      : "Total : " + pl(E.total, "point", "points") + " · " + pl(clos, "porte close", "portes closes") + (att ? " · " + pl(att, "résultat scellé en attente", "résultats scellés en attente") : "");
  }

  function choisir(n) {
    if (enJeu) { if (!relecture) return; enJeu(); enJeu = null; } // partie en cours : on ne change pas de porte, sauf en relecture
    enFiche = false;
    choix = n; brouillon = null; aConfirmer = false;
    grille();
    panneau();
    const c = q('#egGrid [data-n="' + n + '"]');
    if (c) c.focus({ preventScroll: true });
  }

  const LETTRES = ["A", "B", "C", "D"];
  const flacon = (o, i, tag, cls, note) => "<" + tag + ' class="eg-opt' + (cls ? " " + cls : "") + '"' + (tag === "button" ? ' type="button" data-v="' + i + '" aria-pressed="false"' : "") + "><i>" + LETTRES[i] + "</i>"
    + (o.img ? '<img src="img/' + h(o.img) + '" alt="" loading="lazy">' : "") + "<span>" + fr(o.t) + (note ? "<em>" + note + "</em>" : "") + "</span></" + tag + ">";
  const forme = p => (p.type === "quiz" ? "cinq questions" : p.type === "duo" ? "finale, deux jeux d'adresse" : (p.quiz ? "question " + p.quiz.i + " sur " + p.quiz.nb + " · " : "") + (p.type === "qcm" ? "quatre flacons" : p.type === "jeu" ? "jeu d'adresse" : "dosage de 0 à 100"));

  function saisie(p) {
    const fin = '<p class="eg-hint">À zéro, la proposition affichée part telle quelle.</p>'
      + '<button class="go main" type="button" id="egSend" disabled>Sceller ma réponse</button>';
    const chrono = '<div class="eg-time" id="egTime" role="timer" aria-live="off"><b>' + Math.ceil(p.reste) + ' s</b><span><i></i></span></div>';
    if (p.type === "qcm") return chrono + '<div class="eg-opts' + (p.options.some(o => o.img) ? " img" : "") + '" role="group" aria-label="Quatre propositions">' + p.options.map((o, i) => flacon(o, i, "button")).join("") + "</div>" + fin;
    return chrono + '<div class="eg-dose"><output class="eg-val" id="egVal" for="egRange">?<small>Réglez la dose</small></output>'
      + '<div class="eg-slide"><button class="eg-step" type="button" data-d="-1" aria-label="Un de moins">−</button>'
      + '<input id="egRange" type="range" min="0" max="100" step="1" value="50" aria-label="Votre réponse, de 0 à 100">'
      + '<button class="eg-step" type="button" data-d="1" aria-label="Un de plus">+</button></div>'
      + '<p class="eg-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></p></div>' + fin;
  }

  const origine = p => (p.source && p.source.t ? '<p class="eg-src">Source : ' + (p.source.url ? '<a href="' + h(p.source.url) + '" target="_blank" rel="noopener">' + h(p.source.t) + "</a>" : h(p.source.t)) + "</p>" : "");
  function solution(p) {
    const fait = p.rep !== undefined;
    let s;
    if (p.type === "qcm") {
      s = '<div class="eg-opts' + (p.options.some(o => o.img) ? " img" : "") + '">' + p.options.map((o, i) => flacon(o, i, "div", i === p.bonne ? "bon" : fait && i === p.rep ? "mien" : "", i === p.bonne ? (fait && p.rep === i ? "Bon flacon, le vôtre" : "Bon flacon") : fait && i === p.rep ? "Votre choix" : "")).join("") + "</div>";
    } else {
      s = '<div class="eg-cible"><div class="bon"><small>Valeur cible</small><b>' + h(val(p, p.bonne)) + "</b></div>"
        + (fait ? "<div><small>Votre dose · écart " + Math.abs(p.rep - p.bonne) + "</small><b>" + h(val(p, p.rep)) + "</b></div>" : "") + "</div>";
    }
    if (!relecture && !(p.deCase && p.pts === undefined)) s += '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (fait ? "+" + pl(p.pts, "point", "points") : p.pts !== undefined ? (p.deCase ? "Sans réponse : 0 point" : "Chrono écoulé sans réponse : 0 point") : "Porte manquée : 0 point") + "</p>";
    return s + '<p class="eg-ex">' + fr(p.explication) + "</p>" + origine(p);
  }

  // Notes des tentatives d'un jeu d'adresse.
  // Règle d'un jeu : l'essentiel en façade, le détail du score à déplier.
  const lignes = p => (p.detail ? '<details class="eg-plus"><summary>Les petites lignes de la notice</summary><p>' + fr(p.detail) + "</p></details>" : "");
  const essaisFaits = p => (tentatives(p) ? '<ul class="eg-tent">' + p.scores.map((n, i) => '<li' + (n !== null && n === p.meilleur ? ' class="top"' : "") + "><span>Tentative " + (i + 1) + "</span>" + (n === null ? "interrompue : 0 / 10" : n + " / 10") + "</li>").join("") + "</ul>" : "");

  function panneau(msg, cls) {
    if (enFiche) return; // la fiche d'identification reste en place tant qu'elle n'est pas refermée
    const p = E.portes[choix - 1];
    let html;
    if (!p) {
      const d1 = dt(E.portes[0].ouvre), n = 1 - E.jour;
      html = '<p class="ap-m">Calendrier sous scellé</p><h3>Première porte le ' + jour(d1) + "</h3>"
        + '<p class="eg-d">Encore ' + pl(n, "jour", "jours") + " de quarantaine. Revenez le jour dit : une porte s'ouvrira chaque matin jusqu'au 25.</p>";
    } else if (p.etat === "avenir" && !relecture) {
      html = '<p class="ap-m">Porte ' + p.n + ' · sous scellé</p><h3>Patience</h3><p class="eg-d">Cette porte s\'ouvrira le ' + jour(dt(p.ouvre)) + ". D'ici là, elle reste en quarantaine.</p>";
    } else if (p.etat === "ouverte" && !relecture && p.verrou && fiche()) { // sans fiche, le bouton habituel mène d'abord à l'identification
      // Porte verrouillée : le sapin d'abord (la goutte du même jour), et les portes dans l'ordre.
      html = '<p class="ap-m">Porte ' + p.n + " · " + jour(dt(p.ouvre)) + " · " + forme(p) + "</p><h3>" + fr(p.titre) + "</h3>"
        + (p.verrou === "ordre"
          ? '<p class="eg-d"><b>Chaque dose en son temps !</b> Les portes se prennent dans l\'ordre : celle du ' + jour(dt(E.portes[p.avant - 1].ouvre)) + " passe d'abord.</p>"
            + '<button class="go main" type="button" id="egAvant" style="margin-top:14px" data-n="' + p.avant + '">Aller à la porte ' + p.avant + "</button>"
          : '<p class="eg-d"><b>Pas si vite !</b> Ouvrez d\'abord la goutte du ' + jour(dt(p.ouvre)) + " dans le sapin.</p>"
            + '<a class="go main" id="egSapin" href="#sapin" style="display:inline-block;margin-top:14px;text-decoration:none">Filer au sapin</a>');
    } else {
      const ouverte = p.etat === "ouverte" && !relecture;
      html = '<p class="ap-m">Porte ' + p.n + " · " + jour(dt(p.ouvre)) + " · " + forme(p) + "</p><h3>" + fr(p.titre) + "</h3>"
        + (p.quiz && p.quiz.titre ? '<p class="ap-m">Question ' + p.quiz.i + " sur " + p.quiz.nb + " · " + fr(p.quiz.titre) + "</p>" : "")
        + (p.duo ? '<p class="ap-m">Jeu ' + p.duo.i + " sur " + p.duo.nb + " · " + fr(p.duo.titre) + "</p>" : "");
      const enonce = () => '<div class="eg-ill" id="egJeu">' + p.ill + '</div><p class="eg-q">' + fr(p.question) + "</p>" + lignes(p);
      if (p.type === "jeu") {
        const nb = tentatives(p);
        html += enonce();
        if (relecture) html += '<p class="eg-hint">Chrono de ' + p.duree + " s, " + pl(p.essais, "tentative", "tentatives") + ', la meilleure compte.</p><button class="go main" type="button" id="egTry">Essayer le jeu, sans rien enregistrer</button>'
          + '<p class="eg-ex">' + fr(p.explication) + "</p>" + origine(p);
        else if (ouverte) {
          if (p.duo) html += p.duo.avant.map(a => '<div class="eg-seal">' + SCEAU + "<span><small>" + fr(a.titre) + " : note scellée</small><b>" + (a.meilleur || 0) + " / 10</b></span></div>").join("");
          html += essaisFaits(p);
          if (nb < p.essais) html += '<p class="eg-hint">' + p.duree + " s par tentative, " + pl(p.essais, "tentative", "tentatives") + ", la meilleure compte. Clôture " + jour(dt(p.ferme)) + " à minuit.</p>"
            + '<button class="go main" type="button" id="egPlay">Lancer la tentative ' + (nb + 1) + " sur " + p.essais + "</button>" + boutonLibre(p);
          else html += '<div class="eg-seal">' + SCEAU + "<span><small>Note scellée</small><b>" + p.meilleur + " / 10</b></span></div>"
            + '<p class="eg-d">Vos points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>" + REJOUER;
        } else html += REJOUER + essaisFaits(p) + '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (p.pts !== undefined ? (p.rang ? "Rang " + p.rang + " sur " + p.sur + " : " : "") + "+" + pl(p.pts, "point", "points") : "Porte manquée : 0 point") + '</p><p class="eg-ex">' + fr(p.explication) + "</p>" + origine(p);
      } else if (p.type === "duo") {
        // Finale à deux jeux : tout joué (notes scellées), ou close ou en relecture (chaque jeu, sa règle et son résultat).
        if (p.fini) html += '<div class="eg-ill">' + p.ill + "</div>" + p.jeux.map(c => '<div class="eg-seal">' + SCEAU + "<span><small>" + fr(c.titre) + " : note scellée</small><b>" + (c.meilleur || 0) + " / 10</b></span></div>").join("")
          + '<p class="eg-d">Vos points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else html += (relecture ? "" : '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (p.pts !== undefined ? "Total de la finale : +" + pl(p.pts, "point", "points") + " sur " + 10 * p.nb : "Porte manquée : 0 point") + "</p>")
          + p.jeux.map((c, i) => '<section class="eg-sub"><p class="ap-m">Jeu ' + (i + 1) + " sur " + p.nb + " · jeu d'adresse</p><h4>" + fr(c.titre) + '</h4><div class="eg-ill" id="egJeu' + i + '">' + c.ill + '</div><p class="eg-q">' + fr(c.question) + "</p>" + lignes(c)
            + (relecture ? '<p class="eg-hint">Chrono de ' + c.duree + " s, " + pl(c.essais, "tentative", "tentatives") + ', la meilleure compte.</p><button class="go main" type="button" data-try="' + i + '">Essayer le jeu, sans rien enregistrer</button>'
              : '<button class="go" type="button" data-try="' + i + '" style="margin-top:8px">Rejouer hors classement</button>' + essaisFaits(c) + (p.pts !== undefined ? '<p class="eg-pts' + (c.pts ? "" : " zero") + '">' + (c.rang ? "Rang " + c.rang + " sur " + c.sur + " : " : "") + "+" + pl(c.pts || 0, "point", "points") + "</p>" : ""))
            + '<p class="eg-ex">' + fr(c.explication) + "</p>" + origine(c) + "</section>").join("");
      } else if (p.type === "quiz") {
        // Case de cinq questions : toutes jouées (réponses scellées), ou close (les cinq solutions).
        if (!p.qs) html += '<div class="eg-ill">' + p.ill + '</div><div class="eg-seal">' + SCEAU + "<span><small>Case jouée</small><b>" + pl(p.scellees, "réponse scellée", "réponses scellées") + " sur " + p.nb + "</b></span></div>"
          + '<p class="eg-d">Bonnes réponses et points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else html += (relecture ? "" : '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (p.pts !== undefined ? "Total de la case : +" + pl(p.pts, "point", "points") + " sur 10" : "Porte manquée : 0 point") + "</p>")
          + p.qs.map((c, i) => '<section class="eg-sub"><p class="ap-m">Question ' + (i + 1) + " sur " + p.nb + " · " + forme(c) + (relecture ? " · " + c.duree + " s" : "") + "</p><h4>" + fr(c.titre || "") + '</h4><div class="eg-ill">' + c.ill + '</div><p class="eg-q">' + fr(c.question) + "</p>" + solution(Object.assign({ deCase: true }, c, p.pts === undefined ? { pts: undefined } : {})) + "</section>").join("");
      } else if (ouverte && p.rep === undefined && !p.hors && p.reste === undefined) {
        // Énoncé encore sous scellé : il n'arrive qu'avec le chrono.
        html += '<div class="eg-chrono"><b>' + p.duree + ' s</b><span>' + (p.quiz ? p.quiz.nb + " questions, " + p.duree + " s chacune, une seule tentative." : p.duree + " s, une seule tentative.") + " Le chrono ne s'arrête plus une fois lancé. Clôture le " + jour(dt(p.ferme)) + " à minuit.</span></div>"
          + '<button class="go main" type="button" id="egStart">' + (p.quiz ? "Lancer la question " + p.quiz.i + " sur " + p.quiz.nb : "Lancer le chrono") + "</button>";
      } else {
        html += enonce();
        if (ouverte && p.rep === undefined && !p.hors) html += saisie(p);
        else if (ouverte && p.hors) html += '<div class="eg-seal">' + SCEAU + "<span><small>Chrono écoulé</small><b>Aucune réponse scellée</b></span></div>"
          + '<p class="eg-d">Le temps a filé : 0 point pour cette porte. La bonne réponse sortira à la clôture, le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else if (ouverte) html += '<div class="eg-seal">' + SCEAU + "<span><small>Réponse scellée</small><b>" + h(val(p, p.rep)) + "</b></span></div>"
          + '<p class="eg-d">Bonne réponse et points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else html += solution(p);
      }
    }
    q("#egPanel").innerHTML = html + '<p class="eg-msg ' + (cls || "ok") + '" id="egMsg" role="status">' + h(msg || "") + "</p>";
    battre();
  }

  // Chrono d'une question : l'affichage suit l'échéance ; à zéro, la proposition en cours part d'office.
  function battre() {
    clearInterval(tic);
    const p = E && E.portes[choix - 1];
    if (!p || echeance[p.n] === undefined || !q("#egTime")) return;
    const pas = () => {
      const el = q("#egTime"), reste = (echeance[p.n] - Date.now()) / 1000;
      if (!el) return clearInterval(tic);
      el.querySelector("b").textContent = Math.max(0, Math.ceil(reste)) + " s";
      el.querySelector("i").style.width = Math.max(0, Math.min(100, reste / p.duree * 100)) + "%";
      el.classList.toggle("fin", reste <= 10);
      if (reste <= 0) {
        clearInterval(tic);
        if (brouillon !== null) { aConfirmer = true; envoyer(); } else charger("Chrono écoulé : aucune réponse n'a été scellée.");
      }
    };
    tic = setInterval(pas, 200);
    pas();
  }

  // Lancement du chrono d'une question : le serveur note l'heure et livre l'énoncé.
  // Avant tout lancement : rappel des essais restants, puis validation. Le premier appui avertit, le second lance.
  function avertir(sel, fn) {
    const b = q(sel), p = E.portes[choix - 1];
    if (!b || !p) return;
    if (b.dataset.ok || !fiche()) return fn(); // pas encore identifié : la fiche passe d'abord, rien n'est lancé
    const reste = p.type === "jeu" ? p.essais - tentatives(p) : 1;
    const msg = p.type === "jeu"
      ? (reste > 1 ? "Il vous reste " + pl(reste, "tentative", "tentatives") + " sur " + p.essais + " pour ce jeu." : "C'est votre dernière tentative pour ce jeu.") + " Dès le lancement, elle est décomptée, même interrompue."
      : "Chrono de " + p.duree + " s, impossible à arrêter.";
    b.dataset.ok = "1"; b.textContent = "Je confirme, je lance";
    b.insertAdjacentHTML("beforebegin", '<p class="eg-warn" role="alert">' + (mem.prenom ? "Vous jouez en tant que <b>" + h(mem.prenom) + "</b>. " : "") + msg + "</p>");
    b.insertAdjacentHTML("afterend", '<button class="go" type="button" id="egNon">Pas maintenant</button>');
  }
  async function lancer() {
    const p = E.portes[choix - 1];
    if (!p || occupe) return;
    if (!fiche()) return identifier(); // première porte : on s'identifie d'abord, le chrono ne part pas
    occupe = true;
    q("#egStart").disabled = true;
    let r;
    try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, action: "ouvrir" }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    if (r.j && r.j.portes) return recevoir(r.j, r.status === 200 ? "" : "Cette porte n'accepte plus de réponse.", r.status === 200 ? "ok" : "err");
    q("#egStart").disabled = false;
    dire("#egMsg", "Le chrono n'est pas parti : le serveur ne répond pas. Réessayez dans un instant.", "err");
  }

  // Réponse en cours de saisie : rien ne part tant que le bouton n'a pas été confirmé.
  function noter(v) {
    const p = E.portes[choix - 1];
    if (!p) return;
    brouillon = v; aConfirmer = false;
    if (p.type === "qcm") document.querySelectorAll("#egPanel button.eg-opt").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === v)));
    else q("#egVal").innerHTML = h(p.prefixe ? val(p, v) : v) + "<small>" + h(p.prefixe ? "Année proposée" : p.unite || "Votre dose") + "</small>";
    const b = q("#egSend");
    b.disabled = false;
    b.textContent = "Sceller ma réponse";
    dire("#egMsg", "");
  }

  async function envoyer() {
    const p = E.portes[choix - 1], b = q("#egSend");
    if (!p || brouillon === null || occupe) return;
    if (!aConfirmer) { aConfirmer = true; b.textContent = "Confirmer : " + (p.type === "qcm" ? "flacon " + LETTRES[brouillon] : val(p, brouillon)) + ", définitif"; return; }
    occupe = true; if (b) b.disabled = true;
    clearInterval(tic);
    let r;
    try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, reponse: brouillon, i: p.quiz ? p.quiz.i : undefined }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    brouillon = null; aConfirmer = false;
    if (r.status === 200) return recevoir(r.j, p.quiz && p.quiz.i < p.quiz.nb ? "Réponse scellée. Question suivante quand vous voulez." : "Réponse scellée. La traçabilité vous remercie.");
    if (r.status === 409) return recevoir(r.j, "Une réponse était déjà scellée pour cette porte : elle fait foi.", "err");
    if (r.status === 403 && r.j.error === "delai") return recevoir(r.j, "Trop tard : le chrono était écoulé à l'arrivée de la réponse.", "err");
    if (r.status === 403 && (r.j.error === "close" || r.j.error === "scellee")) return charger("Trop tard : cette porte vient de se refermer.");
    if (r.status === 401) return charger();
    if (r.j && r.j.portes) return recevoir(r.j, "La réponse n'a pas été acceptée.", "err");
    if (b) { b.disabled = false; b.textContent = "Sceller ma réponse"; }
    dire("#egMsg", "La réponse n'est pas partie. Réessayez tout de suite : le chrono tourne.", "err");
    battre();
  }

  // Jeux d'adresse : le code du jeu n'est chargé qu'au moment de jouer.
  const chargerJeux = () => new Promise((ok, ko) => {
    if (window.PharmacoJeux) return ok();
    const sc = document.createElement("script");
    sc.src = "jeux.js"; sc.onload = () => (window.PharmacoJeux ? ok() : ko()); sc.onerror = ko;
    document.head.appendChild(sc);
  });
  const patience = ms => new Promise(r => setTimeout(r, ms));
  // Essais libres avant les tentatives classées : deux par jeu, facultatifs, comptés sur l'appareil seulement (rien ne part
  // au serveur, rien n'est enregistré). Une fois la porte close ou les tentatives jouées, le jeu se rejoue hors classement.
  const KEY_ESSAIS = KEY + "-essais", NB_LIBRES = 2;
  const cleEssai = p => p.n + (p.duo ? "-" + p.duo.i : "");
  const libres = p => { try { return Number((JSON.parse(localStorage.getItem(KEY_ESSAIS) || "{}") || {})[cleEssai(p)]) || 0; } catch (e) { return 0; } };
  const compterLibre = p => { try { const o = JSON.parse(localStorage.getItem(KEY_ESSAIS) || "{}") || {}; o[cleEssai(p)] = (Number(o[cleEssai(p)]) || 0) + 1; localStorage.setItem(KEY_ESSAIS, JSON.stringify(o)); } catch (e) {} };
  const boutonLibre = p => (libres(p) < NB_LIBRES ? '<button class="go" type="button" id="egTry" style="margin-top:8px">Essai libre ' + (libres(p) + 1) + " sur " + NB_LIBRES + ", non compté</button>" : "");
  const REJOUER = '<button class="go" type="button" id="egTry" style="margin-top:8px">Rejouer hors classement</button>';
  // reel : la tentative compte et sa note part au serveur ; sinon c'est un essai libre de la relecture.
  // i : en relecture d'une finale à deux jeux, celui des deux qu'on essaie.
  async function jouer(reel, i) {
    const P = E.portes[choix - 1], p = P && P.type === "duo" ? P.jeux[i] : P;
    if (!p || (P.type !== "jeu" && P.type !== "duo") || !p.jeu || enJeu || occupe) return;
    if (reel && !fiche()) return identifier(); // première porte : on s'identifie d'abord, aucune tentative n'est décomptée
    occupe = true;
    try { await chargerJeux(); } catch (e) { occupe = false; return dire("#egMsg", "Le jeu ne s'est pas chargé. Vérifiez la connexion et réessayez : aucune tentative n'a été décomptée.", "err"); }
    let jeton = "";
    if (reel) {
      let r;
      try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, action: "ouvrir" }); } catch (e) { r = { status: 0, j: {} }; }
      if (r.status !== 200) {
        occupe = false;
        if (r.j && r.j.portes) return recevoir(r.j, "Plus de tentative disponible pour cette porte.", "err");
        return dire("#egMsg", "La tentative n'est pas partie : le serveur ne répond pas. Rien n'a été décompté.", "err");
      }
      jeton = r.j.jeton; E = r.j; grille();
    }
    occupe = false;
    const zone = q(P.type === "duo" ? "#egJeu" + i : "#egJeu");
    (P.type === "duo" ? [q('[data-try="' + i + '"]')] : [q("#egPlay"), q("#egTry")]).forEach(b => { if (b) b.hidden = true; });
    const entrainement = !reel && !relecture && P.etat === "ouverte" && tentatives(P) < P.essais;
    if (entrainement) compterLibre(P);
    zone.classList.add("jeu");
    dire("#egMsg", "");
    enJeu = window.PharmacoJeux[p.jeu](zone, { duree: p.duree, onFin: async (note, bilan, brut) => {
      enJeu = null;
      if (!reel) return panneau((entrainement ? "Essai libre" : relecture ? "Essai libre" : "Partie hors classement") + " : " + note + " sur 10. " + bilan + " Rien n'a été enregistré.");
      let r = { status: 0, j: {} };
      for (let i = 0; i < 4 && !(r.j && r.j.portes); i++) {
        if (i) await patience(1500);
        try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, jeton, score: note, brut: Number.isInteger(brut) ? brut : undefined }); } catch (e) { r = { status: 0, j: {} }; }
      }
      if (r.status === 200) return recevoir(r.j, bilan + " Note enregistrée : " + note + " sur 10.");
      if (r.j && r.j.portes) return recevoir(r.j, "La note de cette tentative n'a pas été acceptée par le serveur.", "err");
      panneau("La note n'a pas pu partir : connexion perdue. La tentative compte pour 0.", "err");
    } });
    zone.scrollIntoView({ block: "nearest" });
  }

  // Classement : bulletin de libération, fiche du joueur, podium, puis la suite en lignes fines.
  // Tout vient de ce que le serveur envoie déjà : rien ne sort avant la clôture d'une porte.
  const ord = n => n + "<sup>" + (n === 1 ? "er" : "e") + "</sup>";
  let toutVoir = false, vuLib = () => {}, attenteW = false;
  const brigOuvertes = new Set();
  const clsVue = { gen: "j", quiz: "j", jeu: "j" }, clsTout = {}, clsOuvert = { gen: true };
  // La fleur du logo de l'unité : des gouttes autour d'un cœur qui porte le rang. Les trois premiers reçoivent une médaille
  // (or, argent, bronze) frappée du logo. Sans rang établi (aucun point distribué), la fleur reste vide.
  const PETALES = [[0, 62, 17, "#26076D"], [27, 50, 13, "#ECD567"], [52, 66, 18, "#ECD567"], [80, 52, 13, "#EC7739"], [104, 64, 17, "#26076D"], [131, 50, 12, "#E5B4D9"], [156, 66, 18, "#EC7739"],
    [184, 54, 14, "#ECD567"], [209, 64, 17, "#26076D"], [236, 52, 13, "#E5B4D9"], [262, 68, 19, "#E5B4D9"], [290, 50, 12, "#EC7739"], [313, 62, 16, "#26076D"], [338, 48, 11, "#ECD567"]];
  const GOUTTES = PETALES.map(([a, l, r, c]) => '<path transform="rotate(' + a + ') translate(0 -27)" d="M0 0C' + -.15 * r + " " + -.4 * l + " " + -r + " " + -.68 * l + " " + -r + " " + (r - l) + "A" + r + " " + r + " 0 0 1 " + r + " " + (r - l) + "C" + r + " " + -.68 * l + " " + .15 * r + " " + -.4 * l + ' 0 0Z" fill="' + c + '"/>').join("");
  const fleur = n => '<svg class="eg-fl" viewBox="-100 -100 200 200" ' + (n ? 'role="img" aria-label="Rang ' + n + '"' : 'aria-hidden="true"') + ">" + GOUTTES
    + '<circle r="46" fill="#FFFBF2" stroke="#26076D" stroke-width="7"/>' + (n ? '<text y="' + (n > 99 ? 13 : n > 9 ? 17 : 20) + '" text-anchor="middle" font-size="' + (n > 99 ? 38 : n > 9 ? 50 : 58) + '" fill="#26076D">' + n + "</text>" : "") + "</svg>";
  const METAL = { 1: ["#F2C230", "#FFE89A", "Médaille d'or"], 2: ["#C9CEDA", "#F1F3F8", "Médaille d'argent"], 3: ["#D98A4E", "#F6C9A4", "Médaille de bronze"] };
  const medaille = n => '<svg class="eg-med" viewBox="0 0 120 150" role="img" aria-label="' + METAL[n][2] + ", rang " + n + '">'
    + '<path d="M34 4h22l14 46H48Z" fill="#EC7739" stroke="#26076D" stroke-width="5" stroke-linejoin="round"/><path d="M86 4H64L50 50h22Z" fill="#E5B4D9" stroke="#26076D" stroke-width="5" stroke-linejoin="round"/>'
    + '<circle cx="60" cy="94" r="50" fill="' + METAL[n][0] + '" stroke="#26076D" stroke-width="6"/><circle cx="60" cy="94" r="40" fill="' + METAL[n][1] + '" stroke="#26076D" stroke-width="3"/>'
    + '<image href="img/logo-pharmacotechnie.webp" x="26" y="60" width="68" height="68"/><circle cx="98" cy="128" r="17" fill="#26076D"/><text x="98" y="136" text-anchor="middle" font-size="24" fill="#ECD567">' + n + "</text></svg>";
  const insigne = (r, etabli) => (!etabli ? fleur(0) : r <= 3 ? medaille(r) : fleur(r));
  const barre = (parts, max) => (max > 0 ? '<span class="eg-bar" aria-hidden="true">' + parts.map(p => '<u class="' + p[0] + '" style="width:' + Math.max(0, p[1]) / max * 100 + '%"></u>').join("") + "</span>" : "");
  const classer = (A, val) => { const S = A.map(x => ({ x, v: val(x) })).sort((a, b) => b.v - a.v); let r = 0; S.forEach((o, i) => { if (!i || o.v !== S[i - 1].v) r = i + 1; o.r = r; }); return S; };
  const dec = n => String(n).replace(".", ",");

  // Enquête des brigades : le bloc vient de enquete.js, chargé seulement quand le serveur a quelque chose à montrer
  // (une étape d'amorce acquise au joueur). Avant cela, rien n'est téléchargé ni affiché.
  let blocEnquete = null;
  const chargerEnquete = () => new Promise((ok, ko) => {
    if (window.PharmacoEnquete) return ok();
    const sc = document.createElement("script");
    sc.src = "enquete.js"; sc.onload = () => (window.PharmacoEnquete ? ok() : ko()); sc.onerror = ko;
    document.head.appendChild(sc);
  });
  const envoyerEnquete = async (k, reponse) => {
    const r = await call({ code: mem.code, prenom: mem.prenom, action: "enquete", k, reponse });
    if (r.j && r.j.portes) { E = r.j; majBrigades(); rang(); }
    return r;
  };
  function majEnquete() {
    const Q = E && E.enquete, el = q("#egEnquete");
    if (!el) return;
    if (E && (enJeu || q("#egTime"))) return; // pas de nouveauté sous la grille pendant un chrono : elle sort après le jeu
    const visible = Q && (Q.amorces ? Q.amorces.length : (Q.enigmes || []).some(e => e.etat !== "avenir"));
    if (!visible) { if (blocEnquete) blocEnquete.maj(null); else el.hidden = true; return; }
    chargerEnquete().then(() => {
      if (!E || !E.enquete) return;
      blocEnquete = blocEnquete || window.PharmacoEnquete.monter(el, {
        envoyer: envoyerEnquete,
        film: tete => call({ code: mem.code, prenom: mem.prenom, action: "film", tete: Boolean(tete) }),
        tamponner: async (id, t) => { const r = await call({ code: mem.code, prenom: mem.prenom, action: "tampon", id, t }); if (r.j && r.j.portes) { E = r.j; majBrigades(); rang(); } return r; },
        peutRepondre: () => Boolean(!relecture && E && E.profil && E.profil.b !== undefined),
        identifier: () => { if (!relecture && !enJeu && brouillon === null && !q("#egTime")) identifier(); },
        brigade: b => { const W = window.PharmacoParticipants, B = W && W.BRIGADES[b]; return B ? B.nom : "Brigade " + (b + 1); },
        mienne: () => (E && E.profil ? E.profil.b : undefined),
      });
      blocEnquete.maj(E.enquete);
    }).catch(() => {});
  }

  function rang() {
    majEnquete();
    declarerSapin();
    const L = E.classement || [], moi = relecture ? "" : norm(mem.prenom || "");
    const closes = E.portes.filter(p => p.etat === "close"), clos = closes.length;
    const me = moi ? L.find(x => norm(x.p) === moi) : null;
    q("#egSum").textContent = L.length ? pl(L.length, "joueur", "joueurs") + " · " + pl(clos, "porte comptée", "portes comptées") : "";
    q("#egRankMsg").textContent = !L.length ? "Personne n'a encore scellé de réponse. La première place est à prendre."
      : !clos ? "Les premiers points tomberont à la clôture de la porte 1, le " + jour(dt(E.portes[0].ferme, 1)) + "."
      : clos === 25 ? "Classement final : les 25 portes sont closes." : "";
    q("#egRankMsg").hidden = !q("#egRankMsg").textContent;

    // Avatars et brigades : le dessin vient de participants.js, chargé à la demande ; le classement s'affiche sans attendre
    // et se redessine une fois le module arrivé. Avant l'ouverture des fiches, personne n'a ni avatar ni brigade : rien ne change.
    const W = window.PharmacoParticipants, fiches = L.some(x => x.a || x.b !== undefined);
    if (fiches && !W && !attenteW) { attenteW = true; chargerParticipants().then(() => { if (E) rang(); }).catch(() => {}); }
    const B = x => (W && W.BRIGADES[x.b]) || null;
    const av = x => (!W || !fiches ? "" : x.a ? W.avatar(x.a, { brigade: x.b, cls: "eg-av" }) : '<span class="eg-av eg-av0" aria-hidden="true"></span>');
    const emb = x => (B(x) ? W.embleme(x.b, "eg-emb") + '<span class="sr"> ' + h(B(x).nom) + "</span>" : "");
    // Détail par épreuve (pq : cases de questions, pj : jeux d'adresse), si le serveur le fournit.
    const epreuves = L.some(x => x.pq !== undefined || x.pj !== undefined), maxPts = clos && L.length ? L[0].pts : 0;
    const parts = x => (epreuves ? [["q", x.pq || 0], ["j", x.pj || 0]] : [["j", x.pts]]);
    brigades(L, clos, moi, W, av, epreuves);
    // Progression : le serveur peut joindre le rang d'avant la dernière clôture (av). Seules les montées s'affichent.
    const monte = x => (x.av > x.rang ? '<span class="eg-up"><span aria-hidden="true">▲' + (x.av - x.rang) + '</span><span class="sr"> gagne ' + pl(x.av - x.rang, "rang", "rangs") + "</span></span>" : "");

    // Bulletin de libération : à la première visite après une clôture, ce qui vient d'être libéré pour ce joueur.
    const lib = q("#egLib"), vu = mem.vu && mem.vu.p === moi ? mem.vu : null;
    const neuves = me && clos ? closes.slice(vu ? Math.min(vu.clos, clos) : Math.max(0, clos - 1)) : [];
    vuLib = () => { if (me) { mem.vu = { p: moi, clos, rang: clos ? me.rang : 0 }; save(); } };
    if (!neuves.length) { lib.hidden = true; lib.innerHTML = ""; if (me && !vu) vuLib(); }
    else {
      const gain = neuves.reduce((t, p) => t + (p.pts || 0), 0), jouees = neuves.filter(p => p.pts !== undefined).length;
      const avant = vu && vu.clos ? vu.rang : neuves.length === 1 ? me.av : undefined, etait = lib.dataset.k;
      lib.dataset.k = moi + "|" + clos;
      lib.innerHTML = "<h4>" + (neuves.length === 1 ? "Porte " + neuves[0].n + " libérée" : "Portes " + neuves[0].n + " à " + neuves[neuves.length - 1].n + " libérées") + "</h4>"
        + "<div><p>Contrôle terminé, résultats libérés. Voici ce qui change pour vous, " + h(me.p) + " :</p>"
        + '<p class="eg-gain"><span>' + (jouees ? "+" + pl(gain, "point", "points") : neuves.length === 1 ? "Porte non jouée" : "Portes non jouées") + "</span>"
        + "<span>" + (avant && avant !== me.rang ? ord(avant) + ' <span aria-hidden="true">→</span><span class="sr"> puis </span> ' : "") + ord(me.rang) + " rang</span></p>"
        + '<button class="linkbtn" type="button" id="egVu">Classer le bulletin</button></div>';
      if (etait !== lib.dataset.k) { lib.classList.remove("neuf"); void lib.offsetWidth; lib.classList.add("neuf"); }
      lib.hidden = false;
    }

    // Ma fiche : rang, points, écart avec le rang du dessus, dernière porte libérée.
    const fiche = q("#egMoi");
    fiche.hidden = !(me && clos);
    if (me && clos) {
      const pairs = L.filter(x => x.rang === me.rang).length - 1, dessus = L.filter(x => x.pts > me.pts).pop(), der = closes[closes.length - 1];
      const att = E.portes.filter(p => p.etat === "ouverte" && (p.rep !== undefined || tentatives(p) > 0 || p.type === "quiz" || p.type === "duo" || (p.quiz && p.quiz.i > 1) || (p.duo && p.duo.i > 1))).length;
      const lignes = [];
      if (dessus) lignes.push("À <b>" + pl(dessus.pts - me.pts, "point", "points") + "</b> du " + ord(dessus.rang) + " rang.");
      else if (!me.pts) lignes.push("Aucun point distribué pour l'instant : tout reste à jouer.");
      else lignes.push(pairs ? "En tête, à égalité avec <b>" + pl(pairs, "joueur", "joueurs") + "</b>." : "<b>En tête</b> du classement.");
      if (lib.hidden && me.av !== undefined && me.av !== me.rang) lignes.push("Depuis la dernière clôture : du " + ord(me.av) + " au " + ord(me.rang) + " rang.");
      lignes.push("Dernière porte libérée : <b>porte " + der.n + ", " + (der.pts !== undefined ? "+" + pl(der.pts, "point", "points") : "non jouée") + "</b>.");
      if (att) lignes.push("<b>" + pl(att, "résultat", "résultats") + "</b> encore sous scellé.");
      fiche.innerHTML = '<div class="eg-moi-h"><span class="eg-moi-rg"><span><span class="sr">Rang </span>' + (L[0].pts ? ord(me.rang) : "·") + "</span></span><div><b>" + h(me.p) + ", " + pl(me.pts, "point", "points") + "</b>"
        + "<small>sur " + pl(L.length, "joueur", "joueurs") + (dessus && pairs ? " · ex aequo" : "") + "</small></div></div><ul>" + lignes.map(t => "<li>" + t + "</li>").join("") + "</ul>";
    }

    // Podium : les trois premiers rangs une fois des points distribués, les ex aequo sur la même marche.
    const tete = clos ? L.filter(x => x.rang <= 3 && x.pts > 0) : [], podium = tete.length > 0 && tete.length <= 6;
    q("#egPod").hidden = !podium;
    q("#egPod").innerHTML = !podium ? "" : [1, 2, 3].map(n => {
      const T = tete.filter(x => x.rang === n);
      return !T.length ? "" : '<li class="eg-marche s' + n + '">' + medaille(n) + "<ul>" + T.map(x => '<li class="eg-row r' + n + (norm(x.p) === moi ? " me" : "") + '">' + av(x) + "<span>" + '<b class="eg-ps" title="' + h(x.p) + '">' + h(x.p) + "</b>" + emb(x) + monte(x) + '</span><span class="sr"> ' + pl(x.pts, "point", "points") + "</span></li>").join("")
        + '</ul><span class="eg-pts3">' + pl(T[0].pts, "point", "points") + (T.length > 1 ? '<span class="sr"> chacun, ex aequo</span>' : "") + "</span></li>";
    }).join("");

    scene(clos === 25 && podium && !relecture, tete, av);

    // Suite : lignes fines, sans barre. Liste longue : repliée autour des premiers et du joueur, dépliable.
    const suite = podium ? L.filter(x => !tete.includes(x)) : L, iMoi = suite.indexOf(me), long = suite.length > 8;
    let trou = false;
    q("#egList").innerHTML = suite.map((x, i) => {
      const cache = long && !toutVoir && i >= 5 && Math.abs(i - iMoi) > 1, saut = cache && !trou;
      trou = cache;
      return (saut ? '<li class="eg-gap" aria-hidden="true">…</li>' : "")
        + '<li class="eg-row' + (x === me ? " me" : "") + '"' + (cache ? " hidden" : "") + '><span class="eg-rk">' + insigne(x.rang, maxPts > 0) + "</span>"
        + '<span class="eg-nm">' + av(x) + '<b class="eg-ps" title="' + h(x.p) + '">' + h(x.p) + "</b>" + emb(x) + (x === me ? '<span class="eg-vous">vous</span>' : "") + monte(x) + barre(parts(x), maxPts) + "</span>"
        + '<span class="eg-pt">' + (clos ? pl(x.pts, "point", "points") : pl(x.rep, "réponse scellée", "réponses scellées")) + "</span></li>";
    }).join("");
    q("#egMore").hidden = !long;
    q("#egTout").textContent = toutVoir ? "Replier le classement" : "Afficher les " + L.length + " joueurs";
    q("#egTout").setAttribute("aria-expanded", toutVoir);
    blocs(L, clos, moi, W, av, epreuves);
    const tete2 = !lib.hidden || !fiche.hidden;
    q("#egCol").hidden = !tete2;
    q("#egRBody").classList.toggle("duo", tete2);
  }

  // Remise des prix, au classement final seulement (les 25 portes closes) : une courte vidéo muette (rideau, projecteurs,
  // trophée, podium aux marches vides), puis les lauréats du podium apparaissent sur les marches. Jouée une fois par appareil,
  // avec de quoi la passer, la revoir et la replier. Pas de scène si l'appareil demande moins de mouvement ; si la vidéo
  // ne se charge pas, la scène disparaît sans message : le podium et le classement habituels restent en dessous.
  const SCENE = { src: "video/hall-of-fame.mp4", attente: 8000 };
  let sceneOu = "", sceneGarde = 0;
  const sceneVideo = () => q("#egSceneC video");

  function sceneEtat(e) {
    sceneOu = e;
    clearTimeout(sceneGarde);
    const v = sceneVideo(), vue = e === "joue" || e === "fin";
    if (v && e !== "joue") v.pause();
    q("#egScene").hidden = !vue;
    q("#egScene").classList.toggle("fin", e === "fin");
    q("#egScenePasser").hidden = e !== "joue";
    q("#egSceneRejouer").hidden = q("#egSceneReplier").hidden = e !== "fin";
    q("#egSceneR").hidden = e !== "replie";
  }

  function sceneFin(passe) {
    const v = sceneVideo();
    // Passer : on saute à la dernière image, le podium illuminé ; si la durée n'est pas encore connue, dès qu'elle l'est.
    const fond = () => { try { if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05); } catch (e) {} };
    if (passe && v) { v.pause(); if (isFinite(v.duration)) fond(); else v.addEventListener("durationchange", () => { if (sceneOu === "fin") fond(); }, { once: true }); }
    if (!mem.scene) { mem.scene = 1; save(); }
    sceneEtat("fin");
  }

  function sceneJouer() {
    let v = sceneVideo();
    if (!v) {
      v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.addEventListener("ended", () => { if (sceneOu === "joue") sceneFin(); });
      v.addEventListener("error", () => { if (sceneOu === "joue") sceneEtat("panne"); });
      v.addEventListener("playing", () => clearTimeout(sceneGarde));
      v.src = SCENE.src;
      q("#egSceneC").prepend(v);
    }
    sceneEtat("joue");
    try { v.currentTime = 0; } catch (e) {}
    sceneGarde = setTimeout(() => { if (sceneOu === "joue") sceneEtat("panne"); }, SCENE.attente);
    const p = v.play();
    if (p && p.catch) p.catch(() => { if (sceneOu === "joue") sceneEtat("panne"); });
  }

  function scene(finale, tete, av) {
    if (!finale || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) { if (sceneOu) sceneEtat(""); return; }
    // Sur chaque marche : le meeple et le pseudo du lauréat ; à plusieurs sur la marche, les meeples et « ex aequo ».
    [1, 2, 3].forEach(n => {
      const T = tete.filter(x => x.rang === n);
      q("#egSceneC .f" + n).innerHTML = !T.length ? "" : "<span>" + T.slice(0, 3).map(av).join("") + "</span><b>" + (T.length === 1 ? h(T[0].p) : T.length + " ex aequo") + "</b>";
    });
    if (!sceneOu) { if (mem.scene) sceneEtat("replie"); else sceneJouer(); }
  }

  // Classement des cinq brigades, au-dessus du classement individuel : rang et moyenne par membre actif (portes closes
  // seulement, calculés par le serveur), puis au toucher la devise, le jeu emblème, l'effectif et les membres.
  // Avant la première clôture : ni rang ni moyenne. Sans brigade (avant l'ouverture des fiches) : pas de bandeau.
  // Les blocs repliables : Général (joueurs ou brigades), Calendrier (brigades), Questions et Jeux d'adresse (joueurs ou
  // brigades, si le serveur détaille les points par épreuve), Enquête (brigades). Peu de texte : insigne, avatar ou emblème,
  // barre, points. Les moyennes de brigade par épreuve suivent la règle du serveur : somme des membres sur membres actifs.
  function blocs(L, clos, moi, W, av, epreuves) {
    const T = W ? (E.brigades || []).filter(t => t.n > 0 && W.BRIGADES[t.b]) : [], mienne = !relecture && E.profil ? E.profil.b : undefined;
    const un = n => Math.round(n * 10) / 10, pts = n => dec(n) + " pts";
    const moyenne = (t, k, cle) => (t[cle] !== undefined ? t[cle] : (a => (a ? un(L.filter(x => x.b === t.b).reduce((s, x) => s + (x[k] || 0), 0) / a) : 0))(L.filter(x => x.b === t.b && x.cl > 0).length));
    const nomB = t => W.embleme(t.b, "eg-emb") + "<div><b>" + h(W.BRIGADES[t.b].nom) + "</b>";
    const nomJ = x => av(x) + "<div>" + '<b class="eg-ps" title="' + h(x.p) + '">' + h(x.p) + "</b>";
    const tete = (k, html) => { q("#egT-" + k).innerHTML = html; };
    const bloc = (k, vu) => { const d = q('.eg-cl[data-k="' + k + '"]'); d.hidden = !vu; if (clsOuvert[k] !== undefined && d.open !== clsOuvert[k]) d.open = clsOuvert[k]; return d; };
    const lignes = (k, S, nom, cls, estMoi, plier) => {
      const max = S.length ? S[0].v : 0, iMoi = S.findIndex(o => estMoi(o.x)), long = plier && S.length > 8;
      let trou = false;
      q("#egL-" + k).innerHTML = S.map((o, i) => {
        const cache = long && !clsTout[k] && i >= 5 && Math.abs(i - iMoi) > 1, saut = cache && !trou;
        trou = cache;
        return (saut ? '<li class="eg-gap" aria-hidden="true">…</li>' : "") + '<li class="eg-ln' + (estMoi(o.x) ? " me" : "") + '"' + (cache ? " hidden" : "") + ">" + insigne(o.r, max > 0) + nom(o.x) + barre([[cls, o.v]], max) + "</div>"
          + '<span class="eg-pt">' + pts(o.v) + "</span></li>";
      }).join("");
      const plus = q("#egL-" + k).nextElementSibling;
      if (plus && plus.classList.contains("eg-more")) { plus.hidden = !long; plus.firstChild.textContent = clsTout[k] ? "Replier" : "Afficher les " + S.length + " joueurs"; plus.firstChild.setAttribute("aria-expanded", Boolean(clsTout[k])); }
      return max > 0 ? S[0].x : null;
    };
    const bascule = (k, deux) => { const v = deux ? clsVue[k] : "j"; q("#egSeg-" + k).hidden = !deux; q("#egSeg-" + k).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); return v; };

    // Général : la bascule montre les joueurs (podium et suite) ou les brigades (total, détail au dépliage).
    bloc("gen", true);
    const vGen = bascule("gen", T.length > 0);
    q("#egGenJ").hidden = vGen !== "j";
    q("#egBrigs").hidden = vGen !== "b" || !T.length;
    const legende = vGen === "j" ? (epreuves && clos ? [["questions", "--li"], ["jeux d'adresse", "--or"]] : []) : T.some(t => t.enq > 0) ? (epreuves ? [["questions", "--li"], ["jeux d'adresse", "--or"], ["enquête", "--pressed"]] : [["portes", "--or"], ["enquête", "--pressed"]]) : [];
    q("#egLeg-gen").hidden = !legende.length;
    q("#egLeg-gen").innerHTML = legende.map(x => '<span style="--c:var(' + x[1] + ')">' + x[0] + "</span>").join("");
    const premier = clos && L.length && L[0].pts > 0 ? L[0] : null, total = t => (t.tot !== undefined ? t.tot : t.moy), tB = classer(T, total);
    tete("gen", (premier ? av(premier) : "") + (tB.length && tB[0].v > 0 ? W.embleme(tB[0].x.b, "eg-emb") : ""));

    // Calendrier : les brigades aux 25 portes, sans l'enquête.
    bloc("cal", T.length > 0);
    const pCal = T.length ? lignes("cal", classer(T, t => t.moy), nomB, "j", t => t.b === mienne) : null;
    tete("cal", pCal ? W.embleme(pCal.b, "eg-emb") : "");

    // Questions et jeux d'adresse : seulement si le serveur détaille les points par épreuve.
    [["quiz", "pq", "mq", "q"], ["jeu", "pj", "mj", "j"]].forEach(([k, champ, cleB, cls]) => {
      bloc(k, epreuves && clos > 0);
      if (!epreuves || !clos) return;
      const v = bascule(k, T.length > 0);
      const pJ = classer(L, x => x[champ] || 0), pB = classer(T, t => moyenne(t, champ, cleB));
      const p = v === "j" ? lignes(k, pJ, nomJ, cls, x => Boolean(moi) && norm(x.p) === moi, true) : lignes(k, pB, nomB, cls, t => t.b === mienne);
      tete(k, (pJ.length && pJ[0].v > 0 ? av(pJ[0].x) : "") + (pB.length && pB[0].v > 0 ? W.embleme(pB[0].x.b, "eg-emb") : ""));
    });

    // Enquête : les points d'enquête des brigades.
    const enq = T.length > 0 && (Boolean(E.enquete) || T.some(t => t.enq > 0));
    bloc("enq", enq);
    const pEnq = enq ? lignes("enq", classer(T, t => t.enq || 0), nomB, "e", t => t.b === mienne) : null;
    tete("enq", pEnq ? W.embleme(pEnq.b, "eg-emb") : "");
  }

  function brigades(L, clos, moi, W, av, epreuves) {
    const T = (E.brigades || []).filter(t => t.n > 0), zone = q("#egBrigs");
    if (!(W && T.length)) { zone.hidden = true; q("#egBrigsL").innerHTML = ""; return; }
    const un = n => Math.round(n * 10) / 10, actifs = b => L.filter(x => x.b === b && x.cl > 0).length;
    const moyB = (t, k, cle) => (t[cle] !== undefined ? t[cle] : actifs(t.b) ? un(L.filter(x => x.b === t.b).reduce((s, x) => s + (x[k] || 0), 0) / actifs(t.b)) : 0);
    // Le serveur classe les brigades sur un total : la moyenne des portes par membre actif, plus les points de l'enquête
    // de brigade (tot = moy + enq). La ligne montre ce total ; le détail est dans la partie dépliée.
    const total = t => (t.tot !== undefined ? t.tot : t.moy), enquete = T.some(t => t.enq > 0), pts = n => dec(n) + " " + (n >= 2 ? "points" : "point");
    const maxB = Math.max(0, ...T.map(total));
    const note = T.some(t => total(t) > 0), mienne = !relecture && E.profil ? E.profil.b : undefined;
    const cat = typeof G !== "undefined" && Array.isArray(G) ? G : [];
    q("#egBrigsS").textContent = !note ? "Rang et points à la première clôture" : enquete ? "Total : moyenne des portes par membre actif, plus l'enquête" : "Moyenne de points par membre actif, portes closes";
    q("#egBrigsL").innerHTML = T.map(t => {
      const b = W.BRIGADES[t.b];
      if (!b) return "";
      const devise = W.devise(t), jeu = (t.jeux || []).map(n => cat.find(g => g.n === n)).find(Boolean), M = L.filter(x => x.b === t.b);
      return '<li><details class="eg-brig' + (t.b === mienne ? " me" : "") + '" data-b="' + t.b + '" style="--bf:' + b.fond + '"' + (brigOuvertes.has(String(t.b)) ? " open" : "") + ">"
        + "<summary>" + insigne(t.rang, note) + W.embleme(t.b, "eg-emb")
        + '<span class="eg-brig-t"><b>' + h(b.nom) + (t.b === mienne ? ' <span class="eg-vous">la vôtre</span>' : "") + "</b>"
        + '<span class="eg-pt">' + (note ? (enquete ? "" : "moyenne ") + pts(total(t)) + " · " : "") + pl(t.n, "membre", "membres") + "</span>" + barre((epreuves ? [["q", moyB(t, "pq", "mq")], ["j", moyB(t, "pj", "mj")]] : [["j", t.moy]]).concat([["e", t.enq || 0]]), maxB) + '</span><i aria-hidden="true"></i></summary>'
        + '<div class="eg-brig-c">' + (note && enquete ? "<p><small>Points</small>Portes, moyenne par membre actif : <b>" + pts(t.moy) + "</b>. Enquête : <b>" + pts(t.enq || 0) + "</b>. Total : <b>" + pts(total(t)) + "</b>.</p>" : "")
        + '<p><small>Devise</small>' + (devise ? "« " + h(devise) + " »" : "Pas encore élue.") + "</p>"
        + '<div><small>Jeu emblème</small><div class="eg-brig-j">' + (jeu ? '<img src="img/' + h(jeu.img) + '" alt="" loading="lazy"><b>' + h(jeu.n) + "</b>" : "<p>Pas encore élu.</p>") + "</div></div>"
        + "<p><small>Effectif</small>" + pl(t.n, "membre", "membres") + (clos ? ", dont " + pl(t.actifs, "actif", "actifs") + " sur les portes closes" : "") + ".</p>"
        + '<div><small>Membres</small><ul class="eg-brig-m">' + M.map(x => "<li" + (moi && norm(x.p) === moi ? ' class="me"' : "") + ">" + av(x) + '<span class="eg-ps" title="' + h(x.p) + '">' + h(x.p) + "</span></li>").join("") + "</ul></div></div></details></li>";
    }).join("");
  }
})();
