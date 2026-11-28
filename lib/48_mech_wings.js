// machine-wilds · 48_mech_wings — mechanical wings for a machine that walks: a three-bone arm a side (shoulder, forearm,
// hand) and a fan of steel feathers on it — tertials on the upper arm, secondaries on the forearm, primaries on the hand —
// every one a bone of its own (an extra of type 'joint': sweep, lift, twist, bend, from the command), so each vane turns,
// twists and flutters by itself and is drawn rigid on its bone like any other part.
//
// How they move (a function of a small state, so a film frame is the same whenever it is drawn):
//   · folded, the arm lies in a Z along the back (upper arm back, forearm forward, hand back) and every feather has turned to
//     lie along its bone, primaries stacked on the hand, secondaries along the forearm, tertials over them;
//   · opening is a cascade: shoulder, then elbow, then wrist, then the feathers from the inner tertials out to the last
//     primary, each a little later than the one before, each with a spring's overshoot and settle — the snap of a fan;
//     closing runs the other way, without the snap;
//   · gliding, the wing holds a small dihedral and breathes with the gusts (the whole wing rising and falling), the outer
//     primaries bend up under the load and every vane flutters on its spar, faster and more at the tips and the faster it flies;
//   · beating, a wave runs out along the wing (shoulder, elbow, wrist, each later), the downstroke quicker than the
//     upstroke (a phase warped so the wings fall in under two-fifths of the beat); down, the arm is straight and the primaries closed into one surface; up, the arm folds a little and the
//     primaries twist open into slots so the air goes through — and a beat always starts by lifting the wings first;
//   · banking, the inner wing drops and sweeps back, the outer lifts; flaring, the wings come forward and up with the
//     feathers spread wide; diving, they sweep back into an arrow.
//
//   spec.wings = { at: [x, y, z] (right shoulder on the body; the left is its mirror), arm: [upper, fore, hand] (m),
//                  feathers: { tert: n, sec: n, prim: n }, len: { tert, sec, prim: [inner, outer] } (m), chord (m), dihedral°,
//                  beat (Hz: a four-metre steel wing beats about 1.4 times a second — faster and a frame cannot follow it) }
//   LR.mech.wingExtras(spec.wings)   → extras for M.define (bones: wing{R,L}_{sh,el,wr}, wing{R,L}_{t,s,p}<i>)
//   LR.mech.wingPose(spec.wings, st) → cmd.extras for them.  st = { open, tw (s since it opened or closed), amp (0…1 beating),
//        ph (beat phase, radians), bank (rad, + right), brake (0…1 flaring), tuck (0…1 diving), speed (m/s), gust (−1…1), t }
//   LR.mech.wingExercise(u)          → the numbers the gym judges (open, glide, beat, bank, flare, dive, close)
{
  const M = LR.mech, D2R = M.D2R, TAU = Math.PI * 2, sat = LR.sat, sm = (x) => { x = sat(x); return x * x * (3 - 2 * x); };
  const SIDES = [['R', 1], ['L', -1]];
  const DEF = { beat: 1.4, at: [0.0, 0.2, 0.17], arm: [0.42, 0.5, 0.36], feathers: { tert: 3, sec: 7, prim: 9 }, len: { tert: 0.42, sec: 0.6, prim: [0.62, 0.86] }, chord: 0.15, dihedral: 7 };
  const W = (w) => Object.assign({}, DEF, w || {}, { feathers: Object.assign({}, DEF.feathers, (w && w.feathers) || {}), len: Object.assign({}, DEF.len, (w && w.len) || {}) });
  // every feather's place: its group, its bone, how far along that bone, how long, its fan angle open and folded
  const featherList = (w) => { const out = [], F = w.feathers, A = w.arm;
    for (let i = 0; i < F.tert; i++) out.push({ g: 't', i, bone: 'sh', at: A[0] * (0.25 + 0.7 * (i / Math.max(1, F.tert - 1))), len: w.len.tert * (0.85 + 0.15 * i / Math.max(1, F.tert - 1)), open: -8 + 6 * (i / Math.max(1, F.tert - 1)), fold: 84, layer: 2 });
    for (let i = 0; i < F.sec; i++) out.push({ g: 's', i, bone: 'el', at: A[1] * (0.05 + 0.92 * (i / Math.max(1, F.sec - 1))), len: w.len.sec * (1 - 0.06 * i / Math.max(1, F.sec - 1)), open: -2 + 8 * (i / Math.max(1, F.sec - 1)), fold: -86, layer: 1 });
    for (let i = 0; i < F.prim; i++) { const k = i / Math.max(1, F.prim - 1); out.push({ g: 'p', i, bone: 'wr', at: A[2] * (0.04 + 0.94 * k), len: w.len.prim[0] + (w.len.prim[1] - w.len.prim[0]) * Math.sin(k * Math.PI * 0.5), open: 10 + 70 * Math.pow(k, 1.25), fold: 88, layer: 0 }); }
    return out; };
  M.wingFeathers = (w) => featherList(W(w));

  M.wingExtras = (w0) => { const w = W(w0), A = w.arm, out = [];
    for (const [S, s] of SIDES) { const n = (b) => `wing${S}_${b}`;
      out.push({ name: n('sh'), type: 'joint', parent: 'body', at: [w.at[0], w.at[1], w.at[2] * s], axis: [0, 0, s] });
      out.push({ name: n('el'), type: 'joint', parent: n('sh'), at: [0, 0, A[0] * s], axis: [0, 0, s] });
      out.push({ name: n('wr'), type: 'joint', parent: n('el'), at: [0, 0, A[1] * s], axis: [0, 0, s] });
      for (const f of featherList(w)) out.push({ name: n(f.g + f.i), type: 'joint', parent: n(f.bone), at: [0.02, 0.012 * f.layer + 0.004 * (f.i % 2), f.at * s], axis: [-1, 0, 0] }); }
    return out; };

  // a spring's step: 0 before x = 0, rising to 1 with an overshoot of about a sixth and a settle (the snap of a fan)
  const snap = (x) => (x <= 0 ? 0 : 1 - Math.exp(-7.5 * x) * (Math.cos(14 * x) + (7.5 / 14) * Math.sin(14 * x)));
  // the noise the wind is made of: a few sines, incommensurate (smooth, never repeating within a film)
  const wob = (t, a, b) => Math.sin(t * a + b) * 0.6 + Math.sin(t * a * 2.37 + b * 1.7) * 0.3 + Math.sin(t * a * 5.1 + b * 0.3) * 0.1;

  M.wingPose = (w0, st = {}) => { const w = W(w0), out = {}, open = !!st.open, tw = st.tw === undefined ? 99 : st.tw, amp = sat(st.amp || 0), t = st.t || 0, sp = st.speed || 0;
    const brake = sat(st.brake || 0), tuck = sat(st.tuck || 0), bank = st.bank || 0, gust = st.gust || 0, F = featherList(w), nF = F.length, spK = sat(sp / 16);
    // the beat: a wave out along the wing; the downstroke (cos falling) quicker than the upstroke
    const ph = st.ph || 0, phw = ph + 0.4 * (1 - Math.cos(ph)), up = Math.max(0, -Math.sin(phw)), down = Math.max(0, Math.sin(phw));
    for (const [S, s] of SIDES) { const n = (b) => `wing${S}_${b}`, inner = bank * s > 0 ? Math.min(1, Math.abs(bank) / 0.6) : 0, outer = bank * s < 0 ? Math.min(1, Math.abs(bank) / 0.6) : 0;
      // the order of the cascade: each bone's own moment (opening: root to tip; closing: tip to root)
      const kOf = (d, dc, sp2 = 1) => (open ? snap((tw - d) * sp2) : 1 - sm((tw - dc) / 0.36));
      const kSh = kOf(0, 0.26, 0.5), kEl = kOf(0.05, 0.2, 0.5), kWr = kOf(0.1, 0.14, 0.55);      // (the arm swings out on a slower spring; the feathers snap)
      // the arm, open: [sweep back°, raise°, pitch°] — folded: a Z along the back
      const g1 = gust * 4 + wob(t, 1.3, s * 1.1) * 1.5 * (1 - amp);
      const shO = [-4 + 14 * tuck - 14 * brake + 6 * inner + 6 * up * amp, w.dihedral + g1 + amp * 34 * Math.cos(phw) - 7 * inner + 5 * outer + 18 * brake, -8 * amp * down + 10 * amp * up + 22 * brake - 4 * inner + 3 * outer];
      const elO = [-6 - 30 * tuck - 22 * amp * up, amp * 16 * Math.cos(phw - 0.55) + 1.5 * g1, 4 * amp * up];
      const wrO = [10 + 34 * tuck + 26 * amp * up - 6 * brake, amp * 22 * Math.cos(phw - 1.1) + 2 * g1 - 4 * brake, 6 * brake];
      const FO = { sh: [82, -12, 4], el: [-168, 6, 0], wr: [164, 0, 0] }, mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
      const arm = { sh: mix(FO.sh, shO, kSh), el: mix(FO.el, elO, kEl), wr: mix(FO.wr, wrO, kWr) };
      // into the joint's own terms (the mirror for the left): [sweep about up, lift about forward, twist about the bone]
      for (const b of ['sh', 'el', 'wr']) { const q = arm[b]; out[n(b)] = [-s * q[0], -s * q[1], s * q[2], 0]; }
      // the feathers
      for (let j = 0; j < nF; j++) { const f = F[j], order = f.g === 't' ? f.i : f.g === 's' ? 3 + f.i : 10 + f.i, d = 0.12 + order * 0.024, dc = 0.02 + (nF - order) * 0.006, k = kOf(d, dc);
        const tipK = f.g === 'p' ? f.i / Math.max(1, w.feathers.prim - 1) : f.g === 's' ? 0.25 : 0.1;
        // open: its fan angle — closed together on the downstroke, spread on the upstroke and in a flare, gathered in a dive
        const spread = 1 + 0.12 * amp * up - 0.06 * amp * down + 0.22 * brake - 0.35 * tuck, fan = f.open * spread;
        // its twist on the spar: slotted open on the upstroke (the primaries), and the flutter of a vane in moving air
        const fl = (0.6 + 3.4 * tipK) * (0.25 + spK) * (1 - 0.6 * amp) * wob(t, 7 + 9 * tipK + (j % 3), j * 1.93 + s), slot = f.g === 'p' ? 30 * amp * up * (0.4 + 0.6 * tipK) : f.g === 's' ? 8 * amp * up : 0;
        const twist = slot + fl + (f.g === 'p' ? 4 * inner * s : 0) + 10 * brake * tipK;
        // its bend: the outer primaries curl up under the load of a glide or a downstroke, droop a little when it flares
        const bend = -(f.g === 'p' ? (3 + 9 * spK + 10 * amp * down) * tipK * tipK : 0) + 4 * brake * tipK + 0.8 * wob(t, 3.1 + tipK, j) * spK;
        const o = [fan, 0, twist, bend], c = [f.fold, 0, 0, 0], q = mix(c, o, k);
        out[n(f.g + f.i)] = [s * q[0], 0, s * q[2], q[3]]; } }
    return out; };

  // ── the exercise the gym judges: open on the ground, glide, beat, bank both ways, flare, dive, close — at 24 frames a
  // second, the wind blowing.  Numbers: the joints' ranges, feathers crossing in the fan, the most any vane turns in a frame
  // outside the opening snap, whether it breathes gliding, the downstroke's share of a beat, the lift before the first beat,
  // and how far the folded wing's tips are from the body (a tidy fold) ──
  M.wingExercise = (u) => { const w = W(u.K.spec.wings), dt = 1 / 24, F = featherList(w), A = { wings: true, unit: u.name, frames: 0, turn: 0, turnOpen: 0, cross: 0, breath: 0, downShare: 0, anticipation: 0, foldTip: 0, span: 0, range: { shRaise: [1e9, -1e9], elSweep: [1e9, -1e9], wrSweep: [1e9, -1e9] } };
    const seg = [[0, 1.6, 'open'], [1.6, 3.4, 'glide'], [3.4, 6.6, 'beat'], [6.6, 8, 'bankL'], [8, 9.4, 'bankR'], [9.4, 10.4, 'flare'], [10.4, 11.4, 'dive'], [11.4, 12.2, 'close'], [12.2, 13, 'folded']];
    const state = (t) => { const s = seg.find((q) => t >= q[0] && t < q[1]) || seg[seg.length - 1], open = s[2] !== 'close' && s[2] !== 'folded', tw = open ? t : t - 11.4;
      const ampK = t >= 3.4 && t < 7.4 ? sm((t - 3.4) / 0.6) * (1 - sm((t - 6.3) / 1.0)) : 0, ph = Math.PI + TAU * (w.beat || 1.4) * Math.max(0, t - 3.4);      /* (a beat dies away over a second; it is not cut) */      // (a beat starts at the bottom of its arc going up: the wings lift first)
      return { open, tw, amp: ampK, ph, bank: -0.5 * sm((t - 6.6) / 0.5) + 1.0 * sm((t - 7.8) / 0.6) - 0.5 * sm((t - 9.1) / 0.4), brake: sm((t - 9.4) / 0.3) * (1 - sm((t - 10.2) / 0.4)), tuck: sm((t - 10.4) / 0.4) * (1 - sm((t - 11.4) / 0.5)),      /* (every change eased: what is judged is the wing, not the cut) */ speed: s[2] === 'open' ? 0 : s[2] === 'dive' ? 20 : 11, gust: Math.sin(t * 0.7) * 0.6, t, seg: s[2] }; };
    let prev = null, glideT = [], beatRaise = [], firstBeat = null; const cmd0 = u.kin.restCmd();
    for (let t = 0; t < 13; t += dt) { const st = state(t), q = M.wingPose(w, st); A.frames++;
      if (prev) for (const k in q) { const a = q[k], b = prev[k]; let m = 0; for (let i = 0; i < 4; i++) m = Math.max(m, Math.abs((a[i] || 0) - (b[i] || 0))); if (st.seg === 'open' || st.seg === 'close') A.turnOpen = Math.max(A.turnOpen, m); else if (m > A.turn) { A.turn = m; A.turnAt = `${k} at ${t.toFixed(2)} s (${st.seg})`; } }
      prev = q; const R = (b) => q[`wingR_${b}`];
      A.range.shRaise[0] = Math.min(A.range.shRaise[0], -R('sh')[1]); A.range.shRaise[1] = Math.max(A.range.shRaise[1], -R('sh')[1]);
      A.range.elSweep[0] = Math.min(A.range.elSweep[0], -R('el')[0]); A.range.elSweep[1] = Math.max(A.range.elSweep[1], -R('el')[0]); A.range.wrSweep[0] = Math.min(A.range.wrSweep[0], -R('wr')[0]); A.range.wrSweep[1] = Math.max(A.range.wrSweep[1], -R('wr')[0]);
      // the fan, open: each primary at least as far out as the one inside it (no vane crosses its neighbour)
      if (st.open && st.tw > 0.9) for (let i = 1; i < w.feathers.prim; i++) A.cross = Math.max(A.cross, R('p' + (i - 1))[0] - R('p' + i)[0]);
      if (st.seg === 'glide' && t > 1.8) glideT.push(R('p' + (w.feathers.prim - 1))[2]);
      if (st.seg === 'beat' && t > 4.1 && t < 6.2) beatRaise.push(-R('sh')[1]);
      if (st.seg === 'beat' && firstBeat === null) firstBeat = []; if (st.seg === 'beat' && t < 3.75) firstBeat.push(-R('sh')[1]);
      if (st.seg === 'folded' || (st.seg === 'glide' && t > 2)) { const c = Object.assign({}, cmd0, { extras: q }), W2 = u.kin.pose(c, null, 0).W, B = W2.body;
        for (const [S] of SIDES) for (const f of [`wing${S}_p${w.feathers.prim - 1}`, `wing${S}_wr`]) { const p = W2[f].p, d = Math.hypot(p[0] - B.p[0], p[1] - B.p[1], p[2] - B.p[2]) + (f.includes('_p') ? w.len.prim[1] : 0);
          if (st.seg === 'folded') A.foldTip = Math.max(A.foldTip, d); else A.span = Math.max(A.span, Math.abs(p[2] - B.p[2]) + (f.includes('_p') ? w.len.prim[1] * 0.7 : 0)); } } }
    const mean = glideT.reduce((a, b) => a + b, 0) / Math.max(1, glideT.length); A.breath = Math.sqrt(glideT.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, glideT.length));
    let dn = 0; for (let i = 1; i < beatRaise.length; i++) if (beatRaise[i] < beatRaise[i - 1]) dn++; A.downShare = dn / Math.max(1, beatRaise.length - 1);
    A.anticipation = firstBeat && firstBeat.length > 2 ? Math.max(...firstBeat) - firstBeat[0] : 0;
    return A; };

  // ── the parts: a casing on each arm bone, a knuckle at every joint, and every feather a steel vane — a tapered plate with a
  // spar down its middle, a hardened leading edge, a hinge at its root, rivets along the spar, and on the primaries a painted
  // tip.  Built in each bone's rest frame (the arm straight out, every feather pointing back) ──
  if (M.Kit) M.Kit.prototype.wings = function (w0) { const k = this, w = W(w0), A = w.arm, F = featherList(w), sides = k.n(10);
    for (const [S, s] of SIDES) { const n = (b) => `wing${S}_${b}`;
      const arm = (b, L, r0, r1) => k.bone(n(b), (g) => { k.mat('dark'); g.cyl(0, -0.045, 0, r0 * 1.3, r0 * 1.3, 0.09, { sides }); g.tube([[0, 0, 0], [0, 0, L * s]], [r0 * 0.55, r0 * 0.5], { sides: k.n(8), caps: true });
        k.mat('shell'); g.beam([0.03, 0.004, s * 0.04], [0.02, 0.004, s * (L - 0.03)], r0 * 1.7, r0 * 1.1, { caps: true }); k.mat('frame'); g.beam([-0.035, -0.01, s * 0.06], [-0.03, -0.01, s * (L - 0.05)], r0 * 0.7, r0 * 0.6, {});
        if (k.mid) { k.mat('accent'); g.beam([0.032, 0.025, s * (L * 0.3)], [0.03, 0.025, s * (L * 0.55)], r0 * 1.72, 0.012, {}); k.mat('steel'); g.tube([[-0.01, 0.03, s * 0.05], [-0.01, 0.034, s * (L * 0.85)]], 0.009, { sides: 5 }); } });
      arm('sh', A[0], 0.034, 0.03); arm('el', A[1], 0.028, 0.024); arm('wr', A[2], 0.022, 0.018);
      for (const f of F) k.bone(n(f.g + f.i), (g) => { const kp = f.g === 'p' ? f.i / Math.max(1, w.feathers.prim - 1) : 0, L = f.len, c = w.chord * (f.g === 'p' ? 1.0 - 0.18 * kp : f.g === 't' ? 1.12 : 1.06), t = 0.0065;
          // the vane: a blade back along −x from its root, wider on the trailing side (+z s, toward the tip of the wing) than the
          // leading, a rounded end; the outer primaries narrow toward the end (as a bird's are: the slots at a wingtip)
          const seg2 = 9, pts = []; for (let i = 0; i <= seg2; i++) { const u2 = i / seg2, x = -0.025 - u2 * L, notch = f.g === 'p' && kp > 0.45 && u2 > 0.55 ? 1 - 0.38 * sm((u2 - 0.55) / 0.12) * (kp - 0.45) / 0.55 : 1;
            const wd = c * (u2 < 0.1 ? 0.5 + 5 * u2 : u2 < 0.78 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u2 - 0.78) / 0.22, 2)) * 0.92 + 0.08 * (1 - u2))) * notch; pts.push([x, wd * 0.3, wd * 0.7]); }
          const tone = f.g === 'p' && f.i % 3 === 1 ? 'vaneDark' : f.g === 's' && f.i % 2 ? 'vaneDark' : 'vane';
          k.mat(tone); for (let i = 0; i < seg2; i++) { const [x0, a0, b0] = pts[i], [x1, a1, b1] = pts[i + 1], dy0 = -0.01 * (i / seg2) * (i / seg2), dy1 = -0.01 * ((i + 1) / seg2) * ((i + 1) / seg2);      /* (a slight camber: the vane curves down toward its end) */
            for (const y of [t, -t]) g.poly([[x0, y + dy0, -a0 * s], [x1, y + dy1, -a1 * s], [x1, y + dy1, b1 * s], [x0, y + dy0, b0 * s]], { hint: [0, y > 0 ? 1 : -1, 0] });
            g.poly([[x0, t + dy0, b0 * s], [x1, t + dy1, b1 * s], [x1, -t + dy1, b1 * s], [x0, -t + dy0, b0 * s]], { hint: [0, 0, s] }); g.poly([[x0, t + dy0, -a0 * s], [x1, t + dy1, -a1 * s], [x1, -t + dy1, -a1 * s], [x0, -t + dy0, -a0 * s]], { hint: [0, 0, -s] }); }
          // the spar, its hinge at the root, the hardened leading edge, a row of rivets; the primaries' painted ends
          k.mat('dark'); g.tube([[0, 0.004, 0], [-0.025 - L * 0.6, 0.006, 0], [-0.025 - L * 0.93, -0.004, 0]], [0.0085, 0.006, 0.0035], { sides: 5, caps: true }); g.cyl(0, -0.013, 0, 0.017, 0.017, 0.026, { sides: k.n(8) });
          k.mat('frame'); g.beam([-0.03, 0.001, -c * 0.27 * s], [-0.025 - L * 0.78, -0.004, -c * 0.2 * s], 0.006, 0.012, {});
          if (k.mid && f.g === 'p') { k.mat('accent'); const u0 = 0.8, u1 = 0.9, A0 = pts[Math.round(u0 * seg2)], A1 = pts[Math.round(u1 * seg2)]; const y0 = t + 0.0016 - 0.01 * u0 * u0, y1 = t + 0.0016 - 0.01 * u1 * u1; g.poly([[A0[0], y0, -A0[1] * s], [A1[0], y1, -A1[1] * s], [A1[0], y1, A1[2] * s], [A0[0], y0, A0[2] * s]], { hint: [0, 1, 0] }); }
          if (k.fine) k.rivets([-0.05, t + 0.002, 0.014 * s], [-0.025 - L * 0.7, t - 0.003, 0.014 * s], 6, 0.005, [0, 1, 0]); });
      // the coverts: short white plates in two rows over the feathers' roots, along the arm, as a bird's wing is covered
      const covert = (b, L, n2, len, row) => k.bone(n(b), (g) => { k.mat(row ? 'shell' : 'vane'); for (let i = 0; i < n2; i++) { const z = s * (0.03 + (L - 0.05) * (i + 0.5) / n2), wz = (L / n2) * 0.62, y = 0.03 + 0.012 * row, x0 = -0.02 - 0.03 * row, x1 = x0 - len * (0.85 + 0.15 * Math.sin(i * 1.7));
          g.poly([[x0, y, z - wz * s], [x1, y - 0.01, z - wz * 0.7 * s], [x1 - 0.03, y - 0.012, z + wz * 0.2 * s], [x0, y, z + wz * s]], { hint: [0, 1, 0] }); g.poly([[x0, y - 0.006, z + wz * s], [x1 - 0.03, y - 0.018, z + wz * 0.2 * s], [x1, y - 0.016, z - wz * 0.7 * s], [x0, y - 0.006, z - wz * s]], { hint: [0, -1, 0] }); } });
      covert('sh', A[0], 4, 0.2, 0); covert('sh', A[0], 4, 0.11, 1); covert('el', A[1], 6, 0.2, 0); covert('el', A[1], 6, 0.11, 1); covert('wr', A[2], 5, 0.17, 0); covert('wr', A[2], 4, 0.09, 1); }
    return k; };
}
