/* Participants des Pharmacogames : l'avatar (un meeple à composer), les cinq brigades et la fiche d'identification.
   Chargé à la demande par enigme.js. Aucune photo, aucune donnée personnelle : un avatar n'est que trois numéros
   [couleur, coiffe, accessoire], pris dans les listes fermées ci-dessous. Le serveur (api/enigme.js, AVATAR et
   NB_BRIGADES) valide ces numéros et tire seul la brigade : garder les longueurs des listes accordées avec lui.
   Ne jamais retirer ni réordonner un élément d'une liste (les avatars enregistrés pointent dessus) : ajouter à la fin. */
(() => {
  const h = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = "#26076D"; // trait du site

  const COULEURS = [
    { nom: "orange", c: "#EC7739" }, { nom: "jaune", c: "#ECD567" }, { nom: "rouge", c: "#DC4B4F" }, { nom: "rose", c: "#F2A0C4" },
    { nom: "vert", c: "#4FB286" }, { nom: "bleu", c: "#5AA9E6" }, { nom: "violet", c: "#9A7BE0" }, { nom: "crème", c: "#FFFBF2" },
  ];
  // Coiffes et accessoires : dessinés dans le repère du meeple (tête centrée en 50,20, rayon 16 ; main droite vers 90,60).
  const T = 'stroke="' + L + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  const COIFFES = [
    { nom: "tête nue", d: "" },
    { nom: "charlotte", d: '<path d="M29 21C23 3 37-9 50-9s27 12 21 30c-13-6-29-6-42 0z" fill="#BFE3F2" ' + T + '/><path d="M36 9c4-5 8-7 13-8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' },
    { nom: "bonnet de Noël", d: '<path d="M32 15C34-3 50-13 74-8c-7 5-9 13-6 23z" fill="#DC4B4F" ' + T + '/><rect x="27" y="11" width="45" height="11" rx="5.5" fill="#fff" ' + T + '/><circle cx="76" cy="-9" r="7" fill="#fff" ' + T + "/>" },
    { nom: "bois de renne", d: '<path d="M40 8C34 2 32-6 34-16M35-4l-10-4M60 8c6-6 8-14 6-24M65-4l10-4" fill="none" stroke="' + L + '" stroke-width="11" stroke-linecap="round"/><path d="M40 8C34 2 32-6 34-16M35-4l-10-4M60 8c6-6 8-14 6-24M65-4l10-4" fill="none" stroke="#B9783A" stroke-width="5" stroke-linecap="round"/>' },
    { nom: "couronne", d: '<path d="M33 14l-3-22 11 9 9-14 9 14 11-9-3 22z" fill="#ECD567" ' + T + '/><circle cx="50" cy="6" r="3" fill="#DC4B4F"/>' },
    { nom: "bonnet de lutin", d: '<path d="M32 15C36-3 54-6 64-22c4 12 8 24 5 37z" fill="#4FB286" ' + T + '/><rect x="27" y="11" width="46" height="10" rx="5" fill="#ECD567" ' + T + '/><circle cx="64" cy="-23" r="5.5" fill="#ECD567" ' + T + "/>" },
    { nom: "calot de bloc", d: '<path d="M31 16c-2-14 7-23 19-23s21 9 19 23z" fill="#3CB4AC" ' + T + '/><path d="M69 10l9-4-2 10z" fill="#3CB4AC" ' + T + '/><path d="M38 4h6M50 0h6" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>' },
    { nom: "cache-oreilles", d: '<path d="M31 20a19 19 0 0 1 38 0" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M31 20a19 19 0 0 1 38 0" fill="none" stroke="#ECD567" stroke-width="4" stroke-linecap="round"/><circle cx="31" cy="22" r="8.5" fill="#DC4B4F" ' + T + '/><circle cx="69" cy="22" r="8.5" fill="#DC4B4F" ' + T + "/>" },
  ];
  const ACCESSOIRES = [
    { nom: "mains libres", d: "" },
    { nom: "flacon", d: '<rect x="78" y="46" width="24" height="30" rx="5" fill="#fff" ' + T + '/><path d="M80.5 60h19v11a2.5 2.5 0 0 1-2.5 2.5h-14a2.5 2.5 0 0 1-2.5-2.5z" fill="#5AA9E6"/><rect x="84" y="37" width="12" height="9" fill="#fff" ' + T + '/><rect x="81" y="31" width="18" height="8" rx="2" fill="#9A7BE0" ' + T + "/>" },
    { nom: "seringue", d: '<g transform="rotate(35 90 56)"><path d="M90 26v8M83 26h14" ' + T + ' fill="none"/><rect x="83" y="36" width="14" height="32" rx="2" fill="#fff" ' + T + '/><rect x="85.5" y="50" width="9" height="15.5" fill="#F2A0C4"/><path d="M90 68v6M90 76v10" ' + T + ' fill="none"/></g>' },
    { nom: "poche", d: '<path d="M90 28v8" ' + T + ' fill="none"/><rect x="77" y="36" width="26" height="34" rx="7" fill="#fff" ' + T + '/><path d="M79.5 52h21v11a4.5 4.5 0 0 1-4.5 4.5h-12a4.5 4.5 0 0 1-4.5-4.5z" fill="#ECD567"/><path d="M90 70v6c0 6 8 4 8 10" ' + T + ' fill="none"/>' },
    { nom: "étoile", d: '<path d="M90 34l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L90 62.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#ECD567" ' + T + "/>" },
    { nom: "cadeau", d: '<rect x="76" y="48" width="28" height="24" rx="3" fill="#DC4B4F" ' + T + '/><path d="M90 48v24M76 58h28" stroke="#ECD567" stroke-width="5"/><path d="M90 47c-10-12-16 0-6 1M90 47c10-12 16 0 6 1" fill="#ECD567" ' + T + "/>" },
    { nom: "sucre d'orge", d: '<path d="M84 78V46a8 8 0 0 1 16 0v5" fill="none" stroke="' + L + '" stroke-width="13" stroke-linecap="round"/><path d="M84 78V46a8 8 0 0 1 16 0v5" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M84 78V46a8 8 0 0 1 16 0v5" fill="none" stroke="#DC4B4F" stroke-width="7" stroke-dasharray="6 7"/>' },
    { nom: "dé", d: '<g transform="rotate(-12 90 58)"><rect x="76" y="44" width="28" height="28" rx="6" fill="#fff" ' + T + '/><circle cx="83.5" cy="51.5" r="3" fill="' + L + '"/><circle cx="90" cy="58" r="3" fill="' + L + '"/><circle cx="96.5" cy="64.5" r="3" fill="' + L + '"/></g>' },
  ];
  // Emblèmes des brigades : repère 24 x 24.
  const E = 'fill="#fff" stroke="' + L + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  const BRIGADES = [
    { nom: "Brigade des Flacons", court: "Flacons", c: "#4FB286", fond: "#CDEBDD", d: '<rect x="6" y="9" width="12" height="13" rx="2.5" ' + E + '/><rect x="9" y="5" width="6" height="4" ' + E + '/><rect x="7.5" y="2" width="9" height="3.5" rx="1" ' + E + ' fill="currentColor"/><path d="M7 15h10v4.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5z" fill="currentColor"/>' },
    { nom: "Brigade des Seringues", court: "Seringues", c: "#5AA9E6", fond: "#D3E8F8", d: '<g transform="rotate(45 12 12)"><path d="M12 1v3M9 1h6M12 18v5" ' + E + ' fill="none"/><rect x="8.5" y="4.5" width="7" height="13" rx="1" ' + E + '/><rect x="9.5" y="10" width="5" height="6.5" fill="currentColor"/></g>' },
    { nom: "Brigade des Poches", court: "Poches", c: "#F2A0C4", fond: "#FBDDEA", d: '<path d="M12 1.5v3M12 19v3.5" ' + E + ' fill="none"/><rect x="5.5" y="4.5" width="13" height="15" rx="3.5" ' + E + '/><path d="M6.5 11h11v5a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 16z" fill="currentColor"/>' },
    { nom: "Brigade des Gélules", court: "Gélules", c: "#ECD567", fond: "#F8EFC0", d: '<g transform="rotate(-40 12 12)"><rect x="2" y="7" width="20" height="10" rx="5" ' + E + '/><path d="M12 7h5a5 5 0 0 1 0 10h-5z" fill="currentColor" stroke="' + L + '" stroke-width="2"/></g>' },
    { nom: "Brigade des Ampoules", court: "Ampoules", c: "#EC7739", fond: "#F9D6C0", d: '<path d="M10 1.5h4v4l-1.2 2 1.2 2.5c2 1 3 2 3 4.5V20a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 20v-5.5c0-2.5 1-3.5 3-4.5l1.2-2.5L10 5.5z" ' + E + '/><path d="M8 15h8v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20z" fill="currentColor"/>' },
  ];
  // Devises proposées aux brigades : chaque membre en soutient une, la plus soutenue s'affiche (serveur : NB_DEVISES).
  const DEVISES = [
    "Un pour tous, tous au plateau", "Qui dose bien joue bien", "Jamais de pioche sans double contrôle", "Lancer, compter, libérer",
    "Petits lots, grandes victoires", "La règle d'abord, le bluff ensuite", "Aseptiques, mais pas sans saveur", "Un coup d'avance, jamais un lot de retard",
    "Préparés avec soin, joués avec panache", "À la paillasse comme au plateau", "Zéro particule, cent pour cent meeple", "Qui scelle sa réponse scelle son destin",
    "Agiter avant de jouer", "Tenir hors de portée des mauvais perdants", "Une partie matin, midi et soir", "Sous hotte, mais pas sous cloche",
    "La chance se prépare", "Posologie : une victoire par jour", "Le dé est jeté, le lot est libéré", "Traçabilité totale, bluff compris",
  ];
  const MEEPLE = "M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z";

  const borne = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
  const sain = a => { a = Array.isArray(a) ? a : []; return [borne(a[0], COULEURS.length), borne(a[1], COIFFES.length), borne(a[2], ACCESSOIRES.length)]; };
  const decrire = a => { a = sain(a); return "Meeple " + COULEURS[a[0]].nom + ", " + COIFFES[a[1]].nom + ", " + ACCESSOIRES[a[2]].nom; };
  const emblemeSvg = (b, cls) => { const B = BRIGADES[b]; return B ? '<svg class="' + (cls || "pp-emb") + '" viewBox="0 0 24 24" aria-hidden="true" style="color:' + B.c + '">' + B.d + "</svg>" : ""; };

  // Avatar sur son jeton. brigade : numéro de 0 à 4 (le jeton prend sa teinte), ou rien (jeton crème).
  // Dessin décoratif par défaut (aria-hidden) ; avec o.titre, il porte sa description.
  function avatar(a, o) {
    a = sain(a); o = o || {};
    const B = BRIGADES[o.brigade];
    return '<svg class="pp-av' + (o.cls ? " " + o.cls : "") + '" viewBox="0 0 120 120"' + (o.titre ? ' role="img" aria-label="' + h(o.titre === true ? decrire(a) : o.titre) + '"' : ' aria-hidden="true"') + ">"
      + '<circle cx="60" cy="60" r="56" fill="' + (B ? B.fond : "#FFFBF2") + '" stroke="' + L + '" stroke-width="5"/>'
      + (B ? '<circle cx="60" cy="60" r="49.5" fill="none" stroke="' + B.c + '" stroke-width="5"/>' : "")
      + '<g transform="translate(21 34) scale(.72)"><path d="' + MEEPLE + '" fill="' + COULEURS[a[0]].c + '" stroke="' + L + '" stroke-width="8" stroke-linejoin="round"/>'
      + COIFFES[a[1]].d + ACCESSOIRES[a[2]].d + "</g></svg>";
  }

  const CSS = `
.pp-vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.pp-av{display:block;width:100%;height:auto;overflow:visible}
.pp-mini{display:inline-block;width:2.4em;height:2.4em;margin-right:.4em;vertical-align:middle}
.pp-emb{display:inline-block;width:1.25em;height:1.25em;vertical-align:-.25em}
.pp-brig{display:flex;align-items:center;gap:6px;margin:6px 0 10px;font:600 .72rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase}
.pp-top{display:flex;align-items:center;gap:14px;margin-top:14px}
.pp-apercu{flex:0 0 auto;width:124px;filter:drop-shadow(5px 5px 0 var(--shadow,#26076D))}
.pp-top>div:last-child{min-width:0}
.pp-desc{margin:0;font-weight:800;line-height:1.25}
.pp-top .go{margin-top:10px}
.pp-set{min-width:0;margin:14px 0 0;padding:0;border:0}
.pp-set legend{padding:0;margin:0 0 6px;font:600 .72rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#4E3D7C)}
.pp-opts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pp-opt{position:relative;display:block;margin:0!important;cursor:pointer;text-transform:none!important;letter-spacing:0!important}
.pp-opt span{display:grid;justify-items:center;gap:3px;height:100%;padding:6px 2px 5px;background:#fff;color:var(--on-surface,#26076D);border:2.5px solid var(--line,#26076D);border-radius:12px;font:700 .68rem/1.15 var(--display,sans-serif);text-align:center;overflow-wrap:break-word}
#ppTitre:focus{outline:none}
.pp-opt span svg,.pp-opt span i{display:block;width:40px;height:40px}
.pp-opt span i{border:2.5px solid var(--line,#26076D);border-radius:50%}
.pp-opt input:checked+span{background:var(--mu,#ECD567);box-shadow:3px 3px 0 var(--shadow,#26076D);transform:translate(-1px,-1px)}
.pp-opt input:focus-visible+span{outline:3px solid var(--line,#26076D);outline-offset:3px}
.pp-fin{display:flex;flex-wrap:wrap;align-items:center;gap:0 12px}
.pp-carte{display:flex;align-items:center;gap:14px;margin-top:14px;padding:12px;border:3px solid var(--line,#26076D);border-radius:16px;color:#26076D}
.pp-carte .pp-apercu{width:108px}
.pp-carte b{display:block;font-size:1.25rem;line-height:1.1}
.pp-carte small{display:block;margin-top:4px;font:600 .72rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase}
.pp-carte .pp-emb{width:34px;height:34px;margin-bottom:4px}
.pp-pop{animation:pp-pop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes pp-pop{from{transform:scale(.6) rotate(-6deg);opacity:0}}
.pp-elus{display:grid;gap:8px;margin:12px 0 0;padding:0;list-style:none}
.pp-elus li{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;padding:8px 10px;background:#fff;border:2.5px solid var(--line,#26076D);border-radius:12px}
.pp-elus img,.pp-elus .pp-emb{width:44px;height:44px;object-fit:cover;border-radius:8px}
.pp-elus small,.pp-membres+small{display:block;font:600 .68rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#4E3D7C)}
.pp-elus b{display:block;line-height:1.2}
.pp-membres{display:grid;grid-template-columns:repeat(auto-fill,minmax(58px,1fr));gap:8px 4px;margin:12px 0 0;padding:0;list-style:none}
.pp-membres li{display:grid;justify-items:center;gap:2px;font-size:.72rem;font-weight:700;text-align:center;overflow-wrap:anywhere}
.pp-membres .pp-av{width:46px}
.pp-devises{display:grid;gap:6px}
.pp-dev{position:relative;display:block;margin:0!important;cursor:pointer;text-transform:none!important;letter-spacing:0!important}
.pp-dev span{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:#fff;color:var(--on-surface,#26076D);border:2.5px solid var(--line,#26076D);border-radius:12px;font:700 .9rem/1.2 var(--display,sans-serif)}
.pp-dev em{flex:0 0 auto;font:600 .68rem var(--mono,monospace);font-style:normal;white-space:nowrap}
.pp-dev input:checked+span{background:var(--mu,#ECD567);box-shadow:3px 3px 0 var(--shadow,#26076D)}
.pp-dev input:focus-visible+span{outline:3px solid var(--line,#26076D);outline-offset:3px}
.pp label[for]{display:block;margin:14px 0 5px}
.pp-jeu{display:block;width:100%;min-height:46px;font:700 1rem var(--display,sans-serif);color:var(--on-surface,#26076D);background:#fff;border:2.5px solid var(--line,#26076D);border-radius:12px;padding:8px 10px}
@media(max-width:380px){.pp-apercu{width:96px}.pp-top{gap:10px}.pp-opts{gap:5px}.pp-opt span{padding:6px 0 5px;font-size:.6rem;letter-spacing:-.01em}.pp-opt span svg,.pp-opt span i{width:34px;height:34px}.pp-carte .pp-apercu{width:84px}}
@media(prefers-reduced-motion:reduce){.pp-pop{animation:none}.pp-opt input:checked+span{transform:none}}`;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  /* Fiche d'identification, dessinée dans `el`.
     o.pseudo : nom affiché ; o.avatar : avatar actuel, s'il existe ; o.brigade : brigade déjà tirée, s'il y en a une.
     o.enregistrer(avatar) : promesse de { ok: true, brigade, effectif } ou { ok: false, message } ; c'est le serveur qui tire.
     o.renommer(pseudo) : en retouche seulement, promesse de { ok: true } ou { ok: false, message } pour changer de pseudo.
     o.onFin() : la fiche est refermée (validée ou abandonnée). */
  function fiche(el, o) {
    const retouche = Array.isArray(o.avatar) && o.brigade !== undefined;
    let a = o.avatar ? sain(o.avatar) : [Math.floor(Math.random() * COULEURS.length), 0, 0], occupe = false;
    const q = s => el.querySelector(s);
    const groupe = (k, titre, liste) => '<fieldset class="pp-set"><legend>' + titre + '</legend><div class="pp-opts">'
      + liste.map((x, i) => '<label class="pp-opt"><input class="pp-vh" type="radio" name="pp' + k + '" value="' + i + '"' + (a[k] === i ? " checked" : "") + '><span data-k="' + k + '" data-i="' + i + '"></span></label>').join("") + "</div></fieldset>";
    el.innerHTML = '<div class="pp"><p class="ap-m">Fiche d\'identification · ' + (retouche ? "retouche" : "avant la première prise") + "</p>"
      + '<h3 tabindex="-1" id="ppTitre">' + (retouche ? "Retoucher ma fiche" : "Composez votre avatar, " + h(o.pseudo)) + "</h3>"
      + (retouche ? "" : '<p class="eg-d">Pas de lot sans étiquette : avant d\'ouvrir votre première porte, composez votre meeple. Le serveur vous affectera ensuite à l\'une des cinq brigades.</p>')
      + '<div class="pp-top"><div class="pp-apercu" id="ppApercu"></div><div><p class="pp-desc" id="ppDesc" role="status"></p>'
      + '<button class="go" type="button" id="ppHasard">Au hasard</button></div></div>'
      + '<form id="ppForm" novalidate>'
      + (retouche && o.renommer ? '<label for="ppPseudo">Pseudo ou prénom</label><input class="pp-jeu" id="ppPseudo" type="text" autocomplete="off" maxlength="24" value="' + h(o.pseudo) + '">'
        + '<p class="eg-hint">Un seul mot, de 2 à 24 lettres. Vos réponses, votre avatar et votre brigade vous suivent sous le nouveau nom.</p>' : "")
      + groupe(0, "Couleur", COULEURS) + groupe(1, "Coiffe", COIFFES) + groupe(2, "Accessoire", ACCESSOIRES)
      + '<p class="eg-hint">' + (retouche ? "Votre brigade ne change pas : seuls le pseudo et l'avatar se retouchent."
        : "La brigade est tirée au sort par le serveur, pour des effectifs équilibrés : elle est définitive. L'avatar, lui, se retouche quand vous voulez.") + "</p>"
      + '<p class="eg-msg err" id="ppMsg" role="status"></p>'
      + '<p class="pp-fin"><button class="go main" type="submit" id="ppOk">' + (retouche ? "Enregistrer ma fiche" : "Valider ma fiche et tirer ma brigade") + "</button>"
      + '<button class="linkbtn" type="button" id="ppNon">' + (retouche ? "Annuler" : "Plus tard") + "</button></p></form></div>";

    const peindre = () => {
      q("#ppApercu").innerHTML = avatar(a, { brigade: o.brigade });
      q("#ppDesc").textContent = decrire(a) + ".";
      el.querySelectorAll(".pp-opt span").forEach(s => {
        const k = Number(s.dataset.k), i = Number(s.dataset.i);
        const nom = [COULEURS, COIFFES, ACCESSOIRES][k][i].nom;
        s.innerHTML = (k === 0 ? '<i style="background:' + COULEURS[i].c + '"></i>' : avatar(k === 1 ? [a[0], i, 0] : [a[0], 0, i])) + h(nom);
      });
    };
    peindre();
    q("#ppTitre").focus({ preventScroll: true });

    q("#ppForm").addEventListener("change", e => {
      const m = /^pp(\d)$/.exec(e.target.name || "");
      if (!m) return;
      a[Number(m[1])] = Number(e.target.value);
      a = sain(a);
      peindre();
    });
    q("#ppHasard").addEventListener("click", () => {
      a = [COULEURS, COIFFES, ACCESSOIRES].map(l => Math.floor(Math.random() * l.length));
      a.forEach((v, k) => { el.querySelector('input[name="pp' + k + '"][value="' + v + '"]').checked = true; });
      peindre();
    });
    q("#ppNon").addEventListener("click", () => o.onFin());
    q("#ppForm").addEventListener("submit", async e => {
      e.preventDefault();
      if (occupe) return;
      occupe = true; q("#ppOk").disabled = true;
      q("#ppMsg").textContent = "";
      let r;
      const champ = q("#ppPseudo"), neuf = champ ? champ.value.trim().replace(/’/g, "'") : "";
      if (champ && neuf !== o.pseudo) {
        if (!(neuf.length >= 2 && neuf.length <= 24 && /^\p{L}+(?:[-']\p{L}+)*$/u.test(neuf))) r = { ok: false, message: "Un pseudo ou un prénom en un seul mot, de 2 à 24 lettres, sans espace ni chiffre." };
        else { try { r = await o.renommer(neuf); } catch (x) { r = null; } if (r && r.ok) o.pseudo = neuf; }
        if (!r || !r.ok) {
          occupe = false; q("#ppOk").disabled = false;
          q("#ppMsg").textContent = (r && r.message) || "Le pseudo n'a pas pu être changé : le serveur ne répond pas. Réessayez dans un instant.";
          return;
        }
      }
      try { r = await o.enregistrer(a.slice()); } catch (x) { r = null; }
      if (!r || !r.ok) {
        occupe = false; q("#ppOk").disabled = false;
        q("#ppMsg").textContent = (r && r.message) || "La fiche n'est pas partie : le serveur ne répond pas. Réessayez dans un instant.";
        return;
      }
      if (retouche) return o.onFin("Fiche retouchée et enregistrée.");
      const B = BRIGADES[r.brigade];
      if (!B) return o.onFin();
      el.innerHTML = '<div class="pp"><p class="ap-m">Affectation · tirage équilibré par le serveur</p><h3 tabindex="-1" id="ppTitre">' + h(B.nom) + "</h3>"
        + '<div class="pp-carte" style="background:' + B.fond + '"><div class="pp-apercu pp-pop">' + avatar(a, { brigade: r.brigade }) + "</div>"
        + "<div>" + emblemeSvg(r.brigade) + "<b>" + h(o.pseudo) + "</b><small>" + h(B.nom) + (r.effectif ? " · " + r.effectif + (r.effectif > 1 ? " membres" : " membre") : "") + "</small></div></div>"
        + '<p class="eg-d">Fiche validée, lot identifié. Vous jouez toujours pour vous, et vos points comptent aussi dans la moyenne de votre brigade.</p>'
        + '<button class="go main" type="button" id="ppFin">Retour au calendrier</button></div>';
      q("#ppFin").addEventListener("click", () => o.onFin());
      q("#ppTitre").focus({ preventScroll: true });
    });
  }

  /* Carnet de brigade, dessiné dans `el` : les membres, la devise et le jeu emblème élus, et le vote tant qu'il est ouvert.
     o.pseudo ; o.brigade : numéro ; o.ligne : la ligne de la brigade envoyée par le serveur { n, devise, jeux, voix } ;
     o.membres : [ { p, a } ] ; o.moi : { d, g } mes voix ; o.choix : { etat: "ouvert" | "fige" | "avenir", ferme: "AAAA-MM-JJ" } ;
     o.jeux : jeux du catalogue [ { n, c, img } ] et o.familles : { c: { n, o } } ;
     o.voter({ devise, jeu }) : promesse de { ok: true, ligne, moi } ou { ok: false, message } ; o.onFin(). */
  function brigade(el, o) {
    const B = BRIGADES[o.brigade], q = s => el.querySelector(s), jeux = o.jeux || [], parNom = new Map(jeux.map(g => [g.n, g]));
    let ligne = o.ligne || {}, moi = o.moi || {}, occupe = false;
    const pl = (n, un, des) => n + " " + (n > 1 ? des : un);
    function peindre(msg) {
      const ouvert = o.choix && o.choix.etat === "ouvert", voix = ligne.voix || { d: {}, g: {} };
      const jeu = parNom.get((ligne.jeux || []).find(n => parNom.has(n))), [a, m, j] = ((o.choix && o.choix.ferme) || "2026-12-07").split("-").map(Number);
      const fam = o.familles || {}, cats = [...new Set(jeux.map(g => g.c))].sort((x, y) => ((fam[x] || {}).o || 0) - ((fam[y] || {}).o || 0));
      const cites = Object.keys(voix.g).filter(n => parNom.has(n)).sort((x, y) => voix.g[y] - voix.g[x] || x.localeCompare(y, "fr"));
      el.innerHTML = '<div class="pp"><p class="ap-m">Carnet de brigade · ' + pl(ligne.n || 0, "membre", "membres") + '</p><h3 tabindex="-1" id="ppTitre">' + emblemeSvg(o.brigade) + " " + h(B.nom) + "</h3>"
        + '<ul class="pp-elus"><li>' + emblemeSvg(o.brigade) + "<span><small>Devise</small><b>" + (ligne.devise !== undefined && DEVISES[ligne.devise] ? "« " + h(DEVISES[ligne.devise]) + " »" : "Pas encore de devise") + "</b></span></li>"
        + "<li>" + (jeu && jeu.img ? '<img src="img/' + h(jeu.img) + '" alt="">' : emblemeSvg(o.brigade)) + "<span><small>Jeu emblème</small><b>" + (jeu ? h(jeu.n) : "Pas encore de jeu emblème") + "</b></span></li></ul>"
        + '<ul class="pp-membres">' + (o.membres || []).map(x => "<li>" + avatar(x.a, { brigade: o.brigade }) + h(x.p) + "</li>").join("") + "</ul>"
        + (ouvert ? '<form id="ppVote" novalidate><fieldset class="pp-set"><legend>Ma voix pour la devise</legend><div class="pp-devises">'
          + DEVISES.map((t, i) => '<label class="pp-dev"><input class="pp-vh" type="radio" name="ppDevise" value="' + i + '"' + (moi.d === i ? " checked" : "") + "><span>" + h(t) + (voix.d[i] ? "<em>" + pl(voix.d[i], "voix", "voix") + "</em>" : "") + "</span></label>").join("") + "</div></fieldset>"
          + '<fieldset class="pp-set"><legend><label for="ppJeu" style="margin:0;font:inherit;color:inherit">Ma voix pour le jeu emblème</label></legend><select class="pp-jeu" id="ppJeu"><option value="">Choisir un jeu du catalogue</option>'
          + cats.map(c => '<optgroup label="' + h((fam[c] || {}).n || c) + '">' + jeux.filter(g => g.c === c).sort((x, y) => x.n.localeCompare(y.n, "fr")).map(g => '<option value="' + h(g.n) + '"' + (moi.g === g.n ? " selected" : "") + ">" + h(g.n) + "</option>").join("") + "</optgroup>").join("") + "</select>"
          + (cites.length ? '<p class="eg-hint">Déjà cités : ' + cites.map(n => h(n) + " (" + voix.g[n] + ")").join(", ") + ".</p>" : "") + "</fieldset>"
          + '<p class="eg-hint">L\'option la plus soutenue par la brigade s\'affiche. Votre voix se modifie jusqu\'au ' + j + (j === 1 ? "er" : "") + " " + ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][m - 1] + " à minuit ; ensuite, devise et jeu emblème sont scellés.</p>"
          : '<p class="eg-hint">' + (o.choix && o.choix.etat === "fige" ? "Devise et jeu emblème sont scellés depuis la fin de la première semaine." : "Le vote de la devise et du jeu emblème est encore sous scellé.") + "</p>")
        + '<p class="eg-msg ok" id="ppMsg" role="status">' + h(msg || "") + "</p>"
        + '<p class="pp-fin">' + (ouvert ? '<button class="go main" type="submit" id="ppOk">Enregistrer ma voix</button>' : "") + '<button class="' + (ouvert ? "linkbtn" : "go main") + '" type="button" id="ppNon">Retour au calendrier</button></p>'
        + (ouvert ? "</form>" : "") + "</div>";
      q("#ppNon").addEventListener("click", () => o.onFin());
      if (!ouvert) return;
      q("#ppVote").addEventListener("submit", async e => {
        e.preventDefault();
        if (occupe) return;
        const r0 = q('input[name="ppDevise"]:checked'), g = q("#ppJeu").value, envoi = {};
        if (r0) envoi.devise = Number(r0.value);
        if (g) envoi.jeu = g;
        const dit = (t, cls) => { q("#ppMsg").textContent = t; q("#ppMsg").className = "eg-msg " + cls; };
        if (!r0 && !g) return dit("Choisissez une devise ou un jeu emblème avant d'enregistrer.", "err");
        occupe = true; q("#ppOk").disabled = true;
        let r;
        try { r = await o.voter(envoi); } catch (x) { r = null; }
        occupe = false;
        if (!r || !r.ok) { q("#ppOk").disabled = false; return dit((r && r.message) || "La voix n'est pas partie : le serveur ne répond pas. Réessayez dans un instant.", "err"); }
        ligne = r.ligne || ligne; moi = r.moi || moi;
        peindre("Voix enregistrée. La brigade vous remercie.");
        q("#ppMsg").scrollIntoView({ block: "nearest" });
      });
    }
    peindre();
    q("#ppTitre").focus({ preventScroll: true });
  }

  window.PharmacoParticipants = { COULEURS, COIFFES, ACCESSOIRES, BRIGADES, DEVISES, avatar, embleme: emblemeSvg, decrire, fiche, brigade };
})();
