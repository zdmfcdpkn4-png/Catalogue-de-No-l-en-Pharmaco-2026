// Pharmacogames de Noël (ex-grande énigme) : 25 portes, une par jour du 1er au 25 décembre 2026 (heure de Paris).
// Chaque porte reste ouverte son jour, le lendemain et le surlendemain.
// Trois sortes de portes : une question seule (qcm, dose), une case de cinq questions sur un thème (quiz),
// un jeu d'adresse (jeu). Dans une case de cinq questions, elles s'enchaînent, chacune avec son chrono.
// Questions : l'énoncé ne sort du serveur qu'au lancement du chrono, et la réponse doit arriver avant sa fin.
// Une seule tentative. Jeux d'adresse : le navigateur renvoie une note de 0 à 10 et un score brut, deux tentatives,
// la meilleure compte. À la clôture, les points d'un jeu d'adresse viennent du rang : 10 au premier, 1 au dernier.
// La bonne réponse et les points ne sortent du serveur qu'à la clôture de la porte ; le classement suit.
// Tout passe par le code d'équipe (VOTE_CODE). Le code d'administration (ADMIN_CODE) déchiffre la banque
// de questions, ouvre la relecture des 25 portes et permet de retirer un joueur.
const crypto = require('crypto');
const { get, put } = require('@vercel/blob');
const COFFRE = require('./_banque.js');

const FILE = 'enigme.json';
const MAX_JOUEURS = 300;
const DELAI = 2; // jours d'ouverture après le jour de la porte
const GRACE = 4; // secondes tolérées après la fin du chrono d'une question, pour le trajet réseau
const JEU_MIN = 3, JEU_MARGE = 45; // une note de jeu n'est acceptée ni trop tôt ni trop longtemps après le départ
// Score brut le plus haut qu'un jeu puisse rendre : au-delà, la note est refusée.
const PLAFOND = { bowling: 50, tir: 40, flipper: 20000, tennis: 10099, labyrinthe: 1000, pastilles: 3000, penalty: 1500, etageres: 600, basket: 300, volley: 10099, haies: 4400, twirling: 600, tour: 6500, seringue: 1800, minigolf: 2000 };
const JOUR1 = Date.UTC(2026, 11, 1);
const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;
// Participants : cinq brigades, tirées par le serveur ; un avatar est trois numéros [couleur, coiffe, accessoire],
// chacun sous le nombre de choix de sa liste (les listes sont dessinées dans participants.js : garder les longueurs accordées).
const NB_BRIGADES = 5;
const AVATAR = [8, 8, 8];
// Devise et jeu emblème d'une brigade : chaque membre vote du 26 novembre au 7 décembre, puis le choix est figé.
// La devise est un numéro de la liste DEVISES de participants.js ; le jeu emblème, le nom d'un jeu du catalogue
// (même contrôle que le vote du palmarès : la page ne montre que les noms qu'elle connaît).
// L'identification (fiche, avatar, tirage de la brigade, changement de pseudo) ouvre le 26 novembre, avant le calendrier :
// c'est le jour -4 (le jour 1 est le 1er décembre). Le vote de la devise et du jeu emblème ouvre le même jour.
const FICHE_JOUR = -4;
const NB_DEVISES = 20;
const CHOIX_FIN = 7;
const avatarOk = a => Array.isArray(a) && a.length === AVATAR.length && a.every((v, i) => Number.isInteger(v) && v >= 0 && v < AVATAR[i]);
// Tirage équilibré : la brigade la moins fournie, au hasard entre les ex aequo. Les effectifs ne diffèrent jamais de plus d'un.
function tirer(joueurs) {
  const n = new Array(NB_BRIGADES).fill(0);
  for (const cle of Object.keys(joueurs)) if (Number.isInteger(joueurs[cle].b) && joueurs[cle].b >= 0 && joueurs[cle].b < NB_BRIGADES) n[joueurs[cle].b]++;
  const min = Math.min(...n), L = n.map((x, i) => (x === min ? i : -1)).filter(i => i >= 0);
  return L[crypto.randomInt(L.length)];
}

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

// Ce que le serveur garde par joueur : { p: nom affiché, t: heure d'inscription, r: { porte: réponses },
//   a: avatar [couleur, coiffe, accessoire], b: brigade de 0 à 4, d: sa voix pour la devise, g: sa voix pour le jeu emblème }. `a` et `b` manquent chez un joueur d'avant les brigades :
//   la brigade lui est tirée à sa prochaine ouverture de porte, l'avatar quand il remplit sa fiche.
// Ce que le serveur garde par joueur et par porte.
//   question : { d: départ du chrono, v: réponse, t: heure de la réponse }   (v absent : chrono lancé, pas de réponse)
//   jeu      : { e: [ { d: départ, k: jeton de la tentative, s: note de 0 à 10, b: score brut, t: heure de la note } ] }
// Barème : 10 points pour le bon flacon ; au dosage, 10 points pile sur la cible, 1 point de moins par tranche de 2 d'écart ;
// au jeu d'adresse, le rang à la clôture (voir rangs). Avant la clôture, le joueur ne voit que sa meilleure note.
const meilleure = r => Math.max(0, ...r.e.map(a => (a.s === undefined ? 0 : a.s)));
// Performance classée : le meilleur score brut des tentatives (à défaut, la note).
const perf = r => (r ? Math.max(0, ...r.e.map(a => (a.s === undefined ? 0 : a.b !== undefined ? a.b : a.s))) : 0);
// Rangs d'un jeu d'adresse : seuls ceux qui ont marqué sont classés (N joueurs). Le premier a 10 points, le dernier 1,
// les autres sont répartis régulièrement ; les ex aequo partagent rang et points ; un joueur seul a 10. Sans rien marquer : 0.
function rangs(q, joueurs) {
  const L = Object.keys(joueurs).map(cle => [cle, perf(joueurs[cle].r[q.n])]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const N = L.length, M = {};
  let rang = 0;
  L.forEach((x, i) => { if (!i || x[1] !== L[i - 1][1]) rang = i + 1; M[x[0]] = { rang, sur: N, pts: N === 1 ? 10 : 1 + Math.round(9 * (N - rang) / (N - 1)) }; });
  return M;
}
// Case de cinq questions : 2 points par question, soit 10 au plus. Bon flacon : 2. Dosage : 2 à 2 près, 1 à 10 près.
//   quiz     : { q: [ { d: départ du chrono, v: réponse, t: heure de la réponse }, … ] }   (une entrée par question lancée, dans l'ordre)
const pointsQuestion = (c, a) => {
  if (!a || a.v === undefined) return 0;
  if (c.type === 'qcm') return a.v === c.bonne ? 2 : 0;
  const e = Math.abs(a.v - c.bonne);
  return e <= 2 ? 2 : e <= 10 ? 1 : 0;
};
// Rang de la question en cours d'une case : la première qui n'a ni réponse ni chrono écoulé. Vaut le nombre de questions quand tout est joué.
function rangQuiz(q, r, maintenant) {
  const L = (r && r.q) || [];
  for (let i = 0; i < q.questions.length; i++) {
    const a = L[i];
    if (!a || (a.v === undefined && (maintenant - a.d) / 1000 < q.questions[i].duree)) return i;
  }
  return q.questions.length;
}
function points(q, r) {
  if (!r) return 0;
  if (q.type === 'jeu') return meilleure(r);
  if (q.type === 'quiz') return q.questions.reduce((s, c, i) => s + pointsQuestion(c, (r.q || [])[i]), 0);
  if (r.v === undefined) return 0;
  return q.type === 'qcm' ? (r.v === q.bonne ? 10 : 0) : Math.max(0, 10 - Math.ceil(Math.abs(r.v - q.bonne) / 2));
}

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
  const closes = B.portes.filter(q => etatDe(q.n, jour) === 'close').map(q => [q, q.type === 'jeu' ? rangs(q, joueurs) : null]);
  const L = Object.keys(joueurs).map(cle => {
    const j = joueurs[cle];
    let pts = 0;
    for (const [q, M] of closes) pts += M ? (M[cle] ? M[cle].pts : 0) : points(q, j.r[q.n]);
    // cl : nombre de portes closes que le joueur a jouées (une porte lancée compte), pour la moyenne de sa brigade.
    return { p: j.p, pts, rep: Object.keys(j.r).length, cl: closes.filter(([q]) => j.r[q.n]).length, a: j.a, b: j.b };
  }).sort((a, b) => b.pts - a.pts || a.p.localeCompare(b.p, 'fr'));
  let rang = 0;
  L.forEach((x, i) => { if (!i || x.pts !== L[i - 1].pts) rang = i + 1; x.rang = rang; });
  return L;
}

// Le classement du jour, avec pour chacun son rang d'avant la dernière clôture (`av`) quand une porte vient de clore :
// la page en tire les flèches de progression. Rien ne fuit : le classement de la veille ne compte que des portes déjà closes.
function classementSuivi(B, joueurs, jour) {
  const L = classement(B, joueurs, jour);
  const n = j => B.portes.filter(q => etatDe(q.n, j) === 'close').length;
  if (n(jour - 1) && n(jour) > n(jour - 1)) {
    const hier = new Map(classement(B, joueurs, jour - 1).map(x => [x.p, x.rang]));
    L.forEach(x => { x.av = hier.get(x.p); });
  }
  return L;
}

// Classement des brigades, tiré du classement individuel (donc des seules portes closes) : la moyenne par membre actif,
// pour qu'une brigade plus nombreuse ne soit pas avantagée. Est actif (`actifs`) le membre qui a joué au moins une porte
// close : un inscrit qui ne joue pas ne pèse pas sur sa brigade. `n` reste l'effectif. Les ex aequo partagent le rang.
// Devise et jeu emblème : l'option la plus soutenue par les membres ; à égalité, la première de la liste (devise)
// ou de l'alphabet (jeux). `voix` donne le détail des voix à la brigade `mienne` seulement.
function brigades(L, joueurs, mienne) {
  const T = Array.from({ length: NB_BRIGADES }, (_, b) => ({ b, n: 0, actifs: 0, pts: 0, moy: 0 }));
  for (const x of L) if (T[x.b]) { T[x.b].n++; T[x.b].pts += x.pts; if (x.cl) T[x.b].actifs++; }
  for (const t of T) t.moy = t.actifs ? Math.round(t.pts / t.actifs * 10) / 10 : 0;
  const V = T.map(() => ({ d: {}, g: {} }));
  for (const cle of Object.keys(joueurs)) {
    const j = joueurs[cle], v = V[j.b];
    if (!v) continue;
    if (j.d !== undefined) v.d[j.d] = (v.d[j.d] || 0) + 1;
    if (j.g !== undefined) v.g[j.g] = (v.g[j.g] || 0) + 1;
  }
  const tries = (o, tri) => Object.keys(o).sort((x, y) => o[y] - o[x] || tri(x, y));
  for (const t of T) {
    const v = V[t.b], d = tries(v.d, (x, y) => x - y)[0];
    if (d !== undefined) t.devise = Number(d);
    // Les cinq jeux les plus soutenus, dans l'ordre : la page retient le premier qui est au catalogue,
    // si bien qu'un nom inconnu (appel direct, jeu retiré ou renommé) ne prive pas la brigade de son emblème.
    t.jeux = tries(v.g, (x, y) => (x < y ? -1 : x > y ? 1 : 0)).slice(0, 5);
    if (t.b === mienne) t.voix = v;
  }
  T.sort((x, y) => y.moy - x.moy || x.b - y.b);
  let rang = 0;
  T.forEach((t, i) => { if (!i || t.moy !== T[i - 1].moy) rang = i + 1; t.rang = rang; });
  return T;
}

// Ce que le joueur a le droit de voir d'une porte : rien avant son jour ; l'énoncé d'une question seulement une fois
// son chrono lancé ; la solution seulement après la clôture. La règle d'un jeu d'adresse se lit avant de jouer.
function vue(q, etat, r, tout, maintenant, rg) {
  const o = { n: q.n, etat, ouvre: dateDe(q.n), ferme: dateDe(q.n + DELAI) };
  if (etat === 'avenir' && !tout) return o;
  const clos = etat === 'close' || tout;
  if (q.type === 'quiz') return vueQuiz(o, q, etat, r, clos, maintenant);
  Object.assign(o, { type: q.type, titre: q.titre, duree: q.duree, essais: q.type === 'jeu' ? q.essais : 1 });
  if (q.type === 'jeu') {
    Object.assign(o, { jeu: q.jeu, question: q.question, ill: q.ill });
    if (r) { o.scores = r.e.map(a => (a.s === undefined ? null : a.s)); o.meilleur = points(q, r); }
    if (clos) { Object.assign(o, { explication: q.explication, source: q.source }); if (r && etat === 'close') { o.pts = rg ? rg.pts : 0; if (rg) { o.rang = rg.rang; o.sur = rg.sur; } } }
    return o;
  }
  if (r || clos) {
    Object.assign(o, { question: q.question, ill: q.ill });
    if (q.type === 'qcm') o.options = q.options;
    else { o.unite = q.unite; if (q.prefixe) o.prefixe = q.prefixe; }
  }
  if (r) {
    if (r.v !== undefined) o.rep = r.v;
    else {
      const reste = q.duree - (maintenant - r.d) / 1000;
      if (reste > 0 && etat === 'ouverte') o.reste = Math.round(reste * 10) / 10; else o.hors = true;
    }
  }
  if (clos) {
    Object.assign(o, { bonne: q.bonne, explication: q.explication, source: q.source });
    if (r && etat === 'close') o.pts = points(q, r);
  }
  return o;
}

// Case de cinq questions. Ouverte : la page reçoit la question en cours comme une porte de question ordinaire (type qcm
// ou dose, énoncé seulement une fois son chrono lancé), avec `quiz` pour dire où l'on en est. Tout joué : type quiz, `fini`.
// Close ou en relecture : type quiz et les cinq questions avec leurs solutions.
function vueQuiz(o, q, etat, r, clos, maintenant) {
  const nb = q.questions.length, L = (r && r.q) || [];
  const enonce = c => {
    const x = { type: c.type, titre: c.titre, duree: c.duree, question: c.question, ill: c.ill || q.ill };
    if (c.type === 'qcm') x.options = c.options; else { x.unite = c.unite; if (c.prefixe) x.prefixe = c.prefixe; }
    return x;
  };
  if (clos) {
    Object.assign(o, { type: 'quiz', titre: q.titre, ill: q.ill, nb, essais: 1 });
    o.qs = q.questions.map((c, i) => {
      const x = Object.assign(enonce(c), { bonne: c.bonne, explication: c.explication, source: c.source }), a = L[i];
      if (a && a.v !== undefined) x.rep = a.v;
      if (r && etat === 'close') x.pts = pointsQuestion(c, a);
      return x;
    });
    if (r && etat === 'close') o.pts = points(q, r);
    return o;
  }
  const k = rangQuiz(q, r, maintenant);
  if (k >= nb) return Object.assign(o, { type: 'quiz', titre: q.titre, ill: q.ill, nb, essais: 1, fini: true, scellees: L.filter(a => a.v !== undefined).length });
  const c = q.questions[k], a = L[k];
  Object.assign(o, { type: c.type, titre: q.titre, duree: c.duree, essais: 1, quiz: { i: k + 1, nb, titre: c.titre } });
  if (a) Object.assign(o, enonce(c), { titre: q.titre, reste: Math.round((c.duree - (maintenant - a.d) / 1000) * 10) / 10 });
  return o;
}

function etat(B, joueurs, cle, jour, maintenant) {
  const j = cle ? joueurs[cle] : null;
  const portes = B.portes.map(q => {
    const e = etatDe(q.n, jour);
    return vue(q, e, j && j.r[q.n], false, maintenant, j && q.type === 'jeu' && e === 'close' ? rangs(q, joueurs)[cle] : undefined);
  });
  const L = classementSuivi(B, joueurs, jour);
  return {
    jour,
    prenom: j ? j.p : undefined,
    profil: j && (j.a || j.b !== undefined) ? { a: j.a, b: j.b, d: j.d, g: j.g } : undefined,
    fiche: { etat: jour < FICHE_JOUR ? 'avenir' : 'ouvert', ouvre: dateDe(FICHE_JOUR) },
    choix: { etat: jour < FICHE_JOUR ? 'avenir' : jour <= CHOIX_FIN ? 'ouvert' : 'fige', ferme: dateDe(CHOIX_FIN) },
    portes,
    total: portes.reduce((s, p) => s + (p.pts || 0), 0),
    classement: L,
    brigades: brigades(L, joueurs, j ? j.b : undefined),
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
  const instant = handler.maintenant(), maintenant = instant.getTime();
  const jour = rangDe(admin && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : PARIS.format(instant));

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
      return res.status(200).json({ relecture: true, jour, portes: B.portes.map(q => vue(q, etatDe(q.n, jour), null, true, maintenant)), total: 0, classement: classement(B, joueurs, jour) });
    }

    // Sans prénom : le calendrier et le classement, sans fiche personnelle.
    if (b.prenom === undefined) return res.status(200).json(etat(B, (await lire()).joueurs, null, jour, maintenant));
    const prenom = typeof b.prenom === 'string' ? b.prenom.trim().replace(/’/g, "'") : '';
    if (prenom.length < 2 || prenom.length > 24 || !PRENOM.test(prenom)) return res.status(400).json({ error: 'prenom' });
    const cle = norm(prenom);
    // Fiche d'identification : l'avatar choisi par le joueur (liste fermée), la brigade tirée par le serveur, une fois pour toutes.
    if (b.action === 'profil') {
      // Sous scellé jusqu'au 26 novembre : ni fiche ni tirage avant.
      if (jour < FICHE_JOUR) return res.status(403).json({ error: 'scellee' });
      if (!avatarOk(b.avatar)) return res.status(400).json({ error: 'avatar' });
      const s = await modifier(joueurs => {
        if (!joueurs[cle]) {
          if (Object.keys(joueurs).length >= MAX_JOUEURS) return { fin: () => ({ code: 403, corps: { error: 'complet' } }) };
          joueurs[cle] = { p: prenom, t: maintenant, r: {} };
        }
        const j = joueurs[cle];
        j.a = b.avatar.slice();
        if (j.b === undefined) j.b = tirer(joueurs);
        return { ok: J => ({ code: 200, corps: { ok: true, ...etat(B, J, cle, jour, maintenant) } }) };
      });
      return res.status(s.code).json(s.corps);
    }
    // Changement de pseudo : la fiche entière (réponses, avatar, brigade, voix) suit le joueur sous son nouveau nom.
    // Refusé si un autre joueur porte déjà ce nom. Le prénom envoyé reste l'ancien : c'est lui qui désigne la fiche.
    if (b.action === 'renommer') {
      if (jour < FICHE_JOUR) return res.status(403).json({ error: 'scellee' });
      const neuf = typeof b.pseudo === 'string' ? b.pseudo.trim().replace(/’/g, "'") : '';
      if (neuf.length < 2 || neuf.length > 24 || !PRENOM.test(neuf)) return res.status(400).json({ error: 'pseudo' });
      const cle2 = norm(neuf);
      const s = await modifier(joueurs => {
        const j = joueurs[cle];
        if (!j) return { fin: () => ({ code: 403, corps: { error: 'profil' } }) };
        if (cle2 !== cle && joueurs[cle2]) return { fin: () => ({ code: 409, corps: { error: 'pris' } }) };
        delete joueurs[cle];
        j.p = neuf;
        joueurs[cle2] = j;
        return { ok: J => ({ code: 200, corps: { ok: true, ...etat(B, J, cle2, jour, maintenant) } }) };
      });
      return res.status(s.code).json(s.corps);
    }
    // Voix d'un membre pour la devise et le jeu emblème de sa brigade : ouvert du 26 novembre au 7 décembre, modifiable d'ici là.
    if (b.action === 'brigade') {
      if (jour < FICHE_JOUR || jour > CHOIX_FIN) return res.status(403).json({ error: jour < FICHE_JOUR ? 'scellee' : 'fige' });
      const d = b.devise, g = typeof b.jeu === 'string' ? b.jeu.trim() : b.jeu;
      if (d === undefined && g === undefined) return res.status(400).json({ error: 'choix' });
      if (d !== undefined && !(Number.isInteger(d) && d >= 0 && d < NB_DEVISES)) return res.status(400).json({ error: 'devise' });
      if (g !== undefined && (typeof g !== 'string' || !g || g.length > 80 || /[\u0000-\u001f<>]/.test(g))) return res.status(400).json({ error: 'jeu' });
      const s = await modifier(joueurs => {
        const j = joueurs[cle];
        if (!j || j.b === undefined) return { fin: () => ({ code: 403, corps: { error: 'profil' } }) };
        if (d !== undefined) j.d = d;
        if (g !== undefined) j.g = g;
        return { ok: J => ({ code: 200, corps: { ok: true, ...etat(B, J, cle, jour, maintenant) } }) };
      });
      return res.status(s.code).json(s.corps);
    }
    if (b.n === undefined) return res.status(200).json(etat(B, (await lire()).joueurs, cle, jour, maintenant));

    // Action sur une porte ouverte.
    const q = Number.isInteger(b.n) ? B.portes[b.n - 1] : null;
    if (!q) return res.status(400).json({ error: 'porte' });
    const e = etatDe(q.n, jour);
    if (e !== 'ouverte') return res.status(403).json({ error: e === 'avenir' ? 'scellee' : 'close' });
    const vu = J => etat(B, J, cle, jour, maintenant);
    const refus = (code, error) => ({ fin: J => ({ code, corps: { error, ...vu(J) } }) });
    let sortie;

    if (b.action === 'ouvrir') {
      // Lancement du chrono d'une question, ou d'une tentative de jeu.
      let jeton;
      sortie = await modifier(joueurs => {
        if (!joueurs[cle]) {
          if (Object.keys(joueurs).length >= MAX_JOUEURS) return { fin: () => ({ code: 403, corps: { error: 'complet' } }) };
          joueurs[cle] = { p: prenom, t: maintenant, r: {} };
        }
        const j = joueurs[cle];
        if (j.b === undefined) j.b = tirer(joueurs); // inscrit sans passer par la fiche, ou d'avant les brigades
        if (q.type === 'jeu') {
          const r = j.r[q.n] || (j.r[q.n] = { e: [] });
          if (r.e.length >= q.essais) return refus(409, 'essais');
          jeton = crypto.randomBytes(8).toString('hex');
          r.e.push({ d: maintenant, k: jeton });
        } else if (q.type === 'quiz') {
          const r = j.r[q.n] || (j.r[q.n] = { q: [] });
          const k = rangQuiz(q, r, maintenant);
          if (k >= q.questions.length) return refus(409, 'essais');
          if (r.q[k]) return { fin: J => ({ code: 200, corps: { ok: true, dejaLance: true, ...vu(J) } }) }; // chrono déjà parti : il continue
          r.q[k] = { d: maintenant };
        } else {
          if (j.r[q.n]) return { fin: J => ({ code: 200, corps: { ok: true, dejaLance: true, ...vu(J) } }) }; // chrono déjà parti : il continue
          j.r[q.n] = { d: maintenant };
        }
        return { ok: J => ({ code: 200, corps: { ok: true, jeton, ...vu(J) } }) };
      });
    } else if (q.type === 'jeu') {
      // Note d'une tentative de jeu, calculée par le navigateur.
      if (!Number.isInteger(b.score) || b.score < 0 || b.score > 10 || typeof b.jeton !== 'string') return res.status(400).json({ error: 'reponse' });
      if (b.brut !== undefined && (!Number.isInteger(b.brut) || b.brut < 0 || b.brut > (PLAFOND[q.jeu] || 0))) return res.status(400).json({ error: 'reponse' });
      sortie = await modifier(joueurs => {
        const r = joueurs[cle] && joueurs[cle].r[q.n];
        const a = r && r.e.find(x => x.k === b.jeton);
        if (!a) return refus(403, 'nondemarre');
        if (a.s !== undefined) return refus(409, 'deja');
        const dt = (maintenant - a.d) / 1000;
        if (dt < JEU_MIN || dt > q.duree + JEU_MARGE) return refus(403, 'delai');
        a.s = b.score; a.t = maintenant;
        if (b.brut !== undefined) a.b = b.brut;
        return { ok: J => ({ code: 200, corps: { ok: true, ...vu(J) } }) };
      });
    } else if (q.type === 'quiz') {
      // Réponse à la question en cours d'une case de cinq : `i` dit à laquelle elle s'adresse (de 1 à 5).
      const v = b.reponse, i = b.i;
      if (!Number.isInteger(i) || i < 1 || i > q.questions.length) return res.status(400).json({ error: 'reponse' });
      const c = q.questions[i - 1];
      if (!Number.isInteger(v) || v < 0 || v > (c.type === 'qcm' ? c.options.length - 1 : 100)) return res.status(400).json({ error: 'reponse' });
      sortie = await modifier(joueurs => {
        const r = joueurs[cle] && joueurs[cle].r[q.n];
        const a = r && r.q && r.q[i - 1];
        if (!a) return refus(403, 'nondemarre');
        if (a.v !== undefined) return refus(409, 'deja');
        if ((maintenant - a.d) / 1000 > c.duree + GRACE) return refus(403, 'delai');
        a.v = v; a.t = maintenant;
        return { ok: J => ({ code: 200, corps: { ok: true, ...vu(J) } }) };
      });
    } else {
      // Réponse à une question, chrono en cours.
      const v = b.reponse;
      if (!Number.isInteger(v) || v < 0 || v > (q.type === 'qcm' ? q.options.length - 1 : 100)) return res.status(400).json({ error: 'reponse' });
      sortie = await modifier(joueurs => {
        const r = joueurs[cle] && joueurs[cle].r[q.n];
        if (!r) return refus(403, 'nondemarre');
        if (r.v !== undefined) return refus(409, 'deja');
        if ((maintenant - r.d) / 1000 > q.duree + GRACE) return refus(403, 'delai');
        r.v = v; r.t = maintenant;
        return { ok: J => ({ code: 200, corps: { ok: true, ...vu(J) } }) };
      });
    }
    return res.status(sortie.code).json(sortie.corps);
  } catch (e) {
    console.error('enigme', e);
    return res.status(500).json({ error: 'serveur' });
  }
}
handler.maintenant = () => new Date(); // remplaçable par le banc d'essai
module.exports = handler;
