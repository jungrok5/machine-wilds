// machine-wilds · 80_player — walking.  Keyboard (W A S D / arrows, Q E or ← → to turn, Shift to run, Space to hop),
// mouse (click to look freely, or drag), touch (left thumb moves, right thumb looks), a gamepad (left stick walks,
// right stick looks, a trigger or a pressed stick runs, A hops; on a phone a tap of the looking thumb hops).  The walker stands
// on the land, on bridges and piers, on the frozen pond; cannot pass walls, trunks, fences or deep water — but a parapet or a
// barrier with a top ({ y0, y1 } on its solid) is hopped onto and stepped off, and whoever steps off a deck falls and lands.  Until the first input
// the eye strolls a tour on its own.  R (a pad's X) is "use": a realm's hooks (P.hooks) read P.use.  Whoever stands on something that moves
// (P.ride: a machine's lift, its deck) is carried by it: { unit, frame() → the platform's frame { x, y, z, p } this frame, local: [x, y, z]
// where on it, clamp(x, z) → [x, z] (where on it one may walk), update(P, F) (the realm's: getting off, moving on) }.
{
  const T = THREE;
  const P = (LR.player = { input: 'keys', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, vy: 0, air: false, eye: 1.68, radius: 0.34, walk: 2.5, run: 5.8, hop: 5.0, mantle: 0.4, view: 'first', zoom: { first: 1, third: 4.4, top: 13 }, torch: !LR.RENDER || LR.q('torch') === '1', scout: LR.q('scout') === '1', prep: 0, bob: 0, speed: 0, moving: false, running: false, surface: 'grass', touring: false, tourS: 0, idle: 0, keys: {}, look: { dx: 0, dy: 0 }, stick: { x: 0, y: 0, active: false }, pad: { x: 0, y: 0, run: false, hop: false }, locked: false, enabled: true });
  const W = LR.world; P.hooks = []; P.ride = null;
  // ── wings (48_mech_wings): a double tap of Space (a pad's A twice, two taps of the looking thumb) opens them and the walker
  // flies; again closes them and it falls.  Flying: it glides, losing height slowly; Space held beats the wings and climbs, on
  // what charge they have (it comes back gliding, and fast in a storm near the sky machine: LR.wingCharge); W dives, S flares,
  // Shift tucks into a stoop; A D (or the look) bank it round.  It lands where the ground or a deck meets it (LR.pads: a
  // platform that can be landed on — { frame(), rect: [x0, x1, z0, z1], y, board(local) }) ──
  P.flying = false; P.wings = { open: false, tw: 99, amp: 0, ph: 0, bank: 0, brake: 0, tuck: 0, speed: 0, gust: 0, t: 0, fly: false }; P.energy = 1; P.fs = 0; LR.pads = LR.pads || [];
  P.openWings = (o = {}) => { if (P.flying) return; const w = P.wings; w.open = true; w.tw = 0; w.fly = true; P.flying = true; P.ride = null; P.hopT = undefined; P.prep = 0;
    const sp = Math.hypot(P.vx, P.vz); P.fs = Math.max(o.speed === undefined ? 4.5 : o.speed, sp); if (!P.air) { P.vy = o.lift === undefined ? 6.2 : o.lift; } P.air = true;
    if (P.view === 'first' && o.keepView !== true) { P.viewBeforeFly = 'first'; P.setView('third'); } LR.emit('wings', { open: true, x: P.x, y: P.y, z: P.z }); };
  P.closeWings = () => { if (!P.flying) return; const w = P.wings; w.open = false; w.tw = 0; w.fly = false; P.flying = false; const f = [Math.sin(P.yaw), -Math.cos(P.yaw)]; P.vx = f[0] * P.fs; P.vz = f[1] * P.fs; LR.emit('wings', { open: false, x: P.x, y: P.y, z: P.z }); };
  const land = (hard) => { const w = P.wings; w.open = false; w.tw = 0; w.fly = false; P.flying = false; P.air = false; const f = [Math.sin(P.yaw), -Math.cos(P.yaw)], k = Math.min(P.fs, 3.5); P.vx = f[0] * k; P.vz = f[1] * k; P.vy = 0;
    if (hard) P.dipV = Math.min(3.2, 0.6 + P.fs * 0.08); if (P.viewBeforeFly) { P.setView(P.viewBeforeFly); P.viewBeforeFly = null; } LR.emit('landed', { speed: hard ? 7 : 3.5, surface: P.surfaceAt ? P.surfaceAt(P.x, P.z) : 'grass', wings: true }); };
  let spaceWas = false, lastTap = -9, tapN = 0;
  // the floor under a point: land, or a deck within a step of where we stand
  P.groundAt = (x, z, yNow) => {
    let y = LR.land.h(x, z), surf = null;
    for (const f of W.floors) { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; if (Math.abs(lx) <= f.hx && Math.abs(lz) <= f.hz) { const fy = f.h(lx, lz); if (fy > y && (yNow === undefined || fy - yNow < 0.75)) { y = fy; surf = f.surface || 'stone'; } } }
    // a solid that has a top (a parapet, a barrier: { y0, y1 }) can be stood on by whoever has got that high — a hop is enough for
    // anything up to about a metre: over it, its top is the floor
    if (yNow !== undefined) for (const s of W.solids) { if (s.y1 === undefined || s.y1 <= y || s.y1 - yNow > P.mantle) continue; const dx = x - s.x, dz = z - s.z; if (s.r !== undefined ? Math.hypot(dx, dz) < s.r : Math.abs(dx * s.c - dz * s.s) < s.hx && Math.abs(dx * s.s + dz * s.c) < s.hz) { y = s.y1; surf = s.surface || 'stone'; } }
    const wl = LR.water ? LR.water.levelAt(x, z) : -1e9, depth = wl - y;
    const ice = LR.wx.season > 0.86 && depth > 0.02;
    if (ice) { y = wl; surf = 'snow'; }
    return { y, surf, depth: ice ? 0 : depth };
  };
  const collide = (x, z, r) => {
    for (let it = 0; it < 3; it++) { let hit = false;
      for (const s of W.solids) {
        if (s.y0 !== undefined && (P.y + 1.2 < s.y0 || P.y + P.mantle > s.y1)) continue;      // a solid with a height (a parapet on a deck) stops only who is at that height — and not who has hopped level with its top
        if (s.r !== undefined) { const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), m = s.r + r; if (d < m) { if (d < 1e-5) { x += m; } else { x = s.x + (dx / d) * m; z = s.z + (dz / d) * m; } hit = true; } }
        else { const dx = x - s.x, dz = z - s.z, lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c, ex = s.hx + r, ez = s.hz + r; if (Math.abs(lx) < ex && Math.abs(lz) < ez) { const px = ex - Math.abs(lx), pz = ez - Math.abs(lz); let nlx = lx, nlz = lz; if (px < pz) nlx = Math.sign(lx || 1) * ex; else nlz = Math.sign(lz || 1) * ez; x = s.x + nlx * s.c + nlz * s.s; z = s.z - nlx * s.s + nlz * s.c; hit = true; } }
      }
      if (!hit) break; }
    return [x, z];
  };
  P.collide = collide;
  P.place = (x, z, yawDeg = 0) => { P.x = x; P.z = z; P.yaw = (yawDeg * Math.PI) / 180; P.pitch = 0; P.y = P.groundAt(x, z).y; P.vx = P.vz = P.vy = 0; };
  // ── the tour: a smooth closed walk through way-points [{ x, z, look:[x,z] }] ────────────────────────────────────
  P.setTour = (pts) => { if (!pts || pts.length < 3) { P.tour = null; return; } const n = pts.length, seg = [], len = [0]; const cr = (a, b, c, d, t) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    const at = (u) => { const i = Math.floor(u), t = u - i, p = (k) => pts[((i + k) % n + n) % n]; return [cr(p(-1).x, p(0).x, p(1).x, p(2).x, t), cr(p(-1).z, p(0).z, p(1).z, p(2).z, t)]; };
    const N = n * 24; let prev = at(0), total = 0; const tab = [[0, 0]]; for (let i = 1; i <= N; i++) { const q = at((i / N) * n); total += Math.hypot(q[0] - prev[0], q[1] - prev[1]); tab.push([total, (i / N) * n]); prev = q; }
    P.tour = { at, tab, total, pts }; };
  const tourU = (s) => { const t = P.tour.tab; s = ((s % P.tour.total) + P.tour.total) % P.tour.total; let lo = 0, hi = t.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m][0] <= s) lo = m; else hi = m; } const f = (s - t[lo][0]) / (t[hi][0] - t[lo][0] || 1); return t[lo][1] + (t[hi][1] - t[lo][1]) * f; };
  // where the tour stands and looks at s metres along it (undamped): for stills along the walk (render.mjs --tour)
  P.tourPose = (s) => { const u = tourU(s), q = P.tour.at(u), a = P.tour.at(tourU(s + 7)), n = P.tour.pts.length, i = Math.floor(u) % n, wp = P.tour.pts[i], wn = P.tour.pts[(i + 1) % n], f = u - Math.floor(u);
    let tx = a[0], tz = a[1]; const la = wp.look, lb = wn.look || la; if (la) { const k = wp.pull === undefined ? 0.55 : wp.pull; tx = LR.lerp(tx, la[0] + (lb[0] - la[0]) * f, k); tz = LR.lerp(tz, la[1] + (lb[1] - la[1]) * f, k); }
    return { s, cam: [q[0], q[1], (Math.atan2(tx - q[0], -(tz - q[1])) * 180) / Math.PI, (((wp.pitch || 0) + 0.03) * 180) / Math.PI] }; };
  P.startTour = () => { if (!P.tour) return; P.touring = true; // join the tour at its nearest point
    let best = 0, bd = 1e9; for (let s = 0; s < P.tour.total; s += 2) { const q = P.tour.at(tourU(s)); const d = Math.hypot(q[0] - P.x, q[1] - P.z); if (d < bd) { bd = d; best = s; } } P.tourS = best; LR.emit('tour', true); };
  P.stopTour = () => { if (P.touring) { P.touring = false; LR.emit('tour', false); } };

  // ── input ───────────────────────────────────────────────────────────────────────────────────────────────────────
  // ── the eye: inside the head (first), behind and above (third), or high over it looking down (top) — and how near ──
  // V (the HUD's camera button, a pad's Y) goes round them; the wheel, + and −, a pinch or a pad's ↑ ↓ zoom: in first person the
  // lens, otherwise the distance.  B puts the body's lamp on and off.
  const VIEWS = ['first', 'third', 'top'], ZR = { first: [1, 4], third: [1.8, 14], top: [7, 70] };
  const hasBody = () => !!(LR.mech && LR.mech.units && LR.mech.units.some((u) => u.avatar));      // (a realm without a body for the walker has only the first)
  P.setView = (v) => { P.view = !hasBody() ? 'first' : VIEWS.includes(v) ? v : VIEWS[(VIEWS.indexOf(P.view) + 1) % 3]; P.boom = undefined; LR.emit('view', P.view); return P.view; };
  P.zoomBy = (k) => { const r = ZR[P.view], z = P.zoom; z[P.view] = LR.clamp(z[P.view] * (P.view === 'first' ? 1 / k : k), r[0], r[1]); LR.emit('zoom', P.view, z[P.view]); };
  P.bind = (canvas) => {
    const K = P.keys, move = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'Space']);
    window.addEventListener('keydown', (e) => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; P.input = 'keys'; if (LR.hud && LR.hud.menu) { if (!e.repeat) LR.emit('key', e.code, e); return; }      /* the menu is open: its keys, not the walk */ const was = K[e.code]; K[e.code] = true; if (move.has(e.code)) { e.preventDefault(); P.stopTour(); } if (!was && !e.ctrlKey && !e.metaKey) { if (e.code === 'KeyR') P.useKey = true; else if (e.code === 'KeyV') P.setView(); else if (e.code === 'KeyB') { P.torch = !P.torch; LR.emit('torch', P.torch); } else if (e.code === 'KeyN') { P.scout = !P.scout; LR.emit('scout', P.scout); } else if (e.code === 'Equal' || e.code === 'NumpadAdd') P.zoomBy(0.8); else if (e.code === 'Minus' || e.code === 'NumpadSubtract') P.zoomBy(1.25); } LR.emit('key', e.code, e); });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); P.zoomBy(Math.exp(LR.clamp(e.deltaY, -240, 240) * 0.0016)); }, { passive: false });
    window.addEventListener('keyup', (e) => { K[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in K) K[k] = false; });
    // mouse: click captures the pointer where the browser allows it; otherwise drag
    let drag = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => { if (e.button !== 0) return; canvas.focus(); drag = true; lx = e.clientX; ly = e.clientY; if (canvas.requestPointerLock && !P.locked && !LR.q('nolock')) { try { const pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (err) { /* stays in drag mode */ } } });
    window.addEventListener('mouseup', () => { drag = false; });
    document.addEventListener('pointerlockchange', () => { P.locked = document.pointerLockElement === canvas; LR.emit('lock', P.locked); });
    window.addEventListener('mousemove', (e) => { if (P.locked) { P.look.dx += e.movementX; P.look.dy += e.movementY; P.stopTourLook(); } else if (drag) { P.look.dx += (e.clientX - lx) * 1.6; P.look.dy += (e.clientY - ly) * 1.6; lx = e.clientX; ly = e.clientY; P.stopTourLook(); } });
    // touch: the left half is a stick, the right half turns the head
    const touches = new Map();
    const tdown = (e) => { for (const t of e.changedTouches) { const left = t.clientX < window.innerWidth * 0.45; touches.set(t.identifier, { left, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: performance.now() }); if (left) { P.stick.active = true; P.stick.ox = t.clientX; P.stick.oy = t.clientY; P.stick.x = P.stick.y = 0; P.stopTour(); LR.emit('stick', P.stick); } } e.preventDefault(); };
    const tmove = (e) => { for (const t of e.changedTouches) { const s = touches.get(t.identifier); if (!s) continue; if (s.left) { const R = 56, dx = (t.clientX - s.x0) / R, dy = (t.clientY - s.y0) / R, l = Math.hypot(dx, dy); P.stick.x = l > 1 ? dx / l : dx; P.stick.y = l > 1 ? dy / l : dy; LR.emit('stick', P.stick); } else { const o = [...touches.values()].find((q) => q !== s && !q.left);      /* two fingers on the looking side: a pinch zooms */
        if (o) { const d0 = Math.hypot(s.x - o.x, s.y - o.y), d1 = Math.hypot(t.clientX - o.x, t.clientY - o.y); if (d0 > 8 && d1 > 8) P.zoomBy(d0 / d1); s.t0 = -1e9; o.t0 = -1e9; } else { P.look.dx += (t.clientX - s.x) * 2.4; P.look.dy += (t.clientY - s.y) * 2.4; P.stopTourLook(); } } s.x = t.clientX; s.y = t.clientY; } e.preventDefault(); };
    const tup = (e) => { for (const t of e.changedTouches) { const s = touches.get(t.identifier); if (s && s.left) { P.stick.active = false; P.stick.x = P.stick.y = 0; LR.emit('stick', P.stick); }
        else if (s && performance.now() - s.t0 < 260 && Math.hypot(t.clientX - s.x0, t.clientY - s.y0) < 14) { P.tapHop = true; P.stopTour(); }      /* a tap of the looking thumb is a hop */ touches.delete(t.identifier); } e.preventDefault(); };
    canvas.addEventListener('touchstart', (e) => { P.input = 'touch'; tdown(e); }, { passive: false }); canvas.addEventListener('touchmove', tmove, { passive: false }); canvas.addEventListener('touchend', tup, { passive: false }); canvas.addEventListener('touchcancel', tup, { passive: false });
  };
  // looking about during the tour only pauses its own head movement; walking input ends it
  P.stopTourLook = () => { P.lookHold = 4; };

  const tmp = new T.Vector3();
  P.update = (dt, cam) => {
    const K = P.keys;
    // head
    const sens = 0.0022; P.yaw += P.look.dx * sens; P.pitch = LR.clamp(P.pitch - P.look.dy * sens, -1.35, 1.35); P.look.dx = P.look.dy = 0;
    const turn = (K.ArrowRight || K.KeyE ? 1 : 0) - (K.ArrowLeft || K.KeyQ ? 1 : 0); P.yaw += turn * 1.9 * dt;
    if (K.PageUp) P.pitch = Math.min(1.3, P.pitch + dt); if (K.PageDown) P.pitch = Math.max(-1.3, P.pitch - dt);
    // a gamepad, if one is plugged in: read each frame (the browser has no events for sticks).  Left stick walks, right
    // stick looks, either trigger or a pressed left stick runs, the bottom face button hops.
    const pad = P.pad; pad.x = pad.y = 0; pad.run = pad.hop = false; pad.use = false;
    if (navigator.getGamepads) { const dz = (v) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
      for (const gp of navigator.getGamepads()) { if (!gp || !gp.connected || gp.axes.length < 2) continue;
        const ax = dz(gp.axes[0]), ay = dz(gp.axes[1]), rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0), b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
        if (ax || ay || rx || ry || gp.buttons.some((q) => q.pressed)) P.input = 'pad';      /* (the HUD shows a pad's buttons from then on) */
        if (b(9) && !pad.s9) LR.emit('key', 'PadStart'); pad.s9 = b(9);
        if (ax || ay) { pad.x += ax; pad.y += ay; P.stopTour(); }
        if (rx || ry) { P.yaw += rx * Math.abs(rx) * 2.6 * dt; P.pitch = LR.clamp(P.pitch - ry * Math.abs(ry) * 1.9 * dt, -1.35, 1.35); P.stopTourLook(); }
        if (b(6) || b(7) || b(10)) pad.run = true; if (b(0)) { pad.hop = true; P.stopTour(); } if (b(2)) pad.use = true;
        if (b(3) && !pad.y3) P.setView(); pad.y3 = b(3); if (b(12)) P.zoomBy(Math.exp(-1.2 * dt)); if (b(13)) P.zoomBy(Math.exp(1.2 * dt)); } }
    if (P.lookHold > 0) P.lookHold -= dt;
    // use: R pressed (or a pad's X, or a film's hand on KeyR) this frame
    const useNow = !!(K.KeyR || pad.use); P.use = !!P.useKey || (useNow && !P.useWas); P.useWas = useNow; P.useKey = false;
    P.rideDelta = null;
    // the double tap: two presses of Space (or the pad's A, or two taps of the looking thumb) within a third of a second
    { const now = performance.now() / 1000, down = !!(K.Space || P.pad.hop), tap = (down && !spaceWas) || P.tapHop; spaceWas = down;
      if (tap) { if (now - lastTap < 0.34) { tapN = 0; lastTap = -9; if (P.flying) P.closeWings(); else if (P.body || !LR.mech) P.openWings(); P.tapHop = false; } else lastTap = now; } }
    P.wings.tw += dt; P.wings.t += dt;
    if (P.flying) {
      const w = P.wings, Kd = (k) => !!K[k]; let fwd = (Kd('KeyW') || Kd('ArrowUp') ? 1 : 0) - (Kd('KeyS') || Kd('ArrowDown') ? 1 : 0), side = (Kd('KeyD') ? 1 : 0) - (Kd('KeyA') ? 1 : 0);
      if (P.stick.active) { fwd += -P.stick.y; side += P.stick.x; } fwd += -pad.y; side += pad.x; fwd = LR.clamp(fwd, -1, 1); side = LR.clamp(side, -1, 1);
      const flap = (K.Space || P.pad.hop || P.flapHold) && P.energy > 0.02 && w.tw > 0.45, tuck = !!(K.ShiftLeft || K.ShiftRight || pad.run) && !flap, brake = fwd < 0 ? -fwd : 0, dive = fwd > 0 ? fwd : 0;
      // the beat: always begins by lifting the wings (from the bottom of the arc), dies away over a beat when let go
      if (flap && w.amp < 0.05) w.ph = Math.PI; w.amp = LR.damp(w.amp, flap ? 1 : 0, flap ? 3.2 : 2.2, dt); if (w.amp > 0.002) w.ph += LR.TAU * 1.4 * dt;
      w.brake = LR.damp(w.brake, brake, 4, dt); w.tuck = LR.damp(w.tuck, Math.max(tuck ? 1 : 0, dive * 0.45), 4, dt);
      // the air: speed along the heading, a sink that grows away from the best glide, a beat that pushes and lifts, a dive
      // that trades height for speed and a flare that trades speed for a moment's height; below stalling speed it drops
      const yaw0 = P.flyYaw === undefined ? P.yaw : P.flyYaw; P.yaw += side * 1.25 * dt * (1 - 0.5 * w.brake); const yawRate = LR.wrapPi(P.yaw - yaw0) / Math.max(dt, 1e-4); P.flyYaw = P.yaw;
      let s2 = P.fs; s2 += (w.amp * 3.4 + dive * 4.5 + w.tuck * 6 - w.brake * 7 - 0.012 * s2 * s2 * (1 - 0.6 * w.tuck)) * dt + 0.35 * dt; s2 = LR.clamp(s2, 2.5, 28); P.fs = s2;
      const sink = 0.85 + 0.011 * (s2 - 10) * (s2 - 10) + (s2 < 5 ? (5 - s2) * 1.1 : 0), vyT = -sink - dive * 6 - w.tuck * 9 + w.amp * 3.6 + w.brake * Math.min(2.2, s2 * 0.2);
      P.vy = LR.damp(P.vy, vyT, 1.4, dt); P.energy = LR.clamp(P.energy + (flap ? -0.1 : 0.028 + (LR.wingCharge ? LR.wingCharge(P) : 0)) * dt, 0, 1);
      w.bank = LR.damp(w.bank, LR.clamp(yawRate * s2 / 9.81 * 0.85, -0.85, 0.85), 3, dt); w.speed = s2; w.gust = Math.sin(w.t * 0.63) * 0.5 + Math.sin(w.t * 1.71 + 1.3) * 0.3;
      const f = [Math.sin(P.yaw), -Math.cos(P.yaw)], wind = LR.wx && LR.wx.wind ? LR.wx.wind : [0, 0]; let nx = P.x + (f[0] * s2 + (wind[0] || 0) * 0.6) * dt, nz = P.z + (f[1] * s2 + (wind[1] || 0) * 0.6) * dt, ny = P.y + P.vy * dt;
      const g0 = P.groundAt(nx, nz, ny); if (ny - g0.y < 3) [nx, nz] = collide(nx, nz, P.radius * 1.6);
      const rr = Math.hypot(nx, nz), Rw = W.radius; if (rr > Rw) { nx *= Rw / rr; nz *= Rw / rr; P.yaw += 2.2 * dt; }
      P.x = nx; P.z = nz; P.y = Math.min(ny, 900); P.vx = f[0] * s2; P.vz = f[1] * s2; P.air = true; P.speed = s2; P.moving = true; P.running = false; P.idle = 0;
      // down: on a platform that can be landed on, or on the ground
      let landed = false; for (const pd of LR.pads) { const F = pd.frame && pd.frame(); if (!F) continue; const d = [P.x - F.p[0], P.y - F.p[1], P.z - F.p[2]], lx = d[0] * F.x[0] + d[1] * F.x[1] + d[2] * F.x[2], ly = d[0] * F.y[0] + d[1] * F.y[1] + d[2] * F.y[2], lz = d[0] * F.z[0] + d[1] * F.z[1] + d[2] * F.z[2];
        const [x0, x1, z0, z1] = pd.rect; if (lx > x0 && lx < x1 && lz > z0 && lz < z1 && ly - pd.y < 0.6 && ly - pd.y > -1.2 && P.vy < 0.5) { land(P.vy < -6); pd.board([lx, pd.y, lz]); landed = true; break; } }
      const g = P.groundAt(P.x, P.z, P.y); if (!landed && P.y <= g.y) { P.y = g.y; land(P.vy < -6.5 || s2 > 15); }
      P.surface = 'air';
    }
    else if (P.ride) {
      // carried: the platform moves us (its turn turns us too); our own steps are on it, inside what it lets us walk
      const R = P.ride, F = R.frame();
      if (!F) P.ride = null;
      else { const hd = Math.atan2(F.x[2], F.x[0]); if (R.hd !== undefined) P.yaw += LR.wrapPi(hd - R.hd); R.hd = hd;
        let fwd = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), side = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0); if (P.stick.active) { fwd += -P.stick.y; side += P.stick.x; } fwd += -pad.y; side += pad.x;
        const mag = Math.min(1, Math.hypot(fwd, side)), top = P.walk * (R.slow || 0.75), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw); P.running = false;
        let wx = 0, wz = 0; if (mag > 0.01) { const fx = (fwd / Math.max(mag, 1e-6)) * mag, sx = (side / Math.max(mag, 1e-6)) * mag; wx = (sy * fx + cy * sx) * top; wz = (-cy * fx + sy * sx) * top; }
        P.vx = LR.damp(P.vx, wx, 10, dt); P.vz = LR.damp(P.vz, wz, 10, dt);
        const ap = (v) => [F.p[0] + F.x[0] * v[0] + F.y[0] * v[1] + F.z[0] * v[2], F.p[1] + F.x[1] * v[0] + F.y[1] * v[1] + F.z[1] * v[2], F.p[2] + F.x[2] * v[0] + F.y[2] * v[1] + F.z[2] * v[2]];
        const was = ap(R.local); let lx = R.local[0] + (P.vx * F.x[0] + P.vz * F.x[2]) * dt, lz = R.local[2] + (P.vx * F.z[0] + P.vz * F.z[2]) * dt; if (R.clamp) [lx, lz] = R.clamp(lx, lz); R.local = [lx, R.local[1], lz];
        const at = ap(R.local); P.rideDelta = [was[0] - P.x, was[1] - P.y, was[2] - P.z]; P.x = at[0]; P.y = at[1]; P.z = at[2]; P.air = false; P.vy = 0; P.hopT = undefined; P.prep = 0;
        P.speed = Math.hypot(P.vx, P.vz); P.moving = P.speed > 0.25; P.surface = 'stone'; P.idle = P.moving || turn ? 0 : P.idle + dt; if (R.update) R.update(P, F); }
    }
    if (P.flying || P.ride || P.rideDelta) { /* flying or carried (above) */ }
    else if (P.touring && P.tour) {
      P.tourS += 1.55 * dt; const u = tourU(P.tourS), q = P.tour.at(u), a = P.tour.at(tourU(P.tourS + 7)), i = Math.floor(u) % P.tour.pts.length, wp = P.tour.pts[i], wn = P.tour.pts[(i + 1) % P.tour.pts.length], f = u - Math.floor(u);
      P.x = q[0]; P.z = q[1]; const g = P.groundAt(P.x, P.z, P.y); P.y = LR.damp(P.y, g.y, 8, dt);
      // look where we are going, drawn toward whatever this stretch of the walk is about
      let tx = a[0], tz = a[1]; const la = wp.look, lb = wn.look || la; if (la) { const lx = la[0] + ((lb ? lb[0] : la[0]) - la[0]) * f, lz = la[1] + ((lb ? lb[1] : la[1]) - la[1]) * f, k = wp.pull === undefined ? 0.55 : wp.pull; tx = LR.lerp(tx, lx, k); tz = LR.lerp(tz, lz, k); }
      if (!(P.lookHold > 0)) { const want = Math.atan2(tx - P.x, -(tz - P.z)); P.yaw += LR.wrapPi(want - P.yaw) * (1 - Math.exp(-dt * 1.1)); P.pitch = LR.damp(P.pitch, (wp.pitch || 0) + 0.03, 1.2, dt); }
      P.speed = 1.55; P.moving = true; P.running = false; P.surface = g.surf || P.surfaceAt(P.x, P.z, g);
    } else {
      // legs
      let fwd = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0), side = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
      if (P.stick.active) { fwd += -P.stick.y; side += P.stick.x; }
      fwd += -P.pad.y; side += P.pad.x;
      const mag = Math.min(1, Math.hypot(fwd, side)); P.running = !!(K.ShiftLeft || K.ShiftRight) || P.pad.run || (P.stick.active && Math.hypot(P.stick.x, P.stick.y) > 0.96);
      const g0 = P.groundAt(P.x, P.z, P.y), slow = g0.depth > 0.2 ? 0.55 : 1;
      const top = (P.running ? P.run : P.walk) * slow * (fwd < 0 ? 0.7 : 1), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      let wx = 0, wz = 0; if (mag > 0.01) { const fx = fwd / Math.max(mag, 1e-6) * mag, sx = side / Math.max(mag, 1e-6) * mag; wx = (sy * fx + cy * sx) * top; wz = (-cy * fx + sy * sx) * top; }
      const acc = mag > 0.01 ? 10 : 12; P.vx = LR.damp(P.vx, wx, acc, dt); P.vz = LR.damp(P.vz, wz, acc, dt);
      let nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
      [nx, nz] = collide(nx, nz, P.radius);
      // stay out of deep water and inside the world
      let g1 = P.groundAt(nx, nz, P.y); if (g1.depth > 1.0 && g1.depth > g0.depth) { nx = P.x; nz = P.z; P.vx *= 0.3; P.vz *= 0.3; }
      // the land is not level: a climb slows the walker (a third slower at 20°, half at 30°), and a face steeper than about
      // 43° cannot be walked up — the step slides along it instead.  Going down is free.  Decks and stairs are not slopes.
      { const st = Math.hypot(nx - P.x, nz - P.z); if (st > 1e-5 && !g1.surf && !g0.surf && !P.air) { const grade = (g1.y - g0.y) / st;
          if (grade > 0.94) { const n = LR.land.normal(P.x, P.z, 0.7), hl = Math.hypot(n[0], n[2]) || 1, ux = -n[0] / hl, uz = -n[2] / hl, up = (nx - P.x) * ux + (nz - P.z) * uz; nx -= ux * up; nz -= uz * up; P.vx *= 0.6; P.vz *= 0.6; [nx, nz] = collide(nx, nz, P.radius); g1 = P.groundAt(nx, nz, P.y); if ((g1.y - g0.y) / Math.max(1e-5, Math.hypot(nx - P.x, nz - P.z)) > 0.94) { nx = P.x; nz = P.z; } P.steep = 1; }
          else { if (grade > 0.18) { const k = 1 / (1 + 1.9 * (grade - 0.18)); nx = P.x + (nx - P.x) * k; nz = P.z + (nz - P.z) * k; } P.steep = 0; } P.grade = grade; } }
      const rr = Math.hypot(nx, nz), R = W.radius; if (rr > R) { nx *= R / rr; nz *= R / rr; }
      P.x = nx; P.z = nz; const g = P.groundAt(P.x, P.z, P.y);
      // a hop: with a body (LR.mech's avatar) it gathers for a tenth of a second and then leaves; without one it is at once
      if ((K.Space || P.pad.hop || P.tapHop) && !P.air && P.hopT === undefined) { if (P.body) P.hopT = 0.1; else { P.vy = P.hop; P.air = true; } } P.tapHop = false;
      if (P.hopT !== undefined) { P.hopT -= dt; P.prep = 1 - Math.max(0, P.hopT) / 0.1; if (P.hopT < 0 || P.air) { if (!P.air) { P.vy = P.hop; P.air = true; } P.prep = 0; P.hopT = undefined; } }
      // a step down is a step; more than that is a fall — off a deck, off a parapet, off a bank — with the weight of one: the
      // knees give on landing by how fast the ground came (nobody is hurt here: there is nothing to lose but the view)
      if (!P.air && g.y < P.y - 0.6) { P.air = true; P.vy = Math.min(P.vy, 0); }
      if (P.air) { P.vy = Math.max(-42, P.vy - 13 * dt); P.y += P.vy * dt; if (P.y <= g.y) { const v = -P.vy; P.y = g.y; P.air = false; P.vy = 0; if (v > 4.6) { P.dipV = Math.min(3.2, (v - 3) * 0.28); P.vx *= 0.35; P.vz *= 0.35; LR.emit('landed', { speed: v, surface: g.depth > 0.12 ? 'water' : g.surf || P.surfaceAt(P.x, P.z, g) }); } } }
      else P.y = g.y > P.y ? LR.damp(P.y, g.y, 18, dt) : LR.damp(P.y, g.y, 12, dt);
      P.speed = Math.hypot(P.vx, P.vz); P.moving = P.speed > 0.25 && !P.air; P.surface = g.depth > 0.12 ? 'water' : g.surf || P.surfaceAt(P.x, P.z, g);
      P.idle = P.moving || turn ? 0 : P.idle + dt;
    }
    for (const h of P.hooks) h(dt, K);
    // the eye, with a little of the step in it
    P.bob += P.speed * dt * (P.running ? 0.95 : 1.25); const amp = P.moving ? (P.running ? 0.055 : 0.032) : 0;
    P.bobAmp = LR.damp(P.bobAmp || 0, amp, 8, dt);
    P.dip = Math.max(0, Math.min(0.75, (P.dip || 0) + (P.dipV || 0) * dt)); P.dipV = (P.dipV || 0) - (P.dip * 60 + (P.dipV || 0) * 9) * dt; if (P.dip <= 0 && P.dipV < 0) P.dipV = 0;      // the knees giving after a drop: down fast, up slower
    P.body = LR.mech && LR.mech.units ? LR.mech.units.find((u) => u.avatar && u.live) || null : null; if (P.view !== 'first' && !hasBody()) P.view = 'first';
    { if (!P.fovSet) P.fovBase = cam.fov; const zf = (P.view === 'first' ? P.zoom.first : 1) / (P.scout ? 1.32 : 1);      // the lens: only the first view zooms it; the others move the eye (the scout's camera is wide)
      if (zf !== 1) { const w = (2 * Math.atan(Math.tan((P.fovBase * Math.PI) / 360) / zf) * 180) / Math.PI; if (Math.abs(cam.fov - w) > 0.01) { cam.fov = w; cam.updateProjectionMatrix(); } P.fovSet = true; } else if (P.fovSet) { cam.fov = P.fovBase; cam.updateProjectionMatrix(); P.fovSet = false; } }
    if (P.view === 'first') { cam.position.set(P.x, P.y + P.eye - (P.dip || 0) + Math.sin(P.bob * LR.TAU) * P.bobAmp, P.z); cam.rotation.set(P.pitch, -P.yaw, Math.cos(P.bob * Math.PI) * P.bobAmp * 0.12); }
    else { // behind it, or over it: the eye rides a boom from a point above the body; the boom shortens where the ground is in its way
      P.flyK = LR.damp(P.flyK || 0, P.flying ? 1 : 0, 2.5, dt); const top = P.view === 'top', pitch = top ? -1.36 : LR.clamp(P.pitch - 0.14 - 0.06 * P.flyK, -1.25, 0.6), cp = Math.cos(pitch), sp2 = Math.sin(pitch), f = [Math.sin(P.yaw) * cp, sp2, -Math.cos(P.yaw) * cp], ty = P.y + (top ? 1.2 : 1.62), want = P.zoom[P.view] * (1 + 0.9 * (P.flyK || 0));
      let d = want; if (!top) for (let k = 1; k <= 10; k++) { const q = (want * k) / 10, x = P.x - f[0] * q, z = P.z - f[2] * q, y = ty - f[1] * q; if (y < P.groundAt(x, z, y + 0.5).y + 0.3) { d = Math.max(0.6, (want * (k - 1)) / 10); break; } }
      P.boom = P.boom === undefined ? d : d < P.boom ? d : LR.damp(P.boom, d, 4, dt); const b = P.boom, side = top ? 0 : 0.34 * LR.sm(1.2, 4, b), rx = Math.cos(P.yaw), rz = Math.sin(P.yaw);
      cam.position.set(P.x - f[0] * b + rx * side, ty - f[1] * b - (P.dip || 0) * 0.5, P.z - f[2] * b + rz * side); cam.rotation.set(pitch, -P.yaw, 0); }
    // the scout's camera (N · ?scout=1): a wide lens on the walker's machine, carried, not on a rig — it sways when standing,
    // shakes with the steps, and jolts when the fault crackles (lib/63_glow's arcs); the picture is bowed, grainy and torn
    // for a frame by the fault in the last pass (75_post: uScout), and the HUD frames it (88_hud)
    { const S = LR.render.U && LR.render.U.uScout; P.scoutK = LR.damp(P.scoutK || 0, P.scout ? 1 : 0, 6, dt); const k = P.scoutK, t = LR.wx.time || 0;
      const arc = LR.vfx && LR.vfx.arcAt ? LR.vfx.arcAt(t) : null, live = arc && t - arc.t0 < arc.dur ? 1 : 0, fault = live * (0.5 + 0.5 * Math.sin(t * 61) * Math.sin(t * 23));
      if (k > 0.001) { const a = (0.0028 + (P.moving ? (P.running ? 0.011 : 0.0055) : 0)) * k, n = (f, ph) => Math.sin(t * f + ph) + 0.5 * Math.sin(t * f * 2.31 + ph * 1.7) + 0.25 * Math.sin(t * f * 5.13 + ph * 2.9);
        cam.rotation.x += n(1.7, 0.3) * a + (P.moving ? Math.sin(P.bob * LR.TAU) * a * 0.8 : 0); cam.rotation.y += n(1.25, 2.1) * a; cam.rotation.z += n(0.9, 4.2) * a * 0.9;
        if (fault > 0) { const j = (q) => (Math.sin(Math.floor(t * 30) * 12.9898 + q) * 43758.5453) % 1; cam.rotation.x += j(1.3) * 0.012 * fault * k; cam.rotation.y += j(7.1) * 0.012 * fault * k; }      /* (a jolt from the clock: a film's frame is the same every time) */ }
      if (S) S.value.set(k, fault * k, 0, 0); }
  };
  P.surfaceAt = (x, z, g) => { const L = LR.land; if (LR.wx.snow > 0.55) return 'snow'; if (L.coverAt('paved', x, z) > 0.5) return 'stone'; if (L.coverAt('shore', x, z) > 0.5) return 'gravel'; if (L.coverAt('dirt', x, z) > 0.45) return 'dirt'; return 'grass'; };
  LR.on('input', (dt, cam) => { if (P.enabled) P.update(dt, cam); }, 10);
}
