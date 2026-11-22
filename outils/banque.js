// Coffre des énigmes : chiffre et déchiffre la banque de questions lue par api/enigme.js.
// Le dépôt est public : la banque en clair (questions, réponses, explications) ne doit jamais y entrer.
// Seul api/_banque.js, chiffré avec le code d'administration (variable ADMIN_CODE), est versionné.
//
//   ADMIN_CODE=… node outils/banque.js chiffrer banque.json      écrit api/_banque.js
//   ADMIN_CODE=… node outils/banque.js dechiffrer > banque.json  rend la banque en clair
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COFFRE = path.join(__dirname, '..', 'api', '_banque.js');
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cle = (code, sel) => crypto.scryptSync(norm(code), sel, 32);

function controler(b) {
  const e = [];
  if (!b || !Array.isArray(b.portes) || b.portes.length !== 25) return ['il faut exactement 25 portes'];
  const JEUX = ['bowling', 'tir', 'flipper', 'tennis', 'labyrinthe', 'basket', 'penalty', 'volley', 'haies', 'etageres', 'pastilles', 'twirling', 'tour', 'seringue', 'minigolf', 'badminton'];
  const chrono = (x, ou) => { if (!Number.isInteger(x.duree) || x.duree < 10 || x.duree > 180) e.push(ou + 'durée du chrono entre 10 et 180 secondes'); };
  // Une question, seule dans sa porte ou dans une case de cinq.
  const question = (p, ou) => {
    for (const k of ['question', 'explication']) if (typeof p[k] !== 'string' || !p[k]) e.push(ou + k + ' manquant');
    if (p.type === 'qcm') {
      if (!Array.isArray(p.options) || p.options.length !== 4 || p.options.some(o => !o || typeof o.t !== 'string' || !o.t)) e.push(ou + 'il faut 4 propositions');
      if (!Number.isInteger(p.bonne) || p.bonne < 0 || p.bonne > 3) e.push(ou + 'bonne réponse entre 0 et 3');
    } else if (p.type === 'dose') {
      if (!Number.isInteger(p.bonne) || p.bonne < 0 || p.bonne > 100) e.push(ou + 'valeur cible entre 0 et 100');
      if (typeof p.unite !== 'string') e.push(ou + 'unité manquante');
    } else e.push(ou + 'type de question inconnu');
    chrono(p, ou);
  };
  const jeu = (p, ou) => {
    for (const k of ['question', 'explication']) if (typeof p[k] !== 'string' || !p[k]) e.push(ou + k + ' manquant');
    if (!JEUX.includes(p.jeu)) e.push(ou + 'jeu inconnu');
    if (!Number.isInteger(p.essais) || p.essais < 1 || p.essais > 3) e.push(ou + 'nombre de tentatives entre 1 et 3');
    chrono(p, ou);
  };
  b.portes.forEach((p, i) => {
    const ou = 'porte ' + (i + 1) + ' : ';
    if (p.n !== i + 1) e.push(ou + 'numéro attendu ' + (i + 1));
    for (const k of ['titre', 'ill']) if (typeof p[k] !== 'string' || !p[k]) e.push(ou + k + ' manquant');
    if (p.type === 'quiz') {
      if (!Array.isArray(p.questions) || p.questions.length !== 5) e.push(ou + 'il faut exactement 5 questions');
      else p.questions.forEach((c, k) => question(c, ou + 'question ' + (k + 1) + ' : '));
    } else if (p.type === 'jeu') jeu(p, ou);
    else if (p.type === 'duo') {
      // Porte à plusieurs jeux (la finale) : deux jeux différents, chacun avec son titre et son illustration.
      if (!Array.isArray(p.jeux) || p.jeux.length !== 2 || p.jeux[0].jeu === p.jeux[1].jeu) e.push(ou + 'il faut exactement 2 jeux différents');
      else p.jeux.forEach((c, k) => { for (const x of ['titre', 'ill']) if (typeof c[x] !== 'string' || !c[x]) e.push(ou + 'jeu ' + (k + 1) + ' : ' + x + ' manquant'); jeu(c, ou + 'jeu ' + (k + 1) + ' : '); });
    } else question(p, ou);
    if (/—/.test(JSON.stringify(p))) e.push(ou + 'tiret cadratin');
  });
  // Enquête, facultative : une énigme par jour, réponse au choix ou en texte.
  const enquete = E => {
    const ou = 'enquête : ';
    if (!E || typeof E.titre !== 'string' || !E.titre || !Array.isArray(E.enigmes) || !E.enigmes.length) e.push(ou + 'titre et énigmes attendus');
    else {
      if (new Set(E.enigmes.map(c => c.k)).size !== E.enigmes.length) e.push(ou + 'numéros d\'énigme en double');
      E.enigmes.forEach(c => {
        const o = ou + 'énigme ' + c.k + ' : ';
        if (!Number.isInteger(c.k) || c.k < 1) e.push(o + 'numéro entier attendu');
        if (!Number.isInteger(c.n) || c.n < 1 || c.n > 25) e.push(o + 'jour entre 1 et 25');
        if (!Number.isInteger(c.pts) || c.pts < 0 || c.pts > 10) e.push(o + 'points entre 0 et 10');
        for (const k of ['titre', 'enonce', 'revelation']) if (typeof c[k] !== 'string' || !c[k]) e.push(o + k + ' manquant');
        if (c.saisie === 'choix') {
          if (!Array.isArray(c.options) || c.options.length < 2 || c.options.some(x => typeof x !== 'string' || !x)) e.push(o + 'au moins 2 propositions');
          else if (!Number.isInteger(c.bonne) || c.bonne < 0 || c.bonne >= c.options.length) e.push(o + 'bonne réponse hors des propositions');
        } else if (c.saisie === 'texte') {
          if (!Array.isArray(c.reponses) || !c.reponses.length || c.reponses.some(x => typeof x !== 'string' || !norm(x).replace(/[^a-z0-9]/g, ''))) e.push(o + 'réponses acceptées manquantes');
        } else e.push(o + 'saisie inconnue');
      });
      if (E.amorces !== undefined && (!Array.isArray(E.amorces) || E.amorces.some(a => !a || !Number.isInteger(a.n) || a.n < 1 || a.n > 25 || typeof a.titre !== 'string' || !a.titre || typeof a.texte !== 'string' || !a.texte))) e.push(ou + 'amorces : jour, titre et texte attendus');
      if (E.fiches !== undefined) {
        if (!Array.isArray(E.fiches) || E.fiches.some(f => !f || typeof f.id !== 'string' || !f.id || typeof f.cat !== 'string' || !f.cat || typeof f.nom !== 'string' || !f.nom)) e.push(ou + 'fiches : id, cat et nom attendus');
        else E.enigmes.forEach(c => { if (c.elimine && !E.fiches.some(f => f.id === c.elimine)) e.push(ou + 'énigme ' + c.k + ' : élimine une fiche inconnue'); });
      }
      if (/—/.test(JSON.stringify(E))) e.push(ou + 'tiret cadratin');
    }
  };
  if (b.enquete !== undefined) {
    const E = b.enquete, R = E && E.reservoir, ou = 'enquête à tirage : ';
    if (!R) enquete(E);
    else {
      // Enquête à tirage : le réservoir, puis des compositions d'essai contrôlées comme une enquête écrite.
      const F = Array.isArray(E.fiches) ? E.fiches : [], cats = [...new Set(F.map(f => f.cat))], avant = e.length;
      if (!F.length) e.push(ou + 'fiches attendues');
      if (!R.cartes || typeof R.cartes !== 'object') e.push(ou + 'cartes attendues');
      else F.forEach(f => {
        const c = R.cartes[f.id], o = ou + 'carte ' + f.id + ' : ';
        if (!c) return e.push(o + 'absente du réservoir');
        if (!c.devinette || typeof c.devinette.titre !== 'string' || !c.devinette.titre || typeof c.devinette.enonce !== 'string' || !c.devinette.enonce) e.push(o + 'devinette (titre, enonce) attendue');
        if (!R.grille && (!Array.isArray(c.indices) || !c.indices.length || c.indices.some(x => typeof x !== 'string' || !x))) e.push(o + 'indices attendus');
        if (R.grille && (c.variantes || []).some(x => !x.id || ![1, 2, 3].includes(x.niveau) || !x.titre || !x.enonce || !Array.isArray(x.aides) || x.aides.length !== 2)) e.push(o + 'variantes : id, niveau de 1 à 3, titre, énoncé et deux aides attendus');
        if (typeof c.preuve !== 'string' || !c.preuve) e.push(o + 'preuve attendue');
      });
      const P = Array.isArray(R.plan) ? R.plan : [];
      if (!P.length) e.push(ou + 'plan attendu');
      const genres = R.grille ? ['carte', 'attribut', 'libre', 'final'] : ['carte', 'indice', 'final'];
      if (P.some(s => !genres.includes(s.r) || (s.r !== 'indice' && s.r !== 'libre' && !cats.includes(s.cat)))) e.push(ou + 'plan : genre ou catégorie inconnus');
      for (const c of cats) {
        if (P.filter(s => s.r === 'carte' && s.cat === c).length > F.filter(f => f.cat === c).length - 1) e.push(ou + 'plan : trop d\'éliminations en ' + c);
        if (P.filter(s => s.r === 'final' && s.cat === c).length !== 1) e.push(ou + 'plan : un dénouement et un seul en ' + c);
      }
      if (R.grille) {
        // Réservoir à grille : identifiants uniques, niveaux, deux aides, une méta-énigme et une seule, dénouement neutre.
        const L = Array.isArray(R.logiques) ? R.logiques : [], ids = L.map(x => x.id).concat(...Object.values(R.cartes || {}).map(c => (c.variantes || []).map(x => x.id)));
        if (ids.some(x => !x) || new Set(ids).size !== ids.length) e.push(ou + 'identifiants d\'énigme absents ou en double');
        if (L.some(x => ![1, 2, 3].includes(x.niveau))) e.push(ou + 'niveau de 1 à 3 attendu pour chaque énigme de logique');
        if (L.some(x => !Array.isArray(x.aides) || x.aides.length !== 2 || x.aides.some(a => !(typeof a === 'string' ? a : a && a.texte) || !['clair', 'miroir', 'envers', 'morse', 'decalage', 'couleur', 'emoji'].includes((a && a.forme) || 'clair')))) e.push(ou + 'deux aides, de forme connue, attendues par énigme');
        if (L.filter(x => x.meta).length !== 1) e.push(ou + 'une méta-énigme et une seule attendue');
        if (L.some(x => x.requiert && [].concat(x.requiert).some(q => q !== 'scelle'))) e.push(ou + 'valeur de requiert inconnue');
        if (P.some(s => s.r === 'final' && (!s.titre || !s.enonce))) e.push(ou + 'dénouement : titre et énoncé attendus dans le plan');
        if (Object.keys(R.grille).filter(c => c[0] !== '_').some(c => !cats.includes(c) || F.filter(f => f.cat === c).some(f => !R.grille[c].cartes.includes(f.id)))) e.push(ou + 'grille : catégories ou cartes qui ne correspondent pas aux fiches');
      }
      const nbInd = P.filter(s => s.r === 'indice' || s.r === 'attribut' || s.r === 'libre').length;
      if (!Array.isArray(R.logiques) || R.logiques.length < nbInd) e.push(ou + 'il faut au moins ' + nbInd + ' énigmes de logique');
      if (R.cartes && F.length && cats.some(c => F.filter(f => f.cat === c).some(f => R.cartes[f.id] && Array.isArray(R.cartes[f.id].indices) && R.cartes[f.id].indices.length * cats.length < nbInd))) e.push(ou + 'pas assez d\'indices par carte pour ' + nbInd + ' énigmes de logique');
      if (typeof R.denouement !== 'string' || !R.denouement) e.push(ou + 'dénouement attendu');
      if (/—/.test(JSON.stringify(R))) e.push(ou + 'tiret cadratin');
      if (e.length === avant) {
        const { composer } = require('../api/enigme.js'), vus = new Set(e);
        for (let i = 0; i < 40; i++) {
          let C; const n = e.length;
          try { C = composer(E, 'controle-' + i); } catch (x) { e.push(ou + 'composition impossible : ' + x.message); break; }
          if (R.grille) { if (C.enigmes.filter(x => x.id && /scelle/.test(JSON.stringify((R.logiques.find(y => y.id === x.id) || {}).requiert || ''))).length !== R.logiques.filter(x => x.requiert).length) e.push(ou + 'une énigme de l\'enveloppe n\'est pas placée'); if (!C.enigmes.some(x => (R.logiques.find(y => y.id === x.id) || {}).meta)) e.push(ou + 'la méta-énigme n\'est pas placée'); }
          enquete(C);
          if (/\{[^{}]+\}/.test(C.denouement)) e.push(ou + 'dénouement : un trou n\'est pas rempli');
          for (const x of e.splice(n)) if (!vus.has(x)) { vus.add(x); e.push(x); }
        }
      }
    }
  }
  return e;
}

const [, , action, fichier] = process.argv;
const code = process.env.ADMIN_CODE;
if (!code || !['chiffrer', 'dechiffrer'].includes(action)) {
  console.error('Usage : ADMIN_CODE=… node outils/banque.js chiffrer banque.json | dechiffrer');
  process.exit(2);
}
if (action === 'chiffrer') {
  const b = JSON.parse(fs.readFileSync(fichier, 'utf8'));
  const e = controler(b);
  if (e.length) { console.error(e.join('\n')); process.exit(1); }
  const sel = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', cle(code, sel), iv);
  const data = Buffer.concat([c.update(JSON.stringify(b), 'utf8'), c.final()]);
  const coffre = { v: 1, sel: sel.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') };
  fs.writeFileSync(COFFRE, '// Banque des énigmes, chiffrée (AES-256-GCM). Se régénère avec outils/banque.js ; ne pas modifier à la main.\nmodule.exports = ' + JSON.stringify(coffre) + ';\n');
  console.error('Coffre écrit : ' + b.portes.length + ' portes, ' + data.length + ' octets.');
} else {
  const k = require(COFFRE);
  const d = crypto.createDecipheriv('aes-256-gcm', cle(code, Buffer.from(k.sel, 'base64')), Buffer.from(k.iv, 'base64'));
  d.setAuthTag(Buffer.from(k.tag, 'base64'));
  process.stdout.write(JSON.stringify(JSON.parse(Buffer.concat([d.update(Buffer.from(k.data, 'base64')), d.final()]).toString('utf8')), null, 1) + '\n');
}
