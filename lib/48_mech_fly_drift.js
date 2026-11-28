// machine-wilds · 48_mech_fly_drift — a flyer that drifts: an airship, a balloon, anything carried by its gas rather than
// by beating wings.  It is a mode of the flight (flight.mode = 'drift'), a pure function of time like every other: it
// follows its closed line at a walking pace, its hull yawing slowly into a turn a few seconds before the line bends
// (a hull a hundred metres long does not follow a kink), banked only a few degrees by the turn; and the wind works on it
// all the time — it heaves, pitches, rolls and yaws a little in long slow swells and shorter gusts, more when it blows
// harder (flight.wind).  Every swell is a whole number of waves a lap, so one lap later it is in the same pose to the
// millimetre.  Its propellers are `spin` extras (their own rate); its rudders, cranes, a windsock and whatever else the
// command steers are extras whose angles it writes (flight.drive).  Numbers only: it runs in Node (gym.mjs).
//
//   spec.flight = { mode: 'drift', speed (m/s), abs: true (the line's third number is a height above the sea, not above the land),
//                   yawLead (s: how far ahead the hull turns into the line), bankK (° of bank per 0.01 1/m of turn), bankMax°,
//                   sway: { heave m, pitch°, roll°, yaw° } (at a fresh wind), span (its beam, m: how far apart two flyers keep),
//                   hull: [[x, y, z]…] body points the land must clear (the bottom of the hull, the gondola's keel), drive(cmd, k) }
//   LR.mech.spawn(kind, { fly: [[x, z, height]…], offset (s) })
{
  const M = LR.mech, V = M.v, D2R = M.D2R, TAU = Math.PI * 2;
  const planFly0 = M.planFly, flyCmd0 = M.flyCmd, audit0 = M.auditFly;
  const isDrift = (u) => !!(u.K.spec.flight && u.K.spec.flight.mode === 'drift');
  M.planFly = (u) => {
    if (!isDrift(u)) return planFly0(u);
    const F = u.K.spec.flight, L = LR.land;
    if (F.abs && !u.flyAbs) { u.flyAbs = u.fly; u.fly = u.flyAbs.map((p) => [p[0], p[1], p[2] - L.h(p[0], p[1])]); }
    planFly0(u); u.span = F.span || 30; u.wb = u.span; u.track = u.span;
    // the swells: periods near the ones asked for, each a whole number of waves a lap
    const W = (period) => Math.max(1, Math.round(u.lap / period)) * TAU / u.lap;
    u.sw = { heave: [W(19), W(43)], pitch: [W(23), W(11)], roll: [W(17), W(37)], yaw: [W(41), W(19)], surge: W(29), crane: W(97) };
    return u;
  };
  const course = (u, s, e) => { const a = u.at(s - e), b = u.at(s + e), dx = b[0] - a[0], dz = b[2] - a[2], hl = Math.hypot(dx, dz) || 1e-9; return [Math.atan2(dz, dx), Math.atan2(b[1] - a[1], hl)]; };
  // how hard it blows on it (0 calm … 1 a gale): the kind's own number (flight.wind, 0.5) — not the page's weather, so a pose is
  // the same in the gym, in shot-at.mjs and in the page whatever the sky is doing; the checks ask for a gale (u.windTest)
  const windOf = (u) => (u.windTest !== undefined ? u.windTest : u.K.spec.flight.wind === undefined ? 0.5 : u.K.spec.flight.wind);
  M.flyCmd = (u, t) => {
    if (!isDrift(u)) return flyCmd0(u, t);
    const S = u.K.spec, F = S.flight, sw = u.sw; t += u.offset || 0;
    const s = u.sAt(t), dt = 1, sp = (u.sAt(t + dt) - u.sAt(t - dt)) / (2 * dt), p = u.at(s), c0 = course(u, s, 14);
    // the hull turns into the line before it bends: it heads where the line will be heading yawLead seconds on (half of it)
    const lead = F.yawLead === undefined ? 9 : F.yawLead, cL = course(u, u.sAt(t + lead), 14), h0 = c0[0] + 0.5 * LR.wrapPi(cL[0] - c0[0]);
    const cA = course(u, u.sAt(t + lead * 0.5) - 30, 12), cB = course(u, u.sAt(t + lead * 0.5) + 30, 12), kappa = LR.wrapPi(cB[0] - cA[0]) / 60;
    // the wind: long swells and shorter gusts, stronger in a strong wind
    const w = windOf(u), g = 0.55 + 0.9 * w, A = Object.assign({ heave: 0.6, pitch: 1.0, roll: 1.1, yaw: 1.3 }, F.sway || {}), ph = u.phase || 0;
    const wave = (k, a) => Math.sin(sw[k][0] * t + 1.3 + ph * 7 + a) * 0.7 + Math.sin(sw[k][1] * t + 0.4 + ph * 3 + a * 2.1) * 0.3;
    const heave = A.heave * g * wave('heave', 0), pitchS = A.pitch * g * wave('pitch', 0.9), rollS = A.roll * g * wave('roll', 2.2), yawS = A.yaw * g * wave('yaw', 3.7);
    // banked a little into the turn (a pendulum-hung gondola swings out; the hull leans with what the fins and the props ask)
    const bankT = LR.clamp(kappa * 100 * (F.bankK === undefined ? 2.6 : F.bankK), -(F.bankMax || 3.5), F.bankMax || 3.5);
    const fw = [Math.cos(c0[0]), 0, Math.sin(c0[0])], surge = 0.35 * g * Math.sin(sw.surge * t + ph * 5);
    // it noses up a little as a swell lifts it (the gas first), and down as it sinks
    const pitch = (c0[1] * 0.7 + pitchS + 0.5 * g * Math.cos(sw.heave[0] * t + 1.3 + ph * 7) * A.heave + (F.trim || 0)) * D2R, roll = (bankT + rollS) * D2R, h = h0 + yawS * D2R;
    const P = [p[0] + fw[0] * surge, p[1] + heave, p[2] + fw[2] * surge];
    const cmd = { fly: true, drift: true, t, limbs: {}, rate: 1, body: M.bodyFrame(P, h, pitch, roll), h, light: 1, u: s, fix: 0, low: 0, idle: 0, lat: 0, ground: P[1], beat: 0, phase: 0, bank: roll, pitch, speed: sp, kappa, climb: Math.sin(c0[1]), crab: LR.wrapPi(h - c0[0]), heave, wind: w, extras: {}, neck: {}, head: {} };
    // what the command steers: rudders into the turn, elevators against the pitch, the cranes slewing, a windsock in the gusts
    if (F.drive) F.drive(cmd, { t, kappa, pitchS, rollS, yawS, wind: w, g, sw, u });
    return cmd;
  };
  // the numbers a drifting flyer must keep (gym.mjs judge): far over the land under every part of it, banked a few degrees
  // at most, pitched little, turning slowly, really moving with the wind, at the pace it was given, closed and repeatable
  M.auditFly = (u, o = {}) => {
    if (!isDrift(u)) return audit0(u, o);
    const S = u.K.spec, F = S.flight, L = LR.land, dt = o.dt || 0.1, n = Math.ceil(u.lap / dt), kin = u.kin;
    const A = { fly: true, drift: true, unit: u.name, kind: u.kind, tonnes: S.tonnes || 1, lap: u.lap, len: u.len, clear: 1e9, clearAt: null, bankMax: 0, pitchMax: 0, yawRate: 0, crabMax: 0, speedMin: 1e9, speedMax: 0, heave: 0, tilt: 0, spin: 0, load: 1, bankShare: 0, wing: [0, 0, 0, 0], beatShare: 0, glide: 1, bob: 0, cycles: 0, stride: 0, moves: {}, reach: 0 };
    const was = u.windTest; u.windTest = o.wind === undefined ? 1 : o.wind;      // judged in a gale: the most it will ever sway
    let hLo = 1e9, hHi = -1e9, rLo = 1e9, rHi = -1e9, pLo = 1e9, pHi = -1e9, prevH = null;
    const hull = F.hull || [[0, 0, 0]], lagTips = (kin.extras || []).filter((e) => e.type === 'lag');
    for (let i = 0; i <= n; i++) {
      const t = (u.lap * i) / n - (u.offset || 0), c = M.flyCmd(u, t), B = c.body;
      for (const q of hull) { const w = M.apply(B, q), d = w[1] - L.h(w[0], w[2]); if (d < A.clear) { A.clear = d; A.clearAt = [w[0], w[2]]; } }
      A.bankMax = Math.max(A.bankMax, Math.abs(c.bank) / D2R); A.pitchMax = Math.max(A.pitchMax, Math.abs(Math.asin(LR.clamp(B.x[1], -1, 1))) / D2R); A.crabMax = Math.max(A.crabMax, Math.abs(c.crab) / D2R);
      A.speedMin = Math.min(A.speedMin, c.speed); A.speedMax = Math.max(A.speedMax, c.speed);
      if (prevH !== null) A.yawRate = Math.max(A.yawRate, Math.abs(LR.wrapPi(c.h - prevH)) / D2R / (u.lap / n)); prevH = c.h;
      const path = u.at(c.u)[1]; hLo = Math.min(hLo, B.p[1] - path); hHi = Math.max(hHi, B.p[1] - path); rLo = Math.min(rLo, c.bank); rHi = Math.max(rHi, c.bank); pLo = Math.min(pLo, c.pitch); pHi = Math.max(pHi, c.pitch);
    }
    // what hangs: every trailing part's lowest point, from the whole pose (a few hundred samples are enough for a slow thing)
    if (lagTips.length) for (let i = 0; i <= 240; i++) { const t = (u.lap * i) / 240 - (u.offset || 0), r = M.poseAt(u, t); for (const e of lagTips) { const f = r.W[e.name], tip = M.apply(f, [0, e.len || 1, 0]), d = tip[1] - L.h(tip[0], tip[2]); if (d < A.clear) { A.clear = d; A.clearAt = [tip[0], tip[2]]; } } }
    A.heave = hHi - hLo; A.tilt = Math.max(rHi - rLo, pHi - pLo) / D2R;
    for (const e of kin.extras || []) if (e.type === 'spin' && e.rate) A.spin = Math.max(A.spin, Math.abs(e.rate));
    const a = M.poseAt(u, 3.21), b = M.poseAt(u, 3.21), c2 = M.poseAt(u, 3.21 + u.lap); let det = 0, loop = 0; for (const k in a.W) det = Math.max(det, V.len(V.sub(a.W[k].p, b.W[k].p)));
    for (const k in a.W) { const e = kin.extras.find((q) => q.name === k); if (e && e.type === 'spin' && e.rate) continue; const A2 = a.W[k], C2 = c2.W[k]; loop = Math.max(loop, V.len(V.sub(C2.p, A2.p)), 5 * V.len(V.sub(C2.x, A2.x)), 5 * V.len(V.sub(C2.y, A2.y))); }      /* (its place and its turn: an axis off by 1 mrad is 5 mm at a part's end) */      /* (a propeller turns at its own rate: its blades are not on the lap's beat) */
    A.determinism = det; A.loop = loop; u.windTest = was;
    return A;
  };
}
