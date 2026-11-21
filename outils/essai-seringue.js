// Aperçu de « Droit au septum » (le lancer de seringue) hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-seringue.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/seringue.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/seringue.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  // espion : le jeu confie son état au banc, qui s'en sert pour viser comme un joueur appliqué.
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.seringue(document.querySelector('#z'), { duree: d, espion: s => { window.etat = s; }, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // Un joueur automatique : dès que la seringue est prête, il pose le pointeur, glisse jusqu'au point parfait et lâche (type = mouse ou touch).
  // Au doigt, il appuie « decal » px sous le point visé, puisque la mire se tient au-dessus du doigt.
  const joueur = (p, type, cadence) => p.evaluate(([type, cadence]) => {
    const J = PharmacoJeux._coeur, R = J.REGL_SERINGUE, c = () => document.querySelector('.pj-cv');
    const ev = (t, x, y, btn) => { const r = c().getBoundingClientRect(); c().dispatchEvent(new PointerEvent(t, { pointerId: 5, pointerType: type, buttons: btn, pressure: btn ? 0.5 : 0, clientX: r.left + x / 360 * r.width, clientY: r.top + y / 360 * r.width, bubbles: true, cancelable: true })); };
    clearInterval(window.auto); window.gestes = 0; let dernier = -9;
    window.auto = setInterval(() => {
      const s = window.etat; if (!s || s.fini || s.t - dernier < cadence) return;
      const v = J.viserSeringue(s); if (!v) return;
      const d = type === 'mouse' ? 0 : R.decal;
      window.gestes++; dernier = s.t;
      ev('pointerdown', 180, 300 + d, 1); ev('pointermove', (180 + v.x) / 2, (300 + v.y) / 2 + d, 1); ev('pointermove', v.x, v.y + d, 1); ev('pointerup', v.x, v.y + d, 0);
    }, 30);
  }, [type, cadence]);
  // 1. Téléphone large, à la souris.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 40);
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/seringue-1-depart.png' });
  // Un vrai clic de souris à côté du flacon, pour les captures de la visée, du vol et d'un raté.
  const bx = await p.locator('.pj-cv').boundingBox(), k = bx.width / 360;
  await p.mouse.move(bx.x + 60 * k, bx.y + 300 * k, { steps: 4 }); await p.waitForTimeout(150); await p.screenshot({ path: dir + '/seringue-2-visee.png' });
  await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(200); await p.screenshot({ path: dir + '/seringue-2-vol.png' });
  await p.waitForTimeout(450); await p.screenshot({ path: dir + '/seringue-2-rate.png' });
  const apresClic = await p.evaluate(() => ({ lances: window.etat.lances, points: window.etat.points }));
  await joueur(p, 'mouse', 1.9);
  await p.waitForTimeout(1500); await p.screenshot({ path: dir + '/seringue-3-jeu-a.png' });
  await p.waitForTimeout(4600); await p.screenshot({ path: dir + '/seringue-3-releve.png' });
  await p.waitForTimeout(6500); await p.screenshot({ path: dir + '/seringue-3-jeu-b.png' });
  await p.waitForTimeout(7000); await p.screenshot({ path: dir + '/seringue-3-jeu-c.png' });
  const souris = await fin(p); await p.screenshot({ path: dir + '/seringue-4-fin.png' });
  const etatSouris = await p.evaluate(() => { clearInterval(window.auto); const s = window.etat; return { points: s.points, septums: s.septums, centres: s.centres, lances: s.lances, gestes: window.gestes, t: +s.t.toFixed(1) }; });
  // 2. Au clavier : monter la mire sur le flacon, lancer ; puis Espace seul en fin de partie. La seringue doit partir (un lancer compté).
  await lancer(p, 9); await p.mouse.move(2, 2); await p.waitForTimeout(600);
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(720); await p.keyboard.up('ArrowUp');
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(120); await p.keyboard.up('ArrowLeft');
  await p.screenshot({ path: dir + '/seringue-5-clavier-visee.png' });
  await p.keyboard.press('Space'); await p.waitForTimeout(650); await p.screenshot({ path: dir + '/seringue-6-clavier-lance.png' });
  const lancesClavier = await p.evaluate(() => ({ lances: window.etat.lances, impact: window.etat.ev && [Math.round(window.etat.ev.ax), Math.round(window.etat.ev.ay), window.etat.ev.zone] }));
  const clavier = await fin(p);
  // 3. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 6); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(8500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 5); await p.waitForTimeout(5400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Téléphone de 320 px, au doigt, effets réduits.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' }, 296);
  await lancer(tel, 40); await joueur(tel, 'touch', 1.6);
  await tel.waitForTimeout(2600); await tel.screenshot({ path: dir + '/seringue-7-telephone-320.png' });
  await tel.waitForTimeout(9000); await tel.screenshot({ path: dir + '/seringue-7-telephone-320-b.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth), await tel.evaluate(() => ({ septums: window.etat.septums, centres: window.etat.centres, lances: window.etat.lances }))];
  await tel.screenshot({ path: dir + '/seringue-8-telephone-320-fin.png' });
  // 5. Largeur PC, sans jouer : la note et le brut doivent être 0.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 5); await pc.waitForTimeout(2500); await pc.screenshot({ path: dir + '/seringue-9-pc.png' });
  console.log(JSON.stringify({ apresClic, souris, etatSouris, clavier, lancesClavier, telephone, pc: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
