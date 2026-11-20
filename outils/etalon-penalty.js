// Étalonnage du penalty au préparatoire par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit,
// immobile) tirent des centaines de séries face à l'automate. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-penalty.js ['{"vit":320,"reac":0.18}'] [durée en s] [séries par profil]   (réglages à essayer, voir RP dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RP = J.REGL_PENALTY, PN = J.PN;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RP[k] = v;
const D = +(process.argv[3] || 50), K = +(process.argv[4] || 400);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Un joueur : il réfléchit (pense, en s), attend que l'automate soit assez décalé d'un côté (seuil, en part de son va-et-vient,
// au plus « patience » secondes), vise alors le côté opposé (ecart en px depuis l'axe, force), puis son geste part avec un retard
// (pendant lequel l'automate continue de bouger) et une erreur de direction (bruitA, en degrés) et de force (bruitP).
function serie(p, graine, duree) {
  const s = J.creerPenalty(graine); let debut = 0, plan = null, enVise = false;
  while (!s.fini) {
    if (p.immobile) { J.pasPenalty(s, 1 / 240, duree); continue; }
    if (s.phase !== 'vise') enVise = false;
    else {
      if (!enVise) { enVise = true; debut = s.t; plan = null; }
      const d = s.kx - 180;
      if (!plan && s.t - debut >= p.pense && (Math.abs(d) >= p.seuil * RP.amp || s.t - debut >= p.pense + p.patience)) {
        const cote = p.seuil ? (d > 0 ? -1 : 1) : (alea() < 0.5 ? -1 : 1);
        plan = { quand: s.t + p.retard, a: Math.atan2(cote * p.ecart, PN.Y0 - PN.SOL) + gauss() * p.bruitA * Math.PI / 180, f: p.force + gauss() * p.bruitP };
      }
      if (plan && s.t >= plan.quand) { J.tirerPenalty(s, plan.a, plan.f); plan = null; }
    }
    J.pasPenalty(s, 1 / 240, duree);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0), iss = {}; let m = 0, mm = 0, br = 0, brm = 0, max = 0, tirs = 0, luc = 0;
  for (let i = 0; i < K; i++) {
    const a = serie(p, 1000 + i * 2, D), b = serie(p, 1001 + i * 2, D), na = J.notePenalty(a), nb = J.notePenalty(b);
    h[na]++; m += na; mm += Math.max(na, nb); br += a.brut; brm += Math.max(a.brut, b.brut); max = Math.max(max, a.brut, b.brut); tirs += a.issues.length; luc += a.lucarnes;
    for (const x of a.issues) iss[x] = (iss[x] || 0) + 1;
    if (a.brut > RP.tirs * (RP.but + RP.prime) || !Number.isInteger(a.brut) || a.brut < 0) { console.log('BRUT HORS PLAFOND', a.brut); process.exit(1); }
  }
  console.log(nom.padEnd(10), 'une série :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| brut', (br / K).toFixed(0), '| meilleur brut de deux', (brm / K).toFixed(0), '| brut max', max, '| tirs joués', (tirs / K).toFixed(1), '| lucarnes', (luc / K).toFixed(1),
    '| issues %', Object.entries(iss).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + Math.round(100 * v / Math.max(1, tirs))).join(', '), '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('penalty, ' + D + ' s :', JSON.stringify(RP), '| plafond du brut :', RP.tirs * (RP.but + RP.prime));
profil('adroit', { pense: 1.0, seuil: 0.75, patience: 2.5, retard: 0.14, ecart: 92, force: 0.68, bruitA: 1.6, bruitP: 0.045 });
profil('moyen', { pense: 1.6, seuil: 0.45, patience: 2.5, retard: 0.24, ecart: 84, force: 0.6, bruitA: 3.5, bruitP: 0.09 });
profil('maladroit', { pense: 2.4, seuil: 0, patience: 0, retard: 0.4, ecart: 72, force: 0.52, bruitA: 7, bruitP: 0.17 });
profil('immobile', { immobile: true });
