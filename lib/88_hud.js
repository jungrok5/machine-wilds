// machine-wilds · 88_hud — what is on the glass, laid out the way a console game lays it out: the walker's own machine and
// where it is (top left), a compass with the giants, the named places and anything you can use on it (top), what the
// buttons do now (bottom right: keys, or a pad's face buttons once a pad is used), a prompt with its key when something can
// be used (and a marker over it from further off), the place's name when you walk into it, and a menu (Tab · the ☰ chip ·
// a pad's Start) holding the hour, the weather, the camera, quality, sound and every key.  Also the thumb stick on touch
// screens, and the governor that keeps the frame rate by changing the internal resolution.
//
// Things to use: LR.interact.add({ poll(P) → null | { state: 'ready' | 'wait', label, sub, at: [x, y, z] | null, range, see } }).
// 'ready' within range (or anywhere, at: null) puts up the prompt with the use key (R · a pad's X); a marker with its
// distance stands over `at` from `see` metres (default 60).  The realm does the thing itself when P.use comes (80_player).
{
  const H = (LR.hud = { els: {}, fps: 60, show: true, menu: false });
  LR.interact = LR.interact || { list: [], add(o) { this.list.push(o); return o; } };
  // strings: a realm overrides any of these with LR.start({ strings: { … } })
  H.t = {
    dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night', clear: 'Clear', rain: 'Rain', snow: 'Snow', auto: 'Cycle', walk: 'Tour', mist: 'Mist',
    wx: { clear: 'clear', rain: 'rain', snow: 'snow', winter: 'winter', overcast: 'overcast', mist: 'mist', autumn: 'autumn' },
    hint: 'Tab · the menu, the hour, the weather and every key',
    hintTouch: 'left thumb walks · right thumb looks · ☰ menu',
    scans: 'Scans: Poly Haven · CC0',
    cam: 'Camera', zin: 'Nearer', zout: 'Further', torch: 'Lamp', scout: 'Scout camera', lens: 'Depth of field', views: { first: 'inside', third: 'behind', top: 'above' },
    quality: 'Quality', tiers: { auto: 'auto', low: 'low', medium: 'medium', high: 'high', ultra: 'ultra' }, sound: 'Sound', full: 'Full screen', stats: 'Stats', hide: 'Hide HUD',
    menu: 'Menu', close: 'Close', time: 'Time', weather: 'Weather', camera: 'Camera', system: 'System', controls: 'Controls', on: 'on', off: 'off',
    keyboard: 'Keyboard', gamepad: 'Gamepad', discovered: 'Discovered', fault: 'Fault', watching: 'is watching you', tap: 'Tap', noticed: 'has seen you', use: 'Use',
    legend: { move: 'Move', look: 'Look', run: 'Run', hop: 'Hop', view: 'Camera', lamp: 'Lamp', menu: 'Menu' },
    help: [['W A S D · ↑ ↓', 'walk', 'left stick'], ['Q E · ← →', 'turn', 'right stick'], ['mouse', 'look (click to capture, Esc to release)', 'right stick'], ['Shift', 'run', 'trigger'], ['Space', 'hop', 'A'],
      ['R', 'use (when a prompt shows)', 'X'], ['V', 'camera: inside · behind · above', 'Y'], ['wheel · + −', 'nearer · further', 'd-pad ↑ ↓'], ['B', 'lamp', ''], ['N', 'scout camera (its own lens, its own faults)', ''], ['Tab', 'menu', 'Start'],
      ['1 2 3 4', 'dawn · day · dusk · night', ''], ['5 6 7 8', 'clear · rain · snow · mist', ''], ['T', 'cycle the hour and the weather', ''], ['C', 'camera tour', ''], ['L', 'depth of field while walking', ''],
      ['G', 'quality', ''], ['M', 'sound', ''], ['F', 'full screen', ''], ['P', 'fps · resolution · draw calls', ''], ['H', 'hide the HUD', '']],
    taking: 'You have the walk · C for the tour', lensOn: 'Depth of field on · L to turn it off', lensOff: 'Depth of field off', lensNone: 'No depth of field at this quality · G to change it',
  };
  const ICON = {
    gh: '<path fill="currentColor" stroke="none" d="M12 1.6a10.4 10.4 0 0 0-3.3 20.3c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.5-1.2-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.5 1.1 3.1.9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.2-4.7-5.1 0-1.1.4-2 1.1-2.8-.1-.3-.5-1.3.1-2.8 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.4 10.4 0 0 0 12 1.6z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', bolt: '<path fill="currentColor" stroke="none" d="M13 2 4 14h6l-1 8 9-12h-6z"/>', eye: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  };
  const svg = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  const CSS = `
#hud{font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f1ede4;--acc:#f0b552;--red:#ff5b49;--arc:#8fd2ff;--dim:rgba(241,237,228,.62);--sh:0 1px 2px rgba(0,0,0,.9),0 0 10px rgba(0,0,0,.55)}
#hud *{box-sizing:border-box} #hud.off>*:not(#lr-flash):not(#lr-credit){opacity:0!important;pointer-events:none!important}
#hud .k{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border:1px solid rgba(241,237,228,.75);border-bottom-width:2px;border-radius:4px;font:600 11px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:0;color:#fff;background:rgba(0,0,0,.38);text-shadow:none;white-space:nowrap}
#hud .k.pad{border-radius:50%;min-width:22px;width:22px;padding:0;border-width:1.5px}
#hud .k.pA{border-color:#7fdc7f;color:#9ff09f} #hud .k.pB{border-color:#ff7b6b;color:#ffa497} #hud .k.pX{border-color:#77b6ff;color:#a6ceff} #hud .k.pY{border-color:#f2d266;color:#ffe48f}
#lr-unit{position:absolute;left:max(18px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));text-shadow:var(--sh);pointer-events:none;transition:opacity .4s}
#lr-unit .nm{display:flex;align-items:baseline;gap:8px;font:700 13px/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase}
#lr-unit .nm i{font:500 10px/1 system-ui,sans-serif;letter-spacing:.2em;font-style:normal;color:var(--dim)}
#lr-unit .bar{display:flex;gap:2px;margin:7px 0 0;width:188px;height:6px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))}
#lr-unit .bar b{flex:1;background:var(--acc);opacity:.92;transform:skewX(-18deg)} #lr-unit .bar b.dead{background:rgba(241,237,228,.18)} #lr-unit .bar b.zap{background:var(--arc);box-shadow:0 0 8px var(--arc)}
#lr-unit .flt{display:inline-flex;align-items:center;gap:4px;margin-top:6px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.24em;color:var(--arc);opacity:0;transition:opacity .08s;text-transform:uppercase}
#lr-unit .flt.on{opacity:1}
#lr-unit .loc{margin-top:10px;font:600 11px/1.2 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase}
#lr-unit .loc span{display:block;margin-top:3px;font-weight:500;letter-spacing:.12em;color:var(--dim);font-variant-numeric:tabular-nums}
#lr-unit.nobody .nm,#lr-unit.nobody .bar,#lr-unit.nobody .flt{display:none} #lr-unit.nobody .loc{margin-top:0}
#lr-comp{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);width:min(560px,52vw);height:38px;pointer-events:none}
#lr-comp canvas{width:100%;height:100%;display:block}
#lr-watch{position:absolute;left:50%;top:calc(max(14px,env(safe-area-inset-top)) + 42px);transform:translateX(-50%);display:flex;align-items:center;gap:6px;font:700 10.5px/1 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--red);text-shadow:var(--sh);opacity:0;transition:opacity .35s;pointer-events:none;white-space:nowrap}
#lr-watch.on{opacity:1} #lr-watch.seen{animation:lrpulse .5s ease-out 3}
@keyframes lrpulse{0%{transform:translateX(-50%) scale(1.25)}100%{transform:translateX(-50%) scale(1)}}
#lr-chip{position:absolute;right:max(16px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));display:flex;align-items:center;gap:6px;pointer-events:auto}
#lr-chip button,#lr-chip a{appearance:none;display:flex;align-items:center;gap:7px;height:32px;padding:0 10px;border:1px solid rgba(241,237,228,.28);border-radius:6px;background:rgba(8,9,11,.42);color:inherit;font:600 11px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;text-decoration:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
#lr-chip button:hover,#lr-chip a:hover{border-color:var(--acc)} #lr-chip button:focus-visible,#lr-chip a:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
#lr-legend{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:flex-end;gap:6px;text-shadow:var(--sh);pointer-events:none;transition:opacity .4s}
#lr-legend div{display:flex;align-items:center;gap:8px;font:600 11px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase}
#lr-legend div.use{color:var(--acc)} #lr-legend .ks{display:flex;gap:3px}
#lr-prompt{position:absolute;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 74px);transform:translateX(-50%) translateY(6px);display:flex;align-items:center;gap:12px;padding:10px 18px 10px 12px;background:linear-gradient(90deg,rgba(8,9,11,.72),rgba(8,9,11,.3));border-left:3px solid var(--acc);text-shadow:var(--sh);opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}
#lr-prompt{width:max-content;max-width:calc(100vw - 32px)} #lr-prompt.on{opacity:1;transform:translateX(-50%)} #hud.touch #lr-prompt.on:not(.wait){pointer-events:auto;cursor:pointer} #lr-prompt.wait{border-left-color:rgba(241,237,228,.4)}
#lr-prompt .k{min-width:32px;height:32px;font-size:14px} #lr-prompt .k.pad{width:32px}
#lr-prompt b{display:block;font:700 15px/1.15 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
#lr-prompt small{display:block;margin-top:3px;font-size:11px;letter-spacing:.1em;color:var(--dim)}
#lr-prompt.wait .k{display:none} #lr-prompt .ring{width:32px;height:32px;border-radius:50%;border:2px solid rgba(241,237,228,.25);border-top-color:var(--acc);animation:lrspin 1s linear infinite;display:none} #lr-prompt.wait .ring{display:block}
@keyframes lrspin{to{transform:rotate(360deg)}}
#lr-marks{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#lr-marks .m{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:3px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;text-shadow:var(--sh);color:var(--acc);white-space:nowrap}
#lr-marks .m i{width:12px;height:12px;border:2px solid currentColor;transform:rotate(45deg);box-shadow:0 0 8px rgba(0,0,0,.6)} #lr-marks .m.ready i{background:currentColor}
#lr-marks .m span{color:#f1ede4} #lr-marks .m em{font-style:normal;color:var(--dim);font-variant-numeric:tabular-nums}
#lr-hint{position:absolute;left:50%;bottom:calc(max(16px,env(safe-area-inset-bottom)) + 26px);transform:translateX(-50%);padding:7px 14px;font:600 11px/1.3 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-shadow:var(--sh);opacity:0;transition:opacity .8s;pointer-events:none;text-align:center;max-width:calc(100vw - 340px);white-space:nowrap}
#lr-hint.on{opacity:.95}
#lr-credit{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));font-size:10px;letter-spacing:.08em;color:#f1ede4;opacity:.62;text-decoration:none;text-shadow:var(--sh);pointer-events:auto}
#lr-credit:hover,#lr-credit:focus-visible{opacity:1;text-decoration:underline}
#lr-num{position:absolute;right:max(16px,env(safe-area-inset-right));top:60px;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;text-align:right;opacity:.85;text-shadow:0 1px 2px #000;white-space:pre;pointer-events:none}
.card{position:absolute;left:50%;top:21%;transform:translateX(-50%);text-align:center;opacity:0;transition:opacity 1.1s;pointer-events:none;text-shadow:0 2px 16px rgba(0,0,0,.8)}
.card.on{opacity:1} .card em{display:block;font:700 10.5px/1 system-ui,sans-serif;font-style:normal;letter-spacing:.42em;text-transform:uppercase;color:var(--acc);min-height:1em}
.card b{display:block;margin-top:10px;font:600 clamp(24px,4.2vw,44px)/1.1 system-ui,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#fff}
.card i{display:block;width:220px;height:1px;margin:12px auto 9px;background:linear-gradient(90deg,transparent,rgba(241,237,228,.8),transparent)} .card span{font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.86}
#lr-toast{position:absolute;left:50%;top:calc(max(14px,env(safe-area-inset-top)) + 64px);transform:translateX(-50%);padding:6px 14px;font:700 11px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#fff;background:linear-gradient(90deg,transparent,rgba(160,28,18,.7),transparent);opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap}
#lr-toast.on{opacity:1}
#lr-menu{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(6,7,9,.55),rgba(6,7,9,.86));pointer-events:auto;padding:20px}
#lr-menu.on{display:flex}
#lr-menu .box{width:min(860px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:22px 26px 24px;border-top:2px solid var(--acc);background:rgba(10,11,13,.82)}
#lr-menu header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}
#lr-menu header button.x{appearance:none;width:auto;height:auto;margin:0 0 0 8px;padding:6px 10px;background:transparent;border:1px solid rgba(241,237,228,.3);font:600 11px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase} #lr-menu header b{font:700 18px/1 system-ui,sans-serif;letter-spacing:.3em;text-transform:uppercase} #lr-menu header span{font-size:11px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase}
#lr-menu .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:18px 22px}
#lr-menu h4{margin:0 0 8px;font:700 10.5px/1 system-ui,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:var(--acc)}
#lr-menu button{appearance:none;display:flex;align-items:center;gap:10px;width:100%;height:34px;margin:0 0 4px;padding:0 10px;border:1px solid transparent;border-radius:4px;background:rgba(255,255,255,.04);color:inherit;font:500 12.5px/1 system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;text-align:left}
#lr-menu button:hover{background:rgba(255,255,255,.1)} #lr-menu button:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
#lr-menu button[aria-pressed="true"]{border-color:rgba(240,181,82,.7);background:rgba(240,181,82,.14)} #lr-menu button .k{min-width:26px} #lr-menu button em{margin-left:auto;font-style:normal;color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.1em}
#lr-menu table{width:100%;border-collapse:collapse;margin-top:6px} #lr-menu td{padding:5px 8px 5px 0;vertical-align:middle;font-size:12px;border-top:1px solid rgba(255,255,255,.06)} #lr-menu td:first-child,#lr-menu td:last-child{white-space:nowrap}
#lr-menu th{text-align:left;font:600 10px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);padding:0 8px 6px 0}
#lr-menu .ctl{margin-top:20px}
#lr-stick{position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;border:1px solid rgba(241,237,228,.4);background:rgba(8,9,11,.22);display:none;pointer-events:none}
#lr-stick i{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(240,181,82,.35);border:1px solid var(--acc)}
#lr-scout{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .25s;font:600 11px/1.35 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.06em;color:#f4f1ea;text-shadow:0 0 3px rgba(0,0,0,.9)}
#lr-scout.on{opacity:1} #lr-scout .tl,#lr-scout .tr,#lr-scout .bl,#lr-scout .br{position:absolute} #lr-scout .tl{left:7%;top:8%} #lr-scout .tr{right:7%;top:8%;text-align:right} #lr-scout .bl{left:7%;bottom:9%} #lr-scout .br{right:7%;bottom:9%;text-align:right}
#lr-scout .rec{color:#ff4a3d} #lr-scout .rec i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4a3d;margin-right:5px;vertical-align:0} #lr-scout .rec.off i{opacity:.15}
#lr-scout .cn{position:absolute;width:26px;height:26px;border:2px solid rgba(244,241,234,.75)} #lr-scout .c1{left:4.5%;top:5.5%;border-right:0;border-bottom:0} #lr-scout .c2{right:4.5%;top:5.5%;border-left:0;border-bottom:0} #lr-scout .c3{left:4.5%;bottom:6%;border-right:0;border-top:0} #lr-scout .c4{right:4.5%;bottom:6%;border-left:0;border-top:0}
#lr-scout .bars b{display:inline-block;width:5px;height:9px;margin-right:2px;background:#f4f1ea} #lr-scout .bars b.o{background:rgba(244,241,234,.2)} #lr-scout .flt{color:#8fd2ff}
#hud.scouting #lr-legend,#hud.scouting #lr-unit,#hud.scouting #lr-hint{display:none}
#lr-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;mix-blend-mode:screen}
#hud.touch #lr-legend{display:none} #hud.touch .hk{display:none}
@media (max-width:720px){#lr-toast{top:calc(max(14px,env(safe-area-inset-top)) + 128px)}#lr-comp{width:min(300px,46vw);top:calc(max(14px,env(safe-area-inset-top)) + 2px)}#lr-unit .bar{width:120px}#lr-unit .nm{font-size:11px}#lr-unit .nm i{display:none}#lr-chip .lb,#lr-chip .hk{display:none}#lr-legend{display:none}#lr-hint{max-width:calc(100vw - 24px);white-space:normal}#lr-watch{top:calc(max(14px,env(safe-area-inset-top)) + 44px)}#lr-menu .box{padding:16px}#lr-menu .ctl td:nth-child(3),#lr-menu .ctl th:nth-child(3){display:none}}
@media (max-width:430px){#lr-comp{display:none}#lr-watch{top:calc(max(14px,env(safe-area-inset-top)) + 96px);left:18px;transform:none}}
@media (prefers-reduced-motion:reduce){#lr-prompt,.card,#lr-hint,#lr-watch{transition:none;animation:none}}`;
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // the keys, or a pad's buttons once a pad has been used (P.input: 'keys' | 'pad' | 'touch')
  const PAD = { R: ['X', 'pX'], Space: ['A', 'pA'], V: ['Y', 'pY'], Tab: ['☰', ''], Shift: ['RT', ''], WASD: ['LS', ''], Mouse: ['RS', ''], B: null };
  const cap = (k) => { const pad = LR.player && LR.player.input === 'pad'; if (pad && PAD[k] !== undefined) { const p = PAD[k]; return p ? `<span class="k pad ${p[1]}">${p[0]}</span>` : ''; } return `<span class="k">${k}</span>`; };
  H.init = () => {
    if (LR.RENDER || LR.q('hud') === '0') return;
    const t = Object.assign(H.t, (LR.cfg && LR.cfg.strings) || {}), root = document.getElementById('hud'), E = H.els, wx = LR.wx, P = LR.player, meta = typeof REALM_META !== 'undefined' ? REALM_META : {};
    document.head.appendChild(el('style', {}, CSS)); if (LR.gpu.mobile) root.classList.add('touch');
    const body = () => LR.mech && LR.mech.units && LR.mech.units.find((u) => u.avatar);
    E.unit = root.appendChild(el('div', { id: 'lr-unit' }, `<div class="nm"><span></span><i></i></div><div class="bar">${'<b></b>'.repeat(14)}</div><div class="flt">${svg('bolt', 11)}<span>${esc(t.fault)}</span></div><div class="loc">${esc(meta.title || t.title || '')}<span></span></div>`));
    E.segs = [...E.unit.querySelectorAll('.bar b')]; E.flt = E.unit.querySelector('.flt');
    E.comp = root.appendChild(el('div', { id: 'lr-comp' }, '<canvas></canvas>')); E.cv = E.comp.firstChild;
    E.watch = root.appendChild(el('div', { id: 'lr-watch' }, `${svg('eye', 14)}<span></span>`));
    E.toast = root.appendChild(el('div', { id: 'lr-toast' }));
    const link = t.link && t.link.href ? `<a class="gh" href="${esc(t.link.href)}" target="_blank" rel="noopener" title="${esc(t.link.title || t.link.href)}" aria-label="${esc(t.link.title || t.link.href)}">${svg('gh', 16)}</a>` : '';
    E.chip = root.appendChild(el('div', { id: 'lr-chip' }, `<button type="button" data-k="menu" aria-label="${esc(t.menu)}">${svg('menu', 16)}<span class="lb">${esc(t.menu)}</span><span class="k hk">Tab</span></button>${link}`));
    // where the scans come from stays on the glass (Poly Haven asks for it of pages that read from its server)
    // — and, while they are still arriving (the walk starts on the generated place), how many have
    { const MS = LR.models || {}, due = () => (LR.mat.due || 0) + (MS.due || 0), got = () => (LR.mat.arrived || 0) + (MS.arrived || 0);
      if (LR.ASSETS && (LR.mat.scanned > 0 || due() > 0)) { E.credit = root.appendChild(el('a', { id: 'lr-credit', href: 'https://polyhaven.com', target: '_blank', rel: 'noopener' }, t.scans));
        const say = () => { E.credit.textContent = t.scans + (got() < due() ? ` · ${got()} / ${due()}` : ''); }; say(); LR.on('scan', say); } }
    E.legend = root.appendChild(el('div', { id: 'lr-legend' }));
    E.marks = root.appendChild(el('div', { id: 'lr-marks' }));
    E.prompt = root.appendChild(el('div', { id: 'lr-prompt' }, '<span class="kk"></span><span class="ring"></span><div><b></b><small></small></div>'));
    E.num = root.appendChild(el('div', { id: 'lr-num' })); E.num.style.display = LR.q('stats') || LR.q('prof') ? '' : 'none';
    E.hint = root.appendChild(el('div', { id: 'lr-hint' }, LR.gpu.mobile ? t.hintTouch : t.hint));
    E.card = root.appendChild(el('div', { class: 'card' }, '<em></em><b></b><i></i><span></span>'));
    // the menu: every button says its key
    const mb = (k, key, label) => `<button type="button" data-k="${k}" aria-pressed="false"><span class="k hk">${key}</span><span>${esc(label)}</span><em></em></button>`;
    const hasBody = !!body();
    E.menu = root.appendChild(el('div', { id: 'lr-menu', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.menu }, `<div class="box"><header><b>${esc(t.menu)}</b><span><span class="k hk">Tab</span> <span class="k hk">Esc</span><button type="button" class="x" data-k="menu">${esc(t.close)}</button></span></header><div class="cols">
      <div><h4>${esc(t.time)}</h4>${mb('dawn', '1', t.dawn)}${mb('day', '2', t.day)}${mb('dusk', '3', t.dusk)}${mb('night', '4', t.night)}${mb('auto', 'T', t.auto)}</div>
      <div><h4>${esc(t.weather)}</h4>${mb('clear', '5', t.clear)}${mb('rain', '6', t.rain)}${mb('snow', '7', t.snow)}${mb('mist', '8', t.mist)}</div>
      <div><h4>${esc(t.camera)}</h4>${hasBody ? mb('cam', 'V', t.cam) + mb('zin', '+', t.zin) + mb('zout', '−', t.zout) : ''}${mb('torch', 'B', t.torch)}${mb('scout', 'N', t.scout)}${mb('lens', 'L', t.lens)}${mb('walk', 'C', t.walk)}</div>
      <div><h4>${esc(t.system)}</h4>${mb('gear', 'G', t.quality)}${mb('sound', 'M', t.sound)}${mb('full', 'F', t.full)}${mb('stats', 'P', t.stats)}${mb('hide', 'H', t.hide)}</div></div>
      <div class="ctl"><h4>${esc(t.controls)}</h4><table><tr><th>${esc(t.keyboard)}</th><th></th><th>${esc(t.gamepad)}</th></tr>${t.help.map((r) => `<tr><td><span class="k">${esc(r[0])}</span></td><td>${esc(r[1])}</td><td>${r[2] ? `<span class="k">${esc(r[2])}</span>` : ''}</td></tr>`).join('')}</table></div></div>`));
    E.scout = root.appendChild(el('div', { id: 'lr-scout' }, '<span class="cn c1"></span><span class="cn c2"></span><span class="cn c3"></span><span class="cn c4"></span><div class="tl"><div>SCOUT CAM v1.4</div><div class="un"></div></div><div class="tr"><div class="rec"><i></i>REC</div><div class="ts"></div><div class="ca"></div></div><div class="bl"><div class="bat"></div><div class="io"></div></div><div class="br"><div class="fv"></div><div class="flt"></div></div>'));
    E.stick = root.appendChild(el('div', { id: 'lr-stick' }, '<i></i>')); E.flash = root.appendChild(el('div', { id: 'lr-flash' }));
    const TOD = { dawn: 6.2, day: 13.0, dusk: 19.7, night: 23.2 };
    const menu = (on) => { H.menu = on === undefined ? !H.menu : on; E.menu.classList.toggle('on', H.menu); if (H.menu) { for (const k in P.keys) P.keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); sync(); const f = E.menu.querySelector('button'); if (f) f.focus({ preventScroll: true }); } else document.getElementById('view').focus(); };
    H.openMenu = menu;
    const act = (k) => {
      if (TOD[k] !== undefined) wx.set({ tod: TOD[k], manual: true });
      else if (k === 'cam') { P.stopTour(); P.setView(); } else if (k === 'zin') P.zoomBy(0.75); else if (k === 'zout') P.zoomBy(1 / 0.75); else if (k === 'torch') { P.torch = !P.torch; LR.emit('torch', P.torch); }
      else if (k === 'clear' || k === 'rain' || k === 'snow' || k === 'mist') wx.set({ weather: k, manual: true });
      else if (k === 'auto') wx.set({ auto: !wx.auto });
      else if (k === 'walk') { if (P.touring) P.stopTour(); else P.startTour(); }
      else if (k === 'gear') { const order = ['auto', 'low', 'medium', 'high', 'ultra'], cur = LR.gpu.auto ? 'auto' : LR.gpu.tierName, nx = order[(order.indexOf(cur) + 1) % order.length]; H.reload(nx === 'auto' ? null : nx); }
      else if (k === 'sound') { if (LR.audio) { if (!LR.audio.ready) { LR.audio.init(); LR.audio.mute(false); } else LR.audio.mute(!LR.audio.muted); } }
      else if (k === 'lens') { const z = LR.render.lens; if (!z.on) H.hint(t.lensNone, 4); else { z.walk = z.walk ? 0 : 1; H.hint(z.walk ? t.lensOn : t.lensOff, 4); } }
      else if (k === 'scout') { P.scout = !P.scout; LR.emit('scout', P.scout); }
      else if (k === 'stats') E.num.style.display = E.num.style.display === 'none' ? '' : 'none';
      else if (k === 'hide') { H.show = !H.show; root.classList.toggle('off', !H.show); if (!H.show) menu(false); }
      else if (k === 'menu' || k === 'keys') menu();
      else if (k === 'full') { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {}); }
      sync();
    };
    H.act = act;
    E.prompt.addEventListener('click', () => { if (!E.prompt.classList.contains('wait')) P.useKey = true; });      /* on a touch screen the prompt is the button */
    root.addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) { act(b.dataset.k); if (b.dataset.k !== 'menu' && !H.menu) document.getElementById('view').focus(); return; } if (e.target === E.menu) menu(false); });
    const KEY = { Digit1: 'dawn', Digit2: 'day', Digit3: 'dusk', Digit4: 'night', Digit5: 'clear', Digit6: 'rain', Digit7: 'snow', Digit8: 'mist', KeyT: 'auto', KeyC: 'walk', KeyL: 'lens', KeyG: 'gear', KeyM: 'sound', KeyF: 'full', KeyP: 'stats', KeyH: 'hide' };
    LR.on('key', (code, e) => { if (code === 'Tab' || code === 'PadStart' || code === 'Slash' || code === 'F1') { if (e && e.preventDefault) e.preventDefault(); menu(); } else if (code === 'Escape') { if (H.menu) menu(false); } else if (KEY[code]) act(KEY[code]); });
    const sync = () => { const q = (k) => E.menu.querySelector(`[data-k="${k}"]`), w = wx.want.weather, on = LR.audio && LR.audio.ready && !LR.audio.muted, set = (k, p, note) => { const b = q(k); if (!b) return; b.setAttribute('aria-pressed', !!p); if (note !== undefined) b.lastChild.textContent = note; };
      set('clear', w === 'clear' || w === 'winter' || w === 'autumn'); set('rain', w === 'rain'); set('snow', w === 'snow'); set('mist', w === 'mist'); set('auto', !!wx.auto, wx.auto ? t.on : t.off); set('walk', !!P.touring);
      const tod = wx.tod; set('dawn', !wx.auto && Math.abs(tod - TOD.dawn) < 0.6); set('day', !wx.auto && Math.abs(tod - TOD.day) < 0.6); set('dusk', !wx.auto && Math.abs(tod - TOD.dusk) < 0.6); set('night', !wx.auto && Math.abs(tod - TOD.night) < 0.6);
      set('cam', false, t.views[P.view] || P.view); set('torch', !!P.torch, P.torch ? t.on : t.off); set('scout', !!P.scout, P.scout ? t.on : t.off); set('lens', !!(LR.render.lens && LR.render.lens.walk), LR.render.lens && LR.render.lens.walk ? t.on : t.off);
      set('sound', !!on, on ? t.on : t.off); set('stats', E.num.style.display !== 'none'); set('gear', false, LR.gpu.auto ? t.tiers.auto + ' · ' + t.tiers[LR.gpu.tierName] : t.tiers[LR.gpu.tierName]); set('full', !!document.fullscreenElement); };
    H.sync = sync; wx.onChange(sync); LR.on('tour', sync); LR.on('view', sync); LR.on('torch', sync); LR.on('scout', sync);
    LR.on('tour', (on) => { if (!on) H.hint(t.taking, 4); });
    LR.on('stick', (s) => { E.stick.style.display = s.active ? 'block' : 'none'; if (s.active) { E.stick.style.left = s.ox + 'px'; E.stick.style.top = s.oy + 'px'; E.stick.firstChild.style.transform = `translate(${s.x * 40}px,${s.y * 40}px)`; } });
    // sound starts on the first gesture (browsers require one)
    const first = () => { if (LR.audio && !LR.audio.ready && !LR.off.has('audio') && LR.q('sound') !== '0') { LR.audio.init(); sync(); } window.removeEventListener('pointerdown', first); window.removeEventListener('keydown', first); };
    window.addEventListener('pointerdown', first); window.addEventListener('keydown', first);
    sync(); setTimeout(() => H.hint(null, 9), 1200);
  };
  let hintT = 0; H.hint = (text, sec = 5) => { const e = H.els.hint; if (!e) return; if (text) e.textContent = text; e.classList.add('on'); clearTimeout(hintT); hintT = setTimeout(() => e.classList.remove('on'), sec * 1000); };
  let cardT = 0; H.card = (title, sub, kicker) => { const e = H.els.card; if (!e) return; e.children[0].textContent = kicker || ''; e.children[1].textContent = title; e.children[3].textContent = sub || ''; e.classList.add('on'); clearTimeout(cardT); cardT = setTimeout(() => e.classList.remove('on'), 4600); };
  let toastT = 0; H.toast = (text, sec = 3) => { const e = H.els.toast; if (!e) return; e.textContent = text; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), sec * 1000); };

  // ── the glass, every frame: the walker's machine, the compass, who is watching, the prompt and markers, the legend ──
  const bearing = (P, x, z) => LR.wrapPi(Math.atan2(x - P.x, -(z - P.z)) - P.yaw);      // 0 ahead, + to the right (P.yaw: 0 faces −z)
  let pv = null; const proj = (x, y, z) => { const c = LR.cam; if (!c) return null; const v = (pv = pv || new THREE.Vector3()).set(x, y, z).project(c); if (v.z > 1 || v.z < -1) return null; return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; };
  let legendKey = '', promptKey = '', seenAt = new Map(), discovered = new Set(), markPool = [];
  const meta0 = typeof REALM_META !== 'undefined' ? REALM_META : {};
  H.frame = (time, dt) => {
    const E = H.els, P = LR.player, t = H.t; if (!E.unit || !H.show) return;
    const M = LR.mech, units = (M && M.units) || [], av = units.find((u) => u.avatar);
    { const touch = LR.gpu.mobile || P.input === 'touch'; if (touch !== H.touch) { H.touch = touch; document.getElementById('hud').classList.toggle('touch', touch); promptKey = legendKey = ''; } }
    // the walker's machine: its name, the camera it is seen by, a power line with a cell gone dark — and when its fault
    // crackles (lib/63_glow's arcs), the line flickers blue with it
    E.unit.classList.toggle('nobody', !av);
    if (av) { E.unit.querySelector('.nm span').textContent = av.name; E.unit.querySelector('.nm i').textContent = t.views[P.view] || P.view;
      const arc = LR.vfx && LR.vfx.arcAt ? LR.vfx.arcAt(time) : null, live = arc && time - arc.t0 < arc.dur, fl = live && (Math.floor(time * 30) % 3 !== 0);
      E.segs.forEach((s, i) => { s.className = i >= E.segs.length - 2 ? 'dead' : live && ((i * 7 + Math.floor(time * 24)) % 5 === 0) ? 'zap' : fl && i >= E.segs.length - 4 ? 'dead' : ''; });
      E.flt.classList.toggle('on', !!live); }
    // the scout's camera: its frame, REC, the clock, the unit, its battery, the lens; the fault shows in blue
    { const on = (P.scoutK || 0) > 0.5; E.scout.classList.toggle('on', on); document.getElementById('hud').classList.toggle('scouting', on);
      if (on) { const c = LR.wx.clock(), arc = LR.vfx && LR.vfx.arcAt ? LR.vfx.arcAt(time) : null, live = arc && time - arc.t0 < arc.dur, q = (s) => E.scout.querySelector(s);
        q('.rec').classList.toggle('off', Math.floor(time * 1.6) % 2 === 1); q('.ts').textContent = 'DAY 01  ' + c.text + ':' + String(Math.floor((time * 7) % 60)).padStart(2, '0');
        q('.ca').textContent = 'CAM 01 / ' + String((meta0.title || '').toUpperCase()); q('.un').textContent = 'UNIT ' + (av ? av.name.toUpperCase() : '—') + ' · 0417';
        q('.bat').innerHTML = '<span class="bars">' + [0, 1, 2, 3, 4].map((i) => `<b class="${i > (live ? 1 : 2) ? 'o' : ''}"></b>`).join('') + '</span> ' + (live ? '31%' : '58%'); q('.io').textContent = 'ISO ' + (LR.wx.lampsOn > 0.5 ? 3200 : 400) + '  1/48';
        q('.fv').textContent = 'FOV ' + Math.round(LR.cam ? (2 * Math.atan(Math.tan((LR.cam.fov * Math.PI) / 360) * (innerWidth / innerHeight)) * 180) / Math.PI : 100) + '°'; q('.flt').textContent = live ? '⚡ SIGNAL FAULT' : ''; } }
    // the compass: north, the quarters, the giants near (red while one is looking at the walker), the named places, things to use
    { const cv = E.cv, w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1); if (w > 0) { if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); const fov = Math.PI * 0.9, X = (a) => w / 2 + (a / (fov / 2)) * (w / 2), cy = 13;
      const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.15, 'rgba(0,0,0,.35)'); grad.addColorStop(0.85, 'rgba(0,0,0,.35)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grad; g.fillRect(0, 4, w, 18);
      g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 3;
      for (let d = 0; d < 360; d += 15) { const a = LR.wrapPi((d * Math.PI) / 180 - P.yaw); if (Math.abs(a) > fov / 2) continue; const x = X(a), fade = 1 - Math.pow(Math.abs(a) / (fov / 2), 3);
        g.globalAlpha = fade; const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W', 45: 'NE', 135: 'SE', 225: 'SW', 315: 'NW' }[d];
        if (lab) { g.fillStyle = d === 0 ? '#f0b552' : '#f1ede4'; g.font = lab.length === 1 ? '700 12px system-ui,sans-serif' : '600 9.5px system-ui,sans-serif'; g.fillText(lab, x, cy); } else { g.fillStyle = 'rgba(241,237,228,.55)'; g.fillRect(x - 0.5, cy - 3, 1, 6); } }
      g.globalAlpha = 1; g.fillStyle = '#f1ede4'; g.beginPath(); g.moveTo(w / 2, 24); g.lineTo(w / 2 - 4, 29); g.lineTo(w / 2 + 4, 29); g.fill();
      const pip = (a, col, kind, alpha = 1) => { if (Math.abs(a) > fov / 2) a = Math.sign(a) * fov / 2; const x = X(a); g.globalAlpha = alpha; g.fillStyle = col; g.beginPath();
        if (kind === 'giant') { g.moveTo(x, 26); g.lineTo(x - 5, 35); g.lineTo(x + 5, 35); } else { g.moveTo(x, 26); g.lineTo(x + 4, 30.5); g.lineTo(x, 35); g.lineTo(x - 4, 30.5); } g.closePath(); g.fill(); g.globalAlpha = 1; };
      for (const pl of LR.world.places || []) { const d = Math.hypot(pl.x - P.x, pl.z - P.z); if (d < 260 && d > pl.r) pip(bearing(P, pl.x, pl.z), 'rgba(241,237,228,.55)', 'place', LR.clamp(1.4 - d / 260, 0.3, 1)); }
      for (const u of units) { if (u.avatar || u.fly || !u.pose || !u.pose.W || !u.pose.W.body) continue; const B = u.pose.W.body.p, d = Math.hypot(B[0] - P.x, B[2] - P.z); if (d > 320) continue;
        const A = u.aware || {}, hot = (A.w || 0) > 0.3; pip(bearing(P, B[0], B[2]), hot ? '#ff5b49' : '#f0b552', 'giant', LR.clamp(1.25 - d / 320, 0.35, 1)); }
      for (const it of H.its || []) if (it.at) pip(bearing(P, it.at[0], it.at[2]), '#ffd27a', 'place'); } }
    // who is watching: the giant whose eyes are on the walker now; the moment one first finds it, a line says so
    { let top = null, tw = 0.3; for (const u of units) { const A = u.aware; if (!A || u.avatar) continue; if ((A.w || 0) > tw) { tw = A.w; top = u; }
        if ((A.n || 0) > 0.85 && !(seenAt.get(u) > time - 12)) { seenAt.set(u, time); H.toast(`${u.name} ${t.noticed}`, 3.2); E.watch.classList.remove('seen'); void E.watch.offsetWidth; E.watch.classList.add('seen'); } }
      E.watch.classList.toggle('on', !!top); if (top) E.watch.lastChild.textContent = `${top.name} ${t.watching}`; }
    // things to use: the nearest ready one gets the prompt; any within sight gets a marker
    const its = []; for (const o of LR.interact.list) { const r = o.poll && o.poll(P); if (!r) continue; r.d = r.at ? Math.hypot(r.at[0] - P.x, r.at[2] - P.z) : 0; its.push(r); } H.its = its;
    let pr = null; for (const r of its) { const near = !r.at || r.d < (r.range || 3); if (r.state === 'ready' && near && (!pr || r.d < pr.d)) pr = r; } if (!pr) for (const r of its) if (r.state === 'wait' && (!r.at || r.d < (r.range || 3) * 4) && (!pr || r.d < pr.d)) pr = r;
    { const key = pr ? pr.state + '|' + pr.label + '|' + (pr.sub || '') + '|' + P.input : ''; if (key !== promptKey) { promptKey = key; E.prompt.classList.toggle('on', !!pr); if (pr) { E.prompt.classList.toggle('wait', pr.state !== 'ready'); E.prompt.querySelector('.kk').innerHTML = P.input === 'touch' || LR.gpu.mobile ? `<span class="k">${esc(t.tap)}</span>` : cap('R'); E.prompt.querySelector('b').textContent = pr.label; E.prompt.querySelector('small').textContent = pr.sub || ''; } } }
    { let n = 0; for (const r of its) { if (!r.at || r.d > (r.see || 60) || (r === pr && r.d < (r.range || 3))) continue; const s = proj(r.at[0], r.at[1], r.at[2]); if (!s || s[0] < 0 || s[0] > innerWidth || s[1] < 0 || s[1] > innerHeight) continue;
        let m = markPool[n]; if (!m) { m = markPool[n] = E.marks.appendChild(el('div', { class: 'm' }, '<span></span><em></em><i></i>')); } m.style.display = ''; m.style.left = s[0] + 'px'; m.style.top = s[1] + 'px'; m.classList.toggle('ready', r.state === 'ready');
        m.children[0].textContent = r.mark || r.label; m.children[1].textContent = Math.round(r.d) + ' m'; n++; }
      for (let i = n; i < markPool.length; i++) markPool[i].style.display = 'none'; }
    // the legend: what the buttons do now
    { const key = P.input + '|' + (pr && pr.state === 'ready' ? pr.label : '') + '|' + !!av; if (key !== legendKey) { legendKey = key; const L = t.legend, row = (ks, label, cls = '') => `<div class="${cls}"><span class="ks">${ks}</span>${esc(label)}</div>`;
        E.legend.innerHTML = (pr && pr.state === 'ready' ? row(cap('R'), pr.label, 'use') : '') + row(cap('WASD'), L.move) + row(cap('Shift'), L.run) + row(cap('Space'), L.hop) + (av ? row(cap('V'), L.view) : '') + (P.input === 'pad' ? '' : row(cap('B'), L.lamp)) + row(cap('Tab'), L.menu); } }
  };
  // reload keeping where we stand, the hour and the weather
  H.reload = (tier) => { const p = LR.player, u = new URL(location.href); if (tier) u.searchParams.set('q', tier); else u.searchParams.delete('q'); u.searchParams.delete('safe');      /* choosing a quality by hand leaves safe mode */ if (LR.ASSETS && LR.q('scan') !== '0') u.searchParams.set('go', '1');      /* the start was pressed once: a reload — another quality, or the step down a slow device is given — does not ask again (in a frame or on a phone it came back to the start button, mid-walk) */ u.searchParams.set('at', [p.x.toFixed(1), p.z.toFixed(1), ((p.yaw * 180) / Math.PI).toFixed(0)].join(',')); u.searchParams.set('tod', LR.wx.tod.toFixed(2)); u.searchParams.set('wx', LR.wx.want.weather); if (!p.touring) u.searchParams.set('tour', '0'); location.href = u.toString(); };

  // ── every frame: the clock line, place cards, numbers, and the resolution governor ───────────────────────────────
  let acc = 0, n = 0, lastPlace = null, slowFor = 0, okFor = 0, wait = 3, capScale = 1, sec = 0;
  LR.on('after', (time, dt) => {
    const E = H.els, R = LR.render, G = LR.gpu, wx = LR.wx, p = LR.player; acc += dt; n++; sec += dt;
    if (acc >= 0.5) {
      const fps = n / acc; H.fps = fps; acc = 0; n = 0;
      if (E.unit) { const c = wx.clock(), tl = H.t.wx[wx.label()] || wx.label(); E.unit.querySelector('.loc span').textContent = c.text + ' · ' + tl; }
      if (E.num && E.num.style.display !== 'none') E.num.textContent = `${fps.toFixed(0)} fps\n${R.w}×${R.h} (${R.scale.toFixed(2)}×)\n${G.tierName}${G.auto ? ' · auto' : ''}\n${R.info.allCalls} calls · ${(R.info.tris / 1e6).toFixed(2)} M tris\n${R.info.lights || 0} lights${R.info.scans && R.info.scans.inst ? `\nscans ${R.info.scans.inst} × ${(R.info.scans.tris / 1e6).toFixed(2)} M` : ''}${R.prof && R.prof.on ? R.prof.text() : ''}`;
      // governor: hold the display's rate by trading internal resolution; probe upward when there is room
      if (LR.q('scale') === null || LR.q('scale') === undefined) {
        const target = Math.min(H.refresh || 60, LR.qn('fps', G.mobile ? 30 : 60)), lo = G.tier.scaleMin, hi = Math.min(G.tier.scaleMax, capScale);      // a phone holds thirty and spends the rest on pixels: a soft picture at sixty reads as out of focus (?fps=60 asks for sixty)
        if (sec > 2.5) {
          if (fps < target * 0.86) { slowFor += 0.5; okFor = 0; } else if (fps > target * 0.95) { okFor += 0.5; slowFor = 0; } else { slowFor = 0; okFor = 0; }
          if (slowFor >= 1 && R.scale > lo + 0.01) { if (H.probing) { capScale = Math.max(lo, R.scale - 0.1); wait = Math.min(60, wait * 2); H.probing = false; } R.setScale(Math.max(lo, R.scale - (fps < target * 0.6 ? 0.2 : 0.1))); slowFor = 0; }
          else if (okFor >= wait && R.scale < hi - 0.01) { R.setScale(Math.min(hi, R.scale + 0.1)); okFor = 0; H.probing = true; }
          else if (okFor >= 2 && H.probing) { H.probing = false; }
          // a phone that holds full scale with frames to spare has pixels left on its screen: its canvas goes from two a CSS
          // pixel to two and a half, once.  The scale steps down so the same pixels are drawn at first; the governor goes on from there
          if (G.mobile && !G.dprUp && LR.fit && (window.devicePixelRatio || 1) > 2.2 && !LR.q('dpr') && R.scale >= G.tier.scaleMax - 0.01 && fps > target * 1.5) { H.spare = (H.spare || 0) + 0.5; if (H.spare >= 6) { G.dprUp = 1.25; R.scale = R.scale / 1.25; LR.fit(); okFor = 0; } } else H.spare = 0;
          // a device far below the tier it was given: step the whole tier down once
          if (G.auto && R.scale <= lo + 0.01 && fps < 22) { H.slowTier = (H.slowTier || 0) + 0.5; if (H.slowTier > 5 && G.tierName !== 'low' && !LR.q('stepped')) { const order = ['low', 'medium', 'high', 'ultra'], nx = order[Math.max(0, order.indexOf(G.tierName) - 1)]; const u = new URL(location.href); u.searchParams.set('stepped', '1'); history.replaceState(null, '', u); H.reload(nx); } } else H.slowTier = 0;
        }
      }
    }
    // the display's own rate, from the fastest frames seen
    if (dt > 0.001) { H.minDt = Math.min(H.minDt || 1, dt); if (sec > 1.5 && !H.refresh) H.refresh = H.minDt < 0.0075 ? 144 : H.minDt < 0.0095 ? 120 : H.minDt < 0.0125 ? 90 : 60; }
    // named places
    let here = null; for (const pl of LR.world.places) if (Math.hypot(p.x - pl.x, p.z - pl.z) < pl.r) { here = pl; break; }
    if (here !== lastPlace) { if (here && sec > 3) { H.card(here.name, here.sub, discovered.has(here) ? '' : H.t.discovered); discovered.add(here); } lastPlace = here; }
    if (!H.menu) H.frame(time, dt);
    if (E.flash) E.flash.style.opacity = Math.min(0.5, wx.flash * 0.35);
    if (LR.audio && LR.audio.ready) LR.audio.update(dt, { x: p.x, y: p.y + p.eye, z: p.z, yaw: p.yaw, speed: p.speed, moving: p.moving, running: p.running, surface: p.surface, sheltered: 0 });
  });
  LR.on('init', () => H.init(), 90);
}
