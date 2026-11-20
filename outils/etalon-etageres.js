// Étalonnage des étagères de la réserve par simulation, sans navigateur : contrôle du plan (escabeaux et vides cohérents),
// puis des joueurs simulés (adroit, moyen, maladroit, immobile) jouent des centaines de parties.
// Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-etageres.js ['{"palier":46,"cadence":2.3}'] [durée en s] [parties par profil]
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RE = J.REGL_ETAGERES;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RE[k] = v;
const DUREE = +(process.argv[3] || 60), K = +(process.argv[4] || 300);
const NIV = J.E_NIV, ESC = J.E_ESC, VIDES = J.E_VIDES;

// Le plan : chaque escabeau a le pied et la tête sur du plein, aucun vide n'est au-dessus d'un autre vide,
// le lot et la sortie des bobines sont sur du plein, et un saut en marchant franchit le plus large des vides.
(() => {
  let faux = 0;
  const plein = (n, x) => !J.eVide(n, x, -10);
  ESC.forEach((l, n) => l.forEach(x => { if (!plein(n, x) || !plein(n + 1, x)) { faux++; console.log('escabeau mal posé', n, x); } }));
  VIDES.forEach((l, n) => l.forEach(v => { if (n && !plein(n - 1, (v[0] + v[1]) / 2)) { faux++; console.log('vide au-dessus d’un vide', n, v); } }));
  if (!plein(4, J.E_LOT)) faux++;
  const portee = 2 * RE.saut / RE.pesanteur * RE.marche, large = Math.max(...VIDES.flat().map(v => v[1] - v[0]));
  const haut = RE.saut * RE.saut / 2 / RE.pesanteur;
  console.log('plan : ' + ESC.flat().length + ' escabeaux, ' + VIDES.flat().length + ' vides (le plus large ' + large + '), saut de ' + portee.toFixed(0) + ' de long et ' + haut.toFixed(0) + ' de haut, écart entre rayons ' + (NIV[0] - NIV[1]));
  if (faux || portee < large + 10 || haut < 2 * J.E_RB + 6 || haut > NIV[0] - NIV[1] - 34) { console.log('PLAN INCORRECT'); process.exit(1); }
})();

// Un joueur simulé. Tous les « reaction » secondes environ, il refait le point : il marche vers l'escabeau le plus proche
// (ou vers le lot, en haut), saute les vides et les bobines qu'il voit venir à moins de « vue », attend sur l'escabeau
// qu'une bobine soit passée. Avec une probabilité « erreur », il ne voit pas le danger ; avec « pause », il hésite.
// Un profil nul ne touche à rien.
function decider(s, p, alea) {
  const j = s.j, c = s.cmd;
  if (alea() < p.pause) { c.gx = 0; c.gy = 0; return; }
  const voit = alea() >= p.erreur;
  if (j.etat === 'esc') {
    // Dans la zone abritée de l'escabeau, on attend que le rayon du dessus soit dégagé.
    const hautY = NIV[j.bas + 1], abrite = j.y > hautY + 24 && j.y < hautY + 44;
    const menace = voit && s.bobines.some(b => !b.chute && b.niv === j.bas + 1 && Math.abs(b.x - j.x) < p.vue && (b.x - j.x) * b.d < 0);
    c.gx = 0; c.gy = abrite && menace ? 0 : -1;
    return;
  }
  if (j.etat === 'air') return;                                            // en l'air, il garde son élan
  const but = j.niv === 4 ? J.E_LOT : ESC[j.niv].reduce((m, x) => Math.abs(x - j.x) < Math.abs(m - j.x) ? x : m);
  const ecart = but - j.x, sens = Math.sign(ecart);
  c.gx = Math.abs(ecart) < 4 ? 0 : sens; c.gy = j.niv < 4 && Math.abs(ecart) < 12 ? -1 : 0;
  if (!voit) return;
  for (const b of s.bobines) {
    const d = Math.abs(b.x - j.x);
    if (b.chute) { if (b.niv - 1 === j.niv && (b.x - j.x) * sens > 0 && d < 30) { c.gx = 0; c.gy = 0; } continue; }   // elle va tomber juste devant : on la laisse atterrir
    if (b.niv !== j.niv || (b.x - j.x) * b.d >= 0) continue;               // pas sur ce rayon, ou elle s'éloigne
    const rel = b.v + (Math.sign(b.x - j.x) === c.gx ? RE.marche : c.gx ? -RE.marche : 0);
    if (rel > 60 && d > 16 && d < Math.min(p.vue, rel * 0.36 + 10)) { s.saute = 0.12; return; }
    if (rel <= 60 && d < 40) { c.gx = -c.gx; return; }                     // elle le rattrape par-derrière : il lui fait face
  }
  if (c.gx) for (const v of VIDES[j.niv]) {
    const bord = c.gx > 0 ? v[0] + 4 - j.x : j.x - (v[1] - 4);
    if (bord >= 0 && bord < 6 + p.reaction * RE.marche && (but - (v[0] + v[1]) / 2) * c.gx > 0) s.saute = 0.12;
  }
}
function partie(p, graine) {
  const s = J.creerEtageres(graine); let g = graine * 7 + 3, prochain = 0;
  const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
  while (!s.fini) {
    if (p && s.t >= prochain) { prochain = s.t + p.reaction * (0.6 + 0.8 * alea()); decider(s, p, alea); }
    J.pasEtageres(s, 1 / 60, DUREE);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, pts = 0, lots = 0, chocs = 0, max = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, 1000 + i * 2), b = partie(p, 1001 + i * 2), na = J.noteEtageres(a), nb = J.noteEtageres(b);
    h[na]++; m += na; mm += Math.max(na, nb); pts += a.points; lots += a.lots; chocs += a.chocs; max = Math.max(max, a.points, b.points);
  }
  console.log(nom.padEnd(12), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', Math.round(pts / K), '(max ' + max + ')', '| lots', (lots / K).toFixed(1), '| bobines reçues', (chocs / K).toFixed(1), '| 10 :', Math.round(100 * h[10] / K) + '%', '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('étagères, ' + DUREE + ' s, ' + K + ' parties :', JSON.stringify(RE));
profil('adroit', { reaction: 0.08, erreur: 0.03, pause: 0.02, vue: 90 });
profil('moyen', { reaction: 0.22, erreur: 0.15, pause: 0.12, vue: 70 });   // à mi-chemin des deux autres
profil('maladroit', { reaction: 0.36, erreur: 0.3, pause: 0.25, vue: 50 });
profil('immobile', null);
