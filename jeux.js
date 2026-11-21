/* Mini-jeux des Pharmacogames de Noël : cinq jeux d'adresse originaux, dans l'esprit des bornes d'arcade
   et des micro-ordinateurs des années 80. Chargé à la demande par enigme.js, propre au site Vercel.
   Chaque jeu se dessine dans un canevas, dure un temps limité et rend une note de 0 à 10, un bilan et un score brut
   (onFin(note, bilan, brut)) : le score brut sert au classement de la porte.
   Le cœur de chaque jeu (règles, trajectoires) est séparé du dessin pour pouvoir être vérifié hors navigateur. */
(root => {
  const N = "#26076D", C = "#FFFBF2", Y = "#ECD567", O = "#EC7739", P = "#E5B4D9", V = "#B9A6F0", G = "#3E9B76", R = "#D8402B", B = "#8FC7E8";
  const W = 360, H = 480; // repère logique des jeux
  const ICI = (typeof document !== "undefined" && document.currentScript && document.currentScript.src || "").replace(/[^/]*$/, "");

  /* ================= Bowling des flacons : le cœur ================= */
  const RB = 15, RQ = 11, RS = 7, GAUCHE = 46, DROITE = 314, DEPART = 508, HB = 556; // HB : hauteur propre au bowling, la paillasse est plus longue que le repère commun
  // Réglages étalonnés par simulation (voir le banc d'essai) : ils fixent la difficulté.
  const REGL = { elan: 180, frein: 5, relais: 0.55, seuil: 60, cadence: 0.4, vitesse: 280, chute: 85, acc: 3, pas: 0.9, portee: 2, sy: 346, sl: 40, sv: 2.4 };
  const PLACES = (() => { const q = []; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) q.push({ x: 180 + (i - r / 2) * 37, y: 162 - r * 32 }); return q; })();
  // La seringue de garde : elle balaie la paillasse d'un bord à l'autre, à la hauteur sy. sl = demi-longueur, sv = cadence.
  const xSeringue = t => 180 + ((DROITE - GAUCHE) / 2 - REGL.sl - RS) * Math.sin(t * REGL.sv);
  // Un lancer : la boule part de x avec un angle en degrés (0 = tout droit). debout[i] dit si le flacon i est encore là.
  // t0 = horloge de la seringue à l'instant du lancer (sans t0, pas de seringue).
  function creerLancer(x, angle, debout, t0) {
    const a = angle * Math.PI / 180;
    return {
      boule: { x, y: DEPART, vx: Math.sin(a) * 540, vy: -Math.cos(a) * 540, rigole: false, sortie: false, bloquee: false, tour: 0 },
      quilles: PLACES.map((p, i) => ({ x: p.x, y: p.y, vx: 0, vy: 0, la: debout[i], tombee: false, rot: 0 })),
      ts: t0, fini: false,
    };
  }
  function pasLancer(s, dt) {
    const b = s.boule;
    if (s.ts != null) {
      s.ts += dt;
      if (!b.sortie && !b.bloquee && !b.rigole) {
        const sx = xSeringue(s.ts), px = Math.max(sx - REGL.sl, Math.min(sx + REGL.sl, b.x));
        // Touchée, la boule repart vers le lanceur : le lancer est perdu.
        if (Math.hypot(b.x - px, b.y - REGL.sy) < RB + RS) { b.bloquee = true; b.vy = Math.abs(b.vy) * 0.45; b.vx = b.vx * 0.45 + (xSeringue(s.ts) - xSeringue(s.ts - dt)) / dt * 0.5; }
      }
    }
    if (!b.sortie) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.tour += dt * 9;
      if (!b.rigole && (b.x < GAUCHE + RB - 4 || b.x > DROITE - RB + 4)) { b.rigole = true; b.x = b.x < 180 ? GAUCHE - 8 : DROITE + 8; b.vx = 0; }
      if (b.y < -30 || b.y > HB + 30) b.sortie = true;
      if (!b.rigole) for (const q of s.quilles) {
        if (!q.la || q.tombee) continue;
        const dx = q.x - b.x, dy = q.y - b.y, d = Math.hypot(dx, dy);
        if (d < RB + RQ) {
          const nx = dx / d, ny = dy / d;
          q.tombee = true; q.vx = nx * REGL.elan + b.vx * 0.22; q.vy = ny * REGL.elan + b.vy * 0.22;
          const k = (b.vx * nx + b.vy * ny) * 0.3; b.vx -= k * nx; b.vy -= k * ny;
        }
      }
    }
    let bouge = false;
    for (const q of s.quilles) {
      if (!q.la || !q.tombee) continue;
      const v = Math.hypot(q.vx, q.vy);
      if (v < 14) { q.vx = q.vy = 0; continue; }
      bouge = true;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += dt * v / 22;
      const f = Math.max(0, 1 - REGL.frein * dt); q.vx *= f; q.vy *= f;
      if (v > REGL.seuil) for (const o of s.quilles) {
        if (!o.la || o.tombee) continue;
        const dx = o.x - q.x, dy = o.y - q.y, d = Math.hypot(dx, dy);
        if (d < RQ * 2) { o.tombee = true; o.vx = dx / d * v * REGL.relais; o.vy = dy / d * v * REGL.relais; q.vx *= 0.5; q.vy *= 0.5; }
      }
    }
    s.fini = b.sortie && !bouge;
  }
  const tombees = s => s.quilles.filter(q => q.la && q.tombee).length;

  /* ================= Le tennis de paillasse : le cœur ================= */
  // Réglages étalonnés par simulation (node outils/etalon-tennis.js) : ils fixent la difficulté.
  const RT = { v0: 300, vmax: 860, gain: 1.12, angle: 55, service: 22, demi: 34, demiA: 30, main: 1100, clavier: 430, robot: 210, erreur: 18, pause: 0.9 };
  const T_PAS = 1 / 240, T_RB = 11, T_EP = 6, T_G = 14, T_D = 346, T_YJ = 436, T_YA = 86, T_HAUT = 39;
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));
  // Où la balle b coupera-t-elle la ligne y, rebonds sur les bords compris ?
  function viseTennis(b, y) {
    const L = T_D - T_G - 2 * T_RB, u = (((b.x + b.vx * (y - b.y) / b.vy - T_G - T_RB) % (2 * L)) + 2 * L) % (2 * L);
    return T_G + T_RB + (u > L ? 2 * L - u : u);
  }
  // Un match : cible est l'endroit où le joueur veut sa spatule. Le hasard (services, erreurs de l'automate) vient de la graine.
  function creerTennis(graine) {
    let a = graine || 20261213;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return { t: 0, acc: 0, x: 180, cible: 180, ax: 180, avise: 180, balle: null, attente: 1.2, vers: 1, pour: 0, contre: 0, echange: 0, record: 0, renvois: 0, serie: 0, suite: 0, tape: [-9, -9], msg: "", msgT: -9, h, fini: false };
  }
  // L'automate choisit où attendre la balle qui monte vers lui : le bon endroit, à une erreur près qui grandit avec la vitesse.
  function automateVise(s, b) {
    const g = (s.h() + s.h() + s.h() + s.h() - 2) * 1.7;
    s.avise = viseTennis(b, T_YA + T_EP + T_RB) + g * RT.erreur * Math.hypot(b.vx, b.vy) / RT.v0;
  }
  // Renvoi par la raquette centrée en px : l'angle de départ dépend du point d'impact, et la balle accélère.
  function renvoi(s, b, px, demi, sens) {
    const u = borne((b.x - px) / (demi + T_RB * 0.7), -1, 1), a = u * RT.angle * Math.PI / 180, v = Math.min(RT.vmax, Math.hypot(b.vx, b.vy) * RT.gain);
    b.vx = Math.sin(a) * v; b.vy = sens * Math.cos(a) * v;
    b.y = sens < 0 ? T_YJ - T_EP - T_RB : T_YA + T_EP + T_RB;
    s.echange++; s.record = Math.max(s.record, s.echange); s.tape[sens < 0 ? 0 : 1] = s.t;
    if (sens < 0) { s.renvois++; s.suite = Math.max(s.suite, ++s.serie); automateVise(s, b); }
  }
  function unPasTennis(s, duree) {
    const dt = T_PAS;
    s.t += dt;
    if (s.t >= duree) { s.fini = true; return; }
    s.x += borne(borne(s.cible, T_G + RT.demi, T_D - RT.demi) - s.x, -RT.main * dt, RT.main * dt);
    const b = s.balle;
    // Sans balle montante, l'automate se replace : au centre, en suivant un peu la balle qui descend.
    if (!b) s.avise = 180; else if (b.vy > 0) s.avise = 180 + (b.x - 180) * 0.35;
    s.ax += borne(borne(s.avise, T_G + RT.demiA, T_D - RT.demiA) - s.ax, -RT.robot * dt, RT.robot * dt);
    if (!b) {
      s.attente -= dt;
      if (s.attente <= 0) {
        const a = (s.h() * 2 - 1) * RT.service * Math.PI / 180;
        s.balle = { x: 180, y: 261, vx: Math.sin(a) * RT.v0, vy: s.vers * Math.cos(a) * RT.v0, tour: 0 }; s.echange = 0; s.serie = 0;
        if (s.vers < 0) automateVise(s, s.balle);
      }
      return;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.tour += dt * b.vx / 110;
    if (b.x < T_G + T_RB) { b.x = 2 * (T_G + T_RB) - b.x; b.vx = Math.abs(b.vx); }
    else if (b.x > T_D - T_RB) { b.x = 2 * (T_D - T_RB) - b.x; b.vx = -Math.abs(b.vx); }
    // Zone de frappe plus épaisse que le plus grand pas de la balle : elle ne peut pas traverser une raquette.
    if (b.vy > 0 && b.y + T_RB >= T_YJ - T_EP && b.y <= T_YJ && Math.abs(b.x - s.x) <= RT.demi + T_RB * 0.7) renvoi(s, b, s.x, RT.demi, -1);
    else if (b.vy < 0 && b.y - T_RB <= T_YA + T_EP && b.y >= T_YA && Math.abs(b.x - s.ax) <= RT.demiA + T_RB * 0.7) renvoi(s, b, s.ax, RT.demiA, 1);
    if (b.y > H + 14) { s.contre++; s.vers = 1; s.msg = "En quarantaine…"; s.msgT = s.t; s.balle = null; s.attente = RT.pause; }
    else if (b.y < T_HAUT + 6) { s.pour++; s.vers = -1; s.msg = "Comprimé libéré !"; s.msgT = s.t; s.balle = null; s.attente = RT.pause; }
  }
  // Pas fixe, comme le flipper : la physique avance par tranches de 1/240 s quel que soit le rythme d'affichage.
  function pasTennis(s, dt, duree) { s.acc += dt; while (s.acc >= T_PAS && !s.fini) { s.acc -= T_PAS; unPasTennis(s, duree); } }
  // La note : la part des points gagnés, ramenée sur 10 (6 points gagnés sur 10 joués = 6 sur 10).
  const noteTennis = s => s.pour + s.contre ? Math.round(10 * s.pour / (s.pour + s.contre)) : 0;

  /* ================= La hotte en folie : le cœur ================= */
  const TOTAL = 40;
  // Même pluie de particules pour tout le monde : le hasard est tiré d'une graine fixe.
  function pluie() {
    let a = 20261225;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const L = [];
    for (let i = 0; i < TOTAL; i++) L.push({ t: 0.8 + i * REGL.pas + h() * 0.5, x: 34 + h() * 292, r: 12 + Math.floor(h() * 3) * 2.5, amp: 10 + h() * 26, ph: h() * 6.28, k: Math.floor(h() * 3) });
    return L;
  }
  function creerTir() {
    return { t: 0, x: 180, cible: 180, tirs: [], germes: [], file: pluie(), suivant: 0, recharge: 0, touches: 0, rates: 0, serie: 0, record: 0, gouttes: 0, eclats: [], fini: false };
  }
  // serie : particules neutralisées d'affilée, sans en laisser passer une. Elle ne rapporte rien, elle sert au spectacle.
  function pasTir(s, dt, duree) {
    s.t += dt;
    const dx = s.cible - s.x, vmax = REGL.vitesse * dt;
    s.x += Math.max(-vmax, Math.min(vmax, dx));
    s.recharge -= dt;
    if (s.recharge <= 0) { s.tirs.push({ x: s.x, y: 408 }); s.gouttes++; s.recharge = REGL.cadence; }
    while (s.suivant < s.file.length && s.file[s.suivant].t <= s.t) { const g = s.file[s.suivant++]; s.germes.push({ x0: g.x, x: g.x, y: -20, r: g.r, amp: g.amp, ph: g.ph, k: g.k, v: REGL.chute + s.t * REGL.acc }); }
    for (const t of s.tirs) t.y -= 520 * dt;
    s.tirs = s.tirs.filter(t => t.y > -10);
    for (const g of s.germes) {
      g.y += g.v * dt;
      g.x = Math.max(g.r + 20, Math.min(W - g.r - 20, g.x0 + Math.sin(g.ph + g.y / 34) * g.amp));
      for (const t of s.tirs) if (!t.mort && Math.hypot(t.x - g.x, t.y - g.y) < g.r + REGL.portee) { t.mort = g.mort = true; s.touches++; s.serie++; if (s.serie > s.record) s.record = s.serie; s.eclats.push({ x: g.x, y: g.y, t: 0, k: g.k }); break; }
      if (!g.mort && g.y > 446) { g.mort = true; s.rates++; s.serie = 0; s.eclats.push({ x: g.x, y: 452, t: 0, k: -1 }); }
    }
    s.tirs = s.tirs.filter(t => !t.mort);
    s.germes = s.germes.filter(g => !g.mort);
    for (const e of s.eclats) e.t += dt;
    s.eclats = s.eclats.filter(e => e.t < 0.45);
    if (s.t >= duree || (s.suivant >= s.file.length && !s.germes.length)) s.fini = true;
  }
  const noteTir = s => Math.round(10 * s.touches / TOTAL);

  /* ================= Le flipper du préparatoire : le cœur ================= */
  // Réglages étalonnés par simulation (node outils/etalon.js) : ils fixent la difficulté.
  const RF = { g: 820, vmax: 960, monte: 20, descend: 14, repos: 0.5, leve: -0.5, long: 62, kick: 400, bouchon: 10, etiquette: 25, deja: 5, lot: 150, relance: 2, perte: 40, palier: 80, delai: 1.2, fronde: 5, tilts: 3, tiltPause: 2 };
  const F_PAS = 1 / 240, F_RB = 8, F_EP = 5;
  const F_H = 560, F_BAS = 410;   // plateau plus long que les autres jeux ; F_BAS : là où les parois deviennent les guides
  const F_MURS = [[10, F_BAS, 10, 110], [10, 110, 70, 49], [70, 49, 290, 49], [290, 49, 350, 110], [350, 110, 350, F_BAS], [10, F_BAS, 104, 488], [350, F_BAS, 256, 488], [104, 488, 120, F_H], [256, 488, 240, F_H]];
  // Les frondes : deux triangles au-dessus des batteurs, dont le grand côté renvoie la bille. Derrière chacune, un couloir mène au batteur.
  const F_FRONDES = [{ a: [44, 322], b: [44, 398], c: [86, 432], n: [0.934, -0.357] }, { a: [316, 322], b: [316, 398], c: [274, 432], n: [-0.934, -0.357] }];
  const F_PLOTS = [{ x: 118, y: 292, r: 6 }, { x: 242, y: 292, r: 6 }];
  const F_BOUCHONS = [{ x: 112, y: 160, r: 19 }, { x: 248, y: 160, r: 19 }, { x: 180, y: 238, r: 19 }, { x: 180, y: 348, r: 14 }];
  const F_ETIQ = [[17, 165, 17, 197], [17, 232, 17, 264], [164, 57, 196, 57], [343, 165, 343, 197], [343, 232, 343, 264]];
  const F_PIVOTS = [{ x: 108, y: 494, sens: 1 }, { x: 252, y: 494, sens: -1 }];
  const boutBatteur = (i, ang) => { const p = F_PIVOTS[i]; return [p.x + p.sens * Math.cos(ang) * RF.long, p.y + Math.sin(ang) * RF.long]; };
  // Une partie : g et d disent si les batteurs gauche et droit sont tenus levés.
  function creerFlipper(graine) {
    let a = graine || 20261207;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return { t: 0, acc: 0, score: 0, pertes: 0, lots: 0, coups: 0, lancers: 0, lot: F_ETIQ.map(() => false), tape: F_BOUCHONS.map(() => -9), bille: null, attente: 0.9, g: false, d: false, ang: [RF.repos, RF.repos], vit: [0, 0], calme: 0, msg: "", msgT: -9, serie: 0, serieT: -9, choc: null, tilts: 0, tiltT: -9, frondeT: [-9, -9], h, fini: false };
  }
  // La bille touche-t-elle le segment (épaisseur ep) ? Si oui, elle est repoussée dehors et on rend la normale.
  function contact(b, x1, y1, x2, y2, ep) {
    const dx = x2 - x1, dy = y2 - y1, u = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / (dx * dx + dy * dy)));
    const cx = x1 + dx * u, cy = y1 + dy * u, nx = b.x - cx, ny = b.y - cy, d = Math.hypot(nx, ny), R = F_RB + ep;
    if (d >= R || d === 0) return null;
    b.x = cx + nx / d * R; b.y = cy + ny / d * R;
    return { nx: nx / d, ny: ny / d, cx, cy };
  }
  // Rebond d'élasticité e sur une surface qui se déplace à (vsx, vsy). Rend la vitesse d'approche.
  function rebond(b, c, e, vsx, vsy) {
    const vn = (b.vx - vsx) * c.nx + (b.vy - vsy) * c.ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * c.nx; b.vy -= (1 + e) * vn * c.ny; }
    return -vn;
  }
  // Une série : des touches qui s'enchaînent à moins de RF.delai secondes. Elle ne rapporte rien, elle sert au spectacle.
  function marquer(s, x, y) { s.serie = s.t - s.serieT < RF.delai ? s.serie + 1 : 1; s.serieT = s.t; s.serieMax = Math.max(s.serieMax || 0, s.serie); s.choc = { x, y, n: s.serie }; }
  function unPasFlipper(s, duree) {
    const dt = F_PAS;
    s.t += dt;
    if (s.t >= duree) { s.fini = true; return; }
    for (let i = 0; i < 2; i++) {
      const vise = (i ? s.d : s.g) ? RF.leve : RF.repos, av = s.ang[i], w = vise < av ? -RF.monte : vise > av ? RF.descend : 0;
      let n = av + w * dt; if ((w < 0 && n < vise) || (w > 0 && n > vise)) n = vise;
      s.vit[i] = (n - av) / dt; s.ang[i] = n;
    }
    if (!s.bille) {
      s.attente -= dt;
      if (s.attente <= 0) { const k = s.lancers++ % 2 ? -1 : 1; s.bille = { x: 180 - k * (151 + s.h() * 4), y: 104, vx: k * (1 + s.h() * 5), vy: 0 }; s.calme = 0; }
      return;
    }
    const b = s.bille;
    b.vy += RF.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    let tenue = false;
    for (let i = 0; i < 2; i++) {
      const p = F_PIVOTS[i], bout = boutBatteur(i, s.ang[i]), c = contact(b, p.x, p.y, bout[0], bout[1], F_EP);
      if (!c) continue;
      const w = s.vit[i] * p.sens;
      rebond(b, c, 0.3, -w * (c.cy - p.y), w * (c.cx - p.x));
      if ((i ? s.d : s.g)) tenue = true;
    }
    for (const m of F_MURS) { const c = contact(b, m[0], m[1], m[2], m[3], 0); if (c) rebond(b, c, 0.45, 0, 0); }
    F_FRONDES.forEach((f, i) => {
      for (const [p, q] of [[f.a, f.b], [f.b, f.c]]) { const c = contact(b, p[0], p[1], q[0], q[1], 0); if (c) rebond(b, c, 0.45, 0, 0); }
      const c = contact(b, f.a[0], f.a[1], f.c[0], f.c[1], 0);
      if (!c) return;
      const vn = b.vx * f.n[0] + b.vy * f.n[1];
      if (c.nx * f.n[0] + c.ny * f.n[1] > 0.3 && vn < -50) { const sortie = Math.max(-vn, RF.kick * 0.9); b.vx += (sortie - vn) * f.n[0]; b.vy += (sortie - vn) * f.n[1]; s.score += RF.fronde; s.frondeT[i] = s.t; marquer(s, c.cx, c.cy); }
      else rebond(b, c, 0.45, 0, 0);
    });
    for (const o of F_PLOTS) {
      const nx = b.x - o.x, ny = b.y - o.y, d = Math.hypot(nx, ny), R = o.r + F_RB;
      if (d < R && d > 0) { b.x = o.x + nx / d * R; b.y = o.y + ny / d * R; rebond(b, { nx: nx / d, ny: ny / d }, 0.6, 0, 0); }
    }
    F_ETIQ.forEach((m, i) => {
      const c = contact(b, m[0], m[1], m[2], m[3], 3);
      if (!c || rebond(b, c, 0.5, 0, 0) < 40) return;
      marquer(s, c.cx, c.cy);
      if (s.lot[i]) { s.score += RF.deja; return; }
      s.lot[i] = true; s.score += RF.etiquette;
      if (s.lot.every(Boolean)) { s.score += RF.lot; s.lots++; s.lot = s.lot.map(() => false); s.msg = "Lot libéré ! +" + RF.lot; s.msgT = s.t; }
    });
    F_BOUCHONS.forEach((o, i) => {
      const nx = b.x - o.x, ny = b.y - o.y, d = Math.hypot(nx, ny), R = o.r + F_RB;
      if (d >= R || d === 0) return;
      const ux = nx / d, uy = ny / d, vn = b.vx * ux + b.vy * uy, sortie = Math.max(-vn, RF.kick);
      b.x = o.x + ux * R; b.y = o.y + uy * R;
      b.vx += (sortie - vn) * ux; b.vy += (sortie - vn) * uy;
      s.score += RF.bouchon; s.tape[i] = s.t; marquer(s, o.x + ux * o.r, o.y + uy * o.r);
    });
    if (b.y < F_BAS) b.x = Math.max(10 + F_RB, Math.min(350 - F_RB, b.x));   // filet de sécurité : jamais hors des parois
    if (b.y < 49 + F_RB) { b.y = 49 + F_RB; if (b.vy < 0) b.vy = -b.vy * 0.45; }
    const v = Math.hypot(b.vx, b.vy);
    if (v > RF.vmax) { b.vx *= RF.vmax / v; b.vy *= RF.vmax / v; }
    // Déblocage : une bille immobile ailleurs que sur un batteur tenu levé reçoit un coup de pouce.
    s.calme = v < 30 && !tenue ? s.calme + dt : 0;
    if (s.calme > 1.2) { b.vx = (s.h() - 0.5) * 300; b.vy = -330; s.calme = 0; s.coups++; }
    if (b.y > F_H + 16) { s.bille = null; s.pertes++; s.attente = RF.relance; s.score = Math.max(0, s.score - RF.perte); s.lot = s.lot.map(() => false); s.serie = 0; s.msg = "Bille perdue : -" + RF.perte; s.msgT = s.t; }
    else if (!(b.x > -20 && b.x < W + 20 && b.y > 0)) { s.bille = null; s.attente = 0.3; }                   // ne devrait pas arriver
  }
  // Pas fixe : quel que soit le rythme d'affichage, la physique avance par tranches de 1/240 s.
  // Secouer la table (« tilt ») : les batteurs reviennent au repos et la bille reçoit une bourrade. Trois fois par partie,
  // et sans effet sur une bille déjà passée sous les batteurs : ce n'est pas un sauvetage.
  function secouerFlipper(s) {
    if (s.fini || s.tilts >= RF.tilts || s.t - s.tiltT < RF.tiltPause) return false;
    s.tilts++; s.tiltT = s.t; s.g = s.d = false; s.ang = [RF.repos, RF.repos]; s.vit = [0, 0]; s.calme = 0;
    const b = s.bille;
    if (b && b.y < F_PIVOTS[0].y + 6) { b.vx += (s.h() - 0.5) * 320; b.vy = Math.min(b.vy, 0) - 300; }
    s.msg = "Tilt ! Reste " + (RF.tilts - s.tilts); s.msgT = s.t;
    return true;
  }
  function pasFlipper(s, dt, duree) { s.acc += dt; while (s.acc >= F_PAS && !s.fini) { s.acc -= F_PAS; unPasFlipper(s, duree); } }
  const noteFlipper = s => Math.min(10, Math.floor(s.score / RF.palier));

  /* ================= Le labyrinthe de la ZAC : le cœur ================= */
  // Une grille de 15 x 18 cases, parcourue case par case, sans aucune impasse. Le préparateur ramasse les étiquettes ;
  // trois germes le cherchent, chacun à sa façon, et ne le sentent que de près (flair, en cases de couloir).
  const RL = { allure: 4.6, germe: 4.3, palier: 13, amende: 8, fige: 4, abri: 2, arret: 0.8, contact: 0.6, avance: 4 };
  const L_PLAN = [
    "###############",
    "#......#......#",
    "#.####.#.####.#",
    "#.............#",
    "#.##.#####.##.#",
    "#....#.o.#....#",
    "##.#.#.#.#.#.##",
    "#..#...#...#..#",
    "#.####.#.####.#",
    "#o...........o#",
    "#.##.##.##.##.#",
    "#..#.......#..#",
    "##.#.#####.#.##",
    "#......#......#",
    "#.####.#.####.#",
    "#.#.... ....#.#",
    "#...#######...#",
    "###############"];
  const L_NC = 15, L_NR = 18, L_PAS = 1 / 120, L_DEPART = [7, 15];
  const L_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];                       // haut, droite, bas, gauche
  // Le pisteur suit la trace, l'embusqué vise quelques cases devant le préparateur, le vagabond erre et ne réagit que de près.
  const L_GERMES = [{ c: 1, r: 1, flair: 9, zele: 0.85, attente: 1 }, { c: 13, r: 1, flair: 11, zele: 0.75, attente: 2.5 }, { c: 7, r: 3, flair: 5, zele: 0.9, attente: 4 }];
  const lOuvert = (c, r) => { const k = (L_PLAN[r] || "")[c]; return !!k && k !== "#"; };
  // Distance en cases de couloir depuis une case vers toutes les autres.
  function lDistances(c, r) {
    const d = new Int16Array(L_NC * L_NR).fill(999), f = [c + r * L_NC];
    d[f[0]] = 0;
    for (let i = 0; i < f.length; i++) {
      const k = f[i], x = k % L_NC, y = (k - x) / L_NC;
      for (const [dx, dy] of L_DIRS) { const n = k + dx + dy * L_NC; if (d[n] === 999 && lOuvert(x + dx, y + dy)) { d[n] = d[k] + 1; f.push(n); } }
    }
    return d;
  }
  const lPos = e => e.d < 0 ? [e.c, e.r] : [e.c + L_DIRS[e.d][0] * e.p, e.r + L_DIRS[e.d][1] * e.p];
  function lRemplir(s) {
    s.reste = 0;
    for (let r = 0; r < L_NR; r++) for (let c = 0; c < L_NC; c++) { const k = L_PLAN[r][c]; s.objets[c + r * L_NC] = k === "." ? 1 : k === "o" ? 2 : 0; if (k === ".") s.reste++; }
  }
  function lRenvoi(g, attente) { const o = L_GERMES[g.type]; g.c = o.c; g.r = o.r; g.d = -1; g.p = 0; g.attente = attente; }
  function creerLaby(graine) {
    let a = graine || 20261219;
    const hasard = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const s = { t: 0, acc: 0, hasard, j: { c: L_DEPART[0], r: L_DEPART[1], d: -1, p: 0, veut: -1, vu: 2 }, germes: L_GERMES.map((o, i) => ({ type: i, c: o.c, r: o.r, d: -1, p: 0, flair: o.flair, zele: o.zele, attente: o.attente })),
      objets: new Uint8Array(L_NC * L_NR), reste: 0, etiq: 0, compte: 0, prises: 0, sprays: 0, lots: 0, fige: 0, abri: 0, arret: 0, msg: "", msgT: -9, fini: false };
    lRemplir(s); lFlairer(s);
    return s;
  }
  // Ce que les germes peuvent sentir : la trace du préparateur, et la case qu'il vise quelques pas plus loin.
  function lFlairer(s) {
    const j = s.j; let c = j.c, r = j.r;
    s.piste = lDistances(c, r);
    if (j.d >= 0) for (let i = 0; i < RL.avance && lOuvert(c + L_DIRS[j.d][0], r + L_DIRS[j.d][1]); i++) { c += L_DIRS[j.d][0]; r += L_DIRS[j.d][1]; }
    s.devant = c === j.c && r === j.r ? s.piste : lDistances(c, r);
  }
  function lRamasser(s) {
    const k = s.j.c + s.j.r * L_NC, o = s.objets[k];
    if (!o) return;
    s.objets[k] = 0;
    if (o === 2) { s.fige = RL.fige; s.sprays++; s.msg = "Bionettoyage !"; s.msgT = s.t; return; }
    s.etiq++; s.compte++;
    if (--s.reste === 0) { lRemplir(s); s.lots++; s.msg = "Lot complet !"; s.msgT = s.t; }
  }
  // Le préparateur : le virage demandé (veut) est gardé en mémoire jusqu'à la première case où il devient possible.
  function lJoueur(s, dist) {
    const j = s.j, va = d => d >= 0 && lOuvert(j.c + L_DIRS[d][0], j.r + L_DIRS[d][1]);
    const choix = () => { const d = va(j.veut) ? j.veut : va(j.d) ? j.d : -1; if (d !== j.d) { j.d = d; if (d >= 0) j.vu = d; lFlairer(s); } };
    if (j.d >= 0 && j.p > 0 && j.veut === (j.d + 2) % 4) { j.c += L_DIRS[j.d][0]; j.r += L_DIRS[j.d][1]; j.p = 1 - j.p; j.d = j.vu = j.veut; lFlairer(s); }   // demi-tour immédiat
    if (j.p === 0) choix();
    if (j.d < 0) return;
    j.p += dist;
    if (j.p >= 1) {
      const reste = j.p - 1;
      j.c += L_DIRS[j.d][0]; j.r += L_DIRS[j.d][1]; j.p = 0;
      lRamasser(s);
      const avant = j.d; choix(); if (j.d === avant) lFlairer(s);
      if (j.d >= 0) j.p = reste;
    }
  }
  // Un germe ne fait jamais demi-tour. À chaque case, s'il sent le préparateur et ne se trompe pas, il prend le plus court ; sinon il erre.
  function lChoisir(s, g) {
    const dos = g.d < 0 ? -1 : (g.d + 2) % 4, opts = [];
    for (let d = 0; d < 4; d++) if (d !== dos && lOuvert(g.c + L_DIRS[d][0], g.r + L_DIRS[d][1])) opts.push(d);
    if (!opts.length) opts.push(dos);
    let d = opts[Math.floor(s.hasard() * opts.length)];
    const k = g.c + g.r * L_NC, carte = g.type === 1 ? s.devant : s.piste, suit = s.hasard() < g.zele;
    if (suit && s.abri <= 0 && s.piste[k] <= g.flair) { let m = 1e9; for (const o of opts) { const v = carte[k + L_DIRS[o][0] + L_DIRS[o][1] * L_NC]; if (v < m) { m = v; d = o; } } }
    g.d = d;
  }
  function unPasLaby(s, duree) {
    const dt = L_PAS, j = s.j;
    s.t += dt;
    if (s.t >= duree) { s.fini = true; return; }
    if (s.fige > 0) s.fige -= dt;
    if (s.abri > 0) s.abri -= dt;
    if (s.arret > 0) s.arret -= dt; else lJoueur(s, RL.allure * dt);
    const pj = lPos(j);
    for (const g of s.germes) {
      if (g.attente > 0) {                                                 // encore dans sa bouche d'aération : inoffensif
        g.attente -= dt;
        if (g.attente <= 0 && Math.abs(g.c - pj[0]) + Math.abs(g.r - pj[1]) < 2.5) g.attente = 0.3;   // il ne sort pas sous les pieds du préparateur
        continue;
      }
      if (s.fige <= 0) {
        if (g.d < 0) lChoisir(s, g);
        g.p += RL.germe * dt;
        if (g.p >= 1) { g.c += L_DIRS[g.d][0]; g.r += L_DIRS[g.d][1]; g.p -= 1; lChoisir(s, g); }
      }
      const pg = lPos(g);
      if (Math.abs(pg[0] - pj[0]) + Math.abs(pg[1] - pj[1]) >= RL.contact) continue;
      if (s.fige > 0) { lRenvoi(g, 2); continue; }                         // germe figé : un coup de lingette, retour à l'aération
      if (s.abri > 0) continue;
      // Contamination : amende au compteur, tout le monde repart de sa place, la partie continue.
      s.prises++; s.compte = Math.max(0, s.compte - RL.amende);
      s.germes.forEach((x, i) => lRenvoi(x, 1 + i * 1.2));
      j.c = L_DEPART[0]; j.r = L_DEPART[1]; j.d = j.veut = -1; j.p = 0; j.vu = 2;
      s.arret = RL.arret; s.abri = RL.arret + RL.abri; s.msg = "Contamination ! −" + RL.amende; s.msgT = s.t;
      lFlairer(s);
      break;
    }
  }
  function pasLaby(s, dt, duree) { s.acc += dt; while (s.acc >= L_PAS && !s.fini) { s.acc -= L_PAS; unPasLaby(s, duree); } }
  const noteLaby = s => Math.min(10, Math.floor(s.compte / RL.palier));

  /* ================= Dessin et commandes (navigateur seulement) ================= */
  function monter(el, hauteur) {
    const cv = document.createElement("canvas");
    cv.className = "pj-cv";
    cv.tabIndex = 0;
    cv.setAttribute("role", "application");
    el.innerHTML = "";
    el.appendChild(cv);
    const ctx = cv.getContext("2d");
    const taille = () => {
      const w = Math.min(el.clientWidth || 320, 430), r = Math.min(window.devicePixelRatio || 1, 2.5);
      cv.style.width = w + "px"; cv.style.height = Math.round(w * hauteur / W) + "px";
      cv.width = Math.round(w * r); cv.height = Math.round(w * hauteur / W * r);
      ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
    };
    taille();
    window.addEventListener("resize", taille);
    const xDe = e => (e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width * W;
    return { cv, ctx, xDe, liberer: () => window.removeEventListener("resize", taille) };
  }
  const trait = (ctx, w) => { ctx.strokeStyle = N; ctx.lineWidth = w || 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; };
  function texte(ctx, t, x, y, px, coul, align) { ctx.font = "800 " + px + "px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.fillStyle = coul || N; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
  // Bandeau commun : libellé à gauche, chrono à droite, barre de temps.
  function bandeau(ctx, gauche, reste, duree) {
    ctx.fillStyle = N; ctx.fillRect(0, 0, W, 34);
    texte(ctx, gauche, 12, 18, 15, Y, "left");
    texte(ctx, Math.max(0, Math.ceil(reste)) + " s", W - 12, 18, 15, reste <= 5 ? O : C, "right");
    ctx.fillStyle = "rgba(255,251,242,.25)"; ctx.fillRect(0, 34, W, 5);
    ctx.fillStyle = reste <= 5 ? O : Y; ctx.fillRect(0, 34, W * Math.max(0, reste / duree), 5);
  }
  function flacon(ctx, x, y, rot, coul) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    trait(ctx, 2.4);
    ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-8, -9, 16, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = coul; ctx.beginPath(); ctx.roundRect(-8, 0, 16, 11, [0, 0, 4, 4]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-6, -14, 12, 6, 2); ctx.fill();
    ctx.restore();
  }
  function boucle(etape) {
    let avant = performance.now(), vivant = true;
    const tour = t => { if (!vivant) return; const dt = Math.min(0.05, (t - avant) / 1000); avant = t; etape(dt); if (vivant) requestAnimationFrame(tour); };
    requestAnimationFrame(tour);
    return () => { vivant = false; };
  }

  /* ----- Bowling des flacons : une partie de SERIES séries de 2 lancers, note = flacons à terre ramenés sur 10 ----- */
  const SERIES = 5, noteBowling = total => Math.round(total / SERIES);
  function bowling(el, opt) {
    const duree = opt.duree || 30, { cv, ctx, liberer } = monter(el, HB);
    cv.setAttribute("aria-label", "Bowling des flacons. Cinq séries de deux lancers. Appuyez ou tapez Espace pour fixer la position, puis l'angle du lancer. Une seringue balaie la paillasse : lancez quand la voie est libre.");
    const debout = PLACES.map(() => true);
    let phase = "position", lancerN = 1, serie = 1, aTerre = 0, t = 0, reste = duree, posX = 180, angle = 0, sim = null, total = 0, annonce = "", annonceT = 0, clos = false, horloge = 0;
    const COUL = [O, Y, P, V, Y, O, V, P, O, Y];
    const feuille = [];                       // feuille[série - 1] = [flacons du tir 1, flacons du tir 2]
    const logo = new Image(); logo.src = "img/menu-pharmacogames.webp"; // le logo de l'unité roule sur la boule ; sans image, un comprimé sécable
    // L'écran suspendu, en un seul bandeau compact : une case par série (les deux tirs, puis le cumul), le total, le chrono.
    function ecran() {
      const h = 44, lc = 44, x0 = 6;
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, h);
      let cumul = 0;
      for (let i = 0; i < SERIES; i++) {
        const x = x0 + i * lc, f = feuille[i] || [], actif = i === serie - 1 && phase !== "fin";
        ctx.fillStyle = actif ? "rgba(236,213,103,.22)" : "rgba(255,251,242,.08)"; ctx.beginPath(); ctx.roundRect(x + 2, 4, lc - 4, h - 8, 5); ctx.fill();
        if (actif) { ctx.strokeStyle = Y; ctx.lineWidth = 1.5; ctx.stroke(); }
        const m1 = f[0] == null ? "" : f[0] === 10 ? "X" : f[0] || "–", m2 = f[1] == null ? "" : f[0] + f[1] === 10 ? "/" : f[1] || "–";
        texte(ctx, m1, x + lc / 2 - 9, 14, 13, f[0] === 10 ? O : C); texte(ctx, m2, x + lc / 2 + 9, 14, 13, m2 === "/" ? O : C);
        if (f.length) { cumul += f[0] + (f[1] || 0); texte(ctx, cumul, x + lc / 2, 30, 14, Y); }
      }
      const xt = x0 + SERIES * lc, lt = 58;
      ctx.fillStyle = Y; ctx.beginPath(); ctx.roundRect(xt + 2, 4, lt - 4, h - 8, 5); ctx.fill();
      texte(ctx, "TOTAL", xt + lt / 2, 13, 9, N); texte(ctx, total, xt + lt / 2, 29, 17, N);
      texte(ctx, Math.max(0, Math.ceil(reste)) + " s", W - 10, 23, 17, reste <= 5 ? O : C, "right");
      ctx.fillStyle = "rgba(255,251,242,.25)"; ctx.fillRect(0, h, W, 4);
      ctx.fillStyle = reste <= 5 ? O : Y; ctx.fillRect(0, h, W * Math.max(0, reste / duree), 4);
    }
    function agir() {
      if (clos) return;
      if (phase === "position") { phase = "angle"; t = 0; }
      else if (phase === "angle") { sim = creerLancer(posX, angle, debout, horloge); phase = "roule"; }
    }
    const surClic = e => { e.preventDefault(); cv.focus({ preventScroll: true }); agir(); };
    const surTouche = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); agir(); } };
    cv.addEventListener("pointerdown", surClic);
    cv.addEventListener("keydown", surTouche);
    // Les quatre chiffres de la partie pour le tableau final : flacons, strikes, spares, meilleure série.
    function chiffres() {
      const sommes = feuille.map(f => f[0] + (f[1] || 0)), x = feuille.filter(f => f[0] === 10).length, sp = feuille.filter(f => f.length === 2 && f[0] + f[1] === 10).length;
      return [[total, total > 1 ? "flacons renversés" : "flacon renversé"], [x, x > 1 ? "strikes" : "strike"], [sp, sp > 1 ? "spares" : "spare"], [Math.max(0, ...sommes) + "/10", "meilleure série"]];
    }
    function finir() {
      if (clos) return;
      clos = true; phase = "fin";
      setTimeout(() => { arret(); liberer(); opt.onFin(noteBowling(total), total === 10 * SERIES ? "Lot parfait : les " + total + " flacons sont tombés." : total + (total > 1 ? " flacons renversés" : " flacon renversé") + " sur " + 10 * SERIES + ".", total, chiffres()); }, 1100);
    }
    function dessiner() {
      ctx.fillStyle = "#F4F2F8"; ctx.fillRect(0, 0, W, HB);
      ctx.fillStyle = "#D8D3E3"; ctx.fillRect(0, 48, GAUCHE - 16, HB); ctx.fillRect(DROITE + 16, 48, W, HB); // bords
      ctx.fillStyle = N; ctx.fillRect(GAUCHE - 16, 48, 16, HB); ctx.fillRect(DROITE, 48, 16, HB);              // rigoles
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(GAUCHE, 48, DROITE - GAUCHE, HB);                                // paillasse
      ctx.strokeStyle = "rgba(38,7,109,.12)"; ctx.lineWidth = 2;
      for (let x = GAUCHE + 38; x < DROITE; x += 38) { ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, HB); ctx.stroke(); }
      ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(GAUCHE, DEPART - 26); ctx.lineTo(DROITE, DEPART - 26); ctx.stroke();
      const Q = sim ? sim.quilles : PLACES.map((p, i) => ({ x: p.x, y: p.y, la: debout[i], tombee: false, rot: 0 }));
      Q.forEach((q, i) => { if (q.la) { ctx.globalAlpha = q.tombee ? 0.55 : 1; flacon(ctx, q.x, q.y, q.tombee ? q.rot : 0, COUL[i]); ctx.globalAlpha = 1; } });
      // La seringue de garde, aiguille en avant dans le sens de la marche.
      const ts = sim ? sim.ts : horloge, L = REGL.sl;
      ctx.save(); ctx.translate(xSeringue(ts), REGL.sy); ctx.scale(Math.cos(ts * REGL.sv) < 0 ? -1 : 1, 1);
      trait(ctx, 2.4);
      ctx.beginPath(); ctx.moveTo(L - 16, 0); ctx.lineTo(L, 0); ctx.stroke();                              // aiguille
      ctx.beginPath(); ctx.moveTo(-L + 2, 0); ctx.lineTo(-L + 14, 0); ctx.moveTo(-L + 2, -RS); ctx.lineTo(-L + 2, RS); ctx.stroke(); // piston
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-L + 12, -RS, 2 * L - 28, 2 * RS, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = B; ctx.beginPath(); ctx.roundRect(-L + 30, -RS, 2 * L - 46, 2 * RS, [0, 3, 3, 0]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = N; ctx.fillRect(-L + 9, -RS - 3, 4, 2 * RS + 6);                                    // collerette
      ctx.restore();
      // La boule : un gros comprimé sécable.
      const b = sim ? sim.boule : { x: posX, y: DEPART, tour: 0 };
      if (!sim || !b.sortie) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tour || 0);
        trait(ctx, 3); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, RB, 0, 6.3); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, -RB + 1.5, -RB + 1.5, 2 * RB - 3, 2 * RB - 3);
        else { ctx.beginPath(); ctx.moveTo(-RB + 4, 0); ctx.lineTo(RB - 4, 0); ctx.stroke(); }
        ctx.restore();
      }
      if (phase === "position" || phase === "angle") {
        const a = (phase === "angle" ? angle : 0) * Math.PI / 180;
        ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.setLineDash([9, 8]);
        ctx.beginPath(); ctx.moveTo(posX, DEPART - 20); ctx.lineTo(posX + Math.sin(a) * 150, DEPART - 20 - Math.cos(a) * 150); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(60, HB - 30, 240, 24, 12); ctx.fill();
        texte(ctx, phase === "position" ? "Touchez pour fixer la position" : "Touchez pour fixer l'angle", 180, HB - 18, 13, Y);
      }
      ecran();
      if (annonceT > 0) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(60, 250, 240, 60, 16); ctx.fill(); texte(ctx, annonce, 180, 281, 24, Y); }
      if (phase === "fin") { ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(50, 230, 260, 100, 18); ctx.fill(); texte(ctx, noteBowling(total) + " / 10", 180, 268, 40, Y); texte(ctx, total + " flacons sur " + 10 * SERIES, 180, 306, 16, C); }
    }
    const arret = boucle(dt => {
      t += dt; annonceT -= dt; horloge += dt;
      if (phase === "position" || phase === "angle") {
        reste -= dt;
        if (phase === "position") posX = 180 + Math.sin(t * 2.5) * 100; else angle = Math.sin(t * 3.6) * 12;
        if (reste <= 0) { reste = 0; annonce = "Temps écoulé"; annonceT = 1; finir(); }
      } else if (phase === "roule") {
        for (let i = 0; i < 4; i++) pasLancer(sim, dt / 4);
        if (sim.fini) {
          const n = tombees(sim), pique = sim.boule.bloquee;
          sim.quilles.forEach((q, i) => { if (q.la && q.tombee) debout[i] = false; });
          total += n; aTerre += n; sim = null; (feuille[serie - 1] = feuille[serie - 1] || []).push(n);
          annonce = aTerre === 10 ? (lancerN === 1 ? "Strike !" : "Spare !") : pique ? "Piqué au vif !" : n === 0 ? "Dans le vide" : "+" + n; annonceT = 0.9;
          if (aTerre < 10 && lancerN === 1) { lancerN = 2; phase = "position"; t = 0; }
          else if (serie === SERIES) finir();
          else { serie++; lancerN = 1; aTerre = 0; debout.fill(true); phase = "position"; t = 0; } // série suivante : on redresse le lot
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { arret(); liberer(); };
  }

  /* ----- Le tennis de paillasse ----- */
  function tennis(el, opt) {
    const duree = opt.duree || 60, { cv, ctx, xDe, liberer } = monter(el, H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le tennis de paillasse. Glissez le doigt, bougez la souris ou utilisez les flèches gauche et droite pour déplacer la spatule et renvoyer le comprimé.");
    const s = creerTennis(), tactile = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    let clos = false, minuterie = 0, gauche = false, droite = false;
    // La balle porte le logo de l'unité ; tant que l'image n'est pas là (ou si elle manque), c'est un comprimé sécable.
    const logo = new Image(); logo.src = opt.logo || "img/logo-pharmacotechnie.webp";
    const viser = e => { e.preventDefault(); s.cible = borne(xDe(e), T_G + RT.demi, T_D - RT.demi); };
    const appui = e => { cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } viser(e); };
    const glisse = e => { if (e.pointerType === "mouse" || e.buttons || e.pressure) viser(e); };
    const fleche = (e, v) => {
      const g = e.key === "ArrowLeft", d = e.key === "ArrowRight";
      if (!g && !d) return;
      if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName || ""))) return;
      if (v) e.preventDefault();
      if (g) gauche = v; else droite = v;
    };
    const enfonce = e => fleche(e, true), leve = e => fleche(e, false), lache = () => { gauche = droite = false; }, menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", glisse); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", glisse); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
    };
    // Une spatule vue de dessus : la lame fait raquette, le manche part vers l'arrière (sens = 1 vers le bas).
    function spatule(x, y, demi, sens, coul, vif) {
      trait(ctx, 2.6);
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x - 5, sens > 0 ? y + 3 : y - 25, 10, 22, 4); ctx.fill();
      ctx.fillStyle = vif ? Y : coul; ctx.beginPath(); ctx.roundRect(x - demi, y - T_EP, demi * 2, T_EP * 2, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(38,7,109,.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - demi + 8, y); ctx.lineTo(x + demi - 8, y); ctx.stroke();
    }
    function dessiner() {
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, H);
      // Le terrain : un court vert bloc opératoire, lignes crème, tracé comme un vrai (couloirs, carrés de service).
      ctx.fillStyle = "#A9D9BE"; ctx.fillRect(T_G, T_HAUT, T_D - T_G, H - T_HAUT);                          // les dégagements
      ctx.fillStyle = "#A8D4EA"; ctx.fillRect(T_G, T_HAUT, T_D - T_G, 22);                     // derrière l'automate : la libération
      ctx.fillStyle = "#F3C5A5"; ctx.fillRect(T_G, H - 20, T_D - T_G, 20);                       // derrière le joueur : la quarantaine
      texte(ctx, "LIBÉRATION", 180, T_HAUT + 12, 10, "rgba(38,7,109,.6)"); texte(ctx, "QUARANTAINE", 180, H - 9, 10, "rgba(38,7,109,.6)");
      ctx.fillStyle = "#63B892"; ctx.fillRect(34, 100, 292, 322);                                           // le court
      ctx.fillStyle = "#57AD87"; ctx.fillRect(64, 180, 232, 162);                                           // les carrés de service, un ton plus soutenu
      // En filigrane dans les carrés de service : croix de pharmacie, gélule, comprimé sécable, flacon.
      ctx.save(); ctx.strokeStyle = "rgba(255,251,242,.32)"; ctx.fillStyle = "rgba(255,251,242,.32)"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.fillRect(115, 204, 14, 38); ctx.fillRect(103, 216, 38, 14);                                       // croix
      ctx.save(); ctx.translate(238, 223); ctx.rotate(-0.6); ctx.beginPath(); ctx.roundRect(-22, -9, 44, 18, 9); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke(); ctx.restore();   // gélule
      ctx.beginPath(); ctx.arc(122, 304, 17, 0, 6.3); ctx.moveTo(112, 304); ctx.lineTo(132, 304); ctx.stroke();                                                                  // comprimé
      ctx.beginPath(); ctx.roundRect(224, 296, 28, 30, 5); ctx.rect(231, 284, 14, 12); ctx.moveTo(224, 310); ctx.lineTo(252, 310); ctx.stroke();                                    // flacon
      ctx.restore();
      ctx.strokeStyle = C; ctx.lineWidth = 3; ctx.lineJoin = "miter"; ctx.lineCap = "butt"; ctx.beginPath();
      ctx.rect(34, 100, 292, 322);                                                                          // lignes de fond et de côté
      ctx.moveTo(64, 100); ctx.lineTo(64, 422); ctx.moveTo(296, 100); ctx.lineTo(296, 422);                   // couloirs
      ctx.moveTo(64, 180); ctx.lineTo(296, 180); ctx.moveTo(64, 342); ctx.lineTo(296, 342);                   // lignes de service
      ctx.moveTo(180, 180); ctx.lineTo(180, 342);                                                           // ligne médiane
      ctx.moveTo(180, 100); ctx.lineTo(180, 108); ctx.moveTo(180, 414); ctx.lineTo(180, 422);                 // marques centrales
      ctx.stroke();
      // Dans les couloirs, le marquage du lot, comme un panneau de bord de court.
      for (const [x, y, t] of [[311, 165, "LOT 2026-12"], [49, 357, "PÉR. 25/12/2026"]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2); texte(ctx, t, 0, 0, 9, "rgba(255,251,242,.75)"); ctx.restore(); }
      // Le filet : une réglette graduée posée en travers.
      trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.rect(T_G, 255, T_D - T_G, 12); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 1; i * 8 < T_D - T_G; i++) { ctx.moveTo(T_G + i * 8, 255); ctx.lineTo(T_G + i * 8, i % 5 ? 259 : 263); }
      ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(T_G + 4, 261, 5, 0, 6.3); ctx.arc(T_D - 4, 261, 5, 0, 6.3); ctx.fill();   // les poteaux
      // Le score, sur le côté du terrain : celui de l'automate au-dessus de la réglette, le vôtre en dessous.
      texte(ctx, "AUTOMATE", T_G + 8, 222, 9, "rgba(38,7,109,.7)", "left"); texte(ctx, String(s.contre), T_G + 8, 239, 22, N, "left");
      texte(ctx, String(s.pour), T_G + 8, 284, 22, N, "left"); texte(ctx, "VOUS", T_G + 8, 301, 9, "rgba(38,7,109,.7)", "left");
      // L'automate : un chariot sur son rail, qui tient sa spatule.
      trait(ctx, 3); ctx.beginPath(); ctx.moveTo(T_G, T_YA - 24); ctx.lineTo(T_D, T_YA - 24); ctx.stroke();
      const vifA = s.t - s.tape[1] < 0.12, vifJ = s.t - s.tape[0] < 0.12;
      spatule(s.ax, T_YA, RT.demiA, -1, V, vifA);
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(s.ax - 13, T_YA - 31, 26, 14, 4); ctx.fill();
      ctx.fillStyle = vifA ? Y : G; ctx.beginPath(); ctx.arc(s.ax - 5, T_YA - 24, 2.4, 0, 6.3); ctx.arc(s.ax + 5, T_YA - 24, 2.4, 0, 6.3); ctx.fill();
      spatule(s.x, T_YJ, RT.demi, 1, O, vifJ);
      // La balle : un comprimé sécable.
      if (s.balle) {
        const b = s.balle;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tour);
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, T_RB, 0, 6.3); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, -T_RB, -T_RB, T_RB * 2, T_RB * 2);
        else { ctx.beginPath(); ctx.moveTo(-T_RB + 3, 0); ctx.lineTo(T_RB - 3, 0); ctx.stroke(); }
        ctx.restore();
      } else if (!clos && s.t - s.msgT >= 1) texte(ctx, "Nouveau comprimé…", 180, 300, 14, "rgba(38,7,109,.6)");
      if (s.t < 4.5 && !clos) {
        ctx.globalAlpha = Math.min(1, 4.5 - s.t) * 0.92;
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(50, 366, 260, 28, 14); ctx.fill();
        texte(ctx, tactile ? "Glissez le doigt pour bouger la spatule" : "Souris ou flèches ◀ ▶ pour la spatule", 180, 381, 13, Y);
        ctx.globalAlpha = 1;
      }
      const n = noteTennis(s);
      bandeau(ctx, "Vous " + s.pour + " · Automate " + s.contre + " · " + n + "/10", duree - s.t, duree);
      if (!clos && s.t - s.msgT < 1) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(60, 140, 240, 40, 14); ctx.fill(); texte(ctx, s.msg, 180, 161, 17, s.msg.endsWith("!") ? Y : P); }
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 220, 40, Y); texte(ctx, s.pour + " gagnés sur " + (s.pour + s.contre) + " joués", 180, 262, 16, C); }
    }
    const arret = boucle(dt => {
      if (!clos) {
        if (gauche !== droite) s.cible = borne(s.x + (gauche ? -1 : 1) * RT.clavier * dt, T_G + RT.demi, T_D - RT.demi);
        pasTennis(s, dt, duree);
        if (s.fini) {
          clos = true; lache();
          const n = noteTennis(s), joues = s.pour + s.contre, pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.pour, "point gagné", "points gagnés") + " sur " + pl(joues, "joué", "joués") + " contre l'automate : " + n + " sur 10 (la note est la part des points gagnés).";
          // Les quatre chiffres du tableau final : points gagnés, points encaissés, renvois réussis, meilleure série de renvois dans un échange.
          const chiffres = [[s.pour, s.pour > 1 ? "points gagnés" : "point gagné"], [s.contre, s.contre > 1 ? "encaissés" : "encaissé"], [s.renvois, s.renvois > 1 ? "renvois réussis" : "renvoi réussi"], [s.suite, s.suite > 1 ? "renvois d'affilée" : "renvoi d'affilée"]];
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, joues ? Math.round(100 * s.pour / joues) * 100 + Math.min(99, s.pour) : 0, chiffres); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }

  /* ----- La hotte en folie ----- */
  function tir(el, opt) {
    const duree = opt.duree || 45, { cv, ctx, xDe, liberer } = monter(el, H);
    cv.setAttribute("aria-label", "La hotte en folie. Glissez le doigt ou utilisez les flèches pour déplacer la seringue : elle tire toute seule.");
    const s = creerTir(), calme = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let clos = false, gauche = false, droite = false;
    const viser = e => { e.preventDefault(); s.cible = Math.max(24, Math.min(W - 24, xDe(e))); };
    cv.addEventListener("pointerdown", e => { cv.focus({ preventScroll: true }); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); viser(e); });
    cv.addEventListener("pointermove", e => { if (e.pointerType === "mouse" || e.buttons || e.pressure) viser(e); });
    const touche = (e, v) => { if (e.key === "ArrowLeft") { gauche = v; e.preventDefault(); } else if (e.key === "ArrowRight") { droite = v; e.preventDefault(); } };
    cv.addEventListener("keydown", e => touche(e, true));
    cv.addEventListener("keyup", e => touche(e, false));
    function germe(g) {
      const c = [G, R, V][g.k];
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.y / 40);
      trait(ctx, 2.4);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * g.r * 0.8, Math.sin(a) * g.r * 0.8); ctx.lineTo(Math.cos(a) * (g.r + 5), Math.sin(a) * (g.r + 5)); ctx.stroke(); }
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(-g.r * 0.32, -g.r * 0.15, 2.2, 0, 6.3); ctx.arc(g.r * 0.32, -g.r * 0.15, 2.2, 0, 6.3); ctx.fill();
      ctx.restore();
    }
    // Les séries : un petit « ×N » à chaque touche d'affilée, et aux paliers un numéro en relief qui pivote, entouré de flacons en orbite.
    const PALIERS = [[5, "Geste sûr"], [10, "Asepsie parfaite"], [15, "Lot conforme"], [20, "Zone maîtrisée"], [30, "Classe A !"], [40, "Lot libéré !"]];
    const pops = [], gerbes = [];
    let tt = 0, combo = null, alerte = 9, serieVue = 0;
    // Après chaque pas du cœur : repérer les nouvelles touches et les paliers franchis.
    function suivre() {
      for (const e of s.eclats) {
        if (e.vu) continue;
        e.vu = true;
        if (e.k < 0) { alerte = 0; continue; }
        if (s.serie >= 2) pops.push({ x: e.x, y: e.y, n: s.serie, t: 0 });
        const p = PALIERS.find(q => serieVue < q[0] && s.serie >= q[0]);
        if (p) {
          combo = { n: p[0], mot: p[1], t: 0 };
          const pts = [];
          for (let i = 0; i < 22; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), v = 90 + Math.random() * 110; pts.push({ vx: Math.sin(b) * Math.cos(a) * v, vy: Math.cos(b) * v, vz: Math.sin(b) * Math.sin(a) * v, c: [Y, B, C, P][i % 4] }); }
          gerbes.push({ x: e.x, y: e.y, t: 0, pts });
        }
      }
      serieVue = s.serie;
    }
    function animer(dt) {
      tt += dt; alerte += dt;
      for (const p of pops) p.t += dt;
      for (const g of gerbes) g.t += dt;
      while (pops.length && pops[0].t > 0.7) pops.shift();
      while (gerbes.length && gerbes[0].t > 0.9) gerbes.shift();
      if (combo && (combo.t += dt) > 1.5) combo = null;
    }
    const quad = (pts, coul) => { ctx.fillStyle = coul; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); };
    const ligne = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    // Le décor : l'intérieur d'une hotte à flux laminaire, vu de face. Le fond de l'enceinte va de (44,74) à (316,396).
    function decor() {
      quad([[0, 39], [W, 39], [316, 74], [44, 74]], "#F8F6FD");                   // plafond : le filtre absolu
      quad([[0, 39], [44, 74], [44, 396], [0, 452]], "#D9D4EC");                  // paroi gauche
      quad([[W, 39], [316, 74], [316, 396], [W, 452]], "#D9D4EC");                // paroi droite
      ctx.fillStyle = "#E8E5F5"; ctx.fillRect(44, 74, 272, 322);                  // fond de l'enceinte
      const sol = ctx.createLinearGradient(0, 396, 0, 452); sol.addColorStop(0, "#CCC7DF"); sol.addColorStop(1, "#E4E1F0");
      quad([[44, 396], [316, 396], [W, 452], [0, 452]], sol);                     // plan de travail en inox
      ctx.strokeStyle = "rgba(38,7,109,.13)"; ctx.lineWidth = 1.2;
      for (let i = 0; i <= 8; i++) ligne(i * 45, 39, 44 + i * 34, 74);            // plis du filtre
      ligne(15, 51, 345, 51); ligne(30, 63, 330, 63);
      for (let i = 1; i < 8; i++) ligne(44 + i * 34, 396, i * 45, 452);           // rainures du plan de travail
      ligne(33, 410, 327, 410); ligne(18, 429, 342, 429);
      quad([[8, 60], [20, 70], [20, 410], [8, 428]], "rgba(255,251,242,.35)");    // reflets des vitres latérales
      quad([[W - 8, 60], [W - 20, 70], [W - 20, 410], [W - 8, 428]], "rgba(255,251,242,.35)");
      ctx.strokeStyle = "rgba(38,7,109,.3)"; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.strokeRect(44, 74, 272, 322);
      ligne(0, 39, 44, 74); ligne(W, 39, 316, 74); ligne(0, 452, 44, 396); ligne(W, 452, 316, 396);
      // Au fond : la potence et sa poche, la plaque de classe, trois flacons en attente.
      ctx.globalAlpha = 0.5;
      trait(ctx, 2.2); ligne(78, 396, 78, 132); ligne(78, 132, 104, 132); ligne(104, 132, 104, 142);
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(90, 142, 28, 42, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = B; ctx.beginPath(); ctx.roundRect(90, 160, 28, 24, [0, 0, 6, 6]); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(104, 184); ctx.bezierCurveTo(104, 230, 130, 220, 128, 262); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(214, 92, 84, 26, 5); ctx.fill(); ctx.stroke();
      texte(ctx, "ZAC · ISO 5", 256, 106, 11, N);
      flacon(ctx, 236, 384, 0, P); flacon(ctx, 258, 386, 0, Y); flacon(ctx, 284, 384, 0, V);
      ctx.globalAlpha = 1;
      // Le flux laminaire : des filets d'air qui descendent du filtre.
      ctx.strokeStyle = "rgba(38,7,109,.1)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { const x = 15 + i * 30, y = 80 + ((calme ? 0 : tt * 46) + i * 67 + j * 170) % 340; ligne(x, y, x, y + 16); }
    }
    // Un texte en relief qui pivote autour de son axe vertical : les tranches du fond d'abord, la face ensuite.
    function relief(t, px, a, face) {
      const c = Math.max(0.05, Math.cos(a)), si = Math.sin(a);
      for (let i = 7; i >= 0; i--) {
        ctx.save(); ctx.translate(-si * i * 1.6, i * 0.7); ctx.transform(c, si * 0.1, 0, 1, 0, 0);
        if (i) texte(ctx, t, 0, 0, px, N);
        else { ctx.font = "800 " + px + "px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; trait(ctx, 5); ctx.strokeText(t, 0, 0); ctx.fillStyle = face; ctx.fillText(t, 0, 0); }
        ctx.restore();
      }
    }
    function orbite(k, devant) {
      const t = combo.t, ray = 96 * Math.min(1, t / 0.4);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + (calme ? 0 : t * 4.2), z = Math.sin(a);
        if ((z > 0) !== devant) continue;
        const e = (0.62 + 0.3 * z) * k;
        ctx.save(); ctx.translate(Math.cos(a) * ray * k, z * 24 * k); ctx.scale(e, e); ctx.globalAlpha *= devant ? 1 : 0.55;
        flacon(ctx, 0, 0, calme ? 0 : a * 2, [O, Y, P, V][i % 4]);
        ctx.restore();
      }
    }
    function animations() {
      for (const g of gerbes) {                                                   // la gerbe : des gouttes projetées dans les trois dimensions
        ctx.globalAlpha = Math.max(0, 1 - g.t / 0.9);
        for (const p of g.pts) {
          const z = p.vz * g.t, k = 260 / (260 + z), x = g.x + p.vx * g.t * k, y = g.y + (p.vy * g.t + 160 * g.t * g.t) * k;
          ctx.fillStyle = p.c; trait(ctx, 1.6); ctx.beginPath(); ctx.arc(x, y, Math.max(1, 4.2 * k), 0, 6.3); ctx.fill(); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (!combo) return;
      const t = combo.t, e = Math.min(1, t / 0.45), rebond = 1 + 2.7 * Math.pow(e - 1, 3) + 1.7 * Math.pow(e - 1, 2);
      const a = calme ? 0 : (1 - rebond) * -1.45 + (t > 0.45 ? Math.sin((t - 0.45) * 6) * 0.22 : 0);
      const sortie = Math.max(0, (t - 1.15) / 0.35), k = (0.4 + 0.6 * Math.min(1, t / 0.3)) * (1 + (calme ? 0 : sortie * 0.9));
      ctx.save(); ctx.translate(180, 168); ctx.globalAlpha = Math.min(1, t / 0.12) * (1 - sortie);
      orbite(k, false);
      ctx.save(); ctx.scale(k, k); relief("×" + combo.n, 62, a, Y); ctx.restore();
      orbite(k, true);
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-88, 46 * k, 176, 28, 14); ctx.fill();
      texte(ctx, combo.mot, 0, 46 * k + 15, 16, C);
      ctx.restore();
    }
    function dessiner() {
      decor();
      animations();
      for (const t of s.tirs) { ctx.fillStyle = B; trait(ctx, 2); ctx.beginPath(); ctx.moveTo(t.x, t.y - 8); ctx.quadraticCurveTo(t.x + 5, t.y, t.x, t.y + 4); ctx.quadraticCurveTo(t.x - 5, t.y, t.x, t.y - 8); ctx.fill(); ctx.stroke(); }
      for (const g of s.germes) germe(g);
      for (const e of s.eclats) { const k = e.t / 0.45; ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.k < 0 ? R : Y; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 8 + k * 22, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
      for (const p of pops) {                                                     // « ×N » qui s'élève de la particule touchée
        const k = p.t / 0.7, g = 1 + 0.5 * Math.sin(Math.min(1, k * 3) * Math.PI);
        ctx.save(); ctx.translate(Math.max(30, Math.min(W - 30, p.x)), p.y - 14 - k * 30); ctx.scale(g, g); ctx.globalAlpha = 1 - k * k;
        ctx.font = "800 17px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; trait(ctx, 4); ctx.strokeText("×" + p.n, 0, 0); ctx.fillStyle = Y; ctx.fillText("×" + p.n, 0, 0);
        ctx.restore();
      }
      // Le bandeau de commande de la hotte : voyant du flux à gauche, série en cours à droite.
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(0, 452, W, H - 452);
      ctx.strokeStyle = N; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 452); ctx.lineTo(W, 452); ctx.stroke();
      const rouge = alerte < 0.6;
      trait(ctx, 2); ctx.fillStyle = rouge ? R : G; ctx.beginPath(); ctx.arc(18, 467, 6, 0, 6.3); ctx.fill(); ctx.stroke();
      texte(ctx, rouge ? "Contamination !" : "Flux conforme", 31, 468, 12, N, "left");
      if (s.serie >= 2) texte(ctx, "Série ×" + s.serie, W - 12, 468, 13, N, "right");
      // La seringue, pointe en l'air.
      ctx.save(); ctx.translate(s.x, 430); trait(ctx, 2.6);
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-9, -12, 18, 30, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = O; ctx.fillRect(-7.5, 2, 15, 14);
      ctx.fillStyle = N; ctx.fillRect(-2, -24, 4, 12); ctx.beginPath(); ctx.roundRect(-13, 18, 26, 5, 2); ctx.fill();
      ctx.restore();
      bandeau(ctx, s.touches + " neutralisées · " + s.rates + " passées", duree - s.t, duree);
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, noteTir(s) + " / 10", 180, 220, 40, Y); texte(ctx, s.touches + " particules sur " + TOTAL, 180, 262, 16, C); }
    }
    const arret = boucle(dt => {
      if (!clos) {
        if (gauche) s.cible = Math.max(24, s.x - 60); if (droite) s.cible = Math.min(W - 24, s.x + 60);
        pasTir(s, dt, duree);
        suivre();
        if (s.fini) { clos = true; setTimeout(() => { arret(); liberer(); opt.onFin(noteTir(s), s.touches + " particules neutralisées sur " + TOTAL + ".", s.touches, [[s.touches + "/" + TOTAL, s.touches > 1 ? "neutralisées" : "neutralisée"], [s.rates, s.rates > 1 ? "passées" : "passée"], [(s.gouttes ? Math.round(100 * s.touches / s.gouttes) : 0) + " %", "de précision"], [s.record, "d'affilée"]]); }, 1300); }
      }
      animer(dt);
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { arret(); liberer(); };
  }

  /* ----- Le flipper du préparatoire ----- */
  // Un chiffre à sept segments, comme sur les afficheurs des vieilles bornes.
  const SEG = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F];
  function chiffre(ctx, x, y, w, h, n, coul) {
    const e = 2.4, m = h / 2, T = [[x + e, y, w - 2 * e, e], [x + w - e, y + e, e, m - 1.5 * e], [x + w - e, y + m + e / 2, e, m - 1.5 * e], [x + e, y + h - e, w - 2 * e, e], [x, y + m + e / 2, e, m - 1.5 * e], [x, y + e, e, m - 1.5 * e], [x + e, y + m - e / 2, w - 2 * e, e]];
    T.forEach((r, i) => { ctx.fillStyle = n >= 0 && SEG[n] >> i & 1 ? coul : "rgba(255,251,242,.07)"; ctx.fillRect(r[0], r[1], r[2], r[3]); });
  }
  // Une goutte, pointe au centre et ventre vers l'extérieur : le pétale de la fleur du logo.
  function goutte(ctx, ang, r0, r1, larg, coul) {
    ctx.save(); ctx.rotate(ang); ctx.fillStyle = coul; ctx.beginPath(); ctx.moveTo(r0, 0);
    ctx.bezierCurveTo(r0 + (r1 - r0) * 0.5, -larg * 0.15, r1 + larg * 0.1, -larg, r1, 0);
    ctx.bezierCurveTo(r1 + larg * 0.1, larg, r0 + (r1 - r0) * 0.5, larg * 0.15, r0, 0);
    ctx.fill(); ctx.restore();
  }
  function flipper(el, opt) {
    const duree = opt.duree || 60, { cv, ctx, xDe, liberer } = monter(el, F_H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le flipper du préparatoire. Batteur gauche : flèche gauche, touche S ou moitié gauche de l'écran. Batteur droit : flèche droite, touche L ou moitié droite. Secouer la table, trois fois par partie : barre d'espace, ou toucher l'afficheur en haut.");
    const s = creerFlipper(), media = q => typeof matchMedia === "function" && matchMedia(q).matches, tactile = media("(pointer: coarse)"), calme = media("(prefers-reduced-motion: reduce)");
    const logo = new Image(); logo.src = api._logo;
    let clos = false, minuterie = 0, tFin = 0, affiche = 0, vu = null, secousse = 0, eclair = 0;
    const etincelles = [], bulles = [];
    const doigts = new Map(), touches = { g: false, d: false };
    const maj = () => { let g = touches.g, d = touches.d; doigts.forEach(c => { if (c === "g") g = true; else d = true; }); s.g = g; s.d = d; };
    const secouer = () => { if (secouerFlipper(s)) { doigts.clear(); touches.g = touches.d = false; eclair = 0.3; if (!calme) secousse = 0.3; } };
    const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); const r = cv.getBoundingClientRect(); if ((e.clientY - r.top) / r.height * F_H < 47) { secouer(); return; } try { cv.setPointerCapture(e.pointerId); } catch (_) { } doigts.set(e.pointerId, xDe(e) < W / 2 ? "g" : "d"); maj(); };
    const relache = e => { doigts.delete(e.pointerId); maj(); };
    const cote = e => { const k = e.key; return k === "ArrowLeft" || k === "s" || k === "S" ? "g" : k === "ArrowRight" || k === "l" || k === "L" ? "d" : null; };
    const enfonce = e => { if ((e.key === " " || e.key === "ArrowUp") && !e.repeat && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target && e.target.tagName || "")) { e.preventDefault(); secouer(); return; } const c = cote(e); if (!c || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName || "")) return; e.preventDefault(); touches[c] = true; maj(); };
    const leve = e => { const c = cote(e); if (c) { touches[c] = false; maj(); } };
    const lache = () => { doigts.clear(); touches.g = touches.d = false; maj(); };
    const menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointerup", relache); cv.addEventListener("pointercancel", relache); cv.addEventListener("lostpointercapture", relache); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointerup", relache); cv.removeEventListener("pointercancel", relache); cv.removeEventListener("lostpointercapture", relache); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
    };
    const COUL = [O, P, V, G], FETE = [O, Y, P, V, C];
    // Les effets : chaque touche lance des gouttelettes, et une série qui s'allonge fait monter le spectacle.
    function effets(dt) {
      if (s.choc && s.choc !== vu) {
        vu = s.choc;
        const n = vu.n, k = Math.min(3 + n * 2, 16);
        for (let i = 0; i < k; i++) { const a = Math.random() * 6.283, v = 60 + Math.random() * (60 + n * 14); etincelles.push({ x: vu.x, y: vu.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, c: FETE[(i + n) % FETE.length] }); }
        if (n >= 3) bulles.push({ x: Math.max(40, Math.min(W - 40, vu.x)), y: vu.y, t: 0, n, onde: n === 3 || n === 5 || n >= 8 });
        if (n === 5 || n >= 8) { eclair = 0.35; if (!calme) secousse = 0.18; }
      }
      for (const e of etincelles) { e.t += dt; e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }
      for (const b of bulles) b.t += dt;
      while (etincelles.length && etincelles[0].t > 0.55) etincelles.shift();
      while (bulles.length && bulles[0].t > 0.9) bulles.shift();
      if (etincelles.length > 90) etincelles.splice(0, etincelles.length - 90);
      secousse -= dt; eclair -= dt;
      affiche += (s.score - affiche) * Math.min(1, dt * 9); if (Math.abs(s.score - affiche) < 0.6) affiche = s.score;
    }
    const enSerie = () => s.serie >= 3 && s.t - s.serieT < RF.delai;
    // L'afficheur en tête de plateau : score et chrono en sept segments, messages défilants, guirlande de lampes.
    function afficheur() {
      const reste = Math.max(0, duree - s.t);
      ctx.fillStyle = "#12033A"; ctx.fillRect(0, 0, W, 47);
      ctx.fillStyle = "#1D0A52"; ctx.beginPath(); ctx.roundRect(4, 4, 104, 32, 5); ctx.roundRect(112, 4, 198, 32, 5); ctx.roundRect(314, 4, 42, 32, 5); ctx.fill();
      const neuf = Math.round(affiche) !== s.score, sc = String(Math.max(0, Math.round(affiche))).padStart(6, " ");
      for (let i = 0; i < 6; i++) chiffre(ctx, 10 + i * 16, 9, 11, 22, sc[i] === " " ? -1 : +sc[i], neuf ? C : Y);
      const sec = String(Math.ceil(reste)).padStart(2, " "), alerte = reste <= 5 && !clos;
      for (let i = 0; i < 2; i++) chiffre(ctx, 320 + i * 16, 9, 11, 22, sec[i] === " " ? -1 : +sec[i], alerte ? (Math.floor(s.t * 4) % 2 ? O : R) : C);
      // Le message : un événement, une série en cours, ou sinon un tour d'horizon qui défile.
      let msg, coul = Y, dx = 0, clign = false;
      if (clos) { msg = "LOT CONTRÔLÉ"; clign = true; }
      else if (s.t - s.msgT < 1.5) { msg = s.msg.toUpperCase(); coul = s.msg.indexOf("perdue") > 0 || s.msg.indexOf("Tilt") === 0 ? O : "#7BE0B0"; clign = true; }
      else if (enSerie()) { msg = (s.serie >= 8 ? "CADENCE DE PROD ×" : s.serie >= 5 ? "BELLE SÉRIE ×" : "COMBO ×") + s.serie; coul = FETE[s.serie % 4]; dx = calme ? 0 : Math.sin(s.t * 30) * 1.5; }
      else {
        const tour = ["NOTE " + noteFlipper(s) + "/10", "LOT " + s.lot.filter(Boolean).length + "/5", "PHARMACOGAMES", s.tilts < RF.tilts ? (tactile ? "SECOUER : ICI" : "SECOUER : ESPACE") : "TILT ÉPUISÉ"], k = s.t / 2.6, f = k % 1;
        msg = tour[Math.floor(k) % tour.length]; dx = calme ? 0 : f < 0.14 ? (1 - f / 0.14) * 190 : f > 0.9 ? -(f - 0.9) / 0.1 * 190 : 0;
      }
      ctx.save(); ctx.beginPath(); ctx.rect(114, 5, 194, 30); ctx.clip();
      if (!clign || Math.floor(s.t * 6) % 3) { ctx.font = "800 15px 'Courier New',monospace"; ctx.fillStyle = coul; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(msg, 211 + dx, 21, 186); }
      ctx.fillStyle = "rgba(18,3,58,.5)"; for (let y = 6; y < 35; y += 2.5) ctx.fillRect(114, y, 194, 0.9);        // trame de l'écran
      ctx.restore();
      const N_L = 36, allume = Math.ceil(N_L * reste / duree), pas = Math.floor(s.t * 7);
      for (let i = 0; i < N_L; i++) {
        const on = i < allume, fete = enSerie() || eclair > 0;
        ctx.fillStyle = !on ? "rgba(255,251,242,.14)" : fete ? FETE[(i + pas) % 4] : alerte ? (pas % 2 ? O : R) : (i + pas) % 4 === 0 && !calme ? C : Y;
        ctx.beginPath(); ctx.arc(5 + i * 10, 42, 2.3, 0, 6.3); ctx.fill();
      }
    }
    // Le score final, au cœur d'une fleur de gouttes qui s'ouvre.
    function fleur() {
      const n = noteFlipper(s), cx = 180, cy = 292, tons = [N, Y, O, P, N, Y, P, O, N, O, Y, P];
      ctx.fillStyle = "rgba(38,7,109,.55)"; ctx.fillRect(0, 47, W, F_H - 47);
      const fond = Math.min(1, tFin / 0.25);
      trait(ctx, 3); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(cx, cy, 122 * fond, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(calme ? 0 : tFin * 0.25);
      for (let i = 0; i < 30; i++) {
        const u = calme ? 1 : Math.max(0, Math.min(1, (tFin - 0.1 - i * 0.012) / 0.35)), k = u === 0 ? 0 : 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
        const long = 62 + (i * 37 % 5) * 12, larg = 9 + (i * 53 % 4) * 3.5;
        if (k > 0) goutte(ctx, i * 6.283 / 30 + (i % 3) * 0.05, 44, 44 + long * 0.66 * k, larg * k, tons[i % tons.length]);
      }
      ctx.restore();
      trait(ctx, 3); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 6.3); ctx.fill(); ctx.stroke();
      texte(ctx, String(n), cx, cy - 5, 38, N); texte(ctx, "sur 10", cx, cy + 22, 12, N);
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(90, 432, 180, 30, 15); ctx.fill();
      texte(ctx, s.score + (s.score > 1 ? " points" : " point") + " au compteur", 180, 448, 14, Y);
    }
    // Le décor ne bouge pas : il est peint une fois, puis recopié à chaque image.
    const fond = document.createElement("canvas"); fond.width = W * 2; fond.height = F_H * 2;
    const PLATEAU = [[10, 110], [70, 49], [290, 49], [350, 110], [350, F_BAS], [256, 488], [240, F_H], [120, F_H], [104, 488], [10, F_BAS]];
    function decor() {
      const g = fond.getContext("2d"); g.setTransform(2, 0, 0, 2, 0, 0);
      const tracer = () => { g.beginPath(); PLATEAU.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
      // La caisse, avec son tablier rayé en bas.
      g.fillStyle = "#1A0550"; g.fillRect(0, 0, W, F_H);
      g.save(); g.beginPath(); g.rect(0, F_BAS, W, F_H - F_BAS); g.clip();
      g.strokeStyle = "rgba(236,119,57,.5)"; g.lineWidth = 7; for (let x = -F_H; x < W; x += 22) { g.beginPath(); g.moveTo(x, F_H); g.lineTo(x + 170, F_BAS); g.stroke(); }
      g.restore();
      // Le plateau : un dégradé de nuit, des rayons, et la fleur de gouttes du logo autour du bouchon central.
      const d = g.createLinearGradient(0, 49, 0, F_H); d.addColorStop(0, "#5B37C4"); d.addColorStop(0.55, "#3A1B92"); d.addColorStop(1, "#28106C");
      tracer(); g.fillStyle = d; g.fill();
      g.save(); tracer(); g.clip();
      g.translate(180, 238);
      for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? "rgba(255,251,242,.055)" : "rgba(38,7,109,.12)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 420, i * Math.PI / 9, (i + 1) * Math.PI / 9); g.fill(); }
      g.globalAlpha = 0.5; const tons = [O, Y, P, V, Y, O, P, V];
      for (let i = 0; i < 24; i++) goutte(g, i * 6.283 / 24 + (i % 3) * 0.06, 30, 62 + (i * 37 % 5) * 11, 8 + (i * 53 % 4) * 3, tons[i % tons.length]);
      g.globalAlpha = 1; g.setTransform(2, 0, 0, 2, 0, 0);
      // Des noyaux aromatiques, un flacon, une seringue et une gélule, comme sérigraphiés sur le bois.
      g.strokeStyle = "rgba(255,251,242,.2)"; g.lineWidth = 1.6; g.lineJoin = "round";
      for (const [x, y, r] of [[62, 96, 15], [88, 111, 15], [298, 96, 15], [272, 111, 15], [58, 470, 12], [302, 470, 12]]) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; k ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.55, 0, 6.3); g.stroke(); }
      g.strokeStyle = "rgba(255,251,242,.3)"; g.lineWidth = 2;
      g.save(); g.translate(70, 228); g.rotate(-0.2); g.beginPath(); g.roundRect(-13, -12, 26, 34, 5); g.roundRect(-7, -20, 14, 8, 2); g.moveTo(-13, 2); g.lineTo(13, 2); g.moveTo(-13, 14); g.lineTo(13, 14); g.stroke(); g.restore();
      g.save(); g.translate(292, 232); g.rotate(0.55); g.beginPath(); g.roundRect(-8, -22, 16, 40, 3); g.moveTo(0, 18); g.lineTo(0, 34); g.moveTo(-12, -22); g.lineTo(12, -22); g.moveTo(0, -22); g.lineTo(0, -34); g.moveTo(-8, -34); g.lineTo(8, -34); g.moveTo(-8, -6); g.lineTo(-2, -6); g.moveTo(-8, 4); g.lineTo(-2, 4); g.stroke(); g.restore();
      g.save(); g.translate(180, 440); g.rotate(-0.5); g.beginPath(); g.roundRect(-20, -8, 40, 16, 8); g.moveTo(0, -8); g.lineTo(0, 8); g.stroke(); g.restore();
      // Les halos sous les bouchons, les logements des témoins du lot.
      for (const o of F_BOUCHONS) { const h = g.createRadialGradient(o.x, o.y, o.r, o.x, o.y, o.r + 16); h.addColorStop(0, "rgba(236,213,103,.45)"); h.addColorStop(1, "rgba(236,213,103,0)"); g.fillStyle = h; g.beginPath(); g.arc(o.x, o.y, o.r + 16, 0, 6.3); g.fill(); }
      g.fillStyle = "rgba(18,3,58,.55)"; g.beginPath(); g.roundRect(128, 80, 104, 42, 12); g.fill();
      texte(g, "LOT", 180, 92, 12, "rgba(255,251,242,.75)");
      // Le bac des DASRI, bordé de jaune et de violet.
      g.fillStyle = "#12033A"; g.fillRect(104, 528, 152, 32);
      for (let x = 100; x < 260; x += 16) { g.fillStyle = Y; g.beginPath(); g.moveTo(x, 528); g.lineTo(x + 8, 528); g.lineTo(x + 2, 536); g.lineTo(x - 6, 536); g.fill(); }
      texte(g, "DASRI", 180, 549, 11, "rgba(255,251,242,.6)");
      g.restore();
      // Les rails chromés.
      g.lineCap = "round"; g.lineJoin = "round";
      for (const [coul, larg] of [["#12033A", 8], ["#BEB7D6", 4.5], ["rgba(255,255,255,.85)", 1.3]]) { g.strokeStyle = coul; g.lineWidth = larg; g.beginPath(); F_MURS.forEach(m => { g.moveTo(m[0], m[1]); g.lineTo(m[2], m[3]); }); g.stroke(); }
      // Les deux distributeurs de billes et les cartons du tablier.
      g.fillStyle = "#BEB7D6"; g.strokeStyle = "#12033A"; g.lineWidth = 2; g.beginPath(); g.roundRect(15, 84, 26, 9, 3); g.roundRect(319, 84, 26, 9, 3); g.fill(); g.stroke();
      for (const [x, mot] of [[14, "TILT ×" + RF.tilts], [282, "LOT ×5"]]) { g.fillStyle = C; g.beginPath(); g.roundRect(x, 522, 64, 26, 6); g.fill(); g.stroke(); texte(g, mot, x + 32, 536, 12, N); }
      for (const [x, y] of [[22, 62], [42, 52], [338, 62], [318, 52]]) { g.fillStyle = Y; g.beginPath(); g.arc(x, y, 2.5, 0, 6.3); g.fill(); }
    }
    decor();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!clos) decor(); });
    function dessiner() {
      ctx.fillStyle = "#1A0550"; ctx.fillRect(0, 0, W, F_H);
      ctx.save();
      if (secousse > 0) ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
      ctx.drawImage(fond, 0, 0, W, F_H);
      if (eclair > 0) { ctx.strokeStyle = FETE[Math.floor(s.t * 14) % 4]; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); F_MURS.forEach(m => { ctx.moveTo(m[0], m[1]); ctx.lineTo(m[2], m[3]); }); ctx.stroke(); }
      // Les témoins du lot et les flèches qui désignent les étiquettes encore à coller.
      s.lot.forEach((v, i) => { ctx.fillStyle = v ? "#7BE0B0" : "rgba(255,251,242,.16)"; ctx.beginPath(); ctx.arc(148 + i * 16, 108, 5, 0, 6.3); ctx.fill(); if (v) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(146.5 + i * 16, 106.5, 1.6, 0, 6.3); ctx.fill(); } });
      const bat = Math.floor(s.t * 3) % 2;
      [[34, 181, -1], [34, 248, -1], [326, 181, 1], [326, 248, 1]].forEach((f, k) => {
        const i = k < 2 ? k : k + 1; ctx.fillStyle = s.lot[i] ? "rgba(255,251,242,.1)" : bat ? Y : "rgba(236,213,103,.45)";
        ctx.beginPath(); ctx.moveTo(f[0] + f[2] * 6, f[1]); ctx.lineTo(f[0] - f[2] * 5, f[1] - 7); ctx.lineTo(f[0] - f[2] * 5, f[1] + 7); ctx.fill();
      });
      ctx.fillStyle = s.lot[2] ? "rgba(255,251,242,.1)" : bat ? Y : "rgba(236,213,103,.45)"; ctx.beginPath(); ctx.moveTo(180, 66); ctx.lineTo(173, 76); ctx.lineTo(187, 76); ctx.fill();
      // Les étiquettes : blanches, puis vertes une fois collées.
      F_ETIQ.forEach((m, i) => {
        const hz = m[1] === m[3];
        trait(ctx, 2); ctx.fillStyle = s.lot[i] ? "#7BE0B0" : C; ctx.beginPath();
        if (hz) ctx.roundRect(m[0] - 3, m[1] - 4, m[2] - m[0] + 6, 8, 3); else ctx.roundRect(m[0] - 4, m[1] - 3, 8, m[3] - m[1] + 6, 3);
        ctx.fill(); ctx.stroke();
      });
      // Les frondes : un triangle de plastique et son élastique, qui claque quand la bille le touche.
      F_FRONDES.forEach((f, i) => {
        const k = Math.max(0, 1 - (s.t - s.frondeT[i]) / 0.18);
        trait(ctx, 2.6); ctx.fillStyle = k > 0 ? Y : O; ctx.beginPath(); ctx.moveTo(f.a[0], f.a[1]); ctx.lineTo(f.b[0], f.b[1]); ctx.lineTo(f.c[0], f.c[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        const mx = (f.a[0] + f.c[0]) / 2 + f.n[0] * (2 + k * 7), my = (f.a[1] + f.c[1]) / 2 + f.n[1] * (2 + k * 7);
        ctx.strokeStyle = C; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(f.a[0], f.a[1]); ctx.quadraticCurveTo(mx, my, f.c[0], f.c[1]); ctx.stroke();
        for (const p of [f.a, f.b, f.c]) { ctx.fillStyle = "#BEB7D6"; ctx.strokeStyle = N; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p[0], p[1], 3.4, 0, 6.3); ctx.fill(); ctx.stroke(); }
      });
      for (const o of F_PLOTS) { trait(ctx, 2); ctx.fillStyle = P; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#BEB7D6"; ctx.beginPath(); ctx.arc(o.x, o.y, 2.6, 0, 6.3); ctx.fill(); }
      // Les bouchons : ils renvoient la bille, et portent le logo de la pharmacotechnie.
      F_BOUCHONS.forEach((o, i) => {
        const k = Math.max(0, 1 - (s.t - s.tape[i]) / 0.3), r = o.r + k * 3, ri = r - 4;
        if (k > 0) { ctx.fillStyle = "rgba(236,213,103," + (0.5 * k) + ")"; ctx.beginPath(); ctx.arc(o.x, o.y, r + 12, 0, 6.3); ctx.fill(); }
        trait(ctx, 3); ctx.fillStyle = k > 0 ? Y : COUL[i % COUL.length]; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y, ri, 0, 6.3); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) {
          ctx.save(); ctx.translate(o.x, o.y); if (!calme) ctx.rotate(k * k * (i % 2 ? -1.6 : 1.6));
          ctx.beginPath(); ctx.arc(0, 0, ri - 1, 0, 6.3); ctx.clip(); ctx.drawImage(logo, -ri + 0.5, -ri + 0.5, ri * 2 - 1, ri * 2 - 1); ctx.restore();
        } else texte(ctx, "P", o.x, o.y + 1, o.r, N);
      });
      // Les batteurs.
      for (let i = 0; i < 2; i++) {
        const p = F_PIVOTS[i], bout = boutBatteur(i, s.ang[i]);
        ctx.lineCap = "round"; ctx.strokeStyle = "#12033A"; ctx.lineWidth = F_EP * 2 + 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(bout[0], bout[1]); ctx.stroke();
        ctx.strokeStyle = O; ctx.lineWidth = F_EP * 2 - 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(bout[0], bout[1]); ctx.stroke();
        ctx.strokeStyle = "rgba(255,251,242,.55)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y - 2.2); ctx.lineTo(bout[0], bout[1] - 2.2); ctx.stroke();
        ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill();
      }
      for (const e of etincelles) { ctx.globalAlpha = 1 - e.t / 0.55; ctx.fillStyle = e.c; ctx.beginPath(); ctx.arc(e.x, e.y, 3.2 - e.t * 3, 0, 6.3); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const b of bulles) {
        const u = b.t / 0.9, px = Math.min(30, 15 + b.n * 1.6) * (u < 0.15 ? 0.6 + u / 0.15 * 0.6 : 1.2 - Math.min(0.2, (u - 0.15) * 0.8));
        if (b.onde) { ctx.globalAlpha = 1 - u; ctx.strokeStyle = FETE[b.n % 4]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(b.x, b.y, 12 + u * 70, 0, 6.3); ctx.stroke(); }
        ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
        ctx.font = "800 " + px + "px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
        ctx.strokeStyle = "#12033A"; ctx.lineWidth = 5; ctx.strokeText("×" + b.n, b.x, b.y - 18 - u * 26); ctx.fillStyle = FETE[b.n % 4]; ctx.fillText("×" + b.n, b.x, b.y - 18 - u * 26);
      }
      ctx.globalAlpha = 1;
      if (s.bille) {
        const b = s.bille, r = ctx.createRadialGradient(b.x - 2.5, b.y - 3, 1, b.x, b.y, F_RB);
        r.addColorStop(0, "#FFFFFF"); r.addColorStop(0.55, "#D9D4E8"); r.addColorStop(1, "#8F86B4");
        ctx.fillStyle = "rgba(18,3,58,.35)"; ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, F_RB, 0, 6.3); ctx.fill();
        ctx.fillStyle = r; ctx.strokeStyle = "#12033A"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x, b.y, F_RB, 0, 6.3); ctx.fill(); ctx.stroke();
      } else if (!clos) texte(ctx, "Nouvelle bille…", 180, 406, 14, "rgba(255,251,242,.8)");
      if (s.t < 5 && !clos) {
        ctx.globalAlpha = Math.min(1, 5 - s.t) * 0.92;
        ctx.fillStyle = "#12033A"; ctx.beginPath(); ctx.roundRect(16, 286, 150, 28, 14); ctx.roundRect(194, 286, 150, 28, 14); ctx.roundRect(70, 320, 220, 26, 13); ctx.fill();
        texte(ctx, tactile ? "Touchez à gauche" : "Gauche : ◀ ou S", 91, 301, 13, Y); texte(ctx, tactile ? "Touchez à droite" : "Droite : ▶ ou L", 269, 301, 13, Y);
        texte(ctx, tactile ? "Bloqué ? Touchez l'afficheur" : "Bloqué ? Espace pour secouer", 180, 334, 12, C);
        ctx.globalAlpha = 1;
      }
      if (!clos && !s.bille && s.t - s.msgT < 1) { ctx.fillStyle = "rgba(18,3,58,.88)"; ctx.beginPath(); ctx.roundRect(70, 430, 220, 36, 14); ctx.fill(); texte(ctx, s.msg, 180, 449, 16, Y); }
      ctx.restore();
      if (clos) fleur();
      afficheur();
    }
    const arret = boucle(dt => {
      if (!clos) {
        pasFlipper(s, dt, duree);
        if (s.fini) {
          clos = true; lache();
          const n = noteFlipper(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.score, "point", "points") + " : " + n + " sur 10 (1 point de note par tranche de " + RF.palier + " points). " + pl(s.lots, "lot libéré", "lots libérés") + ", " + pl(s.pertes, "bille perdue", "billes perdues") + ".";
          const chiffres = [[s.score, s.score > 1 ? "points" : "point"], [s.lots, s.lots > 1 ? "lots libérés" : "lot libéré"], ["×" + (s.serieMax || 0), "meilleure série"], [s.pertes, s.pertes > 1 ? "billes perdues" : "bille perdue"]];
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, Math.round(s.score)), chiffres); }, 2200);
        }
      } else tFin += dt;
      effets(dt);
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }

  /* ----- Le labyrinthe de la ZAC ----- */
  function labyrinthe(el, opt) {
    const duree = opt.duree || 60, { cv, ctx, liberer } = monter(el, H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le labyrinthe de la ZAC. Guidez le logo de la pharmacotechnie avec les flèches ou les touches Z, Q, S, D, ou en glissant le doigt dans la direction voulue. Ramassez les étiquettes, évitez les germes.");
    const s = creerLaby(), tactile = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const T = 24, Y0 = 44, cx = c => c * T + T / 2, cy = r => Y0 + r * T + T / 2;
    let clos = false, minuterie = 0, ancre = null;
    const TOUCHES = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, z: 0, w: 0, d: 1, s: 2, q: 3, a: 3 };
    const enfonce = e => {
      const d = TOUCHES[e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (d === undefined || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName || "")) return;
      e.preventDefault(); s.j.veut = d;
    };
    // Au doigt ou à la souris : un glissement donne la direction (plusieurs virages possibles sans lever le doigt) ;
    // un simple appui vise le point touché par rapport au préparateur.
    const point = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.width * W]; };
    const vers = (dx, dy) => { s.j.veut = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); };
    const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } const p = point(e); ancre = { id: e.pointerId, x: p[0], y: p[1], glisse: false }; };
    const bouge = e => {
      if (!ancre || e.pointerId !== ancre.id) return;
      const p = point(e), dx = p[0] - ancre.x, dy = p[1] - ancre.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 16) { vers(dx, dy); ancre.x = p[0]; ancre.y = p[1]; ancre.glisse = true; }
    };
    const relache = e => {
      if (!ancre || e.pointerId !== ancre.id) return;
      if (!ancre.glisse && e.type === "pointerup") { const q = lPos(s.j), dx = ancre.x - cx(q[0]), dy = ancre.y - cy(q[1]); if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) vers(dx, dy); }
      ancre = null;
    };
    const menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", bouge); cv.addEventListener("pointerup", relache); cv.addEventListener("pointercancel", relache); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", bouge); cv.removeEventListener("pointerup", relache); cv.removeEventListener("pointercancel", relache); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce);
    };
    // Les cloisons : un trait épais d'un centre de case pleine à l'autre, tracé une fois pour toutes.
    const cloisons = new Path2D();
    for (let r = 0; r < L_NR; r++) for (let c = 0; c < L_NC; c++) if (!lOuvert(c, r)) {
      cloisons.moveTo(cx(c), cy(r)); cloisons.lineTo(cx(c), cy(r));
      if (c + 1 < L_NC && !lOuvert(c + 1, r)) { cloisons.moveTo(cx(c), cy(r)); cloisons.lineTo(cx(c + 1), cy(r)); }
      if (r + 1 < L_NR && !lOuvert(c, r + 1)) { cloisons.moveTo(cx(c), cy(r)); cloisons.lineTo(cx(c), cy(r + 1)); }
    }
    // Le logo de la pharmacotechnie (img/logo-p.png, réduit à 88 px) : c'est lui que l'on guide, il roule en avançant.
    const logo = new Image(); let roule = 0, vieux = null;
    logo.src = "data:image/webp;base64,UklGRoILAABXRUJQVlA4IHYLAAAQMACdASpYAFgAPk0cjEQioaEZWw6oKATEtgBbQhDjl+E83Kv/1v8N8gsZLr+/Ufcr8Ff0g91XmAfrH0kfMB+236q+7L/pf1d91n03fIB/Rv8r1k3oHfsB6bXsf/uN+7XtZZpv/Ru0v+y+HPiV8pe4fLfiQfG/sH+E/Mv+0/tB8ed7PwH1AvU3+X3scAH1X/2v5mec7/D+hH1E/yv5M/QB/LP5//mvzF5nb7F6gH8l/qH/P/yf5S/HR/wf4v0Dfnv+C/7f+L/xHyFfy/+q/7b+7e1x7RvRu/aZy1/Aa+Nj0lsy7pgX2FPG6M5hkxnD8xHUHU3or/ha5lOl7axkvST+XdNiUfUopqUgegBrrXT+PjqCl4xjE+I/Ozj9Pwta/y1H9z7L3EC2DSdwb8fGsSlT9fKaPkehFsYNr6PZNb/N6ToG7nMlc9kUI6aSjG0EJ31He+WdTsAVGzFpU4k+24qCDqaQ/lvRg+uidQcjqtjYFPKvyaVuFi6qUKYvVeZMcQwdivb7E++l3AAA/v+Yge2mB9XPHRVjJkAlhjrC00HqlhP8D8N9hT1DmJ1HdkK/+XH8yz4n5NHufuo4otugDVd5ZKNU9ca/F7rsk42hvqrETLY+WxtK16FbfXQvV4gYtIkT+dyXUNdny37v6Vv4KyqpAOOkaVK7j/pKwITtglsvA2051Qu6yEUsPFsAFaw2XPV/5YOicRSlZcnn/tq8D6NwlN+/RE0GIkp+OiuBwKSwZ5HxoOBN6cU1ETNFXm3ONSGjl9ITJ/U+Rvr6BwJwp5cX4Bf2If5dXKAj/PEHN6Ofv56u8bjN3/4G/MQcs6bzP+jnBx5C2H+IR4nVzr9CZRQN1P56tkm753xRLMkMf/ThXvfRtnIb2aFzQljOHd19tcGqXi/s1mQ7GRuCB115Tl/02ctEa15lLbtVNdkz7wBx/coQTFuv4JhkSiasYhieSZuYqqQRD7WQnOfhy/zleAPPwYnF++pVxjvH60rCQcRUIqEajHdmTNa/ZhwH0mkMMq0cD8r5X8c4CHbKT5WXYMyNWM5wzcChTXVaXkH6VCJYxqSphqRNnswLf8QSF6/P1kkP/y8hc/+rIZNs7ZPPqBfrn9sG84+X/6254n3Kn3Vobktk3gDIqjjjN4qjKofxUF/jnjGXm/eOIHj0v+vnNreTapRXPUdAyLw8+IDD5lBmkuFA4PUaLUd0mrphT+i0SVTd49s2Oywbd/3kNutzODG5S5FrQjx/wO0YeTnRhVwdw1qc18/TpffqIhb8/p/fY9blCVPl/WVKB7XiV4nk2acGS/DiRLaS3zn9y5gkVv/AkWnWTaH4zYkfZmFcDbaphff8S5b9eZzGiH17lD+Fq+Iv7qct+zqn42i0h/2GGn+ODKn32aTWZvDob6Y8wcVdZXvcshzMICqYNqZlxTrZ/inoKmjBgZI6HUBkWtWuNzqDi6MOrMq8tCD9fAk1/P9uNz4nE21v9I1NGLizJL1sRkhDMqNvmpRkLIKjAyhAkio85DgTGKjLkkvFJ/eNmWv34JUd5N2eEGCHY7UBS5MszQuEB94OyTK7vblP5mIeDb+DvbMady7BS1dcwCdPsY5PoLA+BdQe3n8cF0LUXPcNqwaS3ofyz/3Dc0PeuC0PJLTdyNwvs5sQpJZe9ncSdiNQfw+rRAyviO6ooy0IPODEeI0WjiwqEFvl73v8CdYfbImVlBfZGmSZrmtHGKzf9+QA925gc0qZwaTnmYX1pnMUhc8V6zOQNnbQutRKB2TpRu0AIdBHp0ABWrJQexnES4/O2LSQ+phxYO3qjdA8nlMRTAfbBfcjxGBZ06mrgSIyHq8bn/6xnGCUEVBi4z2hRvOr8TGfLaujMvylPfD5eI1QLz9hLyiiq5fGfGcQ7pCmmqn61bptN4sWbMeG91sK2tD18HvWsfm3t9NWptt4n9LSkCVq84Hh5ZS0fQRHjpujt64pXw6QL/cGNDQPmPyWiLNa8FqKVJ2Ed3pcOzn/e5qQgtRUzbodyKu7etaXLfj7HNytByDR0zm8VEw3udkR5hYCP+9nJqeztoeGIijVl75sKEy4qmejC4gC+Br+bLMW9vkZROG3OItz7zSiUEgxmcAb187E6QLpX60p2EubEfKRgc8nsUnpPgmJAOMymWjge59NAqow+EKnqdxZHCvzqzgUPKc8LxDi8COdd1+0VmD7BdqH70GsZ/ooJ/gMo2n5vJlEcGTHW7T6JwzF386OnTKNjrtywzhsxNYOF3Z+YO07XbhBxU3bhbupB8o8Om0r+K6l0G6jp1chXgTaGpelpRfW8GzbbqxesBrMLVVXAux3yA5Cnr1efSZMPgWfPo7Z2tMg8d8inybyW/8VkQhBs+t/zi5n9WJcdN2sh1AZpuFE5ehQi0ZgcHZkRyh5kb5lKc7MzZC38odH8XxqeLr47FmgimxYnIgLv6ePfxr4AU8UBF5Bd5DcbrW4VeNcp9EuPNu5ypyiAzCOKFkgWd1VM//+vO0Xmh4PJ1nwTNmkDEFtpGdT2d9vz5e21ucoh2JQOJwP98UXNv8dwWxcvUAzmUGuiwVCxhOUto7rQMzoJBdNH+PMb+lTtrrdfC2qxcTej0gdsdjkulA0YF//4CaVn/m+9ISeRkTSFwbMBTxr8CLfzTv8knrqjhdugCJPG2nHQMDFPfyh7clyZhdctXEWwYR9C+10QVfOX0KBjiP8U2M2B9Y8X+pYdP3LHjkWS1ndoIgl4x7fMlFp9HqUC1XkjdkEXbzvQJXmREZnNClpFgxCOjZNc+AufRHNfWkf/pj8TTw7102Nfb1K9qi7LkmRUp++cPT9onmx0aYTuYHiJ8OzRRG9BjeHW5uF8dZViZcd1U/g0B7HHQslBnbZTqt95lqaKNuhYsDOr9bZdBpah7klTtHMa5fcA/yksAB0ZKRgHjo4HTSfSU7xde9reLDlIczCEbIFbrhLGqP4P2f2XtHhEo+1aqqztmBIduAx4KXZ6hqc4Z/j6gXcNj2nfrxwYVcUdfBfSs61TrzK2N61AVcpr71G9rNNf0OGe5lCqvSXEMtjZMoHc7TiI90PwRuFSXb2ZPdkY7Zo47NoclRnm2fZ3vooPzcaAcO/cnXHVmcrs6nNsa4JvnJxMNWedL4fY9VFFyVdtt71CM40RfFw/dpELoKF4Zjora8gnyIilW0hjN2oejMoatEvInHhqyxOW3+IRprAzNQ8pSTVjpUoeUZsb3i2irowWokTth/ckHoJ3dizppMs2BEjfzfHDrl7j4fgAeqOeA7Lx90CTKOux2x/18uZSfM7HBhZ6aWNWsP+zGxUt8XgF38Mx63QhyZiwApvOmO7C6zMK+jKMv5hRmLsK1IHZH7HoF5p2TlH/Og/Dn6Iv1ZRXfqOj0L7tsAjXS4ZQdYLLIaplYYNPn/MLRA6EE+zSNhX8B4W9tMVvBK92CLamseQ9P/hOVBcJQK21UZoA4ia8cXZn4c7EljcAuYtgGSIyoqadNbv+VGpJVTSeq2DsEVvlYtGyOR/jmQpUI6L83hrNspud+sUIFT+SrkrbBAo5/79AIArdiKQwiG6VJ/+D9+5K9AFrsO8PIXfc4k1VYJaNF1YAsN52xk/03/vZ/WTOBqU8VgJqlDrcGhfZAxndgsKrMaeur/IRMfYsXviW6zaAS1iEvmHy9BU29qSc78nQKESRgOALRqZHSzIg+YqHtQC4pC8CCRyKmgUuhFxV2SD0ru5zHL0djQuNL2NROZAJtCXW+IbieEKBswhsio5QD4ovB951/H0Q0nlNxssevFpNyqvQCm3uDczcv2E6jsZsyc5+SP3eNW4zL2ZG+JFq5YB+bonjyRT5vXefkWfWgq3lQOWXH3aIxJrexMUrT2gtmfARqoQJGpV9d1RaO06Sv7jHKdhQHMoywx/KZ0pwYLyAAAAAAA=";
    const COUL = [G, R, V];
    function germe(g) {
      const q = lPos(g), dort = g.attente > 0, fige = s.fige > 0 && !dort, r = dort ? 5 : 7.5;
      ctx.save(); ctx.translate(cx(q[0]), cy(q[1]));
      if (dort) ctx.globalAlpha = 0.45;
      ctx.save(); ctx.rotate(fige ? 0.4 : s.t * 1.6 + g.type * 2);
      trait(ctx, 2);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.lineTo(Math.cos(a) * (r + 3.5), Math.sin(a) * (r + 3.5)); ctx.stroke(); }
      ctx.restore();
      trait(ctx, 2); ctx.fillStyle = fige ? "#D9D6E4" : COUL[g.type]; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill(); ctx.stroke();
      if (fige) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4.5, -1); ctx.lineTo(-1.5, -1); ctx.moveTo(1.5, -1); ctx.lineTo(4.5, -1); ctx.stroke(); }
      else if (!dort) { ctx.fillStyle = N; ctx.beginPath(); ctx.arc(-2.8, -1, 1.7, 0, 6.3); ctx.arc(2.8, -1, 1.7, 0, 6.3); ctx.fill(); }
      ctx.restore();
    }
    function preparateur() {
      const j = s.j, q = lPos(j), x = cx(q[0]), y = cy(q[1]);
      // Il roule sans glisser : l'angle suit le chemin parcouru (vers la droite ou le bas, dans le sens des aiguilles).
      if (vieux) { const d = (x - vieux[0]) + (y - vieux[1]); if (Math.abs(d) < T) roule += d / 13; }
      vieux = [x, y];
      if (s.abri > 0 && !clos && Math.floor(s.t * 8) % 2) return;        // il clignote tant qu'il est à l'abri
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.3); ctx.fill();
      if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.clip(); ctx.rotate(roule); ctx.drawImage(logo, -12.5, -12.5, 25, 25); ctx.restore(); }   // l'image a un fond blanc : on la découpe en rond
      else { ctx.fillStyle = N; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.3); ctx.fill(); }
      trait(ctx, 1.8); ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    function dessiner() {
      const fige = s.fige > 0 && (s.fige > 1 || Math.floor(s.t * 8) % 2);
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = fige ? "#DDF1E7" : "#EDEAF6"; ctx.fillRect(cx(0), cy(0), cx(L_NC - 1) - cx(0), cy(L_NR - 1) - cy(0));   // le sol de la ZAC
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = N; ctx.lineWidth = 15; ctx.stroke(cloisons);
      ctx.strokeStyle = V; ctx.lineWidth = 6; ctx.stroke(cloisons);
      // Le sas du préparateur et les bouches d'aération d'où sortent les germes.
      ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.roundRect(cx(L_DEPART[0]) - 11, cy(L_DEPART[1]) - 11, 22, 22, 6); ctx.stroke(); ctx.setLineDash([]);
      for (const o of L_GERMES) { ctx.fillStyle = "rgba(38,7,109,.2)"; ctx.beginPath(); ctx.roundRect(cx(o.c) - 9, cy(o.r) - 9, 18, 18, 4); ctx.fill(); ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(cx(o.c) - 6, cy(o.r) + i * 5); ctx.lineTo(cx(o.c) + 6, cy(o.r) + i * 5); } ctx.stroke(); }
      for (let r = 1; r < L_NR - 1; r++) for (let c = 1; c < L_NC - 1; c++) {
        const o = s.objets[c + r * L_NC], x = cx(c), y = cy(r);
        if (o === 1) { trait(ctx, 1.4); ctx.fillStyle = Y; ctx.beginPath(); ctx.roundRect(x - 4.5, y - 3, 9, 6, 1.5); ctx.fill(); ctx.stroke(); }
        else if (o === 2) {                                                // le flacon de désinfectant
          const k = 1 + Math.sin(s.t * 6) * 0.08;
          ctx.save(); ctx.translate(x, y); ctx.scale(k, k); trait(ctx, 1.8);
          ctx.fillStyle = G; ctx.beginPath(); ctx.roundRect(-5.5, -2, 11, 11, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-2.5, -8, 5, 6, 1); ctx.roundRect(-7.5, -8, 6, 3, 1); ctx.fill();
          ctx.fillStyle = C; ctx.fillRect(-3, 2, 6, 3.5);
          ctx.restore();
        }
      }
      for (const g of s.germes) germe(g);
      preparateur();
      // Le cartouche du bas : le rappel des commandes, remplacé un instant par les annonces (rien ne masque les couloirs).
      const annonce = !clos && s.t - s.msgT < 1.3;
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(100, 438, 160, 28, 10); ctx.fill();
      texte(ctx, annonce ? s.msg : tactile ? "Glissez pour tourner" : "Flèches ou Z Q S D", 180, 453, 13, annonce ? Y : V);
      const n = noteLaby(s);
      bandeau(ctx, s.compte + " étiquettes · " + n + "/10", duree - s.t, duree);
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 220, 40, Y); texte(ctx, s.compte + " étiquettes au compteur", 180, 262, 16, C); }
    }
    const arret = boucle(dt => {
      if (!clos) {
        pasLaby(s, dt, duree);
        if (s.fini) {
          clos = true; ancre = null;
          const n = noteLaby(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.etiq, "étiquette ramassée", "étiquettes ramassées") + ", " + pl(s.prises, "contamination", "contaminations") + (s.prises ? " (−" + (s.etiq - s.compte) + ")" : "") + " : " + s.compte + " au compteur, soit " + n + " sur 10 (1 point de note par tranche de " + RL.palier + " étiquettes).";
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, s.compte), [[s.etiq, s.etiq > 1 ? "étiquettes" : "étiquette"], [s.prises, "fois contaminé"], [s.sprays, s.sprays > 1 ? "sprays vidés" : "spray vidé"], [s.compte, "au compteur"]]); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }

  const api = { bowling, tir, flipper, tennis, labyrinthe, _logo: ICI + "img/logo-p-verre.png", _coeur: { REGL, creerLancer, pasLancer, tombees, PLACES, DEPART, xSeringue, SERIES, noteBowling, creerTir, pasTir, noteTir, TOTAL, REGL_FLIPPER: RF, creerFlipper, pasFlipper, noteFlipper, secouerFlipper, F_PIVOTS, boutBatteur, REGL_LABY: RL, creerLaby, pasLaby, noteLaby, L_PLAN, L_DIRS, L_GERMES, L_DEPART, lOuvert, lDistances, REGL_TENNIS: RT, creerTennis, pasTennis, noteTennis, viseTennis, T_YJ } };

  /* ===== Nouveaux jeux : chacun vit en entier sous son repère (cœur, dessin, inscription), sans toucher au reste du fichier.
     Inscription : api.<nom> = <fonction> ; Object.assign(api._coeur, { … }) pour ce que les outils doivent voir. ===== */

  /* ----- Repère [basket] : le basket ----- */
  // Le basket du pilulier : on lance des comprimés, d'un geste glissé-lâché, dans un pilulier qui va et vient sur ses étagères.
  // Jusqu'à RBK.vol comprimés peuvent voler en même temps : inutile d'attendre la chute du premier pour lancer le suivant.
  // Tout le jeu vit dans ce bloc (cœur, dessin, inscription) : aucun nom ne déborde sur les jeux voisins.
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-basket.js) : ils fixent la difficulté.
    const RBK = { g: 900, x0: 180, y0: 432, r: 11, demi: 42, dmin: 27, dd: 1.2, haut: 34, ep: 3, v0: 70, dv: 6, vmax: 130, xmin: 62, xmax: 298, rebond: 0.5, pause: 0.3, vol: 3, lot: 0.8, combo: 3, k: 5.5, vmin: 380, vlim: 960, vxlim: 460, seuils: [3, 7, 11, 16, 21, 27, 36, 50, 85, 115], tops: [184, 156, 206], etage: 4, monte: 70, vie: 4 };
    const BK_PAS = 1 / 240;
    const vitesseBasket = s => Math.min(RBK.vmax, RBK.v0 + RBK.dv * s.paniers);                      // le pilulier accélère à chaque panier
    const demiBasket = s => Math.max(RBK.dmin, RBK.demi - RBK.dd * s.paniers);                       // et rétrécit
    const etageBasket = s => Math.floor(s.paniers / RBK.etage) % RBK.tops.length;                   // et change d'étagère tous les RBK.etage paniers
    // Le lot : RBK.lot comprimés par seconde de partie (40 pour 50 s), pas un de plus. Mitrailler sans viser vide le lot pour rien.
    const lotBasket = duree => Math.round(RBK.lot * duree);
    const creerBasket = () => ({ t: 0, acc: 0, px: 180, dir: 1, pvx: 0, pvy: 0, top: RBK.tops[0], balles: [], attente: 0.4, perdus: [], points: 0, paniers: 0, directs: 0, lances: 0, serie: 0, record: 0, ev: null, evT: -9, choc: -9, fini: false });
    // Un lancer : vitesse en px/s, vy négatif = vers le haut. Refusé s'il y a déjà RBK.vol comprimés en vol, pendant la courte
    // recharge du godet (RBK.pause), une fois le lot épuisé ou le temps écoulé.
    const lancerBasket = (s, vx, vy, duree) => {
      if (s.balles.length >= RBK.vol || s.attente > 0 || s.fini || s.t >= duree || s.lances >= lotBasket(duree)) return false;
      vy = borne(vy, -RBK.vlim, -RBK.vmin); vx = borne(vx, -RBK.vxlim, RBK.vxlim);
      const v = Math.hypot(vx, vy), f = v > RBK.vlim ? RBK.vlim / v : 1;
      s.balles.push({ x: RBK.x0, y: RBK.y0, vx: vx * f, vy: vy * f, tour: 0, touche: false, age: 0, ok: false }); s.lances++; s.attente = RBK.pause;
      return true;
    };
    // Pour une vitesse verticale donnée, la vitesse horizontale qui amène le comprimé là où sera le pilulier à sa descente.
    const viseBasket = (s, vy) => {
      const q = vy * vy - 2 * RBK.g * (RBK.y0 - s.top - 2);
      if (q <= 0) return null;
      const T = (-vy + Math.sqrt(q)) / RBK.g, L = RBK.xmax - RBK.xmin, p = s.px - RBK.xmin;
      const u = ((s.dir > 0 ? p : 2 * L - p) + vitesseBasket(s) * T) % (2 * L), x = RBK.xmin + (u > L ? 2 * L - u : u);
      return { vx: (x - RBK.x0) / T, T, x };
    };
    const unPasBasket = (s, duree) => {
      const dt = BK_PAS, D = demiBasket(s) + RBK.ep;
      s.t += dt;
      s.pvx = s.dir * vitesseBasket(s); s.px += s.pvx * dt;
      if (s.px > RBK.xmax) { s.px = 2 * RBK.xmax - s.px; s.dir = -1; } else if (s.px < RBK.xmin) { s.px = 2 * RBK.xmin - s.px; s.dir = 1; }
      const dy = borne(RBK.tops[etageBasket(s)] - s.top, -RBK.monte * dt, RBK.monte * dt); s.top += dy; s.pvy = dy / dt;
      if (s.attente > 0) s.attente -= dt;
      for (const q of s.perdus) { q.vy += RBK.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.tour += dt * q.vx / 40; }
      if (s.perdus.length && s.perdus[0].y > H + 30) s.perdus.shift();
      const bas = s.top + RBK.haut;
      for (const b of s.balles.slice()) {
        b.age += dt; b.vy += RBK.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.tour += dt * b.vx / 40;
        // Les parois du pilulier (deux côtés et le fond) : des traits épais, plus épais que le plus grand pas du comprimé.
        for (const [x1, y1, x2, y2] of [[s.px - D, s.top, s.px - D, bas], [s.px + D, s.top, s.px + D, bas], [s.px - D, bas, s.px + D, bas]]) {
          const ux = x2 - x1, uy = y2 - y1, k = borne(((b.x - x1) * ux + (b.y - y1) * uy) / (ux * ux + uy * uy), 0, 1);
          const cx = x1 + ux * k, cy = y1 + uy * k, d = Math.hypot(b.x - cx, b.y - cy);
          if (d >= RBK.r + RBK.ep || d === 0) continue;
          const nx = (b.x - cx) / d, ny = (b.y - cy) / d, vn = (b.vx - s.pvx) * nx + (b.vy - s.pvy) * ny;
          b.x = cx + nx * (RBK.r + RBK.ep); b.y = cy + ny * (RBK.r + RBK.ep);
          if (vn < 0) { b.vx -= (1 + RBK.rebond) * vn * nx; b.vy -= (1 + RBK.rebond) * vn * ny; b.touche = true; s.choc = s.t; }
        }
        if (Math.abs(b.x - s.px) < D - RBK.ep && b.y > s.top + 9 && b.y < bas) {
          // Dans le pilulier : 3 points sans avoir touché le bord, 2 sinon. Combo : chaque panier enchaîné sans en manquer un
          // rapporte 1 point de plus que le précédent, jusqu'à RBK.combo points de bonus. Un comprimé perdu remet le combo à zéro.
          s.record = Math.max(s.record, ++s.serie);
          const direct = !b.touche, bonus = Math.min(RBK.combo, s.serie - 1), pts = (direct ? 3 : 2) + bonus;
          s.paniers++; s.points += pts; if (direct) s.directs++;
          b.ok = true; s.ev = { pts, direct, combo: s.serie, x: s.px, y: s.top }; s.evT = s.t; s.balles.splice(s.balles.indexOf(b), 1);
        } else if ((b.vy > 0 && b.y > bas + 30) || b.x < -20 || b.x > W + 20 || b.age > RBK.vie) {
          // Plus aucune chance : le comprimé finit sa chute pour le décor, et le suivant arrive.
          s.perdus.push(b); s.serie = 0; if (!s.ev || !s.ev.pts || s.t - s.evT > 0.6) { s.ev = { pts: 0, x: b.x, y: b.y }; s.evT = s.t; } s.balles.splice(s.balles.indexOf(b), 1);
        }
      }
      // Fin : le temps est écoulé ou le lot épuisé, et les derniers comprimés lancés ont fini leur course.
      if ((s.t >= duree || s.lances >= lotBasket(duree)) && !s.balles.length) s.fini = true;
    };
    // Pas fixe, comme le flipper : la physique avance par tranches de 1/240 s quel que soit le rythme d'affichage.
    const pasBasket = (s, dt, duree) => { s.acc += dt; while (s.acc >= BK_PAS && !s.fini) { s.acc -= BK_PAS; unPasBasket(s, duree); } };
    // La note : le nombre de paliers atteints. Le barème est progressif : les premiers points de note viennent vite, les derniers se méritent.
    const noteBasket = s => RBK.seuils.filter(p => s.points >= p).length;

    /* --- Dessin et commandes (navigateur seulement) --- */
    const basket = (el, opt) => {
      const duree = opt.duree || 50, { cv, ctx, liberer } = monter(el, H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "Le basket du pilulier. Glissez vers le haut puis lâchez pour lancer un comprimé dans le pilulier qui se déplace, jusqu'à trois comprimés en vol à la fois. Au clavier : flèches gauche et droite pour l'angle, haut et bas pour la force, Espace pour lancer.");
      const s = creerBasket(), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      let clos = false, minuterie = 0, depart = null, vise = null, clavier = false, angle = 0, force = 780, vus = 0;
      const logo = new Image(); logo.src = opt.logo || ICI + "img/logo-pharmacotechnie.webp";      // le comprimé porte le logo de l'unité
      const petales = [], COULEURS = [N, Y, O, P, Y, O];                                          // la gerbe qui sort du pilulier à chaque panier, aux couleurs du logo
      const touches = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
      const posDe = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.width * W]; };
      // Le geste : un glissé vers le pilulier. Sa direction donne l'angle, sa longueur la force.
      const mesurer = e => {
        const [x, y] = posDe(e), dx = x - depart[0], dy = y - depart[1], l = Math.hypot(dx, dy);
        if (l < 25 || dy * RBK.k > -RBK.vmin) { vise = null; return; }
        const f = Math.min(1, RBK.vlim / (l * RBK.k));
        vise = { vx: borne(dx * RBK.k * f, -RBK.vxlim, RBK.vxlim), vy: dy * RBK.k * f };
      };
      const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } clavier = false; depart = posDe(e); vise = null; };
      const glisse = e => { if (depart) { e.preventDefault(); mesurer(e); } };
      const lacher = e => { if (!depart) return; mesurer(e); if (vise && !clos) lancerBasket(s, vise.vx, vise.vy, duree); depart = vise = null; };
      const annule = () => { depart = vise = null; };
      const viseClavier = () => { const a = angle * Math.PI / 180; vise = { vx: Math.sin(a) * force, vy: -Math.cos(a) * force }; };
      const touche = (e, v) => {
        const tir = e.key === " " || e.key === "Spacebar" || e.key === "Enter";
        if (!(e.key in touches) && !tir) return;
        if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || ""))) return;
        if (v) e.preventDefault();
        if (tir) { if (v && !e.repeat && !clos) { clavier = true; depart = null; viseClavier(); lancerBasket(s, vise.vx, vise.vy, duree); } return; }
        touches[e.key] = v; if (v) { clavier = true; depart = null; viseClavier(); }
      };
      const enfonce = e => touche(e, true), leve = e => touche(e, false), lache = () => { for (const k in touches) touches[k] = false; }, menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", glisse); cv.addEventListener("pointerup", lacher); cv.addEventListener("pointercancel", annule); cv.addEventListener("contextmenu", menu);
      window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
      const retirer = () => {
        cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", glisse); cv.removeEventListener("pointerup", lacher); cv.removeEventListener("pointercancel", annule); cv.removeEventListener("contextmenu", menu);
        window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
      };
      // Un comprimé au logo de la pharmacotechnie ; sécable tant que l'image n'est pas là (ou si elle manque).
      const comprime = (x, y, tour, alpha) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(tour); ctx.globalAlpha = alpha;
        trait(ctx, 2.2); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, RBK.r, 0, 6.3); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, -RBK.r + 1.5, -RBK.r + 1.5, RBK.r * 2 - 3, RBK.r * 2 - 3);
        else { ctx.beginPath(); ctx.moveTo(-RBK.r + 3, 0); ctx.lineTo(RBK.r - 3, 0); ctx.stroke(); }
        ctx.restore();
      };
      // La gerbe : des pétales en goutte, comme ceux du logo, qui jaillissent de l'ouverture du pilulier puis retombent.
      const gerbe = (x, y, n) => {
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.5, v = 170 + Math.random() * 330;
          petales.push({ x: x + (Math.random() - 0.5) * 30, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, vie: 0.9 + Math.random() * 0.7, l: 13 + Math.random() * 15, c: COULEURS[i % COULEURS.length] });
        }
        if (petales.length > 180) petales.splice(0, petales.length - 150);
      };
      const animer = dt => {
        if (s.paniers > vus && s.ev && s.ev.pts && !calme) gerbe(s.px, s.top + 4, (s.ev.direct ? 40 : 28) + 10 * Math.min(RBK.combo, s.ev.combo - 1));
        vus = s.paniers;
        for (const q of petales) { q.t += dt; q.vy += 520 * dt; q.vx *= 1 - 1.2 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
        for (let i = petales.length - 1; i >= 0; i--) if (petales[i].t > petales[i].vie) petales.splice(i, 1);
      };
      // Le décor : un gymnase vu des tribunes du préparatoire. Mur, panneau à la croix verte, flacons spectateurs, parquet et raquette.
      const SOL = 398;
      function decor() {
        ctx.fillStyle = "#EDEAF6"; ctx.fillRect(0, 0, W, SOL);
        ctx.fillStyle = "rgba(185,166,240,.28)"; ctx.fillRect(0, 300, W, SOL - 300);                 // le soubassement du mur
        ctx.fillStyle = "rgba(38,7,109,.12)"; ctx.fillRect(0, 298, W, 3);
        // Le panneau, fixé au mur : son carré de visée est une croix de pharmacie.
        ctx.strokeStyle = "rgba(38,7,109,.2)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(180, 39); ctx.lineTo(180, 66); ctx.stroke();
        ctx.fillStyle = "rgba(255,251,242,.85)"; ctx.strokeStyle = "rgba(38,7,109,.28)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(96, 64, 168, 104, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(62,155,118,.3)"; ctx.fillRect(169, 88, 22, 58); ctx.fillRect(151, 106, 58, 22);
        // Les tribunes : des flacons venus encourager, de part et d'autre.
        ctx.globalAlpha = 0.5;
        for (let r = 0; r < 2; r++) {
          const y = 344 + r * 30;
          ctx.fillStyle = "rgba(38,7,109,.2)"; ctx.fillRect(0, y + 13, 92 - r * 18, 5); ctx.fillRect(W - 92 + r * 18, y + 13, 92 - r * 18, 5);
          for (let i = 0; i < 3 - r; i++) { flacon(ctx, 16 + i * 26 + r * 6, y, 0, [O, Y, P, V, B][(i + r * 2) % 5]); flacon(ctx, W - 16 - i * 26 - r * 6, y, 0, [B, P, O, Y, V][(i + r) % 5]); }
        }
        ctx.globalAlpha = 1;
        // Le parquet, en perspective, et la raquette tracée devant le lanceur.
        ctx.fillStyle = "#E8B56D"; ctx.fillRect(0, SOL, W, H - SOL);
        ctx.strokeStyle = "rgba(38,7,109,.13)"; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = -12; i <= 12; i++) { ctx.moveTo(180 + i * 22, SOL); ctx.lineTo(180 + i * 64, H); }
        for (const y of [414, 438, 468]) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,251,242,.9)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(132, SOL); ctx.lineTo(84, H); ctx.moveTo(228, SOL); ctx.lineTo(276, H); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(180, 458, 82, 20, 0, 0, 6.3); ctx.stroke();
        trait(ctx, 3); ctx.beginPath(); ctx.moveTo(0, SOL); ctx.lineTo(W, SOL); ctx.stroke();
      }
      const MOMENTS = ["MATIN", "MIDI", "SOIR"], TEINTES = [Y, B, P];
      function dessiner() {
        const D = demiBasket(s) + RBK.ep, e = etageBasket(s);
        decor();
        // Les trois étagères, au mur : celle où roule le pilulier est plus marquée.
        RBK.tops.forEach((t, i) => {
          const y = t + RBK.haut + RBK.ep + 2;
          ctx.fillStyle = i === e ? "rgba(38,7,109,.38)" : "rgba(38,7,109,.14)"; ctx.fillRect(20, y, W - 40, 4);
          texte(ctx, MOMENTS[i], 24, y + 12, 9, i === e ? "rgba(38,7,109,.55)" : "rgba(38,7,109,.25)", "left");
        });
        // Le fond du pilulier, puis le comprimé, puis la façade : le comprimé qui entre passe derrière l'étiquette.
        ctx.fillStyle = "#fff"; ctx.fillRect(s.px - D, s.top, 2 * D, RBK.haut);
        for (const q of s.perdus) comprime(q.x, q.y, q.tour, 0.45);
        for (const q of s.balles) comprime(q.x, q.y, q.tour, 1);
        ctx.save(); ctx.translate(s.px, s.top);
        const vif = !clos && s.t - s.evT < 0.25 && s.ev && s.ev.pts;
        ctx.fillStyle = vif ? C : TEINTES[e]; ctx.fillRect(-D, 7, 2 * D, RBK.haut - 7);
        trait(ctx, 2); ctx.beginPath(); ctx.moveTo(-D, 7); ctx.lineTo(D, 7); ctx.stroke();
        trait(ctx, RBK.ep * 2); ctx.strokeStyle = s.t - s.choc < 0.1 ? O : N;
        ctx.beginPath(); ctx.moveTo(-D, 0); ctx.lineTo(-D, RBK.haut); ctx.lineTo(D, RBK.haut); ctx.lineTo(D, 0); ctx.stroke();
        texte(ctx, MOMENTS[e], 0, 21, 12, N);
        ctx.restore();
        // Le lanceur : un godet posé sur la paillasse, avec le comprimé prêt à partir.
        trait(ctx, 3); ctx.fillStyle = V; ctx.beginPath(); ctx.moveTo(RBK.x0 - 17, RBK.y0 + 4); ctx.lineTo(RBK.x0 + 17, RBK.y0 + 4); ctx.lineTo(RBK.x0 + 11, 452); ctx.lineTo(RBK.x0 - 11, 452); ctx.closePath(); ctx.fill(); ctx.stroke();
        const reste = lotBasket(duree) - s.lances, libres = s.t < duree ? Math.min(reste, RBK.vol - s.balles.length) : 0, pret = libres > 0 && s.attente <= 0;
        for (let i = 1; i < libres; i++) comprime(RBK.x0 - 16 - i * 25, 441, 0, 1);                  // la réserve : les comprimés encore disponibles
        if (pret) comprime(RBK.x0, RBK.y0 - 8, 0, 1);
        texte(ctx, "lot : " + reste, RBK.x0 + 52, 441, 13, reste <= 5 ? R : N, "left");
        // Le témoin de combo : il grossit à chaque panier enchaîné, et disparaît au premier comprimé perdu.
        if (s.serie > 1 && !clos) {
          const k = calme ? 1 : 1 + 0.25 * Math.max(0, 1 - (s.t - s.evT) * 4), plein = s.serie > RBK.combo;
          ctx.save(); ctx.translate(52, 420); ctx.scale(k, k);
          trait(ctx, 2.5); ctx.fillStyle = plein ? O : Y; ctx.beginPath(); ctx.roundRect(-40, -17, 80, 34, 12); ctx.fill(); ctx.stroke();
          texte(ctx, "COMBO", 0, -8, 9, N); texte(ctx, "×" + s.serie, 0, 5, 15, N);
          ctx.restore();
        }
        // La visée : le début de la trajectoire seulement, le reste se juge à l'œil.
        if (vise && !clos) {
          ctx.fillStyle = pret ? N : "rgba(38,7,109,.3)";
          for (let i = 1; i <= 7; i++) { const t = i * 0.065; ctx.beginPath(); ctx.arc(RBK.x0 + vise.vx * t, RBK.y0 - 8 + vise.vy * t + RBK.g * t * t / 2, 3.4 - i * 0.25, 0, 6.3); ctx.fill(); }
          const f = Math.hypot(vise.vx, vise.vy) / RBK.vlim;                                         // la jauge de force
          trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(RBK.x0 + 30, 400, 10, 48, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = f > 0.97 ? O : G; ctx.beginPath(); ctx.roundRect(RBK.x0 + 32, 446 - 44 * f, 6, 44 * f, 3); ctx.fill();
        }
        if (depart && !clos) { ctx.strokeStyle = "rgba(38,7,109,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(depart[0], depart[1], 12, 0, 6.3); ctx.stroke(); }
        for (const q of petales) { ctx.save(); ctx.translate(q.x, q.y); ctx.globalAlpha = Math.min(1, (q.vie - q.t) * 3); goutte(ctx, Math.atan2(q.vy, q.vx), -q.l * 0.6, q.l * 0.4, q.l * 0.5, q.c); ctx.restore(); }
        // Le résultat du dernier lancer.
        const dtE = s.t - s.evT;
        if (s.ev && dtE < 1 && !clos) {
          if (s.ev.pts) {
            if (!calme) { ctx.globalAlpha = 1 - dtE; ctx.strokeStyle = s.ev.direct ? O : G; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.ev.x, s.ev.y + 10, 20 + dtE * 46, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
            const y = Math.max(62, s.ev.y - 30 - (calme ? 0 : dtE * 16));
            ctx.fillStyle = "rgba(38,7,109,.88)"; ctx.beginPath(); ctx.roundRect(borne(s.ev.x, 96, W - 96) - 92, y - 15, 184, 30, 15); ctx.fill();
            texte(ctx, "+" + s.ev.pts + " · " + (s.ev.combo > 1 ? "Combo ×" + s.ev.combo + " !" : s.ev.direct ? "Dose parfaite !" : "Dans le pilulier !"), borne(s.ev.x, 96, W - 96), y + 1, 14, s.ev.direct || s.ev.combo > 1 ? Y : C);
          } else if (dtE < 0.7) texte(ctx, "Hors pilulier…", 180, 384, 13, "rgba(38,7,109,.6)");
        }
        if (s.t < 5 && !clos && !s.lances) {
          ctx.globalAlpha = Math.min(1, 5 - s.t) * 0.92;
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(28, 322, 304, 28, 14); ctx.fill();
          texte(ctx, tactile ? "Glissez vers le pilulier, puis lâchez" : "Glissez-lâchez, ou flèches puis Espace", 180, 337, 13, Y);
          ctx.globalAlpha = 1;
        }
        const n = noteBasket(s);
        bandeau(ctx, s.points + " pts · " + n + "/10" + (n < 10 ? " · palier à " + RBK.seuils[n] : ""), duree - s.t, duree);
        if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 220, 40, Y); texte(ctx, s.points + " points · " + s.paniers + (s.paniers > 1 ? " paniers" : " panier"), 180, 262, 16, C); }
      }
      const arret = boucle(dt => {
        if (!clos) {
          if (clavier) {
            angle = borne(angle + ((touches.ArrowRight ? 1 : 0) - (touches.ArrowLeft ? 1 : 0)) * 26 * dt, -32, 32);
            force = borne(force + ((touches.ArrowUp ? 1 : 0) - (touches.ArrowDown ? 1 : 0)) * 170 * dt, 620, RBK.vlim);
            viseClavier();
          }
          pasBasket(s, dt, duree);
          animer(dt);
          if (s.fini) {
            clos = true; lache(); annule();
            const n = noteBasket(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = pl(s.paniers, "panier", "paniers") + " sur " + pl(s.lances, "lancer", "lancers") + ", dont " + pl(s.directs, "direct", "directs") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (2 points le panier, 3 sans toucher le bord, jusqu'à " + RBK.combo + " de bonus en combo ; barème progressif, 10 sur 10 à partir de " + RBK.seuils[9] + " points).";
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.points, [[s.points, s.points > 1 ? "points" : "point"], [s.paniers + "/" + s.lances, "paniers"], [s.directs, s.directs > 1 ? "paniers directs" : "panier direct"], [s.record, "combo max"]]); }, 1300);
          }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.basket = basket;
    Object.assign(api._coeur, { REGL_BASKET: RBK, creerBasket, pasBasket, noteBasket, lancerBasket, viseBasket, vitesseBasket, etageBasket, demiBasket, lotBasket });
  }
  /* ----- Fin [basket] ----- */

  /* ----- Repère [penalty] : le penalty ----- */
  /* Penalty au préparatoire : dix tirs au bouchon face à l'automate de garde. Le cœur d'abord, le dessin ensuite. */
  // Réglages étalonnés par simulation (node outils/etalon-penalty.js) : ils fixent la difficulté.
  // reac, alea : temps de réaction de l'automate et son aléa ; vit, dvit : vitesse de plongeon et son gain par tir ; rg : rayon de la pince ;
  // amp, w, dw : va-et-vient de l'automate avant le tir ; mou, fort : durée du vol du tir le plus mou et du plus fort ;
  // pmin, pmax : en dessous le bouchon n'arrive pas, au-dessus il passe la barre ; but, prime : points bruts d'un but et prime de placement.
  // dev : déviation à l'arrivée d'un effet plein (px) ; lect : part du vol après laquelle l'automate lit l'effet ; hes : retard de réaction que lui coûte un effet plein (s) ; disp : dispersion du boulet (px).
  // types : pour chaque tir, t = durée du vol (1 = tendu), e = prise de l'effet, d = dispersion.
  const RP = { tirs: 10, reac: 0.2, alea: 0.03, vit: 30, dvit: 33, rg: 18, amp: 45, w: 2.1, dw: 0.14, mou: 0.8, fort: 0.45, pmin: 0.15, pmax: 0.85, pause: 0.95, but: 100, prime: 50,
    dev: 55, lect: 0.55, hes: 0.18, disp: 11, types: { tendu: { t: 1, e: 0.2, d: 0 }, brosse: { t: 1.12, e: 1.5, d: 0 }, boulet: { t: 0.78, e: 0, d: 1 } } };
  // La cage est vue de face : montants en PN_G et PN_D, sol en PN_SOL, barre PN_HAUT plus haut. Le bouchon part de (PN_X0, PN_Y0).
  const PN = { PAS: 1 / 240, G: 60, D: 300, SOL: 190, HAUT: 110, RB: 13, RD: 24, X0: 180, Y0: 410, KZ: 30, AMAX: 0.62, TIRE: 190 };
  function creerPenalty(graine) {
    let a = graine || 20261224;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pat = h() * 6.283;
    return { t: 0, acc: 0, phase: "vise", n: 0, buts: 0, lucarnes: 0, brut: 0, pat, kx: 180 + RP.amp * Math.sin(pat), kz: PN.KZ, tir: null, attente: 0, issues: [], h, fini: false };
  }
  // Un tir : angle en radians (0 = plein axe, positif vers la droite), puissance de 0 à 1. La direction fixe l'endroit où le bouchon
  // coupe la ligne de but, la puissance fixe sa hauteur et sa vitesse : trop mou il n'arrive pas, trop fort il passe au-dessus.
  // effet de -1 à 1 : le bouchon part dans la direction visée puis dévie (positif vers la droite) ; l'automate plonge d'abord vers
  // l'endroit visé et ne lit l'effet qu'en cours de vol. type : "tendu" (peu d'effet), "brosse" (plus lent, beaucoup d'effet)
  // ou "boulet" (rapide, sans effet, un peu dispersé).
  function tirerPenalty(s, angle, puissance, effet, type) {
    if (s.fini || s.phase !== "vise" || !isFinite(angle) || !isFinite(puissance)) return false;
    const ty = RP.types[type] || RP.types.tendu, e = isFinite(effet) ? borne(effet, -1, 1) : 0, ga = () => (s.h() + s.h() + s.h() + s.h() - 2) * 1.7;
    const a = borne(angle, -PN.AMAX, PN.AMAX), p = borne(puissance, 0, 1), vue = PN.X0 + Math.tan(a) * (PN.Y0 - PN.SOL), g = ga(), gx = ga(), gz = ga();
    const ax = vue + e * RP.dev * ty.e + ty.d * gx * RP.disp;
    const z = Math.max(0, (p - RP.pmin) / (RP.pmax - RP.pmin) * PN.HAUT + ty.d * gz * RP.disp * 0.8), court = p < RP.pmin;
    const issue = court ? "court" : ax < PN.G - PN.RB || ax > PN.D + PN.RB ? "cote" : z > PN.HAUT + PN.RB ? "dessus"
      : Math.abs(ax - PN.G) <= PN.RB || Math.abs(ax - PN.D) <= PN.RB ? "poteau" : z >= PN.HAUT - PN.RB ? "barre" : "cadre";
    const T = (RP.mou - (RP.mou - RP.fort) * p) * ty.t, bx = x => borne(x, PN.G + RP.rg / 2, PN.D - RP.rg / 2);
    s.tir = { a, p, e, type: RP.types[type] ? type : "tendu", vue, ax, z, t: 0, T, issue, portee: court ? 0.3 + 0.45 * p / RP.pmin : 1,
      reac: court ? 99 : Math.max(0.08, RP.reac + g * RP.alea + RP.hes * Math.abs(e) * ty.e), vit: RP.vit + RP.dvit * s.n, lect: T * RP.lect,
      gvx: bx(vue), gx: bx(ax), gz: borne(z, 14, PN.HAUT - 10) };
    s.phase = "vol";
    return true;
  }
  // Le placement d'un tir cadré, de 0 (plein centre, au ras du sol) à 1 (au ras d'un montant et de la barre).
  function placementPenalty(v) {
    const u = Math.min(1, Math.abs(v.ax - 180) / ((PN.D - PN.G) / 2 - PN.RB)), w = Math.min(1, v.z / (PN.HAUT - PN.RB));
    return { u, w, part: 0.6 * u + 0.4 * w, lucarne: u > 0.8 && w > 0.75 };
  }
  const versPenalty = (s, x, z, pas) => { const dx = x - s.kx, dz = z - s.kz, d = Math.hypot(dx, dz); if (d <= pas) { s.kx = x; s.kz = z; } else { s.kx += dx / d * pas; s.kz += dz / d * pas; } };
  function unPasPenalty(s, duree) {
    const dt = PN.PAS, v = s.tir;
    s.t += dt;
    if (s.phase === "vise") {
      if (s.t >= duree) { s.fini = true; return; }
      s.pat += (RP.w + RP.dw * s.n) * dt;
      s.kx = 180 + RP.amp * Math.sin(s.pat);
    } else if (s.phase === "vol") {
      v.t += dt;
      if (v.t > v.reac) versPenalty(s, v.t < v.lect ? v.gvx : v.gx, v.gz, v.vit * dt);
      if (v.t >= v.T) {
        if (v.issue === "cadre") {
          if (Math.hypot(s.kx - v.ax, s.kz - v.z) <= RP.rg + PN.RB) v.issue = "arret";
          else { const q = placementPenalty(v); v.issue = "but"; v.lucarne = q.lucarne; v.points = RP.but + Math.round(RP.prime * q.part); s.buts++; s.lucarnes += q.lucarne ? 1 : 0; s.brut += v.points; }
        }
        s.issues.push(v.issue); s.phase = "bilan"; s.attente = RP.pause;
      }
    } else {
      s.attente -= dt;
      if (s.attente < RP.pause - 0.4) versPenalty(s, 180 + RP.amp * Math.sin(s.pat), PN.KZ, 420 * dt);
      if (s.attente <= 0) { s.n++; s.tir = null; if (s.n >= RP.tirs || s.t >= duree) s.fini = true; else { s.phase = "vise"; s.kz = PN.KZ; } }
    }
  }
  // Pas fixe, comme le tennis : la partie avance par tranches de 1/240 s quel que soit le rythme d'affichage.
  function pasPenalty(s, dt, duree) { s.acc += dt; while (s.acc >= PN.PAS && !s.fini) { s.acc -= PN.PAS; unPasPenalty(s, duree); } }
  // La note : le nombre de buts sur les dix tirs (un tir non joué faute de temps compte comme manqué).
  const notePenalty = s => Math.round(10 * s.buts / RP.tirs);

  function penalty(el, opt) {
    const duree = opt.duree || 50, { cv, ctx, liberer } = monter(el, H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Penalty au préparatoire. Glissez vers la cage puis lâchez pour tirer le bouchon : la direction du geste vise, sa longueur dose la force, sa courbure donne de l'effet. Trois tirs au choix en bas : tendu, brossé, boulet. Au clavier : flèches gauche et droite pour viser, haut et bas pour la force, Majuscule avec gauche ou droite pour l'effet, 1, 2, 3 pour le type de tir, Espace pour tirer.");
    const media = q => typeof matchMedia === "function" && matchMedia(q).matches, tactile = media("(pointer: coarse)"), calme = media("(prefers-reduced-motion: reduce)");
    const s = creerPenalty(opt.graine || Math.floor(Math.random() * 2147483646) + 1);
    let clos = false, minuterie = 0, prise = null, visee = null, auClavier = false, ka = 0, kp = 0.5, ke = 0, type = "tendu", maj = false, vuIssue = 0, horloge = 0;
    const touches = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false }, eclats = [];
    const TYPES = [["tendu", "Tendu"], ["brosse", "Brossé"], ["boulet", "Boulet"]], pastille = i => [12 + i * 114, 448, 108, 26];
    const MSG = { but: "Lot libéré !", arret: "Intercepté par l'automate", poteau: "Sur le montant…", barre: "Sur la barre…", cote: "À côté de la cage…", dessus: "Au-dessus…", court: "Trop mou…" };
    const point = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    // Le geste : la corde (du départ au doigt) donne la direction et la force ; le ventre du tracé donne l'effet, du côté opposé au ventre
    // (le bouchon prolonge la courbe du geste). Un tracé presque droit ne donne aucun effet.
    const mesurer = e => {
      const [x, y] = point(e), dx = x - prise.x, dy = y - prise.y, l = Math.hypot(dx, dy), q = prise.pts, d = q[q.length - 1];
      if (Math.hypot(x - d[0], y - d[1]) > 4 && q.length < 80) q.push([x, y]);
      if (!(dy < -4 && l >= 12)) { visee = null; return; }
      let ventre = 0;
      for (const [px, py] of q) { const c = -((px - prise.x) * dy - (py - prise.y) * dx) / l; if (Math.abs(c) > Math.abs(ventre)) ventre = c; }
      const k = Math.abs(ventre) / l;
      visee = { a: borne(Math.atan2(dx, -dy), -PN.AMAX, PN.AMAX), p: Math.min(1, l / PN.TIRE), e: k < 0.06 ? 0 : -Math.sign(ventre) * Math.min(1, (k - 0.06) / 0.2) };
    };
    const appui = e => {
      if (clos) return;
      e.preventDefault(); cv.focus({ preventScroll: true });
      const [x, y] = point(e), i = TYPES.findIndex((_, k) => { const b = pastille(k); return x >= b[0] && x <= b[0] + b[2] && y >= b[1] - 4 && y <= b[1] + b[3] + 4; });
      if (i >= 0) { type = TYPES[i][0]; return; }
      try { cv.setPointerCapture(e.pointerId); } catch (_) { }
      prise = { id: e.pointerId, x, y, pts: [[x, y]] }; visee = null; auClavier = false;
    };
    const glisse = e => { if (prise && e.pointerId === prise.id) { e.preventDefault(); mesurer(e); } };
    const leve = e => { if (!prise || e.pointerId !== prise.id) return; mesurer(e); if (visee && !clos) tirerPenalty(s, visee.a, visee.p, visee.e, type); prise = visee = null; };
    const annule = e => { if (prise && e.pointerId === prise.id) prise = visee = null; };
    const clavier = (e, v) => {
      const tir = e.key === " " || e.key === "Spacebar" || e.key === "Enter", choix = /^(Digit|Numpad)[123]$/.test(e.code || "") ? +e.code.slice(-1) - 1 : -1;
      if (e.key === "Shift") { maj = v; return; }
      if (!(e.key in touches) && !tir && choix < 0) return;
      if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || ""))) return;
      maj = e.shiftKey;
      if (v) { e.preventDefault(); auClavier = true; prise = visee = null; }
      if (choix >= 0) { if (v) type = TYPES[choix][0]; }
      else if (tir) { if (v && !e.repeat && !clos) tirerPenalty(s, ka, kp, ke, type); } else touches[e.key] = v;
    };
    const enfonce = e => clavier(e, true), relache = e => clavier(e, false), lache = () => { for (const k in touches) touches[k] = false; maj = false; }, menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", glisse); cv.addEventListener("pointerup", leve); cv.addEventListener("pointercancel", annule); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", relache); window.addEventListener("blur", lache);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", glisse); cv.removeEventListener("pointerup", leve); cv.removeEventListener("pointercancel", annule); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", relache); window.removeEventListener("blur", lache);
    };
    // Où dessiner le bouchon : il rapetisse en s'éloignant, monte vers sa hauteur d'arrivée, et son ombre reste au sol.
    function bouchonEn(v) {
      const u = Math.min(1, v.t / v.T) * v.portee, sol = PN.Y0 - (PN.Y0 - PN.SOL) * u;
      return { x: PN.X0 + (v.vue - PN.X0) * u + (v.ax - v.vue) * u * u, sol, y: sol - v.z * u - Math.sin(Math.PI * Math.min(1, v.t / v.T)) * 16 * v.p * (v.portee < 1 ? 0 : 1), r: PN.RD - (PN.RD - PN.RB) * u };
    }
    // Le bouchon porte le logo de l'unité ; tant que l'image n'est pas là (ou si elle manque), c'est une capsule orange.
    const logo = new Image(); logo.src = opt.logo || ICI + "img/logo-pharmacotechnie.webp";
    function bouchon(x, y, r, tour) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(tour);
      trait(ctx, 2.6); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.fill();
      if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.clip(); ctx.drawImage(logo, -r + 1, -r + 1, 2 * r - 2, 2 * r - 2); ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke(); }
      else { ctx.stroke(); ctx.fillStyle = O; ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, 6.3); ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke(); }
      ctx.restore();
    }
    // La visée : un pointillé qui suit la trajectoire prévue (courbe s'il y a de l'effet), puis la jauge de force.
    function fleche(a, p, e) {
      const coul = p < RP.pmin ? P : p > RP.pmax ? O : C, um = (46 + p * 150) * Math.cos(a) / (PN.Y0 - PN.SOL), u0 = (PN.RD + 9) * Math.cos(a) / (PN.Y0 - PN.SOL);
      const vue = PN.X0 + Math.tan(a) * (PN.Y0 - PN.SOL), dev = e * RP.dev * RP.types[type].e * 1.6;   // courbure un peu forcée : sur ce court tronçon elle se verrait mal
      const en = u => [PN.X0 + (vue - PN.X0) * u + dev * u * u, PN.Y0 - (PN.Y0 - PN.SOL) * u];
      ctx.lineCap = "round"; ctx.setLineDash([2, 11]);
      for (const [c, w] of [[N, 8], [coul, 4.5]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= 14; i++) { const q = en(u0 + (um - u0) * i / 14); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke(); }
      ctx.setLineDash([]);
      const b = en(um), b0 = en(um - 0.03);
      ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(Math.atan2(b[0] - b0[0], b0[1] - b[1])); trait(ctx, 2.4); ctx.fillStyle = coul; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, 5); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      // La jauge de force : rose trop mou, verte dans le cadre, rouge au-dessus de la barre.
      const jx = 328, jy = 300, jh = 124, yDe = q => jy + jh * (1 - q);
      ctx.fillStyle = R; ctx.fillRect(jx, jy, 12, jh); ctx.fillStyle = Y; ctx.fillRect(jx, yDe(RP.pmax), 12, yDe(RP.pmin) - yDe(RP.pmax)); ctx.fillStyle = P; ctx.fillRect(jx, yDe(RP.pmin), 12, jy + jh - yDe(RP.pmin));
      trait(ctx, 2.4); ctx.beginPath(); ctx.rect(jx, jy, 12, jh); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(jx - 3, yDe(p)); ctx.lineTo(jx - 14, yDe(p) - 7); ctx.lineTo(jx - 14, yDe(p) + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      texte(ctx, "FORCE", jx + 6, jy - 10, 9, C);
      if (e && RP.types[type].e) texte(ctx, e < 0 ? "↶ effet" : "effet ↷", jx - 4, jy + jh + 12, 10, C, "right");
    }
    // Le public : six rangées de supporters aux couleurs de l'unité. Ils ondulent doucement et sautent sur un but.
    const PEAU = [C, "#F2D3B8", "#C9966B", "#8A5A3C"], MAILLOT = [P, B, Y, O, V, C, G], BRINS = Array.from({ length: 38 }, (_, i) => [(i * 97 + 31) % 348 + 6, 204 + (i * 61 + i * i * 7) % 236]);
    function tribunes(fete) {
      ctx.fillStyle = "#33237A"; ctx.fillRect(0, 39, W, PN.SOL - 39);
      for (let r = 0; r < 6; r++) {
        const y = 86 + r * 16.5;
        ctx.fillStyle = r % 2 ? "#3B2A86" : "#45339A"; ctx.fillRect(0, y - 9, W, 16.5);
        for (let i = 0; i < 21; i++) {
          const k = r * 21 + i, x = 4 + i * 17.6 + (r % 2) * 8.8, h = fete ? Math.abs(Math.sin(horloge * 10 + k * 1.7)) * 6 : calme ? 0 : Math.sin(horloge * 1.7 + k * 0.9) * 0.9;
          ctx.fillStyle = MAILLOT[k * 5 % 7]; ctx.beginPath(); ctx.roundRect(x - 6, y - h, 12, 11, 4); ctx.fill();
          ctx.fillStyle = PEAU[k * 3 % 4]; ctx.beginPath(); ctx.arc(x, y - 4.5 - h, 4.4, 0, 6.3); ctx.fill();
          if (fete && k % 3 === 0) { ctx.strokeStyle = PEAU[k * 3 % 4]; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 5, y + 1 - h); ctx.lineTo(x - 8, y - 9 - h); ctx.moveTo(x + 5, y + 1 - h); ctx.lineTo(x + 8, y - 9 - h); ctx.stroke(); }
        }
      }
      // La guirlande de Noël au-dessus des gradins, et les panneaux au bord du terrain.
      ctx.strokeStyle = "rgba(255,251,242,.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = 0; x <= W; x += 60) { ctx.moveTo(x, 72); ctx.quadraticCurveTo(x + 30, 82, x + 60, 72); } ctx.stroke();
      for (let i = 0; i < 24; i++) { const u = (i % 4 + 0.5) / 4; ctx.globalAlpha = calme ? 1 : 0.55 + 0.45 * Math.sin(horloge * 4 + i * 2.1); ctx.fillStyle = [Y, O, P, B][i % 4]; ctx.beginPath(); ctx.arc(Math.floor(i / 4) * 60 + u * 60, 72 + 20 * u * (1 - u), 2.6, 0, 6.3); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C; ctx.fillRect(0, 175, W, 15); ctx.strokeStyle = N; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 175); ctx.lineTo(W, 175); ctx.stroke();
      for (const [t, x] of [["LOT LIBÉRÉ", 104], ["PHARMACOTECHNIE", 185], ["100 % SCELLÉ", 264]]) texte(ctx, t, x, 183, 9, N);
    }
    function pelouse() {
      for (let k = 0; k < 5; k++) { const y = PN.SOL + k * k * 11.6; ctx.fillStyle = k % 2 ? "#3F9A66" : "#4DAA74"; ctx.fillRect(0, y, W, (k === 4 ? H : PN.SOL + (k + 1) * (k + 1) * 11.6) - y); }
      ctx.strokeStyle = "rgba(38,7,109,.2)"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath();
      for (const [x, y] of BRINS) { const t = 2 + (y - PN.SOL) / 60; ctx.moveTo(x - t, y - t * 1.6); ctx.lineTo(x, y); ctx.lineTo(x + t, y - t * 1.6); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,251,242,.85)"; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.beginPath();
      ctx.moveTo(0, PN.SOL + 1.5); ctx.lineTo(W, PN.SOL + 1.5);
      ctx.moveTo(36, PN.SOL); ctx.lineTo(6, 268); ctx.lineTo(354, 268); ctx.lineTo(324, PN.SOL);
      ctx.moveTo(104, PN.SOL); ctx.lineTo(92, 222); ctx.lineTo(268, 222); ctx.lineTo(256, PN.SOL);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,251,242,.85)"; ctx.beginPath(); ctx.ellipse(PN.X0, PN.Y0 + 14, 26, 8, 0, 0, 6.3); ctx.fill();
    }
    function automate(vif) {
      const x = s.kx, y = PN.SOL - s.kz, rg = RP.rg;
      trait(ctx, 4); ctx.beginPath(); ctx.moveTo(x, PN.SOL - PN.HAUT + 4); ctx.lineTo(x, y - rg + 2); ctx.stroke();                 // le bras télescopique
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x - 15, PN.SOL - PN.HAUT - 9, 30, 13, 4); ctx.fill();                     // le chariot sur la barre
      trait(ctx, 2.6);
      for (const c of [-1, 1]) { ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x + c * (rg + 1) - 4, y - 9, 8, 18, 3); ctx.fill(); }   // les mors de la pince
      ctx.fillStyle = vif ? Y : V; ctx.beginPath(); ctx.arc(x, y, rg, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(x - 12, y - 8, 24, 12, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = vif ? O : G; ctx.beginPath(); ctx.arc(x - 5, y - 2, 2.6, 0, 6.3); ctx.arc(x + 5, y - 2, 2.6, 0, 6.3); ctx.fill();
    }
    function dessiner() {
      const v = s.tir, issue = s.phase === "bilan" && v ? v.issue : "", fete = issue === "but" && !calme;
      tribunes(fete);
      pelouse();
      // Les spectateurs : quatre flacons, qui sautent de joie sur un but.
      for (const [i, x] of [16, 38, 322, 344].entries()) flacon(ctx, x, PN.SOL - 13 - (fete ? Math.abs(Math.sin(horloge * 11 + i)) * 9 : 0), 0, [P, B, Y, P][i]);
      // La cage : le filet, puis les montants et la barre.
      ctx.fillStyle = "rgba(255,251,242,.74)"; ctx.fillRect(PN.G, PN.SOL - PN.HAUT, PN.D - PN.G, PN.HAUT);
      ctx.strokeStyle = "rgba(38,7,109,.2)"; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = PN.G + 20; x < PN.D; x += 20) { ctx.moveTo(x, PN.SOL - PN.HAUT); ctx.lineTo(x, PN.SOL); }
      for (let y = PN.SOL - PN.HAUT + 18; y < PN.SOL; y += 18) { ctx.moveTo(PN.G, y); ctx.lineTo(PN.D, y); }
      ctx.stroke();
      ctx.strokeStyle = N; ctx.lineWidth = 9; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(PN.G, PN.SOL); ctx.lineTo(PN.G, PN.SOL - PN.HAUT); ctx.lineTo(PN.D, PN.SOL - PN.HAUT); ctx.lineTo(PN.D, PN.SOL); ctx.stroke();
      ctx.strokeStyle = C; ctx.lineWidth = 3.5; ctx.stroke();
      // Le tableau de marque : une pastille par tir.
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(62, 44, 236, 26, 9); ctx.fill(); ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < RP.tirs; i++) {
        const x = 180 + (i - (RP.tirs - 1) / 2) * 22, r = s.issues[i];
        trait(ctx, 2); ctx.fillStyle = r === "but" ? G : r ? R : C; ctx.beginPath(); ctx.arc(x, 57, 7, 0, 6.3); ctx.fill(); ctx.stroke();
        if (i === s.n && !r && !clos) { ctx.strokeStyle = O; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, 57, 10.5, 0, 6.3); ctx.stroke(); }
      }
      automate(issue === "arret");
      // Le bouchon : posé sur son point, en vol, ou là où il a fini.
      if (v) {
        const b = bouchonEn(v);
        ctx.fillStyle = "rgba(38,7,109,.18)"; ctx.beginPath(); ctx.ellipse(b.x, b.sol + b.r * 0.7, b.r, b.r * 0.35, 0, 0, 6.3); ctx.fill();
        if (s.phase === "vol" && !calme) for (let k = 3; k > 0; k--) { const q = bouchonEn({ ...v, t: Math.max(0, v.t - k * 0.035) }); ctx.globalAlpha = 0.12 * (4 - k); ctx.fillStyle = O; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.8, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
        bouchon(b.x, b.y, b.r, calme ? 0 : v.t * (v.e ? 16 * Math.sign(v.e) : 9 * (v.a < 0 ? -1 : 1)));
      } else if (!clos) {
        bouchon(PN.X0, PN.Y0, PN.RD, 0);
        if (visee) fleche(visee.a, visee.p, visee.e); else if (auClavier) fleche(ka, kp, ke);
        // Le choix du tir : trois pastilles en bas du terrain.
        for (const [i, [id, nom]] of TYPES.entries()) {
          const b = pastille(i), choisi = id === type;
          ctx.fillStyle = choisi ? Y : "rgba(38,7,109,.8)"; ctx.beginPath(); ctx.roundRect(b[0], b[1], b[2], b[3], 13); ctx.fill();
          if (choisi) { trait(ctx, 2.4); ctx.stroke(); }
          texte(ctx, (auClavier ? i + 1 + " · " : "") + nom, b[0] + b[2] / 2, b[1] + b[3] / 2 + 1, 13, choisi ? N : C);
        }
      }
      for (const e of eclats) { const k = e.t / e.d; ctx.globalAlpha = 1 - k; ctx.fillStyle = e.c; ctx.beginPath(); ctx.arc(e.x + e.vx * e.t, e.y + e.vy * e.t + 260 * e.t * e.t, 3.5, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; }
      if (s.n === 0 && s.phase === "vise" && !visee && !auClavier && !clos) {
        ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(28, 300, 284, 50, 14); ctx.fill();
        texte(ctx, "Glissez vers la cage, puis lâchez", 180, 316, 13, Y);
        texte(ctx, tactile ? "Geste courbe = effet · type de tir en bas" : "Geste courbe = effet · clavier : flèches, Espace", 180, 335, 11.5, C);
      }
      bandeau(ctx, "Tir " + Math.min(RP.tirs, s.n + 1) + "/" + RP.tirs + " · " + s.buts + (s.buts > 1 ? " buts" : " but"), duree - s.t, duree);
      if (issue && !clos) {
        const m = v.lucarne ? "Pleine lucarne, lot libéré !" : MSG[issue];
        ctx.fillStyle = "rgba(38,7,109,.88)"; ctx.beginPath(); ctx.roundRect(46, 222, 268, 40, 14); ctx.fill(); texte(ctx, m, 180, 243, 17, issue === "but" ? Y : P);
      }
      if (clos) {
        ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 200, 280, 110, 18); ctx.fill();
        texte(ctx, notePenalty(s) + " / 10", 180, 240, 40, Y); texte(ctx, s.buts + (s.buts > 1 ? " buts" : " but") + " sur " + RP.tirs + " tirs", 180, 282, 16, C);
      }
    }
    const arret = boucle(dt => {
      horloge += dt;
      if (!clos) {
        const g = touches.ArrowRight - touches.ArrowLeft, f = touches.ArrowUp - touches.ArrowDown;
        if (g && maj) ke = borne(ke + g * 1.3 * dt, -1, 1); else if (g) ka = borne(ka + g * 0.75 * dt, -PN.AMAX, PN.AMAX);
        if (f) kp = borne(kp + f * 0.5 * dt, 0, 1);
        pasPenalty(s, dt, duree);
        if (s.issues.length > vuIssue) {
          vuIssue = s.issues.length;
          const v = s.tir;
          if (v && v.issue === "but" && !calme) for (let i = 0; i < 14; i++) eclats.push({ x: v.ax, y: PN.SOL - v.z, vx: (i - 6.5) * 22, vy: -150 - (i * 37 % 90), t: 0, d: 0.8, c: [Y, O, G, P][i % 4] });
        }
        if (s.fini) {
          clos = true; lache(); prise = visee = null;
          const n = notePenalty(s), joues = s.issues.length, pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.buts, "bouchon", "bouchons") + " au fond de la cage sur " + RP.tirs + " tirs" + (s.lucarnes ? ", dont " + s.lucarnes + " en pleine lucarne" : "") + (joues < RP.tirs ? " (" + pl(RP.tirs - joues, "tir non joué", "tirs non joués") + " faute de temps)" : "") + " : " + n + " sur 10 (la note est le nombre de buts).";
          // Quatre chiffres pour le tableau final : points, tirs réussis, lucarnes, plus longue série de buts.
          let serie = 0, suite = 0; for (const r of s.issues) { suite = r === "but" ? suite + 1 : 0; serie = Math.max(serie, suite); }
          const chiffres = [[s.brut, s.brut > 1 ? "points" : "point"], [s.buts + "/" + RP.tirs, s.buts > 1 ? "tirs réussis" : "tir réussi"], [s.lucarnes, s.lucarnes > 1 ? "lucarnes" : "lucarne"], [serie, serie > 1 ? "buts d'affilée" : "but d'affilée"]];
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.brut, chiffres); }, 1300);
        }
      }
      for (let i = eclats.length - 1; i >= 0; i--) { eclats[i].t += dt; if (eclats[i].t >= eclats[i].d) eclats.splice(i, 1); }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }
  api.penalty = penalty;
  Object.assign(api._coeur, { REGL_PENALTY: RP, PN, creerPenalty, tirerPenalty, pasPenalty, notePenalty, placementPenalty });
  /* ----- Fin [penalty] ----- */

  /* ----- Repère [volley] : le volley ----- */
  /* Le volley des poches. Vue de côté : une poche de perfusion retombe sous son poids, il faut la renvoyer par-dessus le pied
     à perfusion sans qu'elle touche le sol, face à un automate sur roulettes. Le cœur d'abord (simulable hors navigateur). */
  // Réglages étalonnés par simulation (node outils/etalon-volley.js) : ils fixent la difficulté.
  const RVO = { g: 880, frappe: 470, gain: 1.03, vmax: 640, elan: 0.35, main: 320, clavier: 280, saut: 480, poids: 1350, robot: 190, reflexe: 0.25, erreur: 8, malice: 0.5, pause: 0.7, touches: 3, smash: 1.4, haut: 22 };
  const VO_PAS = 1 / 240, VO_RB = 12, VO_RJ = 18, VO_G = 14, VO_D = 346, VO_SOL = 404, VO_HAUT = 39, VO_FX = 180, VO_FE = 4, VO_FH = 92, VO_TETE = 34, VO_H = 460;
  // Le vol libre de la poche pendant dt : pesanteur, murs, plafond et pied à perfusion (un trait vertical au bout arrondi).
  function volPoche(b, dt) {
    b.vy += RVO.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < VO_G + VO_RB) { b.x = 2 * (VO_G + VO_RB) - b.x; b.vx = Math.abs(b.vx) * 0.9; }
    else if (b.x > VO_D - VO_RB) { b.x = 2 * (VO_D - VO_RB) - b.x; b.vx = -Math.abs(b.vx) * 0.9; }
    if (b.y < VO_HAUT + VO_RB) { b.y = 2 * (VO_HAUT + VO_RB) - b.y; b.vy = Math.abs(b.vy) * 0.9; }
    const py = Math.max(VO_SOL - VO_FH, b.y), dx = b.x - VO_FX, dy = b.y - py, d = Math.hypot(dx, dy), r = VO_RB + VO_FE;
    if (d < r) {
      const nx = d ? dx / d : (b.vx > 0 ? -1 : 1), ny = d ? dy / d : 0, vn = b.vx * nx + b.vy * ny;
      b.x = VO_FX + nx * r; b.y = py + ny * r;
      if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; }
    }
  }
  // Où et quand la poche redescendra-t-elle à la hauteur y ? (vx, vy : pour essayer une autre vitesse de départ)
  function prevoirPoche(b, y, vx, vy) {
    const c = { x: b.x, y: b.y, vx: vx === undefined ? b.vx : vx, vy: vy === undefined ? b.vy : vy };
    let t = 0;
    while (t < 5 && !(c.vy > 0 && c.y >= y)) { volPoche(c, 1 / 120); t += 1 / 120; }
    return { x: c.x, t };
  }
  const elanPoche = s => Math.min(RVO.vmax, RVO.frappe * Math.pow(RVO.gain, s.echange));
  // Un match : cible est l'endroit où le joueur veut être, saut une demande de saut (en secondes de validité).
  // x, y : le joueur (y = hauteur des pieds au-dessus du sol) ; ax : l'automate. Le hasard vient de la graine.
  function creerVolley(graine) {
    let a = graine || 20261219;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return { t: 0, acc: 0, x: 40, y: 0, vy: 0, cible: 40, saut: 0, ax: 268, avise: 268, avu: -1, aquand: 1e9, balle: null, attente: 1.4, vers: -1, pour: 0, contre: 0, echange: 0, record: 0, dernier: -1, touches: 0, tape: [-9, -9], smashT: -9, smashs: 0, frappes: 0, msg: "", msgT: -9, impact: null, h, fini: false };
  }
  // L'automate lit la trajectoire à chaque nouvelle frappe : si la poche retombe chez lui, il choisit où la renvoyer (plutôt loin
  // du joueur, selon sa malice), cherche l'angle de frappe qui y mène et se place en conséquence, après un
  // temps de réflexion et à une erreur près, qui grandit quand l'échange s'accélère.
  function automateVolley(s) {
    const b = s.balle;
    if (!b) { s.avise = 268; s.avu = -1; return; }
    if (b.n !== s.avu) { s.avu = b.n; s.aquand = s.t + RVO.reflexe; }
    if (s.t < s.aquand) return;
    s.aquand = 1e9;
    const yc = VO_SOL - VO_TETE - 26, p = prevoirPoche(b, yc);
    if (p.x < VO_FX + VO_FE) { s.avise = 268; return; }
    const b1 = 40 + s.h() * 110, b2 = 40 + s.h() * 110, but = s.h() < RVO.malice && Math.abs(b2 - s.x) > Math.abs(b1 - s.x) ? b2 : b1, v = elanPoche(s);
    let mieux = 0.3, ecart = 1e9;
    for (let a = 0.06; a < 1.15; a += 0.07) {
      const q = prevoirPoche({ x: p.x, y: yc }, VO_SOL - VO_RB, -Math.sin(a) * v, -Math.cos(a) * v);
      if (q.x < VO_FX && Math.abs(q.x - but) < ecart) { ecart = Math.abs(q.x - but); mieux = a; }
    }
    const g = (s.h() + s.h() + s.h() + s.h() - 2) * 1.7;
    s.avise = p.x + (VO_RB + VO_RJ) * Math.sin(mieux) + g * RVO.erreur * v / RVO.frappe;
  }
  // Une tête ronde (centre cx, cy, vitesse vx, vy) touche-t-elle la poche ? Si oui, la poche repart dans l'axe tête-poche,
  // avec une part de l'élan de la tête. qui : 0 le joueur, 1 l'automate. Rend vrai si la frappe est de trop (4e touche).
  function touchePoche(s, b, cx, cy, vx, vy, qui) {
    const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), r = VO_RB + VO_RJ;
    if (d >= r || s.t - s.tape[qui] < 0.12) return false;
    const nx = d ? dx / d : 0, ny = d ? dy / d : -1;
    if ((b.vx - vx) * nx + (b.vy - vy) * ny >= 0) return false;
    if (s.dernier === qui) s.touches++; else { if (s.dernier >= 0) { s.echange++; s.record = Math.max(s.record, s.echange); } s.dernier = qui; s.touches = 1; }
    const v = elanPoche(s);
    b.vx = nx * v + vx * RVO.elan; b.vy = ny * v + vy * RVO.elan;
    const w = Math.hypot(b.vx, b.vy); if (w > RVO.vmax) { b.vx *= RVO.vmax / w; b.vy *= RVO.vmax / w; }
    b.x = cx + nx * r; b.y = cy + ny * r; b.n++; s.tape[qui] = s.t; if (qui === 0) s.frappes++;
    // Le smash : le joueur frappe en l'air (pieds à plus de RVO.haut du sol) une poche qui est devant lui. Elle part alors tout
    // droit et plus vite, selon l'angle le plus plongeant qui passe encore le pied à perfusion.
    if (qui === 0 && s.y > RVO.haut && nx > 0.15 && b.x < VO_FX) {
      const vs = Math.min(RVO.vmax * 1.25, v * RVO.smash);
      for (let a = 0.7; a > -0.75; a -= 0.05) {
        const sx = Math.cos(a) * vs, sy = Math.sin(a) * vs, tf = (VO_FX - b.x) / sx;
        if (b.y + sy * tf + RVO.g * tf * tf / 2 < VO_SOL - VO_FH - VO_RB - VO_FE - 5) { b.vx = sx; b.vy = sy; s.smashT = s.t; s.smashs++; break; }
      }
    }
    return s.touches > RVO.touches;
  }
  function pointVolley(s, pourJoueur, msg) {
    if (pourJoueur) { s.pour++; s.vers = 1; } else { s.contre++; s.vers = -1; }
    s.msg = msg; s.msgT = s.t; s.impact = { x: s.balle.x, y: s.balle.y, t: s.t }; s.balle = null; s.attente = RVO.pause;
  }
  function unPasVolley(s, duree) {
    const dt = VO_PAS;
    s.t += dt;
    if (s.t >= duree) { s.fini = true; return; }
    const x0 = s.x, a0 = s.ax;
    s.x += borne(borne(s.cible, VO_G + VO_RJ, VO_FX - VO_FE - VO_RJ) - s.x, -RVO.main * dt, RVO.main * dt);
    if (s.saut > 0) { s.saut -= dt; if (s.y === 0) { s.vy = RVO.saut; s.saut = 0; } }
    if (s.y > 0 || s.vy > 0) { s.y += s.vy * dt; s.vy -= RVO.poids * dt; if (s.y <= 0) { s.y = 0; s.vy = 0; } }
    automateVolley(s);
    s.ax += borne(borne(s.avise, VO_FX + VO_FE + VO_RJ, VO_D - VO_RJ) - s.ax, -RVO.robot * dt, RVO.robot * dt);
    const b = s.balle;
    if (!b) {
      s.attente -= dt;
      // Mise en jeu : la poche est lâchée du plafond, du côté de celui qui vient de perdre le point,
      // jamais au-dessus de la place de départ du joueur (un joueur qui ne fait rien ne renvoie rien).
      if (s.attente <= 0) { s.balle = { x: 180 + s.vers * (48 + s.h() * 57), y: VO_HAUT + 40, vx: -s.vers * s.h() * 30, vy: 0, tour: 0, n: 0 }; s.echange = 0; s.dernier = -1; s.touches = 0; }
      return;
    }
    volPoche(b, dt); b.tour += dt * b.vx / 90;
    if (touchePoche(s, b, s.x, VO_SOL - VO_TETE - s.y, (s.x - x0) / dt, -s.vy, 0)) pointVolley(s, false, "Quatre touches : faute…");
    else if (touchePoche(s, b, s.ax, VO_SOL - VO_TETE, (s.ax - a0) / dt, 0, 1)) pointVolley(s, true, "Faute de l'automate !");
    else if (b.y + VO_RB >= VO_SOL) { if (b.x < VO_FX) pointVolley(s, false, "Poche à terre…"); else pointVolley(s, true, "Poche livrée !"); }
  }
  // Pas fixe, comme le tennis : la physique avance par tranches de 1/240 s quel que soit le rythme d'affichage.
  function pasVolley(s, dt, duree) { s.acc += dt; while (s.acc >= VO_PAS && !s.fini) { s.acc -= VO_PAS; unPasVolley(s, duree); } }
  // La note : la part des points gagnés, ramenée sur 10.
  const noteVolley = s => s.pour + s.contre ? Math.round(10 * s.pour / (s.pour + s.contre)) : 0;

  /* ----- Le volley des poches : dessin et commandes (navigateur seulement) ----- */
  function volley(el, opt) {
    const duree = opt.duree || 60, { cv, ctx, xDe, liberer } = monter(el, VO_H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le volley des poches. Glissez le doigt, bougez la souris ou utilisez les flèches gauche et droite pour vous déplacer ; touchez l'écran, cliquez ou appuyez sur Espace pour sauter. Renvoyez la poche par-dessus le pied à perfusion sans qu'elle touche le sol, en trois touches au plus. Frappée en l'air, la poche part en smash.");
    const s = creerVolley(), media = q => typeof matchMedia === "function" && matchMedia(q).matches;
    const tactile = media("(pointer: coarse)"), calme = media("(prefers-reduced-motion: reduce)");
    const XMIN = VO_G + VO_RJ, XMAX = VO_FX - VO_FE - VO_RJ, PALE = "rgba(38,7,109,.5)";
    let clos = false, minuterie = 0, gauche = false, droite = false, pilote = null;
    // La poche porte le logo de la pharmacotechnie sur son étiquette ; tant que l'image n'est pas là (ou si elle manque), l'étiquette reste vierge.
    const logo = new Image(); logo.src = opt.logo || api._logo;
    const viser = e => { s.cible = borne(xDe(e), XMIN, XMAX); };
    // Tout appui fait sauter. Au doigt, le premier doigt posé dirige ; un autre doigt (l'autre pouce) ne fait que sauter.
    const appui = e => {
      e.preventDefault(); cv.focus({ preventScroll: true });
      if (e.pointerType === "mouse") viser(e);
      else if (pilote === null) { pilote = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (_) { } viser(e); }
      s.saut = 0.12;
    };
    const glisse = e => { if (e.pointerType === "mouse" || e.pointerId === pilote) { e.preventDefault(); viser(e); } };
    const releve = e => { if (e.pointerId === pilote) pilote = null; };
    const touche = (e, v) => {
      const g = e.key === "ArrowLeft", d = e.key === "ArrowRight", h = e.key === "ArrowUp" || e.key === " " || e.key === "Spacebar";
      if (!g && !d && !h) return;
      if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target && e.target.tagName || ""))) return;
      if (v) e.preventDefault();
      if (g) gauche = v; else if (d) droite = v; else if (v && !e.repeat) s.saut = 0.12;
    };
    const enfonce = e => touche(e, true), leve = e => touche(e, false), lache = () => { gauche = droite = false; pilote = null; }, menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", glisse); cv.addEventListener("pointerup", releve); cv.addEventListener("pointercancel", releve); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", glisse); cv.removeEventListener("pointerup", releve); cv.removeEventListener("pointercancel", releve); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
    };
    // Le regard : les pupilles suivent la poche.
    const regard = (x, y, k) => { const b = s.balle; if (!b) return [0, 0]; const d = Math.hypot(b.x - x, b.y - y) || 1; return [(b.x - x) / d * k, (b.y - y) / d * k]; };
    // Le préparateur : charlotte, masque et blouse. Sa tête (le cercle de rayon VO_RJ) est ce qui frappe la poche.
    function preparateur(x, sol, vif) {
      const cy = sol - VO_TETE, [ex, ey] = regard(x, cy, 2.2);
      trait(ctx, 2.4);
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x - 9, sol - 5, 7, 5, 2); ctx.roundRect(x + 2, sol - 5, 7, 5, 2); ctx.fill();
      ctx.fillStyle = O; ctx.beginPath(); ctx.roundRect(x - 11, sol - 20, 22, 17, [7, 7, 3, 3]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = vif ? Y : C; ctx.beginPath(); ctx.arc(x, cy, VO_RJ, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = B; ctx.beginPath(); ctx.arc(x, cy, VO_RJ, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x - 10, cy + 5, 20, 9, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(x - 6 + ex, cy - 1 + ey, 2.3, 0, 6.3); ctx.arc(x + 6 + ex, cy - 1 + ey, 2.3, 0, 6.3); ctx.fill();
    }
    // L'automate : un chariot à roulettes coiffé d'une cloche, avec un seul œil (son objectif).
    function automate(x, vif) {
      const cy = VO_SOL - VO_TETE, [ex, ey] = regard(x, cy, 3.5);
      trait(ctx, 2.4);
      ctx.beginPath(); ctx.moveTo(x, cy - VO_RJ); ctx.lineTo(x, cy - VO_RJ - 7); ctx.stroke();
      ctx.fillStyle = s.t < s.aquand && s.balle ? G : O; ctx.beginPath(); ctx.arc(x, cy - VO_RJ - 8, 3, 0, 6.3); ctx.fill();
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x - 14, VO_SOL - 19, 28, 13, 4); ctx.fill();
      ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x - 8, VO_SOL - 4.5, 3.5, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 8, VO_SOL - 4.5, 3.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = vif ? Y : V; ctx.beginPath(); ctx.arc(x, cy, VO_RJ, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x - 3, cy - 1, 8.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(x - 3 + ex, cy - 1 + ey, 4, 0, 6.3); ctx.fill();
    }
    // La poche de perfusion : œillet de suspension en haut, soluté dans le bas, embout en dessous.
    function poche(b) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(calme ? 0 : b.tour);
      trait(ctx, 2.2);
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-2.5, 10, 5, 5, 1.5); ctx.fill();
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-9.5, -13, 19, 25, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = B; ctx.beginPath(); ctx.roundRect(-9.5, 3, 19, 9, [0, 0, 6, 6]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(0, -10, 1.5, 0, 6.3); ctx.fill();
      if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.arc(0, -1, 6.6, 0, 6.3); ctx.clip(); ctx.drawImage(logo, -6.6, -7.6, 13.2, 13.2); ctx.restore(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -1, 6.6, 0, 6.3); ctx.stroke(); }
      ctx.restore();
    }
    // Le fond : une salle de sport. Sous les projecteurs, une tribune de cinq gradins de collègues (certains ont gardé leur
    // charlotte), qui se lèvent quand vous marquez ; devant, les panneaux du bord de terrain, puis le sol du terrain. Au milieu,
    // le tableau d'affichage du score, en chiffres à segments (ceux du flipper). Le public est tiré une fois pour toutes.
    const foule = [], PEAUX = ["#F3D2B3", "#E0B48C", "#B98458", "#8A5A3A"], TENUES = [O, P, V, G, B, Y, C, R, "#5B4AA8", "#2F7F86"], CHEVEUX = ["#2B1B12", "#5A3A1E", "#B9772E", "#D9D2C4", "#1A1030"];
    { let gr = 20261219; const al = () => (gr = gr * 16807 % 2147483647) / 2147483647, un = t => t[Math.floor(al() * t.length)];
      for (let r = 0; r < 5; r++) { const e = 0.72 + r * 0.1, pas = 16.5 * e; for (let x = VO_G + 3 + (r % 2) * pas / 2; x < VO_D + 4; x += pas) foule.push({ r, x: x + (al() - 0.5) * 3, e, tenue: un(TENUES), peau: un(PEAUX), cheveux: al() < 0.35 ? B : un(CHEVEUX), ph: al() * 6.3, vif: al() }); } }
    const GRADIN = r => 158 + r * 31 + r * r * 1.2;        // la ligne des épaules du rang r
    function decor() {
      const g0 = VO_G, l = VO_D - VO_G, joie = !clos && s.msg.endsWith("!") && s.t - s.msgT < 1.1 ? Math.sin((s.t - s.msgT) / 1.1 * Math.PI) : 0;
      // La salle : le haut dans l'ombre, deux projecteurs et leur halo.
      let d = ctx.createLinearGradient(0, VO_HAUT, 0, 320); d.addColorStop(0, "#120338"); d.addColorStop(0.45, "#2A1568"); d.addColorStop(1, "#3B2784");
      ctx.fillStyle = d; ctx.fillRect(g0, VO_HAUT, l, VO_SOL - VO_HAUT);
      ctx.strokeStyle = "rgba(255,251,242,.07)"; ctx.lineWidth = 3; ctx.beginPath();                                   // la charpente
      for (let x = g0 - 20; x < VO_D; x += 46) { ctx.moveTo(x, VO_HAUT + 34); ctx.lineTo(x + 23, VO_HAUT + 4); ctx.lineTo(x + 46, VO_HAUT + 34); }
      ctx.moveTo(g0, VO_HAUT + 34); ctx.lineTo(VO_D, VO_HAUT + 34); ctx.stroke();
      for (const x of [46, 314]) {
        d = ctx.createRadialGradient(x, 62, 2, x, 62, 150); d.addColorStop(0, "rgba(255,244,200,.5)"); d.addColorStop(0.25, "rgba(255,244,200,.14)"); d.addColorStop(1, "rgba(255,244,200,0)");
        ctx.fillStyle = d; ctx.fillRect(g0, VO_HAUT, l, 280);
        ctx.fillStyle = "#0D0228"; ctx.beginPath(); ctx.roundRect(x - 13, 50, 26, 12, 3); ctx.fill();
        ctx.fillStyle = "#FFF6D0"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 8 + i * 8, 58, 2.6, 0, 6.3); ctx.fill(); }
      }
      // La tribune, du fond vers l'avant : le gradin, puis ses spectateurs (épaules, tête, cheveux ou charlotte).
      for (let r = 0; r < 5; r++) {
        const y = GRADIN(r), e = 0.72 + r * 0.1;
        d = ctx.createLinearGradient(0, y - 4, 0, y + 34); d.addColorStop(0, r % 2 ? "#3A2880" : "#33217A"); d.addColorStop(1, "#1C0B4E");
        ctx.fillStyle = d; ctx.fillRect(g0, y - 4 * e, l, 40);
        ctx.fillStyle = "rgba(255,251,242,.16)"; ctx.fillRect(g0, y + 9 * e, l, 1.5);                                 // le nez de marche, éclairé
        for (const p of foule) {
          if (p.r !== r) continue;
          const leve = joie * (0.4 + 0.6 * p.vif), dy = calme ? 0 : -leve * 7 * e + Math.sin(s.t * 1.3 + p.ph) * 0.5, x = p.x, t = y + dy;
          ctx.fillStyle = p.tenue; ctx.beginPath(); ctx.roundRect(x - 6.5 * e, t - 1 * e, 13 * e, 16 * e, [5 * e, 5 * e, 0, 0]); ctx.fill();
          ctx.fillStyle = "rgba(18,3,56,.28)"; ctx.fillRect(x - 6.5 * e, t + 7 * e, 13 * e, 8 * e);                    // l'ombre du rang de devant
          if (leve > 0.35 && !calme) { ctx.strokeStyle = p.tenue; ctx.lineWidth = 2.6 * e; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - 5 * e, t + 2 * e); ctx.lineTo(x - 8 * e, t - 9 * e * leve); ctx.moveTo(x + 5 * e, t + 2 * e); ctx.lineTo(x + 8 * e, t - 9 * e * leve); ctx.stroke(); }
          ctx.fillStyle = p.peau; ctx.beginPath(); ctx.arc(x, t - 5.5 * e, 4.6 * e, 0, 6.3); ctx.fill();
          ctx.fillStyle = p.cheveux; ctx.beginPath(); ctx.arc(x, t - 6.3 * e, 4.8 * e, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.arc(x - 1.6 * e, t - 7 * e, 1.5 * e, 0, 6.3); ctx.fill();   // le reflet des projecteurs
        }
      }
      // Le voile : la tribune recule dans la pénombre, pour que la poche et les joueurs se détachent.
      d = ctx.createLinearGradient(0, 130, 0, 326); d.addColorStop(0, "rgba(18,3,56,.5)"); d.addColorStop(1, "rgba(18,3,56,.2)");
      ctx.fillStyle = d; ctx.fillRect(g0, 130, l, 196);
      // Les panneaux du bord de terrain.
      const PANNEAUX = [["PHARMACOTECHNIE", C], ["ZÉRO POCHE À TERRE", Y], ["LOT LIBÉRÉ", B]];
      ctx.fillStyle = "#0D0228"; ctx.fillRect(g0, 322, l, 34);
      PANNEAUX.forEach(([mot, coul], i) => {
        const x = g0 + 2 + i * (l - 4) / 3, w = (l - 4) / 3 - 2;
        d = ctx.createLinearGradient(0, 325, 0, 353); d.addColorStop(0, coul); d.addColorStop(1, "rgba(38,7,109,.35)");
        ctx.fillStyle = coul; ctx.fillRect(x, 325, w, 28); ctx.fillStyle = d; ctx.fillRect(x, 339, w, 14);
        texte(ctx, mot, x + w / 2, 339.5, 8.5, N);
      });
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(g0, 322, l, 1.5);
      // Le sol du terrain, vu de trois quarts : il fuit vers le fond, avec le reflet des projecteurs.
      d = ctx.createLinearGradient(0, 356, 0, VO_H); d.addColorStop(0, "#2C6E96"); d.addColorStop(0.3, "#3F8FB8"); d.addColorStop(1, "#63AFD6");
      ctx.fillStyle = d; ctx.fillRect(g0, 356, l, VO_H - 356);
      d = ctx.createLinearGradient(0, 356, 0, 372); d.addColorStop(0, "rgba(13,2,40,.45)"); d.addColorStop(1, "rgba(13,2,40,0)");
      ctx.fillStyle = d; ctx.fillRect(g0, 356, l, 16);                                                                // l'ombre des panneaux
      for (const x of [70, 290]) { d = ctx.createRadialGradient(x, 400, 2, x, 400, 70); d.addColorStop(0, "rgba(255,255,255,.22)"); d.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = d; ctx.save(); ctx.translate(0, 400); ctx.scale(1, 0.35); ctx.translate(0, -400); ctx.fillRect(g0, 200, l, 400); ctx.restore(); }
      ctx.fillStyle = "rgba(255,251,242,.85)"; ctx.fillRect(g0, 366, l, 2); ctx.fillRect(g0, VO_SOL, l, 3);           // les lignes du terrain
      ctx.fillStyle = "rgba(255,251,242,.5)"; ctx.beginPath(); ctx.moveTo(VO_FX - 1.5, 367); ctx.lineTo(VO_FX + 1.5, 367); ctx.lineTo(VO_FX + 2.5, VO_SOL); ctx.lineTo(VO_FX - 2.5, VO_SOL); ctx.fill();
      texte(ctx, "LE SOL N'EST PAS UNE ÉTAGÈRE", 180, VO_SOL + 31, 11, "rgba(255,251,242,.6)");
      // Le tableau d'affichage, pendu au plafond.
      ctx.strokeStyle = "#0D0228"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(122, VO_HAUT); ctx.lineTo(122, 56); ctx.moveTo(238, VO_HAUT); ctx.lineTo(238, 56); ctx.stroke();
      ctx.fillStyle = "#0D0228"; ctx.beginPath(); ctx.roundRect(84, 54, 192, 66, 10); ctx.fill();
      ctx.strokeStyle = Y; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(88.5, 58.5, 183, 57, 7); ctx.stroke();
      texte(ctx, "VOUS", 133, 69, 9, C); texte(ctx, "AUTOMATE", 227, 69, 9, C);
      const deux = (x, n, coul) => { const m = Math.min(99, n); chiffre(ctx, x - 18, 79, 15, 28, m > 9 ? Math.floor(m / 10) : -1, coul); chiffre(ctx, x + 3, 79, 15, 28, m % 10, coul); };
      deux(133, s.pour, s.msg.endsWith("!") && s.t - s.msgT < 1 ? Y : O); deux(227, s.contre, !s.msg.endsWith("!") && s.t - s.msgT < 1 ? Y : V);
      ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(180, 87, 2, 0, 6.3); ctx.arc(180, 99, 2, 0, 6.3); ctx.fill();
    }
    function dessiner() {
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, VO_H);
      decor();
      // L'ombre de la poche aide à juger où elle retombe.
      const b = s.balle;
      if (b) { const k = 1 - (VO_SOL - b.y) / (VO_SOL - VO_HAUT) * 0.6; ctx.fillStyle = "rgba(13,2,40,.35)"; ctx.beginPath(); ctx.ellipse(b.x, VO_SOL + 6, 13 * k, 3.5 * k, 0, 0, 6.3); ctx.fill(); }
      // Le filet : un pied à perfusion.
      trait(ctx, 2.4); ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(VO_FX - 17, VO_SOL - 5, 34, 6, 3); ctx.fill();
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(VO_FX - VO_FE, VO_SOL - VO_FH - VO_FE, VO_FE * 2, VO_FH + VO_FE, VO_FE); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C; ctx.beginPath(); ctx.arc(VO_FX - 9, VO_SOL - VO_FH + 5, 5, 0.2, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(VO_FX + 9, VO_SOL - VO_FH + 5, 5, 0, Math.PI - 0.2); ctx.stroke();
      const vifJ = s.t - s.tape[0] < 0.12, vifA = s.t - s.tape[1] < 0.12;
      automate(s.ax, vifA);
      preparateur(s.x, VO_SOL - s.y, vifJ);
      // Les touches du joueur : trois pastilles au-dessus de sa tête, qui s'allument à chaque frappe.
      if (b && s.dernier === 0) for (let i = 0; i < RVO.touches; i++) { trait(ctx, 1.6); ctx.fillStyle = i < s.touches ? (s.touches >= RVO.touches ? R : O) : C; ctx.beginPath(); ctx.arc(s.x - 9 + i * 9, VO_SOL - s.y - VO_TETE - VO_RJ - 9, 3.2, 0, 6.3); ctx.fill(); ctx.stroke(); }
      if (b && s.t - s.smashT < 0.45) {
        if (!calme) { ctx.strokeStyle = "rgba(236,119,57," + (0.75 * (1 - (s.t - s.smashT) / 0.45)).toFixed(2) + ")"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.07, b.y - b.vy * 0.07); ctx.stroke(); }
        texte(ctx, "SMASH !", 97, 146, 20, O);
      }
      if (b) poche(b);
      else if (s.impact && s.t - s.impact.t < 0.7) {
        // La poche à terre, et l'onde de sa chute.
        const u = (s.t - s.impact.t) / 0.7;
        poche({ x: s.impact.x, y: VO_SOL - 9, tour: 1.57 });
        if (!calme) { ctx.strokeStyle = "rgba(38,7,109," + (0.5 * (1 - u)).toFixed(2) + ")"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s.impact.x, VO_SOL + 4, 14 + 26 * u, 4 + 5 * u, 0, 0, 6.3); ctx.stroke(); }
      } else if (!clos && s.t - s.msgT >= 1) texte(ctx, "Nouvelle poche…", 180, 140, 14, "rgba(255,251,242,.85)");
      if (s.t < 5 && !clos) {
        ctx.globalAlpha = Math.min(1, 5 - s.t) * 0.92;
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(42, 196, 276, 48, 14); ctx.fill();
        texte(ctx, tactile ? "Glissez le doigt pour vous déplacer" : "Souris ou flèches ◀ ▶ pour vous déplacer", 180, 211, 13, Y);
        texte(ctx, tactile ? "Touchez pour sauter : en l'air, smash !" : "Clic ou Espace pour sauter : en l'air, smash !", 180, 229, 13, Y);
        ctx.globalAlpha = 1;
      }
      const n = noteVolley(s);
      bandeau(ctx, "Vous " + s.pour + " · Automate " + s.contre + " · " + n + "/10", duree - s.t, duree);
      if (!clos && s.t - s.msgT < 1) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(50, 130, 260, 40, 14); ctx.fill(); texte(ctx, s.msg, 180, 151, 17, s.msg.endsWith("!") ? Y : P); }
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 170, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 210, 40, Y); texte(ctx, s.pour + " gagnés sur " + (s.pour + s.contre) + " joués", 180, 252, 16, C); }
    }
    const arret = boucle(dt => {
      if (!clos) {
        if (gauche !== droite) s.cible = borne(s.x + (gauche ? -1 : 1) * RVO.clavier * dt, XMIN, XMAX);
        pasVolley(s, dt, duree);
        if (s.fini) {
          clos = true; lache();
          const n = noteVolley(s), joues = s.pour + s.contre, pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.pour, "point gagné", "points gagnés") + " sur " + pl(joues, "joué", "joués") + " contre l'automate : " + n + " sur 10 (la note est la part des points gagnés).";
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, joues ? Math.round(100 * s.pour / joues) * 100 + Math.min(99, s.pour) : 0, [[s.pour + "/" + joues, s.pour > 1 ? "points gagnés" : "point gagné"], [s.smashs, s.smashs > 1 ? "smashs" : "smash"], [s.frappes, s.frappes > 1 ? "frappes" : "frappe"], [s.record, s.record > 1 ? "renvois d'affilée" : "renvoi d'affilée"]]); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }
  api.volley = volley;
  Object.assign(api._coeur, { REGL_VOLLEY: RVO, creerVolley, pasVolley, noteVolley, prevoirPoche, VO: { RB: VO_RB, RJ: VO_RJ, G: VO_G, D: VO_D, SOL: VO_SOL, HAUT: VO_HAUT, FX: VO_FX, FE: VO_FE, FH: VO_FH, TETE: VO_TETE, H: VO_H } });
  /* ----- Fin [volley] ----- */

  /* ----- Repère [haies] : le saut de haies ----- */
  /* Le sprint du couloir : une livraison urgente à porter au bout du couloir de la ZAC. Le préparateur court tout seul ;
     un seul bouton pour sauter (appui bref : petit saut, appui maintenu : grand saut). Une chute fait perdre du temps et l'élan,
     pas la partie. Le score brut est l'avance prise, en décimètres, sur un coureur témoin qui ne sauterait jamais : sans rien
     faire, on finit à sa hauteur, donc à 0. */
  // Le cœur. Distances en px (HA_M px pour un mètre), hauteurs comptées depuis le sol.
  const RH = { v0: 190, vmax: 285, acc: 7, g: 1800, saut: 420, seuil: 0.14, tenue: 0.34, gTenu: 150, chute: 0.8, tampon: 0.08, salto: 0.28, gain: 12, sur: 30, ecart: 270, serre: 60, flou: 120, double: 175, plein: 9000, palier: 0.55 };
  const HA_PAS = 1 / 120, HA_M = 25, HA_DEMI = 7, HA_TAILLE = 78;
  // w : longueur, h : hauteur à franchir ; grand : demande un grand saut ; sol : ne gêne que les pieds posés ; bas : hauteur libre sous un portique.
  const HA_TYPES = { carton: { w: 26, h: 24 }, bidon: { w: 22, h: 28 }, chariot: { w: 54, h: 38, grand: 1 }, flaque: { w: 84, h: 1, sol: 1, grand: 1 }, portique: { w: 26, h: 24, bas: 134 } };
  // Même couloir pour tout le monde : le hasard est tiré d'une graine fixe. Les obstacles se resserrent avec la distance.
  function parcoursHaies(graine, longueur) {
    let a = graine || 20261224;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const L = [], vus = {}, debut = ["carton", "carton", "bidon", "flaque", "carton", "chariot", "bidon", "flaque", "chariot"];
    const poser = (k, x) => { const o = Object.assign({ k, x }, HA_TYPES[k]); vus[k] = (vus[k] || 0) + 1; if ((o.grand || o.bas) && vus[k] <= 2) o.aide = true; L.push(o); return x + o.w; };
    let x = 430;
    while (x < longueur) {
      const prog = Math.min(1, x / RH.plein), r = h();
      let k = debut[L.length];
      if (!k) k = r < 0.2 ? "carton" : r < 0.36 ? "bidon" : r < 0.55 ? "flaque" : r < 0.74 ? "chariot" : r < 0.88 ? "double" : "portique";
      if (k === "double") { poser("carton", x); x = poser(h() < 0.5 ? "carton" : "bidon", x + RH.double); }
      else x = poser(k, x);
      x += RH.ecart - RH.serre * prog + h() * RH.flou;
    }
    return L;
  }
  // Le coureur témoin : la même course sans jamais sauter (il percute tout). temoin[i] est sa position après i pas.
  const HA_TEMOINS = {};
  function temoinHaies(graine, duree) {
    const cle = (graine || 0) + ":" + duree + ":" + JSON.stringify(RH);
    if (!HA_TEMOINS[cle]) { const s = creerHaies(graine, duree, true), T = [0]; while (!s.fini) { unPasHaies(s, duree); T.push(s.x); } HA_TEMOINS[cle] = T; }
    return HA_TEMOINS[cle];
  }
  function creerHaies(graine, duree, seul) {
    return { temoin: seul ? null : temoinHaies(graine, duree || 50), pas: 0, t: 0, x: 0, y: 0, vy: 0, v: RH.v0, elan: 0, sol: true, tenu: false, lache: true, grand: false, demande: -1, tSaut: -9, tSalto: -9, arret: 0, tChute: -9, dernier: null,
      file: parcoursHaies(graine, (RH.vmax + RH.sur) * (duree || 50) + 500), suivant: 0, francs: 0, chutes: 0, sauts: 0, salto: null, saltos: 0, fini: false };
  }
  // Le bouton : enfoncé (true) ou relâché (false). Un appui juste avant de toucher le sol est gardé en mémoire un instant.
  // Un second appui en plein saut lance un salto, s'il reste assez de temps de vol pour le boucler (RH.salto). La trajectoire ne
  // change pas ; à la réception, le salto donne de l'élan (RH.gain), jusqu'à RH.sur au-delà de la vitesse de croisière, mais
  // seulement s'il a passé un obstacle : un salto dans le vide est gratuit, pour que l'appui au hasard ne rapporte rien.
  function appuiHaies(s, on) {
    s.tenu = !!on; if (!on) return;
    s.demande = s.t;
    if (!s.sol && !s.salto && s.arret <= 0) {
      const reste = (s.vy + Math.sqrt(s.vy * s.vy + 2 * RH.g * s.y)) / RH.g;
      if (reste >= RH.salto) s.salto = { t0: s.t, d: RH.salto };
    }
  }
  function unPasHaies(s, duree) {
    s.t += HA_PAS; s.pas++;
    if (s.t >= duree) { s.fini = true; return; }
    if (s.arret > 0) { s.arret -= HA_PAS; s.demande = -1; return; }             // à terre : le temps de se relever
    s.elan = Math.max(s.elan, Math.min(RH.vmax - RH.v0, s.elan + RH.acc * HA_PAS)); s.v = RH.v0 + s.elan;
    s.x += s.v * HA_PAS;
    if (s.sol && s.demande >= 0 && s.t - s.demande <= RH.tampon) { s.sol = false; s.vy = RH.saut; s.tSaut = s.t; s.xSaut = s.x; s.demande = -1; s.lache = false; s.grand = false; s.sauts++; }
    if (!s.sol) {
      const ts = s.t - s.tSaut;
      if (!s.tenu) s.lache = true;
      const plane = !s.lache && ts >= RH.seuil && ts < RH.tenue;                // bouton tenu : le saut s'allonge
      if (plane) s.grand = true;
      s.vy -= (plane ? RH.gTenu : RH.g) * HA_PAS; s.y += s.vy * HA_PAS;
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.sol = true; if (s.salto) { s.saltos++; if (s.file.slice(Math.max(0, s.suivant - 2), s.suivant + 1).some(o => !o.touche && o.x >= s.xSaut && o.x + o.w <= s.x + HA_DEMI)) { s.tSalto = s.t; s.elan = Math.min(RH.vmax - RH.v0 + RH.sur, s.elan + RH.gain); } } s.salto = null; }
    }
    let o = s.file[s.suivant];
    while (o && o.x + o.w < s.x - HA_DEMI) { if (!o.touche) s.francs++; o = s.file[++s.suivant]; }
    if (!o || o.touche) return;
    const d = o.sol ? 0 : HA_DEMI;
    if (o.x < s.x + d && o.x + o.w > s.x - d && (s.y < o.h || (o.bas && s.y + HA_TAILLE > o.bas))) {
      o.touche = true; o.tete = !(s.y < o.h); s.dernier = o; s.chutes++; s.tChute = s.t; s.arret = RH.chute; s.elan = 0; s.v = 0; s.y = 0; s.vy = 0; s.sol = true; s.demande = -1; s.salto = null;
    }
  }
  function pasHaies(s, dt, duree) { s.acc = (s.acc || 0) + dt; while (s.acc >= HA_PAS && !s.fini) { s.acc -= HA_PAS; unPasHaies(s, duree); } }
  const metresHaies = s => s.x / HA_M;
  // L'avance sur le témoin, en mètres : 0 tant qu'on n'a pas sauté, et jamais négative.
  const avanceHaies = s => s.sauts && s.temoin ? Math.max(0, s.x - s.temoin[Math.min(s.pas, s.temoin.length - 1)]) / HA_M : 0;
  // La note suit l'avance gagnée par seconde de course : un point par tranche de RH.palier (en m/s), arrondi au plus proche.
  const noteHaies = (s, duree) => borne(Math.round(avanceHaies(s) / duree / RH.palier), 0, 10);
  const brutHaies = s => Math.round(avanceHaies(s) * 10);

  // Le dessin et les commandes. Le coureur reste à HA_XJ et le couloir défile ; en mouvement réduit, le décor ne défile pas
  // (mur et sol unis), le coureur ne s'agite pas et seuls les obstacles avancent.
  const HA_H = 330, HA_SOL = 262, HA_XJ = 78, HA_HAUT = 66;
  const HA_PORTES = ["ONCO", "HÉMATO", "GASTRO", "PNEUMO"];   // les services à livrer, sur les pancartes des portes
  // Les affiches du couloir : un jeu de société, une consigne de bonnes pratiques. [dessin, couleur du fond, trois lignes]
  const HA_AFFICHES = [["de", O, "ON NE JOUE", "PAS LES DOSES", "AUX DÉS"], ["meeple", B, "MEEPLE", "EN CHARLOTTE,", "MEEPLE ADMIS"], ["cartes", P, "PAS DE BLUFF", "À LA", "LIBÉRATION"],
    ["pion", G, "ÉCHEC ET MAT", "AUX GERMES", "EN 3 COUPS"], ["sablier", Y, "LE SABLIER", "N'EST PAS UN", "CHRONO VALIDÉ"], ["domino", V, "DOUBLE SIX ?", "DOUBLE", "CONTRÔLE !"]];
  const HA_MOTS = { carton: "Carton renversé !", bidon: "Aïe, le bidon !", chariot: "Chariot percuté !", flaque: "Ça glisse !", portique: "Carton renversé !" };
  function haies(el, opt) {
    const duree = opt.duree || 50, { cv, ctx, liberer } = monter(el, HA_H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le sprint du couloir. Le préparateur court tout seul : touchez, cliquez ou appuyez sur Espace pour sauter les obstacles. Appui bref : petit saut. Appui maintenu : grand saut. Un second appui en plein saut : un salto, qui donne de l'élan s'il passe un obstacle.");
    const media = q => typeof matchMedia === "function" && matchMedia(q).matches, tactile = media("(pointer: coarse)"), calme = media("(prefers-reduced-motion: reduce)");
    const s = creerHaies(0, duree);
    if (opt.essai) opt.essai(s);                                                                       // pour le banc d'essai : l'état du jeu
    let clos = false, minuterie = 0;
    const logo = new Image(); logo.src = opt.logo || "img/logo-pharmacotechnie.webp";               // le logo de l'unité, sur le colis
    const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } appuiHaies(s, true); };
    const lache = () => appuiHaies(s, false);
    const clavier = (e, v) => {
      if (e.key !== " " && e.key !== "Spacebar" && e.key !== "ArrowUp") return;
      if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || ""))) return;
      if (v) { e.preventDefault(); if (e.repeat) return; }
      appuiHaies(s, v);
    };
    const enfonce = e => clavier(e, true), leve = e => clavier(e, false), menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("contextmenu", menu);
    window.addEventListener("pointerup", lache); window.addEventListener("pointercancel", lache);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("pointerup", lache); window.removeEventListener("pointercancel", lache);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
    };
    const boite = (x, y, w, h, r, coul) => { ctx.fillStyle = coul; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke(); };
    const pastille = (t, x, y, coul) => { ctx.font = "800 9px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; const w = ctx.measureText(t).width + 14; ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 8, w, 16, 8); ctx.fill(); texte(ctx, t, x, y + 0.5, 9, coul || Y); };
    function decor(cam) {
      ctx.fillStyle = "#EDEAF6"; ctx.fillRect(0, 39, W, HA_SOL - 39);                                  // le mur
      ctx.fillStyle = "#D9D2EE"; ctx.fillRect(0, 39, W, HA_HAUT - 39);                                  // le faux plafond
      ctx.fillStyle = "rgba(185,166,240,.32)"; ctx.fillRect(0, HA_SOL - 44, W, 44);                     // le soubassement
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(0, HA_SOL, W, HA_H - HA_SOL);                             // le sol
      if (!calme) {
        ctx.strokeStyle = "rgba(38,7,109,.1)"; ctx.lineWidth = 2;                                       // les joints du sol
        for (let x = -((cam % 60) + 60) % 60; x < W + 40; x += 60) { ctx.beginPath(); ctx.moveTo(x, HA_SOL); ctx.lineTo(x - 26, HA_H); ctx.stroke(); }
        for (let i = Math.floor((cam - 80) / 190); i * 190 < cam + W; i++) { trait(ctx, 2); boite(i * 190 + 40 - cam, 47, 62, 9, 4, C); }   // les néons
        for (let i = Math.max(0, Math.floor((cam - 380) / 560)); i * 560 + 300 < cam + W; i++) {       // les portes
          const x = i * 560 + 300 - cam;
          trait(ctx, 2.6); boite(x, HA_SOL - 120, 64, 120, [6, 6, 0, 0], i % 2 ? P : B);
          boite(x + 20, HA_SOL - 98, 24, 24, 12, C); ctx.fillStyle = N; ctx.fillRect(x + 52, HA_SOL - 62, 5, 14);
          trait(ctx, 2.4); boite(x - 6, HA_SOL - 146, 76, 20, 5, C); texte(ctx, HA_PORTES[i % HA_PORTES.length], x + 32, HA_SOL - 135.5, 12, N);   // la pancarte du service
        }
        for (let i = Math.max(0, Math.floor((cam - 100) / 560)); i * 560 + 20 < cam + W; i++) affiche(HA_AFFICHES[i % HA_AFFICHES.length], i * 560 + 14 - cam, 94);
        for (let i = Math.max(1, Math.floor(cam / (50 * HA_M))); i * 50 * HA_M < cam + W + 40; i++) {   // un repère tous les 50 m
          const x = i * 50 * HA_M - cam;
          ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, HA_SOL + 4); ctx.lineTo(x - 22, HA_H - 6); ctx.stroke();
          texte(ctx, i * 50 + " m", x + 6, HA_SOL + 16, 11, "rgba(38,7,109,.5)", "left");
        }
      }
      ctx.strokeStyle = "rgba(38,7,109,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, HA_SOL - 44); ctx.lineTo(W, HA_SOL - 44); ctx.moveTo(0, HA_HAUT); ctx.lineTo(W, HA_HAUT); ctx.stroke();
      trait(ctx, 3); ctx.beginPath(); ctx.moveTo(0, HA_SOL); ctx.lineTo(W, HA_SOL); ctx.stroke();
    }
    function affiche(a, x, y) {
      trait(ctx, 2.2); boite(x, y, 76, 76, 3, C);
      ctx.fillStyle = a[1]; ctx.fillRect(x + 4, y + 4, 68, 36);
      const cx = x + 38, cy = y + 22;
      trait(ctx, 2);
      if (a[0] === "de") { boite(cx - 11, cy - 11, 22, 22, 5, C); ctx.fillStyle = N; for (const [dx, dy] of [[-5, -5], [5, 5], [0, 0], [-5, 5], [5, -5]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.9, 0, 6.3); ctx.fill(); } }
      else if (a[0] === "meeple") {
        ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(cx - 12, cy + 14); ctx.lineTo(cx - 6, cy + 2); ctx.lineTo(cx - 14, cy - 1); ctx.lineTo(cx - 12, cy - 6); ctx.lineTo(cx - 4, cy - 5); ctx.arc(cx, cy - 8, 5, Math.PI * 0.8, Math.PI * 0.2); ctx.lineTo(cx + 12, cy - 6); ctx.lineTo(cx + 14, cy - 1); ctx.lineTo(cx + 6, cy + 2); ctx.lineTo(cx + 12, cy + 14); ctx.lineTo(cx + 3, cy + 14); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 3, cy + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C; ctx.beginPath(); ctx.arc(cx, cy - 9.5, 6.5, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();                 // sa charlotte
      } else if (a[0] === "cartes") {
        for (const [r, dx, coul] of [[-0.3, -6, C], [0.25, 6, Y]]) { ctx.save(); ctx.translate(cx + dx, cy); ctx.rotate(r); boite(-8, -12, 16, 24, 3, coul); ctx.fillStyle = R; ctx.beginPath(); ctx.roundRect(-5, -2, 10, 5, 2.5); ctx.fill(); ctx.restore(); }
      } else if (a[0] === "pion") {
        ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(cx - 9, cy + 13); ctx.lineTo(cx - 4, cy - 2); ctx.lineTo(cx + 4, cy - 2); ctx.lineTo(cx + 9, cy + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy - 7, 6, 0, 6.3); ctx.fill(); ctx.stroke();
      } else if (a[0] === "sablier") {
        ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(cx - 9, cy - 13); ctx.lineTo(cx + 9, cy - 13); ctx.lineTo(cx + 1.5, cy); ctx.lineTo(cx + 9, cy + 13); ctx.lineTo(cx - 9, cy + 13); ctx.lineTo(cx - 1.5, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 12); ctx.lineTo(cx, cy + 5); ctx.lineTo(cx + 6, cy + 12); ctx.closePath(); ctx.fill();
      } else {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.2); boite(-17, -9, 34, 18, 3, C); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
        ctx.fillStyle = N; for (const sx of [-8.5, 8.5]) for (const dx of [-4, 0, 4]) for (const dy of [-4, 4]) { ctx.beginPath(); ctx.arc(sx + dx, dy, 1.4, 0, 6.3); ctx.fill(); }
        ctx.restore();
      }
      for (let i = 0; i < 3; i++) texte(ctx, a[2 + i], cx, y + 48 + i * 9, 7.5, N);
    }
    function carton(x, w, h) {
      boite(x, HA_SOL - h, w, h, 2, "#E0B77A");
      ctx.fillStyle = C; ctx.fillRect(x + w / 2 - 3, HA_SOL - h + 1.2, 6, h - 2.4);
      ctx.fillStyle = N; ctx.fillRect(x + 3, HA_SOL - 8, 6, 2); ctx.fillRect(x + 3, HA_SOL - 5, 4, 2);
    }
    function obstacle(o, x) {
      const renverse = o.touche && !o.tete, k = o.touche ? Math.min(1, (s.t - o.quand) / 0.2) : 0;
      trait(ctx, 2.4);
      if (o.k === "flaque") {
        ctx.fillStyle = "rgba(143,199,232,.9)"; ctx.beginPath(); ctx.ellipse(x + o.w / 2, HA_SOL + 7, o.w / 2, 6, 0, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = C; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 16, HA_SOL + 5); ctx.lineTo(x + 34, HA_SOL + 5); ctx.moveTo(x + 46, HA_SOL + 9); ctx.lineTo(x + 60, HA_SOL + 9); ctx.stroke();
        return;
      }
      if (o.bas) {                                                                                     // le rideau du sas, pendu au plafond
        const y = HA_SOL - o.bas - 3, balance = o.tete && !calme ? Math.sin((s.t - o.quand) * 14) * Math.exp(-(s.t - o.quand) * 3) * 0.12 : 0;
        ctx.save(); ctx.translate(x + o.w / 2, HA_HAUT); ctx.rotate(balance);
        ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-16, y - 26 - HA_HAUT); ctx.moveTo(16, 0); ctx.lineTo(16, y - 26 - HA_HAUT); ctx.stroke();
        boite(-24, y - 26 - HA_HAUT, 48, 26, 4, Y);
        texte(ctx, "SAS", 0, y - 15 - HA_HAUT, 11, N);
        ctx.fillStyle = N; for (let i = -20; i < 20; i += 10) { ctx.beginPath(); ctx.moveTo(i, y - HA_HAUT - 1); ctx.lineTo(i + 5, y - HA_HAUT - 1); ctx.lineTo(i + 8, y - HA_HAUT - 6); ctx.lineTo(i + 3, y - HA_HAUT - 6); ctx.fill(); }
        ctx.restore();
      }
      ctx.save();
      if (renverse) { ctx.translate(x + o.w + (o.k === "chariot" ? 16 * k : 6 * k), HA_SOL); ctx.rotate(o.k === "chariot" ? 0.07 * k : 0.6 * k); ctx.translate(-x - o.w, -HA_SOL); }
      if (o.k === "carton" || o.k === "portique") carton(x, o.w, o.h);
      else if (o.k === "bidon") {
        ctx.fillStyle = N; ctx.fillRect(x + 3, HA_SOL - o.h, 8, 6);
        boite(x, HA_SOL - o.h + 5, o.w, o.h - 5, 5, B);
        trait(ctx, 2); boite(x + 4, HA_SOL - o.h + 12, o.w - 8, 9, 2, C);
        ctx.fillStyle = O; ctx.beginPath(); ctx.arc(x + o.w / 2, HA_SOL - o.h + 17, 2.4, 0, 6.3); ctx.fill();
      } else {                                                                                         // le chariot et ses bacs
        ctx.beginPath(); ctx.moveTo(x + 4, HA_SOL - 10); ctx.lineTo(x + 4, HA_SOL - o.h + 1); ctx.lineTo(x + 10, HA_SOL - o.h + 1); ctx.stroke();
        boite(x + 12, HA_SOL - 25, 17, 13, 2, P); boite(x + 31, HA_SOL - 31, 19, 19, 2, G); boite(x + 14, HA_SOL - o.h + 1, 14, 12, 2, O);
        boite(x + 2, HA_SOL - 13, o.w - 4, 5, 2, V);
        ctx.fillStyle = N; ctx.beginPath(); ctx.arc(x + 10, HA_SOL - 4, 4, 0, 6.3); ctx.arc(x + o.w - 10, HA_SOL - 4, 4, 0, 6.3); ctx.fill();
      }
      ctx.restore();
    }
    // Le préparateur en blouse (charlotte, masque, pyjama de bloc, sabots), son colis au logo de l'unité tenu devant lui.
    // Repère local : les pieds à l'origine, la hanche à 34, le sommet de la charlotte à HA_TAILLE. Une jambe = cuisse + tibia.
    let auSol = true, tPose = -9;
    function jambe(a, pli, fond) {
      const kx = Math.sin(a) * 17, ky = -34 + Math.cos(a) * 17, fx = kx + Math.sin(a - pli) * 17, fy = ky + Math.cos(a - pli) * 17;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const [coul, w] of [[N, 8.5], [fond, 4.5]]) { ctx.strokeStyle = coul; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke(); }
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(-(a - pli) * 0.6); trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-4, -3.5, 12, 7, [3, 4, 2, 3]); ctx.fill(); ctx.stroke(); ctx.restore();   // le sabot
    }
    function coureur() {
      const tombe = s.arret > 0, vif = s.sol && !tombe && !calme, ph = s.x / 16, tour = s.salto && !calme;
      if (s.sol && !auSol) tPose = s.t; auSol = s.sol;
      // À terre : il bascule en avant, puis se relève juste avant de repartir.
      const k = tombe ? (calme ? 1 : Math.min(1, (s.t - s.tChute) / 0.16) * Math.min(1, s.arret / 0.22)) : 0;
      const pose = vif ? Math.max(0, 1 - (s.t - tPose) / 0.13) : 0;                                      // l'amorti de la réception
      ctx.fillStyle = "rgba(38,7,109,.16)"; ctx.beginPath(); ctx.ellipse(HA_XJ + 2 + 34 * k, HA_SOL + 3, Math.max(8, 20 - s.y / 8) + 14 * k, 4, 0, 0, 6.3); ctx.fill();
      // Les deux jambes : [angle de la cuisse, pli du genou], l'avant du corps vers la droite.
      let J1, J2;
      if (tombe) { J1 = [0.25, 0.5]; J2 = [-0.3, 0.2]; }
      else if (tour) { J1 = [1.25, 1.9]; J2 = [1.05, 1.9]; }                                             // groupé pendant le salto
      else if (!s.sol) {
        const m = borne(s.vy / RH.saut, -1, 1);                                                          // 1 à l'appel, -1 à la réception
        J1 = [0.95 + 0.25 * m, 0.75 + 0.75 * m]; J2 = [-0.55 - 0.3 * m, 0.55 - 0.3 * m];                 // le genou d'attaque monte, la jambe d'appel traîne
      } else if (vif) {
        const f = i => { const p = ph + i * Math.PI; return [0.78 * Math.sin(p), 0.22 + 1.15 * Math.max(0, Math.cos(p)) + 0.5 * pose]; };
        J1 = f(0); J2 = f(1);
      } else { J1 = [0.4, 0.25]; J2 = [-0.4, 0.3]; }
      const bas = j => -34 + Math.cos(j[0]) * 17 + Math.cos(j[0] - j[1]) * 17, leve = s.sol && !tombe ? -Math.max(bas(J1), bas(J2)) - 3.5 : 0;   // le pied le plus bas touche le sol
      ctx.save(); ctx.translate(HA_XJ, HA_SOL - s.y + leve); ctx.rotate(1.35 * k);
      if (tour) { ctx.translate(0, -40); ctx.rotate(6.2832 * Math.min(1, (s.t - s.salto.t0) / s.salto.d)); ctx.translate(0, 40); }   // le salto : un tour complet avant de retomber
      jambe(J2[0], J2[1], V);
      jambe(J1[0], J1[1], B);
      // Le buste penche avec l'élan ; à l'appel il se redresse, à la réception il plonge un peu.
      const penche = calme ? 0.1 : tombe ? 0.1 : !s.sol ? 0.16 - 0.1 * borne(s.vy / RH.saut, -1, 1) : 0.1 + 0.13 * Math.min(1, s.elan / (RH.vmax - RH.v0)) + 0.1 * pose;
      ctx.translate(0, -34); ctx.rotate(penche); ctx.translate(0, 34);
      const pan = vif ? 4 + 3 * Math.sin(ph * 2) : !s.sol ? 6 : 2, hop = vif ? Math.sin(ph * 2) * 1.2 : 0;
      trait(ctx, 2.4);
      ctx.fillStyle = C; ctx.beginPath();                                                                // la blouse, dont le pan vole à l'arrière
      ctx.moveTo(-9, -52); ctx.quadraticCurveTo(-9, -59, -2, -59); ctx.lineTo(5, -59); ctx.quadraticCurveTo(11, -59, 11, -52); ctx.lineTo(11, -27); ctx.lineTo(-6, -25);
      ctx.quadraticCurveTo(-10 - pan, -22, -14 - pan, -27 + pan * 0.4); ctx.quadraticCurveTo(-11, -38, -9, -52); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(7, -58); ctx.lineTo(3, -49); ctx.lineTo(4, -27); ctx.moveTo(-6, -40); ctx.lineTo(0, -40); ctx.lineTo(0, -34); ctx.stroke();   // le revers, la fermeture, la poche
      ctx.fillStyle = O; ctx.fillRect(-4.5, -44, 2, 5);                                                  // le stylo de la poche
      ctx.fillStyle = C; trait(ctx, 2.2); ctx.beginPath(); ctx.roundRect(-1, -64, 7, 7, 2); ctx.fill(); ctx.stroke();   // le cou
      trait(ctx, 2); boite(9, -61 + hop, 25, 23, 3, C);                                                  // le colis, serré contre lui
      if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 11, -60 + hop, 21, 21);
      else { ctx.fillStyle = O; ctx.fillRect(19.5, -56 + hop, 4, 13); ctx.fillRect(15, -51.5 + hop, 13, 4); }
      for (const [coul, w] of [[N, 8], [C, 4.2]]) { ctx.strokeStyle = coul; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(1, -54); ctx.lineTo(6, -43 + hop * 0.5); ctx.lineTo(17, -44 + hop); ctx.stroke(); }   // le bras, coude plié
      trait(ctx, 2); ctx.fillStyle = B; ctx.beginPath(); ctx.arc(18, -44 + hop, 3.6, 0, 6.3); ctx.fill(); ctx.stroke();           // le gant
      trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(3, -67, 8.5, 0, 6.3); ctx.fill(); ctx.stroke();                  // la tête
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4, -65); ctx.lineTo(6, -66); ctx.stroke();                                 // l'élastique du masque
      trait(ctx, 1.8); boite(5.5, -68.5, 7.5, 8, 2.5, B);                                                // le masque
      trait(ctx, 2.4); ctx.fillStyle = V; ctx.beginPath(); ctx.ellipse(1, -70.5, 11, 7.5, -0.12, Math.PI * 0.93, Math.PI * 2.07); ctx.closePath(); ctx.fill(); ctx.stroke();   // la charlotte, bouffante
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(7.2, -70.3, 1.4, 0, 6.3); ctx.fill();
      ctx.lineWidth = 1.5; ctx.beginPath();
      if (tombe) { ctx.moveTo(5, -73.5); ctx.lineTo(9.5, -72); } else { ctx.moveTo(5, -72.2); ctx.lineTo(9.5, -73.4); }   // le sourcil : décidé en course, penaud à terre
      ctx.stroke();
      ctx.restore();
      if (tombe && !calme) for (let i = 0; i < 3; i++) { const a = s.t * 7 + i * 2.1; texte(ctx, "✦", HA_XJ + 70 + Math.cos(a) * 14, HA_SOL - 46 + Math.sin(a) * 7, 13, O); }
      if (!calme && !tombe && !s.salto && s.elan > 55) {                                                 // les traits de vitesse
        ctx.strokeStyle = "rgba(38,7,109," + Math.min(0.5, 0.1 + 0.25 * (s.elan - 55) / 40) + ")"; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const y = HA_SOL - s.y - 20 - i * 18, l = 12 + ((s.t * 9 + i * 1.7) % 1) * 16; ctx.beginPath(); ctx.moveTo(HA_XJ - 26 - l, y); ctx.lineTo(HA_XJ - 26, y); ctx.stroke(); }
      }
    }
    function dessiner() {
      const cam = s.x - HA_XJ, m = Math.floor(metresHaies(s)), n = noteHaies(s, duree);
      decor(cam);
      for (let i = Math.max(0, s.suivant - 2); i < s.file.length; i++) {
        const o = s.file[i], x = o.x - cam;
        if (x > W + 30) break;
        if (o.touche && o.quand === undefined) o.quand = s.t;
        obstacle(o, x);
        if (o.aide && !o.touche && x + o.w > HA_XJ) pastille(o.bas ? "SAUT BREF" : "MAINTENIR", x + o.w / 2, o.bas ? HA_SOL - o.bas - 40 : HA_SOL - 150);
      }
      coureur();
      ctx.fillStyle = "rgba(38,7,109,.5)"; texte(ctx, "ÉLAN", 10, HA_H - 12, 9, "rgba(38,7,109,.6)", "left");   // la jauge d'élan
      ctx.fillStyle = "rgba(38,7,109,.15)"; ctx.beginPath(); ctx.roundRect(40, HA_H - 16, 70, 8, 4); ctx.fill();
      const plein = RH.vmax - RH.v0;
      if (s.elan > plein) { ctx.fillStyle = O; ctx.beginPath(); ctx.roundRect(40, HA_H - 16, 70 + 24 * (s.elan - plein) / RH.sur, 8, 4); ctx.fill(); }   // le surplus gagné aux saltos
      ctx.fillStyle = s.arret > 0 ? R : G; ctx.beginPath(); ctx.roundRect(40, HA_H - 16, 4 + 66 * Math.min(1, s.elan / plein), 8, 4); ctx.fill();
      if (s.t < 5.5 && !clos) {
        ctx.globalAlpha = Math.min(1, 5.5 - s.t) * 0.92;
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(14, 282, 332, 26, 13); ctx.fill();
        texte(ctx, tactile ? "Touchez : petit saut · maintenez : grand saut" : "Espace ou clic : petit saut · maintenu : grand saut", 180, 295.5, 12, Y);
        ctx.globalAlpha = 1;
      }
      bandeau(ctx, m + " m · " + s.chutes + (s.chutes > 1 ? " chutes" : " chute") + " · " + n + "/10", duree - s.t, duree);
      const cent = Math.floor(m / 100);
      if (!clos && s.arret > 0 && s.dernier) pastilleGrande(s.dernier.tete ? "Attention la tête !" : HA_MOTS[s.dernier.k], P);
      else if (!clos && (s.salto || s.t - s.tSalto < 0.5)) pastilleGrande(s.salto ? "Salto !" : "Salto : élan gagné !", Y);
      else if (!clos && cent > 0 && metresHaies(s) - cent * 100 < 9) pastilleGrande(cent * 100 + " m !", Y);
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 96, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 136, 40, Y); texte(ctx, m + " m · " + Math.floor(avanceHaies(s)) + " m d'avance", 180, 178, 16, C); }
    }
    function pastilleGrande(t, coul) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(80, 78, 200, 34, 14); ctx.fill(); texte(ctx, t, 180, 96, 16, coul); }
    const arret = boucle(dt => {
      if (!clos) {
        pasHaies(s, dt, duree);
        if (s.fini) {
          clos = true;
          const n = noteHaies(s, duree), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const av = Math.floor(avanceHaies(s)), bilan = Math.floor(metresHaies(s)) + " m parcourus en " + duree + " s, soit " + av + " m d'avance sur un coureur qui ne sauterait jamais, " + pl(s.francs, "obstacle franchi", "obstacles franchis") + ", " + pl(s.chutes, "chute", "chutes") + (s.saltos ? ", " + pl(s.saltos, "salto", "saltos") : "") + " : " + n + " sur 10 (la note suit l'avance).";
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, brutHaies(s), [[Math.floor(metresHaies(s)) + " m", "parcourus"], [av + " m", "d'avance"], [s.francs, s.francs > 1 ? "obstacles franchis" : "obstacle franchi"], [s.chutes, s.chutes > 1 ? "chutes" : "chute"]]); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }
  api.haies = haies;
  Object.assign(api._coeur, { REGL_HAIES: RH, HA_TYPES, HA_M, HA_DEMI, HA_TAILLE, parcoursHaies, creerHaies, appuiHaies, pasHaies, noteHaies, metresHaies, avanceHaies, brutHaies });
  /* ----- Fin [haies] ----- */

  /* ----- Repère [etageres] : le jeu de plateformes ----- */
  /* --- Les étagères de la réserve : le cœur --- */
  // Un rayonnage de cinq niveaux à plat, percés de vides, reliés par des escabeaux. Le préparateur part du sol et va chercher
  // le lot urgent tout en haut ; il le livre, repart d'en bas, et recommence. L'étiqueteuse du dernier rayon lâche des bobines
  // d'étiquettes et des rouleaux de film qui roulent, tombent par les vides et rebondissent sur les montants.
  // Réglages étalonnés par simulation (node outils/etalon-etageres.js) : ils fixent la difficulté.
  const RE = { marche: 104, grimpe: 88, saut: 250, pesanteur: 900, bobine: 96, film: 132, partFilm: 0.3, cadence: 2.3, presse: 1.5, etourdi: 0.8, abri: 1.3, amende: 5, etage: 10, lot: 20, palier: 46 };
  const E_PAS = 1 / 120, E_XG = 16, E_XD = 344, E_RB = 9, E_PRISE = 12, E_TAMPON = 0.12;
  const E_NIV = [418, 346, 274, 202, 130];                                  // hauteur du plancher de chaque niveau, du sol au dernier rayon
  const E_VIDES = [[], [[16, 52], [308, 344]], [[165, 195]], [[56, 86], [290, 320]], [[196, 226]]];   // les vides de chaque niveau
  const E_ESC = [[130, 230], [84, 276], [110, 250], [150]];                 // les escabeaux qui partent de chaque niveau
  const E_LOT = 306, E_SOURCE = 72, E_MUR = 62, E_DEPART = 180;
  const eVide = (niv, x, marge) => E_VIDES[niv].some(v => x > v[0] + marge && x < v[1] - marge);
  function creerEtageres(graine) {
    let a = graine || 20261222;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return { t: 0, acc: 0, h, j: { x: E_DEPART, y: E_NIV[0], vy: 0, niv: 0, bas: 0, etat: "sol", vu: 1, pas: 0 }, cmd: { gx: 0, gy: 0 }, saute: 0, bobines: [], prochaine: 1,
      points: 0, haut: 0, lots: 0, etages: 0, chocs: 0, perdu: 0, etourdi: 0, abri: 0, msg: "", msgT: -9, gainT: -9, gain: 0, chocT: -9, livreT: -9, fini: false };
  }
  // Un niveau gagné ne compte qu'une fois par montée : retomber puis remonter ne rapporte rien.
  function eGagner(s) {
    const j = s.j;
    if (j.niv > s.haut) { const k = j.niv - s.haut; s.haut = j.niv; s.etages += k; s.points += k * RE.etage; s.gain = k * RE.etage; s.gainT = s.t; }
  }
  function eBobines(s, dt, duree) {
    s.prochaine -= dt;
    if (s.prochaine <= 0) {
      const film = s.h() < RE.partFilm;
      s.bobines.push({ x: E_SOURCE, y: E_NIV[4] - E_RB, niv: 4, d: 1, v: film ? RE.film : RE.bobine, film, chute: false, vy: 0, tour: 0 });
      s.prochaine = (RE.cadence + (RE.presse - RE.cadence) * s.t / duree) * (0.8 + 0.4 * s.h());   // la cadence monte au fil de la partie
    }
    let partie = false;
    for (const b of s.bobines) {
      if (b.chute) {
        b.vy += RE.pesanteur * dt; b.y += b.vy * dt;
        const sol = E_NIV[b.niv - 1] - E_RB;
        if (b.y >= sol) { b.y = sol; b.niv--; b.chute = false; b.vy = 0; if (s.h() < 0.5) b.d = -b.d; }   // en touchant le rayon, elle repart d'un côté ou de l'autre
        continue;
      }
      b.x += b.d * b.v * dt; b.tour += b.d * b.v * dt / E_RB;
      if (b.x < E_XG + E_RB || b.x > E_XD - E_RB) {
        if (b.niv === 0) { b.partie = partie = true; }                    // au sol, elle finit dans le bac de récupération
        else { b.d = b.x < 180 ? 1 : -1; b.x = b.x < 180 ? E_XG + E_RB : E_XD - E_RB; }
      } else if (eVide(b.niv, b.x, 3)) b.chute = true;
    }
    if (partie) s.bobines = s.bobines.filter(b => !b.partie);
  }
  function unPasEtageres(s, duree) {
    const dt = E_PAS, j = s.j;
    s.t += dt;
    if (s.t >= duree) { s.fini = true; return; }
    if (s.saute > 0) s.saute -= dt;
    if (s.abri > 0) s.abri -= dt;
    if (s.etourdi > 0) s.etourdi -= dt;
    eBobines(s, dt, duree);
    const libre = s.etourdi <= 0, gx = libre ? s.cmd.gx : 0, gy = libre ? s.cmd.gy : 0;
    const marcher = () => { j.x = borne(j.x + gx * RE.marche * dt, (j.y <= E_NIV[4] + 30 ? E_MUR : E_XG) + 8, E_XD - 8); if (gx) { j.vu = gx; j.pas += dt; } };
    if (j.etat === "sol") {
      // L'escabeau se prend en poussant vers le haut (ou vers le bas, du rayon du dessus) quand on est à son pied.
      const liste = gy < 0 ? E_ESC[j.niv] : gy > 0 ? E_ESC[j.niv - 1] : null, ex = liste && liste.find(x => Math.abs(x - j.x) <= E_PRISE);
      if (ex !== undefined && ex !== null) { j.etat = "esc"; j.x = ex; j.bas = gy < 0 ? j.niv : j.niv - 1; }
      else {
        marcher();
        if (libre && s.saute > 0) { s.saute = 0; j.etat = "air"; j.vy = -RE.saut; }
        else if (eVide(j.niv, j.x, 4)) { j.etat = "air"; j.vy = 0; }
        else if (j.niv === 4 && Math.abs(j.x - E_LOT) < 12) {
          // Lot livré : il part par le passe-plat, le préparateur repart d'en bas pour le suivant.
          s.lots++; s.points += RE.lot; s.haut = 0; s.livreT = s.t; s.msg = "Lot urgent livré ! +" + RE.lot; s.msgT = s.t;
          j.x = E_DEPART; j.y = E_NIV[0]; j.niv = 0; j.vu = 1; s.abri = Math.max(s.abri, 1);
        }
      }
    }
    if (j.etat === "esc") {
      j.y += gy * RE.grimpe * dt; if (gy) j.pas += dt;
      if (j.y <= E_NIV[j.bas + 1]) { j.y = E_NIV[j.bas + 1]; j.niv = j.bas + 1; j.etat = "sol"; eGagner(s); }
      else if (j.y >= E_NIV[j.bas]) { j.y = E_NIV[j.bas]; j.niv = j.bas; j.etat = "sol"; }
    } else if (j.etat === "air") {
      marcher();
      const y0 = j.y;
      j.vy += RE.pesanteur * dt; j.y += j.vy * dt;
      if (j.vy > 0) for (let k = 4; k >= 0; k--) if (y0 < E_NIV[k] && j.y >= E_NIV[k] && !eVide(k, j.x, 4)) { j.y = E_NIV[k]; j.niv = k; j.vy = 0; j.etat = "sol"; eGagner(s); break; }
    }
    // Une bobine reçue : étourdi un instant, une amende au compteur, et la partie continue.
    if (s.abri <= 0) for (const b of s.bobines) {
      if (Math.abs(b.x - j.x) >= 13 || Math.abs(b.y - (j.y - 13)) >= 20) continue;
      const perte = Math.min(RE.amende, s.points);
      s.chocs++; s.points -= perte; s.perdu += perte; s.etourdi = RE.etourdi; s.abri = RE.etourdi + RE.abri; s.chocT = s.t;
      s.msg = (b.film ? "Rouleau de film !" : "Bobine d'étiquettes !") + (perte ? " −" + perte : ""); s.msgT = s.t;
      break;
    }
  }
  function pasEtageres(s, dt, duree) { s.acc += dt; while (s.acc >= E_PAS && !s.fini) { s.acc -= E_PAS; unPasEtageres(s, duree); } }
  const noteEtageres = s => Math.min(10, Math.floor(s.points / RE.palier));

  /* --- Les étagères de la réserve : dessin et commandes --- */
  function etageres(el, opt) {
    const duree = opt.duree || 60, HE = 540, { cv, ctx, liberer } = monter(el, HE);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Les étagères de la réserve. Flèches ou Z, Q, S, D pour marcher et prendre les escabeaux, Espace pour sauter. Au doigt : la croix à gauche pour se déplacer, le bouton Saut à droite. Montez chercher le lot urgent tout en haut en évitant les bobines.");
    const s = creerEtageres(), media = q => typeof matchMedia === "function" && matchMedia(q).matches, tactile = media("(pointer: coarse)"), calme = media("(prefers-reduced-motion: reduce)");
    const PX = 80, PY = 486, SX = 284, SY = 486, BANDE = 430;
    const touches = new Set(), doigts = new Map();
    let clos = false, minuterie = 0, pad = null, sautT = -9;
    const maj = () => { const k = n => touches.has(n) ? 1 : 0; s.cmd.gx = pad ? pad.gx : k("d") - k("g"); s.cmd.gy = pad ? pad.gy : k("b") - k("h"); };
    const sauter = () => { s.saute = E_TAMPON; sautT = s.t; };
    const TOUCHES = { ArrowUp: "h", ArrowRight: "d", ArrowDown: "b", ArrowLeft: "g", z: "h", w: "h", d: "d", s: "b", q: "g", a: "g", " ": "saut", Spacebar: "saut" };
    const code = e => TOUCHES[e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key];
    const enfonce = e => {
      const k = code(e);
      if (!k || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target && e.target.tagName || "")) return;
      e.preventDefault();
      if (k === "saut") { if (!e.repeat) sauter(); } else { touches.add(k); maj(); }
    };
    const relache = e => { const k = code(e); if (k && k !== "saut") { touches.delete(k); maj(); } };
    const oubli = () => { touches.clear(); doigts.clear(); pad = null; maj(); };
    // Au doigt : la croix suit le pouce sans qu'il se lève (huit directions) ; tout le reste de l'écran fait sauter.
    const point = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.width * W]; };
    const viser = p => { const dx = p[0] - PX, dy = p[1] - PY, d = Math.hypot(dx, dy); pad = d < 9 ? { gx: 0, gy: 0 } : { gx: Math.abs(dx) > d * 0.5 ? Math.sign(dx) : 0, gy: Math.abs(dy) > d * 0.5 ? Math.sign(dy) : 0 }; maj(); };
    const appui = e => {
      e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { }
      const p = point(e);
      if (p[1] >= BANDE - 6 && p[0] < 180) { doigts.set(e.pointerId, "pad"); viser(p); } else { doigts.set(e.pointerId, "saut"); sauter(); }
    };
    const bouge = e => { if (doigts.get(e.pointerId) === "pad") viser(point(e)); };
    const leve = e => { if (doigts.get(e.pointerId) === "pad") { pad = null; maj(); } doigts.delete(e.pointerId); };
    const menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", bouge); cv.addEventListener("pointerup", leve); cv.addEventListener("pointercancel", leve); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", relache); window.addEventListener("blur", oubli);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", bouge); cv.removeEventListener("pointerup", leve); cv.removeEventListener("pointercancel", leve); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", relache); window.removeEventListener("blur", oubli);
    };
    // Le logo de la pharmacotechnie, sur le flanc de tout ce qui roule.
    const logo = new Image(); logo.src = api._logo;
    // Le stock de la réserve, au fond des rayons, en teintes pâles et sans contour pour ne pas se confondre avec le jeu :
    // [genre, x, niveau, largeur, hauteur]. Placé à la main, hors des vides et des escabeaux.
    const STOCK = [
      ["palette", 56, 0, 50, 34], ["bac", 158, 0, 44, 22], ["cartons", 254, 0, 44, 30],
      ["cartons", 96, 1, 20, 22], ["flacons", 150, 1, 62, 22], ["bac", 244, 1, 20, 16],
      ["bac", 22, 2, 44, 20], ["boites", 126, 2, 34, 30], ["flacons", 200, 2, 30, 20], ["cartons", 294, 2, 44, 34],
      ["boites", 20, 3, 30, 34], ["flacons", 168, 3, 30, 22], ["bac", 204, 3, 30, 18], ["boites", 324, 3, 16, 26],
      ["poches", 126, 2, 36, 0], ["poches", 262, 3, 24, 0]];
    const LAMPES = [R, Y, G, B, P, O];
    function objet(genre, x, y, l, ht) {
      const kraft = "rgba(205,160,110,.5)", ruban = "rgba(160,115,70,.45)", verre = "rgba(38,7,109,.13)", blanc = "rgba(255,255,255,.85)";
      if (genre === "palette" || genre === "cartons") {
        if (genre === "palette") { ctx.fillStyle = ruban; ctx.fillRect(x - 3, y - 5, l + 6, 2.5); for (let i = 0; i < 3; i++) ctx.fillRect(x - 3 + i * (l + 1) / 2, y - 2.5, 5, 2.5); y -= 5; ht -= 5; }
        const n = l > 30 ? 2 : 1, lc = l / n;
        for (let i = 0; i < n; i++) {
          const h = ht * (i ? 0.72 : 1), cx = x + i * lc;
          ctx.fillStyle = kraft; ctx.beginPath(); ctx.roundRect(cx + 0.5, y - h, lc - 1, h, 1.5); ctx.fill();
          ctx.fillStyle = ruban; ctx.fillRect(cx + lc / 2 - 1.5, y - h, 3, h);
          ctx.fillStyle = blanc; ctx.fillRect(cx + 3, y - h * 0.62, lc * 0.34, 5);
        }
      } else if (genre === "bac") {                                        // le bac gerbable bleu et son porte-étiquette
        ctx.fillStyle = "rgba(143,199,232,.6)"; ctx.beginPath(); ctx.moveTo(x, y - ht); ctx.lineTo(x + l, y - ht); ctx.lineTo(x + l - 3, y); ctx.lineTo(x + 3, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(90,150,200,.45)"; ctx.fillRect(x - 1, y - ht - 2.5, l + 2, 3);
        ctx.fillStyle = blanc; ctx.fillRect(x + l / 2 - 6, y - ht * 0.6, 12, 5);
      } else if (genre === "flacons") {                                    // une rangée de flacons, capsules de couleur
        const n = Math.max(2, Math.round(l / 11)), lf = l / n, caps = [O, G, P, Y, B];
        for (let i = 0; i < n; i++) {
          const fx = x + i * lf, h = ht * (i % 3 === 1 ? 0.8 : 1);
          ctx.fillStyle = verre; ctx.beginPath(); ctx.roundRect(fx + 1, y - h + 5, lf - 2, h - 5, 2); ctx.rect(fx + lf / 2 - 2, y - h + 2, 4, 3); ctx.fill();
          ctx.globalAlpha = 0.55; ctx.fillStyle = caps[i % caps.length]; ctx.fillRect(fx + lf / 2 - 3, y - h, 6, 2.5); ctx.globalAlpha = 1;
          ctx.fillStyle = blanc; ctx.fillRect(fx + 2, y - h * 0.55, lf - 4, 4.5);
        }
      } else if (genre === "boites") {                                     // des boîtes de médicaments empilées, à croix verte
        const etages = Math.max(2, Math.round(ht / 9)), he = ht / etages;
        for (let i = 0; i < etages; i++) {
          const d = i % 2 ? 2 : 0;
          ctx.fillStyle = i % 2 ? "rgba(229,180,217,.5)" : "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.roundRect(x + d, y - (i + 1) * he + 0.6, l - 2 - d, he - 1.2, 1.2); ctx.fill();
          ctx.fillStyle = "rgba(62,155,118,.55)"; ctx.fillRect(x + d + 3, y - (i + 0.5) * he - 0.8, 5, 1.6); ctx.fillRect(x + d + 4.7, y - (i + 0.5) * he - 2.5, 1.6, 5);
        }
      } else {                                                             // des poches de perfusion suspendues sous le rayon du dessus
        const n = Math.max(1, Math.round(l / 12));
        for (let i = 0; i < n; i++) {
          const px = x + 6 + i * 12, py = y + 7;
          ctx.strokeStyle = "rgba(38,7,109,.2)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 5); ctx.moveTo(px, py + 23); ctx.lineTo(px, py + 29); ctx.stroke();
          ctx.fillStyle = "rgba(143,199,232,.32)"; ctx.beginPath(); ctx.roundRect(px - 4.5, py + 5, 9, 18, 3); ctx.fill();
          ctx.fillStyle = i % 2 ? "rgba(236,213,103,.6)" : "rgba(143,199,232,.6)"; ctx.beginPath(); ctx.roundRect(px - 4.5, py + 13, 9, 10, [0, 0, 3, 3]); ctx.fill();
          ctx.fillStyle = blanc; ctx.fillRect(px - 3, py + 8, 6, 3.5);
        }
      }
    }
    function decor() {
      // Le mur carrelé de la réserve, sa plaque, son thermomètre de contrôle et, Noël oblige, une guirlande.
      ctx.fillStyle = "#EDEAF6"; ctx.fillRect(0, 39, W, BANDE - 39);
      ctx.strokeStyle = "rgba(38,7,109,.045)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 36; x < W; x += 36) { ctx.moveTo(x, 39); ctx.lineTo(x, E_NIV[0]); }
      for (let y = 58; y < E_NIV[0]; y += 36) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.fillStyle = "rgba(38,7,109,.1)"; ctx.beginPath(); ctx.roundRect(88, 80, 100, 15, 4); ctx.fill();
      texte(ctx, "RÉSERVE · 15-25 °C", 138, 88, 8, "rgba(38,7,109,.5)");
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.roundRect(232, 76, 9, 26, 4.5); ctx.fill();
      ctx.fillStyle = "rgba(216,64,43,.55)"; ctx.beginPath(); ctx.roundRect(235, 88, 3, 11, 1.5); ctx.arc(236.5, 98, 3, 0, 6.3); ctx.fill();
      ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let x = 0; x < W; x += 60) { ctx.moveTo(x, 41); ctx.quadraticCurveTo(x + 30, 55, x + 60, 41); }
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const u = (i % 3 + 0.5) / 3, x = Math.floor(i / 3) * 60 + u * 60, y = 41 + 14 * 2 * u * (1 - u), allume = calme || clos || (Math.floor(s.t * 2) + i) % 3 !== 0;
        ctx.globalAlpha = allume ? 0.9 : 0.3; ctx.fillStyle = LAMPES[i % LAMPES.length]; ctx.beginPath(); ctx.arc(x, y + 3, 2.8, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
      }
      for (const [genre, x, n, l, ht] of STOCK) objet(genre, x, genre === "poches" ? E_NIV[n + 1] : E_NIV[n], l, ht);
      // Les bacs de récupération, au pied des montants : c'est là que finit tout ce qui a dévalé.
      for (const bx of [E_XG, E_XD - 22]) {
        ctx.fillStyle = "rgba(236,213,103,.85)"; ctx.beginPath(); ctx.roundRect(bx, E_NIV[0] - 24, 22, 24, [2, 2, 4, 4]); ctx.fill();
        ctx.fillStyle = "rgba(38,7,109,.55)"; ctx.fillRect(bx - 1, E_NIV[0] - 26, 24, 3.5);
        ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(bx + 5, E_NIV[0] - 16, 12, 7);
      }
      // Les montants du rayonnage et le sol.
      ctx.fillStyle = N; ctx.fillRect(E_XG - 8, 96, 8, E_NIV[0] - 96); ctx.fillRect(E_XD, 96, 8, E_NIV[0] - 96); ctx.fillRect(0, E_NIV[0], W, BANDE - E_NIV[0]);
      // Les escabeaux, derrière les rayons.
      for (let n = 0; n < 4; n++) for (const ex of E_ESC[n]) {
        const y0 = E_NIV[n], y1 = E_NIV[n + 1] - 5;
        for (const [coul, ep] of [[N, 5.5], [Y, 2.5]]) {
          ctx.strokeStyle = coul; ctx.lineWidth = ep; ctx.lineCap = "round"; ctx.beginPath();
          ctx.moveTo(ex - 8, y0); ctx.lineTo(ex - 6, y1); ctx.moveTo(ex + 8, y0); ctx.lineTo(ex + 6, y1);
          for (let y = y0 - 9; y > y1 + 4; y -= 11) { ctx.moveTo(ex - 6.5, y); ctx.lineTo(ex + 6.5, y); }
          ctx.stroke();
        }
      }
      // Les rayons : des tablettes à plat, interrompues par les vides.
      trait(ctx, 2.2);
      for (let n = 1; n <= 4; n++) {
        let x = E_XG;
        for (const v of E_VIDES[n].concat([[E_XD, E_XD]])) { ctx.fillStyle = V; ctx.beginPath(); ctx.roundRect(x, E_NIV[n], v[0] - x, 7, 2); ctx.fill(); ctx.stroke(); x = v[1]; }
      }
      // L'étiqueteuse emballée, en haut à gauche, et sa bouche d'où sortent les bobines.
      const yh = E_NIV[4];
      trait(ctx, 2.4); ctx.fillStyle = O; ctx.beginPath(); ctx.roundRect(E_XG + 2, yh - 40, E_MUR - E_XG - 2, 40, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(E_MUR - 12, yh - 21, 12, 21, [5, 0, 0, 0]); ctx.fill();
      ctx.save(); ctx.translate(E_XG + 18, yh - 26); ctx.rotate(calme ? 0 : s.t * 4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke(); ctx.restore();
      const voyant = s.prochaine < 0.45 && !clos; ctx.fillStyle = voyant ? R : Y; ctx.beginPath(); ctx.arc(E_MUR - 7, yh - 32, 3.2, 0, 6.3); ctx.fill(); ctx.stroke();
      // Le lot urgent, dans son bac.
      const k = calme || clos ? 1 : 1 + Math.sin(s.t * 7) * 0.06;
      ctx.save(); ctx.translate(E_LOT, yh); ctx.scale(k, k);
      trait(ctx, 2.2); ctx.fillStyle = R; ctx.beginPath(); ctx.roundRect(-12, -20, 24, 20, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-8, -15, 16, 10, 2); ctx.fill();
      texte(ctx, "!", 0, -9.5, 11, R);
      ctx.restore();
      texte(ctx, "LOT URGENT", E_LOT, yh - 30, 9, N);
    }
    function bobine(b) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tour);
      trait(ctx, 2); ctx.fillStyle = b.film ? B : Y; ctx.beginPath(); ctx.arc(0, 0, E_RB, 0, 6.3); ctx.fill(); ctx.stroke();
      // Le flanc : le logo de l'unité, qui tourne avec la bobine ; sans image, un simple mandrin.
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, 6.3); ctx.fill();
      if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.clip(); ctx.drawImage(logo, -6.6, -6.6, 13.2, 13.2); ctx.restore(); }
      else { ctx.fillStyle = N; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 6.3); ctx.fill(); }
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, 6.3); ctx.stroke();
      ctx.restore();
    }
    function preparateur() {
      const j = s.j, sonne = s.etourdi > 0 && !clos, esc = j.etat === "esc", air = j.etat === "air";
      const balance = clos || sonne ? 0 : Math.sin(j.pas * 16) * (s.cmd.gx || (esc && s.cmd.gy) ? 1 : 0);
      ctx.save(); ctx.translate(j.x, j.y);
      if (s.abri > 0 && !clos && !sonne) ctx.globalAlpha = calme ? 0.55 : Math.floor(s.t * 10) % 2 ? 0.35 : 0.9;
      if (sonne) ctx.rotate(0.22 * j.vu);
      if (!esc) ctx.scale(j.vu, 1);
      trait(ctx, 2.6);                                                     // les jambes
      const ecart = esc ? 3.5 : air ? 4.5 : balance * 4.5;
      ctx.beginPath(); ctx.moveTo(-2.5, -9); ctx.lineTo(-2.5 - ecart, esc ? -balance * 2.5 : 0); ctx.moveTo(2.5, -9); ctx.lineTo(2.5 + ecart, esc ? balance * 2.5 : 0); ctx.stroke();
      trait(ctx, 1.8);                                                     // la blouse
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-6, -20, 12, 13, 3.5); ctx.fill(); ctx.stroke();
      trait(ctx, 2.2);                                                     // les bras
      if (esc) { ctx.beginPath(); ctx.moveTo(-6, -17); ctx.lineTo(-8, -23 + balance * 2.5); ctx.moveTo(6, -17); ctx.lineTo(8, -23 - balance * 2.5); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(1, -17); ctx.lineTo(air ? 8 : 4 - balance * 3, air ? -22 : -11); ctx.stroke(); }
      trait(ctx, 1.6);                                                     // la tête et la charlotte
      ctx.fillStyle = "#F6D2B8"; ctx.beginPath(); ctx.arc(0, -24, 4.6, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = B; ctx.beginPath(); ctx.arc(0, -25, 5.4, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!esc) { ctx.fillStyle = N; ctx.beginPath(); ctx.arc(2.2, -22.6, 0.9, 0, 6.3); ctx.fill(); }
      ctx.restore();
      if (sonne) for (let i = 0; i < 3; i++) { const a = (calme ? 0 : s.t * 6) + i * 2.1; texte(ctx, "✦", j.x + Math.cos(a) * 11, j.y - 33 + Math.sin(a) * 3, 9, O); }
    }
    function commandes() {
      ctx.fillStyle = N; ctx.fillRect(0, BANDE, W, HE - BANDE);
      const c = s.cmd, fl = [[1, 0, c.gx > 0], [-1, 0, c.gx < 0], [0, -1, c.gy < 0], [0, 1, c.gy > 0]];
      ctx.fillStyle = "rgba(255,251,242,.08)"; ctx.strokeStyle = "rgba(185,166,240,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(PX, PY, 47, 0, 6.3); ctx.fill(); ctx.stroke();
      for (const [dx, dy, actif] of fl) {
        ctx.save(); ctx.translate(PX + dx * 29, PY + dy * 29); ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = actif && !clos ? Y : V; ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-6, -10); ctx.lineTo(-6, 10); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const presse = s.t - sautT < 0.15 && !clos;
      ctx.fillStyle = presse ? Y : O; ctx.strokeStyle = C; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(SX, SY, 38, 0, 6.3); ctx.fill(); ctx.stroke();
      texte(ctx, "SAUT", SX, SY + 1, 16, N);
      if (!tactile) { texte(ctx, "Flèches", 184, PY - 9, 12, V); texte(ctx, "+ Espace", 184, PY + 9, 12, V); }
    }
    function dessiner() {
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, HE);
      ctx.save();
      const f = s.t - s.chocT;
      if (!calme && !clos && f < 0.25) ctx.translate(Math.sin(f * 90) * 3 * (1 - f / 0.25), 0);   // la secousse du choc
      decor();
      for (const b of s.bobines) bobine(b);
      preparateur();
      // Les gains : « +10 » au-dessus du préparateur à chaque rayon gagné, des étoiles autour du bac à chaque lot livré.
      const g = s.t - s.gainT;
      if (g < 0.7 && !clos) { ctx.globalAlpha = 1 - g / 0.7; texte(ctx, "+" + s.gain, s.j.x, s.j.y - 40 - (calme ? 0 : g * 22), 13, G); ctx.globalAlpha = 1; }
      const l = s.t - s.livreT;
      if (l < 0.8 && !clos && !calme) for (let i = 0; i < 6; i++) { const a = i * 1.05 - 2.6; ctx.globalAlpha = 1 - l / 0.8; texte(ctx, "✦", E_LOT + Math.cos(a) * (10 + l * 46), E_NIV[4] - 14 + Math.sin(a) * (10 + l * 46), 12, i % 2 ? O : G); ctx.globalAlpha = 1; }
      ctx.restore();
      if (!clos && s.t - s.msgT < 1.4) { ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(74, 48, 212, 26, 10); ctx.fill(); texte(ctx, s.msg, 180, 62, 13, Y); }
      commandes();
      const n = noteEtageres(s);
      bandeau(ctx, s.points + " pts · " + s.lots + (s.lots > 1 ? " lots · " : " lot · ") + n + "/10", duree - s.t, duree);
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 220, 40, Y); texte(ctx, s.points + " points, " + s.lots + (s.lots > 1 ? " lots livrés" : " lot livré"), 180, 262, 16, C); }
    }
    const arret = boucle(dt => {
      if (!clos) {
        pasEtageres(s, dt, duree);
        if (s.fini) {
          clos = true; oubli();
          const n = noteEtageres(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.lots, "lot urgent livré", "lots urgents livrés") + ", " + pl(s.etages, "rayon gravi", "rayons gravis") + ", " + pl(s.chocs, "bobine reçue", "bobines reçues") + (s.perdu ? " (−" + s.perdu + ")" : "") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (1 point de note par tranche de " + RE.palier + " points).";
          // Les quatre chiffres du tableau final commun.
          const chiffres = [[s.points, s.points > 1 ? "points" : "point"], [s.lots, s.lots > 1 ? "lots livrés" : "lot livré"], [s.etages, s.etages > 1 ? "rayons gravis" : "rayon gravi"], [s.chocs, s.chocs > 1 ? "bobines reçues" : "bobine reçue"]];
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, s.points), chiffres); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }
  api.etageres = etageres;
  Object.assign(api._coeur, { REGL_ETAGERES: RE, creerEtageres, pasEtageres, noteEtageres, eVide, E_NIV, E_VIDES, E_ESC, E_LOT, E_XG, E_XD, E_RB });
  /* ----- Fin [etageres] ----- */

  /* ----- Repère [pastilles] : le jeu du poseur ----- */
  {
    /* ================= Les pastilles effervescentes : le cœur =================
       Le sas de décartonnage : 11 x 10 cases, des étagères fixes, des cartons livrés au hasard. Le préparateur pose une
       pastille ; après un délai, la mousse part en croix (portée en cases), s'arrête aux étagères et au premier carton,
       qu'elle dissout. Trois pastilles au plus à la fois. Un carton cachait un flacon (à ramasser), un germe (il éclot puis rôde) ou rien. La mousse
       neutralise les germes et fait glisser le préparateur : rien n'arrête la partie, on perd des points et du temps.
       Tout ce qui est emporté par une même pastille vaut de plus en plus (lot). Sas presque vide : nouvelle livraison. */
    const RE = { allure: 4.6, delai: 1.5, chaine: 0.12, portee: 2, mousse: 0.55, tube: 3, germe: 1.5, flair: 4, zele: 0.5, eclosion: 1.4, contact: 0.6,
      carton: 5, flacon: 15, neutralise: 30, lot: 5, livraison: 40, savon: 15, amende: 20, glisse: 1.1, repit: 0.7, abri: 1.6, reste: 3, densite: 0.5, pFlacon: 0.3, pGerme: 0.12, palier: 75 };
    const PLAN = [
      "...........",
      ".##.....##.",
      "....#.#....",
      ".#.......#.",
      ".#..#.#..#.",
      "....#.#....",
      ".##.....##.",
      "....###....",
      ".#.......#.",
      "..........."];
    const NC = 11, NR = 10, PAS = 1 / 120, DEPART = [5, 9], RODEURS = [[1, 0], [9, 0]];
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];                       // haut, droite, bas, gauche
    const dans = (c, r) => c >= 0 && c < NC && r >= 0 && r < NR;
    const libre = (s, c, r) => dans(c, r) && s.sol[c + r * NC] === 0;      // sol : 0 libre, 1 étagère, 2 carton
    const caseDe = e => e.d >= 0 && e.p >= 0.5 ? [e.c + DIRS[e.d][0], e.r + DIRS[e.d][1]] : [e.c, e.r];
    const posDe = e => e.d < 0 ? [e.c, e.r] : [e.c + DIRS[e.d][0] * e.p, e.r + DIRS[e.d][1] * e.p];
    // La croix d'une pastille : sa case, puis « portee » cases par direction ; une étagère arrête la mousse, un carton l'absorbe.
    const croix = (s, c, r) => {
      const cases = [c + r * NC];
      for (const [dx, dy] of DIRS) for (let i = 1; i <= RE.portee; i++) {
        const x = c + dx * i, y = r + dy * i;
        if (!dans(x, y) || s.sol[x + y * NC] === 1) break;
        cases.push(x + y * NC);
        if (s.sol[x + y * NC] === 2) break;
      }
      return cases;
    };
    // Une livraison : des cartons sur les cases libres, jamais sur le préparateur ni autour, ni sur un germe, un flacon, une pastille.
    const livrer = s => {
      const j = s.j, pris = new Uint8Array(NC * NR);
      const marque = (c, r, rayon) => { for (let y = r - rayon; y <= r + rayon; y++) for (let x = c - rayon; x <= c + rayon; x++) if (dans(x, y)) pris[x + y * NC] = 1; };
      marque(j.c, j.r, 1); if (j.d >= 0) marque(j.c + DIRS[j.d][0], j.r + DIRS[j.d][1], 1);
      for (const g of s.germes) { marque(g.c, g.r, 0); if (g.d >= 0) marque(g.c + DIRS[g.d][0], g.r + DIRS[g.d][1], 0); }
      for (const q of s.pastilles) pris[q.k] = 1;
      for (const m of s.mousses) for (const k of m.cases) pris[k] = 1;
      for (let k = 0; k < NC * NR; k++) {
        if (s.sol[k] !== 0 || pris[k] || s.flacons[k] || s.hasard() >= RE.densite) continue;
        const h = s.hasard();
        s.sol[k] = 2; s.cache[k] = h < RE.pFlacon ? 1 : h < RE.pFlacon + RE.pGerme ? 2 : 0; s.cartons++;
      }
      s.livreT = s.t;
    };
    const creer = graine => {
      let a = graine || 20261224;
      const hasard = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const s = { t: 0, acc: 0, hasard, j: { c: DEPART[0], r: DEPART[1], d: -1, p: 0, veut: -1, coup: -1, vu: 0, pose: false },
        sol: new Uint8Array(NC * NR), cache: new Uint8Array(NC * NR), flacons: new Uint8Array(NC * NR), pastilles: [], mousses: [],
        germes: RODEURS.map(([c, r], i) => ({ c, r, d: -1, p: 0, attente: 2 + i, neuf: false })), cartons: 0, score: 0, dissous: 0, ramasses: 0, neutralises: 0,
        savons: 0, prises: 0, livraisons: 0, poses: 0, arret: 0, abri: 0, msg: "", msgT: -9, livreT: -9, evts: [], fini: false };
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) if (PLAN[r][c] === "#") s.sol[c + r * NC] = 1;
      livrer(s); s.livreT = -9;
      return s;
    };
    const noter = (s, k, pts) => { s.score = Math.max(0, s.score + pts); s.evts.push({ k, pts, t: s.t }); if (s.evts.length > 14) s.evts.shift(); };
    const butin = (s, m, k, base) => noter(s, k, base + RE.lot * m.n++);   // chaque prise de plus d'une même pastille vaut « lot » de plus
    const annoncer = (s, msg) => { s.msg = msg; s.msgT = s.t; };
    const poser = s => {
      const j = s.j, q = caseDe(j), k = q[0] + q[1] * NC;
      j.pose = false;
      if (s.pastilles.length >= RE.tube || s.pastilles.some(o => o.k === k)) return;
      s.pastilles.push({ k, c: q[0], r: q[1], t: RE.delai }); s.poses++;
    };
    const mousser = (s, q) => {
      const m = { c: q.c, r: q.r, cases: croix(s, q.c, q.r), t: RE.mousse, n: 0 };
      s.mousses.push(m);
      for (const k of m.cases) {
        if (s.sol[k] === 2) {
          const quoi = s.cache[k];
          s.sol[k] = 0; s.cache[k] = 0; s.cartons--; s.dissous++; butin(s, m, k, RE.carton);
          if (quoi === 1) s.flacons[k] = 1;
          else if (quoi === 2) s.germes.push({ c: k % NC, r: (k - k % NC) / NC, d: -1, p: 0, attente: RE.eclosion, neuf: true });
        }
        for (const o of s.pastilles) if (o !== q && o.k === k && o.t > RE.chaine) o.t = RE.chaine;   // la mousse réveille la pastille voisine
      }
    };
    // Le préparateur avance case par case tant qu'une direction est tenue (veut) ; un appui bref (coup) vaut une case.
    const joueur = (s, dist) => {
      const j = s.j, va = d => libre(s, j.c + DIRS[d][0], j.r + DIRS[d][1]), envie = () => j.veut >= 0 ? j.veut : j.coup;
      if (j.d >= 0 && j.p > 0 && envie() === (j.d + 2) % 4) { j.c += DIRS[j.d][0]; j.r += DIRS[j.d][1]; j.p = 1 - j.p; j.d = j.vu = envie(); j.coup = -1; }   // demi-tour immédiat
      if (j.d < 0) { const e = envie(); if (e >= 0) { j.vu = e; j.coup = -1; if (va(e)) j.d = e; } }
      if (j.d < 0) return;
      j.p += dist;
      if (j.p < 1) return;
      const reste = j.p - 1, k = (j.c += DIRS[j.d][0]) + (j.r += DIRS[j.d][1]) * NC, e = envie();
      j.p = 0; j.coup = -1;
      if (s.flacons[k]) { s.flacons[k] = 0; s.ramasses++; noter(s, k, RE.flacon); }
      if (e >= 0) j.vu = e;
      j.d = e >= 0 && va(e) ? e : -1;
      if (j.d >= 0) j.p = reste;
    };
    // Un germe rôde au hasard, sans demi-tour ; de près (flair), une fois sur deux, il se rapproche du préparateur.
    const choisir = (s, g) => {
      const dos = g.d < 0 ? -1 : (g.d + 2) % 4, opts = [];
      for (let d = 0; d < 4; d++) if (d !== dos && libre(s, g.c + DIRS[d][0], g.r + DIRS[d][1])) opts.push(d);
      if (!opts.length) { g.d = dos >= 0 && libre(s, g.c + DIRS[dos][0], g.r + DIRS[dos][1]) ? dos : -1; return; }
      let d = opts[Math.floor(s.hasard() * opts.length)];
      const q = caseDe(s.j), loin = (x, y) => Math.abs(x - q[0]) + Math.abs(y - q[1]);
      if (s.abri <= 0 && loin(g.c, g.r) <= RE.flair && s.hasard() < RE.zele) { let m = 1e9; for (const o of opts) { const v = loin(g.c + DIRS[o][0], g.r + DIRS[o][1]); if (v < m) { m = v; d = o; } } }
      g.d = d;
    };
    const unPas = (s, duree) => {
      const dt = PAS, j = s.j;
      s.t += dt;
      if (s.t >= duree) { s.fini = true; return; }
      if (s.abri > 0) s.abri -= dt;
      if (s.arret > 0) { s.arret -= dt; j.pose = false; j.coup = -1; } else { if (j.pose) poser(s); joueur(s, RE.allure * dt); }
      for (let i = s.pastilles.length - 1; i >= 0; i--) { const q = s.pastilles[i]; if ((q.t -= dt) <= 0) { s.pastilles.splice(i, 1); mousser(s, q); } }
      const qj = caseDe(j), jk = qj[0] + qj[1] * NC, pj = posDe(j);
      for (let i = s.mousses.length - 1; i >= 0; i--) {
        const m = s.mousses[i];
        if ((m.t -= dt) <= 0) { s.mousses.splice(i, 1); continue; }
        if (s.abri <= 0 && m.cases.includes(jk)) { s.savons++; noter(s, jk, -RE.savon); s.arret = RE.glisse; s.abri = RE.glisse + RE.repit; annoncer(s, "Glissade dans la mousse ! −" + RE.savon); }
        for (let n = s.germes.length - 1; n >= 0; n--) {
          const g = s.germes[n], qg = caseDe(g), gk = qg[0] + qg[1] * NC;
          if (g.neuf && g.attente > 0 || !m.cases.includes(gk)) continue;   // un germe qui éclot est encore à l'abri dans son carton
          s.germes.splice(n, 1); s.neutralises++; butin(s, m, gk, RE.neutralise);
        }
      }
      if (s.cartons <= RE.reste && !s.mousses.length) { s.livraisons++; noter(s, jk, RE.livraison); livrer(s); annoncer(s, "Sas dégagé ! +" + RE.livraison + " · livraison"); }
      for (const g of s.germes) {
        if (g.attente > 0) { g.attente -= dt; continue; }
        if (g.d < 0) choisir(s, g);
        if (g.d >= 0) { g.p += RE.germe * dt; if (g.p >= 1) { g.c += DIRS[g.d][0]; g.r += DIRS[g.d][1]; g.p -= 1; choisir(s, g); if (g.d < 0) g.p = 0; } }
        const pg = posDe(g);
        if (s.abri > 0 || Math.abs(pg[0] - pj[0]) + Math.abs(pg[1] - pj[1]) >= RE.contact) continue;
        s.prises++; noter(s, jk, -RE.amende); s.abri = RE.abri; annoncer(s, "Contamination ! −" + RE.amende);
      }
    };
    const pasPastilles = (s, dt, duree) => { s.acc += dt; while (s.acc >= PAS && !s.fini) { s.acc -= PAS; unPas(s, duree); } };
    const notePastilles = s => Math.min(10, Math.floor(s.score / RE.palier));

    /* ----- Les pastilles effervescentes : dessin et commandes ----- */
    const HP = 540, T = 32, X0 = 4, Y0 = 54, BAS = Y0 + NR * T + 6, HE = 12, HC = 8, KRAFT = "#C08A4E", RUBAN = "#EBCB97";   // HE, HC : hauteur des étagères et des cartons
    const PAD = { x: 92, y: 472, pas: 43, t: 40 }, BTN = { x: 272, y: 474, r: 46 };
    const pastilles = (el, opt) => {
      const duree = opt.duree || 60, { cv, ctx, liberer } = monter(el, HP);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "Les pastilles effervescentes. Déplacez le préparateur avec les flèches ou les touches Z, Q, S, D, ou avec la croix en bas à gauche. Posez une pastille (trois au plus à la fois) avec la barre d'espace ou le bouton en bas à droite, puis écartez-vous : la mousse part en croix, dissout les cartons et neutralise les germes.");
      const mq = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const s = creer(), tactile = mq("(pointer: coarse)"), calme = mq("(prefers-reduced-motion: reduce)");
      const cx = c => X0 + c * T + T / 2, cy = r => Y0 + r * T + T / 2, kx = k => cx(k % NC), ky = k => cy((k - k % NC) / NC);
      let clos = false, minuterie = 0, pad = null, eclat = -9;
      const logo = new Image(), TEINTES = [N, Y, O, P], MOUSSE = [Y, P, O, V]; logo.src = api._logo;   // la pastille porte le logo de la pharmacotechnie, et éclabousse à ses couleurs
      const tenues = [], TOUCHES = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, z: 0, w: 0, d: 1, s: 2, q: 3, a: 3 };
      const maj = () => { s.j.veut = tenues.length ? tenues[tenues.length - 1] : pad ? pad.d : -1; };
      const nom = e => e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const enfonce = e => {
        const k = nom(e), d = TOUCHES[k], pose = k === " " || k === "Enter";
        if (d === undefined && !pose || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName || "")) return;
        e.preventDefault();
        if (pose) { if (!e.repeat) { s.j.pose = true; eclat = s.t; } return; }
        if (!tenues.includes(d)) { tenues.push(d); s.j.coup = d; }
        maj();
      };
      const leve = e => { const i = tenues.indexOf(TOUCHES[nom(e)]); if (i >= 0) { tenues.splice(i, 1); maj(); } };
      const perdu = () => { tenues.length = 0; pad = null; maj(); };
      // Au doigt ou à la souris : la croix à gauche se tient (on glisse d'une flèche à l'autre sans lever le doigt), tout le côté droit pose.
      const point = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * W, (e.clientY - b.top) / b.width * W]; };
      const dirPad = (x, y) => { const dx = x - PAD.x, dy = y - PAD.y; return Math.max(Math.abs(dx), Math.abs(dy)) < 10 ? -1 : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); };
      const appui = e => {
        e.preventDefault(); cv.focus({ preventScroll: true });
        const p = point(e);
        if (p[1] < BAS) return;
        try { cv.setPointerCapture(e.pointerId); } catch (_) { }
        if (p[0] < 190) { pad = { id: e.pointerId, d: dirPad(p[0], p[1]) }; if (pad.d >= 0) s.j.coup = pad.d; maj(); }
        else { s.j.pose = true; eclat = s.t; }
      };
      const bouge = e => { if (!pad || e.pointerId !== pad.id) return; const p = point(e), d = dirPad(p[0], p[1]); if (d >= 0 && d !== pad.d) { pad.d = d; maj(); } };
      const relache = e => { if (pad && e.pointerId === pad.id) { pad = null; maj(); } };
      const menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", bouge); cv.addEventListener("pointerup", relache); cv.addEventListener("pointercancel", relache); cv.addEventListener("contextmenu", menu);
      window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", perdu);
      const retirer = () => {
        cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", bouge); cv.removeEventListener("pointerup", relache); cv.removeEventListener("pointercancel", relache); cv.removeEventListener("contextmenu", menu);
        window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", perdu);
      };
      // Vue en volume : chaque objet a un dessus et une face avant, une ombre portée au sol, et tout est dessiné rangée par
      // rangée, du fond vers l'avant, pour que ce qui est devant cache ce qui est derrière.
      const rond = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); };
      const ombre = (x, y, rx, ry, a) => { ctx.fillStyle = "rgba(38,7,109," + (a || 0.2) + ")"; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.3); ctx.fill(); };
      const bloc = (x, y, h, dessus, face) => {                            // un pavé posé sur la case : face avant, puis dessus décalé de sa hauteur
        trait(ctx, 2);
        ctx.fillStyle = face; ctx.beginPath(); ctx.roundRect(x - 14, y - 13 - h, 28, 27 + h, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = dessus; ctx.beginPath(); ctx.roundRect(x - 14, y - 13 - h, 28, 27, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.roundRect(x - 11, y - 10.5 - h, 22, 3, 1.5); ctx.fill();   // le reflet de l'arête
      };
      const bulles = (x, y, k, t, coul) => {                               // un paquet de mousse : quelques bulles rondes, avec leur reflet
        ombre(x + 2, y + 10, 13 * t, 4 * t, 0.12);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + k, d = i ? 8.5 : 0, r = (i ? 5.5 + (i * 7 + k) % 3 : 8) * t, bx = x + Math.cos(a) * d, by = y - 3 + Math.sin(a) * d * 0.8;
          ctx.fillStyle = i % 2 ? "#fff" : coul ? coul[(i + k) % 4] : "#E4F3FB"; ctx.strokeStyle = coul ? N : B; ctx.lineWidth = coul ? 1.2 : 1.4;
          rond(bx, by, r); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,.85)"; rond(bx - r * 0.32, by - r * 0.36, r * 0.24); ctx.fill();
        }
      };
      // Les éclaboussures : des gouttes aux couleurs du logo, lancées de la pastille vers le bout de chaque bras de mousse.
      const eclabousser = (m, u) => {
        const x0 = cx(m.c), y0 = cy(m.r) - 3;
        m.cases.forEach((k, i) => {
          const dx = kx(k) - x0, dy = ky(k) - 3 - y0, loin = Math.hypot(dx, dy), n = i ? 3 : 8;
          for (let g = 0; g < n; g++) {
            const a = i ? Math.atan2(dy, dx) + (g - 1) * 0.5 : g * Math.PI / 4 + 0.39, r0 = i ? loin - 14 + u * 12 : 8 + u * 6, long = (i ? 15 : 11) + (k + g) % 3 * 3;
            ctx.save(); ctx.translate(x0, y0 - Math.sin(Math.PI * u) * 5); ctx.globalAlpha = Math.min(1, 4 * (1 - u)); goutte(ctx, a, r0, r0 + long * Math.min(1, 0.4 + u * 2), 7, TEINTES[(k + g + i) % 4]); ctx.restore();
          }
        });
      };
      const etagere = (x, y) => {
        bloc(x, y, HE, "#D3C6F7", V);
        ctx.strokeStyle = N; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 14, y + 14 - HE + 6); ctx.lineTo(x + 14, y + 14 - HE + 6); ctx.stroke();   // la tablette de la face avant
        ctx.fillStyle = N; ctx.fillRect(x - 9, y + 15 - HE, 4, 4.5); ctx.fillRect(x + 4, y + 8, 4, 4.5); ctx.fillStyle = C; ctx.fillRect(x - 3, y + 15 - HE, 4, 4.5); ctx.fillRect(x - 7, y + 8, 4, 4.5);
        ctx.fillStyle = Y; ctx.fillRect(x + 4, y + 15 - HE, 4, 4.5);
        ctx.fillStyle = "rgba(38,7,109,.5)"; ctx.fillRect(x - 9, y - 9 - HE + 6, 7, 9); ctx.fillStyle = C; ctx.fillRect(x + 1, y - 9 - HE + 4, 8, 6); ctx.fillStyle = O; ctx.fillRect(x + 2, y - HE + 4, 6, 6);   // ce qui traîne sur le dessus
      };
      const carton = (x, y, k) => {
        const haut = (1 - k) * 34;                                         // à la livraison, il tombe du haut
        ctx.save(); ctx.translate(x, y - haut); ctx.globalAlpha = Math.min(1, 0.3 + k);
        bloc(0, 0, HC, "#DDB077", KRAFT);
        ctx.fillStyle = RUBAN; ctx.fillRect(-3.5, -12 - HC, 7, 25 + HC);
        ctx.strokeStyle = N; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-14, 14 - HC); ctx.lineTo(14, 14 - HC); ctx.moveTo(-13, -HC); ctx.lineTo(-3.5, -HC); ctx.moveTo(3.5, -HC); ctx.lineTo(13, -HC); ctx.stroke();   // l'arête et les rabats
        ctx.restore();
      };
      const pastille = q => {
        const x = cx(q.c), y = cy(q.r), f = 1 - q.t / RE.delai, chute = calme ? 0 : Math.max(0, 1 - (RE.delai - q.t) / 0.16), k = calme ? 1 : 1 + Math.sin(s.t * (8 + 22 * f)) * 0.08;
        ombre(x + 2, y + 7, 12 - chute * 5, 4.5 - chute * 2, 0.22);
        ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.ellipse(x, y + 4, 15, 9.5, 0, -Math.PI / 2, -Math.PI / 2 + 6.283 * f); ctx.stroke();   // le délai qui s'écoule, tracé au sol
        if (!calme) for (let i = 0; i < 4; i++) { const u = (s.t * 1.6 + i * 0.25 + q.k * 0.13) % 1; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.strokeStyle = B; ctx.lineWidth = 1; rond(x + Math.sin(i * 2.4 + q.k) * 9, y - 8 - u * 14, 1.5 + f * 2 * (1 - u)); ctx.fill(); ctx.stroke(); }
        ctx.save(); ctx.translate(x, y - chute * 26); ctx.scale(k, k);
        trait(ctx, 2); ctx.fillStyle = "#CFC8E6"; rond(0, 2, 10.5); ctx.fill(); ctx.stroke();                              // la tranche du comprimé
        ctx.fillStyle = "#fff"; rond(0, -2, 10.5); ctx.fill();
        if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.clip(); ctx.drawImage(logo, -10.5, -12.5, 21, 21); ctx.restore(); rond(0, -2, 10.5); }
        else { ctx.lineWidth = 1.5; ctx.moveTo(-6, -2); ctx.lineTo(6, -2); }
        ctx.stroke();
        ctx.restore();
      };
      const germe = g => {
        const q = posDe(g), eclot = g.attente > 0, r = eclot ? 5.5 : 8.5, x = cx(q[0]), y = cy(q[1]), saut = eclot || calme ? 0 : Math.abs(Math.sin(s.t * 6 + g.c)) * 3;
        ombre(x + 1, y + 9, r * (1 - saut * 0.06), 3, eclot ? 0.1 : 0.2);
        ctx.save(); ctx.translate(x, y - 2 - saut);
        if (eclot) ctx.globalAlpha = 0.55;
        trait(ctx, 2); ctx.fillStyle = g.neuf ? P : G; ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const a = i * Math.PI / 12, rr = r + Math.sin(a * 3 + (calme ? 0 : s.t * 5) + g.c) * 1.7; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.5, r * 0.3, r * 0.17, -0.5, 0, 6.3); ctx.fill();   // le reflet : il a du volume
        if (!eclot) { ctx.fillStyle = "#fff"; rond(-3, -1, 2.6); ctx.fill(); rond(3, -1, 2.6); ctx.fill(); ctx.fillStyle = N; rond(-3, -1, 1.2); ctx.fill(); rond(3, -1, 1.2); ctx.fill(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 2.5, 3, 0.3, 2.84); ctx.stroke(); }
        ctx.restore();
      };
      const preparateur = () => {
        const j = s.j, q = posDe(j), x = cx(q[0]), y = cy(q[1]), glisse = s.arret > 0 && !clos, marche = j.d >= 0 && !calme && !clos ? Math.abs(Math.sin(j.p * Math.PI)) * 2 : 0;
        ombre(x + 1, y + 11, 10, 3.5, 0.22);
        if (s.abri > 0 && !glisse && !clos && Math.floor(s.t * 8) % 2) return;   // il clignote tant qu'il est à l'abri
        ctx.save(); ctx.translate(x, y - 5 - marche);
        if (glisse) ctx.rotate(calme ? 0.5 : Math.sin(s.t * 14) * 0.6);
        trait(ctx, 2);
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-6, 11, 5, 5, 2); ctx.roundRect(1, 11, 5, 5, 2); ctx.fill();          // les sabots
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(-8, -1, 16, 15, [5, 5, 3, 3]); ctx.fill(); ctx.stroke();        // la blouse
        ctx.fillStyle = "rgba(38,7,109,.12)"; ctx.fillRect(2, 1, 5, 12);
        ctx.fillStyle = "#F2D3B8"; rond(0, -6, 8); ctx.fill(); ctx.stroke();                                                // la tête
        ctx.fillStyle = B; ctx.beginPath(); ctx.arc(0, -7.5, 9, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.stroke();   // la charlotte
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.ellipse(-3.5, -12.5, 3, 1.5, -0.4, 0, 6.3); ctx.fill();
        const ox = j.vu === 1 ? 1.8 : j.vu === 3 ? -1.8 : 0;
        if (j.vu !== 0) { ctx.fillStyle = N; rond(ox - 2.8, -5.5, 1.3); ctx.fill(); rond(ox + 2.8, -5.5, 1.3); ctx.fill(); ctx.fillStyle = "#fff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.roundRect(ox - 4.5, -3.2, 9, 5, 1.5); ctx.fill(); ctx.stroke(); }   // les yeux et le masque (de dos : rien)
        ctx.restore();
        if (glisse) bulles(x, y + 6, 1, 0.5);
      };
      const fleche = (d, actif) => {                                       // une touche en relief, qui s'enfonce quand on la tient
        const x = PAD.x + DIRS[d][0] * PAD.pas, y = PAD.y + DIRS[d][1] * PAD.pas, h = PAD.t / 2, e = actif ? 3 : 0;
        ctx.fillStyle = "#7C68C4"; ctx.beginPath(); ctx.roundRect(x - h, y - h + 4, PAD.t, PAD.t, 10); ctx.fill();
        ctx.fillStyle = actif ? Y : V; ctx.beginPath(); ctx.roundRect(x - h, y - h + e, PAD.t, PAD.t, 10); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.roundRect(x - h + 5, y - h + e + 4, PAD.t - 10, 4, 2); ctx.fill();
        ctx.save(); ctx.translate(x, y + e + 1); ctx.rotate(d * Math.PI / 2); ctx.fillStyle = N; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8.5, 6.5); ctx.lineTo(-8.5, 6.5); ctx.closePath(); ctx.fill(); ctx.restore();
      };
      // Le sol du sas, dessiné une fois : un damier de dalles à joints, plus clair au centre, avec la plinthe du mur du fond.
      const sol = document.createElement("canvas"), ECH = 2;
      sol.width = NC * T * ECH; sol.height = NR * T * ECH;
      (() => {
        const g = sol.getContext("2d"); g.scale(ECH, ECH);
        for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
          g.fillStyle = (c + r) % 2 ? "#E9E3D3" : "#F6F2E7"; g.fillRect(c * T, r * T, T, T);
          g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(c * T + 1, r * T + 1, T - 2, 1.5); g.fillRect(c * T + 1, r * T + 1, 1.5, T - 2);   // l'arête éclairée de la dalle
          g.fillStyle = "rgba(38,7,109,.09)"; g.fillRect(c * T, (r + 1) * T - 1.5, T, 1.5); g.fillRect((c + 1) * T - 1.5, r * T, 1.5, T);     // le joint dans l'ombre
        }
        const l = g.createRadialGradient(NC * T / 2, NR * T * 0.45, 30, NC * T / 2, NR * T / 2, NC * T * 0.75);
        l.addColorStop(0, "rgba(255,255,255,.3)"); l.addColorStop(0.6, "rgba(255,255,255,0)"); l.addColorStop(1, "rgba(38,7,109,.16)");
        g.fillStyle = l; g.fillRect(0, 0, NC * T, NR * T);
        const m = g.createLinearGradient(0, 0, 0, 9); m.addColorStop(0, "rgba(38,7,109,.28)"); m.addColorStop(1, "rgba(38,7,109,0)");
        g.fillStyle = m; g.fillRect(0, 0, NC * T, 9);                      // l'ombre du mur du fond
      })();
      const dessiner = () => {
        ctx.fillStyle = N; ctx.fillRect(0, 0, W, HP);
        ctx.drawImage(sol, X0, Y0, NC * T, NR * T);
        ctx.strokeStyle = O; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.roundRect(cx(DEPART[0]) - 13, cy(DEPART[1]) - 13, 26, 26, 6); ctx.stroke(); ctx.setLineDash([]);   // la porte du sas
        // La zone que chaque pastille va mouiller : de plus en plus marquée à mesure que le délai s'écoule.
        for (const q of s.pastilles) { ctx.fillStyle = "rgba(143,199,232," + (0.25 + 0.4 * (1 - q.t / RE.delai)).toFixed(2) + ")"; for (const k of croix(s, q.c, q.r)) { ctx.beginPath(); ctx.roundRect(kx(k) - 14, ky(k) - 14, 28, 28, 6); ctx.fill(); } }
        const arrive = calme ? 1 : Math.min(1, (s.t - s.livreT) / 0.35);
        for (let k = 0; k < NC * NR; k++) if (s.sol[k]) { ctx.fillStyle = "rgba(38,7,109," + (s.sol[k] === 1 ? 0.2 : 0.17 * arrive).toFixed(2) + ")"; ctx.beginPath(); ctx.roundRect(kx(k) - 11, ky(k) - 8, 31, 27, 5); ctx.fill(); }   // les ombres portées, vers la droite
        // Rangée par rangée : les pavés de la rangée, puis ce qui s'y tient debout.
        const rang = e => Math.max(0, Math.min(NR - 1, Math.round(posDe(e)[1])));
        for (let r = 0; r < NR; r++) {
          for (let c = 0; c < NC; c++) {
            const k = c + r * NC, x = cx(c), y = cy(r);
            if (s.sol[k] === 1) etagere(x, y);
            else if (s.sol[k] === 2) carton(x, y, arrive);
            else if (s.flacons[k]) { const v = calme ? 0 : Math.sin(s.t * 5 + k) * 1.5; ombre(x + 1, y + 11, 7 - v, 2.5); ctx.save(); ctx.translate(x, y - 1 + v); ctx.scale(0.8, 0.8); flacon(ctx, 0, 0, 0, G); ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(-5.5, -6, 2, 12); ctx.restore(); }
          }
          for (const q of s.pastilles) if (q.r === r) pastille(q);
          for (const g of s.germes) if (rang(g) === r) germe(g);
          if (rang(s.j) === r) preparateur();
        }
        for (const m of s.mousses) { const f = m.t / RE.mousse, t = calme ? 1 : Math.min(1, Math.sin(Math.PI * Math.min(1, 1.15 - f)) * 1.25); for (const k of m.cases) bulles(kx(k), ky(k), k, t, MOUSSE); eclabousser(m, calme ? 0.6 : 1 - f); }
        for (const e of s.evts) {                                          // les points gagnés ou perdus s'envolent de leur case
          const u = (s.t - e.t) / 0.9; if (u >= 1 || clos) continue;
          const x = Math.max(22, Math.min(W - 22, kx(e.k))), y = ky(e.k) - 12 - (calme ? 8 : u * 16), t = (e.pts > 0 ? "+" : "−") + Math.abs(e.pts);
          ctx.globalAlpha = 1 - u * u; ctx.lineWidth = 3.5; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round"; ctx.font = "800 14px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.strokeText(t, x, y);
          texte(ctx, t, x, y, 14, e.pts > 0 ? N : R); ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = V; ctx.lineWidth = 3; ctx.strokeRect(X0 - 1.5, Y0 - 1.5, NC * T + 3, NR * T + 3);              // les murs du sas
        // Le bas : annonces et rappel des commandes, la croix de direction, le bouton de pose avec le tube de pastilles.
        ctx.fillStyle = N; ctx.fillRect(0, Y0 + NR * T + 2, W, HP);
        const annonce = !clos && s.t - s.msgT < 1.4;
        texte(ctx, annonce ? s.msg : tactile ? "Croix : avancer · bouton : pastille" : "Flèches ou Z Q S D · Espace : pastille", 180, BAS + 12, 13, annonce ? Y : V);
        for (let d = 0; d < 4; d++) fleche(d, !clos && s.j.veut === d);
        ctx.fillStyle = "rgba(185,166,240,.35)"; rond(PAD.x, PAD.y + 2, 7); ctx.fill();
        const dispo = RE.tube - s.pastilles.length, vif = s.t - eclat < 0.12, e = vif ? 4 : 0;
        ctx.fillStyle = "#B4501F"; rond(BTN.x, BTN.y + 5, BTN.r); ctx.fill();                                              // l'épaisseur du bouton
        ctx.fillStyle = vif ? Y : dispo ? O : "#8E7FB5"; rond(BTN.x, BTN.y + e, BTN.r); ctx.fill(); ctx.strokeStyle = C; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(BTN.x, BTN.y + e, BTN.r - 8, Math.PI * 1.15, Math.PI * 1.6); ctx.stroke();
        trait(ctx, 2.2); ctx.fillStyle = "#CFC8E6"; rond(BTN.x, BTN.y - 5 + e, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; rond(BTN.x, BTN.y - 9 + e, 14); ctx.fill();
        if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.clip(); ctx.drawImage(logo, BTN.x - 14, BTN.y - 23 + e, 28, 28); ctx.restore(); rond(BTN.x, BTN.y - 9 + e, 14); } else { ctx.moveTo(BTN.x - 9, BTN.y - 9 + e); ctx.lineTo(BTN.x + 9, BTN.y - 9 + e); }
        ctx.stroke();
        texte(ctx, "Pastille", BTN.x, BTN.y + 22 + e, 13, N);
        for (let i = 0; i < RE.tube; i++) { ctx.fillStyle = i < dispo ? "#CFC8E6" : "rgba(255,251,242,.12)"; rond(BTN.x + 62, BTN.y - 16 + i * 18, 6); ctx.fill(); ctx.fillStyle = i < dispo ? "#fff" : "rgba(255,251,242,.2)"; rond(BTN.x + 62, BTN.y - 18 + i * 18, 6); ctx.fill(); }
        const n = notePastilles(s);
        bandeau(ctx, s.score + " points · " + n + "/10", duree - s.t, duree);
        if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 150, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 190, 40, Y); texte(ctx, s.score + " points au compteur", 180, 232, 16, C); }
      };
      const arret = boucle(dt => {
        if (!clos) {
          pasPastilles(s, dt, duree);
          if (s.fini) {
            clos = true; perdu();
            const n = notePastilles(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = pl(s.dissous, "carton dissous", "cartons dissous") + ", " + pl(s.ramasses, "flacon récupéré", "flacons récupérés") + ", " + pl(s.neutralises, "germe neutralisé", "germes neutralisés") + ", " + pl(s.savons, "glissade", "glissades") + " dans la mousse, " + pl(s.prises, "contamination", "contaminations") + " : " + pl(s.score, "point", "points") + ", soit " + n + " sur 10 (1 point de note par tranche de " + RE.palier + " points).";
            const chiffres = [[s.score, s.score > 1 ? "points" : "point"], [s.dissous, s.dissous > 1 ? "cartons" : "carton"], [s.ramasses, s.ramasses > 1 ? "flacons" : "flacon"], [s.neutralises, s.neutralises > 1 ? "germes" : "germe"]];   // pour le tableau final commun
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, Math.round(s.score)), chiffres); }, 1300);
          }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.pastilles = pastilles;
    Object.assign(api._coeur, { REGL_PASTILLES: RE, creerPastilles: creer, pasPastilles, notePastilles, croixPastilles: croix, casePastilles: caseDe, E_PLAN: PLAN, E_DIRS: DIRS, E_DEPART: DEPART, E_RODEURS: RODEURS });
  }
  /* ----- Fin [pastilles] ----- */

  /* ----- Repère [twirling] : le twirling ----- */
  /* La parade des seringues : le préparateur fait tournoyer une seringue (sans aiguille) comme un bâton de majorette. Elle retombe tantôt
     dans sa main gauche, tantôt dans sa main droite : on la rattrape (et on la relance du même geste) en touchant le bon côté
     au moment où elle arrive dans le gant. Plus le geste est juste, plus il rapporte ; une série sans chute ajoute un bonus.
     À mi-parcours un infuseur entre dans la danse, et si tout se passe bien, une seconde seringue pour le bouquet final. La chorégraphie est la même pour tout le monde (graine fixe) et
     calée sur le temps : un rattrapage en avance ou en retard ne change pas l'instant des suivants. */
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-twirling.js) : ils fixent la difficulté.
    // parfait, bien, juste : écarts tolérés (s) autour de l'instant d'arrivée. gel, vide : blocage de la main (s) et points perdus après un geste dans le vide.
    // pA, pC, pD : fin de l'échauffement, entrée de le deuxième objet, bouquet final à trois (parts de la durée). dA, dB, eC, eD : écarts entre deux retombées.
    // trois : le troisième objet n'entre que si le joueur a déjà marqué cette part des points possibles jusque-là.
    // serie, bonus : +1 point par tranche de « serie » rattrapages d'affilée, plafonné à « bonus ». seuils : parts du maximum.
    const RTW = { g: 1020, hmax: 250, parfait: 0.05, bien: 0.1, juste: 0.18, gel: 0.5, vide: 1, ramasse: 0.9, relance: 1, tmin: 0.6, depart: 1.9, envoi: 1.2, pA: 0.22, pC: 0.44, pD: 0.72, trois: 0.45, dA: 1.1, dB: [0.8, 0.95, 1.4], eC: [0.48, 0.54, 0.6], eD: [0.4, 0.44, 0.5], serie: 4, bonus: 3, seuils: [0.025, 0.06, 0.11, 0.18, 0.27, 0.37, 0.49, 0.63, 0.8, 0.93], plafond: 600 };
    const TW_PAS = 1 / 120, TW_MX = [96, 264], TW_YH = 330, TW_SOL = 436;
    // La chorégraphie : la liste des retombées { t : instant, m : main (0 gauche, 1 droite), b : objet lancé }.
    function choreeTwirling(duree, graine) {
      let a = graine || 20261218, m = 1, suite = 0, t = RTW.depart, k = 0;
      const h = () => { a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
      // Jamais plus de trois retombées de suite dans la même main.
      const main = () => { let n = h() < 0.55 ? 1 - m : m; if (n === m && ++suite > 2) n = 1 - m; if (n !== m) suite = 0; m = n; return m; };
      const L = [], poser = b => L.push({ t: Math.round(t * 1000) / 1000, m: main(), b });
      while (t < duree * RTW.pA && t <= duree - 0.8) { poser(0); t += RTW.dA; }                      // échauffement : tempo régulier
      while (t < duree * RTW.pC && t <= duree - 0.8) { poser(0); const r = h(); t += RTW.dB[r < 0.5 ? 0 : r < 0.72 ? 1 : 2]; }   // le tempo varie, avec de grands lancers
      while (t < duree * RTW.pD && t <= duree - 0.8) { poser(k++ % 2); t += RTW.eC[Math.floor(h() * RTW.eC.length)]; }   // deux objets, en alternance
      k = 0; while (t <= duree - 0.8) { poser(k++ % 3); t += RTW.eD[Math.floor(h() * RTW.eD.length)]; }                 // bouquet final : trois spatules, à tour de rôle
      return L;
    }
    const gainTwirling = (q, serie) => q + Math.min(RTW.bonus, Math.floor(serie / RTW.serie));
    // Où est l'objet b à l'instant t ? En vol : une cloche d'une main à l'autre, qui se prolonge jusqu'au sol si personne ne la rattrape.
    const placerTwirling = (b, t) => {
      if (b.etat === "main") { b.x = TW_MX[b.m]; b.y = TW_YH; b.rot = 0; return b; }
      if (b.etat === "sol") return b;
      const u = (t - b.t0) / (b.t1 - b.t0);
      b.x = borne(b.x0 + (b.x1 - b.x0) * u + b.bombe * Math.sin(Math.PI * borne(u, 0, 1)), 16, W - 16);
      b.y = TW_YH - 4 * b.h * u * (1 - u);
      b.rot = 2 * Math.PI * b.tours * u;
      return b;
    };
    // L'objet b quitte la main b.m à l'instant t, pour retomber à l'heure dite dans la main prévue par la chorégraphie.
    const envolTwirling = (b, t) => {
      const e = b.liste[b.i], T = e.t - t;
      b.etat = "vol"; b.t0 = t; b.t1 = e.t; b.m1 = e.m; b.x0 = TW_MX[b.m]; b.x1 = TW_MX[e.m];
      b.h = Math.min(RTW.hmax, RTW.g * T * T / 8); b.tours = Math.max(1, Math.round(T * 1.7)); b.bombe = b.m === e.m ? (e.m ? 16 : -16) : 0;
    };
    const creerTwirling = (duree, graine) => {
      const choree = choreeTwirling(duree, graine);
      const batons = [0, 1, 2].map(k => {
        const liste = choree.filter(e => e.b === k), tl = liste.length ? Math.max(0.3, liste[0].t - (k ? RTW.relance : RTW.envoi)) : Infinity;
        return placerTwirling({ k, liste, i: 0, etat: "main", m: k === 1 ? 0 : 1, tl, entree: k ? tl - 1.5 : 0, x: 0, y: 0, rot: 0 }, 0);
      });
      let max = 0; choree.forEach((e, i) => { max += gainTwirling(3, i + 1); e.cumul = max; });    // cumul : le maximum possible jusqu'à cette retombée
      // q : rattrapages par qualité (1 juste, 2 bien, 3 parfait). geste : dernier appui de chaque main. gel : fin du blocage de chaque main.
      return { t: 0, acc: 0, duree, choree, batons, max, points: 0, serie: 0, meilleure: 0, pris: 0, q: [0, 0, 0, 0], tombees: 0, vides: 0, gel: [0, 0], geste: [-9, -9], ev: null, evT: -9, trois: null, fini: false };
    };
    // Un geste de la main m (0 gauche, 1 droite), « sup » secondes après le dernier pas affiché.
    // Rend la qualité du rattrapage (1 à 3), ou 0 pour un geste dans le vide : il coûte un point, la série repart de zéro
    // et la main reste fermée un instant. Taper à tout-va ne paie donc pas : un appui sur une main encore fermée prolonge son blocage.
    const frapperTwirling = (s, m, sup) => {
      if (s.fini) return 0;
      const t = s.t + s.acc + (sup || 0);
      s.geste[m] = t;
      let b = null, d = RTW.juste;
      if (s.gel[m] <= t) for (const c of s.batons) if (c.etat === "vol" && c.m1 === m && Math.abs(t - c.t1) <= d) { b = c; d = Math.abs(t - c.t1); }
      if (!b) { s.gel[m] = t + RTW.gel; s.vides++; s.serie = 0; s.points = Math.max(0, s.points - RTW.vide); s.ev = { q: -1, m }; s.evT = s.t; return 0; }
      const q = d <= RTW.parfait ? 3 : d <= RTW.bien ? 2 : 1;
      s.serie++; s.meilleure = Math.max(s.meilleure, s.serie); s.pris++; s.q[q]++;
      const gain = gainTwirling(q, s.serie); s.points += gain;
      s.ev = { q, m, gain }; s.evT = s.t;
      b.m = m; b.i++;
      if (b.i < b.liste.length) envolTwirling(b, t); else { b.etat = "main"; b.tl = Infinity; }
      placerTwirling(b, t);
      return q;
    };
    const unPasTwirling = s => {
      s.t += TW_PAS;
      // Le troisième objet se mérite : au moment d'entrer, il faut avoir marqué une part suffisante des points possibles jusque-là.
      const b3 = s.batons[2];
      if (s.trois === null && b3.liste.length && s.t >= b3.entree) {
        let possible = 0; for (const e of s.choree) if (e.t + RTW.juste < s.t) possible = e.cumul;
        s.trois = s.points >= RTW.trois * possible; s.troisT = s.t;
        if (!s.trois) { b3.liste = []; b3.tl = Infinity; b3.absent = true; }
      }
      for (const b of s.batons) {
        if (b.etat === "main") { if (s.t >= b.tl) envolTwirling(b, b.tl); }
        else if (b.etat === "vol") {
          if (s.t > b.t1 + RTW.juste) {
            // Trop tard : l'objet tombe. Le préparateur la ramasse et la relance pour la première retombée encore jouable.
            b.etat = "chute"; s.tombees++; s.serie = 0; s.ev = { q: 0, m: b.m1 }; s.evT = s.t;
            let k = b.i + 1; while (k < b.liste.length && b.liste[k].t < s.t + RTW.ramasse + RTW.tmin) k++;
            b.i = k; b.tl = k < b.liste.length ? Math.max(s.t + RTW.ramasse, b.liste[k].t - RTW.relance) : Infinity;
          }
        } else if (b.etat === "sol" && s.t >= b.tl - 0.35) { b.etat = "main"; b.m = b.x < W / 2 ? 0 : 1; }
        placerTwirling(b, s.t);
        if (b.etat === "chute" && b.y >= TW_SOL - 6) { b.etat = "sol"; b.y = TW_SOL - 6; b.rot = Math.PI / 2; }
      }
      if (s.t >= s.duree) s.fini = true;
    };
    const pasTwirling = (s, dt) => { s.acc += dt; while (s.acc >= TW_PAS && !s.fini) { s.acc -= TW_PAS; unPasTwirling(s); } };
    // La note : le nombre de paliers atteints, chaque palier étant une part du maximum de la chorégraphie.
    const palierTwirling = (s, i) => Math.max(1, Math.ceil(RTW.seuils[i] * s.max));
    const noteTwirling = s => RTW.seuils.filter((_, i) => s.points >= palierTwirling(s, i)).length;
    const brutTwirling = s => Math.min(RTW.plafond, s.points);

    /* --- Dessin et commandes (navigateur seulement) --- */
    const twirling = (el, opt) => {
      const duree = opt.duree || 50, { cv, ctx, xDe, liberer } = monter(el, H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "La parade des seringues. La seringue tournoie et retombe dans la main gauche ou la main droite du préparateur : touchez ou cliquez le côté où elle retombe, au moment où elle arrive dans le gant. Un infuseur la rejoint en cours de partie, puis une seconde seringue si tout se passe bien. Au clavier : flèche gauche et flèche droite, ou F et J.");
      const s = creerTwirling(duree), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      const logo = new Image(); logo.src = opt.logo || api._logo;
      let clos = false, minuterie = 0, vu = performance.now(), joue = false, tFin = 0, salve = 0;
      // L'appui est daté au plus juste : le temps écoulé depuis la dernière image s'ajoute à l'horloge du jeu.
      const geste = m => { if (clos) return; joue = true; frapperTwirling(s, m, borne((performance.now() - vu) / 1000, 0, 0.05)); };
      const TOUCHES = { ArrowLeft: 0, ArrowRight: 1, f: 0, F: 0, j: 1, J: 1 };
      const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); if (e.pointerType === "mouse" && e.button > 0) return; geste(xDe(e) < W / 2 ? 0 : 1); };
      const enfonce = e => {
        if (!(e.key in TOUCHES) || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || "")) return;
        e.preventDefault(); if (!e.repeat) geste(TOUCHES[e.key]);
      };
      const menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("contextmenu", menu); window.addEventListener("keydown", enfonce);
      const retirer = () => { cv.removeEventListener("pointerdown", appui); cv.removeEventListener("contextmenu", menu); window.removeEventListener("keydown", enfonce); };
      const TEINTES = [O, "#4FA3D9", "#C2409B"];
      // Les objets lancés : une seringue (sans aiguille, bouchon en place), un infuseur, puis une seconde seringue.
      // rot = 0 : l'objet est tenu droit dans le gant. Un léger dégradé leur donne du volume.
      const spatule = (x, y, rot, teinte, alpha) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
        const volume = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.45, "rgba(255,255,255,.25)"); g.addColorStop(1, "rgba(38,7,109,.22)"); return g; };
        trait(ctx, 2.2);
        if (teinte === TEINTES[1]) {
          // L'infuseur : une coque transparente, le ballonnet plein à l'intérieur, le bouchon et un bout de tubulure.
          ctx.strokeStyle = N; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 15); ctx.bezierCurveTo(0, 26, 12, 24, 9, 17); ctx.stroke();
          ctx.fillStyle = B; ctx.beginPath(); ctx.arc(9, 16, 2.6, 0, 6.3); ctx.fill(); ctx.stroke();
          trait(ctx, 2.2); ctx.fillStyle = "#F3F7FB"; ctx.beginPath(); ctx.roundRect(-11, -16, 22, 31, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = teinte; ctx.beginPath(); ctx.ellipse(0, 0, 7, 11, 0, 0, 6.3); ctx.fill();
          ctx.fillStyle = volume(-11, 11); ctx.beginPath(); ctx.roundRect(-11, -16, 22, 31, 8); ctx.fill();
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-6, -23, 12, 8, 2); ctx.fill();
        } else {
          // La seringue : le corps gradué et son produit, le bouchon, les ailettes, le piston et son poussoir.
          ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 22); ctx.stroke();
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-7, 21, 14, 4, 2); ctx.fill();
          ctx.fillStyle = "#F3F7FB"; ctx.beginPath(); ctx.roundRect(-6.5, -15, 13, 27, 2); ctx.fill();
          ctx.fillStyle = teinte; ctx.beginPath(); ctx.roundRect(-6.5, -15, 13, 19, 2); ctx.fill();
          ctx.fillStyle = N; ctx.fillRect(-6.5, 3, 13, 3);                                             // le joint du piston
          ctx.fillStyle = volume(-6.5, 6.5); ctx.beginPath(); ctx.roundRect(-6.5, -15, 13, 27, 2); ctx.fill();
          ctx.beginPath(); ctx.roundRect(-6.5, -15, 13, 27, 2); ctx.stroke();
          ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-6.5, -11 + i * 4.5); ctx.lineTo(-1.5, -11 + i * 4.5); } ctx.stroke();
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-10.5, 11, 21, 3.5, 1.5); ctx.fill();    // les ailettes
          ctx.fillStyle = Y; trait(ctx, 2); ctx.beginPath(); ctx.roundRect(-3, -24, 6, 9, 2); ctx.fill(); ctx.stroke();   // le bouchon
        }
        ctx.restore();
      };
      const rond = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); };
      const FANIONS = [Y, O, P, V, G, B];
      const bonus = () => Math.min(RTW.bonus, Math.floor(s.serie / RTW.serie));
      // Les effets : confettis, paillettes (k = "p") et rubans (k = "r") dans parts, annonce de combo dans pop. Rien de tout cela en mouvements réduits.
      let parts = [], pop = null, serieVue = 0, evVu = -9, secousse = -9;
      const jet = (x, y, n, coul, force, bas) => { if (calme) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = force * (0.4 + Math.random() * 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (bas ? 0 : force * 0.5), vie: 0.5 + Math.random() * 0.5, age: 0, c: coul || FANIONS[i % 6], r: 2 + Math.random() * 2.5, tour: Math.random() * 6 }); } };
      const paillettes = (x, y, n, rayon) => { if (calme) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, d = Math.random() * rayon; parts.push({ k: "p", x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, vx: Math.cos(a) * 26, vy: -10 - Math.random() * 30, vie: 0.7 + Math.random() * 0.8, age: 0, c: clos ? [Y, C, "#fff", P][i % 4] : [O, "#E0B400", "#C2409B", V][i % 4], r: 3 + Math.random() * 3.5, tour: Math.random() * 6 }); } };
      const rubans = n => { if (calme) return; for (let i = 0; i < n; i++) parts.push({ k: "r", x: 20 + Math.random() * (W - 40), y: 44 - Math.random() * 50, vx: 0, vy: 95 + Math.random() * 70, vie: 2.2 + Math.random(), age: 0, c: FANIONS[(i + (Math.random() * 6 | 0)) % 6], r: 5 + Math.random() * 4, tour: Math.random() * 6 }); };
      function effets(dt) {
        if (s.evT !== evVu) {                                                                        // un nouveau geste vient d'être jugé
          evVu = s.evT; const e = s.ev;
          if (e && e.q === 3) paillettes(TW_MX[e.m], TW_YH, 5 + 2 * bonus(), 26);
          if (e && e.q === 0) secousse = s.t;
        }
        if (s.serie > serieVue) {
          const k = Math.floor(s.serie / RTW.serie);
          if (s.serie % RTW.serie === 0 && k <= RTW.bonus) { pop = { txt: "Combo ! bonus +" + k, t: s.t, c: [V, Y, O][k - 1] }; jet(180, 150, 10 + 6 * k, null, 190); rubans(4 + 3 * k); paillettes(180, 150, 12 + 6 * k, 110); }
          else if (s.serie >= 20 && s.serie % 10 === 0) { pop = { txt: "Série de " + s.serie + " !", t: s.t, c: O }; rubans(12); paillettes(180, 180, 26, 150); }
        } else if (s.serie < serieVue && serieVue >= RTW.serie) pop = { txt: "Série rompue", t: s.t, c: "#C9C3DA", bas: true };
        serieVue = s.serie;
        for (const q of parts) { q.age += dt; q.vy += (q.k === "r" ? 0 : q.k === "p" ? 70 : 520) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.tour += dt * 9; }
        parts = parts.filter(q => q.age < q.vie && q.y < (clos ? H + 60 : TW_SOL));
      }
      function decor() {
        const t = tAff(), k = bonus();
        // La salle de préparation, vue en perspective : plafond, murs fuyants, mur du fond, carrelage. Point de fuite au centre.
        const FX = 180, FY = 236, G0 = 46, D0 = 314, HT = 72, BAS = 398;                            // le mur du fond : de G0 à D0, de HT à BAS
        const mur = ctx.createLinearGradient(0, HT, 0, BAS); mur.addColorStop(0, "#E3DDF6"); mur.addColorStop(1, "#F5F2FC");
        ctx.fillStyle = "#CFC6EC"; ctx.fillRect(0, 0, W, H);                                         // les murs de côté, dans l'ombre
        ctx.fillStyle = "#F4F1FB"; ctx.beginPath(); ctx.moveTo(0, 39); ctx.lineTo(W, 39); ctx.lineTo(D0, HT); ctx.lineTo(G0, HT); ctx.closePath(); ctx.fill();   // le plafond
        ctx.fillStyle = mur; ctx.fillRect(G0, HT, D0 - G0, BAS - HT);                                // le mur du fond
        const sol = ctx.createLinearGradient(0, BAS, 0, H); sol.addColorStop(0, "#E9DDB4"); sol.addColorStop(1, "#F9EDC6");
        ctx.fillStyle = sol; ctx.beginPath(); ctx.moveTo(G0, BAS); ctx.lineTo(D0, BAS); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.save(); ctx.clip();
        // Le carrelage : les joints fuient vers le point de fuite, les rangées se resserrent vers le fond.
        ctx.strokeStyle = "rgba(38,7,109,.13)"; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let i = -6; i <= 6; i++) { const xb = FX + i * 60, k = (BAS - FY) / (H - FY); ctx.moveTo(FX + (xb - FX) * k, BAS); ctx.lineTo(xb, H); }
        for (const y of [407, 419, 436, 458]) { const k = (y - FY) / (BAS - FY); ctx.moveTo(FX + (G0 - FX) * k, y); ctx.lineTo(FX + (D0 - FX) * k, y); }
        ctx.stroke(); ctx.restore();
        // Les arêtes de la salle, et la plinthe.
        ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(0, 39); ctx.lineTo(G0, HT); ctx.lineTo(G0, BAS); ctx.lineTo(0, H); ctx.moveTo(W, 39); ctx.lineTo(D0, HT); ctx.lineTo(D0, BAS); ctx.lineTo(W, H); ctx.moveTo(G0, HT); ctx.lineTo(D0, HT); ctx.stroke();
        ctx.fillStyle = "rgba(38,7,109,.3)"; ctx.fillRect(G0, BAS - 5, D0 - G0, 5);
        // Mur de gauche : la porte du sas, avec son hublot (en perspective).
        ctx.fillStyle = "#BDB2E2"; ctx.beginPath(); ctx.moveTo(8, 196); ctx.lineTo(36, 206); ctx.lineTo(36, 408); ctx.lineTo(8, 458); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(38,7,109,.4)"; ctx.stroke();
        ctx.fillStyle = "#EAF4FB"; ctx.beginPath(); ctx.ellipse(22, 262, 8, 17, 0.08, 0, 6.3); ctx.fill(); ctx.stroke();
        // Mur de droite : le passe-plat, par où sortent les préparations libérées.
        ctx.fillStyle = "#EAF4FB"; ctx.beginPath(); ctx.moveTo(324, 248); ctx.lineTo(352, 240); ctx.lineTo(352, 318); ctx.lineTo(324, 312); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(38,7,109,.45)"; ctx.beginPath(); ctx.moveTo(324, 312); ctx.lineTo(352, 318); ctx.lineTo(352, 324); ctx.lineTo(324, 317); ctx.closePath(); ctx.fill();
        // Au fond à gauche : le poste de sécurité (la hotte), sa vitre inclinée, ses deux manchettes, son piètement.
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = "rgba(38,7,109,.1)"; ctx.beginPath(); ctx.ellipse(110, BAS + 2, 62, 6, 0, 0, 6.3); ctx.fill();
        trait(ctx, 2); ctx.strokeStyle = "rgba(38,7,109,.55)";
        ctx.fillStyle = "#D7D0EF"; ctx.fillRect(62, 344, 6, 54); ctx.fillRect(152, 344, 6, 54);     // les pieds
        ctx.fillStyle = "#C3B9E6"; ctx.beginPath(); ctx.moveTo(160, 196); ctx.lineTo(172, 206); ctx.lineTo(172, 352); ctx.lineTo(160, 344); ctx.closePath(); ctx.fill(); ctx.stroke();   // le flanc, qui donne l'épaisseur
        ctx.fillStyle = "#FBFAFE"; ctx.beginPath(); ctx.roundRect(58, 196, 102, 148, 5); ctx.fill(); ctx.stroke();   // le caisson
        ctx.fillStyle = "#D7D0EF"; ctx.fillRect(58, 196, 102, 26); ctx.strokeRect(58, 196, 102, 26);  // le bandeau du ventilateur
        ctx.fillStyle = G; rond(72, 209, 3.2); ctx.fill(); ctx.fillStyle = "rgba(38,7,109,.4)"; for (let x = 90; x < 150; x += 7) ctx.fillRect(x, 204, 3, 10);
        const vitre = ctx.createLinearGradient(66, 228, 152, 300); vitre.addColorStop(0, "#DDF0FA"); vitre.addColorStop(0.5, "#F6FBFE"); vitre.addColorStop(1, "#CFE7F5");
        ctx.fillStyle = vitre; ctx.beginPath(); ctx.moveTo(66, 230); ctx.lineTo(152, 230); ctx.lineTo(152, 304); ctx.lineTo(66, 304); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(76, 290); ctx.lineTo(104, 238); ctx.moveTo(90, 292); ctx.lineTo(112, 252); ctx.stroke();   // les reflets
        trait(ctx, 2); ctx.strokeStyle = "rgba(38,7,109,.55)"; ctx.fillStyle = "#EDEAF6"; ctx.fillRect(58, 304, 102, 40); ctx.strokeRect(58, 304, 102, 40);
        for (const x of [88, 130]) { ctx.fillStyle = V; ctx.beginPath(); ctx.ellipse(x, 324, 13, 11, 0, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(38,7,109,.35)"; ctx.beginPath(); ctx.ellipse(x, 324, 6, 5, 0, 0, 6.3); ctx.fill(); }
        // Au fond à droite : deux étagères de flacons, avec leur tranche, et l'horloge de la salle.
        for (const y of [250, 304]) {
          ctx.fillStyle = "rgba(38,7,109,.5)"; ctx.fillRect(206, y, 96, 4); ctx.fillStyle = "rgba(38,7,109,.25)"; ctx.beginPath(); ctx.moveTo(206, y + 4); ctx.lineTo(302, y + 4); ctx.lineTo(296, y + 9); ctx.lineTo(212, y + 9); ctx.closePath(); ctx.fill();
          [20, 48, 76].forEach((dx, i) => flacon(ctx, 206 + dx, y - 14, 0, FANIONS[(i + (y > 260 ? 3 : 0)) % 6]));
        }
        trait(ctx, 2); ctx.strokeStyle = "rgba(38,7,109,.55)"; ctx.fillStyle = "#FBFAFE"; rond(254, 170, 15); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(254, 170); ctx.lineTo(254, 160); ctx.moveTo(254, 170); ctx.lineTo(261, 174); ctx.stroke();
        ctx.globalAlpha = 1;
        // Les plafonniers : leur lumière tombe sur le préparateur, et monte avec le bonus de série.
        for (const m of [0, 1]) {
          const x0 = m ? 248 : 112, xc = (m ? 222 : 138) + (calme ? 0 : Math.sin(t * 1.3 + m * 2) * 14 * (k ? 1 : 0.3));
          const g = ctx.createLinearGradient(x0, 58, xc, TW_SOL); g.addColorStop(0, "rgba(236,213,103," + (0.14 + 0.12 * k) + ")"); g.addColorStop(1, "rgba(236,213,103,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 30, 58); ctx.lineTo(x0 + 30, 58); ctx.lineTo(xc + 84, TW_SOL); ctx.lineTo(xc - 84, TW_SOL); ctx.closePath(); ctx.fill();
          ctx.fillStyle = k ? "#FFF6C9" : "#FFFFFF"; ctx.strokeStyle = "rgba(38,7,109,.4)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 - 40, 50); ctx.lineTo(x0 + 40, 50); ctx.lineTo(x0 + 32, 62); ctx.lineTo(x0 - 32, 62); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // La guirlande de fanions, sous le bandeau : elle s'illumine fanion après fanion avec la série.
        const yG = x => 46 + 16 * Math.sin(Math.PI * x / W);
        ctx.strokeStyle = "rgba(38,7,109,.45)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, yG(x)); ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const x = 15 + i * 30, y = yG(x), vif = i < s.serie;
          ctx.fillStyle = FANIONS[i % 6]; ctx.globalAlpha = vif ? 1 : 0.38; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 15); ctx.closePath(); ctx.fill();
          if (vif) { ctx.strokeStyle = N; ctx.lineWidth = 1.6; ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }
      const tAff = () => s.t + s.acc;
      function preparateur() {
        const t = tAff();
        ctx.fillStyle = "rgba(38,7,109,.13)"; ctx.beginPath(); ctx.ellipse(180, TW_SOL + 3, 60, 7, 0, 0, 6.3); ctx.fill();
        trait(ctx, 10); ctx.beginPath(); ctx.moveTo(168, 416); ctx.lineTo(168, TW_SOL - 4); ctx.moveTo(192, 416); ctx.lineTo(192, TW_SOL - 4); ctx.stroke();
        const hy = m => TW_YH + 3 + (!calme && t - s.geste[m] < 0.12 ? -5 : 0);
        if (!calme && t - secousse < 0.3) ctx.translate(Math.sin((t - secousse) * 60) * 2.5, 0);       // un sursaut quand un objet tombe
        for (const m of [0, 1]) {                                                                    // les bras, levés vers les gants
          const ex = 180 + (m ? 24 : -24), bras = () => { ctx.beginPath(); ctx.moveTo(ex, 364); ctx.quadraticCurveTo((ex + TW_MX[m]) / 2 + (m ? 10 : -10), 392, TW_MX[m], hy(m) + 8); ctx.stroke(); };
          trait(ctx, 15); bras(); ctx.strokeStyle = C; ctx.lineWidth = 9; bras();
        }
        trait(ctx, 3); ctx.fillStyle = C;                                                            // la blouse
        ctx.beginPath(); ctx.moveTo(154, 352); ctx.lineTo(206, 352); ctx.quadraticCurveTo(216, 392, 213, 424); ctx.lineTo(147, 424); ctx.quadraticCurveTo(144, 392, 154, 352); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 168, 376, 24, 24);
        ctx.fillStyle = "#F4D6BF"; rond(180, 326, 20); ctx.fill(); ctx.stroke();                     // la tête, la charlotte, le masque
        ctx.fillStyle = B; ctx.beginPath(); ctx.ellipse(180, 319, 24, 17, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(165, 331, 30, 14, 6); ctx.fill(); ctx.stroke();
        // Les yeux suivent l'objet qui vole.
        const v = s.batons.find(b => b.etat === "vol" || b.etat === "chute"), a = v ? Math.atan2(v.y - 324, v.x - 180) : -Math.PI / 2;
        ctx.fillStyle = N; for (const x of [173, 187]) { rond(x + Math.cos(a) * 1.8, 325 + Math.sin(a) * 1.8, 2.3); ctx.fill(); }
        for (const m of [0, 1]) {                                                                    // les gants
          const bloque = s.gel[m] > t;
          trait(ctx, 3); ctx.fillStyle = bloque ? "#C9C3DA" : t - s.geste[m] < 0.12 ? Y : V; rond(TW_MX[m], hy(m), 13); ctx.fill(); ctx.stroke();
        }
      }
      function dessiner() {
        const t = tAff();
        decor();
        // Les deux côtés à toucher, au pied de la scène.
        for (const m of [0, 1]) {
          const bloque = s.gel[m] > t, vif = t - s.geste[m] < 0.12;
          ctx.fillStyle = bloque ? "rgba(216,64,43,.22)" : vif ? Y : "rgba(38,7,109,.1)"; ctx.beginPath(); ctx.roundRect(m ? 186 : 10, 447, 164, 26, 13); ctx.fill();
          texte(ctx, m ? (tactile ? "DROITE" : "DROITE →") : (tactile ? "GAUCHE" : "← GAUCHE"), m ? 268 : 92, 461, 12, bloque ? "rgba(216,64,43,.8)" : "rgba(38,7,109,.6)");
        }
        ctx.save(); preparateur(); ctx.restore();
        // Le repère de rythme : un anneau se referme sur le gant où l'objet va retomber.
        if (!clos) for (const b of s.batons) {
          if (b.etat !== "vol") continue;
          const r = b.t1 - t;
          if (r > 0.75 || r < -RTW.juste) continue;
          ctx.globalAlpha = borne(1.15 - r / 0.75, 0, 1); ctx.strokeStyle = Math.abs(r) <= RTW.parfait ? O : N; ctx.lineWidth = Math.abs(r) <= RTW.parfait ? 4.5 : 3;
          rond(TW_MX[b.m1], TW_YH + 3, 16 + Math.max(0, r) * 62); ctx.stroke(); ctx.globalAlpha = 1;
        }
        for (const b of s.batons) {
          if (t < b.entree || b.absent) continue;
          if (!calme && b.etat === "vol") {
            const k = bonus();
            if (k) {                                                                                 // en combo, l'objet traîne un ruban à sa couleur
              ctx.strokeStyle = TEINTES[b.k]; ctx.lineCap = "round";
              let o = placerTwirling(Object.assign({}, b), t);
              for (let i = 1; i <= 4 + 3 * k; i++) { const q = placerTwirling(Object.assign({}, b), Math.max(b.t0, t - i * 0.022)); ctx.globalAlpha = 0.5 * (1 - i / (5 + 3 * k)); ctx.lineWidth = 7 - i * 0.4; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(q.x, q.y); ctx.stroke(); o = q; }
              ctx.globalAlpha = 1;
            }
            for (let i = 3; i >= 1; i--) { const o = placerTwirling(Object.assign({}, b), t - i * 0.03); spatule(o.x, o.y, o.rot, TEINTES[b.k], 0.1); }
          }
          const o = b.etat === "vol" || b.etat === "chute" ? placerTwirling(Object.assign({}, b), t) : b;
          spatule(o.x + (b.etat === "main" ? (b.k - 1) * 5 : 0), o.y - (b.etat === "main" ? 6 : 0), o.rot, TEINTES[b.k], 1);
        }
        if (!clos) confettis();
        function confettis() { for (const q of parts) {
          const a = 1 - q.age / q.vie;
          if (q.k === "r") {                                                                         // un ruban : il descend en ondulant
            ctx.globalAlpha = Math.min(1, a * 3) * 0.9; ctx.strokeStyle = q.c; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath();
            for (let i = 0; i <= 9; i++) ctx.lineTo(q.x + Math.sin(q.age * 6 + i * 0.75 + q.tour) * q.r, q.y - i * 6);
            ctx.stroke();
          } else if (q.k === "p") {                                                                  // une paillette : une étoile à quatre branches qui scintille
            ctx.globalAlpha = a * (0.45 + 0.55 * Math.abs(Math.sin(q.age * 18 + q.tour))); ctx.fillStyle = q.c; ctx.beginPath();
            for (let i = 0; i < 8; i++) { const r = i % 2 ? q.r * 0.3 : q.r, b = i * Math.PI / 4; ctx.lineTo(q.x + Math.cos(b) * r, q.y + Math.sin(b) * r); }
            ctx.fill();
          } else { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.tour); ctx.globalAlpha = a; ctx.fillStyle = q.c; ctx.fillRect(-q.r, -q.r * 0.6, q.r * 2, q.r * 1.2); ctx.restore(); }
        }
        ctx.globalAlpha = 1; }
        // Les annonces : l'entrée des spatules, les combos.
        const b2 = s.batons[1], b3 = s.batons[2];
        const annonce = (txt, y, fond, encre) => { ctx.fillStyle = fond; ctx.beginPath(); ctx.roundRect(40, y - 16, 280, 32, 16); ctx.fill(); texte(ctx, txt, 180, y + 1, 15, encre); };
        if (!clos && b2.liste.length && t > b2.entree && t < b2.entree + 2.4) annonce("Et maintenant, un infuseur !", 120, N, Y);
        if (!clos && s.trois !== null && t < s.troisT + 2.6) annonce(s.trois ? "Bouquet final : trois à la fois !" : "La seconde seringue reste dans son sachet", 120, s.trois ? O : N, s.trois ? N : C);
        if (pop && !clos && t - pop.t < 1.1) {
          const a = t - pop.t, z = calme ? 1 : 1 + 0.35 * Math.max(0, 1 - a * 6);
          ctx.save(); ctx.translate(180, pop.bas ? 270 : 164); ctx.scale(z, z); ctx.globalAlpha = Math.min(1, (1.1 - a) * 3);
          trait(ctx, 3); ctx.fillStyle = pop.c; ctx.beginPath(); ctx.roundRect(-96, -17, 192, 34, 17); ctx.fill(); ctx.stroke();
          texte(ctx, pop.txt, 0, 1, 16, N); ctx.restore();
        }
        // Le résultat du dernier geste.
        const dtE = s.t - s.evT, e = s.ev;
        if (e && dtE < 0.8 && !clos) {
          if (e.q) {
            if (!calme && e.q === 3) { ctx.globalAlpha = 1 - dtE / 0.8; ctx.strokeStyle = O; ctx.lineWidth = 4; rond(TW_MX[e.m], TW_YH + 3, 18 + dtE * 40); ctx.stroke(); ctx.globalAlpha = 1; }
            const x = e.m ? 286 : 74, y = 388 - (calme ? 0 : Math.min(dtE, 0.3) * 20);
            ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(x - 62, y - 14, 124, 28, 14); ctx.fill();
            texte(ctx, e.q < 0 ? "Dans le vide −" + RTW.vide : ["", "Juste", "Bien", "Parfait !"][e.q] + " +" + e.gain, x, y + 1, e.q < 0 ? 13 : 14, e.q === 3 ? Y : e.q < 0 ? P : C);
          } else texte(ctx, "À terre… on ramasse !", 180, 290, 14, "rgba(38,7,109,.75)");
        }
        if (s.serie >= 2 && !clos) {                                                                  // le compteur de série, et ses trois pastilles de bonus
          const k = bonus();
          ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(112, 72, 136, 24, 12); ctx.fill();
          texte(ctx, "Série " + s.serie, 158, 85, 13, k ? Y : C);
          for (let i = 0; i < RTW.bonus; i++) { ctx.fillStyle = i < k ? [V, Y, O][i] : "rgba(255,251,242,.25)"; rond(206 + i * 14, 84, 4.6); ctx.fill(); }
        }
        if (t < 6 && !clos && !joue) {
          ctx.globalAlpha = Math.min(1, 6 - t) * 0.94;
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(14, 196, 332, 46, 16); ctx.fill();
          texte(ctx, tactile ? "Touchez le côté où la seringue retombe," : "Cliquez le côté où elle retombe (ou ← →),", 180, 211, 13, Y);
          texte(ctx, "pile quand elle arrive dans le gant", 180, 228, 13, Y);
          ctx.globalAlpha = 1;
        }
        const n = noteTwirling(s);
        bandeau(ctx, s.points + " pts · " + n + "/10" + (n < 10 ? " · palier à " + palierTwirling(s, n) : ""), duree - s.t, duree);
        if (clos) {
          // Le tableau final : la note en grand au cœur du logo de l'unité, et quelques chiffres de la partie.
          ctx.fillStyle = "rgba(38,7,109,.8)"; ctx.fillRect(0, 39, W, H - 39);
          const z = calme ? 1 : 1 + 0.03 * Math.sin(tFin * 3) + 0.25 * Math.max(0, 1 - tFin * 4);
          ctx.save(); ctx.translate(180, 196); ctx.scale(z, z);
          ctx.fillStyle = C; rond(0, 0, 124); ctx.fill();
          if (logo.complete && logo.naturalWidth) { ctx.save(); if (!calme) ctx.rotate(Math.sin(tFin * 0.9) * 0.05); ctx.drawImage(logo, -122, -119, 244, 244); ctx.restore(); }
          trait(ctx, 4); ctx.fillStyle = N; rond(0, 0, 60); ctx.fill(); ctx.strokeStyle = Y; ctx.stroke();
          texte(ctx, String(n), n === 10 ? -14 : -10, -3, 62, Y); texte(ctx, "/10", n === 10 ? 38 : 30, 12, 20, C);
          ctx.restore();
          const stats = [[s.points, s.points > 1 ? "points" : "point"], [s.pris + "/" + s.choree.length, "rattrapées"], [s.q[3], s.q[3] > 1 ? "parfaits" : "parfait"], [s.meilleure, "série max"]];
          ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(12, 340, 336, 64, 16); ctx.fill(); trait(ctx, 3); ctx.stroke();
          stats.forEach((q, i) => { const x = 54 + i * 84; texte(ctx, String(q[0]), x, 363, 21, N); texte(ctx, q[1], x, 387, 11, "rgba(38,7,109,.7)"); if (i) { ctx.strokeStyle = "rgba(38,7,109,.18)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 42, 350); ctx.lineTo(x - 42, 394); ctx.stroke(); } });
          texte(ctx, s.trois ? "Bouquet final à trois réussi !" : n >= 5 ? "Belle parade !" : "La parade est libérée", 180, 424, 14, Y);
          confettis();                                                                               // rubans et paillettes passent devant le tableau
        }
      }
      const arret = boucle(dt => {
        vu = performance.now();
        if (!clos) {
          pasTwirling(s, dt); effets(dt);
          if (s.fini) {
            clos = true; serieVue = s.serie; if (s.points) { rubans(14); paillettes(180, 196, 30, 150); }
            const n = noteTwirling(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = pl(s.pris, "rattrapage", "rattrapages") + " sur " + s.choree.length + ", dont " + pl(s.q[3], "parfait", "parfaits") + ", meilleure série de " + s.meilleure + (s.trois ? ", bouquet final à trois objets" : "") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (1 à 3 points selon la justesse du geste, jusqu'à 3 de bonus de série, 1 point perdu par geste dans le vide ; 10 sur 10 à partir de " + palierTwirling(s, 9) + " points).";
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, brutTwirling(s)); }, 3600);
          }
        } else {
          // Le tableau final : la fête continue quelques secondes, plus fournie quand la note est bonne.
          tFin += dt; effets(dt);
          if (noteTwirling(s) >= 5 && tFin > salve) { salve += 0.7; rubans(6); paillettes(180, 196, 14, 160); }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.twirling = twirling;
    Object.assign(api._coeur, { REGL_TWIRLING: RTW, TW_MX, TW_YH, choreeTwirling, creerTwirling, pasTwirling, frapperTwirling, noteTwirling, brutTwirling, palierTwirling, gainTwirling });
  }
  /* ----- Fin [twirling] ----- */

  /* ----- Repère [tour] : la tour de boîtes ----- */
  // La tour de garde : un palan fait aller et venir des boîtes au-dessus d'une palette de la réserve. On lâche chaque boîte
  // au bon moment pour monter la pile la plus haute et la plus droite possible. Une boîte posée de travers fait pencher la
  // tour ; quand le poids du dessus sort de son appui, tout ce qui est au-dessus bascule. Seules comptent les boîtes encore
  // debout à la fin. Tout le jeu vit dans ce bloc (cœur, dessin, inscription) : aucun nom ne déborde sur les jeux voisins.
  {
    /* --- Le cœur : règles et équilibre, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-tour.js) : ils fixent la difficulté.
    //  chute : hauteur de chute d'une boîte ; amp, w0, dw, wmax : va-et-vient du palan (il accélère avec la hauteur) ;
    //  marge : part de l'appui qui porte vraiment (1 = équilibre parfait de physicien, moins = plus sévère) ;
    //  parfait : écart (px) en dessous duquel la pose est parfaite ; tol : écart au-delà duquel la boîte ne vaut plus que « base » ;
    //  bal0, bal1, balMax, wb : balancement de la tour, plus ample quand elle penche.
    const RTR = { g: 2400, chute: 150, amp: 116, w0: 2.2, dw: 0.035, wmax: 3.4, palette: 150, pause: 0.45, bascule: 0.6, marge: 0.75, parfait: 4, tol: 26, base: 40, prime: 55, bal0: 1.3, bal1: 5.4, balMax: 26, wb: 2.1, retrait: 0.5, wmin: 46, metre: 140,
      seuils: [150, 300, 450, 600, 780, 980, 1250, 1600, 2100, 2700] };
    const TR_PAS = 1 / 240;
    // Les gabarits : largeur et hauteur des boîtes, dans un ordre fixe (le même pour tous les joueurs). Elles rétrécissent peu à peu.
    const TR_GAB = [[74, 30], [62, 26], [80, 28], [58, 32], [68, 26], [56, 30], [76, 28], [64, 32]];
    const gabaritTour = i => { const g = TR_GAB[i % TR_GAB.length]; return { w: Math.max(RTR.wmin, Math.round(g[0] - RTR.retrait * i)), h: g[1], lot: i + 1 }; };
    const creerTour = () => ({ t: 0, acc: 0, pile: [], phase: -Math.PI / 2, souple: 0, penche: 0, servis: 0, attente: 0.5, tombe: null, bascule: null, debris: [], points: 0, poses: 0, parfaites: 0, effondrements: 0, tombees: 0, rates: 0, record: 0, ev: null, evT: -9, fini: false });
    // Centres des boîtes au repos (sans le balancement) : chaque boîte retient son décalage d par rapport à celle du dessous.
    const centresTour = s => { let x = 180; return s.pile.map(b => (x += b.d)); };
    const hauteurTour = s => s.pile.reduce((a, b) => a + b.h, 0);
    const allureTour = s => Math.min(RTR.wmax, RTR.w0 + RTR.dw * s.pile.length);
    // Où est (ou sera, dans « avance » secondes) la boîte portée par le palan.
    const pinceTour = (s, avance) => 180 + RTR.amp * Math.sin(s.phase + allureTour(s) * (avance || 0));
    // Le balancement : la boîte k (1 = celle du bas) s'écarte d'autant plus qu'elle est haute et que la tour penche.
    const deversTour = (s, k, avance) => s.souple * Math.pow(k, 1.5) / 30 * Math.sin(RTR.wb * (s.t + (avance || 0)));
    // Le centre du sommet (là où il faut viser), dans « avance » secondes. Sans boîte : le milieu de la palette.
    const cibleTour = (s, avance) => { const n = s.pile.length; return n ? centresTour(s)[n - 1] + deversTour(s, n, avance) : 180; };
    const chuteTour = () => Math.sqrt(2 * RTR.chute / RTR.g);                                        // durée de la chute d'une boîte
    // L'équilibre : pour chaque boîte, le centre de gravité de tout ce qu'elle porte (elle comprise) doit tomber dans son
    // appui (la partie commune avec la boîte du dessous, réduite par la marge). cede = la plus basse qui ne tient pas (-1 : tout tient).
    const equilibreTour = s => {
      const xs = centresTour(s); let m = 0, mx = 0, cede = -1, cote = 0, pire = 0;
      for (let j = xs.length - 1; j >= 0; j--) {
        const b = s.pile[j], x0 = j ? xs[j - 1] : 180, w0 = j ? s.pile[j - 1].w : RTR.palette;
        m += b.w * b.h; mx += b.w * b.h * xs[j];
        const g = Math.max(xs[j] - b.w / 2, x0 - w0 / 2), d = Math.min(xs[j] + b.w / 2, x0 + w0 / 2);
        const r = (mx / m - (g + d) / 2) / Math.max(1, (d - g) / 2 * RTR.marge);
        if (Math.abs(r) > 1) { cede = j; cote = r > 0 ? 1 : -1; pire = 0; } else if (Math.abs(r) > Math.abs(pire)) pire = r;
      }
      return { cede, cote, penche: pire };
    };
    const compterTour = s => { s.points = s.pile.reduce((a, b) => a + b.pts, 0); s.record = Math.max(s.record, s.pile.length); };
    const jugerTour = s => {
      const e = equilibreTour(s);
      if (e.cede >= 0) { s.bascule = { j: e.cede, cote: e.cote, t: 0 }; s.penche = e.cote; } else s.penche = e.penche;
      return e.cede >= 0;
    };
    // Lâcher la boîte. Refusé tant que la précédente tombe, que la tour bascule, que la suivante n'est pas arrivée, ou une fois le temps écoulé.
    const lacherTour = (s, duree) => {
      if (s.fini || s.t >= duree || s.attente > 0 || s.tombe || s.bascule) return false;
      s.tombe = Object.assign(gabaritTour(s.servis), { x: pinceTour(s), d: 0, v: 0 }); s.servis++;
      return true;
    };
    const poserTour = s => {
      const b = s.tombe, n = s.pile.length, demi = (n ? s.pile[n - 1].w : RTR.palette) / 2, haut = hauteurTour(s);
      let dx = b.x - cibleTour(s);
      s.tombe = null; s.attente = RTR.pause; s.evT = s.t;
      if (Math.abs(dx) > demi) {                                                                     // le milieu de la boîte est dans le vide : elle file par terre
        const c = dx > 0 ? 1 : -1;
        s.rates++; s.debris.push({ x: b.x, y: haut, w: b.w, h: b.h, lot: b.lot, vx: c * 70, vy: 0, rot: 0, vr: c * 5, age: 0 });
        s.ev = { type: "rate", x: b.x, y: haut }; return;
      }
      const parfait = Math.abs(dx) <= RTR.parfait; if (parfait) dx = 0;                              // pose parfaite : la boîte se cale pile dans l'axe
      const pts = parfait ? 100 : RTR.base + Math.round(RTR.prime * Math.max(0, 1 - (Math.abs(dx) - RTR.parfait) / RTR.tol));
      s.pile.push({ d: dx, w: b.w, h: b.h, lot: b.lot, pts }); s.poses++; if (parfait) s.parfaites++;
      const x = centresTour(s)[n];
      if (jugerTour(s)) s.ev = { type: "bascule", x, y: haut + b.h }; else { compterTour(s); s.ev = { type: parfait ? "parfait" : "pose", pts, x, y: haut + b.h, h: b.h }; }
    };
    // La bascule est finie : tout ce qui était au-dessus de la boîte qui a cédé part en vrac.
    const effondrerTour = s => {
      const { j, cote } = s.bascule, xs = centresTour(s); let y = 0;
      for (let k = 0; k < j; k++) y += s.pile[k].h;
      const partis = s.pile.splice(j); s.bascule = null;
      partis.forEach((b, k) => { s.debris.push({ x: xs[j + k] + cote * (6 + 5 * k), y, w: b.w, h: b.h, lot: b.lot, vx: cote * (70 + 22 * k), vy: 40 + 12 * k, rot: cote * 0.45, vr: cote * (2.5 + 0.5 * k), age: 0 }); y += b.h; });
      if (partis.length > 1) { s.effondrements++; s.tombees += partis.length; } else s.rates++;
      s.attente = RTR.pause; s.evT = s.t; s.ev = { type: "chute", n: partis.length, x: xs[j], y };
      if (!jugerTour(s)) compterTour(s);
    };
    const unPasTour = (s, duree) => {
      const dt = TR_PAS, n = s.pile.length;
      s.t += dt; s.phase += allureTour(s) * dt;
      if (s.attente > 0) s.attente -= dt;
      const visee = Math.min(RTR.bal0 + RTR.bal1 * Math.abs(s.penche), n ? RTR.balMax * 30 / Math.pow(n, 1.5) : 0);
      s.souple += (visee - s.souple) * Math.min(1, 3 * dt);
      for (const q of s.debris) { q.age += dt; q.vy -= 1500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
      if (s.debris.length && s.debris[0].age > 1.6) s.debris.shift();
      if (s.bascule) { s.bascule.t += dt; if (s.bascule.t >= RTR.bascule) effondrerTour(s); }
      const b = s.tombe;
      if (b) { b.v += RTR.g * dt; b.d += b.v * dt; if (b.d >= RTR.chute) poserTour(s); }
      // Fin : le temps est écoulé, la dernière boîte lâchée est posée et la tour a fini de bouger.
      if (s.t >= duree && !s.tombe && !s.bascule) s.fini = true;
    };
    // Pas fixe : la simulation avance par tranches de 1/240 s quel que soit le rythme d'affichage.
    const pasTour = (s, dt, duree) => { s.acc += dt; while (s.acc >= TR_PAS && !s.fini) { s.acc -= TR_PAS; unPasTour(s, duree); } };
    // La note : le nombre de paliers atteints. Barème progressif : les premiers points de note viennent vite, les derniers se méritent.
    const noteTour = s => RTR.seuils.filter(p => s.points >= p).length;

    /* --- Dessin et commandes (navigateur seulement) --- */
    const tour = (el, opt) => {
      const duree = opt.duree || 50, { cv, ctx, liberer } = monter(el, H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "La tour de garde. Un palan promène une boîte au-dessus de la palette : touchez l'écran, cliquez ou tapez Espace pour la lâcher au bon moment. Empilez haut et droit : une tour qui penche trop s'effondre en partie, et seules comptent les boîtes encore debout à la fin.");
      const s = creerTour(), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      const logo = new Image(); logo.src = opt.logo || api._logo;                                  // le logo de l'unité, sur une boîte sur quatre
      const SOL = 426, RAIL = 52, TEINTES = [Y, O, P, V, B, G];
      let clos = false, minuterie = 0, cam = 0, hautVu = 0;
      const lacher = () => { if (!clos) lacherTour(s, duree); };
      const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); lacher(); };
      const enfonce = e => {
        if (e.key !== " " && e.key !== "Spacebar" && e.key !== "Enter" && e.key !== "ArrowDown") return;
        if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || "")) return;
        e.preventDefault(); if (!e.repeat) lacher();
      };
      const menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("contextmenu", menu); window.addEventListener("keydown", enfonce);
      const retirer = () => { cv.removeEventListener("pointerdown", appui); cv.removeEventListener("contextmenu", menu); window.removeEventListener("keydown", enfonce); };
      // Une boîte de médicament : étui crème, bandeau de couleur, numéro de lot ; une sur quatre porte le logo de l'unité.
      const boite = (x, y, b, alpha) => {                                                            // x : centre, y : dessous de la boîte (écran)
        const c = TEINTES[b.lot % TEINTES.length], g = -b.w / 2;
        ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(g, -b.h, b.w, b.h, 4); ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = c; ctx.fillRect(g, -b.h, 18, b.h); ctx.fillStyle = "rgba(38,7,109,.1)"; ctx.fillRect(g, -5, b.w, 5); ctx.restore();
        ctx.beginPath(); ctx.roundRect(g, -b.h, b.w, b.h, 4); ctx.stroke();
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(g + 18, -b.h); ctx.lineTo(g + 18, 0); ctx.stroke();
        if (b.lot % 4 === 0 && logo.complete && logo.naturalWidth) ctx.drawImage(logo, g + 2.5, -b.h / 2 - 6.5, 13, 13);
        else { ctx.fillStyle = N; ctx.fillRect(g + 7.5, -b.h / 2 - 5, 3, 10); ctx.fillRect(g + 4, -b.h / 2 - 1.5, 10, 3); }       // la croix
        texte(ctx, (b.w >= 64 ? "LOT " : b.w >= 54 ? "N°" : "") + (b.lot < 10 ? "0" : "") + b.lot, g + 23, -b.h / 2 - 3, 9, N, "left");   // l'étiquette se raccourcit avec la boîte
        ctx.fillStyle = "rgba(38,7,109,.28)"; ctx.fillRect(g + 23, -b.h / 2 + 4, Math.max(8, b.w - 34), 2.5);
        ctx.restore();
      };
      function dessiner(dt) {
        const n = s.pile.length, haut = hauteurTour(s), xs = centresTour(s);
        hautVu += (haut - hautVu) * Math.min(1, 10 * dt);
        cam += (Math.max(0, hautVu - 150) - cam) * Math.min(1, (calme ? 9 : 5) * dt);
        const yE = y => SOL - y + cam;                                                               // hauteur dans la réserve -> écran
        // Le mur de la réserve, plus sombre vers le plafond.
        const mur = ctx.createLinearGradient(0, 0, 0, H); mur.addColorStop(0, "#DDD6EF"); mur.addColorStop(1, "#F3F0FA");
        ctx.fillStyle = mur; ctx.fillRect(0, 0, W, H);
        const face = (c, ...p) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); ctx.fill(); };
        // Les rayonnages : deux travées vues en perspective, de part et d'autre de l'allée (leurs lignes fuient vers le milieu).
        // Ils défilent un peu moins vite que la tour, comme un plan plus lointain. Tout reste pâle pour ne pas gêner la lecture de la pile.
        const pied = SOL - 30 + cam * 0.7, LR = 88;
        for (const c of [1, -1]) {                                                                   // 1 : travée de gauche, -1 : travée de droite
          const x0 = c > 0 ? 40 : W - 40 - LR, fx = c * 13, fy = -9;
          ctx.fillStyle = "rgba(38,7,109,.05)"; ctx.fillRect(x0 + fx, 0, LR, pied + fy);              // le fond de la travée, dans l'ombre
          ctx.fillStyle = "#CBC2E4"; for (const x of [x0, x0 + LR - 4]) ctx.fillRect(x + fx, 0, 4, pied + fy);   // montants arrière
          for (let m = Math.max(1, Math.floor((pied - H - 40) / 84)); pied - m * 84 > 20; m++) {
            const y = pied - m * 84;
            ctx.fillStyle = "rgba(38,7,109,.07)"; ctx.fillRect(x0 + fx, y + 5, LR, 9);               // l'ombre sous la tablette
            face("#E4DFF2", x0, y, x0 + LR, y, x0 + LR + fx, y + fy, x0 + fx, y + fy);               // le dessus de la tablette
            for (let k = 0; k < 3; k++) {                                                            // les cartons : face, dessus et flanc côté allée
              const i = c > 0 ? k : 2 - k, h = (m * 7 + i * 5 + (c > 0 ? 0 : 3)) % 11;
              if (h === 0 || h === 5) continue;                                                      // une place vide de temps en temps
              const bw = 16 + h % 4 * 2, bh = 15 + h * 5 % 19, bx = x0 + 6 + i * 28, p = 6 * c, q = -5, kraft = h % 3 === 0;
              const xf = c > 0 ? bx + bw : bx;
              face(kraft ? "#F1E6CC" : "#EFEBF8", bx, y - bh, bx + bw, y - bh, bx + bw + p, y - bh + q, bx + p, y - bh + q);
              face(kraft ? "#D6C7A2" : "#C4BADF", xf, y - bh, xf + p, y - bh + q, xf + p, y + q, xf, y);
              ctx.fillStyle = kraft ? "#E6D8B6" : "#DAD3EC"; ctx.fillRect(bx, y - bh, bw, bh);
              ctx.fillStyle = "rgba(38,7,109,.13)"; ctx.fillRect(bx + 3, y - bh + 5, bw - 6, 2.5); if (h % 2) ctx.fillRect(bx + 3, y - bh + 10, (bw - 6) / 2, 2);
            }
            ctx.fillStyle = "#B9AEDA"; ctx.fillRect(x0, y, LR, 5);                                   // le chant de la tablette
          }
          ctx.fillStyle = "#AA9ED2"; for (const x of [x0 - 1, x0 + LR - 4]) ctx.fillRect(x, 0, 5, pied);   // montants avant
        }
        // La toise, fixée au mur : un trait tous les 20 cm, un chiffre tous les mètres.
        ctx.fillStyle = "rgba(255,251,242,.7)"; ctx.fillRect(0, 0, 37, H);
        ctx.fillStyle = "rgba(38,7,109,.4)"; ctx.fillRect(36, 0, 1, H);
        for (let m = Math.max(0, Math.floor((cam - 60) / 28)); m * 28 < cam + SOL; m++) {
          const y = yE(m * 28), long = m % 5 ? 6 : 12; ctx.fillRect(3, y - 0.75, long, 1.5);
          if (m && m % 5 === 0) texte(ctx, m / 5 + " m", 17, y, 10, "rgba(38,7,109,.55)", "left");
        }
        // Le sol de l'allée, en fuite vers le mur du fond, et la palette posée au premier plan.
        const ys = yE(0), yh = ys - 30;
        if (yh < H) {
          const sol = ctx.createLinearGradient(0, yh, 0, yh + 84); sol.addColorStop(0, "#E3CD92"); sol.addColorStop(1, "#F7E7B8");
          ctx.fillStyle = sol; ctx.fillRect(0, yh, W, H - yh);
          ctx.save(); ctx.beginPath(); ctx.rect(0, yh, W, H - yh); ctx.clip();
          ctx.strokeStyle = "rgba(38,7,109,.14)"; ctx.lineWidth = 1.2; ctx.beginPath();
          for (let i = -9; i <= 9; i++) { ctx.moveTo(180 + i * 16, yh); ctx.lineTo(180 + i * 64, yh + 84); }     // les joints des dalles fuient vers le fond
          for (const d of [8, 22, 46]) { ctx.moveTo(0, yh + d); ctx.lineTo(W, yh + d); }                         // et se resserrent en s'éloignant
          ctx.stroke(); ctx.restore();
          ctx.fillStyle = "#AA9ED2"; ctx.fillRect(0, yh - 4, W, 4);                                  // la plinthe
          trait(ctx, 2); ctx.beginPath(); ctx.moveTo(0, yh); ctx.lineTo(W, yh); ctx.stroke();
          const g = 180 - RTR.palette / 2, d = g + RTR.palette;
          ctx.fillStyle = "rgba(38,7,109,.17)"; ctx.beginPath(); ctx.ellipse(180, ys + 18, RTR.palette / 2 + 12, 7, 0, 0, 6.3); ctx.fill();   // l'ombre de la palette
          trait(ctx, 2.4);
          face("#EBCB98", g, ys, d, ys, d - 9, ys - 8, g + 9, ys - 8); ctx.stroke();                 // le dessus de la palette, en fuite
          ctx.lineWidth = 1.2; ctx.beginPath(); for (const u of [0.25, 0.5, 0.75]) { ctx.moveTo(g + u * RTR.palette, ys); ctx.lineTo(g + 9 + u * (RTR.palette - 18), ys - 8); } ctx.stroke();
          trait(ctx, 2.4); ctx.fillStyle = "#C99A5B";
          for (const x of [g + 4, 180 - 9, d - 22]) { ctx.beginPath(); ctx.rect(x, ys + 6, 18, 11); ctx.fill(); ctx.stroke(); }
          ctx.fillStyle = "#D9A866"; ctx.beginPath(); ctx.roundRect(g, ys, RTR.palette, 7, 2); ctx.fill(); ctx.stroke();
          if (!n) { ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(180, ys - 10); ctx.lineTo(180, ys - 46); ctx.stroke(); ctx.setLineDash([]); }
        }
        // Les boîtes par terre ou en train de tomber.
        for (const q of s.debris) { ctx.save(); ctx.translate(q.x, yE(q.y) - q.h / 2); ctx.rotate(q.rot); boite(0, q.h / 2, q, Math.max(0, Math.min(1, 1.6 - q.age) * 0.75)); ctx.restore(); }
        // La tour. Pendant une bascule, tout ce qui est au-dessus de la boîte qui cède pivote sur son arête.
        let y = 0;
        for (let k = 0; k < n; k++) {
          const b = s.pile[k], bs = s.bascule;
          if (bs && k === bs.j) {
            const px = xs[k] + deversTour(s, k + 1) + bs.cote * b.w / 2 * 0.6, u = bs.t / RTR.bascule;
            ctx.save(); ctx.translate(px, yE(y)); ctx.rotate(bs.cote * u * u * 0.45); ctx.translate(-px, -yE(y));
          }
          boite(xs[k] + deversTour(s, k + 1), yE(y), b, 1); y += b.h;
        }
        if (s.bascule) ctx.restore();
        // Le palan : un rail au plafond, un chariot, deux câbles et une pince.
        const px = pinceTour(s), yp = yE(hautVu) - RTR.chute, pret = !s.tombe && !s.bascule && s.attente <= 0 && s.t < duree && !clos;
        const porte = gabaritTour(s.servis), hp = pret ? porte.h : 0, lp = pret ? porte.w : 44;
        ctx.fillStyle = N; ctx.fillRect(0, RAIL - 3, W, 6);
        trait(ctx, 1.8); ctx.beginPath(); ctx.moveTo(px - 10, RAIL + 6); ctx.lineTo(px - 10, yp - hp - 5); ctx.moveTo(px + 10, RAIL + 6); ctx.lineTo(px + 10, yp - hp - 5); ctx.stroke();
        trait(ctx, 2.4); ctx.fillStyle = O; ctx.beginPath(); ctx.roundRect(px - 19, RAIL - 8, 38, 16, 5); ctx.fill(); ctx.stroke();
        if (pret) {
          boite(px, yp, porte, 1);
          { ctx.strokeStyle = "rgba(38,7,109,.28)"; ctx.lineWidth = 1.6; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(px, yp + 5); ctx.lineTo(px, yp + 44); ctx.stroke(); ctx.setLineDash([]); }   // le fil à plomb
        }
        trait(ctx, 2.4); ctx.fillStyle = V; ctx.beginPath(); ctx.roundRect(px - lp / 2 - 4, yp - hp - 7, lp + 8, 7, 3); ctx.fill(); ctx.stroke();
        if (pret) { ctx.fillStyle = V; for (const c of [-1, 1]) { ctx.beginPath(); ctx.rect(px + c * (lp / 2 + 2.5) - 2.5, yp - hp - 2, 5, 12); ctx.fill(); ctx.stroke(); } }
        if (s.tombe) boite(s.tombe.x, yp + s.tombe.d, s.tombe, 1);
        // Le résultat de la dernière boîte.
        const dtE = s.t - s.evT, ev = s.ev;
        if (ev && dtE < 1 && !clos) {
          const ex = borne(ev.x, 92, W - 92), ey = Math.max(RAIL + 70, yE(ev.y) - 30 - (calme ? 0 : dtE * 14));
          if ((ev.type === "parfait" || ev.type === "pose") && !calme && dtE < 0.35) {                // un peu de poussière sous la boîte
            ctx.fillStyle = "rgba(38,7,109," + (0.25 * (1 - dtE / 0.35)) + ")";
            for (const c of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(ev.x + c * (20 + i * 7 + dtE * 60), yE(ev.y - ev.h) - 3 - i * 2 - dtE * 10, 3.2 - i * 0.6, 0, 6.3); ctx.fill(); }
          }
          if (ev.type === "parfait") {
            if (!calme) { ctx.globalAlpha = 1 - dtE; ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ev.x, yE(ev.y) + 12, 22 + dtE * 44, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
            ctx.fillStyle = "rgba(38,7,109,.88)"; ctx.beginPath(); ctx.roundRect(ex - 88, ey - 15, 176, 30, 15); ctx.fill();
            texte(ctx, "+100 · Pose parfaite !", ex, ey + 1, 14, Y);
          } else if (ev.type === "pose") {
            ctx.fillStyle = "rgba(38,7,109,.88)"; ctx.beginPath(); ctx.roundRect(ex - 28, ey - 13, 56, 26, 13); ctx.fill();
            texte(ctx, "+" + ev.pts, ex, ey + 1, 14, C);
          } else {
            const t = ev.type === "rate" ? "À côté…" : ev.type === "bascule" ? "Ça bascule !" : ev.n > 1 ? "Effondrement : " + ev.n + " boîtes à terre" : "Trop au bord…";
            ctx.fillStyle = ev.type === "rate" ? "rgba(38,7,109,.6)" : R; ctx.beginPath(); ctx.roundRect(180 - 120, RAIL + 52, 240, 28, 14); ctx.fill();
            texte(ctx, t, 180, RAIL + 67, 13.5, C);
          }
        }
        // Le niveau à bulle : il dit de quel côté la tour penche, et vire à l'orange quand elle est près de céder.
        const p = borne(s.penche, -1, 1), danger = Math.abs(p) > 0.7;
        ctx.fillStyle = "rgba(255,251,242,.92)"; ctx.beginPath(); ctx.roundRect(W - 122, H - 30, 116, 24, 12); ctx.fill(); trait(ctx, 2); ctx.stroke();
        texte(ctx, "NIVEAU", W - 114, H - 17.5, 8.5, N, "left");
        ctx.fillStyle = danger ? "#F6C9B4" : "#CFE8DD"; ctx.beginPath(); ctx.roundRect(W - 76, H - 25, 64, 14, 7); ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - 51, H - 25); ctx.lineTo(W - 51, H - 11); ctx.moveTo(W - 37, H - 25); ctx.lineTo(W - 37, H - 11); ctx.stroke();
        ctx.fillStyle = danger ? O : G; ctx.beginPath(); ctx.arc(W - 44 + p * 24, H - 18, 5, 0, 6.3); ctx.fill(); ctx.stroke();
        if (danger && !s.bascule && !clos && (calme || Math.floor(s.t * 3) % 2 === 0)) texte(ctx, "Ça penche !", W - 64, H - 40, 12, R);
        if (s.t < 6 && !clos && !s.servis) {
          ctx.globalAlpha = Math.min(1, 6 - s.t) * 0.92;
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(28, 92, 304, 28, 14); ctx.fill();
          texte(ctx, tactile ? "Touchez l'écran pour lâcher la boîte" : "Cliquez ou tapez Espace pour lâcher", 180, 107, 13, Y);
          ctx.globalAlpha = 1;
        }
        const note = noteTour(s);
        bandeau(ctx, n + (n > 1 ? " boîtes · " : " boîte · ") + s.points + " pts · " + note + "/10", duree - s.t, duree);
        if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, note + " / 10", 180, 220, 40, Y); texte(ctx, s.points + " points · " + n + (n > 1 ? " boîtes debout" : " boîte debout"), 180, 262, 16, C); }
      }
      const arret = boucle(dt => {
        if (!clos) {
          pasTour(s, dt, duree);
          if (s.fini) {
            clos = true;
            const n = noteTour(s), k = s.pile.length, pl = (q, un, des) => q + " " + (q > 1 ? des : un);
            const bilan = pl(k, "boîte debout", "boîtes debout") + " (" + (hauteurTour(s) / RTR.metre).toFixed(1).replace(".", ",") + " m) sur " + pl(s.poses, "posée", "posées") + ", dont " + pl(s.parfaites, "pose parfaite", "poses parfaites") + ", " + pl(s.effondrements, "effondrement", "effondrements") + ", " + pl(s.rates, "boîte à côté", "boîtes à côté") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (de " + RTR.base + " à 100 points par boîte encore debout à la fin, selon son alignement ; barème progressif, 10 sur 10 à partir de " + RTR.seuils[9] + " points).";
            // Les quatre chiffres du tableau final : points, boîtes debout sur boîtes posées, hauteur de la tour, poses parfaites.
            const haut = (hauteurTour(s) / RTR.metre).toFixed(1).replace(".", ",") + " m";
            const chiffres = [[s.points, s.points > 1 ? "points" : "point"], [k + "/" + s.poses, k > 1 ? "boîtes debout" : "boîte debout"], [haut, "de haut"], [s.parfaites, s.parfaites > 1 ? "poses parfaites" : "pose parfaite"]];
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.points, chiffres); }, 1300);
          }
        }
        dessiner(dt);
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.tour = tour;
    Object.assign(api._coeur, { REGL_TOUR: RTR, creerTour, pasTour, noteTour, lacherTour, pinceTour, cibleTour, chuteTour, centresTour, hauteurTour, equilibreTour, gabaritTour, deversTour });
  }
  /* ----- Fin [tour] ----- */

  /* ----- Repère [seringue] : le lancer de seringue ----- */
  // Droit au septum : un jeu de précision. L'automate promène un flacon, bouchon tourné vers le joueur ; on vise le septum, on lance
  // la seringue (embout Luer bouché, sans aiguille), et le flux d'air la fait dériver pendant son vol. Dix-huit seringues, par séries de trois, en trois séquences : 1 mL, 10 mL, 50 mL.
  // Tout le jeu vit dans ce bloc (cœur, dessin, inscription) : aucun nom ne déborde sur les jeux voisins.
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-seringue.js) : ils fixent la difficulté.
    // series, par : nombre de flacons et de seringues par flacon ; recharge, releve : pause entre deux seringues, et pour changer de flacon ;
    // coeur, septum : rayons du plein centre et du septum, en part du rayon du flacon ; capsule : points d'un impact sur la capsule ;
    // decal : au doigt, la mire se tient decal px au-dessus du doigt pour rester visible.
    // niv : pour chaque flacon, ser = taille de seringue (rang dans tailles), r = rayon, ax, ay, wx, wy = va-et-vient du bras (amplitude en px, cadence en rad/s), vent = flux en crans (+ vers la droite), raf, wraf = rafales.
    const RSG = { series: 6, par: 3, recharge: 0.45, releve: 0.9, fin: 0.7, cx: 180, cy: 185, coeur: 0.2, septum: 0.62, capsule: 15, x0: 180, y0: 436, xmin: 16, xmax: 344, ymin: 48, ymax: 340, decal: 64,
      // Trois séquences, des seringues de plus en plus grosses : la petite file vite mais le flux l'emporte, la grosse tient tête au flux mais prend son temps (il faut viser plus en avance).
      // vol : durée du vol (s) ; cran : dérive latérale d'un cran de flux (px/s) ; k : échelle du dessin.
      tailles: [{ nom: "1 mL", vol: 0.34, cran: 30, k: 0.78 }, { nom: "10 mL", vol: 0.42, cran: 22, k: 1 }, { nom: "50 mL", vol: 0.5, cran: 12, k: 1.3 }],
      niv: [{ ser: 0, r: 34, ax: 60, ay: 0, wx: 0.75, wy: 0, vent: 1, raf: 0, wraf: 0 }, { ser: 0, r: 31, ax: 75, ay: 0, wx: 0.85, wy: 0, vent: -2, raf: 0, wraf: 0 },
        { ser: 1, r: 30, ax: 80, ay: 22, wx: 0.8, wy: 1.2, vent: 2, raf: 0, wraf: 0 }, { ser: 1, r: 27, ax: 80, ay: 32, wx: 0.85, wy: 1.4, vent: -2.5, raf: 0, wraf: 0 },
        { ser: 2, r: 27, ax: 75, ay: 34, wx: 0.8, wy: 1.3, vent: 3, raf: 0, wraf: 0 }, { ser: 2, r: 24, ax: 80, ay: 38, wx: 0.9, wy: 1.5, vent: -2, raf: 1, wraf: 1.6 }],
      seuils: [120, 340, 540, 740, 940, 1140, 1320, 1480, 1630, 1730] };
    const SG_PAS = 1 / 240;
    const totalSeringue = () => RSG.series * RSG.par;
    const tailleSeringue = s => RSG.tailles[RSG.niv[s.serie].ser];
    const placerSeringue = s => {
      const n = RSG.niv[s.serie];
      s.cx = RSG.cx + n.ax * Math.sin(s.phx); s.cy = RSG.cy + n.ay * Math.sin(s.phy); s.r = n.r; s.vent = n.vent + n.raf * Math.sin(s.phv);
    };
    const creerSeringue = () => { const s = { t: 0, acc: 0, serie: 0, phx: 0, phy: 0, phv: 0, cx: 0, cy: 0, r: 0, vent: 0, vol: null, attente: 0.5, releve: 0, ancien: null, lances: 0, poses: 0, points: 0, septums: 0, centres: 0, capsules: 0, suite: 0, suiteMax: 0, impacts: [], ev: null, evT: -9, fini: false }; placerSeringue(s); return s; };
    // Les points d'un impact à la distance d du centre d'un flacon de rayon r : 100 en plein centre, de 90 à 40 dans le septum, un lot de consolation sur la capsule.
    const pointsSeringue = (d, r) => { const c = r * RSG.coeur, sp = r * RSG.septum; return d <= c ? 100 : d <= sp ? Math.round(90 - 50 * (d - c) / (sp - c)) : d <= r ? RSG.capsule : 0; };
    const zoneSeringue = (d, r) => d <= r * RSG.coeur ? 3 : d <= r * RSG.septum ? 2 : d <= r ? 1 : 0;
    // Un lancer vers le point visé (x, y). Refusé tant qu'une seringue vole, pendant la recharge ou le changement de flacon, ou une fois le temps écoulé.
    const lancerSeringue = (s, x, y, duree) => {
      if (s.vol || s.attente > 0 || s.releve > 0 || s.fini || s.t >= duree || s.lances >= totalSeringue()) return false;
      s.vol = { ax: borne(x, RSG.xmin, RSG.xmax), ay: borne(y, RSG.ymin, RSG.ymax), t: 0, dx: 0 }; s.lances++;
      return true;
    };
    const unPasSeringue = (s, duree) => {
      const dt = SG_PAS, n = RSG.niv[s.serie], tl = RSG.tailles[n.ser];
      s.t += dt;
      if (s.attente > 0) s.attente -= dt;
      if (s.releve > 0) s.releve -= dt; else { s.phx += n.wx * dt; s.phy += n.wy * dt; s.phv += n.wraf * dt; }
      placerSeringue(s);
      const v = s.vol;
      if (v) {
        v.t += dt; v.dx += s.vent * tl.cran * dt;                                                   // le flux pousse la seringue tout le long du vol
        if (v.t >= tl.vol) {
          const x = v.ax + v.dx, y = v.ay, d = Math.hypot(x - s.cx, y - s.cy), pts = pointsSeringue(d, s.r), zone = zoneSeringue(d, s.r);
          s.points += pts; s.poses++; if (zone >= 2) s.septums++; if (zone === 3) s.centres++; if (zone === 1) s.capsules++;
          if (zone >= 2) { s.suite++; s.suiteMax = Math.max(s.suiteMax, s.suite); } else s.suite = 0;         // le combo : septums piqués d'affilée (pour le spectacle, sans effet sur les points)
          s.impacts.push({ dx: x - s.cx, dy: y - s.cy, zone, serie: s.serie, ser: n.ser });
          s.ev = { pts, zone, x, y, ax: v.ax, ay: v.ay, cx: s.cx, cy: s.cy, ser: n.ser }; s.evT = s.t; s.vol = null;
          const reste = totalSeringue() - s.lances;
          s.attente = reste ? RSG.recharge : RSG.fin;
          if (reste && s.lances % RSG.par === 0) {                                                   // flacon suivant : le bras revient au centre, le flux change
            s.ancien = { x: s.cx, y: s.cy, r: s.r, serie: s.serie };
            s.serie++; s.releve = RSG.releve; s.phx = s.phy = s.phv = 0; placerSeringue(s);
          }
        }
      }
      // Fin : plus de seringue (la dernière a eu le temps d'être vue), ou temps écoulé une fois la dernière arrivée.
      if (!s.vol && (s.t >= duree || (s.lances >= totalSeringue() && s.attente <= 0))) s.fini = true;
    };
    // Pas fixe : la physique avance par tranches de 1/240 s quel que soit le rythme d'affichage.
    const pasSeringue = (s, dt, duree) => { s.acc += dt; while (s.acc >= SG_PAS && !s.fini) { s.acc -= SG_PAS; unPasSeringue(s, duree); } };
    // Où viser, là, tout de suite, pour toucher le plein centre ? Le lancer est rejoué sur une copie (le cœur n'a pas de hasard). null si on ne peut pas lancer.
    const viserSeringue = s => {
      const c = JSON.parse(JSON.stringify(s)); c.acc = 0;
      if (!lancerSeringue(c, RSG.cx, RSG.cy, 1e9)) return null;
      while (c.vol) unPasSeringue(c, 1e9);
      return { x: c.ev.cx - (c.ev.x - c.ev.ax), y: c.ev.cy };
    };
    // La note : le nombre de paliers atteints.
    const noteSeringue = s => RSG.seuils.filter(p => s.points >= p).length;

    /* --- Dessin et commandes (navigateur seulement) --- */
    const seringue = (el, opt) => {
      const duree = opt.duree || 70, { cv, ctx, liberer } = monter(el, H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "Droit au septum. Dix-huit seringues à lancer sur le septum d'un flacon qui se déplace, par séries de trois, en trois séquences de seringues de plus en plus grosses (1, 10 puis 50 millilitres) : la petite est rapide mais sensible au flux, la grosse plus lente ; le flux d'air les fait dériver. Au doigt : posez, glissez pour viser (la mire se tient au-dessus du doigt), lâchez pour lancer. À la souris : visez et cliquez. Au clavier : flèches pour viser, Espace pour lancer.");
      const s = creerSeringue(), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      const logo = new Image(); logo.src = opt.logo || api._logo;
      let clos = false, minuterie = 0, tenu = false, clavier = false, tenue = 0, vus = 0, souffle = 0;
      const mire = { x: 180, y: 310 }, chutes = [], eclats = [];
      // Le décor : la zone de production, isolateur à gauche, hotte à flux laminaire à droite. Dessiné une fois, en teintes pâles pour laisser la vedette au flacon.
      const decor = document.createElement("canvas"); decor.width = W * 2; decor.height = H * 2;
      (g => {
        const L = "rgba(38,7,109,.3)", PALE = "#F6F3FB", TOLE = "#DDD6F0", VITRE = "rgba(143,199,232,.34)";
        const rr = (x, y, w, h, r, f) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (f) { g.fillStyle = f; g.fill(); } g.stroke(); };
        const rond = (x, y, r, f) => { g.beginPath(); g.arc(x, y, r, 0, 6.3); if (f) { g.fillStyle = f; g.fill(); } g.stroke(); };
        const ligne = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
        const mot = (t, x, y, px) => { g.font = "800 " + px + "px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; g.fillStyle = "rgba(38,7,109,.42)"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, x, y); };
        g.scale(2, 2); g.lineJoin = g.lineCap = "round";
        g.fillStyle = "#EDEAF6"; g.fillRect(0, 0, W, H);                                              // les panneaux lisses de la salle
        g.fillStyle = "#E2DDF0"; g.fillRect(0, 356, W, 36);                                           // le sol, plinthe à gorge
        g.strokeStyle = "rgba(38,7,109,.07)"; g.lineWidth = 2; for (const x of [90, 180, 270]) ligne(x, 49, x, 356);
        g.strokeStyle = "rgba(38,7,109,.16)"; ligne(0, 356, W, 356);
        g.strokeStyle = L; g.lineWidth = 2;
        for (const x of [34, 256]) { rr(x, 51, 70, 12, 3, PALE); g.lineWidth = 1; for (let i = 1; i < 7; i++) ligne(x + i * 10, 54, x + i * 10, 60); g.lineWidth = 2; }   // les bouches de soufflage au plafond
        rr(146, 92, 68, 20, 6, PALE); mot("ZAC · ISO 7", 180, 103, 9);                             // l'affichage de la salle
        rond(180, 132, 11, PALE); ligne(180, 132, 186, 126); g.lineWidth = 1; for (let i = 0; i < 5; i++) { const a = Math.PI * (1 + i / 4); ligne(180 + Math.cos(a) * 7, 132 + Math.sin(a) * 7, 180 + Math.cos(a) * 9, 132 + Math.sin(a) * 9); } g.lineWidth = 2;   // le manomètre de surpression
        // L'isolateur : caisson sur pieds, vitre, deux ronds de gants, sas de transfert sur le côté.
        rr(24, 322, 9, 36, 2, TOLE); rr(121, 322, 9, 36, 2, TOLE);
        rr(132, 214, 26, 60, 6, TOLE); rond(145, 244, 8, VITRE);
        rr(10, 150, 132, 174, 12, TOLE);
        rr(20, 160, 112, 74, 8, VITRE);
        g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 3; ligne(32, 222, 70, 170); ligne(48, 224, 78, 184); g.strokeStyle = L; g.lineWidth = 2;
        for (const x of [48, 104]) { rond(x, 276, 20, "#F1DCEB"); rond(x, 276, 12, "#E6C6DD"); g.lineWidth = 1.5; ligne(x - 6, 272, x + 6, 280); g.lineWidth = 2; }
        rr(20, 302, 112, 14, 5, PALE); mot("ISOLATEUR", 84, 310, 8);
        g.fillStyle = G; g.globalAlpha = 0.7; g.beginPath(); g.arc(30, 309, 3, 0, 6.3); g.fill(); g.fillStyle = Y; g.beginPath(); g.arc(39, 309, 3, 0, 6.3); g.fill(); g.globalAlpha = 1;
        // La hotte à flux laminaire : plénum et sa grille, volume de travail vitré, vitre guillotine, piètement.
        rr(214, 300, 132, 58, 6, TOLE); ligne(280, 306, 280, 352); rond(273, 330, 2); rond(287, 330, 2);
        rr(206, 118, 148, 42, 8, TOLE); g.lineWidth = 1.2; for (let i = 0; i < 9; i++) ligne(218 + i * 9, 128, 218 + i * 9, 150); g.lineWidth = 2;
        rr(304, 126, 42, 14, 4, PALE); mot("HOTTE", 325, 134, 8);
        g.fillStyle = G; g.globalAlpha = 0.7; g.beginPath(); g.arc(312, 149, 3, 0, 6.3); g.fill(); g.globalAlpha = 1;
        rr(212, 160, 136, 140, 4, VITRE);
        g.lineWidth = 1; g.setLineDash([2, 5]); for (const x of [236, 258, 280, 302, 324]) ligne(x, 166, x, 228); g.setLineDash([]); g.lineWidth = 2;        // le flux qui descend
        ligne(320, 168, 320, 246); ligne(308, 168, 332, 168); rr(309, 246, 22, 32, 7, PALE); ligne(320, 278, 320, 292);                                        // une poche à sa potence
        rr(232, 276, 14, 22, 3, PALE); rr(235, 270, 8, 6, 2, "rgba(38,7,109,.3)"); rr(254, 282, 12, 16, 3, PALE); rr(256, 277, 8, 5, 2, "rgba(38,7,109,.3)");   // deux flacons en attente
        g.lineWidth = 4; ligne(212, 238, 348, 238); g.lineWidth = 2;
        g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 3; ligne(224, 226, 252, 176);
      })(decor.getContext("2d"));
      const touches = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
      const posDe = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.width * W]; };
      // À la souris, la mire est sous le pointeur ; au doigt ou au stylet, elle se tient au-dessus pour ne pas être cachée.
      const viser = e => { const [x, y] = posDe(e); mire.x = borne(x, RSG.xmin, RSG.xmax); mire.y = borne(y - (e.pointerType === "mouse" ? 0 : RSG.decal), RSG.ymin, RSG.ymax); };
      const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } clavier = false; tenu = true; viser(e); };
      const glisse = e => { if (tenu) e.preventDefault(); if (tenu || e.pointerType === "mouse") { clavier = false; viser(e); } };
      const lacher = e => { if (!tenu) return; tenu = false; viser(e); if (!clos) lancerSeringue(s, mire.x, mire.y, duree); };
      const annule = () => { tenu = false; };
      const touche = (e, v) => {
        const tir = e.key === " " || e.key === "Spacebar" || e.key === "Enter";
        if (!(e.key in touches) && !tir) return;
        if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || ""))) return;
        if (v) e.preventDefault();
        if (tir) { if (v && !e.repeat && !clos) { clavier = true; tenu = false; lancerSeringue(s, mire.x, mire.y, duree); } return; }
        touches[e.key] = v; if (v) { clavier = true; tenu = false; }
      };
      const enfonce = e => touche(e, true), leve = e => touche(e, false), lache = () => { for (const k in touches) touches[k] = false; }, menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", glisse); cv.addEventListener("pointerup", lacher); cv.addEventListener("pointercancel", annule); cv.addEventListener("contextmenu", menu);
      window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
      const retirer = () => {
        cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", glisse); cv.removeEventListener("pointerup", lacher); cv.removeEventListener("pointercancel", annule); cv.removeEventListener("contextmenu", menu);
        window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
      };
      // La seringue vue de profil, embout vers la droite : poussoir, corps gradué à moitié plein, embout Luer et son bouchon. Pas d'aiguille.
      // pointe : (x, y) désigne le bout de l'embout, et non le milieu du corps (en vol, c'est la pointe qui arrive au point d'impact).
      const profil = (x, y, a, k, alpha, pointe) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k, k); if (pointe) ctx.translate(-28, 0); ctx.globalAlpha = alpha;
        trait(ctx, 3.2); ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-17, 0); ctx.stroke();
        trait(ctx, 2.2); ctx.fillStyle = V; ctx.beginPath(); ctx.roundRect(-38, -7, 5, 14, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-17, -7, 33, 14, 3); ctx.fill();
        ctx.fillStyle = B; ctx.beginPath(); ctx.roundRect(-3, -7, 19, 14, [0, 3, 3, 0]); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-17, -7, 33, 14, 3); ctx.stroke();
        ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(-10 + i * 5, -7); ctx.lineTo(-10 + i * 5, -2); } ctx.stroke();
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(-20, -11, 4, 22, 2); ctx.fill();
        trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.rect(16, -3, 4, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = O; ctx.beginPath(); ctx.roundRect(20, -4.5, 8, 9, 3); ctx.fill(); ctx.stroke();
        ctx.restore();
      };
      // La seringue plantée dans le septum, vue de l'arrière : les ailettes et le poussoir.
      const plantee = (x, y, k) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k); x = y = 0;
        ctx.fillStyle = "rgba(38,7,109,.22)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 5, 8, 4, 0, 0, 6.3); ctx.fill();
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x - 10, y - 2.5, 20, 5, 2.5); ctx.fill();
        trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = V; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.restore();
      };
      // Le flacon au bout du bras de l'automate, bouchon vers le joueur : capsule, septum, plein centre, et les seringues déjà plantées.
      const flaconCible = (x, y, r, serie, alpha) => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(38,7,109,.45)"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, 47); ctx.lineTo(x, y - r - 9); ctx.stroke();
        ctx.strokeStyle = "rgba(38,7,109,.45)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r + 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();   // la pince de l'automate : tout le disque du flacon rapporte
        trait(ctx, 3); ctx.fillStyle = B; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); ctx.stroke();
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y, r * RSG.septum, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(38,7,109,.22)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * (RSG.septum + RSG.coeur) / 2, 0, 6.3); ctx.stroke();
        trait(ctx, 2); ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(x, y, r * RSG.coeur, 0, 6.3); ctx.fill(); ctx.stroke();
        for (const p of s.impacts) if (p.serie === serie && p.zone >= 2) plantee(x + p.dx, y + p.dy, 0.6 + 0.4 * RSG.tailles[p.ser].k);
        ctx.globalAlpha = 1;
      };
      const pilule = (t, x, y, coul, px) => {
        ctx.font = "800 " + (px || 14) + "px 'Bricolage Grotesque','Trebuchet MS',sans-serif";
        const l = Math.min(W - 16, ctx.measureText(t).width + 26), cx = borne(x, l / 2 + 8, W - l / 2 - 8);
        ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(cx - l / 2, y - 15, l, 30, 15); ctx.fill();
        texte(ctx, t, cx, y + 1, px || 14, coul);
      };
      function dessiner() {
        const combo = s.suite >= 2 && !clos, TEINTE = s.suite >= 6 ? P : s.suite >= 4 ? O : Y;
        const tl = tailleSeringue(s), seq = RSG.niv[s.serie].ser;
        const total = totalSeringue(), reste = total - s.lances, pret = !s.vol && s.attente <= 0 && s.releve <= 0 && reste > 0 && s.t < duree;
        ctx.drawImage(decor, 0, 0, W, H);                                                            // la zone de production
        ctx.fillStyle = "#F7E7B8"; ctx.fillRect(0, 392, W, H - 392);                                 // le plan de travail
        trait(ctx, 3); ctx.beginPath(); ctx.moveTo(0, 392); ctx.lineTo(W, 392); ctx.stroke();
        // Les filets d'air : ils filent dans le sens du flux, d'autant plus vite qu'il est fort.
        if (!calme) {
          ctx.strokeStyle = "rgba(38,7,109,.13)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
          for (let i = 0; i < 8; i++) { const x = (((i * 97 + souffle) % (W + 80)) + W + 80) % (W + 80) - 40, y = 96 + i * 37 % 280, l = 10 + Math.abs(s.vent) * 8; ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.stroke(); }
        }
        // Le rail de l'automate, puis le flacon. Pendant la relève, l'ancien flacon remonte et le nouveau descend.
        ctx.fillStyle = "rgba(38,7,109,.45)"; ctx.fillRect(0, 44, W, 5);
        if (s.releve > 0 && s.ancien) {
          const u = 1 - s.releve / RSG.releve, k = u * u * 330;
          if (calme) { flaconCible(s.ancien.x, s.ancien.y, s.ancien.r, s.ancien.serie, 1 - u); flaconCible(s.cx, s.cy, s.r, s.serie, u); }
          else {
            ctx.save(); ctx.beginPath(); ctx.rect(0, 39, W, 353); ctx.clip();
            flaconCible(s.ancien.x, s.ancien.y - k, s.ancien.r, s.ancien.serie, 1); flaconCible(s.cx, s.cy - (1 - u) * (1 - u) * 330, s.r, s.serie, 1);
            ctx.restore();
          }
        } else {
          if (combo) {                                                                               // le flacon s'auréole tant que la série tient
            const b = calme ? 0 : Math.sin(s.t * 9) * 2.5;
            ctx.globalAlpha = 0.85; ctx.strokeStyle = TEINTE; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.r + 13 + b, 0, 6.3); ctx.stroke();
            if (s.suite >= 4) { ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(s.cx, s.cy, s.r + 20 + 2 * b, 0, 6.3); ctx.stroke(); }
            ctx.globalAlpha = 1;
          }
          flaconCible(s.cx, s.cy, s.r, s.serie, 1);
        }
        // La manche à air : le sens et la force du flux, en chevrons.
        const fv = Math.abs(s.vent), sens = s.vent < 0 ? -1 : 1;
        ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(110, 54, 140, 24, 12); ctx.fill();
        texte(ctx, "FLUX", 180, 67, 12, C);
        for (let i = 0; i < 4; i++) {
          const a = borne(fv - i, 0, 1); if (a <= 0) break;
          const x = 180 + sens * (26 + i * 11); ctx.globalAlpha = a; ctx.fillStyle = fv >= 2.5 ? O : Y;
          ctx.beginPath(); ctx.moveTo(x - sens * 3, 60); ctx.lineTo(x + sens * 5, 66); ctx.lineTo(x - sens * 3, 72); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Le poste de lancer : la pastille de l'unité, la seringue prête, et le plateau des seringues restantes.
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(RSG.x0, RSG.y0, 25, 0, 6.3); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) { ctx.globalAlpha = 0.5; ctx.drawImage(logo, RSG.x0 - 17, RSG.y0 - 17, 34, 34); ctx.globalAlpha = 1; }
        for (let i = 0; i < total; i++) {                                                            // le plateau : des seringues de plus en plus hautes, séquence après séquence
          const x = 10 + i * 6.3 + Math.floor(i / RSG.par) * 4.5, la = i >= s.lances, h = 9 + 3.5 * RSG.niv[Math.floor(i / RSG.par)].ser;
          ctx.globalAlpha = la ? 1 : 0.22; trait(ctx, 1.4); ctx.fillStyle = la ? C : "rgba(38,7,109,.2)";
          ctx.beginPath(); ctx.roundRect(x, 470 - h, 4.4, h, 1.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = N; ctx.fillRect(x - 0.8, 470, 6, 2.2);
        }
        ctx.globalAlpha = 1;
        texte(ctx, "Séquence " + (seq + 1) + "/" + RSG.tailles.length + " · " + tl.nom, W - 10, 467, 11, "rgba(38,7,109,.65)", "right");
        if (combo) {                                                                                 // la médaille du combo : une étoile qui grossit à chaque septum de plus
          const k = calme ? 1 : 1 + Math.max(0, 0.35 - (s.t - s.evT)) * 1.2, br = 9 + Math.min(s.suite, 8);
          ctx.save(); ctx.translate(292, 417); ctx.scale(k, k); if (!calme) ctx.rotate(s.t * 0.8);
          trait(ctx, 2.4); ctx.fillStyle = TEINTE; ctx.beginPath();
          for (let i = 0; i < 2 * br; i++) { const a = i * Math.PI / br, r = i % 2 ? 19 : 26; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          texte(ctx, "×" + s.suite, 292, 418, 17, N); texte(ctx, "COMBO", 292, 449, 9, N);
        }
        for (const q of eclats) { ctx.globalAlpha = Math.max(0, 1 - q.t / 0.8); ctx.fillStyle = q.c; trait(ctx, 1.2); ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * 1.5, Math.atan2(q.vy, q.vx) + 1.57, 0, 6.3); ctx.fill(); ctx.stroke(); }
        ctx.globalAlpha = 1;
        if (pret) profil(RSG.x0, RSG.y0 - (tl.k - 1) * 22, -Math.PI / 2, tl.k, 1);
        // Les seringues qui n'ont pas tenu : elles retombent sur le plan de travail.
        for (const c of chutes) profil(c.x, c.y, c.a, 0.45 * c.k, Math.max(0, 1 - c.t / 0.9));
        // Le dernier impact : d'où l'on visait, où la seringue est arrivée.
        const dtE = s.t - s.evT, e = s.ev;
        if (e && dtE < 1.3 && !clos) {
          const dxF = s.releve > 0 || e.zone < 2 ? 0 : s.cx - e.cx, dyF = s.releve > 0 || e.zone < 2 ? 0 : s.cy - e.cy;   // un impact dans le septum suit le flacon
          if (s.releve <= 0 || e.zone < 2) {
            ctx.strokeStyle = "rgba(38,7,109,.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(e.ax, e.ay); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]);
            ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.ax - 5, e.ay - 5); ctx.lineTo(e.ax + 5, e.ay + 5); ctx.moveTo(e.ax + 5, e.ay - 5); ctx.lineTo(e.ax - 5, e.ay + 5); ctx.stroke();
            if (e.zone < 2) { ctx.fillStyle = e.zone ? O : "rgba(38,7,109,.5)"; ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, 6.3); ctx.fill(); }
          }
          if (!calme && e.zone >= 2 && dtE < 0.6 && s.releve <= 0) { ctx.globalAlpha = 1 - dtE / 0.6; ctx.strokeStyle = e.zone === 3 ? O : G; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x + dxF, e.y + dyF, 12 + dtE * 50, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
          pilule((e.zone === 3 ? "+100 · Plein centre !" : e.zone === 2 ? "+" + e.pts + " · Dans le septum" : e.zone ? "+" + e.pts + " · Sur la capsule" : "À côté…") + (e.zone >= 2 && s.suite >= 2 ? " · combo ×" + s.suite : ""), 180, 368, e.zone === 3 ? Y : C);                // sous la course du flacon, pour ne rien masquer
        }
        // La seringue en vol : elle s'éloigne (donc rapetisse) et dérive avec le flux.
        if (s.vol) {
          const v = s.vol, u = v.t / tl.vol;
          if (combo && !calme) for (let i = 4; i >= 1; i--) {                                        // en combo, la seringue laisse un sillage
            const w = u - i * 0.07; if (w <= 0) continue;
            ctx.globalAlpha = 0.6 - i * 0.12; ctx.fillStyle = TEINTE; ctx.beginPath(); ctx.arc(RSG.x0 + (v.ax - RSG.x0) * w + v.dx * w / u, RSG.y0 + (v.ay - RSG.y0) * w - Math.sin(w * Math.PI) * 16, (7 - i) * tl.k * (1 - 0.55 * w), 0, 6.3); ctx.fill();
          }
          ctx.globalAlpha = 1;
          profil(RSG.x0 + (v.ax - RSG.x0) * u + v.dx, RSG.y0 + (v.ay - RSG.y0) * u - (calme ? 0 : Math.sin(u * Math.PI) * 16), Math.atan2(v.ay - RSG.y0, v.ax - RSG.x0), tl.k * (1 - 0.55 * u), 1, true);
        }
        // La mire.
        if (!clos) {
          ctx.globalAlpha = pret ? 1 : 0.35;
          ctx.strokeStyle = C; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(mire.x, mire.y, 10, 0, 6.3); ctx.stroke();
          trait(ctx, 2.2); ctx.beginPath(); ctx.arc(mire.x, mire.y, 10, 0, 6.3);
          ctx.moveTo(mire.x - 16, mire.y); ctx.lineTo(mire.x - 5, mire.y); ctx.moveTo(mire.x + 5, mire.y); ctx.lineTo(mire.x + 16, mire.y);
          ctx.moveTo(mire.x, mire.y - 16); ctx.lineTo(mire.x, mire.y - 5); ctx.moveTo(mire.x, mire.y + 5); ctx.lineTo(mire.x, mire.y + 16); ctx.stroke();
          ctx.fillStyle = O; ctx.beginPath(); ctx.arc(mire.x, mire.y, 1.8, 0, 6.3); ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (s.releve > 0 || (s.serie > 0 && s.lances % RSG.par === 0 && !s.vol && s.t - s.evT < 2.2 && s.t - s.evT >= 1.3 && !clos)) pilule(seq !== RSG.niv[s.serie - 1].ser ? "Séquence " + (seq + 1) + " · seringues de " + tl.nom + (seq === 1 ? " : plus lentes" : " : lentes, mais le flux les pousse peu") : RSG.niv[s.serie].raf ? "Flacon suivant · flux en rafales !" : "Flacon suivant · le flux a changé", 180, 330, Y, 13);
        else if (s.t < 6 && !clos && !s.lances) {
          ctx.globalAlpha = Math.min(1, 6 - s.t);
          pilule(tactile ? "Glissez pour viser, lâchez pour lancer" : "Visez et cliquez, ou flèches puis Espace", 180, 368, Y, 13);
          ctx.globalAlpha = 1;
        }
        const n = noteSeringue(s);
        bandeau(ctx, s.points + " pts · " + n + "/10" + (n < 10 ? " · palier à " + RSG.seuils[n] : ""), duree - s.t, duree);
        if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 220, 40, Y); texte(ctx, s.points + " points · " + s.septums + (s.septums > 1 ? " septums piqués" : " septum piqué"), 180, 262, 16, C); }
      }
      const arret = boucle(dt => {
        if (!clos) {
          const dx = (touches.ArrowRight ? 1 : 0) - (touches.ArrowLeft ? 1 : 0), dy = (touches.ArrowDown ? 1 : 0) - (touches.ArrowUp ? 1 : 0);
          if (clavier && (dx || dy)) {                                                               // la mire part doucement, pour la précision, puis accélère
            tenue += dt; const v = Math.min(260, 70 + 420 * tenue) * dt / (dx && dy ? 1.414 : 1);
            mire.x = borne(mire.x + dx * v, RSG.xmin, RSG.xmax); mire.y = borne(mire.y + dy * v, RSG.ymin, RSG.ymax);
          } else tenue = 0;
          pasSeringue(s, dt, duree);
          souffle += s.vent * 55 * dt;
          if (s.poses > vus && !calme && s.suite >= 2) for (let i = 0, n = Math.min(22, 6 + 3 * s.suite); i < n; i++) {   // un combo : gerbe de gouttes aux couleurs de l'unité
            const a = i / n * 6.283 + s.suite, v = 110 + (i * 53 % 90);
            eclats.push({ x: s.ev.x, y: s.ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, r: 2.5 + i % 3, c: [Y, O, P, V, B][i % 5], t: 0 });
          }
          for (const q of eclats) { q.t += dt; q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
          while (eclats.length && eclats[0].t > 0.8) eclats.shift();
          if (s.poses > vus) { vus = s.poses; if (!calme && s.ev.zone < 2) chutes.push({ x: s.ev.x, y: s.ev.y, a: -Math.PI / 2, vx: (s.ev.x < 180 ? -1 : 1) * 30, vy: -60, w: (s.ev.x < 180 ? -1 : 1) * 5, t: 0, k: RSG.tailles[s.ev.ser].k }); }
          for (const c of chutes) { c.t += dt; c.vy += 900 * dt; c.x += c.vx * dt; c.y = Math.min(400, c.y + c.vy * dt); c.a += c.w * dt; }
          while (chutes.length && chutes[0].t > 0.9) chutes.shift();
          if (s.fini) {
            clos = true; lache(); annule();
            const n = noteSeringue(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = pl(s.septums, "seringue", "seringues") + " dans le septum sur " + pl(s.lances, "lancée", "lancées") + ", dont " + s.centres + " en plein centre : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (jusqu'à 100 points par seringue selon la précision ; 10 sur 10 à partir de " + RSG.seuils[9] + " points).";
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.points, [[s.points, s.points > 1 ? "points" : "point"], [s.septums + "/" + s.lances, s.septums > 1 ? "septums piqués" : "septum piqué"], [s.centres, s.centres > 1 ? "pleins centres" : "plein centre"], ["×" + s.suiteMax, "meilleur combo"]]); }, 1300);
          }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.seringue = seringue;
    Object.assign(api._coeur, { REGL_SERINGUE: RSG, tailleSeringue, creerSeringue, pasSeringue, noteSeringue, lancerSeringue, viserSeringue, pointsSeringue, zoneSeringue, totalSeringue });
  }
  /* ----- Fin [seringue] ----- */

  /* ----- Repère [minigolf] : le minigolf ----- */
  // Le minigolf de la paillasse : un parcours de cinq trous sur le green de l'unité de production. D'un coup de piston, on fait
  // rouler un comprimé jusqu'au trou, entre portoirs, flacons, isolateur, flux laminaire, tapis collant, agitateur et collecteur DASRI.
  // Tout le jeu vit dans ce bloc (cœur, dessin, inscription) : aucun nom ne déborde sur les jeux voisins.
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-minigolf.js) : ils fixent la difficulté.
    // r : comprimé, rt : trou, ep : demi-épaisseur d'un portoir, fa et fb : frottement (constant et proportionnel), colle : frein du tapis,
    // vcap : au-delà, le comprimé saute le trou, k : px/s par px de piston tiré, gains : points d'un trou selon le nombre de coups (1, 2, 3...),
    // temps : points par seconde restante une fois le parcours bouclé, approche : points au plus pour un trou entamé mais pas fini.
    const RM = { r: 7, rt: 13, ep: 4, x0: 12, x1: 348, y0: 50, y1: 470, vmax: 620, vmin: 70, fa: 120, fb: 1, colle: 4, rebond: 0.72, vcap: 300, arret: 10, pause: 1.1, k: 5.6, gains: [300, 230, 170, 120, 80, 50, 30, 20], temps: 1, approche: 40, sursis: 3, plafond: 2000, seuils: [100, 260, 420, 520, 590, 650, 710, 780, 860, 960] };
    const MG_PAS = 1 / 120;
    // Le parcours. d : départ, t : trou, par : nombre de coups de référence, murs : portoirs [x1, y1, x2, y2], flacons : [x, y, rayon],
    // blocs : isolateurs [x, y, largeur, hauteur], flux : flux laminaires [x, y, largeur, hauteur, ax, ay] (poussée en px/s²),
    // tapis : tapis collants [x, y, largeur, hauteur], bacs : collecteurs jaunes DASRI [x, y, rayon] (comprimé perdu : un coup de pénalité),
    // barre : agitateur magnétique [x, y, demi-longueur, vitesse en rad/s].
    const PLANS = [
      { nom: "Le sas d'entrée", par: 2, d: [180, 432], t: [262, 108], murs: [[12, 285, 92, 285], [150, 285, 348, 285]], flacons: [[225, 200, 12], [305, 160, 12], [90, 150, 12]], blocs: [], flux: [], tapis: [[30, 345, 60, 55], [215, 345, 85, 60]], bacs: [] },
      { nom: "La chicane des portoirs", par: 3, d: [295, 430], t: [70, 105], murs: [[112, 345, 348, 345], [12, 215, 248, 215]], flacons: [[205, 282, 12], [150, 140, 12]], blocs: [], flux: [], tapis: [], bacs: [[322, 250, 15]] },
      { nom: "Sous le flux laminaire", par: 3, d: [300, 430], t: [70, 100], murs: [[180, 50, 180, 165]], flacons: [[120, 345, 12], [240, 345, 12]], blocs: [], flux: [[12, 215, 336, 80, 270, 0]], tapis: [], bacs: [[316, 110, 16]] },
      { nom: "Le tour de l'isolateur", par: 3, d: [180, 432], t: [180, 100], murs: [], flacons: [[70, 120, 12], [290, 120, 12]], blocs: [[112, 195, 136, 130]], flux: [], tapis: [[12, 215, 100, 90]], bacs: [], barre: [298, 260, 38, 1.7] },
      { nom: "La libération du lot", par: 4, d: [50, 432], t: [70, 98], murs: [[12, 362, 258, 362], [102, 256, 348, 256], [12, 152, 240, 152]], flacons: [[170, 310, 12]], blocs: [], flux: [[110, 164, 130, 80, -230, 0]], tapis: [], bacs: [[322, 96, 15]] },
    ];
    const planMinigolf = n => PLANS[n];
    const installer = (s, n) => {
      const p = PLANS[n];
      s.n = n; s.plan = p; s.b = { x: p.d[0], y: p.d[1], vx: 0, vy: 0, tour: 0 }; s.avant = { x: p.d[0], y: p.d[1] }; s.coups = 0; s.dedans = false; s.pause = 0;
    };
    // carte : les coups joués sur chaque trou fini (la carte de score), penalites : les passages au DASRI.
    const creerMinigolf = () => { const s = { t: 0, acc: 0, points: 0, trous: 0, premiers: 0, coupsT: 0, penalites: 0, carte: [], approche: 0, bonus: 0, boucle: false, ev: null, evT: -9, choc: -9, saut: -9, bac: null, bacT: -9, fini: false }; installer(s, 0); return s; };
    const roule = s => s.b.vx !== 0 || s.b.vy !== 0;
    const pretMinigolf = (s, duree) => !s.fini && s.pause <= 0 && !roule(s) && s.t < duree;
    // Un coup : vitesse en px/s. Refusé tant que le comprimé roule, pendant le changement de trou, ou une fois le temps écoulé.
    const tirerMinigolf = (s, vx, vy, duree) => {
      const v = Math.hypot(vx, vy);
      if (!pretMinigolf(s, duree) || !(v > 0)) return false;
      const f = borne(v, RM.vmin, RM.vmax) / v;
      s.avant = { x: s.b.x, y: s.b.y }; s.b.vx = vx * f; s.b.vy = vy * f; s.coups++; s.coupsT++;
      return true;
    };
    // Les deux bouts de l'agitateur à l'instant t.
    const barreMinigolf = (p, t) => { const [x, y, l, w] = p.barre, a = w * t; return [x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l]; };
    // Le comprimé contre un obstacle dont le point le plus proche est (cx, cy), animé de la vitesse (wx, wy) : repoussé, et renvoyé s'il arrivait dessus.
    const heurt = (s, cx, cy, wx, wy, dist) => {
      const b = s.b, d = Math.hypot(b.x - cx, b.y - cy);
      if (d >= dist || d === 0) return;
      const nx = (b.x - cx) / d, ny = (b.y - cy) / d, vn = (b.vx - wx) * nx + (b.vy - wy) * ny;
      b.x = cx + nx * dist; b.y = cy + ny * dist;
      if (vn < 0) { b.vx -= (1 + RM.rebond) * vn * nx; b.vy -= (1 + RM.rebond) * vn * ny; if (vn < -40) s.choc = s.t; }
    };
    const dansZone = (b, z) => b.x >= z[0] && b.x <= z[0] + z[2] && b.y >= z[1] && b.y <= z[1] + z[3];
    // Le chemin qui reste jusqu'au trou en contournant portoirs, flacons, isolateurs et bacs (l'agitateur est ignoré) : il sert aux points
    // d'approche et aux bancs d'essai. Calculé une fois par trou.
    const cartes = new Map();
    const distancesMinigolf = p => {
      if (cartes.has(p)) return cartes.get(p);
      const c = 8, nx = Math.ceil(W / c), ny = Math.ceil(H / c), D = new Float32Array(nx * ny).fill(1e9);
      const libre = (i, j) => {
        const x = (i + 0.5) * c, y = (j + 0.5) * c;
        if (x < RM.x0 + RM.r || x > RM.x1 - RM.r || y < RM.y0 + RM.r || y > RM.y1 - RM.r) return false;
        for (const [fx, fy, r] of p.flacons) if (Math.hypot(x - fx, y - fy) < r + RM.r + 1) return false;
        for (const [fx, fy, r] of p.bacs) if (Math.hypot(x - fx, y - fy) < r + 2) return false;
        for (const [bx, by, bw, bh] of p.blocs) if (x > bx - RM.r - 1 && x < bx + bw + RM.r + 1 && y > by - RM.r - 1 && y < by + bh + RM.r + 1) return false;
        for (const [x1, y1, x2, y2] of p.murs) {
          const ux = x2 - x1, uy = y2 - y1, k = borne(((x - x1) * ux + (y - y1) * uy) / (ux * ux + uy * uy), 0, 1);
          if (Math.hypot(x - x1 - ux * k, y - y1 - uy * k) < RM.r + RM.ep + 1) return false;
        }
        return true;
      };
      const file = [[Math.floor(p.t[0] / c), Math.floor(p.t[1] / c)]]; D[file[0][1] * nx + file[0][0]] = 0;
      // Relaxations successives (huit voisins) : la grille est petite, la simplicité prime.
      for (let q = 0; q < file.length; q++) {
        const [i, j] = file[q], d = D[j * nx + i];
        for (let a = -1; a <= 1; a++) for (let e = -1; e <= 1; e++) {
          const u = i + a, v = j + e, k = v * nx + u, cout = d + c * (a && e ? 1.414 : 1);
          if ((a || e) && u >= 0 && v >= 0 && u < nx && v < ny && cout < D[k] - 0.01 && libre(u, v)) { D[k] = cout; file.push([u, v]); }
        }
      }
      const f = (x, y) => D[borne(Math.floor(y / c), 0, ny - 1) * nx + borne(Math.floor(x / c), 0, nx - 1)];
      cartes.set(p, f);
      return f;
    };
    const unPasMinigolf = (s, duree) => {
      const dt = MG_PAS, b = s.b, p = s.plan;
      s.t += dt;
      if (s.pause > 0) {
        s.pause -= dt;
        if (s.pause <= 0) {
          if (s.n + 1 < PLANS.length) { if (s.t < duree) installer(s, s.n + 1); }
          else {
            // Parcours bouclé : la partie s'arrête là, et chaque seconde restante rapporte.
            s.boucle = true; s.fini = true; s.bonus = Math.max(0, Math.round((duree - s.t) * RM.temps));
            s.points = Math.min(s.points + s.bonus, RM.plafond);
            return;
          }
        }
      } else {
        if (roule(s)) {
          let frein = 1;
          for (const z of p.tapis) if (dansZone(b, z)) frein = RM.colle;
          for (const z of p.flux) if (dansZone(b, z)) { b.vx += z[4] * dt; b.vy += z[5] * dt; }
          const v = Math.hypot(b.vx, b.vy), f = v > 0 ? Math.max(0, v - (RM.fa + RM.fb * v) * frein * dt) / v : 0;
          b.vx *= f; b.vy *= f; b.x += b.vx * dt; b.y += b.vy * dt; b.tour += v * f * dt / RM.r;
        }
        for (const [x1, y1, x2, y2] of p.murs) {
          const ux = x2 - x1, uy = y2 - y1, k = borne(((b.x - x1) * ux + (b.y - y1) * uy) / (ux * ux + uy * uy), 0, 1);
          heurt(s, x1 + ux * k, y1 + uy * k, 0, 0, RM.r + RM.ep);
        }
        for (const [x, y, r] of p.flacons) heurt(s, x, y, 0, 0, RM.r + r);
        for (const [x, y, w, h] of p.blocs) {
          const cx = borne(b.x, x, x + w), cy = borne(b.y, y, y + h);
          if (cx === b.x && cy === b.y) {                                                              // entré dedans (ne doit pas arriver) : ressorti par le côté le plus proche
            const g = b.x - x, d = x + w - b.x, ha = b.y - y, ba = y + h - b.y, m = Math.min(g, d, ha, ba);
            if (m === g) b.x = x - RM.r; else if (m === d) b.x = x + w + RM.r; else if (m === ha) b.y = y - RM.r; else b.y = y + h + RM.r;
          } else heurt(s, cx, cy, 0, 0, RM.r);
        }
        if (p.barre) {
          const [x1, y1, x2, y2] = barreMinigolf(p, s.t), ux = x2 - x1, uy = y2 - y1, k = borne(((b.x - x1) * ux + (b.y - y1) * uy) / (ux * ux + uy * uy), 0, 1);
          const cx = x1 + ux * k, cy = y1 + uy * k, w = p.barre[3];
          heurt(s, cx, cy, -w * (cy - p.barre[1]), w * (cx - p.barre[0]), RM.r + RM.ep);
        }
        // Le bord du green, en dernier : rien ne peut en faire sortir le comprimé.
        if (b.x < RM.x0 + RM.r) { b.x = RM.x0 + RM.r; if (b.vx < 0) { if (b.vx < -40) s.choc = s.t; b.vx *= -RM.rebond; } }
        if (b.x > RM.x1 - RM.r) { b.x = RM.x1 - RM.r; if (b.vx > 0) { if (b.vx > 40) s.choc = s.t; b.vx *= -RM.rebond; } }
        if (b.y < RM.y0 + RM.r) { b.y = RM.y0 + RM.r; if (b.vy < 0) { if (b.vy < -40) s.choc = s.t; b.vy *= -RM.rebond; } }
        if (b.y > RM.y1 - RM.r) { b.y = RM.y1 - RM.r; if (b.vy > 0) { if (b.vy > 40) s.choc = s.t; b.vy *= -RM.rebond; } }
        if (roule(s)) {
          const v = Math.hypot(b.vx, b.vy), d = Math.hypot(b.x - p.t[0], b.y - p.t[1]);
          const bac = p.bacs.find(([x, y, r]) => Math.hypot(b.x - x, b.y - y) < r - 1);
          if (bac) {
            // Dans le DASRI : comprimé perdu. Un autre repart d'où le coup avait été joué, avec un coup de pénalité.
            s.bac = { x: bac[0], y: bac[1] }; s.bacT = s.t; s.coups++; s.coupsT++; s.penalites++;
            b.x = s.avant.x; b.y = s.avant.y; b.vx = b.vy = 0;
          } else if (d < RM.rt - 2 && v < RM.vcap) {
            // Dans le trou : d'autant plus de points que le comprimé y est arrivé en peu de coups.
            const c = Math.max(1, s.coups), pts = RM.gains[Math.min(c, RM.gains.length) - 1];
            s.trous++; s.points += pts; s.carte.push(c); if (c === 1) s.premiers++;
            s.ev = { pts, coups: c, par: p.par, x: p.t[0], y: p.t[1] }; s.evT = s.t;
            b.x = p.t[0]; b.y = p.t[1]; b.vx = b.vy = 0; s.dedans = true; s.pause = RM.pause;
          } else {
            if (d < RM.rt - 2) s.saut = s.t;                                                          // trop vite : il saute le trou
            if (v < RM.arret) b.vx = b.vy = 0;
          }
        }
      }
      // Fin au temps : le temps est écoulé et le comprimé s'est arrêté (ou le sursis est passé). Un trou entamé mais pas fini rapporte
      // quelques points d'approche, selon le chemin fait vers le trou : ils départagent, sans valoir un trou.
      if (s.t >= duree && (!roule(s) || s.t >= duree + RM.sursis)) {
        s.fini = true;
        if (!s.dedans && s.coups > 0) {
          const D = distancesMinigolf(p), d0 = D(p.d[0], p.d[1]), d = D(b.x, b.y);
          s.approche = d0 > 0 && d < 1e8 ? Math.round(RM.approche * borne(1 - d / d0, 0, 1)) : 0; s.points += s.approche;
        }
        s.points = Math.min(s.points, RM.plafond);
      }
    };
    // Pas fixe : la physique avance par tranches de 1/120 s quel que soit le rythme d'affichage.
    const pasMinigolf = (s, dt, duree) => { s.acc += dt; while (s.acc >= MG_PAS && !s.fini) { s.acc -= MG_PAS; unPasMinigolf(s, duree); } };
    // La note : le nombre de paliers atteints.
    const noteMinigolf = s => RM.seuils.filter(p => s.points >= p).length;
    // Pour les bancs d'essai : où finirait ce coup ? Rejoué sur une copie de la partie (le cœur n'a pas de hasard).
    const apresMinigolf = (s, vx, vy) => {
      const c = Object.assign({}, s, { b: Object.assign({}, s.b), carte: s.carte.slice(), acc: 0, fini: false });
      if (!tirerMinigolf(c, vx, vy, 1e9)) return null;
      const t0 = c.t; while (roule(c) && c.t < t0 + 8) unPasMinigolf(c, 1e9);
      return { x: c.b.x, y: c.b.y, dedans: c.dedans, bac: c.penalites > s.penalites, t: c.t - t0 };
    };
    // Le mot du golfeur pour un trou fini.
    const motMinigolf = (coups, par) => coups === 1 ? "Trou en un !" : coups <= par - 2 ? "Eagle !" : coups === par - 1 ? "Birdie !" : coups === par ? "Dans le par" : coups === par + 1 ? "Bogey" : "+" + (coups - par);

    /* --- Dessin et commandes (navigateur seulement) --- */
    const minigolf = (el, opt) => {
      const duree = opt.duree || 150, { cv, ctx, liberer } = monter(el, H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "Le minigolf de la paillasse. Un parcours de cinq trous : faites rouler le comprimé jusqu'au trou en le moins de coups possible, en évitant le collecteur DASRI. Au doigt ou à la souris : appuyez, tirez en arrière comme un piston de seringue, puis lâchez. Au clavier : flèches gauche et droite pour la direction, haut et bas pour la force, Espace pour jouer.");
      const s = creerMinigolf(), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      // Le comprimé porte le logo de l'unité ; tant que l'image n'est pas là (ou si elle manque), c'est un comprimé sécable.
      const logo = new Image(); logo.src = opt.logo || api._logo;
      let clos = false, minuterie = 0, depart = null, vise = null, clavier = false, angle = 0, force = 330, tenue = 0, vuN = -1, etaitPret = false;
      const touches = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
      const posDe = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.width * W]; };
      // Le geste : on tire le piston en arrière. Le comprimé part à l'opposé, d'autant plus fort que le piston est tiré loin.
      const mesurer = e => {
        const [x, y] = posDe(e), dx = depart[0] - x, dy = depart[1] - y, l = Math.hypot(dx, dy);
        if (l < 12) { vise = null; return; }
        const v = Math.min(RM.vmax, l * RM.k);
        vise = { vx: dx / l * v, vy: dy / l * v };
      };
      const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } clavier = false; depart = posDe(e); vise = null; };
      const glisse = e => { if (depart) { e.preventDefault(); mesurer(e); } };
      const lacher = e => { if (!depart) return; mesurer(e); if (vise && !clos) tirerMinigolf(s, vise.vx, vise.vy, duree); depart = vise = null; };
      const annule = () => { depart = vise = null; };
      const viseClavier = () => { vise = { vx: Math.sin(angle) * force, vy: -Math.cos(angle) * force }; };
      const versTrou = () => { angle = Math.atan2(s.plan.t[0] - s.b.x, s.b.y - s.plan.t[1]); };
      const touche = (e, v) => {
        const tir = e.key === " " || e.key === "Spacebar" || e.key === "Enter";
        if (!(e.key in touches) && !tir) return;
        if (v && (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || ""))) return;
        if (v) e.preventDefault();
        if (tir) { if (v && !e.repeat && !clos) { clavier = true; depart = null; viseClavier(); tirerMinigolf(s, vise.vx, vise.vy, duree); } return; }
        touches[e.key] = v; if (v) { clavier = true; depart = null; viseClavier(); }
      };
      const enfonce = e => touche(e, true), leve = e => touche(e, false), lache = () => { for (const k in touches) touches[k] = false; }, menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("pointermove", glisse); cv.addEventListener("pointerup", lacher); cv.addEventListener("pointercancel", annule); cv.addEventListener("contextmenu", menu);
      window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
      const retirer = () => {
        cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointermove", glisse); cv.removeEventListener("pointerup", lacher); cv.removeEventListener("pointercancel", annule); cv.removeEventListener("contextmenu", menu);
        window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
      };
      // Les teintes du green : le rough autour, deux verts pour les bandes de tonte, l'ombre des obstacles.
      const ROUGH = "#1F5E48", VERT1 = "#63B585", VERT2 = "#58AA7A", OMBRE = "rgba(20,50,40,.28)", ENCRE = "rgba(20,50,40,.55)";
      const COULEURS = [O, P, B, Y, V];
      const comprime = (x, y, tour, k) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.arc(1.5, 2.5, RM.r, 0, 6.3); ctx.fill();          // l'ombre portée
        ctx.rotate(tour); trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, RM.r, 0, 6.3); ctx.fill();
        if (logo.complete && logo.naturalWidth) { ctx.save(); ctx.clip(); ctx.drawImage(logo, -RM.r, -RM.r, 2 * RM.r, 2 * RM.r); ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, RM.r, 0, 6.3); ctx.stroke(); }
        else { ctx.stroke(); ctx.beginPath(); ctx.moveTo(-RM.r + 2.5, 0); ctx.lineTo(RM.r - 2.5, 0); ctx.stroke(); }
        ctx.restore();
      };
      // Une étiquette posée sur le gazon.
      const etiquette = (t, x, y, coul) => { ctx.font = "800 9px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; const l = ctx.measureText(t).width + 12; x = borne(x, RM.x0 + 3 + l / 2, RM.x1 - 3 - l / 2); ctx.fillStyle = "rgba(255,251,242,.82)"; ctx.beginPath(); ctx.roundRect(x - l / 2, y - 7, l, 14, 7); ctx.fill(); texte(ctx, t, x, y + 0.5, 9, coul || N); };
      function dessiner() {
        const p = s.plan, b = s.b, pret = pretMinigolf(s, duree);
        // Le green, vu de dessus : le rough sombre autour, le gazon tondu en bandes, un liseré plus clair le long du bord.
        ctx.fillStyle = ROUGH; ctx.fillRect(0, 0, W, H);
        for (let y = RM.y0, i = 0; y < RM.y1; y += 30, i++) { ctx.fillStyle = i % 2 ? VERT2 : VERT1; ctx.fillRect(RM.x0, y, RM.x1 - RM.x0, Math.min(30, RM.y1 - y)); }
        ctx.strokeStyle = "rgba(255,251,242,.22)"; ctx.lineWidth = 5; ctx.strokeRect(RM.x0 + 2.5, RM.y0 + 2.5, RM.x1 - RM.x0 - 5, RM.y1 - RM.y0 - 5);
        // Le tapis de départ et ses deux repères.
        ctx.fillStyle = "rgba(31,94,72,.5)"; ctx.beginPath(); ctx.roundRect(p.d[0] - 26, p.d[1] - 13, 52, 26, 5); ctx.fill();
        ctx.fillStyle = C; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(p.d[0] + k * 20, p.d[1], 2.6, 0, 6.3); ctx.fill(); }
        // Le tapis collant : il freine tout ce qui le traverse.
        for (const [x, y, w, h] of p.tapis) {
          ctx.fillStyle = "#8FB9E6"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
          ctx.strokeStyle = "rgba(38,7,109,.3)"; ctx.lineWidth = 1; ctx.beginPath();
          for (let u = x + 10; u < x + w - 4; u += 10) { ctx.moveTo(u, y + 4); ctx.lineTo(u, y + h - 4); }
          ctx.stroke();
          trait(ctx, 2); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke();
          etiquette(w > 80 ? "TAPIS COLLANT" : "COLLANT", x + w / 2, y + h / 2);
        }
        // Le flux laminaire : il pousse le comprimé qui le traverse, dans le sens des chevrons.
        for (const [x, y, w, h, ax, ay] of p.flux) {
          ctx.fillStyle = "rgba(214,238,250,.5)"; ctx.fillRect(x, y, w, h);
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
          const a = Math.atan2(ay, ax), pas = 40, gl = calme ? 0 : (s.t * 60) % pas;
          ctx.strokeStyle = "rgba(255,251,242,.9)"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
          for (let i = -1; i * pas < Math.max(w, h) + pas; i++) for (let j = 0; j * 26 < Math.max(w, h) + 26; j++) {
            const u = i * pas + gl, v = j * 26 + 13, cx = ax ? (ax > 0 ? x + u : x + w - u) : x + v, cy = ax ? y + v : (ay > 0 ? y + u : y + h - u);
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(2, 0); ctx.lineTo(-5, 6); ctx.stroke(); ctx.restore();
          }
          ctx.restore();
          ctx.strokeStyle = "rgba(255,251,242,.8)"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.setLineDash([]);
          etiquette("FLUX LAMINAIRE", x + w / 2, y + h - 10);
        }
        // Le collecteur jaune DASRI : un comprimé qui y tombe est perdu.
        for (const [x, y, r] of p.bacs) {
          ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.roundRect(x - r - 2, y - r, 2 * r + 8, 2 * r + 8, 7); ctx.fill();
          trait(ctx, 2.2); ctx.fillStyle = Y; ctx.beginPath(); ctx.roundRect(x - r - 4, y - r - 4, 2 * r + 8, 2 * r + 8, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#3A2A10"; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, 6.3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = R; ctx.beginPath(); ctx.roundRect(x - r - 1, y - r - 1, 9, 5, 2); ctx.fill();
          etiquette("DASRI", x, y + r + 14, R);
        }
        // Le trou, cerclé de blanc.
        const [tx, ty] = p.t;
        ctx.fillStyle = "rgba(31,94,72,.45)"; ctx.beginPath(); ctx.arc(tx, ty, RM.rt + 9, 0, 6.3); ctx.fill();
        ctx.fillStyle = "#12261F"; ctx.beginPath(); ctx.arc(tx, ty, RM.rt, 0, 6.3); ctx.fill();
        ctx.strokeStyle = C; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(tx, ty, RM.rt, 0, 6.3); ctx.stroke();
        // L'isolateur : un caisson vu de dessus, sa vitre et ses deux ronds de gants.
        for (const [x, y, w, h] of p.blocs) {
          ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.roundRect(x + 3, y + 5, w, h, 8); ctx.fill();
          trait(ctx, 2.6); ctx.fillStyle = "#E9E7F2"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#BFE0F2"; trait(ctx, 2); ctx.beginPath(); ctx.roundRect(x + 10, y + 12, w - 20, h - 46, 5); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 20, y + 40); ctx.lineTo(x + 44, y + 20); ctx.moveTo(x + 34, y + 44); ctx.lineTo(x + 52, y + 29); ctx.stroke();
          for (const k of [0.3, 0.7]) { trait(ctx, 2); ctx.fillStyle = P; ctx.beginPath(); ctx.arc(x + w * k, y + h - 18, 10, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.fillStyle = N; ctx.beginPath(); ctx.arc(x + w * k, y + h - 18, 4, 0, 6.3); ctx.fill(); }
          texte(ctx, "ISOLATEUR", x + w / 2, y + (h - 34) / 2 + 12, 11, "rgba(38,7,109,.55)");
        }
        // Les portoirs : des réglettes claires percées de leurs puits.
        for (const [x1, y1, x2, y2] of p.murs) {
          const l = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
          ctx.fillStyle = OMBRE; ctx.save(); ctx.translate(x1 + 2, y1 + 4); ctx.rotate(a); ctx.beginPath(); ctx.roundRect(-RM.ep, -RM.ep, l + 2 * RM.ep, 2 * RM.ep, RM.ep); ctx.fill(); ctx.restore();
          ctx.save(); ctx.translate(x1, y1); ctx.rotate(a);
          trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(-RM.ep - 1, -RM.ep - 1, l + 2 * RM.ep + 2, 2 * RM.ep + 2, RM.ep + 1); ctx.fill(); ctx.stroke();
          for (let u = 8, i = 0; u < l - 4; u += 14, i++) { ctx.fillStyle = i % 3 ? N : O; ctx.beginPath(); ctx.arc(u, 0, 2.2, 0, 6.3); ctx.fill(); }
          ctx.restore();
        }
        // Les flacons, vus de dessus : le verre, l'étiquette de couleur, la capsule.
        p.flacons.forEach(([x, y, r], i) => {
          const vif = s.t - s.choc < 0.12 && Math.hypot(b.x - x, b.y - y) < r + RM.r + 3;
          ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.arc(x + 2.5, y + 4, r, 0, 6.3); ctx.fill();
          trait(ctx, 2.2); ctx.fillStyle = vif ? C : COULEURS[(i + s.n) % COULEURS.length]; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, 6.3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = N; ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, 6.3); ctx.fill();
        });
        // L'agitateur magnétique : un barreau qui tourne sur sa plaque.
        if (p.barre) {
          const [x, y, l] = p.barre, [x1, y1, x2, y2] = barreMinigolf(p, s.t);
          ctx.fillStyle = "rgba(233,231,242,.55)"; ctx.beginPath(); ctx.arc(x, y, l + RM.ep + 2, 0, 6.3); ctx.fill();
          ctx.strokeStyle = "rgba(38,7,109,.3)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(x, y, l + RM.ep + 2, 0, 6.3); ctx.stroke(); ctx.setLineDash([]);
          ctx.lineCap = "round"; ctx.strokeStyle = OMBRE; ctx.lineWidth = 2 * RM.ep + 3; ctx.beginPath(); ctx.moveTo(x1 + 2, y1 + 4); ctx.lineTo(x2 + 2, y2 + 4); ctx.stroke();
          ctx.strokeStyle = N; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = C; ctx.lineWidth = 2 * RM.ep - 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = O; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(x + (x1 - x) * 0.14, y + (y1 - y) * 0.14); ctx.lineTo(x + (x2 - x) * 0.14, y + (y2 - y) * 0.14); ctx.stroke();
        }
        // Le rough autour du green et sa bordure : seule la seringue peut les chevaucher.
        ctx.fillStyle = ROUGH; ctx.fillRect(0, 0, W, RM.y0); ctx.fillRect(0, RM.y1, W, H - RM.y1); ctx.fillRect(0, 0, RM.x0, H); ctx.fillRect(RM.x1, 0, W - RM.x1, H);
        ctx.strokeStyle = C; ctx.lineWidth = 3; ctx.strokeRect(RM.x0 - 1.5, RM.y0 - 1.5, RM.x1 - RM.x0 + 3, RM.y1 - RM.y0 + 3);
        // La visée : la seringue derrière le comprimé, piston tiré selon la force, et le début de la trajectoire.
        if (vise && !clos && !s.dedans) {
          const v = Math.hypot(vise.vx, vise.vy), f = v / RM.vmax, ux = vise.vx / v, uy = vise.vy / v;
          ctx.fillStyle = pret ? C : "rgba(255,251,242,.4)";
          for (let i = 1; i <= 6; i++) { ctx.beginPath(); ctx.arc(b.x + ux * (10 + i * (8 + 14 * f)), b.y + uy * (10 + i * (8 + 14 * f)), 3.4 - i * 0.3, 0, 6.3); ctx.fill(); }
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(uy, ux) + Math.PI); ctx.globalAlpha = pret ? 1 : 0.4;
          trait(ctx, 2); ctx.beginPath(); ctx.moveTo(RM.r + 2, 0); ctx.lineTo(RM.r + 8, 0); ctx.stroke();                  // l'embout
          ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.roundRect(RM.r + 8, -6, 22, 12, 3); ctx.fill(); ctx.stroke();   // le corps
          const pz = 2 + 16 * f, bout = RM.r + 32 + pz * 0.55;                                                             // le piston
          ctx.fillStyle = f > 0.97 ? O : Y; ctx.fillRect(RM.r + 10, -4, Math.max(0, 18 - pz), 8);
          ctx.fillStyle = N; ctx.fillRect(RM.r + 28 - pz, -5, 3, 10);
          ctx.beginPath(); ctx.moveTo(RM.r + 30 - pz, 0); ctx.lineTo(bout, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bout, -7); ctx.lineTo(bout, 7); ctx.stroke();
          ctx.restore();
        }
        if (depart && !clos) { ctx.strokeStyle = "rgba(255,251,242,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(depart[0], depart[1], 12, 0, 6.3); ctx.stroke(); }
        // Le comprimé : il rétrécit en tombant dans le trou.
        const dtE = s.t - s.evT;
        if (s.dedans) comprime(b.x, b.y, b.tour, calme ? 0.8 : Math.max(0.7, 1 - dtE * 1.2));
        else {
          if (pret && !vise && !calme) { ctx.strokeStyle = "rgba(255,251,242,.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, RM.r + 5 + Math.sin(s.t * 6) * 1.5, 0, 6.3); ctx.stroke(); }
          comprime(b.x, b.y, b.tour, 1);
        }
        // Le drapeau, planté au bord du trou : son fanion porte le numéro du trou et flotte un peu.
        if (!s.dedans) {
          const vent = calme ? 0 : Math.sin(s.t * 3) * 2;
          ctx.strokeStyle = OMBRE; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(tx + 3, ty + 2); ctx.lineTo(tx + 16, ty + 9); ctx.stroke();
          trait(ctx, 2.4); ctx.beginPath(); ctx.moveTo(tx + 3, ty); ctx.lineTo(tx + 3, ty - 40); ctx.stroke();
          trait(ctx, 2); ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(tx + 3, ty - 40); ctx.quadraticCurveTo(tx + 16, ty - 38 + vent, tx + 27, ty - 31 + vent); ctx.lineTo(tx + 3, ty - 22); ctx.closePath(); ctx.fill(); ctx.stroke();
          texte(ctx, String(s.n + 1), tx + 11, ty - 30.5 + vent * 0.3, 10, C);
        }
        // Le résultat du trou, le temps du changement de trou.
        if (s.ev && s.dedans && !clos) {
          const bon = s.ev.coups <= s.ev.par;
          if (!calme) { ctx.globalAlpha = Math.max(0, 1 - dtE); ctx.strokeStyle = bon ? Y : C; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.ev.x, s.ev.y, 18 + dtE * 44, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
          const x = borne(s.ev.x, 122, W - 122), y = borne(s.ev.y + (s.ev.y < 140 ? 46 : -46), 70, H - 30);
          ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(x - 104, y - 15, 208, 30, 15); ctx.fill();
          texte(ctx, "+" + s.ev.pts + " · " + motMinigolf(s.ev.coups, s.ev.par), x, y + 1, 14, bon ? Y : C);
        } else if (s.t - s.bacT < 1.3 && !clos) {
          ctx.fillStyle = "rgba(216,64,43,.94)"; ctx.beginPath(); ctx.roundRect(180 - 116, 62, 232, 28, 14); ctx.fill();
          texte(ctx, "Dans le DASRI : +1 coup", 180, 77, 13, C);
        } else if (s.t - s.saut < 0.7 && !s.dedans && !clos) etiquette("Trop fort : il saute le trou", borne(tx, 80, W - 80), ty + 30);
        // Le nom du trou et son par, à l'arrivée sur le trou.
        if (!clos && !s.dedans && s.coups === 0 && s.coupsT > 0) {
          ctx.fillStyle = "rgba(38,7,109,.88)"; ctx.beginPath(); ctx.roundRect(40, 228, 280, 46, 14); ctx.fill();
          texte(ctx, "Trou " + (s.n + 1) + " · par " + p.par, 180, 243, 15, Y); texte(ctx, p.nom, 180, 262, 12, C);
        }
        if (s.t < 8 && !clos && !s.coupsT) {
          ctx.globalAlpha = Math.min(1, 8 - s.t) * 0.94;
          ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(18, 228, 324, 28, 14); ctx.fill();
          texte(ctx, tactile ? "Tirez en arrière comme un piston, lâchez" : "Tirez en arrière et lâchez, ou flèches + Espace", 180, 243, 13, Y);
          ctx.globalAlpha = 1;
        }
        bandeau(ctx, "Trou " + (s.n + 1) + "/" + PLANS.length + " · par " + p.par + " · coup " + (s.dedans ? s.coups : s.coups + 1) + " · " + s.points + " pts", duree - s.t, duree);
        if (clos) {
          // La carte de score : pour chaque trou, le par et les coups joués.
          const n = noteMinigolf(s), x0 = 46, lc = 46;
          ctx.fillStyle = "rgba(38,7,109,.95)"; ctx.beginPath(); ctx.roundRect(24, 132, 312, 226, 18); ctx.fill();
          texte(ctx, n + " / 10", 180, 166, 38, Y);
          texte(ctx, s.points + " points" + (s.boucle ? " · parcours bouclé" : " · " + s.trous + (s.trous > 1 ? " trous finis" : " trou fini")), 180, 200, 14, C);
          texte(ctx, "TROU", x0, 232, 9, V, "left"); texte(ctx, "PAR", x0, 262, 9, V, "left"); texte(ctx, "COUPS", x0, 296, 9, V, "left");
          PLANS.forEach((q, i) => {
            const x = x0 + 62 + i * lc, c = s.carte[i];
            texte(ctx, String(i + 1), x, 232, 13, C); texte(ctx, String(q.par), x, 262, 13, C);
            ctx.fillStyle = c === undefined ? "rgba(255,251,242,.14)" : c <= q.par ? G : O; ctx.beginPath(); ctx.roundRect(x - 15, 282, 30, 28, 8); ctx.fill();
            texte(ctx, c === undefined ? "·" : String(c), x, 297, 15, C);
          });
          const fait = s.carte.reduce((a, c) => a + c, 0), ref = PLANS.slice(0, s.carte.length).reduce((a, q) => a + q.par, 0);
          texte(ctx, s.carte.length ? fait + " coups pour un par de " + ref + (s.bonus ? " · +" + s.bonus + " de temps" : "") : "Aucun trou fini", 180, 336, 12, C);
        }
      }
      const arret = boucle(dt => {
        if (!clos) {
          const pret = pretMinigolf(s, duree);
          // À chaque arrêt du comprimé, la visée au clavier repart en direction du trou.
          if (pret && (!etaitPret || vuN !== s.n)) { versTrou(); vuN = s.n; if (clavier) viseClavier(); }
          etaitPret = pret;
          if (clavier) {
            const sens = (touches.ArrowRight ? 1 : 0) - (touches.ArrowLeft ? 1 : 0);
            tenue = sens ? tenue + dt : 0;                                                            // lent d'abord, pour viser fin, puis plus vite
            angle += sens * (0.5 + 2.3 * Math.min(1, tenue * 1.6)) * dt;
            force = borne(force + ((touches.ArrowUp ? 1 : 0) - (touches.ArrowDown ? 1 : 0)) * 260 * dt, 100, RM.vmax);
            viseClavier();
          }
          pasMinigolf(s, dt, duree);
          if (s.fini) {
            clos = true; lache(); annule();
            const n = noteMinigolf(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = (s.boucle ? "Parcours bouclé" : pl(s.trous, "trou fini", "trous finis") + " sur " + PLANS.length) + " en " + pl(s.coupsT, "coup", "coups") + (s.carte.length ? " (carte : " + s.carte.join(", ") + ")" : "") + (s.penalites ? ", dont " + pl(s.penalites, "pénalité", "pénalités") + " au DASRI" : "") + (s.bonus ? ", " + pl(s.bonus, "point", "points") + " de temps" : "") + (s.approche ? ", " + pl(s.approche, "point", "points") + " d'approche" : "") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (par trou : " + RM.gains[0] + " points en un coup, " + RM.gains[1] + " en deux, " + RM.gains[2] + " en trois, puis de moins en moins).";
            // Les quatre chiffres du tableau final commun : points, trous finis, coups joués sur le par de ces trous, temps restant.
            const fait = s.carte.reduce((a, c) => a + c, 0), ref = PLANS.slice(0, s.carte.length).reduce((a, q) => a + q.par, 0), reste = Math.max(0, Math.round(duree - s.t));
            const chiffres = [[s.points, s.points > 1 ? "points" : "point"], [s.trous + "/" + PLANS.length, s.trous > 1 ? "trous finis" : "trou fini"], s.carte.length ? [fait + "/" + ref, "coups/par"] : [s.coupsT, s.coupsT > 1 ? "coups" : "coup"], [reste + " s", reste > 1 ? "restantes" : "restante"]];
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.points, chiffres); }, 2600);
          }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.minigolf = minigolf;
    Object.assign(api._coeur, { REGL_MINIGOLF: RM, MG_PLANS: PLANS, planMinigolf, creerMinigolf, pasMinigolf, noteMinigolf, tirerMinigolf, pretMinigolf, apresMinigolf, distancesMinigolf, barreMinigolf, motMinigolf });
  }
  /* ----- Fin [minigolf] ----- */

  /* ----- Repère [badminton] : le badminton ----- */
  // Le badminton des bouchons. Vue de côté, en salle blanche : le volant est un bouchon de flacon coiffé de quatre pétales. Freiné par
  // l'air, il part vite, s'essouffle et retombe à pic. Le préparateur se place tout seul ; au joueur de choisir son coup (amorti au
  // filet, dégagement au fond, smash) et de frapper au bon moment, face au bras d'un automate sur son rail.
  // Tout le jeu vit dans ce bloc (cœur, dessin, inscription) : aucun nom ne déborde sur les jeux voisins.
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-badminton.js) : ils fixent la difficulté.
    // g : pesanteur, k : frein de l'air (proportionnel au carré de la vitesse), rx, ry : demi-axes de la zone de frappe autour de la
    // raquette, hn : hauteur de la raquette, hs et rys : hauteur et demi-hauteur de la zone de smash (frappe sautée),
    // pas, robot, retour : vitesses du joueur, de l'automate, et de son retour vers le centre après une frappe, reflexe : temps de lecture de l'automate, erreur : son imprécision,
    // fatigue : ce qu'il perd à chaque frappe de l'échange, course : ce qu'il perd pour 100 px de course, malice : son goût du smash,
    // fond, pres : trop au fond ou trop près du filet, il ne smashe pas, lob : angle du dégagement, smash : vitesse du smash,
    // asmash : part de cette vitesse pour le smash de l'automate,
    // vide : raquette perdue après un geste dans le vide, geste : après une frappe, faute : qualité sous laquelle le coup est raté,
    // parfait, bien : qualités des deux paliers, pts : points d'une frappe renvoyée (limite, bien, parfaite), gain : point gagné,
    // tueur : prime du smash gagnant, sursis : temps laissé à l'échange en cours quand le chrono tombe.
    const RBD = { g: 620, k: 0.0045, rx: 28, ry: 40, hn: 58, hs: 92, rys: 34, pas: 190, robot: 210, retour: 40, reflexe: 0.18, erreur: 0.12, fatigue: 0.03, course: 0.2, malice: 0.35, fond: 300, pres: 28, lob: 0.96, smash: 1050, asmash: 0.72, vide: 0.45, geste: 0.22, faute: 0.1, parfait: 0.62, bien: 0.3, pts: [5, 10, 15], gain: 100, tueur: 25, pause: 0.85, sursis: 3, plafond: 3000, seuils: [60, 150, 260, 380, 510, 650, 800, 960, 1130, 1320] };
    const BD_PAS = 1 / 120, BD_H = 440, BD_SOL = 372, BD_G = 20, BD_D = 340, BD_FX = 180, BD_FH = 50, BD_J = 92, BD_A = 268, BD_MAIN = 10;
    // Le vol libre du volant pendant dt : pesanteur, frein de l'air, filet (un trait vertical de BD_FH de haut).
    function volVolant(b, dt) {
      const f = RBD.k * Math.hypot(b.vx, b.vy), x0 = b.x, y0 = b.y;
      b.vx -= f * b.vx * dt; b.vy += (RBD.g - f * b.vy) * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (!b.filet && x0 !== b.x && (x0 - BD_FX) * (b.x - BD_FX) <= 0) {
        const y = y0 + (b.y - y0) * (BD_FX - x0) / (b.x - x0);
        if (y > BD_SOL - BD_FH) { b.filet = true; b.x = BD_FX + (x0 < BD_FX ? -4 : 4); b.y = y; b.vx *= -0.06; b.vy = Math.max(0, b.vy) * 0.3; }
        else b.yf = BD_SOL - BD_FH - y;                                                              // la marge au-dessus de la bande
      }
    }
    // Où finit un volant lancé de (x, y) à la vitesse (vx, vy) ? Rend le point de chute, la marge au filet, et si le filet l'a arrêté.
    function chuteVolant(x, y, vx, vy) {
      const c = { x, y, vx, vy, filet: false, yf: null }; let t = 0;
      while (c.y < BD_SOL && t < 4) { volVolant(c, BD_PAS); t += BD_PAS; }
      return { x: c.x, t, filet: c.filet, yf: c.yf };
    }
    // Ce que le receveur doit savoir d'un volant en vol : où il redescendra à hauteur de raquette (xn, tn) et, s'il passe assez
    // haut, à hauteur de smash (xs, ts) ; où il tombera (sol), et s'il s'arrête dans le filet.
    function prevoirVolant(b) {
      const c = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, filet: !!b.filet }, cote = b.de ? -1 : 1, r = { xn: null, tn: 0, xs: null, ts: 0, sol: 0, t: 0, filet: false };
      let t = 0;
      while (c.y < BD_SOL && t < 4) {
        const y0 = c.y; volVolant(c, BD_PAS); t += BD_PAS;
        if ((c.x - BD_FX) * cote > 0 && c.vy > 0) {
          if (r.xs === null && r.xn === null && y0 < BD_SOL - RBD.hs && c.y >= BD_SOL - RBD.hs) { r.xs = c.x; r.ts = t; }
          if (r.xn === null && c.y >= BD_SOL - RBD.hn) { r.xn = c.x; r.tn = t; }
        }
      }
      r.sol = c.x; r.t = t; r.filet = c.filet; return r;
    }
    // La vitesse de départ qui fait tomber le volant à xt, pour un angle donné (en radians au-dessus de l'horizontale).
    function doserVolant(x, y, sens, angle, xt) {
      let a = 30, b = 1500; const ca = Math.cos(angle) * sens, sa = -Math.sin(angle);
      for (let i = 0; i < 13; i++) {
        const v = (a + b) / 2, r = chuteVolant(x, y, ca * v, sa * v);
        if ((r.x - xt) * sens < 0) a = v; else b = v;
      }
      return (a + b) / 2;
    }
    // La qualité d'une frappe : 1 au cœur de la zone (le tamis de la raquette, ou plus haut pour un smash), 0 au bord, négative au-delà.
    const qualiteBadminton = (main, type, b) => 1 - Math.hypot((b.x - main) / RBD.rx, (b.y - (BD_SOL - (type === "smash" ? RBD.hs : RBD.hn))) / (type === "smash" ? RBD.rys : RBD.ry));
    const gradeBadminton = q => q >= RBD.parfait ? 2 : q >= RBD.bien ? 1 : 0;
    // Un coup : qui (0 le joueur, 1 l'automate) renvoie le volant d'où il est, avec la qualité q (de 0 à 1).
    // amorti : juste derrière le filet, au ras de la bande. degage : haut, jusqu'au fond. smash : sec et plongeant.
    // Moins la frappe est juste, plus l'amorti flotte, plus le dégagement est court, plus le smash est mou. Sous RBD.faute, c'est raté.
    function coupBadminton(s, qui, type, q) {
      const b = s.v, sens = qui ? -1 : 1, x = b.x, y = Math.min(b.y, BD_SOL - 6), dn = Math.abs(BD_FX - x), h0 = BD_SOL - y, rate = q < RBD.faute, hasard = s.h() - 0.5;
      let vx, vy;
      if (type === "smash") {
        let v = RBD.smash * (qui ? RBD.asmash : 1) * (0.72 + 0.28 * q); const marge = 5 + 16 * (1 - q);
        if (rate || h0 < BD_FH + 8) { const a = Math.atan2(h0 - BD_FH + 14, dn); vx = Math.cos(a) * v * sens; vy = Math.sin(a) * v; }       // trop bas : dans le filet
        else {
          // L'angle le plus plongeant qui passe encore la bande avec la marge voulue.
          // Frappé de trop loin, il sortirait : il part alors moins fort.
          let m = 0;
          for (let n = 0; n < 8; n++, v *= 0.88) {
            let a = -1.1, c = 0.35;
            for (let i = 0; i < 11; i++) { const u = (a + c) / 2, r = chuteVolant(x, y, Math.cos(u) * v * sens, -Math.sin(u) * v); if (r.filet || r.yf === null || r.yf < marge) a = u; else c = u; }
            m = c; const r = chuteVolant(x, y, Math.cos(m) * v * sens, -Math.sin(m) * v);
            if ((r.x - BD_FX) * sens < BD_D - BD_FX - 12) break;
          }
          vx = Math.cos(m) * v * sens; vy = -Math.sin(m) * v;
        }
      } else if (type === "degage") {
        const u = rate ? -16 : (BD_D - BD_FX) - 9 - 108 * Math.pow(1 - q, 1.4) + hasard * 8 * (1 - q), a = RBD.lob, v = doserVolant(x, y, sens, a, BD_FX + sens * u);
        vx = Math.cos(a) * v * sens; vy = -Math.sin(a) * v;
      } else {
        const u = rate ? -14 : 17 + 82 * (1 - q) * (1 - q) + hasard * 6 * (1 - q), marge = 6 + 30 * (1 - q), xt = BD_FX + sens * u;
        // L'angle le plus tendu qui passe la bande avec la marge voulue, en retombant à l'endroit visé.
        let a = Math.max(0.2, Math.atan2(BD_FH + marge - h0, dn) + 0.12), v = 0;
        for (let i = 0; i < 9; i++, a += 0.11) { v = doserVolant(x, y, sens, a, xt); if (rate) break; const r = chuteVolant(x, y, Math.cos(a) * v * sens, -Math.sin(a) * v); if (!r.filet && r.yf !== null && r.yf >= marge) break; }
        vx = Math.cos(a) * v * sens; vy = -Math.sin(a) * v;
      }
      s.v = { x, y, vx, vy, de: qui, n: ++s.nv, type, q, filet: false, yf: null, tour: 0 };
      s.echange++; s.impact = { x, y, t: s.t, qui, type, grade: gradeBadminton(q) };
    }
    // Une partie. x : le joueur, ax : l'automate (leurs pieds) ; phase : service (au joueur de servir), jeu, pause (entre deux échanges).
    // Le hasard (les choix et l'imprécision de l'automate) vient de la graine.
    function creerBadminton(graine) {
      let a = graine || 20261224;
      const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      return { t: 0, acc: 0, x: BD_J, ax: BD_A, cible: BD_J, acible: BD_A, v: null, nv: 0, phase: "service", pause: 0, bloque: -9, vide: false, geste: null, ageste: null, avu: -1, aquand: 0, aplan: null, prevu: null, gage: null, echange: 0, pour: 0, contre: 0, points: 0, frappes: 0, parfaites: 0, smashs: 0, vides: 0, services: 0, record: 0, msg: "", msgT: -9, bon: false, impact: null, h, fini: false };
    }
    const direBadminton = (s, msg, bon) => { s.msg = msg; s.msgT = s.t; s.bon = !!bon; };
    // La frappe du joueur est validée dès que l'automate la reprend ou qu'elle tombe bonne : elle rapporte alors ses points.
    function validerBadminton(s) {
      const g = s.gage; if (!g) return;
      s.gage = null; s.frappes++; s.points += RBD.pts[g.grade]; if (g.grade === 2) s.parfaites++;
    }
    function finEchange(s, gagne, msg) {
      const b = s.v;
      if (gagne) { validerBadminton(s); s.pour++; s.points += RBD.gain; if (b && b.de === 0 && b.type === "smash" && !b.service) { s.smashs++; s.points += RBD.tueur; msg = "Smash gagnant !"; } }
      else { s.gage = null; s.contre++; }
      s.record = Math.max(s.record, s.echange);
      direBadminton(s, msg, gagne);
      if (b) { b.mort = true; b.vx = b.vy = 0; }
      s.phase = "pause"; s.pause = RBD.pause; s.cible = BD_J; s.acible = BD_A; s.aretour = false; s.aplan = null; s.prevu = null;
    }
    // Le joueur demande un coup : "amorti", "degage" ou "smash". Au service, l'amorti sert court, les deux autres servent long.
    // Rend vrai si le volant est parti. Un geste dans le vide coûte RBD.vide secondes de raquette, et taper encore pendant ce temps le prolonge.
    function frapperBadminton(s, type, duree) {
      if (s.fini || s.phase === "pause" || (duree !== undefined && s.t >= duree && s.phase !== "jeu")) return false;
      if (s.t < s.bloque) { if (s.vide) s.bloque = s.t + RBD.vide; return false; }                  // marteler ne sert à rien : la raquette reste perdue
      s.vide = false;
      s.geste = { t: s.t, type, ok: false };
      if (s.phase === "service") {
        s.v = { x: s.x + BD_MAIN, y: BD_SOL - 42, vx: 0, vy: 0 }; s.echange = 0; s.gage = null;
        coupBadminton(s, 0, type === "amorti" ? "amorti" : "degage", type === "amorti" ? 0.96 : 0.85);
        s.v.service = true; s.echange = 0; s.impact.grade = -1; s.services++; s.phase = "jeu"; s.geste.ok = true; s.bloque = s.t + RBD.geste; s.cible = BD_J;
        return true;
      }
      const b = s.v, q = b && b.de === 1 && !b.mort ? qualiteBadminton(s.x + BD_MAIN, type, b) : -1;
      if (q <= 0) { s.bloque = s.t + RBD.vide; s.vide = true; s.vides++; direBadminton(s, "Dans le vide", false); return false; }
      coupBadminton(s, 0, type, q);
      s.gage = { grade: gradeBadminton(q) }; s.geste.ok = true; s.bloque = s.t + RBD.geste; s.cible = BD_J; s.prevu = null;
      if (q < RBD.faute) s.gage = null;
      return true;
    }
    const gaussBadminton = s => (s.h() + s.h() + s.h() + s.h() - 2) * 1.7;
    // L'automate : à chaque frappe du joueur, il lit la trajectoire (après un temps de réflexion), choisit son coup (un smash si le
    // volant passe assez haut et pas trop au fond, sinon amorti ou dégagement selon la place du joueur), va se placer et frappe au
    // meilleur moment, puis revient sans hâte vers le centre. Plus il a dû courir et plus l'échange dure, moins son coup est juste.
    function automateBadminton(s) {
      const b = s.v;
      if (b.n !== s.avu) { s.avu = b.n; s.aquand = s.t + RBD.reflexe; s.aplan = null; }
      if (s.t < s.aquand) return;
      let p = s.aplan;
      if (!p) {
        const r = prevoirVolant(b);
        if (r.filet || r.sol < BD_FX || r.sol > BD_D + 5 || r.xn === null) { s.aplan = { type: "laisse" }; return; }
        const haut = r.xs !== null && r.xs < RBD.fond && r.xs > BD_FX + RBD.pres;
        const type = haut && s.h() < RBD.malice ? "smash" : s.h() < (s.x < 70 ? 0.7 : s.x > 115 ? 0.25 : 0.5) ? "amorti" : "degage";
        s.acible = borne((type === "smash" ? r.xs : r.xn) + BD_MAIN, BD_FX + 16, BD_D - 6); s.aretour = false;
        p = s.aplan = { type, bruit: Math.abs(gaussBadminton(s)) * RBD.erreur + RBD.fatigue * s.echange + RBD.course * Math.abs(s.acible - s.ax) / 100, qmax: 0, xn: r.xn };
      }
      if (p.type === "laisse") return;
      // Smash manqué (le volant est déjà passé sous la zone) : il se rabat sur un coup ordinaire.
      if (p.type === "smash" && b.vy > 0 && b.y > BD_SOL - RBD.hs + RBD.rys * 0.8) { p.type = s.x < 92 ? "amorti" : "degage"; p.qmax = 0; s.acible = borne(p.xn + BD_MAIN, BD_FX + 16, BD_D - 6); }
      const q = qualiteBadminton(s.ax - BD_MAIN, p.type, b);
      if (q > 0 && (q < p.qmax - 1e-9 || q > 0.93)) {
        validerBadminton(s);
        s.ageste = { t: s.t, type: p.type };
        coupBadminton(s, 1, p.type, Math.max(0, Math.max(q, p.qmax) - p.bruit));
        s.aplan = null; s.acible = BD_A; s.aretour = true;
        // Le joueur se place tout seul, là où le volant redescendra à hauteur de raquette.
        const r = s.prevu = prevoirVolant(s.v);
        if (!r.filet && r.xn !== null) s.cible = borne(r.xn - BD_MAIN, BD_G + 6, BD_FX - 16);
        return;
      }
      p.qmax = Math.max(p.qmax, q);
    }
    function unPasBadminton(s, duree) {
      s.t += BD_PAS;
      const va = (s.aretour ? RBD.retour : RBD.robot) * BD_PAS, vj = RBD.pas * BD_PAS;
      s.x += borne(s.cible - s.x, -vj, vj);
      if (s.phase !== "jeu" || s.t >= s.aquand || s.aretour) s.ax += borne(s.acible - s.ax, -va, va);
      if (s.phase === "pause") { s.pause -= BD_PAS; if (s.pause <= 0) { s.phase = "service"; s.v = null; } }
      else if (s.phase === "jeu") {
        const b = s.v;
        volVolant(b, BD_PAS); b.tour += BD_PAS;
        if (b.de === 0 && !b.filet) automateBadminton(s);
        if (s.phase === "jeu" && s.v === b && b.y >= BD_SOL) {
          b.y = BD_SOL;
          const chezLui = (b.x < BD_FX) === (b.de === 0), dehors = b.x < BD_G || b.x > BD_D, faute = b.filet || chezLui || dehors;
          const joueur = b.de === 0, gagne = joueur ? !faute : faute;
          finEchange(s, gagne, faute ? (b.filet ? (joueur ? "Dans le filet" : "Filet : point pour vous !") : dehors ? (joueur ? "Dehors" : "Dehors : point pour vous !") : (joueur ? "Trop court" : "Trop court : point pour vous !")) : (joueur ? "Point !" : "Point pour l'automate"));
        }
      }
      if (s.t >= duree && (s.phase !== "jeu" || s.t >= duree + RBD.sursis)) s.fini = true;
    }
    // Pas fixe : la physique avance par tranches de 1/120 s quel que soit le rythme d'affichage.
    const pasBadminton = (s, dt, duree) => { s.acc += dt; while (s.acc >= BD_PAS && !s.fini) { s.acc -= BD_PAS; unPasBadminton(s, duree); } };
    // La note : le nombre de paliers atteints. Le score brut : les points, bornés par le plafond.
    const noteBadminton = s => RBD.seuils.filter(p => s.points >= p).length;
    const brutBadminton = s => Math.min(RBD.plafond, Math.round(s.points));

    /* --- Dessin et commandes (navigateur seulement) --- */
    const COUPS = ["amorti", "degage", "smash"], NOMS = ["AMORTI", "DÉGAGÉ", "SMASH"];
    const badminton = (el, opt) => {
      const duree = opt.duree || 55, { cv, ctx, xDe, liberer } = monter(el, BD_H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "Le badminton des bouchons. Renvoyez le volant par-dessus le filet, face à l'automate : le préparateur se place tout seul, à vous de choisir le coup et de frapper quand le volant arrive sur la raquette. Trois coups : amorti (tiers gauche de l'écran, flèche gauche ou touche 1), dégagement au fond (tiers du milieu, flèche haut, Espace ou touche 2), smash quand le volant arrive haut (tiers droit, flèche droite ou touche 3). Le premier coup de chaque échange est votre service.");
      const s = creerBadminton(opt.graine), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      const logo = new Image(); logo.src = opt.logo || api._logo;
      let clos = false, minuterie = 0, pasJ = 0, xAvant = s.x;
      const appuiT = [-9, -9, -9];
      const trace = [];
      const jouer = i => { if (clos) return; appuiT[i] = s.t; frapperBadminton(s, COUPS[i], duree); };
      const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); jouer(borne(Math.floor(xDe(e) / (W / 3)), 0, 2)); };
      const TOUCHES = { ArrowLeft: 0, "1": 0, "&": 0, ArrowUp: 1, " ": 1, Spacebar: 1, "2": 1, "é": 1, ArrowRight: 2, "3": 2, '"': 2 };
      const enfonce = e => {
        if (!(e.key in TOUCHES) || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target && e.target.tagName || "")) return;
        e.preventDefault(); if (!e.repeat) jouer(TOUCHES[e.key]);
      };
      const menu = e => e.preventDefault();
      cv.addEventListener("pointerdown", appui); cv.addEventListener("contextmenu", menu); window.addEventListener("keydown", enfonce);
      const retirer = () => { cv.removeEventListener("pointerdown", appui); cv.removeEventListener("contextmenu", menu); window.removeEventListener("keydown", enfonce); };
      const MUR = "#EEF1FA", MUR2 = "#E2E6F4", SOLC = "#3E9B76", SOLF = "#2F7F62", ENCRE = "rgba(38,7,109,.5)", OMBRE = "rgba(38,7,109,.16)";
      // Le volant : un bouchon de flacon (élastomère gris, capsule sertie) et sa jupe de quatre pétales aux couleurs du logo.
      const volant = (x, y, a, k) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(k, k);
        const PET = [Y, O, P, V];
        trait(ctx, 1.6);
        for (let i = 0; i < 4; i++) {
          const o = (i - 1.5) * 0.3;
          ctx.fillStyle = PET[i]; ctx.beginPath(); ctx.moveTo(-3, o * 6); ctx.quadraticCurveTo(-11, o * 26 - 3.2, -17, o * 26); ctx.quadraticCurveTo(-11, o * 26 + 3.2, -3, o * 6 + 0.01); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = "#8C8A9E"; ctx.beginPath(); ctx.roundRect(-4, -4.6, 9, 9.2, [1.5, 4.5, 4.5, 1.5]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#D9DCE8"; ctx.fillRect(-4.6, -5.2, 3.4, 10.4); ctx.strokeRect(-4.6, -5.2, 3.4, 10.4);
        ctx.restore();
      };
      // La raquette : un tamis de laboratoire au bout d'un manche de spatule. (x, y) : le centre du tamis, a : l'inclinaison du manche.
      // vif : elle vient de frapper ; perdue : geste dans le vide, elle ne répond plus un instant.
      const raquette = (x, y, a, vif, perdue) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); if (perdue) ctx.globalAlpha = 0.45;
        trait(ctx, 3.2); ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, 27); ctx.stroke();
        ctx.strokeStyle = O; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 27); ctx.stroke();
        ctx.fillStyle = vif ? "rgba(236,213,103,.85)" : "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 10.5, 0, 0, 6.3); ctx.fill();
        ctx.save(); ctx.clip(); ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 0.8; ctx.beginPath();
        for (let u = -8; u <= 8; u += 4) { ctx.moveTo(u, -11); ctx.lineTo(u, 11); ctx.moveTo(-9, u); ctx.lineTo(9, u); }
        ctx.stroke(); ctx.restore();
        trait(ctx, 2.2); ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 10.5, 0, 0, 6.3); ctx.stroke();
        ctx.restore();
      };
      // Le geste dure 0,3 s. elan rend son avancement de 0 à 1 (-1 au repos) ; angleGeste, l'inclinaison de la raquette, qui tourne
      // autour de la main : elle fouette vers l'avant puis revient à sa garde (0,25 rad). L'amorti est un geste retenu.
      const elan = g => g && s.t - g.t < 0.3 ? (s.t - g.t) / 0.3 : -1;
      const angleGeste = (e, type) => { if (e < 0) return 0.25; const a0 = type === "amorti" ? -0.35 : -0.95, a1 = type === "amorti" ? 0.8 : 1.45; return e < 0.45 ? a0 + (a1 - a0) * (e / 0.45) : a1 + (0.25 - a1) * ((e - 0.45) / 0.55); };
      // Le préparateur, de profil : sabots, pantalon, blouse, masque et charlotte. Il court, arme et saute pour smasher.
      function preparateur() {
        const x = s.x, e = elan(s.geste), saute = e >= 0 && s.geste.type === "smash" ? Math.sin(e * Math.PI) * 24 : 0, sol = BD_SOL - saute;
        const court = Math.abs(s.x - xAvant) > 0.2, f = court ? Math.sin(pasJ) : 0, hanche = sol - 26, epaule = sol - 47;
        ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.ellipse(x, BD_SOL + 3, 15 - saute * 0.3, 3.5, 0, 0, 6.3); ctx.fill();
        // Les jambes.
        trait(ctx, 5.4); ctx.strokeStyle = B;
        for (const k of [-1, 1]) { const px = x + k * (4 + f * 7 * k) * (court ? k : 1), py = sol - 2 - (court && k * f > 0 ? 3 : 0); ctx.beginPath(); ctx.moveTo(x, hanche); ctx.quadraticCurveTo(x + k * 3 + f * k * 3, hanche + 14, px, py); ctx.stroke(); ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(px - 3, py - 1, 9, 4.5, 2); ctx.fill(); }
        // La blouse.
        trait(ctx, 2.2); ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(x - 8, epaule - 2); ctx.quadraticCurveTo(x + 1, epaule - 6, x + 8, epaule - 1); ctx.lineTo(x + 9, hanche + 5); ctx.lineTo(x - 10, hanche + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, x - 5, epaule + 4, 10, 10);
        // La tête : charlotte bleue, masque, un œil qui suit le volant.
        const ty = epaule - 15, b = s.v, d = b ? Math.hypot(b.x - x, b.y - ty) || 1 : 1, ex = b ? (b.x - x) / d * 1.6 : 1.2, ey = b ? (b.y - ty) / d * 1.6 : 0;
        ctx.fillStyle = "#F3D2B3"; ctx.beginPath(); ctx.arc(x + 1, ty, 9.5, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = B; ctx.beginPath(); ctx.arc(x + 1, ty, 9.5, Math.PI * 0.92, Math.PI * 1.98); ctx.quadraticCurveTo(x - 2, ty - 7, x - 9, ty + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(x + 2, ty + 2, 9, 7, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = N; ctx.beginPath(); ctx.arc(x + 5 + ex, ty - 1.5 + ey, 1.9, 0, 6.3); ctx.fill();
        // Le bras et la raquette : au repos, le tamis attend le volant au cœur de la zone de frappe.
        const smash = e >= 0 && s.geste.type === "smash", ra = angleGeste(e, e >= 0 ? s.geste.type : ""), leve = smash ? Math.sin(e * Math.PI) : 0;
        const hx = x + BD_MAIN - 6, hy = BD_SOL - RBD.hn + 23 - leve * (RBD.hs - RBD.hn), rx = hx + Math.sin(ra) * 24, ry = hy - Math.cos(ra) * 24;
        for (const [w, c] of [[6.6, N], [3.4, C]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 2, epaule + 2); ctx.quadraticCurveTo((x + hx) / 2 - 6, (epaule + hy) / 2 + 6, hx, hy); ctx.stroke(); }
        raquette(rx, ry, ra, e >= 0 && s.geste.ok, e >= 0 && !s.geste.ok || s.t < s.bloque && s.vide);
        ctx.fillStyle = P; trait(ctx, 1.6); ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 6.3); ctx.fill(); ctx.stroke();
      }
      // L'automate : un chariot sur son rail, un œil de caméra, et un bras articulé qui tient le tamis.
      function automate() {
        const x = s.ax, e = elan(s.ageste), lit = s.phase === "jeu" && s.v && s.v.de === 0 && s.t < s.aquand;
        ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.ellipse(x + 4, BD_SOL + 3, 19, 3.5, 0, 0, 6.3); ctx.fill();
        // Le chariot et ses galets.
        trait(ctx, 2.2); ctx.fillStyle = V; ctx.beginPath(); ctx.roundRect(x - 10, BD_SOL - 24, 30, 19, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = N; for (const u of [-4, 14]) { ctx.beginPath(); ctx.arc(x + u, BD_SOL - 4, 4, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x + 12, BD_SOL - 15, 5.5, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = lit ? O : G; ctx.beginPath(); ctx.arc(x + 12, BD_SOL - 15, 2.6, 0, 6.3); ctx.fill();
        ctx.fillStyle = Y; ctx.fillRect(x - 6, BD_SOL - 20, 8, 3);
        // Le bras : épaule sur le chariot, coude, poignet. La main vise le cœur de la zone de frappe.
        const smash = e >= 0 && s.ageste.type === "smash", ra = -angleGeste(e, e >= 0 ? s.ageste.type : ""), leve = smash ? Math.sin(e * Math.PI) : 0;
        const hx = x - BD_MAIN + 6, hy = BD_SOL - RBD.hn + 23 - leve * (RBD.hs - RBD.hn), rx = hx + Math.sin(ra) * 24, ry = hy - Math.cos(ra) * 24, ox = x + 4, oy = BD_SOL - 24;
        // Le coude : à égale distance de l'épaule et de la main, déporté vers l'arrière.
        const dx = hx - ox, dy = hy - oy, d = Math.hypot(dx, dy) || 1, l = Math.max(d / 2 + 1, 27), hc = Math.sqrt(l * l - d * d / 4), cx = (ox + hx) / 2 - dy / d * hc * -1, cy = (oy + hy) / 2 + dx / d * hc * -1;
        for (const [w, c] of [[8, N], [4.6, "#C9CCDD"]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke(); }
        trait(ctx, 1.8); ctx.fillStyle = O; for (const [u, w] of [[ox, oy], [cx, cy]]) { ctx.beginPath(); ctx.arc(u, w, 4, 0, 6.3); ctx.fill(); ctx.stroke(); }
        raquette(rx, ry, ra, e >= 0 && e < 0.5, false);
        ctx.fillStyle = N; ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, 6.3); ctx.fill();
      }
      // Le décor : une salle blanche. Plafond soufflant, cloisons, hublot du sas, affiche au logo de l'unité ; le terrain vert et ses lignes.
      function decor() {
        ctx.fillStyle = MUR; ctx.fillRect(0, 39, W, BD_SOL - 39);
        ctx.fillStyle = MUR2; for (let x = 0; x < W; x += 90) ctx.fillRect(x + 88, 39, 2, BD_SOL - 39);
        ctx.fillStyle = "#D5DAEC"; ctx.fillRect(0, 39, W, 15);
        for (let x = 14; x < W; x += 86) {                                                         // les filtres du plafond et leur flux
          ctx.fillStyle = "#F9FAFE"; ctx.beginPath(); ctx.roundRect(x, 42, 64, 9, 3); ctx.fill();
          ctx.strokeStyle = "rgba(38,7,109,.25)"; ctx.lineWidth = 1; ctx.beginPath(); for (let u = x + 6; u < x + 62; u += 7) { ctx.moveTo(u, 43.5); ctx.lineTo(u, 49.5); } ctx.stroke();
          ctx.strokeStyle = "rgba(143,199,232,.35)"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath();
          for (let u = x + 10, i = 0; u < x + 60; u += 16, i++) { const o = calme ? 0 : (s.t * 26 + i * 9) % 28; ctx.moveTo(u, 58 + o); ctx.lineTo(u, 68 + o); }
          ctx.stroke();
        }
        // Le hublot du sas, côté joueur ; l'affiche de l'unité, côté automate.
        trait(ctx, 2.4); ctx.fillStyle = "#CFE6F5"; ctx.beginPath(); ctx.roundRect(36, 118, 70, 54, 10); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(50, 158); ctx.lineTo(74, 130); ctx.moveTo(66, 162); ctx.lineTo(84, 141); ctx.stroke();
        texte(ctx, "SAS", 71, 184, 10, ENCRE);
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(250, 112, 64, 74, 6); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 258, 117, 48, 48);
        texte(ctx, "PHARMACO", 282, 175, 8, N);
        // Au fond, la paillasse : des meubles bas, pâles pour ne pas gêner la lecture du volant, et quelques flacons.
        ctx.fillStyle = "#DDE1F0"; ctx.fillRect(0, BD_SOL - 30, W, 30); ctx.fillStyle = "#F7F8FD"; ctx.fillRect(0, BD_SOL - 33, W, 4);
        ctx.strokeStyle = "rgba(38,7,109,.1)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = 30; x < W; x += 60) { ctx.moveTo(x, BD_SOL - 27); ctx.lineTo(x, BD_SOL); ctx.moveTo(x - 8, BD_SOL - 16); ctx.lineTo(x - 8, BD_SOL - 10); } ctx.stroke();
        [[18, P], [128, Y], [142, V], [226, B], [330, O]].forEach(([x, c], i) => { ctx.fillStyle = "#F7F8FD"; ctx.strokeStyle = "rgba(38,7,109,.22)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(x - 5, BD_SOL - 47 + (i % 2) * 3, 10, 14 - (i % 2) * 3, 2.5); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 0.55; ctx.fillStyle = c; ctx.fillRect(x - 4, BD_SOL - 39, 8, 5); ctx.globalAlpha = 1; ctx.fillStyle = "rgba(38,7,109,.3)"; ctx.fillRect(x - 3.5, BD_SOL - 50 + (i % 2) * 3, 7, 3); });
        // Le terrain.
        ctx.fillStyle = SOLC; ctx.fillRect(0, BD_SOL, W, BD_H - BD_SOL); ctx.fillStyle = SOLF; ctx.fillRect(0, BD_SOL, W, 3);
        ctx.fillStyle = C; ctx.fillRect(BD_G - 2, BD_SOL, BD_D - BD_G + 4, 3);
        for (const x of [BD_G, BD_D]) { ctx.fillStyle = C; ctx.fillRect(x - 1.5, BD_SOL - 5, 3, 8); }
        // Le filet : tendu sur un pied à perfusion, sa poche accrochée en haut.
        ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.ellipse(BD_FX, BD_SOL + 3, 16, 3, 0, 0, 6.3); ctx.fill();
        trait(ctx, 3); ctx.beginPath(); ctx.moveTo(BD_FX - 13, BD_SOL - 1); ctx.lineTo(BD_FX + 13, BD_SOL - 1); ctx.stroke();
        ctx.fillStyle = N; for (const u of [-13, 13]) { ctx.beginPath(); ctx.arc(BD_FX + u, BD_SOL - 1, 2.6, 0, 6.3); ctx.fill(); }
        ctx.fillStyle = "rgba(255,251,242,.75)"; ctx.fillRect(BD_FX - 3, BD_SOL - BD_FH, 6, BD_FH - 6);
        ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 0.8; ctx.beginPath(); for (let y = BD_SOL - BD_FH + 5; y < BD_SOL - 6; y += 5) { ctx.moveTo(BD_FX - 3, y); ctx.lineTo(BD_FX + 3, y); } ctx.stroke();
        trait(ctx, 2.6); ctx.beginPath(); ctx.moveTo(BD_FX, BD_SOL - 2); ctx.lineTo(BD_FX, BD_SOL - BD_FH - 26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(BD_FX - 9, BD_SOL - BD_FH - 22); ctx.quadraticCurveTo(BD_FX - 9, BD_SOL - BD_FH - 28, BD_FX, BD_SOL - BD_FH - 26); ctx.quadraticCurveTo(BD_FX + 9, BD_SOL - BD_FH - 28, BD_FX + 9, BD_SOL - BD_FH - 22); ctx.stroke();
        trait(ctx, 1.8); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.roundRect(BD_FX + 4.5, BD_SOL - BD_FH - 22, 9, 14, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = P; ctx.beginPath(); ctx.roundRect(BD_FX + 4.5, BD_SOL - BD_FH - 15, 9, 7, [0, 0, 3, 3]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = O; ctx.fillRect(BD_FX - 4.5, BD_SOL - BD_FH - 2, 9, 4); trait(ctx, 1.6); ctx.strokeRect(BD_FX - 4.5, BD_SOL - BD_FH - 2, 9, 4);   // la bande du filet
      }
      // Les trois boutons : toute la colonne au-dessus de chacun répond aussi.
      function boutons() {
        const b = s.v, vient = s.phase === "jeu" && b && b.de === 1 && !b.mort, haut = vient && s.prevu && s.prevu.xs !== null, service = s.phase === "service" && s.t < duree;
        for (let i = 0; i < 3; i++) {
          const x = 6 + i * 117, vif = s.t - appuiT[i] < 0.14, actif = service || (i < 2 ? vient : haut);
          ctx.fillStyle = "rgba(20,60,45,.35)"; ctx.beginPath(); ctx.roundRect(x, 383, 114, 52, 13); ctx.fill();
          trait(ctx, 2.4); ctx.fillStyle = vif ? Y : i === 2 ? (actif ? O : "#F6D9C6") : C; ctx.globalAlpha = actif || vif ? 1 : 0.8;
          ctx.beginPath(); ctx.roundRect(x, vif ? 382 : 380, 114, 52, 13); ctx.fill(); ctx.stroke();
          const y = (vif ? 382 : 380) + 26, coul = i === 2 && actif && !vif ? C : N;
          // Le pictogramme : la trajectoire du coup par-dessus le filet.
          ctx.strokeStyle = coul; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.beginPath();
          const px = x + 22;
          if (i === 0) { ctx.moveTo(px - 11, y + 2); ctx.quadraticCurveTo(px - 1, y - 12, px + 5, y + 7); }
          else if (i === 1) { ctx.moveTo(px - 12, y + 6); ctx.quadraticCurveTo(px + 6, y - 26, px + 12, y + 7); }
          else { ctx.moveTo(px - 12, y - 9); ctx.lineTo(px + 10, y + 7); ctx.moveTo(px + 10, y + 7); ctx.lineTo(px + 3, y + 6); ctx.moveTo(px + 10, y + 7); ctx.lineTo(px + 8, y); }
          ctx.stroke(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, y + 8); ctx.lineTo(px, y - 1); ctx.stroke();
          texte(ctx, service ? (i ? "LONG" : "COURT") : NOMS[i], x + 70, y - (tactile ? 0 : 6), service ? 13 : 14, coul);
          if (service) texte(ctx, "service", x + 70, y - (tactile ? 13 : 19), 8.5, coul);
          if (!tactile) texte(ctx, ["←  ou 1", "↑  ou 2", "→  ou 3"][i], x + 70, y + 10, 9.5, coul);
          ctx.globalAlpha = 1;
        }
      }
      function dessiner() {
        decor();
        const b = s.v, vient = s.phase === "jeu" && b && b.de === 1 && !b.mort;
        // Les deux zones de frappe du joueur : le tamis (frappe ordinaire) et, quand le volant arrive haut, la zone de smash au-dessus.
        if (vient && !clos) {
          const hx = s.cible + BD_MAIN, qn = qualiteBadminton(s.x + BD_MAIN, "amorti", b), qs = qualiteBadminton(s.x + BD_MAIN, "smash", b);
          if (s.prevu && s.prevu.xs !== null) { ctx.strokeStyle = qs > 0 ? O : "rgba(236,119,57,.6)"; ctx.lineWidth = qs > 0 ? 3 : 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(hx, BD_SOL - RBD.hs, 12, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); texte(ctx, "SMASH", hx, BD_SOL - RBD.hs - 19, 8.5, O); }
          ctx.strokeStyle = qn > 0 ? N : "rgba(38,7,109,.3)"; ctx.lineWidth = qn > 0 ? 3 : 2; ctx.beginPath(); ctx.arc(hx, BD_SOL - RBD.hn, 14, 0, 6.3); ctx.stroke();
        }
        automate(); preparateur();
        // Le volant : son ombre au sol, sa traînée, puis lui, le bouchon en avant.
        if (b) {
          const k = Math.max(0.35, 1 - (BD_SOL - b.y) / 420);
          ctx.fillStyle = OMBRE; ctx.beginPath(); ctx.ellipse(b.x, BD_SOL + 3, 8 * k, 2.6 * k, 0, 0, 6.3); ctx.fill();
          if (!calme && !b.mort) for (let i = 0; i < trace.length; i++) { ctx.fillStyle = "rgba(38,7,109," + (0.05 + 0.03 * i) + ")"; ctx.beginPath(); ctx.arc(trace[i][0], trace[i][1], 2 + i * 0.4, 0, 6.3); ctx.fill(); }
          volant(b.x, b.mort ? BD_SOL - 4 : b.y, b.mort ? (b.de ? Math.PI * 0.9 : 0.3) : Math.atan2(b.vy, b.vx), 1);
        } else if (s.phase === "service" && !clos) volant(s.x + BD_MAIN + 13, BD_SOL - 30, -1.2, 1);
        // L'éclat de la frappe et son appréciation.
        const im = s.impact;
        if (im && s.t - im.t < 0.5) {
          const u = (s.t - im.t) / 0.5;
          if (!calme) { ctx.globalAlpha = 1 - u; ctx.strokeStyle = im.type === "smash" ? O : im.grade === 2 ? Y : N; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(im.x, im.y, 8 + u * 20, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
          if (!im.qui && im.grade >= 0) { const t = ["Limite", "Bien", "Parfait !"][im.grade], y = Math.max(60, im.y - 30 - (calme ? 0 : u * 10)); ctx.fillStyle = im.grade === 2 ? N : "rgba(38,7,109,.82)"; ctx.beginPath(); ctx.roundRect(borne(im.x, 40, W - 40) - 36, y - 10, 72, 20, 10); ctx.fill(); texte(ctx, t, borne(im.x, 40, W - 40), y + 0.5, 11.5, im.grade === 2 ? Y : C); }
        }
        // L'annonce du point, la consigne du service.
        if (!clos && s.t - s.msgT < 1.1 && s.msg) {
          ctx.font = "800 15px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; const l = Math.min(330, ctx.measureText(s.msg).width + 34);
          ctx.fillStyle = s.bon ? N : "rgba(216,64,43,.94)"; ctx.beginPath(); ctx.roundRect(180 - l / 2, 222, l, 32, 16); ctx.fill();
          texte(ctx, s.msg, 180, 238.5, 15, s.bon ? Y : C);
        } else if (!clos && s.phase === "service" && s.t < duree) {
          ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(30, 222, 300, s.services ? 32 : 50, 16); ctx.fill();
          texte(ctx, "À vous de servir : choisissez un coup", 180, 238.5, 13.5, Y);
          if (!s.services) texte(ctx, "Ensuite, frappez quand le volant arrive sur le tamis", 180, 258, 10.5, C);
        }
        bandeau(ctx, "Vous " + s.pour + " · Automate " + s.contre + " · " + s.points + " pts", duree - s.t, duree);
        boutons();
        if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(70, 196, 220, 44, 22); ctx.fill(); texte(ctx, "Fin de la séance !", 180, 219, 18, Y); }
      }
      const arret = boucle(dt => {
        if (!clos) {
          xAvant = s.x;
          pasBadminton(s, dt, duree);
          pasJ += Math.abs(s.x - xAvant) * 0.22;
          const b = s.v; if (b && !b.mort && s.phase === "jeu") { trace.push([b.x, b.y]); if (trace.length > 5) trace.shift(); } else trace.length = 0;
          if (s.fini) {
            clos = true;
            const n = noteBadminton(s), brut = brutBadminton(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un), joues = s.pour + s.contre;
            const bilan = joues ? pl(s.pour, "échange gagné", "échanges gagnés") + " sur " + joues + ", " + pl(s.frappes, "frappe renvoyée", "frappes renvoyées") + (s.parfaites ? " dont " + pl(s.parfaites, "parfaite", "parfaites") : "") + (s.smashs ? ", " + pl(s.smashs, "smash gagnant", "smashs gagnants") : "") + "." : "Le volant n'a pas quitté la paillasse : pas de service, pas de point.";
            // Les quatre chiffres du tableau final commun : points, échanges gagnés sur échanges joués, frappes parfaites, smashs gagnants.
            const chiffres = [[brut, brut > 1 ? "points" : "point"], [s.pour + "/" + joues, s.pour > 1 ? "échanges gagnés" : "échange gagné"], [s.parfaites, s.parfaites > 1 ? "frappes parfaites" : "frappe parfaite"], [s.smashs, s.smashs > 1 ? "smashs gagnants" : "smash gagnant"]];
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, brut, chiffres); }, 1100);
          }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.badminton = badminton;
    Object.assign(api._coeur, { REGL_BADMINTON: RBD, BD: { PAS: BD_PAS, SOL: BD_SOL, G: BD_G, D: BD_D, FX: BD_FX, FH: BD_FH, MAIN: BD_MAIN }, creerBadminton, pasBadminton, frapperBadminton, noteBadminton, brutBadminton, qualiteBadminton, prevoirVolant, chuteVolant, volVolant });
  }
  /* ----- Fin [badminton] ----- */

  /* ----- Tableau final commun ----- */
  // À la fin de chaque jeu, avant de rendre la main : la note en grand au cœur du logo de l'unité, et les chiffres de la partie.
  // Le jeu appelle onFin(note, bilan, brut, chiffres) comme avant ; le tableau s'affiche par-dessus, puis onFin est transmis.
  // `chiffres` (facultatif) : [[valeur, libellé], …], quatre au plus. Sans lui, ils sont tirés du score brut.
  // Un jeu qui dessine déjà ce tableau lui-même se déclare dans SANS_TABLEAU. Un toucher ou une touche abrège l'attente.
  {
    const SANS_TABLEAU = { twirling: 1 }, DUREE_TABLEAU = 3200;
    const pts = b => [[b, b > 1 ? "points" : "point"]];
    const echanges = b => [[b % 100, b % 100 > 1 ? "points gagnés" : "point gagné"], [Math.floor(b / 100) + " %", "des échanges"]];
    const CHIFFRES = {
      bowling: b => [[b, b > 1 ? "flacons renversés" : "flacon renversé"]],
      tir: b => [[b, b > 1 ? "particules neutralisées" : "particule neutralisée"]],
      tennis: echanges, volley: echanges,
      haies: b => [[String(Math.round(b) / 10).replace(".", ",") + " m", "d'avance"]],
      penalty: (b, n) => [[n, n > 1 ? "buts" : "but"]],
    };
    const STYLE = ".pj-fin{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:14px 12px;box-sizing:border-box;background:rgba(38,7,109,.86);border-radius:inherit;color:#FFFBF2;text-align:center;overflow:hidden;cursor:pointer;container-type:size;animation:pj-fin-in .35s ease-out both}"
      + ".pj-fin-logo{position:relative;width:min(62%,250px);width:min(62cqw,52cqh,250px);aspect-ratio:1;border-radius:50%;background:#FFFBF2;flex:none;animation:pj-fin-pop .5s cubic-bezier(.3,1.5,.5,1) both}"
      + ".pj-fin-logo img{position:absolute;inset:1.5%;width:97%;height:97%;object-fit:contain;animation:pj-fin-tourne 6s ease-in-out infinite alternate}"
      + ".pj-fin-note{position:absolute;left:50%;top:50%;width:48%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:#26076D;border:4px solid #EBD56B;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#EBD56B;font-weight:800;line-height:1}"
      + ".pj-fin-note b{font-size:clamp(2.2rem,15vw,3.9rem);font-size:clamp(1.5rem,min(15cqw,13cqh),3.9rem)}.pj-fin-note small{font-size:clamp(.8rem,4.6vw,1.2rem);font-size:clamp(.7rem,min(4.6cqw,4cqh),1.2rem);color:#FFFBF2;align-self:flex-end;margin:0 0 20% 3px}"
      + ".pj-fin-ch{display:flex;width:100%;max-width:340px;background:#FFFBF2;color:#26076D;border:3px solid #26076D;border-radius:16px;box-sizing:border-box;flex:none}"
      + ".pj-fin-ch span{flex:1;min-width:0;padding:8px 4px;display:flex;flex-direction:column;gap:2px}.pj-fin-ch span+span{border-left:1.5px solid rgba(38,7,109,.18)}"
      + ".pj-fin-ch b{font-size:1.25rem;font-size:clamp(.95rem,5.6cqw,1.25rem);font-weight:800;line-height:1.1;white-space:nowrap}.pj-fin-ch small{font-size:.7rem;font-size:clamp(.58rem,3.3cqw,.7rem);line-height:1.15;opacity:.75;overflow-wrap:anywhere;hyphens:auto}"
      + ".pj-fin-bilan{margin:0;max-width:340px;font-size:.82rem;line-height:1.3;color:#EBD56B;font-weight:700;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}"
      + "@keyframes pj-fin-in{from{opacity:0}}@keyframes pj-fin-pop{from{transform:scale(.6)}}@keyframes pj-fin-tourne{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}"
      + "@container (max-height:300px){.pj-fin{gap:6px;padding:8px}.pj-fin-ch span{padding:4px}.pj-fin-bilan{-webkit-line-clamp:2;font-size:.74rem}}@media (prefers-reduced-motion:reduce){.pj-fin,.pj-fin-logo,.pj-fin-logo img{animation:none}}";
    const tableauFinal = (el, nom, note, bilan, brut, chiffres, suite) => {
      const doc = el.ownerDocument;
      if (!doc.getElementById("pj-fin-style")) { const st = doc.createElement("style"); st.id = "pj-fin-style"; st.textContent = STYLE; doc.head.appendChild(st); }
      let L = Array.isArray(chiffres) && chiffres.length ? chiffres : Number.isFinite(brut) ? (CHIFFRES[nom] || pts)(brut, note) : [];
      L = L.filter(c => Array.isArray(c) && c.length === 2).slice(0, 4);
      const avant = el.style.position, pose = getComputedStyle(el).position === "static";
      if (pose) el.style.position = "relative";
      const d = doc.createElement("div"), mk = (t, c, txt) => { const x = doc.createElement(t); if (c) x.className = c; if (txt !== undefined) x.textContent = txt; return x; };
      d.className = "pj-fin"; d.setAttribute("role", "status"); d.tabIndex = 0;
      const logo = mk("div", "pj-fin-logo"), img = doc.createElement("img"), rond = mk("div", "pj-fin-note");
      img.alt = ""; img.src = api._logo; img.onerror = () => img.remove();
      rond.append(mk("b", "", String(note)), mk("small", "", "/10")); logo.append(img, rond); d.append(logo);
      if (L.length) { const r = mk("div", "pj-fin-ch"); L.forEach(c => { const x = mk("span"); x.append(mk("b", "", String(c[0])), mk("small", "", String(c[1]))); r.append(x); }); d.append(r); }
      if (bilan) d.append(mk("p", "pj-fin-bilan", String(bilan)));
      el.appendChild(d);
      let fait = false;
      const fermer = appeler => {
        if (fait) return; fait = true;
        clearTimeout(minuterie); doc.removeEventListener("keydown", touche, true);
        d.remove(); if (pose) el.style.position = avant;
        if (appeler) suite();
      };
      const touche = e => { if (e.key === " " || e.key === "Enter" || e.key === "Escape") { e.preventDefault(); fermer(true); } };
      const minuterie = setTimeout(() => fermer(true), DUREE_TABLEAU);
      const pret = performance.now();
      d.addEventListener("click", () => { if (performance.now() - pret > 500) fermer(true); });   // pas d'abandon par un geste de jeu encore en cours
      setTimeout(() => { if (!fait) doc.addEventListener("keydown", touche, true); }, 500);
      return () => fermer(false);
    };
    for (const nom of Object.keys(api)) {
      const jeu = api[nom];
      if (nom[0] === "_" || typeof jeu !== "function" || SANS_TABLEAU[nom]) continue;
      api[nom] = (el, opt) => {
        let fermerTableau = null, arrete = false;
        const stop = jeu(el, Object.assign({}, opt, { onFin: (note, bilan, brut, chiffres) => {
          if (arrete || !opt || !opt.onFin) return;
          fermerTableau = tableauFinal(el, nom, note, bilan, brut, chiffres, () => { fermerTableau = null; if (!arrete) opt.onFin(note, bilan, brut); });
        } }));
        return () => { arrete = true; if (fermerTableau) fermerTableau(); if (typeof stop === "function") stop(); };
      };
    }
    api._tableauFinal = tableauFinal;
  }
  /* ----- Fin du tableau final commun ----- */

  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PharmacoJeux = api;
})(typeof window !== "undefined" ? window : globalThis);
