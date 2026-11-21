// Étalonnage du basket du pilulier par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit,
// immobile) jouent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-basket.js ['{"demi":34,"palier":5}'] [durée en s] [parties par profil]   (réglages à essayer, voir RBK dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL_BASKET;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const D = +(process.argv[3] || 50), K = +(process.argv[4] || 400);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Le lancer sans défaut marquerait-il ? Rejoué sur une copie de la partie (le cœur n'a pas de hasard).
function marquerait(s, vx, vy, duree) {
  const c = JSON.parse(JSON.stringify(s)); c.acc = 0;
  if (!J.lancerBasket(c, vx, vy, 1e9)) return false;
  const b = c.balles[c.balles.length - 1]; while (c.balles.includes(b)) J.pasBasket(c, 1 / 240, 1e9);
  return b.ok;
}
// Un joueur : dès qu'un comprimé est disponible (trois en vol au plus), il met « reflexion » secondes à viser, puis lâche. Il choisit une force (vy) autour
// de sa préférée, estime l'avance à donner au pilulier avec une erreur relative (avance), et son geste ajoute une erreur
// d'angle (degrés) et de force (relative). patient : il attend un moment où le lancer parfait passerait (pilulier pas au-dessus).
function partie(p, duree, decalage) {
  const s = J.creerBasket(); let pretA = null, maxPas = 0, traverse = 0, enVol = 0;
  s.px = 62 + decalage % 236;                    // les joueurs ne démarrent pas tous au même instant du va-et-vient
  while (!s.fini) {
    if (!p.immobile && s.balles.length < R.vol && s.attente <= 0 && s.t < duree && s.lances < J.lotBasket(duree)) {
      if (pretA === null) pretA = s.t + p.reflexion * (0.8 + 0.4 * alea());
      if (s.t >= pretA) {
        const vy = -(p.force + gauss() * 25), v = J.viseBasket(s, vy);
        if (v && (!p.patient || marquerait(s, v.vx, vy) || s.t > pretA + 1)) {
          const x = s.px + (v.x - s.px) * (1 + gauss() * p.avance), vx = (x - R.x0) / v.T;
          const a = Math.atan2(vx, -vy) + gauss() * p.angle * Math.PI / 180, f = Math.hypot(vx, vy) * (1 + gauss() * p.dose);
          J.lancerBasket(s, Math.sin(a) * f, -Math.cos(a) * f, duree); pretA = null;
        }
      }
    }
    const avant = s.balles.map(b => [b, b.x, b.y]); enVol = Math.max(enVol, avant.length);
    J.pasBasket(s, 1 / 240, duree);
    // Contrôles de la physique : pas de saut plus grand que l'épaisseur d'une paroi, pas de comprimé entré par le fond.
    for (const [b, x, y] of avant) if (s.balles.includes(b)) { maxPas = Math.max(maxPas, Math.hypot(b.x - x, b.y - y)); if (b.vy < 0 && Math.abs(b.x - s.px) < J.demiBasket(s) && b.y < s.top + R.haut - 2 && y > s.top + R.haut + 2) traverse++; }
  }
  s.maxPas = maxPas; s.traverse = traverse; s.enVol = enVol;
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, pts = 0, pan = 0, lan = 0, dir = 0, max = 0, pas = 0, trav = 0, long = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, D, i * 37), b = partie(p, D, i * 37 + 111), na = J.noteBasket(a), nb = J.noteBasket(b);
    h[na]++; m += na; mm += Math.max(na, nb); pts += a.points; pan += a.paniers; lan += a.lances; dir += a.directs;
    max = Math.max(max, a.points, b.points); pas = Math.max(pas, a.maxPas, b.maxPas); trav += a.traverse + b.traverse; long = Math.max(long, a.t, b.t);
  }
  console.log(nom.padEnd(10), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', (pts / K).toFixed(1), '(max ' + max + ')', '| paniers', (pan / K).toFixed(1), 'dont directs', (dir / K).toFixed(1), '| lancers', (lan / K).toFixed(1), '| 10 :', (100 * h[10] / K).toFixed(0) + '%', '| durée max', long.toFixed(1), '| plus grand pas', pas.toFixed(1), '| traversées', trav, '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('basket, ' + D + ' s :', JSON.stringify(R));
profil('adroit', { reflexion: 0.9, force: 780, avance: 0.1, angle: 0.9, dose: 0.012, patient: true });
profil('moyen', { reflexion: 1.3, force: 780, avance: 0.22, angle: 1.8, dose: 0.025, patient: false });
profil('maladroit', { reflexion: 1.8, force: 780, avance: 0.4, angle: 3.2, dose: 0.045, patient: false });
profil('immobile', { immobile: true });
// Le mitrailleur : il lance aussi vite que le jeu le permet, en visant à peine. Il ne doit pas battre un joueur appliqué.
profil('mitrailleur', { reflexion: 0.05, force: 780, avance: 0.5, angle: 5, dose: 0.06, patient: false });
// Le plafond du score brut : un automate sans défaut ni temps de réflexion, qui tire dès que le lancer parfait passe.
profil('automate', { reflexion: 0, force: 700, avance: 0, angle: 0, dose: 0, patient: true });
