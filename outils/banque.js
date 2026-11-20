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
  b.portes.forEach((p, i) => {
    const ou = 'porte ' + (i + 1) + ' : ';
    if (p.n !== i + 1) e.push(ou + 'numéro attendu ' + (i + 1));
    for (const k of ['titre', 'question', 'ill', 'explication']) if (typeof p[k] !== 'string' || !p[k]) e.push(ou + k + ' manquant');
    if (p.type === 'qcm') {
      if (!Array.isArray(p.options) || p.options.length !== 4 || p.options.some(o => !o || typeof o.t !== 'string' || !o.t)) e.push(ou + 'il faut 4 propositions');
      if (!Number.isInteger(p.bonne) || p.bonne < 0 || p.bonne > 3) e.push(ou + 'bonne réponse entre 0 et 3');
    } else if (p.type === 'dose') {
      if (!Number.isInteger(p.bonne) || p.bonne < 0 || p.bonne > 100) e.push(ou + 'valeur cible entre 0 et 100');
      if (typeof p.unite !== 'string') e.push(ou + 'unité manquante');
    } else if (p.type === 'jeu') {
      if (!['bowling', 'tir', 'flipper'].includes(p.jeu)) e.push(ou + 'jeu inconnu');
      if (!Number.isInteger(p.essais) || p.essais < 1 || p.essais > 3) e.push(ou + 'nombre de tentatives entre 1 et 3');
    } else e.push(ou + 'type inconnu');
    if (!Number.isInteger(p.duree) || p.duree < 10 || p.duree > 120) e.push(ou + 'durée du chrono entre 10 et 120 secondes');
    if (/—/.test(JSON.stringify(p))) e.push(ou + 'tiret cadratin');
  });
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
