// Machine Wilds · the trailer: a short film with the walker's body in it.  The camera is free (not the walker's eye): it rides
// behind a kite, comes down to the body, follows it under the turtle and the relic; the body is driven by keys, frame by frame.
//   node trailer.mjs . --dry                    every shot stepped without drawing: where the body goes
//   node trailer.mjs . --keys [--only B,D1]     three frames a shot → out/cine/key-<shot>-<n>.jpg (look before the long render)
//   node trailer.mjs . --only K,D1,D2           frames → out/cine/<shot>/f_00000.jpg (kept: a stopped render goes on)
//   node trailer.mjs . --sound [--lufs -16]     out/cine/cine.wav: the engine's sound of every shot, heard from the camera, each
//                                               event on its frame (references/SOUND.md); out/cine/sound-events.json beside it
//   node trailer.mjs . --join [--nohead]        out/cine.mp4 (shots in ORDER, each cut to RANGE, the sound, out/cine/title.png last; --nohead: no card before)
//   node trailer.mjs . --ranges cut.json --out social [--size 1440x810]   another cut: { shot: [from, to] } in order, then --join with the same --ranges
// Needs the built page (scripts/build.mjs) and the scans (scripts/fetch-assets.mjs).  Nothing it writes is committed.
// A camera inside a lamp's cone sees the cone's edge as a hard line across the picture: keep the camera outside the beams.
import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url'; import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'; import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const args = process.argv.slice(2), dir = args[0], has = (k) => args.includes('--' + k), opt = (k) => { const i = args.indexOf('--' + k); return i > -1 ? args[i + 1] : null; };
const [W, H] = (opt('size') || '960x540').split('x').map(Number), FPS = 24, out = dir + '/out/' + (opt('out') || 'cine'), QX = '&' + (opt('q') || 'q=high&tierx=shadow:1024');      /* (without ?q= a page with no GPU picks the medium tier: say which) */ mkdirSync(out, { recursive: true });
// the shots, their order and the frames of each that are in the cut come from the page (src/82_trailer.js); here only for --join
let ORDER = [], RANGE = {}, TITLE = null;
const only0 = opt('only') ? opt('only').split(',') : null, cutFile = out + '/cut.json';
// --join: the cut's frames → out/cine[-silent].mp4, with a card before and after (the work's name and where it lives), the
// repository's name small at the foot of every frame, the sound unless --mute.  --w 1920 (the picture is enlarged with a sharp
// filter: a player's own enlarging is what makes a small film look soft)
if (has('join')) { if (!existsSync(cutFile)) { console.error('no cut.json in ' + out + ' yet: run --dry, --sound or a render first'); process.exit(1); } const c = JSON.parse(readFileSync(cutFile, 'utf8')); ORDER = c.order; RANGE = c.range; TITLE = c.title || {};
  const OW = +(opt('w') || 1920), OH = Math.round((OW * H) / W / 2) * 2, HEAD = has('nohead') ? 0 : 2.8, TAIL = 4.0, mute = has('mute'), ff = (a) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' }); if (r.status) { console.error('ffmpeg failed'); process.exit(1); } };
  { const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: OW / 960 });      // the cards, drawn by the browser (it has the letters)
    const card = (rows) => `<body style="margin:0;background:#07090b;color:#e9e4d6;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">${rows}</body>`;
    const big = `<div style="font-size:64px;font-weight:700;letter-spacing:.14em">${TITLE.big || ''}</div><div style="width:120px;height:2px;background:#c8532e;margin:22px 0 18px"></div><div style="font-size:20px;letter-spacing:.42em;opacity:.78">${TITLE.small || ''}</div>`, repo = (TITLE.repo ? `<div style="font-size:14px;letter-spacing:.12em;opacity:.6;margin-top:26px;font-family:monospace">${TITLE.repo}</div>` : '') + (TITLE.rights ? `<div style="font-size:12px;letter-spacing:.08em;opacity:.42;margin-top:10px">${TITLE.rights}</div>` : '');
    await pg.setContent(card(big + repo)); await pg.screenshot({ path: out + '/card-head.png' }); await pg.setContent(card(big + `<div style="font-size:15px;letter-spacing:.2em;opacity:.5;margin-top:14px">${TITLE.line || ''}</div>` + repo)); await pg.screenshot({ path: out + '/card-tail.png' }); await b.close(); }
  const enc = ['-c:v', 'libx264', '-crf', '13', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', String(FPS)], big = `scale=${OW}:${OH}:flags=lanczos,unsharp=5:5:0.55:5:5:0.0`, parts = []; let Ts = 0;
  if (HEAD > 0) { ff(['-loop', '1', '-framerate', String(FPS), '-i', out + '/card-head.png', '-t', String(HEAD), '-vf', `scale=${OW}:${OH},fade=t=in:st=0:d=0.6,fade=t=out:st=${HEAD - 0.6}:d=0.6`, ...enc, out + '/head.mp4']); parts.push('head.mp4'); }
  for (const n of ORDER) { const len = (RANGE[n][1] - RANGE[n][0]) / FPS, vf = big + (n === ORDER[0] ? ',fade=t=in:st=0:d=0.8' : n === ORDER[ORDER.length - 1] ? `,fade=t=out:st=${(len - 1.3).toFixed(2)}:d=1.3` : '');
    ff(['-framerate', String(FPS), '-start_number', String(RANGE[n][0]), '-i', `${out}/${n}/f_%05d.jpg`, '-frames:v', String(RANGE[n][1] - RANGE[n][0]), '-vf', vf, ...enc, `${out}/${n}.mp4`]); parts.push(n + '.mp4'); Ts += len; }
  ff(['-loop', '1', '-framerate', String(FPS), '-i', out + '/card-tail.png', '-t', String(TAIL), '-vf', `scale=${OW}:${OH},fade=t=in:st=0:d=0.7,fade=t=out:st=${TAIL - 0.8}:d=0.8`, ...enc, out + '/tail.mp4']); parts.push('tail.mp4');
  writeFileSync(out + '/list.txt', parts.map((p) => `file '${p}'`).join('\n')); const T = HEAD + Ts + TAIL, wav = !mute && existsSync(out + '/cine.wav'), a = ['-f', 'concat', '-safe', '0', '-i', out + '/list.txt']; if (wav) a.push('-i', out + '/cine.wav');
  const fs = Math.round(OH / 64), mark = TITLE.repo ? `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${TITLE.repo}':fontsize=${fs}:fontcolor=white@0.42:shadowcolor=black@0.35:shadowx=1:shadowy=1:x=w-tw-${fs + 6}:y=h-th-${fs}:enable='between(t,${HEAD},${(HEAD + Ts).toFixed(2)})'` : 'null';
  a.push('-vf', mark); if (wav) a.push('-af', `adelay=${HEAD * 1000}|${HEAD * 1000},afade=t=in:st=${HEAD}:d=0.8,afade=t=out:st=${(HEAD + Ts - 0.6).toFixed(2)}:d=2.4,apad`, '-c:a', 'aac', '-b:a', '192k'); else a.push('-an');
  const dst = `${dir}/out/cine${wav ? '' : '-silent'}.mp4`; a.push('-t', T.toFixed(2), '-c:v', 'libx264', '-crf', opt('crf') || '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dst); ff(a); console.log(`${dst} · ${T.toFixed(1)} s · ${OW} × ${OH}${wav ? ' · with sound' : ' · silent'}`); process.exit(0); }
const dry = has('dry'), keys = has('keys'), sound = has('sound');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] }), page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(pathToFileURL(dir + '/index.html').href + `?render=1&w=${W}&h=${H}&frames=2&hud=0&torch=1${QX}${sound ? '&sound=1' : ''}`, { waitUntil: 'commit', timeout: 0 });
for (const t0 = Date.now(); ;) { const s = await page.evaluate(() => [window.READY === true, window.FAILED || null]); if (s[1]) throw new Error(s[1]); if (s[0]) break; if (Date.now() - t0 > 400000) throw new Error('never ready'); await new Promise((r) => setTimeout(r, 1000)); } console.log('ready');
const INFO = await page.evaluate(() => window.realm.cine.info()); if (!INFO) throw new Error('the realm declares no film (LR.start({ cine }))');
ORDER = INFO.order; RANGE = INFO.range; if (opt('ranges')) { const R2 = JSON.parse(readFileSync(opt('ranges'), 'utf8')); ORDER = Object.keys(R2); RANGE = Object.assign({}, RANGE, R2); INFO.order = ORDER; INFO.range = RANGE; }      /* --ranges cut.json: { shot: [from, to] } in order — a shorter cut, only its frames drawn */
 writeFileSync(cutFile, JSON.stringify(INFO)); const only = only0 || ORDER;
await page.evaluate(() => { window.realm.filmStart(24); window.realm.LR.player.stopTour(); window.realm.LR.wx.set({ auto: false }); window.cine = window.realm.cine; });
const save = async (f) => writeFileSync(f, Buffer.from((await page.evaluate(() => window.realm.canvas.toDataURL('image/jpeg', 0.95))).split(',')[1], 'base64'));
if (sound) {
  // the sound (lib/85_audio · 86_sfx · 87_ear; references/SOUND.md): every shot stepped dry while the ear listens from the camera —
  // the machines' feet by their weight, their pumps, valves and calls, the faults' crackle to their own envelopes, the strikes
  // (heard later by their distance), the walker's feet and wings, the lift, the loops (a giant near, the air past a flight) —
  // each event placed on the frame its picture shows it; the listener and the weather kept frame by frame.  Then every shot is
  // rendered on its own (its own hour, weather and place; the sound cuts with the picture, the shot before ringing on a third of a
  // second under it) and laid end to end; ffmpeg brings it to −16 LUFS with its true peak under −1 dBTP.  Beside the WAV:
  // sound-events.json (every event with its shot and its time) to check against the frames.
  // (--mix rain=0,sfx=0: a stem — the buses wind, birds, insects, rain, world, steps, thunder, sfx scaled, to judge one layer)
  const PRE = 2.5, LUFS = +(opt('lufs') || -16), MIX = Object.fromEntries((opt('mix') || '').split(',').filter(Boolean).map((kv) => [kv.split('=')[0], +kv.split('=')[1]]));
  const res = await page.evaluate(async ([ORDER, FPS, RANGE, PRE, MIX]) => { const LR = window.realm.LR, C = window.cine, ear = LR.ear, shots = []; let T = 0;
    for (const n of ORDER) { ear.record(); C.begin(n, false); const [r0, r1] = RANGE[n];
      for (let k = 0; k < r1; k++) { const c0 = C.time(); C.tick(false); const tt = (k - r0) / FPS; ear.after(tt, (C.time() - c0) * FPS, tt >= -PRE - 0.05, -PRE); }
      const r = ear.stop(), len = (r1 - r0) / FPS; shots.push({ name: n, at: T, len, frames: r.frames, events: r.events }); T += len; }
    // a strike seen late in a shot is heard in the next when that one is in the rain too (else it is lost with the cut)
    for (let i = 0; i < shots.length; i++) { const a = shots[i], b = shots[i + 1], wet = b && b.frames.length && b.frames[b.frames.length - 1].rain > 0.3;
      a.events = a.events.filter((e) => { if (e.kind !== 'thunder' || e.carried) return true; const arrive = e.at + e.d / 343; if (arrive < a.len - 0.05) return true; if (wet) b.events.push(Object.assign({}, e, { at: +(e.at - a.len).toFixed(5), carried: 1 })); return false; }); }
    const out = await LR.audio.renderFilm({ fps: FPS, shots, pre: PRE, tail: 0.32, sampleRate: 48000, volume: 0.9, seed: 'machine-wilds', mix: MIX }); if (!out.ch) return { none: JSON.stringify(out) };
    const n = out.ch[0].length, pcm = new Int16Array(n * 2), k = out.peak > 0.98 ? 0.98 / out.peak : 1; for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) pcm[i * 2 + c] = Math.round(Math.max(-1, Math.min(1, out.ch[c][i] * k)) * 32767);
    const u8 = new Uint8Array(pcm.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    const list = shots.map((s) => ({ name: s.name, at: +s.at.toFixed(4), len: +s.len.toFixed(4), events: s.events.map((e) => { const o = Object.assign({}, e); if (o.env) { o.envLen = o.env.length; delete o.env; } if (o.clicks) o.clicks = o.clicks.length; return o; }) }));
    return { sr: out.sr, n, b64: btoa(bin), shots: list, info: out.shots, peak: out.peak }; }, [ORDER, FPS, RANGE, PRE, MIX]);
  if (res.none) { console.log('no sound:', res.none); await browser.close(); process.exit(1); }
  const pcm = Buffer.from(res.b64, 'base64'), h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(res.sr, 24); h.writeUInt32LE(res.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  const raw = out + '/cine-raw.wav'; writeFileSync(raw, Buffer.concat([h, pcm])); await browser.close();
  // loudness: measure, set the gain, hold the peaks under the ceiling (a limiter with no make-up of its own), measure again
  const meter = (f) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }), s = r.stderr || '', I = s.match(/I:\s+(-?[\d.]+) LUFS/g), P = s.match(/Peak:\s+(-?[\d.]+) dBFS/g); return { I: I ? +I[I.length - 1].match(/-?[\d.]+/)[0] : null, TP: P ? +P[P.length - 1].match(/-?[\d.]+/)[0] : null }; };
  const m0 = meter(raw); let gain = LUFS - m0.I, m1 = null;
  for (let i = 0; i < 3; i++) { spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${Math.pow(10, -1.6 / 20).toFixed(4)}:attack=2:release=80:level=disabled:asc=1`, '-c:a', 'pcm_s16le', out + '/cine.wav']); m1 = meter(out + '/cine.wav'); if (Math.abs(m1.I - LUFS) < 0.3) break; gain += LUFS - m1.I; }
  writeFileSync(out + '/sound-events.json', JSON.stringify({ fps: FPS, shots: res.shots, info: res.info, loudness: { raw: m0, final: m1, gain: +gain.toFixed(2) } }, null, 1));
  const kinds = {}; for (const s of res.shots) for (const e of s.events) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  console.log(out + '/cine.wav', (res.n / res.sr).toFixed(1) + ' s', JSON.stringify(kinds), `raw ${m0.I} LUFS · final ${m1.I} LUFS, true peak ${m1.TP} dBTP`);
  process.exit(0); }
for (const n of only) { const N = await page.evaluate((n) => window.cine.frames(n), n);
  if (dry) { await page.evaluate((n) => window.cine.begin(n, false), n); for (let k = 0; k < N; k++) { const r = await page.evaluate(() => window.cine.tick(false)); if (k % 12 === 0 || k === N - 1) console.log(n, JSON.stringify(r)); } continue; }
  if (keys) { const want = (opt('at') ? opt('at').split(',').map(Number) : [0.12, 0.55, 0.95]).map((q) => Math.round(q * (N - 1))); await page.evaluate((n) => window.cine.begin(n, true), n); for (let k = 0; k < N; k++) { const near = want.some((w) => k >= w - 3 && k <= w); const r = await page.evaluate((d) => window.cine.tick(d), near); if (want.includes(k)) { const f = `${out}/key-${n}-${want.indexOf(k) + 1}.jpg`; await save(f); console.log(f, JSON.stringify(r)); } } continue; }
  const sd = `${out}/${n}`; mkdirSync(sd, { recursive: true }); const t0 = Date.now(); await page.evaluate((n) => window.cine.begin(n, true), n);
  const [r0, r1] = RANGE[n] || [0, N]; for (let k = 0; k < Math.min(N, r1); k++) { const f = `${sd}/f_${String(k).padStart(5, '0')}.jpg`, skip = k < r0, have = skip || existsSync(f), soon = k >= r0 - 4 && !existsSync(`${sd}/f_${String(Math.min(N - 1, k + 4)).padStart(5, '0')}.jpg`); await page.evaluate((d) => window.cine.tick(d), !have || soon); if (!have) await save(f); if (k % 24 === 0) console.log(n, k, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + ' s'); } }
await browser.close(); console.log('done', only.join(','));
