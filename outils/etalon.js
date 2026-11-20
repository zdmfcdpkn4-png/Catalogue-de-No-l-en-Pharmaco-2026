// Étalonnage des deux jeux d'adresse par simulation, sans navigateur : des joueurs adroits, moyens et maladroits
// jouent des milliers de parties, pour vérifier que les notes s'étalent bien de 0 à 10.
// Usage : node outils/etalon.js ['{"elan":190,"sl":44}'] [durée du bowling en s, 30 par défaut]   (réglages : voir REGL dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const DUREE = +(process.argv[3] || 30);
const sim = (x, a, debout, t0) => { const s = J.creerLancer(x, a, debout, t0); let n = 0; while (!s.fini && n++ < 6000) J.pasLancer(s, 1 / 240); return s; };
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Bowling. Un joueur humain tape sur deux curseurs oscillants (position 180 + 100 sin(2,5 t), angle 12 sin(3,6 t), voir bowling
// dans jeux.js) avec une erreur de timing sig (s) et un temps de réaction reac (s). Il vise le centre des flacons restants,
// angle nul, et attend un passage où la seringue sera dégagée, sauf distraction (probabilité ignore). Hypothèses, pas mesures.
function partie(sig, ignore, reac) {
  let total = 0, horloge = alea() * 10, duree = 0;
  for (let f = 0; f < J.SERIES; f++) {
    const debout = J.PLACES.map(() => true); let aTerre = 0;
    for (let l = 0; l < 2 && aTerre < 10; l++) {
      const R2 = J.PLACES.filter((p, i) => debout[i]), cx = R2.reduce((s, p) => s + p.x, 0) / R2.length;
      const u = Math.asin(Math.max(-1, Math.min(1, (cx - 180) / 100))); let tp = 1e9;
      for (let k = 0; k < 4; k++) for (const b of [u / 2.5, (Math.PI - u) / 2.5]) { const v = b + k * 2 * Math.PI / 2.5; if (v >= reac && v < tp) tp = v; }
      tp += gauss() * sig; const x = 180 + Math.sin(tp * 2.5) * 100; horloge += tp; duree += tp;
      const regarde = alea() >= ignore; let ta = 0;
      for (let k = 1; k < 12; k++) {
        ta = k * Math.PI / 3.6; if (ta < reac) continue; if (!regarde) break;
        if (Math.abs(x - J.xSeringue(horloge + ta + (J.DEPART - R.sy) / 540)) > R.sl + 36) break;
      }
      ta += gauss() * sig; horloge += ta; duree += ta;
      if (duree > DUREE) return { total, fini: false };
      const s = sim(x, Math.sin(ta * 3.6) * 12, debout, horloge); horloge = s.ts;
      s.quilles.forEach((q, i) => { if (q.la && q.tombee) debout[i] = false; });
      const n = J.tombees(s); total += n; aTerre += n;
    }
  }
  return { total, fini: true };
}
function profil(nom, sig, ignore, reac) {
  const h = Array(11).fill(0); let m = 0, mm = 0, fin = 0; const K = 2000;
  for (let i = 0; i < K; i++) { const A = partie(sig, ignore, reac), a = J.noteBowling(A.total), b = J.noteBowling(partie(sig, ignore, reac).total); h[a]++; m += a; mm += Math.max(a, b); fin += A.fini; }
  console.log(nom.padEnd(22), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| finit en ' + DUREE + ' s :', (100 * fin / K).toFixed(0) + '%', '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log(JSON.stringify(R));
profil('adroit (35 ms)', 0.035, 0, 0.4); profil('moyen (90 ms)', 0.09, 0.15, 0.6); profil('maladroit (180 ms)', 0.18, 0.4, 0.9);
const jouer = (retard, pause) => { const s = J.creerTir(); let t = 0, vise = 180, prochaine = 0; while (!s.fini) { if (t >= prochaine) { const c = s.germes.slice().sort((a, b) => b.y - a.y)[0]; if (c) vise = c.x; prochaine = t + retard; } s.cible = (Math.floor(t / 5) % 2 && pause) ? s.x : vise; J.pasTir(s, 1 / 60, 45); t += 1 / 60; } return s.touches + '/' + J.TOTAL + ' -> ' + J.noteTir(s); };
console.log('hotte : idéal', jouer(0, false), '| réactif 0,25 s', jouer(0.25, false), '| lent 0,6 s', jouer(0.6, false), '| très lent 1 s', jouer(1, false), '| distrait', jouer(0.5, true), '| immobile', jouer(999, false));
