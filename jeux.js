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

  const api = { bowling, tir, _coeur: { REGL, creerLancer, pasLancer, tombees, PLACES, creerTir, pasTir, noteTir, TOTAL } };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PharmacoJeux = api;
})(typeof window !== "undefined" ? window : globalThis);
