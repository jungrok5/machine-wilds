// machine-wilds · puff-lab — the dust puffs' fragment shader alone, over a frame of the game, as a footfall's skirt lays
// them out at two ages (0.3 s and 1.2 s).  A full render takes minutes a frame; this takes seconds, so a dust look is tuned
// here and then copied into lib/62_vfx.js (the puffs' fragment string: its varyings are this file's uniforms).
//   node scripts/puff-lab/run.mjs scripts/puff-lab/puff.frag <background.jpg> <out.png>
// <background.jpg>: any 960x540 frame of a film (out/<cut>/<shot>/f_00040.jpg).  Keep each try as its own .frag and
// compare the pictures side by side; puff.frag is the one the engine draws now.
import { createRequire } from 'node:module'; import fs from 'node:fs'; const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { const { execSync } = await import('node:child_process'); ({ chromium } = require(require('node:path').join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const [frag, bg, out] = process.argv.slice(2);
const html = `<canvas id=c width=960 height=540></canvas><script>
const gl = document.getElementById('c').getContext('webgl2', { premultipliedAlpha: false });
function rng(seed){ let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function noise(size){ const d = new Uint8Array(size*size*4), r = rng(77); for (let c=0;c<4;c++){ const acc=new Float32Array(size*size); let amp=0.5,tot=0; for (const cells of [4,8,16,32,64]){ const g=new Float32Array(cells*cells); for(let i=0;i<g.length;i++) g[i]=r(); for(let y=0;y<size;y++) for(let x=0;x<size;x++){ const fx=x/size*cells, fy=y/size*cells, xi=Math.floor(fx), yi=Math.floor(fy); let u=fx-xi,v=fy-yi; u=u*u*(3-2*u); v=v*v*(3-2*v); const x1=(xi+1)%cells,y1=(yi+1)%cells, a=g[yi*cells+xi], b=g[yi*cells+x1], cc=g[y1*cells+xi], dd=g[y1*cells+x1]; acc[y*size+x]+=amp*(a+(b-a)*u+(cc-a)*v+(a-b-cc+dd)*u*v);} tot+=amp; amp*=0.5; } let lo=1,hi=0; for(const v of acc){const w=v/tot; if(w<lo)lo=w; if(w>hi)hi=w;} for(let i=0;i<acc.length;i++) d[i*4+c]=Math.round(Math.min(1,Math.max(0,(acc[i]/tot-lo)/(hi-lo)))*255);} return d; }
function tex(unit, w, h, data, img){ const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D, t); if (img) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img); else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR); return t; }
function prog(vs, fs){ const p = gl.createProgram(); for (const [t,s] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){ const sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh); if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p,sh);} gl.linkProgram(p); return p; }
const img = new Image(); img.onload = () => { try {
  tex(0, 256, 256, noise(256)); tex(1, 0, 0, null, img);
  const bgp = prog('#version 300 es\\nin vec2 a; out vec2 uv; void main(){ uv=a*0.5+0.5; uv.y=1.0-uv.y; gl_Position=vec4(a,0,1); }', '#version 300 es\\nprecision highp float; in vec2 uv; uniform sampler2D tB; out vec4 o; void main(){ o=texture(tB,uv); }');
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  gl.useProgram(bgp); gl.uniform1i(gl.getUniformLocation(bgp,'tB'),1); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  const pp = prog('#version 300 es\\nin vec2 a; uniform vec4 uP; out vec2 vQ; void main(){ vQ=a; gl_Position=vec4(uP.xy + a*uP.zw, 0, 1); }', FRAG);
  gl.useProgram(pp); gl.uniform1i(gl.getUniformLocation(pp,'uNoise'),0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const L = (n) => gl.getUniformLocation(pp, n), R = rng(5);
  for (const age of AGES) for (let j = 0; j < 20; j++) { const a = j / 20 * 6.283 + R()*0.3, rr = (0.35 + 2.4*(1-Math.exp(-age*3.2))) * 0.22, cx = AGECX[AGES.indexOf(age)];
    const s = (0.34 + 0.85*(1-Math.exp(-age*2.0))) * (0.75 + 0.5*R()) * 0.3, al = Math.min(1, age/0.05) * Math.exp(-age*0.62) * 0.5;
    gl.uniform4f(L('uP'), cx + Math.cos(a)*rr, -0.1 + Math.abs(Math.sin(a))*rr*0.25 + 0.05*(1-Math.exp(-age*0.9)), s*0.5625, s);
    gl.uniform1f(L('vA'), al); gl.uniform1f(L('vId'), R()*31.0); gl.uniform1f(L('vAge'), age); gl.uniform3f(L('vC'), 0.5, 0.44, 0.36); gl.uniform3f(L('vAmb'), 0.55, 0.62, 0.75); gl.uniform3f(L('vSunW'), 1.25, 1.1, 0.95); gl.uniform3f(L('vSunS'), 0.5, 0.6, -0.3); gl.uniform3f(L('vFogC'), 0.0, 0.0, 0.0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4); }
  document.title = 'done'; } catch (e) { document.title = 'ERR ' + e.message; } };
img.src = 'data:image/jpeg;base64,${fs.readFileSync(bg).toString('base64')}';
const AGES = [0.3, 1.2], AGECX = [-0.45, 0.45];
const FRAG = ${JSON.stringify(fs.readFileSync(frag, 'utf8'))};
</script>`;
 const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.setContent(html); await p.waitForFunction(() => document.title.length > 0, null, { timeout: 120000 }); const t = await p.title(); if (t !== 'done') console.log(t);
  await p.screenshot({ path: out }); await b.close(); 
