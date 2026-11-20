/* La grande énigme de Noël.
   Propre au site Vercel : ce module parle à /api/enigme (prénom et code d'équipe exigés).
   Une porte par jour du 1er au 25 décembre, ouverte trois jours ; les questions, les solutions et les points
   viennent du serveur, rien n'est écrit ici. Sans serveur, par exemple dans l'artefact claude.ai, rien ne s'affiche. */
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
  let E = null, choix = 0, brouillon = null, aConfirmer = false, relecture = "", occupe = false, sec;

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

  const NOTICE = `<details class="eg-panel eg-notice" id="egNotice" open><summary>Notice de la grande énigme : à lire avant la première prise</summary>
<ol class="eg-rules">
<li><b>Composition.</b> 25 portes, une par jour du 1<sup>er</sup> au 25 décembre. Derrière chacune, une question illustrée sur le jeu de société.</li>
<li><b>Formes disponibles.</b> Quatre flacons, un seul bon : 10 points. Ou un dosage : une valeur à estimer entre 0 et 100.</li>
<li><b>Posologie du dosage.</b> Pile sur la valeur cible : 10 points. Chaque tranche de 2 d'écart en retire 1. Le plus proche marque le plus.</li>
<li><b>Délai de péremption.</b> Une porte reste ouverte trois jours : le sien, le lendemain et le surlendemain jusqu'à minuit. Les week-ends se rattrapent.</li>
<li><b>Précautions d'emploi.</b> Une seule prise par porte : la réponse est scellée, sans repentir. Chercher est permis, souffler la réponse au voisin ne l'est pas.</li>
<li><b>Libération des résultats.</b> Bonne réponse, points et classement sortent à la clôture de la porte. D'ici là, tout reste sous scellé.</li>
</ol>
<p class="eg-fx">Effet indésirable très fréquent : consultation compulsive du classement.</p></details>`;
  const SCEAU = '<svg class="eg-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5l2.2 2 3-.3.7 2.9 2.6 1.5-1.2 2.7 1.2 2.7-2.6 1.5-.7 2.9-3-.3-2.2 2-2.2-2-3 .3-.7-2.9L1.5 13l1.2-2.7L1.5 7.6l2.6-1.5.7-2.9 3 .3z" fill="currentColor"/><path d="M6.4 10.3l2.4 2.4 4.6-4.9" fill="none" stroke="#26076D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CADENAS = '<svg class="eg-ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 9V6.5a4 4 0 0 1 8 0V9" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="3.5" y="9" width="13" height="9.5" rx="2.5" fill="currentColor"/></svg>';

  const CSS = `
.eg [hidden]{display:none!important}
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
.eg-list{display:grid;gap:9px;margin:14px 0 0;padding:0;list-style:none}
.eg-row{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px 12px;align-items:center;padding:8px 12px;background:#fff;border:2.5px solid var(--line);border-radius:14px}
.eg-row.r1{background:var(--tI);box-shadow:4px 4px 0 var(--shadow)}
.eg-row.me{outline:3px solid #EC7739;outline-offset:1px}
.eg-rk{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:2.5px solid var(--line);background:var(--foil-a);font:800 1.05rem/1 var(--display);font-variant-numeric:tabular-nums}
.eg-row.r1 .eg-rk{background:var(--mu)}.eg-row.r2 .eg-rk{background:var(--li)}.eg-row.r3 .eg-rk{background:var(--tE)}
.eg-n{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0;font-weight:800;line-height:1.15}
.eg-n b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.eg-n span{flex:0 0 auto;font:600 .78rem var(--mono);white-space:nowrap}
.eg-bar{height:10px;margin:6px 0 0;border:2px solid var(--line);border-radius:999px;background:var(--foil-a);overflow:hidden}
.eg-bar i{display:block;height:100%;background:var(--or)}
.eg-row small{display:block;margin-top:4px;font:600 .68rem var(--mono);color:var(--muted)}
@media(min-width:861px){.eg-rules{grid-template-columns:1fr 1fr;gap:11px 30px}.eg-list{grid-template-columns:1fr 1fr}}
@media(max-width:860px){.eg-body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.eg-sheet{padding:10px 8px 12px}.eg-grid{gap:8px 6px}.eg-notice{padding:6px 12px}.eg-notice[open]{padding-bottom:14px}.eg-panel{padding:14px 14px 16px}}
@media(prefers-reduced-motion:reduce){.eg-cell.ou .eg-door{animation:none}.eg-door{transition:none}}`;

  function init() {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    sec = document.createElement("section");
    sec.className = "wrap adv eg";
    sec.id = "enigme";
    sec.hidden = true;
    sec.setAttribute("aria-labelledby", "enigme-t");
    sec.innerHTML = '<p class="adv-back"><a class="go" href="#">Retour au catalogue</a></p>'
      + '<div class="adv-head"><h2 id="enigme-t">La grande énigme <span>de Noël</span></h2>'
      + '<p class="adv-intro">Vingt-cinq portes, une par jour du 1<sup>er</sup> au 25 décembre. Derrière chacune, une question sur le jeu de société : quatre flacons au choix, ou une dose à estimer entre 0 et 100. Le plus précis marque le plus de points.</p></div>'
      + NOTICE
      + '<form class="eg-panel eg-gate" id="egGate" novalidate><h3>Entrer dans le calendrier</h3>'
      + '<label for="egPrenom">Votre prénom</label><input id="egPrenom" type="text" autocomplete="given-name" maxlength="24" required>'
      + '<label for="egCode">Code d\'équipe</label><input id="egCode" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="64" required>'
      + '<p class="eg-hint">Même prénom, même fiche, sur tous vos appareils : vos réponses sont gardées par le serveur de l\'équipe. Deux collègues du même prénom ? Ajoutez une initiale collée, par exemple CamilleB.</p>'
      + '<p class="eg-msg err" id="egGateMsg" role="status"></p><button class="go main" type="submit">Ouvrir mon calendrier</button></form>'
      + '<p class="eg-banner" id="egBanner" hidden>Mode relecture : les 25 portes s\'affichent avec leur solution. Rien n\'est enregistré.</p>'
      + '<div class="eg-body" id="egBody" hidden>'
      + '<div class="eg-sheet"><div class="eg-cap"><span>Calendrier des 25 portes</span><b id="egWho"></b></div>'
      + '<div class="eg-grid" id="egGrid" role="group" aria-label="Calendrier des 25 portes"></div>'
      + '<p class="eg-legend" aria-hidden="true"><span><i class="k0"></i>Sous scellé</span><span><i class="k1"></i>Ouverte</span><span><i class="k2"></i>Réponse scellée</span><span><i class="k3"></i>Résultat libéré</span></p>'
      + '<p class="eg-score" id="egScore" role="status"></p>'
      + '<p class="eg-tools"><button class="go" type="button" id="egReload">Actualiser</button><button class="linkbtn" type="button" id="egChange">Changer de prénom</button></p></div>'
      + '<aside class="eg-panel" id="egPanel" aria-live="polite"></aside>'
      + "</div>"
      + '<div class="eg-panel eg-rank" id="egRank" hidden><div class="eg-rhead"><h3>Classement de l\'équipe</h3><p class="eg-sum" id="egSum"></p></div>'
      + '<p class="eg-d" id="egRankMsg"></p><ol class="eg-list" id="egList"></ol></div>';
    (q("#vote") || q("#avent") || q("header.hero")).insertAdjacentElement("afterend", sec);

    const a = document.createElement("a");
    a.className = "go avgo";
    a.href = "#enigme";
    a.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M2 21V9a7 7 0 0 1 14 0v12z" fill="currentColor"/><circle cx="12.4" cy="14" r="1.6" fill="#ECD567"/></svg>Jouer à la grande énigme de Noël';
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
    });
    q("#egPanel").addEventListener("input", e => { if (e.target.id === "egRange") noter(Number(e.target.value)); });
    q("#egChange").addEventListener("click", sortir);
    q("#egReload").addEventListener("click", () => charger("Calendrier à jour."));

    // Prénom et code déjà donnés pour le vote sur cet appareil : on les propose, sans les imposer.
    let v = {};
    try { v = JSON.parse(localStorage.getItem(KEY_VOTE) || "{}") || {}; } catch (e) {}
    q("#egPrenom").value = String(mem.prenom || v.prenom || "").slice(0, 24);
    q("#egCode").value = String(mem.code || v.code || "").slice(0, 64);

    window.addEventListener("hashchange", view);
    // Retour sur l'onglet resté ouvert : le calendrier se remet à jour, sauf si une réponse est en cours de saisie.
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !sec.hidden && E && brouillon === null) charger(); });
    view();
  }

  function view() {
    const on = location.hash === "#enigme";
    sec.hidden = !on;
    if (!on) return;
    document.querySelectorAll("#avent,.ind,.bar,main").forEach(e => { e.hidden = true; });
    sec.scrollIntoView({ block: "start" });
    if (relecture || (mem.prenom && mem.code)) charger();
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
      if (!(p.length >= 2 && p.length <= 24 && PRENOM.test(p))) return dire("#egGateMsg", "Un seul prénom, de 2 à 24 lettres, sans espace ni chiffre.", "err");
      relecture = "";
      mem.prenom = p; mem.code = code;
      save();
    }
    dire("#egGateMsg", "");
    recevoir(r.j);
  }

  function sortir() {
    relecture = "";
    E = null;
    q("#egBody").hidden = true; q("#egRank").hidden = true; q("#egBanner").hidden = true;
    q("#egGate").hidden = false;
    q("#egNotice").open = true;
    q("#egPrenom").focus();
  }

  async function charger(msg) {
    if (occupe) return;
    occupe = true;
    let r;
    try { r = await call(relecture ? { code: relecture } : { code: mem.code, prenom: mem.prenom }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    if (r.status === 401 || r.status === 400) { if (!relecture) { delete mem.code; save(); } sortir(); return dire("#egGateMsg", "Code d'équipe à ressaisir.", "err"); }
    if (r.status !== 200) return E ? dire("#egMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err") : dire("#egGateMsg", "Le serveur ne répond pas. Réessayez dans un instant.", "err");
    recevoir(r.j, msg);
  }

  // Porte montrée d'office : la plus ancienne encore à répondre, sinon la dernière ouverte, sinon la dernière close.
  function parDefaut() {
    if (relecture) return 1;
    const P = E.portes, ouvertes = P.filter(p => p.etat === "ouverte"), closes = P.filter(p => p.etat === "close");
    const aFaire = ouvertes.find(p => p.rep === undefined);
    return aFaire ? aFaire.n : ouvertes.length ? ouvertes[ouvertes.length - 1].n : closes.length ? closes[closes.length - 1].n : 0;
  }

  function recevoir(j, msg, cls) {
    const premier = !E;
    E = j;
    q("#egGate").hidden = true;
    q("#egBody").hidden = false;
    q("#egRank").hidden = false;
    q("#egBanner").hidden = !relecture;
    if (premier) { q("#egNotice").open = false; choix = parDefaut(); brouillon = null; aConfirmer = false; }
    q("#egWho").textContent = relecture ? "Relecture" : mem.prenom;
    grille();
    panneau(msg, cls);
    rang();
  }

  function grille() {
    q("#egGrid").innerHTML = E.portes.map(p => {
      let k, lab, dit;
      if (relecture) { k = "rl"; lab = p.type === "qcm" ? "QCM" : "Dose"; dit = "relecture"; }
      else if (p.etat === "avenir") { k = "av"; lab = CADENAS; dit = "sous scellé jusqu'au " + jour(dt(p.ouvre)); }
      else if (p.etat === "ouverte") { const f = p.rep !== undefined; k = f ? "sc" : "ou"; lab = f ? SCEAU + "Scellée" : "Ouverte"; dit = f ? "réponse scellée" : "ouverte, à répondre"; }
      else { const f = p.rep !== undefined; k = f ? "ok" + (p.pts === 10 ? " max" : "") : "ko"; lab = f ? "+" + p.pts : "Manquée"; dit = f ? pl(p.pts, "point", "points") : "manquée"; }
      return '<button class="eg-cell ' + k + (p.n === choix ? " sel" : "") + '" type="button" data-n="' + p.n + '" aria-pressed="' + (p.n === choix) + '" aria-label="' + h("Porte " + p.n + " : " + dit) + '">'
        + '<span class="eg-door"><b>' + p.n + "</b><small>" + lab + "</small></span></button>";
    }).join("");
    const clos = E.portes.filter(p => p.etat === "close").length, att = E.portes.filter(p => p.etat === "ouverte" && p.rep !== undefined).length;
    q("#egScore").textContent = relecture ? "25 portes à relire, solutions comprises."
      : "Total : " + pl(E.total, "point", "points") + " · " + pl(clos, "porte close", "portes closes") + (att ? " · " + pl(att, "réponse scellée en attente", "réponses scellées en attente") : "");
  }

  function choisir(n) {
    choix = n; brouillon = null; aConfirmer = false;
    grille();
    panneau();
    const c = q('#egGrid [data-n="' + n + '"]');
    if (c) c.focus({ preventScroll: true });
  }

  const LETTRES = ["A", "B", "C", "D"];
  const flacon = (o, i, tag, cls, note) => "<" + tag + ' class="eg-opt' + (cls ? " " + cls : "") + '"' + (tag === "button" ? ' type="button" data-v="' + i + '" aria-pressed="false"' : "") + "><i>" + LETTRES[i] + "</i>"
    + (o.img ? '<img src="img/' + h(o.img) + '" alt="" loading="lazy">' : "") + "<span>" + fr(o.t) + (note ? "<em>" + note + "</em>" : "") + "</span></" + tag + ">";

  function saisie(p) {
    const fin = '<p class="eg-hint">Une seule prise par porte : la réponse est définitive. Clôture le ' + jour(dt(p.ferme)) + ' à minuit.</p>'
      + '<button class="go main" type="button" id="egSend" disabled>Sceller ma réponse</button>';
    if (p.type === "qcm") return '<div class="eg-opts' + (p.options.some(o => o.img) ? " img" : "") + '" role="group" aria-label="Quatre propositions">' + p.options.map((o, i) => flacon(o, i, "button")).join("") + "</div>" + fin;
    return '<div class="eg-dose"><output class="eg-val" id="egVal" for="egRange">?<small>Réglez la dose</small></output>'
      + '<div class="eg-slide"><button class="eg-step" type="button" data-d="-1" aria-label="Un de moins">−</button>'
      + '<input id="egRange" type="range" min="0" max="100" step="1" value="50" aria-label="Votre réponse, de 0 à 100">'
      + '<button class="eg-step" type="button" data-d="1" aria-label="Un de plus">+</button></div>'
      + '<p class="eg-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></p></div>' + fin;
  }

  function solution(p) {
    const fait = p.rep !== undefined;
    let s;
    if (p.type === "qcm") {
      s = '<div class="eg-opts' + (p.options.some(o => o.img) ? " img" : "") + '">' + p.options.map((o, i) => flacon(o, i, "div", i === p.bonne ? "bon" : fait && i === p.rep ? "mien" : "", i === p.bonne ? (fait && p.rep === i ? "Bon flacon, le vôtre" : "Bon flacon") : fait && i === p.rep ? "Votre choix" : "")).join("") + "</div>";
    } else {
      s = '<div class="eg-cible"><div class="bon"><small>Valeur cible</small><b>' + h(val(p, p.bonne)) + "</b></div>"
        + (fait ? "<div><small>Votre dose · écart " + Math.abs(p.rep - p.bonne) + "</small><b>" + h(val(p, p.rep)) + "</b></div>" : "") + "</div>";
    }
    if (!relecture) s += '<p class="eg-pts' + (fait && p.pts ? "" : " zero") + '">' + (fait ? "+" + pl(p.pts, "point", "points") : "Porte manquée : 0 point") + "</p>";
    s += '<p class="eg-ex">' + fr(p.explication) + "</p>";
    if (p.source && p.source.t) s += '<p class="eg-src">Source : ' + (p.source.url ? '<a href="' + h(p.source.url) + '" target="_blank" rel="noopener">' + h(p.source.t) + "</a>" : h(p.source.t)) + "</p>";
    return s;
  }

  function panneau(msg, cls) {
    const p = E.portes[choix - 1];
    let html;
    if (!p) {
      const d1 = dt(E.portes[0].ouvre), n = 1 - E.jour;
      html = '<p class="ap-m">Calendrier sous scellé</p><h3>Première porte le ' + jour(d1) + "</h3>"
        + '<p class="eg-d">Encore ' + pl(n, "jour", "jours") + " de quarantaine. Vous êtes inscrit au contrôle : revenez le jour dit, une porte s'ouvrira chaque matin jusqu'au 25.</p>";
    } else if (p.etat === "avenir" && !relecture) {
      html = '<p class="ap-m">Porte ' + p.n + ' · sous scellé</p><h3>Patience</h3><p class="eg-d">Cette porte s\'ouvrira le ' + jour(dt(p.ouvre)) + ". D'ici là, elle reste en quarantaine.</p>";
    } else {
      const ouverte = p.etat === "ouverte" && !relecture, fait = p.rep !== undefined;
      html = '<p class="ap-m">Porte ' + p.n + " · " + jour(dt(p.ouvre)) + " · " + (p.type === "qcm" ? "quatre flacons" : "dosage de 0 à 100") + "</p><h3>" + fr(p.titre) + "</h3>"
        + '<div class="eg-ill">' + p.ill + '</div><p class="eg-q">' + fr(p.question) + "</p>";
      if (ouverte && !fait) html += saisie(p);
      else if (ouverte) html += '<div class="eg-seal">' + SCEAU + "<span><small>Réponse scellée</small><b>" + h(val(p, p.rep)) + "</b></span></div>"
        + '<p class="eg-d">Bonne réponse et points seront libérés à la clôture de la porte : rendez-vous le ' + jour(dt(p.ferme, 1)) + ".</p>";
      else html += solution(p);
    }
    q("#egPanel").innerHTML = html + '<p class="eg-msg ' + (cls || "ok") + '" id="egMsg" role="status">' + h(msg || "") + "</p>";
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
    occupe = true; b.disabled = true;
    let r;
    try { r = await call({ code: mem.code, prenom: mem.prenom, n: p.n, reponse: brouillon }); } catch (e) { r = { status: 0, j: {} }; }
    occupe = false;
    brouillon = null; aConfirmer = false;
    if (r.status === 200) return recevoir(r.j, "Réponse scellée. La traçabilité vous remercie.");
    if (r.status === 409) return recevoir(r.j, "Une réponse était déjà scellée pour cette porte : elle fait foi.", "err");
    if (r.status === 403 && (r.j.error === "close" || r.j.error === "scellee")) return charger("Trop tard : cette porte vient de se refermer.");
    if (r.status === 401) return charger();
    b.disabled = false; b.textContent = "Sceller ma réponse";
    dire("#egMsg", r.status === 403 ? "Le calendrier affiche complet." : "La réponse n'est pas partie. Réessayez dans un instant.", "err");
  }

  function rang() {
    const L = E.classement || [], moi = relecture ? "" : norm(mem.prenom || ""), max = Math.max(1, ...L.map(x => x.pts));
    const clos = E.portes.filter(p => p.etat === "close").length;
    q("#egSum").textContent = L.length ? pl(L.length, "joueur", "joueurs") + " · " + pl(clos, "porte comptée", "portes comptées") : "";
    q("#egRankMsg").textContent = !L.length ? "Personne n'a encore scellé de réponse. La première place est à prendre."
      : !clos ? "Les premiers points tomberont à la clôture de la porte 1, le " + jour(dt(E.portes[0].ferme, 1)) + "."
      : clos === 25 ? "Classement final : les 25 portes sont closes." : "";
    q("#egRankMsg").hidden = !q("#egRankMsg").textContent;
    q("#egList").innerHTML = L.map(x => '<li class="eg-row' + (clos && x.rang <= 3 ? " r" + x.rang : "") + (norm(x.p) === moi ? " me" : "") + '"><span class="eg-rk"><span class="sr">Rang </span>' + (clos ? x.rang : "·") + "</span>"
      + '<div><p class="eg-n"><b>' + h(x.p) + "</b><span>" + pl(x.pts, "point", "points") + "</span></p>"
      + '<div class="eg-bar" aria-hidden="true"><i style="width:' + Math.round(x.pts / max * 100) + '%"></i></div>'
      + "<small>" + pl(x.rep, "réponse scellée", "réponses scellées") + "</small></div></li>").join("");
  }
})();
