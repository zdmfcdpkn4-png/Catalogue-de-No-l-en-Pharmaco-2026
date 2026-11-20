// La grande énigme de Noël : 25 portes, une par jour du 1er au 25 décembre 2026 (heure de Paris).
// Chaque porte reste ouverte son jour, le lendemain et le surlendemain. Une seule réponse par prénom et par porte.
// La bonne réponse et les points ne sortent du serveur qu'à la clôture de la porte ; le classement suit.
// Tout passe par le code d'équipe (VOTE_CODE). Le code d'administration (ADMIN_CODE) déchiffre la banque
// de questions, ouvre la relecture des 25 portes et permet de retirer un joueur.
const crypto = require('crypto');
const { get, put } = require('@vercel/blob');
const COFFRE = require('./_banque.js');

const FILE = 'enigme.json';
const MAX_JOUEURS = 300;
const DELAI = 2; // jours d'ouverture après le jour de la porte
const JOUR1 = Date.UTC(2026, 11, 1);
const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const digest = s => crypto.createHash('sha256').update(s).digest();
const codeOk = (c, attendu) =>
  typeof c === 'string' && c.length <= 64 && Boolean(attendu) &&
  crypto.timingSafeEqual(digest(norm(c.trim())), digest(norm(attendu.trim())));

// Banque déchiffrée une fois par instance, tant que le code d'administration ne change pas.
let cache = { code: null, banque: null };
function banque() {
  const code = process.env.ADMIN_CODE;
  if (!code) return null;
  if (cache.code === code) return cache.banque;
  cache = { code, banque: null };
  try {
    const cle = crypto.scryptSync(norm(code).trim(), Buffer.from(COFFRE.sel, 'base64'), 32);
    const d = crypto.createDecipheriv('aes-256-gcm', cle, Buffer.from(COFFRE.iv, 'base64'));
    d.setAuthTag(Buffer.from(COFFRE.tag, 'base64'));
    cache.banque = JSON.parse(Buffer.concat([d.update(Buffer.from(COFFRE.data, 'base64')), d.final()]).toString('utf8'));
  } catch (e) {
    console.error('enigme : la banque ne se déchiffre pas avec ADMIN_CODE');
  }
  return cache.banque;
}
const ready = () => Boolean(process.env.VOTE_CODE && (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) && banque());

// Calendrier : le jour 1 est le 1er décembre 2026 à Paris, le jour 0 la veille, le jour 32 le 1er janvier.
const PARIS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const rangDe = iso => { const [a, m, j] = iso.split('-').map(Number); return Math.round((Date.UTC(a, m - 1, j) - JOUR1) / 864e5) + 1; };
const dateDe = n => new Date(JOUR1 + (n - 1) * 864e5).toISOString().slice(0, 10);
const etatDe = (n, jour) => (jour < n ? 'avenir' : jour <= n + DELAI ? 'ouverte' : 'close');

// Barème : 10 points pour le bon flacon ; au dosage, 10 points pile sur la cible, 1 point de moins par tranche de 2 d'écart.
const points = (q, v) => (q.type === 'qcm' ? (v === q.bonne ? 10 : 0) : Math.max(0, 10 - Math.ceil(Math.abs(v - q.bonne) / 2)));

async function lire() {
  const r = await get(FILE, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { joueurs: {}, etag: null };
  return { joueurs: JSON.parse(await new Response(r.stream).text()), etag: r.blob.etag };
}
// Écriture conditionnelle : refusée si le fichier a changé depuis la lecture (deux réponses simultanées).
function ecrire(joueurs, etag) {
  const opts = { access: 'private', contentType: 'application/json', cacheControlMaxAge: 60 };
  return put(FILE, JSON.stringify(joueurs), etag ? { ...opts, ifMatch: etag } : { ...opts, allowOverwrite: false });
}
// Relit, modifie, réécrit ; recommence si une autre écriture est passée entre-temps.
async function modifier(fn) {
  let echec;
  for (let essai = 0; essai < 12; essai++) {
    if (essai) await new Promise(r => setTimeout(r, Math.random() * 60 * essai));
    const { joueurs, etag } = await lire();
    const sortie = fn(joueurs);
    if (sortie.fin) return sortie.fin(joueurs);
    try {
      await ecrire(joueurs, etag);
      return sortie.ok(joueurs);
    } catch (e) {
      echec = e;
    }
  }
  throw echec;
}

function classement(B, joueurs, jour) {
  const closes = B.portes.filter(q => etatDe(q.n, jour) === 'close');
  const L = Object.values(joueurs).map(j => {
    let pts = 0;
    for (const q of closes) if (j.r[q.n]) pts += points(q, j.r[q.n].v);
    return { p: j.p, pts, rep: Object.keys(j.r).length };
  }).sort((a, b) => b.pts - a.pts || a.p.localeCompare(b.p, 'fr'));
  let rang = 0;
  L.forEach((x, i) => { if (!i || x.pts !== L[i - 1].pts) rang = i + 1; x.rang = rang; });
  return L;
}

// Ce que le joueur a le droit de voir d'une porte : rien avant son jour, la solution seulement après la clôture.
function vue(q, etat, rep, tout) {
  const o = { n: q.n, etat, ouvre: dateDe(q.n), ferme: dateDe(q.n + DELAI) };
  if (etat === 'avenir' && !tout) return o;
  Object.assign(o, { type: q.type, titre: q.titre, question: q.question, ill: q.ill });
  if (q.type === 'qcm') o.options = q.options;
  else { o.unite = q.unite; if (q.prefixe) o.prefixe = q.prefixe; }
  if (rep) o.rep = rep.v;
  if (etat === 'close' || tout) {
    Object.assign(o, { bonne: q.bonne, explication: q.explication, source: q.source });
    if (rep && etat === 'close') o.pts = points(q, rep.v);
  }
  return o;
}

function etat(B, joueurs, cle, jour) {
  const j = cle ? joueurs[cle] : null;
  const portes = B.portes.map(q => vue(q, etatDe(q.n, jour), j && j.r[q.n]));
  return {
    jour,
    prenom: j ? j.p : undefined,
    portes,
    total: portes.reduce((s, p) => s + (p.pts || 0), 0),
    classement: classement(B, joueurs, jour),
  };
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ready: ready() });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'methode' });
  }
  if (!ready()) return res.status(503).json({ error: 'indisponible' });

  let b = {};
  try { if (req.body && typeof req.body === 'object') b = req.body; } catch (e) { /* corps illisible */ }
  const equipe = codeOk(b.code, process.env.VOTE_CODE);
  const admin = codeOk(b.admin, process.env.ADMIN_CODE) || codeOk(b.code, process.env.ADMIN_CODE);
  if (!equipe && !admin) return res.status(401).json({ error: 'code' });

  const B = banque();
  // L'administration peut se placer à une autre date, pour essayer le jeu avant décembre.
  const jour = rangDe(admin && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : PARIS.format(handler.maintenant()));

  try {
    if (admin && typeof b.retirer === 'string') {
      const cle = norm(b.retirer.trim().replace(/’/g, "'"));
      return res.status(200).json(await modifier(joueurs => {
        if (!joueurs[cle]) return { fin: J => ({ ok: true, retire: false, classement: classement(B, J, jour) }) };
        delete joueurs[cle];
        return { ok: J => ({ ok: true, retire: true, classement: classement(B, J, jour) }) };
      }));
    }
    // Code d'administration seul : relecture des 25 portes, solutions comprises. Rien ne s'enregistre.
    if (!equipe) {
      const { joueurs } = await lire();
      return res.status(200).json({ relecture: true, jour, portes: B.portes.map(q => vue(q, etatDe(q.n, jour), null, true)), total: 0, classement: classement(B, joueurs, jour) });
    }

    // Sans prénom : le calendrier et le classement, sans fiche personnelle.
    if (b.prenom === undefined) return res.status(200).json(etat(B, (await lire()).joueurs, null, jour));
    const prenom = typeof b.prenom === 'string' ? b.prenom.trim().replace(/’/g, "'") : '';
    if (prenom.length < 2 || prenom.length > 24 || !PRENOM.test(prenom)) return res.status(400).json({ error: 'prenom' });
    const cle = norm(prenom);
    if (b.n === undefined) return res.status(200).json(etat(B, (await lire()).joueurs, cle, jour));

    // Réponse à une porte.
    const q = Number.isInteger(b.n) ? B.portes[b.n - 1] : null;
    if (!q) return res.status(400).json({ error: 'porte' });
    const e = etatDe(q.n, jour);
    if (e !== 'ouverte') return res.status(403).json({ error: e === 'avenir' ? 'scellee' : 'close' });
    const v = b.reponse;
    if (!Number.isInteger(v) || v < 0 || v > (q.type === 'qcm' ? q.options.length - 1 : 100)) return res.status(400).json({ error: 'reponse' });

    const sortie = await modifier(joueurs => {
      const j = joueurs[cle];
      if (j && j.r[q.n]) return { fin: J => ({ code: 409, corps: { error: 'deja', ...etat(B, J, cle, jour) } }) };
      if (!j && Object.keys(joueurs).length >= MAX_JOUEURS) return { fin: () => ({ code: 403, corps: { error: 'complet' } }) };
      if (!j) joueurs[cle] = { p: prenom, t: Date.now(), r: {} };
      joueurs[cle].r[q.n] = { v, t: Date.now() };
      return { ok: J => ({ code: 200, corps: { ok: true, ...etat(B, J, cle, jour) } }) };
    });
    return res.status(sortie.code).json(sortie.corps);
  } catch (e) {
    console.error('enigme', e);
    return res.status(500).json({ error: 'serveur' });
  }
}
handler.maintenant = () => new Date(); // remplaçable par le banc d'essai
module.exports = handler;
