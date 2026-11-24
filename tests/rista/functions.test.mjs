import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { onRequestGet as health } from '../../functions/api/health.js';
import { onRequestGet as menu } from '../../functions/api/menu.js';
import { onRequestGet as prices } from '../../functions/api/prices.js';
import { onRequestGet as debug } from '../../functions/api/debug.js';
import { _clear } from '../../functions/_lib/rista/cache.js';

const env = { RISTA_KEY: 'k_test', RISTA_SECRET: 's_test', RISTA_BRANCH: 'fk', RISTA_CHANNEL: 'Website', DEBUG_TOKEN: 'dbg-token-123' };
const CATALOG = {
  categories: [{ categoryId: 'c1', name: 'Starters', displayOrder: 1 }],
  itemTags: [{ itemTagId: 't1', name: 'Veg' }],
  taxTypes: [{ taxTypeId: 'x1', percentage: 5 }],
  items: [
    { itemId: 'i1', skuCode: 'SKU1', itemName: 'Paneer Tikka', categoryId: 'c1', price: 349, taxTypeIds: ['x1'], itemTagIds: ['t1'], status: 'Active' },
    { itemId: 'i2', skuCode: 'SKU2', itemName: 'Dynamite Prawns', categoryId: 'c1', price: 499, taxTypeIds: ['x1'], status: 'Active' },
  ],
};
const calls = [];
function fakeFetch(over = {}) {
  globalThis.fetch = async (url, init) => {
    const u = new URL(url); calls.push({ path: u.pathname.replace('/v1', ''), q: Object.fromEntries(u.searchParams), headers: init.headers });
    const p = u.pathname.replace('/v1', '');
    if (over[p]) return over[p]();
    if (p === '/catalog') return Response.json(CATALOG);
    if (p === '/stockStatus') return Response.json({ stockOut: ['SKU2'], stockIn: ['SKU1'] });
    if (p === '/catalog/enterprise') return Response.json({ items: [] });
    if (p === '/branch/list') return Response.json([{ branchCode: 'FK', branchName: 'Fursat' }]);
    return new Response('nope', { status: 404 });
  };
}
const req = (path) => new Request('https://fursat.test' + path);
const body = async (r) => r.json();

const hreq = (q = '') => new Request('https://fursat.test/api/health' + q);
test('health: reports configured; owner token lists missing NAMES only', async () => {
  assert.equal((await body(health({ request: hreq(), env }))).configured, true);
  const none = await body(health({ request: hreq(), env: {} }));
  assert.equal(none.configured, false); assert.equal(none.missing, undefined);
  const e2 = { DEBUG_TOKEN: 'dbg-token-123', RISTA_KEY: 'k_test' };
  const own = await body(health({ request: hreq('?token=dbg-token-123'), env: e2 }));
  assert.deepEqual(own.missing, ['RISTA_BRANCH', 'RISTA_SECRET']); assert.ok(!JSON.stringify(own).includes('k_test'));
  assert.equal((await body(health({ request: hreq('?token=wrong'), env: e2 }))).missing, undefined);
});

test('menu: not configured -> 503, no Rista call', async () => {
  _clear(); calls.length = 0; fakeFetch();
  const r = await menu({ env: { RISTA_KEY: 'a', RISTA_SECRET: 'b' } });
  assert.equal(r.status, 503); assert.equal(calls.length, 0);
});

test('menu: live items, sold-out marked, JWT signed correctly, branch + channel sent, no prices', async () => {
  _clear(); calls.length = 0; fakeFetch();
  const r = await menu({ env }); const j = await body(r);
  assert.equal(r.status, 200);
  const items = j.categories.flatMap((c) => c.items);
  assert.equal(items.find((i) => i.key === 'paneer-tikka').soldOut, false);
  assert.equal(items.find((i) => i.key === 'paneer-tikka').veg, true);
  assert.equal(items.find((i) => i.key === 'dynamite-prawns').soldOut, true);
  assert.equal(j.soldOutKnown, true);
  assert.ok(!JSON.stringify(j).includes('349'), 'menu reply must not carry prices');
  const c = calls.find((x) => x.path === '/catalog');
  assert.equal(c.q.branch, 'FK'); assert.equal(c.q.channel, 'Website'); assert.equal(c.headers['x-api-key'], 'k_test');
  const [h, p, sig] = c.headers['x-api-token'].split('.');
  assert.equal(sig, createHmac('sha256', 's_test').update(`${h}.${p}`).digest('base64url'));
  assert.equal(JSON.parse(Buffer.from(p, 'base64url')).iss, 'k_test');
});

test('prices: rupees by dish id (id = Rista skuCode, same as /api/menu item.id)', async () => {
  _clear(); fakeFetch();
  const j = await body(await prices({ env }));
  assert.equal(j.prices.SKU1, 349); assert.equal(j.prices.SKU2, 499);
});

test('menu: Rista down -> 502 with a safe message, no secrets', async () => {
  _clear(); fakeFetch({ '/catalog': () => new Response('x', { status: 500 }) });
  const r = await menu({ env }); const t = await r.text();
  assert.equal(r.status, 502); assert.ok(!t.includes('s_test') && !t.includes('k_test'));
});

test('menu: stockStatus fails -> falls back to /items/soldout', async () => {
  _clear(); fakeFetch({ '/stockStatus': () => new Response('x', { status: 500 }), '/items/soldout': () => Response.json({ data: [{ skuCode: 'SKU1' }] }) });
  const j = await body(await menu({ env }));
  const items = j.categories.flatMap((c) => c.items);
  assert.equal(j.soldOutSource, 'soldout'); assert.equal(items.find((i) => i.key === 'paneer-tikka').soldOut, true);
});

test('debug: locked without the token, works with it, only allowed paths', async () => {
  _clear(); fakeFetch();
  assert.equal((await debug({ request: req('/api/debug?path=/branch/list'), env })).status, 404);
  const dreq = (path, tok) => new Request('https://fursat.test' + path, { headers: { 'x-debug-token': tok } });
  assert.equal((await debug({ request: dreq('/api/debug?path=/branch/list', 'wrong'), env })).status, 404);
  assert.equal((await debug({ request: req('/api/debug?token=dbg-token-123&path=/branch/list'), env })).status, 404); // query token no longer accepted
  assert.equal((await debug({ request: dreq('/api/debug?path=/sale', 'dbg-token-123'), env })).status, 400);
  const ok = await debug({ request: dreq('/api/debug?path=/branch/list', 'dbg-token-123'), env });
  assert.equal(ok.status, 200); assert.equal((await ok.json())[0].branchCode, 'FK');
  assert.equal((await debug({ request: dreq('/api/debug?path=/branch/list', 'x'), env: { ...env, DEBUG_TOKEN: '' } })).status, 404);
});

test('menu page hook: script only loads when site.json rista.live is true', async () => {
  const fs = await import('node:fs');
  const site = JSON.parse(fs.readFileSync(new URL('../../src/data/site.json', import.meta.url), 'utf8'));
  assert.equal(typeof site.rista.live, 'boolean');
  assert.match(fs.readFileSync(new URL('../../src/pages/menu.astro', import.meta.url), 'utf8'), /site\.rista\?\.live && <script is:inline src="\/js\/rista-live\.js"/);
});

test('rista-live.js: marks sold-out rows, leaves others, survives a failed call', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../../public/js/rista-live.js', import.meta.url), 'utf8');
  const mk = () => { const chips = { children: [], appendChild(c) { this.children.push(c); } }; const t = { textContent: '+ Add' };
    const btn = { disabled: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, querySelector: () => t };
    return { name: '', attrs: {}, chips, btn, t, setAttribute(k, v) { this.attrs[k] = v; }, hasAttribute(k) { return k in this.attrs; },
      querySelector(s) { return s === '.mv-iname' ? { textContent: this.name } : s === '.fk-chips' ? chips : s === '.mv-add' ? btn : null; } }; };
  const a = mk(); a.name = 'Dynamite Prawns'; const b = mk(); b.name = 'Paneer Tikka';
  const run = async (fetchImpl) => { globalThis.fetch = fetchImpl; globalThis.document = { querySelectorAll: () => [a, b], createElement: () => ({}) };
    new Function(src)(); await new Promise((r) => setTimeout(r, 20)); };
  await run(async () => Response.json({ soldOutKnown: true, categories: [{ items: [{ key: 'dynamite-prawns', soldOut: true }, { key: 'paneer-tikka', soldOut: false }] }] }));
  assert.equal(a.attrs['data-soldout'], '1'); assert.equal(a.btn.disabled, true); assert.equal(a.t.textContent, 'Not available'); assert.equal(a.chips.children.length, 1);
  assert.equal(b.attrs['data-soldout'], undefined); assert.equal(b.btn.disabled, false);
  const c = mk(); c.name = 'Dynamite Prawns'; globalThis.document.querySelectorAll = () => [c];
  await run(async () => { throw new Error('offline'); });
  assert.equal(c.attrs['data-soldout'], undefined);
});

import { onRequestGet as outlet } from '../../functions/api/outlet.js';
import { compare, applyPrices, report } from '../../scripts/lib/rista-compare.mjs';

test('outlet: open/closed from Rista hours + channel check', async () => {
  const week = { businessHours: { businessDays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => ({ day: d, slots: [{ startTime: '00:00', endTime: '23:59' }] })) } };
  const branch = (channels) => [{ branchCode: 'FK', branchName: 'Fursat', status: 'Active', channels }];
  _clear(); fakeFetch({ '/branch/list': () => Response.json(branch(['Website'])), '/branch': () => Response.json(week) });
  let j = await body(await outlet({ env })); assert.equal(j.status, 'open'); assert.equal(j.pickup.available, true);
  _clear(); fakeFetch({ '/branch/list': () => Response.json(branch(['Zomato'])), '/branch': () => Response.json(week) });
  j = await body(await outlet({ env })); assert.equal(j.status, 'call'); assert.equal(j.pickup.available, false);
  _clear(); fakeFetch({ '/branch/list': () => Response.json([{ branchCode: 'FK', status: 'Inactive', channels: ['Website'] }]), '/branch': () => Response.json(week) });
  j = await body(await outlet({ env })); assert.equal(j.status, 'closed');
  _clear(); fakeFetch({ '/branch/list': () => Response.json([]) });
  assert.equal((await body(await outlet({ env }))).status, 'unknown');
});

test('rista-compare: finds price differences, name gaps, variants, sold-out; apply only changes differing single prices', () => {
  const menu = { categories: [{ items: [
    { id: 'S1', key: 'paneer-tikka', name: 'Paneer Tikka', soldOut: false, variants: [], image: 'https://img.test/p.jpg', imageSource: 'rista' },
    { id: 'S2', key: 'dynamite-prawns', name: 'Dynamite Prawns', soldOut: true, variants: [] },
    { id: 'S3', key: 'chicken-biryani', name: 'Chicken Biryani', soldOut: false, variants: [{ id: 'a' }, { id: 'b' }] },
    { id: 'S4', key: 'only-in-rista', name: 'Only In Rista', soldOut: false, variants: [] }] }] };
  const prices = { prices: { S1: 359, S2: 499 } };
  const sections = [{ section: 'Starters', items: [{ name: 'Paneer Tikka', price: 349 }, { name: 'Dynamite Prawns', price: 499 }, { name: 'Chicken Biryani', price: 400 }, { name: 'Ghost Dish', price: 100 }] }];
  const d = compare({ menu, prices, sections, photoNames: new Set(['Dynamite Prawns']) });
  assert.deepEqual(d.ristaPhotoOnly, [{ name: 'Paneer Tikka', url: 'https://img.test/p.jpg' }]);
  assert.equal(d.matched, 3); assert.deepEqual(d.different.map((x) => [x.name, x.site, x.rista]), [['Paneer Tikka', 349, 359]]);
  assert.deepEqual(d.same.map((x) => x.name), ['Dynamite Prawns']); assert.deepEqual(d.variantItems, ['Chicken Biryani']);
  assert.deepEqual(d.notInRista, ['Ghost Dish']); assert.deepEqual(d.notOnSite, ['Only In Rista']); assert.deepEqual(d.soldOut, ['Dynamite Prawns']);
  assert.equal(applyPrices(sections, d), 1); assert.equal(sections[0].items[0].price, 359); assert.equal(sections[0].items[2].price, 400);
  assert.match(report(d), /Paneer Tikka \[Starters\]: Rs 349 -> Rs 359/);
});
