// Fabrique des cartes de l'enquête (gabarit HTML au-dessus de l'illustration). Données (textes des cartes) : dans l'atelier seulement, jamais ici.
// Prérequis, dans outils/cartes : npm install --no-save @fontsource/baloo-2 @fontsource/fira-sans-extra-condensed ; pip install scipy pillow.
// Usage : python3 decoupe.py <donnees.json> puis node rendre.js <donnees.json> [id] (sorties dans illus/ et sortie/).
// Rend chaque carte du fichier de données sur le gabarit HTML : PNG 680 x 1024 et 1020 x 1536 (sortie/).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), seule = process.argv[3];
  const b = await chromium.launch();
  for (const dpr of [1, 1.5]) {
    const p = await b.newPage({ viewport: { width: 720, height: 1060 }, deviceScaleFactor: dpr });
    await p.goto('file://' + path.resolve(__dirname, 'gabarit.html'));
    await p.evaluate(() => Promise.all([...document.fonts].map(f => f.load())));
    for (const c of D.cartes) {
      if (seule && c.id !== seule) continue;
      for (const v of (c.variantes || [{ suffixe: '' }])) {
        const J = JSON.parse(fs.readFileSync('illus/' + c.id + '.json', 'utf8'));
        const C = Object.assign({ illus: 'illus/' + c.id + '.png', zones: J.bulles, ratio: J.ratio }, c, v);
        await p.evaluate(C => window.rendre(C), C);
        await p.waitForFunction(() => [...document.images].every(i => i.complete));
        await p.locator('#c').screenshot({ path: 'sortie/' + c.id + (v.suffixe || '') + '-' + (dpr === 1 ? '680' : '1020') + '.png', omitBackground: true });
      }
    }
    await p.close();
  }
  await b.close();
})();
