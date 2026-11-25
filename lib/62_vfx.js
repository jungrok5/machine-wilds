// machine-wilds · 62_vfx — what the giants do to the world, and what the weather does to them: a footfall's burst (a
// skirt of dust running out over the ground, chunks of earth thrown and falling back, a crown of water and its rings in a
// brook, rings in the puddles in rain, powder in snow), earth dropping off a foot as it lifts, steam from a heavy leg's
// knee as it lifts, sparks from a joint that grinds under load, rain on wet iron (drips from the undersides, splashes on
// the backs, a breath of mist streaming off), the walker's own landing and its splashes, glints where a lamp looks into
// the lens, embers over a fire.
//
// Everything is a closed form of an age: nothing is simulated.  Each frame the CPU lists what is alive — footfalls and lifts
// read from LR.mech (pure functions of the clock), the walker's landings and steps (stamped with the frame's clock when
// they happen), and the one-shot bursts asked for below — keeps the nearest, and hands their places and ages to a few
// slots of uniforms; every particle's place is computed in its vertex shader from its slot's age and its own seed.  So a
// still, a film frame and the live page draw the same picture for the same clock.  Six draws in all (one a kind of thing),
// drawn with the other see-through things after the lit world; fogged like the water; fewer of everything on `low`.
//
// API ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
//   LR.vfx.burst(kind, [x, y, z], opts) → the burst (a one-shot effect).  kind:
//     'sparks'  hot streaks thrown from a point, falling, bouncing once, with a flash   opts.dir: the way they are thrown
//     'steam'   a jet of steam that slows, swells and drifts off                        opts.dir: the way the jet points
//     'dust'    a skirt of dust running out over the ground, a ring, a few chunks
//     'splash'  a crown of drops, a puff of spray, rings on the water
//     'debris'  chunks of earth / stone thrown up and falling back with gravity
//     'snow'    powder and clumps
//   opts: { t: start time on the frame clock (default: this frame's clock — give it for a film: then the burst is a pure
//           function of (clock − t)), size (m, ≈ 1 a giant's foot; default 1), n (0…1: how much; default 1), dir [x, y, z],
//           seed (number), id (a burst with the same id replaces the earlier one: safe to call every frame) }
//   Bursts with a start time in the future wait for it; each is dropped when it has played out.
//   LR.vfx.clear() forgets the one-shot bursts.  LR.vfx.events(time) lists what the slots are filled from (for checks).
//   ?off=vfx switches all of this off (and ?off=fx, with the rest of the particles).
{
  const T = THREE, VX = (LR.vfx = { parts: {}, bursts: [], pending: [], now: 0, info: {} });
  const KIND = { bits: { debris: 0, sparks: 1, drops: 2, mud: 3, snow: 4, clods: 5 }, puff: { skirt: 0, steam: 1, powder: 2, spray: 3, flash: 4, column: 5 }, ring: { dust: 0, water: 1, puddle: 2 } };
  const LIFE = { bits: 4.5, puff: 6, ring: 4 };
  const quad = () => { const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); return g; };
  const inst = (g, name, n, size, fill) => { const a = new Float32Array(n * size); for (let i = 0; i < n; i++) fill(a, i); g.setAttribute(name, new T.InstancedBufferAttribute(a, size)); g.instanceCount = n; return g; };

  // ── shader pieces ──
  const VHEAD = `//#include head
//#include hash
//#include pack
//#include frame
//#include air
//#include shadow
//#include shadowfast
uniform mat4 projectionMatrix, viewMatrix; uniform sampler2D uEnv; uniform float uEnvMips;
uniform sampler2D uHeight; uniform vec4 uLandRect; uniform sampler2D tDepth;
vec3 envAt(vec3 d, float lod){ return textureLod(uEnv, octEnc(d) * (1.0 - 2.0 / 64.0) + 1.0 / 64.0, lod).rgb; }
float landAt(vec2 xz){ return textureLod(uHeight, (xz - uLandRect.xy) * uLandRect.zw, 0.0).r; }
uniform sampler2D uTopo; uniform vec4 uTopoRect;
float roofAt(vec2 xz){ return textureLod(uTopo, (xz - uTopoRect.xy) * uTopoRect.zw, 0.0).r; }
vec3 camR(){ return vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); }
vec3 camU(){ return vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]); }
// the air between the eye and p: how much of p comes through, and the colour of the air in front of it
float fogT(vec3 p){ vec3 d = p - uCamPos; float l = max(length(d), 1e-3); return exp(-fogDepth(uCamPos, d / l, l)); }
vec3 fogC(vec3 p){ vec3 d = p - uCamPos; return envAt(normalize(vec3(d.x, 0.1, d.z)), 2.5); }
vec3 skyLight(){ return envAt(vec3(0.0, 1.0, 0.0), uEnvMips - 1.0); }
vec3 sunAt(vec3 p){ return uSunCol * shadowFast(p) * cloudShadow(p); }
const vec4 OFF = vec4(2.0, 2.0, 2.0, 1.0);
// is p behind what is drawn there (by more than tol metres)
bool hidden(vec3 p, float tol){ vec4 c = projectionMatrix * viewMatrix * vec4(p, 1.0); if (c.w <= 0.0) return true; vec2 uv = c.xy / c.w * 0.5 + 0.5; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return false; return viewZ(textureLod(tDepth, uv, 0.0).r) < c.w - tol; }
`;
  const FHEAD = `//#include head
//#include hash
//#include frame
uniform sampler2D tDepth;
float softDepth(float soft){ float zs = viewZ(textureLod(tDepth, gl_FragCoord.xy * uRes.zw, 0.0).r), zp = viewZ(gl_FragCoord.z); return sat((zs - zp) / soft); }
`;
  const mk = (name, geo, vs, fs, o = {}) => {
    const R = LR.render, L = LR.land;
    const uniforms = Object.assign(LR.uni(R.FRAME + ' uFogCol uFog uSunDir uSunCol uSkyAmb uGroundAmb uCloud uCloudOff uTopo uTopoRect uShadowMap uShadowMat uShadowInfo uShadowTexel'), LR.sky.U, { tDepth: R.U.tDepth, uEnvMips: R.U.uEnvMips, uHeight: L.U.uHeight, uLandRect: L.U.uLandRect }, o.uniforms || {});
    const m = LR.material({ vertexShader: VHEAD + vs, fragmentShader: FHEAD + fs, uniforms, depthTest: false, depthWrite: false, transparent: true, side: T.DoubleSide, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneMinusSrcAlphaFactor, defines: o.defines || {} });
    const mesh = new T.Mesh(geo, m); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.renderOrder = o.order || 0; mesh.name = 'vfx-' + name; LR.world.forward.add(mesh); VX.parts[name] = mesh; return mesh;
  };
  const slots = (n) => ({ uS0: { value: Array.from({ length: n }, () => new T.Vector4(0, 0, 0, -1)) }, uS1: { value: Array.from({ length: n }, () => new T.Vector4()) }, uS2: { value: Array.from({ length: n }, () => new T.Vector4()) } });

  VX.init = () => {
    if (LR.off.has('fx') || LR.off.has('vfx')) return;
    const tier = LR.gpu.tier, q = tier.fx, low = tier.name === 'low', NS = low ? 12 : 24, M = LR.mech;
    VX.NS = NS; VX.q = q;
    // ── bits: chunks of earth, mud, snow; sparks; drops of water.  A slot is one burst, PB particles a slot ──
    // slot: S0 = (x, y, z, age) · S1 = (size, kind, seed, amount 0…1) · S2 = (dir xyz, floor: 0 the land under each bit, 1 flat at y)
    { const PB = 56, U = (VX.bitsU = slots(NS));
      mk('bits', inst(quad(), 'seed', NS * PB, 4, (a, i) => { const r = LR.rng('vfxbits' + i); a[i * 4] = Math.floor(i / PB) + 0.5; a[i * 4 + 1] = ((i % PB) + 0.5) / PB; a[i * 4 + 2] = r(); a[i * 4 + 3] = r(); }), `
in vec3 position; in vec4 seed; uniform vec4 uS0[${NS}], uS1[${NS}], uS2[${NS}];
out vec2 vQ; out vec3 vAlb; out vec3 vAmb; out vec3 vSunC; out vec3 vSunV; out vec3 vFogC; out float vA; out float vOp; out float vShape; out float vEdge;
void main(){
  int k = int(seed.x); vec4 s0 = uS0[k], s1 = uS1[k], s2 = uS2[k]; float age = s0.w, sz = s1.x, kind = s1.y, j = seed.y;
  if (age < 0.0 || j > s1.w) { gl_Position = OFF; return; }
  vec3 h = hash33(vec3(seed.zw * 97.31, s1.z * 13.7 + j * 7.13)), h2 = hash33(h * 71.3 + 0.37);
  const vec3 G = vec3(0.0, -9.8, 0.0); vec3 p0 = s0.xyz, v0; float delay = 0.0, drag = 0.0, rad, life = 9.0, rest = 1.2;
  bool streak = false; float a = h.x * TAU;
  vec3 out1 = vec3(cos(a), 0.0, sin(a)), dir = length(s2.xyz) > 0.01 ? normalize(s2.xyz) : vec3(0.0, 1.0, 0.0);
  vec3 alb = vec3(0.19, 0.15, 0.11); vOp = 1.0; vShape = 0.0;
  if (kind < 0.5 || (kind > 2.5 && kind < 4.5)) {        // debris (0), mud (3), snow clumps (4): thrown out of the rim of the foot
    float el = mix(0.45, 1.25, h.y * h.y), sp = sqrt(19.6 * sz) * (0.45 + 0.75 * h.z) * (kind > 2.5 && kind < 3.5 ? 0.8 : 1.0);
    p0 += out1 * sz * (0.45 + 0.25 * h2.x) + vec3(0.0, 0.08 * sz, 0.0); v0 = (out1 * cos(el) + vec3(0.0, sin(el), 0.0)) * sp; delay = h2.y * 0.06;
    rad = sz * (0.012 + 0.042 * h2.z * h2.z * h2.z); if (kind > 3.5) { rad *= 1.4; alb = vec3(0.78, 0.8, 0.84); } else if (kind > 2.5) alb = vec3(0.075, 0.06, 0.045);
    else alb *= 0.75 + 0.5 * h2.x;
  } else if (kind < 1.5) {                                // sparks: a cone round dir, fast, quick to cool
    vec3 t1 = normalize(cross(dir, abs(dir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), t2 = cross(dir, t1); float c = mix(0.15, 0.95, h.y);
    v0 = normalize(dir + (t1 * cos(a) + t2 * sin(a)) * c) * (5.0 + 10.0 * h.z) * sqrt(max(sz, 0.2)); drag = 1.6; delay = h2.y * 0.12; rad = 0.011 + 0.008 * h2.z; life = 0.35 + 0.8 * h2.x; rest = 0.0; streak = true; vOp = 0.0; vShape = 1.0;
  } else if (kind < 2.5) {                                // drops: a crown, up and out of the water
    float el = mix(0.95, 1.45, h.y); p0 += out1 * sz * (0.35 + 0.3 * h2.x); v0 = (out1 * cos(el) + vec3(0.0, sin(el), 0.0)) * sqrt(19.6 * sz) * (0.5 + 0.7 * h.z); delay = h2.y * 0.08;
    rad = 0.012 + 0.012 * h2.z; rest = 0.0; streak = true; vShape = 2.0;
  } else {                                                // clods (5): earth let go by a lifting foot, between where the foot was (S0) and where it is going (S2)
    delay = h.y * 0.7; p0 = mix(s0.xyz, s2.xyz, sat(delay / 0.7)) + (out1 * 0.6 + vec3(0.0, -0.3, 0.0)) * sz * 0.45 * h.z; v0 = out1 * 0.6 * h2.x + vec3(0.0, -0.4, 0.0);
    rad = sz * (0.012 + 0.035 * h2.z * h2.z); alb = vec3(0.11, 0.085, 0.06);
  }
  float t = age - delay; if (t < 0.0) { gl_Position = OFF; return; }
  // flight: p0 + v t + g t²/2 (with drag for sparks), down to the floor; then it lies there and goes (earth) or bounces once (sparks)
  float flr = kind > 4.5 ? 0.0 : s2.w, fy0 = flr > 0.5 ? s0.y : landAt(p0.xz);
  float vy = v0.y, dy = p0.y - fy0 + rad, tl = (vy + sqrt(vy * vy + 19.6 * max(dy, 0.0))) / 9.8;
  if (flr < 0.5) { vec3 pl = p0 + v0 * tl; float f2 = landAt(pl.xz); dy = p0.y - f2 + rad; tl = (vy + sqrt(vy * vy + 19.6 * max(dy, 0.0))) / 9.8; fy0 = f2; }
  vec3 p, v; float k2 = drag > 0.0 ? (1.0 - exp(-drag * min(t, tl))) / drag : min(t, tl);
  p = p0 + v0 * k2 + 0.5 * G * min(t, tl) * min(t, tl); v = v0 * (drag > 0.0 ? exp(-drag * min(t, tl)) : 1.0) + G * min(t, tl);
  float fade = 1.0, spin = 0.0;
  if (t > tl) { float tr = t - tl;
    if (kind > 0.5 && kind < 1.5) { vec3 vb = vec3(v.x * 0.35, -v.y * 0.3, v.z * 0.35); p = vec3(p.x, fy0 + rad, p.z) + vb * tr + 0.5 * G * tr * tr; p.y = max(p.y, fy0 + rad); v = vb + G * tr; }
    else if (kind > 1.5 && kind < 2.5) { gl_Position = OFF; return; }
    else { p.y = fy0 + rad * 0.6; v = vec3(0.0); fade = 1.0 - smoothstep(rest * (0.4 + 0.6 * h2.x), rest * (0.4 + 0.6 * h2.x) + 0.8, tr); }
  }
  if (kind > 0.5 && kind < 1.5) fade = 1.0 - smoothstep(life * 0.6, life, t);
  if (fade <= 0.001) { gl_Position = OFF; return; }
  spin = (h2.x - 0.5) * 22.0 * min(t, tl) + h.x * 6.0;
  float d = length(p - uCamPos); vec3 R = camR(), Uu = camU(), wp;
  float px = d * 2.2 / uRes.y;                            // a pixel at that distance, about (a bit is never thinner than one)
  if (streak) { vec3 vv = length(v) > 0.01 ? v : vec3(0.0, -0.01, 0.0), toE = normalize(uCamPos - p), sd = normalize(cross(vv, toE)); float len = rad * 2.0 + length(vv) * (kind < 1.5 ? 0.05 : 0.035);
    wp = p + sd * position.x * max(rad, px * 0.6) + normalize(vv) * position.y * len * 0.5; }
  else { float cs = cos(spin), sn = sin(spin); vec2 rq = mat2(cs, sn, -sn, cs) * position.xy; float r2 = max(rad, px * 0.7), sp = length(v); wp = p + (R * rq.x + Uu * rq.y) * r2;
    if (sp > 0.5) wp += v / sp * position.y * min(sp * 0.018, r2 * 2.5); }      /* (a fast chunk is a little drawn out: a shutter's worth of its path) */
  vQ = position.xy; vEdge = h2.z * 40.0;
  float Tf = fogT(p); vFogC = fogC(p) * (1.0 - Tf);
  if (kind > 0.5 && kind < 1.5) { float heat = exp(-t * 2.2); vAlb = mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.75, 0.38), heat) * (5.0 + 22.0 * heat) * Tf; vAmb = vec3(1.0); vSunC = vec3(0.0); vFogC = vec3(0.0); vA = fade * (0.6 + 0.4 * sin(t * 50.0 + h.x * 30.0)); }
  else if (kind > 1.5 && kind < 2.5) { vAlb = vec3(Tf); vAmb = skyLight() * 1.9 + envAt(normalize(vec3(R.x, 0.2, R.z)), uEnvMips - 1.0) * 0.8; vSunC = sunAt(p) * 0.06; vA = 0.55 * fade; vOp = 0.5; }
  else { vAlb = alb * Tf; vAmb = skyLight() * 1.0 + envAt(vec3(0.0, -1.0, 0.0), uEnvMips - 1.0) * 1.4; vSunC = sunAt(p); vA = fade; }
  vSunV = vec3(dot(uSunDir, R), dot(uSunDir, Uu), dot(uSunDir, normalize(uCamPos - p)));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`, `in vec2 vQ; in vec3 vAlb; in vec3 vAmb; in vec3 vSunC; in vec3 vSunV; in vec3 vFogC; in float vA; in float vOp; in float vShape; in float vEdge; out vec4 o;
void main(){ float f = softDepth(0.12); if (f <= 0.0) discard; float m; vec3 c;
  if (vShape > 0.5) { m = (1.0 - abs(vQ.x)) * (1.0 - vQ.y * vQ.y); m *= m; c = vAlb * vAmb + vSunC; }
  else { float th = atan(vQ.y, vQ.x), e = 0.78 + 0.13 * sin(3.0 * th + vEdge) + 0.09 * sin(5.0 * th + vEdge * 1.7), r = length(vQ); m = smoothstep(e, e - 0.2, r); if (m < 0.01) discard;
    vec3 n = normalize(vec3(vQ / e, sqrt(max(1.0 - r * r / (e * e), 0.05)))); float ndl = max(dot(n, vSunV), 0.0); c = vAlb * (vAmb * (0.7 + 0.3 * n.y) + vSunC * ndl); }
  float a = m * vA * f; o = vec4((c + vFogC) * a, a * vOp); }`, { order: 3, uniforms: U }); }

    // ── puffs: dust skirts, steam, powder, spray, flashes — soft billows.  PP puffs a slot ──
    { const PP = 14, U = (VX.puffU = slots(NS));
      mk('puffs', inst(quad(), 'seed', NS * PP, 4, (a, i) => { const r = LR.rng('vfxpuff' + i); a[i * 4] = Math.floor(i / PP) + 0.5; a[i * 4 + 1] = ((i % PP) + 0.5) / PP; a[i * 4 + 2] = r(); a[i * 4 + 3] = r(); }), `
in vec3 position; in vec4 seed; uniform vec4 uS0[${NS}], uS1[${NS}], uS2[${NS}];
out vec2 vQ; out vec3 vC; out vec3 vFogC; out float vA; out float vOp; out float vId; out float vAge;
void main(){
  int k = int(seed.x); vec4 s0 = uS0[k], s1 = uS1[k], s2 = uS2[k]; float age = s0.w, sz = s1.x, kind = s1.y, j = seed.y;
  if (age < 0.0 || j > s1.w) { gl_Position = OFF; return; }
  vec3 h = hash33(vec3(seed.zw * 61.7, s1.z * 9.1 + j * 3.7)); float a = (j + h.x * 0.08) * TAU * 1.0 + s1.z * 6.0;
  vec3 out1 = vec3(cos(a), 0.0, sin(a)), wind = vec3(uWind.x, 0.0, uWind.y) * (0.4 + 1.8 * uWind.z), p, col; float s, al, t = age, op = 1.0;
  vec3 dust = vec3(0.50, 0.44, 0.36), Ls = skyLight(); vId = h.y * 31.0 + s1.z * 7.0;
  if (kind < 0.5) {                     // skirt: runs out low and fast over the ground from under the foot, then hangs and settles
    float r = sz * (0.35 + (2.2 + 1.2 * h.y) * (1.0 - exp(-t * 3.2))); p = s0.xyz + out1 * r + vec3(0.0, sz * (0.12 + 0.35 * (1.0 - exp(-t * 0.9)) * (0.5 + h.z)), 0.0) + wind * t * 0.6;
    s = sz * (0.32 + 0.75 * (1.0 - exp(-t * 2.0)) + 0.06 * t) * (0.75 + 0.5 * h.z); al = smoothstep(0.0, 0.05, t) * exp(-t * 0.95) * 0.42; col = dust;
  } else if (kind < 1.5) {              // steam: a jet that slows, swells, rises and goes with the wind
    vec3 dir = length(s2.xyz) > 0.01 ? normalize(s2.xyz) : vec3(0.0, 1.0, 0.0); float tb = j * 0.5, tt = t - tb; if (tt < 0.0) { gl_Position = OFF; return; }
    vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + 1e-4); float v0 = 7.0 * sqrt(sz);
    p = s0.xyz + dir * v0 * (1.0 - exp(-tt * 3.5)) / 3.5 + (side * (h.x - 0.5) + vec3(0.0, h.y - 0.5, 0.0)) * sz * 0.9 * tt + vec3(0.0, 0.7 * tt + 0.15 * tt * tt, 0.0) + wind * tt * tt * 0.5;
    s = sz * (0.1 + 1.0 * (1.0 - exp(-tt * 2.0))) + 0.3 * tt; al = smoothstep(0.0, 0.04, tt) * exp(-tt * 1.3) * 0.3 * (1.0 - j * 0.6); col = vec3(0.92, 0.94, 0.96); t = tt;
  } else if (kind < 2.5) {              // powder: snow thrown up and out, slow to fall back
    float r = sz * (0.3 + (2.0 + 1.6 * h.y) * (1.0 - exp(-t * 2.6))); p = s0.xyz + out1 * r + vec3(0.0, sz * (0.2 + 0.9 * (1.0 - exp(-t * 1.6)) * (0.4 + h.z)) - 0.25 * t * t * sz * 0.1, 0.0) + wind * t;
    s = sz * (0.4 + 0.9 * (1.0 - exp(-t * 2.0))) * (0.75 + 0.5 * h.z); al = smoothstep(0.0, 0.05, t) * exp(-t * 0.8) * 0.62; col = vec3(0.95, 0.97, 1.0);
  } else if (kind < 3.5) {              // spray over a splash: up with the crown, then hanging
    float r = sz * (0.25 + 1.0 * (1.0 - exp(-t * 3.0)) * (0.6 + h.y)); p = s0.xyz + out1 * r + vec3(0.0, sz * (0.2 + 1.8 * (1.0 - exp(-t * 2.4)) * (0.5 + h.z)) - 0.6 * t * t, 0.0) + wind * t;
    s = sz * (0.3 + 0.8 * (1.0 - exp(-t * 2.5))); al = smoothstep(0.0, 0.03, t) * exp(-t * 1.4) * 0.38; col = vec3(0.9, 0.95, 1.0);
  } else if (kind < 4.5) {              // flash: the hot point where sparks are struck (light, no body)
    if (j > 0.1) { gl_Position = OFF; return; } p = s0.xyz; s = sz * 0.5 * (1.0 + t * 4.0); al = exp(-t * 18.0) * 3.0; col = vec3(1.0, 0.62, 0.3) * 4.0; op = 0.0;
  } else {                              // column: what a giant's foot sends up and leaves standing in the air
    float r = sz * (0.2 + 0.9 * (1.0 - exp(-t * 0.9)) * h.y); p = s0.xyz + out1 * r + vec3(0.0, sz * (0.3 + 1.6 * (1.0 - exp(-t * 0.45)) * (0.3 + 0.9 * j)), 0.0) + wind * t * 1.2;
    s = sz * (0.55 + 0.9 * (1.0 - exp(-t * 0.7))) * (0.7 + 0.5 * h.z); al = smoothstep(0.0, 0.25, t) * exp(-t * 0.45) * 0.24; col = dust * 0.92;
  }
  al *= s2.w > 0.0 ? s2.w : 1.0;        // (a slot may thin its puffs: wet earth does not dust)
  float d = length(p - uCamPos); vec3 wp = p + (camR() * position.x + camU() * position.y) * s;
  al *= smoothstep(0.3, 1.5, d);         // (not across the lens)
  float Tf = fogT(p); vFogC = fogC(p) * (1.0 - Tf);
  if (op > 0.5) { float lit = 0.5 + 0.5 * dot(normalize(vec3(position.xy, 0.4)), vec3(dot(uSunDir, camR()), dot(uSunDir, camU()), 0.4)); vC = col * (Ls * 1.35 + sunAt(p) * (0.06 + 0.2 * lit)) * Tf; }
  else { vC = col * Tf; vFogC = vec3(0.0); }
  vA = al; vOp = op; vQ = position.xy; vAge = t;
  gl_Position = al > 0.002 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : OFF;
}`, `in vec2 vQ; in vec3 vC; in vec3 vFogC; in float vA; in float vOp; in float vId; in float vAge; out vec4 o;
void main(){ float f = softDepth(0.9); vec2 q = vQ; float n = texture(uNoise, q * 0.22 + vId * 0.37 + vec2(0.0, -vAge * 0.12)).r, n2 = texture(uNoise, q * 0.5 + vId).g;
  float m = smoothstep(1.0, 0.15, length(q) + (n - 0.5) * 0.95) * (0.4 + 0.8 * n2 * n2); if (vOp < 0.5) m = pow(max(1.0 - length(q), 0.0), 3.0);
  float a = m * vA * f; if (a < 0.002) discard; o = vec4((vC + vFogC) * a, a * vOp); }`, { order: 2, uniforms: U }); }

    // ── rings: flat on the ground or the water — a dust shock ring, rings on a brook, rings in the puddles ──
    { const U = (VX.ringU = slots(NS));
      mk('rings', inst(quad(), 'seed', NS, 4, (a, i) => { a[i * 4] = i + 0.5; a[i * 4 + 1] = 0.5; a[i * 4 + 2] = 0; a[i * 4 + 3] = 0; }), `
in vec3 position; in vec4 seed; uniform vec4 uS0[${NS}], uS1[${NS}], uS2[${NS}];
out vec2 vXZ; out vec3 vC; out vec3 vFogC; out float vA; out vec4 vR;
void main(){
  int k = int(seed.x); vec4 s0 = uS0[k], s1 = uS1[k]; float age = s0.w, sz = s1.x, kind = s1.y;
  if (age < 0.0) { gl_Position = OFF; return; }
  float cv = 0.35 + 1.1 * sqrt(sz), Rm = kind < 0.5 ? sz * (0.6 + 3.6 * (1.0 - exp(-age * 2.4))) : sz * 0.5 + cv * age + 0.3;      /* (rings run out at a speed that goes with the size of what made them) */
  vec3 c = s0.xyz + vec3(0.0, kind < 0.5 ? 0.06 + 0.02 * sz : 0.015, 0.0); vec3 wp = c + vec3(position.x, 0.0, position.y) * Rm;
  vXZ = position.xy * Rm; vR = vec4(age, sz, kind, s1.z);
  float Tf = fogT(c); vFogC = fogC(c) * (1.0 - Tf);
  vC = kind < 0.5 ? vec3(0.50, 0.44, 0.36) * (skyLight() * 1.3 + sunAt(c) * 0.2) * Tf : (skyLight() * 1.6 + envAt(normalize(vec3(c.x - uCamPos.x, 0.25, c.z - uCamPos.z)), 1.5) * 0.8) * Tf;
  vA = s1.w * (kind < 0.5 ? smoothstep(0.0, 0.04, age) * exp(-age * 1.9) * 0.4 : smoothstep(0.0, 0.05, age) * exp(-age * 1.1) * (kind > 1.5 ? 0.35 : 0.6));
  gl_Position = vA > 0.002 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : OFF;
}`, `in vec2 vXZ; in vec3 vC; in vec3 vFogC; in float vA; in vec4 vR; out vec4 o;
void main(){ float f = softDepth(vR.z < 0.5 ? 0.35 : 0.08); float r = length(vXZ), age = vR.x, sz = vR.y, m = 0.0;
  if (vR.z < 0.5) { float R0 = sz * (0.6 + 3.6 * (1.0 - exp(-age * 2.4))), w = sz * (0.35 + 0.5 * age); float n = texture(uNoise, vXZ * 0.21 / max(sz, 0.3) + vR.w).r;
    m = smoothstep(R0, R0 - w, r) * smoothstep(R0 - w * 2.2, R0 - w * 0.6, r) * (0.55 + 0.9 * n); }
  else { float cv = 0.35 + 1.1 * sqrt(sz); for (int i = 0; i < 4; i++) { float ti = age - float(i) * 0.3; if (ti < 0.0) break; float Ri = sz * 0.5 + cv * ti, w = 0.03 + 0.03 * sz + 0.03 * ti; m += smoothstep(w, 0.0, abs(r - Ri)) * exp(-ti * 0.9) * (1.0 - 0.2 * float(i)); }
    // a ring on water is never a drawn circle: wind and the ripples already there break it up
    float n = texture(uNoise, vXZ * 0.35 + vR.w * 0.13).r, an = texture(uNoise, vec2(atan(vXZ.y, vXZ.x) * 0.48, vR.w * 0.1)).g;
    m *= smoothstep(sz * 0.3, sz * 0.6, r) * smoothstep(0.15, 0.6, an) * (0.5 + 0.8 * n) * (vR.z > 1.5 ? smoothstep(0.35, 0.65, n) : 1.0); }
  float a = m * vA * f; if (a < 0.002) discard; o = vec4((vC + vFogC) * a, a * 0.6); }`, { order: 1, uniforms: U }); }

    // ── rain on iron: drips under, splashes on top, a breath of mist off the backs.  The points are laid on each kind's
    // own surface at load (by area) and ride its bones through the same texture the machine is drawn with ──
    if (M && M.units.length && M.boneTex) { const pts = [], rows = Array.from({ length: 24 }, () => new T.Vector4()), RU = { tBones: { value: M.boneTex }, uRowK: { value: rows } }, byKind = {};
      const want = (u) => !u.avatar && !u.fly && (u.K.spec.tonnes || 0) >= 30;
      for (const u of M.units) { if (!want(u)) continue; const K = u.K, kind = u.kind;
        if (!byKind[kind]) { const G = M.geometry(kind, 0).geometry, P = G.attributes.position.array, N = G.attributes.normal.array, B = G.attributes.bone.array, I = G.index.array, meta = G.attributes.meta.array, up = [], dn = [], upA = [0], dnA = [0];
          for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2]; if (meta[a * 4 + 1] & LR.FLAG.LAMP) continue;
            const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
            let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const ar = Math.hypot(nx, ny, nz) * 0.5; if (ar < 1e-5) continue; ny /= ar * 2;
            const vn = (N[a * 4 + 1] + N[b * 4 + 1] + N[c * 4 + 1]) / 381; const fy = Math.sign(ny) === Math.sign(vn) ? ny : -ny;      /* (the winding of a kit part is not always outward: the vertex normals say which side is out) */
            if (fy > 0.55) { up.push(t); upA.push(upA[upA.length - 1] + ar * fy); } else if (fy < -0.45) { dn.push(t); dnA.push(dnA[dnA.length - 1] + ar * -fy); } }
          byKind[kind] = { up, dn, upA, dnA, P, B, I, area: upA[upA.length - 1] + dnA[dnA.length - 1] }; }
        const S = byKind[kind], r = LR.rng('vfxrain' + u.name), tn = K.spec.tonnes || 50, big = Math.min(1, Math.sqrt(S.area) / 60), n = Math.round(Math.min(1400, 90 + S.area * 2.2) * q);
        const pick = (list, acc) => { const x = r() * acc[acc.length - 1]; let lo = 0, hi = list.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (acc[m + 1] < x) lo = m + 1; else hi = m; } const t = list[lo], a = S.I[t], b = S.I[t + 1], c = S.I[t + 2]; let w1 = r(), w2 = r(); if (w1 + w2 > 1) { w1 = 1 - w1; w2 = 1 - w2; } const w0 = 1 - w1 - w2; return [0, 1, 2].map((k) => S.P[a * 3 + k] * w0 + S.P[b * 3 + k] * w1 + S.P[c * 3 + k] * w2).concat(S.B[a]); };
        for (let i = 0; i < n; i++) { const kindR = i % 10 < 4 ? 0 : i % 10 < 9 ? 1 : 2, list = kindR === 0 ? S.dn : S.up, acc = kindR === 0 ? S.dnA : S.upA; if (!list.length) continue; const p = pick(list, acc); pts.push(p[0], p[1], p[2], p[3], u.row, kindR, r(), 0.6 + 1.4 * big); } }
      const n = pts.length / 8; if (n) { const g = quad(), a0 = new Float32Array(n * 4), a1 = new Float32Array(n * 4); for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) { a0[i * 4 + k] = pts[i * 8 + k]; a1[i * 4 + k] = pts[i * 8 + 4 + k]; } }
        g.setAttribute('rest', new T.InstancedBufferAttribute(a0, 4)); g.setAttribute('info', new T.InstancedBufferAttribute(a1, 4)); g.instanceCount = n; VX.rainU = RU; VX.info.rainPoints = n;
        mk('ironrain', g, `
in vec3 position; in vec4 rest; in vec4 info; uniform highp sampler2D tBones; uniform vec4 uRowK[24];
out vec2 vQ; out vec3 vC; out vec3 vFogC; out float vA; out float vKind; out float vId;
vec3 skinP(vec3 p, float bone, float row){ ivec2 q = ivec2(int(bone + 0.5) * 3, int(row + 0.5)); vec4 r0 = texelFetch(tBones, q, 0), r1 = texelFetch(tBones, q + ivec2(1, 0), 0), r2 = texelFetch(tBones, q + ivec2(2, 0), 0);
  return vec3(dot(r0.xyz, p) + r0.w, dot(r1.xyz, p) + r1.w, dot(r2.xyz, p) + r2.w); }
void main(){
  vec4 rk = uRowK[int(info.x + 0.5)]; float kind = info.y, sd = info.z, sc = info.w, wet = uWx.x, rain = uWx2.x;
  float on = rk.x * (kind < 0.5 ? wet : kind < 1.5 ? rain : rain * 0.9 + uWx2.y * 0.0); vKind = kind; vId = sd * 37.0;
  if (on < 0.01) { gl_Position = OFF; return; }
  vec3 base = skinP(rest.xyz, rest.w, info.x), p, wp; float al, d; vec3 R = camR(), Uu = camU(); vQ = position.xy;
  if (kind < 0.5) {                     // a drip: swells on the underside, lets go, falls
    float P = 0.7 + 1.3 * hash11(sd * 91.3), ph = uTime / P + sd * 17.0, gen = floor(ph), u = fract(ph); if (hash12(vec2(sd * 13.1, gen)) > on * 0.85) { gl_Position = OFF; return; }
    float tf = max(0.0, u - 0.3) * P, fall = 4.9 * tf * tf; p = base - vec3(0.0, fall + 0.02, 0.0); if (p.y < landAt(p.xz) + 0.02) { gl_Position = OFF; return; }
    vec3 vv = vec3(0.0, -9.8 * tf - 0.3, 0.0), toE = normalize(uCamPos - p), sdv = normalize(cross(vv, toE)); d = length(p - uCamPos); float px = d * 2.2 / uRes.y, len = 0.02 + 0.045 * 9.8 * tf;
    wp = p + sdv * position.x * max(0.006, px * 0.55) + vec3(0.0, 1.0, 0.0) * position.y * len * 0.5; al = (u < 0.3 ? smoothstep(0.0, 0.3, u) * 0.5 : 1.0) * (1.0 - smoothstep(0.75, 1.0, u)) * 0.55;
  } else if (kind < 1.5) {              // a splash on its back
    float life = fract(uTime * (2.0 + hash11(sd * 7.7)) + sd * 9.0), gen = floor(uTime * (2.0 + hash11(sd * 7.7)) + sd * 9.0); if (hash12(vec2(sd * 5.3, gen)) > on) { gl_Position = OFF; return; }
    vec2 jit = (hash22(vec2(sd * 3.1, gen)) - 0.5) * 0.35; p = base + vec3(jit.x, 0.02, jit.y); d = length(p - uCamPos); float px = d * 2.2 / uRes.y;
    if ((roofAt(p.xz) > p.y + 0.3 && roofAt(p.xz) < p.y + 40.0) || hidden(p, 0.35)) { gl_Position = OFF; return; }      /* (under a deck: nothing falls on it) */
    vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(uCamPos - p))); float s = max(0.035 + 0.08 * life, px * 1.2);
    wp = p + side * position.x * s * 1.5 + vec3(0.0, 1.0, 0.0) * (position.y + 1.0) * s * (1.2 - life); al = (1.0 - life) * 0.6;
  } else {                              // mist: warm iron in cold rain breathes
    float life = fract(uTime * 0.22 + sd * 5.0); p = base + vec3(0.0, 0.3 + 1.6 * life * sc, 0.0) + vec3(uWind.x, 0.0, uWind.y) * (0.3 + 2.2 * uWind.z) * life * sc * 1.2; d = length(p - uCamPos);
    float s = (0.35 + 1.1 * life) * sc; wp = p + (R * position.x + Uu * position.y) * s; al = sin(3.1416 * life) * 0.075 * smoothstep(1.5, 5.0, d);
  }
  al *= on * smoothstep(rk.y, rk.y * 0.6, d);
  float Tf = fogT(p); vFogC = fogC(p) * (1.0 - Tf);
  vC = (kind < 1.5 ? skyLight() * 1.9 + envAt(normalize(vec3(R.x, 0.15, R.z)), uEnvMips - 1.0) * 0.9 : skyLight() * 1.5) * Tf + uWx2.w * vec3(3.0, 4.0, 6.0) * 0.4;
  vA = al; gl_Position = al > 0.002 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : OFF;
}`, `in vec2 vQ; in vec3 vC; in vec3 vFogC; in float vA; in float vKind; in float vId; out vec4 o;
void main(){ float f = softDepth(vKind > 1.5 ? 0.6 : 0.04), m;
  if (vKind < 0.5) { m = (1.0 - abs(vQ.x)) * (1.0 - vQ.y * vQ.y); f = max(f, 0.0); }
  else if (vKind < 1.5) { float r = length(vQ * vec2(1.0, 1.4) + vec2(0.0, 0.6)); m = smoothstep(1.0, 0.72, r) * smoothstep(0.3, 0.68, r); f = 1.0; }
  else { float n = texture(uNoise, vQ * 0.25 + vId).r; m = smoothstep(1.0, 0.1, length(vQ) + (n - 0.5) * 0.8); }
  float a = m * vA * f; if (a < 0.002) discard; o = vec4((vC + vFogC) * a, a * (vKind > 1.5 ? 1.0 : 0.5)); }`, { order: 2, uniforms: RU }); } }

    // ── glints: where a machine's lamp looks into the lens — a hot point, a thin flare across, a halo in mist ──
    { const NL = 16, LU = (VX.lampU = { uL0: { value: Array.from({ length: NL }, () => new T.Vector4()) }, uL1: { value: Array.from({ length: NL }, () => new T.Vector4()) }, uL2: { value: Array.from({ length: NL }, () => new T.Vector4()) } });
      mk('glints', inst(quad(), 'seed', NL * 3, 4, (a, i) => { a[i * 4] = Math.floor(i / 3) + 0.5; a[i * 4 + 1] = i % 3; a[i * 4 + 2] = 0; a[i * 4 + 3] = 0; }), `
in vec3 position; in vec4 seed; uniform vec4 uL0[${NL}], uL1[${NL}], uL2[${NL}]; out vec2 vQ; out vec3 vC; out float vPart;
void main(){
  int k = int(seed.x); vec4 l0 = uL0[k], l1 = uL1[k], l2 = uL2[k]; float part = seed.y; vPart = part;
  if (l0.w <= 0.0) { gl_Position = OFF; return; }
  vec3 p = l0.xyz, toE = uCamPos - p; float d = length(toE); toE /= d;
  // how much the lamp looks at the eye: a beam inside its cone, a bare lamp from its front
  float c = dot(normalize(l1.xyz), toE), face = l1.w > 0.0 ? smoothstep(l1.w - 0.12, min(1.0, l1.w + 0.08), c) : smoothstep(0.2, 0.95, c);
  face = face * face; if (face < 0.002) { gl_Position = OFF; return; }
  // is the lamp itself in sight: five depth taps round where it falls on the picture
  vec4 cp = projectionMatrix * viewMatrix * vec4(p, 1.0); if (cp.w <= 0.0) { gl_Position = OFF; return; }
  vec2 uv = cp.xy / cp.w * 0.5 + 0.5; float zl = cp.w, rpx = max(2.0, l2.w / zl * uRes.y * 0.9), vis = 0.0;
  for (int i = 0; i < 5; i++) { vec2 o = i == 0 ? vec2(0.0) : vec2(cos(float(i) * 1.5708), sin(float(i) * 1.5708)) * rpx * 0.6; vec2 u2 = uv + o * uRes.zw; if (u2.x < 0.0 || u2.y < 0.0 || u2.x > 1.0 || u2.y > 1.0) continue;
    float zs = viewZ(textureLod(tDepth, u2, 0.0).r); vis += step(zl - l2.w * 2.5 - 0.3, zs); }
  vis /= 5.0; if (vis < 0.01) { gl_Position = OFF; return; }
  float Tf = fogT(p), mist = sat(uFog.x * 110.0), I = l0.w * face * vis;
  vec2 ext; float gain;
  if (part < 0.5) { ext = vec2(1.0) * (l2.w * 1.5 + d * 0.0022) * (1.0 + 0.8 * face); gain = 0.4 * Tf; }                           // the hot point
  else if (part < 1.5) { ext = vec2(16.0, 0.2) * (l2.w * 1.0 + d * 0.0022) * (0.6 + 0.6 * face); gain = 0.045 * Tf; }                     // the flare across
  else { ext = vec2(1.0) * (0.8 + 2.6 * mist + 0.01 * d) * (0.8 + 0.4 * face); gain = (0.01 + 0.03 * mist) * mix(Tf, 1.0, 0.6); }     // the halo the air makes of it
  vC = l2.rgb * I * gain;
  // (screen-aligned; the flare lies along the picture's own horizontal)
  vec3 wp = p + toE * l2.w * 1.5 + (camR() * position.x * ext.x + camU() * position.y * ext.y);
  vQ = position.xy; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`, `in vec2 vQ; in vec3 vC; in float vPart; out vec4 o;
void main(){ float m;
  if (vPart < 0.5) { float r = length(vQ), k = max(1.0 - r, 0.0); m = k * k * k * k * 2.0 + k * k * 0.25; float rays = pow(max(1.0 - abs(vQ.x * vQ.y) * 30.0, 0.0), 6.0) * k; m += rays * 0.6; }
  else if (vPart < 1.5) { float x = abs(vQ.x), y = abs(vQ.y); m = pow(max(1.0 - x, 0.0), 2.5) * exp(-y * y * 9.0); }
  else { float k = max(1.0 - length(vQ), 0.0); m = k * k * k; }
  o = vec4(vC * m, 0.0); }`, { order: 7, uniforms: LU }); }

    // ── embers: sparks of the fire going up, turning in the heat, going out ──
    { const fr = LR.world.fires || [], EK = Math.round(36 * q); if (fr.length && EK) mk('embers', inst(quad(), 'seed', fr.length * EK, 4, (a, i) => { const s = fr[Math.floor(i / EK)], r = LR.rng('ember' + i); a[i * 4] = s.x; a[i * 4 + 1] = s.y; a[i * 4 + 2] = s.z; a[i * 4 + 3] = r() * 0.999 + Math.round(s.size * 10) ; }), `
in vec3 position; in vec4 seed; out vec2 vQ; out vec3 vC;
void main(){ float sz = floor(seed.w) * 0.1, r = fract(seed.w), life = 1.6 + 1.8 * hash11(r * 91.0), ph = uTime / life + r * 13.0, u = fract(ph), gen = floor(ph);
  vec3 h = hash33(vec3(r * 31.0, gen, 1.7)); float t = u * life;
  vec3 p = seed.xyz + vec3((h.x - 0.5) * sz * 0.9, 0.1, (h.y - 0.5) * sz * 0.9) + vec3(0.0, (0.9 + 1.2 * h.z) * t - 0.08 * t * t, 0.0);
  p.xz += vec2(sin(t * (2.0 + 3.0 * h.x) + h.y * 9.0), cos(t * (1.7 + 2.0 * h.z) + h.x * 7.0)) * 0.12 * t + vec2(uWind.x, uWind.y) * (0.3 + 1.5 * uWind.z) * t * t * 0.4;
  float d = length(p - uCamPos), px = d * 2.2 / uRes.y, s = max(0.009 + 0.006 * h.z, px * 0.6), heat = 1.0 - u;
  float tw = 0.55 + 0.45 * sin(uTime * (14.0 + 10.0 * h.x) + h.y * 40.0); vC = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.6, 0.2), heat * heat) * (3.0 + 9.0 * heat * heat) * tw * smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.75, u) * fogT(p);
  vQ = position.xy; vec3 wp = p + (camR() * position.x + camU() * position.y) * s * (1.0 + 1.5 * step(0.5, position.y) * 0.0);
  gl_Position = d < 60.0 ? projectionMatrix * viewMatrix * vec4(wp, 1.0) : OFF; }`,
      `in vec2 vQ; in vec3 vC; out vec4 o; void main(){ float f = softDepth(0.2); float k = max(1.0 - length(vQ), 0.0); o = vec4(vC * k * k * f, 0.0); }`, { order: 6 }); }

    LR.on('frame', VX.update, 27);
  };

  // ── what is alive this frame ─────────────────────────────────────────────────────────────────────────────────────
  // an emitter: { prog: 'bits' | 'puff' | 'ring', kind, p, age, size, n, seed, dir, floor (bits: 1 flat at y), thin (puffs: alpha), w (weight for choosing) }
  const H = (a, b, c) => LR.hash2((a * 73856093) ^ (b * 19349663), c * 83492791 + 7);
  const wetAt = (x, y, z) => { const L = LR.water ? LR.water.levelAt(x, z) : -1e9; return L > y + 0.05 ? L : null; };
  // what a burst of a kind is made of
  const expand = (out, kind, p, age, o) => {
    const sz = o.size === undefined ? 1 : o.size, n = o.n === undefined ? 1 : o.n, seed = o.seed === undefined ? (p[0] * 7.13 + p[2] * 3.71) % 97 : o.seed, dir = o.dir || [0, 1, 0], w = o.w || 1, fl = o.floor ? 1 : 0;
    const E = (prog, k, x) => out.push(Object.assign({ prog, kind: KIND[prog][k], p, age, size: sz, n, seed, dir, floor: fl, thin: 1, w }, x || {}));
    if (kind === 'sparks') { E('bits', 'sparks', { n: Math.min(1, 0.35 + 0.65 * n) }); E('puff', 'flash', { size: Math.max(0.3, sz * 0.6) }); }
    else if (kind === 'steam') E('puff', 'steam', { n: Math.min(1, 0.4 + 0.6 * n) });
    else if (kind === 'dust') { E('puff', 'skirt'); E('ring', 'dust'); E('bits', 'debris', { n: 0.35 * n }); }
    else if (kind === 'debris') E('bits', 'debris');
    else if (kind === 'splash') { E('bits', 'drops'); E('puff', 'spray', { n: 0.6 * n }); E('ring', 'water'); }
    else if (kind === 'snow') { E('puff', 'powder'); E('bits', 'snow', { n: 0.5 * n }); }
    else if (kind === 'mud') { E('bits', 'mud', { n: 0.6 * n }); E('puff', 'skirt', { thin: 0.35 }); E('bits', 'drops', { n: 0.3 * n, size: sz * 0.5 }); }
    else if (kind === 'column') E('puff', 'column');
  };
  // a footfall, by what it lands in: water, snow, mud in the rain, or dry earth and stone
  const footfall = (out, f, o) => { const water = wetAt(f.x, f.y, f.z), wx = LR.wx, sz = o.size, at = [f.x, water === null ? f.y : water, f.z];
    if (water !== null) { expand(out, 'splash', at, f.age, Object.assign({}, o, { size: sz * 0.8, floor: true })); return; }
    const paved = LR.land.coverAt ? LR.land.coverAt('paved', f.x, f.z) : 0;
    if (wx.snow > 0.35) { expand(out, 'snow', at, f.age, Object.assign({}, o, { n: o.n * wx.snow })); expand(out, 'debris', at, f.age, Object.assign({}, o, { n: 0.25 * o.n, seed: o.seed + 1 })); return; }
    if (wx.wet > 0.4) { expand(out, 'mud', at, f.age, o); out.push({ prog: 'ring', kind: KIND.ring.puddle, p: at, age: f.age, size: sz * 0.7, n: LR.sat(wx.puddle) * 0.8, seed: o.seed, dir: [0, 1, 0], floor: 0, thin: 1, w: o.w }); return; }
    expand(out, 'dust', at, f.age, Object.assign({}, o, { n: o.n * (1 - 0.6 * paved) })); expand(out, 'debris', at, f.age, Object.assign({}, o, { n: o.n * (0.55 + 0.45 * (1 - paved)), seed: o.seed + 1 }));
    if (o.heavy) expand(out, 'column', at, f.age, Object.assign({}, o, { size: sz * 1.3, n: 1 })); };

  VX.events = (time, cam) => {
    const out = [], M = LR.mech, cp = cam ? cam.position : { x: 0, y: 0, z: 0 };
    // the giants' footfalls (their places and ages are what the walk says at this clock)
    if (M && M.impacts) for (const f of M.impacts) { const tn = f.tonnes || 0; if (tn < 20 || f.age > 4.5 || f.unit.fly) continue; const sc = Math.cbrt(tn / 86), sz = f.size * (0.7 + 0.3 * sc), row = f.unit.row || 0, seed = (H(row, f.k | 0, f.leg.charCodeAt(0) + f.leg.length * 7) * 97) % 97;
      footfall(out, f, { size: sz, n: LR.sat(0.45 + 0.4 * sc), seed, w: sz, heavy: tn > 1000 });
      // a joint that grinds as the weight comes on it: sparks from the knee, now and then
      if (tn >= 80 && f.age < 1.5 && f.unit.pose && H(row, f.k | 0, 5) < (tn > 1000 ? 0.45 : 0.22)) { const l = f.unit.kin.limbs.find((x) => x.name === f.leg), sol = f.unit.pose.sols && f.unit.pose.sols[f.leg]; if (l && sol) { const J = sol.J[1], B = f.unit.pose.W.body, side = [B.z[0] * l.side, 0.6, B.z[2] * l.side];
          expand(out, 'sparks', J, f.age - 0.05, { size: Math.min(2.5, 0.5 + 0.3 * sc), n: 0.8, seed: seed + 11, dir: side, floor: false, w: sz * 1.2 }); } } }
    // lifts: steam from the knee of a heavy leg as it comes up, earth dropping off the foot
    if (M) for (const u of M.units) { const tn = u.K.spec.tonnes || 0; if (u.avatar || u.fly || u.post || tn < 30 || !u.pose || !u.T || u.lod < 0 || u.dist > 220) continue; const c = u.pose.cmd; if (!c || c.rate < 0.05) continue;
      for (const l of u.kin.limbs) { const lq = c.limbs[l.name]; if (!lq || !lq.sw) continue; const la = lq.s * (1 - (u.duty || 0.6)) * u.T; if (la > 3) continue; const k = lq.k | 0, sc = Math.cbrt(tn / 86), seed = (H(u.row, k, 31 + l.name.length) * 97) % 97;
        const c0 = M.cmd(u, time - la + 0.05), q0 = c0.limbs[l.name]; let knee = null, foot0 = q0 ? q0.p : null; if (q0) { const sol = l.solve(c0.body, q0.p, q0.gamma); knee = sol.J[1]; }
        if (knee && tn >= 60 && H(u.row, k, 3) < 0.7) { const B = c0.body, out1 = [B.z[0] * l.side * 0.8 - B.x[0] * 0.3, 0.55, B.z[2] * l.side * 0.8 - B.x[2] * 0.3]; expand(out, 'steam', knee, la - 0.04, { size: Math.min(3.2, 0.55 * sc + 0.15), n: 0.8, seed, dir: out1, w: sc * 1.5 }); }
        if (foot0 && la < 2.5 && LR.wx.snow < 0.35 && wetAt(foot0[0], foot0[1], foot0[2]) === null) { const c1 = M.cmd(u, time - la + 0.6).limbs[l.name]; if (c1) { const sz = l.ball * 1.1 + l.toeLen * 0.6; out.push({ prog: 'bits', kind: KIND.bits.clods, p: [foot0[0], foot0[1] - l.ball * 0.4, foot0[2]], age: la - 0.1, size: sz * 0.7, n: LR.wx.wet > 0.4 ? 0.7 : 0.4, seed, dir: [c1.p[0], c1.p[1] - l.ball * 0.4, c1.p[2]], floor: 0, thin: 1, w: sz * 0.6 }); } } } }
    // the one-shot bursts and the walker's own
    for (const b of VX.bursts) { const age = time - b.t; if (age < 0 || age > LIFE.puff) continue; expand(out, b.kind, b.p, age, b.o); }
    // (nearest and largest first; what is behind the eye does not need a slot)
    const fx = cam ? new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion) : null;
    for (const e of out) { const dx = e.p[0] - cp.x, dy = e.p[1] - cp.y, dz = e.p[2] - cp.z, d = Math.hypot(dx, dy, dz), r = e.size * 4 + 3, behind = fx && d > r && (dx * fx.x + dy * fx.y + dz * fx.z) < -r; e.d = d; e.score = behind || e.age > LIFE[e.prog] ? -1 : (e.w * 4 + e.size) / (d + 8) * (1.2 - Math.min(1, e.age / LIFE[e.prog])); }
    return out;
  };
  const fill = (U, list, NS) => { for (let i = 0; i < NS; i++) { const e = list[i]; if (!e) { U.uS0.value[i].w = -1; continue; } U.uS0.value[i].set(e.p[0], e.p[1], e.p[2], Math.max(0, e.age)); U.uS1.value[i].set(e.size, e.kind, e.seed, LR.sat(e.n * (VX.q < 0.75 ? 0.6 : 1))); U.uS2.value[i].set(e.dir[0], e.dir[1], e.dir[2], e.prog === 'bits' ? e.floor : e.prog === 'puff' ? e.thin : 0); } };
  const frustum = new T.Frustum(), pm = new T.Matrix4(), sph = new T.Sphere();

  VX.update = (time, dt, cam) => {
    VX.now = time;
    // the walker's landings and steps since the last frame take this frame's clock as their start
    if (VX.pending.length) { for (const b of VX.pending) b.t = time; VX.bursts.push(...VX.pending); VX.pending.length = 0; }
    VX.bursts = VX.bursts.filter((b) => time - b.t <= LIFE.puff && b.t - time < 600); if (VX.bursts.length > 160) VX.bursts.splice(0, VX.bursts.length - 160);
    const ev = VX.events(time, cam), by = { bits: [], puff: [], ring: [] }; for (const e of ev) if (e.score > 0) by[e.prog].push(e);
    for (const k in by) by[k].sort((a, b) => b.score - a.score);
    fill(VX.bitsU, by.bits, VX.NS); fill(VX.puffU, by.puff, VX.NS); fill(VX.ringU, by.ring, VX.NS);
    VX.info.slots = { bits: Math.min(VX.NS, by.bits.length), puff: Math.min(VX.NS, by.puff.length), ring: Math.min(VX.NS, by.ring.length), wanted: ev.length };
    const P = VX.parts; P.bits.visible = by.bits.length > 0; P.puffs.visible = by.puff.length > 0; P.rings.visible = by.ring.length > 0;
    // rain on iron: which machines are near and in view (and how far its drops and splashes are worth drawing)
    if (VX.rainU && P.ironrain) { const R = VX.rainU.uRowK.value, M = LR.mech, on = LR.wx.wet > 0.02 || LR.wx.rain > 0.01; P.ironrain.visible = on;
      if (on) for (const u of M.units) { if (u.row === undefined) continue; const big = Math.min(1, (u.K.radius || 10) / 30), reach = 38 + 110 * big; R[u.row].set(u.lod >= 0 && u.dist < reach + (u.K.radius || 10) ? 1 : 0, reach + (u.K.radius || 0), 0, 0); } }
    // glints: the lamps that look this way most, in view
    if (VX.lampU && P.glints) { const L = (LR.mech && LR.mech.lamps) || [], U = VX.lampU, cp = cam.position; cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
      const list = []; for (const l of L) { if (l.self || !(l.power > 0.01)) continue; const dx = cp.x - l.p[0], dy = cp.y - l.p[1], dz = cp.z - l.p[2], d = Math.hypot(dx, dy, dz) || 1, c = (l.d[0] * dx + l.d[1] * dy + l.d[2] * dz) / d; if (c < 0.15 || d > 400) continue; sph.center.set(l.p[0], l.p[1], l.p[2]); sph.radius = 1; if (!frustum.intersectsSphere(sph)) continue; list.push({ l, s: (l.power * c * c) / (d + 20) }); }
      list.sort((a, b) => b.s - a.s); for (let i = 0; i < 16; i++) { const e = list[i]; if (!e) { U.uL0.value[i].w = 0; continue; } const l = e.l, col = l.color || [1, 0.8, 0.6], lens = l.lens || LR.clamp(0.1 + 0.12 * Math.cbrt(((l.unit && l.unit.K.spec.tonnes) || 50) / 86), 0.08, 0.6);
        U.uL0.value[i].set(l.p[0], l.p[1], l.p[2], Math.min(8, l.power)); U.uL1.value[i].set(l.d[0], l.d[1], l.d[2], l.beam && l.cone > 0 ? Math.cos(Math.min(1.2, l.cone * 1.15)) : -1); U.uL2.value[i].set(col[0], col[1], col[2], lens); }
      P.glints.visible = list.length > 0; VX.info.glints = list.length; }
  };

  // ── the API ──
  VX.burst = (kind, p, o = {}) => { const b = { kind, p: [p[0], p[1], p[2]], o: Object.assign({}, o), t: o.t === undefined ? VX.now : o.t, id: o.id };
    if (b.id !== undefined) { const i = VX.bursts.findIndex((x) => x.id === b.id); if (i >= 0) VX.bursts.splice(i, 1); }
    else { const key = kind + '|' + b.t.toFixed(3) + '|' + b.p.map((v) => v.toFixed(2)).join(','); const i = VX.bursts.findIndex((x) => x.key === key); if (i >= 0) VX.bursts.splice(i, 1); b.key = key; }
    VX.bursts.push(b); return b; };
  VX.clear = () => { VX.bursts.length = 0; VX.pending.length = 0; };
  // the walker's own: a dust ring and a little earth on a hard landing (spray where it is wet); a splash from each foot when it runs in the wet
  const later = (kind, p, o) => { if (VX.NS) VX.pending.push({ kind, p, o }); };
  LR.on('landed', (e) => { const P = LR.player; if (!P || LR.off.has('vfx')) return; const s = LR.sat((e.speed - 4.6) / 7), at = [P.x, P.y, P.z], o = { size: 0.45 + 0.35 * s, n: 0.4 + 0.6 * s, floor: true, w: 2 };
    if (e.surface === 'water') later('splash', at, o); else if (LR.wx.snow > 0.35) later('snow', at, o); else if (LR.wx.wet > 0.4) { later('mud', at, o); later('splash', at, Object.assign({}, o, { size: o.size * 0.6, n: 0.5 })); } else { later('dust', at, o); later('debris', at, Object.assign({}, o, { size: o.size * 0.8 })); } });
  LR.on('avatarstep', (e) => { if (LR.off.has('vfx') || !(e.speed > 1.5)) return; const P = LR.player, water = wetAt(e.p[0], e.p[1], e.p[2]), wet = water !== null || LR.wx.wet > 0.4, run = LR.sat((e.speed - 2.5) / 3.5);
    if (wet) later('splash', [e.p[0], water === null ? e.p[1] : water, e.p[2]], { size: 0.16 + 0.12 * run, n: 0.35 + 0.4 * run, floor: true, w: 1.2 });
    else if (LR.wx.snow > 0.35) later('snow', e.p, { size: 0.2 + 0.1 * run, n: 0.3 + 0.3 * run, floor: true, w: 0.8 });
    else if (run > 0.3 && P && P.surface !== 'paved') later('dust', e.p, { size: 0.18 + 0.1 * run, n: 0.3 * run, floor: true, w: 0.6 }); });
  LR.on('init', () => VX.init(), 61);
}
