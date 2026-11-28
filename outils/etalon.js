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
  let total = 0, horloge = alea() * 10, duree = 0; const feuille = [];
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
      if (duree > DUREE) return { total, feuille, fini: false };
      const s = sim(x, Math.sin(ta * 3.6) * 12, debout, horloge); horloge = s.ts;
      s.quilles.forEach((q, i) => { if (q.la && q.tombee) debout[i] = false; });
      const n = J.tombees(s); total += n; aTerre += n; (feuille[f] = feuille[f] || []).push(n);
    }
  }
  return { total, feuille, fini: true };
}
function profil(nom, sig, ignore, reac) {
  const h = Array(11).fill(0), bruts = []; let m = 0, mm = 0, fin = 0, x = 0, sp = 0; const K = 2000;
  const brut = A => J.brutBowling ? J.brutBowling(A.feuille) : A.total;
  for (let i = 0; i < K; i++) {
    const A = partie(sig, ignore, reac), B = partie(sig, ignore, reac), a = J.noteBowling(brut(A)), b = J.noteBowling(brut(B));
    h[a]++; m += a; mm += Math.max(a, b); fin += A.fini; bruts.push(Math.max(brut(A), brut(B)));
    x += A.feuille.filter(f => f[0] === 10).length; sp += A.feuille.filter(f => f.length === 2 && f[0] + f[1] === 10).length;
  }
  bruts.sort((a, b) => a - b);
  console.log(nom.padEnd(20), 'note :', (m / K).toFixed(1), '| meilleure de 2 :', (mm / K).toFixed(1), '| finit :', (100 * fin / K).toFixed(0) + '%', '| strikes/partie :', (x / K).toFixed(2), '| spares/partie :', (sp / K).toFixed(2),
    '| brut (meilleure de 2) médiane', bruts[K >> 1], 'de', bruts[Math.floor(K * 0.1)], 'à', bruts[Math.floor(K * 0.9)], '| notes', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log(JSON.stringify(R));
profil('adroit (35 ms)', 0.035, 0, 0.4); profil('moyen (90 ms)', 0.09, 0.15, 0.6); profil('maladroit (180 ms)', 0.18, 0.4, 0.9);
const jouer = (retard, pause) => { const s = J.creerTir(); let t = 0, vise = 180, prochaine = 0; while (!s.fini) { if (t >= prochaine) { const c = s.germes.slice().sort((a, b) => b.y - a.y)[0]; if (c) vise = c.x; prochaine = t + retard; } s.cible = (Math.floor(t / 5) % 2 && pause) ? s.x : vise; J.pasTir(s, 1 / 60, 45); t += 1 / 60; } return s.touches + '/' + J.TOTAL + ' -> ' + J.noteTir(s); };
console.log('hotte : idéal', jouer(0, false), '| réactif 0,25 s', jouer(0.25, false), '| lent 0,6 s', jouer(0.6, false), '| très lent 1 s', jouer(1, false), '| distrait', jouer(0.5, true), '| immobile', jouer(999, false));

// Le flipper : un joueur simulé lève le batteur quand la bille arrive dessus, avec une erreur de rythme (bruit, en s)
// et des oublis. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
const RF = J.REGL_FLIPPER;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) if (k in RF) RF[k] = v;
function partieFlipper(p, graine, duree) {
  const s = J.creerFlipper(graine), plan = [null, null], tenu = [0, 0], libre = [0, 0];
  while (!s.fini) {
    const b = s.bille;
    for (let i = 0; i < 2; i++) {
      if (p.rythme) { tenu[i] = (s.t + i * p.rythme / 2) % p.rythme < 0.15 ? s.t + 0.01 : 0; continue; }   // tape au hasard, en cadence
      if (b && plan[i] === null && s.t >= libre[i]) {
        const pv = J.F_PIVOTS[i], bout = J.boutBatteur(i, RF.repos), dx = bout[0] - pv.x, dy = bout[1] - pv.y;
        const u = ((b.x - pv.x) * dx + (b.y - pv.y) * dy) / (dx * dx + dy * dy), d = Math.hypot(b.x - pv.x - dx * u, b.y - pv.y - dy * u);
        if (u > p.zone && u < 1.05 && b.y < pv.y + dy * u && d < 16 + Math.max(0, b.vy) * 0.03) {
          if (alea() < p.oubli) libre[i] = s.t + 0.5; else plan[i] = s.t + Math.max(0, p.retard + gauss() * p.bruit);
        }
      }
      if (plan[i] !== null && s.t >= plan[i]) { tenu[i] = s.t + 0.18; plan[i] = null; libre[i] = s.t + 0.35; }
    }
    s.g = s.t < tenu[0]; s.d = s.t < tenu[1];
    J.pasFlipper(s, 1 / 240, duree);
  }
  return s;
}
function profilFlipper(nom, p, duree) {
  const h = Array(11).fill(0); let m = 0, mm = 0, sc = 0, pe = 0, lo = 0, co = 0; const K = +(process.env.K || 400);
  for (let i = 0; i < K; i++) {
    const a = partieFlipper(p, 1000 + i * 2, duree), b = partieFlipper(p, 1001 + i * 2, duree), na = J.noteFlipper(a), nb = J.noteFlipper(b);
    h[na]++; m += na; mm += Math.max(na, nb); sc += a.score; pe += a.pertes; lo += a.lots; co += a.coups;
  }
  console.log(nom.padEnd(22), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| score', Math.round(sc / K), '| billes perdues', (pe / K).toFixed(1), '| lots', (lo / K).toFixed(2), '| déblocages', (co / K).toFixed(2), '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
const DF = +(process.argv[3] || 60);
console.log('flipper, ' + DF + ' s :', JSON.stringify(RF));
profilFlipper('adroit', { zone: 0.35, retard: 0.03, bruit: 0.02, oubli: 0.02 }, DF);
profilFlipper('moyen', { zone: 0.35, retard: 0.04, bruit: 0.05, oubli: 0.08 }, DF);
profilFlipper('maladroit', { zone: 0.35, retard: 0.06, bruit: 0.1, oubli: 0.25 }, DF);
profilFlipper('tape en cadence', { rythme: 0.5 }, DF);
profilFlipper('immobile', { zone: 0, retard: 0, bruit: 0, oubli: 1 }, DF);
