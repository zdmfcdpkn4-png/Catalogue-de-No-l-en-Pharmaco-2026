/* L'enquête des brigades, dans la page des Pharmacogames. Chargé à la demande par enigme.js.
   Le serveur (api/enigme.js) décide de tout et envoie tout : titre, étapes d'amorce, fiches, énoncés, propositions,
   révélations, points. Ce fichier ne contient ni titre, ni nom de fiche, ni énigme, ni réponse : le dépôt est public
   et la surprise doit tenir. Il dessine le champ `enquete` de l'état reçu et renvoie la réponse du joueur par la
   fonction `envoyer` que lui donne enigme.js.
   Règle : chaque membre dépose une seule réponse par énigme, définitive (la page avertit et demande une validation).
   Rien ne dit si elle est juste. À la clôture de l'énigme, la réponse majoritaire de la brigade est retenue : si elle
   est juste, l'énigme est acquise (`resolue`) ; fausse, pas de point ; à égalité, la réponse déposée la première l'emporte. La révélation sort dans tous les cas.
   Amorce : le champ `amorces` ne porte que les étapes acquises au joueur ([{n, titre, texte, fiche}]). Tant qu'il est
   vide, le bloc ne montre rien. Étape 1 seule : le message seul. Le titre attend une étape n >= 2 ; la fiche de suivi
   et les énigmes attendent une étape marquée `fiche`. Sans champ `amorces`, tout s'affiche.
   Fiche de suivi : `fiches` ([{id, cat, nom}], cat étant le libellé de la colonne), cochée d'après le champ `elimine`
   des énigmes closes. Quand les fiches portent `vue` (jour de décembre où la carte paraît dans le sapin), la fiche de
   suivi devient l'album de la brigade : une vignette par fiche, de face (img/enquete/vignettes/<id>.webp) dès que le
   jour courant atteint `vue`, de dos (img/enquete/vignettes/dos.webp) avant ; sans image, un pavé de repli. Une carte
   parue s'ouvre en grand au toucher (img/enquete/<id>.webp), un second toucher la double. Carte éliminée : tampon
   « Hors de cause » sur la vignette et en grand, nom lisible avec la mention en dessous. Le jour courant vient de
   `enquete.jour`, sinon de l'option `jour()`, sinon du jour de la dernière énigme ouverte ou close.
   Dé d'aide : `de` (1 à 6) sur une énigme, le même pour toute la brigade ; à 3 ou plus, `aide: {forme, texte, cle}`.
   Formes : clair, miroir (retourné ici par CSS), envers, morse (table repliable), decalage (`cle` rangs) ; toute autre
   forme s'affiche telle quelle.
   Vocabulaire de la page : la question du jour est un « défi » ; ce qu'il révèle à sa clôture est une « carte indice ».
   Carte indice : dessinée en CSS au thème des cartes (fond sarcelle sombre, liseré doré, engrenages aux coins), elle
   innocente une fiche (« Hors de cause » et son nom) ou verse une pièce au dossier (le texte de la révélation) ; tant
   que la brigade l'attend (`attente`), elle reste de dos. Les cartes reçues forment la collection, dans l'ordre.
   L'accusation, la quête secondaire et le défi `libre` (texte d'ambiance) gardent une révélation simple, hors collection.
   Révélation décalée : à la clôture, sans `revelation` mais avec `attente` (date), la page annonce « Révélation le … ».

   window.PharmacoEnquete.monter(element, {
     envoyer(k, reponse) : promesse de { status, j } (la réponse du serveur à l'action "enquete"),
     peutRepondre()      : vrai si le joueur a sa fiche et sa brigade,
     identifier()        : appelée quand un joueur sans fiche veut répondre (facultatif),
     brigade(b)          : nom affiché de la brigade b (facultatif),
     mienne()            : numéro de la brigade du joueur (facultatif),
     jour()              : jour courant de décembre, pour l'album (facultatif),
   }) rend { maj(enquete) } : à appeler à chaque nouvel état reçu du serveur. */
(() => {
  const h = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fr = s => h(s).replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
  const nl = s => fr(s).replace(/\r?\n/g, "<br>");
  const pl = (n, un, des) => n + " " + (n > 1 ? des : un);
  // Points du dé (cases d'une grille 3 x 3, de 0 à 8) et alphabet Morse : rien ici ne vient de l'enquête.
  const POINTS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const NIVEAU = ["", "pas d'aide cette fois", "pas d'aide cette fois", "aide légère", "aide légère", "aide forte", "aide forte"];
  const MORSE = "A.- B-... C-.-. D-.. E. F..-. G--. H.... I.. J.--- K-.- L.-.. M-- N-. O--- P.--. Q--.- R.-. S... T- U..- V...- W.-- X-..- Y-.-- Z--.. 0----- 1.---- 2..--- 3...-- 4....- 5..... 6-.... 7--... 8---.. 9----.".split(" ");

  const REFUS = {
    scellee: "Ce défi est encore sous scellé.",
    close: "Ce défi est clos : les réponses ne sont plus reçues.",
    profil: "Il faut une fiche d'identification et une brigade pour répondre.",
    deja: "Votre réponse est déjà déposée : une seule par membre et par défi.",
    reponse: "Réponse illisible : choisissez une proposition ou écrivez votre réponse.",
    code: "Code d'équipe refusé.",
  };

  const CSS = `
.enq{--eq-fond:#0F3D40;--eq-fonce:#0A2B2E;--eq-laiton:#C9A24B;--eq-clair:#F4E9CF;--eq-encre:#16302F;--eq-ok:#2E7D5B;--eq-ko:#A8472F;
  margin-top:18px;padding:16px;border:3px solid var(--eq-laiton);border-radius:16px;background:var(--eq-fond);color:var(--eq-clair);text-align:left}
.enq *{box-sizing:border-box}
.enq h3{margin:0;font-weight:800;font-size:1.3rem;line-height:1.15;color:var(--eq-laiton)}
.enq h4{margin:0 0 8px;font-weight:800;font-size:1rem;color:var(--eq-laiton)}
.enq-fic{display:inline-block;margin:6px 0 0;padding:2px 8px;border:1.5px solid var(--eq-laiton);border-radius:99px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
.enq-crime{margin:10px 0 0;line-height:1.45}
.enq-pts{margin:10px 0 0;font-weight:700}
.enq-sec{margin-top:16px;padding:12px;border-radius:12px;background:var(--eq-fonce)}
.enq-l{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.enq-e{padding:12px;border-radius:10px;background:var(--eq-clair);color:var(--eq-encre)}
.enq-e h5{margin:0;font-size:.95rem;font-weight:800}
.enq-e h5 small{display:block;font-weight:600;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;opacity:.75}
.enq-e p{margin:8px 0 0;line-height:1.45}
.enq-o{display:grid;gap:6px;margin:10px 0 0;padding:0;border:0}
.enq-o legend{padding:0;font-weight:700;font-size:.85rem}
.enq-o label{display:flex;gap:8px;align-items:center;min-height:40px;padding:4px 10px;border:2px solid var(--eq-encre);border-radius:8px;background:#fff;cursor:pointer}
.enq-o label:has(input:checked){background:#FBE9B7}
.enq-t{display:block;width:100%;min-height:44px;margin:10px 0 0;padding:8px 10px;border:2px solid var(--eq-encre);border-radius:8px;font:inherit;background:#fff;color:var(--eq-encre)}
.enq-b{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.enq-b button{min-height:44px;padding:8px 14px;border:2px solid var(--eq-encre);border-radius:8px;font:inherit;font-weight:800;background:var(--eq-laiton);color:var(--eq-encre);cursor:pointer}
.enq-b button.sec{background:transparent}
.enq-b button:disabled{opacity:.5;cursor:default}
.enq button:focus-visible,.enq input:focus-visible,.enq summary:focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px var(--eq-encre)}
.enq-warn{padding:8px 10px;border-left:5px solid var(--eq-ko);background:#fff;font-weight:700}
.enq-err{color:var(--eq-ko);font-weight:700}
.enq-etat{font-weight:800}
.enq-etat.ok{color:var(--eq-ok)}
.enq-etat.ko{color:var(--eq-ko)}
.enq-rev{padding:8px 10px;border:2px dashed var(--eq-encre);border-radius:8px;background:#fff}
.enq-rev b{display:block;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase}
.enq-next{margin:10px 0 0;font-size:.9rem;opacity:.9}
.enq-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.enq-cols h5{margin:0 0 6px;font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--eq-laiton)}
.enq-cols ul{display:grid;gap:4px;margin:0;padding:0;list-style:none}
.enq-cols li{display:flex;gap:8px;align-items:flex-start;line-height:1.3}
.enq-cols li i{flex:none;width:18px;height:18px;margin-top:1px;border:2px solid var(--eq-laiton);border-radius:4px;font-style:normal;font-weight:800;font-size:.8rem;line-height:14px;text-align:center}
.enq-cols li.x span{text-decoration:line-through;opacity:.6}
.enq-cols li small{display:block;font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;opacity:.8}
.enq-cil{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.enq-ci{position:relative;margin:10px 0 0;border:2px solid var(--eq-laiton);border-radius:12px;overflow:hidden;background:linear-gradient(160deg,#145055,#0A2B2E);color:#F4E9CF;text-align:center;box-shadow:inset 0 0 0 3px #0A2B2E,inset 0 0 0 4px rgba(201,162,75,.55)}
.enq-cil .enq-ci{margin:0;height:100%}
.enq-ci-b{position:relative;display:block;padding:7px 34px;border-bottom:2px solid #C9A24B;background:#0A2B2E;color:#C9A24B;font-weight:800;font-size:.74rem;letter-spacing:.12em;text-transform:uppercase}
.enq-ci::before,.enq-ci::after,.enq-ci-b::before,.enq-ci-b::after{content:"";position:absolute;width:24px;height:24px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32'%3E%3Ccircle r='11' fill='none' stroke='%23C9A24B' stroke-width='6' stroke-dasharray='4.32 4.32'/%3E%3Ccircle r='8.5' fill='%23C9A24B'/%3E%3Ccircle r='3.5' fill='%230A2B2E'/%3E%3C/svg%3E") center/contain no-repeat}
.enq-ci-b::before{left:5px;top:4px}
.enq-ci-b::after{right:5px;top:4px}
.enq-ci::before{left:-7px;bottom:-7px}
.enq-ci::after{right:-7px;bottom:-7px}
.enq-ci-c{padding:12px 16px 18px}
.enq-ci-n{display:block;font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#E6CD8B}
.enq-ci.hc .enq-ci-n{display:inline-block;padding:3px 10px;border:3px solid #A8472F;border-radius:5px;background:#F4E9CF;color:#A8472F;font-size:.8rem;font-weight:900;transform:rotate(-4deg)}
.enq-ci strong{display:block;margin-top:8px;font-size:1.05rem;line-height:1.2;color:#fff;overflow-wrap:anywhere}
.enq .enq-ci p{margin:8px 0 0;line-height:1.45;overflow-wrap:anywhere}
.enq-ci.dos{background:repeating-linear-gradient(45deg,#0F3D40 0 8px,#0A2B2E 8px 16px)}
.enq-ci.dos i{display:grid;place-items:center;width:46px;height:46px;margin:0 auto;border:2px solid #C9A24B;border-radius:50%;background:#0A2B2E;color:#C9A24B;font-style:normal;font-weight:900;font-size:1.4rem}
.enq-cl{display:grid;gap:4px;margin:0;padding:0;list-style:none;font-variant-numeric:tabular-nums}
.enq-cl li{display:flex;justify-content:space-between;gap:10px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.08)}
.enq-cl li.me{outline:2px solid var(--eq-laiton)}
.enq details summary{cursor:pointer;font-weight:700}
.enq-de{display:flex;gap:10px;align-items:center;margin:10px 0 0;font-weight:700;font-size:.9rem}
.enq-de i{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;width:40px;height:40px;padding:6px;border:2px solid var(--eq-encre);border-radius:9px;background:#fff;box-shadow:2px 2px 0 var(--eq-laiton);transform:rotate(-6deg)}
.enq-de i u{border-radius:50%}
.enq-de i u.p{background:var(--eq-encre)}
.enq-de small{display:block;font-weight:600;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;opacity:.75}
.enq-aide{margin:10px 0 0;padding:8px 10px;border-left:5px solid var(--eq-laiton);border-radius:0 8px 8px 0;background:#fff}
.enq-aide b{display:block;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase}
.enq-aide p{margin:4px 0 0;overflow-wrap:anywhere}
.enq-aide .miroir{display:inline-block;transform:scaleX(-1)}
.enq-aide .code{font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em}
.enq-aide small{display:block;margin-top:6px;font-size:.8rem;opacity:.85}
.enq-aide details{margin-top:6px;font-size:.85rem}
.enq-morse{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:2px 8px;margin:6px 0 0;padding:0;list-style:none;font-family:ui-monospace,Menlo,Consolas,monospace}
.enq-alb{margin:0 0 10px;font-size:.9rem}
.enq-cols.alb{grid-template-columns:1fr}
.enq-cols.alb ul{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px 8px}
.enq-cols.alb li{display:block;text-align:center;font-size:.8rem;line-height:1.25}
.enq-v{position:relative;display:grid;place-items:center;width:100%;aspect-ratio:680/1024;margin:0 0 4px;padding:4px;font-family:inherit;border:2px solid var(--eq-laiton);border-radius:8px;overflow:hidden;background:var(--eq-clair);color:var(--eq-encre);font-weight:800;font-size:.72rem;overflow-wrap:anywhere}
.enq-v.dos{background:repeating-linear-gradient(45deg,var(--eq-fond) 0 8px,var(--eq-fonce) 8px 16px);color:var(--eq-laiton);font-size:1.6rem}
.enq-v img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
button.enq-v{cursor:zoom-in}
.enq-cols.alb li.x span{text-decoration:none;opacity:1}
.enq-cols.alb li.x .enq-v img,.enq-zi.x img{filter:grayscale(.7) brightness(.8)}
.enq-zoom{position:fixed;inset:0;z-index:1000;overflow:auto;padding:64px 10px 24px;background:rgba(10,43,46,.96);color:#F4E9CF;text-align:center;-webkit-overflow-scrolling:touch}
.enq-zoom>[data-fin]{position:fixed;top:10px;right:10px;z-index:1;min-height:44px;padding:8px 14px;border:2px solid #16302F;border-radius:8px;font:inherit;font-weight:800;background:#C9A24B;color:#16302F;cursor:pointer}
.enq-zi{display:block;width:min(100%,440px);margin:0 auto;padding:0;border:0;background:none;cursor:zoom-in}
.enq-zi.zz{width:200%;max-width:1200px;cursor:zoom-out}
.enq-zi img{display:block;width:100%;height:auto;aspect-ratio:680/1024;border:3px solid #C9A24B;border-radius:12px;background:#F4E9CF}
.enq-zoom button:focus-visible{outline:3px solid #fff;outline-offset:2px}
.enq-zoom p{margin:10px 0 0;font-size:.9rem}
.enq-v{container-type:inline-size}
.enq-cols.alb li.x .enq-v::after,.enq-zi.x::after{content:"HORS\\A DE CAUSE";white-space:pre;position:absolute;left:50%;top:50%;width:84%;transform:translate(-50%,-50%) rotate(-18deg);padding:.2em 0;border:3px solid #A8472F;border-radius:5px;background:rgba(244,233,207,.3);text-shadow:0 0 4px #F4E9CF,0 0 2px #F4E9CF;color:#A8472F;font-size:.72rem;font-size:min(.72rem,10.5cqw);font-weight:900;letter-spacing:.05em;text-align:center;line-height:1.15;pointer-events:none}
.enq-zi{position:relative}
.enq-zi.x::after{font-size:2rem;font-size:10.5cqw;border-width:6px;border-radius:10px;background:rgba(244,233,207,.3);text-shadow:0 0 6px #F4E9CF,0 0 2px #F4E9CF}
.enq-zi{container-type:inline-size}
@media (prefers-reduced-motion:no-preference){.enq-e{transition:background .2s}}
`;
  const style = () => {
    if (document.getElementById("enqCss")) return;
    const s = document.createElement("style");
    s.id = "enqCss"; s.textContent = CSS; document.head.appendChild(s);
  };

  // `jour` d'une énigme : un jour de décembre (4 à 25) ou une date AAAA-MM-JJ.
  const dateDe = j => {
    if (typeof j === "string" && /^\d{4}-\d{2}-\d{2}$/.test(j)) { const d = Number(j.slice(8)); return (d === 1 ? "1er" : d) + " " + ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][Number(j.slice(5, 7)) - 1]; }
    return Number.isInteger(j) ? (j === 1 ? "1er" : j) + " décembre" : "";
  };

  function monter(el, options) {
    // Un seul bloc par élément : un second appel ne fait que remplacer les options (pas de double écoute des clics).
    if (el.pharmacoEnquete) { el.pharmacoEnquete.options(options); return el.pharmacoEnquete.bloc; }
    let opts = options || {};
    style();
    let Q = null, occupe = false;
    const saisie = {}, confirme = {}, erreur = {};
    const peut = () => (opts.peutRepondre ? Boolean(opts.peutRepondre()) : true);

    // Carte indice : ce que révèle un défi clos, hors accusation, quête secondaire et défi libre.
    const aCarte = e => !e.quete && !e.libre && e.k <= 21;
    const indice = e => {
      const tete = '<b class="enq-ci-b">Carte indice ' + e.k + '</b><div class="enq-ci-c">';
      if (!e.revelation) return '<div class="enq-ci dos" data-ci="' + e.k + '">' + tete + '<i aria-hidden="true">?</i><p>Carte indice attendue le ' + dateDe(e.attente) + ".</p></div></div>";
      if (!e.elimine) return '<div class="enq-ci" data-ci="' + e.k + '">' + tete + '<span class="enq-ci-n">Pièce versée au dossier</span><p>' + nl(e.revelation) + "</p></div></div>";
      const f = (Q.fiches || []).find(x => x.id === e.elimine), plat = t => String(t).toLowerCase().replace(/[\s\u00A0.]+/g, " ").trim();
      // Le texte du serveur n'est répété que s'il dit autre chose que « <nom> est hors de cause ».
      const redite = f && plat(e.revelation) === plat(f.nom + " est hors de cause");
      return '<div class="enq-ci hc" data-ci="' + e.k + '">' + tete + '<span class="enq-ci-n">Hors de cause</span>' + (f ? "<strong>" + h(f.nom) + "</strong>" : "") + (redite ? "" : "<p>" + nl(e.revelation) + "</p>") + "</div></div>";
    };
    const revelation = e => (aCarte(e) ? (e.revelation || (e.attente && dateDe(e.attente)) ? indice(e) : "") : e.revelation
      ? '<p class="enq-rev"><b>' + (e.quete ? "Quête secondaire" : e.elimine ? "Carte éliminée" : e.libre ? "Rien de neuf au dossier" : e.k > 21 ? "Pièce à conviction" : "Indice") + "</b>" + nl(e.revelation) + "</p>"
      : e.attente && dateDe(e.attente) ? '<p class="enq-rev"><b>Révélation</b>Révélation le ' + dateDe(e.attente) + ".</p>" : "");

    // Le dé de la brigade pour cette énigme, dessiné face visible, et l'aide qu'il donne à partir de 3.
    const de = e => {
      if (!Number.isInteger(e.de) || e.de < 1 || e.de > 6) return "";
      let s = '<p class="enq-de"><i role="img" aria-label="Dé : ' + e.de + '">' + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => "<u" + (POINTS[e.de].includes(i) ? ' class="p"' : "") + "></u>").join("")
        + "</i><span><small>Le dé de la brigade</small>" + e.de + " : " + NIVEAU[e.de] + ".</span></p>";
      const a = e.aide;
      if (!a || typeof a.texte !== "string" || !a.texte) return s;
      const cle = Number.isInteger(a.cle) && a.cle > 0 ? a.cle : 1;
      s += '<div class="enq-aide"><b>Aide du dé</b>';
      if (a.forme === "miroir") s += '<p><span class="miroir">' + nl(a.texte) + "</span></p><small>Aide écrite en miroir.</small>";
      else if (a.forme === "envers") s += "<p>" + nl(a.texte) + "</p><small>Aide écrite à l'envers.</small>";
      else if (a.forme === "morse") s += '<p class="code">' + nl(a.texte) + "</p><small>Aide en Morse. Une barre oblique sépare les mots.</small><details><summary>Table Morse</summary><ul class=\"enq-morse\">"
        + MORSE.map(m => "<li>" + m[0] + " " + m.slice(1) + "</li>").join("") + "</ul></details>";
      else if (a.forme === "decalage") s += '<p class="code">' + nl(a.texte) + "</p><small>Chaque lettre a été avancée de " + pl(cle, "rang", "rangs") + " dans l'alphabet : reculez-la d'autant.</small>";
      else s += "<p>" + nl(a.texte) + "</p>";
      return s + "</div>";
    };

    const formulaire = e => {
      const id = "enq" + e.k, v = saisie[e.k];
      let s = "";
      if (e.saisie === "choix" && Array.isArray(e.options)) {
        s += '<fieldset class="enq-o"><legend>Votre réponse</legend>' + e.options.map((o, i) =>
          '<label><input type="radio" name="' + id + '" value="' + i + '"' + (v === i ? " checked" : "") + (confirme[e.k] ? " disabled" : "") + "> <span>" + fr(o) + "</span></label>").join("") + "</fieldset>";
      } else {
        s += '<label for="' + id + '" style="display:block;margin-top:10px;font-weight:700;font-size:.85rem">Votre réponse</label>'
          + '<input class="enq-t" id="' + id + '" type="text" maxlength="60" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + h(typeof v === "string" ? v : "") + '"' + (confirme[e.k] ? " readonly" : "") + ">";
      }
      if (erreur[e.k]) s += '<p class="enq-err" role="alert">' + fr(erreur[e.k]) + "</p>";
      if (confirme[e.k]) {
        s += '<p class="enq-warn" role="alert">Une seule réponse par membre, définitive. À la clôture, la réponse majoritaire de votre brigade est retenue : concertez-vous avant de déposer.</p>'
          + '<div class="enq-b"><button type="button" data-envoi="' + e.k + '"' + (occupe ? " disabled" : "") + '>Je confirme, je dépose</button><button type="button" class="sec" data-non="' + e.k + '">Pas maintenant</button></div>';
      } else s += '<div class="enq-b"><button type="button" data-rep="' + e.k + '">Répondre</button></div>';
      return s;
    };

    // Lendemain du dernier jour d'ouverture (J+2) : `resultat` si le serveur le donne, sinon calculé pour un jour de décembre.
    const cloture = e => (e.resultat !== undefined ? dateDe(e.resultat) : Number.isInteger(e.jour) && e.jour + 3 <= 31 ? dateDe(e.jour + 3) : "");
    const carte = e => {
      const finale = e.k > 21 && !e.quete;
      let s = '<li class="enq-e" data-k="' + e.k + '"><h5><small>' + (e.quete ? "Quête secondaire" + (e.etat !== "close" && dateDe(e.ferme) ? " · jusqu'au " + dateDe(e.ferme) : "") : (finale ? "Dénouement" : "Défi " + e.k) + (dateDe(e.jour) ? " · " + dateDe(e.jour) : "")) + "</small>" + fr(e.titre || "") + "</h5>";
      if (e.enonce) s += "<p>" + nl(e.enonce) + "</p>";
      if (e.etat !== "close") s += de(e);
      if (e.etat === "close") {
        s += e.resolue
          ? '<p class="enq-etat ok">Défi réussi : la réponse majoritaire de la brigade était la bonne.' + (e.quete && e.prime ? (e.premiere ? " Votre brigade a été la première : prime de " + pl(e.prime, "point", "points") + "." : " Une autre brigade a été plus rapide : pas de prime.") : "") + (e.repondu ? (e.juste ? " La vôtre aussi." : " La vôtre ne l'était pas.") : "") + "</p>"
          : '<p class="enq-etat ko">Défi manqué : réponse majoritaire fausse ou aucune réponse. ' + (e.revelation ? (aCarte(e) ? "Carte indice donnée d'office, sans point." : "Révélation d'office, sans point.") : "Pas de point.") + "</p>";
        s += revelation(e);
      } else if (e.repondu) {
        s += '<p class="enq-etat">Votre réponse est déposée et scellée' + (e.reponse !== undefined && e.reponse !== null ? " : «\u00A0" + fr(Array.isArray(e.options) && Number.isInteger(e.reponse) ? e.options[e.reponse] : e.reponse) + "\u00A0»" : "") + ". "
          + (Number.isInteger(e.deposes) ? pl(e.deposes, "réponse déposée", "réponses déposées") + " dans la brigade. " : "") + "Résultat à la clôture" + (cloture(e) ? ", le " + cloture(e) : "") + ".</p>";
      } else if (!peut()) {
        s += '<p class="enq-etat">Pour répondre, il faut votre fiche d\'identification et votre brigade.</p>'
          + (opts.identifier ? '<div class="enq-b"><button type="button" data-fiche="1">Créer ma fiche</button></div>' : "");
      } else s += formulaire(e);
      return s + "</li>";
    };

    // Jour courant de décembre : donné par le serveur ou par enigme.js, sinon celui de la dernière énigme sortie.
    const aujourdhui = () => {
      if (Number.isInteger(Q.jour)) return Q.jour;
      const j = opts.jour ? opts.jour() : undefined;
      if (Number.isInteger(j)) return j;
      return Math.max(0, ...(Q.enigmes || []).filter(e => e.etat !== "avenir" && Number.isInteger(e.jour)).map(e => e.jour));
    };
    const album = () => Array.isArray(Q.fiches) && Q.fiches.some(f => Number.isInteger(f.vue));
    const suivi = () => {
      const F = Array.isArray(Q.fiches) ? Q.fiches : [], cats = [...new Set(F.map(f => f.cat))];
      const hors = new Set((Q.enigmes || []).filter(e => e.elimine).map(e => e.elimine));
      if (album()) {
        const j = aujourdhui(), recue = f => !Number.isInteger(f.vue) || j >= f.vue, id = f => encodeURIComponent(String(f.id));
        return '<p class="enq-alb">' + pl(F.filter(recue).length, "carte reçue", "cartes reçues") + " sur " + F.length + "." + (F.every(recue) ? "" : " Les autres paraîtront dans le sapin.") + "</p>"
          + '<div class="enq-cols alb">' + cats.map(c => "<div><h5>" + h(c) + "</h5><ul>" + F.filter(f => f.cat === c).map(f =>
            "<li" + (hors.has(f.id) ? ' class="x"' : "") + ">" + (recue(f)
              ? '<button type="button" class="enq-v" data-carte="' + h(f.id) + '" aria-label="Voir en grand : ' + h(f.nom) + (hors.has(f.id) ? ", hors de cause" : "") + '"><span aria-hidden="true">' + h(f.nom) + '</span><img src="img/enquete/vignettes/' + id(f) + '.webp" alt="" loading="lazy"></button>'
              : '<div class="enq-v dos" data-id="' + h(f.id) + '"><span aria-hidden="true">?</span><img src="img/enquete/vignettes/dos.webp" alt="" loading="lazy"></div>')
            + "<span>" + h(f.nom) + "</span>" + (hors.has(f.id) ? "<small>Hors de cause</small>" : recue(f) ? "" : "<small>Carte à venir</small>") + "</li>").join("") + "</ul></div>").join("") + "</div>";
      }
      return '<div class="enq-cols">' + cats.map(c => "<div><h5>" + h(c) + "</h5><ul>" + F.filter(f => f.cat === c).map(f =>
        '<li' + (hors.has(f.id) ? ' class="x"' : "") + '><i aria-hidden="true">' + (hors.has(f.id) ? "×" : "") + "</i><div><span>" + h(f.nom) + "</span>" + (hors.has(f.id) ? "<small>Hors de cause</small>" : "") + "</div></li>").join("") + "</ul></div>").join("") + "</div>";
    };

    function rendre() {
      if (!Q) { el.hidden = true; el.innerHTML = ""; return; }
      const actif = document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
      const repere = actif ? (actif.id ? "#" + actif.id : actif.dataset.rep ? '[data-rep="' + actif.dataset.rep + '"]' : actif.dataset.envoi ? '[data-envoi="' + actif.dataset.envoi + '"]' : actif.dataset.carte ? '[data-carte="' + actif.dataset.carte + '"]' : "") : "";
      const L = Q.enigmes || [], aVenir = L.filter(e => e.etat === "avenir");
      // Amorce : sans le champ, tout s'affiche ; avec, on ne montre que ce que les étapes reçues autorisent.
      const amorce = Array.isArray(Q.amorces), A = amorce ? Q.amorces.slice().sort((a, b) => b.n - a.n) : [];
      if (amorce && !A.length) { el.hidden = true; el.innerHTML = ""; return; }
      const devoile = !amorce || A.some(a => a.n >= 2), enJeu = !amorce || A.some(a => a.fiche);
      const vues = enJeu ? L.filter(e => e.etat !== "avenir") : [];
      const aFaire = vues.filter(e => e.etat === "ouverte" && !e.repondu), scellees = vues.filter(e => e.etat === "ouverte" && e.repondu), closes = vues.filter(e => e.etat === "close");
      const indices = closes.filter(e => aCarte(e) && (e.revelation || (e.attente && dateDe(e.attente)))), recues = indices.filter(e => e.revelation).length;
      const max = Q.max || 30, moi = opts.mienne ? opts.mienne() : undefined, commence = vues.length > 0;
      let s = "";
      if (devoile && Q.titre) s += "<h3>" + fr(Q.titre) + "</h3>" + (Q.fiction !== false ? '<p class="enq-fic">Fiction</p>' : "");
      if (A.length) {
        const une = a => "<h4>" + fr(a.titre || "") + '</h4><p style="margin:0;line-height:1.5">' + nl(a.texte || "") + "</p>";
        s += '<section class="enq-sec enq-am" aria-live="polite">' + une(A[0]) + "</section>";
        if (A.length > 1) s += '<section class="enq-sec"><details><summary>' + pl(A.length - 1, "message précédent", "messages précédents") + "</summary>" + A.slice(1).map(a => '<div style="margin-top:10px">' + une(a) + "</div>").join("") + "</details></section>";
      }
      if (commence) s += '<p class="enq-pts" role="status">Votre brigade : ' + pl(Q.points || 0, "point", "points") + " sur " + max + ". À la clôture de chaque défi, la réponse majoritaire de la brigade est retenue.</p>";
      if (enJeu) s += '<section class="enq-sec" aria-labelledby="enqT1"><h4 id="enqT1">' + (aFaire.length ? pl(aFaire.length, "défi à relever", "défis à relever") : "Aucun défi à relever pour l'instant") + "</h4>"
        + (aFaire.length ? '<ol class="enq-l">' + aFaire.map(carte).join("") + "</ol>" : "")
        + (aVenir.length ? '<p class="enq-next">Prochain défi' + (dateDe(aVenir[0].jour) ? " le " + dateDe(aVenir[0].jour) : " bientôt") + ". Chaque défi reste ouvert son jour et les deux jours suivants.</p>" : "") + "</section>";
      if (scellees.length) s += '<section class="enq-sec" aria-labelledby="enqT6"><h4 id="enqT6">' + pl(scellees.length, "réponse scellée", "réponses scellées") + '</h4><ol class="enq-l">' + scellees.map(carte).join("") + "</ol></section>";
      if (enJeu && Array.isArray(Q.fiches) && Q.fiches.length) s += '<section class="enq-sec" aria-labelledby="enqT2"><h4 id="enqT2">' + (album() ? "Album de la brigade" : "Fiche de suivi de la brigade") + "</h4>" + suivi() + "</section>";
      if (indices.length) s += '<section class="enq-sec" aria-labelledby="enqT3"><h4 id="enqT3">' + pl(recues, "carte indice reçue", "cartes indice reçues") + (recues < indices.length ? ", " + (indices.length - recues) + " en attente" : "") + '</h4><ol class="enq-cil">' + indices.map(e => "<li>" + indice(e) + "</li>").join("") + "</ol></section>";
      if (closes.length) s += '<section class="enq-sec"><details><summary>' + pl(closes.length, "défi clos", "défis clos") + '</summary><ol class="enq-l" style="margin-top:10px">' + closes.map(carte).join("") + "</ol></details></section>";
      if (enJeu && Q.denouement) s += '<section class="enq-sec" aria-labelledby="enqT4"><h4 id="enqT4">Dénouement</h4><p style="margin:0;line-height:1.5">' + nl(Q.denouement) + "</p></section>";
      if (commence && Array.isArray(Q.classement) && Q.classement.length) {
        const C = Q.classement.slice().sort((a, b) => b.points - a.points || a.b - b.b);
        s += '<section class="enq-sec" aria-labelledby="enqT5"><h4 id="enqT5">Les brigades à l\'enquête</h4><ol class="enq-cl">' + C.map(x =>
          "<li" + (x.b === moi ? ' class="me"' : "") + "><span>" + h(opts.brigade ? opts.brigade(x.b) : "Brigade " + (x.b + 1)) + "</span><b>" + pl(x.points, "point", "points") + "</b></li>").join("")
          + '</ol><p class="enq-next">Seuls les défis clos comptent ici.</p></section>';
      }
      el.className = "enq"; el.hidden = false; el.innerHTML = s;
      if (repere) { const f = el.querySelector(repere); if (f) f.focus({ preventScroll: true }); }
    }

    // Une carte parue en grand, par-dessus la page : un toucher la double, « Fermer » ou Échap la referme.
    const grand = id => {
      const f = (Q.fiches || []).find(x => String(x.id) === id);
      if (!f || document.querySelector(".enq-zoom")) return;
      const d = document.createElement("div"), x = (Q.enigmes || []).some(e => e.elimine === f.id);
      d.className = "enq-zoom"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-label", f.nom + (x ? ", hors de cause" : ""));
      d.innerHTML = '<button type="button" data-fin="1">Fermer</button><button type="button" class="enq-zi' + (x ? " x" : "") + '" aria-pressed="false" aria-label="Doubler la taille de la carte"><img src="img/enquete/' + encodeURIComponent(id) + '.webp" alt="' + h(f.nom) + '"></button><p>' + (x ? "Hors de cause. " : "") + 'Touchez la carte pour la doubler.</p>';
      const fermer = () => { d.remove(); document.removeEventListener("keydown", touche, true); const v = [...el.querySelectorAll("[data-carte]")].find(x => x.dataset.carte === id); if (v) v.focus({ preventScroll: true }); };
      const touche = ev => {
        if (ev.key === "Escape") { ev.stopPropagation(); fermer(); }
        else if (ev.key === "Tab" && !d.contains(ev.target)) { ev.preventDefault(); d.querySelector("button").focus(); }
      };
      d.addEventListener("click", ev => {
        const z = ev.target.closest(".enq-zi");
        if (z) { z.setAttribute("aria-pressed", String(z.classList.toggle("zz"))); return; }
        if (ev.target === d || ev.target.closest("[data-fin]")) fermer();
      });
      d.querySelector("img").addEventListener("error", () => { d.querySelector(".enq-zi").remove(); d.querySelector("p").textContent = (x ? "Hors de cause. " : "") + "Cette carte n'a pas encore son image en grand."; });
      document.addEventListener("keydown", touche, true);
      document.body.appendChild(d);
      d.querySelector("button").focus();
    };

    const lire = k => {
      const e = (Q.enigmes || []).find(x => x.k === k);
      if (!e) return undefined;
      if (e.saisie === "choix") { const c = el.querySelector('input[name="enq' + k + '"]:checked'); return c ? Number(c.value) : undefined; }
      const t = el.querySelector("#enq" + k);
      return t && t.value.trim() ? t.value.trim() : undefined;
    };

    el.addEventListener("error", ev => { const t = ev.target; if (t && t.tagName === "IMG" && t.closest(".enq-v")) t.remove(); }, true);
    el.addEventListener("input", ev => {
      const t = ev.target;
      if (t.matches('.enq-o input[type="radio"]')) saisie[Number(t.name.slice(3))] = Number(t.value);
      else if (t.matches(".enq-t")) saisie[Number(t.id.slice(3))] = t.value;
    });
    el.addEventListener("click", async ev => {
      const b = ev.target.closest("button");
      if (!b || !Q) return;
      if (b.dataset.fiche) return opts.identifier && opts.identifier();
      if (b.dataset.carte) return grand(b.dataset.carte);
      if (b.dataset.rep) {
        const k = Number(b.dataset.rep), v = lire(k);
        erreur[k] = v === undefined ? "Choisissez ou écrivez d'abord votre réponse." : "";
        if (v !== undefined) { saisie[k] = v; confirme[k] = true; }
        rendre();
        const f = el.querySelector('[data-envoi="' + k + '"]'); if (f) f.focus({ preventScroll: true });
        return;
      }
      if (b.dataset.non) { delete confirme[Number(b.dataset.non)]; return rendre(); }
      if (b.dataset.envoi && !occupe) {
        const k = Number(b.dataset.envoi), v = saisie[k];
        if (v === undefined || !opts.envoyer) return;
        occupe = true; b.disabled = true;
        let r;
        try { r = await opts.envoyer(k, v); } catch (e) { r = { status: 0, j: {} }; }
        occupe = false; delete confirme[k];
        const j = (r && r.j) || {};
        if (r && r.status === 200) { delete saisie[k]; erreur[k] = ""; }
        else erreur[k] = REFUS[j.error] || "Le serveur ne répond pas : votre essai n'est pas compté, réessayez.";
        if (j.enquete) Q = j.enquete;
        rendre();
      }
    });

    const bloc = { maj(enquete) { Q = enquete || null; rendre(); } };
    el.pharmacoEnquete = { bloc, options(o) { opts = o || {}; } };
    return bloc;
  }

  window.PharmacoEnquete = { monter };
})();
