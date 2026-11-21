// Indexation guard. Run after a build:  npm run check:seo
// Fails (exit 1) on anything that could stop a page being indexed or shown properly; warns on softer issues.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const DOMAIN = JSON.parse(fs.readFileSync('src/data/site.json', 'utf8')).domain;
const errors = [], warns = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const urlOf = (f) => { const r = path.relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/'); return '/' + r; };
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"');
const one = (html, re) => { const m = html.match(re); return m ? decode(m[1]) : null; };
const indexable = [];

for (const f of pages) {
  const url = urlOf(f), html = fs.readFileSync(f, 'utf8'), is404 = url === '/404.html' || url === '/404/';
  const at = (msg, list = errors) => list.push(`${url}  ${msg}`);
  const titles = html.match(/<title>/g) || [];
  if (titles.length !== 1) at(`has ${titles.length} <title>`);
  const title = one(html, /<title>([^<]*)<\/title>/) || '';
  if (title.length > 65) at(`title is ${title.length} chars (max 65): ${title}`); else if (title.length > 60) at(`title is ${title.length} chars: ${title}`, warns);
  if (/\|.*\|/.test(title)) at(`title has more than one pipe: ${title}`, warns);
  const desc = one(html, /<meta name="description" content="([^"]*)"/);
  if (!desc) at('missing meta description'); else if (desc.length < 50 || desc.length > 175) at(`meta description is ${desc.length} chars`, warns);
  const robots = one(html, /<meta name="robots" content="([^"]*)"/) || '';
  const noindex = /noindex/i.test(robots);
  if (noindex && !is404) at(`noindex on a normal page (${robots})`);
  if (!noindex) indexable.push(url);
  const canon = one(html, /<link rel="canonical" href="([^"]*)"/);
  if (!canon && !is404) at('missing canonical'); // a 404 must not claim a canonical URL
  else if (!is404 && canon !== DOMAIN + url) at(`canonical ${canon} != ${DOMAIN + url}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1 && !is404) at(`has ${h1} <h1>`, h1 === 0 ? errors : warns);
  const ogi = one(html, /<meta property="og:image" content="([^"]*)"/);
  if (!ogi || !ogi.startsWith('https://')) at('og:image missing or not absolute');
  else { const rel = ogi.slice(DOMAIN.length); if (!fs.existsSync(path.join(DIST, rel))) at(`og:image file missing: ${rel}`); }
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { at('invalid JSON-LD'); } }
  if (/TODO\(client\)/.test(html.replace(/<!--[\s\S]*?-->/g, ''))) at('TODO(client) text is visible on the page');
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt(?=[\s=>\/])/.test(t)).length; // a bare `alt` is the minified form of alt=""
  if (noAlt) at(`${noAlt} <img> without an alt attribute`, warns);
}

// sitemap covers every indexable page
let sm = '';
for (const f of walk(DIST).filter((x) => /sitemap-\d+\.xml$/.test(x))) sm += fs.readFileSync(f, 'utf8');
if (!sm) errors.push('no sitemap-*.xml in dist');
else for (const u of indexable) { if (!sm.includes(`<loc>${DOMAIN}${u}</loc>`)) errors.push(`${u}  missing from sitemap`); }

// redirects point at real pages
const red = path.join(DIST, '_redirects');
if (fs.existsSync(red)) for (const line of fs.readFileSync(red, 'utf8').split('\n')) {
  const t = line.trim().split(/\s+/)[1]; if (!t || !t.startsWith('/')) continue;
  if (!fs.existsSync(path.join(DIST, t, 'index.html'))) errors.push(`_redirects target ${t} is not a page`);
}
const robots = path.join(DIST, 'robots.txt');
if (!fs.existsSync(robots) || !/Sitemap:/i.test(fs.readFileSync(robots, 'utf8'))) errors.push('robots.txt missing or has no Sitemap line');

console.log(`[seo-check] ${pages.length} pages, ${indexable.length} indexable`);
warns.forEach((w) => console.warn('  warn  ' + w));
errors.forEach((e) => console.error('  FAIL  ' + e));
if (errors.length) { console.error(`[seo-check] ${errors.length} problem(s)`); process.exit(1); }
console.log('[seo-check] OK');
