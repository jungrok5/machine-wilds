// machine-wilds · cut.mjs — a realm's film cut for social media, drawn in parallel and finished as one MP4:
//   node scripts/cut.mjs <realm-dir> --ranges <cut.json> [--name social] [--groups 4] [--size 1440x810] [--w 1920] [--no-check] [--sheet]
// <cut.json> is { shot: [fromFrame, toFrame], … } in the order the film plays (24 frames a second; the shots are the realm's
// own, src/82_trailer.js, drawn by its trailer.mjs).  What it does, in order:
//   1. builds the page, walks the gym (--course and the realm) and check.mjs: a render waits for `check OK` (--no-check skips it
//      only for a look at frames, never for a film that leaves the machine)
//   2. splits the shots into --groups lists of about equal frame counts and draws each list in its own browser, at once (a
//      stopped render goes on: frames already drawn are kept; each list is tried three times)
//   3. writes the cut's order and ranges into out/<name>/cut.json (the parallel renders each wrote their own part of it)
//   4. joins it silent (trailer.mjs --join --nohead --mute: the title card only at the end, the repository at the foot of
//      every frame), enlarged to --w, and encodes out/<name>-1080p.mp4 for X, Threads and Facebook (H.264 high, yuv420p,
//      faststart, crf 21: about 15 Mb/s); --sheet adds out/<name>-sheet.jpg, a still every 5 s, to look over before posting
// --plan prints the lists and stops (nothing built or drawn).
// X takes up to 2:20 and 512 MB: the cut's frames plus the 4 s card must stay under 140 s (it stops before drawing if not).
// Nothing it writes is committed (out/ is ignored).  A night of rendering on a CPU: about 6 s a frame at 1440x810.
import { readFileSync, writeFileSync, existsSync, statSync, renameSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), skill = resolve(here, '..');
const args = process.argv.slice(2), has = (k) => args.includes('--' + k), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const realm = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.'), rangesFile = opt('ranges'), name = opt('name', 'social'), groups = +opt('groups', 4), size = opt('size', '1440x810'), w = opt('w', '1920');
if (!rangesFile) { console.error('usage: node scripts/cut.mjs <realm-dir> --ranges <cut.json> [--name social] [--groups 4] [--size 1440x810]'); process.exit(1); }
if (!existsSync(join(realm, 'trailer.mjs'))) { console.error('no trailer.mjs in ' + realm + ' (the realm draws its shots with it)'); process.exit(1); }
const ranges = JSON.parse(readFileSync(resolve(rangesFile), 'utf8')), order = Object.keys(ranges), frames = order.reduce((a, k) => a + ranges[k][1] - ranges[k][0], 0), secs = frames / 24 + 4;
console.log(`${order.length} shots · ${frames} frames · ${(frames / 24).toFixed(1)} s + 4 s card = ${secs.toFixed(1)} s`);
if (secs > 140 && !has('long')) { console.error('over X\'s 2:20 (140 s): shorten the cut, or --long for a film that is not for X'); process.exit(1); }
const run = (cmd, a, o = {}) => { const r = spawnSync(cmd, a, { stdio: 'inherit', cwd: o.cwd || skill }); if (r.status) { console.error(`${cmd} ${a.join(' ')} failed`); process.exit(1); } };
const t0 = Date.now(), clock = () => `${((Date.now() - t0) / 60000).toFixed(1)} min`;

const lists = Array.from({ length: Math.max(1, Math.min(groups, order.length)) }, () => ({ shots: [], n: 0 }));
for (const k of [...order].sort((a, b) => (ranges[b][1] - ranges[b][0]) - (ranges[a][1] - ranges[a][0]))) { const l = lists.reduce((a, b) => (b.n < a.n ? b : a)); l.shots.push(k); l.n += ranges[k][1] - ranges[k][0]; }
if (has('plan')) { console.log(lists.map((l, i) => `  list ${i + 1}: ${l.shots.join(',')} (${l.n} frames)`).join('\n')); process.exit(0); }

// 1. the page and the checks
run('node', [join(skill, 'scripts/build.mjs'), realm]);
if (!has('no-check')) {
  for (const a of [['--course'], []]) run('node', [join(skill, 'scripts/gym.mjs'), realm, ...a]);
  const r = spawnSync('node', [join(skill, 'scripts/check.mjs'), realm], { cwd: skill, encoding: 'utf8', maxBuffer: 64 << 20 }); process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (!/check OK/.test(r.stdout || '')) { console.error('check did not print `check OK`: nothing is drawn'); process.exit(1); }
  console.log(`checks OK · ${clock()}`);
}

// 2. the shots in lists of about equal length (longest first, each to the shortest list so far), drawn at once
const rel = join('out', name + '-ranges.json'); writeFileSync(join(realm, rel), JSON.stringify(ranges));
const draw = (list) => new Promise((done) => { let tries = 0; const go = () => { tries++; const p = spawn('node', ['trailer.mjs', '.', '--ranges', rel, '--out', name, '--size', size, '--only', list.shots.join(',')], { cwd: realm, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', (d) => { for (const line of String(d).split('\n')) if (/\d+ \/ \d+/.test(line)) process.stdout.write(`  [${list.shots[0]}…] ${line.trim()}\n`); }); p.stderr.on('data', (d) => process.stderr.write(d));
  p.on('close', (code) => { if (code && tries < 3) { console.log(`  [${list.shots[0]}…] stopped (${code}): again`); go(); } else done(code); }); }; go(); });
console.log(lists.map((l, i) => `  list ${i + 1}: ${l.shots.join(',')} (${l.n} frames)`).join('\n'));
const codes = await Promise.all(lists.map(draw)); if (codes.some((c) => c)) { console.error('a list did not finish: run again (drawn frames are kept)'); process.exit(1); }
console.log(`drawn · ${clock()}`);

// 3. the cut, whole
const cutFile = join(realm, 'out', name, 'cut.json'), cut = existsSync(cutFile) ? JSON.parse(readFileSync(cutFile, 'utf8')) : {}; cut.order = order; cut.range = ranges; writeFileSync(cutFile, JSON.stringify(cut));

// 4. silent, the card at the end only, enlarged; then the file to post
run('node', ['trailer.mjs', '.', '--ranges', rel, '--out', name, '--size', size, '--join', '--nohead', '--mute', '--w', w], { cwd: realm });
const master = join(realm, 'out', name + '-master.mp4'); renameSync(join(realm, 'out', 'cine-silent.mp4'), master);
const final = join(realm, 'out', name + '-1080p.mp4');
run('ffmpeg', ['-v', 'error', '-y', '-i', master, '-c:v', 'libx264', '-crf', '21', '-preset', 'slow', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', final]);
if (has('sheet')) run('ffmpeg', ['-v', 'error', '-y', '-i', final, '-vf', 'fps=1/5,scale=320:-1,tile=6x5', '-frames:v', '1', join(realm, 'out', name + '-sheet.jpg')]);
const mb = statSync(final).size / 1e6; console.log(`${final} · ${mb.toFixed(0)} MB${mb > 512 ? ' (over X\'s 512 MB: raise --crf)' : ''} · ${clock()}`);
