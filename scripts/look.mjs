// machine-wilds · look.mjs — the live page, looked at: open a realm's built page (or the site) at a place, an hour, a
// weather and a view, run a few lines in it, and take pictures some seconds apart.  For what a still render does not show:
// a lamp in the mist from the walker's own eye, the HUD and its prompts, faults forced on, a burst of dust fired on purpose.
//   node scripts/look.mjs <realm-dir | docs> [--q "t=60&tod=23.2&wx=mist&eye=first&at=-120,118,90"] [--eval "<js>"]
//                           [--print "<expr>"] [--shots 3] [--every 2.5] [--size 960x540] [--out out/look] [--name look] [--wait 6]
// --q is added to the page's address (its own options: t, tod, wx, eye=first|third|top, at=x,z,yaw, q=low|medium|high,
// scale, hud=0, fault=4, scout=1, film=1 …).  --eval runs in the page once the world is up, with `LR`, `V` (the realm) and
// `P` (the walker) in scope, e.g.
//   --eval "P.zoomBy(0.45); LR.vfx.burst('dust', [P.x + 6, LR.land.h(P.x + 6, P.z), P.z], { size: 1.6, id: 'look' })"
//   --eval "V.liftDeck(-5.9, 0)"            (on Ridge's deck)
// --print evaluates an expression after the pictures and prints it (JSON).  Prints console errors and failed requests; pictures go to <out>/<name>-<i>.jpg.  On a CPU allow a minute or two to load.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const root = resolve(args[0] && !args[0].startsWith('--') ? args[0] : '.'), [W, H] = opt('size', '960x540').split('x').map(Number);
const out = resolve(opt('out', join(root, 'out', 'look'))), name = opt('name', 'look'), shots = +opt('shots', 3), every = +opt('every', 2.5) * 1000, port = 8790 + Math.floor(Math.random() * 100);
if (!existsSync(join(root, 'index.html'))) { console.error('no index.html in ' + root + ' (build it: node scripts/build.mjs <realm>)'); process.exit(1); }
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.bin': 'application/octet-stream', '.gltf': 'model/gltf+json', '.ktx2': 'image/ktx2' };
const server = createServer((req, res) => { let p = join(root, decodeURIComponent(req.url.split('?')[0])); if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html'); if (!p.startsWith(root) || !existsSync(p)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }).listen(port);
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: W, height: H } }), errs = [], fails = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); }); p.on('pageerror', (e) => errs.push('page: ' + String(e).slice(0, 160))); p.on('response', (r) => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url().slice(0, 120)); });
await p.goto(`http://localhost:${port}/?go=1&tour=0&${opt('q', '')}`, { timeout: 120000 });
await p.waitForFunction(() => window.READY === true, null, { timeout: 300000 }); await p.waitForTimeout(+opt('wait', 6) * 1000);
const js = opt('eval'); if (js) await p.evaluate((src) => { const LR = window.realm ? window.realm.LR : window.LR, V = window.realm ? window.realm.V : window.V, P = LR.player; return new Function('LR', 'V', 'P', src)(LR, V, P); }, js);
for (let i = 0; i < shots; i++) { await p.waitForTimeout(i ? every : 500); const f = join(out, `${name}-${i}.jpg`); await p.screenshot({ path: f, type: 'jpeg', quality: 85, timeout: 120000 }).then(() => console.log(f)).catch(() => console.log('(picture timed out)')); }
const pr = opt('print'); if (pr) console.log('print:', JSON.stringify(await p.evaluate((src) => { const LR = window.realm ? window.realm.LR : window.LR, V = window.realm ? window.realm.V : window.V, P = LR.player; return new Function('LR', 'V', 'P', 'return (' + src + ')')(LR, V, P); }, pr)));
console.log(`errors ${errs.length}${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''} · failed requests ${fails.length}${fails.length ? ': ' + fails.slice(0, 3).join(' | ') : ''}`);
await b.close(); server.close();
