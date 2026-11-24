// Pharmacogames de Noël (ex-grande énigme) : 25 portes, une par jour du 1er au 25 décembre 2026 (heure de Paris).
// Chaque porte reste ouverte son jour, le lendemain et le surlendemain.
// Trois sortes de portes : une question seule (qcm, dose), une case de cinq questions sur un thème (quiz),
// un jeu d'adresse (jeu), ou plusieurs jeux d'adresse dans la même porte (duo, la finale). Dans une case de cinq questions, elles s'enchaînent, chacune avec son chrono.
// Questions : l'énoncé ne sort du serveur qu'au lancement du chrono, et la réponse doit arriver avant sa fin.
// Une seule tentative. Jeux d'adresse : le navigateur renvoie une note de 0 à 10 et un score brut, deux tentatives,
// la meilleure compte. À la clôture, les points d'un jeu d'adresse viennent du rang : 10 au premier, 1 au dernier.
// La bonne réponse et les points ne sortent du serveur qu'à la clôture de la porte ; le classement suit.
// Tout passe par le code d'équipe (VOTE_CODE). Le code d'administration (ADMIN_CODE) déchiffre la banque
// de questions, ouvre la relecture des 25 portes et permet de retirer un joueur.
const crypto = require('crypto');
const { get, put } = require('@vercel/blob');
const COFFRE = require('./_banque.js');
const { composerIndices } = require('./_indices.js');

const FILE = 'enigme.json';
const MAX_JOUEURS = 300;
const DELAI = 2; // jours d'ouverture après le jour de la porte
const GRACE = 4; // secondes tolérées après la fin du chrono d'une question, pour le trajet réseau
const JEU_MIN = 3, JEU_MARGE = 45; // une note de jeu n'est acceptée ni trop tôt ni trop longtemps après le départ
// Score brut le plus haut qu'un jeu puisse rendre : au-delà, la note est refusée.
const PLAFOND = { bowling: 50, tir: 40, flipper: 20000, tennis: 10099, labyrinthe: 1000, pastilles: 3000, penalty: 1500, etageres: 600, basket: 300, volley: 10099, haies: 4400, twirling: 600, tour: 6500, seringue: 1800, minigolf: 2000, badminton: 3000 };
const JOUR1 = Date.UTC(2026, 11, 1);
const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;
// Participants : cinq brigades, tirées par le serveur ; un avatar est trois numéros [couleur, coiffe, accessoire],
// chacun sous le nombre de choix de sa liste (les listes sont dessinées dans participants.js : garder les longueurs accordées).
const NB_BRIGADES = 5;
const AVATAR = [8, 8, 8];
// Paramètres d'une brigade (nom, emblème, devise, jeu emblème) : chaque membre vote du 26 novembre au 10 décembre,
// puis tout est figé. Les brigades sont tirées sans nom (« Brigade 1 » à « Brigade 5 »). L'emblème est un numéro de la liste
// EMBLEMES de participants.js. Le nom est un texte : l'un des noms proposés par la page, ou celui qu'un membre propose.
// Ni un nom (accents et casse ignorés) ni un emblème ne peuvent être portés par deux brigades (voir attribuer).
// La devise est un numéro de la liste DEVISES de participants.js ; le jeu emblème, le nom d'un jeu du catalogue
// (même contrôle que le vote du palmarès : la page ne montre que les noms qu'elle connaît).
// L'identification (fiche, avatar, tirage de la brigade, changement de pseudo) ouvre le 26 novembre, avant le calendrier :
// c'est le jour -4 (le jour 1 est le 1er décembre). Le vote de la devise et du jeu emblème ouvre le même jour.
const FICHE_JOUR = -4;
const NB_DEVISES = 20;
const NB_EMBLEMES = 30;
const TITRE = /^\p{L}[\p{L}\p{N} .'-]{2,39}$/u;
const titreOk = t => typeof t === 'string' && TITRE.test(t) && !/^brigade \d+$/i.test(t); // « Brigade 3 » reste un nom provisoire
const CHOIX_FIN = 10;
// Liste des participants, fournie par l'administration : un fichier à part du magasin privé, jamais dans le dépôt.
// Elle ne sort du serveur qu'avec le code d'équipe. Sans liste, la saisie libre du prénom reste la règle. Avec une liste,
// elle est fermée : une fiche ne se crée que pour un nom de la liste (403 `liste` sinon), sauf avec le code d'administration
// (joueurs d'essai des contrôles). Les fiches déjà créées restent valables.
const FILE_LISTE = 'participants.json';
// Film de clôture de l'enquête : gardé dans le magasin (jamais dans le dépôt, qui est public), servi après le dénouement.
const FILE_FILM = 'film-cloture.mp4', MAX_FILM = 3 * 1024 * 1024;
const MAX_LISTE = 300;
const NOM_LISTE = /^\p{L}[\p{L} .'-]{1,39}$/u;
const propre = s => String(s).replace(/’/g, "'").replace(/\s+/g, ' ').trim();
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
//   a: avatar [couleur, coiffe, accessoire], b: brigade de 0 à 4, d, g, n, e: ses voix pour la devise, le jeu emblème,
//   le nom et l'emblème de sa brigade, l: son nom dans la liste des participants (absent en saisie libre) }. `a` et `b` manquent chez un joueur d'avant les brigades :
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
// `i` désigne un des jeux d'une porte à plusieurs jeux (duo) : chacun a son propre classement.
function rangs(q, joueurs, i) {
  const de = r => (i === undefined ? r : r && r.g && r.g[i]);
  const L = Object.keys(joueurs).map(cle => [cle, perf(de(joueurs[cle].r[q.n]))]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const N = L.length, M = {};
  let rang = 0;
  L.forEach((x, i) => { if (!i || x[1] !== L[i - 1][1]) rang = i + 1; M[x[0]] = { rang, sur: N, pts: N === 1 ? 10 : 1 + Math.round(9 * (N - rang) / (N - 1)) }; });
  return M;
}
// Porte à plusieurs jeux (duo, la finale) : { g: [ { e: [tentatives] }, … ] }, un par jeu, joués dans l'ordre.
// Chaque jeu est classé à part et rapporte ses points au rang ; la porte vaut leur somme (20 points pour deux jeux).
// Jeu en cours : le premier dont les tentatives ne sont pas toutes lancées. Vaut le nombre de jeux quand tout est lancé.
function rangDuo(q, r) {
  const g = (r && r.g) || [];
  for (let i = 0; i < q.jeux.length; i++) if (!g[i] || g[i].e.length < q.jeux[i].essais) return i;
  return q.jeux.length;
}
// Rangs d'une porte, jeu ou duo : par joueur { pts, rang, sur } ; pour un duo, pts est la somme et `d` le détail par jeu.
function rangsPorte(q, joueurs) {
  if (q.type === 'jeu') return rangs(q, joueurs);
  if (q.type !== 'duo') return null;
  const D = q.jeux.map((c, i) => rangs(q, joueurs, i)), M = {};
  D.forEach((m, i) => { for (const cle of Object.keys(m)) { const x = M[cle] || (M[cle] = { pts: 0, d: [] }); x.pts += m[cle].pts; x.d[i] = m[cle]; } });
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
async function lireListe() {
  const r = await get(FILE_LISTE, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return [];
  const o = JSON.parse(await new Response(r.stream).text());
  return Array.isArray(o.noms) ? o.noms : [];
}
async function lireFilm() {
  const r = await get(FILE_FILM, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  const f = Buffer.from(await new Response(r.stream).arrayBuffer());
  return f.length ? f : null;
}
// Le nom de la liste tel qu'il y est écrit, ou rien s'il n'y est pas.
const dansListe = (liste, nom) => (typeof nom === 'string' ? liste.find(x => norm(x) === norm(propre(nom))) : undefined);
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
  const closes = B.portes.filter(q => etatDe(q.n, jour) === 'close').map(q => [q, rangsPorte(q, joueurs)]);
  const L = Object.keys(joueurs).map(cle => {
    const j = joueurs[cle];
    // pq : points des cases de questions ; pj : points des jeux d'adresse (finale comprise) ; pq + pj = pts.
    let pts = 0, pj = 0;
    for (const [q, M] of closes) { const v = M ? (M[cle] ? M[cle].pts : 0) : points(q, j.r[q.n]); pts += v; if (M) pj += v; }
    // cl : nombre de portes closes que le joueur a jouées (une porte lancée compte), pour la moyenne de sa brigade.
    return { p: j.p, pts, pq: pts - pj, pj, rep: Object.keys(j.r).length, cl: closes.filter(([q]) => j.r[q.n]).length, a: j.a, b: j.b };
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
// Nom et emblème (`titre`, `embleme`) : attribués sans doublon entre brigades, voir attribuer. Sans attribution,
// la brigade garde son nom provisoire « Brigade N » : c'est la page qui l'écrit.
// Attribution sans doublon : chaque option va à la brigade qui la soutient le plus. On range toutes les paires
// (brigade, option) par voix décroissantes ; à égalité, la brigade qui compte le plus de votants passe d'abord,
// puis la brigade de plus petit numéro, puis l'option la plus haute dans la liste (ou dans l'alphabet, pour un nom). Chaque paire est servie si la brigade
// n'a encore rien et si l'option est libre : une brigade devancée retombe donc sur son choix suivant.
function attribuer(V, k) {
  const P = [];
  V.forEach((v, b) => { const tot = Object.values(v[k]).reduce((s, x) => s + x, 0); for (const o of Object.keys(v[k])) P.push({ b, o, c: v[k][o], tot }); });
  const ordre = (x, y) => (isNaN(x) || isNaN(y) ? (x < y ? -1 : x > y ? 1 : 0) : x - y);
  P.sort((x, y) => y.c - x.c || y.tot - x.tot || x.b - y.b || ordre(x.o, y.o));
  const R = {}, pris = new Set();
  for (const x of P) if (R[x.b] === undefined && !pris.has(x.o)) { R[x.b] = x.o; pris.add(x.o); }
  return R;
}
// Enquête (facultative : `enquete` dans la banque). Une énigme par jour, jouée par brigade : chaque membre dépose une seule
// réponse, définitive, sans savoir si elle est juste. Une énigme reste ouverte son jour et les deux suivants, comme une porte.
// À sa clôture, la réponse retenue est la réponse majoritaire de la brigade : juste, le point est acquis ; fausse, à égalité
// en tête ou absente, pas de point. Dans tous les cas la révélation sort à la clôture, jamais avant.
// Banque : { titre, denouement, fiches: [ { id, cat, nom } ], enigmes: [ { k, n: jour de décembre, titre, enonce,
//   saisie: 'choix' | 'texte', options (choix), bonne: indice (choix), reponses: [textes acceptés] (texte), revelation,
//   elimine, source, pts } ] }.
// Amorce (facultative) : amorces: [ { n: jour, titre, texte, fiche: vrai si elle dévoile la fiche de suivi } ]. Chacune sort
// pour le joueur qui a joué la porte de ce jour (une porte lancée compte), et pour tous quand cette porte est close.
// Avec une amorce, rien d'identifiable ne sort avant l'étape qui le dévoile : pas de champ `enquete` sans étape acquise,
// le titre à partir de la deuxième étape, les fiches et les énigmes à partir de l'étape marquée `fiche`.
// Ce que le serveur garde par joueur : x: { k: { v: sa réponse, t: heure } }.
// Les points vont à la brigade, jamais au classement individuel.
const normRep = s => norm(s).replace(/[^a-z0-9]/g, '');
// Saisie `trio` (hypothèse finale) : la réponse est la liste des identifiants de fiche, un par catégorie, dans l'ordre des
// catégories ; la bonne est `trio`.
const justeEnq = (c, v) => (c.saisie === 'choix' ? v === c.bonne : c.saisie === 'trio' ? Array.isArray(v) && v.length === c.trio.length && c.trio.every((x, i) => x === v[i]) : c.reponses.some(x => normRep(x) === normRep(v)));
// Par brigade et par énigme, les voix : { k: { n: réponses déposées, v: { réponse: voix } } }. Un texte est compté sans casse,
// accents, espaces ni ponctuation ; toutes les écritures acceptées de la bonne réponse comptent ensemble (clé « = »).
function voix(E, joueurs) {
  const S = Array.from({ length: NB_BRIGADES }, () => ({})), C = {};
  for (const c of E.enigmes) C[c.k] = c;
  for (const cle of Object.keys(joueurs)) {
    const j = joueurs[cle], s = S[j.b];
    if (!s || !j.x) continue;
    for (const k of Object.keys(j.x)) {
      if (!C[k]) continue;
      const v = C[k].saisie === 'choix' ? String(j.x[k].v) : justeEnq(C[k], j.x[k].v) ? '=' : C[k].saisie === 'trio' ? [].concat(j.x[k].v).join('|') : normRep(j.x[k].v), u = s[k] || (s[k] = { n: 0, v: {}, t: {} });
      u.n++; u.v[v] = (u.v[v] || 0) + 1; u.t[v] = Math.min(u.t[v] || Infinity, Number(j.x[k].t) || 0);
    }
  }
  return S;
}
// La réponse majoritaire d'une brigade est-elle la bonne ? Aucune réponse : non. Égalité en tête : la réponse déposée
// la première parmi les ex aequo l'emporte.
function acquise(c, u) {
  if (!u) return false;
  const L = Object.entries(u.v).sort((a, b) => b[1] - a[1] || u.t[a[0]] - u.t[b[0]]);
  return c.saisie === 'choix' ? Number(L[0][0]) === c.bonne : L[0][0] === '=';
}
// Quête secondaire (`quete: true`) : une énigme de longue durée, ouverte du jour `n` au jour `fin` compris, sans retard de
// révélation. Avec `prime`, la brigade dont la bonne réponse retenue a été déposée la première (ex aequo : toutes) reçoit
// ces points en plus de `pts`.
const etatEnq = (c, jour) => (Number.isInteger(c.fin) ? (jour < c.n ? 'avenir' : jour > c.fin ? 'close' : 'ouverte') : etatDe(c.n, jour));
const finEnq = c => (Number.isInteger(c.fin) ? c.fin : c.n + DELAI);
// Les brigades qui touchent la prime d'une énigme close : celles qui l'ont acquise le plus tôt.
function primees(c, S, jour) {
  if (!c.prime || etatEnq(c, jour) !== 'close') return [];
  const cle = c.saisie === 'choix' ? String(c.bonne) : '=';
  const T = S.map(s => (acquise(c, s[c.k]) ? s[c.k].t[cle] : Infinity)), min = Math.min(...T);
  return min === Infinity ? [] : T.map((t, b) => (t === min ? b : -1)).filter(b => b >= 0);
}
// Points d'enquête de chaque brigade : les énigmes closes dont la réponse majoritaire est juste, plus les primes.
const pointsEnq = (E, S, jour) => S.map((s, b) => E.enigmes.reduce((t, c) => t + (etatEnq(c, jour) === 'close' && acquise(c, s[c.k]) ? c.pts + (primees(c, S, jour).includes(b) ? c.prime : 0) : 0), 0));
// Ce qu'un joueur voit de l'enquête : l'énoncé à l'ouverture, sa propre réponse, le nombre de réponses de sa brigade ;
// à la clôture seulement, le résultat et la révélation ; les réponses attendues en relecture seulement (`tout`).
function vueEnquete(E, joueurs, cle, jour, tout) {
  const j = cle ? joueurs[cle] : null, S = voix(E, joueurs), s = j && S[j.b];
  const D = s ? des(E, j.b) : {};
  const A = (E.amorces || []).filter(a => tout || (jour >= a.n && (etatDe(a.n, jour) === 'close' || Boolean(j && j.r && j.r[a.n]))));
  const libre = tout || !E.amorces;
  if (!libre && !A.length) return undefined;
  const premiere = E.amorces ? Math.min(...E.amorces.map(a => a.n)) : 0;
  const o = { fiction: true, jour };
  if (E.amorces) o.amorces = A;
  if (libre || A.some(a => a.n > premiere)) o.titre = E.titre;
  if (!libre && !A.some(a => a.fiche)) { o.enigmes = []; return o; }
  if (E.fiches) o.fiches = E.fiches;
  o.max = E.enigmes.reduce((t, c) => t + c.pts + (c.prime || 0), 0);
  o.enigmes = E.enigmes.map(c => {
    const e = etatEnq(c, jour), x = { k: c.k, jour: c.n, etat: e, ouvre: dateDe(c.n), ferme: dateDe(finEnq(c)), resultat: dateDe(finEnq(c) + 1), pts: c.pts };
    if (c.quete) Object.assign(x, { quete: true, prime: c.prime || 0 });
    if (e === 'avenir' && !tout) return x;
    Object.assign(x, { titre: c.titre, enonce: c.enonce, saisie: c.saisie });
    if (c.saisie === 'choix') x.options = c.options;
    const a = j && j.x && j.x[c.k];
    if (a) Object.assign(x, { repondu: true, reponse: a.v });
    if (s) x.deposes = s[c.k] ? s[c.k].n : 0;
    if (D[c.k]) { x.de = D[c.k]; const a = aideServie((c.aides || [])[Math.floor((D[c.k] - 1) / 2) - 1]); if (a) x.aide = a; }
    if (tout && c.aides) Object.assign(x, { id: c.id, niveau: c.niveau, meca: c.meca, aides: c.aides });
    if (e === 'close' || tout) {
      // Avec un retard (`retard`, en jours), la révélation sort à la clôture pour la brigade dont la réponse retenue est
      // juste, et plus tard pour les autres ; jamais de retard au dénouement.
      const juste = Boolean(s) && acquise(c, s[c.k]);
      if (tout || !E.retard || c.final || c.quete || juste || etatDe(c.n + E.retard, jour) === 'close') Object.assign(x, { revelation: c.revelation, elimine: c.elimine, source: c.source }, c.libre ? { libre: true } : {});
      else x.attente = dateDe(c.n + DELAI + 1 + E.retard);
      // `paru` : le jour où la révélation est sortie pour cette brigade (clôture, ou clôture plus le retard).
      if (e === 'close') x.paru = dateDe(finEnq(c) + 1 + (!E.retard || c.final || c.quete || juste ? 0 : E.retard));
      if (s && e === 'close') x.resolue = juste;
      if (s && e === 'close' && c.prime) x.premiere = primees(c, S, jour).includes(j.b);
      if (a && e === 'close') x.juste = justeEnq(c, a.v);
    }
    if (e === 'close' && c.saisie === 'trio') x.trio = c.trio; // le trio sort à la clôture de l'hypothèse, avec le dénouement
    if (tout) { if (c.saisie === 'choix') x.bonne = c.bonne; else if (c.saisie === 'trio') x.trio = c.trio; else x.reponses = c.reponses; }
    return x;
  });
  // Tampons des joueurs (sans point) : chacun marque les fiches « hors de cause » (h) ou « coupable » (c), champ `tp` du
  // joueur ; la brigade voit le décompte par fiche, et chacun son propre tampon (`moi`).
  if (s && E.fiches) {
    const ids = new Set(E.fiches.map(f => f.id)); o.tampons = {};
    for (const m of Object.values(joueurs)) if (m.b === j.b && m.tp) for (const id of Object.keys(m.tp)) if (ids.has(id) && (m.tp[id] === 'h' || m.tp[id] === 'c')) { const t = o.tampons[id] || (o.tampons[id] = { h: 0, c: 0 }); t[m.tp[id]]++; }
    for (const id of Object.keys(j.tp || {})) if (o.tampons[id]) o.tampons[id].moi = j.tp[id];
  }
  const P = pointsEnq(E, S, jour);
  if (s) o.points = P[j.b];
  // Le dénouement : quand toutes les énigmes du dernier jour sont closes.
  const fin = Math.max(...E.enigmes.map(c => c.n));
  if (E.denouement && (tout || etatDe(fin, jour) === 'close')) o.denouement = E.denouement;
  o.classement = P.map((points, b) => ({ b, points }));
  return o;
}

// Enquête à tirage (facultative : `reservoir` dans `enquete`, à la place de `enigmes` et `denouement`). Personne ne connaît
// la solution, concepteurs compris : le serveur tire une graine au premier jour du jeu, la garde dans le magasin, et compose
// l'enquête à partir d'elle. Par catégorie de fiches : un coupable, des innocents éliminés un à un par leur devinette, un
// dernier innocent qui reste en lice. Les énigmes de logique livrent les indices des trois cartes coupables.
// Réservoir : { cartes: { id: { devinette: { titre, enonce }, indices: [textes], preuve, vue: jour de présentation } },
//   logiques: [ énigmes sans révélation ], plan: [ { k, n, pts, r: 'carte' | 'indice' | 'final', cat, titre, enonce } ] (au dénouement, l'énoncé vient du plan, jamais de la devinette de la carte coupable),
//   denouement: texte à trous ({Catégorie} : le nom ; {catégorie} : le nom, initiale en minuscule) }.
// La relecture montre le réservoir, jamais le tirage. En date simulée (essais de l'administration), la graine est fixe
// et rien n'est gardé : le vrai tirage reste intact.
const FILE_TIRAGE = 'enquete-tirage.json';
function alea(graine) {
  let i = 0;
  return () => crypto.createHash('sha256').update(graine + ':' + (i++)).digest().readUInt32BE(0) / 4294967296;
}
// Réservoir à grille (champ `grille`) : la déduction passe par les détails visibles des cartes. Plan : 'carte' (devinette
// d'un innocent, qui l'élimine), 'attribut' (énigme de logique dont la révélation est un indice d'attribut ; `decisif` :
// il ne reste alors que le coupable), 'libre' (énigme de logique sans révélation sur le trio), 'final' (accusation).
// Les éliminations et les indices viennent de `_indices.js`. Chaque énigme porte un `niveau` (1 à 3) : la courbe monte
// dans le mois, un cran plus bas le week-end, et un indice décisif ne dépasse jamais le niveau 2. Sont toujours placées :
// l'énigme `meta` (au premier créneau de logique à partir de son jour `apres`) et celles qui demandent l'enveloppe
// (`requiert: 'scelle'`). Une carte a ses `variantes` de devinette ; chaque énigme a deux `aides` (légère, forte).
const SAMEDI_4 = 5; // le 4 décembre 2026 est un vendredi : les 5, 6, 12, 13, 19 et 20 tombent un week-end
const niveauVise = s => { const w = (s.n - SAMEDI_4 + 70) % 7 < 2 ? 1 : 0, b = s.n <= 9 ? 1 : s.n <= 18 ? 2 : 3; return Math.max(1, Math.min(s.decisif ? 2 : 3, b - w)); };
const REQUIS = ['scelle'];
function composerGrille(E, graine) {
  const R = E.reservoir, rnd = alea(graine), tire = L => L[Math.floor(rnd() * L.length)];
  const cats = [...new Set(E.fiches.map(f => f.cat))], fiche = id => E.fiches.find(f => f.id === id), coupable = {}, vue = {};
  for (const c of cats) coupable[c] = tire(E.fiches.filter(f => f.cat === c)).id;
  for (const id of Object.keys(R.cartes)) vue[id] = R.cartes[id].vue;
  const I = composerIndices(R.grille, R.plan, coupable, alea(graine + ':indices'), vue);
  const ok = (x, s) => (x.apres || 0) <= s.n && (!x.requiert || [].concat(x.requiert).every(q => REQUIS.includes(q)));
  // Les énigmes de logique : d'abord celles qui ont une place imposée, puis le reste au niveau visé.
  const places = R.plan.filter(s => s.r === 'attribut' || s.r === 'libre'), pose = {}, pris = new Set();
  const mettre = (s, x) => { pose[s.k] = x; pris.add(x.id); };
  for (const x of R.logiques.filter(x => x.meta)) { const s = places.find(s => !pose[s.k] && ok(x, s)); if (s) mettre(s, x); }
  for (const x of R.logiques.filter(x => x.requiert && !x.meta)) {
    const L = places.filter(s => !pose[s.k] && !s.decisif && ok(x, s)), M = L.filter(s => niveauVise(s) === x.niveau);
    if (L.length) mettre(tire(M.length ? M : L), x);
  }
  let avant = null;
  for (const s of places) {
    if (!pose[s.k]) {
      const L = R.logiques.filter(x => !pris.has(x.id) && !x.meta && !x.requiert && ok(x, s)), v = niveauVise(s);
      const choix = [1, 0].map(m => [0, 1, 2].map(d => L.filter(x => Math.abs(x.niveau - v) === d && (!m || x.meca !== avant)))).flat().find(C => C.length);
      if (!choix) throw new Error('aucune énigme de logique pour le créneau ' + s.k);
      mettre(s, tire(choix));
    }
    avant = pose[s.k].meca;
  }
  const noms = c => E.fiches.filter(f => f.cat === c).map(f => f.nom);
  const enigmes = R.plan.map(s => {
    const base = { k: s.k, n: s.n, pts: s.pts };
    if (s.r === 'carte') {
      const f = fiche(I[s.k].elimine), V = (R.cartes[f.id].variantes || []).filter(x => ok(x, s)), v = niveauVise(s);
      const C = [0, 1, 2].map(d => V.filter(x => Math.abs(x.niveau - v) === d)).find(C => C.length), x = C ? tire(C) : R.cartes[f.id].devinette, N = noms(f.cat);
      return Object.assign(base, { id: x.id || f.id, niveau: x.niveau || 1, meca: x.meca, titre: x.titre, enonce: x.enonce, aides: x.aides, saisie: 'choix', options: N, bonne: N.indexOf(f.nom), revelation: f.nom + ' est hors de cause.', elimine: f.id });
    }
    if (s.r === 'final') { const f = fiche(coupable[s.cat]), N = noms(s.cat); return Object.assign(base, { final: true, titre: s.titre, enonce: s.enonce || '', saisie: 'choix', options: N, bonne: N.indexOf(f.nom), revelation: R.cartes[f.id].preuve }); }
    const x = pose[s.k], e = Object.assign(base, x, { k: s.k, n: s.n, pts: s.pts, revelation: s.r === 'attribut' ? I[s.k].texte : R.libre || '' }, s.r === 'libre' ? { libre: true } : {});
    for (const c of ['apres', 'requiert', 'meta', 'famille', 'solution', 'prerequis']) delete e[c];
    return e;
  });
  const nom = c => { const C = cats.find(x => x.toLowerCase() === c.toLowerCase()), n = C && fiche(coupable[C]).nom; return !n ? '{' + c + '}' : c[0] === c[0].toLowerCase() ? n[0].toLowerCase() + n.slice(1) : n; };
  return Object.assign({}, E, { reservoir: undefined, graine, retard: R.retard || 0, aides: R.aides, fiches: E.fiches.map(f => Object.assign({}, f, { vue: vue[f.id] })), enigmes,
    denouement: String(R.denouement || '').replace(/\{([^{}]+)\}/g, (m, c) => nom(c)) });
}
// Le dé d'aide : un par brigade et par énigme (jamais au dénouement), le même pour tous ses membres. Faces 1-2 : aucune
// aide ; 3-4 : aide légère ; 5-6 : aide forte. Le sort est équilibré : dans chaque tranche du mois (4 au 9, 10 au 18,
// 19 au 24), chaque brigade reçoit autant de chaque niveau d'aide ; seul l'ordre change d'une brigade à l'autre.
function des(E, b) {
  if (!E.aides || E.aides.mode !== 'brigade' || !E.graine) return {};
  const rnd = alea(E.graine + ':de:' + b), D = {};
  for (const T of [[4, 9], [10, 18], [19, 24]]) {
    const L = E.enigmes.filter(c => !c.final && c.n >= T[0] && c.n <= T[1]), S = L.map((c, i) => i % 3);
    for (let i = S.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [S[i], S[j]] = [S[j], S[i]]; }
    L.forEach((c, i) => { D[c.k] = S[i] * 2 + 1 + Math.floor(rnd() * 2); });
  }
  return D;
}
// L'aide telle qu'elle est servie : en clair, ou déguisée (le texte reste en clair dans la banque).
const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
function aideServie(a) {
  const t = typeof a === 'string' ? a : a && a.texte, f = (a && a.forme) || 'clair';
  if (!t) return undefined;
  if (f === 'envers') return { forme: f, texte: [...t].reverse().join('') };
  if (f === 'morse') return { forme: f, texte: norm(t).split(/\s+/).map(m => [...m].map(c => MORSE[c] || '').filter(Boolean).join(' ')).filter(Boolean).join(' / ') };
  if (f === 'decalage') return { forme: f, cle: 1, texte: norm(t).toUpperCase().replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 64) % 26 + 65)) };
  return { forme: f, texte: t };
}
function composer(E, graine) {
  if (E.reservoir.grille) return composerGrille(E, graine);
  const R = E.reservoir, rnd = alea(graine);
  const melange = L => { const A = L.slice(), o = []; while (A.length) o.push(A.splice(Math.floor(rnd() * A.length), 1)[0]); return o; };
  const coupable = {}, innocents = {};
  for (const c of [...new Set(E.fiches.map(f => f.cat))]) { const F = melange(E.fiches.filter(f => f.cat === c)); coupable[c] = F[0]; innocents[c] = F.slice(1); }
  // Indices : ceux de chaque carte coupable gardent leur ordre (du plus flou au plus net) ; seules les catégories s'entremêlent.
  const files = Object.keys(coupable).map(c => R.cartes[coupable[c].id].indices.slice());
  const indices = melange(files.flatMap((f, i) => f.map(() => i))).map(i => files[i].shift()), logiques = melange(R.logiques);
  const devinette = f => { const noms = E.fiches.filter(x => x.cat === f.cat).map(x => x.nom); return Object.assign({}, R.cartes[f.id].devinette, { saisie: 'choix', options: noms, bonne: noms.indexOf(f.nom) }); };
  const enigmes = R.plan.map(s => {
    const base = { k: s.k, n: s.n, pts: s.pts };
    if (s.r === 'carte') { // de préférence une carte déjà présentée dans le sapin
      const I = innocents[s.cat], i = Math.max(0, I.findIndex(f => !(R.cartes[f.id].vue > s.n))), f = I.splice(i, 1)[0];
      return Object.assign(base, devinette(f), { revelation: f.nom + ' est hors de cause.', elimine: f.id });
    }
    if (s.r === 'final') return Object.assign(base, devinette(coupable[s.cat]), s.titre ? { titre: s.titre } : {}, { enonce: s.enonce || '' }, { revelation: R.cartes[coupable[s.cat].id].preuve });
    return Object.assign(base, logiques.shift(), { revelation: indices.shift() });
  });
  const nom = c => { const C = Object.keys(coupable).find(x => x.toLowerCase() === c.toLowerCase()), n = C && coupable[C].nom; return !n ? '{' + c + '}' : c[0] === c[0].toLowerCase() ? n[0].toLowerCase() + n.slice(1) : n; };
  return Object.assign({}, E, { reservoir: undefined, enigmes, denouement: String(R.denouement || '').replace(/\{([^{}]+)\}/g, (m, c) => nom(c)) });
}
let graineConnue = null;
async function graineTirage() {
  if (graineConnue) return graineConnue;
  const relire = async () => { const r = await get(FILE_TIRAGE, { access: 'private', useCache: false }); return r && r.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()).graine : null; };
  let g = await relire();
  if (!g) {
    g = crypto.randomBytes(16).toString('hex');
    try { await put(FILE_TIRAGE, JSON.stringify({ graine: g, t: Date.now() }), { access: 'private', contentType: 'application/json', allowOverwrite: false }); }
    catch (e) { g = await relire(); if (!g) throw e; } // un autre appel a tiré entre-temps : sa graine fait foi
  }
  return (graineConnue = g);
}

// `enq` : les points d'enquête de chaque brigade (énigmes closes), ajoutés à sa moyenne pour le classement (`tot`).
function brigades(L, joueurs, mienne, enq) {
  const T = Array.from({ length: NB_BRIGADES }, (_, b) => ({ b, n: 0, actifs: 0, pts: 0, pj: 0, moy: 0 }));
  for (const x of L) if (T[x.b]) { T[x.b].n++; T[x.b].pts += x.pts; T[x.b].pj += x.pj || 0; if (x.cl) T[x.b].actifs++; }
  for (const t of T) { t.moy = t.actifs ? Math.round(t.pts / t.actifs * 10) / 10 : 0; t.mj = t.actifs ? Math.round(t.pj / t.actifs * 10) / 10 : 0; t.mq = Math.round((t.moy - t.mj) * 10) / 10; delete t.pj; t.enq = enq ? enq[t.b] : 0; t.tot = Math.round((t.moy + t.enq) * 10) / 10; }
  // nn : les voix pour le nom, regroupées sans accents ni casse ; n : les mêmes voix telles que les membres les ont écrites.
  const V = Array.from({ length: NB_BRIGADES }, () => ({ d: {}, g: {}, n: {}, e: {}, nn: {} }));
  for (const cle of Object.keys(joueurs)) {
    const j = joueurs[cle], v = V[j.b];
    if (!v) continue;
    if (j.d !== undefined) v.d[j.d] = (v.d[j.d] || 0) + 1;
    if (j.g !== undefined) v.g[j.g] = (v.g[j.g] || 0) + 1;
    if (typeof j.n === 'string') { v.n[j.n] = (v.n[j.n] || 0) + 1; v.nn[norm(j.n)] = (v.nn[norm(j.n)] || 0) + 1; }
    if (j.e !== undefined) v.e[j.e] = (v.e[j.e] || 0) + 1;
  }
  const titres = attribuer(V, 'nn'), emblemes = attribuer(V, 'e');
  // Le nom s'écrit comme la brigade qui le porte l'a le plus souvent écrit.
  const graphie = (v, c) => Object.keys(v.n).filter(x => norm(x) === c).sort((x, y) => v.n[y] - v.n[x] || (x < y ? -1 : 1))[0];
  const tries = (o, tri) => Object.keys(o).sort((x, y) => o[y] - o[x] || tri(x, y));
  for (const t of T) {
    const v = V[t.b], d = tries(v.d, (x, y) => x - y)[0];
    if (d !== undefined) t.devise = Number(d);
    // Les cinq jeux les plus soutenus, dans l'ordre : la page retient le premier qui est au catalogue,
    // si bien qu'un nom inconnu (appel direct, jeu retiré ou renommé) ne prive pas la brigade de son emblème.
    t.jeux = tries(v.g, (x, y) => (x < y ? -1 : x > y ? 1 : 0)).slice(0, 5);
    if (titres[t.b] !== undefined) t.titre = graphie(v, titres[t.b]);
    if (emblemes[t.b] !== undefined) t.embleme = Number(emblemes[t.b]);
    if (t.b === mienne) t.voix = { d: v.d, g: v.g, n: v.n, e: v.e };
  }
  T.sort((x, y) => y.tot - x.tot || x.b - y.b);
  let rang = 0;
  T.forEach((t, i) => { if (!i || t.tot !== T[i - 1].tot) rang = i + 1; t.rang = rang; });
  return T;
}

// Ce que le joueur a le droit de voir d'une porte : rien avant son jour ; l'énoncé d'une question seulement une fois
// son chrono lancé ; la solution seulement après la clôture. La règle d'un jeu d'adresse se lit avant de jouer.
function vue(q, etat, r, tout, maintenant, rg) {
  const o = { n: q.n, etat, ouvre: dateDe(q.n), ferme: dateDe(q.n + DELAI) };
  if (etat === 'avenir' && !tout) return o;
  const clos = etat === 'close' || tout;
  if (q.type === 'quiz') return vueQuiz(o, q, etat, r, clos, maintenant);
  if (q.type === 'duo') return vueDuo(o, q, etat, r, clos, rg);
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

// Porte à plusieurs jeux. Ouverte : la page reçoit le jeu en cours comme une porte de jeu ordinaire, avec `duo` pour dire
// où l'on en est et les notes des jeux déjà faits. Tout lancé : type duo, `fini`. Close ou en relecture : type duo et
// chaque jeu avec sa règle, son mot de la fin et, à la clôture, son rang et ses points.
function vueDuo(o, q, etat, r, clos, rg) {
  const nb = q.jeux.length, g = (r && r.g) || [];
  const notes = i => (g[i] ? { scores: g[i].e.map(a => (a.s === undefined ? null : a.s)), meilleur: meilleure(g[i]) } : {});
  if (clos) {
    Object.assign(o, { type: 'duo', titre: q.titre, ill: q.ill, nb });
    o.jeux = q.jeux.map((c, i) => {
      const x = Object.assign({ jeu: c.jeu, titre: c.titre, duree: c.duree, essais: c.essais, question: c.question, ill: c.ill, explication: c.explication, source: c.source }, notes(i));
      const d = rg && rg.d[i];
      if (r && etat === 'close') { x.pts = d ? d.pts : 0; if (d) { x.rang = d.rang; x.sur = d.sur; } }
      return x;
    });
    if (r && etat === 'close') o.pts = rg ? rg.pts : 0;
    return o;
  }
  const k = rangDuo(q, r);
  if (k >= nb) return Object.assign(o, { type: 'duo', titre: q.titre, ill: q.ill, nb, fini: true, jeux: q.jeux.map((c, i) => Object.assign({ titre: c.titre }, notes(i))) });
  const c = q.jeux[k];
  return Object.assign(o, { type: 'jeu', titre: q.titre, duree: c.duree, essais: c.essais, jeu: c.jeu, question: c.question, ill: c.ill },
    notes(k), { duo: { i: k + 1, nb, titre: c.titre, avant: q.jeux.slice(0, k).map((x, i) => Object.assign({ titre: x.titre }, notes(i))) } });
}

// Verrou d'une porte ouverte pas encore lancée par le joueur. Les portes se jouent dans l'ordre : « ordre » tant qu'une porte
// plus ancienne, encore ouverte, n'a pas été lancée (`avant` : laquelle). Le sapin d'abord : « sapin » tant que la goutte du
// même jour n'a pas été ouverte (action « sapin », gardée dans s: { n: 1 }). Une porte déjà lancée n'est plus verrouillée.
function verrou(B, j, n, jour) {
  if (handler.sansVerrou || (j && j.r[n])) return null;
  const m = B.portes.find(q => q.n < n && etatDe(q.n, jour) === 'ouverte' && !(j && j.r[q.n]));
  if (m) return { verrou: 'ordre', avant: m.n };
  return j && j.s && j.s[n] ? null : { verrou: 'sapin' };
}

function etat(B, joueurs, cle, jour, maintenant) {
  const j = cle ? joueurs[cle] : null;
  const portes = B.portes.map(q => {
    const e = etatDe(q.n, jour);
    if (e === 'ouverte' && cle) { const v = verrou(B, j, q.n, jour); if (v) return Object.assign(vue(q, e, j && j.r[q.n], false, maintenant), v); }
    return vue(q, e, j && j.r[q.n], false, maintenant, j && (q.type === 'jeu' || q.type === 'duo') && e === 'close' ? rangsPorte(q, joueurs)[cle] : undefined);
  });
  const L = classementSuivi(B, joueurs, jour), E = B.enquete;
  return {
    jour,
    prenom: j ? j.p : undefined,
    sapin: j && j.s ? Object.keys(j.s).map(Number) : [],
    profil: j && (j.a || j.b !== undefined) ? { a: j.a, b: j.b, d: j.d, g: j.g, n: j.n, e: j.e } : undefined,
    nom: j ? j.l : undefined,
    fiche: { etat: jour < FICHE_JOUR ? 'avenir' : 'ouvert', ouvre: dateDe(FICHE_JOUR) },
    choix: { etat: jour < FICHE_JOUR ? 'avenir' : jour <= CHOIX_FIN ? 'ouvert' : 'fige', ferme: dateDe(CHOIX_FIN) },
    portes,
    total: portes.reduce((s, p) => s + (p.pts || 0), 0),
    classement: L,
    brigades: brigades(L, joueurs, j ? j.b : undefined, E && pointsEnq(E, voix(E, joueurs), jour)),
    enquete: E ? vueEnquete(E, joueurs, cle, jour, false) : undefined,
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

  let B = banque();
  // L'administration peut se placer à une autre date, pour essayer le jeu avant décembre.
  const instant = handler.maintenant(), maintenant = instant.getTime();
  const jour = rangDe(admin && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : PARIS.format(instant));

  try {
    // Enquête à tirage : composée d'après la graine. Avant le 1er décembre réel, rien n'est tiré et l'enquête n'existe pas encore.
    const reservoir = B.enquete && B.enquete.reservoir ? B.enquete : null;
    if (reservoir) {
      const simule = admin && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date);
      const graine = simule ? 'essai' : jour >= 1 ? await graineTirage() : null;
      B = Object.assign({}, B, { enquete: graine ? composer(reservoir, graine) : undefined });
    }
    if (admin && typeof b.retirer === 'string') {
      const cle = norm(b.retirer.trim().replace(/’/g, "'"));
      return res.status(200).json(await modifier(joueurs => {
        if (!joueurs[cle]) return { fin: J => ({ ok: true, retire: false, classement: classement(B, J, jour) }) };
        delete joueurs[cle];
        return { ok: J => ({ ok: true, retire: true, classement: classement(B, J, jour) }) };
      }));
    }
    // Liste des participants : l'administration la remplace (tableau de noms) ou la relit ("lire").
    // Un nom : 2 à 40 caractères, lettres, espaces, points, apostrophes et traits d'union ; pas de doublon.
    if (admin && b.participants !== undefined) {
      if (b.participants !== 'lire') {
        const N = Array.isArray(b.participants) ? b.participants.map(x => (typeof x === 'string' ? propre(x) : '')) : null;
        if (!N || N.length > MAX_LISTE || N.some(x => !NOM_LISTE.test(x)) || new Set(N.map(norm)).size !== N.length) return res.status(400).json({ error: 'participants' });
        await put(FILE_LISTE, JSON.stringify({ noms: N }), { access: 'private', contentType: 'application/json', cacheControlMaxAge: 60, allowOverwrite: true });
      }
      const liste = await lireListe(), { joueurs } = await lire();
      const pris = Object.keys(joueurs).filter(c => joueurs[c].l).map(c => ({ nom: joueurs[c].l, pseudo: joueurs[c].p }));
      return res.status(200).json({ ok: true, participants: liste, pris, horsListe: Object.keys(joueurs).filter(c => !joueurs[c].l).map(c => joueurs[c].p) });
    }
    // Film de clôture : l'administration le dépose (MP4 en base64), le retire ("effacer") ou en relit la taille ("lire").
    if (admin && b.film !== undefined) {
      if (b.film === 'effacer') await put(FILE_FILM, '', { access: 'private', contentType: 'video/mp4', allowOverwrite: true });
      else if (b.film !== 'lire') {
        const octets = typeof b.film === 'string' && /^[A-Za-z0-9+/=]+$/.test(b.film) ? Buffer.from(b.film, 'base64') : null;
        if (!octets || octets.length < 1024 || octets.length > MAX_FILM || octets.slice(4, 8).toString('latin1') !== 'ftyp') return res.status(400).json({ error: 'film' });
        await put(FILE_FILM, octets, { access: 'private', contentType: 'video/mp4', allowOverwrite: true });
      }
      const f = await lireFilm();
      return res.status(200).json({ ok: true, film: f ? f.length : 0 });
    }
    // Modération : l'administration efface un nom de brigade proposé par un membre (toutes les voix qui le portent).
    if (admin && typeof b.effacerTitre === 'string') {
      const c = norm(propre(b.effacerTitre));
      return res.status(200).json(await modifier(joueurs => {
        const L = Object.keys(joueurs).filter(x => typeof joueurs[x].n === 'string' && norm(joueurs[x].n) === c);
        if (!L.length) return { fin: () => ({ ok: true, efface: 0 }) };
        L.forEach(x => { delete joueurs[x].n; });
        return { ok: () => ({ ok: true, efface: L.length }) };
      }));
    }
    // Relecture du film par l'administration, à toute date.
    if (admin && !equipe && b.action === 'film') {
      const f = await lireFilm();
      if (!f) return res.status(404).json({ error: 'film' });
      return res.status(200).json(b.tete ? { film: true, octets: f.length } : { film: f.toString('base64'), type: 'video/mp4' });
    }
    // Code d'administration seul : relecture des 25 portes, solutions comprises. Rien ne s'enregistre.
    if (!equipe) {
      const { joueurs } = await lire();
      return res.status(200).json({ relecture: true, jour, portes: B.portes.map(q => vue(q, etatDe(q.n, jour), null, true, maintenant)), total: 0, classement: classement(B, joueurs, jour), enquete: reservoir ? { titre: reservoir.titre, tirage: true, fiches: reservoir.fiches, amorces: reservoir.amorces, reservoir: reservoir.reservoir } : B.enquete ? vueEnquete(B.enquete, joueurs, null, jour, true) : undefined });
    }

    // La liste des participants, pour le menu déroulant de l'entrée : elle ne sort qu'ici, avec le code d'équipe.
    if (b.action === 'liste') return res.status(200).json({ liste: (await lireListe()).slice().sort((x, y) => x.localeCompare(y, 'fr')) });
    // Entrée par un nom de la liste : la fiche déjà créée sous ce nom, ou l'invitation à la créer (`nouveau`).
    if (b.action === 'entrer') {
      const nom = dansListe(await lireListe(), b.nom);
      if (!nom) return res.status(400).json({ error: 'nom' });
      const { joueurs } = await lire(), c = Object.keys(joueurs).find(x => joueurs[x].l && norm(joueurs[x].l) === norm(nom));
      if (c) return res.status(200).json(etat(B, joueurs, c, jour, maintenant));
      const mot = nom.split(/[ .]/)[0], libre = mot.length >= 2 && mot.length <= 24 && PRENOM.test(mot) && !joueurs[norm(mot)];
      return res.status(200).json({ ...etat(B, joueurs, null, jour, maintenant), nouveau: true, nom, suggestion: libre ? mot : '' });
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
      // Avec `nom` : la fiche est créée pour ce nom de la liste, qui ne peut être pris qu'une fois ; `prenom` est le pseudo choisi.
      const nom = b.nom === undefined ? undefined : dansListe(await lireListe(), b.nom);
      if (b.nom !== undefined && !nom) return res.status(400).json({ error: 'nom' });
      const fermee = !nom && !admin && (await lireListe()).length > 0;
      const s = await modifier(joueurs => {
        if (nom) {
          const c = Object.keys(joueurs).find(x => joueurs[x].l && norm(joueurs[x].l) === norm(nom));
          if (c && c !== cle) return { fin: () => ({ code: 409, corps: { error: 'nom' } }) };      // ce nom a déjà sa fiche, sous un autre pseudo
          if (!c && joueurs[cle]) return { fin: () => ({ code: 409, corps: { error: 'pris' } }) }; // ce pseudo est porté par un autre joueur
        }
        if (!joueurs[cle]) {
          if (fermee) return { fin: () => ({ code: 403, corps: { error: 'liste' } }) };
          if (Object.keys(joueurs).length >= MAX_JOUEURS) return { fin: () => ({ code: 403, corps: { error: 'complet' } }) };
          joueurs[cle] = { p: prenom, t: maintenant, r: {} };
          if (nom) joueurs[cle].l = nom;
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
    // Voix d'un membre pour le nom, l'emblème, la devise et le jeu emblème de sa brigade : ouvert du 26 novembre au 10 décembre, modifiable d'ici là.
    if (b.action === 'brigade') {
      if (jour < FICHE_JOUR || jour > CHOIX_FIN) return res.status(403).json({ error: jour < FICHE_JOUR ? 'scellee' : 'fige' });
      const d = b.devise, g = typeof b.jeu === 'string' ? b.jeu.trim() : b.jeu;
      const ti = typeof b.titre === 'string' ? propre(b.titre) : b.titre, em = b.embleme;
      if (d === undefined && g === undefined && ti === undefined && em === undefined) return res.status(400).json({ error: 'choix' });
      if (ti !== undefined && !titreOk(ti)) return res.status(400).json({ error: 'titre' });
      if (em !== undefined && !(Number.isInteger(em) && em >= 0 && em < NB_EMBLEMES)) return res.status(400).json({ error: 'embleme' });
      if (d !== undefined && !(Number.isInteger(d) && d >= 0 && d < NB_DEVISES)) return res.status(400).json({ error: 'devise' });
      if (g !== undefined && (typeof g !== 'string' || !g || g.length > 80 || /[\u0000-\u001f<>]/.test(g))) return res.status(400).json({ error: 'jeu' });
      const s = await modifier(joueurs => {
        const j = joueurs[cle];
        if (!j || j.b === undefined) return { fin: () => ({ code: 403, corps: { error: 'profil' } }) };
        if (d !== undefined) j.d = d;
        if (g !== undefined) j.g = g;
        if (ti !== undefined) j.n = ti;
        if (em !== undefined) j.e = em;
        return { ok: J => ({ code: 200, corps: { ok: true, ...etat(B, J, cle, jour, maintenant) } }) };
      });
      return res.status(s.code).json(s.corps);
    }
    // Réponse d'un membre à une énigme de l'enquête : une seule, définitive. Rien ne dit si elle est juste avant la clôture.
    // Gouttes du sapin ouvertes par le joueur (le sapin les retient dans le navigateur, la page les déclare ici).
    if (b.action === 'sapin') {
      const L = Array.isArray(b.jours) ? [...new Set(b.jours)] : null;
      if (!L || !L.length || L.length > 25 || L.some(n => !Number.isInteger(n) || n < 1 || n > 25)) return res.status(400).json({ error: 'jours' });
      const s = await modifier(joueurs => {
        const j = joueurs[cle], N = L.filter(n => n <= jour && !(j && j.s && j.s[n]));
        if (!j || !N.length) return { fin: J => ({ code: 200, corps: etat(B, J, cle, jour, maintenant) }) };
        for (const n of N) (j.s || (j.s = {}))[n] = 1;
        return { ok: J => ({ code: 200, corps: etat(B, J, cle, jour, maintenant) }) };
      });
      return res.status(s.code).json(s.corps);
    }
    if (b.action === 'enquete') {
      const c = B.enquete && Number.isInteger(b.k) ? B.enquete.enigmes.find(x => x.k === b.k) : null;
      if (!c) return res.status(400).json({ error: 'enigme' });
      const e = etatEnq(c, jour);
      if (e !== 'ouverte') return res.status(403).json({ error: e === 'avenir' ? 'scellee' : 'close' });
      const v = typeof b.reponse === 'string' ? b.reponse.trim() : b.reponse;
      const cats = c.saisie === 'trio' ? [...new Set((B.enquete.fiches || []).map(f => f.cat))] : [];
      if (c.saisie === 'trio' ? !(Array.isArray(v) && v.length === cats.length && v.every((id, i) => B.enquete.fiches.some(f => f.id === id && f.cat === cats[i]))) : c.saisie === 'choix' ? !(Number.isInteger(v) && v >= 0 && v < c.options.length) : !(typeof v === 'string' && normRep(v) && v.length <= 80 && !/[\u0000-\u001f<>]/.test(v))) return res.status(400).json({ error: 'reponse' });
      const s = await modifier(joueurs => {
        const j = joueurs[cle], vu = J => etat(B, J, cle, jour, maintenant);
        if (!j || j.b === undefined) return { fin: () => ({ code: 403, corps: { error: 'profil' } }) };
        if (j.x && j.x[c.k]) return { fin: J => ({ code: 409, corps: { error: 'deja', ...vu(J) } }) };
        (j.x || (j.x = {}))[c.k] = { v, t: maintenant };
        return { ok: J => ({ code: 200, corps: { ok: true, ...vu(J) } }) };
      });
      return res.status(s.code).json(s.corps);
    }
    // Film de clôture : rien avant le dénouement (toutes les énigmes du dernier jour closes). `tete` : seulement s'il existe.
    if (b.action === 'film') {
      const E = B.enquete;
      if (!E || etatDe(Math.max(...E.enigmes.map(c => c.n)), jour) !== 'close') return res.status(403).json({ error: 'scellee' });
      const f = await lireFilm();
      if (!f) return res.status(404).json({ error: 'film' });
      return res.status(200).json(b.tete ? { film: true, octets: f.length } : { film: f.toString('base64'), type: 'video/mp4' });
    }
    if (b.action === 'tampon') {
      // Poser, changer ou retirer son tampon sur une fiche (t : 'h', 'c' ou rien), dès la fiche de suivi et jusqu'au dénouement.
      const E = B.enquete, f = E && E.fiches && typeof b.id === 'string' ? E.fiches.find(x => x.id === b.id) : null;
      if (!f || !(b.t === 'h' || b.t === 'c' || b.t === null || b.t === undefined)) return res.status(400).json({ error: 'fiche' });
      if (etatDe(Math.max(...E.enigmes.map(c => finEnq(c))) - DELAI, jour) === 'close') return res.status(403).json({ error: 'close' });
      const s = await modifier(joueurs => {
        const j = joueurs[cle], vu = J => etat(B, J, cle, jour, maintenant);
        if (!j || j.b === undefined) return { fin: () => ({ code: 403, corps: { error: 'profil' } }) };
        const V = vueEnquete(E, joueurs, cle, jour);
        if (!V || !V.fiches) return { fin: () => ({ code: 403, corps: { error: 'scellee' } }) };
        const T = Object.assign({}, j.tp); if (b.t) T[f.id] = b.t; else delete T[f.id];
        if (Object.keys(T).length) j.tp = T; else delete j.tp;
        return { ok: J => ({ code: 200, corps: { ok: true, ...vu(J) } }) };
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
      const fermee = !admin && (await lireListe()).length > 0;
      sortie = await modifier(joueurs => {
        const v = verrou(B, joueurs[cle], q.n, jour);
        if (v) return refus(403, v.verrou);
        if (!joueurs[cle]) {
          if (fermee) return refus(403, 'liste');
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
        } else if (q.type === 'duo') {
          const r = j.r[q.n] || (j.r[q.n] = { g: [] });
          const k = rangDuo(q, r);
          if (k >= q.jeux.length) return refus(409, 'essais');
          jeton = crypto.randomBytes(8).toString('hex');
          (r.g[k] || (r.g[k] = { e: [] })).e.push({ d: maintenant, k: jeton });
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
    } else if (q.type === 'jeu' || q.type === 'duo') {
      // Note d'une tentative de jeu, calculée par le navigateur. Dans une porte à plusieurs jeux, le jeton dit de quel jeu il s'agit.
      if (!Number.isInteger(b.score) || b.score < 0 || b.score > 10 || typeof b.jeton !== 'string') return res.status(400).json({ error: 'reponse' });
      if (b.brut !== undefined && (!Number.isInteger(b.brut) || b.brut < 0)) return res.status(400).json({ error: 'reponse' });
      sortie = await modifier(joueurs => {
        const r = joueurs[cle] && joueurs[cle].r[q.n];
        const G = !r ? [] : q.type === 'duo' ? r.g : [r];
        const i = G.findIndex(g => g && g.e.some(x => x.k === b.jeton));
        const c = q.type === 'duo' ? q.jeux[i] : q, a = i < 0 ? null : G[i].e.find(x => x.k === b.jeton);
        if (!a) return refus(403, 'nondemarre');
        if (b.brut !== undefined && b.brut > (PLAFOND[c.jeu] || 0)) return { fin: () => ({ code: 400, corps: { error: 'reponse' } }) };
        if (a.s !== undefined) return refus(409, 'deja');
        const dt = (maintenant - a.d) / 1000;
        if (dt < JEU_MIN || dt > c.duree + JEU_MARGE) return refus(403, 'delai');
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
handler.composer = composer; // pour le contrôle de la banque (outils/banque.js)
module.exports = handler;
handler.aideServie = aideServie;
