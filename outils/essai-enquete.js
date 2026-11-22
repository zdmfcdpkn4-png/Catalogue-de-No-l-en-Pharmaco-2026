// Banc d'essai du bloc « L'Affaire du Lot 22 » (enquete.js), sans serveur : un faux serveur vit dans la page.
// Les énigmes de ce banc sont factices (aucune énigme ni réponse du vrai scénario, qui reste dans la banque chiffrée).
//   node outils/essai-enquete.js [dossier des captures]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const dossier = process.argv[2] || path.join(require('os').tmpdir(), 'essai-enquete');
fs.mkdirSync(dossier, { recursive: true });
const racine = path.join(__dirname, '..');
let echecs = 0;
const ok = (cond, texte) => { console.log((cond ? 'OK   ' : 'ECHEC ') + texte); if (!cond) echecs++; };

(async () => {
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.setContent('<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;font-family:sans-serif"><section id="zone"></section></body></html>');
  await page.addScriptTag({ path: path.join(racine, 'enquete.js') });
  await page.evaluate(() => {
    // Faux serveur : même contrat que l'action "enquete" de api/enigme.js.
    const BONNES = { 3: 1, 4: 'sept' }, norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const S = window.S = {
      fiche: true, envois: [],
      Q: {
        titre: "L'Affaire du Lot 22", fiction: true, points: 1, max: 30,
        enigmes: [
          { k: 1, jour: 4, etat: 'close', titre: 'Factice un', enonce: 'Énoncé factice un.', saisie: 'choix', options: ['A', 'B'], repondu: true, juste: true, resolue: true, par: 'Testeur', revelation: 'Une carte factice sort du jeu.', elimine: 'tampon' },
          { k: 2, jour: 5, etat: 'close', titre: 'Factice deux', enonce: 'Énoncé factice deux.', saisie: 'texte', repondu: false, juste: false, resolue: false, revelation: 'Un indice factice, donné d\'office.' },
          { k: 3, jour: 6, etat: 'ouverte', titre: 'Factice trois', enonce: 'Combien font 1 + 1 ?', saisie: 'choix', options: ['1', '2', '3'], repondu: false, juste: false, resolue: false },
          { k: 4, jour: 7, etat: 'ouverte', titre: 'Factice quatre', enonce: 'Écrivez le nombre 7 en lettres.', saisie: 'texte', repondu: false, juste: false, resolue: false },
          { k: 5, jour: 8, etat: 'avenir' },
        ],
        classement: [{ b: 0, points: 1 }, { b: 1, points: 2 }, { b: 2, points: 0 }],
      },
    };
    S.envoyer = async (k, reponse) => {
      S.envois.push([k, reponse]);
      const e = S.Q.enigmes.find(x => x.k === k);
      if (!e || e.etat !== 'ouverte') return { status: 403, j: { error: 'close' } };
      if (e.repondu || e.resolue) return { status: 409, j: { error: 'deja', enquete: S.Q } };
      e.repondu = true;
      e.juste = typeof BONNES[k] === 'number' ? reponse === BONNES[k] : norm(reponse) === BONNES[k];
      if (e.juste) { e.resolue = true; e.par = 'Testeur'; e.revelation = k === 3 ? 'Une autre carte factice sort du jeu.' : 'Un indice factice.'; if (k === 3) e.elimine = 'pause'; S.Q.points++; }
      return { status: 200, j: { ok: true, enquete: S.Q } };
    };
    S.bloc = window.PharmacoEnquete.monter(document.getElementById('zone'), {
      envoyer: S.envoyer, peutRepondre: () => S.fiche, identifier: () => { S.demandeFiche = true; }, brigade: b => 'Brigade ' + (b + 1), mienne: () => 0,
    });
    S.bloc.maj(S.Q);
  });
  const txt = sel => page.locator(sel).first().innerText();

  ok((await page.locator('.enq-fic').innerText()).toLowerCase() === 'fiction', 'mention « Fiction » sous le titre');
  ok(await page.locator('.enq-sec .enq-l > li[data-k="3"]').count() === 1 && await page.locator('#enqT1').innerText() === '2 énigmes à résoudre', 'deux énigmes ouvertes affichées');
  ok(await page.locator('.enq-cols li').count() === 18, 'fiche de suivi : dix-huit fiches');
  ok(await page.locator('.enq-cols li.x').count() === 1 && (await txt('.enq-cols li.x')).includes('Tampon Dateur'), 'fiche de suivi : la carte éliminée est cochée');
  ok((await txt('.enq-ind')).includes('donné d\'office'), 'carnet d\'indices : la révélation d\'office y figure');
  ok(!(await page.content()).includes('énigme 5') && await page.locator('li[data-k="5"]').count() === 0, 'énigme à venir : rien n\'est montré');
  ok((await txt('.enq-next')).includes('8 décembre'), 'date de la prochaine énigme');
  await page.screenshot({ path: path.join(dossier, '1-accueil.png'), fullPage: true });

  // Répondre sans rien choisir : erreur, aucun envoi.
  await page.click('[data-rep="3"]');
  ok((await txt('li[data-k="3"] .enq-err')).includes('Choisissez'), 'réponse vide refusée par la page');
  // Choix, avertissement, renoncement : aucun envoi.
  await page.check('input[name="enq3"][value="0"]');
  await page.click('[data-rep="3"]');
  ok((await txt('li[data-k="3"] .enq-warn')).includes('Un seul essai'), 'avertissement avant l\'envoi');
  await page.screenshot({ path: path.join(dossier, '2-avertissement.png'), fullPage: true });
  await page.click('[data-non="3"]');
  ok((await page.evaluate(() => window.S.envois.length)) === 0, 'renoncer n\'envoie rien');
  // Mauvaise réponse confirmée : essai utilisé, plus de formulaire.
  await page.click('[data-rep="3"]');
  await page.click('[data-envoi="3"]');
  await page.waitForSelector('li[data-k="3"] .enq-etat.ko');
  ok(await page.locator('li[data-k="3"] [data-rep]').count() === 0, 'après une mauvaise réponse : plus de formulaire');
  ok(JSON.stringify(await page.evaluate(() => window.S.envois)) === '[[3,0]]', 'un choix part sous forme d\'indice entier');
  // Texte libre, bonne réponse : révélation, points, énigme rangée.
  await page.fill('#enq4', ' Sept ');
  await page.click('[data-rep="4"]');
  await page.click('[data-envoi="4"]');
  await page.waitForFunction(() => document.querySelector('.enq-pts').textContent.includes('2 points'));
  ok(JSON.stringify(await page.evaluate(() => window.S.envois[1])) === '[4,"Sept"]', 'un texte part tel que saisi, espaces de bord retirés');
  ok((await txt('.enq-ind')).includes('Un indice factice.'), 'bonne réponse : l\'indice rejoint le carnet');
  ok(await page.locator('details li[data-k="4"]').count() === 1, 'énigme résolue rangée dans les énigmes passées');
  // Un coéquipier résout la 3 : la carte se coche à la mise à jour.
  await page.evaluate(() => { const e = window.S.Q.enigmes[2]; e.resolue = true; e.par = 'Coéquipier'; e.revelation = 'Une autre carte factice sort du jeu.'; e.elimine = 'pause'; window.S.bloc.maj(window.S.Q); });
  ok(await page.locator('.enq-cols li.x').count() === 2, 'mise à jour : la fiche de suivi suit les révélations de la brigade');
  // Sans fiche ni brigade : énoncé visible, pas de formulaire.
  await page.evaluate(() => { const Q = window.S.Q; Q.enigmes[4] = { k: 5, jour: 8, etat: 'ouverte', titre: 'Factice cinq', enonce: 'Énoncé factice cinq.', saisie: 'texte', repondu: false, juste: false, resolue: false }; window.S.fiche = false; window.S.bloc.maj(Q); });
  ok((await txt('li[data-k="5"]')).includes('Énoncé factice cinq') && await page.locator('li[data-k="5"] [data-rep]').count() === 0, 'sans fiche : énoncé visible, pas de réponse possible');
  await page.click('[data-fiche]');
  ok(await page.evaluate(() => window.S.demandeFiche === true), 'sans fiche : le bouton renvoie à l\'identification');
  // Refus du serveur : message, essai non perdu côté page.
  await page.evaluate(() => { window.S.fiche = true; window.S.envoyer = async () => ({ status: 403, j: { error: 'close' } }); });
  await page.evaluate(() => { window.S.bloc = window.PharmacoEnquete.monter(document.getElementById('zone'), { envoyer: (k, r) => window.S.envoyer(k, r), peutRepondre: () => true }); window.S.bloc.maj(window.S.Q); });
  await page.fill('#enq5', 'essai');
  await page.click('[data-rep="5"]');
  await page.click('[data-envoi="5"]');
  await page.waitForSelector('li[data-k="5"] .enq-err');
  ok((await txt('li[data-k="5"] .enq-err')).includes('close'), 'refus du serveur affiché');
  // Dénouement et absence d'état.
  await page.evaluate(() => { window.S.Q.denouement = 'Texte de dénouement factice.'; window.S.bloc.maj(window.S.Q); });
  ok((await txt('#enqT4 + p')).includes('factice'), 'dénouement affiché quand le serveur le donne');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.screenshot({ path: path.join(dossier, '3-large.png'), fullPage: true });
  const large = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await page.setViewportSize({ width: 320, height: 700 });
  ok(large && await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pas de défilement horizontal à 320 px ni à 1100 px');
  ok(!/—/.test(await page.content()), 'aucun tiret cadratin');
  // Amorce des trois premiers jours : rien, puis le message, puis le synopsis, puis la fiche.
  const amorce = (A, enigmes) => page.evaluate(([A, enigmes]) => window.S.bloc.maj({ titre: "L'Affaire du Lot 22", fiction: true, points: 0, max: 30, amorces: A, enigmes, classement: [{ b: 0, points: 0 }] }), [A, enigmes || [{ k: 1, jour: 4, etat: 'avenir' }]]);
  const A1 = { n: 1, titre: 'Message factice', texte: 'Une surprise demain.' }, A2 = { n: 2, titre: 'Synopsis factice', texte: 'Le synopsis.' }, A3 = { n: 3, titre: 'Tableaux factices', texte: 'Voici la fiche.', fiche: true };
  await amorce([]);
  ok(await page.locator('#zone').isHidden() && (await page.locator('#zone').innerHTML()) === '', 'amorce : avant toute étape, le bloc ne montre rien');
  await amorce([A1]);
  const t1 = await page.locator('#zone').innerText();
  ok(t1.includes('Une surprise demain') && !/Lot 22|Fiction|Fiche de suivi|énigme/i.test(t1), 'amorce, étape 1 : le message seul, sans titre ni fiche ni énigme');
  await amorce([A1, A2]);
  const t2 = await page.locator('#zone').innerText();
  ok(t2.includes('Lot 22') && t2.includes('Le synopsis.') && await page.locator('.enq-cols').count() === 0 && (await page.locator('.enq-am').innerText()).includes('Synopsis factice'), 'amorce, étape 2 : titre et synopsis en avant, pas encore de fiche');
  await amorce([A1, A2, A3]);
  ok(await page.locator('.enq-cols li').count() === 18 && (await page.locator('.enq-am').innerText()).includes('Tableaux factices') && await page.locator('.enq-pts').count() === 0, 'amorce, étape 3 : la fiche de suivi apparaît, la dernière étape en avant');
  await amorce([], [{ k: 1, jour: 4, etat: 'ouverte', titre: 'Factice', enonce: 'Énoncé.', saisie: 'texte', repondu: false, juste: false, resolue: false }]);
  ok(await page.locator('.enq-cols li').count() === 18 && await page.locator('li[data-k="1"]').count() === 1, 'première énigme ouverte : tout s\'affiche, même sans étape reçue');
  await page.screenshot({ path: path.join(dossier, '4-amorce.png'), fullPage: true });
  await page.evaluate(() => window.S.bloc.maj(null));
  ok(await page.locator('#zone').isHidden(), 'sans champ enquete : le bloc se cache');
  ok(erreurs.length === 0, 'aucune erreur de script' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));

  await nav.close();
  console.log(echecs ? echecs + ' échec(s)' : 'Tout est bon. Captures : ' + dossier);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
