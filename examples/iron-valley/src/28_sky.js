// Machine Wilds · the sky.  Nimbus: a storm-harvester — the biggest machine in the valley and the only one that does not walk.
// A patched canvas envelope 130 m long on iron hoops, in a rope net whose crow's feet carry a gondola town on cables twelve
// metres under it; five lightning rods along its spine and copper conductors down its flanks to the accumulator house,
// where what it catches is kept in glass.  It drifts at a walking pace round a wide loop over the valley at the cloud base,
// always inside its own cloud (lib/64_cloud): on a clear day a pale shape in a thin bank, in rain hidden — until the
// lightning that it lives for lights the cloud from inside and something huge stands in it for a moment.
//   numbers: flight mode 'drift' (lib/48_mech_fly_drift) · parts: below · the cloud, the strikes: the end of this file
//   V.skyDeck = { unit, bone: 'body', rect: [x0, x1, z0, z1], y, walk: [[x0, x1, z0, z1]…] }   the landing deck in its body frame
//   V.skyAt(t) → its body frame { x, y, z, p } at clock time t (x forward, y up, z right; p the envelope's centre)
{
  const R = 20, XN = 64, XT = -66, XM = 6, DECKY = -33, HOOPS = Array.from({ length: 15 }, (_, i) => -58 + i * (116 / 14)), GORES = 20;
  // the envelope's radius along its length: a blunt nose, the widest at a tenth of the way back, a long taper to the tail
  const rad = (x) => { if (x >= XM) { const u = Math.min(1, (x - XM) / (XN - XM)); return R * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.2))); } const v = Math.min(1, (XM - x) / (XM - XT)); return R * Math.pow(Math.max(0, 1 - Math.pow(v, 1.9)), 0.8); };
  // the cloth sags between the hoops and between the seams of the gores (an old envelope, never quite full), more on top
  const sag = (x, phi) => { const r = rad(x), gw = (Math.PI * 2) / GORES, fg = phi / gw - Math.floor(phi / gw), g = Math.sin(Math.PI * fg) ** 2; let b = 0;
    if (x > HOOPS[0] && x < HOOPS[HOOPS.length - 1]) { const bay = HOOPS[1] - HOOPS[0], fb = (x - HOOPS[0]) / bay - Math.floor((x - HOOPS[0]) / bay); b = Math.sin(Math.PI * fb) ** 2; }
    return (0.2 * g + 0.3 * b + 0.12 * g * b) * (r / R) * (0.7 + 0.5 * Math.max(0, Math.cos(phi))); };
  const surf = (x, phi, lift = 0) => { const r = rad(x) - sag(x, phi) + lift; return [x, r * Math.cos(phi), r * Math.sin(phi)]; };       // phi from the top toward the right (+z)
  const V3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], len: (a) => Math.hypot(a[0], a[1], a[2]), lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
  const norm = (a) => { const l = V3.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  // where it is struck and where the charge runs: the rods' tips, and the conductors from them to the accumulator (body frame)
  const RODS = [[44, 13], [24, 11], [4, 15], [-16, 11], [-34, 9]].map(([x, h]) => ({ x, base: rad(x) - sag(x, 0) + 0.3, h }));
  const tipOf = (r) => [r.x, r.base + r.h + 1.2, 0];
  const ACC = [10, DECKY + 9.6, 0];      // the accumulator house's roof, where the conductors come down
  const spine = () => { const pts = []; for (let x = 46; x >= -36; x -= 4) pts.push(surf(x, 0, 0.55)); return pts; };
  const descent = (s) => { const pts = []; for (let a = 0; a <= 1.0001; a += 1 / 14) pts.push(surf(-4 + 4 * a, s * a * 1.78, 0.32)); const top = pts[pts.length - 1], end = [ACC[0] - 1.5, ACC[1] + 0.6, s * 3.2];
    for (let i = 1; i <= 8; i++) { const f = i / 8, p = V3.lerp(top, end, f); p[1] -= Math.sin(Math.PI * f) * 1.1; pts.push(p); } return pts; };
  V.sky3 = { R, rad, surf, DECKY, RODS, tipOf, spine, descent, ACC };

  // the loop it keeps: an oval over the valley at the cloud base, [x, z, height above the sea] — turns no tighter than 95 m
  // (a hull of 130 m then yaws under 2°/s), climbing and sinking a few metres a lap
  V.skyLine = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [205 * Math.cos(a) - 10, 6 + 140 * Math.sin(a), 282 + 4 * Math.sin(2 * a + 0.5)]; });

  const base = V.machines;
  V.machines = () => {
    base(); const M = LR.mech;
    const E = [];
    // propellers: four pushers behind the engine cars on outriggers either side of the gondola, each at its own pace
    for (const [n, x, s, rate] of [['prop_PF', 9.6, -1, 92], ['prop_SF', 9.6, 1, -101], ['prop_PA', -16.4, -1, 84], ['prop_SA', -16.4, 1, -96]]) E.push({ name: n, type: 'spin', parent: 'body', at: [x, DECKY + 4.4, s * 23], dir: [0, 1, 0], axis: [1, 0, 0], xdir: [1, 0, 0], rate });
    // the tail: four fins in an X, the trailing vane of each hinged and steered (rudder and elevator at once)
    for (let i = 0; i < 4; i++) { const th = Math.PI / 4 + (i * Math.PI) / 2, s = [0, Math.cos(th), Math.sin(th)], x = -58.6, r0 = rad(x) - 0.2; E.push({ name: 'vane_' + i, type: 'spin', parent: 'body', at: [x, s[1] * r0, s[2] * r0], dir: s, axis: s, xdir: [-1, 0, 0] }); }
    // two cranes at the gondola's rails, their hooks on a rope
    E.push({ name: 'crane_P', type: 'spin', parent: 'body', at: [-6, DECKY, -8.9], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0] }, { name: 'hook_P', type: 'lag', parent: 'crane_P', at: [0, 7.6, -11.2], dir: [0, -1, 0], len: 9, lag: 1.4, gain: 1.6, maxDeg: 18 });
    E.push({ name: 'crane_S', type: 'spin', parent: 'body', at: [-19, DECKY, 8.9], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0] }, { name: 'hook_S', type: 'lag', parent: 'crane_S', at: [0, 7.6, 11.2], dir: [0, -1, 0], len: 6.5, lag: 1.2, gain: 1.6, maxDeg: 18 });
    // what hangs under it: a drag anchor on a chain from the bow, the discharge wire from the accumulator with its weight
    for (const [n, at, L, lag] of [['anchor', [34, DECKY - 5.4, 0], 12, 1.7], ['wire', [10, DECKY - 5.8, 0], 16, 2.3]]) for (let j = 0; j < 3; j++) E.push({ name: `${n}_${j}`, type: 'lag', parent: j ? `${n}_${j - 1}` : 'body', at: j ? [0, L, 0] : at, dir: j ? [0, 1, 0] : [0, -1, 0], len: L, lag: lag + j * 0.4, gain: 1.3, maxDeg: 14 });
    // the landing deck's windsock, the searchlight on the bridge, the anemometer, the vents, the beacons' turning shades
    E.push({ name: 'sock', type: 'spin', parent: 'body', at: [-50.6, DECKY + 6.6, -7.7], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0] });
    E.push({ name: 'search', type: 'spin', parent: 'body', at: [29.5, DECKY + 10.2, 0], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0] });
    E.push({ name: 'anemo', type: 'spin', parent: 'body', at: [26, DECKY + 15.8, -2.2], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0], rate: 260 });
    [[-8, DECKY + 7.4, -5.5, 150], [-17, DECKY + 5.0, 5.6, -120], [13, DECKY + 9.9, 6.6, 170]].forEach(([x, y, z, rate], i) => E.push({ name: 'fan_' + i, type: 'spin', parent: 'body', at: [x, y, z], dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0], rate }));
    V.skyBeacons = [[XN + 0.9, 0, 0], [XT + 1.7, 0, 0], [tipOf(RODS[2])[0], tipOf(RODS[2])[1] + 0.9, 0], [32, DECKY + 11.4, -7.4], [32, DECKY + 11.4, 7.4], [-51.6, DECKY + 1.6, 8.0]];
    V.skyBeacons.forEach((p, i) => E.push({ name: 'shade_' + i, type: 'spin', parent: 'body', at: p, dir: [0, 1, 0], axis: [0, 1, 0], xdir: [1, 0, 0], rate: [150, -170, 130, 190, -185, 160][i] }));
    M.define('nimbus', { title: 'Nimbus', age: 0.55, tonnes: 210, ride: 0, tall: 60, aware: 0, lensGain: 30, lodK: 1, cry: [61, 64, 5.5, 1.1], fault: 0, build: (k) => V.parts.nimbus(k),
      palette: { canvas: ['cloth', '#d6ccb4'], frame: ['paintmetal', '#4f4b43'], dark: ['paintmetal', '#26282b'], rust: ['rustplate', '#cbbca5'], shell: ['paintmetal', '#66706b'], copper: ['steel', '#c98a5c'], ceramic: ['ceramic', '#ddd5c4'], wood: ['planks', '#8f7a5e'], deck: ['iron', '#8d8c86'], paint: ['paintmetal', '#c99f2e'], tin: ['corrugated', '#bdb3a0'], steel: ['steel', '#a9abae'], rope: ['cloth', '#8a7c63'] },
      limbs: [], extras: E,
      flight: { mode: 'drift', speed: 3.0, abs: true, yawLead: 9, bankK: 2.6, bankMax: 3.4, sway: { heave: 0.62, pitch: 0.9, roll: 1.05, yaw: 1.2 }, span: 40,
        hull: [[XN, 0, 0], [XT, 0, 0], [0, -R, 0], [-40, -13, 0], [36, DECKY - 6, 0], [-52, DECKY - 2.5, 8.5], [-52, DECKY - 2.5, -8.5], [9.6, DECKY + 4.4, 26.6], [9.6, DECKY + 4.4, -26.6], [-60, -16, -16], [-60, -16, 16]],
        // what the command steers: the vanes into the turn and against the pitch, the cranes slewing now and then, the windsock in
        // the gusts, the searchlight sweeping the valley under it
        drive: (c, q) => { const rud = LR.clamp(q.kappa * 2600, -18, 18), elev = LR.clamp(-q.pitchS * 4, -10, 10);
          for (let i = 0; i < 4; i++) { const th = Math.PI / 4 + (i * Math.PI) / 2; c.extras['vane_' + i] = rud * Math.sign(Math.cos(th)) * 0.9 + elev * Math.sign(Math.sin(th)) * -0.9 * Math.sign(Math.cos(th)); }
          const w = q.sw.crane; c.extras.crane_P = 28 + 34 * Math.sin(w * q.t + 0.6) + 8 * Math.sin(w * 3 * q.t); c.extras.crane_S = -20 - 30 * Math.sin(w * 2 * q.t + 2.1);
          const w0 = (Math.PI * 2) / q.u.lap, beat = (f) => Math.round(f / w0) * w0;      /* (a flutter on the lap's beat too: one lap later, the same pose) */
          c.extras.sock = 180 + 14 * q.g * Math.sin(q.sw.yaw[1] * q.t * 2 + 0.3) + 5 * Math.sin(beat(3.1) * q.t) + 3 * Math.sin(beat(7.7) * q.t); c.extras.search = 52 * Math.sin(q.sw.heave[1] * q.t * 2 + 0.8); } } });
    M.spawn('nimbus', { name: 'Nimbus', fly: V.skyLine, offset: 0, phase: 0.31 });
  };
  // the landing deck (body frame): open plate aft of the town, a gap in its rail astern and to port; walk: the deck, the street
  V.skyDeck = { unit: 'Nimbus', bone: 'body', rect: [-51.2, -24.4, -8.0, 8.0], y: DECKY + 0.02, walk: [[-51.2, -24.4, -8.0, 8.0], [-24.4, 21.5, -2.0, 2.0]] };
  V.skyAt = (t) => { const u = LR.mech.units.find((q) => q.name === 'Nimbus'); return u ? LR.mech.cmd(u, t).body : null; };
  // its cloud (lib/64_cloud): a bank round it whose centre rides 14 m over its axis, 470 × 190 × 380 m; its hull for the flashes'
  // shadows (the envelope, the gondola), its rods and conductors for the strikes, its trailing wire, its town's glow, its beacons
  if (LR.cloud) LR.cloud.host = { unit: 'Nimbus', offset: [0, 14, 0], radii: [235, 95, 190], hulls: [[-1, 0, 0, 65, 20, 20], [-4, DECKY - 2.5, 0, 48, 5.5, 10.5]],
    rods: RODS.map(tipOf), wires: [spine(), descent(-1), descent(1)], trail: { bone: 'wire_2', at: [0, 17.6, 0] }, glow: [0, DECKY + 4, 0], beacons: [[65, 0, 0], [-64.3, 0, 0]],
    search: { bone: 'search', at: [0.22, 0.6, 0], dir: [0.85, -0.53, 0], cone: 5.5 } };
}
