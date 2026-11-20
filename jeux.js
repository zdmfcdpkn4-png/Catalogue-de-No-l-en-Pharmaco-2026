/* Mini-jeux des Pharmacogames de Noël : deux jeux d'adresse originaux, dans l'esprit des bornes d'arcade
   et des micro-ordinateurs des années 80. Chargé à la demande par enigme.js, propre au site Vercel.
   Chaque jeu se dessine dans un canevas, dure un temps limité et rend une note de 0 à 10.
   Le cœur de chaque jeu (règles, trajectoires) est séparé du dessin pour pouvoir être vérifié hors navigateur. */
(root => {
  const N = "#26076D", C = "#FFFBF2", Y = "#ECD567", O = "#EC7739", P = "#E5B4D9", V = "#B9A6F0", G = "#3E9B76", R = "#D8402B", B = "#8FC7E8";
  const W = 360, H = 480; // repère logique des deux jeux

  /* ================= Bowling des flacons : le cœur ================= */
  const RB = 15, RQ = 11, GAUCHE = 46, DROITE = 314, DEPART = 432;
  // Réglages étalonnés par simulation (voir le banc d'essai) : ils fixent la difficulté.
  const REGL = { elan: 180, frein: 5, relais: 0.55, seuil: 60, cadence: 0.4, vitesse: 280, chute: 85, acc: 3, pas: 0.9, portee: 2 };
  const PLACES = (() => { const q = []; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) q.push({ x: 180 + (i - r / 2) * 37, y: 150 - r * 32 }); return q; })();
  // Un lancer : la boule part de x avec un angle en degrés (0 = tout droit). debout[i] dit si le flacon i est encore là.
  function creerLancer(x, angle, debout) {
    const a = angle * Math.PI / 180;
    return {
      boule: { x, y: DEPART, vx: Math.sin(a) * 540, vy: -Math.cos(a) * 540, rigole: false, sortie: false, tour: 0 },
      quilles: PLACES.map((p, i) => ({ x: p.x, y: p.y, vx: 0, vy: 0, la: debout[i], tombee: false, rot: 0 })),
      fini: false,
    };
  }
  function pasLancer(s, dt) {
    const b = s.boule;
    if (!b.sortie) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.tour += dt * 9;
      if (!b.rigole && (b.x < GAUCHE + RB - 4 || b.x > DROITE - RB + 4)) { b.rigole = true; b.x = b.x < 180 ? GAUCHE - 8 : DROITE + 8; b.vx = 0; }
      if (b.y < -30) b.sortie = true;
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
  const RF = { g: 820, vmax: 960, monte: 20, descend: 14, repos: 0.5, leve: -0.5, long: 62, kick: 400, bouchon: 10, etiquette: 25, deja: 5, lot: 150, relance: 2, perte: 30, palier: 100 };
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
    return { t: 0, acc: 0, score: 0, pertes: 0, lots: 0, coups: 0, lancers: 0, lot: F_ETIQ.map(() => false), tape: F_BOUCHONS.map(() => -9), bille: null, attente: 0.9, g: false, d: false, ang: [RF.repos, RF.repos], vit: [0, 0], calme: 0, msg: "", msgT: -9, h, fini: false };
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
      s.score += RF.bouchon; s.tape[i] = s.t;
    });
    if (b.y < 330) b.x = Math.max(10 + F_RB, Math.min(350 - F_RB, b.x));   // filet de sécurité : jamais hors des parois
    if (b.y < 49 + F_RB) { b.y = 49 + F_RB; if (b.vy < 0) b.vy = -b.vy * 0.45; }
    const v = Math.hypot(b.vx, b.vy);
    if (v > RF.vmax) { b.vx *= RF.vmax / v; b.vy *= RF.vmax / v; }
    // Déblocage : une bille immobile ailleurs que sur un batteur tenu levé reçoit un coup de pouce.
    s.calme = v < 30 && !tenue ? s.calme + dt : 0;
    if (s.calme > 1.2) { b.vx = (s.h() - 0.5) * 300; b.vy = -330; s.calme = 0; s.coups++; }
    if (b.y > 496) { s.bille = null; s.pertes++; s.attente = RF.relance; s.score = Math.max(0, s.score - RF.perte); s.lot = s.lot.map(() => false); s.msg = "Bille perdue : -" + RF.perte; s.msgT = s.t; }
    else if (!(b.x > -20 && b.x < W + 20 && b.y > 0)) { s.bille = null; s.attente = 0.3; }                   // ne devrait pas arriver
  }
  // Pas fixe : quel que soit le rythme d'affichage, la physique avance par tranches de 1/240 s.
  function pasFlipper(s, dt, duree) { s.acc += dt; while (s.acc >= F_PAS && !s.fini) { s.acc -= F_PAS; unPasFlipper(s, duree); } }
  const noteFlipper = s => Math.min(10, Math.floor(s.score / RF.palier));

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

  /* ----- Bowling des flacons ----- */
  function bowling(el, opt) {
    const duree = opt.duree || 30, { cv, ctx, liberer } = monter(el, H);
    cv.setAttribute("aria-label", "Bowling des flacons. Appuyez ou tapez Espace pour fixer la position, puis l'angle du lancer.");
    const debout = PLACES.map(() => true);
    let phase = "position", lancerN = 1, t = 0, reste = duree, posX = 180, angle = 0, sim = null, total = 0, annonce = "", annonceT = 0, clos = false;
    const COUL = [O, Y, P, V, Y, O, V, P, O, Y];
    function agir() {
      if (clos) return;
      if (phase === "position") { phase = "angle"; t = 0; }
      else if (phase === "angle") { sim = creerLancer(posX, angle, debout); phase = "roule"; }
    }
    const surClic = e => { e.preventDefault(); cv.focus({ preventScroll: true }); agir(); };
    const surTouche = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); agir(); } };
    cv.addEventListener("pointerdown", surClic);
    cv.addEventListener("keydown", surTouche);
    function finir() {
      if (clos) return;
      clos = true; phase = "fin";
      setTimeout(() => { arret(); liberer(); opt.onFin(total, total === 10 ? "Strike de laboratoire : les 10 flacons sont tombés." : total + (total > 1 ? " flacons renversés" : " flacon renversé") + " sur 10."); }, 1100);
    }
    function dessiner() {
      ctx.fillStyle = "#F4F2F8"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#D8D3E3"; ctx.fillRect(0, 39, GAUCHE - 16, H); ctx.fillRect(DROITE + 16, 39, W, H); // bords
      ctx.fillStyle = N; ctx.fillRect(GAUCHE - 16, 39, 16, H); ctx.fillRect(DROITE, 39, 16, H);              // rigoles
      ctx.fillStyle = "#F7E7B8"; ctx.fillRect(GAUCHE, 39, DROITE - GAUCHE, H);                                // paillasse
      ctx.strokeStyle = "rgba(38,7,109,.12)"; ctx.lineWidth = 2;
      for (let x = GAUCHE + 38; x < DROITE; x += 38) { ctx.beginPath(); ctx.moveTo(x, 39); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.strokeStyle = O; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(GAUCHE, DEPART - 26); ctx.lineTo(DROITE, DEPART - 26); ctx.stroke();
      const Q = sim ? sim.quilles : PLACES.map((p, i) => ({ x: p.x, y: p.y, la: debout[i], tombee: false, rot: 0 }));
      Q.forEach((q, i) => { if (q.la) { ctx.globalAlpha = q.tombee ? 0.55 : 1; flacon(ctx, q.x, q.y, q.tombee ? q.rot : 0, COUL[i]); ctx.globalAlpha = 1; } });
      // La boule : un gros comprimé sécable.
      const b = sim ? sim.boule : { x: posX, y: DEPART, tour: 0 };
      if (!sim || !b.sortie) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tour || 0);
        trait(ctx, 3); ctx.fillStyle = C; ctx.beginPath(); ctx.arc(0, 0, RB, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-RB + 4, 0); ctx.lineTo(RB - 4, 0); ctx.stroke();
        ctx.restore();
      }
      if (phase === "position" || phase === "angle") {
        const a = (phase === "angle" ? angle : 0) * Math.PI / 180;
        ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.setLineDash([9, 8]);
        ctx.beginPath(); ctx.moveTo(posX, DEPART - 20); ctx.lineTo(posX + Math.sin(a) * 150, DEPART - 20 - Math.cos(a) * 150); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = N; ctx.beginPath(); ctx.roundRect(60, H - 30, 240, 24, 12); ctx.fill();
        texte(ctx, phase === "position" ? "Touchez pour fixer la position" : "Touchez pour fixer l'angle", 180, H - 18, 13, Y);
      }
      bandeau(ctx, "Lancer " + Math.min(lancerN, 2) + "/2 · " + total + " à terre", reste, duree);
      if (annonceT > 0) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(60, 210, 240, 60, 16); ctx.fill(); texte(ctx, annonce, 180, 241, 24, Y); }
      if (phase === "fin") { ctx.fillStyle = "rgba(38,7,109,.9)"; ctx.beginPath(); ctx.roundRect(50, 190, 260, 100, 18); ctx.fill(); texte(ctx, total + " / 10", 180, 228, 40, Y); texte(ctx, total === 10 ? "Tout est tombé !" : "Lot contrôlé", 180, 266, 16, C); }
    }
    const arret = boucle(dt => {
      t += dt; annonceT -= dt;
      if (phase === "position" || phase === "angle") {
        reste -= dt;
        if (phase === "position") posX = 180 + Math.sin(t * 2.5) * 100; else angle = Math.sin(t * 3.6) * 12;
        if (reste <= 0) { reste = 0; annonce = "Temps écoulé"; annonceT = 1; finir(); }
      } else if (phase === "roule") {
        for (let i = 0; i < 4; i++) pasLancer(sim, dt / 4);
        if (sim.fini) {
          const n = tombees(sim);
          sim.quilles.forEach((q, i) => { if (q.la && q.tombee) debout[i] = false; });
          total += n; sim = null;
          annonce = total === 10 ? (lancerN === 1 ? "Strike !" : "Spare !") : n === 0 ? "Dans le vide" : "+" + n; annonceT = 0.9;
          if (total === 10 || lancerN === 2) finir(); else { lancerN = 2; phase = "position"; t = 0; }
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
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan); }, 1300);
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
        if (s.fini) { clos = true; setTimeout(() => { arret(); liberer(); opt.onFin(noteTir(s), s.touches + " particules neutralisées sur " + TOTAL + "."); }, 1300); }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { arret(); liberer(); };
  }

  /* ----- Le flipper du préparatoire ----- */
  function flipper(el, opt) {
    const duree = opt.duree || 60, { cv, ctx, xDe, liberer } = monter(el, H);
    cv.style.touchAction = "none";
    cv.setAttribute("aria-label", "Le flipper du préparatoire. Batteur gauche : flèche gauche, touche S ou moitié gauche de l'écran. Batteur droit : flèche droite, touche L ou moitié droite.");
    const s = creerFlipper(), tactile = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    let clos = false, minuterie = 0;
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
    const COUL = [O, P, V];
    function dessiner() {
      ctx.fillStyle = N; ctx.fillRect(0, 0, W, H);
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
      trait(ctx, 5); ctx.beginPath();
      F_MURS.forEach(m => { ctx.moveTo(m[0], m[1]); ctx.lineTo(m[2], m[3]); }); ctx.stroke();
      // Les étiquettes : blanches, puis vertes une fois collées.
      F_ETIQ.forEach((m, i) => {
        const hz = m[1] === m[3];
        trait(ctx, 2); ctx.fillStyle = s.lot[i] ? G : C; ctx.beginPath();
        if (hz) ctx.roundRect(m[0] - 3, m[1] - 4, m[2] - m[0] + 6, 8, 3); else ctx.roundRect(m[0] - 4, m[1] - 3, 8, m[3] - m[1] + 6, 3);
        ctx.fill(); ctx.stroke();
      });
      // Les bouchons : ils renvoient la bille.
      F_BOUCHONS.forEach((o, i) => {
        const k = Math.max(0, 1 - (s.t - s.tape[i]) / 0.16), r = o.r + k * 3;
        trait(ctx, 3); ctx.fillStyle = k > 0 ? Y : COUL[i]; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.3); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 2; for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5; ctx.beginPath(); ctx.moveTo(o.x + Math.cos(a) * (r - 5), o.y + Math.sin(a) * (r - 5)); ctx.lineTo(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r); ctx.stroke(); }
        ctx.fillStyle = C; ctx.beginPath(); ctx.arc(o.x, o.y, r - 8, 0, 6.3); ctx.fill(); ctx.stroke();
      });
      // Les batteurs.
      for (let i = 0; i < 2; i++) {
        const p = F_PIVOTS[i], bout = boutBatteur(i, s.ang[i]);
        ctx.lineCap = "round"; ctx.strokeStyle = N; ctx.lineWidth = F_EP * 2 + 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(bout[0], bout[1]); ctx.stroke();
        ctx.strokeStyle = O; ctx.lineWidth = F_EP * 2 - 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(bout[0], bout[1]); ctx.stroke();
        ctx.fillStyle = Y; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill();
      }
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
      const n = noteFlipper(s);
      bandeau(ctx, s.score + " pts · " + n + "/10", duree - s.t, duree);
      if (!clos && s.t - s.msgT < 1) { ctx.fillStyle = "rgba(38,7,109,.86)"; ctx.beginPath(); ctx.roundRect(70, 340, 220, 40, 14); ctx.fill(); texte(ctx, s.msg, 180, 361, 17, Y); }
      if (clos) { ctx.fillStyle = "rgba(38,7,109,.92)"; ctx.beginPath(); ctx.roundRect(40, 180, 280, 110, 18); ctx.fill(); texte(ctx, n + " / 10", 180, 220, 40, Y); texte(ctx, s.score + " points au compteur", 180, 262, 16, C); }
    }
    const arret = boucle(dt => {
      if (!clos) {
        pasFlipper(s, dt, duree);
        if (s.fini) {
          clos = true; lache();
          const n = noteFlipper(s), pl = (k, un, des) => k + " " + (k > 1 ? des : un);
          const bilan = pl(s.score, "point", "points") + " : " + n + " sur 10 (1 point de note par tranche de " + RF.palier + " points). " + pl(s.lots, "lot libéré", "lots libérés") + ", " + pl(s.pertes, "bille perdue", "billes perdues") + ".";
          minuterie = setTimeout(() => { arret(); liberer(); retirer(); opt.onFin(n, bilan); }, 1300);
        }
      }
      dessiner();
    });
    cv.focus({ preventScroll: true });
    return () => { clearTimeout(minuterie); arret(); liberer(); retirer(); };
  }

  const api = { bowling, tir, flipper, tennis, _coeur: { REGL, creerLancer, pasLancer, tombees, PLACES, creerTir, pasTir, noteTir, TOTAL, REGL_FLIPPER: RF, creerFlipper, pasFlipper, noteFlipper, F_PIVOTS, boutBatteur, REGL_TENNIS: RT, creerTennis, pasTennis, noteTennis, viseTennis, T_YJ } };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PharmacoJeux = api;
})(typeof window !== "undefined" ? window : globalThis);
