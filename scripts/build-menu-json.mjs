// Generates public/data/menu.json (read by /ask and public/js/ask.js).
// Prices come ONLY from src/data/food.json and drinks.json. scripts/menu-index.json holds the rest of each row
// (display name, category, kind, tags, photo) and a `ref` to the food.json/drinks.json item name(s).
// Several refs = a "from" row: the cheapest price is used. A ref that is missing fails the build.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

const prices = new Map();
for (const file of ['src/data/food.json', 'src/data/drinks.json'])
  for (const sec of read(file))
    for (const it of sec.items)
      if (typeof it.price === 'number') {
        const k = norm(it.name);
        prices.set(k, [...(prices.get(k) ?? []), it.price]);
      }

const out = [];
const missing = [];
for (const { ref, ...row } of read('scripts/menu-index.json')) {
  const list = (Array.isArray(ref) ? ref : [ref]).map((r) => prices.get(norm(r)));
  if (!list.length || list.some((l) => !l)) { missing.push(row.n); continue; }
  const pool = list.flat();
  // a name in two sections (CANNED JUICE, SUNDARI, B52) gives the cheapest price
  const { n, ...rest } = row;
  out.push({ n, p: Math.min(...pool), ...rest });
}
if (missing.length) {
  console.error('[menu.json] not in food.json/drinks.json: ' + missing.join('; '));
  process.exit(1);
}
writeFileSync(path.join(root, 'public/data/menu.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`[menu.json] generated ${out.length} items from food.json + drinks.json`);
