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
  // Le basket du pilulier : on lance des comprimés, d'un geste glissé-lâché, dans un pilulier qui va et vient sur ses étagères.
  // Tout le jeu vit dans ce bloc (cœur, dessin, inscription) : aucun nom ne déborde sur les jeux voisins.
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-basket.js) : ils fixent la difficulté.
    const RBK = { g: 900, x0: 180, y0: 432, r: 9, demi: 40, dmin: 24, dd: 1.2, haut: 34, ep: 3, v0: 70, dv: 6, vmax: 130, xmin: 62, xmax: 298, rebond: 0.5, pause: 0.3, k: 5.5, vmin: 380, vlim: 960, vxlim: 460, seuils: [2, 5, 8, 11, 14, 18, 23, 29, 38, 48], tops: [184, 156, 206], etage: 4, monte: 70, vie: 4 };
    const BK_PAS = 1 / 240;
    const vitesseBasket = s => Math.min(RBK.vmax, RBK.v0 + RBK.dv * s.paniers);                      // le pilulier accélère à chaque panier
    const demiBasket = s => Math.max(RBK.dmin, RBK.demi - RBK.dd * s.paniers);                       // et rétrécit
    const etageBasket = s => Math.floor(s.paniers / RBK.etage) % RBK.tops.length;                   // et change d'étagère tous les RBK.etage paniers
    const creerBasket = () => ({ t: 0, acc: 0, px: 180, dir: 1, pvx: 0, pvy: 0, top: RBK.tops[0], balle: null, attente: 0.4, perdus: [], points: 0, paniers: 0, directs: 0, lances: 0, ev: null, evT: -9, choc: -9, fini: false });
    // Un lancer : vitesse en px/s, vy négatif = vers le haut. Refusé tant que le comprimé précédent vole, ou une fois le temps écoulé.
    const lancerBasket = (s, vx, vy, duree) => {
      if (s.balle || s.attente > 0 || s.fini || s.t >= duree) return false;
      vy = borne(vy, -RBK.vlim, -RBK.vmin); vx = borne(vx, -RBK.vxlim, RBK.vxlim);
      const v = Math.hypot(vx, vy), f = v > RBK.vlim ? RBK.vlim / v : 1;
      s.balle = { x: RBK.x0, y: RBK.y0, vx: vx * f, vy: vy * f, tour: 0, touche: false, age: 0 }; s.lances++;
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
      const b = s.balle;
      if (b) {
        b.age += dt; b.vy += RBK.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.tour += dt * b.vx / 40;
        const bas = s.top + RBK.haut;
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
          // Dans le pilulier : 3 points sans avoir touché le bord, 2 sinon.
          const pts = b.touche ? 2 : 3;
          s.paniers++; s.points += pts; if (!b.touche) s.directs++;
          s.ev = { pts, x: s.px, y: s.top }; s.evT = s.t; s.balle = null; s.attente = RBK.pause;
        } else if ((b.vy > 0 && b.y > bas + 30) || b.x < -20 || b.x > W + 20 || b.age > RBK.vie) {
          // Plus aucune chance : le comprimé finit sa chute pour le décor, et le suivant arrive.
          s.perdus.push(b); s.ev = { pts: 0, x: b.x, y: b.y }; s.evT = s.t; s.balle = null; s.attente = RBK.pause;
        }
      }
      // Fin : le temps est écoulé et le dernier comprimé lancé a fini sa course.
      if (s.t >= duree && !s.balle) s.fini = true;
    };
    // Pas fixe, comme le flipper : la physique avance par tranches de 1/240 s quel que soit le rythme d'affichage.
    const pasBasket = (s, dt, duree) => { s.acc += dt; while (s.acc >= BK_PAS && !s.fini) { s.acc -= BK_PAS; unPasBasket(s, duree); } };
    // La note : le nombre de paliers atteints. Le barème est progressif : les premiers points de note viennent vite, les derniers se méritent.
    const noteBasket = s => RBK.seuils.filter(p => s.points >= p).length;

    /* --- Dessin et commandes (navigateur seulement) --- */
    const basket = (el, opt) => {
      const duree = opt.duree || 50, { cv, ctx, liberer } = monter(el, H);
      cv.style.touchAction = "none";
      cv.setAttribute("aria-label", "Le basket du pilulier. Glissez vers le haut puis lâchez pour lancer un comprimé dans le pilulier qui se déplace. Au clavier : flèches gauche et droite pour l'angle, haut et bas pour la force, Espace pour lancer.");
      const s = creerBasket(), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      let clos = false, minuterie = 0, depart = null, vise = null, clavier = false, angle = 0, force = 780;
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
      // Un comprimé sécable.
      const comprime = (x, y, tour, alpha) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(tour); ctx.globalAlpha = alpha;
        trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, RBK.r, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-RBK.r + 3, 0); ctx.lineTo(RBK.r - 3, 0); ctx.stroke();
        ctx.restore();
      };
      const MOMENTS = ["MATIN", "MIDI", "SOIR"], TEINTES = [Y, B, P];
      function dessiner() {
        const D = demiBasket(s) + RBK.ep, e = etageBasket(s);
        ctx.fillStyle = "#EDEAF6"; ctx.fillRect(0, 0, W, H);                                         // le mur du préparatoire
        ctx.fillStyle = "#F7E7B8"; ctx.fillRect(0, 452, W, H - 452);                                 // la paillasse
        trait(ctx, 3); ctx.beginPath(); ctx.moveTo(0, 452); ctx.lineTo(W, 452); ctx.stroke();
        // Les trois étagères, au mur : celle où roule le pilulier est plus marquée.
        RBK.tops.forEach((t, i) => {
          const y = t + RBK.haut + RBK.ep + 2;
          ctx.fillStyle = i === e ? "rgba(38,7,109,.3)" : "rgba(38,7,109,.1)"; ctx.fillRect(20, y, W - 40, 4);
          texte(ctx, MOMENTS[i], 24, y + 12, 9, i === e ? "rgba(38,7,109,.55)" : "rgba(38,7,109,.25)", "left");
        });
        // Le fond du pilulier, puis le comprimé, puis la façade : le comprimé qui entre passe derrière l'étiquette.
        ctx.fillStyle = "#fff"; ctx.fillRect(s.px - D, s.top, 2 * D, RBK.haut);
        for (const q of s.perdus) comprime(q.x, q.y, q.tour, 0.45);
        if (s.balle) comprime(s.balle.x, s.balle.y, s.balle.tour, 1);
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
        const pret = !s.balle && s.attente <= 0 && s.t < duree;
        if (pret) comprime(RBK.x0, RBK.y0 - 6, 0, 1);
        // La visée : le début de la trajectoire seulement, le reste se juge à l'œil.
        if (vise && !clos) {
          ctx.fillStyle = pret ? N : "rgba(38,7,109,.3)";
          for (let i = 1; i <= 7; i++) { const t = i * 0.065; ctx.beginPath(); ctx.arc(RBK.x0 + vise.vx * t, RBK.y0 - 6 + vise.vy * t + RBK.g * t * t / 2, 3.4 - i * 0.25, 0, 6.3); ctx.fill(); }
          const f = Math.hypot(vise.vx, vise.vy) / RBK.vlim;                                         // la jauge de force
          trait(ctx, 2); ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(RBK.x0 + 30, 400, 10, 48, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = f > 0.97 ? O : G; ctx.beginPath(); ctx.roundRect(RBK.x0 + 32, 446 - 44 * f, 6, 44 * f, 3); ctx.fill();
        }
        if (depart && !clos) { ctx.strokeStyle = "rgba(38,7,109,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(depart[0], depart[1], 12, 0, 6.3); ctx.stroke(); }
        // Le résultat du dernier lancer.
        const dtE = s.t - s.evT;
        if (s.ev && dtE < 1 && !clos) {
          if (s.ev.pts) {
            if (!calme) { ctx.globalAlpha = 1 - dtE; ctx.strokeStyle = s.ev.pts === 3 ? O : G; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.ev.x, s.ev.y + 10, 20 + dtE * 46, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1; }
            const y = Math.max(62, s.ev.y - 30 - (calme ? 0 : dtE * 16));
            ctx.fillStyle = "rgba(38,7,109,.88)"; ctx.beginPath(); ctx.roundRect(borne(s.ev.x, 96, W - 96) - 92, y - 15, 184, 30, 15); ctx.fill();
            texte(ctx, s.ev.pts === 3 ? "+3 · Dose parfaite !" : "+2 · Dans le pilulier !", borne(s.ev.x, 96, W - 96), y + 1, 14, s.ev.pts === 3 ? Y : C);
          } else if (dtE < 0.7) texte(ctx, "Hors pilulier…", 180, 386, 13, "rgba(38,7,109,.55)");
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
          if (s.fini) {
            clos = true; lache(); annule();
            const n = noteBasket(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = pl(s.paniers, "panier", "paniers") + " sur " + pl(s.lances, "lancer", "lancers") + ", dont " + pl(s.directs, "direct", "directs") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (2 points le panier, 3 sans toucher le bord ; barème progressif, 10 sur 10 à partir de " + RBK.seuils[9] + " points).";
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.points); }, 1300);
          }
        }
        dessiner();
      });
      cv.focus({ preventScroll: true });
      return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
    };
    api.basket = basket;
    Object.assign(api._coeur, { REGL_BASKET: RBK, creerBasket, pasBasket, noteBasket, lancerBasket, viseBasket, vitesseBasket, etageBasket, demiBasket });
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, s.brut); }, 1300);
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
    return { t: 0, acc: 0, x: 40, y: 0, vy: 0, cible: 40, saut: 0, ax: 268, avise: 268, avu: -1, aquand: 1e9, balle: null, attente: 1.4, vers: -1, pour: 0, contre: 0, echange: 0, record: 0, dernier: -1, touches: 0, tape: [-9, -9], smashT: -9, smashs: 0, msg: "", msgT: -9, impact: null, h, fini: false };
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
    b.x = cx + nx * r; b.y = cy + ny * r; b.n++; s.tape[qui] = s.t;
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
    // Le fond : le mur carrelé de la salle, un hublot de sas et une étagère de flacons de chaque côté, et au milieu le tableau
    // d'affichage du score, en chiffres à segments (ceux du flipper).
    function decor() {
      ctx.strokeStyle = "rgba(38,7,109,.07)"; ctx.lineWidth = 2; ctx.beginPath();
      for (let y = VO_HAUT + 73; y < VO_SOL; y += 73) { ctx.moveTo(VO_G, y); ctx.lineTo(VO_D, y); }
      for (let x = VO_G + 83; x < VO_D - 10; x += 83) { ctx.moveTo(x, VO_HAUT); ctx.lineTo(x, VO_SOL); }
      ctx.stroke();
      ctx.fillStyle = "rgba(38,7,109,.1)"; ctx.fillRect(VO_G, VO_SOL - 16, VO_D - VO_G, 16);                         // la plinthe
      for (const [x, coul] of [[56, B], [304, P]]) {                                                                 // les hublots
        ctx.strokeStyle = "rgba(38,7,109,.28)"; ctx.lineWidth = 4; ctx.fillStyle = "rgba(255,251,242,.55)";
        ctx.beginPath(); ctx.arc(x, 182, 22, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = coul; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, 182, 22, 0.35, Math.PI - 0.35); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,251,242,.9)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, 182, 15, 3.5, 4.4); ctx.stroke();
      }
      ctx.globalAlpha = 0.45;                                                                                         // les étagères
      for (const x0 of [28, 276]) {
        [G, O, V].forEach((c, i) => flacon(ctx, x0 + 10 + i * 18, 262, 0, c));
        ctx.fillStyle = N; ctx.fillRect(x0, 274, 56, 4);
      }
      ctx.globalAlpha = 1;
      // Le tableau d'affichage, pendu au plafond.
      trait(ctx, 2.4); ctx.beginPath(); ctx.moveTo(122, VO_HAUT); ctx.lineTo(122, 56); ctx.moveTo(238, VO_HAUT); ctx.lineTo(238, 56); ctx.stroke();
      ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(84, 54, 192, 66, 10); ctx.fill();
      ctx.strokeStyle = Y; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(88.5, 58.5, 183, 57, 7); ctx.stroke();
      texte(ctx, "VOUS", 133, 69, 9, C); texte(ctx, "AUTOMATE", 227, 69, 9, C);
      const deux = (x, n, coul) => { const m = Math.min(99, n); chiffre(ctx, x - 18, 79, 15, 28, m > 9 ? Math.floor(m / 10) : -1, coul); chiffre(ctx, x + 3, 79, 15, 28, m % 10, coul); };
      deux(133, s.pour, s.msg.endsWith("!") && s.t - s.msgT < 1 ? Y : O); deux(227, s.contre, !s.msg.endsWith("!") && s.t - s.msgT < 1 ? Y : V);
      ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(180, 87, 2, 0, 6.3); ctx.arc(180, 99, 2, 0, 6.3); ctx.fill();
    }
    function dessiner() {
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, VO_H);
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(VO_G, VO_HAUT, VO_D - VO_G, VO_SOL - VO_HAUT);                    // le mur de la salle
      ctx.fillStyle = "rgba(143,199,232,.3)"; ctx.fillRect(VO_FX, VO_HAUT, VO_D - VO_FX, VO_SOL - VO_HAUT);     // le camp de l'automate
      decor();
      // Le sol : c'est aussi là que se pose le doigt.
      ctx.fillStyle = V; ctx.fillRect(VO_G, VO_SOL, VO_D - VO_G, VO_H - VO_SOL);
      trait(ctx, 3); ctx.beginPath(); ctx.moveTo(VO_G, VO_SOL); ctx.lineTo(VO_D, VO_SOL); ctx.stroke();
      texte(ctx, "LE SOL N'EST PAS UNE ÉTAGÈRE", 180, VO_SOL + 30, 11, PALE);
      // L'ombre de la poche aide à juger où elle retombe.
      const b = s.balle;
      if (b) { const k = 1 - (VO_SOL - b.y) / (VO_SOL - VO_HAUT) * 0.6; ctx.fillStyle = "rgba(38,7,109,.22)"; ctx.beginPath(); ctx.ellipse(b.x, VO_SOL + 5, 13 * k, 3.5 * k, 0, 0, 6.3); ctx.fill(); }
      // Le filet : un pied à perfusion.
      trait(ctx, 2.4); ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(VO_FX - 17, VO_SOL - 5, 34, 6, 3); ctx.fill();
      ctx.fillStyle = C; ctx.beginPath(); ctx.roundRect(VO_FX - VO_FE, VO_SOL - VO_FH - VO_FE, VO_FE * 2, VO_FH + VO_FE, VO_FE); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(VO_FX - 9, VO_SOL - VO_FH + 5, 5, 0.2, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(VO_FX + 9, VO_SOL - VO_FH + 5, 5, 0, Math.PI - 0.2); ctx.stroke();
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
      } else if (!clos && s.t - s.msgT >= 1) texte(ctx, "Nouvelle poche…", 180, 150, 14, "rgba(38,7,109,.6)");
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, joues ? Math.round(100 * s.pour / joues) * 100 + Math.min(99, s.pour) : 0); }, 1300);
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
     pas la partie. Le score brut est la distance parcourue, en décimètres. */
  // Le cœur. Distances en px (HA_M px pour un mètre), hauteurs comptées depuis le sol.
  const RH = { v0: 190, vmax: 285, acc: 7, g: 1800, saut: 420, seuil: 0.14, tenue: 0.34, gTenu: 150, chute: 0.8, tampon: 0.08, salto: 0.28, gain: 12, sur: 30, ecart: 270, serre: 60, flou: 120, double: 175, plein: 9000, base: 4.7, palier: 0.6 };
  const HA_PAS = 1 / 120, HA_M = 25, HA_DEMI = 7, HA_TAILLE = 44;
  // w : longueur, h : hauteur à franchir ; grand : demande un grand saut ; sol : ne gêne que les pieds posés ; bas : hauteur libre sous un portique.
  const HA_TYPES = { carton: { w: 26, h: 24 }, bidon: { w: 22, h: 28 }, chariot: { w: 54, h: 38, grand: 1 }, flaque: { w: 84, h: 1, sol: 1, grand: 1 }, portique: { w: 26, h: 24, bas: 100 } };
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
  function creerHaies(graine, duree) {
    return { t: 0, x: 0, y: 0, vy: 0, v: RH.v0, elan: 0, sol: true, tenu: false, lache: true, grand: false, demande: -1, tSaut: -9, tSalto: -9, arret: 0, tChute: -9, dernier: null,
      file: parcoursHaies(graine, (RH.vmax + RH.sur) * (duree || 50) + 500), suivant: 0, francs: 0, chutes: 0, sauts: 0, salto: null, saltos: 0, fini: false };
  }
  // Le bouton : enfoncé (true) ou relâché (false). Un appui juste avant de toucher le sol est gardé en mémoire un instant.
  // Un second appui en plein saut lance un salto, s'il reste assez de temps de vol pour le boucler (RH.salto). La trajectoire ne
  // change pas ; à la réception, le salto donne de l'élan (RH.gain), jusqu'à RH.sur au-delà de la vitesse de croisière.
  function appuiHaies(s, on) {
    s.tenu = !!on; if (!on) return;
    s.demande = s.t;
    if (!s.sol && !s.salto && s.arret <= 0) {
      const reste = (s.vy + Math.sqrt(s.vy * s.vy + 2 * RH.g * s.y)) / RH.g;
      if (reste >= RH.salto) s.salto = { t0: s.t, d: RH.salto };
    }
  }
  function unPasHaies(s, duree) {
    s.t += HA_PAS;
    if (s.t >= duree) { s.fini = true; return; }
    if (s.arret > 0) { s.arret -= HA_PAS; s.demande = -1; return; }             // à terre : le temps de se relever
    s.elan = Math.max(s.elan, Math.min(RH.vmax - RH.v0, s.elan + RH.acc * HA_PAS)); s.v = RH.v0 + s.elan;
    s.x += s.v * HA_PAS;
    if (s.sol && s.demande >= 0 && s.t - s.demande <= RH.tampon) { s.sol = false; s.vy = RH.saut; s.tSaut = s.t; s.demande = -1; s.lache = false; s.grand = false; s.sauts++; }
    if (!s.sol) {
      const ts = s.t - s.tSaut;
      if (!s.tenu) s.lache = true;
      const plane = !s.lache && ts >= RH.seuil && ts < RH.tenue;                // bouton tenu : le saut s'allonge
      if (plane) s.grand = true;
      s.vy -= (plane ? RH.gTenu : RH.g) * HA_PAS; s.y += s.vy * HA_PAS;
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.sol = true; if (s.salto) { s.saltos++; s.tSalto = s.t; s.elan = Math.min(RH.vmax - RH.v0 + RH.sur, s.elan + RH.gain); } s.salto = null; }
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
  // La note suit l'allure moyenne (mètres par seconde) : RH.base pour 0, puis un point par tranche de RH.palier.
  const noteHaies = (s, duree) => borne(Math.floor((metresHaies(s) / duree - RH.base) / RH.palier + 1e-9), 0, 10);
  const brutHaies = s => Math.round(s.x / HA_M * 10);

  // Le dessin et les commandes. Le coureur reste à HA_XJ et le couloir défile ; en mouvement réduit, le décor ne défile pas
  // (mur et sol unis), le coureur ne s'agite pas et seuls les obstacles avancent.
  const HA_H = 330, HA_SOL = 262, HA_XJ = 78, HA_HAUT = 66;
  const HA_PORTES = ["ONCO", "HÉMATO", "GASTRO", "PNEUMO"];   // les services à livrer, sur les pancartes des portes
  const HA_MOTS = { carton: "Carton renversé !", bidon: "Aïe, le bidon !", chariot: "Chariot percuté !", flaque: "Ça glisse !", portique: "Carton renversé !" };
  function haies(el, opt) {
    const duree = opt.duree || 50, { cv, ctx, liberer } = monter(el, HA_H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le sprint du couloir. Le préparateur court tout seul : touchez, cliquez ou appuyez sur Espace pour sauter les obstacles. Appui bref : petit saut. Appui maintenu : grand saut. Un second appui en plein saut : un salto, qui donne de l'élan à la réception.");
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
        for (let i = Math.max(1, Math.floor(cam / (50 * HA_M))); i * 50 * HA_M < cam + W + 40; i++) {   // un repère tous les 50 m
          const x = i * 50 * HA_M - cam;
          ctx.strokeStyle = "rgba(38,7,109,.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, HA_SOL + 4); ctx.lineTo(x - 22, HA_H - 6); ctx.stroke();
          texte(ctx, i * 50 + " m", x + 6, HA_SOL + 16, 11, "rgba(38,7,109,.5)", "left");
        }
      }
      ctx.strokeStyle = "rgba(38,7,109,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, HA_SOL - 44); ctx.lineTo(W, HA_SOL - 44); ctx.moveTo(0, HA_HAUT); ctx.lineTo(W, HA_HAUT); ctx.stroke();
      trait(ctx, 3); ctx.beginPath(); ctx.moveTo(0, HA_SOL); ctx.lineTo(W, HA_SOL); ctx.stroke();
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
    // Le préparateur en blouse (charlotte, masque), son colis au logo de l'unité à bout de bras.
    function coureur() {
      const tombe = s.arret > 0, k = tombe ? (calme ? 1 : Math.min(1, (s.t - s.tChute) / 0.16)) : 0, ph = s.x / 13, vif = s.sol && !tombe && !calme;
      ctx.fillStyle = "rgba(38,7,109,.16)"; ctx.beginPath(); ctx.ellipse(HA_XJ + (tombe ? 20 * k : 0), HA_SOL + 3, 13 - Math.min(6, s.y / 14), 3.5, 0, 0, 6.3); ctx.fill();
      ctx.save(); ctx.translate(HA_XJ, HA_SOL - s.y); ctx.rotate(1.3 * k);
      if (s.salto && !calme) { ctx.translate(0, -22); ctx.rotate(6.2832 * Math.min(1, (s.t - s.salto.t0) / s.salto.d)); ctx.translate(0, 22); }   // le salto : un tour complet avant de retomber
      ctx.strokeStyle = N; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 0; i < 2; i++) {                                                                    // les jambes
        const a = ph + i * Math.PI, fx = !s.sol ? (i ? 9 : -8) : vif ? Math.sin(a) * 9 : (i ? 6 : -6), fy = !s.sol ? (i ? -9 : -5) : vif ? -Math.max(0, Math.cos(a)) * 6 : 0;
        ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(fx, fy - 2.5); ctx.lineTo(fx + 4, fy - 2.5); ctx.stroke();
      }
      ctx.translate(0, vif ? -Math.abs(Math.sin(ph)) * 2 : 0);
      trait(ctx, 2.4);
      ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(-8, -28); ctx.quadraticCurveTo(-8, -33, -3, -33); ctx.lineTo(3, -33); ctx.quadraticCurveTo(8, -33, 8, -28); ctx.lineTo(9, -10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.fill(); ctx.stroke();   // la blouse, pans ouverts
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4, -32); ctx.lineTo(1, -26); ctx.lineTo(2, -10); ctx.moveTo(-6, -18); ctx.lineTo(-2, -18); ctx.stroke();   // le revers, la fermeture, la poche
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1, -28); ctx.lineTo(9, -22); ctx.stroke();
      trait(ctx, 2); boite(6, -33, 19, 17, 3, C);                                                      // le colis
      if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 7.5, -32.5, 16, 16);
      else { ctx.fillStyle = O; ctx.fillRect(13.5, -29, 4, 9); ctx.fillRect(11, -26.5, 9, 4); }
      trait(ctx, 2.4); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(1, -38.5, 6, 0, 6.3); ctx.fill(); ctx.stroke();                  // la tête
      ctx.fillStyle = V; ctx.beginPath(); ctx.arc(0.5, -40, 7.2, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.stroke();  // la charlotte
      trait(ctx, 1.6); boite(3, -38.5, 5, 5, 1.5, B);                                                  // le masque
      ctx.fillStyle = N; ctx.beginPath(); ctx.arc(4.4, -40, 1.1, 0, 6.3); ctx.fill();
      ctx.restore();
      if (tombe && !calme) for (let i = 0; i < 3; i++) { const a = s.t * 7 + i * 2.1; texte(ctx, "✦", HA_XJ + 38 + Math.cos(a) * 13, HA_SOL - 34 + Math.sin(a) * 6, 12, O); }
      if (!calme && !tombe && !s.salto && s.elan > 55) {                                                           // les traits de vitesse
        ctx.strokeStyle = "rgba(38,7,109," + Math.min(0.5, 0.1 + 0.25 * (s.elan - 55) / 40) + ")"; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const y = HA_SOL - s.y - 12 - i * 11, l = 10 + ((s.t * 9 + i * 1.7) % 1) * 14; ctx.beginPath(); ctx.moveTo(HA_XJ - 16 - l, y); ctx.lineTo(HA_XJ - 16, y); ctx.stroke(); }
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
        if (o.aide && !o.touche && x + o.w > HA_XJ) pastille(o.bas ? "SAUT BREF" : "MAINTENIR", x + o.w / 2, o.bas ? HA_SOL - o.bas - 40 : HA_SOL - 104);
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
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 96, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 136, 40, Y); texte(ctx, m + " m · " + s.francs + " obstacles franchis", 180, 178, 16, C); }
    }
    function pastilleGrande(t, coul) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(80, 78, 200, 34, 14); ctx.fill(); texte(ctx, t, 180, 96, 16, coul); }
    const arret = boucle(dt => {
      if (!clos) {
        pasHaies(s, dt, duree);
        if (s.fini) {
          clos = true;
          const n = noteHaies(s, duree), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = Math.floor(metresHaies(s)) + " m parcourus en " + duree + " s, " + pl(s.francs, "obstacle franchi", "obstacles franchis") + ", " + pl(s.chutes, "chute", "chutes") + (s.saltos ? ", " + pl(s.saltos, "salto", "saltos") : "") + " : " + n + " sur 10 (la note suit la distance).";
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, brutHaies(s)); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }
  api.haies = haies;
  Object.assign(api._coeur, { REGL_HAIES: RH, HA_TYPES, HA_M, HA_DEMI, HA_TAILLE, parcoursHaies, creerHaies, appuiHaies, pasHaies, noteHaies, metresHaies, brutHaies });
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
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, Math.max(0, Math.round(s.score))); }, 1300);
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
  /* La parade de la spatule : le préparateur fait tournoyer une spatule comme un bâton de majorette. Elle retombe tantôt
     dans sa main gauche, tantôt dans sa main droite : on la rattrape (et on la relance du même geste) en touchant le bon côté
     au moment où elle arrive dans le gant. Plus le geste est juste, plus il rapporte ; une série sans chute ajoute un bonus.
     À mi-parcours une deuxième spatule entre dans la danse, et si tout se passe bien, une troisième pour le bouquet final. La chorégraphie est la même pour tout le monde (graine fixe) et
     calée sur le temps : un rattrapage en avance ou en retard ne change pas l'instant des suivants. */
  {
    /* --- Le cœur : règles et trajectoires, sans navigateur --- */
    // Réglages étalonnés par simulation (node outils/etalon-twirling.js) : ils fixent la difficulté.
    // parfait, bien, juste : écarts tolérés (s) autour de l'instant d'arrivée. gel, vide : blocage de la main (s) et points perdus après un geste dans le vide.
    // pA, pC, pD : fin de l'échauffement, entrée de la deuxième spatule, bouquet final à trois (parts de la durée). dA, dB, eC, eD : écarts entre deux retombées.
    // trois : la troisième spatule n'entre que si le joueur a déjà marqué cette part des points possibles jusque-là.
    // serie, bonus : +1 point par tranche de « serie » rattrapages d'affilée, plafonné à « bonus ». seuils : parts du maximum.
    const RTW = { g: 1020, hmax: 250, parfait: 0.05, bien: 0.1, juste: 0.18, gel: 0.5, vide: 1, ramasse: 0.9, relance: 1, tmin: 0.6, depart: 1.9, envoi: 1.2, pA: 0.22, pC: 0.44, pD: 0.72, trois: 0.45, dA: 1.1, dB: [0.8, 0.95, 1.4], eC: [0.48, 0.54, 0.6], eD: [0.4, 0.44, 0.5], serie: 4, bonus: 3, seuils: [0.025, 0.06, 0.11, 0.18, 0.27, 0.37, 0.49, 0.63, 0.8, 0.93], plafond: 600 };
    const TW_PAS = 1 / 120, TW_MX = [96, 264], TW_YH = 330, TW_SOL = 436;
    // La chorégraphie : la liste des retombées { t : instant, m : main (0 gauche, 1 droite), b : spatule }.
    function choreeTwirling(duree, graine) {
      let a = graine || 20261218, m = 1, suite = 0, t = RTW.depart, k = 0;
      const h = () => { a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
      // Jamais plus de trois retombées de suite dans la même main.
      const main = () => { let n = h() < 0.55 ? 1 - m : m; if (n === m && ++suite > 2) n = 1 - m; if (n !== m) suite = 0; m = n; return m; };
      const L = [], poser = b => L.push({ t: Math.round(t * 1000) / 1000, m: main(), b });
      while (t < duree * RTW.pA && t <= duree - 0.8) { poser(0); t += RTW.dA; }                      // échauffement : tempo régulier
      while (t < duree * RTW.pC && t <= duree - 0.8) { poser(0); const r = h(); t += RTW.dB[r < 0.5 ? 0 : r < 0.72 ? 1 : 2]; }   // le tempo varie, avec de grands lancers
      while (t < duree * RTW.pD && t <= duree - 0.8) { poser(k++ % 2); t += RTW.eC[Math.floor(h() * RTW.eC.length)]; }   // deux spatules, en alternance
      k = 0; while (t <= duree - 0.8) { poser(k++ % 3); t += RTW.eD[Math.floor(h() * RTW.eD.length)]; }                 // bouquet final : trois spatules, à tour de rôle
      return L;
    }
    const gainTwirling = (q, serie) => q + Math.min(RTW.bonus, Math.floor(serie / RTW.serie));
    // Où est la spatule b à l'instant t ? En vol : une cloche d'une main à l'autre, qui se prolonge jusqu'au sol si personne ne la rattrape.
    const placerTwirling = (b, t) => {
      if (b.etat === "main") { b.x = TW_MX[b.m]; b.y = TW_YH; b.rot = 0; return b; }
      if (b.etat === "sol") return b;
      const u = (t - b.t0) / (b.t1 - b.t0);
      b.x = borne(b.x0 + (b.x1 - b.x0) * u + b.bombe * Math.sin(Math.PI * borne(u, 0, 1)), 16, W - 16);
      b.y = TW_YH - 4 * b.h * u * (1 - u);
      b.rot = 2 * Math.PI * b.tours * u;
      return b;
    };
    // La spatule b quitte la main b.m à l'instant t, pour retomber à l'heure dite dans la main prévue par la chorégraphie.
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
      // La troisième spatule se mérite : au moment d'entrer, il faut avoir marqué une part suffisante des points possibles jusque-là.
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
            // Trop tard : la spatule tombe. Le préparateur la ramasse et la relance pour la première retombée encore jouable.
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
      cv.setAttribute("aria-label", "La parade de la spatule. La spatule tournoie et retombe dans la main gauche ou la main droite du préparateur : touchez ou cliquez le côté où elle retombe, au moment où elle arrive dans le gant. Une deuxième spatule arrive en cours de partie, puis une troisième si tout se passe bien. Au clavier : flèche gauche et flèche droite, ou F et J.");
      const s = creerTwirling(duree), mm = q => typeof matchMedia === "function" && matchMedia(q).matches;
      const tactile = mm("(pointer: coarse)"), calme = mm("(prefers-reduced-motion: reduce)");
      if (typeof opt.espion === "function") opt.espion(s);                                         // pour le banc d'essai seulement
      const logo = new Image(); logo.src = opt.logo || api._logo;
      let clos = false, minuterie = 0, vu = performance.now(), joue = false;
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
      const TEINTES = [O, G, "#C2409B"];
      // Une spatule : le manche (rot = 0 : manche en bas, dans le gant) et la lame.
      const spatule = (x, y, rot, teinte, alpha) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
        trait(ctx, 7); ctx.beginPath(); ctx.moveTo(0, 21); ctx.lineTo(0, -2); ctx.stroke();
        ctx.strokeStyle = teinte; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 0); ctx.stroke();
        trait(ctx, 2.2); ctx.fillStyle = "#E3E6EE"; ctx.beginPath(); ctx.roundRect(-6, -23, 12, 23, [6, 6, 2, 2]); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(-3, -19, 2.5, 12);                      // le reflet de la lame
        ctx.fillStyle = teinte; ctx.beginPath(); ctx.arc(0, 22, 4.6, 0, 6.3); ctx.fill(); ctx.stroke();   // l'embout du manche
        ctx.restore();
      };
      const rond = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); };
      const FANIONS = [Y, O, P, V, G, B];
      const bonus = () => Math.min(RTW.bonus, Math.floor(s.serie / RTW.serie));
      // Les effets : étincelles et confettis (parts), annonce de combo (pop). Rien de tout cela en mouvements réduits.
      let parts = [], pop = null, serieVue = 0, evVu = -9, secousse = -9;
      const jet = (x, y, n, coul, force, bas) => { if (calme) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = force * (0.4 + Math.random() * 0.6); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (bas ? 0 : force * 0.5), vie: 0.5 + Math.random() * 0.5, age: 0, c: coul || FANIONS[i % 6], r: 2 + Math.random() * 2.5, tour: Math.random() * 6 }); } };
      function effets(dt) {
        if (s.evT !== evVu) {                                                                        // un nouveau geste vient d'être jugé
          evVu = s.evT; const e = s.ev;
          if (e && e.q === 3) jet(TW_MX[e.m], TW_YH, 7, Y, 110);
          if (e && e.q === 0) secousse = s.t;
        }
        if (s.serie > serieVue) {
          const k = Math.floor(s.serie / RTW.serie);
          if (s.serie % RTW.serie === 0 && k <= RTW.bonus) { pop = { txt: "Combo ! bonus +" + k, t: s.t, c: [V, Y, O][k - 1] }; jet(180, 150, 14 + 8 * k, null, 190); }
          else if (s.serie >= 20 && s.serie % 10 === 0) { pop = { txt: "Série de " + s.serie + " !", t: s.t, c: O }; for (let x = 30; x < W; x += 50) jet(x, 60, 5, null, 90, true); }
        } else if (s.serie < serieVue && serieVue >= RTW.serie) pop = { txt: "Série rompue", t: s.t, c: "#C9C3DA", bas: true };
        serieVue = s.serie;
        for (const q of parts) { q.age += dt; q.vy += 520 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.tour += dt * 9; }
        parts = parts.filter(q => q.age < q.vie && q.y < TW_SOL);
      }
      function decor() {
        const t = tAff(), k = bonus();
        const mur = ctx.createLinearGradient(0, 0, 0, TW_SOL); mur.addColorStop(0, "#DCD5F3"); mur.addColorStop(1, "#F4F1FB");
        ctx.fillStyle = mur; ctx.fillRect(0, 0, W, H);                                               // le mur du préparatoire
        // Deux étagères de flacons, au fond.
        ctx.globalAlpha = 0.4;
        for (const x0 of [14, 258]) { ctx.fillStyle = N; ctx.fillRect(x0, 236, 88, 4); [14, 44, 74].forEach((dx, i) => flacon(ctx, x0 + dx, 222, 0, FANIONS[(i + (x0 > 100 ? 3 : 0)) % 6])); }
        ctx.globalAlpha = 1;
        // Les projecteurs : ils s'allument avec le bonus de série.
        for (const m of [0, 1]) {
          const x0 = m ? W - 26 : 26, xc = (m ? 228 : 132) + (calme ? 0 : Math.sin(t * 1.3 + m * 2) * 16 * (k ? 1 : 0.3));
          const g = ctx.createLinearGradient(x0, 40, xc, TW_SOL); g.addColorStop(0, "rgba(236,213,103," + (0.16 + 0.12 * k) + ")"); g.addColorStop(1, "rgba(236,213,103,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 8, 40); ctx.lineTo(x0 + 8, 40); ctx.lineTo(xc + 78, TW_SOL); ctx.lineTo(xc - 78, TW_SOL); ctx.closePath(); ctx.fill();
          trait(ctx, 2.5); ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(x0 - 11, 39, 22, 12, [0, 0, 6, 6]); ctx.fill();
        }
        // Le sol : un parquet de scène, et le tapis du préparateur.
        ctx.fillStyle = "#F7E7B8"; ctx.fillRect(0, TW_SOL, W, H - TW_SOL);
        ctx.strokeStyle = "rgba(38,7,109,.12)"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = -40; x <= W + 40; x += 40) { ctx.moveTo(180 + (x - 180) * 0.82, TW_SOL); ctx.lineTo(x, H); } ctx.stroke();
        trait(ctx, 3); ctx.beginPath(); ctx.moveTo(0, TW_SOL); ctx.lineTo(W, TW_SOL); ctx.stroke();
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
        if (!calme && t - secousse < 0.3) ctx.translate(Math.sin((t - secousse) * 60) * 2.5, 0);       // un sursaut quand une spatule tombe
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
        // Les yeux suivent la spatule qui vole.
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
        // Le repère de rythme : un anneau se referme sur le gant où la spatule va retomber.
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
            if (k) {                                                                                 // en combo, la spatule traîne un ruban à sa couleur
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
        for (const q of parts) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.tour); ctx.globalAlpha = 1 - q.age / q.vie; ctx.fillStyle = q.c; ctx.fillRect(-q.r, -q.r * 0.6, q.r * 2, q.r * 1.2); ctx.restore(); }
        // Les annonces : l'entrée des spatules, les combos.
        const b2 = s.batons[1], b3 = s.batons[2];
        const annonce = (txt, y, fond, encre) => { ctx.fillStyle = fond; ctx.beginPath(); ctx.roundRect(40, y - 16, 280, 32, 16); ctx.fill(); texte(ctx, txt, 180, y + 1, 15, encre); };
        if (!clos && b2.liste.length && t > b2.entree && t < b2.entree + 2.4) annonce("Deuxième spatule !", 120, N, Y);
        if (!clos && s.trois !== null && t < s.troisT + 2.6) annonce(s.trois ? "Bouquet final : trois spatules !" : "La troisième spatule reste au râtelier", 120, s.trois ? O : N, s.trois ? N : C);
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
          } else texte(ctx, "Tombée… on la ramasse !", 180, 290, 14, "rgba(38,7,109,.7)");
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
          texte(ctx, tactile ? "Touchez le côté où la spatule retombe," : "Cliquez le côté où elle retombe (ou ← →),", 180, 211, 13, Y);
          texte(ctx, "pile quand elle arrive dans le gant", 180, 228, 13, Y);
          ctx.globalAlpha = 1;
        }
        const n = noteTwirling(s);
        bandeau(ctx, s.points + " pts · " + n + "/10" + (n < 10 ? " · palier à " + palierTwirling(s, n) : ""), duree - s.t, duree);
        if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 150, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 190, 40, Y); texte(ctx, s.points + " points · meilleure série " + s.meilleure, 180, 232, 16, C); }
      }
      const arret = boucle(dt => {
        vu = performance.now();
        if (!clos) {
          pasTwirling(s, dt); effets(dt);
          if (s.fini) {
            clos = true;
            const n = noteTwirling(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
            const bilan = pl(s.pris, "rattrapage", "rattrapages") + " sur " + s.choree.length + ", dont " + pl(s.q[3], "parfait", "parfaits") + ", meilleure série de " + s.meilleure + (s.trois ? ", bouquet final à trois spatules" : "") + " : " + pl(s.points, "point", "points") + ", soit " + n + " sur 10 (1 à 3 points selon la justesse du geste, jusqu'à 3 de bonus de série, 1 point perdu par geste dans le vide ; 10 sur 10 à partir de " + palierTwirling(s, 9) + " points).";
            minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan, brutTwirling(s)); }, 1300);
          }
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

  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PharmacoJeux = api;
})(typeof window !== "undefined" ? window : globalThis);
