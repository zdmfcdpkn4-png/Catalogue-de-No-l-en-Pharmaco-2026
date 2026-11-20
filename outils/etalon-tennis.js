// Étalonnage du tennis de paillasse par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit,
// immobile) jouent des centaines de matchs contre l'automate. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-tennis.js ['{"robot":240,"erreur":12}'] [durée en s]   (réglages à essayer, voir RT dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RT = J.REGL_TENNIS;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RT[k] = v;
const D = +(process.argv[3] || 60);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Un joueur : après un temps de réaction (retard), il estime où la balle arrivera, avec une erreur (bruit, en px) qui grandit
// avec la vitesse de la balle, puis y amène sa spatule à la vitesse de sa main. effet : il frappe avec le bord de la spatule
// pour éloigner la balle de l'automate (0 = plein centre, 1 = tout au bord). Il se recentre pendant que la balle remonte.
function match(p, graine, duree) {
  const s = J.creerTennis(graine); let vu = null, quand = 0, but = 180, traversee = false, maxPas = 0, yAvant = 0, vyAvant = 0;
  while (!s.fini) {
    const b = s.balle;
    if (!p.immobile) {
      if (b && b.vy > 0) {
        if (vu !== b.vx) { vu = b.vx; quand = s.t + p.retard; but = null; }
        if (but === null && s.t >= quand) but = J.viseTennis(b, J.T_YJ - 14) + gauss() * p.bruit * Math.hypot(b.vx, b.vy) / RT.v0 - (s.ax < 180 ? 1 : -1) * p.effet * RT.demi;
      } else { vu = null; if (p.recentre) but = 180; }
      if (but !== null) s.cible += Math.max(-p.main / 240, Math.min(p.main / 240, but - s.cible));
    }
    if (b) { yAvant = b.y; vyAvant = b.vy; }
    J.pasTennis(s, 1 / 240, duree);
    // Contrôles de la physique : pas de saut plus grand que la zone de frappe, pas de balle derrière une raquette qui la couvrait.
    if (b && s.balle === b) { if (vyAvant * b.vy > 0) maxPas = Math.max(maxPas, Math.abs(b.y - yAvant)); if (b.vy > 0 && yAvant < J.T_YJ - 14 && b.y > J.T_YJ && Math.abs(b.x - s.x) < RT.demi) traversee = true; }
  }
  s.traversee = traversee; s.maxPas = maxPas;
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0), K = 400; let m = 0, mm = 0, po = 0, co = 0, rec = 0, trav = 0, pas = 0;
  for (let i = 0; i < K; i++) {
    const a = match(p, 1000 + i * 2, D), b = match(p, 1001 + i * 2, D), na = J.noteTennis(a), nb = J.noteTennis(b);
    h[na]++; m += na; mm += Math.max(na, nb); po += a.pour; co += a.contre; rec = Math.max(rec, a.record, b.record); trav += a.traversee + b.traversee; pas = Math.max(pas, a.maxPas, b.maxPas);
  }
  console.log(nom.padEnd(10), 'un match :', (m / K).toFixed(1), '| meilleur de deux :', (mm / K).toFixed(1), '| marqués', (po / K).toFixed(1), '| encaissés', (co / K).toFixed(1), '| 10 :', (100 * h[10] / K).toFixed(0) + '%', '| plus long échange', rec, '| traversées', trav, '| plus grand pas', pas.toFixed(1), '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('tennis, ' + D + ' s :', JSON.stringify(RT));
profil('adroit', { retard: 0.16, bruit: 8, main: 520, effet: 0.7, recentre: true });
profil('moyen', { retard: 0.26, bruit: 17, main: 380, effet: 0.2, recentre: true });
profil('maladroit', { retard: 0.36, bruit: 24, main: 300, effet: 0, recentre: false });
profil('immobile', { immobile: true });
