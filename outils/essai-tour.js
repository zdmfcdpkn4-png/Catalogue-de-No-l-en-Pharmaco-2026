// Aperçu de la tour de garde hors du site : parties automatiques dans Chromium (clavier, doigt à 320 px, souris en
// largeur PC), mouvements réduits, arrêt en cours de partie, joueur immobile, avec captures.
// Usage : node outils/essai-tour.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/tour.html', html);
  const b = await chromium.launch();
  const errs = [];
  // geste : ce que fait le joueur automatique pour lâcher (une vraie touche, un vrai clic, un vrai toucher).
  const ouvrir = async (opt, largeur, geste) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/tour.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    await p.exposeFunction('agir', async () => {
      const bx = await p.locator('.pj-cv').boundingBox();
      if (geste === 'clavier') await p.keyboard.press('Space');
      else if (geste === 'doigt') await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height * 0.7);
      else await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height * 0.6);
    });
    return p;
  };
  // espion : le jeu confie son état au banc, qui s'en sert pour viser comme un joueur appliqué.
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.tour(document.querySelector('#z'), { duree: d, espion: s => { window.etat = s; }, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // Le joueur automatique : il lâche quand la boîte passe à l'aplomb du sommet (décalé de « biais » pixels, pour faire pencher la tour).
  const joueur = (p, biais) => p.evaluate(biais => {
    const J = PharmacoJeux._coeur; let avant = 0, vu = -1, occupe = false;
    clearInterval(window.auto); window.gestes = 0; window.biais = biais || 0;
    window.auto = setInterval(() => {
      const s = window.etat; if (!s || s.fini || s.tombe || s.bascule || s.attente > 0 || occupe) { avant = 0; return; }
      if (vu !== s.servis) { vu = s.servis; avant = 0; }
      const f = J.pinceTour(s, 0.02) - (J.cibleTour(s, J.chuteTour()) + window.biais);
      if (avant && f * avant <= 0) { occupe = true; window.gestes++; window.agir().then(() => { occupe = false; }); }
      avant = f;
    }, 4);
  }, biais);
  const etat = p => p.evaluate(() => { const s = window.etat; return { points: s.points, debout: s.pile.length, poses: s.poses, parfaites: s.parfaites, effondrements: s.effondrements, rates: s.rates, servis: s.servis, gestes: window.gestes }; });
  // 1. Téléphone large, au clavier (Espace). D'abord bien droit, puis de travers exprès pour voir pencher et s'effondrer.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 }, 0, 'clavier');
  await lancer(p, 40);
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/tour-1-depart.png' });
  await joueur(p, 0);
  await p.waitForTimeout(5000); await p.screenshot({ path: dir + '/tour-2-clavier-a.png' });
  await p.waitForTimeout(12000); await p.screenshot({ path: dir + '/tour-2-clavier-b.png' });
  const avantPenche = await etat(p);
  await p.evaluate(() => { window.biais = 13; });
  let bascule = false;
  for (let i = 0; i < 300 && !bascule; i++) { bascule = await p.evaluate(() => !!window.etat.bascule && window.etat.bascule.t > 0.3); if (!bascule) await p.waitForTimeout(40); }
  await p.screenshot({ path: dir + '/tour-3-bascule.png' });
  await p.waitForTimeout(450); await p.screenshot({ path: dir + '/tour-3-effondrement.png' });
  await p.evaluate(() => { window.biais = 0; });
  const clavier = await fin(p); await p.screenshot({ path: dir + '/tour-4-fin.png' });
  const etatClavier = await etat(p);
  await p.evaluate(() => clearInterval(window.auto));
  // 1 bis. Les autres touches : Entrée et flèche bas lâchent aussi, une touche tenue ne lâche qu'une fois.
  await lancer(p, 6); await p.waitForTimeout(700);
  await p.keyboard.press('Enter'); await p.waitForTimeout(1100); await p.keyboard.down('ArrowDown'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowDown');
  const touches = await p.evaluate(() => window.etat.servis); await fin(p);
  // 2. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 6); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(8500);
  const apresArret = await p.evaluate(() => window.fois);
  // 2 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 5); await p.waitForTimeout(5400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 3. Téléphone de 320 px, au doigt, mouvements réduits.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }, 296, 'doigt');
  await lancer(tel, 24); await tel.waitForTimeout(500); await tel.screenshot({ path: dir + '/tour-5-telephone-320-depart.png' });
  await joueur(tel, 0);
  await tel.waitForTimeout(14000); await tel.screenshot({ path: dir + '/tour-6-telephone-320.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth), await etat(tel)];
  await tel.screenshot({ path: dir + '/tour-7-telephone-320-fin.png' });
  // 4. Largeur PC, à la souris.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640, 'souris');
  await lancer(pc, 16); await joueur(pc, 0);
  await pc.waitForTimeout(9000); await pc.screenshot({ path: dir + '/tour-8-pc-souris.png' });
  const souris = [await fin(pc), await etat(pc)];
  await pc.evaluate(() => clearInterval(window.auto));
  // 5. Sans jouer : note 0 et score brut 0.
  await lancer(pc, 5); await pc.waitForTimeout(2500); await pc.screenshot({ path: dir + '/tour-9-immobile.png' });
  const immobile = await fin(pc);
  console.log(JSON.stringify({ clavier, avantPenche, etatClavier, bascule, lachersAuxAutresTouches: touches, telephone, souris, immobile, appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
