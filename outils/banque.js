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
  if (b.enquete !== undefined) {
    const E = b.enquete, ou = 'enquête : ';
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
      if (/—/.test(JSON.stringify(E))) e.push(ou + 'tiret cadratin');
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
