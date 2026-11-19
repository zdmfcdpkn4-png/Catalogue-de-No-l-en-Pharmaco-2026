/* Bingo personnel de la Team.
   Propre au site Vercel et sans serveur : chaque fiche de 25 étapes se calcule à partir du prénom,
   et les visas restent dans le navigateur. Rien n'est envoyé. */
(() => {
  const KEY = "pharmacotechnie-bingo-2026", KEY_VOTE = "pharmacotechnie-vote-2026";
  const q = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'").toLowerCase();
  const net = s => s.replace(/­/g, ""); // les titres portent des césures invisibles pour tenir dans une alvéole
  const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;

  // Étape offerte, au centre de toutes les fiches.
  const CENTRE = ["habillage", "Habillage conforme", "Charlotte, masque, gants : vous voilà en tenue. Étape offerte, déjà visée."];
  // Réserve d'étapes : identifiant stable, titre court (­ = césure possible), consigne.
  const ETAPES = [
    ["double", "Double contrôle", "Faites recompter vos points par un collègue avant d'annoncer le score. Deux paires d'yeux valent mieux qu'une."],
    ["traca", "Traça­bilité", "Tenez la feuille de score d'une partie du premier au dernier tour, lisiblement et sans rature."],
    ["reconciliation", "Réconci­liation", "En fin de partie, rangez la boîte au complet : pas un pion ne manque à l'appel."],
    ["asepsie", "Asepsie", "Terminez une partie sans une miette ni une tache sur la table de jeu."],
    ["peremption", "Péremp­tion", "Bouclez une partie avant la fin de la pause. Passé ce délai, elle est périmée."],
    ["dilution", "Dilution", "Initiez un débutant à un jeu qu'il ne connaît pas, sans lui souffler ses coups."],
    ["reconstitution", "Reconsti­tution", "Reconstituez l'équipe : au moins quatre collègues autour d'une même table de jeu."],
    ["surdosage", "Surdosage", "Enchaînez deux parties d'affilée. « Allez, une dernière. »"],
    ["contre", "Contre-indi­cation", "Jouez une partie entière sans toucher à votre téléphone."],
    ["indesirable", "Effet indé­sirable", "Perdez une partie avec le sourire, sans chouiner."],
    ["stabilite", "Stabilité", "Restez de marbre après un coup bas : carte volée, alliance trahie, plan ruiné."],
    ["posologie", "Posologie", "Expliquez une règle en moins de cinq minutes, montre en main."],
    ["debit", "Débit rapide", "Jouez une partie en moins de quinze minutes."],
    ["perfusion", "Perfusion lente", "Tenez une partie de plus d'une heure sans demander quand ça finit."],
    ["bolus", "Bolus", "Gagnez une partie. N'importe laquelle, mais gagnez-la."],
    ["deuxpostes", "Deux postes", "Jouez une partie en duo, comme en isolateur à deux postes."],
    ["monoposte", "Monoposte", "Jouez une partie en solo : une réussite compte."],
    ["surprise", "Poche surprise", "Agitez la poche surprise du catalogue et lisez à voix haute la notice du jeu délivré."],
    ["ordonnance", "Ordon­nance", "Prescrivez-vous au moins trois jeux avec le bouton Prescrire, puis copiez votre ordonnance."],
    ["dosedujour", "Dose du jour", "Ouvrez la goutte du jour sur le sapin de l'Avent, à partir du 1er décembre."],
    ["galenique", "Formes galé­niques", "Citez de mémoire, sans tricher, les quatre formes galéniques du catalogue."],
    ["bonusage", "Bon usage", "Lisez en entier la notice de bon usage en bas du catalogue, contre-indications comprises."],
    ["adjuvant", "Adjuvant", "Apportez des chocolats à la pause : la notice est formelle, ils potentialisent le traitement."],
    ["etiquetage", "Étique­tage", "Faites deviner un jeu du catalogue à un collègue en ne lui lisant que sa notice."],
    ["tenue", "Tenue de fête", "Portez un pull, un bonnet ou des chaussettes de Noël. Hors zone de préparation, évidemment."],
    ["agitation", "Agiter avant emploi", "Fredonnez « Noël en Pharmaco », la chanson du 1er décembre, devant au moins un témoin."],
    ["miseenforme", "Mise en forme", "Pliez un origami : une poche, un sapin, ce que vos doigts voudront bien faire."],
    ["dispensation", "Dispen­sation", "Conseillez un jeu du catalogue à un proche, posologie comprise."],
    ["vigilance", "Pharmaco­vigilance", "Déclarez un effet indésirable ludique : racontez votre pire défaite à la pause."],
    ["grandvolume", "Grand volume", "Jouez une partie à cinq joueurs ou plus."],
    ["magistrale", "Formule magis­trale", "Inventez une règle maison et faites-la adopter par toute la table."],
    ["videdeligne", "Vide de ligne", "Rangez la table de jeu après la partie, sans qu'on vous le demande."],
    ["calcul", "Calcul de dose", "Faites le décompte final de tête, sans calculatrice ni téléphone."],
    ["flux", "Flux laminaire", "Distribuez les cartes d'un seul geste fluide, sans en retourner une seule."],
    ["filtration", "Filtra­tion", "Triez et rangez un jeu de cartes ou un sachet de pions en désordre."],
    ["froid", "Chaîne du froid", "Rompez-la, pour une fois : offrez une boisson chaude à un collègue."],
    ["echantillon", "Échan­tillon", "Testez un jeu que vous n'aviez encore jamais vu."],
    ["quarantaine", "Quaran­taine", "Après une défaite, attendez le lendemain pour demander votre revanche."],
    ["inventaire", "Inven­taire", "Comptez les jeux de société de votre maison et annoncez le total à l'équipe."],
    ["garde", "Garde de nuit", "Jouez une partie après 21 heures, en pyjama si le protocole le permet."],
    ["transfert", "Transfert", "Prêtez un jeu à un collègue, ou empruntez-lui le sien."],
    ["pretemploi", "Prêt à l'emploi", "Jouez à un jeu dont la règle s'explique en une minute."],
    ["nonconformite", "Non-confor­mité", "Avouez une erreur de règle commise en cours de partie, même si elle vous arrangeait."],
  ];

  // Un lot = cinq visas alignés : 5 lignes, 5 colonnes, 2 diagonales.
  const LIGNES = [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
  for (let i = 0; i < 5; i++) LIGNES.push([0, 1, 2, 3, 4].map(j => i * 5 + j), [0, 1, 2, 3, 4].map(j => j * 5 + i));

  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { mem = {}; }
  if (!mem.visas || typeof mem.visas !== "object") mem.visas = {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} };
  let grille = [], cle = "", choix = -1, sec;

  // Tirage reproductible : le prénom sert de graine, donc même prénom, même fiche, sur tout appareil.
  const graine = s => { let x = 2166136261; for (const c of s) { x ^= c.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const alea = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function tirer(prenom) {
    cle = norm(prenom);
    const r = alea(graine(cle)), p = ETAPES.slice();
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    grille = p.slice(0, 24);
    grille.splice(12, 0, CENTRE);
    if (!mem.visas[cle] || typeof mem.visas[cle] !== "object") mem.visas[cle] = {};
  }
  const vise = i => i === 12 || Boolean(mem.visas[cle][grille[i][0]]);
  const lots = () => LIGNES.filter(l => l.every(vise));
  const compte = () => grille.filter((e, i) => vise(i)).length;
  const resume = () => {
    const n = compte(), l = lots().length;
    return n + (n > 1 ? " étapes visées" : " étape visée") + " sur 25 · " + l + (l > 1 ? " lots libérés" : " lot libéré") + " sur 12";
  };

  const CSS = `
.bn [hidden]{display:none!important}
.bn-body{display:grid;grid-template-columns:minmax(0,560px) minmax(0,1fr);gap:24px 28px;align-items:start;margin-top:18px}
.bn-panel{min-width:0;padding:16px 18px 18px;background:var(--surface);color:var(--on-surface);border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.bn-gate{max-width:420px;margin-top:18px}
.bn-panel h3{margin:0;font-weight:800;font-size:1.3rem;line-height:1.1}
.bn-panel label{display:block;margin:14px 0 5px;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.bn-panel input{display:block;width:100%;min-height:46px;font:700 1rem var(--display);color:var(--on-surface);background:#fff;border:2.5px solid var(--line);border-radius:12px;padding:8px 10px}
.bn-hint{margin:6px 0 0;font-size:.82rem;color:var(--muted)}
.bn-d{margin:10px 0 0;font-size:1rem}
.bn-msg{margin:12px 0 0;font-size:.95rem;font-weight:800}
.bn-msg:empty{display:none}
.bn-msg.err{color:var(--off)}.bn-msg.ok{color:var(--ok)}
.bn-sheet{position:relative;min-width:0;padding:12px 12px 14px;color:var(--on-surface);background:linear-gradient(135deg,var(--foil-a),var(--foil-b) 52%,var(--foil-a));border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.bn-cap{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;font:600 .68rem/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.bn-cap b{min-width:0;font-weight:600;text-align:right;overflow-wrap:anywhere}
.bn-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
.bn-cell{position:relative;aspect-ratio:1;min-width:0;display:grid;place-items:center;margin:0;padding:3px;overflow:hidden;border:2.5px solid color-mix(in srgb,var(--line) 50%,transparent);border-radius:24%;background:radial-gradient(120% 90% at 30% 14%,rgba(255,255,255,.96) 0 14%,rgba(255,255,255,.5) 40%,var(--t,var(--tF)) 100%);box-shadow:inset 0 -7px 12px rgba(38,7,109,.16),inset 0 4px 6px rgba(255,255,255,.7);color:var(--on-surface);font:800 clamp(.6rem,2.6vw,.9rem)/1.1 var(--display);text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s}
.bn-cell:nth-child(4n+1){--t:var(--tE)}.bn-cell:nth-child(4n+2){--t:var(--tF)}.bn-cell:nth-child(4n+3){--t:var(--tI)}.bn-cell:nth-child(4n){--t:var(--tX)}
.bn-cell span{display:block;max-width:100%;overflow-wrap:anywhere;text-wrap:balance}
.bn-cell:active{transform:scale(.95)}
.bn-cell[aria-pressed="true"]{background:var(--pressed);color:var(--pressed-on);border-color:var(--line);box-shadow:inset 0 5px 0 rgba(0,0,0,.28)}
.bn-cell.lib{background:var(--mu);color:#26076D;border-color:var(--line);box-shadow:inset 0 -5px 0 rgba(38,7,109,.18)}
.bn-cell.sel{outline:3px solid #EC7739;outline-offset:1px}
.bn-score{margin:12px 0 0;padding-top:10px;border-top:3px dashed color-mix(in srgb,var(--line) 35%,transparent);font-weight:800;font-size:.95rem}
.bn-tools{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin:0}
.bn-burst{position:absolute;left:50%;top:45%;pointer-events:none}
.bn-burst i{position:absolute;width:12px;height:16px;margin:-8px 0 0 -6px;background:var(--k);clip-path:polygon(50% 0,85% 45%,100% 70%,80% 100%,20% 100%,0 70%,15% 45%);border-radius:50% 50% 50% 50%/60% 60% 40% 40%;animation:bnPop .95s cubic-bezier(.1,.7,.3,1) forwards}
@keyframes bnPop{from{transform:translate(0,0) rotate(var(--r)) scale(.3);opacity:1}to{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1.1);opacity:0}}
@media(max-width:860px){.bn-body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.bn-sheet{padding:10px 8px 12px}.bn-grid{gap:5px}.bn-cell{padding:2px;border-width:2px}}`;

  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  sec = document.createElement("section");
  sec.className = "wrap adv bn";
  sec.id = "bingo";
  sec.hidden = true;
  sec.setAttribute("aria-labelledby", "bingo-t");
  sec.innerHTML = '<p class="adv-back"><a class="go" href="#">Retour au catalogue</a></p>'
    + '<div class="adv-head"><h2 id="bingo-t">Le bingo <span>de la Team</span></h2>'
    + '<p class="adv-intro">Votre fiche de fabrication personnelle : 25 étapes tirées de votre prénom. Visez chaque étape réalisée ; cinq visas alignés, et le lot est libéré.</p></div>'
    + '<form class="bn-panel bn-gate" id="bnGate" novalidate><h3>Ouvrir ma fiche</h3>'
    + '<label for="bnPrenom">Votre prénom</label><input id="bnPrenom" type="text" autocomplete="given-name" maxlength="24" required>'
    + '<p class="bn-hint">Même prénom, même fiche, sur tous vos appareils. Vos visas restent sur cet appareil : rien n\'est envoyé.</p>'
    + '<p class="bn-msg err" id="bnGateMsg" role="status"></p><button class="go main" type="submit">Tirer ma fiche</button></form>'
    + '<div class="bn-body" id="bnBody" hidden>'
    + '<div class="bn-sheet"><div class="bn-cap"><span>Fiche de fabrication</span><b id="bnWho"></b></div>'
    + '<div class="bn-grid" id="bnGrid" role="group" aria-label="Fiche de 25 étapes"></div>'
    + '<div class="bn-burst" id="bnBurst" aria-hidden="true"></div>'
    + '<p class="bn-score" id="bnScore" role="status"></p>'
    + '<p class="bn-tools"><button class="go" type="button" id="bnCopy">Copier mon bulletin</button><button class="linkbtn" type="button" id="bnChange">Changer de prénom</button></p></div>'
    + '<aside class="bn-panel" id="bnPanel" aria-live="polite"></aside>'
    + "</div>";
  (q("#vote") || q("#avent") || q("header.hero")).insertAdjacentElement("afterend", sec);

  const a = document.createElement("a");
  a.className = "go avgo";
  a.href = "#bingo";
  a.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M1 3h4v4H1zM7 3h4v4H7zM13 3h4v4h-4zM1 9h4v4H1zM7 9h4v4H7zM13 9h4v4h-4zM1 15h4v4H1zM7 15h4v4H7zM13 15h4v4h-4z" fill="currentColor"/></svg>Jouer au bingo de la Team';
  const ancre = q(".avgo") || q(".lead");
  if (ancre) ancre.insertAdjacentElement("afterend", a);

  function dessiner(garderFocus) {
    const dans = new Set(lots().flat());
    q("#bnGrid").innerHTML = grille.map((e, i) => '<button class="bn-cell' + (dans.has(i) ? " lib" : "") + (i === choix ? " sel" : "") + '" type="button" data-i="' + i + '" data-id="' + h(e[0])
      + '" aria-pressed="' + vise(i) + '" aria-label="' + h(net(e[1]) + (vise(i) ? ", étape visée" : ", à viser")) + '"><span>' + h(e[1]) + "</span></button>").join("");
    q("#bnScore").textContent = resume();
    if (garderFocus && choix >= 0) { const c = q('#bnGrid [data-i="' + choix + '"]'); if (c) c.focus({ preventScroll: true }); }
  }

  function panneau(msg) {
    let html;
    if (choix < 0) {
      html = '<p class="ap-m">Mode opératoire</p><h3>Trois gestes, pas un de plus</h3>'
        + '<p class="bn-d">Touchez une étape pour lire sa consigne. Une fois réalisée, apposez votre visa. Cinq visas alignés, en ligne, en colonne ou en diagonale : un lot est libéré.</p>';
    } else {
      const e = grille[choix], ok = vise(choix);
      html = '<p class="ap-m">Étape ' + (choix + 1) + " sur 25 · " + (ok ? "visée" : "à viser") + "</p><h3>" + h(net(e[1])) + '</h3><p class="bn-d">' + h(e[2]) + "</p>"
        + (choix === 12 ? "" : '<button class="go main" type="button" id="bnVisa">' + (ok ? "Retirer mon visa" : "Apposer mon visa") + "</button>");
    }
    q("#bnPanel").innerHTML = html + '<p class="bn-msg ok" id="bnMsg" role="status">' + h(msg || "") + "</p>";
  }

  function eclat() {
    const K = ["#ECD567", "#26076D", "#E5B4D9", "#FFFBF2", "#EC7739"];
    let s = "";
    for (let i = 0; i < 22; i++) {
      const ang = Math.random() * 6.283, d = 70 + Math.random() * 110;
      s += '<i style="--k:' + K[i % K.length] + ";--x:" + Math.round(Math.cos(ang) * d) + "px;--y:" + Math.round(Math.sin(ang) * d) + "px;--r:" + Math.round(Math.random() * 360) + 'deg"></i>';
    }
    q("#bnBurst").innerHTML = s;
    setTimeout(() => { q("#bnBurst").innerHTML = ""; }, 1100);
  }

  function viser() {
    if (choix < 0 || choix === 12) return;
    const id = grille[choix][0], avant = lots().length;
    if (mem.visas[cle][id]) delete mem.visas[cle][id]; else mem.visas[cle][id] = Date.now();
    save();
    const apres = lots().length;
    let msg = "";
    if (apres > avant) {
      msg = apres === 12 ? "Bingo total : libération pharmaceutique accordée. La fiche est complète." : "Lot libéré : cinq visas alignés !";
      eclat();
    }
    dessiner(true);
    panneau(msg);
  }

  function bulletin() {
    let g = "";
    for (let i = 0; i < 25; i++) g += (vise(i) ? "\u{1F7E7}" : "⬜") + (i % 5 === 4 ? "\n" : "");
    return "Bingo de la Team · " + mem.prenom + "\n" + resume() + "\n" + g + location.origin + location.pathname + "#bingo";
  }

  function ouvrir() {
    tirer(mem.prenom);
    choix = -1;
    q("#bnGate").hidden = true;
    q("#bnBody").hidden = false;
    q("#bnWho").textContent = mem.prenom + " · lot n° " + (graine(cle) % 9000 + 1000);
    dessiner();
    panneau();
  }

  function fermer() {
    q("#bnBody").hidden = true;
    q("#bnGate").hidden = false;
    q("#bnPrenom").value = mem.prenom || "";
    q("#bnPrenom").focus();
  }

  q("#bnGate").addEventListener("submit", e => {
    e.preventDefault();
    const p = q("#bnPrenom").value.trim().replace(/’/g, "'");
    if (p.length < 2 || p.length > 24 || !PRENOM.test(p)) { q("#bnGateMsg").textContent = "Un seul prénom, de 2 à 24 lettres, sans espace ni chiffre."; return; }
    q("#bnGateMsg").textContent = "";
    mem.prenom = p;
    save();
    ouvrir();
  });
  q("#bnGrid").addEventListener("click", e => {
    const c = e.target.closest(".bn-cell");
    if (!c) return;
    choix = Number(c.dataset.i);
    dessiner(true);
    panneau();
    q("#bnPanel").scrollIntoView({ block: "nearest" });
  });
  q("#bnPanel").addEventListener("click", e => { if (e.target.closest("#bnVisa")) viser(); });
  q("#bnChange").addEventListener("click", fermer);
  q("#bnCopy").addEventListener("click", async () => {
    const b = q("#bnCopy");
    try { await navigator.clipboard.writeText(bulletin()); b.textContent = "Bulletin copié"; } catch (e) { b.textContent = "Copie impossible"; }
    setTimeout(() => { b.textContent = "Copier mon bulletin"; }, 1800);
  });

  function view() {
    const on = location.hash === "#bingo";
    sec.hidden = !on;
    if (!on) return;
    document.querySelectorAll("#avent,.ind,.bar,main").forEach(e => { e.hidden = true; });
    sec.scrollIntoView({ block: "start" });
  }

  if (typeof mem.prenom === "string" && mem.prenom.length >= 2 && mem.prenom.length <= 24 && PRENOM.test(mem.prenom)) ouvrir();
  else {
    delete mem.prenom;
    // Prénom déjà donné pour le vote sur cet appareil : on le propose, sans l'imposer.
    try { const v = JSON.parse(localStorage.getItem(KEY_VOTE) || "{}"); if (v && typeof v.prenom === "string") q("#bnPrenom").value = v.prenom.slice(0, 24); } catch (e) {}
  }
  window.addEventListener("hashchange", view);
  view();
})();
