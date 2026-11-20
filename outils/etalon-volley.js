// Étalonnage du volley des poches par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit, immobile)
// jouent des centaines de matchs contre l'automate. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-volley.js ['{"robot":220,"erreur":4}'] [durée en s]   (réglages à essayer, voir RVO dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RVO = J.REGL_VOLLEY, VO = J.VO;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RVO[k] = v;
const D = +(process.argv[3] || 60);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
const R = VO.RB + VO.RJ, HSAUT = RVO.saut * RVO.saut / (2 * RVO.poids), TSAUT = RVO.saut / RVO.poids;
// Un joueur : à chaque nouvelle trajectoire, après un temps de réaction (retard), il estime où la poche redescendra chez lui,
// avec une erreur (bruit, en px), et s'y rend à la vitesse de sa main en se décalant vers l'arrière (angle) pour la renvoyer
// vers l'avant. attaque : la part des poches hautes qu'il va chercher en sautant pour les renvoyer à plat. recentre : il
// revient au milieu de son camp quand la poche est en face.
function decide(p, s, b) {
  const sol = J.prevoirPoche(b, VO.SOL - VO.TETE - 26);
  if (sol.x > VO.FX) return { x: p.recentre ? 96 : s.cible };
  if (p.attaque && alea() < p.attaque) {
    const haut = J.prevoirPoche(b, VO.SOL - VO.TETE - HSAUT - R * 0.5), x = haut.x - R * 0.85;
    if (haut.x < VO.FX - 6 && haut.t > TSAUT + 0.05 && Math.abs(x - s.x) / p.main < haut.t - 0.05) return { x: x + gauss() * p.bruit, saut: s.t + haut.t - TSAUT + gauss() * p.bruit / 300 };
  }
  // place : la part des renvois où il vise loin de l'automate (court derrière le pied, ou long au fond) au lieu de son angle habituel.
  let angle = p.angle;
  if (p.place && alea() < p.place) {
    const v = Math.min(RVO.vmax, RVO.frappe * Math.pow(RVO.gain, s.echange)); let loin = -1;
    for (let a = 0.15; a < 1; a += 0.1) {
      const q = J.prevoirPoche({ x: sol.x, y: VO.SOL - VO.TETE - 26 }, VO.SOL - VO.RB, Math.sin(a) * v, -Math.cos(a) * v);
      if (q.x > VO.FX + 12 && Math.abs(q.x - s.ax) > loin) { loin = Math.abs(q.x - s.ax); angle = a; }
    }
  }
  return { x: sol.x - R * Math.sin(angle) + gauss() * p.bruit };
}
function match(p, graine, duree, suivi) {
  const s = J.creerVolley(graine); let vu = -2, quand = 0, plan = null, sauts = 0, pts = 0; const pourquoi = {};
  while (!s.fini) {
    const b = s.balle;
    if (!p.immobile) {
      if (b) {
        if (vu !== b.n) { vu = b.n; quand = s.t + p.retard; plan = null; }
        if (!plan && s.t >= quand) plan = decide(p, s, b);
      } else { vu = -2; plan = p.recentre ? { x: 96 } : null; }
      if (plan) {
        s.cible += Math.max(-p.main / 240, Math.min(p.main / 240, plan.x - s.cible));
        if (plan.saut && s.t >= plan.saut) { s.saut = 0.1; plan.saut = 0; sauts++; }
      }
    }
    J.pasVolley(s, 1 / 240, duree);
    if (suivi) suivi(s);
    if (s.pour + s.contre > pts) { pts++; pourquoi[s.msg] = (pourquoi[s.msg] || 0) + 1; }
  }
  s.sauts = sauts; s.pourquoi = pourquoi;
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0), K = +(process.argv[4] || 300); let m = 0, mm = 0, po = 0, co = 0, rec = 0, sa = 0; const pq = {};
  for (let i = 0; i < K; i++) {
    const a = match(p, 1000 + i * 2, D), b = match(p, 1001 + i * 2, D), na = J.noteVolley(a), nb = J.noteVolley(b);
    h[na]++; m += na; mm += Math.max(na, nb); po += a.pour; co += a.contre; rec = Math.max(rec, a.record, b.record); sa += a.sauts; for (const k in a.pourquoi) pq[k] = (pq[k] || 0) + a.pourquoi[k];
  }
  console.log(nom.padEnd(10), 'un match :', (m / K).toFixed(1), '| meilleur de deux :', (mm / K).toFixed(1), '| marqués', (po / K).toFixed(1), '| encaissés', (co / K).toFixed(1), '| sauts', (sa / K).toFixed(1), '| 10 :', (100 * h[10] / K).toFixed(0) + '%', '| plus long échange', rec, '| répartition', h.map(x => Math.round(100 * x / K)).join(' '), '| par match :', Object.entries(pq).map(([k, v]) => k + ' ' + (v / K).toFixed(1)).join(', '));
}
if (require.main !== module) { module.exports = { match, J }; return; }
console.log('volley, ' + D + ' s :', JSON.stringify(RVO));
profil('adroit', { retard: 0.15, bruit: 5, main: 320, angle: 0.5, attaque: 0.5, place: 0.7, recentre: true });
profil('moyen', { retard: 0.25, bruit: 11, main: 260, angle: 0.4, attaque: 0.15, place: 0.2, recentre: true });
profil('maladroit', { retard: 0.35, bruit: 18, main: 200, angle: 0.25, attaque: 0, recentre: false });
profil('immobile', { immobile: true });
