#version 300 es
precision highp float;
in vec2 vQ; uniform float vA, vId, vAge; uniform vec3 vC, vAmb, vSunW, vSunS, vFogC; uniform sampler2D uNoise; out vec4 o; const float vOp = 1.0;
float sat(float x){ return clamp(x, 0.0, 1.0); }
// a puff as a lit sprite: a billow drawn in its plane by warped noise that rolls as it ages, its relief taken from the
// billow itself and lit by the sun (bright where it faces it, light coming through the thin edges when the sun is behind),
// fraying into wisps as it thins
float billow(vec2 u){ return texture(uNoise, u).r * 0.55 + texture(uNoise, u * 2.17 + 0.31).a * 0.3 + texture(uNoise, u * 4.9 + 0.71).g * 0.15; }
float puff(vec2 q, vec2 off, float fray){ float r = length(q); vec2 u = q * 0.2 + off, w = vec2(texture(uNoise, u * 0.6 + off * 0.5).g, texture(uNoise, u * 0.6 + 0.47 - off * 0.3).b) - 0.5;
  float n = billow(u + w * 0.32); float m = (n - 0.5) * 2.8 + (1.0 - r) * 1.9 - 0.62 - fray * 2.2; return sat(m * 1.7) * smoothstep(1.0, 0.6, r); }
void main(){ float f = 1.0; vec2 q = vQ; float r2 = dot(q, q); if (r2 >= 1.0) discard;
  float sp = (fract(vId * 0.37) - 0.5) * 1.2, ca = cos(vAge * sp), sa = sin(vAge * sp), fray = 0.32 * (1.0 - sat(vA * 2.2));
  vec2 qr = mat2(ca, sa, -sa, ca) * q, off = vec2(vId * 0.137, vId * 0.071) + vec2(0.0, -vAge * 0.06);
  float d = puff(qr, off, fray); if (d < 0.004) discard;
  float e = 0.045, dx = puff(qr + vec2(e, 0.0), off, fray) - puff(qr - vec2(e, 0.0), off, fray), dy = puff(qr + vec2(0.0, e), off, fray) - puff(qr - vec2(0.0, e), off, fray);
  vec2 g = mat2(ca, -sa, sa, ca) * vec2(dx, dy);                                    // (back into the picture's axes)
  vec3 N = normalize(vec3(-g * 1.3 + q * 0.6, 0.6 + 0.4 * sqrt(1.0 - r2))), Ls = normalize(vSunS + vec3(0.0, 0.0, 1e-3));
  float ndl = max(dot(N, Ls), 0.0), wrap = dot(N, Ls) * 0.5 + 0.5, thin = 1.0 - d, through = pow(sat(-Ls.z), 2.0) * thin * 1.6;
  vec3 c = vC * (vAmb * (0.7 + 0.2 * N.y) + vSunW * (ndl * 1.25 + wrap * 0.45 + through));
  float a = (1.0 - exp(-d * vA * 2.8)) * f; if (a < 0.002) discard; o = vec4((c + vFogC) * a, a); }
