// Étalonnage de la tour de garde par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit,
// au hasard, immobile) jouent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-tour.js ['{"marge":0.7,"tol":24}'] [durée en s] [parties par profil]   (réglages à essayer, voir RTR dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL_TOUR;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const D = +(process.argv[3] || 50), K = +(process.argv[4] || 400);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Un joueur : une fois la boîte arrivée, il lui faut « reflexion » secondes pour la suivre des yeux, puis il lâche quand il
// la croit au-dessus de son point de visée. Son geste part avec une erreur de temps (tempo, en s) et son œil se trompe
// de quelques pixels (oeil). « redresse » : part du faux aplomb qu'il rattrape en visant vers l'axe du pied de la tour.
// « hesite » : chance de laisser passer une occasion. « hasard » : il tape sans regarder, à intervalles irréguliers.
function partie(p, duree, decalage) {
  const s = J.creerTour(); let pretA = null, vise = null, avant = 0, prochain = 0.6 + alea();
  s.phase += decalage;                              // les joueurs ne démarrent pas tous au même instant du va-et-vient
  let maxPile = 0, incoherent = 0;
  while (!s.fini) {
    const pret = !s.tombe && !s.bascule && s.attente <= 0 && s.t < duree;
    if (p.hasard) { if (s.t >= prochain) { J.lacherTour(s, duree); prochain = s.t + 0.5 + alea() * 1.3; } }
    else if (!p.immobile && pret) {
      if (pretA === null) { pretA = s.t + p.reflexion * (0.8 + 0.4 * alea()); vise = null; }
      if (s.t >= pretA) {
        if (!vise) {
          const xs = J.centresTour(s), n = xs.length;
          vise = { tempo: gauss() * p.tempo, oeil: gauss() * p.oeil, redresse: n > 1 ? (xs[0] - xs[n - 1]) * p.redresse : 0 };
          avant = 0;
        }
        const f = J.pinceTour(s, vise.tempo) - (J.cibleTour(s, J.chuteTour()) + vise.oeil + vise.redresse);
        if (avant && f * avant <= 0) { if (alea() < (p.hesite || 0)) vise = null; else { J.lacherTour(s, duree); pretA = null; } }
        avant = f;
      }
    }
    J.pasTour(s, 1 / 240, duree);
    maxPile = Math.max(maxPile, s.pile.length);
    if (!s.bascule && J.equilibreTour(s).cede >= 0) incoherent++;     // contrôle : hors bascule, la tour qui reste doit tenir
  }
  s.maxPile = maxPile; s.incoherent = incoherent;
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, pts = 0, deb = 0, pos = 0, parf = 0, eff = 0, rat = 0, max = 0, haut = 0, long = 0, inc = 0, neg = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, D, i * 0.37), b = partie(p, D, i * 0.37 + 1.11), na = J.noteTour(a), nb = J.noteTour(b);
    h[na]++; m += na; mm += Math.max(na, nb); pts += a.points; deb += a.pile.length; pos += a.poses; parf += a.parfaites; eff += a.effondrements; rat += a.rates;
    max = Math.max(max, a.points, b.points); haut = Math.max(haut, a.maxPile, b.maxPile); long = Math.max(long, a.t, b.t); inc += a.incoherent + b.incoherent;
    for (const x of [a, b]) if (!Number.isInteger(x.points) || x.points < 0) neg++;
  }
  console.log(nom.padEnd(10), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', (pts / K).toFixed(0), '(max ' + max + ')', '| debout', (deb / K).toFixed(1), 'sur', (pos / K).toFixed(1), 'posées, parfaites', (parf / K).toFixed(1), '| effondrements', (eff / K).toFixed(1), '| à côté', (rat / K).toFixed(1), '| pile max', haut, '| durée max', long.toFixed(2), '| incohérences', inc, '| bruts invalides', neg, '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('tour, ' + D + ' s :', JSON.stringify(R));
profil('adroit', { reflexion: 0.25, tempo: 0.03, oeil: 3, redresse: 0.35 });
profil('moyen', { reflexion: 0.4, tempo: 0.055, oeil: 6, redresse: 0.15, hesite: 0.1 });
profil('maladroit', { reflexion: 0.6, tempo: 0.09, oeil: 10, redresse: 0, hesite: 0.25 });
profil('au hasard', { hasard: true });
profil('immobile', { immobile: true });
// Le plafond du score brut : un automate sans défaut ni temps de réflexion.
profil('automate', { reflexion: 0, tempo: 0, oeil: 0, redresse: 0 });
