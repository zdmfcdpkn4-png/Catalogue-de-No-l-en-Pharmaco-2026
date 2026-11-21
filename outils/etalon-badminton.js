// Étalonnage du badminton des bouchons par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit, immobile,
// et plusieurs façons de taper au hasard) jouent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-badminton.js ['{"robot":160,"seuils":[...]}'] [durée en s] [parties par profil]   (réglages à essayer, voir RBD dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL_BADMINTON, BD = J.BD;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const D = +(process.argv[3] || 55), K = +(process.argv[4] || 300);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
const COUPS = ['amorti', 'degage', 'smash'];
// Ce qu'un joueur lit d'un volant qui arrive : en rejouant le vol (et sa propre course vers la zone de frappe), l'instant de la
// meilleure frappe ordinaire et celui du meilleur smash, avec leur qualité.
function lire(s) {
  const c = Object.assign({}, s.v); let x = s.x, t = 0; const r = { tn: 0, qn: -1, ts: 0, qs: -1 };
  while (c.y < BD.SOL && t < 4) {
    J.volVolant(c, BD.PAS); t += BD.PAS; x += Math.max(-R.pas * BD.PAS, Math.min(R.pas * BD.PAS, s.cible - x));
    const qn = J.qualiteBadminton(x + BD.MAIN, 'amorti', c), qs = J.qualiteBadminton(x + BD.MAIN, 'smash', c);
    if (qn > r.qn) { r.qn = qn; r.tn = t; } if (qs > r.qs) { r.qs = qs; r.ts = t; }
  }
  return r;
}
// Un joueur : il sert après « service » secondes ; à chaque volant, il choisit son coup (smash s'il le voit possible, avec la
// probabilité « smash » ; sinon, avec la probabilité « tactique », le coup qui éloigne le volant de l'automate, sinon au hasard),
// puis frappe à l'instant idéal, à « sigma » secondes près, jamais plus tôt que son temps de « reaction ». « oubli » : il laisse passer.
// hasard : il tape sans regarder, toutes les « hasard » secondes en moyenne, un coup tiré au sort (ou toujours « bouton »).
function partie(p, graine) {
  const s = J.creerBadminton(graine); let plan = null, vu = -1, sert = null, suivant = 0;
  while (!s.fini) {
    if (p.immobile) { }
    else if (p.hasard) { if (s.t >= suivant) { J.frapperBadminton(s, p.bouton || COUPS[Math.floor(alea() * 3)], D); suivant = s.t + p.hasard * (0.4 + 1.2 * alea()); } }
    else if (s.phase === 'service') {
      if (sert === null) sert = s.t + p.service * (0.7 + 0.6 * alea());
      if (s.t >= sert) { J.frapperBadminton(s, alea() < 0.5 ? 'amorti' : 'degage', D); sert = null; }
    } else if (s.phase === 'jeu' && s.v.de === 1 && !s.v.mort) {
      if (s.v.n !== vu) {
        vu = s.v.n; plan = null;
        if (alea() >= p.oubli) {
          const r = lire(s), smash = r.qs > 0.45 && alea() < p.smash;
          const type = smash ? 'smash' : alea() < p.tactique ? (s.ax > 262 ? 'amorti' : 'degage') : alea() < 0.5 ? 'amorti' : 'degage';
          const ideal = smash ? r.ts : r.tn, t = ideal + gauss() * p.sigma;
          plan = { type, t: s.t + (t < p.reaction ? p.reaction + Math.abs(gauss()) * p.sigma : t) };
        }
      }
      if (plan && s.t >= plan.t) { J.frapperBadminton(s, plan.type, D); plan = null; }
    }
    J.pasBadminton(s, BD.PAS, D);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, pts = 0, max = 0, pour = 0, contre = 0, fr = 0, pf = 0, sm = 0, vd = 0, long = 0, rec = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, 1000 + i * 2), b = partie(p, 1001 + i * 2), na = J.noteBadminton(a), nb = J.noteBadminton(b);
    h[na]++; m += na; mm += Math.max(na, nb); pts += a.points; max = Math.max(max, a.points, b.points); pour += a.pour; contre += a.contre; fr += a.frappes; pf += a.parfaites; sm += a.smashs; vd += a.vides; long = Math.max(long, a.t, b.t); rec += a.record;
  }
  console.log(nom.padEnd(16), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', (pts / K).toFixed(0).padStart(4), '(max ' + max + ')', '| échanges', (pour / K).toFixed(1) + '/' + ((pour + contre) / K).toFixed(1), '| frappes', (fr / K).toFixed(1), 'parfaites', (pf / K).toFixed(1), 'smashs', (sm / K).toFixed(1), 'vides', (vd / K).toFixed(1), '| plus long échange', (rec / K).toFixed(1), '| durée max', long.toFixed(1), '| notes', h.join(' '));
}
console.log('badminton, ' + D + ' s :', JSON.stringify(R));
profil('adroit', { service: 0.5, sigma: 0.04, reaction: 0.26, smash: 0.95, tactique: 0.9, oubli: 0.01 });
profil('moyen', { service: 0.9, sigma: 0.07, reaction: 0.33, smash: 0.7, tactique: 0.6, oubli: 0.04 });
profil('maladroit', { service: 1.5, sigma: 0.115, reaction: 0.42, smash: 0.4, tactique: 0.3, oubli: 0.1 });
profil('immobile', { immobile: true });
// Taper sans regarder : vite, lentement, ou en martelant un seul bouton.
profil('hasard vif', { hasard: 0.2 });
profil('hasard lent', { hasard: 0.6 });
profil('martèle amorti', { hasard: 0.12, bouton: 'amorti' });
profil('martèle dégagé', { hasard: 0.12, bouton: 'degage' });
profil('martèle smash', { hasard: 0.12, bouton: 'smash' });
// Le plafond du score brut : un automate sans défaut, ni temps de réaction.
profil('sans défaut', { service: 0, sigma: 0, reaction: 0, smash: 1, tactique: 1, oubli: 0 });
