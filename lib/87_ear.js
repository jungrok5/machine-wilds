// machine-wilds · 87_ear — what is heard, frame by frame, from where the camera is.  Every frame it reads the world as drawn
// (the machines' feet coming down, their moves and calls, their faults, the strikes, the bursts of steam and sparks, the
// walker's feet and wings) and turns what happened since the last frame into events, each placed at the moment its picture
// shows it — and names the loops that sound while something lasts (a flight, a winch, a giant near, the sky machine).
//   live:   the events go to lib/85_audio at once (LR.audio.hear), the camera is the listener
//   a film: scripts step the shots; LR.ear.record() … LR.ear.after(filmTime, rate, keep) after each frame … LR.ear.stop()
//           → { events: [{ at (s into the shot), kind, … }], frames: [{ t, listener, weather, loops }] } for LR.audio.renderFilm
// A realm adds its own: LR.ear.add((h) => { … h.emit(event, ago) … h.loop(loop) }) every frame (h: time, dt, cam, listener,
// st (its own state, cleared with each shot), first, hear(p)); LR.ear.shelter = (x, y, z) → 0…1 (under a roof).
// The sky machine's drone: a kind whose spec says sound: { drone: { f, blades, gain } } (or drift: …) is heard as one.
// references/SOUND.md says what each event carries.
{
  const ear = (LR.ear = { active: false, steps: false, listener: null, mist: 0, hooks: [], shelter: null, rec: null });
  const sat = LR.sat, clamp = LR.clamp, TAU = Math.PI * 2;
  // (the same hashes lib/63_glow and lib/62_vfx draw with: where a strike is; which footfalls steam, which knees spark)
  const h1 = (a, b = 0) => LR.hash2(Math.floor(a) * 7919 + 13, b * 104729 + 7);
  const H = (a, b, c) => LR.hash2((a * 73856093) ^ (b * 19349663), c * 83492791 + 7);
  ear.add = (fn) => { ear.hooks.push(fn); return fn; };
  const q = []; let S = null;
  ear.reset = () => { S = { foot: new Map(), lift: new Map(), mv: new Map(), cry: new Map(), aware: new Map(), fault: new Map(), bolt: null, bursts: new Set(), w: null, cam: null, n: 0, ft: 0, realm: {} }; q.length = 0; };
  ear.reset();
  LR.on('avatarstep', (e) => q.push(['step', e]));
  LR.on('landed', (e) => q.push(['land', e]));

  // the wings' clicks, from lib/48_mech_wings' own timing: a vane's spring (snap) first reaches its stop 0.147 s after its
  // moment; the arm's joints swing out on a slower spring.  Folding, each vane is home 0.36 s after its own moment, tip first
  const SNAP = 0.147;
  const wingClicks = (spec, open) => { const F = (LR.mech.wingFeathers && LR.mech.wingFeathers(spec || {})) || [], n = F.length, out = [];
    const order = (f) => (f.g === 't' ? f.i : f.g === 's' ? 3 + f.i : 10 + f.i), pitch = (f) => (f.g === 'p' ? 1.12 : f.g === 's' ? 1 : 0.88) * (1 + 0.05 * (f.i % 3));
    if (open) { out.push([SNAP / 0.5, 0.9, 0.55, 1], [0.05 + SNAP / 0.5, 0.8, 0.6, 1], [0.1 + SNAP / 0.55, 0.8, 0.65, 1]); for (const f of F) { const k = order(f); out.push([0.12 + k * 0.024 + SNAP, 0.5 + 0.5 * (k / Math.max(1, n - 1)), pitch(f), 0]); } }
    else { for (const f of F) { const k = order(f); out.push([0.02 + (n - k) * 0.006 + 0.36, 0.35 + 0.2 * (k / Math.max(1, n - 1)), pitch(f) * 0.9, 0]); } out.push([0.14 + 0.36, 0.6, 0.6, 1], [0.2 + 0.36, 0.6, 0.55, 1], [0.26 + 0.36, 0.75, 0.5, 1]); }
    return out.sort((a, b) => a[0] - b[0]).map((c) => [+c[0].toFixed(4), +c[1].toFixed(3), +c[2].toFixed(3), c[3]]); };
  ear.wingClicks = wingClicks;

  let fwd = null;
  const collect = (time, dt, cam) => {
    const A = LR.audio, want = !!ear.rec || !!(A && A.ready && !A.muted); ear.active = want; if (!want || !cam) { q.length = 0; return; }
    const P = LR.player, M = LR.mech, VX = LR.vfx, W = LR.wx, cp = cam.position; if (!fwd) fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const yaw = Math.atan2(fwd.x, -fwd.z), rx = Math.cos(yaw), rz = Math.sin(yaw), first = S.n === 0;
    const L = { x: cp.x, y: cp.y, z: cp.z, yaw, h: cp.y - LR.land.h(cp.x, cp.z), sh: ear.shelter ? sat(ear.shelter(cp.x, cp.y, cp.z)) : 0 }; ear.listener = L;
    ear.mist = sat(((W.cur && W.cur.fog) || 0) / 0.0125) * (1 - sat((W.rain || 0) * 3)) * (1 - sat((W.snowfall || 0) * 3));
    const hear = (p) => { const dx = p[0] - cp.x, dy = p[1] - cp.y, dz = p[2] - cp.z, dh = Math.hypot(dx, dz); return { d: +Math.hypot(dh, dy).toFixed(2), side: +clamp((dx * rx + dz * rz) / Math.max(1.5, dh), -1, 1).toFixed(3) }; };
    const ev = [], loops = [];
    S.ft += dt || 0;
    const emit = (e, ago) => { Object.assign(e, hear(e.p)); e.tc = time - (ago || 0); ev.push(e); return e; };      // ago: clock seconds since it happened (negative: still to come)
    const emitF = (e, ago) => { Object.assign(e, hear(e.p)); e.tf = S.ft - (ago || 0); ev.push(e); return e; };     // … in the walker's (the film's) seconds
    const loop = (l) => { Object.assign(l, hear(l.p)); delete l.p; loops.push(l); return l; };
    const units = (M && M.units) || [], av = units.find((u) => u.avatar);
    if (M && units.length) {
      // a machine's foot coming down (lib/48_mech_run's impacts: the clock time each came down, so its dust and its sound agree)
      const same = {};      /* (feet of one machine that come down together — a tripod's three, a file of woodlice — are one blow) */
      for (const f of M.impacts || []) { { const dd = Math.hypot(f.x - cp.x, f.y - cp.y, f.z - cp.z); if (((f.tonnes || 0) < 8 && dd > 45) || (f.unit.lod < 0 && dd > 70 && (f.tonnes || 0) < 1000)) continue; }      /* (far and out of sight, a small machine's feet are not worth a voice) */ const key = f.unit.name + f.leg, was = S.foot.get(key); if (was !== undefined && f.k <= was) continue; S.foot.set(key, f.k); if (first || f.age > 0.5) continue;      /* (each foot's last two are listed — none once it has stood 5 s: a new one is a higher k, or the first since) */
        const Ld = LR.land, cov = (k) => (Ld.coverAt ? Ld.coverAt(k, f.x, f.z) : 0.4), loose = sat(Math.max(cov('dirt'), cov('shore') * 0.7) * (1 - 0.8 * cov('paved'))), wl = LR.water ? LR.water.levelAt(f.x, f.z) : -1e9;
        const tk = f.unit.kind + '@' + Math.round((time - f.age) * 30), mate = same[tk], d = Math.hypot(f.x - cp.x, f.y - cp.y, f.z - cp.z);
        if (mate) { mate.feet++; if (d < mate.d) Object.assign(mate, hear([f.x, f.y, f.z]), { p: [f.x, f.y, f.z] }); }
        else same[tk] = emit({ kind: 'footfall', p: [f.x, f.y, f.z], tonnes: f.tonnes, feet: 1, wet: wl > f.y + 0.05, loose: +loose.toFixed(2), surf: W.snow > 0.35 ? 'snow' : '', unit: f.unit.name }, f.age);
        const tn = f.tonnes || 0, sol = f.unit.pose && f.unit.pose.sols && f.unit.pose.sols[f.leg];
        if (tn >= 80 && sol && H(f.unit.row || 0, f.k | 0, 5) < (tn > 1000 ? 0.45 : 0.22)) { const J = sol.J[1]; emit({ kind: 'sparks', p: [J[0], J[1], J[2]], size: Math.min(2.5, 0.5 + 0.3 * Math.cbrt(tn / 86)), grind: 1 }, f.age - 0.05); } }
      const hums = [];
      for (const u of units) {
        if (!u.pose || !u.pose.W) continue; const c = u.pose.cmd, Wd = u.pose.W, body = Wd.body.p, tn = u.K.spec.tonnes || 0;
        if (!u.avatar) {
          // the steam a heavy knee lets go as its foot lifts (lib/62_vfx draws it from the same hash)
          if (tn >= 150 && !u.fly && !u.post && u.T && c && u.lod >= 0 && u.dist < 220) for (const l of u.kin.limbs) { const du = u.duty || 0.6, k = Math.floor(c.u - u.off[l.name] - du), key = u.name + l.name, was = S.lift.get(key); if (was === k) continue; S.lift.set(key, k); if (was === undefined) continue;
            const tl = M.phaseTime(u, l.name + '^' + k, k + du + u.off[l.name], time); if (tl === null || time - tl > 0.5 || H(u.row, k, 3) >= 0.35) continue;
            const c0 = M.cmd(u, tl + 0.05), q0 = c0.limbs[l.name]; if (!q0) continue; const J = l.solve(c0.body, q0.p, q0.gamma).J[1]; emit({ kind: 'hiss', p: [J[0], J[1], J[2]], size: Math.min(3.6, 0.8 * Math.cbrt(tn / 86) + 0.25), tonnes: tn }, time - tl - 0.04); }
          // a move: its call when its time comes; its pumps on every stretch of it that moves; its valve when it settles
          const mv = c && c.move, pr = S.mv.get(u.name), head = (Wd.head || Wd.body).p; S.mv.set(u.name, mv ? { mv, mt: c.mt } : null);
          // (listening starts in the middle of a call: it is heard from where it has got to)
          if (mv && first && mv.sound && c.mt > mv.sound[0] && c.mt < mv.sound[0] + mv.sound[2]) emit({ kind: 'call', p: [head[0], head[1], head[2]], f: mv.sound[1], len: mv.sound[2], gain: mv.sound[3] || 1 }, c.mt - mv.sound[0]);
          if (mv && !first) { const a = pr && pr.mv === mv ? pr.mt : c.mt < 0.6 ? -1e-6 : null, b = c.mt;
            if (a !== null && b > a) { if (mv.sound && a < mv.sound[0] && b >= mv.sound[0]) emit({ kind: 'call', p: [head[0], head[1], head[2]], f: mv.sound[1], len: mv.sound[2], gain: mv.sound[3] || 1 }, b - mv.sound[0]);
              const ks = mv.keys && mv.keys[mv.main]; if (ks && ks.length > 1) { const vs = ks.map((x) => x[1]), span = Math.max(...vs) - Math.min(...vs) || 1;
                for (let i = 0; i < ks.length - 1; i++) { const t0 = ks[i][0]; if (!(a < t0 && b >= t0)) continue; const amt = Math.abs(ks[i + 1][1] - ks[i][1]) / span, before = i > 0 ? Math.abs(ks[i][1] - ks[i - 1][1]) / span : 0;
                  if (amt > 0.08) emit({ kind: 'servo', p: [body[0], body[1], body[2]], tonnes: tn || 50, lenC: ks[i + 1][0] - t0, amt: +amt.toFixed(2), dir: Math.sign(ks[i + 1][1] - ks[i][1]) }, b - t0);
                  if (before > 0.15 && amt < 0.15) emit({ kind: 'hiss', p: [body[0], body[1], body[2]], size: Math.min(3, 0.6 + Math.cbrt(tn / 86) * 0.8), tonnes: tn }, b - t0); } } } }
          // a flyer's cry, on its own beat
          const cr = u.fly && u.K.spec.cry; if (cr) { const kk = Math.floor((time + (u.phase || 0) * cr[0]) / cr[0]), was = S.cry.get(u.name); S.cry.set(u.name, kk); if (was !== undefined && was !== kk) emit({ kind: 'call', cry: 1, p: [body[0], body[1], body[2]], f: cr[1], len: cr[2], gain: cr[3] || 0.6 }, time - (kk * cr[0] - (u.phase || 0) * cr[0])); }
          // the moment it first sees the walker (its lenses flare): a low call
          if (u.aware) { const was = S.aware.get(u.name), now = !!u.aware.seen; S.aware.set(u.name, now); if (was === false && now) emit({ kind: 'call', glance: 1, p: [head[0], head[1], head[2]], f: Math.max(38, 150 - Math.sqrt(tn || 50) * 4), len: 1.6, gain: 0.5 }, 0); }
          // its presence; the sky machine's drone
          const sd = u.K.spec.sound || {}, dr = sd.drone || (u.K.spec.drift ? (typeof u.K.spec.drift === 'object' && u.K.spec.drift.drone) || {} : null);
          if (dr) loop({ id: 'drone:' + u.name, kind: 'drone', p: body, size: u.K.radius || 40, f: dr.f, blades: dr.blades, gain: dr.gain });
          else if (!u.fly && tn >= 80 && u.dist < 15 + 3 * (u.K.radius || 5)) hums.push({ u, d: u.dist, tn, mv: c ? c.rate || 0 : 0, p: body }); }
        // faults: a crackle to the burst's own envelope (the walker's too, even seen from inside its head)
        if (!u.fly && VX && VX.faultAt) { const rg = u.avatar ? 80 : Math.max(60, (u.K.radius || 1) * 14); if (u.dist < rg && (u.avatar ? !(P && P.view === 'first' && !P.scout) : u.lod >= 0)) {      /* (the walker's own: not through its eyes, where it is not drawn — but in its camera's picture, torn by it) */ const b = VX.faultAt(u, time), fk = b && u.name + '@' + b.t0.toFixed(4); if (b && !S.fault.has(fk)) { S.fault.set(fk, 1); if (S.fault.size > 400) S.fault.clear();      /* (two bursts can overlap: each is heard once) */
          { const n = Math.max(2, Math.ceil(b.dur * 200)), env = new Array(n); for (let i = 0; i < n; i++) env[i] = +(VX.faultEnv ? VX.faultEnv(u, b, b.t0 + i / 200) : 0.7).toFixed(3);
            emit({ kind: 'crackle', p: [body[0], body[1], body[2]], env, sr: 200, power: +(b.power || 1).toFixed(2), hue: (u.arcCh && u.arcCh.hue) || 0.3, own: !!u.avatar }, time - b.t0); } } } } }
      hums.sort((a, b) => a.d - b.d); for (const h of hums.slice(0, 3)) loop({ id: 'hum:' + h.u.name, kind: 'hum', p: h.p, tonnes: h.tn, moving: +sat(h.mv).toFixed(2) });
      // rain on iron: the nearest machine's plates, the walker's own head when the camera is in it
      if ((W.rain || 0) > 0.08) { let best = null, bd = 1e9; for (const u of units) { if (u.fly || !u.pose) continue; const r = u.avatar ? 1 : (u.K.radius || 3); if (u.dist - r * 1.2 < bd && u.dist < 8 + r * 1.5) { bd = u.dist - r * 1.2; best = u; } }
        const bp = best && best.pose.W.body.p, open = best ? 1 - (ear.shelter ? sat(ear.shelter(bp[0], bp[1], bp[2])) : 0) : 0;      /* (under the hall's roof no rain falls on it) */
        if (best && open > 0.05) loop({ id: 'ironrain', kind: 'ironrain', p: bp, size: best.avatar ? 0.8 : Math.min(8, best.K.radius || 3), rain: +(W.rain * open).toFixed(2) }); }
    }
    // lightning: the strike lib/63_glow draws, where it draws it (ahead of the eye, off to a side, 380–760 m) — heard later by
    // that distance (live, lib/63_glow says so itself)
    if (VX && VX.boltAt && ear.rec) { const b = VX.boltAt(time); if (b && S.bolt !== b.t0) { S.bolt = b.t0; { const yw = yaw + (h1(b.seed, 1) - 0.5) * 0.7, dist = 380 + 380 * h1(b.seed, 2), x = cp.x + Math.sin(yw) * dist, z = cp.z - Math.cos(yw) * dist; emit({ kind: 'thunder', p: [x, LR.land.h(x, z), z] }, time - b.t0); } } }
    // bursts (lib/62_vfx): steam is a valve letting go, sparks a scrape of iron
    if (VX && VX.bursts) { if (S.bursts.size > 600) S.bursts.clear(); for (const b of VX.bursts) { const key = b.key || b.id + '@' + b.t; if (S.bursts.has(key)) continue; S.bursts.add(key); if (first) continue; const ago = time - b.t; if (ago > 0.5) continue; const sz = (b.o && b.o.size) || 1;
      if (b.kind === 'steam') emit({ kind: 'hiss', p: b.p.slice(), size: sz }, ago); else if (b.kind === 'sparks') emit({ kind: 'sparks', p: b.p.slice(), size: sz }, ago); } }
    // the walker: its feet as they come down (lib/48_mech_avatar), its landings, its wings
    ear.steps = !!av;
    if (P) { const steps = q.filter((x) => x[0] === 'step');
      if (steps.length < 2 && !P.flying && !first) for (const [, s] of steps) { const wl = LR.water ? LR.water.levelAt(s.p[0], s.p[2]) : -1e9; emitF({ kind: 'step', p: s.p.slice(), surface: P.ride ? 'metal' : wl > s.p[1] + 0.03 ? 'water' : P.surfaceAt ? P.surfaceAt(s.p[0], s.p[2]) : 'grass', run: (s.speed || 0) > 3.4 }, 0); }
      for (const [k, s] of q) if (k === 'land' && !first) emitF({ kind: 'land', p: [P.x, P.y, P.z], speed: s.speed, surface: P.ride ? 'metal' : s.surface === 'air' ? 'grass' : s.surface, wings: !!s.wings }, 0);
      const w = P.wings; if (w && av) { const pw = S.w, at = [P.x, P.y + 1.1, P.z]; S.w = { tw: w.tw, ph: w.ph, amp: w.amp };
        if (pw && w.tw < pw.tw && w.tw < 1 && !first) emitF({ kind: w.open ? 'wingopen' : 'wingclose', p: at, clicks: wingClicks(av.K.spec.wings, w.open) }, w.tw);
        if (pw && w.open && w.amp > 0.05 && w.ph > pw.ph) { const k1 = Math.floor(w.ph / TAU); if (k1 > Math.floor(pw.ph / TAU)) { const fr = (k1 * TAU - pw.ph) / (w.ph - pw.ph), rate = (w.ph - pw.ph) / Math.max(1e-4, dt); emitF({ kind: 'wingbeat', p: at, amp: +w.amp.toFixed(2), len: +(2.437 / Math.max(1, rate)).toFixed(3) }, (1 - fr) * dt); } }
        if (P.flying) loop({ id: 'air:walker', kind: 'air', p: at, speed: +(P.fs || 0).toFixed(2), flutter: +(1 - 0.6 * w.amp).toFixed(2), lv: 1 }); } }
    q.length = 0;
    // the camera flying (behind a kite, over the valley): the air past it
    if (S.cam && dt > 0) { const sp = Math.hypot(cp.x - S.cam[0], cp.y - S.cam[1], cp.z - S.cam[2]) / dt; S.csp = sp > 80 ? 0 : (S.csp || 0) + (sp - (S.csp || 0)) * 0.25;      /* (a cut is not a flight: a jump of the camera is let go, the rest is smoothed) */
      if (S.n > 4 && S.csp > 6 && L.h > 4 && !(P && P.flying)) loop({ id: 'air:cam', kind: 'air', p: [cp.x, cp.y, cp.z], speed: +S.csp.toFixed(2), flutter: 0, lv: 0.3 }); }
    S.cam = [cp.x, cp.y, cp.z];
    // what the realm adds
    for (const fn of ear.hooks) fn({ time, dt, cam, listener: L, st: S.realm, first, hear, emit, emitF, loop });
    S.n++;
    if (ear.rec) { const r = ear.rec; if (r.pending) r.pending.ev.push(...ev); else r.pending = { ev }; Object.assign(r.pending, { loops, L, time, ft: S.ft }); return; }      /* (frames not kept yet: what they heard waits for the next kept one) */
    if (A && A.hear) A.hear({ events: ev.map((e) => Object.assign(e, { ago: e.tf !== undefined ? S.ft - e.tf : time - e.tc })), loops, dt });
  };
  LR.on('frame', collect, 95);

  // ── a film: what the ear hears while a script steps the shots ──
  ear.record = () => { ear.reset(); ear.rec = { events: [], frames: [], pending: null }; return ear.rec; };
  // after each stepped frame: tt is the film's time of that frame in its shot (s), rate how fast the machines' clock ran in it
  // (a shot's rate: 3 for time passing), keep false for the frames before the shot's cut begins (they only warm the ear)
  // (from: the earliest time worth keeping; a call or a pump begun before it is kept while it still sounds)
  ear.after = (tt, rate, keep, from) => { const r = ear.rec, p = r && r.pending; if (!p) return; r.pending = null; rate = rate > 0 ? rate : 1; from = from === undefined ? -1e9 : from;
    for (const e of p.ev) { const at = tt - (e.tf !== undefined ? p.ft - e.tf : (p.time - e.tc) / rate); if (e.sr) e.sr *= rate; if (e.lenC !== undefined) { e.len = e.lenC / rate; delete e.lenC; } delete e.tf; delete e.tc; e.at = +at.toFixed(5);
      const len = (e.kind === 'call' && !e.glance && !e.cry) || e.kind === 'servo' ? e.len || 0 : e.kind === 'crackle' ? (e.env ? e.env.length / e.sr : 0) : 0; if (at >= from || at + len > from) if (!(e.glance && at < -0.05)) r.events.push(e); }      /* (a glance seen before the shot's first frame is not the shot's) */
    if (!keep) return;
    const W = LR.wx, L = p.L, n = (v) => +(+v || 0).toFixed(3);
    r.frames.push({ t: +tt.toFixed(5), x: n(L.x), y: n(L.y), z: n(L.z), yaw: n(L.yaw), h: n(L.h), sh: n(L.sh), tod: n(W.tod), season: n(W.season), rain: n(W.rain), snowfall: n(W.snowfall), snow: n(W.snow), wind: n(typeof W.wind === 'number' ? W.wind : 0.25), wet: n(W.wet), mist: n(ear.mist), loops: p.loops }); };
  ear.stop = () => { const r = ear.rec; ear.rec = null; ear.reset(); return r ? { events: r.events, frames: r.frames } : null; };
}
