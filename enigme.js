/* Pharmacogames de Noël : le concours individuel à points (d'abord appelé « la grande énigme de Noël »).
   À ne pas confondre avec le vote du jeu préféré, qui vit dans vote.js.
   Propre au site Vercel : ce module parle à /api/enigme (prénom et code d'équipe exigés).
   Une porte par jour du 1er au 25 décembre, ouverte trois jours ; les questions, les solutions et les points
   viennent du serveur, rien n'est écrit ici. L'énoncé d'une question n'arrive qu'avec son chrono ; les jeux
   d'adresse (jeux.js, chargé à la demande) renvoient une note de 0 à 10. Sans serveur, par exemple dans l'artefact claude.ai, rien ne s'affiche. */
(() => {
  const API = "/api/enigme", KEY = "pharmacotechnie-enigme-2026", KEY_VOTE = "pharmacotechnie-vote-2026";
  const q = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'").toLowerCase();
  const PRENOM = /^\p{L}+(?:[-']\p{L}+)*$/u;
  const fr = s => h(s).replace(/ ([?!:;»])/g, "\u00A0$1").replace(/« /g, "«\u00A0");
  const pl = (n, un, des) => n + " " + (n > 1 ? des : un);
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { mem = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} };
  // E : dernier état reçu du serveur ; choix : porte affichée ; brouillon : réponse en cours de saisie.
  // echeance : fin du chrono de chaque question lancée, à l'horloge de l'appareil ; enJeu : arrêt du jeu en cours.
  let E = null, choix = 0, brouillon = null, aConfirmer = false, relecture = "", occupe = false, sec;
  let echeance = {}, tic = 0, enJeu = null;
  // enFiche : la fiche d'identification (avatar, brigade) occupe le panneau ; participants.js la dessine.
  let enFiche = false;
  // versFiche : arrivée par la pastille « Pharmacomeeple » du menu (#pharmacomeeple) ; la fiche s'ouvre dès que le calendrier est chargé.
  let versFiche = false;

  const call = async body => {
    const r = await fetch(API, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    return { status: r.status, j };
  };

  fetch(API, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.ready) init(); }).catch(() => {});

  // Dates : le serveur parle en AAAA-MM-JJ, heure de Paris.
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const dt = (iso, plus) => { const [a, m, j] = iso.split("-").map(Number); return new Date(a, m - 1, j + (plus || 0)); };
  const jour = (d, court) => (court ? "" : JOURS[d.getDay()] + " ") + d.getDate() + (d.getDate() === 1 ? "er" : "") + " " + (court ? MOIS[d.getMonth()].slice(0, 3) + "." : MOIS[d.getMonth()]);
  const val = (p, v) => (p.type === "qcm" ? p.options[v].t : p.prefixe ? p.prefixe + String(v).padStart(2, "0") : v + (p.unite ? " " + p.unite : ""));

  const NOTICE = `<details class="eg-panel eg-notice" id="egNotice" open><summary>Notice des Pharmacogames : à lire avant la première prise</summary>
<ol class="eg-rules">
<li><b>Composition.</b> 25 portes, une par jour du 1<sup>er</sup> au 25 décembre : dix cases de cinq questions illustrées, chacune sur un thème du jeu de société, et quinze vrais jeux d'adresse.</li>
<li><b>Chrono.</b> Les cinq questions d'une case s'enchaînent, chacune avec son chrono : 30 ou 40 secondes, annoncées avant le départ. L'énoncé ne s'affiche qu'au lancement du chrono. Une seule tentative par question, et pas le temps d'aller chercher la réponse ailleurs.</li>
<li><b>Barème des questions.</b> Chaque question vaut 2 points, soit 10 par case. Le bon flacon : 2 points. Au dosage, entre 0 et 100 : 2 points à 2 près de la cible, 1 point à 10 près.</li>
<li><b>Jeux d'adresse.</b> Deux tentatives chronométrées, la meilleure compte. La note sur 10 affichée après la partie vous situe ; les points, eux, viennent du classement de la porte à sa clôture : 10 points pour le premier, 1 pour le dernier, les autres répartis entre les deux. Sans rien marquer : 0 point.</li>
<li><b>Délai de péremption.</b> Une porte reste ouverte trois jours : le sien, le lendemain et le surlendemain jusqu'à minuit. Les week-ends se rattrapent.</li>
<li><b>Libération des résultats.</b> Bonne réponse, points et classement sortent à la clôture de la porte. D'ici là, tout reste sous scellé, et on ne souffle rien au voisin.</li>
</ol>
<p class="eg-fx">Effet indésirable très fréquent : consultation compulsive du classement.</p></details>`;
  const SCEAU = '<svg class="eg-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.2 2 3-.3.7 2.9 2.6 1.5-1.2 2.7 1.2 2.7-2.6 1.5-.7 2.9-3-.3-2.2 2-2.2-2-3 .3-.7-2.9L1.5 13l1.2-2.7L1.5 7.6l2.6-1.5.7-2.9 3 .3z" fill="currentColor"/><path d="M6.4 10.3l2.4 2.4 4.6-4.9" fill="none" stroke="#26076D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CADENAS = '<svg class="eg-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 9V6.5a4 4 0 0 1 8 0V9" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="3.5" y="9" width="13" height="9.5" rx="2.5" fill="currentColor"/></svg>';

  const CSS = `
.eg [hidden]{display:none!important}
.eg .adv-intro a{color:inherit;font-weight:800;text-underline-offset:3px}
.eg-body{display:grid;grid-template-columns:minmax(0,470px) minmax(0,1fr);gap:24px 28px;align-items:start;margin-top:18px}
.eg-panel{min-width:0;padding:16px 18px 18px;background:var(--surface);color:var(--on-surface);border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.eg-gate{max-width:420px;margin-top:18px}
.eg-panel h3{margin:0;font-weight:800;font-size:1.3rem;line-height:1.1}
.eg-panel label{display:block;margin:14px 0 5px;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-gate input{display:block;width:100%;min-height:46px;font:700 1rem var(--display);color:var(--on-surface);background:#fff;border:2.5px solid var(--line);border-radius:12px;padding:8px 10px}
.eg-hint{margin:8px 0 0;font-size:.82rem;color:var(--muted)}
.eg-d{margin:10px 0 0;font-size:1rem}
.eg-msg{margin:12px 0 0;font-size:.95rem;font-weight:800}
.eg-msg:empty{display:none}
.eg-msg.err{color:var(--off)}.eg-msg.ok{color:var(--ok)}
.eg-notice{margin-top:18px;padding:8px 16px}
.eg-notice[open]{padding-bottom:16px}
.eg-notice>summary{display:flex;align-items:center;gap:10px;min-height:40px;font-weight:800;font-size:1.08rem;line-height:1.15;cursor:pointer;list-style:none}
.eg-notice>summary::-webkit-details-marker{display:none}
.eg-notice>summary::before{content:"+";display:inline-grid;place-items:center;flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--mu);color:#26076D;border:2px solid var(--line);font-weight:800;line-height:1}
.eg-notice[open]>summary::before{content:"\\2212"}
.eg-rules{display:grid;gap:9px;margin:8px 0 0;padding:0;list-style:none;counter-reset:eg}
.eg-rules li{position:relative;min-height:26px;padding-left:36px;font-size:.92rem;line-height:1.4}
.eg-rules li::before{counter-increment:eg;content:counter(eg);position:absolute;left:0;top:-1px;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--pressed);color:var(--pressed-on);font:800 .82rem/1 var(--display)}
.eg-rules b{font-weight:800}
.eg-fx{margin:12px 0 0;padding:8px 11px;border:2.5px dashed var(--line);border-radius:12px;font-size:.86rem;font-weight:700}
.eg-banner{margin:18px 0 0;padding:10px 14px;background:var(--mu);color:#26076D;border:3px solid var(--line);border-radius:14px;box-shadow:5px 5px 0 var(--shadow);font-weight:800}
/* Calendrier : 25 portes */
.eg-sheet{position:relative;min-width:0;padding:12px 12px 14px;color:var(--on-surface);background:linear-gradient(135deg,var(--foil-a),var(--foil-b) 52%,var(--foil-a));border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.eg-cap{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;font:600 .68rem/1.2 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.eg-cap b{min-width:0;font-weight:600;text-align:right;overflow-wrap:anywhere}
.eg-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px 8px}
.eg-cell{position:relative;aspect-ratio:5/6;min-width:0;margin:0;padding:0;border:0;background:none;color:var(--on-surface);font:800 clamp(.56rem,2.3vw,.78rem)/1.1 var(--display);cursor:pointer;-webkit-tap-highlight-color:transparent}
.eg-door{position:relative;display:grid;grid-template-rows:minmax(0,1fr) auto;justify-items:center;align-items:center;width:100%;height:100%;padding:16% 2px 9%;overflow:hidden;border:2.5px solid var(--line);border-radius:48% 48% 9px 9px/36% 36% 9px 9px;background:var(--surface);box-shadow:3px 3px 0 var(--shadow);transition:transform .15s cubic-bezier(.2,.8,.2,1)}
.eg-door::after{content:"";position:absolute;right:11%;top:56%;width:11%;aspect-ratio:1;border-radius:50%;background:currentColor;opacity:.55}
.eg-door b{font-size:2.05em;line-height:1;font-variant-numeric:tabular-nums}
.eg-door small{display:flex;align-items:center;gap:3px;font:600 .88em/1.1 var(--mono);letter-spacing:.02em;text-transform:uppercase;white-space:nowrap}
.eg-ic{width:1.15em;height:1.15em;flex:0 0 auto}
.eg-cell.av .eg-ic{width:1.5em;height:1.5em}
@media(hover:hover){.eg-cell:hover .eg-door{transform:translateY(-2px)}}
.eg-cell:active .eg-door{transform:scale(.95)}
.eg-cell.av .eg-door{color:var(--muted);background:repeating-linear-gradient(135deg,var(--foil-a) 0 7px,var(--foil-b) 7px 14px);box-shadow:none;border-color:color-mix(in srgb,var(--line) 55%,transparent)}
.eg-cell.ou .eg-door{background:var(--mu);animation:egPulse 1.9s ease-in-out infinite}
@keyframes egPulse{0%,100%{box-shadow:3px 3px 0 var(--shadow),0 0 0 0 rgba(236,119,57,.75)}50%{box-shadow:3px 3px 0 var(--shadow),0 0 0 7px rgba(236,119,57,0)}}
.eg-cell.sc .eg-door{color:var(--pressed-on);background:var(--pressed)}
.eg-cell.ok .eg-door{background:var(--surface)}
.eg-cell.ok .eg-door small{font-weight:800;font-size:1.05em;color:var(--cEt)}
.eg-cell.ok.max .eg-door{background:radial-gradient(120% 90% at 30% 14%,#fffbe3 0 14%,#f6e79a 42%,#ECD567 100%)}
.eg-cell.ko .eg-door{color:var(--muted);background:var(--foil-b);box-shadow:none}
.eg-cell.rl .eg-door{background:var(--tF)}
.eg-cell.sel .eg-door{outline:3.5px solid #EC7739;outline-offset:2px;transform:translateY(-2px)}
.eg-cell:focus-visible{outline:0}
.eg-cell:focus-visible .eg-door{outline:3.5px solid var(--focus);outline-offset:2px}
.eg-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:12px 0 0;font:600 .64rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase}
.eg-legend span{display:inline-flex;align-items:center;gap:5px}
.eg-legend i{width:12px;height:14px;border-radius:45% 45% 3px 3px/35% 35% 3px 3px;border:2px solid var(--line)}
.eg-legend .k0{background:var(--foil-b)}.eg-legend .k1{background:var(--mu)}.eg-legend .k2{background:var(--pressed)}.eg-legend .k3{background:var(--surface)}
.eg-score{margin:10px 0 0;padding-top:10px;border-top:3px dashed color-mix(in srgb,var(--line) 35%,transparent);font-weight:800;font-size:.95rem}
.eg-tools{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin:0}
/* Porte ouverte : illustration, question, réponse */
.eg-ill{margin:12px 0 0;border:3px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
.eg-ill svg{display:block;width:100%;height:auto;font-family:var(--display)}
.eg-q{margin:12px 0 0;font-size:1.08rem;font-weight:800;line-height:1.3}
.eg-sub{margin-top:18px;padding-top:14px;border-top:2.5px dashed var(--line)}
.eg-sub h4{margin:2px 0 0;font-weight:800;font-size:1.1rem;line-height:1.15}
.eg-opts{display:grid;gap:9px;margin:12px 0 0}
.eg-opts.img{grid-template-columns:repeat(2,minmax(0,1fr))}
.eg-opt{display:flex;align-items:center;gap:10px;min-width:0;min-height:50px;margin:0;padding:8px 12px;text-align:left;font:700 .98rem/1.25 var(--display);color:var(--on-surface);background:#fff;border:2.5px solid var(--line);border-radius:12px;cursor:pointer}
.eg-opt i{display:grid;place-items:center;flex:0 0 auto;width:28px;height:28px;border-radius:50%;border:2px solid var(--line);background:var(--foil-a);font:800 .85rem/1 var(--display);font-style:normal}
.eg-opt span{min-width:0;overflow-wrap:anywhere}
.eg-opts.img .eg-opt{flex-direction:column;align-items:center;text-align:center;padding:10px 8px}
.eg-opts.img .eg-opt img{display:block;width:100%;max-width:120px;aspect-ratio:1;object-fit:contain}
.eg-opts.img .eg-opt i{position:absolute;left:7px;top:7px}
.eg-opts.img .eg-opt{position:relative}
button.eg-opt[aria-pressed="true"]{background:var(--pressed);color:var(--pressed-on);box-shadow:3px 3px 0 var(--shadow)}
button.eg-opt[aria-pressed="true"] i{background:var(--mu);color:#26076D}
div.eg-opt{cursor:default}
div.eg-opt.mien{background:var(--foil-a);border-style:dashed}
div.eg-opt.bon{background:#DDF3E6;border-color:var(--ok)}
div.eg-opt.bon i{background:var(--ok);border-color:var(--ok);color:#fff}
.eg-opt em{display:block;margin-top:3px;font:600 .64rem/1.2 var(--mono);font-style:normal;letter-spacing:.04em;text-transform:uppercase}
.eg-dose{margin:14px 0 0;padding:12px 12px 8px;background:#fff;border:2.5px solid var(--line);border-radius:14px}
.eg-val{display:block;text-align:center;font:800 2.5rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-val small{display:block;margin-top:2px;font:600 .72rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-slide{display:flex;align-items:center;gap:10px;margin-top:10px}
.eg-step{flex:0 0 auto;width:44px;height:44px;border:2.5px solid var(--line);border-radius:50%;background:var(--mu);color:#26076D;font:800 1.4rem/1 var(--display);cursor:pointer}
.eg-slide input{flex:1 1 auto;min-width:0;height:44px;margin:0;accent-color:#EC7739}
.eg-scale{display:flex;justify-content:space-between;margin:0 54px;font:600 .68rem/1 var(--mono);color:var(--muted)}
.eg-chrono{display:flex;align-items:center;gap:14px;margin:14px 0 0;padding:12px 14px;background:var(--mu);color:#26076D;border:2.5px solid var(--line);border-radius:14px}
.eg-chrono b{flex:0 0 auto;display:grid;place-items:center;width:66px;height:66px;border-radius:50%;background:var(--surface);border:3px solid var(--line);font:800 1.2rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-chrono span{font-size:.92rem;font-weight:700;line-height:1.35}
.eg-time{display:flex;align-items:center;gap:10px;margin:12px 0 0}
.eg-time b{flex:0 0 auto;min-width:3.4em;font:800 1.5rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-time span{flex:1 1 auto;height:14px;border:2.5px solid var(--line);border-radius:999px;background:var(--foil-a);overflow:hidden}
.eg-time i{display:block;height:100%;width:100%;background:var(--ok);transition:width .2s linear}
.eg-time.fin b{color:var(--off)}.eg-time.fin i{background:var(--off)}
.eg-ill.jeu{border:0;border-radius:0;background:none;overflow:visible}
.pj-cv{display:block;margin:0 auto;border:3px solid var(--line);border-radius:14px;box-shadow:4px 4px 0 var(--shadow);touch-action:none;outline-offset:3px}
.eg-tent{display:grid;gap:6px;margin:12px 0 0;padding:0;list-style:none}
.eg-tent li{display:flex;justify-content:space-between;gap:10px;padding:7px 12px;background:#fff;border:2.5px solid var(--line);border-radius:12px;font-weight:800}
.eg-tent li.top{background:var(--tI)}
.eg-tent span{font:600 .72rem/1.6 var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.eg-seal{display:flex;align-items:center;gap:12px;margin:14px 0 0;padding:12px 14px;background:var(--pressed);color:var(--pressed-on);border:2.5px solid var(--line);border-radius:14px}
.eg-seal .eg-ic{width:34px;height:34px}
.eg-seal small{display:block;font:600 .68rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase}
.eg-seal b{display:block;font-size:1.25rem;line-height:1.15;overflow-wrap:anywhere}
.eg-cible{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0 0}
.eg-cible div{padding:10px 12px;border:2.5px solid var(--line);border-radius:12px;background:#fff}
.eg-cible .bon{background:#DDF3E6;border-color:var(--ok)}
.eg-cible small{display:block;font:600 .66rem/1.2 var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-cible b{display:block;margin-top:2px;font-size:1.3rem;line-height:1.1;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.eg-pts{display:inline-block;margin:12px 0 0;padding:5px 12px;background:var(--mu);color:#26076D;border:2.5px solid var(--line);border-radius:999px;font-weight:800}
.eg-pts.zero{background:var(--foil-b)}
.eg-ex{margin:12px 0 0;padding:10px 12px;border:2.5px dashed var(--line);border-radius:12px;font-size:.95rem}
.eg-src{margin:8px 0 0;font-size:.8rem;color:var(--muted)}
.eg-src a{color:inherit}
/* Classement */
.eg-rank{margin-top:24px}
.eg-rhead{display:flex;align-items:baseline;justify-content:space-between;gap:6px 12px;flex-wrap:wrap}
.eg-sum{margin:3px 0 0;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-rbody{display:grid;gap:14px 26px;margin-top:14px;align-items:start}
.eg-rcol{display:grid;gap:14px;min-width:0}
/* Bulletin de libération */
.eg-lib{background:#fff;border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-lib h4{margin:0;padding:8px 12px;background:var(--pressed);color:var(--pressed-on);font-weight:800;font-size:1rem;line-height:1.2}
.eg-lib div{display:grid;gap:8px;padding:10px 12px 12px}
.eg-lib p{margin:0;font-size:.95rem}
.eg-gain{display:flex;flex-wrap:wrap;gap:8px}
.eg-gain>span{padding:3px 12px;background:var(--mu);border:2.5px solid var(--line);border-radius:999px;font-weight:800}
.eg-gain>span+span{background:var(--li)}
.eg-lib .linkbtn{justify-self:start}
.eg-lib.neuf{animation:eg-pose .5s cubic-bezier(.2,1.4,.4,1) both}
.eg-lib.neuf .eg-gain>span{animation:eg-tampon .45s .35s cubic-bezier(.2,1.5,.4,1) both}
.eg-lib.neuf .eg-gain>span+span{animation-delay:.6s}
@keyframes eg-pose{from{transform:translateY(-10px) scale(.97)}to{transform:none}}
@keyframes eg-tampon{from{transform:scale(1.5) rotate(-6deg)}to{transform:none}}
/* Ma fiche */
.eg-moi{padding:12px;background:var(--tI);border:2.5px solid var(--line);border-radius:14px;box-shadow:4px 4px 0 var(--shadow)}
.eg-moi-h{display:flex;align-items:center;gap:12px}
.eg-moi-rg{flex:0 0 auto;display:grid;place-items:center;width:58px;height:58px;border-radius:50%;border:2.5px solid var(--line);background:#fff;font:800 1.4rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-moi sup{font-size:.6em}
.eg-moi-h b{display:block;font-weight:800;font-size:1.12rem;line-height:1.15;overflow-wrap:anywhere}
.eg-moi-h small{font:600 .72rem var(--mono);color:var(--muted)}
.eg-moi ul{display:grid;gap:6px;margin:10px 0 0;padding:0;list-style:none}
.eg-moi li{padding:5px 10px;background:#fff;border:2px solid var(--line);border-radius:10px;font-size:.9rem}
.eg-moi li b{font-weight:800}
/* Podium */
.eg-pod{display:flex;justify-content:center;align-items:flex-end;gap:8px;max-width:520px;width:100%;margin:0 auto;padding:0;list-style:none}
.eg-marche{flex:1 1 0;min-width:0;max-width:46%;display:grid;gap:6px;justify-items:center;text-align:center}
.eg-marche.s1{order:2}.eg-marche.s2{order:1}.eg-marche.s3{order:3}
.eg-marche ul{display:grid;gap:4px;justify-items:center;width:100%;margin:0;padding:0;list-style:none}
.eg-marche .eg-row{max-width:100%;padding:1px 8px;border-radius:8px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.eg-marche .eg-row.me{background:var(--pressed);color:var(--pressed-on)}
.eg-socle{display:grid;place-items:center;align-content:center;gap:1px;width:100%;padding:6px 2px;border:2.5px solid var(--line);border-radius:12px 12px 6px 6px}
.eg-socle b{font-weight:800;font-size:1.5rem;line-height:1;font-variant-numeric:tabular-nums}
.eg-socle span{font:600 .7rem var(--mono);white-space:nowrap}
.s1 .eg-socle{min-height:92px;background:var(--mu);box-shadow:4px 4px 0 var(--shadow)}
.s2 .eg-socle{min-height:68px;background:var(--li)}
.s3 .eg-socle{min-height:50px;background:var(--tE)}
.eg-up{margin-left:6px;font:600 .7rem var(--mono);color:var(--ok);white-space:nowrap}
.eg-row.me .eg-up{color:inherit}
/* Suite du classement */
.eg-list{margin:0;padding:0;list-style:none;background:#fff;border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-list:empty{display:none}
.eg-list .eg-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:7px 12px;font-variant-numeric:tabular-nums}
.eg-list li+li{border-top:2px solid var(--foil-b)}
.eg-rk{font:600 .78rem var(--mono);color:var(--muted)}
.eg-nm{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-pt{font:600 .78rem var(--mono);white-space:nowrap}
.eg-list .eg-row.me{background:var(--tI);box-shadow:inset 5px 0 0 var(--line)}
.eg-vous{display:inline-block;white-space:nowrap;margin-left:8px;padding:1px 7px;background:var(--pressed);color:var(--pressed-on);border-radius:999px;font:600 .68rem var(--mono);letter-spacing:.05em;text-transform:uppercase}
.eg-gap{padding:2px 12px;background:var(--foil-a);text-align:center;font:600 .72rem var(--mono);color:var(--muted)}
.eg-more{margin:0;text-align:center}
/* Avatars et symbole de brigade */
.eg-rank .eg-av{flex:0 0 auto;display:block;width:28px;height:28px;margin:0}
.eg-av0{border:2px solid var(--line);border-radius:50%;background:var(--foil-a)}
.eg-rank .eg-emb{flex:0 0 auto;display:block;width:16px;height:16px}
.eg-nm{display:flex;align-items:center;flex-wrap:wrap;gap:3px 7px}
.eg-nm>b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-nm .eg-vous,.eg-nm .eg-up{margin-left:0}
.eg-list .eg-row{align-items:center}
.eg-marche .eg-row{display:grid;justify-items:center;gap:2px}
.eg-marche .eg-row>span{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:2px 5px;max-width:100%}
.eg-marche .eg-av{width:44px;height:44px}
.eg-marche .eg-up{margin-left:0}
/* Classement des brigades */
.eg-brigs{margin-top:14px}
.eg-brigs h4{margin:0;font-weight:800;font-size:1.05rem;line-height:1.2}
.eg-brigs>p{margin:3px 0 0;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-brigs ol{display:grid;gap:8px;margin:10px 0 0;padding:0;list-style:none}
.eg-brig{padding:0;background:var(--surface);border:2.5px solid var(--line);border-radius:14px;overflow:hidden}
.eg-brig.me{box-shadow:4px 4px 0 var(--shadow)}
.eg-brig summary{display:grid;grid-template-columns:22px 22px minmax(0,1fr) 14px;gap:8px;align-items:center;min-height:46px;padding:6px 12px;background:var(--bf);cursor:pointer;list-style:none;font-variant-numeric:tabular-nums}
.eg-brig summary::-webkit-details-marker{display:none}
.eg-brig>summary::before,.eg-brig[open]>summary::before{content:none;display:none}
.eg-brig-t{display:grid;gap:1px;min-width:0}
.eg-brig-t b{font-size:1rem;line-height:1.2}
.eg-brig-t .eg-pt{white-space:normal}
.eg-brig summary:focus-visible{outline:3px solid var(--focus,var(--line));outline-offset:-3px}
.eg-brig summary .eg-emb{width:22px;height:22px}
.eg-brig summary b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-brig summary i{width:9px;height:9px;border:solid var(--line);border-width:0 2.5px 2.5px 0;transform:rotate(45deg);justify-self:center}
.eg-brig[open] summary i{transform:rotate(-135deg)}
.eg-brig[open] summary{border-bottom:2.5px solid var(--line)}
.eg-brig-c{display:grid;gap:8px;padding:10px 12px 12px}
.eg-brig-c p{margin:0;font-size:.92rem}
.eg-brig-c small{display:block;font:600 .68rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.eg-brig-j{display:flex;align-items:center;gap:10px}
.eg-brig-j img{flex:0 0 auto;width:44px;height:44px;object-fit:contain}
.eg-brig-j b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-brig-m{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.eg-brig-m li{display:flex;align-items:center;gap:5px;max-width:100%;padding:2px 9px 2px 3px;background:var(--chip);border:2px solid var(--line);border-radius:999px;font-size:.84rem;font-weight:800;overflow-wrap:anywhere}
.eg-brig-m li.me{background:var(--pressed);color:var(--pressed-on)}
.eg-brig-m .eg-av{width:24px;height:24px}
@media(min-width:861px){.eg-rules{grid-template-columns:1fr 1fr;gap:11px 30px}.eg-rbody.duo{grid-template-columns:minmax(0,5fr) minmax(0,6fr)}}
@media(max-width:860px){.eg-body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.eg-sheet{padding:10px 8px 12px}.eg-grid{gap:8px 6px}.eg-notice{padding:6px 12px}.eg-notice[open]{padding-bottom:14px}.eg-panel{padding:14px 14px 16px}}
@media(prefers-reduced-motion:reduce){.eg-brig summary i{transition:none}.eg-lib.neuf,.eg-lib.neuf .eg-gain>span{animation:none}.eg-cell.ou .eg-door{animation:none}.eg-door{transition:none}}`;

  function init() {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    sec = document.createElement("section");
    sec.className = "wrap adv eg";
    sec.id = "pharmacogames";
    sec.hidden = true;
    sec.setAttribute("aria-labelledby", "pharmacogames-t");
    sec.innerHTML = '<p class="adv-back"><a class="go" href="#">Retour au catalogue</a></p>'
      + '<div class="adv-head"><h2 id="pharmacogames-t">Pharmacogames <span>de Noël</span></h2>'
      + '<p class="adv-intro">Le concours de l\'équipe, chacun pour soi : 25 petits jeux, un par jour du 1<sup>er</sup> au 25 décembre. Derrière chaque porte, cinq questions au chrono sur un thème du jeu de société (quatre flacons au choix, ou une dose à estimer entre 0 et 100) ou un vrai jeu d\'adresse. Chaque porte vaut 10 points. Pour élire votre jeu préféré, c\'est au <a href="#vote">Palmarès</a>.</p></div>'
      + NOTICE
      + '<form class="eg-panel eg-gate" id="egGate" novalidate><h3>Entrer dans le calendrier</h3>'
      + '<label for="egPrenom">Pseudo ou prénom</label><input id="egPrenom" type="text" autocomplete="given-name" maxlength="24" required>'
      + '<label for="egCode">Code d\'équipe</label><input id="egCode" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="64" required>'
      + '<p class="eg-hint">Même nom, même fiche, sur tous vos appareils : vos réponses sont gardées par le serveur de l\'équipe. Deux collègues du même prénom ? Ajoutez une initiale collée, par exemple CamilleB. Avatar et brigade se règlent à votre première porte.</p>'
      + '<p class="eg-msg err" id="egGateMsg" role="status"></p><button class="go main" type="submit">Ouvrir mon calendrier</button></form>'
      + '<p class="eg-banner" id="egBanner" hidden>Mode relecture : les 25 portes s\'affichent avec leur solution. Rien n\'est enregistré.</p>'
      + '<div class="eg-body" id="egBody" hidden>'
      + '<div class="eg-sheet"><div class="eg-cap"><span>Calendrier des 25 portes</span><b id="egWho"></b></div>'
      + '<p class="pp-brig" id="egBrig" hidden></p>'
      + '<div class="eg-grid" id="egGrid" role="group" aria-label="Calendrier des 25 portes"></div>'
      + '<p class="eg-legend" aria-hidden="true"><span><i class="k0"></i>Sous scellé</span><span><i class="k1"></i>Ouverte</span><span><i class="k2"></i>Réponse scellée</span><span><i class="k3"></i>Résultat libéré</span></p>'
      + '<p class="eg-score" id="egScore" role="status"></p>'
      + '<p class="eg-tools"><button class="go" type="button" id="egReload">Actualiser</button><button class="linkbtn" type="button" id="egBrigade" hidden>Ma brigade</button><button class="linkbtn" type="button" id="egAvatar" hidden>Retoucher ma fiche</button><button class="linkbtn" type="button" id="egChange">Changer de prénom</button></p></div>'
      + '<aside class="eg-panel" id="egPanel" aria-live="polite"></aside>'
      + "</div>"
      + '<div class="eg-panel eg-rank" id="egRank" hidden><div class="eg-rhead"><h3>Classement des Pharmacogames</h3><p class="eg-sum" id="egSum"></p></div>'
      + '<p class="eg-d" id="egRankMsg"></p><section class="eg-brigs" id="egBrigs" aria-labelledby="egBrigsT" hidden><h4 id="egBrigsT">Classement des brigades</h4><p id="egBrigsS"></p><ol id="egBrigsL"></ol></section>'
      + '<div class="eg-rbody" id="egRBody">'
      + '<div class="eg-rcol" id="egCol"><section class="eg-lib" id="egLib" aria-live="polite" hidden></section><section class="eg-moi" id="egMoi" aria-label="Ma fiche" hidden></section>'
      + '<ol class="eg-pod" id="egPod" aria-label="Podium" hidden></ol></div>'
      + '<div class="eg-rcol"><ol class="eg-list" id="egList" aria-label="Suite du classement"></ol>'
      + '<p class="eg-more" id="egMore" hidden><button class="linkbtn" type="button" id="egTout"></button></p></div></div></div>';
    (q("#vote") || q("#avent") || q("header.hero")).insertAdjacentElement("afterend", sec);

    const a = document.createElement("a");
    a.className = "go avgo";
    a.href = "#pharmacogames";
    a.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M2 21V9a7 7 0 0 1 14 0v12z" fill="currentColor"/><circle cx="12.4" cy="14" r="1.6" fill="#ECD567"/></svg>Jouer aux Pharmacogames de Noël';
    const boutons = document.querySelectorAll(".avgo");
    const ancre = boutons.length ? boutons[boutons.length - 1] : q(".lead");
    if (ancre) ancre.insertAdjacentElement("afterend", a);

    q("#egGate").addEventListener("submit", entrer);
    q("#egGrid").addEventListener("click", e => {
      const c = e.target.closest(".eg-cell");
      if (!c) return;
      choisir(Number(c.dataset.n));
      q("#egPanel").scrollIntoView({ block: "nearest" });
    });
    q("#egPanel").addEventListener("click", e => {
      const o = e.target.closest("button.eg-opt"), s = e.target.closest(".eg-step");
      if (o) noter(Number(o.dataset.v));
      else if (s) { const r = q("#egRange"); r.value = Math.max(0, Math.min(100, Number(r.value) + Number(s.dataset.d))); noter(Number(r.value)); }
      else if (e.target.closest("#egSend")) envoyer();
      else if (e.target.closest("#egStart")) lancer();
      else if (e.target.closest("#egPlay")) jouer(true);
      else if (e.target.closest("#egTry")) jouer(false);
    });
    q("#egPanel").addEventListener("input", e => { if (e.target.id === "egRange") noter(Number(e.target.value)); });
    q("#egChange").addEventListener("click", sortir);
    q("#egAvatar").addEventListener("click", () => { if (!enJeu && brouillon === null && !q("#egTime")) identifier(); });
    q("#egBrigade").addEventListener("click", () => { if (!enJeu && brouillon === null && !q("#egTime")) carnet(); });
    q("#egTout").addEventListener("click", () => { toutVoir = !toutVoir; rang(); });
    q("#egBrigsL").addEventListener("toggle", e => { const b = e.target.dataset && e.target.dataset.b; if (b !== undefined) brigOuvertes[e.target.open ? "add" : "delete"](b); }, true);
    q("#egLib").addEventListener("click", e => { if (e.target.id === "egVu") { vuLib(); rang(); } });
    q("#egReload").addEventListener("click", () => charger("Calendrier à jour."));

    // Prénom et code déjà donnés pour le vote sur cet appareil : on les propose, sans les imposer.
    let v = {};
    try { v = JSON.parse(localStorage.getItem(KEY_VOTE) || "{}") || {}; } catch (e) {}
    q("#egPrenom").value = String(mem.prenom || v.prenom || "").slice(0, 24);
    q("#egCode").value = String(mem.code || v.code || "").slice(0, 64);

    window.addEventListener("hashchange", view);
    // Retour sur l'onglet resté ouvert : le calendrier se remet à jour, sauf si une réponse est en cours de saisie.
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !sec.hidden && E && brouillon === null && !enJeu && !enFiche) charger(); });
    view();
  }

  function view() {
    if (location.hash === "#enigme") history.replaceState(null, "", "#pharmacogames"); // ancienne adresse de la page
    const on = location.hash === "#pharmacogames" || location.hash === "#pharmacomeeple";
    sec.hidden = !on;
    if (!on) { if (enFiche) { enFiche = false; if (E) panneau(); } return; } // en quittant la page, la fiche ouverte se referme
    versFiche = location.hash === "#pharmacomeeple";
    document.querySelectorAll("#avent,.ind,.bar,main").forEach(e => { e.hidden = true; });
    sec.scrollIntoView({ block: "start" });
    if (relecture || (mem.prenom && mem.code)) charger();
  }
  // Pastille « Pharmacomeeple » : une fois le joueur entré, sa fiche d'identification s'ouvre (création ou retouche).
  // Avant l'ouverture de l'identification (le 26 novembre), rien ne s'ouvre : la mention « sous scellé » en tête du calendrier suffit.
  function allerFiche() {
    if (!versFiche || !E || relecture) return;
    versFiche = false;
    if (E.fiche && E.fiche.etat !== "avenir" && !enJeu && !enFiche && brouillon === null && !q("#egTime")) identifier();
  }

  const dire = (id, t, cls) => { const el = q(id); if (el) { el.textContent = t || ""; el.className = "eg-msg " + (cls || "ok"); } };

  async function entrer(e) {
    e.preventDefault();
    const p = q("#egPrenom").value.trim().replace(/’/g, "'"), code = q("#egCode").value.trim();
    if (!code) return dire("#egGateMsg", "Le code d'équipe est demandé : il circule dans l'unité.", "err");
    dire("#egGateMsg", "Ouverture…", "ok");
    let r;
    // Un prénom mal formé n'empêche pas la relecture : le serveur tranche d'après le code.
    try { r = await call(p.length >= 2 && p.length <= 24 && PRENOM.test(p) ? { code, prenom: p } : { code }); } catch (x) { r = { status: 0, j: {} }; }
    if (r.status === 401) return dire("#egGateMsg", "Code d'équipe inconnu. Vérifiez la casse et les tirets.", "err");
    if (r.status !== 200) return dire("#egGateMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err");
    if (r.j.relecture) relecture = code;
    else {
      if (!(p.length >= 2 && p.length <= 24 && PRENOM.test(p))) return dire("#egGateMsg", "Un pseudo ou un prénom en un seul mot, de 2 à 24 lettres, sans espace ni chiffre.", "err");
      relecture = "";
      mem.prenom = p; mem.code = code;
      save();
    }
    dire("#egGateMsg", "");
    recevoir(r.j);
  }

  function sortir() {
    if (enJeu) { enJeu(); enJeu = null; }
    clearInterval(tic); echeance = {};
    relecture = "";
    E = null; enFiche = false;
    q("#egBody").hidden = true; q("#egRank").hidden = true; q("#egBanner").hidden = true;
    q("#egGate").hidden = false;
    q("#egNotice").open = true;
    q("#egPrenom").focus();
  }

  async function charger(msg) {
    if (occupe || enJeu) return;
    occupe = true;
    let r;
    try { r = await call(relecture ? { code: relecture } : { code: mem.code, prenom: mem.prenom }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    if (r.status === 401 || r.status === 400) { if (!relecture) { delete mem.code; save(); } sortir(); return dire("#egGateMsg", "Code d'équipe à ressaisir.", "err"); }
    if (r.status !== 200) return E ? dire("#egMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err") : dire("#egGateMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err");
    recevoir(r.j, msg);
  }

  // Une porte ouverte reste « à faire » tant que la question n'a pas reçu de réponse ou qu'il reste une tentative de jeu.
  const tentatives = p => (p.scores || []).length;
  const aFaire = p => p.etat === "ouverte" && (p.type === "jeu" ? tentatives(p) < p.essais : p.type === "quiz" ? !p.fini : p.rep === undefined && !p.hors);
  // Porte montrée d'office : la plus ancienne encore à faire, sinon la dernière ouverte, sinon la dernière close.
  function parDefaut() {
    if (relecture) return 1;
    const P = E.portes, ouvertes = P.filter(p => p.etat === "ouverte"), closes = P.filter(p => p.etat === "close");
    const f = ouvertes.find(aFaire);
    return f ? f.n : ouvertes.length ? ouvertes[ouvertes.length - 1].n : closes.length ? closes[closes.length - 1].n : 0;
  }

  function recevoir(j, msg, cls) {
    const premier = !E;
    E = j;
    // Chronos en cours : le serveur donne le temps restant, on le convertit en échéance locale.
    const vus = {};
    E.portes.forEach(p => { if (p.reste !== undefined) vus[p.n] = echeance[p.n] || Date.now() + p.reste * 1000; });
    echeance = vus;
    q("#egGate").hidden = true;
    q("#egBody").hidden = false;
    q("#egRank").hidden = false;
    q("#egBanner").hidden = !relecture;
    if (premier) { q("#egNotice").open = false; choix = parDefaut(); brouillon = null; aConfirmer = false; }
    q("#egWho").textContent = relecture ? "Relecture" : mem.prenom;
    identite();
    grille();
    panneau(msg, cls);
    rang();
    allerFiche();
  }

  // Participants : l'avatar et la brigade du joueur. Le dessin vient de participants.js, chargé à la demande ;
  // le choix de l'avatar est validé par le serveur, qui tire seul la brigade.
  const chargerParticipants = () => new Promise((ok, ko) => {
    if (window.PharmacoParticipants) return ok();
    const sc = document.createElement("script");
    sc.src = "participants.js"; sc.onload = () => (window.PharmacoParticipants ? ok() : ko()); sc.onerror = ko;
    document.head.appendChild(sc);
  });
  const fiche = () => !relecture && E && E.profil && E.profil.a;
  // En tête du calendrier : l'avatar devant le nom, la brigade dessous. Le texte de #egWho reste le nom seul.
  function identite() {
    const P = !relecture && E && E.profil, bouton = q("#egAvatar");
    // Sans avatar, le même bouton sert à créer sa fiche, sans attendre la première porte.
    bouton.hidden = Boolean(relecture) || !E;
    bouton.textContent = P && P.a ? "Retoucher ma fiche" : "Créer ma fiche";
    q("#egBrigade").hidden = !(P && P.a && P.b !== undefined);
    // Avant l'ouverture du calendrier : la rubrique est annoncée, sous scellé comme les portes, sans rien d'actif.
    const scelle = !relecture && E && E.fiche && E.fiche.etat === "avenir";
    q("#egBrig").className = scelle ? "eg-hint" : "pp-brig";
    q("#egBrig").style.margin = scelle ? "6px 0 10px" : "";
    if (scelle) { q("#egBrig").innerHTML = CADENAS + " Fiche d'identification, avatar et brigades : sous scellé jusqu'au " + jour(dt(E.fiche.ouvre)) + "."; q("#egBrig").hidden = false; bouton.hidden = true; q("#egBrigade").hidden = true; return; }
    if (!P) { q("#egBrig").hidden = true; return; }
    chargerParticipants().then(() => {
      if (!E || E.profil !== P) return;
      const W = window.PharmacoParticipants, B = W.BRIGADES[P.b];
      if (P.a) q("#egWho").innerHTML = W.avatar(P.a, { brigade: P.b, cls: "pp-mini" }) + h(mem.prenom);
      q("#egBrig").hidden = !B;
      const ligne = (E.brigades || []).find(x => x.b === P.b), devise = ligne && W.DEVISES[ligne.devise];
      if (B) q("#egBrig").innerHTML = W.embleme(P.b) + "<span>" + h(B.nom) + (devise ? " · « " + h(devise) + " »" : "") + "</span>";
    }).catch(() => {});
  }
  // Carnet de brigade : membres, devise et jeu emblème, et la voix du joueur tant que le vote est ouvert (serveur : du 26 novembre au 7 décembre).
  async function carnet() {
    if (relecture || occupe || enJeu || !fiche()) return;
    try { await chargerParticipants(); } catch (e) { return dire("#egMsg", "Le carnet de brigade ne s'est pas chargé. Vérifiez la connexion et réessayez.", "err"); }
    const b = E.profil.b, ligne = () => (E.brigades || []).find(x => x.b === b) || {};
    enFiche = true;
    clearInterval(tic);
    window.PharmacoParticipants.brigade(q("#egPanel"), {
      pseudo: mem.prenom, brigade: b, ligne: ligne(), moi: E.profil, choix: E.choix,
      membres: (E.classement || []).filter(x => x.b === b).sort((x, y) => x.p.localeCompare(y.p, "fr")),
      jeux: typeof G !== "undefined" ? G : [], familles: typeof CATS !== "undefined" ? CATS : {},
      voter: async v => {
        let r;
        try { r = await call({ code: mem.code, prenom: mem.prenom, action: "brigade", devise: v.devise, jeu: v.jeu }); } catch (e) { r = { status: 0, j: {} }; }
        if (r.status === 403 && r.j.error === "fige") return { ok: false, message: "Trop tard : devise et jeu emblème sont scellés depuis la fin de la première semaine." };
        if (r.status === 403 && r.j.error === "scellee") return { ok: false, message: "Le vote de la brigade est encore sous scellé." };
        if (r.status !== 200 || !r.j.profil) return { ok: false };
        E = r.j;
        identite();
        return { ok: true, ligne: ligne(), moi: E.profil };
      },
      onFin: () => { enFiche = false; panneau(); },
    });
    q("#egPanel").scrollIntoView({ block: "nearest" });
  }
  // La fiche d'identification prend la place de la porte dans le panneau : à la première porte lancée, ou pour une retouche.
  async function identifier() {
    if (relecture || occupe || enJeu) return;
    try { await chargerParticipants(); } catch (e) { return dire("#egMsg", "La fiche d'identification ne s'est pas chargée. Vérifiez la connexion et réessayez.", "err"); }
    const P = E.profil || {};
    enFiche = true;
    clearInterval(tic);
    window.PharmacoParticipants.fiche(q("#egPanel"), {
      pseudo: mem.prenom, avatar: P.a, brigade: P.b,
      renommer: async neuf => {
        let r;
        try { r = await call({ code: mem.code, prenom: mem.prenom, action: "renommer", pseudo: neuf }); } catch (e) { r = { status: 0, j: {} }; }
        if (r.status === 409) return { ok: false, message: "Ce pseudo est déjà porté par un autre joueur. Ajoutez une initiale collée, par exemple " + neuf + "B." };
        if (r.status === 400) return { ok: false, message: "Un pseudo ou un prénom en un seul mot, de 2 à 24 lettres, sans espace ni chiffre." };
        if (r.status !== 200 || !r.j.profil) return { ok: false };
        if (mem.vu && mem.vu.p === norm(mem.prenom)) mem.vu.p = norm(neuf);
        mem.prenom = neuf; save();
        E = r.j;
        q("#egWho").textContent = neuf; q("#egPrenom").value = neuf;
        identite(); grille(); rang();
        return { ok: true };
      },
      enregistrer: async a => {
        let r;
        try { r = await call({ code: mem.code, prenom: mem.prenom, action: "profil", avatar: a }); } catch (e) { r = { status: 0, j: {} }; }
        if (r.status === 403 && r.j.error === "scellee") return { ok: false, message: "La fiche d'identification est encore sous scellé." };
        if (r.status === 403 && r.j.error === "complet") return { ok: false, message: "Le calendrier affiche complet : plus de place pour un nouveau joueur." };
        if (r.status !== 200 || !r.j.profil) return { ok: false };
        E = r.j;
        identite(); grille(); rang();
        const b = E.profil.b, ligne = (E.brigades || []).find(x => x.b === b);
        return { ok: true, brigade: b, effectif: ligne ? ligne.n : 0 };
      },
      onFin: msg => { enFiche = false; panneau(msg); },
    });
    q("#egPanel").scrollIntoView({ block: "nearest" });
  }

  function grille() {
    q("#egGrid").innerHTML = E.portes.map(p => {
      let k, lab, dit;
      if (relecture) { k = "rl"; lab = p.type === "qcm" ? "QCM" : p.type === "jeu" ? "Jeu" : p.type === "quiz" ? "5 Q" : "Dose"; dit = "relecture"; }
      else if (p.etat === "avenir") { k = "av"; lab = CADENAS; dit = "sous scellé jusqu'au " + jour(dt(p.ouvre)); }
      else if (p.etat === "ouverte") {
        if (p.type === "jeu") {
          const nb = tentatives(p);
          if (!nb) { k = "ou"; lab = "Ouverte"; dit = "jeu d'adresse ouvert"; }
          else if (nb < p.essais) { k = "ou"; lab = p.meilleur + "/10"; dit = "note " + p.meilleur + " sur 10, une tentative restante"; }
          else { k = "sc"; lab = SCEAU + p.meilleur + "/10"; dit = "note scellée, " + p.meilleur + " sur 10"; }
        } else if (p.type === "quiz") { k = "sc"; lab = SCEAU + "Scellée"; dit = "cinq questions jouées, réponses scellées"; }
        else if (p.quiz && p.reste === undefined) { k = "ou"; lab = p.quiz.i > 1 ? (p.quiz.i - 1) + "/" + p.quiz.nb : "Ouverte"; dit = p.quiz.i > 1 ? pl(p.quiz.i - 1, "question jouée", "questions jouées") + " sur " + p.quiz.nb : "ouverte, cinq questions à faire"; }
        else if (p.rep !== undefined) { k = "sc"; lab = SCEAU + "Scellée"; dit = "réponse scellée"; }
        else if (p.hors) { k = "ko"; lab = "Hors délai"; dit = "chrono écoulé sans réponse"; }
        else if (p.reste !== undefined) { k = "ou"; lab = "Chrono"; dit = "chrono en cours"; }
        else { k = "ou"; lab = "Ouverte"; dit = "ouverte, à faire"; }
      } else { const f = p.pts !== undefined; k = f ? "ok" + (p.pts === 10 ? " max" : "") : "ko"; lab = f ? "+" + p.pts : "Manquée"; dit = f ? pl(p.pts, "point", "points") : "manquée"; }
      return '<button class="eg-cell ' + k + (p.n === choix ? " sel" : "") + '" type="button" data-n="' + p.n + '" aria-pressed="' + (p.n === choix) + '" aria-label="' + h("Porte " + p.n + " : " + dit) + '">'
        + '<span class="eg-door"><b>' + p.n + "</b><small>" + lab + "</small></span></button>";
    }).join("");
    const clos = E.portes.filter(p => p.etat === "close").length;
    const att = E.portes.filter(p => p.etat === "ouverte" && (p.rep !== undefined || tentatives(p) > 0 || p.type === "quiz" || (p.quiz && p.quiz.i > 1))).length;
    q("#egScore").textContent = relecture ? "25 portes à relire, solutions comprises."
      : "Total : " + pl(E.total, "point", "points") + " · " + pl(clos, "porte close", "portes closes") + (att ? " · " + pl(att, "résultat scellé en attente", "résultats scellés en attente") : "");
  }

  function choisir(n) {
    if (enJeu) { if (!relecture) return; enJeu(); enJeu = null; } // partie en cours : on ne change pas de porte, sauf en relecture
    enFiche = false;
    choix = n; brouillon = null; aConfirmer = false;
    grille();
    panneau();
    const c = q('#egGrid [data-n="' + n + '"]');
    if (c) c.focus({ preventScroll: true });
  }

  const LETTRES = ["A", "B", "C", "D"];
  const flacon = (o, i, tag, cls, note) => "<" + tag + ' class="eg-opt' + (cls ? " " + cls : "") + '"' + (tag === "button" ? ' type="button" data-v="' + i + '" aria-pressed="false"' : "") + "><i>" + LETTRES[i] + "</i>"
    + (o.img ? '<img src="img/' + h(o.img) + '" alt="" loading="lazy">' : "") + "<span>" + fr(o.t) + (note ? "<em>" + note + "</em>" : "") + "</span></" + tag + ">";
  const forme = p => (p.type === "quiz" ? "cinq questions" : (p.quiz ? "question " + p.quiz.i + " sur " + p.quiz.nb + " · " : "") + (p.type === "qcm" ? "quatre flacons" : p.type === "jeu" ? "jeu d'adresse" : "dosage de 0 à 100"));

  function saisie(p) {
    const fin = '<p class="eg-hint">Une seule prise par ' + (p.quiz ? "question" : "porte") + ' : la réponse est définitive. Si le chrono tombe à zéro, la proposition affichée part telle quelle.</p>'
      + '<button class="go main" type="button" id="egSend" disabled>Sceller ma réponse</button>';
    const chrono = '<div class="eg-time" id="egTime" role="timer" aria-live="off"><b>' + Math.ceil(p.reste) + ' s</b><span><i></i></span></div>';
    if (p.type === "qcm") return chrono + '<div class="eg-opts' + (p.options.some(o => o.img) ? " img" : "") + '" role="group" aria-label="Quatre propositions">' + p.options.map((o, i) => flacon(o, i, "button")).join("") + "</div>" + fin;
    return chrono + '<div class="eg-dose"><output class="eg-val" id="egVal" for="egRange">?<small>Réglez la dose</small></output>'
      + '<div class="eg-slide"><button class="eg-step" type="button" data-d="-1" aria-label="Un de moins">−</button>'
      + '<input id="egRange" type="range" min="0" max="100" step="1" value="50" aria-label="Votre réponse, de 0 à 100">'
      + '<button class="eg-step" type="button" data-d="1" aria-label="Un de plus">+</button></div>'
      + '<p class="eg-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></p></div>' + fin;
  }

  const origine = p => (p.source && p.source.t ? '<p class="eg-src">Source : ' + (p.source.url ? '<a href="' + h(p.source.url) + '" target="_blank" rel="noopener">' + h(p.source.t) + "</a>" : h(p.source.t)) + "</p>" : "");
  function solution(p) {
    const fait = p.rep !== undefined;
    let s;
    if (p.type === "qcm") {
      s = '<div class="eg-opts' + (p.options.some(o => o.img) ? " img" : "") + '">' + p.options.map((o, i) => flacon(o, i, "div", i === p.bonne ? "bon" : fait && i === p.rep ? "mien" : "", i === p.bonne ? (fait && p.rep === i ? "Bon flacon, le vôtre" : "Bon flacon") : fait && i === p.rep ? "Votre choix" : "")).join("") + "</div>";
    } else {
      s = '<div class="eg-cible"><div class="bon"><small>Valeur cible</small><b>' + h(val(p, p.bonne)) + "</b></div>"
        + (fait ? "<div><small>Votre dose · écart " + Math.abs(p.rep - p.bonne) + "</small><b>" + h(val(p, p.rep)) + "</b></div>" : "") + "</div>";
    }
    if (!relecture && !(p.deCase && p.pts === undefined)) s += '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (fait ? "+" + pl(p.pts, "point", "points") : p.pts !== undefined ? (p.deCase ? "Sans réponse : 0 point" : "Chrono écoulé sans réponse : 0 point") : "Porte manquée : 0 point") + "</p>";
    return s + '<p class="eg-ex">' + fr(p.explication) + "</p>" + origine(p);
  }

  // Notes des tentatives d'un jeu d'adresse.
  const essaisFaits = p => (tentatives(p) ? '<ul class="eg-tent">' + p.scores.map((n, i) => '<li' + (n !== null && n === p.meilleur ? ' class="top"' : "") + "><span>Tentative " + (i + 1) + "</span>" + (n === null ? "interrompue : 0 / 10" : n + " / 10") + "</li>").join("") + "</ul>" : "");

  function panneau(msg, cls) {
    if (enFiche) return; // la fiche d'identification reste en place tant qu'elle n'est pas refermée
    const p = E.portes[choix - 1];
    let html;
    if (!p) {
      const d1 = dt(E.portes[0].ouvre), n = 1 - E.jour;
      html = '<p class="ap-m">Calendrier sous scellé</p><h3>Première porte le ' + jour(d1) + "</h3>"
        + '<p class="eg-d">Encore ' + pl(n, "jour", "jours") + " de quarantaine. Revenez le jour dit : une porte s'ouvrira chaque matin jusqu'au 25.</p>";
    } else if (p.etat === "avenir" && !relecture) {
      html = '<p class="ap-m">Porte ' + p.n + ' · sous scellé</p><h3>Patience</h3><p class="eg-d">Cette porte s\'ouvrira le ' + jour(dt(p.ouvre)) + ". D'ici là, elle reste en quarantaine.</p>";
    } else {
      const ouverte = p.etat === "ouverte" && !relecture;
      html = '<p class="ap-m">Porte ' + p.n + " · " + jour(dt(p.ouvre)) + " · " + forme(p) + "</p><h3>" + fr(p.titre) + "</h3>"
        + (p.quiz && p.quiz.titre ? '<p class="ap-m">Question ' + p.quiz.i + " sur " + p.quiz.nb + " · " + fr(p.quiz.titre) + "</p>" : "");
      const enonce = () => '<div class="eg-ill" id="egJeu">' + p.ill + '</div><p class="eg-q">' + fr(p.question) + "</p>";
      if (p.type === "jeu") {
        const nb = tentatives(p);
        html += enonce();
        if (relecture) html += '<p class="eg-hint">Chrono de ' + p.duree + " s, " + pl(p.essais, "tentative", "tentatives") + ', la meilleure compte.</p><button class="go main" type="button" id="egTry">Essayer le jeu, sans rien enregistrer</button>'
          + '<p class="eg-ex">' + fr(p.explication) + "</p>" + origine(p);
        else if (ouverte) {
          html += essaisFaits(p);
          if (nb < p.essais) html += '<p class="eg-hint">Chrono de ' + p.duree + " s par tentative. " + pl(p.essais, "tentative", "tentatives") + ", la meilleure compte ; une tentative lancée est décomptée, même interrompue. Clôture le " + jour(dt(p.ferme)) + ' à minuit : les points viennent alors du classement de la porte, de 10 pour le premier à 1 pour le dernier.</p>'
            + '<button class="go main" type="button" id="egPlay">Lancer la tentative ' + (nb + 1) + " sur " + p.essais + "</button>";
          else html += '<div class="eg-seal">' + SCEAU + "<span><small>Note scellée</small><b>" + p.meilleur + " / 10</b></span></div>"
            + '<p class="eg-d">Vos points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
        } else html += essaisFaits(p) + '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (p.pts !== undefined ? (p.rang ? "Rang " + p.rang + " sur " + p.sur + " : " : "") + "+" + pl(p.pts, "point", "points") : "Porte manquée : 0 point") + '</p><p class="eg-ex">' + fr(p.explication) + "</p>" + origine(p);
      } else if (p.type === "quiz") {
        // Case de cinq questions : toutes jouées (réponses scellées), ou close (les cinq solutions).
        if (!p.qs) html += '<div class="eg-ill">' + p.ill + '</div><div class="eg-seal">' + SCEAU + "<span><small>Case jouée</small><b>" + pl(p.scellees, "réponse scellée", "réponses scellées") + " sur " + p.nb + "</b></span></div>"
          + '<p class="eg-d">Bonnes réponses et points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else html += (relecture ? "" : '<p class="eg-pts' + (p.pts ? "" : " zero") + '">' + (p.pts !== undefined ? "Total de la case : +" + pl(p.pts, "point", "points") + " sur 10" : "Porte manquée : 0 point") + "</p>")
          + p.qs.map((c, i) => '<section class="eg-sub"><p class="ap-m">Question ' + (i + 1) + " sur " + p.nb + " · " + forme(c) + (relecture ? " · " + c.duree + " s" : "") + "</p><h4>" + fr(c.titre || "") + '</h4><div class="eg-ill">' + c.ill + '</div><p class="eg-q">' + fr(c.question) + "</p>" + solution(Object.assign({ deCase: true }, c, p.pts === undefined ? { pts: undefined } : {})) + "</section>").join("");
      } else if (ouverte && p.rep === undefined && !p.hors && p.reste === undefined) {
        // Énoncé encore sous scellé : il n'arrive qu'avec le chrono.
        html += '<div class="eg-chrono"><b>' + p.duree + ' s</b><span>' + (p.quiz ? "Cinq questions à la suite, chacune avec son chrono. " : "") + 'Une seule tentative. Le chrono part dès que l\'énoncé s\'affiche et ne s\'arrête plus, même si vous quittez la page.</span></div>'
          + '<p class="eg-hint">Installez-vous : pas le temps d\'aller chercher la réponse ailleurs. Clôture de la porte le ' + jour(dt(p.ferme)) + ' à minuit.</p>'
          + '<button class="go main" type="button" id="egStart">' + (p.quiz ? "Lancer la question " + p.quiz.i + " sur " + p.quiz.nb : "Lancer le chrono") + "</button>";
      } else {
        html += enonce();
        if (ouverte && p.rep === undefined && !p.hors) html += saisie(p);
        else if (ouverte && p.hors) html += '<div class="eg-seal">' + SCEAU + "<span><small>Chrono écoulé</small><b>Aucune réponse scellée</b></span></div>"
          + '<p class="eg-d">Le temps a filé : 0 point pour cette porte. La bonne réponse sortira à la clôture, le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else if (ouverte) html += '<div class="eg-seal">' + SCEAU + "<span><small>Réponse scellée</small><b>" + h(val(p, p.rep)) + "</b></span></div>"
          + '<p class="eg-d">Bonne réponse et points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
        else html += solution(p);
      }
    }
    q("#egPanel").innerHTML = html + '<p class="eg-msg ' + (cls || "ok") + '" id="egMsg" role="status">' + h(msg || "") + "</p>";
    battre();
  }

  // Chrono d'une question : l'affichage suit l'échéance ; à zéro, la proposition en cours part d'office.
  function battre() {
    clearInterval(tic);
    const p = E && E.portes[choix - 1];
    if (!p || echeance[p.n] === undefined || !q("#egTime")) return;
    const pas = () => {
      const el = q("#egTime"), reste = (echeance[p.n] - Date.now()) / 1000;
      if (!el) return clearInterval(tic);
      el.querySelector("b").textContent = Math.max(0, Math.ceil(reste)) + " s";
      el.querySelector("i").style.width = Math.max(0, Math.min(100, reste / p.duree * 100)) + "%";
      el.classList.toggle("fin", reste <= 10);
      if (reste <= 0) {
        clearInterval(tic);
        if (brouillon !== null) { aConfirmer = true; envoyer(); } else charger("Chrono écoulé : aucune réponse n'a été scellée.");
      }
    };
    tic = setInterval(pas, 200);
    pas();
  }

  // Lancement du chrono d'une question : le serveur note l'heure et livre l'énoncé.
  async function lancer() {
    const p = E.portes[choix - 1];
    if (!p || occupe) return;
    if (!fiche()) return identifier(); // première porte : on s'identifie d'abord, le chrono ne part pas
    occupe = true;
    q("#egStart").disabled = true;
    let r;
    try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, action: "ouvrir" }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    if (r.j && r.j.portes) return recevoir(r.j, r.status === 200 ? "" : "Cette porte n'accepte plus de réponse.", r.status === 200 ? "ok" : "err");
    q("#egStart").disabled = false;
    dire("#egMsg", "Le chrono n'est pas parti : le serveur ne répond pas. Réessayez dans un instant.", "err");
  }

  // Réponse en cours de saisie : rien ne part tant que le bouton n'a pas été confirmé.
  function noter(v) {
    const p = E.portes[choix - 1];
    if (!p) return;
    brouillon = v; aConfirmer = false;
    if (p.type === "qcm") document.querySelectorAll("#egPanel button.eg-opt").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === v)));
    else q("#egVal").innerHTML = h(p.prefixe ? val(p, v) : v) + "<small>" + h(p.prefixe ? "Année proposée" : p.unite || "Votre dose") + "</small>";
    const b = q("#egSend");
    b.disabled = false;
    b.textContent = "Sceller ma réponse";
    dire("#egMsg", "");
  }

  async function envoyer() {
    const p = E.portes[choix - 1], b = q("#egSend");
    if (!p || brouillon === null || occupe) return;
    if (!aConfirmer) { aConfirmer = true; b.textContent = "Confirmer : " + (p.type === "qcm" ? "flacon " + LETTRES[brouillon] : val(p, brouillon)) + ", définitif"; return; }
    occupe = true; if (b) b.disabled = true;
    clearInterval(tic);
    let r;
    try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, reponse: brouillon, i: p.quiz ? p.quiz.i : undefined }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    brouillon = null; aConfirmer = false;
    if (r.status === 200) return recevoir(r.j, p.quiz && p.quiz.i < p.quiz.nb ? "Réponse scellée. Question suivante quand vous voulez." : "Réponse scellée. La traçabilité vous remercie.");
    if (r.status === 409) return recevoir(r.j, "Une réponse était déjà scellée pour cette porte : elle fait foi.", "err");
    if (r.status === 403 && r.j.error === "delai") return recevoir(r.j, "Trop tard : le chrono était écoulé à l'arrivée de la réponse.", "err");
    if (r.status === 403 && (r.j.error === "close" || r.j.error === "scellee")) return charger("Trop tard : cette porte vient de se refermer.");
    if (r.status === 401) return charger();
    if (r.j && r.j.portes) return recevoir(r.j, "La réponse n'a pas été acceptée.", "err");
    if (b) { b.disabled = false; b.textContent = "Sceller ma réponse"; }
    dire("#egMsg", "La réponse n'est pas partie. Réessayez tout de suite : le chrono tourne.", "err");
    battre();
  }

  // Jeux d'adresse : le code du jeu n'est chargé qu'au moment de jouer.
  const chargerJeux = () => new Promise((ok, ko) => {
    if (window.PharmacoJeux) return ok();
    const sc = document.createElement("script");
    sc.src = "jeux.js"; sc.onload = () => (window.PharmacoJeux ? ok() : ko()); sc.onerror = ko;
    document.head.appendChild(sc);
  });
  const patience = ms => new Promise(r => setTimeout(r, ms));
  // reel : la tentative compte et sa note part au serveur ; sinon c'est un essai libre de la relecture.
  async function jouer(reel) {
    const p = E.portes[choix - 1];
    if (!p || p.type !== "jeu" || enJeu || occupe) return;
    if (reel && !fiche()) return identifier(); // première porte : on s'identifie d'abord, aucune tentative n'est décomptée
    occupe = true;
    try { await chargerJeux(); } catch (e) { occupe = false; return dire("#egMsg", "Le jeu ne s'est pas chargé. Vérifiez la connexion et réessayez : aucune tentative n'a été décomptée.", "err"); }
    let jeton = "";
    if (reel) {
      let r;
      try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, action: "ouvrir" }); } catch (e) { r = { status: 0, j: {} }; }
      if (r.status !== 200) {
        occupe = false;
        if (r.j && r.j.portes) return recevoir(r.j, "Plus de tentative disponible pour cette porte.", "err");
        return dire("#egMsg", "La tentative n'est pas partie : le serveur ne répond pas. Rien n'a été décompté.", "err");
      }
      jeton = r.j.jeton; E = r.j; grille();
    }
    occupe = false;
    const zone = q("#egJeu"), bouton = q("#egPlay") || q("#egTry");
    if (bouton) bouton.hidden = true;
    zone.classList.add("jeu");
    dire("#egMsg", "");
    enJeu = window.PharmacoJeux[p.jeu](zone, { duree: p.duree, onFin: async (note, bilan, brut) => {
      enJeu = null;
      if (!reel) return panneau("Essai libre : " + note + " sur 10. " + bilan + " Rien n'a été enregistré.");
      let r = { status: 0, j: {} };
      for (let i = 0; i < 4 && !(r.j && r.j.portes); i++) {
        if (i) await patience(1500);
        try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, jeton, score: note, brut: Number.isInteger(brut) ? brut : undefined }); } catch (e) { r = { status: 0, j: {} }; }
      }
      if (r.status === 200) return recevoir(r.j, bilan + " Note enregistrée : " + note + " sur 10.");
      if (r.j && r.j.portes) return recevoir(r.j, "La note de cette tentative n'a pas été acceptée par le serveur.", "err");
      panneau("La note n'a pas pu partir : connexion perdue. La tentative compte pour 0.", "err");
    } });
    zone.scrollIntoView({ block: "nearest" });
  }

  // Classement : bulletin de libération, fiche du joueur, podium, puis la suite en lignes fines.
  // Tout vient de ce que le serveur envoie déjà : rien ne sort avant la clôture d'une porte.
  const ord = n => n + "<sup>" + (n === 1 ? "er" : "e") + "</sup>";
  let toutVoir = false, vuLib = () => {}, attenteW = false;
  const brigOuvertes = new Set();
  const dec = n => String(n).replace(".", ",");

  function rang() {
    const L = E.classement || [], moi = relecture ? "" : norm(mem.prenom || "");
    const closes = E.portes.filter(p => p.etat === "close"), clos = closes.length;
    const me = moi ? L.find(x => norm(x.p) === moi) : null;
    q("#egSum").textContent = L.length ? pl(L.length, "joueur", "joueurs") + " · " + pl(clos, "porte comptée", "portes comptées") : "";
    q("#egRankMsg").textContent = !L.length ? "Personne n'a encore scellé de réponse. La première place est à prendre."
      : !clos ? "Les premiers points tomberont à la clôture de la porte 1, le " + jour(dt(E.portes[0].ferme, 1)) + "."
      : clos === 25 ? "Classement final : les 25 portes sont closes." : "";
    q("#egRankMsg").hidden = !q("#egRankMsg").textContent;

    // Avatars et brigades : le dessin vient de participants.js, chargé à la demande ; le classement s'affiche sans attendre
    // et se redessine une fois le module arrivé. Avant l'ouverture des fiches, personne n'a ni avatar ni brigade : rien ne change.
    const W = window.PharmacoParticipants, fiches = L.some(x => x.a || x.b !== undefined);
    if (fiches && !W && !attenteW) { attenteW = true; chargerParticipants().then(() => { if (E) rang(); }).catch(() => {}); }
    const B = x => (W && W.BRIGADES[x.b]) || null;
    const av = x => (!W || !fiches ? "" : x.a ? W.avatar(x.a, { brigade: x.b, cls: "eg-av" }) : '<span class="eg-av eg-av0" aria-hidden="true"></span>');
    const emb = x => (B(x) ? W.embleme(x.b, "eg-emb") + '<span class="sr"> ' + h(B(x).nom) + "</span>" : "");
    brigades(L, clos, moi, W, av);
    // Progression : le serveur peut joindre le rang d'avant la dernière clôture (av). Seules les montées s'affichent.
    const monte = x => (x.av > x.rang ? '<span class="eg-up"><span aria-hidden="true">▲' + (x.av - x.rang) + '</span><span class="sr"> gagne ' + pl(x.av - x.rang, "rang", "rangs") + "</span></span>" : "");

    // Bulletin de libération : à la première visite après une clôture, ce qui vient d'être libéré pour ce joueur.
    const lib = q("#egLib"), vu = mem.vu && mem.vu.p === moi ? mem.vu : null;
    const neuves = me && clos ? closes.slice(vu ? Math.min(vu.clos, clos) : Math.max(0, clos - 1)) : [];
    vuLib = () => { if (me) { mem.vu = { p: moi, clos, rang: clos ? me.rang : 0 }; save(); } };
    if (!neuves.length) { lib.hidden = true; lib.innerHTML = ""; if (me && !vu) vuLib(); }
    else {
      const gain = neuves.reduce((t, p) => t + (p.pts || 0), 0), jouees = neuves.filter(p => p.pts !== undefined).length;
      const avant = vu && vu.clos ? vu.rang : neuves.length === 1 ? me.av : undefined, etait = lib.dataset.k;
      lib.dataset.k = moi + "|" + clos;
      lib.innerHTML = "<h4>" + (neuves.length === 1 ? "Porte " + neuves[0].n + " libérée" : "Portes " + neuves[0].n + " à " + neuves[neuves.length - 1].n + " libérées") + "</h4>"
        + "<div><p>Contrôle terminé, résultats libérés. Voici ce qui change pour vous, " + h(me.p) + " :</p>"
        + '<p class="eg-gain"><span>' + (jouees ? "+" + pl(gain, "point", "points") : neuves.length === 1 ? "Porte non jouée" : "Portes non jouées") + "</span>"
        + "<span>" + (avant && avant !== me.rang ? ord(avant) + ' <span aria-hidden="true">→</span><span class="sr"> puis </span> ' : "") + ord(me.rang) + " rang</span></p>"
        + '<button class="linkbtn" type="button" id="egVu">Classer le bulletin</button></div>';
      if (etait !== lib.dataset.k) { lib.classList.remove("neuf"); void lib.offsetWidth; lib.classList.add("neuf"); }
      lib.hidden = false;
    }

    // Ma fiche : rang, points, écart avec le rang du dessus, dernière porte libérée.
    const fiche = q("#egMoi");
    fiche.hidden = !(me && clos);
    if (me && clos) {
      const pairs = L.filter(x => x.rang === me.rang).length - 1, dessus = L.filter(x => x.pts > me.pts).pop(), der = closes[closes.length - 1];
      const att = E.portes.filter(p => p.etat === "ouverte" && (p.rep !== undefined || tentatives(p) > 0 || p.type === "quiz" || (p.quiz && p.quiz.i > 1))).length;
      const lignes = [];
      if (dessus) lignes.push("À <b>" + pl(dessus.pts - me.pts, "point", "points") + "</b> du " + ord(dessus.rang) + " rang.");
      else if (!me.pts) lignes.push("Aucun point distribué pour l'instant : tout reste à jouer.");
      else lignes.push(pairs ? "En tête, à égalité avec <b>" + pl(pairs, "joueur", "joueurs") + "</b>." : "<b>En tête</b> du classement.");
      if (lib.hidden && me.av !== undefined && me.av !== me.rang) lignes.push("Depuis la dernière clôture : du " + ord(me.av) + " au " + ord(me.rang) + " rang.");
      lignes.push("Dernière porte libérée : <b>porte " + der.n + ", " + (der.pts !== undefined ? "+" + pl(der.pts, "point", "points") : "non jouée") + "</b>.");
      if (att) lignes.push("<b>" + pl(att, "résultat", "résultats") + "</b> encore sous scellé.");
      fiche.innerHTML = '<div class="eg-moi-h"><span class="eg-moi-rg"><span><span class="sr">Rang </span>' + (L[0].pts ? ord(me.rang) : "·") + "</span></span><div><b>" + h(me.p) + ", " + pl(me.pts, "point", "points") + "</b>"
        + "<small>sur " + pl(L.length, "joueur", "joueurs") + (dessus && pairs ? " · ex aequo" : "") + "</small></div></div><ul>" + lignes.map(t => "<li>" + t + "</li>").join("") + "</ul>";
    }

    // Podium : les trois premiers rangs une fois des points distribués, les ex aequo sur la même marche.
    const tete = clos ? L.filter(x => x.rang <= 3 && x.pts > 0) : [], podium = tete.length > 0 && tete.length <= 6;
    q("#egPod").hidden = !podium;
    q("#egPod").innerHTML = !podium ? "" : [1, 2, 3].map(n => {
      const T = tete.filter(x => x.rang === n);
      return !T.length ? "" : '<li class="eg-marche s' + n + '"><ul>' + T.map(x => '<li class="eg-row r' + n + (norm(x.p) === moi ? " me" : "") + '">' + av(x) + "<span><b>" + h(x.p) + "</b>" + emb(x) + monte(x) + '</span><span class="sr"> ' + pl(x.pts, "point", "points") + "</span></li>").join("")
        + '</ul><div class="eg-socle"><span class="sr">Rang </span><b>' + n + "</b><span>" + pl(T[0].pts, "point", "points") + (T.length > 1 ? '<span class="sr"> chacun, ex aequo</span>' : "") + "</span></div></li>";
    }).join("");

    // Suite : lignes fines, sans barre. Liste longue : repliée autour des premiers et du joueur, dépliable.
    const suite = podium ? L.filter(x => !tete.includes(x)) : L, iMoi = suite.indexOf(me), long = suite.length > 8;
    let trou = false;
    q("#egList").innerHTML = suite.map((x, i) => {
      const cache = long && !toutVoir && i >= 5 && Math.abs(i - iMoi) > 1, saut = cache && !trou;
      trou = cache;
      return (saut ? '<li class="eg-gap" aria-hidden="true">…</li>' : "")
        + '<li class="eg-row' + (x === me ? " me" : "") + '"' + (cache ? " hidden" : "") + '><span class="eg-rk"><span class="sr">Rang </span>' + (clos ? x.rang : "·") + "</span>"
        + '<span class="eg-nm">' + av(x) + "<b>" + h(x.p) + "</b>" + emb(x) + (x === me ? '<span class="eg-vous">vous</span>' : "") + monte(x) + "</span>"
        + '<span class="eg-pt">' + (clos ? pl(x.pts, "point", "points") : pl(x.rep, "réponse scellée", "réponses scellées")) + "</span></li>";
    }).join("");
    q("#egMore").hidden = !long;
    q("#egTout").textContent = toutVoir ? "Replier le classement" : "Afficher les " + L.length + " joueurs";
    q("#egTout").setAttribute("aria-expanded", toutVoir);
    const tete2 = !lib.hidden || !fiche.hidden || podium;
    q("#egCol").hidden = !tete2;
    q("#egRBody").classList.toggle("duo", tete2);
  }

  // Classement des cinq brigades, au-dessus du classement individuel : rang et moyenne par membre actif (portes closes
  // seulement, calculés par le serveur), puis au toucher la devise, le jeu emblème, l'effectif et les membres.
  // Avant la première clôture : ni rang ni moyenne. Sans brigade (avant l'ouverture des fiches) : pas de bandeau.
  function brigades(L, clos, moi, W, av) {
    const T = (E.brigades || []).filter(t => t.n > 0), zone = q("#egBrigs");
    zone.hidden = !(W && T.length);
    if (zone.hidden) return;
    const note = clos > 0 && T.some(t => t.moy > 0), mienne = !relecture && E.profil ? E.profil.b : undefined;
    const cat = typeof G !== "undefined" && Array.isArray(G) ? G : [];
    q("#egBrigsS").textContent = note ? "Moyenne de points par membre actif, portes closes" : "Rang et moyenne à la première clôture";
    q("#egBrigsL").innerHTML = T.map(t => {
      const b = W.BRIGADES[t.b];
      if (!b) return "";
      const devise = W.DEVISES[t.devise], jeu = (t.jeux || []).map(n => cat.find(g => g.n === n)).find(Boolean), M = L.filter(x => x.b === t.b);
      return '<li><details class="eg-brig' + (t.b === mienne ? " me" : "") + '" data-b="' + t.b + '" style="--bf:' + b.fond + '"' + (brigOuvertes.has(String(t.b)) ? " open" : "") + ">"
        + '<summary><span class="eg-rk">' + (note ? '<span class="sr">Rang </span>' + t.rang : '<span aria-hidden="true">·</span>') + "</span>" + W.embleme(t.b, "eg-emb")
        + '<span class="eg-brig-t"><b>' + h(b.nom) + (t.b === mienne ? ' <span class="eg-vous">la vôtre</span>' : "") + "</b>"
        + '<span class="eg-pt">' + (note ? "moyenne " + dec(t.moy) + " " + (t.moy >= 2 ? "points" : "point") + " · " : "") + pl(t.n, "membre", "membres") + '</span></span><i aria-hidden="true"></i></summary>'
        + '<div class="eg-brig-c"><p><small>Devise</small>' + (devise ? "« " + h(devise) + " »" : "Pas encore élue.") + "</p>"
        + '<div><small>Jeu emblème</small><div class="eg-brig-j">' + (jeu ? '<img src="img/' + h(jeu.img) + '" alt="" loading="lazy"><b>' + h(jeu.n) + "</b>" : "<p>Pas encore élu.</p>") + "</div></div>"
        + "<p><small>Effectif</small>" + pl(t.n, "membre", "membres") + (clos ? ", dont " + pl(t.actifs, "actif", "actifs") + " sur les portes closes" : "") + ".</p>"
        + '<div><small>Membres</small><ul class="eg-brig-m">' + M.map(x => "<li" + (moi && norm(x.p) === moi ? ' class="me"' : "") + ">" + av(x) + h(x.p) + "</li>").join("") + "</ul></div></div></details></li>";
    }).join("");
  }
})();
