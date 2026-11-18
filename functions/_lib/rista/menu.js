// Menu + sold-out + photos for Fursat's single outlet. Logic ported from the RR Durbar Worker (menuData, loadCatalog, loadSold).
import { cached, isBackedOff, setBackoff } from './cache.js';
import { ristaGet } from './rista.js';
import { soldOutSet, buildMenu, buildPhotoIndex, photosFor, priceIndex } from './transform.js';
import { TTL, STALE_OK, STALE_PHOTOS, PHOTO_RETRY, branchOf, channelOf } from './config.js';

export const loadCatalog = (env) => cached(`menu`, TTL.menu, STALE_OK, () => ristaGet(env, '/catalog', { branch: branchOf(env), channel: channelOf(env) }));

export async function loadSold(env) {
  const code = branchOf(env), channel = channelOf(env);
  let sold = null, soldSource = null, stale = false;
  try {
    const s = await cached('stock', TTL.soldout, STALE_OK, async () => {
      const j = await ristaGet(env, '/stockStatus', { branch: code, channel });
      if (!Array.isArray(j?.stockOut)) throw new Error('unexpected stockStatus reply');
      return j;
    });
    if (s.stale) stale = true;
    sold = soldOutSet(s.value); soldSource = 'stockStatus';
  } catch (e) {
    console.error('stockStatus failed:', e.message);
    try {
      const s = await cached('soldout', TTL.soldout, STALE_OK, () => ristaGet(env, '/items/soldout', { branch: code }));
      if (s.stale) stale = true;
      sold = soldOutSet(s.value); soldSource = 'soldout';
    } catch (e2) { console.error('soldout failed:', e2.message); }
  }
  return { sold, soldSource, stale };
}

export async function menuData(env) {
  const code = branchOf(env), channel = channelOf(env);
  let stale = false;
  const cat = await loadCatalog(env);
  if (cat.stale) stale = true;
  const { sold, soldSource, stale: soldStale } = await loadSold(env);
  if (soldStale) stale = true;
  let photos = null;
  if (!isBackedOff('photos')) {
    try {
      const p = await cached('photos', TTL.photos, STALE_PHOTOS, async () => buildPhotoIndex(await ristaGet(env, '/catalog/enterprise', {}, { timeoutMs: 15000 })));
      if (p.stale) stale = true;
      photos = photosFor(p.value, code, channel);
    } catch (e) { console.error('photos failed:', e.message); setBackoff('photos', PHOTO_RETRY); }
  }
  const { categories, count } = buildMenu(cat.value, sold, photos);
  return { branch: code, count, soldOutKnown: sold !== null, soldOutSource: soldSource, categories, stale, generatedAt: new Date().toISOString() };
}

// { "<dish id>": <price in rupees> }. Fursat's menu prices are already public on the site.
export async function pricesData(env) {
  const cat = await loadCatalog(env);
  const prices = {};
  for (const row of priceIndex(cat.value).values()) if (row.price !== null && row.id) prices[row.id] = row.price;
  return { branch: branchOf(env), prices, stale: Boolean(cat.stale), generatedAt: new Date().toISOString() };
}

/* ---------- outlet: open/closed + hours + pickup channel (Fursat has one outlet) ---------- */
import { parseBranchList, parseWeek, hoursView, istNow, isOpenWeek, sameName } from './transform.js';

export async function outletData(env) {
  const code = branchOf(env), channel = channelOf(env);
  let stale = false;
  const mark = (r) => { if (r.stale) stale = true; return r.value; };
  const branches = parseBranchList(mark(await cached('branches', TTL.branches, STALE_OK, () => ristaGet(env, '/branch/list'))));
  const b = branches[code] || null;
  let week = null;
  try { week = parseWeek(mark(await cached('hours', TTL.branches, STALE_OK, () => ristaGet(env, '/branch', { branchCode: code })))); }
  catch (e) { console.error('hours failed:', e.message); }
  const now = istNow();
  const hasChannel = b && b.channels ? b.channels.some((c) => sameName(c, channel)) : null;   // null = Rista did not say
  let status;
  if (!b) status = 'unknown';
  else if (hasChannel === false) status = 'call';          // no website channel in Rista yet
  else if (b.active === false) status = 'closed';          // branch switched off in Rista
  else { const o = isOpenWeek(week, now); status = o === null ? 'unknown' : o ? 'open' : 'closed'; }
  return { code, name: b?.name || null, address: b?.address || null, lat: b?.lat ?? null, lng: b?.lng ?? null,
    hours: hoursView(week, now, week ? 'rista' : null), pickup: { available: hasChannel }, status, stale, generatedAt: new Date().toISOString() };
}
