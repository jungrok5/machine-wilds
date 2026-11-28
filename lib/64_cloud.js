// machine-wilds · 64_cloud — a cloud of its own round something that lives in the sky (a realm's airship), and the
// lightning in it.  Drawn after the lit world and its see-through things, before the picture is resolved:
//   · the bank: a volume of noise (a 64³ tileable Perlin-Worley / Worley texture made on the graphics card at start) inside
//     a lumpy, flat-bottomed ellipsoid that travels with its host and slips a little against it, so its shape lives.
//     Raymarched at a fraction of the frame's size (more steps and a finer picture on the higher tiers), lit by the key light
//     through a short march toward it (Beer's law with a powder term, a forward and a back lobe — the silver edge — and two
//     octaves of light scattered more than once), by the sky above and the land below, and from inside by lightning, by its
//     host's lamps after dark and by its red beacons.  Joined to the picture with the depth (a low-res sample counts only
//     where its depth agrees), so a hull inside it is hidden by what is in front of it and hides what is behind it.  What
//     stands under it or inside it loses some of its sun.  The weather sets it: thin and broken on a clear day (the host a
//     faint shape in it), heavier in overcast and mist, dense and low in rain.
//   · strikes (rain): flashes inside the bank that light it from within — the host's own body casts its shadow into the lit
//     cloud (its hull is a pair of ellipsoids the shader knows), and one flash in each burst is put behind it as the eye sees
//     it, so for a moment its silhouette stands in the glow — bolts from the cloud to its lightning rods with restrikes,
//     arcs crawling down its conductors after, and discharges from the wire it trails to the ground.  Every strike lights
//     the host's hull (a lamp), the cloud and the whole scene (the flash every pass reads, uWx2.w) for its frames.
//   All of it is a pure function of the clock (and of the eye, for which flash goes behind the hull): a film frame is the
//   same whenever it is drawn.
// API ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
//   LR.cloud.host = { unit: 'name', offset: [x, y, z] (the bank's centre from the host's origin, world axes), radii: [x, y, z],
//                     hulls: [[cx, cy, cz, rx, ry, rz]…] (≤ 2, body frame: what casts its shadow in the flashes),
//                     rods: [[x, y, z]…] tips · wires: [[[x, y, z]…]…] conductors (body frame) · trail: { bone, at } the wire's end ·
//                     glow: [x, y, z] its town's lights · beacons: [[x, y, z]…] (each with a turning shade 'shade_i') ·
//                     search: { bone, at, dir, cone° } its searchlight, a cone of light through the cloud after dark }
//   LR.cloud.strikes = [t | { t, kind: 'cloud'|'rod'|'ground', rod }]   strikes a film can count on (any weather)
//   LR.cloud.strikeAt(time) → the strike lighting that time (or null) · LR.cloud.state(time) → the bank's numbers for that weather
//   ?off=cloud leaves the bank and its lightning out · ?strike=t:kind:rod,… adds strikes · ?clouddbg=1…4 shows what the march sees
{
  const T = THREE, CL = (LR.cloud = { host: null, strikes: [], on: false });
  const h1 = (a, b = 0) => LR.hash2(Math.floor(a) * 7919 + 31, b * 104729 + 11);
  // the tiers: the bank's picture as a share of the frame, steps through it, steps toward the light, and the most pixels it
  // may have whatever the screen (a 5K display at a share of 0.5 is 3.7 million rays: long enough for a GPU's watchdog to
  // kill the page — Chrome then blocks WebGL for the site until the browser restarts)
  const Q = { low: [0.34, 22, 3, 0.12e6], medium: [0.5, 32, 4, 0.22e6], high: [0.5, 42, 4, 0.34e6], ultra: [0.5, 54, 5, 0.5e6] };

  // ── the weather → the bank ─────────────────────────────────────────────────────────────────────────────────────────
  // σ: extinction (1/m) at full density · cover: how much of the noise is cloud · base: the flat underside, in the bank's own
  // units (−1 its lowest) · dark: how much light the storm swallows · erode: how ragged its edges are
  CL.state = () => { const W = LR.wx, rain = W.rain || 0, cloud = W.cloud || 0, fog = (W.cur && W.cur.fog) || 0.001, mist = LR.sm(0.004, 0.012, fog) * (1 - rain);
    const over = LR.sm(0.45, 0.95, cloud) * (1 - rain);
    const s = { sigma: 0.016 + 0.007 * over + 0.011 * mist + 0.06 * rain, cover: 0.62 + 0.1 * over + 0.13 * mist + 0.31 * rain, base: -0.64 - 0.08 * over - 0.06 * mist - 0.22 * rain, dark: 0.15 + 0.35 * over + 0.6 * rain, erode: 0.6 - 0.25 * rain };
    s.cover = Math.min(s.cover, 0.97); return s; };

  // ── strikes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  // one burst in each 6.5 s slot that rain grants it (more of them the heavier the rain), and the film's own
  const SLOT = 6.5, KINDS = ['cloud', 'cloud', 'cloud', 'rod', 'rod', 'ground'];
  const make = (t0, seed, kind, rod, first) => { const k = kind || KINDS[Math.floor(h1(seed, 3) * KINDS.length)], s = { t0, seed, kind: k, rod: rod === undefined ? Math.floor(h1(seed, 4) * 5) : rod, side: h1(seed, 5) < 0.5 ? -1 : 1, pulses: [], strokes: [] };
    if (k === 'cloud') { let t = 0; const n = 3 + Math.floor(h1(seed, 6) * 3), rv = first ? 0 : Math.floor(h1(seed, 7) * n); for (let i = 0; i < n; i++) { t += i ? 0.06 + 0.2 * h1(seed, 10 + i) : 0; s.pulses.push({ t, len: 0.05 + 0.1 * h1(seed, 20 + i), I: 0.55 + 0.45 * h1(seed, 30 + i), at: [(h1(seed, 40 + i) - 0.5) * 2.2, (h1(seed, 50 + i) - 0.3) * 1.0, (h1(seed, 60 + i) - 0.5) * 2.0], reveal: i === rv }); } s.dur = t + 0.3; }
    else { let t = 0; const n = 2 + Math.floor(h1(seed, 6) * 3); for (let i = 0; i < n; i++) { t += i ? 0.05 + 0.14 * h1(seed, 10 + i) : 0; s.strokes.push({ t, I: i ? 0.5 + 0.4 * h1(seed, 30 + i) : 1 }); }
      s.top = [(h1(seed, 41) - 0.5) * 90, 55 + 40 * h1(seed, 42), (h1(seed, 43) - 0.5) * 90]; s.ground = [(h1(seed, 44) - 0.5) * 60, 0, (h1(seed, 45) - 0.5) * 60]; s.crawl = 0.55 + 0.35 * h1(seed, 46);
      s.pulses.push({ t: 0, len: t + 0.12, I: 1, at: null, reveal: true }); s.dur = Math.max(t + 0.35, s.crawl + 0.25); }
    return s; };
  CL.strikeAt = (time) => { let best = null;
    for (const e of CL.strikes) { const o = typeof e === 'number' ? { t: e } : e; if (time >= o.t && time < o.t + 1.8) { const s = make(o.t, Math.round(o.t * 10) % 997, o.kind, o.rod, true);      /* (a film's own strike: its first flash is the one behind the hull) */ if (time < o.t + s.dur && (!best || s.t0 > best.t0)) best = s; } }
    if (best) return best; const rain = LR.wx.rain || 0; if (rain < 0.45) return null; const chance = 0.25 + 0.65 * LR.sm(0.45, 0.95, rain), k = Math.floor(time / SLOT);
    for (const kk of [k, k - 1]) { if (h1(kk, 1) > chance) continue; const t0 = kk * SLOT + 0.4 + h1(kk, 2) * (SLOT - 1.8), s = make(t0, kk % 997); if (time >= t0 && time < t0 + s.dur) return s; } return null; };
  // how bright a stroke is at an age (s), frame by frame at 24 a second: on, nearly off, on, a tail
  const FL = [1.0, 0.25, 0.8, 0.32, 0.12, 0.04, 0];
  const strokeI = (age) => { if (age < 0) return 0; const a = age * 24, i = Math.floor(a); return i > 6 ? 0 : FL[i] * (0.85 + 0.15 * h1(Math.floor(age * 48), 9)); };
  const pulseI = (p, age, seed) => { const a = age - p.t; if (a < 0 || a > p.len + 0.08) return 0; const env = a < p.len ? 1 : 1 - (a - p.len) / 0.08; return p.I * env * (0.45 + 0.55 * h1(Math.floor(a * 60) + seed * 13, 77)); };

  // ── shaders ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  // the noise: four tileable fields in one 64³ texture — r a Perlin-Worley (round billows with gaps between), g b a Worley
  // fbm at three frequencies each (the erosion), all repeating across the cube's faces
  const noiseFS = `//#include head
//#include hash
in vec2 vUv; out vec4 o; uniform float uZ;
vec3 hp(vec3 c, float P){ return hash33(mod(c, P) + P * 3.17); }
float worley(vec3 p, float P){ vec3 q = p * P, i = floor(q), f = fract(q); float md = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec3 of = vec3(float(x), float(y), float(z)); vec3 d = of + hp(i + of, P) - f; md = min(md, dot(d, d)); }
  return 1.0 - sqrt(md); }
float grad(vec3 c, vec3 f, float P){ vec3 g = hp(c, P) * 2.0 - 1.0; return dot(normalize(g + 1e-4), f); }
float perlin(vec3 p, float P){ vec3 q = p * P, i = floor(q), f = fract(q), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = grad(i, f, P), b = grad(i + vec3(1, 0, 0), f - vec3(1, 0, 0), P), c = grad(i + vec3(0, 1, 0), f - vec3(0, 1, 0), P), d = grad(i + vec3(1, 1, 0), f - vec3(1, 1, 0), P);
  float e = grad(i + vec3(0, 0, 1), f - vec3(0, 0, 1), P), f1 = grad(i + vec3(1, 0, 1), f - vec3(1, 0, 1), P), g = grad(i + vec3(0, 1, 1), f - vec3(0, 1, 1), P), h = grad(i + vec3(1, 1, 1), f - vec3(1, 1, 1), P);
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f1, u.x), mix(g, h, u.x), u.y), u.z) * 0.5 + 0.5; }
float wfbm(vec3 p, float P){ return worley(p, P) * 0.625 + worley(p, P * 2.0) * 0.25 + worley(p, P * 4.0) * 0.125; }
float remap(float v, float a, float b, float c, float d){ return c + (v - a) / (b - a) * (d - c); }
void main(){
  vec3 p = vec3(vUv, uZ);
  float pf = perlin(p, 4.0) * 0.6 + perlin(p, 8.0) * 0.28 + perlin(p, 16.0) * 0.12; pf = sat((pf - 0.5) * 1.7 + 0.5);
  float w = wfbm(p, 4.0), pw = sat(remap(pf, -(1.0 - w) * 0.9, 1.0, 0.0, 1.0));
  o = vec4(pw, wfbm(p, 3.0), wfbm(p, 6.0), wfbm(p, 12.0));
}`;
  // the bank, marched
  const CHUNK = `
uniform highp sampler3D tN3; uniform vec4 uBC, uBR, uBP, uBW, uBQ; uniform mat4 uShip; uniform vec4 uHullC[2], uHullR[2];
uniform vec4 uFl[3], uGl[3], uGlC[3], uSp, uSd;
float remap(float v, float a, float b, float c, float d){ return c + (v - a) / (b - a) * (d - c); }
// the bank's outline: an ellipsoid whose edge wanders with a slow noise, a flat ragged underside, a rounded top
float shapeAt(vec3 p, out float hg){
  vec3 q = (p - uBC.xyz) / uBR.xyz;
  float big = textureLod(tN3, (p - uBW.xyz) * 0.0021 + vec3(0.31, 0.17, 0.53), 0.0).g;
  hg = sat((q.y - uBR.w) / (1.0 - uBR.w));
  float r = length(vec3(q.x, (q.y - 0.05) * 0.95, q.z)) + (big - 0.45) * 0.6;
  return smoothstep(1.0, 0.62, r) * smoothstep(uBR.w - 0.04, uBR.w + 0.16, q.y + (big - 0.5) * 0.22) * smoothstep(1.0, 0.55, q.y);
}
float densAt(vec3 p, float hg, float sh, bool fine){
  vec3 np = (p - uBW.xyz) * uBC.w; vec4 n = textureLod(tN3, np, 0.0);
  // the Perlin-Worley lies in 0.45…0.86: spread it, let the Worley cells cut gaps, and bring the result to about even odds
  // (measured: then a coverage of c fills about c of the volume)
  float base = sat((n.r - 0.5) * 2.6); base = remap(base, (1.0 - n.g) * 0.55, 1.0, 0.0, 1.0); base = sat((base + 0.3) / 0.86);
  // the noise's own surfaces make the billows: coverage picks how much of it is cloud, the outline cuts it (not fades it)
  // round the host the cloud never opens a hole (the noise travels with it: a gap in front of it would stay there for minutes)
  vec3 hl = (uShip * vec4(p, 1.0)).xyz; float core = smoothstep(1.0, 0.3, length((hl + vec3(0.0, 14.0, 0.0)) / vec3(125.0, 66.0, 80.0)));      // (centred a little low: the gondola is in it too)
  base = mix(base, 0.45 + 0.55 * base, core); float cov = min(0.98, uBP.y * max(sh, core) + core * 0.3);
  float d = remap(base, 1.0 - cov, 1.0, 0.0, 1.0) * mix(0.55, 1.0, max(sh, core));
  if (d <= 0.0) return 0.0;
#ifndef CLOUD_CHEAP
  if (fine) { vec4 m = textureLod(tN3, np * 3.7 + vec3(0.0, uBW.w * 0.006, uBW.w * 0.003), 0.0); float det = m.g * 0.625 + m.b * 0.25 + m.a * 0.125;
    d = remap(d, mix(1.0 - det, det, sat(hg * 3.0)) * uBP.w * 0.8, 1.0, 0.0, 1.0); }
#endif
  return sat(d * 1.25) * uBP.x;
}
// how much of a flash at f reaches p past the host's hull (soft: a cloud blurs a shadow)
float shipLit(vec3 p, vec3 f){ vec3 a = (uShip * vec4(p, 1.0)).xyz, b = (uShip * vec4(f, 1.0)).xyz; float lit = 1.0;
  for (int i = 0; i < 2; i++) { if (uHullR[i].w < 0.5) continue; vec3 A = (a - uHullC[i].xyz) / uHullR[i].xyz, B = (b - uHullC[i].xyz) / uHullR[i].xyz, d = B - A; float t = clamp(-dot(A, d) / max(dot(d, d), 1e-6), 0.0, 1.0);
    lit = min(lit, smoothstep(0.82, 1.18, length(A + d * t))); }
  return lit; }
`;
  const cloudFS = `//#include head
//#include hash
//#include pack
//#include frame
//#include air
//#include sky
in vec2 vUv; out vec4 o; uniform sampler2D tDepth; uniform float uEnvMips;
${CHUNK}
float hgp(float mu, float g){ float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * mu, 1.5)); }
vec2 hitE(vec3 ro, vec3 rd, vec3 c, vec3 r){ vec3 o2 = (ro - c) / r, d2 = rd / r; float a = dot(d2, d2), b = dot(o2, d2), cc = dot(o2, o2) - 1.0, D = b * b - a * cc; if (D <= 0.0) return vec2(1.0, -1.0); D = sqrt(D); return vec2((-b - D) / a, (-b + D) / a); }
// optical depth toward the key light: a few steps, each longer than the last
float lightOD(vec3 p){ float od = 0.0, t = 0.0, ds = 7.0;
  for (int i = 0; i < LIGHT_STEPS; i++) { vec3 q = p + uSunDir * (t + ds * 0.5); float hg, sh = shapeAt(q, hg); if (sh > 0.001) od += densAt(q, hg, sh, i == 0) * ds; t += ds; ds *= 2.0; }
  return od; }
void main(){
  float d = textureLod(tDepth, vUv, 0.0).r; bool sky = d >= 0.999999;
  vec3 wp = worldAt(vUv, sky ? 0.99999 : d), rd = wp - uCamPos; float dist = length(rd); rd /= dist; if (sky) dist = 1e6;
  // what stands under the bank or in it loses some of its sun: the light's way out of the bank, coarsely
  float keep = 1.0;
  if (!sky) { vec2 hs = hitE(wp, uSunDir, uBC.xyz, uBR.xyz * 1.04); if (hs.y > 0.0) { float a = max(hs.x, 0.0), od = 0.0; for (int i = 0; i < 4; i++) { vec3 q = wp + uSunDir * mix(a, hs.y, (float(i) + 0.5) / 4.0); float hg, sh = shapeAt(q, hg); if (sh > 0.001) od += densAt(q, hg, sh, false); } od *= (hs.y - a) / 4.0;
      keep = mix(1.0, exp(-od * 0.9), 0.7 * (1.0 - uCloud.x * uCloud.w * 0.8)); } }
  vec2 th = hitE(uCamPos, rd, uBC.xyz, uBR.xyz * 1.04); float t0 = max(th.x, 0.0), t1 = min(th.y, uBQ.w > 3.5 ? (th.x + th.y) * 0.5 : dist);
#ifdef CLOUD_DEBUG
  if (uBQ.w > 2.5 && uBQ.w < 3.5) { o = vec4(min(dist, 2000.0) / 1000.0, t0 / 1000.0, th.y / 1000.0, 0.0) * 0.4; return; }
#endif
  if (t1 <= t0) { o = vec4(0.0, 0.0, 0.0, keep); return; }
  float jit = ign(gl_FragCoord.xy + mod(uFrame, 32.0) * vec2(5.588, 3.371)), mu = dot(rd, uSunDir);
  // two lobes (the silver edge looking toward the light, a softer back glow) and how much light the octaves keep
  float ph0 = mix(hgp(mu, 0.78), hgp(mu, -0.22), 0.32), ph1 = mix(hgp(mu, 0.39), hgp(mu, -0.11), 0.32), ph2 = 0.0796;
  vec3 sunC = uSunCol * PI, skyUp = envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0), skyLow = envAt(normalize(vec3(rd.x, 0.05, rd.z)), uEnvMips - 1.0);
  vec3 ground = vec3(0.085, 0.09, 0.085) * (uSunCol * max(uSunDir.y, 0.0) * (1.0 - uCloud.x * uCloud.w) + skyUp * 0.6);
  vec3 flash = uWx2.w * vec3(0.55, 0.62, 0.95) * 1.2;
  int N = STEPS; float ds = (t1 - t0) / float(N), T = 1.0, tw = 0.0, ws = 0.0, dmax = 0.0, shmax = 0.0; vec3 S = vec3(0.0);
  for (int i = 0; i < STEPS; i++) {
    float t = t0 + (float(i) + jit) * ds; vec3 p = uCamPos + rd * t; float hg, sh = shapeAt(p, hg); if (sh < 0.001) continue;
    float dn = densAt(p, hg, sh, true); shmax = max(shmax, sh); dmax = max(dmax, dn / uBP.x); if (dn <= 0.0) continue;
    float od = lightOD(p), pw = 1.0 - exp(-dn * 46.0);
    // the key light: what comes straight through (two lobes), and what has diffused through the cloud (a thick cloud in sun is
    // nearly as bright as white paper there: single scattering alone leaves it grey)
    vec3 sun = sunC * ((ph0 * exp(-od) + 0.6 * ph1 * exp(-od * 0.4)) * mix(pw, 1.0, 0.35 + 0.65 * sat(mu * 0.5 + 0.5)) + 0.11 * exp(-od * 0.12) * (0.55 + 0.45 * pw)) * (1.0 - 0.85 * uBP.z * uBP.z);      // (under a storm's own lid little sun is left to diffuse)
    // the sky's light: a thick cloud is as bright as the sky over it at its top and darker toward its base (light from above
    // has had the whole of it to get through), lit a little from the land beneath; storms swallow more of it
    float top = smoothstep(0.0, 1.0, hg), deep = mix(0.3, 1.0, top) * (1.0 - 0.6 * uBP.z * (1.0 - top));
    vec3 amb = (skyUp * deep * 1.15 + skyLow * 0.2 + ground * (1.0 - 0.7 * top)) * (0.6 + 0.4 * pw) + flash;
    vec3 inner = vec3(0.0);
    for (int k = 0; k < 3; k++) { if (uFl[k].w <= 0.0) continue; vec3 v = uFl[k].xyz - p; float l = length(v); inner += vec3(0.74, 0.82, 1.0) * uFl[k].w * 6.0 * exp(-l / 90.0) / (1.0 + l * l / 14400.0) * shipLit(p, uFl[k].xyz); }      // (light diffusing through a cloud: a glow a hundred metres and more across)
    for (int k = 0; k < 3; k++) { if (uGlC[k].w <= 0.0) continue; vec3 v = uGl[k].xyz - p; float l = length(v); inner += uGlC[k].rgb * uGlC[k].w * exp(-l / uGl[k].w) / (1.0 + l * l * 0.004); }
    // its searchlight: a cone of light through the cloud (strongest looking back up it)
    if (uSd.w > 0.0) { vec3 v = p - uSp.xyz; float l = length(v); vec3 lv = v / max(l, 1e-3); float cs = dot(lv, uSd.xyz); if (cs > uSp.w) inner += vec3(1.0, 0.93, 0.8) * uSd.w * smoothstep(uSp.w, mix(uSp.w, 1.0, 0.5), cs) * (0.3 + hgp(dot(lv, -rd), 0.6) * 6.0) / (1.0 + l * l * 0.0004) * exp(-l * 0.004); }
    vec3 L = sun + amb + inner;
    float a = exp(-dn * ds), w = T * (1.0 - a); S += w * L; tw += w * t; ws += w; T *= a;
    if (T < 0.008) break;
  }
  // the air between the eye and the cloud veils it as it veils everything else (the haze the air pass gives the far land)
  if (ws > 1e-5) { float tm = tw / ws, Tf = exp(-fogDepth(uCamPos, rd, tm)); vec3 hz = envAt(normalize(vec3(rd.x, 0.10 + max(rd.y, 0.0) * 0.5, rd.z)), 2.5);
    S = S * Tf + (1.0 - T) * (1.0 - Tf) * hz; }
  o = vec4(S, T * keep);
#ifdef CLOUD_DEBUG
  o = uBQ.w > 1.5 && uBQ.w < 2.5 || uBQ.w > 3.5 ? vec4(vec3(T) * 0.25, 0.0) : vec4(vec3(1.0 - T, dmax, shmax) * 0.6, 0.0);      // ?clouddbg=1: red how much of the ray it takes, green the densest, blue the outline · 2: what it lets through · 3: the march's range · 4: 2 for its near half      // ?clouddbg=1: how much of the eye's ray the bank takes, in red
#endif
}`;
  // joined to the picture: four low-res samples, each counted by how well its depth agrees with this pixel's
  const joinFS = `//#include head
//#include frame
in vec2 vUv; out vec4 o; uniform sampler2D tDepth, tCloud; uniform vec4 uLow;
void main(){ float z = viewZ(textureLod(tDepth, vUv, 0.0).r); vec2 f = vUv * uLow.xy - 0.5, b = floor(f), fr = f - b; vec4 acc = vec4(0.0); float ws = 0.0;
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) { vec2 c = (b + vec2(float(i), float(j)) + 0.5) * uLow.zw; float zs = viewZ(textureLod(tDepth, c, 0.0).r);
    float w = (i == 0 ? 1.0 - fr.x : fr.x) * (j == 0 ? 1.0 - fr.y : fr.y); w = max(w / (0.02 + abs(zs - z) / z * 40.0), 1e-6); acc += textureLod(tCloud, c, 0.0) * w; ws += w; }
  o = acc / ws; }`;
  // bolts and arcs: jagged strands as camera-facing segments, a white core and a blue glow, dimmed by the bank between them and the eye
  const NS = 12, SEG = 24, BR = 8, NBR = 2;
  const boltVS = `//#include head
//#include hash
//#include frame
in vec3 position; in vec4 seg; uniform mat4 viewMatrix, projectionMatrix; uniform vec4 uSA[${NS}], uSB[${NS}], uSM[${NS}], uSC[${NS}]; uniform vec4 uBC, uBR, uBP; out vec2 vQ; out float vI; out float vCore; out float vArc;
vec3 jag(vec3 A, vec3 B, float i, float n, float seed, float amp, bool pinned, vec3 s1, vec3 s2){ vec2 acc = vec2(0.0), all = vec2(0.0);
  for (int m = 0; m < ${SEG}; m++) { if (float(m) >= n) break; vec2 r = hash22(vec2(seed * 1.37 + float(m) * 7.31, seed * 0.71 + 3.3)) - 0.5; if (float(m) < i) acc += r; all += r; }
  if (pinned) acc -= all * i / n; return mix(A, B, i / n) + (s1 * acc.x + s2 * acc.y) * amp; }
vec3 bez(vec3 A, vec3 M, vec3 B, float t){ float s = 1.0 - t; return A * s * s + M * 2.0 * s * t + B * t * t; }
vec3 trunk(vec3 A, vec3 M, vec3 B, float i, float n, float sd, float amp, vec3 s1, vec3 s2){ return jag(A, B, i, n, sd, amp, true, s1, s2) - mix(A, B, i / n) + bez(A, M, B, i / n); }
// how much of the bank lies between a point and the eye (its ellipsoid, at its mean density)
float bankT(vec3 p){ vec3 ro = (uCamPos - uBC.xyz) / uBR.xyz, e = (p - uBC.xyz) / uBR.xyz, d = e - ro; float a = dot(d, d), b = dot(ro, d), c = dot(ro, ro) - 1.0, D = b * b - a * c; if (D <= 0.0) return 1.0; D = sqrt(D);
  float s0 = clamp((-b - D) / a, 0.0, 1.0), s1 = clamp((-b + D) / a, 0.0, 1.0); return exp(-(s1 - s0) * length((p - uCamPos)) * uBP.x * uBP.y * 0.45); }
void main(){
  int k = int(seg.x + 0.5); vec4 A = uSA[k], B = uSB[k], Mc = uSM[k], C = uSC[k]; float I = A.w; vec4 OFF = vec4(2.0, 2.0, 2.0, 1.0); if (I <= 0.0) { gl_Position = OFF; return; }
  float i = seg.y, n = seg.z, br = seg.w; if (br > 0.5 && br > C.x + 0.5) { gl_Position = OFF; return; }
  float sd = B.w; vec3 d = B.xyz - A.xyz; float L = max(length(d), 1e-3); vec3 dn = d / L, toE = normalize(uCamPos - Mc.xyz), s1 = normalize(cross(dn, toE)), s2 = normalize(cross(dn, s1)); float amp = L * Mc.w, taper = 1.0;
  vec3 P0, P1;
  if (br < 0.5) { P0 = trunk(A.xyz, Mc.xyz, B.xyz, i, n, sd, amp, s1, s2); P1 = trunk(A.xyz, Mc.xyz, B.xyz, i + 1.0, n, sd, amp, s1, s2); }
  else { float at = 3.0 + floor(hash11(sd + br * 3.1) * (${SEG}.0 - 8.0)); vec3 o0 = trunk(A.xyz, Mc.xyz, B.xyz, at, ${SEG}.0, sd, amp, s1, s2), dir = normalize(dn * 0.75 + s1 * (br < 1.5 ? 0.8 : -0.8) * (0.5 + hash11(sd * 3.3 + br)) + s2 * (hash11(sd + br * 7.0) - 0.5));
    vec3 E = o0 + dir * L * (0.14 + 0.18 * hash11(sd + br * 9.0)); P0 = jag(o0, E, i, n, sd + br * 17.0, amp * 0.6, false, s1, s2); P1 = jag(o0, E, i + 1.0, n, sd + br * 17.0, amp * 0.6, false, s1, s2); taper = 1.0 - (i + 0.5) / n * 0.75; I *= 0.5 * taper; }
  vec3 sdir = P1 - P0; float sl = length(sdir); sdir /= max(sl, 1e-4); vec3 side = normalize(cross(sdir, normalize(uCamPos - P0)));
  float dist = length(P0 - uCamPos), px = dist * 2.2 / uRes.y, core = max(C.y * 0.12, px * 0.7) * (0.55 + 0.45 * taper), w = core * (C.w > 0.5 ? 5.0 : 9.0);
  vec3 wp = mix(P0, P1, position.y * 0.5 + 0.5) + sdir * position.y * w * 0.5 + side * position.x * w;
  vQ = position.xy; vCore = w / core; vArc = C.w; vI = I * max(bankT(P0), C.w > 0.5 ? 0.35 : 0.18) * smoothstep(0.4, 1.5, dist);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`;
  const boltFS = `//#include head
//#include frame
in vec2 vQ; in float vI; in float vCore; in float vArc; out vec4 o; uniform sampler2D tDepth;
void main(){ float zs = viewZ(textureLod(tDepth, gl_FragCoord.xy * uRes.zw, 0.0).r), zp = viewZ(gl_FragCoord.z); float tol = 0.4 + zp * 0.01; if (zp > zs + tol) discard;
  float x = abs(vQ.x) * vCore, c = exp(-x * x * 1.6), g = exp(-abs(vQ.x) * 3.0) * (1.0 - vQ.y * vQ.y * 0.3);
  vec3 cc = vArc > 0.5 ? vec3(0.8, 0.95, 1.0) : vec3(0.86, 0.9, 1.0), gc = vArc > 0.5 ? vec3(0.1, 0.55, 1.0) : vec3(0.42, 0.52, 1.0);
  o = vec4((cc * c * 90.0 + gc * (g * g * 9.0 + g * 1.4)) * vI, 0.0); }`;

  // ── setting up ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const v = (value) => ({ value }), V4 = (n) => Array.from({ length: n }, () => new T.Vector4());
  const BU = { tN3: v(null), uBC: v(new T.Vector4()), uBR: v(new T.Vector4()), uBP: v(new T.Vector4()), uBW: v(new T.Vector4()), uBQ: v(new T.Vector4()), uShip: v(new T.Matrix4()), uHullC: v(V4(2)), uHullR: v(V4(2)), uFl: v(V4(3)), uGl: v(V4(3)), uGlC: v(V4(3)), uSp: v(new T.Vector4()), uSd: v(new T.Vector4()) };
  CL.U = BU; const sph = new T.Sphere(), frf = new T.Frustum(), pm = new T.Matrix4();
  CL.init = () => {
    if (LR.off.has('cloud') || !CL.host) return; const R = LR.render, G = LR.gpu, q = Q[G.tier.name] || Q.medium;
    // ?strike=12.5:rod:2,40:cloud — strikes at those clock times (to look at one in a still or live)
    for (const e of (LR.q('strike', '') || '').split(',').filter(Boolean)) { const [t, kind, rod] = e.split(':'); if (!isNaN(+t)) CL.strikes.push({ t: +t, kind: kind || undefined, rod: rod === undefined ? undefined : +rod }); }
    // the noise, once: 64 slices of the cube
    const N3 = 64, rt3 = new T.WebGL3DRenderTarget(N3, N3, N3, { format: T.RGBAFormat, type: T.UnsignedByteType, depthBuffer: false });
    const tex = rt3.texture; tex.wrapS = tex.wrapT = tex.wrapR = T.RepeatWrapping; tex.minFilter = tex.magFilter = T.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    const mN = LR.pass(noiseFS, { uZ: v(0) }); for (let z = 0; z < N3; z++) { mN.uniforms.uZ.value = (z + 0.5) / N3; LR.blit(mN, rt3, z); } LR.gpu.renderer.setRenderTarget(null); LR.settle(() => mN.dispose());
    BU.tN3.value = tex; CL.q = q; CL.tier = Q[G.tier.name] ? G.tier.name : 'medium';
    const S = LR.sky.U;
    CL.mCloud = LR.pass(cloudFS, Object.assign(LR.uni('uTime uFrame uRes uCamPos uNearFar uViewProj uInvViewProj uPrevViewProj uView uProj uInvProj uWx uWx2 uWind uNoise uFogCol uFog uSunDir uSunCol uSkyAmb uGroundAmb uCloud uCloudOff uLod'), S, BU, { tDepth: R.U.tDepth, uEnvMips: R.U.uEnvMips }),
      { defines: Object.assign({ STEPS: q[1], LIGHT_STEPS: q[2] }, G.tier.name === 'low' ? { CLOUD_CHEAP: 1 } : {}, LR.q('clouddbg') ? { CLOUD_DEBUG: 1 } : {}) });
    CL.mJoin = LR.pass(joinFS, Object.assign(LR.uni('uTime uFrame uRes uCamPos uNearFar uViewProj uInvViewProj uPrevViewProj uView uProj uInvProj uWx uWx2 uWind uNoise uLod'), { tDepth: R.U.tDepth, tCloud: v(null), uLow: v(new T.Vector4()) }),
      { blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.SrcAlphaFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });
    // the strands
    { const g = new T.BufferGeometry(), quad = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]; g.setAttribute('position', new T.BufferAttribute(new Float32Array(quad), 3));
      const per = SEG + NBR * BR, n = NS * per, a = new Float32Array(n * 4); for (let i = 0; i < n; i++) { const s = Math.floor(i / per), r = i % per; a[i * 4] = s; if (r < SEG) { a[i * 4 + 1] = r; a[i * 4 + 2] = SEG; a[i * 4 + 3] = 0; } else { const b = Math.floor((r - SEG) / BR); a[i * 4 + 1] = (r - SEG) % BR; a[i * 4 + 2] = BR; a[i * 4 + 3] = 1 + b; } }
      const ig = new T.InstancedBufferGeometry(); ig.setAttribute('position', g.attributes.position); ig.setAttribute('seg', new T.InstancedBufferAttribute(a, 4)); ig.instanceCount = n;
      CL.SU = { uSA: v(V4(NS)), uSB: v(V4(NS)), uSM: v(V4(NS)), uSC: v(V4(NS)) };
      const m = LR.material({ vertexShader: boltVS, fragmentShader: boltFS, uniforms: Object.assign(LR.uni('uTime uFrame uRes uCamPos uNearFar uViewProj uInvViewProj uPrevViewProj uView uProj uInvProj uWx uWx2 uWind uNoise uLod'), CL.SU, { uBC: BU.uBC, uBR: BU.uBR, uBP: BU.uBP, tDepth: R.U.tDepth }), depthTest: false, depthWrite: false, transparent: true, side: T.DoubleSide, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor });      // (light added: alpha 0 — three's AdditiveBlending would scale it by that 0)
      const mesh = new T.Mesh(ig, m); mesh.frustumCulled = false; CL.boltScene = new T.Scene(); CL.boltScene.add(mesh); CL.boltMesh = mesh; LR.passes.push(m); }
    R.after = R.after || []; R.after.push(CL.draw); CL.on = true;
    LR.on('frame', CL.update, 29);
  };
  const size = () => { const R = LR.render, s0 = CL.q[0], cap = CL.q[3] || 0.3e6, s = Math.min(s0, Math.sqrt(cap / Math.max(1, R.w * R.h))), w = Math.max(8, Math.round(R.w * s)), h = Math.max(8, Math.round(R.h * s)); if (!CL.rt || CL.rt.width !== w || CL.rt.height !== h) { if (CL.rt) CL.rt.dispose(); CL.rt = LR.rt(w, h, { type: LR.gpu.hdrType, filter: T.NearestFilter }); } return CL.rt; };
  CL.draw = (cam, time) => {
    if (!CL.on || !CL.live || !CL.vis) return; const R = LR.render, r = LR.gpu.renderer, rt = size();
    LR.blit(CL.mCloud, rt); CL.mJoin.uniforms.tCloud.value = rt.texture; CL.mJoin.uniforms.uLow.value.set(rt.width, rt.height, 1 / rt.width, 1 / rt.height); LR.blit(CL.mJoin, R.hdr);
    if (CL.boltMesh.visible) { r.setRenderTarget(R.hdr); r.render(CL.boltScene, cam); }
  };

  // ── each frame: where the bank is, how thick, what lights it, the strike and its strands ──────────────────────────────
  const apply = (f, p) => [f.p[0] + f.x[0] * p[0] + f.y[0] * p[1] + f.z[0] * p[2], f.p[1] + f.x[1] * p[0] + f.y[1] * p[1] + f.z[1] * p[2], f.p[2] + f.x[2] * p[0] + f.y[2] * p[1] + f.z[2] * p[2]];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const along = (pts, f) => { let L = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); acc.push(L); } const s = LR.clamp(f, 0, 1) * L; let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; return lerp3(pts[i - 1], pts[i], (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1])); };
  let lastStrike = -1;
  CL.update = (time, dt, cam) => {
    const H = CL.host, u = H && LR.mech.units.find((q) => q.name === H.unit); CL.live = !!(u && u.pose); if (!CL.live) return;
    // (not in view: no rays at all; a run of slow frames with it in view: a cheaper tier for the rest of the visit)
    { const B0 = u.pose.W.body, rmax = Math.max(...(H.radii || [235, 95, 190])); sph.center.set(B0.p[0], B0.p[1], B0.p[2]); sph.radius = rmax * 1.1; cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frf.setFromProjectionMatrix(pm); CL.vis = frf.intersectsSphere(sph) && cam.position.distanceTo(sph.center) < 2600;
      if (CL.vis && !LR.RENDER) { CL.slow = dt > 0.12 ? (CL.slow || 0) + 1 : 0; if (CL.slow > 4) { const order = ['ultra', 'high', 'medium', 'low'], i = order.indexOf(CL.tier || 'high'); if (i < order.length - 1) { CL.tier = order[i + 1]; CL.q = Q[CL.tier]; if (CL.mCloud.defines) { CL.mCloud.defines.STEPS = CL.q[1]; CL.mCloud.defines.LIGHT_STEPS = CL.q[2]; CL.mCloud.needsUpdate = true; } } CL.slow = 0; } } }
    const B = u.pose.W.body, st = CL.state(), c = [B.p[0] + H.offset[0], B.p[1] + H.offset[1], B.p[2] + H.offset[2]], rr = H.radii;
    BU.uBC.value.set(c[0], c[1], c[2], 1 / 230); BU.uBQ.value.w = +LR.q('clouddbg', 0); BU.uBR.value.set(rr[0], rr[1], rr[2], st.base); BU.uBP.value.set(st.sigma, st.cover, st.dark, st.erode);
    // the noise travels with the bank at nine tenths of its pace (it overtakes its own cloud slowly) and boils upward
    BU.uBW.value.set(c[0] * 0.9, c[1] * 0.9 - time * 0.25, c[2] * 0.9, time);
    { const m = new T.Matrix4().set(B.x[0], B.y[0], B.z[0], B.p[0], B.x[1], B.y[1], B.z[1], B.p[1], B.x[2], B.y[2], B.z[2], B.p[2], 0, 0, 0, 1); BU.uShip.value.copy(m).invert(); }
    (H.hulls || []).forEach((hh, i) => { if (i > 1) return; BU.uHullC.value[i].set(hh[0], hh[1], hh[2], 0); BU.uHullR.value[i].set(hh[3], hh[4], hh[5], 1); });
    // its own lights in the cloud after dark: the town's warm glow under it and the red of its beacons as their shades come round
    const night = LR.wx.lampsOn || 0, gl = BU.uGl.value, glc = BU.uGlC.value; for (let i = 0; i < 3; i++) glc[i].w = 0;
    if (H.glow) { const p = apply(B, H.glow); gl[0].set(p[0], p[1], p[2], 34); glc[0].set(1.0, 0.6, 0.28, 0.02 + 0.55 * night); }
    // the searchlight's cone (the host's beam lamp named in host.search), lit with the lamps
    BU.uSd.value.w = 0; if (H.search) { const f = u.pose.W[H.search.bone]; if (f) { const p = apply(f, H.search.at), d = [f.x[0] * H.search.dir[0] + f.y[0] * H.search.dir[1] + f.z[0] * H.search.dir[2], f.x[1] * H.search.dir[0] + f.y[1] * H.search.dir[1] + f.z[1] * H.search.dir[2], f.x[2] * H.search.dir[0] + f.y[2] * H.search.dir[1] + f.z[2] * H.search.dir[2]];
      BU.uSp.value.set(p[0], p[1], p[2], Math.cos(H.search.cone * Math.PI / 180)); BU.uSd.value.set(d[0], d[1], d[2], 0.03 + 2.2 * night); } }
    const toCam = (p) => { const dx = cam.position.x - p[0], dz = cam.position.z - p[2], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    const blink = (i) => { const f = u.pose.W['shade_' + i]; if (!f) return 1; const p = f.p, d = toCam(p), hx = Math.hypot(f.x[0], f.x[2]) || 1; return 0.06 + 0.94 * LR.sm(0.55, 0.97, (f.x[0] * d[0] + f.x[2] * d[1]) / hx); };
    if (H.beacons) { [0, 1].forEach((bi, j) => { const p = apply(B, H.beacons[bi]); gl[j + 1].set(p[0], p[1], p[2], 12); glc[j + 1].set(1.0, 0.05, 0.02, (0.02 + 0.5 * night) * blink(bi)); });
      // and their lamps (light and halo) pulse with the shades
      for (const l of LR.render.lamps || []) if (l.unit === u && !l.beam && l.color[1] < 0.2 && l.color[0] > 0.9) { let bi = 0, bd = 1e9; H.beacons.forEach((b, i) => { const p = apply(B, b), d = Math.hypot(p[0] - l.p[0], p[1] - l.p[1], p[2] - l.p[2]); if (d < bd) { bd = d; bi = i; } }); l.power *= blink(bi); } }
    // ── the strike ──
    const s = CL.strikeAt(time), U = CL.SU; for (let i = 0; i < NS; i++) U.uSA.value[i].w = 0; for (let i = 0; i < 3; i++) BU.uFl.value[i].w = 0; let used = 0, flash = 0;
    if (s) { const age = time - s.t0, Bc = B, ship = Bc.p, d2e = Math.hypot(ship[0] - cam.position.x, ship[1] - cam.position.y, ship[2] - cam.position.z);
      if (s.t0 !== lastStrike) { lastStrike = s.t0; if (!LR.RENDER) LR.emit('thunder', 0.4 + d2e / 340); }
      const fl = BU.uFl.value; let nf = 0; const lamp = (p, I) => { LR.render.lamps = LR.render.lamps || []; LR.render.lamps.push({ p, d: [0, 1, 0], color: [0.75, 0.82, 1.0], power: I * 26000, cone: 0, range: 260, beam: false, unit: u, arc: true, spill: 1 }); };
      if (s.kind === 'cloud') {
        // flashes inside the bank; the one marked to reveal goes behind the hull as the eye sees it, so the hull stands black in it
        for (const p of s.pulses) { const I = pulseI(p, age, s.seed); if (I <= 0.01 || nf >= 3) continue; let P;
          if (p.reveal) { const e = [ship[0] - cam.position.x, ship[1] - cam.position.y, ship[2] - cam.position.z], l = Math.hypot(...e) || 1; P = [ship[0] + (e[0] / l) * 42 + p.at[0] * 22, ship[1] + 12 + p.at[1] * 14, ship[2] + (e[2] / l) * 42 + p.at[2] * 22]; }
          else P = [c[0] + p.at[0] * rr[0] * 0.45, c[1] + p.at[1] * rr[1] * 0.6, c[2] + p.at[2] * rr[2] * 0.45];
          fl[nf++].set(P[0], P[1], P[2], I * 3.2); lamp(P, I * 0.8); flash = Math.max(flash, I); } }
      else { // a stroke: from high in the bank to a rod (or from the trailing wire to the ground), restriking, then the charge crawls down
        let I = 0; for (const k of s.strokes) I = Math.max(I, strokeI(age - k.t) * k.I); const rod = H.rods[s.rod % H.rods.length];
        let A, Bp; if (s.kind === 'rod') { Bp = apply(Bc, rod); A = [Bp[0] + s.top[0], Bp[1] + s.top[1], Bp[2] + s.top[2]]; }
        else { const f = H.trail && u.pose.W[H.trail.bone]; A = f ? apply(f, H.trail.at) : apply(Bc, [0, -40, 0]); Bp = [A[0] + s.ground[0], LR.land.h(A[0] + s.ground[0], A[2] + s.ground[2]), A[2] + s.ground[2]]; }
        const glowI = I > 0.02 ? I : age < s.strokes[s.strokes.length - 1].t + 0.3 ? 0.08 : 0;
        if (glowI > 0) { const k = U.uSA.value[used], sd = s.seed * 3 + Math.min(s.strokes.length - 1, Math.floor(age / 0.08)) * 17; const M = lerp3(A, Bp, 0.5); M[0] += (h1(s.seed, 81) - 0.5) * 20; M[2] += (h1(s.seed, 82) - 0.5) * 20;
          k.set(A[0], A[1], A[2], glowI * 1.4); U.uSB.value[used].set(Bp[0], Bp[1], Bp[2], sd % 997); U.uSM.value[used].set(M[0], M[1], M[2], 0.075); U.uSC.value[used].set(2, 0.9, 0, 0); used++;
          if (I > 0.05) { const top = s.kind === 'rod' ? lerp3(A, Bp, 0.25) : apply(Bc, [0, -10, 0]); fl[nf++].set(top[0], top[1], top[2], I * 3.0); lamp(lerp3(A, Bp, 0.6), I); flash = Math.max(flash, I); } }
        // the charge running down the conductors (a rod strike) or up the wire (a discharge): short arcs travelling along them
        if (age < s.crawl + 0.15) { const wires = s.kind === 'rod' ? H.wires.map((w) => w.map((p) => apply(Bc, p))) : [];
          let path = null; if (s.kind === 'rod') { const sp = wires[0], dsc = wires[s.side < 0 ? 1 : 2], ri = sp.reduce((bi, p, i) => (Math.abs(p[0] - Bp[0]) < Math.abs(sp[bi][0] - Bp[0]) ? i : bi), 0), ji = sp.reduce((bi, p, i) => (Math.abs(p[0] - dsc[0][0]) < Math.abs(sp[bi][0] - dsc[0][0]) ? i : bi), 0);
              const run = ri <= ji ? sp.slice(ri, ji + 1) : sp.slice(ji, ri + 1).reverse(); path = [Bp, ...run, ...dsc]; }
            else { const f = u.pose.W; path = [A, apply(f[H.trail.bone], [0, 0, 0]), apply(f[H.trail.bone.replace(/\d+$/, '1')], [0, 0, 0]), apply(f[H.trail.bone.replace(/\d+$/, '0')], [0, 0, 0])]; }
          for (let j = 0; j < 4 && used < NS; j++) { const f0 = (age / s.crawl) * 1.1 - j * 0.09, f1 = f0 + 0.05 + 0.04 * h1(s.seed + j, 91); if (f1 < 0 || f0 > 1) continue; const a = along(path, f0), b = along(path, f1), m = lerp3(a, b, 0.5), off = 0.6 + 1.4 * h1(Math.floor(age * 30) + j, s.seed);
            m[1] += off * 0.6; m[0] += (h1(Math.floor(age * 30), j + 5) - 0.5) * off; const Ia = (0.5 + 0.5 * h1(Math.floor(age * 48), j + 11)) * (1 - LR.sm(0.7, 1, f0)) * 0.7;
            U.uSA.value[used].set(a[0], a[1], a[2], Ia); U.uSB.value[used].set(b[0], b[1], b[2], (Math.floor(age * 30) * 7 + j * 13 + s.seed) % 997); U.uSM.value[used].set(m[0], m[1], m[2], 0.16); U.uSC.value[used].set(1, 0.25, 0, 1); used++;
            if (j === 0) lamp(b, 0.025 * Ia); } } }
      // the whole scene lit by it, by how near the eye is
      if (flash > 0) { const k = flash * (s.kind === 'cloud' ? 0.16 : 0.25 + 0.4 * Math.exp(-d2e / 600));      /* (a flash inside the cloud lights the land only through it: the hull stays dark against its glow) */ LR.wx.flash = Math.max(LR.RENDER ? 0 : LR.wx.flash, k * 0.85); LR.U.uWx2.value.w = Math.max(LR.U.uWx2.value.w, k * 0.85); } }
    CL.boltMesh.visible = used > 0; CL.strike = s;
  };
  LR.on('init', () => CL.init(), 63);
}
