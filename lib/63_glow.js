// machine-wilds · 63_glow — light that glows: things hot or charged enough to bloom (lib/75_post blooms what is brighter than
// about 1 before exposure, so everything here is drawn in HDR, tens of times that at its core).
//   · faults: now and then thin blue-white arcs crackle over a machine's body — the walker's and every other's.  No two alike:
//     a crawl over the skin that slides as it lives, a run down a limb, a ring round it, a leap across the gap to the next
//     part, a snap of a frame or two; each arc with its own moment in the burst, its own curve, jaggedness, branches, width
//     and the rate it re-jags at.  Each machine has a character (the colour it burns, cyan-blue to violet-blue; the kinds it
//     throws; how wild, branched and thick), and each burst a rhythm (a few hard pops, a stutter, a surge that holds and
//     dies).  A small blue light on what is near, its lamps stutter, its skin glows with it.  The walker: every 3–7 s, more
//     often and stronger for a while after a hard landing and while it runs; calm when it stands, never quite gone.
//   · lightning in rain: a far branching bolt in the sky (2–4 frames, a double flicker) and the whole scene lit by it for
//     those frames (the flash every pass already reads: uWx2.w — sky, air and a cool fill on every surface)
//   · dust that shows in a lamp's beam; a few warm motes drifting in the mist after dark
// All of it from the clock: when a burst or a strike is, is a hash of the time slot it falls in, so a film frame draws the
// same picture whenever it is drawn.  A realm (or its film) can add strikes of its own: LR.vfx.bolts = [clock times].
//   LR.vfx.arcAt(time) → the walker's burst at that time (or null) · LR.vfx.boltAt(time) → the strike lighting that time (or null)
{
  const T = THREE, VX = LR.vfx, GL = (VX.glow = { parts: {} });
  const h1 = (a, b = 0) => LR.hash2(Math.floor(a) * 7919 + 13, b * 104729 + 7);
  VX.bolts = VX.bolts || [];
  VX.faultQ = +(LR.q && LR.q('fault')) || 0;      // ?fault=4: every machine's faults four times as often, to look at them live (a film's shot says fault: k)

  // ── when ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  // the walker's fault: a slow round always (a burst somewhere in each 5 s), and a quick one while it is shaken (after a hard
  // landing, or running) — each slot of 1.4 s has a burst with the chance of how shaken it is
  const burstIn = (time, S, salt, chance, len) => { const k = Math.floor(time / S); for (const kk of [k, k - 1]) { if (h1(kk, salt + 3) >= chance) continue; const t0 = kk * S + h1(kk, salt) * (S - 0.6), dur = len[0] + (len[1] - len[0]) * h1(kk, salt + 1); if (time >= t0 && time < t0 + dur) return { t0, dur, seed: (kk * 31 + salt) % 9973, k: kk }; } return null; };
  GL.shaken = (time) => { let s = 0; for (const b of VX.bursts) if ((b.kind === 'land' || b.kind === 'landwet') && time >= b.t && time - b.t < 3.5 && b.o && b.o.walker) s = Math.max(s, 1 - (time - b.t) / 3.5); const av = LR.mech && LR.mech.units.find((u) => u.avatar); const sp = av && av.av ? av.av.sp : 0; return Math.max(s, LR.sat((sp - 3.5) / 2.5) * 0.55); };
  GL.landedAt = (time) => { let t = null; for (const b of VX.bursts) if (b.o && b.o.walker && (b.kind === 'land' || b.kind === 'landwet') && time >= b.t && time - b.t < 0.6) t = b.t; return t; };
  VX.arcAt = (time) => { const tl = GL.landedAt(time); if (tl !== null && time - tl < 0.5) return { t0: tl, dur: 0.5, seed: Math.round(tl * 24) % 9973, k: Math.round(tl * 24), power: 1.25, n: 3 };      // (a hard landing shakes it at once)
    const sh = GL.shaken(time), fk = (LR.cine && LR.cine.fault) || VX.faultQ, a = burstIn(time, 5 / (1 + fk), 11, 1, [0.1, 0.7 + 0.15 * Math.min(fk, 2)]), b = sh > 0.02 ? burstIn(time, 1.4, 23, sh, [0.15, 0.5]) : null, r = b || a; if (!r) return null; r.power = b ? 0.7 + 0.5 * sh : 0.75; r.n = 1 + Math.floor(h1(r.k, 41 + (b ? 1 : 0)) * (b ? 3 : 2)); return r; };
  // every other machine has its faults too, on a beat of its own: K.spec.fault seconds between them (the old and the
  // big crackle more often; 0: never), a film's fault: k makes them all come 1 + k times as often
  const nameSalt = (u) => { let h = 7; for (let i = 0; i < u.name.length; i++) h = (h * 31 + u.name.charCodeAt(i)) % 9973; return h; };
  VX.faultAt = (u, time) => { if (u.avatar) return VX.arcAt(time); const K = u.K.spec, S0 = K.fault !== undefined ? K.fault : (K.tonnes || 50) > 1000 ? 6 : 11; if (!S0) return null;
    const fk = (LR.cine && LR.cine.fault) || VX.faultQ, salt = u.salt || (u.salt = nameSalt(u)), r = burstIn(time, S0 / (1 + fk), salt, 0.8, [0.12, 0.95]); if (!r) return null; r.power = 0.85 + 0.3 * h1(r.k, salt + 6); r.n = 1 + Math.floor(h1(r.k, salt + 5) * 3); return r; };
  // lightning: one strike somewhere in each 8 s of heavy rain, and the realm's own (VX.bolts)
  VX.boltAt = (time) => { if (LR.wx.rain < 0.55) return null; const k = Math.floor(time / 8); for (const kk of [k, k - 1]) { if (h1(kk, 71) > 0.8) continue; const t0 = kk * 8 + 1 + 5.5 * h1(kk, 72); if (time >= t0 && time < t0 + 0.3) return { t0, seed: kk % 977 }; }
    for (const t0 of VX.bolts) if (time >= t0 && time < t0 + 0.3) return { t0, seed: Math.round(t0 * 10) % 977 }; return null; };
  // the flash of a strike, frame by frame at 24 a second: on, nearly off, on again, a tail
  const FL = [1.0, 0.22, 0.85, 0.35, 0.1, 0.03, 0];
  GL.flashOf = (b, time) => { if (!b) return 0; const a = (time - b.t0) * 24, i = Math.floor(a), f = a - i; return LR.lerp(FL[Math.min(i, 6)], FL[Math.min(i + 1, 6)], LR.RENDER ? 0 : f * 0.3); };

  // ── shaders ──
  // a jagged line between A and B as camera-facing segments: a white-hot core and a soft glow round it.  Each instance is one
  // segment: (strand, segment index, segments in the strand, 0: pinned at both ends / 1: a branch, free at its end)
  const RIBBON = `
// the line's points: a random walk across it, pulled back so a pinned strand ends where it should
vec3 jag(vec3 A, vec3 B, float i, float n, float seed, float amp, bool pinned, vec3 side1, vec3 side2){
  vec2 acc = vec2(0.0), all = vec2(0.0);
  for (int m = 0; m < 32; m++) { if (float(m) >= n) break; vec2 r = hash22(vec2(seed * 1.37 + float(m) * 7.31, seed * 0.71 + 3.3)) - 0.5; if (float(m) < i) acc += r; all += r; }
  if (pinned) acc -= all * i / n;
  return mix(A, B, i / n) + (side1 * acc.x + side2 * acc.y) * amp; }
`;

  GL.init = () => {
    if (LR.off.has('fx') || LR.off.has('vfx') || !VX.NS) return;
    const q = VX.q, mk = VX.mk;
    // ── the arcs, as a game draws them (S.T.A.L.K.E.R. 2's bolts, Niagara's electrocution): up to 12 at once, each a trunk of 10
    // segments along a curve (a crawl over the skin, a run down a limb, a ring round it, a leap across a gap, a snap), up to two
    // short branches that taper, a white-hot core with a saturated blue glow round it, a bright point where it meets the skin.
    // Every arc has its own curve, jaggedness, branches, width, colour and the rate it re-jags at (GL.update) ──
    { const NA = 12, SEG = 10, BR = 4, NBR = 2, per = SEG + NBR * BR + 2, V4 = () => Array.from({ length: NA }, () => new T.Vector4()), U = (GL.arcU = { uArcA: { value: V4() }, uArcB: { value: V4() }, uArcM: { value: V4() }, uArcC: { value: V4() }, uJag: { value: 0 } });
      const g = VX.quad(); VX.inst(g, 'seg', NA * per, 4, (a, i) => { const s = Math.floor(i / per), r = i % per; a[i * 4] = s;
        if (r < SEG) { a[i * 4 + 1] = r; a[i * 4 + 2] = SEG; a[i * 4 + 3] = 0; } else if (r < SEG + NBR * BR) { const b = Math.floor((r - SEG) / BR); a[i * 4 + 1] = (r - SEG) % BR; a[i * 4 + 2] = BR; a[i * 4 + 3] = 1 + b; } else { a[i * 4 + 1] = 0; a[i * 4 + 2] = 1; a[i * 4 + 3] = 9 + (r - SEG - NBR * BR); } });
      mk('arcs', g, RIBBON + `
in vec3 position; in vec4 seg; uniform vec4 uArcA[${NA}], uArcB[${NA}], uArcM[${NA}], uArcC[${NA}]; uniform float uJag; out vec2 vQ; out float vI; out float vCore; out float vH;
vec3 bez(vec3 A, vec3 M, vec3 B, float t){ float s = 1.0 - t; return A * s * s + M * 2.0 * s * t + B * t * t; }
// the trunk's points: a random walk across a curve from A through M to B, pulled back so it ends where it should
vec3 jagC(vec3 A, vec3 M, vec3 B, float i, float n, float seed, float amp, vec3 s1, vec3 s2){ return jag(A, B, i, n, seed, amp, true, s1, s2) - mix(A, B, i / n) + bez(A, M, B, i / n); }
vec3 fine(float i, float n, float sd, vec3 s1, vec3 s2, float L, float k){ if (i < 0.5 || i > n - 0.5) return vec3(0.0); vec2 h = hash22(vec2(i * 3.71 + sd, sd * 0.37 + 9.1)) - 0.5; return (s1 * h.x + s2 * h.y) * L * k; }
void main(){
  int k = int(seg.x + 0.5); vec4 A = uArcA[k], B = uArcB[k], Mc = uArcM[k], C = uArcC[k]; float I = A.w; if (I <= 0.0) { gl_Position = OFF; return; }
  float i = seg.y, n = seg.z, br = seg.w; if (br > 0.5 && br < 8.5 && br > C.x + 0.5) { gl_Position = OFF; return; }
  float sd = B.w * 13.1 + seg.x * 5.3, fk = C.w * (0.5 + 0.5 * hash11(uJag * 0.917 + sd)); vec3 d = B.xyz - A.xyz; float L = max(length(d), 1e-3); vec3 dn = d / L; vH = C.z;
  // where it meets the skin: a bright point
  if (br > 8.5) { vec3 P = br < 9.5 ? A.xyz : B.xyz; P += normalize(uCamPos - P) * 0.02; float dist = length(P - uCamPos), px = dist * 2.2 / uRes.y, s = (0.012 + px * 2.0) * C.y;
    vQ = position.xy; vCore = -1.0; vI = I * fogT(P) * (0.7 + 0.3 * hash11(sd + br)); gl_Position = projectionMatrix * viewMatrix * vec4(P + (camR() * position.x + camU() * position.y) * s, 1.0); return; }
  vec3 toE = normalize(uCamPos - Mc.xyz), s1 = normalize(cross(dn, toE)), s2 = normalize(cross(dn, s1)); float amp = L * Mc.w, taper = 1.0;
  vec3 P0, P1;
  if (br < 0.5) { P0 = jagC(A.xyz, Mc.xyz, B.xyz, i, n, sd, amp, s1, s2) + fine(i, n, sd, s1, s2, L, fk); P1 = jagC(A.xyz, Mc.xyz, B.xyz, i + 1.0, n, sd, amp, s1, s2) + fine(i + 1.0, n, sd, s1, s2, L, fk); }
  else { float at = 2.0 + floor(hash11(sd + br * 3.1) * 6.0); vec3 o = jagC(A.xyz, Mc.xyz, B.xyz, at, 10.0, sd, amp, s1, s2) + fine(at, 10.0, sd, s1, s2, L, fk), tg = normalize(bez(A.xyz, Mc.xyz, B.xyz, (at + 1.0) / 10.0) - bez(A.xyz, Mc.xyz, B.xyz, at / 10.0) + dn * 1e-3);
    vec3 dir = normalize(tg * 0.6 + s1 * (br < 1.5 ? 1.0 : -1.0) * (0.6 + hash11(sd + br * 5.0)) + s2 * (hash11(sd * 1.7 + br) - 0.5));
    vec3 E = o + dir * L * (0.12 + 0.24 * hash11(sd * 0.7 + br * 3.3)); float sb = sd + br * 17.0; P0 = jag(o, E, i, n, sb, amp * 0.7, false, s1, s2); P1 = jag(o, E, i + 1.0, n, sb, amp * 0.7, false, s1, s2);
    taper = 1.0 - (i + 0.5) / n * 0.7; I *= 0.6 * taper; }
  vec3 sdir = P1 - P0; float sl = length(sdir); sdir /= max(sl, 1e-4); vec3 side = normalize(cross(sdir, normalize(uCamPos - P0)));
  float dist = length(P0 - uCamPos), px = dist * 2.2 / uRes.y, core = max(0.0009, px * 0.42) * (0.6 + 0.4 * taper) * C.y, w = core * 4.5 + 0.0018 * C.y;      // (hair-thin: a pixel and a half of core, a tight glow)
  vec3 wp = mix(P0, P1, position.y * 0.5 + 0.5) + sdir * position.y * w * 0.5 + side * position.x * w;
  vQ = position.xy; vCore = w / core; vI = I * fogT(P0) * smoothstep(0.5, 1.4, dist);      // (never across the lens)
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
        `in vec2 vQ; in float vI; in float vCore; in float vH; out vec4 o;
void main(){ float zs = viewZ(textureLod(tDepth, gl_FragCoord.xy * uRes.zw, 0.0).r), zp = viewZ(gl_FragCoord.z); float tol = 0.35 + zp * 0.008, f = sat((zs - zp + tol) / (tol * 0.85));      // (it crawls on the body: a little behind its surface still shows, more so far off)
  vec3 gc = mix(vec3(0.08, 0.6, 1.0), vec3(0.34, 0.4, 1.0), vH), cc = mix(vec3(0.8, 0.96, 1.0), vec3(0.9, 0.9, 1.0), vH);      // (cyan-blue to violet-blue: each machine its own)
  if (vCore < 0.0) { float r = length(vQ); if (r > 1.0) discard; o = vec4((cc * exp(-r * r * 14.0) * 26.0 + gc * exp(-r * 3.5) * 2.6) * vI * f, 0.0); return; }
  float x = abs(vQ.x) * vCore, c = exp(-x * x * 2.2), g = exp(-abs(vQ.x) * 4.0) * (1.0 - vQ.y * vQ.y * 0.3);
  o = vec4((cc * c * 80.0 + gc * (g * g * 12.0 + g * 1.8)) * vI * f, 0.0); }`, { order: 8, uniforms: U }); }

    // ── lightning: one bolt, a trunk of 28 segments and three branches of 10, far off in the rain ──
    { const SEG = 28, BR = 10, NB = 3, n = SEG + NB * BR, U = (GL.boltU = { uBoltA: { value: new T.Vector4() }, uBoltB: { value: new T.Vector4() } });
      const g = VX.quad(); VX.inst(g, 'seg', n, 4, (a, i) => { if (i < SEG) { a[i * 4] = 0; a[i * 4 + 1] = i; a[i * 4 + 2] = SEG; a[i * 4 + 3] = 0; } else { const b = Math.floor((i - SEG) / BR); a[i * 4] = 0; a[i * 4 + 1] = (i - SEG) % BR; a[i * 4 + 2] = BR; a[i * 4 + 3] = 1 + b; } });
      mk('bolt', g, RIBBON + `
in vec3 position; in vec4 seg; uniform vec4 uBoltA, uBoltB; out vec2 vQ; out vec3 vC; out float vCore;
void main(){
  float I = uBoltA.w; if (I <= 0.0) { gl_Position = OFF; return; }
  float i = seg.y, n = seg.z, br = seg.w, sd = uBoltB.w; vec3 A = uBoltA.xyz, B = uBoltB.xyz, d = B - A; float L = length(d); vec3 dn = d / L;
  vec3 toE = normalize(uCamPos - mix(A, B, 0.5)), s1 = normalize(cross(dn, toE)), s2 = normalize(cross(dn, s1)); float amp = L * 0.09;
  vec3 P0, P1; float wk = 1.0;
  if (br < 0.5) { P0 = jag(A, B, i, n, sd, amp, true, s1, s2); P1 = jag(A, B, i + 1.0, n, sd, amp, true, s1, s2); }
  else { float at = 3.0 + floor(hash11(sd + br * 3.1) * 16.0); vec3 o = jag(A, B, at, 28.0, sd, amp, true, s1, s2), dir = normalize(dn * 0.8 + s1 * (mod(br, 2.0) > 0.5 ? 0.7 : -0.7) * (0.5 + hash11(sd * 3.3 + br)));
    vec3 E = o + dir * L * (0.18 + 0.15 * hash11(sd + br * 9.0)); P0 = jag(o, E, i, n, sd + br * 17.0, amp * 0.45, false, s1, s2); P1 = jag(o, E, i + 1.0, n, sd + br * 17.0, amp * 0.45, false, s1, s2); wk = 0.55 * (1.0 - i / n); }
  vec3 sdir = P1 - P0; float sl = length(sdir); sdir /= max(sl, 1e-4); vec3 side = normalize(cross(sdir, normalize(uCamPos - P0)));
  float dist = length(P0 - uCamPos), px = dist * 2.2 / uRes.y, core = max(0.4, px * 0.8) * (0.6 + 0.4 * wk), w = core * 10.0;
  vec3 wp = mix(P0, P1, position.y * 0.5 + 0.5) + sdir * position.y * w * 0.5 + side * position.x * w;
  // far in heavy rain: the air takes most of it, but never all (a bolt is the brightest thing there is)
  vQ = position.xy; vCore = w / core; vC = vec3(0.75, 0.82, 1.0) * I * wk * max(fogT(P0), 0.18);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
        `in vec2 vQ; in vec3 vC; in float vCore; out vec4 o;
void main(){ float f = softDepth(20.0); float x = abs(vQ.x) * vCore, c = exp(-x * x * 1.4), g = exp(-abs(vQ.x) * 2.6);
  o = vec4(vC * (c * 90.0 + g * 6.0) * f, 0.0); }`, { order: -1, uniforms: U }); }

    // ── dust in the beams: motes round the eye, seen only where a lamp's cone lights them ──
    { const NB = 8, N = Math.round(1600 * q), U = (GL.beamU = { uBL0: { value: Array.from({ length: NB }, () => new T.Vector4()) }, uBL1: { value: Array.from({ length: NB }, () => new T.Vector4()) }, uBL2: { value: Array.from({ length: NB }, () => new T.Vector4()) } });
      const g = VX.quad(); VX.inst(g, 'seed', N, 4, (a, i) => { const r = LR.rng('beamdust' + i); a[i * 4] = r(); a[i * 4 + 1] = r(); a[i * 4 + 2] = r(); a[i * 4 + 3] = r(); });
      mk('beamdust', g, `
in vec3 position; in vec4 seed; uniform vec4 uBL0[${NB}], uBL1[${NB}], uBL2[${NB}]; out vec2 vQ; out vec3 vC;
void main(){ const vec3 B = vec3(22.0, 10.0, 22.0); float t = uTime * 0.1;
  vec3 p = seed.xyz * B + vec3(sin(t * 3.0 + seed.w * 30.0) * 0.6 + uWind.x * uTime * 0.25, sin(t * 2.0 + seed.x * 40.0) * 0.4 - uTime * 0.03, cos(t * 2.6 + seed.y * 30.0) * 0.6 + uWind.y * uTime * 0.25);
  p = mod(p - uCamPos + B * 0.5, B) - B * 0.5 + uCamPos; vec3 V = normalize(uCamPos - p); vec3 lit = vec3(0.0);
  for (int i = 0; i < ${NB}; i++) { vec4 a = uBL0[i], b = uBL1[i], c = uBL2[i]; if (c.w <= 0.0) continue; vec3 L = p - a.xyz; float dl = length(L); if (dl > a.w) continue; vec3 ld = L / dl;
    float cone = smoothstep(b.w, mix(b.w, 1.0, 0.25), dot(ld, b.xyz)), phase = 0.25 + 3.0 * pow(sat(dot(-ld, V)), 6.0);      // (dust in a beam shines most looking into the light)
    lit += c.rgb * cone * phase * (1.0 - dl / a.w) / (1.0 + dl * dl * 0.06); }
  float d = length(p - uCamPos), px = d * 2.2 / uRes.y, s = max(0.004 + 0.004 * seed.w, px * 0.5);
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + 2.0 * seed.x) + seed.y * 50.0); vC = lit * tw * 0.35 * smoothstep(11.0, 7.0, d) * smoothstep(0.4, 1.2, d) * fogT(p);
  vQ = position.xy; gl_Position = dot(vC, vec3(1.0)) > 0.002 ? projectionMatrix * viewMatrix * vec4(p + (camR() * position.x + camU() * position.y) * s, 1.0) : OFF; }`,
        `in vec2 vQ; in vec3 vC; out vec4 o; void main(){ float f = softDepth(0.2); float k = max(1.0 - length(vQ), 0.0); o = vec4(vC * k * k * f, 0.0); }`, { order: 6, uniforms: U }); }

    // ── warm motes in the mist after dark: a few, drifting, slow to blink ──
    { const N = Math.round(90 * q); const g = VX.quad(); VX.inst(g, 'seed', N, 4, (a, i) => { const r = LR.rng('nightmote' + i); a[i * 4] = r(); a[i * 4 + 1] = r(); a[i * 4 + 2] = r(); a[i * 4 + 3] = r(); });
      mk('nightmotes', g, `
in vec3 position; in vec4 seed; out vec2 vQ; out vec3 vC;
void main(){ const vec3 B = vec3(36.0, 8.0, 36.0); float t = uTime * 0.18 + seed.w * 40.0;
  vec3 p = seed.xyz * B + vec3(sin(t * 1.1) * 1.8 + sin(t * 0.37 + 2.0) * 2.5 + uWind.x * uTime * 0.3, sin(t * 1.7) * 0.6, cos(t * 0.9) * 1.8 + cos(t * 0.29) * 2.5 + uWind.y * uTime * 0.3);
  p = mod(p - uCamPos + B * 0.5, B) - B * 0.5 + uCamPos; p.y = landAt(p.xz) + 0.4 + seed.y * 5.0 + sin(t * 1.3) * 0.3;
  float d = length(p - uCamPos), px = d * 2.2 / uRes.y, s = max(0.025, px * 0.8), mist = sat(uFog.x * 110.0) * smoothstep(0.3, 0.9, uWx2.z);
  float blink = smoothstep(0.2, 0.9, sin(uTime * (0.6 + seed.x) + seed.z * 20.0) * 0.5 + 0.5);
  vC = mix(vec3(1.0, 0.55, 0.18), vec3(0.75, 1.0, 0.35), step(0.6, seed.x)) * blink * mist * (1.0 - uWx2.x) * 9.0 * smoothstep(17.0, 10.0, d) * smoothstep(1.5, 3.0, d) * fogT(p);
  vQ = position.xy; gl_Position = dot(vC, vec3(1.0)) > 0.003 ? projectionMatrix * viewMatrix * vec4(p + (camR() * position.x + camU() * position.y) * s, 1.0) : OFF; }`,
        `in vec2 vQ; in vec3 vC; out vec4 o; void main(){ float f = softDepth(0.3); float r = length(vQ), k = max(1.0 - r, 0.0); o = vec4(vC * (k * k * k * 1.6 + k * 0.08) * f, 0.0); }`, { order: 6 }); }

    // the arcs' sparks: thrown off the ends as each burst starts (a function of the clock, through 62's sources)
    // (the arcs throw no sparks: the fault crackles on the skin, it does not spit)
    LR.on('frame', GL.update, 28);
  };

  // the walker's skin as tubes the arcs crawl on: each leg's segments, the pod, the neck — [from, to, radius]
  // (any other machine: each leg's segments, as thick as a tenth of their length; its body along its length; its neck)
  const arcTubes = (u) => { const W = u.pose && u.pose.W, S = u.pose && u.pose.sols; if (!W || !S) return null; const B = W.body, out = [];
    if (u.avatar) { const head = W.head ? W.head.p : M3(B, [0.2, 0.3, 0]);
      for (const l of u.kin.limbs) { const J = S[l.name] && S[l.name].J; if (!J) continue; for (let k = 0; k + 1 < J.length; k++) out.push([J[k], J[k + 1], 0.055]); }
      out.push([M3(B, [-0.26, 0.06, 0]), M3(B, [0.26, 0.06, 0]), 0.17], [M3(B, [-0.2, 0.0, 0]), M3(B, [0.22, 0.12, 0]), 0.15], [M3(B, [0.1, 0.16, 0]), head, 0.06]); return out; }
    for (const l of u.kin.limbs) { const J = S[l.name] && S[l.name].J; if (!J) continue; for (let k = 0; k + 1 < J.length; k++) { const sl = Math.hypot(J[k + 1][0] - J[k][0], J[k + 1][1] - J[k][1], J[k + 1][2] - J[k][2]); out.push([J[k], J[k + 1], LR.clamp(sl * 0.085, 0.06, 2.2)]); } }      /* (outside the casing) */
    const R0 = u.K.radius || 4, Lb = Math.max(u.wb || R0, 1) * 0.7, rb = R0 * 0.08; out.push([M3(B, [-Lb / 2, 0, 0]), M3(B, [Lb / 2, 0, 0]), rb], [M3(B, [-Lb / 2, rb * 0.5, 0]), M3(B, [Lb / 2, rb * 0.5, 0]), rb * 0.9]);
    if (W.head) out.push([M3(B, [Lb * 0.4, 0, 0]), W.head.p, rb * 0.35]); return out; };
  // ── arcs on that skin, of five kinds.  Each returns [A, B, M (the curve's pull), amp (jaggedness, of its length)] ──
  // a point on a tube: t along it, at angle th round it (0: the side facing the eye), r out from its axis
  const tubeFrame = (T, cp) => { const [A, Bp, r] = T, d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]], L = Math.hypot(...d) || 1, dn = d.map((v) => v / L), up = Math.abs(dn[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const n1 = norm(cross(dn, up)), n2 = cross(dn, n1), mid = [A[0] + d[0] * 0.5, A[1] + d[1] * 0.5, A[2] + d[2] * 0.5], e = [cp.x - mid[0], cp.y - mid[1], cp.z - mid[2]], th0 = Math.atan2(dot(e, n2), dot(e, n1));
    return { A, d, L, dn, n1, n2, r, th0, at: (t, th, rr = r * 1.04) => { const ct = Math.cos(th0 + th), st = Math.sin(th0 + th); return [A[0] + d[0] * t + (n1[0] * ct + n2[0] * st) * rr, A[1] + d[1] * t + (n1[1] * ct + n2[1] * st) * rr, A[2] + d[2] * t + (n1[2] * ct + n2[2] * st) * rr]; } }; };
  const midOf = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const KINDS = ['crawl', 'run', 'ring', 'leap', 'snap'];
  // crawl: a hand's breadth (a giant's: as far as it is big) over the skin, sliding along as it lives
  // snap: the same, tiny and very bright, for a frame or two
  const arcOn = (F, rnd, sc, slide, small) => { const len = Math.min(F.r * (1.3 + 2.2 * rnd(3)), (0.4 + 1.2 * rnd(3)) * sc) * (small ? 0.35 : 1), t = 0.12 + 0.76 * rnd(1), th = (rnd(2) - 0.5) * 2.2, turn = (rnd(4) - 0.5) * 1.6 * (small ? 0.4 : 1);
    const s0 = (rnd(5) - 0.5) * len + slide, dir = rnd(6) < 0.5 ? 1 : -1, ta = t + s0 / F.L, tb = t + (s0 + len * dir) / F.L, a = F.at(LR.clamp(ta, 0.02, 0.98), th), b = F.at(LR.clamp(tb, 0.02, 0.98), th + turn);
    return [a, b, midOf(a, b), small ? 0.28 : 0.12 + 0.08 * rnd(7)]; };
  // run: most of the way down a limb, bowed a little off the skin
  const arcRun = (F, rnd) => { const t0 = 0.06 + 0.3 * rnd(1), t1 = 0.62 + 0.32 * rnd(2), th = (rnd(3) - 0.5) * 1.6, a = F.at(t0, th), b = F.at(t1, th + (rnd(4) - 0.5) * 0.9), m = F.at((t0 + t1) / 2, th + (rnd(5) - 0.5) * 0.6, F.r * (1.25 + 0.4 * rnd(6)));
    return [a, b, m, 0.05 + 0.06 * rnd(7)]; };
  // ring: part way round a limb, hugging it
  const arcRing = (F, rnd) => { const t = 0.1 + 0.8 * rnd(1), ph = 1.3 + 1.4 * rnd(2), c = (rnd(3) - 0.5) * 1.2, a = F.at(t, c - ph / 2), b = F.at(t + (rnd(4) - 0.5) * 0.06, c + ph / 2), m = F.at(t, c, F.r * 1.04 / Math.cos(ph / 2));
    return [a, b, m, 0.07 + 0.05 * rnd(5)]; };
  // leap: across the gap from one part to the next, arched away from the body
  const arcLeap = (F, G, rnd, ctr) => { const a = F.at(0.15 + 0.7 * rnd(1), (rnd(2) - 0.5) * 1.4), ax = G.A, d = G.d, w = LR.clamp(dot([a[0] - ax[0], a[1] - ax[1], a[2] - ax[2]], d) / (G.L * G.L), 0.05, 0.95), q = [ax[0] + d[0] * w, ax[1] + d[1] * w, ax[2] + d[2] * w];
    const to = norm([a[0] - q[0], a[1] - q[1], a[2] - q[2]]), b = [q[0] + to[0] * G.r * 1.04, q[1] + to[1] * G.r * 1.04, q[2] + to[2] * G.r * 1.04], gap = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (gap > Math.max(0.5, 7 * Math.max(F.r, G.r)) || gap < 0.05) return null; const mm = midOf(a, b), out = norm([mm[0] - ctr[0], mm[1] - ctr[1], mm[2] - ctr[2]]);
    return [a, b, [mm[0] + out[0] * gap * (0.2 + 0.3 * rnd(3)), mm[1] + out[1] * gap * (0.2 + 0.3 * rnd(3)), mm[2] + out[2] * gap * (0.2 + 0.3 * rnd(3))], 0.16 + 0.1 * rnd(4)]; };
  // each machine's faults have a character of their own (from its name): the colour they burn, which kinds they throw, how
  // fast they re-jag, how wild and branched and thick they are, the rhythm of a burst; the walker's are its own
  const charOf = (u) => { if (u.arcCh) return u.arcCh; const r = LR.rng('arcs ' + u.name), wt = KINDS.map(() => 0.25 + r()), fav = Math.floor(r() * KINDS.length); wt[fav] *= 2.4;
    if (u.avatar) { wt[0] = 1.6; wt[1] = 1.0; wt[2] = 0.8; wt[3] = 1.1; wt[4] = 1.2; }
    const sum = wt.reduce((a, b) => a + b, 0); return (u.arcCh = { hue: u.avatar ? 0.22 : r() * 0.95, wt: wt.map((w) => w / sum), rate: 7 + r() * 23, jag: 0.7 + r() * 0.8, branchy: r(), thick: 0.8 + r() * 0.5, fine: 0.012 + r() * 0.02, rhythm: ['pop', 'stutter', 'surge'][Math.floor(r() * 3)] }); };
  const pick = (wt, x) => { for (let i = 0; i < wt.length; i++) { if (x < wt[i]) return KINDS[i]; x -= wt[i]; } return KINDS[0]; };
  // a burst's envelope over its life (0…1, a function of the clock): a few hard pops, a stutter, or a surge that holds and dies
  const envOf = (rh, tb, dur, key, time) => { if (tb < 0 || tb > dur) return 0;
    if (rh === 'pop') { const np = 2 + Math.floor(h1(key, 61) * 3); let v = 0; for (let i = 0; i < np; i++) { const ti = (dur * i) / np + h1(key, 62 + i) * dur * 0.2, a = tb - ti; if (a >= 0 && a < 0.3) v = Math.max(v, Math.exp(-a * 8)); } return v; }
    if (rh === 'stutter') { const hz = 10 + 14 * h1(key, 63), f = Math.floor(time * hz); return h1(f, key + 64) > 0.35 ? 0.55 + 0.45 * h1(f, key + 65) : 0.18; }
    return LR.sat(tb / 0.07) * (1 - LR.sat((tb - dur * 0.7) / (dur * 0.3))) * (0.78 + 0.22 * h1(Math.floor(time * 24), key + 66)); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const M3 = (f, v) => LR.mech.apply(f, v);
  let lastBolt = null, boltPlace = null;
  GL.update = (time, dt, cam) => {
    const M = LR.mech, R = LR.render, av = M && M.units.find((u) => u.avatar), P = GL.parts;
    // ── the faults: the walker's, and any other machine's near enough to see — a pool of arcs shared out, nearest first.  In a
    // burst each arc has its own moment and life, its own kind, curve and rate; the burst's rhythm (its machine's, mostly) beats
    // under them all ──
    { const U = GL.arcU, NA = U.uArcA.value.length; for (let i = 0; i < NA; i++) U.uArcA.value[i].w = 0; let used = 0; const cp = cam.position, fr = Math.floor(time * 24), ends = [];
      const live = []; for (const u of (M && M.units) || []) { if (u.uBone) u.uBone.value.z = 0; if (u.fly || u.lod < 0 || !u.uBone || (u.avatar && u.live && LR.player && LR.player.view === 'first')) continue; const R0 = u.K.radius || 1; if (u.dist > (u.avatar ? 60 : Math.max(60, R0 * 14))) continue; const b = VX.faultAt(u, time); if (b) live.push({ u, b }); }
      live.sort((a, c) => (a.u.avatar ? -1 : c.u.avatar ? 1 : a.u.dist - c.u.dist));
      for (const { u, b } of live) { if (used >= NA) break; const tubes = arcTubes(u); if (!tubes || !tubes.length) continue; const ch = charOf(u), salt = u.salt || 0, tb = time - b.t0;
        const rh = h1(b.k, salt + 67) < 0.6 ? ch.rhythm : ['pop', 'stutter', 'surge'][Math.floor(h1(b.k, salt + 68) * 3)], env = envOf(rh, tb, b.dur, b.seed + salt, time), want = u.avatar ? b.n * 2 : b.n + 1, ctr = u.pose.W.body.p, mid = [0, 0, 0], sc = Math.max(1, (u.K.radius || 1) / 12); let lit = 0, big = 0, drawn = 0;
        for (let i = 0; i < want + 2 && used < NA; i++) { const key = b.seed * 7 + i * 131 + salt, st = h1(key, 1) * b.dur * 0.55, life = 0.06 + h1(key, 2) * Math.max(0.05, b.dur - st), age = tb - st; let kind = pick(ch.wt, h1(key, 3));
          const lf = kind === 'snap' ? Math.min(life, 0.04 + 0.05 * h1(key, 4)) : life; if (age < 0 || age > lf || (i >= want && h1(key, 5) > 0.35)) continue;
          const rate = ch.rate * (0.6 + 0.8 * h1(key, 6)), ep = Math.floor(age * rate), hop = kind === 'snap' || kind === 'leap' ? ep : Math.floor(age * rate * 0.25), rnd = (q) => h1(key + hop * 17, q * 11 + 3);
          const ti = Math.floor(rnd(0) * tubes.length), F = tubeFrame(tubes[ti], cp); let g = null;
          if (kind === 'leap' && tubes.length > 1) { const G = tubeFrame(tubes[(ti + 1 + Math.floor(rnd(8) * (tubes.length - 1))) % tubes.length], cp); g = arcLeap(F, G, rnd, ctr); }
          if (!g && kind === 'leap') kind = 'crawl';
          if (!g) g = kind === 'run' ? arcRun(F, rnd) : kind === 'ring' ? arcRing(F, rnd) : arcOn(F, rnd, sc, (h1(key, 9) - 0.5) * 2 * F.r * (0.6 + 2 * h1(key, 10)) * age * 3, kind === 'snap');
          const [a, c, m, amp] = g, k = used, edge = Math.min(1, age * 48, (lf - age) * 48 + 0.2), gain = { crawl: 0.9, run: 1.0, ring: 0.8, leap: 1.25, snap: 1.5 }[kind];
          const I = b.power * Math.max(env, 0) * gain * edge * (0.6 + 0.4 * h1(fr, key)); if (I < 0.02) continue;
          const nbr = kind === 'snap' ? 0 : kind === 'ring' ? (h1(key, 11) < ch.branchy * 0.5 ? 1 : 0) : Math.min(2, Math.floor(ch.branchy * 2.6 * h1(key, 12) + (kind === 'run' ? 0.8 : 0.2)));
          U.uArcA.value[k].set(a[0], a[1], a[2], I); U.uArcB.value[k].set(c[0], c[1], c[2], (key + ep * 29) % 997); U.uArcM.value[k].set(m[0], m[1], m[2], amp * ch.jag);
          U.uArcC.value[k].set(nbr, ch.thick * (kind === 'snap' ? 1.35 : kind === 'leap' ? 1.15 : 1) * (0.85 + 0.3 * h1(key, 13)), LR.clamp(ch.hue + (h1(key, 14) - 0.5) * 0.25, 0, 1), ch.fine * (kind === 'snap' ? 1.6 : 1));
          used++; drawn++; if (u.avatar) ends.push(h1(key, 9) < 0.5 ? a : c); for (let q = 0; q < 3; q++) mid[q] += (a[q] + c[q]) / 2; lit += I; big = Math.max(big, F.r); }
        if (!drawn) continue; for (let q = 0; q < 3; q++) mid[q] /= drawn; lit /= Math.max(1, want * 0.6); if (u.avatar) { GL.arcEnds = ends; GL.arcT0 = b.t0; }
        // a blue light on what is near (as far as the machine is big), its lamps stutter, its skin glows with it (70_render: uBone.z)
        const hc = ch.hue; R.lamps = R.lamps || []; R.lamps.push({ p: mid, d: [0, 1, 0], color: [0.3 + 0.15 * hc, 0.6 - 0.15 * hc, 1.0], power: 1.9 * lit * Math.max(1, big * 6), cone: 0, range: 3.2 * Math.max(1, big * 8), beam: false, unit: u, arc: true, spill: 1 });
        const st = 0.12 + 0.88 * LR.sat(1 - env * 0.85); for (const l of R.lamps) if (l.unit === u && !l.arc) l.power *= st; u.uBone.value.y *= st; u.uBone.value.z = Math.min(u.avatar ? 1 : 0.45, lit * (u.avatar ? 1.1 : 0.6)); }
      VX.parts.arcs.visible = used > 0; U.uJag.value = Math.floor(time * 30); }
    // ── lightning ──
    { const b = VX.boltAt(time), fl = GL.flashOf(b, time), U = GL.boltU;
      if (b && (!lastBolt || lastBolt.t0 !== b.t0)) { // where it strikes: ahead of the eye, off to one side, far
        const f = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), yaw = Math.atan2(f.x, -f.z) + (h1(b.seed, 1) - 0.5) * 0.7, dist = 380 + 380 * h1(b.seed, 2), x = cam.position.x + Math.sin(yaw) * dist, z = cam.position.z - Math.cos(yaw) * dist, gy = LR.land.h(x, z);
        boltPlace = { top: [x + (h1(b.seed, 3) - 0.5) * 120, cam.position.y + 320 + 120 * h1(b.seed, 4), z + (h1(b.seed, 6) - 0.5) * 120], bot: [x, gy, z] };
        if (!LR.RENDER) LR.emit('thunder', 1.0 + dist / 340); }
      lastBolt = b; VX.parts.bolt.visible = !!b && fl > 0.01;
      if (b && boltPlace) { const fr = Math.floor((time - b.t0) * 24); U.uBoltA.value.set(...boltPlace.top, fl); U.uBoltB.value.set(...boltPlace.bot, b.seed + (fr > 1 ? 0.5 : 0)); }
      // the scene lit by it: every pass reads the flash from uWx2.w
      if (fl > 0) { LR.wx.flash = Math.max(LR.RENDER ? 0 : LR.wx.flash, fl * 0.85); LR.U.uWx2.value.w = LR.wx.flash; } else if (LR.RENDER) { LR.wx.flash = 0; LR.U.uWx2.value.w = 0; } }
    // ── the beams the dust shows in ──
    { const U = GL.beamU, L = (M && M.lamps) || [], cp = cam.position, list = L.filter((l) => l.beam && l.power > 0.05 && !l.arc).map((l) => ({ l, d: Math.hypot(l.p[0] - cp.x, l.p[1] - cp.y, l.p[2] - cp.z) })).filter((e) => e.d < e.l.range + 12).sort((a, b) => a.d - b.d);
      for (let i = 0; i < 8; i++) { const e = list[i]; if (!e) { U.uBL2.value[i].w = 0; continue; } const l = e.l, c = l.color || [1, 0.9, 0.7]; U.uBL0.value[i].set(l.p[0], l.p[1], l.p[2], l.range || 30); U.uBL1.value[i].set(l.d[0], l.d[1], l.d[2], Math.cos(l.cone || 0.4)); U.uBL2.value[i].set(c[0] * l.power, c[1] * l.power, c[2] * l.power, 1); }
      VX.parts.beamdust.visible = list.length > 0; }
    VX.parts.nightmotes.visible = LR.wx.lampsOn > 0.3 && LR.wx.rain < 0.3;
  };
  LR.on('init', () => GL.init(), 62);
}
