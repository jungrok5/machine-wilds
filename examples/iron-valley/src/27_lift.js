// Iron Valley · the relic's lift.  Once a round Ridge stops on the rim and lets a cage down its ropes to the ground (its 'lift' move,
// 25_machines).  Whoever is in the cage when it goes back up is carried up with it, comes up through the hatch and steps out onto the deck,
// and can walk the bow while the relic walks on: the valley from fifty metres up.  R (a pad's X): into the cage while it is
// down, and off the deck (down to the ground under the lift).  A film drives the same thing with its hand on KeyR.
V.lift = () => {
  const M = LR.mech, P = LR.player, say = { board: 'Board the lift', boardSub: "Ridge's cage · it goes up to the deck", mark: 'Lift', wait: 'Going up', waitSub: 'hold on — out on the deck at the top', deck: 'Climb down', deckSub: "Ridge's deck · back to the ground", near: 'Lift coming down', nearSub: 'Ridge has stopped on the rim', inCage: 'In the cage', inCageSub: 'it goes up when Ridge is ready · step out the open side to stay' };
  const relic = () => M.units.find((u) => u.name === 'Ridge');
  const W = (b) => { const u = relic(); return u && u.pose && u.pose.W ? u.pose.W[b] : null; };
  const lift = () => { const u = relic(), c = u && u.pose && u.pose.cmd; return c && c.extras && c.extras.lift !== undefined ? c.extras.lift : 0; };
  const toLocal = (F, x, y, z) => { const d = [x - F.p[0], y - F.p[1], z - F.p[2]]; return [d[0] * F.x[0] + d[1] * F.x[1] + d[2] * F.x[2], d[0] * F.y[0] + d[1] * F.y[1] + d[2] * F.y[2], d[0] * F.z[0] + d[1] * F.z[1] + d[2] * F.z[2]]; };
  const FLOOR = -2.89, IN = 1.32;      // the cage's floor under its top (its frame), how far from its middle one stands inside the rails
  // the bow deck round the hatch, and the strip along the port edge out past the tanks to the bow (the rest is houses and plant)
  const DECK = [[11.6, 17.2, -8.7, 4.3], [11.6, 25.6, -8.7, -7.0]], DECKY = -0.1;
  const onDeck = (x, z) => { let best = null, bd = 1e9; for (const [x0, x1, z0, z1] of DECK) { const cx = LR.clamp(x, x0, x1), cz = LR.clamp(z, z0, z1), d = Math.hypot(cx - x, cz - z); if (d < bd) { bd = d; best = [cx, cz]; } }
    // (while the cage is away the hatch is a hole: one stops at its coaming)
    const H = 2.15; if (lift() > 0.002 && Math.abs(best[0] - 14) < H && Math.abs(best[1] + 2.5) < H) { const ex = H - Math.abs(best[0] - 14), ez = H - Math.abs(best[1] + 2.5); if (ex < ez) best[0] = 14 + Math.sign(best[0] - 14 || 1) * H; else best[1] = -2.5 + Math.sign(best[1] + 2.5 || 1) * H; }
    return best; };
  let veil = null; const fade = () => { if (LR.RENDER || typeof document === 'undefined') return; if (!veil) { veil = document.createElement('div'); veil.style.cssText = 'position:fixed;inset:0;background:#07090b;opacity:0;transition:opacity .35s;pointer-events:none;z-index:38'; document.body.appendChild(veil); } veil.style.opacity = 1; setTimeout(() => (veil.style.opacity = 0), 380); };
  // on the deck: walk the bow; R takes the walker down to the ground under the lift
  // (from the cage, put away flush with the deck: straight out of it, where one stands — no cut)
  const toDeck = (lx = 0, lz = 0, at = null) => { const u = relic(); if (!at) fade(); P.ride = { unit: u, frame: () => W('body'), local: at ? [at[0], DECKY, at[1]] : [14 + lz * 0.8, DECKY, -2.5 + lx * 0.8], clamp: onDeck, slow: 0.8,
    update: (Pl) => { if (Pl.use) { const B = W('body'), c = W('lift_cage'); Pl.ride = null; fade(); const x = c ? c.p[0] : B.p[0], z = c ? c.p[2] : B.p[2]; Pl.place(x - B.z[0] * 5, z - B.z[2] * 5, (Math.atan2(B.x[0], -B.x[2]) * 180) / Math.PI); } } }; };
  // in the cage: inside its rails; while it is down one can step back out of its open side; when it has gone up, out on the deck
  const board = (l) => { const u = relic(); let up = false; P.ride = { unit: u, frame: () => W('lift_cage'), local: [LR.clamp(l[0], -IN, IN), FLOOR, LR.clamp(l[2], -IN, IN)], slow: 0.5,
    clamp: (x, z) => [LR.clamp(x, lift() > 0.97 ? -2.4 : -IN, IN), LR.clamp(z, -IN, IN)],
    update: (Pl) => { const fr = lift(); if (fr < 0.97) up = true;
      if (fr > 0.97 && Pl.ride.local[0] < -IN - 0.6) { Pl.ride = null; return; }      /* stepped out on to the ground */
      if (up && fr < 0.002) { const l = toLocal(W('body'), Pl.x, Pl.y, Pl.z); toDeck(0, 0, [l[0], l[2]]); } } }; };
  V.liftBoard = board; V.liftDeck = toDeck;
  // flying, its deck is somewhere to come down (lib/80_player: LR.pads) — the bow round the hatch and the strip out to the bow
  LR.pads = LR.pads || []; for (const r of DECK) LR.pads.push({ name: 'Ridge', frame: () => W('body'), rect: r, y: DECKY, board: (l) => toDeck(0, 0, onDeck(l[0], l[2])) });
  // what the HUD says (lib/88_hud: a marker over the cage from 70 m while it is down or coming down, the prompt with R
  // within reach, on the deck the way down)
  LR.interact.add({ poll: (Pl) => { const c = W('lift_cage'), u = relic(); if (!c || !u) return null; const fr = lift(), floor = M.apply(c, [0, FLOOR + 1.2, 0]);
    if (Pl.ride && Pl.ride.unit === u) return Pl.ride.local[1] === FLOOR ? (fr < 0.97 ? { state: 'wait', label: say.wait, sub: say.waitSub, at: null } : { state: 'wait', label: say.inCage, sub: say.inCageSub, at: null }) : { state: 'ready', label: say.deck, sub: say.deckSub, at: null };
    if (fr < 0.05) return null;
    return fr < 0.97 ? { state: 'wait', label: say.near, sub: say.nearSub, at: floor, range: 6, see: 90, mark: say.mark } : { state: 'ready', label: say.board, sub: say.boardSub, at: floor, range: 3.4, see: 90, mark: say.mark }; } });
  P.hooks.push(() => {
    if (P.ride) return; const c = W('lift_cage'); if (!c) return; const fr = lift(); if (fr < 0.05) return;
    const l = toLocal(c, P.x, P.y, P.z), d = Math.hypot(l[0], l[2]); if (d > 26 || Math.abs(l[1] - FLOOR) > 6) return;
    if (fr < 0.97) return;
    const inside = Math.abs(l[0]) < IN + 0.5 && Math.abs(l[2]) < IN + 0.3 && Math.abs(l[1] - FLOOR) < 0.9;
    if (P.use && (inside || d < 3.2)) board(l);
  });
  // the cage meeting the ground and locking back into the belly: a hiss of the brakes' steam, sparks off the rail, the dust it
  // lands in (lib/62_vfx; the same ids each time, so a stop is one burst whatever the frame rate)
  let was = 0;
  LR.on('frame', (time) => { if (!LR.vfx || !LR.vfx.burst) return; const c = W('lift_cage'); if (!c) return; const fr = lift();
    const at = (v) => [c.p[0] + c.x[0] * v[0] + c.y[0] * v[1] + c.z[0] * v[2], c.p[1] + c.x[1] * v[0] + c.y[1] * v[1] + c.z[1] * v[2], c.p[2] + c.x[2] * v[0] + c.y[2] * v[1] + c.z[2] * v[2]];
    if (was < 0.995 && fr >= 0.995) { LR.vfx.burst('dust', at([0, -2.95, 0]), { t: time, size: 0.9, id: 'lift-dust' }); LR.vfx.burst('steam', at([0, 0.5, 0]), { t: time + 0.05, size: 0.7, dir: [0, -1, 0.3], id: 'lift-steam' }); LR.vfx.burst('sparks', at([1.62, -2.9, 1.62]), { t: time - 0.05, size: 0.6, dir: [1, 0.4, 0], n: 0.7, id: 'lift-sparks' }); }
    if (was > 0.03 && fr <= 0.03 && was < 0.5) { LR.vfx.burst('sparks', at([1.62, -2.9, 1.62]), { t: time, size: 0.6, dir: [0, 1, 0], n: 0.7, id: 'lift-lock' }); LR.vfx.burst('steam', at([1.4, 1.2, -1.4]), { t: time + 0.1, size: 0.6, dir: [0, 1, 0], id: 'lift-lock-steam' }); }
    was = fr; });
  // where the cage hangs at a time of the machines' clock (a film places the walker by it)
  V.liftAt = (t) => { const u = relic(), r = M.poseAt(u, t), c = r.cmd; return { cage: r.W.lift_cage, body: r.W.body, lift: c.extras && c.extras.lift !== undefined ? c.extras.lift : 0 }; };
};
