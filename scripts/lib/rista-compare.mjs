// Pure comparison: website menu data (food.json / drinks.json) vs Rista (/api/menu + /api/prices replies).
const key = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function compare({ menu, prices, sections, photoNames = null }) {
  const rista = new Map();           // key -> { id, name, soldOut, variants }
  for (const c of menu.categories || []) for (const i of c.items || []) rista.set(i.key || key(i.name), i);
  const price = prices.prices || {};
  const out = { matched: 0, same: [], different: [], variantItems: [], notInRista: [], notOnSite: [], soldOut: [], noRistaPrice: [], ristaPhotoOnly: [] };
  const site = new Set();
  for (const s of sections) for (const it of s.items) {
    const k = key(it.name); site.add(k);
    const r = rista.get(k);
    if (!r) { out.notInRista.push(it.name); continue; }
    out.matched++;
    if (photoNames && !photoNames.has(it.name) && r.imageSource === 'rista' && r.image) out.ristaPhotoOnly.push({ name: it.name, url: r.image });
    if (r.soldOut) out.soldOut.push(it.name);
    if (Array.isArray(r.variants) && r.variants.length > 1) { out.variantItems.push(it.name); continue; }   // Half/Full: review by hand
    const p = price[r.id];
    if (p == null) { out.noRistaPrice.push(it.name); continue; }
    if (it.price == null) continue;
    (Number(it.price) === Number(p) ? out.same : out.different).push({ name: it.name, section: s.section, site: it.price, rista: p });
  }
  for (const [k, r] of rista) if (!site.has(k)) out.notOnSite.push(r.name);
  return out;
}

// Apply Rista prices to single-price items (only the `price` field). Returns number of changes. Mutates `sections`.
export function applyPrices(sections, diff) {
  let n = 0;
  const want = new Map(diff.different.map((d) => [`${d.section}|${d.name}`, d.rista]));
  for (const s of sections) for (const it of s.items) {
    const v = want.get(`${s.section}|${it.name}`);
    if (v != null && it.price !== v) { it.price = v; n++; }
  }
  return n;
}

export function report(d) {
  const L = [];
  L.push(`Matched by name: ${d.matched} | same price: ${d.same.length} | DIFFERENT price: ${d.different.length} | Half/Full (check by hand): ${d.variantItems.length}`);
  L.push(`On site but not in Rista: ${d.notInRista.length} | In Rista but not on site: ${d.notOnSite.length} | Sold out in Rista now: ${d.soldOut.length} | No Website price in Rista: ${d.noRistaPrice.length}`);
  const sec = (t, a, f) => { if (a.length) { L.push('', t); a.forEach((x) => L.push('  ' + f(x))); } };
  sec('PRICE DIFFERENCES (site -> Rista)', d.different, (x) => `${x.name} [${x.section}]: Rs ${x.site} -> Rs ${x.rista}`);
  sec('ON SITE, NOT IN RISTA (name differs or item missing)', d.notInRista, (x) => x);
  sec('IN RISTA, NOT ON SITE', d.notOnSite, (x) => x);
  sec('HALF/FULL ITEMS', d.variantItems, (x) => x);
  sec('NO WEBSITE PRICE IN RISTA', d.noRistaPrice, (x) => x);
  sec('RISTA HAS A PHOTO, SITE HAS NONE (look at each by eye; real photos only; download it, do not hotlink)', d.ristaPhotoOnly, (x) => `${x.name}: ${x.url}`);
  sec('SOLD OUT IN RISTA NOW', d.soldOut, (x) => x);
  return L.join('\n');
}
