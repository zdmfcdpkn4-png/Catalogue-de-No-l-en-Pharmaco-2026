/* Badges des indications : les huit pastilles du catalogue (#presets .chip) deviennent des jetons ronds.
   Propre au site Vercel, même fabrication que les jetons du menu (menu.js) : une face au trait de la charte, avec le
   nom de l'indication incurvé autour du dessin, une tranche et un dos en verre. Le jeton fait un tour sur lui-même
   au survol de la souris et au clic ; au clic, le filtre attend que le jeton montre son dos.
   Sur téléphone : quatre badges par ligne, plus petits, avec le nom seul (la précision du bas est masquée).
   Le bouton d'origine reste en place (classe, data-p, aria-pressed) : la page continue de le piloter.
   Sans ce fichier, les pastilles d'origine restent telles quelles. */
(() => {
  const boite = document.querySelector("#presets");
  if (!boite) return;
  const N = "#26076D", C = "#FFFBF2", Y = "#ECD567", O = "#EC7739", P = "#E5B4D9", V = "#B9A6F0", B = "#BFE3C9";
  const MEEPLE = "M50 4c-9 0-16 7-16 16 0 6 3 11 8 14-14 3-34 12-36 20-1 5 6 14 10 13 6-1 13-6 19-8-3 11-13 26-13 33 0 3 2 4 5 4h16c2 0 3-1 4-3l3-10 3 10c1 2 2 3 4 3h16c3 0 5-1 5-4 0-7-10-22-13-33 6 2 13 7 19 8 4 1 11-8 10-13-2-8-22-17-36-20 5-3 8-8 8-14 0-9-7-16-16-16z";
  const pion = (x, y, f) => '<path d="M' + (x - 4.5) + " " + (y + 11) + "L" + (x - 2) + " " + (y + 3) + "h4L" + (x + 4.5) + " " + (y + 11) + 'Z" fill="' + f + '"/><circle cx="' + x + '" cy="' + y + '" r="3.2" fill="' + f + '"/>';
  const pt = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + N + '" stroke="none"/>';
  // Par indication (clé data-p de la page) : le nom en haut, la précision en bas, la teinte du verre, le dessin (repère de 32 sur 32).
  const BADGES = {
    petits: ["Pédiatrie", "5 ou 6 ans", "#F59A62", '<g transform="translate(2.5 3.5) scale(.27)"><path d="' + MEEPLE + '" fill="' + O + '" stroke-width="7.4"/></g><ellipse cx="16" cy="10.6" rx="3.6" ry="2.3" fill="' + P + '" stroke-width="1.6"/><circle cx="16" cy="13.8" r="1.7" stroke-width="1.5" fill="' + Y + '"/>'],
    apero: ["Apéro", "au PharmacoBar", "#B9A6F0", '<path d="M5 9h22L16 21Z" fill="' + V + '"/><path d="M16 21v7M10.5 28h11"/><g transform="rotate(14 21 7)"><rect x="16.5" y="2.5" width="9" height="9" rx="2.2" fill="' + Y + '"/>' + pt(19.2, 5.2, 0.9) + pt(22.8, 8.8, 0.9) + pt(21, 7, 0.9) + "</g>"],
    deux: ["En isolateur", "2 postes", "#BFE3C9", '<path d="M3 28V15a13 13 0 0 1 26 0v13Z" fill="' + B + '"/>' + pion(11, 13.5, O) + pion(21, 13.5, Y) + '<path d="M3 28h26"/>'],
    coop: ["Travail d'équipe", "coopératifs", "#F2E39A", '<rect x="3" y="9" width="13" height="14" rx="2" fill="' + O + '"/><rect x="16" y="9" width="13" height="14" rx="2" fill="' + Y + '"/><circle cx="17" cy="16" r="3.3" fill="' + O + '"/><path d="M16 9v3.6M16 19.4V23"/>'],
    solo: ["Garde de nuit", "en solo ou en monoposte", "#B9A6F0", '<path d="M19 3A13 13 0 1 0 29 21A10.5 10.5 0 0 1 19 3Z" fill="' + Y + '"/>' + pion(24.5, 5.5, O)],
    prix: ["Petit budget", "15 € max", "#F2E39A", '<circle cx="16" cy="16" r="12.5" fill="' + Y + '"/><circle cx="16" cy="16" r="9" stroke-width="1.2" stroke-dasharray="1.5 2.4"/><path d="M20.5 11.8a5.6 5.6 0 1 0 0 8.4M9.5 14.6h7M9.5 17.6h7" stroke-width="2.2"/>'],
    prime: ["Médaillés", "de l'année", "#EFC7E4", '<path d="M9 2h6l3 9h-6Z" fill="' + O + '"/><path d="M23 2h-6l-3 9h6Z" fill="' + P + '"/><circle cx="16" cy="20" r="9" fill="' + Y + '"/><path d="M16 14.6l1.6 3.4 3.7.4-2.8 2.5.8 3.7L16 22.7l-3.3 1.9.8-3.7-2.8-2.5 3.7-.4Z" fill="' + N + '" stroke="none"/>'],
    cerveau: ["Concentration", "forte", "#F59A62", '<path d="M13 3v8L5.3 25.6A2.3 2.3 0 0 0 7.3 29h17.4a2.3 2.3 0 0 0 2-3.4L19 11V3" fill="' + C + '"/><path d="M9.2 18.2h13.6l3.9 7.4a2.3 2.3 0 0 1-2 3.4H7.3a2.3 2.3 0 0 1-2-3.4Z" fill="' + O + '"/><path d="M11 3h10"/>' + pt(12, 24.6, 1.25) + pt(16, 21.6, 1.25) + pt(20, 24.6, 1.25)],
  };
  const dessin = (k, x, t) => '<svg x="' + x + '" y="' + x + '" width="' + t + '" height="' + t + '" viewBox="0 0 32 32" fill="none" stroke="' + N + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">' + BADGES[k][3] + "</svg>";
  const TRANCHE = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(z => '<span class="bd-t" style="--z:' + z + 'px"></span>').join("");
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const st = document.createElement("style");
  st.textContent = `
#presets{gap:14px 12px;padding-bottom:14px}
#presets .chip.bd{--bd-fg:var(--on-surface);--bd-bg:var(--chip);position:relative;display:block;width:120px;height:120px;padding:0;border:0;border-radius:50%;background:none;box-shadow:none;perspective:620px;white-space:normal;transition:transform .12s;-webkit-tap-highlight-color:transparent}
#presets .chip.bd[aria-pressed="true"]{--bd-fg:var(--pressed-on);--bd-bg:var(--pressed);background:none}
.bd-o{position:absolute;inset:0;display:block;border-radius:50%;background:var(--shadow);transform:translate(4px,4px);transition:transform .12s}
.bd-j{position:absolute;inset:0;display:block;transform-style:preserve-3d}
.bd-f,.bd-v,.bd-t{position:absolute;inset:0;display:block;border-radius:50%}
.bd-f,.bd-v{-webkit-backface-visibility:hidden;backface-visibility:hidden}
.bd-f{transform:translateZ(6px)}
.bd-f svg,.bd-v svg{display:block;width:100%;height:100%}
.bd-f .bd-fond{fill:var(--bd-bg);stroke:var(--line)}
.bd-f text{fill:var(--bd-fg)}
.bd-f .bd-n{font:800 11.4px var(--display)}
.bd-f .bd-p{font:600 7.8px var(--mono);letter-spacing:.3px;text-transform:uppercase}
.bd-f .bd-p.long{font-size:6.7px}
.bd-f .bd-c{fill:var(--chip);stroke:var(--line)}
.chip.bd[aria-pressed="true"] .bd-c{stroke:none}
.bd-v{border:3px solid rgba(255,255,255,.85);background:radial-gradient(70% 55% at 30% 20%,rgba(255,255,255,.9),rgba(255,255,255,0) 70%),linear-gradient(135deg,rgba(255,255,255,.72),color-mix(in srgb,var(--fond) 55%,transparent) 60%,rgba(255,255,255,.5));box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45),inset -5px -7px 12px rgba(38,7,109,.14),inset 4px 5px 10px rgba(255,255,255,.7);transform:rotateY(180deg) translateZ(6px)}
.bd-t{border:3px solid rgba(255,255,255,.5);background:rgba(255,255,255,.07);box-shadow:inset 0 0 6px rgba(255,255,255,.35);transform:translateZ(var(--z))}
.bd-t:nth-child(odd){border-color:color-mix(in srgb,var(--fond) 60%,rgba(255,255,255,.55))}
@media(hover:hover){#presets .chip.bd:hover{transform:translate(-1px,-2px)}#presets .chip.bd:hover .bd-o{transform:translate(7px,9px)}}
#presets .chip.bd:active{transform:translate(2px,2px)}
#presets .chip.bd:active .bd-o{transform:translate(-1px,-1px)}
#presets .chip.bd:focus-visible{outline:3px solid var(--focus);outline-offset:5px}
.chip.bd.tourne .bd-j{animation:bdTour 1.6s linear both}
.chip.bd.tourne .bd-o{animation:bdOmbre 1.6s linear both}
@keyframes bdTour{0%{transform:rotateX(0) rotateY(0)}12%{transform:rotateX(14deg) rotateY(-24deg)}30%{transform:translateY(-5px) rotateX(10deg) rotateY(60deg)}40%{transform:translateY(-7px) rotateX(8deg) rotateY(90deg)}55%{transform:translateY(-7px) rotateX(8deg) rotateY(180deg)}68%{transform:translateY(-5px) rotateX(6deg) rotateY(270deg)}80%{transform:rotateX(2deg) rotateY(345deg)}90%{transform:rotateX(0) rotateY(367deg)}100%{transform:rotateX(0) rotateY(360deg)}}
@keyframes bdOmbre{0%{transform:translate(4px,4px) scaleX(1)}12%{transform:translate(4px,5px) scaleX(.91)}30%{transform:translate(6px,8px) scaleX(.5)}40%{transform:translate(7px,9px) scaleX(.12)}55%{transform:translate(7px,9px) scaleX(1)}68%{transform:translate(6px,8px) scaleX(.12)}80%{transform:translate(4px,5px) scaleX(.97)}90%,100%{transform:translate(4px,4px) scaleX(1)}}
@media(max-width:560px){#presets{gap:10px 8px}#presets .chip.bd{width:calc((100% - 24px)/4);max-width:96px;height:auto;aspect-ratio:1}.bd-f .bd-p{display:none}.bd-f .bd-n{font-size:12.6px}}
@media(prefers-reduced-motion:reduce){#presets .chip.bd,.bd-o{transition:none}.chip.bd.tourne .bd-j,.chip.bd.tourne .bd-o{animation:none}}`;
  document.head.appendChild(st);

  function habiller() {
    boite.querySelectorAll(".chip:not(.bd)").forEach(b => {
      const k = b.dataset.p, d = BADGES[k];
      if (!d) return;
      b.setAttribute("aria-label", b.textContent.trim());
      b.classList.add("bd");
      b.style.setProperty("--fond", d[2]);
      b.innerHTML = '<span class="bd-o"></span><span class="bd-j"><span class="bd-f"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">'
        + '<circle class="bd-fond" cx="50" cy="50" r="47" stroke-width="3"/><circle class="bd-c" cx="50" cy="50" r="25.5" stroke-width="1.6" stroke-dasharray="1.5 3"/>'
        + '<path id="bd-' + k + '-h" d="M14.5 50a35.5 35.5 0 0 1 71 0" fill="none"/><path id="bd-' + k + '-b" d="M9.5 50a40.5 40.5 0 0 0 81 0" fill="none"/>'
        + '<text class="bd-n" text-anchor="middle"><textPath href="#bd-' + k + '-h" startOffset="50%">' + esc(d[0]) + "</textPath></text>"
        + '<text class="bd-p' + (d[1].length > 16 ? " long" : "") + '" text-anchor="middle"><textPath href="#bd-' + k + '-b" startOffset="50%">' + esc(d[1]) + "</textPath></text>"
        + dessin(k, 29, 42) + "</svg></span>" + TRANCHE
        + '<span class="bd-v"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + dessin(k, 21, 58) + "</svg></span></span>";
    });
  }
  habiller();
  // Si la page redessine ses pastilles, on les rhabille.
  new MutationObserver(habiller).observe(boite, { childList: true });

  const calme = window.matchMedia("(prefers-reduced-motion:reduce)");
  const tourner = b => { if (!calme.matches) b.classList.add("tourne"); };
  boite.addEventListener("animationend", e => { if (e.animationName === "bdTour") e.target.closest(".chip").classList.remove("tourne"); });
  boite.addEventListener("pointerover", e => {
    const b = e.target.closest(".chip.bd");
    if (b && e.pointerType === "mouse" && !b.contains(e.relatedTarget)) tourner(b);
  });
  // Clic ou toucher simple : le filtre attend que le jeton montre son dos, sinon la page défile et l'emporte hors de l'écran.
  // Pas d'attente au clavier (detail à 0) ni en animation réduite. Le clic rejoué (detail à 0) passe tout droit.
  let attente = 0;
  boite.addEventListener("click", e => {
    const b = e.target.closest(".chip.bd");
    if (!b) return;
    tourner(b);
    if (calme.matches || e.detail === 0) return;
    e.stopPropagation();
    e.preventDefault();
    clearTimeout(attente);
    attente = setTimeout(() => b.click(), 800);
  }, true);
})();
