#!/usr/bin/env node
// Compare the website menu with live Rista data (read-only). Run after the Rista settings are set and the site is deployed.
//   node scripts/rista-compare.mjs https://<your-pages-address>            report only
//   node scripts/rista-compare.mjs https://<your-pages-address> --apply    also writes Rista prices into src/data/food.json + drinks.json
//                                                                          (single-price items only; review with `git diff`, then commit)
import fs from 'node:fs';
import { compare, applyPrices, report } from './lib/rista-compare.mjs';
const [base, flag] = process.argv.slice(2);
if (!base) { console.error('Usage: node scripts/rista-compare.mjs <site-url> [--apply]'); process.exit(1); }
const get = async (p) => { const r = await fetch(new URL(p, base)); if (!r.ok) throw new Error(`${p} -> ${r.status} ${r.status === 503 ? '(Rista settings not set yet)' : ''}`); return r.json(); };
const rd = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/${f}`, import.meta.url), 'utf8'));
const [menu, prices] = [await get('/api/menu'), await get('/api/prices')];
const food = rd('food.json'), drinks = rd('drinks.json');
const photoNames = new Set(Object.keys(rd('dish-photos.json').photos || {}));
const d = compare({ menu, prices, sections: [...food, ...drinks], photoNames });
console.log(report(d));
if (flag === '--apply') {
  const n = applyPrices(food, d) + applyPrices(drinks, d);
  fs.writeFileSync(new URL('../src/data/food.json', import.meta.url), JSON.stringify(food, null, 2) + '\n');
  fs.writeFileSync(new URL('../src/data/drinks.json', import.meta.url), JSON.stringify(drinks, null, 2) + '\n');
  console.log(`\nApplied ${n} price change(s). Review: git diff src/data`);
}
