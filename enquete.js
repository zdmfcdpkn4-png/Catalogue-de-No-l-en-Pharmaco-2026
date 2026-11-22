/* L'Affaire du Lot 22 : l'enquête des brigades, dans la page des Pharmacogames. Chargé à la demande par enigme.js.
   Une énigme par jour du 4 au 24 décembre, trois énigmes de dénouement le 25. Le serveur (api/enigme.js) décide de tout :
   dates, énoncés, validation, révélations, points. Ce fichier ne contient ni réponse ni solution : il dessine le champ
   `enquete` de l'état reçu et renvoie la réponse du joueur par la fonction `envoyer` que lui donne enigme.js.
   Un seul essai par membre et par énigme : la page avertit et demande une validation avant tout envoi.
   La fiche de suivi se coche d'après le champ `elimine` des énigmes dont la révélation est acquise.
   Amorce des 1er, 2 et 3 décembre : le champ `amorces` ne porte que les étapes acquises au joueur ([{n, titre, texte, fiche}]).
   Tant qu'il est vide et qu'aucune énigme n'est ouverte, le bloc ne montre rien : la surprise doit tenir. Avec la seule
   étape 1, ni titre ni synopsis. La fiche de suivi attend une étape marquée `fiche` (ou la première énigme).
   Les noms des dix-huit fiches sont publics ; leurs identifiants doivent rester accordés avec la banque du serveur.

   window.PharmacoEnquete.monter(element, {
     envoyer(k, reponse) : promesse de { status, j } (la réponse du serveur à l'action "enquete"),
     peutRepondre()      : vrai si le joueur a sa fiche et sa brigade,
     identifier()        : appelée quand un joueur sans fiche veut répondre (facultatif),
     brigade(b)          : nom affiché de la brigade b (facultatif),
     mienne()            : numéro de la brigade du joueur (facultatif),
   }) rend { maj(enquete) } : à appeler à chaque nouvel état reçu du serveur. */
(() => {
  const h = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fr = s => h(s).replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
  const pl = (n, un, des) => n + " " + (n > 1 ? des : un);

  const CRIME = "La veille d'une livraison urgente, le lot 22 de gélules a été falsifié. Quelqu'un a substitué le contenu, dans un lieu, avec un objet. À vous de le démasquer.";
  const CATEGORIES = [["p", "Personnages"], ["l", "Lieux"], ["o", "Objets"]];
  const FICHES = [
    { id: "lyse", c: "p", nom: "Inspectrice Anna Lyse" }, { id: "tiseptique", c: "p", nom: "Madame Anne Tiseptique" },
    { id: "erique", c: "p", nom: "Professeur Eugène Érique" }, { id: "lule", c: "p", nom: "Docteur Roger Lule" },
    { id: "yngue", c: "p", nom: "Capitaine Spencer Yngue" }, { id: "mine", c: "p", nom: "Mademoiselle Vita Mine" },
    { id: "bureau", c: "l", nom: "Le Bureau des Pharmaciens" }, { id: "preparatoire", c: "l", nom: "Le Préparatoire" },
    { id: "decontamination", c: "l", nom: "La Salle de Décontamination" }, { id: "pause", c: "l", nom: "La Salle de Pause" },
    { id: "production", c: "l", nom: "La Salle de Production" }, { id: "stockage", c: "l", nom: "La Zone de Stockage" },
    { id: "etiqueteuse", c: "o", nom: "L'Étiqueteuse" }, { id: "flacon", c: "o", nom: "Le Flacon Mystérieux" },
    { id: "glaciere", c: "o", nom: "La Glacière de Transport" }, { id: "mortier", c: "o", nom: "Le Mortier" },
    { id: "ordonnancier", c: "o", nom: "L'Ordonnancier" }, { id: "tampon", c: "o", nom: "Le Tampon Dateur" },
  ];
  const REFUS = {
    scellee: "Cette énigme est encore sous scellé.",
    close: "Cette énigme est close : la révélation est donnée d'office.",
    profil: "Il faut une fiche d'identification et une brigade pour répondre.",
    deja: "Réponse déjà enregistrée : un seul essai par membre, ou énigme déjà résolue par la brigade.",
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
.enq-ind{display:grid;gap:6px;margin:0;padding:0 0 0 18px}
.enq-cl{display:grid;gap:4px;margin:0;padding:0;list-style:none;font-variant-numeric:tabular-nums}
.enq-cl li{display:flex;justify-content:space-between;gap:10px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,.08)}
.enq-cl li.me{outline:2px solid var(--eq-laiton)}
.enq details summary{cursor:pointer;font-weight:700}
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

    const revelation = e => (e.revelation
      ? '<p class="enq-rev"><b>' + (e.elimine ? "Carte éliminée" : e.k > 21 ? "Pièce à conviction" : "Indice") + "</b>" + fr(e.revelation) + "</p>" : "");

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
        s += '<p class="enq-warn" role="alert">Un seul essai par membre pour cette énigme : votre réponse sera définitive. Si elle est fausse, seul un coéquipier pourra encore la résoudre.</p>'
          + '<div class="enq-b"><button type="button" data-envoi="' + e.k + '"' + (occupe ? " disabled" : "") + '>Je confirme, j\'envoie</button><button type="button" class="sec" data-non="' + e.k + '">Pas maintenant</button></div>';
      } else s += '<div class="enq-b"><button type="button" data-rep="' + e.k + '">Répondre</button></div>';
      return s;
    };

    const carte = e => {
      const finale = e.k > 21;
      let s = '<li class="enq-e" data-k="' + e.k + '"><h5><small>' + (finale ? "Dénouement" : "Énigme " + e.k) + (dateDe(e.jour) ? " · " + dateDe(e.jour) : "") + "</small>" + fr(e.titre || "") + "</h5>";
      if (e.enonce) s += "<p>" + fr(e.enonce) + "</p>";
      if (e.resolue) {
        s += '<p class="enq-etat ok">Résolue par la brigade' + (e.par ? " (" + h(e.par) + ")" : "") + (e.repondu && !e.juste ? ". Votre réponse n'était pas la bonne." : ".") + "</p>" + revelation(e);
      } else if (e.etat === "close") {
        s += '<p class="enq-etat ko">Close sans avoir été résolue : révélation d\'office, sans point.</p>' + revelation(e);
      } else if (e.repondu) {
        s += '<p class="enq-etat ko">Ce n\'était pas la bonne réponse, et votre essai est utilisé. Un coéquipier peut encore la résoudre.</p>';
      } else if (!peut()) {
        s += '<p class="enq-etat">Pour répondre, il faut votre fiche d\'identification et votre brigade.</p>'
          + (opts.identifier ? '<div class="enq-b"><button type="button" data-fiche="1">Créer ma fiche</button></div>' : "");
      } else s += formulaire(e);
      return s + "</li>";
    };

    const suivi = () => {
      const hors = new Set((Q.enigmes || []).filter(e => e.elimine).map(e => e.elimine));
      return '<div class="enq-cols">' + CATEGORIES.map(([c, nom]) => "<div><h5>" + nom + "</h5><ul>" + FICHES.filter(f => f.c === c).map(f =>
        '<li' + (hors.has(f.id) ? ' class="x"' : "") + '><i aria-hidden="true">' + (hors.has(f.id) ? "×" : "") + "</i><div><span>" + h(f.nom) + "</span>" + (hors.has(f.id) ? "<small>Hors de cause</small>" : "") + "</div></li>").join("") + "</ul></div>").join("") + "</div>";
    };

    function rendre() {
      if (!Q) { el.hidden = true; el.innerHTML = ""; return; }
      const actif = document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
      const repere = actif ? (actif.id ? "#" + actif.id : actif.dataset.rep ? '[data-rep="' + actif.dataset.rep + '"]' : actif.dataset.envoi ? '[data-envoi="' + actif.dataset.envoi + '"]' : "") : "";
      const L = Q.enigmes || [], vues = L.filter(e => e.etat !== "avenir"), ouvertes = vues.filter(e => e.etat === "ouverte" && !e.resolue);
      const passees = vues.filter(e => !(e.etat === "ouverte" && !e.resolue)), aVenir = L.filter(e => e.etat === "avenir");
      const indices = vues.filter(e => e.revelation && !e.elimine && e.k <= 21);
      const max = Q.max || 30, moi = opts.mienne ? opts.mienne() : undefined;
      // Amorce : sans le champ, tout s'affiche ; avec, on ne montre que ce que les étapes reçues autorisent.
      const amorce = Array.isArray(Q.amorces), A = amorce ? Q.amorces.slice().sort((a, b) => b.n - a.n) : [];
      const enJeu = vues.length > 0;
      if (amorce && !A.length && !enJeu) { el.hidden = true; el.innerHTML = ""; return; }
      const devoile = !amorce || enJeu || A.some(a => a.n >= 2), avecFiche = !amorce || enJeu || A.some(a => a.fiche);
      let s = "";
      if (devoile) s += "<h3>" + fr(Q.titre || "L'Affaire du Lot 22") + "</h3>" + (Q.fiction !== false ? '<p class="enq-fic">Fiction</p>' : "");
      if (!amorce) s += '<p class="enq-crime">' + fr(CRIME) + "</p>";
      if (A.length) {
        const une = a => "<h4>" + fr(a.titre || "") + '</h4><p style="margin:0;line-height:1.5">' + fr(a.texte || "") + "</p>";
        s += '<section class="enq-sec enq-am" aria-live="polite">' + une(A[0]) + "</section>";
        if (A.length > 1) s += '<section class="enq-sec"><details><summary>' + pl(A.length - 1, "message précédent", "messages précédents") + "</summary>" + A.slice(1).map(a => '<div style="margin-top:10px">' + une(a) + "</div>").join("") + "</details></section>";
      }
      if (enJeu) s += '<p class="enq-pts" role="status">Votre brigade : ' + pl(Q.points || 0, "point", "points") + " sur " + max + ". Une énigme résolue dans les temps par un membre compte pour toute la brigade.</p>";
      if (devoile) s += '<section class="enq-sec" aria-labelledby="enqT1"><h4 id="enqT1">' + (ouvertes.length ? pl(ouvertes.length, "énigme à résoudre", "énigmes à résoudre") : "Aucune énigme à résoudre pour l'instant") + "</h4>"
        + (ouvertes.length ? '<ol class="enq-l">' + ouvertes.map(carte).join("") + "</ol>" : "")
        + (aVenir.length ? '<p class="enq-next">Prochaine énigme' + (dateDe(aVenir[0].jour) ? " le " + dateDe(aVenir[0].jour) : " bientôt") + ". Chaque énigme reste ouverte son jour et les deux jours suivants.</p>" : "") + "</section>";
      if (avecFiche) s += '<section class="enq-sec" aria-labelledby="enqT2"><h4 id="enqT2">Fiche de suivi de la brigade</h4>' + suivi() + "</section>";
      if (indices.length) s += '<section class="enq-sec" aria-labelledby="enqT3"><h4 id="enqT3">Carnet d\'indices</h4><ol class="enq-ind">' + indices.map(e => "<li>" + fr(e.revelation) + "</li>").join("") + "</ol></section>";
      if (passees.length) s += '<section class="enq-sec"><details><summary>' + pl(passees.length, "énigme passée", "énigmes passées") + '</summary><ol class="enq-l" style="margin-top:10px">' + passees.map(carte).join("") + "</ol></details></section>";
      if (Q.denouement) s += '<section class="enq-sec" aria-labelledby="enqT4"><h4 id="enqT4">Dénouement</h4><p style="margin:0;line-height:1.5">' + fr(Q.denouement) + "</p></section>";
      if (enJeu && Array.isArray(Q.classement) && Q.classement.length) {
        const C = Q.classement.slice().sort((a, b) => b.points - a.points || a.b - b.b);
        s += '<section class="enq-sec" aria-labelledby="enqT5"><h4 id="enqT5">Les brigades à l\'enquête</h4><ol class="enq-cl">' + C.map(x =>
          "<li" + (x.b === moi ? ' class="me"' : "") + "><span>" + h(opts.brigade ? opts.brigade(x.b) : "Brigade " + (x.b + 1)) + "</span><b>" + pl(x.points, "point", "points") + "</b></li>").join("")
          + '</ol><p class="enq-next">Seules les énigmes closes comptent ici.</p></section>';
      }
      el.className = "enq"; el.hidden = false; el.innerHTML = s;
      if (repere) { const f = el.querySelector(repere); if (f) f.focus({ preventScroll: true }); }
    }

    const lire = k => {
      const e = (Q.enigmes || []).find(x => x.k === k);
      if (!e) return undefined;
      if (e.saisie === "choix") { const c = el.querySelector('input[name="enq' + k + '"]:checked'); return c ? Number(c.value) : undefined; }
      const t = el.querySelector("#enq" + k);
      return t && t.value.trim() ? t.value.trim() : undefined;
    };

    el.addEventListener("input", ev => {
      const t = ev.target;
      if (t.matches('.enq-o input[type="radio"]')) saisie[Number(t.name.slice(3))] = Number(t.value);
      else if (t.matches(".enq-t")) saisie[Number(t.id.slice(3))] = t.value;
    });
    el.addEventListener("click", async ev => {
      const b = ev.target.closest("button");
      if (!b || !Q) return;
      if (b.dataset.fiche) return opts.identifier && opts.identifier();
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

  window.PharmacoEnquete = { monter, FICHES };
})();
