// Machine Wilds · Nimbus's parts (numbers and line in 28_sky.js).  Body frame: x forward, y up, z right; the envelope's axis
// is the x axis, the gondola's deck 33 m under it.  Everything that gives the size away is here at a person's scale: 1.1 m
// rails, 0.3 m rungs, doors, lanterns, windows, crates — on a thing 130 m long.
V.parts.nimbus = (k) => {
  const S = V.sky3, { R, rad, surf, DECKY, RODS, tipOf, ACC } = S, g = k.g, TAU = Math.PI * 2, F = LR.FLAG;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s], lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]), norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // a sheet through P(u, v) (u, v in 0…1), normals from the surface, each triangle wound to face its normal; out(p) → which way is out
  const grid = (P, nu, nv, o = {}) => { const base = g.n, e = 1e-3, s = 1 / g.tile;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv, p = P(u, v), pu = sub(P(Math.min(1, u + e), v), P(Math.max(0, u - e), v)), pv = sub(P(u, Math.min(1, v + e)), P(u, Math.max(0, v - e)));
      let n = norm(cross(pu, pv)); if (o.out && dot(n, o.out(p)) < 0) n = mul(n, -1); if (o.flip) n = mul(n, -1); g.vert(p[0], p[1], p[2], n[0], n[1], n[2], u * (o.Lu || 1) * s + g.uo, v * (o.Lv || 1) * s + g.vo); }
    const P3 = (q) => [g.P[q * 3], g.P[q * 3 + 1], g.P[q * 3 + 2]];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1, N3 = [g.N[a * 4], g.N[a * 4 + 1], g.N[a * 4 + 2]];
      let cr = cross(sub(P3(b), P3(a)), sub(P3(c), P3(a))); if (len(cr) < 1e-9) cr = cross(sub(P3(d), P3(b)), sub(P3(c), P3(b)));
      if (dot(cr, N3) >= 0) { g.idx(a, b, c); g.idx(b, d, c); } else { g.idx(a, c, b); g.idx(b, c, d); } }
    if (o.two) grid(P, nu, nv, Object.assign({}, o, { two: false, flip: !o.flip })); };
  const outward = (p) => [0, p[1], p[2]];      // away from the envelope's axis
  // a glowing lens (its strength rides the machine's lamps) — a ball, not a disc, so it reads from every side; lamp: also a light
  const glowBall = (bone, at, r, col, w = 1, lamp = null) => { k.bone(bone, () => { const ly = g.layer, seg = k.n(10); g.layer = LR.mat.L('steel'); g.tint = col.map((c) => Math.round(LR.sat(Math.sqrt(LR.sat(c)) * 0.5) * 255)); g.flags = F.LAMP | F.NOWEATHER; g.weight = Math.round(LR.sat(w) * 255); g.aoV = 1;
      g.blob(at[0], at[1], at[2], r, { amp: 0, seg, rings: Math.max(4, seg - 3) }); g.flags = 0; g.weight = 0; g.layer = ly; });
    if (lamp && k.lod === 0) k.lamps.push(Object.assign({ bone: k.kin.index[bone], at: at.slice(), dir: [0, 1, 0], color: col, power: 1, cone: 0, range: 30, beam: false, lens: r, name: '' }, lamp)); };
  const win = (c, nrm, w, h, seed, frame = 'dark') => k.along(c, nrm, (gg) => { if (k.fine) { k.mat(frame); gg.box(0, 0.03, 0, w + 0.16, 0.06, h + 0.16, {}); } gg.mat('glass', { tint: '#47555a', flags: F.WINDOW, seed: seed & 255 }); gg.box(0, 0.075, 0, w, 0.03, h, {}); if (k.fine && w > 0.9) { k.mat(frame); gg.box(0, 0.09, 0, 0.05, 0.02, h, {}); } }, [0, 1, 0]);
  const lantern = (p, r = 0.16) => { g.mat('glass', { tint: '#ffdca6', flags: F.GLOW, weight: 0.9 }); g.blob(p[0], p[1], p[2], r, { amp: 0, seg: k.n(8), rings: 5 }); k.mat('dark'); g.tube([[p[0], p[1] + r * 0.8, p[2]], [p[0], p[1] + r * 1.6, p[2]]], r * 0.35, { sides: 5, caps: true }); };
  const rnd = LR.rng('nimbus-cloth');

  k.bone('body', () => {
    // ── the envelope: twenty gores of canvas, a panel between each pair of hoops, no two panels quite the same cloth ──
    const nG = k.fine ? 4 : k.mid ? 2 : 1, nB = k.fine ? 5 : k.mid ? 2 : 1, gw = TAU / 20, tints = ['#d6ccb4', '#cfc4aa', '#dad2bd', '#c9bfa6', '#d3c8ae', '#c3b99f'], odd = ['#a9a395', '#b8a785', '#9f9a8c', '#c8b48a', '#8f8a7d', '#d9d3c4'];
    const H = V.sky3 && [-58, ...Array.from({ length: 14 }, (_, i) => -58 + (i + 1) * (116 / 14))], secs = [[-65.2, -58, 4], ...H.slice(0, -1).map((x, i) => [x, H[i + 1], nB]), [58, 63.7, 6]];
    if (k.lod === 2) { k.mat('canvas'); grid((u, v) => { const x = LR.lerp(-65.2, 63.7, u), r = rad(x) - 0.15; return [x, r * Math.cos(v * TAU), r * Math.sin(v * TAU)]; }, 22, 12, { out: outward, Lu: 130, Lv: 120 }); }
    else for (let j = 0; j < 20; j++) { const base = tints[j % tints.length];
      secs.forEach(([x0, x1, n], si) => { const h = LR.hash2(j * 31 + 7, si * 17 + 3), tint = h < 0.11 ? odd[Math.floor(LR.hash2(j, si) * odd.length)] : base, shade = 0.95 + 0.08 * LR.hash2(si * 5 + 1, j * 3 + 2);
        k.mat('canvas', { tint: tint, seed: (j * 16 + si) & 255 }); g.tint = g.tint.map((c) => Math.round(LR.clamp(c * shade, 0, 255)));
        grid((u, v) => surf(LR.lerp(x0, x1, u), (j + v) * gw), Math.max(1, Math.round(n * (si === 0 || si === secs.length - 1 ? 1 : 1))), nG, { out: outward, Lu: x1 - x0, Lv: rad((x0 + x1) / 2) * gw }); }); }
    // paint on the cloth: a faded red band behind the nose battens and the hull number on both flanks, in plain segment figures
    if (k.mid) { const band = (x0, x1, tint) => { k.mat('canvas', { tint }); for (let j = 0; j < 20; j++) grid((u, v) => surf(LR.lerp(x0, x1, u), (j + v) * gw, 0.03), 1, nG, { out: outward, Lu: x1 - x0, Lv: 6 }); };
      band(46.5, 49.4, '#7c3424'); band(-49.6, -48.0, '#7c3424');
      const SEGS = { 0: 'abcdef', 7: 'abc' }, paint = (str, xc, side) => { const r0 = rad(xc), W = 4.6, Hh = 8.6, st = 1.05, gap = 1.8, phc = (side * Math.PI) / 2;
        const rect = (u0, u1, v0, v1, uOff) => grid((u, v) => { const uu = uOff + LR.lerp(u0, u1, u), vv = LR.lerp(v0, v1, v) - Hh / 2; return surf(xc + side * uu, phc - side * (vv / r0), 0.05); }, 1, 2, { out: outward, Lu: u1 - u0, Lv: v1 - v0 });
        k.mat('dark', { tint: '#3a332c' }); [...str].forEach((ch, i) => { const o = -((str.length * W + (str.length - 1) * gap) / 2) + i * (W + gap), on = SEGS[ch] || '';
          if (on.includes('a')) rect(0, W, Hh - st, Hh, o); if (on.includes('d')) rect(0, W, 0, st, o); if (on.includes('g')) rect(0, W, Hh / 2 - st / 2, Hh / 2 + st / 2, o);
          if (on.includes('b')) rect(W - st, W, Hh / 2, Hh, o); if (on.includes('c')) rect(W - st, W, 0, Hh / 2, o); if (on.includes('f')) rect(0, st, Hh / 2, Hh, o); if (on.includes('e')) rect(0, st, 0, Hh / 2, o); }); };
      paint('07', 24, 1); paint('07', 24, -1); }
    // patches sewn over tears: a darker hem under, the patch on it; and soot where the rods have been struck
    if (k.mid) { const pr = LR.rng('nimbus-patch'), cols = ['#b39b72', '#a19d92', '#e0d8c2', '#8e877a', '#c2ad86', '#bdb7a8'];
      for (let i = 0; i < 34; i++) { const x = pr.range(-52, 54), phi = pr.range(-2.4, 2.4) + (pr() < 0.3 ? Math.PI : 0), w = pr.range(1.4, 5.5), hh = pr.range(1.2, 4), r = rad(x), dp = hh / r;
        if (r < 6) continue; const P = (lift, k2) => (u, v) => surf(x + (u - 0.5) * w * k2, phi + (v - 0.5) * dp * k2, lift);
        k.mat('rope', { tint: '#6f6656' }); grid(P(0.05, 1.07), 2, 2, { out: outward, Lu: w, Lv: hh }); k.mat('canvas', { tint: cols[i % cols.length], seed: 90 + i }); grid(P(0.08, 1), k.fine ? 3 : 1, k.fine ? 3 : 1, { out: outward, Lu: w, Lv: hh }); } }
    // the iron hoops, proud of the cloth
    if (k.lod < 2) { k.mat('frame'); const nh = k.fine ? 72 : 28; for (const x of H) { const r = rad(x) + 0.14, pts = []; for (let i = 0; i <= nh; i++) { const a = (i / nh) * TAU; pts.push([x, r * Math.cos(a), r * Math.sin(a)]); } g.tube(pts, k.fine ? 0.2 : 0.24, { sides: k.fine ? 5 : 3 }); } }
    // the seams' bolt-ropes and the nose battens
    if (k.fine) { k.mat('rope'); for (let j = 0; j < 20; j++) { const pts = []; for (let x = -57.5; x <= 57.5; x += 1.6) pts.push(surf(x, j * gw, 0.07)); g.tube(pts, 0.075, { sides: 4 }); } }
    if (k.mid) { k.mat('dark'); for (let j = 0; j < 12; j++) { const a = (j / 12) * TAU, pts = []; for (let x = 52; x <= 63.4; x += 0.8) pts.push(surf(x, a, 0.12)); g.tube(pts, 0.16, { sides: 4, caps: true }); }
      for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU, pts = []; for (let x = -64.8; x <= -57; x += 0.8) pts.push(surf(x, a, 0.1)); g.tube(pts, 0.13, { sides: 4, caps: true }); } }
    // the mooring cone at the nose and the tail fitting
    k.mat('steel'); k.along([62.6, 0, 0], [1, 0, 0], (gg) => { gg.lathe(0, 0, [[3.3, 0], [3.0, 0.7], [2.0, 1.6], [0.9, 2.3], [0.35, 2.9], [0.2, 3.4]], { sides: k.n(16) }); k.mat('frame'); gg.lathe(0, 0, [[3.45, -0.1], [3.45, 0.25], [3.2, 0.3]], { sides: k.n(16) }); });
    k.mat('frame'); k.along([-65.6, 0, 0], [-1, 0, 0], (gg) => { gg.lathe(0, 0, [[1.4, 0], [1.2, 0.6], [0.6, 1.2], [0.25, 1.5]], { sides: k.n(12) }); });
    // ── the rope net over the upper envelope, its load band, the crow's feet and the cables the gondola hangs from ──
    const band = 1.84, I = (() => { const a = []; let s = 0; for (let x = -50; x <= 54; x += 0.5) { a.push([x, s]); s += 0.5 / Math.max(4, rad(x)); } return (x) => { const i = LR.clamp(Math.round((x + 50) / 0.5), 0, a.length - 1); return a[i][1]; }; })();
    if (k.fine) { k.mat('rope'); const tanA = 1.05, step = 0.26;
      for (const sgn of [-1, 1]) for (let q = -band - 6.4; q <= band + 0.01; q += step) { let run = [];
        const flush = () => { if (run.length > 1) g.tube(run, 0.065, { sides: 3 }); run = []; };
        for (let x = -48; x <= 52; x += 2) { const phi = q + sgn * I(x) * tanA; if (Math.abs(phi) > band) { flush(); continue; } run.push(surf(x, phi, 0.2)); } flush(); } }
    const feet = [-44, -36, -28, -20, -12, -4, 4, 12, 20, 28, 36, 44], hang = [];
    for (const s of [-1, 1]) { if (k.lod < 2) { k.mat('rope'); const pts = []; for (let x = -49; x <= 53; x += 2) pts.push(surf(x, s * band, 0.24)); g.tube(pts, 0.17, { sides: k.fine ? 5 : 3 }); }
      for (const x of feet) { const r = rad(x), ring = add(surf(x, s * band, 0.3), [0, -3.2, s * -0.4]), gz = x < -24 ? 8.4 : 9.5, end = [x * 0.97 + (x < -24 ? 1 : 0), DECKY + (x < -24 ? 1.15 : 1.2), s * gz];
        if (k.mid) { k.mat('rope'); for (const dx of [-2.6, 0, 2.6]) g.tube([surf(x + dx, s * band, 0.24), ring], 0.06, { sides: 3 }); k.mat('steel'); g.blob(ring[0], ring[1], ring[2], 0.22, { amp: 0, seg: 6, rings: 4 }); }
        k.mat('dark'); g.tube([ring, lerp(ring, end, 0.5), end], k.fine ? 0.085 : 0.12, { sides: k.fine ? 4 : 3 }); hang.push([ring, end]); } }
    // ── lightning rods: a tripod mast on the spine, a copper rod with a crown of points, an insulator stack, guy wires ──
    RODS.forEach((rd, i) => { const b = [rd.x, rd.base, 0], top = [rd.x, rd.base + rd.h, 0], tip = tipOf(rd);
      if (k.lod < 2) { k.mat('frame'); const legs = [[-2.3, -0.13], [2.3, -0.13], [0, 0.15]].map(([dx, dp]) => surf(rd.x + dx, dp * (dx ? 1 : 1) * (dx ? 1 : -1) + (dx ? 0 : 0), 0.15)).map((p, q) => (q === 2 ? surf(rd.x, 0.17, 0.15) : p)); const legs2 = [surf(rd.x - 2.3, -0.12, 0.15), surf(rd.x + 2.3, -0.12, 0.15), surf(rd.x, 0.16, 0.15)];
        for (const p of legs2) g.tube([p, top], 0.17, { sides: k.n(6), caps: true });
        if (k.fine) for (let q = 0; q < 3; q++) { const a = legs2[q], c = legs2[(q + 1) % 3]; for (let f = 0.15; f < 0.9; f += 0.25) g.tube([lerp(a, top, f), lerp(c, top, f + 0.125)], 0.06, { sides: 3 }); }
        k.mat('ceramic'); for (let q = 0; q < 6; q++) { const y = rd.base + 0.4 + q * 0.32; g.lathe(rd.x, 0, [[0.2, y], [0.55, y + 0.06], [0.5, y + 0.14], [0.2, y + 0.2]], { sides: k.n(10) }); }
        k.mat('frame'); g.lathe(rd.x, 0, [[0.05, top[1] - 0.1], [1.0, top[1] - 0.05], [1.0, top[1] + 0.12], [0.05, top[1] + 0.15]], { sides: k.n(10) });
        if (k.fine) { k.mat('steel'); for (const a of [0.4, 2.0, 3.6, 5.2]) g.tube([[rd.x + Math.cos(a) * 0.95, top[1] + 0.15, Math.sin(a) * 0.95], [rd.x + Math.cos(a) * 0.95, top[1] + 1.25, Math.sin(a) * 0.95]], 0.035, { sides: 4 }); }
        // guy wires to the hoops' feet
        if (k.fine) { k.mat('steel'); for (const [dx, ph] of [[-7, 0.5], [7, 0.5], [-7, -0.5], [7, -0.5]]) g.tube([lerp(b, top, 0.82), surf(rd.x + dx, ph, 0.2)], 0.03, { sides: 3 }); } }
      k.mat('copper'); g.tube([[rd.x, rd.base + 0.2, 0], [rd.x, top[1] + 0.2, 0], tip], [0.16, 0.12, 0.05], { sides: k.n(7), caps: true });
      if (k.mid) for (let q = 0; q < 5; q++) { const a = (q / 5) * TAU + i, c = [rd.x, tip[1] - 1.1, 0]; g.tube([c, [rd.x + Math.cos(a) * 0.55, tip[1] - 0.2, Math.sin(a) * 0.55], [rd.x + Math.cos(a) * 0.62, tip[1] + 0.35, Math.sin(a) * 0.62]], [0.05, 0.035, 0.008], { sides: 4 }); }
      // scorch: soot round the foot of the mast and branching burns in the cloth where strikes have run
      if (k.mid) { k.mat('dark', { tint: '#2e2b27' }); grid((u, v) => surf(rd.x + (u - 0.5) * 7, (v - 0.5) * 0.36, 0.06), 3, 3, { out: outward, Lu: 7, Lv: 7 });
        if (k.fine) { const lr = LR.rng('scorch' + i); const burn = (x, ph, dx, dph, n, w) => { const pts = [surf(x, ph, 0.07)]; for (let q = 0; q < n; q++) { x += dx + lr.range(-0.35, 0.35); ph += dph + lr.range(-0.02, 0.02); pts.push(surf(x, ph, 0.07)); if (lr() < 0.25 && w > 0.03) burn(x, ph, dx * 0.8 + lr.range(-0.3, 0.3), dph + lr.range(-0.04, 0.04), Math.floor(n * 0.5), w * 0.65); } g.tube(pts, w, { sides: 3 }); };
          for (let q = 0; q < 5; q++) { const a = (q / 5) * TAU + lr.range(0, 1); burn(rd.x + Math.cos(a) * 2.6, Math.sin(a) * 0.13, Math.cos(a) * 0.55, Math.sin(a) * 0.035, 9, 0.07); } } } });
    // the ridge conductor along the spine on insulator posts, the two descents down the flanks to the accumulator
    k.mat('copper'); const sp = S.spine(); g.tube(sp, 0.13, { sides: k.n(6) }); for (const s of [-1, 1]) g.tube(S.descent(s), 0.12, { sides: k.n(6) });
    if (k.mid) { k.mat('ceramic'); for (let q = 0; q < sp.length; q += 2) { const p = sp[q]; g.lathe(p[0], 0, [[0.12, p[1] - 0.5], [0.2, p[1] - 0.3], [0.12, p[1] - 0.05]], { sides: 6 }); }
      for (const s of [-1, 1]) { const d = S.descent(s), p = d[15]; for (let q = 0; q < 5; q++) { const c = lerp(d[15], d[16], 0.1 + q * 0.12); g.blob(c[0], c[1], c[2], 0.28, { amp: 0, seg: 7, rings: 4, squash: [1, 0.5, 1] }); } } }
    // ── the tail: four fins in an X, canvas in iron frames ──
    for (let i = 0; i < 4; i++) { const th = Math.PI / 4 + (i * Math.PI) / 2, s = [0, Math.cos(th), Math.sin(th)], at = (x, w) => [x, s[1] * w, s[2] * w], wt = 19.5;
      const PL = (u, v) => { const x = LR.lerp(-40.5, -58.4, u), xt = LR.lerp(-51.5, -58.4, u), r = rad(x) - 0.3; return at(LR.lerp(x, xt, v), LR.lerp(r, wt, v)); };
      k.mat('canvas', { tint: i % 2 ? '#cbbfa3' : '#d4c9b0' }); grid(PL, k.fine ? 4 : 1, k.fine ? 3 : 1, { two: true, Lu: 18, Lv: 12 });
      if (k.lod < 2) { k.mat('frame'); g.tube([PL(0, 0), PL(0, 1), PL(1, 1), PL(1, 0)], 0.26, { sides: k.n(6), caps: true }); if (k.mid) for (let f = 0.2; f < 1; f += 0.2) g.tube([PL(f, 0), PL(f, 1)], 0.12, { sides: 4 }); } }
    // ── the gondola: a riveted hull under a planked deck, the landing deck astern, the town on top ──
    const DY = DECKY, n6 = k.n(6);
    k.mat('wood'); g.box(5, DY - 0.25, 0, 58, 0.5, 19.2, { grain: 'x' });
    k.mat('shell'); k.loft('x', [[-24.2, 2.9, 9.55, DY - 3.0, 0, 4], [-20, 3.0, 9.6, DY - 3.05, 0, 4.5], [24, 3.0, 9.6, DY - 3.05, 0, 4.5], [33, 2.9, 9.2, DY - 3.0, 0, 4], [37.5, 2.4, 7.4, DY - 2.6, 0, 3.4], [40.5, 1.2, 3.6, DY - 1.8, 0, 2.6]], { sides: k.n(18) });
    if (k.mid) { k.mat('frame'); for (const s of [-1, 1]) { g.box(5, DY - 0.55, s * 9.62, 58.4, 0.5, 0.25, {}); g.box(5, DY - 3.0, s * 9.66, 56, 0.3, 0.2, {}); }
      for (let x = -20; x <= 32; x += 4) for (const s of [-1, 1]) g.box(x, DY - 3, s * 9.64, 0.3, 5.4, 0.18, {});
      // portholes along the hull, lit at night
      for (let x = -18; x <= 30; x += 4) for (const s of [-1, 1]) win([x + 2, DY - 2.4, s * 9.72], [0, 0, s], 0.7, 0.7, (x * 7 + s * 3) & 255, 'frame'); }
    if (k.fine) for (const s of [-1, 1]) for (const y of [DY - 1.2, DY - 4.6]) k.rivets([-22, y, s * 9.7], [32, y, s * 9.7], 60, 0.04, [0, 0, s]);
    // the keel: a girder under the hull, the hatch the discharge wire comes out of, the anchor's hawse
    k.mat('frame'); g.box(8, DY - 6.0, 0, 46, 0.6, 1.4, {}); k.mat('dark'); g.box(10, DY - 5.9, 0, 2.2, 0.6, 2.2, {}); g.box(34, DY - 5.5, 0, 1.6, 0.8, 1.6, {});
    // the landing deck: steel plate on a truss, open astern, a ring and chevrons painted on it, lamps along its edges
    k.mat('deck'); g.box(-38.2, DY - 0.18, 0, 27.6, 0.36, 17.2, { grain: 'x' });
    // under it, two deep Warren girders along its sides and one down its middle, cross girders, the stern faced in striped plate
    { k.mat('frame'); const x0 = -51.9, x1 = -24.2, top = DY - 0.4, bot = DY - 3.1, nP = 8, px = (x1 - x0) / nP;
      for (const z of [-8.45, 0, 8.45]) { g.box((x0 + x1) / 2, top - 0.15, z, x1 - x0, 0.3, 0.42, {}); g.box((x0 + x1) / 2, bot, z, x1 - x0, 0.36, 0.42, {});
        if (k.lod < 2) for (let q = 0; q <= nP; q++) { const x = x0 + q * px; g.box(x, (top + bot) / 2, z, 0.26, top - bot, 0.3, {}); if (q < nP) g.beam([x, q % 2 ? top : bot, z], [x + px, q % 2 ? bot : top, z], 0.22, 0.22); } }
      if (k.lod < 2) for (let q = 0; q <= nP; q += 2) g.box(x0 + q * px, bot, 0, 0.3, 0.3, 16.9, {});
      k.mat('shell'); for (const s of [-1, 1]) g.box((x0 + x1) / 2, DY - 0.75, s * 8.66, x1 - x0, 0.75, 0.08, {}); g.box(x0 - 0.04, DY - 0.75, 0, 0.08, 0.75, 17.3, {});
      if (k.mid) { k.stripes([x0 - 0.1, DY - 0.75, 0], [-1, 0, 0], 17, 0.7, 14, { up: [0, 1, 0], t: 0.04 }); for (const s of [-1, 1]) k.stripes([-48, DY - 0.75, s * 8.72], [0, 0, s], 6, 0.7, 6, { up: [0, 1, 0], t: 0.04 }); }
      // struts from the gondola's stern up under the deck girders
      k.mat('frame'); for (const s of [-1, 1]) { g.beam([-24.2, DY - 5.0, s * 7.5], [-34, bot, s * 8.45], 0.4, 0.4); g.beam([-24.2, DY - 5.0, s * 3], [-34, bot, 0], 0.35, 0.35); } }
    if (k.mid) { k.mat('paint'); const cx = -38.2, y = DY + 0.012; grid((u, v) => { const r = 5.0 + v * 0.55, a = u * TAU; return [cx + r * Math.cos(a), y, r * Math.sin(a)]; }, k.fine ? 48 : 20, 1, { out: () => [0, 1, 0], Lu: 33, Lv: 0.55 });
      for (const s of [-1, 1]) for (let q = 0; q < 3; q++) { const x0 = -49.5 + q * 2.2; g.poly([[x0, y, s * 0.2], [x0 + 1.4, y, s * 1.6], [x0 + 1.4 - 0.55, y, s * 1.6], [x0 - 0.55, y, s * 0.2]], { hint: [0, 1, 0] }); }
      k.mat('canvas', { tint: '#e6e2d6' }); g.box(cx, y, 0, 0.5, 0.01, 4.2, {}); g.box(cx, y, 0, 4.2, 0.01, 0.5, {});
      k.stripes([-51.85, DY + 0.01, 0], [0, 1, 0], 9, 0.5, 10, { up: [1, 0, 0] }); }
    // the town: the bridge at the bow, the accumulator house astride the street, sheds and houses either side, tanks, lanterns
    const house = (x0, x1, z0, z1, h, o = {}) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0; k.mat(o.wall || 'tin'); g.box(cx, DY + h / 2, cz, w, h, d, { grain: 'y' });
      if (k.mid) { k.mat('frame'); for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) g.box(px, DY + h / 2, pz, 0.28, h + 0.1, 0.28, {}); g.box(cx, DY + h + 0.06, cz, w + 0.3, 0.16, d + 0.3, {}); }
      if (o.roof === 'gable') { const rz = o.ridge === 'z', hh = o.pitch || 1.6; k.mat(o.roofMat || 'rust'); const e = 0.35;
        if (!rz) { for (const s of [-1, 1]) g.poly([[x0 - e, DY + h, cz + s * (d / 2 + e)], [x1 + e, DY + h, cz + s * (d / 2 + e)], [x1 + e, DY + h + hh, cz], [x0 - e, DY + h + hh, cz]], { hint: [0, 1, s * 0.6], two: true }); k.mat(o.wall || 'tin'); for (const x of [x0, x1]) g.poly([[x, DY + h, z0], [x, DY + h, z1], [x, DY + h + hh, cz]], { two: true }); }
        else { for (const s of [-1, 1]) g.poly([[cx + s * (w / 2 + e), DY + h, z0 - e], [cx + s * (w / 2 + e), DY + h, z1 + e], [cx, DY + h + hh, z1 + e], [cx, DY + h + hh, z0 - e]], { hint: [s * 0.6, 1, 0], two: true }); k.mat(o.wall || 'tin'); for (const z of [z0, z1]) g.poly([[x0, DY + h, z], [x1, DY + h, z], [cx, DY + h + hh, z]], { two: true }); } }
      if (k.lod < 2) for (const wd of o.win || []) win(wd[0], wd[1], wd[2] || 1.1, wd[3] || 1.0, wd[4] || 1, o.frame);
      if (k.lod < 2) for (const dr of o.door || []) k.along(dr[0], dr[1], (gg) => { k.mat('wood', { tint: '#6c5a45' }); gg.box(0, 0.05, 0.95, 1.0, 0.1, 1.9, {}); k.mat('steel'); gg.box(0.32, 0.12, 0.95, 0.06, 0.06, 0.06, {}); }, [0, 1, 0]); };
    // the bridge: a lower deck house and the wheelhouse on it with windows all round its front, its roof a platform
    house(20, 34, -8, 8, 4.2, { wall: 'shell', frame: 'frame', win: [[[34.02, DY + 2.4, -4.5], [1, 0, 0], 1.4, 1.1, 11], [[34.02, DY + 2.4, 0], [1, 0, 0], 1.4, 1.1, 12], [[34.02, DY + 2.4, 4.5], [1, 0, 0], 1.4, 1.1, 13], [[26, DY + 2.4, -8.02], [0, 0, -1], 1.2, 1.0, 14], [[30, DY + 2.4, 8.02], [0, 0, 1], 1.2, 1.0, 15], [[23, DY + 2.4, 8.02], [0, 0, 1], 1.2, 1.0, 16]], door: [[[20.0, DY, 0], [-1, 0, 0]]] });
    k.mat('shell'); g.box(28.5, DY + 4.2 + 1.6, 0, 9, 3.2, 12, {}); k.mat('frame'); g.box(28.5, DY + 7.5, 0, 9.6, 0.25, 12.6, {});
    if (k.lod < 2) { for (let q = 0; q < 5; q++) win([33.03, DY + 6.0, -4.8 + q * 2.4], [1, 0, 0], 2.0, 1.5, 20 + q); for (const s of [-1, 1]) for (let q = 0; q < 3; q++) win([25.5 + q * 2.6, DY + 6.0, s * 6.03], [0, 0, s], 2.0, 1.4, 30 + q + (s > 0 ? 3 : 0)); }
    k.rail([[24.2, DY + 7.62, -6.2], [33.2, DY + 7.62, -6.2], [33.2, DY + 7.62, 6.2], [24.2, DY + 7.62, 6.2]], 1.0);
    k.mat('frame'); g.tube([[26, DY + 7.6, -2.2], [26, DY + 15.8, -2.2]], 0.1, { sides: 5, caps: true }); g.tube([[31, DY + 7.6, 2.4], [31, DY + 13.4, 2.4]], 0.07, { sides: 4, caps: true });
    if (k.fine) { k.mat('steel'); g.tube([[26, DY + 15.4, -2.2], [-2, DY + 12.2, -2.4]], 0.02, { sides: 3 }); g.tube([[31, DY + 13.2, 2.4], [-6, DY + 9.8, 2.6]], 0.02, { sides: 3 }); }
    k.mat('frame'); g.lathe(29.5, 0, [[0.9, DY + 7.6], [0.7, DY + 8.6], [0.4, DY + 9.6]], { sides: n6 });
    // the accumulator house: astride the street (an arch to walk through), where the conductors come down; glass jars on its roof
    k.mat('shell', { tint: '#5d6058' }); g.box(9.5, DY + 4.3, -5.8, 13, 8.6, 6.8, {}); g.box(9.5, DY + 4.3, 5.8, 13, 8.6, 6.8, {}); g.box(9.5, DY + 6.5, 0, 13, 4.2, 4.8, {});
    k.mat('frame'); g.box(9.5, DY + 8.7, 0, 13.4, 0.22, 19.2, {}); for (const x of [3.1, 15.9]) for (const z of [-9.1, -2.45, 2.45, 9.1]) g.box(x, DY + 4.3, z, 0.3, 8.6, 0.3, {});
    if (k.lod < 2) { for (const s of [-1, 1]) { k.stripes([15.92, DY + 3.6, s * 2.42], [1, 0, 0], 4.2, 0.4, 8, { up: [0, 1, 0] }); win([9.5, DY + 6.8, s * 9.22], [0, 0, s], 1.6, 0.9, 40 + s); win([5.5, DY + 6.8, s * 9.22], [0, 0, s], 1.6, 0.9, 42 + s); win([13.5, DY + 6.8, s * 9.22], [0, 0, s], 1.6, 0.9, 44 + s); }
      k.gauge([15.95, DY + 6.4, -5.6], [1, 0, 0], 0.5); k.gauge([15.95, DY + 6.4, 5.6], [1, 0, 0], 0.5); k.jbox([15.95, DY + 2.2, -6.6], [1, 0, 0], 1.0, 1.4, 0.4); }
    k.mat('copper'); g.box(9.5, DY + 9.15, 0, 11, 0.24, 0.5, {});
    for (let q = 0; q < 6; q++) { const x = 5 + q * 1.8, z = q % 2 ? 1.2 : -1.2; k.mat('steel'); g.lathe(x, z, [[0.75, DY + 8.8], [0.75, DY + 9.1], [0.62, DY + 9.15]], { sides: n6 });
      g.mat('glass', { tint: '#6f8a94' }); g.lathe(x, z, [[0.62, DY + 9.15], [0.64, DY + 10.6], [0.5, DY + 11.4], [0.2, DY + 11.6]], { sides: k.n(10) }); k.mat('copper'); g.tube([[x, DY + 11.5, z], [x, DY + 12.2, z]], 0.08, { sides: 4, caps: true }); }
    for (let q = 0; q < 6; q++) glowBall('body', [5 + q * 1.8, DY + 10.1, q % 2 ? 1.2 : -1.2], 0.42, [0.35, 0.65, 1.0], 0.35);
    for (const s of [-1, 1]) { k.mat('ceramic'); for (let q = 0; q < 7; q++) { const y = DY + 8.85 + q * 0.34; g.lathe(ACC[0] - 1.5, s * 3.2, [[0.2, y], [0.6, y + 0.07], [0.55, y + 0.16], [0.2, y + 0.24]], { sides: k.n(10) }); } }
    // port: a store shed, the workshop (two floors, a stove pipe); starboard: water tanks, the crew house, a shed
    house(-22, -13, -9.2, -2.6, 4.2, { roof: 'gable', roofMat: 'rust', win: [[[-17.5, DY + 2.4, -2.58], [0, 0, 1], 1.0, 0.8, 50]], door: [[[-15, DY, -2.58], [0, 0, 1]]] });
    house(-11, 1, -9.2, -2.6, 6.6, { roof: 'gable', ridge: 'z', pitch: 2.0, wall: 'wood', roofMat: 'tin', win: [[[-8, DY + 1.8, -2.58], [0, 0, 1], 1.2, 1.0, 51], [[-2, DY + 1.8, -2.58], [0, 0, 1], 1.2, 1.0, 52], [[-8, DY + 4.8, -2.58], [0, 0, 1], 1.2, 1.0, 53], [[-2, DY + 4.8, -2.58], [0, 0, 1], 1.2, 1.0, 54], [[1.02, DY + 4.8, -6], [1, 0, 0], 1.0, 1.0, 55]], door: [[[-5, DY, -2.58], [0, 0, 1]]] });
    k.stack([-9, DY + 6.6, -7.8], [-9, DY + 10.6, -7.8], 0.28);
    for (const x of [-20.5, -16.2]) { k.tank([x, DY + 1.0, 6.4], [x, DY + 5.6, 6.4], 1.9, { role: 'shell' }); if (k.mid) { k.mat('frame'); for (const s of [-1, 1]) g.box(x + s * 1.3, DY + 0.5, 6.4, 0.2, 1.0, 3.2, {}); } }
    house(-13, -3, 2.6, 9.2, 5.2, { roof: 'gable', pitch: 2.2, wall: 'wood', roofMat: 'rust', win: [[[-10.5, DY + 2.6, 2.58], [0, 0, -1], 1.1, 1.0, 60], [[-5.5, DY + 2.6, 2.58], [0, 0, -1], 1.1, 1.0, 61], [[-13.02, DY + 2.6, 5.9], [-1, 0, 0], 1.0, 1.0, 62]], door: [[[-8, DY, 2.58], [0, 0, -1]]] });
    k.stack([-5, DY + 5.2, 7.2], [-5, DY + 8.4, 7.2], 0.2);
    house(-1.2, 2.0, 3.4, 9.2, 3.6, { roof: 'gable', roofMat: 'tin', door: [[[0.4, DY, 3.38], [0, 0, -1]]] });
    // vents on the roofs (their fans turn), a ladder up the suspension, crates, barrels and coiled rope in the street
    if (k.lod < 2) { k.mat('frame'); g.lathe(-8, -5.5, [[0.8, DY + 7.0], [0.8, DY + 7.5]], { sides: n6 }); g.lathe(-17, 5.6, [[0.7, DY + 4.6], [0.7, DY + 5.05]], { sides: n6 }); g.lathe(13, 6.6, [[0.7, DY + 8.8], [0.7, DY + 9.95]], { sides: n6 });
      k.ladder([-8.6, DY + 6.8, -2.8], [-8.6, DY + 12.5, -2.8], 0.6, [0, 0, 1]); }
    if (k.mid) { const cr = LR.rng('nimbus-crates'); for (let q = 0; q < 14; q++) { const x = cr.range(-23, 19), z = (cr() < 0.5 ? -1 : 1) * cr.range(1.0, 2.0), s = cr.range(0.6, 1.1); if (x > 2.5 && x < 16.5) continue;
        if (cr() < 0.55) { k.mat('wood', { tint: cr() < 0.5 ? '#8a7457' : '#6f5f4a' }); g.box(x, DY + s / 2, z, s, s, s * cr.range(0.8, 1.3), { soft: 0.05 }); } else { k.mat(cr() < 0.5 ? 'rust' : 'shell'); g.lathe(x, z, [[0.3, DY], [0.33, DY + 0.45], [0.3, DY + 0.9]], { sides: k.n(9) }); } }
      // the landing deck's things: a bollard each corner, a coil of rope, a tool chest by the town
      k.mat('frame'); for (const [x, z] of [[-51.3, -8.2], [-51.3, 8.2], [-25.0, -8.2]]) g.lathe(x, z, [[0.22, DY], [0.18, DY + 0.5], [0.3, DY + 0.6]], { sides: k.n(8) }); }
    // lantern posts down the street and a string of lights across it
    for (const [x, s] of [[-21, -1], [-14, 1], [-7, -1], [0, 1], [18, -1], [-26, 1], [-26, -1]]) { k.mat('frame'); g.tube([[x, DY, s * 2.2], [x, DY + 3.2, s * 2.2], [x, DY + 3.4, s * 1.7]], 0.07, { sides: 4, caps: true }); lantern([x, DY + 3.1, s * 1.7]); }
    if (k.fine) for (const [x0, x1] of [[-21, -14], [-14, -7], [-7, 0]]) { const a = [x0, DY + 3.3, -1.7], b = [x1, DY + 3.3, 1.7]; k.mat('dark'); const pts = []; for (let q = 0; q <= 8; q++) { const p = lerp(a, b, q / 8); p[1] -= Math.sin((Math.PI * q) / 8) * 0.5; pts.push(p); } g.tube(pts, 0.015, { sides: 3 }); for (let q = 1; q < 8; q += 2) lantern(pts[q], 0.07); }
    // rails round the decks: a gap astern and to port on the landing deck to come in by
    k.rail([[-24.1, DY, -8.5], [-28, DY, -8.5], [-33, DY, -8.5]], 1.1); k.rail([[-42, DY, -8.5], [-46.5, DY, -8.5], [-51.6, DY, -8.5], [-51.6, DY, -4.6]], 1.1);
    k.rail([[-51.6, DY, 4.6], [-51.6, DY, 8.5], [-46, DY, 8.5], [-40, DY, 8.5], [-34, DY, 8.5], [-28, DY, 8.5], [-24.1, DY, 8.5]], 1.1);
    k.rail([[-23.9, DY, 9.5], [-21, DY, 9.5]], 1.1); k.rail([[-12.8, DY, -9.5], [-11.2, DY, -9.5]], 1.1); k.rail([[1.2, DY, -9.5], [3.0, DY, -9.5]], 1.1); k.rail([[16.0, DY, 9.5], [20, DY, 9.5]], 1.1); k.rail([[16.0, DY, -9.5], [20, DY, -9.5]], 1.1); k.rail([[2.2, DY, 9.5], [3.0, DY, 9.5]], 1.1);
    // the landing deck's lamps along its rails, its floodlight on a pole, the windsock's mast
    if (k.fine) { for (const s of [-1, 1]) for (let x = -50.5; x <= -26; x += 4.1) glowBall('body', [x, DY + 0.12, s * 8.25], 0.09, [1.0, 0.55, 0.14], 0.5);
      for (let z = -3.4; z <= 3.41; z += 1.7) glowBall('body', [-51.35, DY + 0.12, z], 0.09, [0.2, 1.0, 0.35], 0.6); }
    k.mat('frame'); g.tube([[-25.4, DY, 8.6], [-25.4, DY + 7.0, 8.6], [-26.2, DY + 7.3, 8.0]], 0.1, { sides: 5, caps: true }); k.lamp('body', { name: 'flood', at: [-26.3, DY + 7.2, 7.9], dir: [-0.71, -0.55, -0.44], color: [1.0, 0.86, 0.66], power: 55, cone: 34, range: 30, lens: 0.3 });
    k.mat('frame'); g.tube([[-50.6, DY, -7.7], [-50.6, DY + 6.7, -7.7]], 0.08, { sides: 5, caps: true });
    // ── the engine cars on their outriggers either side, the pushers behind them ──
    for (const x of [14, -12]) for (const s of [-1, 1]) { const e = [x, DY + 4.4, s * 23]; k.mat('frame');
      g.beam([x + 1.5, DY - 1.4, s * 9.6], [x + 1.0, e[1] - 0.6, s * 21.6], 0.5, 0.7); g.beam([x - 1.5, DY - 1.4, s * 9.6], [x - 1.0, e[1] - 0.6, s * 21.6], 0.5, 0.7); g.beam([x, DY + 1.0, s * 9.6], [x, e[1] + 0.3, s * 21.6], 0.4, 0.5);
      if (k.fine) for (let f = 0.15; f < 0.95; f += 0.2) g.tube([lerp([x + 1.5, DY - 1.4, s * 9.6], [x + 1.0, e[1] - 0.6, s * 21.6], f), lerp([x, DY + 1.0, s * 9.6], [x, e[1] + 0.3, s * 21.6], f + 0.1)], 0.07, { sides: 3 });
      k.mat('shell'); k.along([x + 3.9, e[1], e[2]], [-1, 0, 0], (gg) => { gg.lathe(0, 0, [[0.3, 0], [1.3, 0.25], [1.62, 1.2], [1.65, 5.2], [1.3, 7.0], [0.55, 7.7]], { sides: k.n(14) }); });
      if (k.mid) { k.mat('dark'); k.grille([x + 3.95, e[1], e[2]], [1, 0, 0], 1.6, 1.6, { up: [0, 1, 0] }); k.mat('rust'); for (const q of [-0.5, 0.5]) k.stack([x + q * 2, e[1] + 1.4, e[2] + s * 0.4], [x + q * 2 - 0.6, e[1] + 2.9, e[2] + s * 0.6], 0.16, { role: 'rust' }); if (k.fine) k.ladder([x, e[1] - 1.6, s * 21.6], [x, e[1] - 1.6, s * 10.2], 0.5, [0, 1, 0]); } }
    // the bridge's beacons and the others' housings
    for (const b of V.skyBeacons) { k.mat('dark'); g.lathe(b[0], b[2], [[0.32, b[1] - 0.55], [0.36, b[1] - 0.3], [0.2, b[1] - 0.25]], { sides: k.n(8) }); glowBall('body', b, 0.24, [1.0, 0.07, 0.03], 1, { power: 1.6, range: 36, name: 'beacon' }); }
    // what the walker steps off onto the town: the street from the landing deck in through the sheds to the arch
  });
  // the propellers: four blades of laminated wood with a twist and brass tips, on a hub
  for (const n of ['prop_PF', 'prop_SF', 'prop_PA', 'prop_SA']) k.bone(n, () => { k.mat('steel'); g.lathe(0, 0, [[0.6, -0.9], [0.62, 0.3], [0.2, 0.9]].map(([r, y]) => [r, y]), { sides: k.n(10) });
    k.along([0, 0, 0], [1, 0, 0], (gg) => { k.mat('steel'); gg.lathe(0, 0, [[0.55, -0.6], [0.6, 0.2], [0.3, 0.8], [0.05, 1.0]], { sides: k.n(10) }); });
    for (let b = 0; b < 4; b++) { const a = (b / 4) * TAU, ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => { const r = 0.5 + u * 3.3, ch = (0.62 - 0.32 * u) * (1 - Math.pow(u, 8) * 0.5), tw = (28 - 20 * u) * (Math.PI / 180), c = (v - 0.4) * ch; return [Math.sin(tw) * c, ca * r - sa * Math.cos(tw) * c, sa * r + ca * Math.cos(tw) * c]; };
      k.mat('wood', { tint: '#7b5a3c' }); grid(P, k.fine ? 6 : 2, 1, { two: true, Lu: 3.3, Lv: 0.6 }); if (k.mid) { k.mat('copper'); grid((u, v) => P(0.86 + u * 0.14, v), 1, 1, { two: true }); } } });
  // the tail's steered vanes: a frame with canvas, hinged on the fin's trailing edge (local: x aft, y along the span)
  for (let i = 0; i < 4; i++) k.bone('vane_' + i, () => { const r0 = rad(-58.6) - 0.2, L = 19.5 - r0; k.mat('canvas', { tint: '#c9bea4' }); grid((u, v) => [0.15 + v * 4.6, 0.3 + u * (L - 0.6), 0], k.fine ? 3 : 1, 1, { two: true, Lu: L, Lv: 4.6 });
    if (k.lod < 2) { k.mat('frame'); g.tube([[0, 0, 0], [0, L, 0], [4.8, L - 0.6, 0], [4.8, 0.4, 0]], 0.18, { sides: k.n(5), caps: true }); } });
  // the cranes: a slewing post, a lattice jib out over the rail, a winch; the hook on its rope (the rope is the hook's bone)
  for (const [n, s, jl] of [['crane_P', -1, 11.2], ['crane_S', 1, 11.2]]) k.bone(n, () => { k.mat('paint'); g.lathe(0, 0, [[0.9, 0], [0.9, 0.5], [0.55, 0.7]], { sides: k.n(10) }); k.mat('frame'); g.box(0, 3.0, 0, 0.7, 6, 0.7, {});
    const root = [0, 5.4, 0], tip = [0, 7.6, s * jl]; k.mat('paint'); for (const dx of [-0.35, 0.35]) g.tube([[dx, 5.0, s * 0.3], [dx * 0.4, tip[1] + 0.1, tip[2]]], 0.1, { sides: 4, caps: true }); g.tube([[0, 5.9, s * 0.3], [0, tip[1] + 0.35, tip[2]]], 0.09, { sides: 4, caps: true });
    if (k.fine) for (let f = 0.1; f < 0.95; f += 0.12) g.tube([lerp([-0.35, 5.0, s * 0.3], [0, tip[1] + 0.1, tip[2]], f), lerp([0, 5.9, s * 0.3], [0, tip[1] + 0.35, tip[2]], f + 0.06)], 0.04, { sides: 3 });
    k.mat('dark'); g.box(0, 4.2, -s * 0.9, 1.2, 1.2, 1.0, {}); k.mat('steel'); g.tube([[0, 6.4, 0], [0, tip[1], tip[2]]], 0.025, { sides: 3 }); });
  for (const [n, L] of [['hook_P', 9], ['hook_S', 6.5]]) k.bone(n, () => { k.mat('steel'); g.tube([[0, 0, 0], [0, L, 0]], 0.03, { sides: 3 }); k.mat('paint'); g.box(0, L + 0.2, 0, 0.35, 0.4, 0.35, {}); k.mat('steel'); g.tube([[0, L + 0.35, 0], [0, L + 0.7, 0], [0.18, L + 0.85, 0]], 0.05, { sides: 4 });
    if (n === 'hook_P') { k.mat('wood', { tint: '#7a6750' }); g.box(0, L + 1.6, 0, 1.4, 1.1, 1.0, {}); k.mat('rope'); for (const s of [-1, 1]) g.tube([[0, L + 0.6, 0], [s * 0.65, L + 1.06, 0]], 0.02, { sides: 3 }); } });
  // the anchor chain and the discharge wire with its weight
  for (let j = 0; j < 3; j++) { k.bone('anchor_' + j, () => { k.mat('dark'); g.tube([[0, 0, 0], [0, 12, 0]], 0.09, { sides: 4 }); if (k.fine) { k.mat('steel'); for (let y = 0.4; y < 12; y += 0.8) g.box(0, y, 0, 0.06, 0.6, 0.28, {}); } if (j === 2) { k.mat('rust'); g.tube([[0, 11.6, 0], [0, 13.4, 0]], 0.16, { sides: 5, caps: true }); for (let q = 0; q < 4; q++) { const a = (q / 4) * TAU + 0.4; g.tube([[0, 13.2, 0], [Math.cos(a) * 0.9, 13.4, Math.sin(a) * 0.9], [Math.cos(a) * 1.1, 12.7, Math.sin(a) * 1.1]], 0.1, { sides: 4, caps: true }); } } });
    k.bone('wire_' + j, () => { k.mat('copper'); g.tube([[0, 0, 0], [0, 16, 0]], 0.06, { sides: 4 }); if (j === 2) { k.mat('dark'); g.lathe(0, 0, [[0.05, 15.6], [0.7, 16.2], [0.75, 16.9], [0.3, 17.6], [0.05, 17.8]], { sides: k.n(10) }); k.mat('copper'); for (let q = 0; q < 6; q++) { const a = (q / 6) * TAU; g.tube([[0, 17.5, 0], [Math.cos(a) * 0.6, 18.4, Math.sin(a) * 0.6]], 0.03, { sides: 3 }); } } }); }
  // the windsock: striped, on its swivel at the top of the mast (built pointing forward; the command turns it astern)
  k.bone('sock', () => { k.mat('frame'); g.tube([[0, 0, 0], [0.4, 0, 0]], 0.06, { sides: 4 }); g.tube([[0.4, -0.45, 0], [0.4, 0.45, 0]], 0.03, { sides: 4 }); for (let q = 0; q < 5; q++) { const x0 = 0.45 + q * 0.62, r0 = 0.45 - q * 0.05, r1 = 0.45 - (q + 1) * 0.05; g.mat('cloth', { tint: q % 2 ? '#e8e4da' : '#e2621c' }); k.along([x0, -q * 0.07, 0], [1, -0.11, 0], (gg) => gg.lathe(0, 0, [[r0, 0], [r1, 0.62]], { sides: k.n(10) })); } });
  // the searchlight on the bridge roof: a drum on a yoke, tilted down at the valley; it sweeps
  k.bone('search', () => { k.mat('frame'); g.box(0, 0.5, 0, 0.3, 1.0, 1.6, {}); k.along([-0.4, 0.95, 0], [0.85, -0.53, 0], (gg) => { k.mat('dark'); gg.lathe(0, 0, [[0.4, -0.2], [0.62, 0.2], [0.66, 1.1], [0.6, 1.25]], { sides: k.n(12) }); });
    k.lamp('search', { name: 'search', at: [0.22, 0.6, 0], dir: [0.85, -0.53, 0], color: [1.0, 0.93, 0.8], power: 320, cone: 5.5, range: 340, lens: 0.58 }); });
  k.bone('anemo', () => { k.mat('steel'); for (let q = 0; q < 3; q++) { const a = (q / 3) * TAU; g.tube([[0, 0, 0], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]], 0.02, { sides: 3 }); g.blob(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55, 0.09, { amp: 0, seg: 6, rings: 4 }); } });
  for (let i = 0; i < 3; i++) k.bone('fan_' + i, () => { k.mat('steel'); for (let q = 0; q < 5; q++) { const a = (q / 5) * TAU; g.poly([[0, 0.05, 0], [Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62], [Math.cos(a + 0.5) * 0.62, 0.0, Math.sin(a + 0.5) * 0.62]], { two: true }); } });
  // the beacons' shades: a hood round each red lens with one window, turning — from anywhere it flashes as the window passes
  for (let i = 0; i < V.skyBeacons.length; i++) k.bone('shade_' + i, () => { k.mat('dark'); grid((u, v) => { const a = 0.9 + u * (TAU - 1.8); return [Math.cos(a) * 0.34, -0.3 + v * 0.62, Math.sin(a) * 0.34]; }, k.n(8), 1, { two: true, Lu: 1.5, Lv: 0.6 }); g.lathe(0, 0, [[0.36, 0.3], [0.2, 0.42]], { sides: k.n(8) }); });
};
