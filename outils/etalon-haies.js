// Étalonnage du sprint du couloir (saut de haies) par simulation, sans navigateur : des joueurs simulés (parfait, adroit,
// moyen, maladroit, immobile) courent des centaines de parties. Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-haies.js ['{"chute":1,"palier":0.5}'] [durée en s]   (réglages à essayer, voir RH dans jeux.js)
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RH = J.REGL_HAIES;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RH[k] = v;
const D = +(process.argv[3] || 50), PAS = 1 / 120;
let g = 7; const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
const gauss = () => (alea() + alea() + alea() + alea() - 2) * 1.7;
// La trajectoire d'un saut (hauteur des pieds à chaque pas), petit (bouton relâché avant le seuil) ou grand (bouton tenu).
const vol = grand => { const T = []; let y = 0, vy = RH.saut, t = 0; do { t += PAS; vy -= (grand && t >= RH.seuil && t < RH.tenue ? RH.gTenu : RH.g) * PAS; y += vy * PAS; T.push(Math.max(0, y)); } while (y > 0); return T; };
const VOLS = [vol(false), vol(true)];
// Fenêtre d'appel : les distances (pieds du coureur → début de l'obstacle) d'où le saut passe sans toucher, à la vitesse v.
function fenetre(o, v, grand) {
  const T = VOLS[grand ? 1 : 0], d = o.sol ? 0 : J.HA_DEMI; let min = null, max = null;
  for (let dist = 0; dist <= 320; dist += 1) {
    let ok = true;
    for (let i = 0; i <= T.length + 400 && ok; i++) {
      const x = -dist + v * PAS * (i + 1), y = i < T.length ? T[i] : 0;
      if (x - d > o.w) break;
      if (x + d > 0 && (y < o.h || (o.bas && y + J.HA_TAILLE > o.bas))) ok = false;
    }
    if (ok) { if (min === null) min = dist; max = dist; } else if (min !== null) break;
  }
  return min === null ? null : [min, max];
}
// Un joueur : il vise le milieu de la fenêtre d'appel, avec une erreur de tempo (sigma, en s), se trompe parfois de saut
// (confond : petit au lieu de grand et inversement) et laisse parfois passer un obstacle sans réagir (oubli). Il tente un salto
// sur une part de ses sauts (salto) : second appui en plein saut, au prix d'un tempo moins sûr sur ce saut-là (sigma × 1,3).
function partie(p, graine, duree) {
  const s = J.creerHaies(graine, duree); let cible = null, plan = null, lacher = -1, etroit = 9, file = [], prochain = 0;
  while (!s.fini) {
    if (p.hasard) { if (s.t >= prochain) { J.appuiHaies(s, true); file = [[s.t + (alea() < 0.5 ? 0.06 : 0.4), false]]; prochain = s.t + p.hasard * (0.4 + 1.2 * alea()); } while (file.length && s.t >= file[0][0]) J.appuiHaies(s, file.shift()[1]); }
    else if (!p.immobile) {
      const o = s.file.slice(s.suivant, s.suivant + 3).find(o => !o.touche && o.x + o.w > s.x);
      if (o && s.arret <= 0 && (o !== cible || Math.abs(plan.v - s.v) > 6) && o.x - s.x < 330) {
        const tente = cible === o ? plan.salto : alea() < (p.salto || 0), veut = !!o.grand, fait = cible === o ? plan.fait : (alea() < p.confond ? !veut : veut), f = fenetre(o, s.v, fait) || fenetre(o, s.v, veut) || [40, 40];
        const fb = fenetre(o, s.v, veut); if (fb) etroit = Math.min(etroit, (fb[1] - fb[0]) / s.v);
        plan = { v: s.v, fait, d: (f[0] + f[1]) / 2 + (cible === o ? plan.e : gauss() * p.sigma) * s.v, e: cible === o ? plan.e : gauss() * p.sigma * (tente ? 1.3 : 1), salto: tente, oubli: cible === o ? plan.oubli : alea() < p.oubli, parti: cible === o && plan.parti };
        if (cible !== o) plan.d = (f[0] + f[1]) / 2 + plan.e * s.v;
        cible = o;
      }
      if (cible && !plan.parti && !plan.oubli && s.sol && s.arret <= 0 && cible.x - s.x <= plan.d && cible.x + cible.w > s.x) { J.appuiHaies(s, true); plan.parti = true; file = plan.salto ? (plan.fait ? [[0.35, false], [0.37, true], [0.42, false]] : [[0.05, false], [0.11, true], [0.16, false]]).map(([t, on]) => [s.t + t, on]) : [[s.t + (plan.fait ? 0.4 : 0.07), false]]; }
      while (file.length && s.t >= file[0][0]) J.appuiHaies(s, file.shift()[1]);
    }
    J.pasHaies(s, PAS, duree);
  }
  s.etroit = etroit;
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0), K = p.immobile || !p.sigma && !p.oubli ? 1 : 300; let m = 0, mm = 0, dist = 0, ch = 0, fr = 0, max = 0, et = 9, sa = 0, av = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, 0, D), b = partie(p, 0, D), na = J.noteHaies(a, D), nb = J.noteHaies(b, D);
    sa += a.saltos; av += J.avanceHaies(a); h[na]++; m += na; mm += Math.max(na, nb); dist += J.metresHaies(a); ch += a.chutes; fr += a.francs; max = Math.max(max, J.brutHaies(a), J.brutHaies(b)); et = Math.min(et, a.etroit);
  }
  console.log(nom.padEnd(10), 'une partie :', (m / K).toFixed(1), '| meilleure de deux :', (mm / K).toFixed(1), '| mètres', (dist / K).toFixed(0), '| avance', (av / K).toFixed(0), '| franchis', (fr / K).toFixed(1), '| chutes', (ch / K).toFixed(1), '| saltos', (sa / K).toFixed(1), '| brut max', max, p.immobile ? '' : '| fenêtre la plus étroite ' + Math.round(et * 1000) + ' ms', '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
const P = J.parcoursHaies(0, (RH.vmax + RH.sur) * D + 500), parType = {}; P.forEach(o => parType[o.k] = (parType[o.k] || 0) + 1);
console.log('haies, ' + D + ' s :', JSON.stringify(RH));
console.log('parcours :', P.length, 'obstacles', JSON.stringify(parType), '| écart mini', Math.round(Math.min(...P.slice(1).map((o, i) => o.x - P[i].x - P[i].w))), 'px | plafond théorique du brut (vitesse maxi tout du long, moins le témoin) :', Math.round(((RH.vmax + RH.sur) * D - J.creerHaies(0, D).temoin.at(-1)) / J.HA_M * 10));
console.log('vols : petit', (VOLS[0].length * PAS).toFixed(2), 's, haut de', Math.round(Math.max(...VOLS[0])), 'px | grand', (VOLS[1].length * PAS).toFixed(2), 's, haut de', Math.round(Math.max(...VOLS[1])), 'px');
profil('parfait', { sigma: 0, confond: 0, oubli: 0 });
profil('parfait+', { sigma: 0, confond: 0, oubli: 0, salto: 1 });
profil('adroit', { sigma: 0.045, confond: 0.03, oubli: 0.015, salto: 0.5 });
profil('moyen', { sigma: 0.07, confond: 0.08, oubli: 0.03, salto: 0.2 });
profil('maladroit', { sigma: 0.1, confond: 0.2, oubli: 0.08, salto: 0.05 });
profil('immobile', { immobile: true });
// Appuis au hasard, sans regarder : un appui toutes les 0,4 à 1,6 fois l'intervalle donné, bref ou maintenu à pile ou face.
profil('hasard 1 s', { hasard: 1, sigma: 1 });
profil('hasard 0,5 s', { hasard: 0.5, sigma: 1 });
profil('hasard 0,25 s', { hasard: 0.25, sigma: 1 });
