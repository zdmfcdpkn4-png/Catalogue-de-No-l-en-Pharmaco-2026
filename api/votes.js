// Vote du jeu favori de l'équipe.
// Un vote par prénom, enregistré dans un seul fichier JSON privé (Vercel Blob).
// Tout passe par le code d'équipe (variable VOTE_CODE) : lecture du classement comme vote.
const crypto = require('crypto');
const { get, put } = require('@vercel/blob');

const FILE = 'votes.json';
const MAX_VOTANTS = 300;
const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;

const ready = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN && process.env.VOTE_CODE);
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const digest = s => crypto.createHash('sha256').update(s).digest();
const codeOk = c =>
  typeof c === 'string' && c.length <= 64 &&
  crypto.timingSafeEqual(digest(norm(c.trim())), digest(norm(process.env.VOTE_CODE.trim())));

async function readVotes() {
  const r = await get(FILE, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { votes: {}, etag: null };
  return { votes: JSON.parse(await new Response(r.stream).text()), etag: r.blob.etag };
}

// Écriture conditionnelle : refusée si le fichier a changé depuis la lecture (deux votes simultanés).
function writeVotes(votes, etag) {
  const opts = { access: 'private', contentType: 'application/json', cacheControlMaxAge: 60 };
  return put(FILE, JSON.stringify(votes), etag ? { ...opts, ifMatch: etag } : { ...opts, allowOverwrite: false });
}

const liste = votes => Object.values(votes).sort((a, b) => a.t - b.t);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ready: ready() });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'methode' });
  }
  if (!ready()) return res.status(503).json({ error: 'indisponible' });

  let b = {};
  try { if (req.body && typeof req.body === 'object') b = req.body; } catch (e) { /* corps illisible */ }
  if (!codeOk(b.code)) return res.status(401).json({ error: 'code' });

  try {
    // Sans prénom : simple lecture du classement.
    if (b.prenom === undefined) return res.status(200).json({ votes: liste((await readVotes()).votes) });

    const prenom = typeof b.prenom === 'string' ? b.prenom.trim().replace(/’/g, "'") : '';
    const jeu = typeof b.jeu === 'string' ? b.jeu.trim() : '';
    if (prenom.length < 2 || prenom.length > 24 || !PRENOM.test(prenom)) return res.status(400).json({ error: 'prenom' });
    if (!jeu || jeu.length > 80 || /[\u0000-\u001f]/.test(jeu)) return res.status(400).json({ error: 'jeu' });
    const cle = norm(prenom);

    let echec;
    for (let essai = 0; essai < 12; essai++) {
      // Après un conflit, attente aléatoire croissante pour ne pas se heurter de nouveau aux mêmes votes.
      if (essai) await new Promise(r => setTimeout(r, Math.random() * 60 * essai));
      const { votes, etag } = await readVotes();
      const ancien = votes[cle];
      if (ancien && ancien.g === jeu) return res.status(200).json({ ok: true, inchange: true, votes: liste(votes) });
      if (ancien && b.remplacer !== true) return res.status(409).json({ error: 'deja', prenom: ancien.p, jeu: ancien.g });
      if (!ancien && Object.keys(votes).length >= MAX_VOTANTS) return res.status(403).json({ error: 'complet' });
      votes[cle] = { p: prenom, g: jeu, t: Date.now() };
      try {
        await writeVotes(votes, etag);
        return res.status(200).json({ ok: true, remplace: Boolean(ancien), votes: liste(votes) });
      } catch (e) {
        echec = e; // un autre vote est passé entre la lecture et l'écriture : on relit et on recommence
      }
    }
    throw echec;
  } catch (e) {
    console.error('votes', e);
    return res.status(500).json({ error: 'serveur' });
  }
};
