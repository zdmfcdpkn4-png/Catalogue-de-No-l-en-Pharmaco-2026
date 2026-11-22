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
  const EC = E.replace('#fff', "currentColor"), EN = E.replace('#fff', "none"); // rempli de la teinte de la brigade, ou trait seul
  // Les trente emblèmes proposés au vote des brigades (serveur : NB_EMBLEMES). Les cinq premiers sont ceux d'origine.
  const EMBLEMES = [
    { nom: "flacon", d: '<rect x="6" y="9" width="12" height="13" rx="2.5" ' + E + '/><rect x="9" y="5" width="6" height="4" ' + E + '/><rect x="7.5" y="2" width="9" height="3.5" rx="1" ' + EC + '/><path d="M7 15h10v4.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5z" fill="currentColor"/>' },
    { nom: "seringue", d: '<g transform="rotate(45 12 12)"><path d="M12 1v3M9 1h6M12 18v5" ' + EN + '/><rect x="8.5" y="4.5" width="7" height="13" rx="1" ' + E + '/><rect x="9.5" y="10" width="5" height="6.5" fill="currentColor"/></g>' },
    { nom: "poche", d: '<path d="M12 1.5v3M12 19v3.5" ' + EN + '/><rect x="5.5" y="4.5" width="13" height="15" rx="3.5" ' + E + '/><path d="M6.5 11h11v5a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 16z" fill="currentColor"/>' },
    { nom: "gélule", d: '<g transform="rotate(-40 12 12)"><rect x="2" y="7" width="20" height="10" rx="5" ' + E + '/><path d="M12 7h5a5 5 0 0 1 0 10h-5z" fill="currentColor" stroke="' + L + '" stroke-width="2"/></g>' },
    { nom: "ampoule", d: '<path d="M10 1.5h4v4l-1.2 2 1.2 2.5c2 1 3 2 3 4.5V20a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 20v-5.5c0-2.5 1-3.5 3-4.5l1.2-2.5L10 5.5z" ' + E + '/><path d="M8 15h8v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20z" fill="currentColor"/>' },
    { nom: "dé", d: '<rect x="3.5" y="3.5" width="17" height="17" rx="4" ' + EC + '/><circle cx="8.5" cy="8.5" r="1.7" fill="' + L + '"/><circle cx="12" cy="12" r="1.7" fill="' + L + '"/><circle cx="15.5" cy="15.5" r="1.7" fill="' + L + '"/>' },
    { nom: "meeple", d: '<g transform="translate(2.2 2.2) scale(.196)"><path d="M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z" fill="currentColor" stroke="' + L + '" stroke-width="10" stroke-linejoin="round"/></g>' },
    { nom: "étoile", d: '<path d="M12 2.2l2.9 6 6.6.9-4.8 4.6 1.2 6.500L12 17.100l-5.9 3.1 1.2-6.500L2.5 9.100l6.6-.900z" ' + EC + '/>' },
    { nom: "goutte", d: '<path d="M12 2.5c4 5 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.5 8 7.5 12 2.500z" ' + EC + '/><path d="M9 14.500a3 3 0 0 0 3 3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' },
    { nom: "sablier", d: '<path d="M7 3h10v3.500L13.5 12 17 17.500V21H7v-3.500L10.5 12 7 6.500z" ' + E + '/><path d="M8.5 19.500h7L12 15zM10 7h4l-2 3z" fill="currentColor"/><path d="M5.5 3h13M5.5 21h13" ' + EN + '/>' },
    { nom: "mortier", d: '<path d="M15 9l4.5-6.5" fill="none" stroke="' + L + '" stroke-width="3.4" stroke-linecap="round"/><path d="M3.5 10h17c0 5.5-3.5 9-8.5 9s-8.5-3.5-8.5-9z" ' + EC + '/><path d="M8.5 21.500h7" ' + EN + '/>' },
    { nom: "sapin", d: '<rect x="10.5" y="18.5" width="3" height="3.5" ' + E + '/><path d="M12 2l4.5 5.500h-2.200l4 5h-2.600l4.3 6H4l4.3-6H5.700l4-5H7.500z" ' + EC + '/>' },
    { nom: "pipette", d: '<g transform="rotate(40 12 12)"><rect x="10" y="1.5" width="4" height="5.5" rx="2" ' + EC + '/><rect x="9" y="7" width="6" height="9" rx="1" ' + E + '/><path d="M12 16v6.5" ' + EN + '/><rect x="10" y="11" width="4" height="4" fill="currentColor"/></g>' },
    { nom: "balance", d: '<path d="M12 4v15.5M7 20.5h10M4.5 6.5h15" ' + EN + '/><path d="M4.5 7l-3 6h6zM19.5 7l-3 6h6z" ' + EC + '/>' },
    { nom: "bécher", d: '<path d="M7 3v15a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V3z" ' + E + '/><path d="M8 12h8v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" fill="currentColor"/><path d="M5.5 3h13" ' + EN + '/>' },
    { nom: "comprimé", d: '<circle cx="12" cy="12" r="9" ' + EC + '/><path d="M6.5 12h11" stroke="' + L + '" stroke-width="2" stroke-linecap="round"/>' },
    { nom: "croix", d: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" ' + EC + '/>' },
    { nom: "cœur", d: '<path d="M12 20.5C5 15.5 2.5 12 2.5 8.5A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 9.5 1.5c0 3.5-2.5 7-9.5 12z" ' + EC + '/>' },
    { nom: "trèfle", d: '<path d="M12 12v9.5M9.5 21.5h5" ' + EN + '/><circle cx="12" cy="6.5" r="4" ' + EC + '/><circle cx="6.8" cy="13" r="4" ' + EC + '/><circle cx="17.2" cy="13" r="4" ' + EC + '/>' },
    { nom: "pique", d: '<path d="M12 15v6.5M9.5 21.5h5" ' + EN + '/><path d="M12 2.5c4 4.5 8 7 8 11a4 4 0 0 1-8 1 4 4 0 0 1-8-1c0-4 4-6.5 8-11z" ' + EC + '/>' },
    { nom: "carreau", d: '<path d="M12 2l7.5 10L12 22 4.5 12z" ' + EC + '/>' },
    { nom: "carte", d: '<rect x="5" y="2.5" width="14" height="19" rx="2.5" ' + E + '/><path d="M12 7.5l3.2 4.5-3.2 4.5L8.800 12z" fill="currentColor"/>' },
    { nom: "pion", d: '<path d="M9 11h6l1.5 7.5h-9z" ' + EC + '/><circle cx="12" cy="6.5" r="4" ' + EC + '/><rect x="6" y="18.5" width="12" height="3" rx="1" ' + EC + '/>' },
    { nom: "cadeau", d: '<path d="M12 8.5c-4-6-7-1-2.5 0M12 8.500c4-6 7-1 2.500 0" ' + E + '/><rect x="3.5" y="9" width="17" height="12" rx="1.5" ' + EC + '/><path d="M12 9v12M3.500 14h17" stroke="' + L + '" stroke-width="2"/>' },
    { nom: "flocon", d: '<path d="M12 2.5v19M3.800 7.200l16.400 9.600M3.800 16.800l16.400-9.600" fill="none" stroke="' + L + '" stroke-width="5.500" stroke-linecap="round"/><path d="M12 2.500v19M3.800 7.200l16.400 9.600M3.800 16.800l16.400-9.600" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"/>' },
    { nom: "cloche", d: '<circle cx="12" cy="20.300" r="1.800" ' + E + '/><path d="M12 3a6 6 0 0 0-6 6v5l-2.500 4h17L18 14V9a6 6 0 0 0-6-6z" ' + EC + '/>' },
    { nom: "bonnet", d: '<path d="M4 17C5 8 10 3.500 19 4.500c-2.500 2-3.500 6-3 12.500z" ' + EC + '/><rect x="2.500" y="16.500" width="15.500" height="4.500" rx="2.250" ' + E + '/><circle cx="20" cy="5" r="2.300" ' + E + '/>' },
    { nom: "couronne", d: '<path d="M3.500 18.500l-1-11 5.500 4.500L12 5l4 7 5.500-4.500-1 11z" ' + EC + '/>' },
    { nom: "trophée", d: '<path d="M7 5H3.500c0 3 1.500 5 4 5M17 5h3.500c0 3-1.500 5-4 5M12 14v4M8 21h8M9.500 18h5" ' + EN + '/><path d="M7 3h10v6a5 5 0 0 1-10 0z" ' + EC + '/>' },
    { nom: "sucre d'orge", d: '<path d="M9 21V8.500a4.500 4.500 0 0 1 9 0V10" fill="none" stroke="' + L + '" stroke-width="6.500" stroke-linecap="round"/><path d="M9 21V8.500a4.500 4.500 0 0 1 9 0V10" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round"/><path d="M9 21V8.500a4.500 4.500 0 0 1 9 0V10" fill="none" stroke="currentColor" stroke-width="3.500" stroke-dasharray="3 3.500"/>' },
  ];
  // Noms proposés au vote des brigades. Un membre peut aussi proposer le sien : pour le serveur, un nom est un texte,
  // et deux brigades ne peuvent pas porter le même (accents et casse ignorés). Un emblème non plus.
  const NOMS = [
    "Brigade des Flacons", "Brigade des Seringues", "Brigade des Poches", "Brigade des Gélules", "Brigade des Ampoules",
    "Brigade des Meeples Stériles", "Brigade des As de la Paillasse", "Brigade du Double Contrôle", "Brigade des Dés Calibrés", "Brigade des Fines Gouttes",
    "Brigade Sans Particule", "Brigade des Lots Gagnants", "Brigade de la Dream Hotte", "Brigade des Pions Libérés", "Brigade des Jokers de Garde",
    "Brigade des Pipettes", "Brigade des Mortiers", "Brigade des Balances", "Brigade des Isolateurs", "Brigade des Étiquettes",
    "Brigade des Scellés", "Brigade des Cartes Maîtresses", "Brigade des Bons Dosages", "Brigade de la Zone Blanche", "Brigade des Lutins Stériles",
    "Brigade des Rennes Pressés", "Brigade du Grand Chelem", "Brigade du Coup d'Avance", "Brigade des Atouts Maîtres", "Brigade des Petits Chevaux",
  ];
  // Nom court d'une brigade, pour les endroits étroits : le nom sans son « Brigade des ».
  const court = n => String(n).replace(/^Brigade\s+(?:des\s+|du\s+|de\s+la\s+|de\s+l'|d'|de\s+)?/i, "") || String(n);
  const cle = n => String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
  // Les cinq brigades. Elles sont tirées sans nom : « Brigade 1 » à « Brigade 5 », avec un jeton numéroté pour emblème,
  // jusqu'à ce que leurs membres votent. maj() y reporte le nom et l'emblème attribués par le serveur : tout ce qui lit
  // BRIGADES[b].nom, .court ou embleme(b) suit sans rien changer. Seules la teinte (c) et sa version claire (fond) sont fixes.
  const jeton = b => '<circle cx="12" cy="12" r="9.5" ' + EC + '/><text x="12" y="16.4" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="' + L + '">' + (b + 1) + "</text>";
  const BRIGADES = [["#4FB286", "#CDEBDD"], ["#5AA9E6", "#D3E8F8"], ["#F2A0C4", "#FBDDEA"], ["#ECD567", "#F8EFC0"], ["#EC7739", "#F9D6C0"]]
    .map((x, b) => ({ nom: "Brigade " + (b + 1), court: "Brigade " + (b + 1), c: x[0], fond: x[1], d: jeton(b), img: "jeton-" + (b + 1) }));
  function maj(lignes) {
    (lignes || []).forEach(t => {
      const B = BRIGADES[t.b], N = typeof t.titre === "string" && t.titre ? t.titre : "", M = EMBLEMES[t.embleme];
      if (!B) return;
      B.nom = N || "Brigade " + (t.b + 1); B.court = N ? court(N) : B.nom; B.d = M ? M.d : jeton(t.b); B.img = M ? IMAGES[t.embleme] : "jeton-" + (t.b + 1);
    });
  }
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
  // Emblème d'une brigade : l'autocollant illustré (img/emblemes), ou à défaut le dessin au trait ci-dessus.
  // Les images portent le même ordre que EMBLEMES ; « jeton-N » est le jeton numéroté d'une brigade encore sans emblème.
  const IMAGES = ["flacon", "seringue", "poche", "gelule", "ampoule", "de", "meeple", "etoile", "goutte", "sablier", "mortier", "sapin", "pipette", "balance", "becher",
    "comprime", "croix", "coeur", "trefle", "pique", "carreau", "carte", "pion", "cadeau", "flocon", "cloche", "bonnet", "couronne", "trophee", "sucre-d-orge"];
  const image = (nom, cls, attr) => '<img class="' + cls + '" src="img/emblemes/' + nom + '.webp" alt="" loading="lazy" decoding="async" ' + attr + ' onerror="window.PharmacoParticipants&&PharmacoParticipants.secours(this)">';
  const trait = (b, cls) => { const B = BRIGADES[b]; return B ? '<svg class="' + (cls || "pp-emb") + '" viewBox="0 0 24 24" aria-hidden="true" style="color:' + B.c + '">' + B.d + "</svg>" : ""; };
  const emblemeSvg = (b, cls) => (BRIGADES[b] ? image(BRIGADES[b].img, cls || "pp-emb", 'data-b="' + b + '"') : "");
  // Une image qui ne se charge pas laisse la place au dessin au trait : l'emblème reste lisible.
  function secours(el) {
    const e = EMBLEMES[el.dataset.e];
    el.outerHTML = e ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + e.d + "</svg>" : trait(Number(el.dataset.b), el.className);
  }

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
.pp-tirage video{display:block;width:100%;max-height:60vh;margin-top:10px;background:#FFFBF2;border:3px solid var(--line,#26076D);border-radius:16px}
.pp-vote{margin-top:12px;border:2.5px solid var(--line,#26076D);border-radius:14px;background:#fff}
.pp-vote>summary{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:44px;padding:6px 12px;font-weight:800;cursor:pointer;list-style:none}
.pp-vote>summary::-webkit-details-marker{display:none}
.pp-vote>summary small{font:600 .68rem var(--mono,monospace);letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#4E3D7C);text-align:right}
.pp-vote[open]>summary{border-bottom:2.5px solid var(--line,#26076D)}
.pp-vote>div{padding:10px}
.pp-vote .pp-opt span svg{color:var(--pp-c,#26076D)}
.pp-vote .pp-opts{grid-template-columns:repeat(auto-fill,minmax(74px,1fr))}
.pp-vote .pp-opt span img,.pp-vote .pp-opt span svg{display:block;width:58px;height:58px}
img.pp-emb,.pp-elus img.pp-emb{object-fit:contain;border-radius:0}
.pp-carte img.pp-emb{width:52px;height:52px}
h3 img.pp-emb{width:1.7em;height:1.7em;vertical-align:-.45em}
.pp-brig img.pp-emb{width:28px;height:28px}
.eg-rank img.eg-emb{width:26px;height:26px}
.eg-brig summary img.eg-emb{width:36px;height:36px}
.pp-opt span em{font:600 .58rem/1.1 var(--mono,monospace);font-style:normal}
@media(max-width:380px){.pp-apercu{width:96px}.pp-top{gap:10px}.pp-opts{gap:5px}.pp-opt span{padding:6px 0 5px;font-size:.6rem;letter-spacing:-.01em}.pp-opt span svg,.pp-opt span i{width:34px;height:34px}.pp-carte .pp-apercu{width:84px}}
@media(prefers-reduced-motion:reduce){.pp-pop{animation:none}.pp-opt input:checked+span{transform:none}}`;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  /* Fiche d'identification, dessinée dans `el`.
     o.pseudo : nom affiché ; o.avatar : avatar actuel, s'il existe ; o.brigade : brigade déjà tirée, s'il y en a une.
     o.enregistrer(avatar) : promesse de { ok: true, brigade, effectif } ou { ok: false, message } ; c'est le serveur qui tire.
     o.renommer(pseudo) : en retouche seulement, promesse de { ok: true } ou { ok: false, message } pour changer de pseudo.
     o.choisirPseudo : à la création, la fiche demande aussi le pseudo (entrée par la liste des participants) ; o.nom est alors
       le nom choisi dans la liste, o.pseudo la suggestion, et enregistrer(avatar, pseudo) reçoit le pseudo retenu.
     o.onFin() : la fiche est refermée (validée ou abandonnée). */
  // Vidéo générique du tirage, jouée entre la validation de la fiche et la révélation de la brigade. Tant que `src` est
  // vide, ou si la vidéo ne se charge pas, ne démarre pas ou dure trop, ou si le joueur préfère moins de mouvement,
  // la révélation suit sans attendre. Fond crème : la vidéo se termine sur un flash de cette teinte.
  const tirage = { src: "video/tirage-brigade.mp4", attente: 12000 };
  function jouerTirage(el, suite) {
    let fait = false;
    const fin = () => { if (!fait) { fait = true; clearTimeout(garde); suite(); } };
    let garde = 0;
    if (!tirage.src || (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches)) return fin();
    el.innerHTML = '<div class="pp pp-tirage"><p class="ap-m">Tirage de la brigade</p><video id="ppVideo" muted playsinline preload="auto" aria-label="Animation du tirage au sort de la brigade"></video>'
      + '<button class="linkbtn" type="button" id="ppPasser">Passer l\'animation</button></div>';
    const v = el.querySelector("#ppVideo");
    garde = setTimeout(fin, tirage.attente);
    v.addEventListener("ended", fin); v.addEventListener("error", fin);
    el.querySelector("#ppPasser").addEventListener("click", fin);
    v.src = tirage.src;
    const p = v.play();
    if (p && p.catch) p.catch(fin);
  }
  function fiche(el, o) {
    const retouche = Array.isArray(o.avatar) && o.brigade !== undefined;
    let a = o.avatar ? sain(o.avatar) : [Math.floor(Math.random() * COULEURS.length), 0, 0], occupe = false;
    const q = s => el.querySelector(s);
    const groupe = (k, titre, liste) => '<fieldset class="pp-set"><legend>' + titre + '</legend><div class="pp-opts">'
      + liste.map((x, i) => '<label class="pp-opt"><input class="pp-vh" type="radio" name="pp' + k + '" value="' + i + '"' + (a[k] === i ? " checked" : "") + '><span data-k="' + k + '" data-i="' + i + '"></span></label>').join("") + "</div></fieldset>";
    el.innerHTML = '<div class="pp"><p class="ap-m">Fiche d\'identification · ' + (retouche ? "retouche" : "avant la première prise") + "</p>"
      + '<h3 tabindex="-1" id="ppTitre">' + (retouche ? "Retoucher ma fiche" : "Composez votre avatar, " + h(o.choisirPseudo ? o.nom : o.pseudo)) + "</h3>"
      + (retouche ? "" : '<p class="eg-d">Pas de lot sans étiquette : avant d\'ouvrir votre première porte, composez votre meeple. Le serveur vous affectera ensuite à l\'une des cinq brigades.</p>')
      + '<div class="pp-top"><div class="pp-apercu" id="ppApercu"></div><div><p class="pp-desc" id="ppDesc" role="status"></p>'
      + '<button class="go" type="button" id="ppHasard">Au hasard</button></div></div>'
      + '<form id="ppForm" novalidate>'
      + (!retouche && o.choisirPseudo ? '<label for="ppPseudo">Votre pseudo au classement</label><input class="pp-jeu" id="ppPseudo" type="text" autocomplete="off" maxlength="24" value="' + h(o.pseudo || "") + '">'
        + '<p class="eg-hint">Un seul mot, de 2 à 24 lettres : votre prénom ou un nom de scène. Il se retouche ensuite quand vous voulez.</p>' : "")
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
      if (champ && !retouche) {
        if (!(neuf.length >= 2 && neuf.length <= 24 && /^\p{L}+(?:[-']\p{L}+)*$/u.test(neuf))) {
          occupe = false; q("#ppOk").disabled = false; champ.focus();
          q("#ppMsg").textContent = "Un pseudo en un seul mot, de 2 à 24 lettres, sans espace ni chiffre.";
          return;
        }
      } else if (champ && neuf !== o.pseudo) {
        if (!(neuf.length >= 2 && neuf.length <= 24 && /^\p{L}+(?:[-']\p{L}+)*$/u.test(neuf))) r = { ok: false, message: "Un pseudo ou un prénom en un seul mot, de 2 à 24 lettres, sans espace ni chiffre." };
        else { try { r = await o.renommer(neuf); } catch (x) { r = null; } if (r && r.ok) o.pseudo = neuf; }
        if (!r || !r.ok) {
          occupe = false; q("#ppOk").disabled = false;
          q("#ppMsg").textContent = (r && r.message) || "Le pseudo n'a pas pu être changé : le serveur ne répond pas. Réessayez dans un instant.";
          return;
        }
      }
      try { r = await o.enregistrer(a.slice(), champ && !retouche ? neuf : undefined); } catch (x) { r = null; }
      if (!r || !r.ok) {
        occupe = false; q("#ppOk").disabled = false;
        q("#ppMsg").textContent = (r && r.message) || "La fiche n'est pas partie : le serveur ne répond pas. Réessayez dans un instant.";
        return;
      }
      if (retouche) return o.onFin("Fiche retouchée et enregistrée.");
      if (champ) o.pseudo = neuf;
      const B = BRIGADES[r.brigade];
      if (!B) return o.onFin();
      jouerTirage(el, () => {
      el.innerHTML = '<div class="pp"><p class="ap-m">Affectation · tirage équilibré par le serveur</p><h3 tabindex="-1" id="ppTitre">' + h(B.nom) + "</h3>"
        + '<div class="pp-carte" style="background:' + B.fond + '"><div class="pp-apercu pp-pop">' + avatar(a, { brigade: r.brigade }) + "</div>"
        + "<div>" + emblemeSvg(r.brigade) + "<b>" + h(o.pseudo) + "</b><small>" + h(B.nom) + (r.effectif ? " · " + r.effectif + (r.effectif > 1 ? " membres" : " membre") : "") + "</small></div></div>"
        + '<p class="eg-d">Fiche validée, lot identifié. Vous jouez toujours pour vous, et vos points comptent aussi dans la moyenne de votre brigade. Son nom, son emblème, sa devise et son jeu emblème se votent entre membres : à vous de jouer.</p>'
        + '<p class="pp-fin"><button class="go main" type="button" id="ppFin">' + (o.versCarnet ? "Voter pour ma brigade" : "Retour au calendrier") + "</button>"
        + (o.versCarnet ? '<button class="linkbtn" type="button" id="ppPlusTard">Plus tard</button>' : "") + "</p></div>";
      q("#ppFin").addEventListener("click", () => (o.versCarnet ? o.versCarnet() : o.onFin()));
      if (o.versCarnet) q("#ppPlusTard").addEventListener("click", () => o.onFin());
      q("#ppTitre").focus({ preventScroll: true });
      });
    });
  }

  /* Carnet de brigade, dessiné dans `el` : les membres, les paramètres élus (nom, emblème, devise, jeu emblème) et le vote
     tant qu'il est ouvert.
     o.pseudo ; o.brigade : numéro ; o.ligne : la ligne de la brigade envoyée par le serveur { n, titre, embleme, devise, jeux, voix } ;
     o.lignes() : les lignes de toutes les brigades (pour signaler un nom ou un emblème retenu ailleurs) ;
     o.membres : [ { p, a } ] ; o.moi : { d, g, n, e } mes voix ; o.choix : { etat: "ouvert" | "fige" | "avenir", ferme: "AAAA-MM-JJ" } ;
     o.jeux : jeux du catalogue [ { n, c, img } ] et o.familles : { c: { n, o } } ;
     o.voter({ titre, embleme, devise, jeu }) : promesse de { ok: true, ligne, moi } ou { ok: false, message } ; o.onFin(). */
  function brigade(el, o) {
    const B = BRIGADES[o.brigade], q = s => el.querySelector(s), jeux = o.jeux || [], parNom = new Map(jeux.map(g => [g.n, g]));
    let ligne = o.ligne || {}, moi = o.moi || {}, occupe = false, ouvertes = null;
    const pl = (n, un, des) => n + " " + (n > 1 ? des : un);
    const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    function peindre(msg) {
      maj(o.lignes ? o.lignes() : [ligne]);
      const ouvert = o.choix && o.choix.etat === "ouvert", voix = Object.assign({ d: {}, g: {}, n: {}, e: {} }, ligne.voix);
      const jeu = parNom.get((ligne.jeux || []).find(n => parNom.has(n))), [a, m, j] = ((o.choix && o.choix.ferme) || "2026-12-10").split("-").map(Number);
      const quand = j + (j === 1 ? "er" : "") + " " + MOIS[m - 1];
      const fam = o.familles || {}, cats = [...new Set(jeux.map(g => g.c))].sort((x, y) => ((fam[x] || {}).o || 0) - ((fam[y] || {}).o || 0));
      const cites = Object.keys(voix.g).filter(n => parNom.has(n)).sort((x, y) => voix.g[y] - voix.g[x] || x.localeCompare(y, "fr"));
      // Noms et emblèmes retenus pour l'instant par une autre brigade.
      const autres = (o.lignes ? o.lignes() : []).filter(t => t.b !== o.brigade), ailleurs = k => new Set(autres.map(t => t[k]).filter(x => x !== undefined));
      const nomsPris = new Set([...ailleurs("titre")].map(cle)), emblPris = ailleurs("embleme");
      // Noms au vote : les trente proposés, puis ceux que des membres de la brigade ont ajoutés. Les voix sont comptées sans tenir compte des accents ni de la casse.
      const voixNom = {}; Object.keys(voix.n).forEach(t => { voixNom[cle(t)] = (voixNom[cle(t)] || 0) + voix.n[t]; });
      const ajoutes = Object.keys(voix.n).filter(t => !NOMS.some(x => cle(x) === cle(t))), auVote = NOMS.concat(ajoutes), monNom = moi.n === undefined ? "" : cle(moi.n);
      const note = (n, pris) => (n ? "<em>" + pl(n, "voix", "voix") + (pris ? " · retenu ailleurs" : "") + "</em>" : pris ? "<em>retenu ailleurs</em>" : "");
      // Sections du vote : celles que le joueur a ouvertes restent ouvertes ; au départ, la première où il n'a pas encore voté.
      const cles = ["n", "e", "d", "g"];
      if (!ouvertes) { const k0 = cles.find(k => moi[k] === undefined); ouvertes = new Set(k0 ? [k0] : []); }
      const section = (k, titre, resume, corps) => '<details class="pp-vote" data-k="' + k + '"' + (ouvertes.has(k) ? " open" : "") + "><summary><span>" + titre + "</span><small>" + resume + "</small></summary><div>" + corps + "</div></details>";
      const maVoix = (v, t) => (v === undefined ? "à voter" : "ma voix : " + t);
      el.innerHTML = '<div class="pp" style="--pp-c:' + B.c + '"><p class="ap-m">Carnet de brigade · ' + pl(ligne.n || 0, "membre", "membres") + '</p><h3 tabindex="-1" id="ppTitre">' + emblemeSvg(o.brigade) + " " + h(B.nom) + "</h3>"
        + '<ul class="pp-elus"><li>' + emblemeSvg(o.brigade) + "<span><small>Nom et emblème" + (ouvert ? " · provisoires" : "") + "</small><b>" + h(B.nom) + (ligne.titre === undefined ? " (pas encore de nom)" : "") + "</b></span></li>"
        + "<li>" + emblemeSvg(o.brigade) + "<span><small>Devise</small><b>" + (ligne.devise !== undefined && DEVISES[ligne.devise] ? "« " + h(DEVISES[ligne.devise]) + " »" : "Pas encore de devise") + "</b></span></li>"
        + "<li>" + (jeu && jeu.img ? '<img src="img/' + h(jeu.img) + '" alt="">' : emblemeSvg(o.brigade)) + "<span><small>Jeu emblème</small><b>" + (jeu ? h(jeu.n) : "Pas encore de jeu emblème") + "</b></span></li></ul>"
        + '<ul class="pp-membres">' + (o.membres || []).map(x => "<li>" + avatar(x.a, { brigade: o.brigade }) + h(x.p) + "</li>").join("") + "</ul>"
        + (ouvert ? '<form id="ppVote" novalidate>'
          + section("n", "Nom de la brigade", maVoix(moi.n, h(court(moi.n || ""))), '<div class="pp-devises" role="group" aria-label="Nom de la brigade">'
            + auVote.map((t, i) => '<label class="pp-dev"><input class="pp-vh" type="radio" name="ppNom" value="' + h(t) + '"' + (monNom === cle(t) ? " checked" : "") + "><span>" + h(t) + note(voixNom[cle(t)], nomsPris.has(cle(t))) + "</span></label>").join("") + "</div>"
            + '<label for="ppNomLibre">Ou proposer un autre nom</label><input class="pp-jeu" id="ppNomLibre" type="text" autocomplete="off" maxlength="40" placeholder="Brigade des…">'
            + '<p class="eg-hint">De 3 à 40 caractères, lettres et chiffres. Il s\'ajoute aux choix de votre brigade, et il est visible de tous : restez dans le ton, jamais moqueur.</p>')
          + section("e", "Emblème", maVoix(moi.e, EMBLEMES[moi.e] ? EMBLEMES[moi.e].nom : ""), '<div class="pp-opts" role="group" aria-label="Emblème de la brigade">'
            + EMBLEMES.map((t, i) => '<label class="pp-opt"><input class="pp-vh" type="radio" name="ppEmbleme" value="' + i + '"' + (moi.e === i ? " checked" : "") + '><span>' + image(IMAGES[i], "pp-img", 'data-e="' + i + '"') + h(t.nom) + note(voix.e[i], emblPris.has(i)) + "</span></label>").join("") + "</div>")
          + section("d", "Devise", maVoix(moi.d, "choisie"), '<div class="pp-devises" role="group" aria-label="Devise de la brigade">'
            + DEVISES.map((t, i) => '<label class="pp-dev"><input class="pp-vh" type="radio" name="ppDevise" value="' + i + '"' + (moi.d === i ? " checked" : "") + "><span>" + h(t) + note(voix.d[i]) + "</span></label>").join("") + "</div>")
          + section("g", "Jeu emblème", maVoix(moi.g, h(moi.g || "")), '<select class="pp-jeu" id="ppJeu" aria-label="Jeu emblème de la brigade"><option value="">Choisir un jeu du catalogue</option>'
            + cats.map(c => '<optgroup label="' + h((fam[c] || {}).n || c) + '">' + jeux.filter(g => g.c === c).sort((x, y) => x.n.localeCompare(y.n, "fr")).map(g => '<option value="' + h(g.n) + '"' + (moi.g === g.n ? " selected" : "") + ">" + h(g.n) + "</option>").join("") + "</optgroup>").join("") + "</select>"
            + (cites.length ? '<p class="eg-hint">Déjà cités : ' + cites.map(n => h(n) + " (" + voix.g[n] + ")").join(", ") + ".</p>" : ""))
          + '<p class="eg-hint">Chaque membre a une voix par rubrique, modifiable jusqu\'au ' + quand + " à minuit ; ensuite tout est scellé. Un nom ou un emblème ne peut être porté que par une seule brigade : il va à celle qui le soutient le plus, et la brigade devancée retombe sur son choix suivant. Sans voix, la brigade garde son numéro.</p>"
          : '<p class="eg-hint">' + (o.choix && o.choix.etat === "fige" ? "Nom, emblème, devise et jeu emblème sont scellés depuis le " + quand + "." : "Le vote de la brigade est encore sous scellé.") + "</p>")
        + '<p class="eg-msg ok" id="ppMsg" role="status">' + h(msg || "") + "</p>"
        + '<p class="pp-fin">' + (ouvert ? '<button class="go main" type="submit" id="ppOk">Enregistrer mes voix</button>' : "") + '<button class="' + (ouvert ? "linkbtn" : "go main") + '" type="button" id="ppNon">Retour au calendrier</button></p>'
        + (ouvert ? "</form>" : "") + "</div>";
      q("#ppNon").addEventListener("click", () => o.onFin());
      if (!ouvert) return;
      el.querySelectorAll(".pp-vote").forEach(d => d.addEventListener("toggle", () => { if (d.open) ouvertes.add(d.dataset.k); else ouvertes.delete(d.dataset.k); }));
      q("#ppVote").addEventListener("submit", async e => {
        e.preventDefault();
        if (occupe) return;
        const coche = n => { const x = q('input[name="' + n + '"]:checked'); return x ? Number(x.value) : undefined; };
        const libre = q("#ppNomLibre").value.replace(/\s+/g, " ").trim(), choisi = q('input[name="ppNom"]:checked');
        const envoi = { titre: libre || (choisi ? choisi.value : undefined), embleme: coche("ppEmbleme"), devise: coche("ppDevise"), jeu: q("#ppJeu").value || undefined };
        const dit = (t, cls) => { q("#ppMsg").textContent = t; q("#ppMsg").className = "eg-msg " + cls; };
        if (libre && !/^\p{L}[\p{L}\p{N} .'’-]{2,39}$/u.test(libre)) { ouvertes.add("n"); q("#ppNomLibre").focus(); return dit("Un nom de 3 à 40 caractères : des lettres, des chiffres, des espaces, sans autre signe.", "err"); }
        if (Object.values(envoi).every(x => x === undefined)) return dit("Choisissez au moins un nom, un emblème, une devise ou un jeu emblème avant d'enregistrer.", "err");
        occupe = true; q("#ppOk").disabled = true;
        let r;
        try { r = await o.voter(envoi); } catch (x) { r = null; }
        occupe = false;
        if (!r || !r.ok) { q("#ppOk").disabled = false; return dit((r && r.message) || "Les voix ne sont pas parties : le serveur ne répond pas. Réessayez dans un instant.", "err"); }
        ligne = r.ligne || ligne; moi = r.moi || moi;
        peindre("Voix enregistrées. La brigade vous remercie.");
        q("#ppMsg").scrollIntoView({ block: "nearest" });
      });
    }
    peindre();
    q("#ppTitre").focus({ preventScroll: true });
  }

  window.PharmacoParticipants = { COULEURS, COIFFES, ACCESSOIRES, BRIGADES, NOMS, EMBLEMES, DEVISES, tirage, maj, court, secours, avatar, embleme: emblemeSvg, decrire, fiche, brigade };
})();
