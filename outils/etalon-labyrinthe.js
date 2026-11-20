// Étalonnage du labyrinthe de la ZAC par simulation, sans navigateur : contrôle du plan (tout relié, aucune impasse),
// puis des joueurs simulés (adroit, moyen, maladroit, immobile) jouent des centaines de parties.
// Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-labyrinthe.js ['{"allure":5,"germe":3.8}'] [durée en s] [parties par profil]
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RL = J.REGL_LABY;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RL[k] = v;
const DUREE = +(process.argv[3] || 60), K = +(process.argv[4] || 300);
const NC = J.L_PLAN[0].length, NR = J.L_PLAN.length, D = J.L_DIRS;

// Le plan : toutes les cases de couloir reliées entre elles, et au moins deux sorties par case.
(() => {
  const d = J.lDistances(J.L_DEPART[0], J.L_DEPART[1]); let cases = 0, etiq = 0, isolees = 0, impasses = 0;
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) if (J.lOuvert(c, r)) {
    cases++; if (J.L_PLAN[r][c] === '.') etiq++;
    if (d[c + r * NC] === 999) isolees++;
    if (D.filter(v => J.lOuvert(c + v[0], r + v[1])).length < 2) impasses++;
  }
  const loin = J.L_GERMES.map(g => d[g.c + g.r * NC]);
  console.log('plan : ' + cases + ' cases de couloir, ' + etiq + ' étiquettes par lot, cases isolées ' + isolees + ', impasses ' + impasses + ', distance des germes au départ ' + loin.join(' / '));
  if (isolees || impasses || J.L_PLAN.some(l => l.length !== NC)) { console.log('PLAN INCORRECT'); process.exit(1); }
})();

// Un joueur simulé. Tous les « reaction » secondes environ, il choisit sa direction : vers l'étiquette la plus proche,
// en contournant les cases à moins de « vue » cases d'un germe ; sans issue sûre, il fuit. Avec une probabilité
// « erreur », il part au hasard. Un profil nul ne touche à rien.
function decider(s, p, alea) {
  const j = s.j, enRoute = j.d >= 0 && j.p > 0;
  const c0 = enRoute ? j.c + D[j.d][0] : j.c, r0 = enRoute ? j.r + D[j.d][1] : j.r;
  const ouv = [0, 1, 2, 3].filter(d => J.lOuvert(c0 + D[d][0], r0 + D[d][1]));
  if (alea() < p.erreur) return ouv[Math.floor(alea() * ouv.length)];
  const danger = new Int16Array(NC * NR).fill(999);
  if (s.fige < 0.6) for (const g of s.germes) if (g.attente <= 0.5) { const dg = J.lDistances(g.c, g.r); for (let i = 0; i < dg.length; i++) if (dg[i] < danger[i]) danger[i] = dg[i]; }
  const k0 = c0 + r0 * NC;
  if (enRoute && danger[k0] <= Math.min(p.vue, 2) && danger[j.c + j.r * NC] > danger[k0]) return (j.d + 2) % 4;   // un germe droit devant : demi-tour
  // parcours en largeur depuis la prochaine case, en évitant les cases dangereuses
  const vu = new Int16Array(NC * NR).fill(-1), f = [];
  for (const d of ouv) { const k = k0 + D[d][0] + D[d][1] * NC; if (danger[k] > p.vue) { vu[k] = d; f.push(k); } }
  vu[k0] = 9;
  for (let i = 0; i < f.length; i++) {
    const k = f[i];
    if (s.objets[k] === 1 || (s.objets[k] === 2 && danger[k0] < 8)) return vu[k];
    const x = k % NC, y = (k - x) / NC;
    for (const v of D) { const n = k + v[0] + v[1] * NC; if (vu[n] < 0 && J.lOuvert(x + v[0], y + v[1]) && danger[n] > p.vue) { vu[n] = vu[k]; f.push(n); } }
  }
  let m = -1, dir = ouv[0];
  for (const d of ouv) { const v = danger[k0 + D[d][0] + D[d][1] * NC]; if (v > m) { m = v; dir = d; } }
  return dir;
}
function partie(p, graine) {
  const s = J.creerLaby(graine); let g = graine * 7 + 3, prochain = 0;
  const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
  while (!s.fini) {
    if (p && s.t >= prochain) { prochain = s.t + p.reaction * (0.6 + 0.8 * alea()); s.j.veut = decider(s, p, alea); }
    J.pasLaby(s, 1 / 60, DUREE);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, et = 0, pr = 0, lo = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, 1000 + i * 2), b = partie(p, 1001 + i * 2), na = J.noteLaby(a), nb = J.noteLaby(b);
    h[na]++; m += na; mm += Math.max(na, nb); et += a.etiq; pr += a.prises; lo += a.lots;
  }
  console.log(nom.padEnd(12), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| étiquettes', Math.round(et / K), '| contaminations', (pr / K).toFixed(1), '| lots finis', (lo / K).toFixed(2), '| 10 :', Math.round(100 * h[10] / K) + '%', '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('labyrinthe, ' + DUREE + ' s, ' + K + ' parties :', JSON.stringify(RL));
profil('adroit', { reaction: 0.12, erreur: 0.02, vue: 3 });
profil('moyen', { reaction: 0.36, erreur: 0.14, vue: 2 });   // à mi-chemin des deux autres
profil('maladroit', { reaction: 0.6, erreur: 0.25, vue: 1 });
profil('immobile', null);
