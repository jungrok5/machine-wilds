// Machine Wilds · the sky machine's deck as somewhere to come down (lib/80_player: LR.pads), and the storm as the wings'
// charge.  Flying, the walker lands on Nimbus's deck where it meets it (the open plate aft of the town, src/28_sky.js:
// V.skyDeck) and walks it and the street through the town while the ship drifts on; a double tap of Space takes it off again.
// Near the ship in a storm its wings take their charge back fast, from the air the ship harvests (LR.wingCharge).
V.skyPad = () => {
  const M = LR.mech, P = LR.player, D = V.skyDeck; if (!D || !P) return;
  const ship = () => M.units.find((u) => u.name === D.unit), frame = () => { const u = ship(); return u && u.pose && u.pose.W ? u.pose.W[D.bone || 'body'] : null; };
  // walk the deck and the street: inside the nearest of its rectangles
  const onShip = (x, z) => { let best = [x, z], bd = 1e9; for (const [x0, x1, z0, z1] of D.walk || [D.rect]) { const cx = LR.clamp(x, x0, x1), cz = LR.clamp(z, z0, z1), d = Math.hypot(cx - x, cz - z); if (d < bd) { bd = d; best = [cx, cz]; } } return best; };
  const board = (l) => { const at = onShip(l[0], l[2]); P.ride = { unit: ship(), frame, local: [at[0], D.y, at[1]], clamp: onShip, slow: 0.85 }; };
  LR.pads = LR.pads || []; for (const r of D.walk || [D.rect]) LR.pads.push({ name: D.unit, frame, rect: r, y: D.y, board });
  // the wings' charge: a storm near the ship gives it back quickly (a little more the nearer), a storm anywhere a little
  LR.wingCharge = (Pl) => { const F = frame(), storm = LR.sat(((LR.wx && LR.wx.rain) || 0) * 1.6 - 0.3); if (!storm) return 0; if (!F) return 0.02 * storm;
    const d = Math.hypot(Pl.x - F.p[0], Pl.y - F.p[1], Pl.z - F.p[2]); return storm * (0.02 + 0.4 * LR.sat(1 - (d - 60) / 260)); };
  V.skyBoard = board;
};
