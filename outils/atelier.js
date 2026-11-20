// Atelier : range et ressort les outils de travail qui ne doivent pas être lisibles dans le dépôt public,
// parce qu'ils contiennent les questions et leurs réponses (fabrique de la banque, bancs d'essai, contrôles en ligne).
// Le dossier est compressé puis chiffré avec le code d'administration (variable ADMIN_CODE), comme la banque.
//
//   ADMIN_CODE=… node outils/atelier.js sortir            recrée le dossier atelier/ (ignoré par git)
//   ADMIN_CODE=… node outils/atelier.js ranger            rechiffre atelier/ dans outils/atelier.enc
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const COFFRE = path.join(__dirname, 'atelier.enc');
const DOSSIER = path.join(__dirname, '..', 'atelier');
const IGNORES = /(^|\/)(node_modules|captures|banque\.json)(\/|$)|\.png$/; // rien de lourd ni de régénérable
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cle = (code, sel) => crypto.scryptSync(norm(code), sel, 32);

function lister(dir, base = '') {
  let L = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const rel = base ? base + '/' + f : f, abs = path.join(dir, f);
    if (IGNORES.test(rel)) continue;
    if (fs.statSync(abs).isDirectory()) L = L.concat(lister(abs, rel)); else L.push(rel);
  }
  return L;
}

const action = process.argv[2], code = process.env.ADMIN_CODE;
if (!code || !['ranger', 'sortir'].includes(action)) {
  console.error('Usage : ADMIN_CODE=… node outils/atelier.js sortir | ranger');
  process.exit(2);
}
if (action === 'ranger') {
  const fichiers = {};
  for (const f of lister(DOSSIER)) fichiers[f] = fs.readFileSync(path.join(DOSSIER, f)).toString('base64');
  const clair = zlib.gzipSync(Buffer.from(JSON.stringify({ v: 1, fichiers })));
  const sel = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', cle(code, sel), iv);
  const data = Buffer.concat([c.update(clair), c.final()]);
  fs.writeFileSync(COFFRE, Buffer.concat([Buffer.from('ATELIER1'), sel, iv, c.getAuthTag(), data]));
  console.error('Atelier rangé : ' + Object.keys(fichiers).length + ' fichiers, ' + data.length + ' octets chiffrés.');
} else {
  const b = fs.readFileSync(COFFRE);
  if (b.subarray(0, 8).toString() !== 'ATELIER1') { console.error('Fichier inattendu.'); process.exit(1); }
  const d = crypto.createDecipheriv('aes-256-gcm', cle(code, b.subarray(8, 24)), b.subarray(24, 36));
  d.setAuthTag(b.subarray(36, 52));
  let contenu;
  try { contenu = JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(b.subarray(52)), d.final()])).toString('utf8')); }
  catch (e) { console.error('Le code d\'administration ne déchiffre pas l\'atelier.'); process.exit(1); }
  for (const [f, v] of Object.entries(contenu.fichiers)) {
    const abs = path.join(DOSSIER, f);
    if (!abs.startsWith(DOSSIER + path.sep)) continue;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, Buffer.from(v, 'base64'));
  }
  console.error('Atelier sorti dans atelier/ : ' + Object.keys(contenu.fichiers).length + ' fichiers.');
}
