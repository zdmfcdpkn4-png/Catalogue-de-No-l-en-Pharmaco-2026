// Étalonnage de « Droit au septum » (le lancer de seringue) par simulation, sans navigateur : des joueurs simulés (adroit, moyen,
// maladroit, immobile) jouent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-seringue.js ['{"vol":0.45,"cran":40}'] [durée en s] [parties par profil]   (réglages à essayer, voir RSG dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL_SERINGUE;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const D = +(process.argv[3] || 50), K = +(process.argv[4] || 400);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Un joueur : une fois la seringue prête, il met « reflexion » secondes à viser, puis lance. Le point parfait se décompose en trois :
// le flacon tel qu'il le voit, l'avance à lui donner (il bouge pendant le vol) et la correction du flux. Le joueur estime l'avance
// avec une erreur relative (avance), la correction du flux avec une erreur relative (flux) qui se réduit à la deuxième puis à la
// troisième seringue d'un même flacon (il a vu où la précédente est arrivée), et sa main ajoute une erreur de pointage (main, en px).
// patient : il préfère lancer quand le flacon ralentit (en bout de course), quitte à attendre un peu.
const APPRIS = [1, 0.55, 0.35];
function partie(p, duree, decalage) {
  const s = J.creerSeringue(); let pretA = null, avant = null;
  for (let i = 0; i < decalage; i++) J.pasSeringue(s, 1 / 240, duree);   // les joueurs ne lancent pas tous au même instant du va-et-vient
  while (!s.fini) {
    if (!p.immobile && pretA === null && !s.vol && s.attente <= 0 && s.releve <= 0 && s.t < duree && s.lances < J.totalSeringue()) pretA = s.t + p.reflexion * (0.8 + 0.4 * alea());
    if (pretA !== null && s.t >= pretA) {
      const v = J.viserSeringue(s), vit = avant ? Math.hypot(s.cx - avant[0], s.cy - avant[1]) * 240 : 0;
      if (v && (!p.patient || vit < p.patient || s.t > pretA + 1.5)) {
        const k = s.lances % R.par, derive = s.vent * R.cran * R.vol;                 // la dérive attendue, à flux constant
        const ax = v.x + derive - s.cx, ay = v.y - s.cy;                               // l'avance pure (sans le flux)
        const x = s.cx + ax * (1 + gauss() * p.avance) - derive * (1 + gauss() * p.flux * APPRIS[k]) + gauss() * p.main;
        const y = s.cy + ay * (1 + gauss() * p.avance) + gauss() * p.main;
        J.lancerSeringue(s, x, y, duree); pretA = null;
      }
    }
    avant = [s.cx, s.cy];
    J.pasSeringue(s, 1 / 240, duree);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, pts = 0, bpts = 0, sep = 0, cen = 0, lan = 0, max = 0, long = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, D, i * 37 % 900), b = partie(p, D, (i * 37 + 411) % 900), na = J.noteSeringue(a), nb = J.noteSeringue(b);
    h[na]++; m += na; mm += Math.max(na, nb); pts += a.points; bpts += Math.max(a.points, b.points); sep += a.septums; cen += a.centres; lan += a.lances;
    max = Math.max(max, a.points, b.points); long = Math.max(long, a.t, b.t);
  }
  console.log(nom.padEnd(10), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', (pts / K).toFixed(0), '(meilleure de deux ' + (bpts / K).toFixed(0) + ', max ' + max + ')', '| septums', (sep / K).toFixed(1), 'dont centres', (cen / K).toFixed(1), '| lancers', (lan / K).toFixed(1), '| durée max', long.toFixed(1), '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('seringue, ' + D + ' s :', JSON.stringify(R));
profil('adroit', { reflexion: 1.6, avance: 0.15, flux: 0.25, main: 4, patient: 40 });
profil('moyen', { reflexion: 2.2, avance: 0.35, flux: 0.5, main: 7.5 });
profil('maladroit', { reflexion: 3.4, avance: 0.7, flux: 0.9, main: 13 });
profil('immobile', { immobile: true });
// Celui qui lance sans viser (Espace, mire laissée à sa place de départ) : il ne doit rien marquer.
(() => { const s = J.creerSeringue(); while (!s.fini) { J.lancerSeringue(s, 180, 310, D); J.pasSeringue(s, 1 / 240, D); } console.log('sans viser'.padEnd(10), 'points', s.points, '| lancers', s.lances, '| note', J.noteSeringue(s)); })();
// Celui qui vise le flacon là où il le voit, sans avance ni correction du flux.
(() => { const s = J.creerSeringue(); while (!s.fini) { J.lancerSeringue(s, s.cx, s.cy, D); J.pasSeringue(s, 1 / 240, D); } console.log('naïf'.padEnd(10), 'points', s.points, '| septums', s.septums, '| note', J.noteSeringue(s)); })();
// Le plafond du score brut : un automate sans défaut.
(() => { const s = J.creerSeringue(); while (!s.fini) { const v = J.viserSeringue(s); if (v) J.lancerSeringue(s, v.x, v.y, D); J.pasSeringue(s, 1 / 240, D); } console.log('automate'.padEnd(10), 'points', s.points, '| centres', s.centres, '| durée', s.t.toFixed(1), '| note', J.noteSeringue(s)); })();
