// Run: node src/lib/cms/news.test.mjs   (no network, no packages)
import { readFileSync } from 'node:fs';
import { buildFromSanity, builtInNews, getNews, istDate } from './news.ts';
import { imageUrl, imageSrcset } from './image.ts';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const data = { news: read('../../data/news.json'), slots: read('../../data/slots.json'), party: read('../../data/party.json') };

const NOW = new Date('2026-11-14T10:00:00+05:30'); // 14 Nov 2026, IST
const card = (o) => ({ _id: o.title, type: 'news', shortText: 'Short text', start: '2026-11-01', end: '2026-11-30', ...o });
const run = (cards, settings = {}) => buildFromSanity({ settings, cards }, NOW);
const titles = (r) => r.items.map((i) => i.title);

let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); if (!ok) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 1. Date filtering (ended, future, active, IST day edges)
{
  const r = run([
    card({ title: 'Ended', start: '2026-10-01', end: '2026-11-13' }),
    card({ title: 'Future', start: '2026-11-15', end: '2026-11-20' }),
    card({ title: 'Active', start: '2026-11-10', end: '2026-11-20' }),
    card({ title: 'Ends today', start: '2026-11-01', end: '2026-11-14' }),
    card({ title: 'Starts today', start: '2026-11-14', end: '2026-11-18' }),
    card({ title: 'End before start', start: '2026-11-12', end: '2026-11-10' }),
    card({ title: 'No dates', start: undefined, end: undefined }),
  ]);
  check('date filter: ended and future are dropped, active kept', same(titles(r).sort(), ['Active', 'Ends today', 'Starts today']), titles(r));
  const late = buildFromSanity({ cards: [card({ title: 'Edge', start: '2026-11-14', end: '2026-11-14' })] }, new Date('2026-11-14T23:30:00+05:30'));
  check('date filter: End day counts until 23:59 IST', late.items.length === 1);
  const next = buildFromSanity({ cards: [card({ title: 'Edge', start: '2026-11-14', end: '2026-11-14' })] }, new Date('2026-11-15T00:01:00+05:30'));
  check('date filter: gone just after midnight IST', next.items.length === 0);
  check('istDate uses India time', istDate(new Date('2026-11-14T20:00:00Z')) === '2026-11-15');
}

// 2. Pinned first, then order, then newest
{
  const r = run([
    card({ title: 'B order 2', order: 2, start: '2026-11-05' }),
    card({ title: 'A order 1 old', order: 1, start: '2026-11-02' }),
    card({ title: 'A order 1 new', order: 1, start: '2026-11-09' }),
    card({ title: 'Pinned', order: 9, pinned: true }),
    card({ title: 'No order', start: '2026-11-12' }),
  ], { maxCards: 6 });
  check('sort: pinned, then order, then newest', same(titles(r), ['Pinned', 'A order 1 new', 'A order 1 old', 'B order 2', 'No order']), titles(r));
  const two = run([card({ title: 'P1', pinned: true, order: 1 }), card({ title: 'P2', pinned: true, order: 2 })]);
  check('sort: only one card is marked pinned', two.items.filter((i) => i.pinned).length === 1 && two.items[0].title === 'P1');
}

// 3. Max cap (default 4, setting, hard max 6)
{
  const many = Array.from({ length: 9 }, (_, i) => card({ title: 'C' + i, order: i }));
  check('cap: default 4', run(many).items.length === 4);
  check('cap: setting 2', run(many, { maxCards: 2 }).items.length === 2);
  check('cap: never above 6', run(many, { maxCards: 20 }).items.length === 6);
}

// 4. Wish goes to its own field, not into cards
{
  const r = run([
    card({ title: 'Happy Diwali', type: 'wish', start: '2026-11-10', end: '2026-11-16' }),
    card({ title: 'Real card' }),
    card({ title: 'Future wish', type: 'wish', start: '2026-12-20', end: '2026-12-26' }),
  ]);
  check('wish: separate field, active wish only', r.wish && r.wish.text === 'Happy Diwali' && r.wish.to === '2026-11-16', JSON.stringify(r.wish));
  check('wish: not in the card list', same(titles(r), ['Real card']), titles(r));
  check('wish: without End date is rejected', run([card({ title: 'W', type: 'wish', end: undefined })]).wish === null);
}

// 5. Offer without End date is rejected (and without terms)
{
  const r = run([
    card({ title: 'Offer no end', type: 'offer', end: undefined, offerTerms: 'Terms' }),
    card({ title: 'Offer no terms', type: 'offer' }),
    card({ title: 'Offer ok', type: 'offer', offerTerms: 'Dine-in only' }),
  ]);
  check('offer: no End date is rejected', !titles(r).includes('Offer no end'));
  check('offer: no terms is rejected', !titles(r).includes('Offer no terms'));
  check('offer: valid offer kept with tag, end day and terms', r.items.length === 1 && r.items[0].tag === 'Offer' && r.items[0].end === '2026-11-30' && r.items[0].terms === 'Dine-in only', JSON.stringify(r.items));
}

// 6. Photo rules: image only with real-photo tick + alt text
{
  const photo = { alt: 'Our bar', asset: { _id: 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x1500-jpg', metadata: { lqip: 'data:image/jpeg;base64,xx', palette: { dominant: { background: '#6b4a2b' } } } } };
  process.env.PUBLIC_SANITY_PROJECT_ID = 'abc123';
  const img = (c) => buildFromSanity({ cards: [c] }, NOW).items[0].image;
  const ok = img(card({ title: 'Pic', photo, realPhoto: true }));
  check('photo: shown with real-photo tick + alt, has srcset, lqip and colour', ok && /480w.*720w.*1080w/.test(ok.srcset) && ok.lqip.startsWith('data:') && ok.color === '#6b4a2b' && ok.alt === 'Our bar', JSON.stringify(ok));
  check('photo: no tick -> no image', img(card({ title: 'Pic', photo })) === null);
  check('photo: no alt text -> no image', img(card({ title: 'Pic', photo: { ...photo, alt: '' }, realPhoto: true })) === null);
  delete process.env.PUBLIC_SANITY_PROJECT_ID;
  check('image URL: auto=format, w, fit=crop and hotspot', imageUrl({ ...photo, hotspot: { x: 0.3, y: 0.6 } }, 480, { projectId: 'abc123', aspect: 4 / 3 }).includes('auto=format&w=480&h=360&fit=crop&crop=focalpoint&fp-x=0.300&fp-y=0.600'));
}

// 7. Fallback when the fetch fails (or no project ID), and when there are no active cards
{
  const expected = builtInNews(data, NOW);
  const logs = [];
  const log = (l) => logs.push(l);

  const down = await getNews({ now: NOW, data, log, query: async () => ({ data: null, reason: 'Sanity unreachable' }) });
  check('fallback: fetch fails -> built-in cards', down.source === 'fallback' && same(down.items, expected.items) && down.items.length >= 3, down.source);
  check('fallback: log line says fallback and why', logs[0] === '[cms] news: fallback (Sanity unreachable)', logs[0]);

  const prevId = process.env.PUBLIC_SANITY_PROJECT_ID;
  process.env.PUBLIC_SANITY_PROJECT_ID = 'TODO_PROJECT_ID'; // the real ID is the default now, so ask for the placeholder to test "no project ID"
  const noId = await getNews({ now: NOW, data, log }); // real sanityQuery, nothing fetched
  if (prevId === undefined) delete process.env.PUBLIC_SANITY_PROJECT_ID; else process.env.PUBLIC_SANITY_PROJECT_ID = prevId;
  check('fallback: no project ID -> built-in cards, nothing fetched', noId.source === 'fallback' && logs[1] === '[cms] news: fallback (no project ID set)', logs[1]);

  const empty = await getNews({ now: NOW, data, log, query: async () => ({ data: { settings: { showBuiltIn: true }, cards: [] } }) });
  check('fallback: no active cards + setting on -> built-in cards', empty.source === 'fallback' && same(empty.items, expected.items), empty.source);

  const off = await getNews({ now: NOW, data, log, query: async () => ({ data: { settings: { showBuiltIn: false }, cards: [] } }) });
  check('no active cards + setting off -> no cards', off.source === 'sanity' && off.items.length === 0);

  const live = await getNews({ now: NOW, data, log, query: async () => ({ data: { settings: { heading: 'Fresh' }, cards: [card({ title: 'A' }), card({ title: 'B' })] } }) });
  check('sanity: cards used, settings text applied, log line', live.source === 'sanity' && live.items.length === 2 && live.heading === 'Fresh' && logs.at(-1) === '[cms] news: 2 cards from Sanity', logs.at(-1));

  const maxOff = Math.max(0, ...data.slots.map((x) => x.discount || 0));
  const t = expected.items.map((i) => i.title);
  check('fallback = what HomeNews shows now (offer from slots, banquet, party, ask)', t.includes(`Up to ${maxOff}% off your table`) && t.includes('Build your banquet menu') && t.includes('Party packages') && t.at(-1) === 'Ask Fursat', t);
}

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
