// machine-wilds · 86_sfx — the voices of what moves: the machines' feet by their weight, their pumps and valves and calls, the
// faults' crackle, the walker's steel soles, its wings, the lift's winch, the sky machine's drone — and the air they move in
// (the wind singing in the ruins, the forest's breath, the hush of mist).  Built from the same parts as lib/85_audio (noise
// slices, decaying partials, a few standing loops) on the same graph, live or offline; lib/87_ear decides when each sounds.
// Every voice takes an event: { t (the context's clock: when the picture shows it), d (m from the ear), side (−1 left … 1
// right), … } and places it: late by the time sound takes past 120 m (nearer, sound and picture stay together, as a film
// cuts them), duller with distance (the air takes the top), and the farther or bigger the more of the valley's tail.
// references/SOUND.md lists the events and what each one carries.
{
  const A = LR.audio, sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), TAU = Math.PI * 2;
  // levels (linear), set against the X cut's loudness (scripts: trailer.mjs --sound): what is close and big stands out of
  // the beds by 10–20 dB; the wings and the walker's feet sit just over them
  const LX = { sfx: 0.5, vale: 0.55, foot: 1.0, step: 0.62, wing: 0.9, call: 1.0, servo: 0.55, hiss: 0.45, clank: 0.8, arc: 0.55, air: 0.42, winch: 0.5, hum: 0.5, drone: 0.7, rainIron: 0.5, aeol: 0.045, forest: 0.055 };
  A.levels = LX;
  const made = {};
  A.ext.push((E, K) => {
    const { ctx, G, F, PAN, C, set, chain, dis, kit, lazy, nb, ping, grain, buf, R, room, take, caps, bus, sum, VO, STEP, num, vn } = K, e = K.e;
    const { lerp, clamp, sm } = LR;
    const mk = (key, ch, secs, fill) => { const id = key + '@' + ctx.sampleRate; if (made[id]) return made[id]; const r = LR.rng('lr-sfx-' + key), n = Math.round(secs * ctx.sampleRate), b = ctx.createBuffer(ch, n, ctx.sampleRate); for (let c = 0; c < ch; c++) fill(b.getChannelData(c), n, r, c); return (made[id] = b); };
    // the valley: a long dark tail (3 s), a little slow to build — what a call or a giant's foot sounds like across the floor
    const valeIR = () => mk('vale', 2, 3.2, (d, n, r) => { const sr = ctx.sampleRate; let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr, k = 0.35 * Math.exp(-t * 1.3) + 0.04; lp += (r() * 2 - 1 - lp) * k; d[i] = lp * Math.exp(-t * 2.15) * (1 - Math.exp(-t * 28)) * Math.min(1, (n - i) / (0.2 * sr)); } });
    // steel: thousands of tiny bright pings (vanes, plates, chain) — the stuff of a rustle
    const steelBuf = () => mk('steel', 1, 3, (d, n, r) => { const sr = ctx.sampleRate; for (let j = 0; j < 2600; j++) { const p = Math.floor(r() * n), a = Math.pow(r(), 2) + 0.05, w = (TAU * 3400 * Math.pow(3.2, r())) / sr, tau = (0.0004 + 0.0025 * r() * r()) * sr, len = Math.floor(tau * 6), ph = r() * TAU; for (let i = 0; i < len; i++) d[(p + i) % n] += a * Math.exp(-i / tau) * Math.sin(w * i + ph); } let s = 0; for (let i = 0; i < n; i++) s += d[i] * d[i]; const k = 0.12 / Math.sqrt(s / n || 1); for (let i = 0; i < n; i++) d[i] *= k; });
    const blank = () => mk('blank', 1, 0.01, () => {});
    const vale = ctx.createConvolver(), valeIn = G(1); vale.buffer = valeIR(); chain(valeIn, vale, G(LX.vale), sum);
    const sfx = bus('sfx', LX.sfx, sum, 0), airB = bus('air', 1, K.far, 0);
    caps.mech = 16; caps.sfx = 48; caps.call = 3;

    // ── tools ──
    const now = () => E.now();
    const T = (o) => Math.max(now() + 0.004, num(o.t, now() + 0.02));
    const lag = (d) => Math.max(0, d - 120) / 343;                        // (sound and picture together up close, as a film has them)
    const air = (d) => clamp(19000 * Math.exp(-d / 240), 700, 19000) * (1 - 0.3 * e.mist);
    const valeSend = (d) => 0.06 + 0.6 * sm(12, 280, d);
    // a timer on the audio clock: fn runs once the context has passed t (the event's nodes are unhooked then)
    const later = (t, fn) => { const s = ctx.createBufferSource(), g = G(0); s.buffer = blank(); chain(s, g, sum); s.onended = () => { dis(s, g); fn(); }; s.start(Math.max(t, now())); };
    // an event's way to the ear: the air between (a low-pass by distance), its side, and the valley's tail
    const place = (o, t, len, wet, dest) => { const d = Math.max(0.5, num(o.d, 10)), lp = F('lowpass', air(d), 0.5), p = PAN(clamp(num(o.side, 0), -1, 1) * 0.85), sd = G(wet === undefined ? valeSend(d) : wet);
      chain(lp, p, dest || sfx); p.connect(sd); sd.connect(valeIn); later(t + len + 0.6, () => dis(lp, p, sd)); return lp; };
    // a sine whose pitch falls as it dies: the weight in a blow
    const thump = (out, t, f0, f1, a, dec) => { const os = ctx.createOscillator(), g = G(0); os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.7); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.007); g.gain.exponentialRampToValueAtTime(Math.max(1e-5, a * 0.001), t + dec); chain(os, g, out); os.start(t); os.stop(t + dec + 0.02); os.onended = () => dis(os, g); };
    // struck steel: a few inharmonic partials, each dying at its own pace
    const STEEL = [[1, 1, 1], [1.414, 0.7, 0.8], [2.13, 0.5, 0.6], [2.87, 0.34, 0.45], [3.93, 0.2, 0.3]];
    const strike = (out, t, f, a, dec, parts) => { for (const [m, g, dk] of parts || STEEL) ping(out, t, f * m * R.range(0.994, 1.006), a * g, dec * dk, 0.0015); };
    // a loop of noise for longer than a slice can be: o = { key, type, f, f1, q, dur, curve | a }
    const noise = (out, t, o) => { const s = ctx.createBufferSource(), f = F(o.type || 'bandpass', o.f, o.q === undefined ? 0.8 : o.q), g = G(0), dur = Math.max(0.02, o.dur); s.buffer = buf(o.key || 'white'); s.loop = true;
      if (o.f1) { f.frequency.setValueAtTime(o.f, t); f.frequency.exponentialRampToValueAtTime(o.f1, t + dur); }
      if (o.curve) g.gain.setValueCurveAtTime(o.curve, t, dur); else { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.a, t + (o.att || 0.01)); g.gain.exponentialRampToValueAtTime(Math.max(1e-5, o.a * 0.002), t + dur); }
      chain(s, f, g, out); s.start(t, R() * 1.5); s.stop(t + dur + 0.03); s.onended = () => dis(s, f, g); };
    // envelopes as curves: a hump peaking at u = pk; a plateau with an attack and a release (fractions of the length); a decay
    const hump = (n, a, pk) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) { const u = i / (n - 1); c[i] = a * (u < pk ? Math.pow(u / pk, 1.6) : Math.pow(Math.max(0, (1 - u) / (1 - pk)), 1.4)); } c[n - 1] = 0; return c; };
    const plateau = (n, a, at, rl) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) { const u = i / (n - 1); c[i] = a * Math.min(1, u / Math.max(0.01, at), (1 - u) / Math.max(0.01, rl)); } c[n - 1] = 0; return c; };
    // the steel feathers' rustle: the steel buffer through a high-pass, under a ragged envelope
    const rustle = (out, t, a, dur, bright) => { const s = ctx.createBufferSource(), f = F('highpass', 2400 * (bright || 1), 0.6), g = G(0); s.buffer = steelBuf(); g.gain.setValueCurveAtTime(grain(Math.max(8, Math.round(dur * 90)), a), t, dur); chain(s, f, g, out); s.start(t, R() * (s.buffer.duration - dur - 0.05), dur + 0.02); s.onended = () => dis(s, f, g); };
    // a steel frame under load: a slow stick-slip ringing two of its plates (a groan, not a creak of wood)
    const groan = (out, t, v, body) => { const dur = R.range(0.45, 1.1), os = ctx.createOscillator(), f1 = F('bandpass', body * R.range(0.9, 1.12), 9), f2 = F('bandpass', body * R.range(2.5, 3.1), 10), g = G(0), p0 = R.range(24, 38);
      os.type = 'sawtooth'; os.frequency.setValueAtTime(p0, t); os.frequency.linearRampToValueAtTime(p0 * R.range(1.3, 1.8), t + dur * 0.55); os.frequency.linearRampToValueAtTime(p0 * R.range(0.85, 1.1), t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.14); g.gain.setValueAtTime(v, t + dur - 0.16); g.gain.linearRampToValueAtTime(0, t + dur); os.connect(f1); os.connect(f2); f1.connect(g); f2.connect(g); g.connect(out); os.start(t); os.stop(t + dur + 0.02); os.onended = () => dis(os, f1, f2, g); };
    const g1Of = (tn) => sat((Math.log10(Math.max(0.2, tn)) - 1.4) / 2.3);      // how giant: 0 for a porter (40 t) … 1 for the relic (5000 t)
    const V = E.voice;

    // ── a machine's foot: the blow (a falling sine you feel, the thud of earth), the frame taking it (a clank on a porter, a
    // long dull ring on the relic), the ground giving (a crunch; on loose earth the clods and stones it threw falling back
    // for a second and a half), in water a splash.  Louder, lower and longer the heavier; the near part fades with distance ──
    V.footfall = (o) => {
      const tn = num(o.tonnes, 50), m = Math.log10(Math.max(0.2, tn)), g1 = g1Of(tn), d = Math.max(1, num(o.d, 30)), ref = 7 + 60 * g1, v = LX.foot * (0.28 + 0.72 * sat((m - 1) / 2.7)) * ref / (ref + d) * Math.pow(Math.max(1, num(o.feet, 1)), 0.35);
      if (v < 0.004) return; const t = T(o) + lag(d); if (!room('mech', t)) return;
      const out = place(o, t, 1 + 1.6 * g1), far = sat(d / 260), nr = 1 - far, loose = sat(num(o.loose, 0.5)), wet = !!o.wet, snow = o.surf === 'snow', jit = R.range(0.93, 1.07);
      if (m > 1.2) thump(out, t, lerp(84, 40, g1) * jit, lerp(52, 27, g1) * jit, v * lerp(0.8, 1.5, g1), lerp(0.26, 1.5, g1));
      nb(out, t, { buf: 'brown', type: 'lowpass', f: lerp(300, 105, g1) * (1 - 0.3 * far), q: 0.8, dur: lerp(0.24, 1.2, g1), a: v * 2.1, att: 0.006 + 0.02 * far });
      nb(out, t + 0.004, { buf: 'pink', f: lerp(560, 190, g1) * jit, q: 1.6, dur: lerp(0.1, 0.4, g1), a: v * lerp(1.4, 0.8, g1), att: 0.003 });
      if (nr > 0.12) {
        strike(out, t + 0.003, lerp(720, 120, sat(m / 3.7)) * R.range(0.9, 1.12), v * lerp(0.4, 0.13, g1) * nr, lerp(0.24, 1.4, g1));
        nb(out, t + 0.002, { f: lerp(3400, 1600, g1), q: 2, dur: 0.035, a: v * 0.9 * (1 - 0.6 * g1) * nr, att: 0.0008 });
        if (!wet) nb(out, t + 0.01, { f: R.range(1500, 2600) * (snow ? 0.6 : 1), q: 0.7, dur: lerp(0.14, 0.5, g1), curve: grain(36, v * lerp(1.1, 0.85, g1) * (0.35 + 0.65 * loose) * nr) });
        if (g1 > 0.25 && !wet && !snow && loose > 0.15) { for (let i = 0, k = Math.round(3 + 16 * g1 * loose); i < k; i++) nb(out, t + 0.1 + 1.5 * Math.pow(R(), 1.7), { f: R.range(1700, 5200), q: 3, dur: R.range(0.008, 0.03), a: v * R.range(0.06, 0.32) * g1 * nr, att: 0.0008 });
          nb(out, t + 0.12, { buf: 'pink', f: 1100, q: 0.6, dur: 1.3, curve: grain(70, v * 0.45 * g1 * loose * nr) }); }
        if (g1 > 0.5 && R() < 0.45) groan(out, t + R.range(0.08, 0.3), v * 0.3 * nr, lerp(260, 150, g1)); }
      if (wet) { nb(out, t, { f: 900, f1: 2600, q: 0.7, dur: lerp(0.4, 1.3, g1), a: v * 1.1, att: 0.015 }); nb(out, t, { buf: 'pink', type: 'lowpass', f: 380, q: 0.7, dur: lerp(0.3, 0.9, g1), a: v * 1.0, att: 0.008 }); for (let i = 0, k = 3 + Math.round(6 * g1); i < k; i++) K.drip(out, t + R.range(0.2, 1.2), v * 0.25, 0); }
      take('mech', t + 0.4); if (v > 0.1) E.duck(t, 0.42 * sat((v - 0.1) * 2), 0.9 + g1);
    };

    // ── the walker's own feet: the ground's recipe (lib/85_audio's steps), and its steel sole — a light tick at the toe and the
    // heel, now and then the small whir of the ankle; on a machine's deck, a plate's ring ──
    const STEP2 = { metal(o, t, v) { ping(o, t, R.range(380, 460), v * 0.42, 0.32); ping(o, t, R.range(930, 1040), v * 0.3, 0.2); ping(o, t, R.range(1600, 1800), v * 0.2, 0.11); nb(o, t, { buf: 'pink', f: 280, q: 1.4, dur: 0.07, a: v * 1.4, att: 0.002 }); nb(o, t, { f: 3000, q: 1, dur: 0.015, a: v * 0.6, att: 0.0008 }); } };
    const ground = (sf) => STEP2[sf] || STEP[sf] || STEP.grass;
    V.step = (o) => { const d = Math.max(0.8, num(o.d, 4)), run = !!o.run, v = LX.step * (run ? 1.25 : 1) * 3.5 / (3.5 + d); if (v < 0.008) return; const t = T(o); if (!room('step', t)) return;
      const out = place(o, t, 0.6, 0.03); ground(o.surface)(out, t, v, run);
      const f = R.range(2500, 3300); ping(out, t + 0.002, f, v * 0.12, 0.045, 0.001); ping(out, t + 0.002, f * 2.37, v * 0.06, 0.03, 0.001); nb(out, t, { f: 5200, q: 1.2, dur: 0.012, a: v * 0.3, att: 0.0005 });
      if (R() < 0.3) { const os = ctx.createOscillator(), g = G(0), t1 = t + 0.02; os.type = 'triangle'; os.frequency.setValueAtTime(R.range(700, 900), t1); os.frequency.exponentialRampToValueAtTime(R.range(1200, 1500), t1 + 0.07); g.gain.setValueAtTime(0, t1); g.gain.linearRampToValueAtTime(v * 0.02, t1 + 0.02); g.gain.linearRampToValueAtTime(0, t1 + 0.08); chain(os, g, out); os.start(t1); os.stop(t1 + 0.09); os.onended = () => dis(os, g); }
      take('step', t + 0.25); };
    // a landing: both feet, the body's weight, its plates settling; after a flight the feathers settling too
    V.land = (o) => { const d = Math.max(0.8, num(o.d, 4)), k = sat(num(o.speed, 5) / 10), v = LX.step * (0.9 + 1.3 * k) * 3.5 / (3.5 + d), t = T(o), out = place(o, t, 1.2, 0.08), g = ground(o.surface);
      g(out, t, v * 1.1, true); g(out, t + R.range(0.03, 0.06), v * 0.9, true); nb(out, t, { buf: 'brown', type: 'lowpass', f: 170, q: 0.8, dur: 0.35, a: v * 1.6, att: 0.004 }); thump(out, t, 120, 60, v * 0.55, 0.25);
      for (let i = 0; i < 5; i++) ping(out, t + R.range(0.005, 0.14), R.range(1800, 4200), v * R.range(0.04, 0.1), R.range(0.04, 0.12), 0.001);
      if (o.wings) rustle(out, t + 0.03, v * 0.55, 0.4, 1); E.duck(t, 0.18 * k, 0.7); };

    // ── a call: reeds a fifth and an octave apart over a sine an octave down, swelling slowly as a horn does, opening as it
    // swells (its filter follows the swell) and wavering a little once it is full; much of it is the valley's tail.  A call
    // begun before its shot is heard from where it had got to (o.skip) ──
    V.call = (o) => { if (o.cry) return V.cry(o); const d = Math.max(1, num(o.d, 60)), len = Math.max(0.5, num(o.len, 5)), f0 = num(o.f, 58), v = LX.call * num(o.gain, 1) * 0.42 * 150 / (150 + d), skip = num(o.skip, 0); if (v < 0.003 || skip > len - 0.3) return;
      const t = T(o) + (skip ? 0 : lag(d)), L0 = len - skip; if (!room('call', t)) return;
      const out = place(o, t, L0 + 1, 0.3 + 0.45 * sm(20, 220, d)), lp = F('lowpass', f0 * 3, 0.9), pk = F('peaking', 620, 1.1), g = G(0), N = 160, cv = new Float32Array(N), lc = new Float32Array(N); pk.gain.value = 4;
      for (let i = 0; i < N; i++) { const u = (skip + (i / (N - 1)) * L0) / len, sw = Math.max(0, Math.min(1, u / 0.22, (1 - u) / 0.34)); cv[i] = v * Math.pow(sw, 1.3) * (0.86 + 0.14 * Math.sin(u * len * 2.1)); lc[i] = f0 * (2.0 + 5.5 * Math.pow(sw, 1.5)); } cv[N - 1] = 0;
      g.gain.setValueCurveAtTime(cv, t, L0); lp.frequency.setValueCurveAtTime(lc, t, L0); chain(lp, pk, g, out);
      const lfo = ctx.createOscillator(), lg = G(0), nodes = [lfo, lg, lp, pk, g]; lfo.frequency.value = R.range(3.4, 4.4); lfo.connect(lg); lg.gain.setValueAtTime(skip > len * 0.3 ? 12 : 0, t); lg.gain.linearRampToValueAtTime(12, t + Math.max(0.05, len * 0.6 - skip)); lfo.start(t); lfo.stop(t + L0 + 0.05);
      const fq = (m, u) => f0 * m * (u < 0.3 ? lerp(0.93, 1, u / 0.3) : lerp(1, 0.985, (u - 0.3) / 0.7)), u0 = skip / len;
      for (const [m, a, ty] of [[0.5, 0.5, 'sine'], [1, 1, 'sawtooth'], [1.498, 0.42, 'sawtooth'], [2.003, 0.22, 'sawtooth'], [3.0, 0.07, 'triangle']]) { const o2 = ctx.createOscillator(), og = G(a); o2.type = ty;
        o2.frequency.setValueAtTime(fq(m, u0), t); if (u0 < 0.3) o2.frequency.linearRampToValueAtTime(fq(m, 0.3), t + (0.3 - u0) * len); o2.frequency.linearRampToValueAtTime(fq(m, 1), t + L0); lg.connect(o2.detune);
        chain(o2, og, lp); o2.start(t); o2.stop(t + L0 + 0.05); nodes.push(o2, og); }
      nodes[5].onended = () => dis(...nodes); take('call', t + L0); };
    // a flyer's cry: a falling whistle with a burr in it (a kite's, high over the valley)
    V.cry = (o) => { const d = Math.max(1, num(o.d, 60)), len = Math.max(0.2, num(o.len, 0.8)), f0 = num(o.f, 560), v = LX.call * num(o.gain, 0.6) * 0.16 * 60 / (60 + d); if (v < 0.002) return; const t = T(o) + lag(d), out = place(o, t, len + 0.5, 0.35);
      for (const [m, a] of [[1, 1], [2.01, 0.25], [3.02, 0.08]]) { const os = ctx.createOscillator(), g = G(0), fm = ctx.createOscillator(), fg = G(f0 * m * 0.012); fm.frequency.value = 31; chain(fm, fg); fg.connect(os.frequency);
        os.frequency.setValueAtTime(f0 * m * 1.08, t); os.frequency.exponentialRampToValueAtTime(f0 * m * 1.14, t + len * 0.15); os.frequency.exponentialRampToValueAtTime(f0 * m * 0.74, t + len);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + 0.04); g.gain.setValueAtTime(v * a * 0.8, t + len * 0.6); g.gain.linearRampToValueAtTime(0, t + len); chain(os, g, out); os.start(t); fm.start(t); os.stop(t + len + 0.02); fm.stop(t + len + 0.02); os.onended = () => dis(os, g, fm, fg); } };

    // ── a big move: the pumps' whine rising as the load comes on (falling as it lets go), oil moving in the lines, the frame
    // groaning on the big ones; and the valve that lets the steam go when it settles (hiss) ──
    V.servo = (o) => { const tn = num(o.tonnes, 50), g1 = g1Of(tn), d = Math.max(1, num(o.d, 30)), amt = sat(num(o.amt, 0.5)), len = clamp(num(o.len, 1.5), 0.4, 10), skip = num(o.skip, 0), ref = 10 + 34 * g1, v = LX.servo * (0.35 + 0.65 * amt) * ref / (ref + d);
      if (v < 0.004 || skip > len - 0.2) return; const t = T(o), L0 = len - skip, out = place(o, t, L0 + 0.6), up = num(o.dir, 1) >= 0, f0 = lerp(240, 64, g1) * R.range(0.92, 1.08), u0 = skip / len;
      const os = ctx.createOscillator(), os2 = ctx.createOscillator(), bp = F('bandpass', f0 * 4, 4), g = G(0), fA = f0 * (up ? 0.85 : 1.15), fB = f0 * (up ? 1.22 : 0.9); os.type = 'sawtooth'; os2.type = 'sine';
      os.frequency.setValueAtTime(lerp(fA, fB, u0), t); os.frequency.linearRampToValueAtTime(fB, t + L0); os2.frequency.setValueAtTime(lerp(fA, fB, u0) * 0.5, t); os2.frequency.linearRampToValueAtTime(fB * 0.5, t + L0);
      g.gain.setValueCurveAtTime(plateau(48, v * 0.16, Math.min(0.4, 0.35 / L0), Math.min(0.5, 0.45 / L0)), t, L0); const g2 = G(0.9); os.connect(bp); bp.connect(g); chain(os2, g2, g); g.connect(out);
      os.start(t); os2.start(t); os.stop(t + L0 + 0.03); os2.stop(t + L0 + 0.03); os.onended = () => dis(os, os2, bp, g, g2);
      noise(out, t, { key: 'pink', f: lerp(900, 380, g1), q: 1.1, dur: L0, curve: plateau(48, v * 0.6, Math.min(0.4, 0.3 / L0), Math.min(0.5, 0.4 / L0)) });
      if (g1 > 0.2) for (let i = 0, k = Math.round(L0 * (0.3 + g1 * 0.8)); i < k; i++) groan(out, t + R() * L0 * 0.9, v * 0.32, lerp(320, 160, g1)); };
    V.hiss = (o) => { const size = num(o.size, 1), d = Math.max(1, num(o.d, 20)), v = LX.hiss * sat(0.3 + size * 0.45) * 14 / (14 + d); if (v < 0.003) return; const len = clamp(num(o.len, 0.45 + 0.45 * size), 0.25, 2.4), t = T(o) + lag(d), out = place(o, t, len + 0.3);
      const dk = (n, a, at) => { const c = new Float32Array(n); for (let i = 0; i < n; i++) { const u = i / (n - 1); c[i] = a * Math.min(1, u / at) * Math.pow(1 - u, 1.7); } c[n - 1] = 0; return c; };
      noise(out, t, { key: 'white', f: 5200, f1: 2600, q: 0.6, dur: len, curve: dk(48, v, 0.03) }); noise(out, t, { key: 'white', type: 'highpass', f: 7000, q: 0.5, dur: len * 0.7, curve: dk(32, v * 0.45, 0.02) });
      nb(out, t, { buf: 'pink', type: 'lowpass', f: 300, q: 0.7, dur: 0.12, a: v * 0.7, att: 0.004 }); };
    // iron on iron: a heavy clank and the chain's rattle after it (the lift's cage meeting the ground, locking home)
    V.clank = (o) => { const size = num(o.size, 1), d = Math.max(1, num(o.d, 20)), v = LX.clank * sat(0.4 + 0.4 * size) * 16 / (16 + d); if (v < 0.003) return; const t = T(o) + lag(d), out = place(o, t, 2, 0.25);
      strike(out, t, R.range(170, 230) / Math.sqrt(size), v * 0.5, 1.1); nb(out, t, { buf: 'pink', f: 240, q: 1.4, dur: 0.14, a: v * 1.8, att: 0.002 }); nb(out, t, { f: 2400, q: 1.2, dur: 0.03, a: v * 1.1, att: 0.0006 }); thump(out, t, 90, 50, v * 0.6, 0.3);
      for (let i = 0; i < 8; i++) ping(out, t + 0.02 + 0.35 * Math.pow(R(), 1.5), R.range(1100, 3200), v * R.range(0.04, 0.12), R.range(0.05, 0.15), 0.001); if (o.lock) V.hiss(Object.assign({}, o, { t: t + 0.1, size: 1.2 })); E.duck(t, 0.2, 0.8); };
    // a knee grinding as the weight comes on it, or sparks off a rail: a hot scrape and a few tings
    V.sparks = (o) => { const size = num(o.size, 1), d = Math.max(1, num(o.d, 20)), v = LX.clank * 0.5 * sat(0.3 + 0.4 * size) * 14 / (14 + d); if (v < 0.003) return; const t = T(o) + lag(d), out = place(o, t, 0.8, 0.12);
      noise(out, t, { key: 'white', f: R.range(4200, 6500), q: 2.5, dur: 0.32, curve: grain(40, v * 1.2) }); if (o.grind) noise(out, t, { key: 'pink', f: R.range(900, 1300), q: 3, dur: 0.4, curve: grain(30, v * 0.9) });
      for (let i = 0; i < 5; i++) ping(out, t + R() * 0.3, R.range(3000, 7000), v * R.range(0.05, 0.14), R.range(0.05, 0.2), 0.0008); };

    // ── a fault: the burst's own envelope (lib/63_glow draws its arcs to it, so the crackle and the light are one) as a buzz,
    // the same envelope torn into grains of hard crackle, and a snap at every pop ──
    V.crackle = (o) => { const env = o.env || [], sr = num(o.sr, 200), dur = env.length / sr, d = Math.max(1.2, num(o.d, 10)), v = LX.arc * num(o.power, 1) * (o.own ? 0.6 : 1) * 5 / (5 + d), skip = num(o.skip, 0); if (v < 0.003 || dur - skip < 0.02) return;
      const t = T(o), L0 = dur - skip, out = place(o, t, L0 + 0.3, 0.12), n = Math.max(2, Math.round(L0 * 400)), cb = new Float32Array(n), cc = new Float32Array(n), hue = num(o.hue, 0.3);
      for (let i = 0; i < n; i++) { const x = (skip + (i / (n - 1)) * L0) * sr, ev = env[Math.min(env.length - 1, Math.floor(x))] || 0, r = R(); cb[i] = v * 0.2 * ev; cc[i] = v * ev * (r < 0.28 ? 0.6 + 0.4 * R() : r < 0.5 ? 0.12 : 0.025); } cb[n - 1] = cc[n - 1] = 0;
      const os = ctx.createOscillator(), fm = ctx.createOscillator(), fg = G(28), hp = F('highpass', 400, 0.7), bp = F('bandpass', 2600 + 1200 * hue, 1.1), g1 = G(0); os.type = 'sawtooth'; os.frequency.value = 96 + 70 * hue; fm.frequency.value = R.range(29, 43); chain(fm, fg); fg.connect(os.frequency);
      g1.gain.setValueCurveAtTime(cb, t, L0); chain(os, hp, bp, g1, out); os.start(t); fm.start(t); os.stop(t + L0 + 0.02); fm.stop(t + L0 + 0.02); os.onended = () => dis(os, fm, fg, hp, bp, g1);
      const s = ctx.createBufferSource(), hp2 = F('highpass', 1900, 0.6), g2 = G(0); s.buffer = buf('white'); s.loop = true; g2.gain.setValueCurveAtTime(cc, t, L0); chain(s, hp2, g2, out); s.start(t, R()); s.stop(t + L0 + 0.02); s.onended = () => dis(s, hp2, g2);
      for (let j = 1; j < env.length; j++) if (env[j] - env[j - 1] > 0.3 && j / sr >= skip) { const ts = t + j / sr - skip; nb(out, ts, { f: R.range(2800, 4500), q: 0.8, dur: 0.014, a: v * 1.5 * env[j], att: 0.0004 }); ping(out, ts, R.range(1500, 2200), v * 0.18 * env[j], 0.03, 0.0005); } };

    // ── the wings ──
    // opening: the arm's three joints latching (deeper), then a steel click for every vane as it hits its stop, shoulder out to
    // the last primary (o.clicks, from lib/87_ear: [when, level, pitch, joint?]), both wings at once a little apart in the
    // stereo; a whoosh rising through it as the fan takes the air; the last one home rings once
    const clickAt = (out, t, g, f) => { ping(out, t, f * R.range(0.96, 1.04), g * 0.22, 0.05, 0.0006); ping(out, t, f * 2.41 * R.range(0.97, 1.03), g * 0.1, 0.03, 0.0006); nb(out, t, { f: R.range(5500, 8000), q: 1.4, dur: 0.008, a: g * 0.5, att: 0.0004 }); };
    const wingSide = (out) => { const l = PAN(-0.35), r = PAN(0.35); l.connect(out); r.connect(out); return [l, r]; };
    V.wingopen = (o) => { const d = Math.max(0.6, num(o.d, 4)), v = LX.wing * 3 / (3 + d), t = T(o), out = place(o, t, 1.4, 0.12), [l, r] = wingSide(out), cl = o.clicks || [];
      nb(out, t + 0.05, { buf: 'pink', f: 340, f1: 1900, q: 0.8, dur: 0.62, curve: hump(48, v * 0.75, 0.75) }); nb(out, t + 0.12, { f: 2400, f1: 6500, q: 0.9, dur: 0.52, curve: hump(40, v * 0.32, 0.8) });
      for (const c of cl) { const tc = t + c[0], g = v * c[1]; clickAt(l, tc, g, 3000 * c[2]); clickAt(r, tc + 0.0025, g, 3000 * c[2] * 1.01);
        if (c[3]) { nb(out, tc, { buf: 'pink', f: R.range(520, 700), q: 2.2, dur: 0.07, a: g * 1.3, att: 0.001 }); ping(out, tc, R.range(820, 980), g * 0.22, 0.14, 0.001); } }
      if (cl.length) { const tl = t + cl[cl.length - 1][0] + 0.01; ping(out, tl, 2650, v * 0.11, 0.45, 0.002); ping(out, tl, 4170, v * 0.06, 0.3, 0.002); }
      rustle(out, t + 0.1, v * 0.4, 0.62, 1.2); };
    // folding: the other way, softer — a falling whoosh, the vanes sliding home tip first, the arm locking last
    V.wingclose = (o) => { const d = Math.max(0.6, num(o.d, 4)), v = LX.wing * 0.7 * 3 / (3 + d), t = T(o), out = place(o, t, 1.2, 0.1), [l, r] = wingSide(out);
      nb(out, t, { buf: 'pink', f: 1500, f1: 320, q: 0.8, dur: 0.6, curve: hump(40, v * 0.5, 0.35) }); rustle(out, t + 0.05, v * 0.35, 0.55, 0.9);
      for (const c of o.clicks || []) { const tc = t + c[0], g = v * c[1]; clickAt(l, tc, g * 0.6, 2600 * c[2]); clickAt(r, tc + 0.003, g * 0.6, 2600 * c[2]); if (c[3]) nb(out, tc, { buf: 'pink', f: R.range(420, 560), q: 2, dur: 0.09, a: g * 1.5, att: 0.002 }); } };
    // a downstroke: the air pushed down (a deep whoosh in the beat's quick two-fifths, a soft thump of pressure at its middle),
    // the vanes closing into one surface; on the way up they slot open — a lighter rustle
    V.wingbeat = (o) => { const d = Math.max(0.6, num(o.d, 4)), a = sat(num(o.amp, 1)), v = LX.wing * a * 3 / (3 + d), len = clamp(num(o.len, 0.28), 0.15, 0.6), t = T(o), out = place(o, t, len + 0.9, 0.14); if (v < 0.004) return;
      nb(out, t, { buf: 'brown', type: 'lowpass', f: 240, f1: 560, q: 0.9, dur: len * 1.6, curve: hump(40, v * 2.3, 0.45) }); nb(out, t, { buf: 'pink', f: 480, f1: 1100, q: 0.7, dur: len * 1.4, curve: hump(40, v * 0.9, 0.5) });
      thump(out, t + len * 0.45, 70, 46, v * 0.32, 0.22); rustle(out, t, v * 0.32, len * 0.8, 0.9); rustle(out, t + len + 0.02, v * 0.16, 0.25, 1.3);
      nb(out, t + len, { f: 1800, f1: 900, q: 0.8, dur: 0.35, curve: hump(24, v * 0.22, 0.4) }); };

    // ── loops: what sounds for as long as it lasts, one standing voice for each (lib/87_ear names them every frame) ──
    const LOOP = {};
    const loopOut = (K2) => { const lp = K2.F('lowpass', 12000, 0.5), p = K2.P(0), g = K2.G(1), sd = K2.G(0.1); chain(lp, g, p, sfx); p.connect(sd); sd.connect(valeIn); return { in: lp, c: { lp: C(lp.frequency, 12000), p: C(p.pan, 0), sd: C(sd.gain, 0.1) }, place(l) { const d = Math.max(0.5, num(l.d, 10)); set(this.c.lp, air(d), 0.25); set(this.c.p, clamp(num(l.side, 0), -1, 1) * 0.8, 0.15); set(this.c.sd, valeSend(d) * 0.6, 0.4); } }; };
    // the air past a body that flies (the walker's wings: speed, and the vanes fluttering at speed), or past the camera
    LOOP.air = () => { const K2 = kit(), o = loopOut(K2), rush = K2.G(0), hiss = K2.G(0), fl = K2.G(0), mg = K2.G(0), fb = K2.F('bandpass', 600, 0.6), fh = K2.F('bandpass', 3800, 0.9);
      chain(K2.loop('pink:m'), fb, rush, o.in); chain(K2.loop('white:m'), K2.F('highpass', 2500, 0.5), hiss, o.in); K2.mod(K2.loop('flutter'), 1, mg.gain); chain(K2.loop('white:m'), fh, mg, fl, o.in);      /* (the vanes: a band of hiss torn by the flutter) */
      const c = { rush: C(rush.gain, 0), hiss: C(hiss.gain, 0), fl: C(fl.gain, 0), fb: C(fb.frequency, 600) };
      return { K: K2, set(l) { if (!l) { for (const k of ['rush', 'hiss', 'fl']) set(c[k], 0, 0.3); return; } o.place(l); const sp = num(l.speed, 0), s = sat(sp / 24), d = Math.max(0.5, num(l.d, 2)), k = LX.air * 4 / (4 + d) * num(l.lv, 1), flu = k * sat((sp - 5) / 14) * num(l.flutter, 1);
        set(c.rush, k * (0.12 + 1.1 * s * s), 0.18); set(c.fb, 300 + 1500 * s, 0.25); set(c.hiss, k * 0.4 * s * s * s, 0.18); set(c.fl, flu * 0.18, 0.2); } }; };
    // the lift's winch: a motor's whine with its gears, the ropes paying out, rattling over the sheaves
    LOOP.winch = () => { const K2 = kit(), o = loopOut(K2), m = K2.osc('sawtooth', 90), gr = K2.osc('triangle', 650), bp = K2.F('bandpass', 360, 3), gm = K2.G(0), gg = K2.G(0), rt = K2.G(0);
      chain(m, bp, gm, o.in); chain(gr, K2.F('bandpass', 1300, 6), gg, o.in); chain(K2.loop('roof:m'), K2.F('bandpass', 2100, 1), rt, o.in); chain(K2.loop('pink:m'), K2.F('lowpass', 180, 0.7), K2.G(0.4), gm);
      const c = { m: C(m.frequency, 90), gr: C(gr.frequency, 650), gm: C(gm.gain, 0), gg: C(gg.gain, 0), rt: C(rt.gain, 0) };
      return { K: K2, set(l) { if (!l) { for (const k of ['gm', 'gg', 'rt']) set(c[k], 0, 0.15); return; } o.place(l); const r = sat(num(l.rate, 0.5)), d = Math.max(1, num(l.d, 10)), k = LX.winch * 14 / (14 + d);
        set(c.m, 70 + 70 * r + (l.dir > 0 ? 8 : 0), 0.3); set(c.gr, 520 + 420 * r, 0.3); set(c.gm, k * 0.35 * sat(r * 3), 0.12); set(c.gg, k * 0.05 * sat(r * 3), 0.12); set(c.rt, k * 0.9 * r, 0.12); } }; };
    // a big machine near: the hum of what runs inside it, the deep rumble of its weight, and its frame groaning as it goes
    LOOP.hum = () => { const K2 = kit(), o = loopOut(K2), a = K2.osc('sine', 40), b = K2.osc('sine', 40.3), h2 = K2.osc('triangle', 80), ga = K2.G(0), gh = K2.G(0), gr = K2.G(0), gout = K2.G(1);
      chain(a, ga); chain(b, ga); chain(ga, gout); chain(h2, gh, gout); chain(K2.loop('brown:m'), K2.F('lowpass', 150, 0.7), gr, gout); chain(gout, o.in);
      const c = { a: C(a.frequency, 40), b: C(b.frequency, 40.3), h2: C(h2.frequency, 80), ga: C(ga.gain, 0), gh: C(gh.gain, 0), gr: C(gr.gain, 0) };
      return { K: K2, set(l, dts) { if (!l) { for (const k of ['ga', 'gh', 'gr']) set(c[k], 0, 0.4); return; } o.place(l); const g1 = g1Of(num(l.tonnes, 100)), d = Math.max(1, num(l.d, 30)), ref = 8 + 40 * g1, k = LX.hum * (0.3 + 0.7 * g1) * ref / (ref + d), f = lerp(58, 27, g1), mv = sat(num(l.moving, 0));
        set(c.a, f, 1); set(c.b, f * 1.007, 1); set(c.h2, f * 2.01, 1); set(c.ga, k * 0.3, 0.5); set(c.gh, k * 0.04, 0.5); set(c.gr, k * (0.35 + 0.5 * mv), 0.5);
        if (R() < (dts || 0.05) * (0.1 + 0.5 * mv) * (0.4 + g1)) groan(gout, now() + 0.05, k * 0.45, lerp(300, 150, g1)); } }; };
    // the sky machine (references/SOUND.md · the drone): a chord of slow engines a fifth and an octave apart, beating; the
    // chop of its propellers; its hull creaking as it rides — a far rumble from the ground (the air takes all but the low),
    // a roar up close.  l = { d, side, size, f (Hz), blades (a second), gain }
    LOOP.drone = () => { const K2 = kit(), o = loopOut(K2), os = [K2.osc('sine', 30), K2.osc('sine', 45.2), K2.osc('sine', 60.3), K2.osc('sawtooth', 30.1)], gs = os.map(() => K2.G(0)), gout = K2.G(1), chop = K2.G(0), am = K2.G(0), lfo = K2.osc('sine', 4), sw = K2.F('lowpass', 220, 0.8);
      os.forEach((x, i) => (i < 3 ? chain(x, gs[i], gout) : chain(x, sw, gs[i], gout))); chain(K2.loop('pink:m'), K2.F('bandpass', 190, 0.8), chop, gout); chain(lfo, am); am.connect(chop.gain); chain(gout, o.in);
      const c = { f: os.map((x) => C(x.frequency, x.frequency.value)), g: gs.map((g) => C(g.gain, 0)), chop: C(chop.gain, 0), am: C(am.gain, 0), lfo: C(lfo.frequency, 4) };
      return { K: K2, set(l, dts) { if (!l) { c.g.forEach((x) => set(x, 0, 0.6)); set(c.chop, 0, 0.6); set(c.am, 0, 0.6); return; } o.place(l); const d = Math.max(1, num(l.d, 200)), size = num(l.size, 40), ref = 30 + size, k = LX.drone * num(l.gain, 1) * ref / (ref + d), f = num(l.f, 30), near = sm(400, 40, d);
        [1, 1.505, 2.01, 1.003].forEach((m, i) => set(c.f[i], f * m, 2)); [0.6, 0.35, 0.18, 0.12 * near].forEach((a, i) => set(c.g[i], k * a, 0.8)); set(c.chop, k * 0.4 * (0.2 + near), 0.8); set(c.am, k * 0.4 * (0.2 + near), 0.8); set(c.lfo, num(l.blades, 4.2), 1);
        if (R() < (dts || 0.05) * 0.25 * near) groan(gout, now() + 0.05, k * 0.4, R.range(110, 190)); } }; };
    // rain on iron: on a machine close by, on the walker's own head
    LOOP.ironrain = () => { const K2 = kit(), o = loopOut(K2), a = K2.G(0), b = K2.G(0); chain(K2.loop('roof:m'), K2.F('bandpass', 2800, 1.2), a, o.in); chain(K2.loop('drops:m'), K2.F('highpass', 4800, 0.6), b, o.in); chain(K2.loop('roof:m'), K2.F('bandpass', 900, 2), K2.G(0.6), a);
      const c = { a: C(a.gain, 0), b: C(b.gain, 0) };
      return { K: K2, set(l) { if (!l) { set(c.a, 0, 0.3); set(c.b, 0, 0.3); return; } o.place(l); const d = Math.max(0.4, num(l.d, 6)), sz = num(l.size, 3), k = LX.rainIron * sat(num(l.rain, 0.5) * 1.6) * (1.5 + sz) / (1.5 + sz + d); set(c.a, k, 0.3); set(c.b, k * 0.5, 0.3); } }; };
    const loops = new Map();
    E.loops = (list, dts) => { const seen = new Set(); for (const l of list) { const mkL = LOOP[l.kind]; if (!mkL) continue; let v = loops.get(l.id); if (!v) { v = mkL(); loops.set(l.id, v); } v.idle = 0; seen.add(l.id); v.set(l, dts); }
      for (const [id, v] of loops) if (!seen.has(id)) { v.set(null, dts); if ((v.idle += dts) > 2.5) { v.K.kill(); loops.delete(id); } } };

    // ── the world's sources a realm adds by kind (LR.world.sounds): a fluorescent tube's hum and, dying, its sputter ──
    VO.tube = { lvl: 0.5, send: 0.08, make(g) { const K2 = kit(), sp = K2.G(0.04), mg = K2.G(0.06); chain(K2.osc('sine', 100), K2.G(0.25), g.in); chain(K2.osc('sawtooth', 120), K2.F('bandpass', 2400, 5), sp, g.in); K2.mod(K2.loop('flutter'), 1, mg.gain); chain(K2.loop('white:m'), K2.F('bandpass', 3600, 2), mg, g.in); return K2; } };

    // ── the air: the wind singing in what stands (a few high, narrow resonances of the gusts — wires, pipes, the machines'
    // ribs — calm, consonant, swelling and gone); the forest breathing far off (a soft wide wash, so a quiet shot is never
    // empty); in mist, drops off the leaves ──
    const aeol = lazy(() => { const K2 = kit(), list = []; for (const [f, pan] of [[330, -0.6], [440, 0.4], [554, -0.2], [660, 0.7], [880, -0.4]]) { const bp = K2.F('bandpass', f, 34), g = K2.G(0); chain(K2.loop('pink:m'), bp, g, K2.P(pan), airB); list.push({ c: C(g.gain, 0), f: C(bp.frequency, f), f0: f }); } return { K: K2, list }; });
    const forest = lazy(() => { const K2 = kit(), a = K2.G(0), b = K2.G(0); chain(K2.loop('pink'), K2.F('bandpass', 1300, 0.35), a, airB); chain(K2.loop('brown'), K2.F('lowpass', 140, 0.6), b, airB); return { K: K2, a: C(a.gain, 0), b: C(b.gain, 0) }; });
    E.tickers.push((ee, dts) => {
      const t = E.t, wind = Math.min(1, ee.wind * (1 + 1.4 * sm(3, 45, ee.hgt))), hi = sm(6, 60, ee.hgt), on = LX.aeol * sm(0.08, 0.5, wind) * (0.35 + 0.65 * hi) * (1 - 0.5 * ee.rain) * (1 - 0.6 * ee.sh);
      aeol(on > 0.0005, dts, (v, k) => { v.list.forEach((x, i) => { const sw = sm(0.45, 0.9, vn(t * (0.05 + 0.017 * i), 300 + i * 13)) * (0.4 + 0.6 * ee.gust); set(x.c, k * on * sw * (i === 4 ? 0.5 : 1), 0.8); set(x.f, x.f0 * (1 + 0.004 * (vn(t * 0.3, 400 + i) - 0.5)), 1); }); });
      const fl = LX.forest * (1 - 0.7 * ee.snow) * (1 - 0.5 * ee.sh) * (1 - 0.6 * sm(0.2, 0.8, ee.rain)) * (0.6 + 0.4 * (1 - ee.night)) * (1 - 0.4 * hi);
      forest(fl > 0.0005, dts, (v, k) => { set(v.a, k * fl * 1.3 * (0.7 + 0.3 * vn(t * 0.11, 501)), 0.8); set(v.b, k * fl * 0.25, 0.8); });
      if (ee.mist > 0.2 && ee.rain < 0.05) { const lam = 0.5 * ee.mist * dts; for (let i = 0, kk = Math.floor(lam + R()); i < kk; i++) K.drip(K.near, t + 0.02 + R() * dts, R.range(0.02, 0.06), R.range(-0.9, 0.9)); }
    });
  });
}
