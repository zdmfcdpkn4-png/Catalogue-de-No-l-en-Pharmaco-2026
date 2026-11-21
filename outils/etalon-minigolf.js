// Étalonnage du minigolf de la paillasse par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit,
// immobile) jouent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-minigolf.js ['{"vcap":280,"seuils":[...]}'] [durée en s] [parties par profil]   (réglages à essayer, voir RM dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL_MINIGOLF;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const D = +(process.argv[3] || 150), K = +(process.argv[4] || 120);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Le coup que le joueur voudrait jouer : il passe en revue des directions (tous les « pas » degrés) et des forces, imagine où
// chaque coup finirait (rejoué sur une copie de la partie), et retient celui qui laisse le moins de chemin jusqu'au trou (le DASRI est fui).
// Chaque coup est jugé avec ses deux voisins de direction : un coup qui ne passe qu'au degré près ne tente pas le joueur.
const FORCES = [0.2, 0.3, 0.4, 0.5, 0.62, 0.75, 0.88, 1];
const memo = new Map();
function choisir(s, pas) {
  const cle = s.plan.barre ? null : s.n + '/' + pas + '/' + Math.round(s.b.x) + '/' + Math.round(s.b.y);
  if (cle && memo.has(cle)) return memo.get(cle);
  const d = J.distancesMinigolf(s.plan), ici = d(s.b.x, s.b.y), n = Math.round(360 / pas), notes = [];
  for (let i = 0; i < n; i++) {
    const a = i * pas * Math.PI / 180;
    notes.push(FORCES.map(f => { const r = J.apresMinigolf(s, Math.sin(a) * f * R.vmax, -Math.cos(a) * f * R.vmax); return r.dedans ? -80 : r.bac ? ici + 80 : d(r.x, r.y); }));
  }
  let mieux = null;
  for (let i = 0; i < n; i++) for (let j = 0; j < FORCES.length; j++) {
    const v = (2 * notes[i][j] + notes[(i + 1) % n][j] + notes[(i + n - 1) % n][j]) / 4;
    if (!mieux || v < mieux.v) mieux = { v, a: i * pas * Math.PI / 180, f: FORCES[j] * R.vmax };
  }
  if (cle) memo.set(cle, mieux);
  return mieux;
}
// Un joueur : une fois le comprimé arrêté, il met « reflexion » secondes à viser, puis lâche ; son geste ajoute une erreur
// d'angle (degrés) et de force (relative) au coup voulu.
function partie(p, duree) {
  const s = J.creerMinigolf(); let pretA = null, maxPas = 0, dehors = 0;
  while (!s.fini) {
    if (!p.immobile && J.pretMinigolf(s, duree)) {
      if (pretA === null) pretA = s.t + p.reflexion * (0.8 + 0.4 * alea());
      if (s.t >= pretA) {
        const c = choisir(s, p.pas), a = c.a + gauss() * p.angle * Math.PI / 180, f = c.f * (1 + gauss() * p.dose);
        J.tirerMinigolf(s, Math.sin(a) * f, -Math.cos(a) * f, duree); pretA = null;
      }
    }
    const b = s.b, x = b.x, y = b.y;
    J.pasMinigolf(s, 1 / 120, duree);
    // Contrôles de la physique : pas de saut plus grand qu'un portoir n'est épais, comprimé toujours sur la paillasse.
    if (s.b === b && !s.dedans && s.bacT !== s.t) maxPas = Math.max(maxPas, Math.hypot(b.x - x, b.y - y));
    if (s.b.x < R.x0 + R.r - 0.01 || s.b.x > R.x1 - R.r + 0.01 || s.b.y < R.y0 + R.r - 0.01 || s.b.y > R.y1 - R.r + 0.01) dehors++;
  }
  s.maxPas = maxPas; s.dehors = dehors;
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, pts = 0, tr = 0, cp = 0, pr = 0, max = 0, pas = 0, dehors = 0, long = 0, bcl = 0, tps = 0, pen = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, D), b = partie(p, D), na = J.noteMinigolf(a), nb = J.noteMinigolf(b);
    h[na]++; m += na; mm += Math.max(na, nb); pts += a.points; tr += a.trous; cp += a.coupsT; pr += a.premiers;
    max = Math.max(max, a.points, b.points); pas = Math.max(pas, a.maxPas, b.maxPas); dehors += a.dehors + b.dehors; long = Math.max(long, a.t, b.t); bcl += a.boucle ? 1 : 0; tps += a.t; pen += a.penalites;
  }
  console.log(nom.padEnd(10), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', (pts / K).toFixed(0), '(max ' + max + ')', '| trous', (tr / K).toFixed(1), 'dont en un coup', (pr / K).toFixed(1), '| coups', (cp / K).toFixed(1), 'dont pénalités', (pen / K).toFixed(1), '| parcours bouclé', Math.round(100 * bcl / K) + '%', '| durée moyenne', (tps / K).toFixed(0), 'max', long.toFixed(1), '| plus grand pas', pas.toFixed(1), '| sorties', dehors, '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('minigolf, ' + D + ' s :', JSON.stringify(R));
profil('adroit', { reflexion: 2.2, pas: 5, angle: 1.6, dose: 0.06 });
profil('moyen', { reflexion: 3.2, pas: 10, angle: 4, dose: 0.13 });
profil('maladroit', { reflexion: 4.5, pas: 15, angle: 8, dose: 0.24 });
profil('immobile', { immobile: true });
// Le plafond du score brut : un automate sans défaut ni temps de réflexion.
profil('automate', { reflexion: 0, pas: 2.5, angle: 0, dose: 0 });
