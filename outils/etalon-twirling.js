// Étalonnage de la parade des seringues par simulation, sans navigateur : des joueurs simulés (adroit, moyen, maladroit,
// immobile, tapoteurs) jouent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-twirling.js ['{"juste":0.18}'] [durée en s] [parties par profil]   (réglages à essayer, voir RTW dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, R = J.REGL_TWIRLING;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) R[k] = v;
const D = +(process.argv[3] || 50), K = +(process.argv[4] || 400);
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// Un joueur : pour chaque spatule qui s'envole, il prévoit son geste à l'instant d'arrivée, avec un biais et une dispersion
// (sd, en secondes). Il se trompe parfois de main (main), puis se reprend une fois sur deux ; il lui arrive de ne pas réagir
// (oubli). Dispersion et erreurs augmentent avec chaque spatule en plus (charge : facteur à deux spatules, doublé à trois).
// periode : un tapoteur, qui frappe les deux mains en alternance à intervalle fixe sans regarder.
function partie(p) {
  const s = J.creerTwirling(D), gestes = [], vus = new Map();
  let tTap = 0.2, mTap = 0;
  while (!s.fini) {
    const nb = s.batons.filter(b => b.liste.length && !b.absent && s.t > b.entree).length, c = 1 + ((p.charge || 1) - 1) * (nb - 1);
    if (p.sd !== undefined) for (const b of s.batons) {
      if (b.etat !== 'vol' || vus.get(b) === b.t1) continue;
      vus.set(b, b.t1);
      if (alea() < p.oubli * c) continue;
      const t = b.t1 + p.biais + gauss() * p.sd * c;
      if (alea() < p.main * c) { gestes.push({ t, m: 1 - b.m1 }); if (alea() < 0.5) gestes.push({ t: t + 0.3, m: b.m1 }); }
      else gestes.push({ t, m: b.m1 });
    }
    if (p.periode) while (tTap <= s.t + 1) { gestes.push({ t: tTap, m: mTap }); mTap = 1 - mTap; tTap += p.periode; }
    gestes.sort((a, b) => a.t - b.t);
    const fin = s.t + s.acc + 1 / 120;
    while (gestes.length && gestes[0].t <= fin) { const x = gestes.shift(); J.frapperTwirling(s, x.m, Math.max(0, x.t - s.t - s.acc)); }
    J.pasTwirling(s, 1 / 120);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let trois = 0, m = 0, mm = 0, pts = 0, pris = 0, parf = 0, tomb = 0, vides = 0, serie = 0, max = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p), b = partie(p), na = J.noteTwirling(a), nb = J.noteTwirling(b);
    h[na]++; trois += a.trois ? 1 : 0; m += na; mm += Math.max(na, nb); pts += a.points; pris += a.pris; parf += a.q[3]; tomb += a.tombees; vides += a.vides; serie += a.meilleure;
    max = Math.max(max, a.points, b.points);
    if (J.brutTwirling(a) !== a.points || !Number.isInteger(a.points) || a.points < 0) throw new Error('score brut hors plafond');
  }
  console.log(nom.padEnd(11), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| points', (pts / K).toFixed(0), '(max ' + max + ')', '| 3e spatule', Math.round(100 * trois / K) + '%', '| rattrapages', (pris / K).toFixed(1), 'dont parfaits', (parf / K).toFixed(1), '| chutes', (tomb / K).toFixed(1), '| gestes à vide', (vides / K).toFixed(1), '| meilleure série', (serie / K).toFixed(1), '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
const s0 = J.creerTwirling(D);
console.log('twirling, ' + D + ' s : ' + s0.choree.length + ' retombées (' + s0.batons.map(b => b.liste.length).join(' + ') + ' par spatule), maximum ' + s0.max + ' points, paliers ' + R.seuils.map((_, i) => J.palierTwirling(s0, i)).join(' '));
console.log(JSON.stringify(R));
profil('adroit', { sd: 0.042, biais: 0, main: 0.01, oubli: 0.004, charge: 1.2 });
profil('moyen', { sd: 0.075, biais: 0.015, main: 0.04, oubli: 0.02, charge: 1.35 });
profil('maladroit', { sd: 0.12, biais: 0.03, main: 0.1, oubli: 0.06, charge: 1.5 });
profil('immobile', {});
// Les tapoteurs : frapper sans regarder, vite ou lentement, ne doit pas payer.
profil('tapote 0,1', { periode: 0.1 });
profil('tapote 0,25', { periode: 0.25 });
profil('tapote 0,5', { periode: 0.5 });
profil('tapote 0,9', { periode: 0.9 });
// Le maximum : un automate sans défaut, qui frappe la bonne main à l'instant exact.
profil('automate', { sd: 0, biais: 0, main: 0, oubli: 0, charge: 1 });
