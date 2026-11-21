// Aperçu du minigolf de la paillasse hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-minigolf.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/minigolf.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/minigolf.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  // espion : le jeu confie son état au banc, qui s'en sert pour viser comme un joueur appliqué.
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.minigolf(document.querySelector('#z'), { duree: d, espion: s => { window.etat = s; }, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // Un joueur automatique : dès que le comprimé est arrêté, il cherche le coup qui laisse le moins de chemin jusqu'à l'alvéole,
  // puis fait le geste du piston tiré en arrière (type = mouse ou touch), à partir du milieu de la paillasse.
  const joueur = (p, type) => p.evaluate(type => {
    const J = PharmacoJeux._coeur, R = J.REGL_MINIGOLF, c = () => document.querySelector('.pj-cv'), cartes = new Map();
    const ev = (t, x, y, btn) => { const r = c().getBoundingClientRect(); c().dispatchEvent(new PointerEvent(t, { pointerId: 5, pointerType: type, buttons: btn, pressure: btn ? 0.5 : 0, clientX: r.left + x / 360 * r.width, clientY: r.top + y / 360 * r.width, bubbles: true, cancelable: true })); };
    clearInterval(window.auto); window.gestes = 0;
    window.auto = setInterval(() => {
      const s = window.etat; if (!s || !J.pretMinigolf(s, 1e9) || window.enGeste) return;
      if (!cartes.has(s.plan)) cartes.set(s.plan, J.distancesMinigolf(s.plan));
      const d = cartes.get(s.plan); let mieux = null;
      for (let a = 0; a < 360; a += 5) for (const f of [0.25, 0.4, 0.55, 0.7, 0.85, 1]) {
        const vx = Math.sin(a * Math.PI / 180) * f * R.vmax, vy = -Math.cos(a * Math.PI / 180) * f * R.vmax, r = J.apresMinigolf(s, vx, vy), v = r.dedans ? -1 : d(r.x, r.y);
        if (!mieux || v < mieux.v) mieux = { v, vx, vy };
      }
      window.enGeste = true; window.gestes++;
      const x0 = 180, y0 = 260, x1 = x0 - mieux.vx / R.k, y1 = y0 - mieux.vy / R.k;
      ev('pointerdown', x0, y0, 1); ev('pointermove', (x0 + x1) / 2, (y0 + y1) / 2, 1); ev('pointermove', x1, y1, 1);
      setTimeout(() => { ev('pointerup', x1, y1, 0); window.enGeste = false; }, 30);
    }, 60);
  }, type);
  const etat = p => p.evaluate(() => { const s = window.etat; return { points: s.points, alveoles: s.trous, premiers: s.premiers, coups: s.coupsT, paillasse: s.n + 1, gestes: window.gestes }; });
  // 1. Téléphone large, à la souris.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 40);
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/minigolf-1-depart.png' });
  // Un geste tenu, pour la capture de la visée (piston tiré vers le bas : le comprimé partira vers le haut).
  const bx = await p.locator('.pj-cv').boundingBox(), k = bx.width / 360;
  await p.mouse.move(bx.x + 200 * k, bx.y + 300 * k); await p.mouse.down(); await p.mouse.move(bx.x + 203 * k, bx.y + 368 * k, { steps: 5 });
  await p.waitForTimeout(150); await p.screenshot({ path: dir + '/minigolf-2-visee.png' }); await p.mouse.up();
  await p.waitForTimeout(500); await p.screenshot({ path: dir + '/minigolf-2-roule.png' });
  const apresGeste = await p.evaluate(() => window.etat.coupsT);
  await joueur(p, 'mouse');
  // Une capture de chaque paillasse, à son arrivée (les huit plans, si le joueur automatique va assez loin).
  const vues = new Set();
  for (let i = 0; i < 380; i++) {
    const n = await p.evaluate(() => window.fin ? -1 : window.etat.n);
    if (n < 0) break;
    if (n > 0 && n < 8 && !vues.has(n) && await p.evaluate(() => window.etat.pause <= 0)) { vues.add(n); await p.waitForTimeout(120); await p.screenshot({ path: dir + '/minigolf-3-paillasse-' + (n + 1) + '.png' }); }
    await p.waitForTimeout(100);
  }
  const souris = await fin(p); await p.screenshot({ path: dir + '/minigolf-4-fin.png' });
  const etatSouris = await etat(p); await p.evaluate(() => clearInterval(window.auto));
  // 2. Au clavier : la visée part vers l'alvéole ; forcer, jouer : le comprimé doit partir (un coup compté) et, sur la première paillasse, rentrer.
  await lancer(p, 9); await p.mouse.move(2, 2);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight');
  await p.screenshot({ path: dir + '/minigolf-5-clavier-visee.png' });
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(300); await p.keyboard.up('ArrowLeft');
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(900); await p.keyboard.up('ArrowUp');
  await p.keyboard.press('Space'); await p.waitForTimeout(450); await p.screenshot({ path: dir + '/minigolf-6-clavier-joue.png' });
  const coupsClavier = await p.evaluate(() => window.etat.coupsT);
  const clavier = await fin(p);
  // 3. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 6); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(8500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 5); await p.waitForTimeout(5400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Téléphone de 320 px, au doigt, mouvements réduits.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' }, 296);
  await lancer(tel, 25); await tel.waitForTimeout(600); await tel.screenshot({ path: dir + '/minigolf-7-telephone-320-depart.png' });
  await joueur(tel, 'touch');
  await tel.waitForTimeout(12000); await tel.screenshot({ path: dir + '/minigolf-7-telephone-320.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth), await etat(tel)];
  await tel.screenshot({ path: dir + '/minigolf-8-telephone-320-fin.png' });
  // 5. Largeur PC, sans jouer : la note et le score brut doivent être 0.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 5); await pc.waitForTimeout(2500); await pc.screenshot({ path: dir + '/minigolf-9-pc.png' });
  console.log(JSON.stringify({ souris, etatSouris, coupsApresUnGesteSouris: apresGeste, clavier, coupsClavier, telephone, pc: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
