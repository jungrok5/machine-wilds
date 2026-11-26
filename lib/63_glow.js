// machine-wilds · 63_glow — light that glows: things hot or charged enough to bloom (lib/75_post blooms what is brighter than
// about 1 before exposure, so everything here is drawn in HDR, tens of times that at its core).
//   · the walker's fault: now and then thin blue-white arcs crackle over its own body — knee to hip, hip to body, up the neck —
//     a few jagged segments re-jagged every other frame, a branch or two, flickering; a small blue light on what is near, a
//     few hot sparks off the ends, and its lamp stutters with it.  Every 3–7 s, a burst of 0.15–0.5 s; more often and
//     stronger for a while after a hard landing and while it runs; calm when it stands, never quite gone.
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

  // ── when ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  // the walker's fault: a slow round always (a burst somewhere in each 5 s), and a quick one while it is shaken (after a hard
  // landing, or running) — each slot of 1.4 s has a burst with the chance of how shaken it is
  const burstIn = (time, S, salt, chance, len) => { const k = Math.floor(time / S); for (const kk of [k, k - 1]) { if (h1(kk, salt + 3) >= chance) continue; const t0 = kk * S + h1(kk, salt) * (S - 0.6), dur = len[0] + (len[1] - len[0]) * h1(kk, salt + 1); if (time >= t0 && time < t0 + dur) return { t0, dur, seed: (kk * 31 + salt) % 9973, k: kk }; } return null; };
  GL.shaken = (time) => { let s = 0; for (const b of VX.bursts) if ((b.kind === 'land' || b.kind === 'landwet') && time >= b.t && time - b.t < 3.5 && b.o && b.o.walker) s = Math.max(s, 1 - (time - b.t) / 3.5); const av = LR.mech && LR.mech.units.find((u) => u.avatar); const sp = av && av.av ? av.av.sp : 0; return Math.max(s, LR.sat((sp - 3.5) / 2.5) * 0.55); };
  GL.landedAt = (time) => { let t = null; for (const b of VX.bursts) if (b.o && b.o.walker && (b.kind === 'land' || b.kind === 'landwet') && time >= b.t && time - b.t < 0.6) t = b.t; return t; };
  VX.arcAt = (time) => { const tl = GL.landedAt(time); if (tl !== null && time - tl < 0.5) return { t0: tl, dur: 0.5, seed: Math.round(tl * 24) % 9973, k: Math.round(tl * 24), power: 1.25, n: 3 };      // (a hard landing shakes it at once)
    const sh = GL.shaken(time), fk = (LR.cine && LR.cine.on && LR.cine.fault) || 0, a = burstIn(time, 5 / (1 + fk), 11, 1, [0.15, 0.45 + 0.15 * Math.min(fk, 2)]), b = sh > 0.02 ? burstIn(time, 1.4, 23, sh, [0.15, 0.5]) : null, r = b || a; if (!r) return null; r.power = b ? 0.7 + 0.5 * sh : 0.75; r.n = 1 + Math.floor(h1(r.k, 41 + (b ? 1 : 0)) * (b ? 3 : 2)); return r; };
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
    // ── the walker's arcs, as a game draws them (S.T.A.L.K.E.R. 2's bolts, Niagara's electrocution): up to 6, each a
    // trunk of 10 segments with two short branches that taper — shapes that read at a glance, not hair; a white-hot core with
    // a saturated cyan-blue glow round it; a bright point where each one meets the skin; a new path every frame ──
    { const NA = 6, SEG = 10, BR = 4, NBR = 2, per = SEG + NBR * BR + 2, U = (GL.arcU = { uArcA: { value: Array.from({ length: NA }, () => new T.Vector4()) }, uArcB: { value: Array.from({ length: NA }, () => new T.Vector4()) }, uJag: { value: 0 } });
      const g = VX.quad(); VX.inst(g, 'seg', NA * per, 4, (a, i) => { const s = Math.floor(i / per), r = i % per; a[i * 4] = s;
        if (r < SEG) { a[i * 4 + 1] = r; a[i * 4 + 2] = SEG; a[i * 4 + 3] = 0; } else if (r < SEG + NBR * BR) { const b = Math.floor((r - SEG) / BR); a[i * 4 + 1] = (r - SEG) % BR; a[i * 4 + 2] = BR; a[i * 4 + 3] = 1 + b; } else { a[i * 4 + 1] = 0; a[i * 4 + 2] = 1; a[i * 4 + 3] = 9 + (r - SEG - NBR * BR); } });
      mk('arcs', g, RIBBON + `
in vec3 position; in vec4 seg; uniform vec4 uArcA[${NA}], uArcB[${NA}]; uniform float uJag; out vec2 vQ; out float vI; out float vCore;
vec3 fine(float i, float n, float sd, vec3 s1, vec3 s2, float L, bool pinned){ if (pinned && (i < 0.5 || i > n - 0.5)) return vec3(0.0); vec2 h = hash22(vec2(i * 3.71 + sd, sd * 0.37 + 9.1)) - 0.5; return (s1 * h.x + s2 * h.y) * L * 0.02; }
void main(){
  int k = int(seg.x + 0.5); vec4 A = uArcA[k], B = uArcB[k]; float I = A.w; if (I <= 0.0) { gl_Position = OFF; return; }
  float i = seg.y, n = seg.z, br = seg.w, sd = B.w * 13.1 + uJag * 0.917 + seg.x * 5.3; vec3 d = B.xyz - A.xyz; float L = length(d); vec3 dn = d / max(L, 1e-4);
  // where it meets the skin: a bright point
  if (br > 8.5) { vec3 C = br < 9.5 ? A.xyz : B.xyz; C += normalize(uCamPos - C) * 0.02; float dist = length(C - uCamPos), px = dist * 2.2 / uRes.y, s = 0.022 + px * 3.0;
    vQ = position.xy; vCore = -1.0; vI = I * fogT(C) * (0.7 + 0.3 * hash11(sd + br)); gl_Position = projectionMatrix * viewMatrix * vec4(C + (camR() * position.x + camU() * position.y) * s, 1.0); return; }
  vec3 toE = normalize(uCamPos - mix(A.xyz, B.xyz, 0.5)), s1 = normalize(cross(dn, toE)), s2 = normalize(cross(dn, s1)); float amp = L * 0.16, taper = 1.0;      // (short and flat: it crawls on the skin)
  vec3 P0, P1;
  if (br < 0.5) { P0 = jag(A.xyz, B.xyz, i, n, sd, amp, true, s1, s2) + fine(i, n, sd, s1, s2, L, true); P1 = jag(A.xyz, B.xyz, i + 1.0, n, sd, amp, true, s1, s2) + fine(i + 1.0, n, sd, s1, s2, L, true); }
  else { float at = 2.0 + floor(hash11(sd + br * 3.1) * 6.0); vec3 o = jag(A.xyz, B.xyz, at, 10.0, sd, amp, true, s1, s2) + fine(at, 10.0, sd, s1, s2, L, true), dir = normalize(dn * 0.6 + s1 * (br < 1.5 ? 1.0 : -1.0) * (0.6 + hash11(sd + br * 5.0)) + s2 * (hash11(sd * 1.7 + br) - 0.5));
    vec3 E = o + dir * L * (0.16 + 0.18 * hash11(sd * 0.7 + br * 3.3)); float sb = sd + br * 17.0; P0 = jag(o, E, i, n, sb, amp * 0.6, false, s1, s2); P1 = jag(o, E, i + 1.0, n, sb, amp * 0.6, false, s1, s2);
    taper = 1.0 - (i + 0.5) / n * 0.7; I *= 0.6 * taper; }
  vec3 sdir = P1 - P0; float sl = length(sdir); sdir /= max(sl, 1e-4); vec3 side = normalize(cross(sdir, normalize(uCamPos - P0)));
  float dist = length(P0 - uCamPos), px = dist * 2.2 / uRes.y, core = max(0.0016, px * 0.65) * (0.6 + 0.4 * taper), w = core * 7.0 + 0.004;
  vec3 wp = mix(P0, P1, position.y * 0.5 + 0.5) + sdir * position.y * w * 0.5 + side * position.x * w;
  vQ = position.xy; vCore = w / core; vI = I * fogT(P0);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
        `in vec2 vQ; in float vI; in float vCore; out vec4 o;
void main(){ float zs = viewZ(textureLod(tDepth, gl_FragCoord.xy * uRes.zw, 0.0).r), zp = viewZ(gl_FragCoord.z); float f = sat((zs - zp + 0.35) / 0.3);      // (it crawls on the body: a little behind its surface still shows)
  if (vCore < 0.0) { float r = length(vQ); if (r > 1.0) discard; o = vec4((vec3(0.7, 0.9, 1.0) * exp(-r * r * 14.0) * 26.0 + vec3(0.15, 0.55, 1.0) * exp(-r * 3.5) * 2.6) * vI * f, 0.0); return; }
  float x = abs(vQ.x) * vCore, c = exp(-x * x * 1.8), g = exp(-abs(vQ.x) * 3.2) * (1.0 - vQ.y * vQ.y * 0.3);
  o = vec4((vec3(0.85, 0.95, 1.0) * c * 55.0 + vec3(0.15, 0.55, 1.0) * (g * g * 10.0 + g * 2.0)) * vI * f, 0.0); }`, { order: 8, uniforms: U }); }

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
  const arcTubes = (u) => { const W = u.pose && u.pose.W, S = u.pose && u.pose.sols; if (!W || !S) return null; const B = W.body, out = [], head = W.head ? W.head.p : M3(B, [0.2, 0.3, 0]);
    for (const l of u.kin.limbs) { const J = S[l.name] && S[l.name].J; if (!J) continue; for (let k = 0; k + 1 < J.length; k++) out.push([J[k], J[k + 1], 0.055]); }
    out.push([M3(B, [-0.26, 0.06, 0]), M3(B, [0.26, 0.06, 0]), 0.17], [M3(B, [-0.2, 0.0, 0]), M3(B, [0.22, 0.12, 0]), 0.15], [M3(B, [0.1, 0.16, 0]), head, 0.06]); return out; };
  // one short arc on that skin: a spot on a tube (on the side the eye can see), crawling a hand's breadth along it and part way round
  const arcOn = (T, rnd, cp) => { const [A, Bp, r] = T, d = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]], L = Math.hypot(...d) || 1, dn = d.map((v) => v / L), up = Math.abs(dn[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const n1 = norm(cross(dn, up)), n2 = cross(dn, n1), t = 0.12 + 0.76 * rnd(1), c = [A[0] + d[0] * t, A[1] + d[1] * t, A[2] + d[2] * t], e = [cp.x - c[0], cp.y - c[1], cp.z - c[2]];
    const th0 = Math.atan2(e[0] * n2[0] + e[1] * n2[1] + e[2] * n2[2], e[0] * n1[0] + e[1] * n1[1] + e[2] * n1[2]) + (rnd(2) - 0.5) * 2.2, len = (0.07 + 0.14 * rnd(3)) * (r > 0.1 ? 1.6 : 1), turn = (rnd(4) - 0.5) * 1.6, rr = r * 1.04;
    const at = (dt, th) => { const ct = Math.cos(th), st = Math.sin(th); return [c[0] + dn[0] * dt + (n1[0] * ct + n2[0] * st) * rr, c[1] + dn[1] * dt + (n1[1] * ct + n2[1] * st) * rr, c[2] + dn[2] * dt + (n1[2] * ct + n2[2] * st) * rr]; };
    const s0 = (rnd(5) - 0.5) * len; return [at(s0, th0), at(s0 + len * (rnd(6) < 0.5 ? 1 : -1), th0 + turn)]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  const M3 = (f, v) => LR.mech.apply(f, v);
  let lastBolt = null, boltPlace = null;
  GL.update = (time, dt, cam) => {
    const M = LR.mech, R = LR.render, av = M && M.units.find((u) => u.avatar), P = GL.parts;
    // ── the walker's fault ──
    { const U = GL.arcU, NA = U.uArcA.value.length, b = av && av.lod >= 0 && av.dist < 60 ? VX.arcAt(time) : null; for (let i = 0; i < NA; i++) U.uArcA.value[i].w = 0; VX.parts.arcs.visible = !!b;
      if (b) { const tubes = arcTubes(av); if (tubes) { const fr = Math.floor(time * 24), hop = Math.floor(time * 16), on = h1(fr, b.seed) > 0.2, jag = Math.floor(time * 30), ends = [], mid = [0, 0, 0]; let lit = 0; const cp = cam.position, n = Math.min(NA, b.n * 2);
          // each arc sits somewhere on the skin and jumps somewhere else every few frames: it crackles over the body, it does not leap off it
          for (let i = 0; i < n; i++) { const key = b.seed * 7 + i * 131 + hop * 17, rnd = (q) => h1(key, q * 11 + 3), T = tubes[Math.floor(rnd(0) * tubes.length)], [a, c] = arcOn(T, rnd, cp);
            const flick = on && h1(fr, b.seed + i * 13) > 0.3 ? 1 : 0.1, I = b.power * flick * (0.55 + 0.45 * h1(fr, i + 3)) * (T[2] > 0.1 ? 0.8 : 1); U.uArcA.value[i].set(a[0], a[1], a[2], I); U.uArcB.value[i].set(c[0], c[1], c[2], (key + i * 17) % 997); if (i < b.n) ends.push(h1(key, 9) < 0.5 ? a : c); for (let k = 0; k < 3; k++) mid[k] += (a[k] + c[k]) / 2 / n; lit += I / n; }
          U.uJag.value = jag; GL.arcEnds = ends; GL.arcT0 = b.t0;
          // a small blue light on what is near, and the walker's own lamp stutters
          R.lamps = R.lamps || []; R.lamps.push({ p: mid, d: [0, 1, 0], color: [0.35, 0.55, 1.0], power: 1.9 * lit, cone: 0, range: 3.2, beam: false, unit: av, arc: true, spill: 1 });
          const st = 0.12 + 0.88 * (h1(fr, b.seed + 99) > 0.5 ? 1 : 0.2); for (const l of R.lamps) if (l.unit === av && !l.arc) l.power *= st; if (av.uBone) { av.uBone.value.y *= st; av.uBone.value.z = Math.min(1, lit * 1.1) * (on ? 1 : 0.25); } } }      /* (z: its skin glows with it — 70_render) */
      if (!b && av && av.uBone) av.uBone.value.z = 0; }
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
