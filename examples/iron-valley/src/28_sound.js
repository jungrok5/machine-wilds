// Machine Wilds · what the valley adds to what is heard (lib/87_ear, references/SOUND.md): the relic's lift — its winch while the
// cage moves, the cage meeting the ground, the cage locking home in the belly — the hall's roof over the camp and the
// workshop (rain drums on it, the wind is kept off), and the workshop's tubes humming, the dying one sputtering.
LR.on('built', () => {
  const ear = LR.ear, W = LR.world; if (!ear || !ear.add || !W) return;
  // the hall: the two western bays under the floor that still holds, the rest under what is left of the roof (20_ruins)
  const H = V.hall; if (H) { const x0 = H.x - 12, z0 = H.z - 7, sm = LR.sm;
    ear.shelter = (x, y, z) => { if (y > H.y + 4.2 || y < H.y - 1) return 0; const inZ = sm(-0.8, 0.8, z - z0) * sm(-0.8, 0.8, z0 + 14 - z); return inZ * Math.max(sm(-0.8, 0.8, x - x0) * sm(-0.8, 0.8, x0 + 12 - x), 0.45 * sm(-0.8, 0.8, x - x0) * sm(-0.8, 0.8, x0 + 24 - x)); }; }
  for (const l of W.lights || []) if (l.kind === 'tube') W.sounds.push({ x: l.x, y: l.y, z: l.z, kind: 'tube', r: 9, gain: l.flicker > 0.5 ? 1 : 0.55 });
  // the lift (27_lift: Ridge's 'lift' extra, 0 up in the belly … 1 down on the ground)
  ear.add((h) => { const u = LR.mech.units.find((x) => x.name === 'Ridge'); if (!u || !u.pose || !u.pose.W) return; const c = u.pose.cmd, cage = u.pose.W.lift_cage; if (!cage) return;
    const fr = c && c.extras && c.extras.lift !== undefined ? c.extras.lift : 0, st = h.st, was = st.lift; st.lift = fr; if (was === undefined || h.first || h.dt <= 0) return;
    const v = Math.abs(fr - was) / h.dt; if (v > 1e-4) h.loop({ id: 'winch:Ridge', kind: 'winch', p: [cage.p[0], cage.p[1] + 2, cage.p[2]], rate: +LR.sat(v / 0.12).toFixed(3), dir: Math.sign(fr - was) });
    if (was < 0.995 && fr >= 0.995) h.emit({ kind: 'clank', p: [cage.p[0], cage.p[1] - 2.9, cage.p[2]], size: 1.4 }, 0);
    if (was > 0.03 && fr <= 0.03 && was < 0.5) h.emit({ kind: 'clank', p: [cage.p[0], cage.p[1], cage.p[2]], size: 1.8, lock: 1 }, 0); });
});
