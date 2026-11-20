// Étalonnage des pastilles effervescentes par simulation, sans navigateur : contrôle du plan (toutes les cases libres
// reliées, départ dégagé), puis des joueurs simulés (adroit, moyen, maladroit, immobile) jouent des centaines de parties.
// Ce sont des profils inventés, pas des mesures sur de vrais joueurs.
// Usage : node outils/etalon-pastilles.js ['{"palier":60,"delai":1.5}'] [durée en s] [parties par profil]
const J = require(require('path').join(__dirname, '..', 'jeux.js'))._coeur, RE = J.REGL_PASTILLES;
for (const [k, v] of Object.entries(JSON.parse(process.argv[2] || '{}'))) RE[k] = v;
const DUREE = +(process.argv[3] || 60), K = +(process.argv[4] || 300);
const NC = J.E_PLAN[0].length, NR = J.E_PLAN.length, D = J.E_DIRS, TOUT = NC * NR;
const dans = (c, r) => c >= 0 && c < NC && r >= 0 && r < NR;

// Le plan : mêmes longueurs de lignes, étagères qui n'isolent aucune case, départ et rôdeurs sur des cases libres.
(() => {
  const mur = (c, r) => !dans(c, r) || J.E_PLAN[r][c] === '#', vu = new Uint8Array(TOUT), f = [J.E_DEPART[0] + J.E_DEPART[1] * NC];
  vu[f[0]] = 1;
  for (let i = 0; i < f.length; i++) { const x = f[i] % NC, y = (f[i] - x) / NC; for (const [dx, dy] of D) { const n = x + dx + (y + dy) * NC; if (!mur(x + dx, y + dy) && !vu[n]) { vu[n] = 1; f.push(n); } } }
  let libres = 0, etageres = 0;
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) mur(c, r) ? etageres++ : libres++;
  const faux = J.E_PLAN.some(l => l.length !== NC) || f.length !== libres || [J.E_DEPART, ...J.E_RODEURS].some(q => mur(q[0], q[1]));
  const s = J.creerPastilles();
  console.log('plan : ' + libres + ' cases libres, ' + etageres + ' étagères, cases isolées ' + (libres - f.length) + ', première livraison de ' + s.cartons + ' cartons');
  if (faux) { console.log('PLAN INCORRECT'); process.exit(1); }
})();

// Ce que la mousse va couvrir : pour chaque case, l'instant où elle arrive (dans combien de secondes) et celui où elle repart.
function perils(s) {
  const de = new Float32Array(TOUT).fill(99), a = new Float32Array(TOUT).fill(-1);
  for (const m of s.mousses) for (const k of m.cases) { de[k] = 0; a[k] = Math.max(a[k], m.t); }
  for (const q of s.pastilles) for (const k of J.croixPastilles(s, q.c, q.r)) { de[k] = Math.min(de[k], q.t); a[k] = Math.max(a[k], q.t + RE.mousse); }
  return { de, a };
}
function pres(s, vue) {
  const z = new Uint8Array(TOUT);
  for (const g of s.germes) if (g.attente <= 0.4) { const q = J.casePastilles(g); for (let y = q[1] - vue; y <= q[1] + vue; y++) for (let x = q[0] - vue; x <= q[0] + vue; x++) if (dans(x, y) && Math.abs(x - q[0]) + Math.abs(y - q[1]) <= vue) z[x + y * NC] = 1; }
  return z;
}
// Parcours en largeur sur les cases libres. « passe(k, n) » dit si la case k peut être atteinte au n-ième pas.
function largeur(s, k0, passe) {
  const dist = new Int16Array(TOUT).fill(-1), par = new Int8Array(TOUT).fill(-1), f = [k0];
  dist[k0] = 0;
  for (let i = 0; i < f.length; i++) {
    const k = f[i], x = k % NC, y = (k - x) / NC;
    for (let d = 0; d < 4; d++) { const c = x + D[d][0], r = y + D[d][1], n = c + r * NC; if (dans(c, r) && s.sol[n] === 0 && dist[n] < 0 && passe(n, dist[k] + 1)) { dist[n] = dist[k] + 1; par[n] = d; f.push(n); } }
  }
  const route = k => { const t = []; while (k !== k0) { const d = par[k]; t.unshift(d); k -= D[d][0] + D[d][1] * NC; } return t; };
  return { dist, ordre: f, route };
}
// Ce que rapporterait une pastille posée en (c, r), et s'il reste le temps de s'en écarter.
function valeur(s, k, p, per) {
  const c = k % NC, r = (k - c) / NC, cases = J.croixPastilles(s, c, r);
  let n = 0, v = 0;
  for (const q of cases) if (s.sol[q] === 2) v += RE.carton + RE.lot * n++;
  for (const g of s.germes) { const q = J.casePastilles(g); if (g.attente <= 0 && cases.includes(q[0] + q[1] * NC)) v += 0.5 * (RE.neutralise + RE.lot * n++); }
  if (!v) return 0;
  const pas = Math.floor((RE.delai - p.retard - 0.25) * RE.allure), dedans = new Set(cases), l = largeur(s, k, (q, i) => i <= pas);
  return l.ordre.some(q => !dedans.has(q) && per.a[q] < 0) ? v : -v;   // négatif : pas d'issue, à ne tenter qu'en dernier recours
}
function planifier(s, p, b, alea) {
  const j = s.j, k0 = j.c + j.r * NC, per = perils(s), germes = pres(s, p.vue), sec = n => n / RE.allure;
  if (per.a[k0] >= 0) {                                                    // dans une zone qui va mousser : s'écarter
    if (alea() < p.bevue) return [Math.floor(alea() * 4)];
    const l = largeur(s, k0, (k, n) => !(sec(n) + p.marge >= per.de[k] && sec(n - 1) <= per.a[k]) || per.a[k] < 0);
    let but = -1; for (const k of l.ordre) if (per.a[k] < 0 && !germes[k]) { but = k; break; }
    if (but < 0) for (const k of l.ordre) if (per.a[k] < 0) { but = k; break; }
    return but < 0 ? [] : l.route(but);
  }
  const actif = s.pastilles.length + s.mousses.length > 0;
  if (actif && p.prudent) return null;
  const l = largeur(s, k0, k => per.a[k] < 0 && !germes[k]);
  if (alea() < p.erreur) { const k = l.ordre[Math.floor(alea() * l.ordre.length)]; b.poseAuBout = alea() < 0.5; return l.route(k); }
  let but = -1, mieux = 0, pose = false, secours = -1, vs = 0;
  for (const k of l.ordre) {
    const d = l.dist[k];
    if (s.flacons[k] && RE.flacon / (d + 1) > mieux) { mieux = RE.flacon / (d + 1); but = k; pose = false; }
    if (s.pastilles.length >= p.tube) continue;
    const v = valeur(s, k, p, per);
    if (v > 0 && v / (d + 2) > mieux) { mieux = v / (d + 2); but = k; pose = true; }
    if (v < 0 && -v / (d + 2) > vs) { vs = -v / (d + 2); secours = k; }
  }
  if (but < 0 && !actif && secours >= 0) { but = secours; pose = true; }
  if (but < 0) return null;
  b.poseAuBout = pose;
  return l.route(but);
}
function partie(p, graine) {
  const s = J.creerPastilles(graine); let g = graine * 7 + 3;
  const alea = () => { g = (g * 1103515245 + 12345) & 0x7fffffff; return g / 0x7fffffff; };
  const b = { route: [], file: false, libreA: 0.4, poseAuBout: false, livraisons: 0 }, j = s.j;
  while (!s.fini) {
    if (p) {
      if (s.arret > 0 || s.livraisons !== b.livraisons) { b.route = []; b.file = false; b.poseAuBout = false; b.livraisons = s.livraisons; j.coup = -1; }
      if (b.file && j.coup === -1) { b.route.shift(); b.file = false; }
      if (!b.file && b.route.length) { j.coup = b.route[0]; b.file = true; }
      if (!b.route.length && j.d < 0 && s.arret <= 0 && s.t >= b.libreA) {
        if (b.poseAuBout) { b.poseAuBout = false; j.pose = true; b.libreA = s.t + p.retard * (0.6 + 0.8 * alea()); }
        else {
          const r = planifier(s, p, b, alea);
          if (r === null) b.libreA = s.t + 0.1;
          else if (!r.length && !b.poseAuBout) b.libreA = s.t + 0.1;
          else { b.route = r; if (b.poseAuBout || s.flacons.some(Boolean)) b.libreA = s.t + p.reflexion * (0.6 + 0.8 * alea()); }
        }
      }
    }
    J.pasPastilles(s, 1 / 60, DUREE);
  }
  return s;
}
function profil(nom, p) {
  const h = Array(11).fill(0); let m = 0, mm = 0, sc = 0, max = 0, di = 0, ra = 0, ne = 0, sa = 0, pr = 0, li = 0;
  for (let i = 0; i < K; i++) {
    const a = partie(p, 1000 + i * 2), b = partie(p, 1001 + i * 2), na = J.notePastilles(a), nb = J.notePastilles(b);
    h[na]++; m += na; mm += Math.max(na, nb); sc += a.score; max = Math.max(max, a.score, b.score); di += a.dissous; ra += a.ramasses; ne += a.neutralises; sa += a.savons; pr += a.prises; li += a.livraisons;
  }
  const f = (x, n) => (x / K).toFixed(n === undefined ? 1 : n);
  console.log(nom.padEnd(10), 'une partie :', f(m), '| meilleure de deux :', f(mm), '| points', f(sc, 0), '(max ' + max + ')', '| cartons', f(di, 0), '| flacons', f(ra), '| germes', f(ne), '| glissades', f(sa), '| contaminations', f(pr), '| livraisons', f(li, 2), '| 10 :', Math.round(100 * h[10] / K) + '%', '| répartition', h.map(x => Math.round(100 * x / K)).join(' '));
}
console.log('pastilles, ' + DUREE + ' s, ' + K + ' parties :', JSON.stringify(RE));
// reflexion : pause avant chaque nouveau projet ; retard : hésitation entre la pose et la fuite ; marge : avance gardée sur la mousse ;
// bevue : fuite du mauvais côté ; erreur : déplacement ou pose pour rien ; prudent : attend la fin de la mousse avant de repartir.
profil('adroit', { reflexion: 0.15, retard: 0.1, marge: 0.25, bevue: 0.02, erreur: 0.02, vue: 2, tube: 2, prudent: false });
profil('moyen', { reflexion: 0.55, retard: 0.3, marge: 0.15, bevue: 0.1, erreur: 0.1, vue: 1, tube: 1, prudent: true });
profil('maladroit', { reflexion: 1.1, retard: 0.5, marge: 0.05, bevue: 0.22, erreur: 0.2, vue: 0, tube: 1, prudent: true });
profil('immobile', null);
