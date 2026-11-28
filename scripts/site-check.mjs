// machine-wilds · site-check.mjs — the check every site change ends with (CLAUDE.md): serves docs/, opens the walk at
// 1280 px and 390 px, the film (?film=1) and the old address (demo/iron-valley/), and prints for each: console errors,
// failed requests (404s), horizontal scroll, whether the world came up (window.READY), whether the old address forwarded.
//   node scripts/site-check.mjs [--wait 90] [--shots <dir>] [--port 8765]
// Exits 1 on an error, a failed request, a page wider than its window, a walk that never came up or an address that did
// not forward.  On a CPU (SwiftShader) the walk takes a minute or two to come up: --wait is how long to give it.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url)), docs = resolve(here, '..', 'docs');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const wait = +opt('wait', 90) * 1000, shots = opt('shots', null), port = +opt('port', 8765);
const require = createRequire(import.meta.url); let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' };
const server = createServer((req, res) => { let p = join(docs, decodeURIComponent(req.url.split('?')[0])); if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html'); if (!p.startsWith(docs) || !existsSync(p)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); }).listen(port);
if (shots) mkdirSync(shots, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const [u, w, h, kind] of [['/', 1280, 720, 'walk'], ['/', 390, 844, 'walk'], ['/?film=1', 1280, 720, 'film'], ['/demo/iron-valley/', 1280, 720, 'forward']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }), errs = [], fails = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); }); p.on('pageerror', (e) => errs.push('page: ' + String(e).slice(0, 160)));
  p.on('response', (r) => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url().slice(0, 120)); });
  await p.goto(`http://localhost:${port}${u}${kind === 'walk' ? '?go=1' : ''}`, { timeout: 120000 });
  if (kind === 'forward') await p.waitForTimeout(4000); else await p.waitForFunction(() => window.READY === true, null, { timeout: wait }).catch(() => {});
  if (kind !== 'forward') await p.waitForTimeout(3000);
  const info = await p.evaluate(() => ({ url: location.pathname + location.search, sw: document.documentElement.scrollWidth, ready: window.READY === true }));
  const ok = !errs.length && !fails.length && info.sw <= w && (kind === 'forward' ? !info.url.includes('/demo/') : info.ready);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${u} @${w}  ${kind === 'forward' ? 'now at ' + info.url : info.ready ? 'world up' : 'world NOT up after ' + wait / 1000 + ' s'} · width ${info.sw} · errors ${errs.length} · failed requests ${fails.length}${errs.length ? '\n     ' + errs.slice(0, 3).join('\n     ') : ''}${fails.length ? '\n     ' + fails.slice(0, 5).join('\n     ') : ''}`);
  if (shots) await p.screenshot({ path: join(shots, `site-${w}${kind === 'walk' ? '' : '-' + kind}.jpg`), type: 'jpeg', quality: 75, timeout: 90000 }).catch(() => console.log('     (screenshot timed out)'));
  await p.close();
}
await b.close(); server.close();
console.log(bad ? `site check: ${bad} page(s) failed` : 'site check OK'); process.exit(bad ? 1 : 0);
