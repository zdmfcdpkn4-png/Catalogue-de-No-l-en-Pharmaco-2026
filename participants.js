/* Participants des Pharmacogames : l'avatar (un meeple à composer), les cinq brigades et la fiche d'identification.
   Chargé à la demande par enigme.js. Aucune photo, aucune donnée personnelle : un avatar n'est que quatre numéros
   [couleur, coiffe, accessoire, fleur], pris dans les listes fermées ci-dessous. Le serveur (api/enigme.js, AVATAR et
   NB_BRIGADES) valide ces numéros et tire seul la brigade : garder les longueurs des listes accordées avec lui.
   Ne jamais retirer ni réordonner un élément d'une liste (les avatars enregistrés pointent dessus) : ajouter à la fin. */
(() => {
  const h = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = "#26076D"; // trait du site

  const COULEURS = [
    { nom: "orange", c: "#EC7739" }, { nom: "jaune", c: "#ECD567" }, { nom: "rouge", c: "#DC4B4F" }, { nom: "rose", c: "#F2A0C4" },
    { nom: "vert", c: "#4FB286" }, { nom: "bleu", c: "#5AA9E6" }, { nom: "violet", c: "#9A7BE0" }, { nom: "crème", c: "#FFFBF2" },
    { nom: "turquoise", c: "#3CB4AC" }, { nom: "vert sapin", c: "#2F8F63" }, { nom: "bleu nuit", c: "#4257B8", sombre: true }, { nom: "lilas", c: "#E5B4D9" },
    { nom: "corail", c: "#F59A62" }, { nom: "pain d'épices", c: "#B9783A" }, { nom: "gris perle", c: "#C9CED6" }, { nom: "réglisse", c: "#4B3F72", sombre: true },
    { nom: "menthe", c: "#A8E6CF" }, { nom: "bleu ciel", c: "#BFE3F2" }, { nom: "or", c: "#E0B43C" }, { nom: "bordeaux", c: "#8E2F4F", sombre: true },
    { nom: "pêche", c: "#FFCBA4" }, { nom: "noir d'encre", c: "#2B2540", sombre: true },
    // Plusieurs couleurs : g (teintes), sens (h : bandes de haut en bas, v : de gauche à droite, d : en biais), doux (fondu).
    { nom: "arc-en-ciel", g: ["#DC4B4F", "#EC7739", "#ECD567", "#4FB286", "#5AA9E6", "#9A7BE0"], sens: "h" },
    { nom: "coucher de soleil", g: ["#ECD567", "#EC7739", "#F2A0C4", "#9A7BE0"], sens: "h", doux: true },
    { nom: "aurore boréale", g: ["#3CB4AC", "#5AA9E6", "#9A7BE0"], sens: "d", doux: true },
    { nom: "sucre d'orge", g: ["#DC4B4F", "#FFFBF2", "#DC4B4F", "#FFFBF2", "#DC4B4F", "#FFFBF2", "#DC4B4F", "#FFFBF2"], sens: "d" },
    { nom: "orange et violet", g: ["#EC7739", "#9A7BE0"], sens: "v" },
    { nom: "menthe-chocolat", g: ["#A8E6CF", "#8A5A34"], sens: "h" },
    { nom: "glace à l'eau", g: ["#F2A0C4", "#FFFBF2", "#5AA9E6"], sens: "h" },
    { nom: "bonbon", g: ["#F2A0C4", "#ECD567", "#5AA9E6", "#F2A0C4", "#ECD567", "#5AA9E6"], sens: "v" },
    { nom: "sapin enneigé", g: ["#FFFBF2", "#2F8F63"], sens: "h", doux: true },
    { nom: "feu de cheminée", g: ["#ECD567", "#EC7739", "#DC4B4F"], sens: "h", doux: true },
  ];
  // Teinte d'une couleur à plusieurs teintes : son dégradé SVG (remplissage du meeple) et son équivalent CSS (pastille du choix).
  const arrets = C => C.g.map((c, i) => (C.doux ? [[c, i / (C.g.length - 1)]] : [[c, i / C.g.length], [c, (i + 1) / C.g.length]])).flat();
  const degrade = (C, id) => '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="' + (C.sens === "h" ? 0 : 1) + '" y2="' + (C.sens === "v" ? 0 : 1) + '">' + arrets(C).map(([c, t]) => '<stop offset="' + Math.round(t * 1000) / 10 + '%" stop-color="' + c + '"/>').join("") + "</linearGradient></defs>";
  COULEURS.forEach(C => { if (C.g) C.c = "linear-gradient(" + (C.sens === "h" ? "180deg" : C.sens === "v" ? "90deg" : "135deg") + "," + arrets(C).map(([c, t]) => c + " " + Math.round(t * 1000) / 10 + "%").join(",") + ")"; });
  // La goutte du logo de l'unité (pointe en bas, longueur 100) : pétale des fleurs, des couronnes et des bouquets.
  const GOUTTE = "M0 0C-4-29-27-50-27-73A27 27 0 0 1 27-73C27-50 4-29 0 0Z";
  const LOGO = ["#26076D", "#EC7739", "#ECD567", "#E5B4D9"];
  const gouttes = (cx, cy, n, ech, ecart, trait) => Array.from({ length: n }, (_, k) => '<path transform="translate(' + cx + " " + cy + ") rotate(" + Math.round((k - (n - 1) / 2) * ecart) + ") scale(" + ech + ') translate(0 -22)" d="' + GOUTTE + '" fill="' + LOGO[(k + 1) % 4] + '" stroke="' + L + '" stroke-width="' + trait + '" stroke-linejoin="round"/>').join("");
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
    { nom: "bonnet à pompon", d: '<path d="M31 17c-2-15 7-25 19-25s21 10 19 25z" fill="#5AA9E6" ' + T + '/><rect x="27" y="11" width="46" height="10" rx="5" fill="#fff" ' + T + '/><circle cx="50" cy="-11" r="6.5" fill="#fff" ' + T + "/>" },
    { nom: "haut-de-forme", d: '<rect x="36" y="-20" width="28" height="30" rx="3" fill="#4B3F72" ' + T + '/><rect x="38.5" y="-2" width="23" height="6" fill="#ECD567"/><rect x="25" y="7" width="50" height="9" rx="4.5" fill="#4B3F72" ' + T + "/>" },
    { nom: "chapeau de magicien", d: '<path d="M31 13L54-26l16 39z" fill="#9A7BE0" ' + T + '/><ellipse cx="50" cy="13" rx="27" ry="6" fill="#9A7BE0" ' + T + '/><path d="M52-8l1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.7 1.9.7-4.1-3-2.9 4.1-.600z" fill="#ECD567"/>' },
    { nom: "casquette", d: '<path d="M32 15c0-14 8-21 18-21s18 7 18 21z" fill="#EC7739" ' + T + '/><path d="M64 9c9 0 17 3 20 9H62z" fill="#EC7739" ' + T + '/><circle cx="50" cy="-6" r="3" fill="#ECD567" stroke="' + L + '" stroke-width="2.5"/>' },
    { nom: "nœud", d: '<path d="M50 3L33-8v20zM50 3l17-11v20z" fill="#F2A0C4" ' + T + '/><circle cx="50" cy="3" r="5.5" fill="#F2A0C4" ' + T + "/>" },
    { nom: "auréole", d: '<ellipse cx="50" cy="-7" rx="17" ry="5.5" fill="none" stroke="' + L + '" stroke-width="9"/><ellipse cx="50" cy="-7" rx="17" ry="5.5" fill="none" stroke="#ECD567" stroke-width="4"/>' },
    { nom: "couronne de gouttes", d: gouttes(50, 26, 5, 0.26, 34, 11) },
    { nom: "lunettes de protection", d: '<path d="M33 25h34" fill="none" ' + T + '/><rect x="37" y="18" width="26" height="13" rx="6.5" fill="#BFE3F2" ' + T + '/><path d="M42 22.5c1.5-1.5 3.5-2 5.5-2" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' },
    { nom: "chapeau de cowboy", d: '<path d="M20 10c8 9 52 9 60 0-6 2-12 0-16-3H36c-4 3-10 5-16 3z" fill="#9A6B3F" ' + T + '/><path d="M35 8c-2-12 1-21 7-21 3 0 5 3 8 3s5-3 8-3c6 0 9 9 7 21z" fill="#B98250" ' + T + '/><path d="M36.500 3h27" fill="none" stroke="#4B3F72" stroke-width="5"/>' },
    { nom: "casque militaire", d: '<path d="M29 14c-1-17 9-27 21-27s22 10 21 27z" fill="#6F8552" ' + T + '/><path d="M25 14h50" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M26 14h48" fill="none" stroke="#5A6E42" stroke-width="4" stroke-linecap="round"/><path d="M40-4c3-3 7-4 11-4" fill="none" stroke="#A9BC8C" stroke-width="3" stroke-linecap="round"/>' },
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
    { nom: "bécher", d: '<path d="M80 43v25a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V43z" fill="#fff" ' + T + '/><path d="M82.5 57h15v10.5a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z" fill="#EC7739"/><path d="M77 43h26" fill="none" ' + T + "/>" },
    { nom: "pipette", d: '<g transform="rotate(30 90 56)"><rect x="85" y="28" width="10" height="15" rx="5" fill="#F2A0C4" ' + T + '/><rect x="83.5" y="42" width="13" height="6" rx="2" fill="#ECD567" ' + T + '/><path d="M86 48h8v17l-4 9-4-9z" fill="#fff" ' + T + '/></g><path d="M78 79c2 3 4 4.5 4 7a4 4 0 0 1-8 0c0-2.5 2-4 4-7z" fill="#F2A0C4" stroke="' + L + '" stroke-width="2.5"/>' },
    { nom: "carte à jouer", d: '<g transform="rotate(10 90 56)"><rect x="78" y="38" width="24" height="35" rx="4" fill="#fff" ' + T + '/><path d="M90 46l6.5 9.5-6.5 9.5-6.5-9.5z" fill="#DC4B4F"/></g>' },
    { nom: "trophée", d: '<path d="M81 43h-6c0 7 3 10 7 10M99 43h6c0 7-3 10-7 10M90 60v9M82 73h16" fill="none" ' + T + '/><path d="M80 40h20v10a10 10 0 0 1-20 0z" fill="#ECD567" ' + T + "/>" },
    { nom: "sablier", d: '<path d="M82 39h16v8l-6 10 6 10v8H82v-8l6-10-6-10z" fill="#fff" ' + T + '/><path d="M85.5 73h9L90 66z" fill="#EC7739"/><path d="M79 39h22M79 75h22" fill="none" ' + T + "/>" },
    { nom: "loupe", d: '<path d="M96 65l9 11" fill="none" stroke="' + L + '" stroke-width="9" stroke-linecap="round"/><circle cx="88" cy="54" r="12" fill="#BFE3F2" ' + T + '/><path d="M82 50c1.5-3 4.5-4.5 7.5-4.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' },
    { nom: "fiche de fabrication", d: '<rect x="77" y="40" width="26" height="37" rx="4" fill="#ECD567" ' + T + '/><rect x="81.5" y="47" width="17" height="25.5" rx="2" fill="#fff"/><rect x="84.5" y="35" width="11" height="9" rx="3" fill="#9A7BE0" ' + T + '/><path d="M85 54h10M85 60h10M85 66h6" fill="none" stroke="' + L + '" stroke-width="2.5" stroke-linecap="round"/>' },
    { nom: "bouquet de gouttes", d: '<path d="M90 60v20" fill="none" ' + T + "/>" + gouttes(90, 62, 5, 0.2, 38, 13) },
    { nom: "raquette", d: '<g transform="rotate(24 90 56)"><path d="M90 64v18" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M90 66v15" fill="none" stroke="#EC7739" stroke-width="4" stroke-linecap="round"/><ellipse cx="90" cy="46" rx="12" ry="15" fill="#fff" ' + T + '/><path d="M84 36v20M90 33v26M96 36v20M79.5 42h21M79 49h22M80.5 55h19" fill="none" stroke="' + L + '" stroke-width="1.6"/></g>' },
    { nom: "ballon", d: '<circle cx="90" cy="58" r="15" fill="#EC7739" ' + T + '/><path d="M75 58h30M90 43v30M80 47c5 6 5 16 0 22M100 47c-5 6-5 16 0 22" fill="none" stroke="' + L + '" stroke-width="2.5" stroke-linecap="round"/>' },
    { nom: "haltère", d: '<g transform="rotate(-18 90 58)"><path d="M78 58h24" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M78 58h24" fill="none" stroke="#C9C6D6" stroke-width="4"/><rect x="71" y="45" width="10" height="26" rx="4" fill="#4B3F72" ' + T + '/><rect x="99" y="45" width="10" height="26" rx="4" fill="#4B3F72" ' + T + '/></g>' },
    { nom: "bâton de twirling", d: '<g transform="rotate(32 90 58)"><path d="M90 36v44" fill="none" stroke="' + L + '" stroke-width="9" stroke-linecap="round"/><path d="M90 36v44" fill="none" stroke="#E9E6F2" stroke-width="3.5" stroke-linecap="round"/><circle cx="90" cy="33" r="8" fill="#fff" ' + T + '/><rect x="85.5" y="76" width="9" height="10" rx="4" fill="#fff" ' + T + '/></g><path d="M108 36v9M103.5 40.5h9" fill="none" stroke="#ECD567" stroke-width="3" stroke-linecap="round"/>' },
    { nom: "poêle du cuisinier", d: '<g transform="rotate(-28 90 58)"><path d="M90 62v22" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M90 64v19" fill="none" stroke="#EC7739" stroke-width="4" stroke-linecap="round"/><circle cx="90" cy="46" r="16" fill="#4B3F72" ' + T + '/><path d="M82 46c0-6 5-8 9-6 5-2 9 3 7 8-1 5-7 6-10 4-4 1-6-2-6-6z" fill="#fff"/><circle cx="90" cy="46" r="4" fill="#ECD567"/></g>' },
    { nom: "guitare du musicien", d: '<g transform="rotate(38 90 58)"><path d="M90 28v26" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M90 30v24" fill="none" stroke="#9A6B3F" stroke-width="4"/><rect x="85" y="24" width="10" height="9" rx="3" fill="#4B3F72" ' + T + '/><path d="M90 50c-9 0-12 6-9 11-5 4-5 19 9 19s14-15 9-19c3-5 0-11-9-11z" fill="#EC7739" ' + T + '/><circle cx="90" cy="66" r="4.5" fill="' + L + '"/><path d="M90 33v40" fill="none" stroke="#fff" stroke-width="1.4"/></g>' },
    { nom: "baguette du magicien", d: '<g transform="rotate(-34 90 58)"><path d="M90 38v42" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M90 46v34" fill="none" stroke="#4B3F72" stroke-width="4" stroke-linecap="round"/><path d="M90 38v8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g><path transform="translate(9 -5)" d="M72 22l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z" fill="#ECD567" stroke="' + L + '" stroke-width="3" stroke-linejoin="round"/><path d="M96 24v7M100.5 24h7M104 20.500v7" fill="none" stroke="#ECD567" stroke-width="3" stroke-linecap="round"/>' },
    { nom: "vélo", d: '<g transform="translate(-3 -2)"><circle cx="78" cy="66" r="10" fill="#fff" stroke="' + L + '" stroke-width="4"/><circle cx="106" cy="66" r="10" fill="#fff" stroke="' + L + '" stroke-width="4"/><circle cx="78" cy="66" r="2" fill="' + L + '"/><circle cx="106" cy="66" r="2" fill="' + L + '"/><path d="M78 66l10-15h11l7 15M88 51l5 15h-15M99 51l-6 15" fill="none" stroke="' + L + '" stroke-width="6.500" stroke-linecap="round" stroke-linejoin="round"/><path d="M78 66l10-15h11l7 15M88 51l5 15h-15M99 51l-6 15" fill="none" stroke="#EC7739" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"/><path d="M88 51l-2-6M82 45h9M99 51l-1-7h7" fill="none" stroke="' + L + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>' },
    { nom: "ballon de volley", d: '<circle cx="90" cy="58" r="15" fill="#fff" ' + T + '/><path d="M90 58c-1-6 1-11 5-14M90 58c5 3 10 3 14-1M90 58c-5 3-8 7-8 12" fill="none" stroke="' + L + '" stroke-width="2.800" stroke-linecap="round"/><path d="M81 46c-3 4-5 8-5 13M100 68c-4 3-9 4-13 4M103 50c1 3 2 7 1 11" fill="none" stroke="#3C8DBC" stroke-width="2.800" stroke-linecap="round"/>' },
    { nom: "loupe de l'inspecteur", d: '<path d="M97 63l11 14" fill="none" stroke="' + L + '" stroke-width="11" stroke-linecap="round"/><path d="M99 66l8 10" fill="none" stroke="#9A6B3F" stroke-width="5" stroke-linecap="round"/><circle cx="88" cy="52" r="14" fill="#BFE3F2" ' + T + '/><path d="M80 50c1-4 4-7 8-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' },
    { nom: "poney", d: '<path d="M80 44c2-8 9-10 14-7 4 2 5 6 4 11" fill="#9A6B3F" ' + T + '/><path d="M82 44l-3-9 9 5zM98 44l3-9-9 5z" fill="#C98F5A" ' + T + '/><path d="M78 52c0-8 5-12 12-12s12 4 12 12c0 6-2 9-3 14-1 6-4 9-9 9s-8-3-9-9c-1-5-3-8-3-14z" fill="#C98F5A" ' + T + '/><ellipse cx="90" cy="68" rx="7.5" ry="5.5" fill="#F3D9B8"/><circle cx="87" cy="68" r="1.5" fill="' + L + '"/><circle cx="93" cy="68" r="1.5" fill="' + L + '"/><circle cx="84.5" cy="54" r="2.2" fill="' + L + '"/><circle cx="95.5" cy="54" r="2.2" fill="' + L + '"/><path d="M90 38c-4 3-5 7-4 11" fill="none" stroke="#6B4423" stroke-width="5" stroke-linecap="round"/>' },
    { nom: "chat", d: '<path d="M77 50l-1-13 11 6zM103 50l1-13-11 6z" fill="#F0A64A" ' + T + '/><ellipse cx="90" cy="59" rx="15" ry="13" fill="#F0A64A" ' + T + '/><circle cx="85" cy="58" r="2.2" fill="' + L + '"/><circle cx="95" cy="58" r="2.2" fill="' + L + '"/><path d="M88.500 63h3l-1.500 2z" fill="#E77A8B" stroke="' + L + '" stroke-width="1.500" stroke-linejoin="round"/><path d="M90 65c-1 3-4 3-5 1M90 65c1 3 4 3 5 1M74 60h7M74 65l7-1M99 60h7M99 64l7 1" fill="none" stroke="' + L + '" stroke-width="1.800" stroke-linecap="round"/>' },
    { nom: "chien", d: '<ellipse cx="90" cy="58" rx="14" ry="14" fill="#E9C9A0" ' + T + '/><path d="M78 47c-7 0-8 9-6 17 1 4 5 4 6 0zM102 47c7 0 8 9 6 17-1 4-5 4-6 0z" fill="#8A5A34" ' + T + '/><ellipse cx="90" cy="65" rx="7" ry="5.500" fill="#fff"/><circle cx="85" cy="55" r="2.2" fill="' + L + '"/><circle cx="95" cy="55" r="2.2" fill="' + L + '"/><ellipse cx="90" cy="62.500" rx="3" ry="2.300" fill="' + L + '"/><path d="M90 65v3c-1 2-4 2-5 0M90 68c1 2 4 2 5 0" fill="none" stroke="' + L + '" stroke-width="1.800" stroke-linecap="round"/>' },
    { nom: "hamster", d: '<circle cx="79" cy="46" r="5.500" fill="#F3D9B8" ' + T + '/><circle cx="101" cy="46" r="5.500" fill="#F3D9B8" ' + T + '/><ellipse cx="90" cy="59" rx="16" ry="14" fill="#E8B06A" ' + T + '/><ellipse cx="82" cy="64" rx="6.500" ry="5.500" fill="#fff"/><ellipse cx="98" cy="64" rx="6.500" ry="5.500" fill="#fff"/><circle cx="85" cy="55" r="2.2" fill="' + L + '"/><circle cx="95" cy="55" r="2.2" fill="' + L + '"/><circle cx="90" cy="60.500" r="2" fill="#E77A8B"/><path d="M88.500 64h3v4.500h-3z" fill="#fff" stroke="' + L + '" stroke-width="1.400" stroke-linejoin="round"/>' },
    { nom: "arc et flèches", d: '<path d="M82 36c16 8 16 36 0 44" fill="none" stroke="' + L + '" stroke-width="9" stroke-linecap="round"/><path d="M82 36c16 8 16 36 0 44" fill="none" stroke="#9A6B3F" stroke-width="4" stroke-linecap="round"/><path d="M82 36v44" fill="none" stroke="' + L + '" stroke-width="2"/><path d="M72 58h34" fill="none" stroke="' + L + '" stroke-width="3.500" stroke-linecap="round"/><path d="M103 52l9 6-9 6z" fill="#C9C6D6" stroke="' + L + '" stroke-width="2.500" stroke-linejoin="round"/><path d="M72 58l-5-5M72 58l-5 5M76 58l-5-5M76 58l-5 5" fill="none" stroke="#EC7739" stroke-width="2.500" stroke-linecap="round"/>' },
    { nom: "kalachnikov", d: '<g transform="rotate(-24 90 58)"><path d="M70 60l9-6h7v8h-9l-5 5z" fill="#9A6B3F" ' + T + '/><rect x="84" y="52" width="20" height="9" rx="2" fill="#4B3F72" ' + T + '/><path d="M104 56h12" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round"/><path d="M104 56h11" fill="none" stroke="#8C8AA0" stroke-width="2"/><path d="M92 61c1 6 4 10 8 13l5-3c-3-3-5-6-6-10z" fill="#4B3F72" ' + T + '/><rect x="98" y="48" width="9" height="4" rx="2" fill="#9A6B3F" stroke="' + L + '" stroke-width="2.500"/></g>' },
    { nom: "doigt d\'honneur", d: '<rect x="80" y="54" width="21" height="20" rx="6" fill="#F3D9B8" ' + T + '/><rect x="87" y="34" width="8" height="26" rx="4" fill="#F3D9B8" ' + T + '/><path d="M83 58v8M98 58v8" fill="none" stroke="' + L + '" stroke-width="2.200" stroke-linecap="round"/><path d="M79 62c-4 0-5 5-1 7" fill="#F3D9B8" ' + T + '/>' },
    { nom: "saucisse de Morteau", d: '<g transform="rotate(-28 90 58)"><path d="M73 52c0-7 34-7 34 0v10c0 7-34 7-34 0z" fill="#A8552F" ' + T + '/><path d="M78 52c8-3 16-3 24 0" fill="none" stroke="#D08A5A" stroke-width="3" stroke-linecap="round"/><path d="M107 57h7" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round"/><path d="M107 57h6" fill="none" stroke="#E9C9A0" stroke-width="2.500" stroke-linecap="round"/><path d="M110 51l8 12" fill="none" stroke="' + L + '" stroke-width="5.500" stroke-linecap="round"/><path d="M110 51l8 12" fill="none" stroke="#C98F5A" stroke-width="2.200" stroke-linecap="round"/><path d="M73 57h-6" fill="none" stroke="' + L + '" stroke-width="5" stroke-linecap="round"/></g>' },
    { nom: "outils", d: '<g transform="rotate(-32 90 58)"><path d="M90 46v36" fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round"/><path d="M90 50v31" fill="none" stroke="#9A6B3F" stroke-width="4" stroke-linecap="round"/><rect x="77" y="34" width="26" height="13" rx="3" fill="#8C8AA0" ' + T + '/></g><g transform="rotate(34 90 58)"><path d="M90 46v34" fill="none" stroke="' + L + '" stroke-width="9" stroke-linecap="round"/><path d="M90 46v34" fill="none" stroke="#C9C6D6" stroke-width="3.500" stroke-linecap="round"/><path d="M82 34v7c0 5 3 8 8 8s8-3 8-8v-7l-5 2v6h-6v-6z" fill="#C9C6D6" ' + T + '/></g>' },
    { nom: "pinceaux", d: '<g transform="rotate(-26 90 58)"><path d="M90 52v30" fill="none" stroke="' + L + '" stroke-width="9" stroke-linecap="round"/><path d="M90 54v27" fill="none" stroke="#ECD567" stroke-width="3.500" stroke-linecap="round"/><rect x="85.500" y="46" width="9" height="8" fill="#C9C6D6" ' + T + '/><path d="M85 46c0-9 3-13 5-16 2 3 5 7 5 16z" fill="#DC4B4F" ' + T + '/></g><g transform="rotate(22 90 58)"><path d="M92 52v30" fill="none" stroke="' + L + '" stroke-width="9" stroke-linecap="round"/><path d="M92 54v27" fill="none" stroke="#9A6B3F" stroke-width="3.500" stroke-linecap="round"/><rect x="87.500" y="46" width="9" height="8" fill="#C9C6D6" ' + T + '/><path d="M87 46c0-9 3-13 5-16 2 3 5 7 5 16z" fill="#5AA9E6" ' + T + '/></g>' },
  ];
  // Fleur du logo, derrière le meeple, dans le repère du jeton (centre 60,60) : quatrième choix de l'avatar.
  // Des gouttes rayonnent du centre, de tailles inégales comme sur le logo ; rien ne dépasse l'anneau de la brigade.
  const fleur = (teintes, debut, fin) => { const n = Math.round((fin - debut) / 24), T2 = [0.41, 0.31, 0.38, 0.28, 0.4, 0.33, 0.36, 0.3, 0.41, 0.29, 0.37, 0.32, 0.4, 0.3, 0.35];
    return Array.from({ length: n }, (_, k) => '<path transform="translate(60 60) rotate(' + Math.round(debut + (k + 0.5) * (fin - debut) / n + (k % 3 - 1) * 4) + ") translate(0 -5) scale(" + T2[k % T2.length] + ')" d="' + GOUTTE + '" fill="' + teintes[k % teintes.length] + '"/>').join(""); };
  const FLEURS = [
    { nom: "sans fleur", d: "" },
    { nom: "fleur du logo", d: fleur(LOGO, 0, 360) },
    { nom: "fleur violette", d: fleur(["#26076D", "#9A7BE0", "#E5B4D9"], 0, 360) },
    { nom: "fleur soleil", d: fleur(["#EC7739", "#ECD567", "#F59A62"], 0, 360) },
    { nom: "fleur rose", d: fleur(["#F2A0C4", "#E5B4D9", "#DC4B4F"], 0, 360) },
    { nom: "fleur de Noël", d: fleur(["#2F8F63", "#DC4B4F", "#ECD567"], 0, 360) },
    { nom: "fleur givrée", d: fleur(["#5AA9E6", "#BFE3F2", "#3CB4AC"], 0, 360) },
    { nom: "éventail du logo", d: fleur(LOGO, -108, 108) },
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
    { nom: "étoile", d: '<path d="M12 2.2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.1l-5.9 3.1 1.2-6.5L2.5 9.1l6.6-.900z" ' + EC + '/>' },
    { nom: "goutte", d: '<path d="M12 2.5c4 5 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.5 8 7.5 12 2.5z" ' + EC + '/><path d="M9 14.5a3 3 0 0 0 3 3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' },
    { nom: "sablier", d: '<path d="M7 3h10v3.5L13.5 12 17 17.5V21H7v-3.5L10.5 12 7 6.5z" ' + E + '/><path d="M8.5 19.5h7L12 15zM10 7h4l-2 3z" fill="currentColor"/><path d="M5.5 3h13M5.5 21h13" ' + EN + '/>' },
    { nom: "mortier", d: '<path d="M15 9l4.5-6.5" fill="none" stroke="' + L + '" stroke-width="3.4" stroke-linecap="round"/><path d="M3.5 10h17c0 5.5-3.5 9-8.5 9s-8.5-3.5-8.5-9z" ' + EC + '/><path d="M8.5 21.5h7" ' + EN + '/>' },
    { nom: "sapin", d: '<rect x="10.5" y="18.5" width="3" height="3.5" ' + E + '/><path d="M12 2l4.5 5.5h-2.2l4 5h-2.6l4.3 6H4l4.3-6H5.7l4-5H7.5z" ' + EC + '/>' },
    { nom: "pipette", d: '<g transform="rotate(40 12 12)"><rect x="10" y="1.5" width="4" height="5.5" rx="2" ' + EC + '/><rect x="9" y="7" width="6" height="9" rx="1" ' + E + '/><path d="M12 16v6.5" ' + EN + '/><rect x="10" y="11" width="4" height="4" fill="currentColor"/></g>' },
    { nom: "balance", d: '<path d="M12 4v15.5M7 20.5h10M4.5 6.5h15" ' + EN + '/><path d="M4.5 7l-3 6h6zM19.5 7l-3 6h6z" ' + EC + '/>' },
    { nom: "bécher", d: '<path d="M7 3v15a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V3z" ' + E + '/><path d="M8 12h8v6a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" fill="currentColor"/><path d="M5.5 3h13" ' + EN + '/>' },
    { nom: "comprimé", d: '<circle cx="12" cy="12" r="9" ' + EC + '/><path d="M6.5 12h11" stroke="' + L + '" stroke-width="2" stroke-linecap="round"/>' },
    { nom: "croix", d: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" ' + EC + '/>' },
    { nom: "cœur", d: '<path d="M12 20.5C5 15.5 2.5 12 2.5 8.5A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 9.5 1.5c0 3.5-2.5 7-9.5 12z" ' + EC + '/>' },
    { nom: "trèfle", d: '<path d="M12 12v9.5M9.5 21.5h5" ' + EN + '/><circle cx="12" cy="6.5" r="4" ' + EC + '/><circle cx="6.8" cy="13" r="4" ' + EC + '/><circle cx="17.2" cy="13" r="4" ' + EC + '/>' },
    { nom: "pique", d: '<path d="M12 15v6.5M9.5 21.5h5" ' + EN + '/><path d="M12 2.5c4 4.5 8 7 8 11a4 4 0 0 1-8 1 4 4 0 0 1-8-1c0-4 4-6.5 8-11z" ' + EC + '/>' },
    { nom: "carreau", d: '<path d="M12 2l7.5 10L12 22 4.5 12z" ' + EC + '/>' },
    { nom: "carte", d: '<rect x="5" y="2.5" width="14" height="19" rx="2.5" ' + E + '/><path d="M12 7.5l3.2 4.5-3.2 4.5L8.8 12z" fill="currentColor"/>' },
    { nom: "pion", d: '<path d="M9 11h6l1.5 7.5h-9z" ' + EC + '/><circle cx="12" cy="6.5" r="4" ' + EC + '/><rect x="6" y="18.5" width="12" height="3" rx="1" ' + EC + '/>' },
    { nom: "cadeau", d: '<path d="M12 8.5c-4-6-7-1-2.5 0M12 8.5c4-6 7-1 2.5 0" ' + E + '/><rect x="3.5" y="9" width="17" height="12" rx="1.5" ' + EC + '/><path d="M12 9v12M3.5 14h17" stroke="' + L + '" stroke-width="2"/>' },
    { nom: "flocon", d: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" fill="none" stroke="' + L + '" stroke-width="5.5" stroke-linecap="round"/><path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
    { nom: "cloche", d: '<circle cx="12" cy="20.3" r="1.8" ' + E + '/><path d="M12 3a6 6 0 0 0-6 6v5l-2.5 4h17L18 14V9a6 6 0 0 0-6-6z" ' + EC + '/>' },
    { nom: "bonnet", d: '<path d="M4 17C5 8 10 3.5 19 4.5c-2.5 2-3.5 6-3 12.5z" ' + EC + '/><rect x="2.5" y="16.5" width="15.5" height="4.5" rx="2.250" ' + E + '/><circle cx="20" cy="5" r="2.3" ' + E + '/>' },
    { nom: "couronne", d: '<path d="M3.5 18.5l-1-11 5.5 4.5L12 5l4 7 5.5-4.5-1 11z" ' + EC + '/>' },
    { nom: "trophée", d: '<path d="M7 5H3.5c0 3 1.5 5 4 5M17 5h3.5c0 3-1.5 5-4 5M12 14v4M8 21h8M9.5 18h5" ' + EN + '/><path d="M7 3h10v6a5 5 0 0 1-10 0z" ' + EC + '/>' },
    { nom: "sucre d'orge", d: '<path d="M9 21V8.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="' + L + '" stroke-width="6.5" stroke-linecap="round"/><path d="M9 21V8.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M9 21V8.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-dasharray="3 3.5"/>' },
  ];
  // Noms proposés au vote des brigades. Un membre peut aussi proposer le sien : pour le serveur, un nom est un texte,
  // et deux brigades ne peuvent pas porter le même (accents et casse ignorés). Un emblème non plus.
  const NOMS = [
    "Brigade de la Dream Hotte", "Brigade des Jokers de Garde", "Brigade du Dé Pipetté", "Brigade des Meeples en Charlotte", "Brigade des Bluffeurs Aseptiques",
    "Brigade des Mauvais Perdants Repentis", "Brigade des Lutins Stériles", "Brigade des As de la Paillasse", "Brigade des Lots Gagnants", "Brigade de la Pioche Miraculeuse",
    // Côté jeu de société.
    "Les Meeples sans pitié", "La Mauvaise Foi Ludique", "Les Optimisateurs du Dimanche", "Le Syndicat du Dé Pipé", "Les Pions Fous",
    "Zéro Alliances, 100 % Rancune", "La Brigade du Livret de Règles", "Les Stratèges de Comptoir", "Coup Bas & Co.", "Les Pros de l'Analysis Paralysis",
    "L'Escouade du Plateau Renversé", "Tout dans le Bluff", "Les Hors-Jeu Assumés",
    // Côté pharmacotechnie.
    "Les Meeples Stériles", "Les Pipettes Tactiques", "Zéro Particule, Max Points", "Double Contrôle & Coups Bas", "Traçabilité Totale, Pitié Zéro",
    "Sous Isolateur, Hors Contrôle", "Le Commando Galénique",
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
  // Devises proposées aux brigades : chaque membre en soutient une, ou en propose une autre ; la plus soutenue s'affiche (serveur : NB_DEVISES).
  const DEVISES = [
    "Un pour tous, tous au plateau", "Qui dose bien joue bien", "Lancer, compter, libérer", "Aseptiques, mais pas sans saveur",
    "Qui scelle sa réponse scelle son destin", "Agiter avant de jouer", "Tenir hors de portée des mauvais perdants", "Sous hotte, mais pas sous cloche",
    "Posologie : une victoire par jour", "Le dé est jeté, le lot est libéré",
    "On ne perd jamais vraiment : soit on gagne, soit on apprend à tricher plus discrètement",
    "La règle d'or : lire les règles pendant 3 minutes, puis improviser pendant 2 heures",
    "C'est pas de la chance, c'est du calcul probabiliste à haut risque",
    "Un bon joueur sait encaisser la défaite ; un excellent joueur accuse le lancer de dé",
    "On a dit \"pas de rancune\"… mais on a noté les coups bas dans un coin",
    "Moins de blabla, plus de pions : le plateau ne ment jamais",
    "La boîte est déjà ouverte, la diplomatie est officiellement suspendue",
    "Celui qui lit le livret de règles en entier mérite déjà 5 points de victoire morale",
    "Le hasard propose, la mauvaise foi dispose",
    "Un meeple tombé sous la table est un meeple qui a choisi l'exil",
    "L'important, ce n'est pas de gagner… enfin, si, un peu quand même",
    "Si tout le monde est d'accord sur les règles, c'est qu'on a raté un paragraphe",
    "La traçabilité avant tout : on sait d'où vient le produit, et qui a posé le pion",
    "Zéro particule en trop, zéro point de victoire laissé au hasard",
    "On ne joue pas avec la conformité, mais on adore challenger la mécanique",
    "De la hotte au plateau : la rigueur ne quitte jamais la pièce",
    "On maîtrise les protocoles complexes… alors un livret de 24 pages, c'est de la mise en bouche",
    "La sécurité d'abord, la stratégie ensuite, la victoire en bonus",
    "Rigueur aseptique le jour, esprit tactique le soir",
    "Optimiser le geste, sécuriser le process, et toujours garder un joker en main",
  ];
  // Devise d'une ligne de brigade envoyée par le serveur : un numéro de la liste, ou le texte proposé par un membre.
  const devise = l => (l && typeof l.devise === "string" ? l.devise : (l && DEVISES[l.devise]) || "");
  const MEEPLE = "M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z";

  const borne = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
  // Un avatar : [couleur, coiffe, accessoire, fleur]. Les fiches d'avant la fleur n'ont que trois numéros : la fleur vaut alors 0.
  const sain = a => { a = Array.isArray(a) ? a : []; return [borne(a[0], COULEURS.length), borne(a[1], COIFFES.length), borne(a[2], ACCESSOIRES.length), borne(a[3], FLEURS.length)]; };
  const decrire = a => { a = sain(a); return "Meeple " + COULEURS[a[0]].nom + ", " + COIFFES[a[1]].nom + ", " + ACCESSOIRES[a[2]].nom + (a[3] ? ", " + FLEURS[a[3]].nom : ""); };
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
    const B = BRIGADES[o.brigade], C = COULEURS[a[0]];
    return '<svg class="pp-av' + (o.cls ? " " + o.cls : "") + '" viewBox="0 0 120 120"' + (o.titre ? ' role="img" aria-label="' + h(o.titre === true ? decrire(a) : o.titre) + '"' : ' aria-hidden="true"') + ">"
      + '<circle cx="60" cy="60" r="56" fill="' + (B ? B.fond : "#FFFBF2") + '" stroke="' + L + '" stroke-width="5"/>'
      + (B ? '<circle cx="60" cy="60" r="49.5" fill="none" stroke="' + B.c + '" stroke-width="5"/>' : "")
      + FLEURS[a[3]].d
      // Le meeple en autocollant : liseré blanc, contour, reflet et petit visage, puis la coiffe et l'accessoire.
      + '<g transform="translate(20 33) scale(.78)"><path d="' + MEEPLE + '" fill="none" stroke="#fff" stroke-width="17" stroke-linejoin="round"/>'
      + (C.g ? degrade(C, "ppc" + a[0]) : "") + '<path d="' + MEEPLE + '" fill="' + (C.g ? "url(#ppc" + a[0] + ")" : C.c) + '" stroke="' + L + '" stroke-width="8" stroke-linejoin="round"/>'
      + '<path d="M39 15c1.5-4 5-7 10-7.5M19 53c3-2.5 8-5 13-6.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.5" stroke-linecap="round"/>'
      + '<circle cx="40" cy="30" r="2.6" fill="#F2A0C4" fill-opacity=".85"/><circle cx="60" cy="30" r="2.6" fill="#F2A0C4" fill-opacity=".85"/>'
      + '<path d="M42 26q2.8-4 5.6 0M52.4 26q2.8-4 5.6 0M46 29.5q4 4 8 0" fill="none" stroke="' + (C.sombre ? "#FFFBF2" : L) + '" stroke-width="2.4" stroke-linecap="round"/>'
      + COIFFES[a[1]].d + ACCESSOIRES[a[2]].d + "</g></svg>";
  }

  const CSS = `
.pp-vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.pp-av{display:block;width:100%;height:auto;overflow:visible}
.pp-mini{display:inline-block;width:2.4em;height:2.4em;margin-right:.4em;vertical-align:middle}
.pp-emb{display:inline-block;width:1.25em;height:1.25em;vertical-align:-.25em}
.pp-brig{display:flex;align-items:center;gap:6px;margin:6px 0 10px;font:600 .72rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase}
.pp-top{display:flex;align-items:center;gap:14px;margin-top:14px;position:sticky;top:0;z-index:2;padding:6px 0;background:var(--surface,#FFFBF2)}
.pp-apercu{flex:0 0 auto;width:124px;filter:drop-shadow(5px 5px 0 var(--shadow,#26076D))}
.pp-top>div:last-child{min-width:0}
.pp-desc{margin:0;font-weight:800;line-height:1.25;min-height:3.75em}
/* La description garde sa hauteur : le bouton « Au hasard » ne saute pas sous le doigt quand le texte change de longueur. */
.pp-top .go{margin-top:10px}
.pp-set{min-width:0;margin:14px 0 0;padding:0;border:0}
.pp-set legend{padding:0;margin:0 0 6px;font:600 .72rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#4E3D7C)}
.pp-opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:8px}
.pp-opt{position:relative;display:block;margin:0!important;cursor:pointer;text-transform:none!important;letter-spacing:0!important}
.pp-opt span{display:grid;justify-items:center;gap:3px;height:100%;padding:6px 2px 5px;background:#fff;color:var(--on-surface,#26076D);border:2.5px solid var(--line,#26076D);border-radius:12px;font:700 .68rem/1.15 var(--display,sans-serif);text-align:center;overflow-wrap:break-word}
#ppTitre:focus{outline:none}
.pp-opt span svg,.pp-opt span i{display:block;width:40px;height:40px}
.pp-opt span i{border:2.5px solid var(--line,#26076D);border-radius:50%}
.pp-opt input:checked+span{background:var(--mu,#ECD567);box-shadow:3px 3px 0 var(--shadow,#26076D);transform:translate(-1px,-1px)}
.pp-opt input:focus-visible+span{outline:3px solid var(--line,#26076D);outline-offset:3px}
.pp-fin{display:flex;flex-wrap:wrap;align-items:center;gap:0 12px}
.pp-badge{position:relative;width:min(236px,80%);margin:52px auto 14px;transform:rotate(-2deg);transform-origin:50% -46px;color:#26076D;text-align:center}
.pp-cordon{position:absolute;left:50%;top:-52px;width:26px;height:40px;margin-left:-13px;background:var(--bc);border:3px solid #26076D;border-top:0;border-radius:0 0 4px 4px}
.pp-cordon::after{content:"";position:absolute;left:50%;top:100%;width:16px;height:24px;margin-left:-8px;background:#C9C6D6;border:3px solid #26076D;border-radius:5px;box-sizing:border-box}
.pp-bg{position:relative;overflow:hidden;background:#FFFBF2;border:3px solid #26076D;border-radius:18px;box-shadow:5px 6px 0 rgba(38,7,109,.22)}
.pp-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(112deg,transparent 38%,rgba(255,255,255,.5) 46%,rgba(255,255,255,.12) 52%,transparent 60%);pointer-events:none}
.pp-bh{margin:0;padding:8px 10px 9px;background:#26076D;color:#FFFBF2;line-height:1.15}
.pp-bh i{display:block;width:46px;height:11px;margin:0 auto 8px;border-radius:6px;background:#FFFBF2;box-shadow:inset 0 2px 0 rgba(38,7,109,.35)}
.pp-bh span{display:block;font-weight:800;font-size:1rem;letter-spacing:.14em;text-transform:uppercase}
.pp-bh small{display:block;margin-top:3px;font:600 .62rem var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:#ECD567}
.pp-photo{position:relative;width:132px;margin:14px auto 8px;padding:8px 8px 0;background:var(--bf);border:3px solid #26076D;border-radius:14px;box-sizing:border-box}
.pp-photo .pp-apercu{width:100%}
.pp-photo .pp-emb{position:absolute;right:-20px;bottom:-12px;width:46px;height:46px;transform:rotate(10deg)}
.pp-bg>b{display:block;padding:0 10px;font-size:1.45rem;line-height:1.1;overflow-wrap:anywhere}
.pp-bg>small{display:block;margin-top:5px;padding:0 10px;font:600 .72rem var(--mono,monospace);letter-spacing:.05em;text-transform:uppercase}
.pp-bp{display:flex;align-items:center;gap:10px;margin:12px 0 0;padding:8px 12px;border-top:3px dashed #26076D;background:var(--bf);font:600 .6rem var(--mono,monospace);letter-spacing:.06em;text-transform:uppercase;text-align:left;line-height:1.3}
.pp-bp i{flex:1;height:26px;background:repeating-linear-gradient(90deg,#26076D 0 2px,transparent 2px 4px,#26076D 4px 5px,transparent 5px 9px,#26076D 9px 12px,transparent 12px 14px,#26076D 14px 15px,transparent 15px 17px)}
.pp-balance{animation:pp-balance 1s cubic-bezier(.3,1.5,.5,1)}
@keyframes pp-balance{from{transform:translateY(-40px) rotate(-16deg);opacity:0}45%{transform:rotate(6deg);opacity:1}75%{transform:rotate(-4deg)}}
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
.pp-plein{position:fixed;inset:0;z-index:2147483000;display:flex;background:#0B0320;animation:ppPlein .3s both;transition:opacity .35s}
.pp-plein.out{opacity:0;pointer-events:none}
@keyframes ppPlein{from{opacity:0}}
.pp-plein video{display:block;flex:1 1 0;min-width:0;min-height:0;width:100%;height:100%;object-fit:contain;border:0;background:none}
.pp-plein button{position:absolute;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));padding:8px 14px;font:800 .9rem var(--display,inherit);color:#26076D;background:#ECD567;border:3px solid #26076D;border-radius:999px;box-shadow:3px 3px 0 #0B0320;cursor:pointer}
.pp-plein button:focus-visible{outline:3px solid #FFFBF2;outline-offset:3px}
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
h3 img.pp-emb{width:1.7em;height:1.7em;vertical-align:-.45em}
.pp-brig img.pp-emb{width:28px;height:28px}
.eg-rank img.eg-emb{width:26px;height:26px}
.eg-brig summary img.eg-emb{width:36px;height:36px}
.pp-opt span em{font:600 .58rem/1.1 var(--mono,monospace);font-style:normal}
@media(max-width:380px){.pp-desc{font-size:.86rem;line-height:1.2;min-height:4.8em}.pp-apercu{width:96px}.pp-top{gap:10px}.pp-opts{gap:5px}.pp-opt span{padding:6px 0 5px;font-size:.6rem;letter-spacing:-.01em}.pp-opt span svg,.pp-opt span i{width:34px;height:34px}}
@media(prefers-reduced-motion:reduce){.pp-pop,.pp-balance{animation:none}.pp-opt input:checked+span{transform:none}}`;
  const st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  /* Fiche d'identification, dessinée dans `el`.
     o.pseudo : nom affiché ; o.avatar : avatar actuel, s'il existe ; o.brigade : brigade déjà tirée, s'il y en a une.
     o.enregistrer(avatar) : promesse de { ok: true, brigade, effectif } ou { ok: false, message } ; c'est le serveur qui tire.
     o.renommer(pseudo) : en retouche seulement, promesse de { ok: true } ou { ok: false, message } pour changer de pseudo.
     o.choisirPseudo : à la création, la fiche demande aussi le pseudo (entrée par la liste des participants) ; o.nom est alors
       le nom choisi dans la liste, o.pseudo la suggestion, et enregistrer(avatar, pseudo) reçoit le pseudo retenu.
     o.reveler() : appelé au moment où la brigade tirée s'affiche, après la vidéo du tirage ; rien ne doit la montrer avant.
     o.onFin() : la fiche est refermée (validée ou abandonnée). */
  // Vidéo générique du tirage, jouée entre la validation de la fiche et la révélation de la brigade. Tant que `src` est
  // vide, ou si la vidéo ne se charge pas, ne démarre pas ou dure trop, ou si le joueur préfère moins de mouvement,
  // la révélation suit sans attendre. Fond crème : la vidéo se termine sur un flash de cette teinte.
  const tirage = { src: "video/tirage-brigade.mp4", attente: 12000 };
  function jouerTirage(el, suite) {
    let fait = false, garde = 0, couche = null, joue = false;
    const avant = document.activeElement;
    const touche = e => { if (e.key === "Escape") { e.preventDefault(); fin(); } };
    function fin() {
      if (fait) return;
      fait = true; clearTimeout(garde);
      document.removeEventListener("keydown", touche, true); window.removeEventListener("hashchange", fin);
      const c = couche;
      // Une vidéo qui n'a jamais démarré (fichier absent, lecture refusée) s'efface d'un coup ; sinon, en fondu.
      if (c) { try { c.querySelector("video").pause(); } catch (e) {} if (joue) { c.classList.add("out"); setTimeout(() => c.remove(), 350); } else c.remove(); }
      suite();
      // Retour du focus : la suite le pose d'ordinaire sur la révélation ; sinon, là où il était avant la vidéo.
      if (c && (c.contains(document.activeElement) || document.activeElement === document.body) && avant && avant.isConnected && avant !== document.body) avant.focus({ preventScroll: true });
    }
    if (!tirage.src || (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches)) return fin();
    // Plein écran, comme les vidéos du sapin : une couche fixe et sombre, la vidéo entière, « Passer », Échap ou un toucher pour abréger. Sans son.
    el.innerHTML = '<div class="pp pp-tirage"><p class="ap-m">Tirage de la brigade</p></div>';
    couche = document.createElement("div");
    couche.className = "pp-plein"; couche.setAttribute("role", "dialog"); couche.setAttribute("aria-modal", "true"); couche.setAttribute("aria-label", "Tirage au sort de la brigade");
    couche.innerHTML = '<video id="ppVideo" muted playsinline preload="auto" aria-hidden="true"></video><button type="button" id="ppPasser">Passer</button>';
    document.body.appendChild(couche);
    const v = couche.querySelector("#ppVideo");
    garde = setTimeout(fin, tirage.attente);
    v.addEventListener("ended", fin); v.addEventListener("error", fin); v.addEventListener("playing", () => { joue = true; });
    couche.addEventListener("click", fin);
    document.addEventListener("keydown", touche, true); window.addEventListener("hashchange", fin);
    couche.querySelector("#ppPasser").focus({ preventScroll: true });
    v.src = tirage.src;
    const p = v.play();
    if (p && p.catch) p.catch(fin);
  }
  function fiche(el, o) {
    const retouche = Array.isArray(o.avatar) && o.brigade !== undefined;
    const LISTES = [COULEURS, COIFFES, ACCESSOIRES, FLEURS];
    let a = o.avatar ? sain(o.avatar) : [Math.floor(Math.random() * COULEURS.length), 0, 0, 0], occupe = false;
    const q = s => el.querySelector(s);
    const groupe = (k, titre, liste) => '<fieldset class="pp-set"><legend>' + titre + '</legend><div class="pp-opts">'
      + liste.map((x, i) => '<label class="pp-opt"><input class="pp-vh" type="radio" name="pp' + k + '" value="' + i + '"' + (a[k] === i ? " checked" : "") + '><span data-k="' + k + '" data-i="' + i + '"></span></label>').join("") + "</div></fieldset>";
    el.innerHTML = '<div class="pp"><p class="ap-m">Fiche d\'identification · ' + (retouche ? "retouche" : "avant la première prise") + "</p>"
      + '<h3 tabindex="-1" id="ppTitre">' + (retouche ? "Retoucher ma fiche" : "Composez votre avatar, " + h(o.choisirPseudo ? o.nom : o.pseudo)) + "</h3>"
      + (retouche ? "" : '<p class="eg-d">Pas de lot sans étiquette : composez votre meeple.</p>')
      + '<div class="pp-top"><div class="pp-apercu" id="ppApercu"></div><div><p class="pp-desc" id="ppDesc" role="status"></p>'
      + '<button class="go" type="button" id="ppHasard">Au hasard</button></div></div>'
      + '<form id="ppForm" novalidate>'
      + (!retouche && o.choisirPseudo ? '<label for="ppPseudo">Votre pseudo au classement</label><input class="pp-jeu" id="ppPseudo" type="text" autocomplete="off" maxlength="24" value="' + h(o.pseudo || "") + '">'
        + '<p class="eg-hint">Un seul mot, 2 à 24 lettres, modifiable ensuite.</p>' : "")
      + (retouche && o.renommer ? '<label for="ppPseudo">Pseudo ou prénom</label><input class="pp-jeu" id="ppPseudo" type="text" autocomplete="off" maxlength="24" value="' + h(o.pseudo) + '">'
        + '<p class="eg-hint">Un seul mot, de 2 à 24 lettres. Vos réponses, votre avatar et votre brigade vous suivent sous le nouveau nom.</p>' : "")
      + groupe(0, "Couleur", COULEURS) + groupe(1, "Coiffe", COIFFES) + groupe(2, "Accessoire", ACCESSOIRES) + groupe(3, "Fleur du logo", FLEURS)
      + '<p class="eg-hint">' + (retouche ? "Votre brigade ne change pas : seuls le pseudo et l'avatar se retouchent."
        : "Brigade tirée au sort, définitive. Avatar modifiable à tout moment.") + "</p>"
      + '<p class="eg-msg err" id="ppMsg" role="status"></p>'
      + '<p class="pp-fin"><button class="go main" type="submit" id="ppOk">' + (retouche ? "Enregistrer ma fiche" : "Valider ma fiche et tirer ma brigade") + "</button>"
      + '<button class="linkbtn" type="button" id="ppNon">' + (retouche ? "Annuler" : "Plus tard") + "</button></p></form></div>";

    const peindre = () => {
      q("#ppApercu").innerHTML = avatar(a, { brigade: o.brigade });
      q("#ppDesc").textContent = decrire(a) + ".";
      el.querySelectorAll(".pp-opt span").forEach(s => {
        const k = Number(s.dataset.k), i = Number(s.dataset.i);
        const nom = LISTES[k][i].nom;
        s.innerHTML = (k === 0 ? '<i style="background:' + COULEURS[i].c + '"></i>' : avatar(k === 1 ? [a[0], i, 0, 0] : k === 2 ? [a[0], 0, i, 0] : [a[0], 0, 0, i])) + h(nom);
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
      a = LISTES.map(l => Math.floor(Math.random() * l.length));
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
      if (o.reveler) o.reveler(); // la page peut maintenant montrer la brigade : pas avant, la vidéo du tirage vient de finir
      el.innerHTML = '<div class="pp"><p class="ap-m">Affectation · tirage équilibré par le serveur</p><h3 tabindex="-1" id="ppTitre">' + h(B.nom) + "</h3>"
        + '<div class="pp-badge pp-balance" style="--bc:' + B.c + ";--bf:" + B.fond + '"><i class="pp-cordon" aria-hidden="true"></i><div class="pp-bg">'
        + '<p class="pp-bh"><i aria-hidden="true"></i><span>Pharmacotechnie</span><small>Pharmacogames · Noël 2026</small></p>'
        + '<div class="pp-photo"><div class="pp-apercu">' + avatar(a, { brigade: r.brigade }) + "</div>" + emblemeSvg(r.brigade) + "</div>"
        + "<b>" + h(o.pseudo) + "</b><small>" + h(B.nom) + (r.effectif ? " · " + r.effectif + (r.effectif > 1 ? " membres" : " membre") : "") + "</small>"
        + '<p class="pp-bp" aria-hidden="true"><i></i><span>Lot B' + (r.brigade + 1) + " · 2026<br>Libéré</span></p></div></div>"
        + '<p class="eg-d">Badge délivré ! Vos points comptent aussi pour votre brigade. Nom, emblème et devise se votent entre membres.</p>'
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
      // Devises au vote : celles de la liste, puis celles que des membres de la brigade ont proposées (une seule ligne par devise, accents et casse ignorés).
      const estNum = t => /^\d+$/.test(t), voixDev = {}, devAjoutees = [];
      Object.keys(voix.d).forEach(t => { const k = estNum(t) ? t : cle(t); voixDev[k] = (voixDev[k] || 0) + voix.d[t]; });
      Object.keys(voix.d).filter(t => !estNum(t)).sort((x, y) => voix.d[y] - voix.d[x] || x.localeCompare(y, "fr")).forEach(t => { if (!devAjoutees.some(x => cle(x) === cle(t))) devAjoutees.push(t); });
      const maDevise = typeof moi.d === "string" ? cle(moi.d) : moi.d;
      const note = (n, pris) => (n ? "<em>" + pl(n, "voix", "voix") + (pris ? " · retenu ailleurs" : "") + "</em>" : pris ? "<em>retenu ailleurs</em>" : "");
      // Sections du vote : celles que le joueur a ouvertes restent ouvertes ; au départ, la première où il n'a pas encore voté.
      const cles = ["n", "e", "d", "g"];
      if (!ouvertes) { const k0 = cles.find(k => moi[k] === undefined); ouvertes = new Set(k0 ? [k0] : []); }
      const section = (k, titre, resume, corps) => '<details class="pp-vote" data-k="' + k + '"' + (ouvertes.has(k) ? " open" : "") + "><summary><span>" + titre + "</span><small>" + resume + "</small></summary><div>" + corps + "</div></details>";
      const maVoix = (v, t) => (v === undefined ? "à voter" : "ma voix : " + t);
      el.innerHTML = '<div class="pp" style="--pp-c:' + B.c + '"><p class="ap-m">Carnet de brigade · ' + pl(ligne.n || 0, "membre", "membres") + '</p><h3 tabindex="-1" id="ppTitre">' + emblemeSvg(o.brigade) + " " + h(B.nom) + "</h3>"
        + '<ul class="pp-elus"><li>' + emblemeSvg(o.brigade) + "<span><small>Nom et emblème" + (ouvert ? " · provisoires" : "") + "</small><b>" + h(B.nom) + (ligne.titre === undefined ? " (pas encore de nom)" : "") + "</b></span></li>"
        + "<li>" + emblemeSvg(o.brigade) + "<span><small>Devise</small><b>" + (devise(ligne) ? "« " + h(devise(ligne)) + " »" : "Pas encore de devise") + "</b></span></li>"
        + "<li>" + (jeu && jeu.img ? '<img src="img/' + h(jeu.img) + '" alt="">' : emblemeSvg(o.brigade)) + "<span><small>Jeu emblème</small><b>" + (jeu ? h(jeu.n) : "Pas encore de jeu emblème") + "</b></span></li></ul>"
        + '<ul class="pp-membres">' + (o.membres || []).map(x => "<li>" + avatar(x.a, { brigade: o.brigade }) + h(x.p) + "</li>").join("") + "</ul>"
        + (ouvert ? '<form id="ppVote" novalidate>'
          + section("n", "Nom de la brigade", maVoix(moi.n, h(court(moi.n || ""))), '<div class="pp-devises" role="group" aria-label="Nom de la brigade">'
            + auVote.map((t, i) => '<label class="pp-dev"><input class="pp-vh" type="radio" name="ppNom" value="' + h(t) + '"' + (monNom === cle(t) ? " checked" : "") + "><span>" + h(t) + note(voixNom[cle(t)], nomsPris.has(cle(t))) + "</span></label>").join("") + "</div>"
            + '<label for="ppNomLibre">Ou proposer un autre nom</label><input class="pp-jeu" id="ppNomLibre" type="text" autocomplete="off" maxlength="40" placeholder="Brigade des…">'
            + '<p class="eg-hint">3 à 40 caractères. Visible de tous : jamais moqueur.</p>')
          + section("e", "Emblème", maVoix(moi.e, EMBLEMES[moi.e] ? EMBLEMES[moi.e].nom : ""), '<div class="pp-opts" role="group" aria-label="Emblème de la brigade">'
            + EMBLEMES.map((t, i) => '<label class="pp-opt"><input class="pp-vh" type="radio" name="ppEmbleme" value="' + i + '"' + (moi.e === i ? " checked" : "") + '><span>' + image(IMAGES[i], "pp-img", 'data-e="' + i + '"') + h(t.nom) + note(voix.e[i], emblPris.has(i)) + "</span></label>").join("") + "</div>")
          + section("d", "Devise", maVoix(moi.d, "choisie"), '<div class="pp-devises" role="group" aria-label="Devise de la brigade">'
            + DEVISES.map((t, i) => '<label class="pp-dev"><input class="pp-vh" type="radio" name="ppDevise" value="' + i + '"' + (maDevise === i ? " checked" : "") + "><span>" + h(t) + note(voixDev[i]) + "</span></label>").join("")
            + devAjoutees.map(t => '<label class="pp-dev"><input class="pp-vh" type="radio" name="ppDevise" value="' + h(t) + '"' + (maDevise === cle(t) ? " checked" : "") + "><span>" + h(t) + note(voixDev[cle(t)]) + "</span></label>").join("") + "</div>"
            + '<label for="ppDeviseLibre">Ou proposer une autre devise</label><input class="pp-jeu" id="ppDeviseLibre" type="text" autocomplete="off" maxlength="120" placeholder="Notre devise…">'
            + '<p class="eg-hint">5 à 120 caractères. Visible de tous : jamais moqueur.</p>')
          + section("g", "Jeu emblème", maVoix(moi.g, h(moi.g || "")), '<select class="pp-jeu" id="ppJeu" aria-label="Jeu emblème de la brigade"><option value="">Choisir un jeu du catalogue</option>'
            + cats.map(c => '<optgroup label="' + h((fam[c] || {}).n || c) + '">' + jeux.filter(g => g.c === c).sort((x, y) => x.n.localeCompare(y.n, "fr")).map(g => '<option value="' + h(g.n) + '"' + (moi.g === g.n ? " selected" : "") + ">" + h(g.n) + "</option>").join("") + "</optgroup>").join("") + "</select>"
            + (cites.length ? '<p class="eg-hint">Déjà cités : ' + cites.map(n => h(n) + " (" + voix.g[n] + ")").join(", ") + ".</p>" : ""))
          + '<p class="eg-hint">Une voix par rubrique, modifiable jusqu\'au ' + quand + " à minuit.</p><details class=\"eg-plus\"><summary>En cas d'égalité</summary><p>Deux brigades sur le même nom ou le même emblème : le plus de voix l'emporte, l'autre prend son choix suivant. Sans voix, la brigade garde son numéro.</p></details>"
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
        // Devise proposée : sans guillemets autour ; si elle est déjà dans la liste, c'est son numéro qui part.
        const devLibre = q("#ppDeviseLibre").value.replace(/\s+/g, " ").replace(/^[«"“ ]+|[»"” ]+$/g, ""), devChoisie = q('input[name="ppDevise"]:checked'), dansListe = DEVISES.findIndex(t => cle(t) === cle(devLibre));
        const maDev = devLibre ? (dansListe >= 0 ? dansListe : devLibre) : devChoisie ? (/^\d+$/.test(devChoisie.value) ? Number(devChoisie.value) : devChoisie.value) : undefined;
        const envoi = { titre: libre || (choisi ? choisi.value : undefined), embleme: coche("ppEmbleme"), devise: maDev, jeu: q("#ppJeu").value || undefined };
        const dit = (t, cls) => { q("#ppMsg").textContent = t; q("#ppMsg").className = "eg-msg " + cls; };
        if (libre && !/^\p{L}[\p{L}\p{N} .,&%'’-]{2,39}$/u.test(libre)) { ouvertes.add("n"); q("#ppNomLibre").focus(); return dit("Un nom de 3 à 40 caractères : des lettres, des chiffres, des espaces, sans autre signe.", "err"); }
        if (devLibre && !/^\p{L}[\p{L}\p{N} .,;:!?'’"…()«»-]{4,119}$/u.test(devLibre)) { ouvertes.add("d"); q("#ppDeviseLibre").focus(); return dit("Une devise de 5 à 120 caractères : des lettres, des chiffres et une ponctuation simple.", "err"); }
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

  window.PharmacoParticipants = { COULEURS, COIFFES, ACCESSOIRES, FLEURS, BRIGADES, NOMS, EMBLEMES, DEVISES, devise, tirage, maj, court, secours, avatar, embleme: emblemeSvg, decrire, fiche, brigade };
})();
