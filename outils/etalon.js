// Étalonnage des deux jeux d'adresse par simulation, sans navigateur : des joueurs adroits, moyens et maladroits
// jouent des milliers de manches, pour vérifier que les notes s'étalent bien de 0 à 10.
// Usage : node outils/etalon.js ['{"elan":190,"frein":5}']   (réglages à essayer, voir REGL dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL;
const sim = (x, a, debout) => { const s = J.creerLancer(x, a, debout); let n = 0; while (!s.fini && n++ < 4000) J.pasLancer(s, 1 / 240); return s; };
// Un joueur humain : il vise un point, avec une erreur de position (ex) et d'angle (ea) tirée au hasard.
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
function cadre(ex, ea) {
  const debout = J.PLACES.map(() => true); let total = 0;
  for (let l = 0; l < 2; l++) {
    // cible : le centre des flacons restants (stratégie simple et plausible)
    const R2 = J.PLACES.filter((p, i) => debout[i]); if (!R2.length) break;
    const cx = R2.reduce((s, p) => s + p.x, 0) / R2.length;
    const s = sim(Math.max(68, Math.min(292, cx + gauss() * ex)), gauss() * ea, debout);
    s.quilles.forEach((q, i) => { if (q.la && q.tombee) debout[i] = false; });
    total += J.tombees(s);
  }
  return total;
}
function profil(nom, ex, ea) {
  const h = Array(11).fill(0); let m = 0, mm = 0; const K = 3000;
  for (let i = 0; i < K; i++) { const a = cadre(ex, ea), b = cadre(ex, ea); h[a]++; m += a; mm += Math.max(a, b); }
  console.log(nom.padEnd(22), 'une manche :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| 10 :', (100 * h[10] / K).toFixed(0) + '%', '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
console.log(JSON.stringify(R));
profil('adroit (8, 2°)', 8, 2); profil('moyen (22, 5°)', 22, 5); profil('maladroit (45, 9°)', 45, 9);
const jouer = (retard, pause) => { const s = J.creerTir(); let t = 0, vise = 180, prochaine = 0; while (!s.fini) { if (t >= prochaine) { const c = s.germes.slice().sort((a, b) => b.y - a.y)[0]; if (c) vise = c.x; prochaine = t + retard; } s.cible = (Math.floor(t / 5) % 2 && pause) ? s.x : vise; J.pasTir(s, 1 / 60, 45); t += 1 / 60; } return s.touches + '/' + J.TOTAL + ' -> ' + J.noteTir(s); };
console.log('hotte : idéal', jouer(0, false), '| réactif 0,25 s', jouer(0.25, false), '| lent 0,6 s', jouer(0.6, false), '| très lent 1 s', jouer(1, false), '| distrait', jouer(0.5, true), '| immobile', jouer(999, false));
