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
  const RB = 15, RQ = 11, RS = 7, GAUCHE = 46, DROITE = 314, DEPART = 552, HB = 600; // HB : hauteur propre au bowling, la paillasse est plus longue que le repère commun
  // Réglages étalonnés par simulation (voir le banc d'essai) : ils fixent la difficulté.
  const REGL = { elan: 180, frein: 5, relais: 0.55, seuil: 60, cadence: 0.4, vitesse: 280, chute: 85, acc: 3, pas: 0.9, portee: 2, sy: 390, sl: 40, sv: 2.4 };
  const PLACES = (() => { const q = []; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) q.push({ x: 180 + (i - r / 2) * 37, y: 206 - r * 32 }); return q; })();
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
    return { t: 0, acc: 0, x: 180, cible: 180, ax: 180, avise: 180, balle: null, attente: 1.2, vers: 1, pour: 0, contre: 0, echange: 0, record: 0, tape: [-9, -9], msg: "", msgT: -9, h, fini: false };
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
    if (sens < 0) automateVise(s, b);
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
        s.balle = { x: 180, y: 261, vx: Math.sin(a) * RT.v0, vy: s.vers * Math.cos(a) * RT.v0, tour: 0 }; s.echange = 0;
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
    return { t: 0, x: 180, cible: 180, tirs: [], germes: [], file: pluie(), suivant: 0, recharge: 0, touches: 0, rates: 0, eclats: [], fini: false };
  }
  function pasTir(s, dt, duree) {
    s.t += dt;
    const dx = s.cible - s.x, vmax = REGL.vitesse * dt;
    s.x += Math.max(-vmax, Math.min(vmax, dx));
    s.recharge -= dt;
    if (s.recharge <= 0) { s.tirs.push({ x: s.x, y: 408 }); s.recharge = REGL.cadence; }
    while (s.suivant < s.file.length && s.file[s.suivant].t <= s.t) { const g = s.file[s.suivant++]; s.germes.push({ x0: g.x, x: g.x, y: -20, r: g.r, amp: g.amp, ph: g.ph, k: g.k, v: REGL.chute + s.t * REGL.acc }); }
    for (const t of s.tirs) t.y -= 520 * dt;
    s.tirs = s.tirs.filter(t => t.y > -10);
    for (const g of s.germes) {
      g.y += g.v * dt;
      g.x = Math.max(g.r + 20, Math.min(W - g.r - 20, g.x0 + Math.sin(g.ph + g.y / 34) * g.amp));
      for (const t of s.tirs) if (!t.mort && Math.hypot(t.x - g.x, t.y - g.y) < g.r + REGL.portee) { t.mort = g.mort = true; s.touches++; s.eclats.push({ x: g.x, y: g.y, t: 0, k: g.k }); break; }
      if (!g.mort && g.y > 446) { g.mort = true; s.rates++; s.eclats.push({ x: g.x, y: 452, t: 0, k: -1 }); }
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
  const RF = { g: 820, vmax: 960, monte: 20, descend: 14, repos: 0.5, leve: -0.5, long: 62, kick: 400, bouchon: 10, etiquette: 25, deja: 5, lot: 150, relance: 2, perte: 30, palier: 100, delai: 1.2 };
  const F_PAS = 1 / 240, F_RB = 8, F_EP = 5;
  const F_MURS = [[10, 330, 10, 110], [10, 110, 70, 49], [70, 49, 290, 49], [290, 49, 350, 110], [350, 110, 350, 330], [10, 330, 104, 408], [350, 330, 256, 408], [104, 408, 120, 480], [256, 408, 240, 480]];
  const F_BOUCHONS = [{ x: 112, y: 160, r: 19 }, { x: 248, y: 160, r: 19 }, { x: 180, y: 238, r: 19 }];
  const F_ETIQ = [[17, 165, 17, 197], [17, 232, 17, 264], [164, 57, 196, 57], [343, 165, 343, 197], [343, 232, 343, 264]];
  const F_PIVOTS = [{ x: 108, y: 414, sens: 1 }, { x: 252, y: 414, sens: -1 }];
  const boutBatteur = (i, ang) => { const p = F_PIVOTS[i]; return [p.x + p.sens * Math.cos(ang) * RF.long, p.y + Math.sin(ang) * RF.long]; };
  // Une partie : g et d disent si les batteurs gauche et droit sont tenus levés.
  function creerFlipper(graine) {
    let a = graine || 20261207;
    const h = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return { t: 0, acc: 0, score: 0, pertes: 0, lots: 0, coups: 0, lancers: 0, lot: F_ETIQ.map(() => false), tape: F_BOUCHONS.map(() => -9), bille: null, attente: 0.9, g: false, d: false, ang: [RF.repos, RF.repos], vit: [0, 0], calme: 0, msg: "", msgT: -9, serie: 0, serieT: -9, choc: null, h, fini: false };
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
  function marquer(s, x, y) { s.serie = s.t - s.serieT < RF.delai ? s.serie + 1 : 1; s.serieT = s.t; s.choc = { x, y, n: s.serie }; }
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
      if (s.attente <= 0) { const k = s.lancers++ % 2 ? -1 : 1; s.bille = { x: 180 - k * (136 + s.h() * 10), y: 104, vx: k * (12 + s.h() * 40), vy: 0 }; s.calme = 0; }
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
    if (b.y < 330) b.x = Math.max(10 + F_RB, Math.min(350 - F_RB, b.x));   // filet de sécurité : jamais hors des parois
    if (b.y < 49 + F_RB) { b.y = 49 + F_RB; if (b.vy < 0) b.vy = -b.vy * 0.45; }
    const v = Math.hypot(b.vx, b.vy);
    if (v > RF.vmax) { b.vx *= RF.vmax / v; b.vy *= RF.vmax / v; }
    // Déblocage : une bille immobile ailleurs que sur un batteur tenu levé reçoit un coup de pouce.
    s.calme = v < 30 && !tenue ? s.calme + dt : 0;
    if (s.calme > 1.2) { b.vx = (s.h() - 0.5) * 300; b.vy = -330; s.calme = 0; s.coups++; }
    if (b.y > 496) { s.bille = null; s.pertes++; s.attente = RF.relance; s.score = Math.max(0, s.score - RF.perte); s.lot = s.lot.map(() => false); s.serie = 0; s.msg = "Bille perdue : -" + RF.perte; s.msgT = s.t; }
    else if (!(b.x > -20 && b.x < W + 20 && b.y > 0)) { s.bille = null; s.attente = 0.3; }                   // ne devrait pas arriver
  }
  // Pas fixe : quel que soit le rythme d'affichage, la physique avance par tranches de 1/240 s.
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
    // L'écran suspendu : une case par série (les deux tirs, puis le cumul), et le total.
    function ecran() {
      const y0 = 43, h = 46, lc = 54, x0 = 12;
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x0 - 4, y0 - 2, W - 2 * x0 + 8, h + 4, 8); ctx.fill();
      let cumul = 0;
      for (let i = 0; i < SERIES; i++) {
        const x = x0 + i * lc, f = feuille[i] || [], actif = i === serie - 1 && phase !== "fin";
        ctx.fillStyle = actif ? "rgba(236,213,103,.22)" : "rgba(255,251,242,.08)"; ctx.beginPath(); ctx.roundRect(x + 2, y0 + 2, lc - 4, h - 4, 5); ctx.fill();
        if (actif) { ctx.strokeStyle = Y; ctx.lineWidth = 1.5; ctx.stroke(); }
        const m1 = f[0] == null ? "" : f[0] === 10 ? "X" : f[0] || "–", m2 = f[1] == null ? "" : f[0] + f[1] === 10 ? "/" : f[1] || "–";
        texte(ctx, m1, x + lc / 2 - 11, y0 + 14, 13, f[0] === 10 ? O : C); texte(ctx, m2, x + lc / 2 + 11, y0 + 14, 13, m2 === "/" ? O : C);
        if (f.length) { cumul += f[0] + (f[1] || 0); texte(ctx, cumul, x + lc / 2, y0 + 33, 15, Y); }
      }
      const xt = x0 + SERIES * lc;
      ctx.fillStyle = Y; ctx.beginPath(); ctx.roundRect(xt + 2, y0 + 2, W - x0 - xt - 4, h - 4, 5); ctx.fill();
      texte(ctx, "TOTAL", xt + (W - x0 - xt) / 2, y0 + 13, 10, N); texte(ctx, total, xt + (W - x0 - xt) / 2, y0 + 31, 18, N);
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
    function finir() {
      if (clos) return;
      clos = true; phase = "fin";
      setTimeout(() => { arret(); liberer(); opt.onFin(noteBowling(total), total === 10 * SERIES ? "Lot parfait : les " + total + " flacons sont tombés." : total + (total > 1 ? " flacons renversés" : " flacon renversé") + " sur " + 10 * SERIES + ".", total); }, 1100);
    }
    function dessiner() {
      ctx.fillStyle = "#F4F2F8"; ctx.fillRect(0, 0, W, HB);
      ctx.fillStyle = "#D8D3E3"; ctx.fillRect(0, 39, GAUCHE - 16, HB); ctx.fillRect(DROITE + 16, 39, W, HB); // bords
      ctx.fillStyle = N; ctx.fillRect(GAUCHE - 16, 39, 16, HB); ctx.fillRect(DROITE, 39, 16, HB);              // rigoles
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(GAUCHE, 39, DROITE - GAUCHE, HB);                                // paillasse
      ctx.strokeStyle = "rgba(38,7,109,.12)"; ctx.lineWidth = 2;
      for (let x = GAUCHE + 38; x < DROITE; x += 38) { ctx.beginPath(); ctx.moveTo(x, 39); ctx.lineTo(x, HB); ctx.stroke(); }
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
      bandeau(ctx, "Série " + serie + "/" + SERIES + " · tir " + lancerN + "/2", reste, duree);
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
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(T_G, T_HAUT, T_D - T_G, H - T_HAUT);                          // la paillasse
      ctx.fillStyle = "rgba(143,199,232,.35)"; ctx.fillRect(T_G, T_HAUT, T_D - T_G, 22);                     // derrière l'automate : la libération
      ctx.fillStyle = "rgba(216,64,43,.16)"; ctx.fillRect(T_G, H - 20, T_D - T_G, 20);                       // derrière le joueur : la quarantaine
      texte(ctx, "LIBÉRATION", 180, T_HAUT + 12, 10, "rgba(38,7,109,.5)"); texte(ctx, "QUARANTAINE", 180, H - 9, 10, "rgba(38,7,109,.5)");
      ctx.strokeStyle = "rgba(38,7,109,.09)"; ctx.lineWidth = 2;
      for (let x = T_G + 41.5; x < T_D - 10; x += 41.5) { ctx.beginPath(); ctx.moveTo(x, T_HAUT + 22); ctx.lineTo(x, H - 20); ctx.stroke(); }
      // Le filet : une réglette graduée posée en travers.
      trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.rect(T_G, 255, T_D - T_G, 12); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 1; i * 8 < T_D - T_G; i++) { ctx.moveTo(T_G + i * 8, 255); ctx.lineTo(T_G + i * 8, i % 5 ? 259 : 263); }
      ctx.stroke();
      // Le score, sur le côté du terrain : celui de l'automate au-dessus de la réglette, le vôtre en dessous.
      texte(ctx, "AUTOMATE", T_G + 8, 222, 9, "rgba(38,7,109,.5)", "left"); texte(ctx, String(s.contre), T_G + 8, 239, 22, "rgba(38,7,109,.75)", "left");
      texte(ctx, String(s.pour), T_G + 8, 284, 22, "rgba(38,7,109,.75)", "left"); texte(ctx, "VOUS", T_G + 8, 301, 9, "rgba(38,7,109,.5)", "left");
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, joues ? Math.round(100 * s.pour / joues) * 100 + Math.min(99, s.pour) : 0); }, 1300);
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
    const s = creerTir();
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
    function dessiner() {
      ctx.fillStyle = "#EDEAF6"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(38,7,109,.08)"; ctx.lineWidth = 2;                 // le flux laminaire
      for (let x = 30; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 39); ctx.lineTo(x, 452); ctx.stroke(); }
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(0, 452, W, H - 452);              // le plan de travail
      ctx.strokeStyle = N; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 452); ctx.lineTo(W, 452); ctx.stroke();
      for (const t of s.tirs) { ctx.fillStyle = B; trait(ctx, 2); ctx.beginPath(); ctx.moveTo(t.x, t.y - 8); ctx.quadraticCurveTo(t.x + 5, t.y, t.x, t.y + 4); ctx.quadraticCurveTo(t.x - 5, t.y, t.x, t.y - 8); ctx.fill(); ctx.stroke(); }
      for (const g of s.germes) germe(g);
      for (const e of s.eclats) { const k = e.t / 0.45; ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.k < 0 ? R : Y; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 8 + k * 22, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
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
        if (s.fini) { clos = true; setTimeout(() => { arret(); liberer(); opt.onFin(noteTir(s), s.touches + " particules neutralisées sur " + TOTAL + ".", s.touches); }, 1300); }
      }
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
    const duree = opt.duree || 60, { cv, ctx, xDe, liberer } = monter(el, H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le flipper du préparatoire. Batteur gauche : flèche gauche, touche S ou moitié gauche de l'écran. Batteur droit : flèche droite, touche L ou moitié droite.");
    const s = creerFlipper(), media = q => typeof matchMedia === "function" && matchMedia(q).matches, tactile = media("(pointer: coarse)"), calme = media("(prefers-reduced-motion: reduce)");
    const logo = new Image(); logo.src = api._logo;
    let clos = false, minuterie = 0, tFin = 0, affiche = 0, vu = null, secousse = 0, eclair = 0;
    const etincelles = [], bulles = [];
    const doigts = new Map(), touches = { g: false, d: false };
    const maj = () => { let g = touches.g, d = touches.d; doigts.forEach(c => { if (c === "g") g = true; else d = true; }); s.g = g; s.d = d; };
    const appui = e => { e.preventDefault(); cv.focus({ preventScroll: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) { } doigts.set(e.pointerId, xDe(e) < W / 2 ? "g" : "d"); maj(); };
    const relache = e => { doigts.delete(e.pointerId); maj(); };
    const cote = e => { const k = e.key; return k === "ArrowLeft" || k === "s" || k === "S" ? "g" : k === "ArrowRight" || k === "l" || k === "L" ? "d" : null; };
    const enfonce = e => { const c = cote(e); if (!c || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName || "")) return; e.preventDefault(); touches[c] = true; maj(); };
    const leve = e => { const c = cote(e); if (c) { touches[c] = false; maj(); } };
    const lache = () => { doigts.clear(); touches.g = touches.d = false; maj(); };
    const menu = e => e.preventDefault();
    cv.addEventListener("pointerdown", appui); cv.addEventListener("pointerup", relache); cv.addEventListener("pointercancel", relache); cv.addEventListener("contextmenu", menu);
    window.addEventListener("keydown", enfonce); window.addEventListener("keyup", leve); window.addEventListener("blur", lache);
    const retirer = () => {
      cv.removeEventListener("pointerdown", appui); cv.removeEventListener("pointerup", relache); cv.removeEventListener("pointercancel", relache); cv.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", enfonce); window.removeEventListener("keyup", leve); window.removeEventListener("blur", lache);
    };
    const COUL = [O, P, V], FETE = [O, Y, P, V, C];
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
      else if (s.t - s.msgT < 1.5) { msg = s.msg.toUpperCase(); coul = s.msg.indexOf("perdue") > 0 ? O : G; clign = true; }
      else if (enSerie()) { msg = (s.serie >= 8 ? "CADENCE DE PROD ×" : s.serie >= 5 ? "BELLE SÉRIE ×" : "COMBO ×") + s.serie; coul = FETE[s.serie % 4]; dx = calme ? 0 : Math.sin(s.t * 30) * 1.5; }
      else {
        const tour = ["NOTE " + noteFlipper(s) + "/10", "LOT " + s.lot.filter(Boolean).length + "/5", "PHARMACOGAMES"], k = s.t / 2.6, f = k % 1;
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
      const n = noteFlipper(s), cx = 180, cy = 252, tons = [N, Y, O, P, N, Y, P, O, N, O, Y, P];
      ctx.fillStyle = "rgba(38,7,109,.55)"; ctx.fillRect(0, 47, W, H - 47);
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
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(90, 392, 180, 30, 15); ctx.fill();
      texte(ctx, s.score + (s.score > 1 ? " points" : " point") + " au compteur", 180, 408, 14, Y);
    }
    function dessiner() {
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (secousse > 0) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
      // Le plateau : une paillasse, avec le bac de rebut en bas.
      ctx.fillStyle = "#F7E7B8"; ctx.beginPath();
      [[10, 110], [70, 49], [290, 49], [350, 110], [350, 330], [256, 408], [240, H], [120, H], [104, 408], [10, 330]].forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(38,7,109,.09)"; ctx.lineWidth = 2;
      for (let y = 90; y < 400; y += 40) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(346, y); ctx.stroke(); }
      ctx.fillStyle = "rgba(38,7,109,.16)"; ctx.fillRect(120, 462, 120, 18);
      texte(ctx, "REBUT", 180, 472, 11, "rgba(38,7,109,.55)");
      texte(ctx, "LOT", 180, 92, 13, "rgba(38,7,109,.4)");
      s.lot.forEach((v, i) => { ctx.fillStyle = v ? G : "rgba(38,7,109,.18)"; ctx.beginPath(); ctx.arc(148 + i * 16, 110, 5, 0, 6.3); ctx.fill(); });
      // Les deux distributeurs de billes.
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(28, 84, 26, 9, 3); ctx.roundRect(306, 84, 26, 9, 3); ctx.fill();
      trait(ctx, 5); if (eclair > 0) ctx.strokeStyle = FETE[Math.floor(s.t * 14) % 4]; ctx.beginPath();
      F_MURS.forEach(m => { ctx.moveTo(m[0], m[1]); ctx.lineTo(m[2], m[3]); }); ctx.stroke();
      // Les étiquettes : blanches, puis vertes une fois collées.
      F_ETIQ.forEach((m, i) => {
        const hz = m[1] === m[3];
        trait(ctx, 2); ctx.fillStyle = s.lot[i] ? G : C; ctx.beginPath();
        if (hz) ctx.roundRect(m[0] - 3, m[1] - 4, m[2] - m[0] + 6, 8, 3); else ctx.roundRect(m[0] - 4, m[1] - 3, 8, m[3] - m[1] + 6, 3);
        ctx.fill(); ctx.stroke();
      });
      // Les bouchons : ils renvoient la bille, et portent le logo de la pharmacotechnie.
      F_BOUCHONS.forEach((o, i) => {
        const k = Math.max(0, 1 - (s.t - s.tape[i]) / 0.3), r = o.r + k * 3, ri = r - 4;
        trait(ctx, 3); ctx.fillStyle = k > 0 ? Y : COUL[i]; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y, ri, 0, 6.3); ctx.fill(); ctx.stroke();
        if (logo.complete && logo.naturalWidth) {
          ctx.save(); ctx.translate(o.x, o.y); if (!calme) ctx.rotate(k * k * (i % 2 ? -1.6 : 1.6));
          ctx.beginPath(); ctx.arc(0, 0, ri - 1, 0, 6.3); ctx.clip(); ctx.drawImage(logo, -ri + 0.5, -ri + 0.5, ri * 2 - 1, ri * 2 - 1); ctx.restore();
        } else texte(ctx, "P", o.x, o.y + 1, 20, N);
      });
      // Les batteurs.
      for (let i = 0; i < 2; i++) {
        const p = F_PIVOTS[i], bout = boutBatteur(i, s.ang[i]);
        ctx.lineCap = "round"; ctx.strokeStyle = N; ctx.lineWidth = F_EP * 2 + 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(bout[0], bout[1]); ctx.stroke();
        ctx.strokeStyle = O; ctx.lineWidth = F_EP * 2 - 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(bout[0], bout[1]); ctx.stroke();
        ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill();
      }
      for (const e of etincelles) { ctx.globalAlpha = 1 - e.t / 0.55; ctx.fillStyle = e.c; ctx.strokeStyle = N; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(e.x, e.y, 3.2 - e.t * 3, 0, 6.3); ctx.fill(); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (const b of bulles) {
        const u = b.t / 0.9, px = Math.min(30, 15 + b.n * 1.6) * (u < 0.15 ? 0.6 + u / 0.15 * 0.6 : 1.2 - Math.min(0.2, (u - 0.15) * 0.8));
        if (b.onde) { ctx.globalAlpha = 1 - u; ctx.strokeStyle = FETE[b.n % 4]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(b.x, b.y, 12 + u * 70, 0, 6.3); ctx.stroke(); }
        ctx.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
        ctx.font = "800 " + px + "px 'Bricolage Grotesque','Trebuchet MS',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
        ctx.strokeStyle = N; ctx.lineWidth = 5; ctx.strokeText("×" + b.n, b.x, b.y - 18 - u * 26); ctx.fillStyle = FETE[b.n % 4]; ctx.fillText("×" + b.n, b.x, b.y - 18 - u * 26);
      }
      ctx.globalAlpha = 1;
      if (s.bille) {
        const b = s.bille;
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(b.x, b.y, F_RB, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = B; ctx.beginPath(); ctx.arc(b.x - 2.5, b.y - 2.5, 2.6, 0, 6.3); ctx.fill();
      } else if (!clos) texte(ctx, "Nouvelle bille…", 180, 330, 14, "rgba(38,7,109,.6)");
      if (s.t < 5 && !clos) {
        ctx.globalAlpha = Math.min(1, 5 - s.t) * 0.9;
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(16, 286, 150, 28, 14); ctx.roundRect(194, 286, 150, 28, 14); ctx.fill();
        texte(ctx, tactile ? "Touchez à gauche" : "Gauche : ◀ ou S", 91, 301, 13, Y); texte(ctx, tactile ? "Touchez à droite" : "Droite : ▶ ou L", 269, 301, 13, Y);
        ctx.globalAlpha = 1;
      }
      if (!clos && s.t - s.msgT < 1) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(70, 340, 220, 40, 14); ctx.fill(); texte(ctx, s.msg, 180, 361, 17, Y); }
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, Math.round(s.score))); }, 2200);
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, s.compte)); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }

  const api = { bowling, tir, flipper, tennis, labyrinthe, _logo: ICI + "img/logo-p-verre.png", _coeur: { REGL, creerLancer, pasLancer, tombees, PLACES, DEPART, xSeringue, SERIES, noteBowling, creerTir, pasTir, noteTir, TOTAL, REGL_FLIPPER: RF, creerFlipper, pasFlipper, noteFlipper, F_PIVOTS, boutBatteur, REGL_LABY: RL, creerLaby, pasLaby, noteLaby, L_PLAN, L_DIRS, L_GERMES, L_DEPART, lOuvert, lDistances, REGL_TENNIS: RT, creerTennis, pasTennis, noteTennis, viseTennis, T_YJ } };

  /* ===== Nouveaux jeux : chacun vit en entier sous son repère (cœur, dessin, inscription), sans toucher au reste du fichier.
     Inscription : api.<nom> = <fonction> ; Object.assign(api._coeur, { … }) pour ce que les outils doivent voir. ===== */

  /* ----- Repère [basket] : le basket ----- */
  // (session « Jeu » correspondante : écrire ici, entre ce repère et le suivant)
  /* ----- Fin [basket] ----- */

  /* ----- Repère [penalty] : le penalty ----- */
  // (session « Jeu » correspondante : écrire ici, entre ce repère et le suivant)
  /* ----- Fin [penalty] ----- */

  /* ----- Repère [volley] : le volley ----- */
  // (session « Jeu » correspondante : écrire ici, entre ce repère et le suivant)
  /* ----- Fin [volley] ----- */

  /* ----- Repère [haies] : le saut de haies ----- */
  // (session « Jeu » correspondante : écrire ici, entre ce repère et le suivant)
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, s.points)); }, 1300);
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
  // (session « Jeu » correspondante : écrire ici, entre ce repère et le suivant)
  /* ----- Fin [pastilles] ----- */

  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PharmacoJeux = api;
})(typeof window !== "undefined" ? window : globalThis);
