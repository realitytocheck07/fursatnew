#!/usr/bin/env node
// Read-only smoke check of the Rista routes after every deploy (adapted from RR Durbar tools/verify/smoke.mjs). Only GETs.
//   node scripts/rista-smoke.mjs https://<site> [DEBUG_TOKEN]      (token optional; give it only in your own terminal)
const [site, token] = process.argv.slice(2);
if (!site) { console.error('Usage: node scripts/rista-smoke.mjs <site-url> [DEBUG_TOKEN]'); process.exit(1); }
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fails++; };
const get = async (p) => { try { const r = await fetch(new URL(p, site)); let j = null; try { j = await r.clone().json(); } catch {} return { r, j, t: await r.text() }; } catch (e) { return { r: { status: 0, headers: new Headers() }, j: null, t: '' }; } };

const h = await get('/api/health');
ok(h.r.status === 200 && h.j?.ok === true, '/api/health answers');
ok(h.r.headers.get('x-content-type-options') === 'nosniff', 'health sends nosniff');
const configured = h.j?.configured === true;
ok(true, `configured: ${configured}${configured ? '' : '  (set the Rista settings, then redeploy)'}`);
if (token) { const o = await get(`/api/health?token=${encodeURIComponent(token)}`); ok(Array.isArray(o.j?.missing), `owner health lists missing names: ${JSON.stringify(o.j?.missing)}`); }
const d = await get('/api/debug?path=/branch/list');
ok(d.r.status === 404, '/api/debug is closed without the token');
ok(!/RISTA_KEY|RISTA_SECRET|x-api-token/i.test(h.t + d.t), 'no secret names or tokens in public replies');
if (configured) {
  const m = await get('/api/menu'); const items = (m.j?.categories || []).flatMap((c) => c.items || []);
  ok(m.r.status === 200 && items.length > 0, `/api/menu has ${items.length} dishes in ${(m.j?.categories || []).length} categories`);
  ok(m.j?.soldOutKnown === true, `sold-out known (source: ${m.j?.soldOutSource})`);
  ok(!/"price"/.test(m.t), '/api/menu carries no prices');
  const p = await get('/api/prices'); const n = Object.keys(p.j?.prices || {}).length;
  ok(p.r.status === 200 && n > 0, `/api/prices has ${n} priced dishes`);
  const o = await get('/api/outlet'); ok(o.r.status === 200 && ['open', 'closed', 'call', 'unknown'].includes(o.j?.status), `/api/outlet status: ${o.j?.status}`);
  ok(o.j?.pickup?.available !== false, 'Rista website channel found for this branch (pickup.available is not false)');
} else { const m = await get('/api/menu'); ok(m.r.status === 503, '/api/menu answers 503 not_configured (safe while unset)'); }
console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
process.exit(fails ? 1 : 0);
