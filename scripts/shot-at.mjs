// machine-wilds · shot-at.mjs — a camera placed in a machine's own frame, at a time of the machines' clock, as a still for
// render.mjs.  A giant moves: a camera written in world numbers lands inside its tanks or behind its house; one written
// on its body (along, up, across from its origin) stays on its deck, under its belly or by its lift, whenever it is.
//   node scripts/shot-at.mjs <realm-dir> --unit Ridge --t 866.7 --eye 13.6,1.7,-8.5 --look 14,0.4,-2.5 [--bone body] [--tod 17.4] [--wx clear]
//   node scripts/render.mjs <realm-dir> $(node scripts/shot-at.mjs …) --size 960x540 --out out/look
// --t may be a list (866.7,862,862.6): one --shot each.  --find lift=0.04 prints the first time after --from (default 0)
// the command's extra `lift` falls to 0.04 (any extra channel: a lift, a door) instead of a shot — to find a moment to look at.
import { load } from './gym.mjs';
import { resolve } from 'node:path';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const realm = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.'), LR = load(realm); LR.gym({}); const M = LR.mech; M.plan({ press: true });
const u = M.units.find((q) => q.name === opt('unit')); if (!u) { console.error('no unit ' + opt('unit') + ' (units: ' + M.units.map((q) => q.name).join(', ') + ')'); process.exit(1); }
const find = opt('find'); if (find) { const [ch, v] = find.split('='), want = +v; let prev = null; for (let t = +opt('from', 0); t < u.lap * 2; t += 0.05) { const c = M.cmd(u, t), f = (c.extras && c.extras[ch]) || 0; if (prev !== null && (prev - want) * (f - want) <= 0 && prev !== f) { console.log(t.toFixed(2)); process.exit(0); } prev = f; } console.error('never'); process.exit(1); }
const v3 = (s) => s.split(',').map(Number), eye = v3(opt('eye', '0,2,-10')), look = v3(opt('look', '0,0,0')), bone = opt('bone', 'body');
const shots = String(opt('t', '0')).split(',').map(Number).map((t) => { const r = M.poseAt(u, t), F = r.W[bone], at = (v) => [0, 1, 2].map((i) => F.p[i] + F.x[i] * v[0] + F.y[i] * v[1] + F.z[i] * v[2]);
  const e = at(eye), L = at(look), d = [L[0] - e[0], L[1] - e[1], L[2] - e[2]], yaw = (Math.atan2(d[0], -d[2]) * 180) / Math.PI, pitch = (Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180) / Math.PI;
  return `--shot "cam=${e[0].toFixed(2)},${e[2].toFixed(2)},${yaw.toFixed(1)},${pitch.toFixed(1)},${e[1].toFixed(2)};t=${t};tod=${opt('tod', '16')};wx=${opt('wx', 'clear')};dof=0;frames=6"`; });
console.log(shots.join(' '));
