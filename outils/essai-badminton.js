// Aperçu du badminton des bouchons hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-badminton.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/badminton.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/badminton.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  // espion : le jeu confie son état au banc, qui s'en sert pour frapper comme un joueur appliqué.
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.badminton(document.querySelector('#z'), { duree: d, graine: 7, espion: s => { window.etat = s; }, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // Un joueur automatique : il sert, puis à chaque volant il attend le meilleur instant (le volant au cœur du tamis, ou de la zone
  // de smash quand il arrive haut) et joue le coup par le moyen demandé : mouse ou touch (un appui dans le bon tiers de l'écran)
  // ou clavier (flèches). marteler : il tape sans arrêt, sans regarder.
  const joueur = (p, type, marteler) => p.evaluate(([type, marteler]) => {
    const J = PharmacoJeux._coeur, BD = J.BD, c = () => document.querySelector('.pj-cv');
    const jouer = i => {
      window.gestes++;
      if (type === 'clavier') { const k = ['ArrowLeft', 'ArrowUp', 'ArrowRight'][i]; window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return; }
      const r = c().getBoundingClientRect(), x = r.left + (i + 0.5) / 3 * r.width, y = r.top + r.height * 0.93;
      for (const t of ['pointerdown', 'pointerup']) c().dispatchEvent(new PointerEvent(t, { pointerId: 5, pointerType: type, buttons: t === 'pointerdown' ? 1 : 0, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    };
    cancelAnimationFrame(window.auto); window.gestes = 0; window.vuSmash = 0;
    let vu = -1, qmax = 0, sert = 0;
    const tour = () => {
      window.auto = requestAnimationFrame(tour);
      const s = window.etat; if (!s || s.fini) return;
      if (marteler) { jouer(Math.floor(Math.random() * 3)); return; }
      if (s.phase === 'service') { if (!sert) sert = s.t + 0.4; if (s.t >= sert) { jouer(s.pour % 2); sert = 0; } return; }
      const v = s.v; if (s.phase !== 'jeu' || !v || v.de !== 1 || v.mort) return;
      if (v.n !== vu) { vu = v.n; qmax = 0; }
      const haut = s.prevu && s.prevu.xs !== null, coup = haut ? 'smash' : 'amorti', q = J.qualiteBadminton(s.x + BD.MAIN, coup, v);
      if (q > 0 && (q > 0.8 || q < qmax - 0.02)) { if (haut) window.vuSmash++; jouer(haut ? 2 : s.ax > 262 ? 0 : 1); vu = v.n; qmax = -9; return; }
      if (qmax > -9) qmax = Math.max(qmax, q);
    };
    tour();
  }, [type, !!marteler]);
  const etat = p => p.evaluate(() => { const s = window.etat; return { points: s.points, pour: s.pour, contre: s.contre, frappes: s.frappes, parfaites: s.parfaites, smashs: s.smashs, vides: s.vides, services: s.services, record: s.record, duree: Math.round(s.t), gestes: window.gestes }; });
  const tiers = async (p, i) => { const bx = await p.locator('.pj-cv').boundingBox(); return [bx.x + (i + 0.5) / 3 * bx.width, bx.y + bx.height * 0.93]; };
  // 1. Téléphone large, à la souris : un vrai clic pour servir, puis le joueur automatique.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 55);
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/badminton-1-depart.png' });
  await p.mouse.click(...await tiers(p, 1)); await p.waitForTimeout(450); await p.screenshot({ path: dir + '/badminton-2-service.png' });
  const servicesApresClic = await p.evaluate(() => window.etat.services);
  await joueur(p, 'mouse');
  // Des captures en cours de jeu : un volant qui arrive, un smash, une annonce de point.
  const vues = {};
  for (let i = 0; i < 2500 && Object.keys(vues).length < 4; i++) {
    const v = await p.evaluate(() => { const s = window.etat; if (window.fin || s.fini) return 'fin'; const g = s.geste; return s.phase === 'jeu' && s.v.de === 1 && s.v.y > 250 && s.v.vy > 0 ? 'arrive' : g && g.ok && g.type === 'smash' && s.t - g.t < 0.12 && s.t - g.t > 0.04 ? 'smash' : s.phase === 'pause' && s.t - s.msgT < 0.5 ? (s.bon ? 'point' : 'perdu') : ''; });
    if (v === 'fin') break;
    if (v && !vues[v]) { vues[v] = 1; await p.screenshot({ path: dir + '/badminton-3-' + v + '.png' }); }
    await p.waitForTimeout(15);
  }
  // Le signal de fin du jeu, puis le tableau final commun et ses quatre chiffres.
  await p.waitForFunction(() => window.etat.fini, null, { timeout: 70000 }); await p.waitForTimeout(300); await p.screenshot({ path: dir + '/badminton-4-signal.png' });
  const chiffres = await p.waitForSelector('.pj-fin-ch', { timeout: 6000 }).then(async h => { await p.waitForTimeout(500); await p.screenshot({ path: dir + '/badminton-4-tableau.png' }); return h.evaluate(d => [...d.children].map(c => c.innerText.replace(/\s+/g, ' '))); }).catch(() => null);
  const souris = await fin(p), etatSouris = await etat(p); await p.evaluate(() => cancelAnimationFrame(window.auto));
  // 2. Au clavier : une vraie touche pour servir, puis le joueur automatique aux flèches.
  await lancer(p, 16); await p.mouse.move(2, 2); await p.waitForTimeout(300);
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(350); await p.screenshot({ path: dir + '/badminton-5-clavier.png' });
  const servicesClavier = await p.evaluate(() => window.etat.services);
  await joueur(p, 'clavier');
  const clavier = await fin(p), etatClavier = await etat(p); await p.evaluate(() => cancelAnimationFrame(window.auto));
  // 3. Marteler les boutons sans regarder : la raquette reste perdue, rien ne doit rapporter.
  await lancer(p, 10); await joueur(p, 'mouse', true);
  const martele = await fin(p), etatMartele = await etat(p); await p.evaluate(() => cancelAnimationFrame(window.auto));
  // 4. Arrêt en cours de partie, pendant le signal de fin, puis pendant le tableau final : plus rien ne doit arriver ensuite.
  await lancer(p, 6); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(8500);
  const apresArret = await p.evaluate(() => window.fois);
  await lancer(p, 3); await p.waitForTimeout(3500); await p.evaluate(() => window.stop()); await p.waitForTimeout(5500);
  const apresArretSignal = await p.evaluate(() => window.fois);
  await lancer(p, 3); await p.waitForSelector('.pj-fin', { timeout: 8000 }); await p.evaluate(() => window.stop()); await p.waitForTimeout(5000);
  const apresArretTableau = [await p.evaluate(() => window.fois), await p.locator('.pj-fin').count()];
  // 5. Téléphone de 320 px, au doigt, mouvements réduits : un vrai toucher pour servir, puis le joueur automatique.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }, 296);
  await lancer(tel, 30); await tel.waitForTimeout(600); await tel.screenshot({ path: dir + '/badminton-6-telephone-320-depart.png' });
  await tel.touchscreen.tap(...await tiers(tel, 0)); await tel.waitForTimeout(400);
  const servicesDoigt = await tel.evaluate(() => window.etat.services);
  await joueur(tel, 'touch');
  await tel.waitForTimeout(9000); await tel.screenshot({ path: dir + '/badminton-6-telephone-320.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth), await etat(tel)];
  // 6. Largeur PC, sans jouer : la note et le score brut doivent être 0.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 5); await pc.waitForTimeout(2500); await pc.screenshot({ path: dir + '/badminton-7-pc.png' });
  console.log(JSON.stringify({ souris, chiffres, etatSouris, servicesApresClic, capturesEnJeu: Object.keys(vues), clavier, servicesClavier, etatClavier, martele, etatMartele, telephone, servicesDoigt, pcSansJouer: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLeSignal: apresArretSignal, appelsApresArretPendantLeTableau: apresArretTableau, erreurs: errs }, null, 1));
  await b.close();
})();
