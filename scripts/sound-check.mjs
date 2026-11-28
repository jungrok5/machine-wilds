// machine-wilds · sound-check.mjs — look at a film's sound since it cannot be heard here: the events against the frames, the
// loudness shot by shot, the spectrum.  Reads what trailer.mjs --sound wrote (out/<name>/sound-events.json, cine.wav).
//   node scripts/sound-check.mjs <realm>/out/<name>                       every event: shot, its frame, kind, distance, side, what it carries
//        [--kind footfall,step] [--near 60] [--shot R2]                    … only these kinds, nearer than 60 m, in that shot
//   node scripts/sound-check.mjs <realm>/out/<name> --loud [--raw]         loudness of each shot (ebur128: integrated, short-term max/min,
//                                                                          true peak) and of the whole, from cine.wav
//   node scripts/sound-check.mjs <realm>/out/<name> --spec <png>           a spectrogram of the whole (log frequency), the cuts marked
//   node scripts/sound-check.mjs <realm>/out/<name> --plot <png> [--with <dir>,<dir>] [--raw]   loudness over time (momentary, short-term),
//                                                                          the shots named, a line for each stem (--with: the same film, --mix)
//   node scripts/sound-check.mjs <realm>/out/<name> --strip <png> --frames <dir with SHOT/f_*.jpg> [--kind footfall --near 40 --max 8]
//        for each event a strip of its frame and the two before and after, so the moment can be seen to land on it
// The frame of an event is the shot's own numbering (the cut's range start + its time × fps), as the frames on disk are named.
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2), dir = args[0], has = (k) => args.includes('--' + k), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
if (!dir || !existsSync(join(dir, 'sound-events.json'))) { console.error('usage: node scripts/sound-check.mjs <realm>/out/<name> [--kind k,k] [--near m] [--shot S] [--loud] [--spec png] [--strip png --frames dir]'); process.exit(1); }
const S = JSON.parse(readFileSync(join(dir, 'sound-events.json'), 'utf8')), fps = S.fps || 24;
const cut = existsSync(join(dir, 'cut.json')) ? JSON.parse(readFileSync(join(dir, 'cut.json'), 'utf8')) : null, r0 = (n) => (cut && cut.range && cut.range[n] ? cut.range[n][0] : 0);
const kinds = opt('kind') ? opt('kind').split(',') : null, near = +opt('near', 1e9), only = opt('shot') ? opt('shot').split(',') : null;
const pick = () => { const out = []; for (const s of S.shots) { if (only && !only.includes(s.name)) continue; for (const e of s.events) { if (kinds && !kinds.includes(e.kind)) continue; if (e.d > near) continue; if (e.at < 0 || e.at >= s.len) continue; out.push({ s, e, f: Math.round(r0(s.name) + e.at * fps), T: s.at + e.at }); } } return out.sort((a, b) => a.T - b.T); };
const ff = (a) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8', maxBuffer: 256 << 20 });

if (has('loud')) {
  const wav = join(dir, has('raw') ? 'cine-raw.wav' : 'cine.wav'), row = (name, from, len) => { const r = ff(['-ss', String(from), '-t', String(len), '-i', wav, '-af', 'ebur128=peak=true:framelog=info', '-f', 'null', '-']), t = r.stderr || '';
    const st = [...t.matchAll(/S:\s*(-?[\d.]+)/g)].map((m) => +m[1]).filter((v) => v > -70), I = (t.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/) || [])[1], P = [...t.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].pop();
    return `${name.padEnd(7)} ${String(from.toFixed(2)).padStart(7)} s  I ${String(I).padStart(6)} LUFS   short-term ${st.length ? Math.max(...st).toFixed(1) : '–'} / ${st.length ? Math.min(...st).toFixed(1) : '–'}   true peak ${P ? P[1] : '–'} dBTP`; };
  for (const s of S.shots) console.log(row(s.name, s.at, s.len)); const end = S.shots.reduce((a, s) => Math.max(a, s.at + s.len), 0); console.log(row('whole', 0, end)); process.exit(0);
}
if (opt('plot')) {
  // momentary (0.4 s) and short-term (3 s) loudness over the whole film, the shots named, one line for each of --with dirs
  // (stems: the same film rendered with --mix), drawn as SVG and photographed by the browser
  const png = opt('plot'), dirs = [dir, ...(opt('with') ? opt('with').split(',') : [])], end = S.shots.reduce((a, s) => Math.max(a, s.at + s.len), 0), W = Math.round(end * 16), Hh = 420, y = (v) => Math.round(30 + ((-6 - Math.max(-60, v)) / 54) * (Hh - 60));
  const series = dirs.map((d) => { const f = join(d, has('raw') ? 'cine-raw.wav' : 'cine.wav'), t = ff(['-i', f, '-af', 'ebur128=framelog=info', '-f', 'null', '-']).stderr || ''; return [...t.matchAll(/t:\s*([\d.]+)\s+TARGET:\S+\s+LUFS\s+M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)/g)].map((m) => [+m[1], +m[2], +m[3]]); });
  const col = ['#e8e2d0', '#e0763c', '#4fa3d9', '#8bc34a'], path = (pts, k) => 'M' + pts.map((p) => `${Math.round(p[0] * 16)},${y(p[k])}`).join(' L');
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" style="background:#101317;font:12px sans-serif">`;
  for (const v of [-10, -16, -23, -30, -40, -50]) svg += `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#333" /><text x="4" y="${y(v) - 3}" fill="#777">${v}</text>`;
  for (const s of S.shots) svg += `<line x1="${s.at * 16}" x2="${s.at * 16}" y1="20" y2="${Hh}" stroke="#555" /><text x="${s.at * 16 + 3}" y="16" fill="#aaa">${s.name}</text>`;
  series.forEach((pts, i) => { if (!pts.length) return; svg += `<path d="${path(pts, 1)}" fill="none" stroke="${col[i]}" stroke-opacity="0.35" stroke-width="1"/><path d="${path(pts, 2)}" fill="none" stroke="${col[i]}" stroke-width="2"/>`; });
  svg += dirs.map((d, i) => `<text x="${W - 260}" y="${36 + i * 16}" fill="${col[i]}">${d.split('/').pop()}</text>`).join('') + '</svg>';
  const html = png.replace(/\.png$/, '') + '.svg'; writeFileSync(html, svg);
  const { createRequire } = await import('node:module'), require = createRequire(import.meta.url), { chromium } = require('playwright'), b = await chromium.launch(), pg = await b.newPage({ viewport: { width: W, height: Hh } });
  await pg.setContent(`<body style="margin:0">${svg}</body>`); await pg.screenshot({ path: png }); await b.close(); console.log(png); process.exit(0);
}
if (opt('spec')) {
  const png = opt('spec'), marks = S.shots.map((s) => `drawbox=x=${Math.round(s.at * 20)}:y=0:w=1:h=ih:color=white@0.35:t=fill`).join(',');
  const r = ff(['-y', '-i', join(dir, 'cine.wav'), '-lavfi', `showspectrumpic=s=${Math.round(S.shots.reduce((a, s) => Math.max(a, s.at + s.len), 0) * 20)}x480:mode=combined:fscale=log:scale=log:drange=70:legend=0:color=intensity,${marks}`, png]); if (r.status) { console.error(r.stderr); process.exit(1); } console.log(png); process.exit(0);
}
if (opt('strip')) {
  const png = opt('strip'), fr = opt('frames'), max = +opt('max', 8), list = pick().slice(0, max), tmp = join(dir, '_strip'); if (!fr) { console.error('--strip needs --frames <dir>'); process.exit(1); }
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); const rows = [];
  list.forEach((x, i) => { const cells = [-2, -1, 0, 1, 2].map((k) => join(fr, x.s.name, `f_${String(x.f + k).padStart(5, '0')}.jpg`)).filter(existsSync); if (cells.length < 5) return;
    const out = join(tmp, `r${i}.jpg`), lab = `${x.s.name} f${x.f} ${x.e.kind} ${x.e.unit || x.e.surface || ''} d=${x.e.d}`.replace(/[:']/g, ' ');
    const r = ff(['-y', ...cells.flatMap((c) => ['-i', c]), '-filter_complex', cells.map((c, k) => `[${k}]scale=384:-2${k === 2 ? ',drawbox=x=0:y=0:w=iw:h=ih:color=red:t=4' : ''}[c${k}]`).join(';') + ';' + cells.map((c, k) => `[c${k}]`).join('') + `hstack=inputs=${cells.length},drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${lab}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5`, out]); if (!r.status) rows.push(out); });
  if (!rows.length) { console.error('no strips (frames not found?)'); process.exit(1); }
  const r = ff(['-y', ...rows.flatMap((c) => ['-i', c]), '-filter_complex', rows.length > 1 ? `${rows.map((c, k) => `[${k}]`).join('')}vstack=inputs=${rows.length}` : 'null', png]); rmSync(tmp, { recursive: true, force: true }); if (r.status) { console.error(r.stderr); process.exit(1); } console.log(png, rows.length, 'events'); process.exit(0);
}
const keep = (e) => Object.entries(e).filter(([k]) => !['kind', 'at', 'd', 'side', 'p'].includes(k)).map(([k, v]) => `${k}=${typeof v === 'number' ? +v.toFixed(2) : v}`).join(' ');
for (const x of pick()) console.log(`${x.T.toFixed(3).padStart(8)} s  ${x.s.name.padEnd(6)} f${String(x.f).padStart(4)}  ${x.e.kind.padEnd(9)} d ${String(x.e.d.toFixed(1)).padStart(6)}  side ${x.e.side.toFixed(2).padStart(5)}  ${keep(x.e)}`);
if (S.loudness) console.log('loudness', JSON.stringify(S.loudness));
