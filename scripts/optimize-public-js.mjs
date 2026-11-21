// Post-build step. The scripts in public/js are classic (non-module) scripts that Vite never touches, so they ship
// unminified, with 24h caching and no versioned names. This step runs on dist/ only (public/js stays readable):
//   1. minify each script with esbuild (syntax-safe: top-level names are NOT renamed, no property mangling)
//   2. write it to dist/js/h/<name>.<content-hash>.js  (new content = new URL, so it can be cached for a year)
//   3. rewrite every reference to /js/<name>.js in dist (html, js, css, txt, xml, json)
//   4. fail the build if any reference to an old name is left
// Run automatically by `npm run build`. Set FK_SKIP_JS_OPT=1 to skip (ships the original files, still correct).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

if (process.env.FK_SKIP_JS_OPT === '1') { console.log('[optimize-js] skipped (FK_SKIP_JS_OPT=1)'); process.exit(0); }

const DIST = path.resolve('dist');
const JS = path.join(DIST, 'js');
const OUT = path.join(JS, 'h');
if (!fs.existsSync(JS)) { console.error('[optimize-js] dist/js not found. Run astro build first.'); process.exit(1); }

let esbuild = null;
try { esbuild = await import('esbuild'); } catch { console.warn('[optimize-js] esbuild not found: hashing only, no minify'); }

const files = fs.readdirSync(JS).filter((f) => f.endsWith('.js') && fs.statSync(path.join(JS, f)).isFile());
fs.mkdirSync(OUT, { recursive: true });

const map = new Map(); // "10.js" -> "h/10.1a2b3c4d5e.js"
let before = 0, after = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  before += Buffer.byteLength(src);
  let code = src;
  if (esbuild && !f.endsWith('.min.js')) {
    const r = await esbuild.transform(src, { loader: 'js', minify: true, legalComments: 'inline', charset: 'utf8' });
    code = r.code;
  }
  after += Buffer.byteLength(code);
  const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 10);
  const name = `${f.slice(0, -3)}.${hash}.js`;
  fs.writeFileSync(path.join(OUT, name), code);
  map.set(f, `h/${name}`);
  fs.unlinkSync(path.join(JS, f));
}

// rewrite references everywhere in dist
const exts = new Set(['.html', '.js', '.css', '.txt', '.xml', '.json', '.mjs']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return exts.has(path.extname(e.name)) ? [p] : [];
  });
}
const names = [...map.keys()].sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`/js/(${names.map(esc).join('|')})(?![A-Za-z0-9._-])`, 'g');

let rewritten = 0;
for (const p of walk(DIST)) {
  const s = fs.readFileSync(p, 'utf8');
  const out = s.replace(re, (_, n) => { rewritten++; return `/js/${map.get(n)}`; });
  if (out !== s) fs.writeFileSync(p, out);
}

// verify: no reference to an old unhashed name may remain
const leftovers = [];
for (const p of walk(DIST)) {
  const s = fs.readFileSync(p, 'utf8');
  for (const n of names) if (new RegExp(`/js/${esc(n)}(?![A-Za-z0-9._-])`).test(s)) leftovers.push(`${path.relative(DIST, p)} -> /js/${n}`);
}
if (leftovers.length) { console.error('[optimize-js] unrewritten references:\n  ' + leftovers.join('\n  ')); process.exit(1); }

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`[optimize-js] ${files.length} scripts: ${kb(before)} -> ${kb(after)}, ${rewritten} references rewritten, hashed into /js/h/`);
