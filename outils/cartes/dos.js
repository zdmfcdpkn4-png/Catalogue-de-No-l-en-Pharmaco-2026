const { chromium } = require('playwright'), path = require('path');
(async () => { const b = await chromium.launch();
  for (const dpr of [1, 1.5]) { const p = await b.newPage({ viewport: { width: 720, height: 1060 }, deviceScaleFactor: dpr });
    await p.goto('file://' + path.resolve(__dirname, 'dos.html')); await p.evaluate(() => Promise.all([...document.fonts].map(f => f.load())));
    for (const v of (process.argv[2] || 'laiton,holo,icone').split(',')) { await p.evaluate(v => window.dos(v), v); await p.waitForTimeout(100);
      await p.locator('#d').screenshot({ path: 'sortie/dos-' + v + '-' + (dpr === 1 ? 680 : 1020) + '.png', omitBackground: true }); } }
  await b.close(); })();
