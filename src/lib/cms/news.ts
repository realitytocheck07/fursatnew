// getNews(): Home "What's new" data. Reads Sanity at build time, falls back to the built-in cards.
// Never throws. Rendered by src/components/home/WhatsNew.astro (via HomeNews.astro).
import { sanityQuery } from './sanity.ts';
import type { SanityResult } from './sanity.ts';
import { imageSet } from './image.ts';
import site from '../../data/site.json' with { type: 'json' };
import type { ImageSet, SanityImage } from './image.ts';

export type NewsKind = 'offer' | 'event' | 'news' | 'ask';
export type NewsLook = 'red' | 'gold' | 'light' | 'glass';
/** A big animated number on a card, e.g. { prefix: '₹', value: 925, caption: 'per guest, from' }. */
export type NewsStat = { prefix?: string; value: number; suffix?: string; caption?: string };
/** Ask Fursat card: a sample question and the dishes it suggests (the card types it out). */
export type NewsAsk = { question: string; chips: string[] };

export type NewsItem = {
  kind: NewsKind;
  tag: string;
  icon: string;
  title: string;
  line: string;
  href: string;
  cta: string;
  image?: ImageSet | null;
  end?: string; // YYYY-MM-DD (IST) so the page can show "Ends 30 Nov" and hide it later
  terms?: string; // offers only
  pinned?: boolean;
  look?: NewsLook; // owner's colour choice; the page picks one by position when empty
  stats?: NewsStat[]; // up to 2 big numbers
  photoMode?: 'background' | 'top'; // how the photo sits on the card
  ask?: NewsAsk; // kind 'ask' only
};
export type NewsWish = { text: string; from?: string; to?: string };
export type NewsResult = {
  enabled: boolean;
  kicker: string;
  heading: string;
  items: NewsItem[];
  wish: NewsWish | null;
  source: 'sanity' | 'fallback';
};
export type NewsData = { news?: any; slots?: any[]; party?: any };
export type GetNewsOptions = {
  now?: Date;
  data?: NewsData; // built-in data (tests); default loads src/data/*.json
  query?: (q: string) => Promise<SanityResult<any>>; // tests
  log?: (line: string) => void;
};

export const NEWS_QUERY = `{
  "settings": *[_type == "homeNews"][0]{ enabled, kicker, heading, maxCards, "showBuiltIn": showBuiltInCards },
  "cards": *[_type == "announcement" && !(_id in path("drafts.**"))]{
    _id, type, title, "shortText": text, "start": startAt, "end": endAt, "offerTerms": terms, pinned, order, "realPhoto": photoIsReal,
    look, photoMode, askQuestion, askChips, stats[]{ prefix, value, suffix, caption },
    button{ label, kind, page, "message": whatsappMessage, url },
    photo{ alt, hotspot, crop, asset->{ _id, metadata{ lqip, palette{ dominant{ background } } } } }
  }
}`; // field names follow studio/schemaTypes/announcement.js and homeNews.js; aliased to the names used below

const DEFAULTS = { kicker: 'Latest at Fursat', heading: "What's new", max: 4, hardMax: 6 };
const IST_MS = 5.5 * 3600 * 1000;
const TAG: Record<string, string> = { offer: 'Offer', event: 'Event', news: 'News', ask: 'New' };
const ICON: Record<string, string> = { offer: 'tag', event: 'calendar', news: 'spark', ask: 'chat' };
const KINDS: NewsKind[] = ['offer', 'event', 'news', 'ask'];
const LOOKS: NewsLook[] = ['red', 'gold', 'light', 'glass'];

/** YYYY-MM-DD for the given instant, in India time. */
export function istDate(d: Date): string {
  return new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
}

/** Date-only values are whole IST days (End inclusive). Full timestamps are used as given. */
function bound(v: unknown, edge: 'start' | 'end'): number | null {
  if (!v) return null;
  const s = String(v).trim();
  const t = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? Date.parse(s + (edge === 'start' ? 'T00:00:00.000+05:30' : 'T23:59:59.999+05:30'))
    : Date.parse(s);
  return Number.isNaN(t) ? null : t;
}
const endDay = (v: unknown): string | undefined => {
  const t = bound(v, 'end');
  return t === null ? undefined : istDate(new Date(t));
};

function isActive(c: any, now: Date): boolean {
  const s = bound(c.start, 'start'), e = bound(c.end, 'end');
  if (s === null || e === null) return false; // dates are required
  if (e < s) return false;
  const n = now.getTime();
  return s <= n && n <= e;
}

function buttonOf(b: any): { href: string; cta: string } {
  const cta = String(b?.label || '').trim();
  if (!cta) return { href: '', cta: '' }; // button left empty in Studio = a card with no button
  if (b?.kind === 'whatsapp' && b.message) return { href: `https://wa.me/${String(site.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(String(b.message))}`, cta };
  if (b?.kind === 'link' && /^https?:\/\//i.test(String(b.url || ''))) return { href: String(b.url), cta };
  if (b?.kind === 'page' && String(b.page || '').startsWith('/')) return { href: String(b.page), cta };
  return { href: '/', cta };
}

/** Up to 2 usable big numbers. A stat needs a finite, non-negative number; text parts are trimmed and capped. */
export function cleanStats(v: unknown): NewsStat[] {
  if (!Array.isArray(v)) return [];
  const out: NewsStat[] = [];
  for (const x of v) {
    const n = Number((x as any)?.value);
    if (!(x as any) || (x as any).value === null || (x as any).value === '' || !Number.isFinite(n) || n < 0) continue;
    const part = (k: string, max: number) => String((x as any)[k] ?? '').trim().slice(0, max);
    out.push({ prefix: part('prefix', 3), value: n, suffix: part('suffix', 3), caption: part('caption', 40) });
    if (out.length === 2) break;
  }
  return out;
}

/** Ask card content; null when the sample question is empty. Up to 3 dish chips. */
export function cleanAsk(question: unknown, chips: unknown): NewsAsk | null {
  const q = String(question ?? '').trim().slice(0, 60);
  if (!q) return null;
  const list = Array.isArray(chips) ? chips.map((c) => String(c ?? '').trim().slice(0, 30)).filter(Boolean).slice(0, 3) : [];
  return { question: q, chips: list };
}

function toItem(c: any): NewsItem {
  const raw = String(c.type || 'news').toLowerCase();
  const t = (KINDS as string[]).includes(raw) ? raw : 'news';
  const photoMode = c.photoMode === 'top' ? 'top' : 'background';
  const photo: SanityImage | null = c.photo?.asset ? { ...c.photo, alt: c.photo.alt || '' } : null;
  // photo needs the real-photo tick and alt text; 'top' is a 4:3 crop, 'background' keeps the photo's own shape (CSS covers the card)
  const img = c.realPhoto === true && photo?.alt ? imageSet(photo, photoMode === 'top' ? { aspect: 4 / 3 } : {}) : null;
  const ask = t === 'ask' ? cleanAsk(c.askQuestion, c.askChips) : null;
  return {
    kind: t as NewsKind,
    tag: TAG[t] || 'News',
    icon: ICON[t] || 'spark',
    title: String(c.title || '').trim(),
    line: String(c.shortText || '').trim(),
    ...buttonOf(c.button),
    image: img,
    end: endDay(c.end),
    ...(t === 'offer' ? { terms: String(c.offerTerms || '').trim() } : {}),
    pinned: c.pinned === true,
    ...((LOOKS as string[]).includes(c.look) ? { look: c.look as NewsLook } : {}),
    ...(cleanStats(c.stats).length ? { stats: cleanStats(c.stats) } : {}),
    photoMode,
    ...(ask ? { ask } : {}),
  };
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);

/** Pure: Sanity payload + time -> result. Rejects bad cards; returns null when nothing usable is active. */
export function buildFromSanity(payload: any, now: Date): { settings: any; items: NewsItem[]; wish: NewsWish | null } {
  const settings = payload?.settings || {};
  const cards: any[] = Array.isArray(payload?.cards) ? payload.cards : [];

  const live = cards.filter((c) => {
    if (!c || !String(c.title || '').trim() || !String(c.shortText || '').trim()) return false;
    const t = String(c.type || '').toLowerCase();
    if ((t === 'offer' || t === 'wish') && !c.end) return false; // offers and wishes must end
    if (t === 'offer' && !String(c.offerTerms || '').trim()) return false;
    if (t === 'ask' && !cleanAsk(c.askQuestion, c.askChips)) return false; // the Ask card needs its sample question
    return isActive(c, now);
  });

  // Wish: separate field, the one that ends soonest. Not a card.
  const wishes = live.filter((c) => String(c.type).toLowerCase() === 'wish').sort((a, b) => (bound(a.end, 'end') as number) - (bound(b.end, 'end') as number));
  const w = wishes[0];
  const wish = w ? { text: String(w.title).trim(), from: String(w.start).slice(0, 10), to: endDay(w.end) } : null;

  const max = Math.min(Math.max(1, Math.floor(num(settings.maxCards, DEFAULTS.max))), DEFAULTS.hardMax);
  const sorted = live
    .filter((c) => String(c.type).toLowerCase() !== 'wish')
    .sort((a, b) => {
      const p = Number(b.pinned === true) - Number(a.pinned === true);
      if (p) return p;
      const o = num(a.order, Infinity) - num(b.order, Infinity);
      if (o) return o;
      return (bound(b.start, 'start') as number) - (bound(a.start, 'start') as number); // newest first
    });
  // At most one pinned card (Studio blocks a second; keep the first if one slips through).
  let pinnedSeen = false;
  const items = sorted
    .map((c) => {
      const isPin = c.pinned === true && !pinnedSeen;
      if (isPin) pinnedSeen = true;
      return toItem({ ...c, pinned: isPin });
    })
    .slice(0, max);
  return { settings, items, wish };
}

/** Pure: the cards HomeNews shows today, from news.json, slots.json and party.json. */
export function builtInNews(data: NewsData, now: Date): { items: NewsItem[]; wish: NewsWish | null } {
  const news = data.news || {};
  const maxOff = Math.max(0, ...(data.slots || []).map((s: any) => s.discount || 0));
  const pk: any[] = data.party?.packages || [];
  const from = (g: string) => Math.min(...pk.filter((p) => p.group === g).map((p) => p.price));
  const stat = (n: number, extra: Omit<NewsStat, 'value'>): NewsStat[] => (Number.isFinite(n) && n > 0 ? [{ value: n, ...extra }] : []);
  const items: NewsItem[] = [
    ...(news.announcements || []).map((a: any) => ({ kind: 'news' as NewsKind, tag: a.tag || 'News', icon: 'spark', title: a.title, line: a.line || '', href: a.href || '/', cta: a.cta || 'Read more' })),
    ...(maxOff ? [{ kind: 'offer' as NewsKind, tag: 'Offer', icon: 'tag', title: `Up to ${maxOff}% off your table`, line: 'Book your table online and pick a time slot with the offer.', href: '/reserve', cta: 'Book a table', stats: stat(maxOff, { suffix: '%', caption: 'off your table, up to' }) }] : []),
    { kind: 'news', tag: 'New', icon: 'list', title: 'Build your banquet menu', line: 'Choose every dish course by course and send it on WhatsApp.', href: '/banquet#packages', cta: 'Start building', stats: stat(from('banquet'), { prefix: '₹', caption: 'per guest, from' }) },
    { kind: 'news', tag: 'Packages', icon: 'gift', title: 'Party packages', line: '', href: '/party', cta: 'See packages', stats: [...stat(from('bar'), { prefix: '₹', caption: 'bar parties, per guest from' }), ...stat(from('elite'), { prefix: '₹', caption: 'elite buffets, per guest from' })] },
    { kind: 'ask', tag: 'New', icon: 'chat', title: 'Ask Fursat', line: 'Tell us what you feel like and see matching dishes and drinks from our menu.', href: '/ask', cta: 'Ask now', ask: { question: 'Something spicy, not too heavy', chips: ['Dynamite prawns', 'Nalli biryani'] } },
  ];
  const today = istDate(now);
  const w = (news.wishes || []).find((x: any) => x.text && (!x.from || x.from <= today) && (!x.to || today <= x.to));
  return { items, wish: w ? { text: w.text, from: w.from, to: w.to } : null };
}

async function loadBuiltInData(): Promise<NewsData> {
  // Astro/Vite build: bundle the three JSON files with import.meta.glob.
  try {
    // @ts-ignore import.meta.glob exists in Vite only
    const g = import.meta.glob('../../data/{news,slots,party}.json', { eager: true, import: 'default' }) as Record<string, any>;
    const pick = (n: string) => g[Object.keys(g).find((k) => k.endsWith('/' + n + '.json')) as string];
    if (pick('news') && pick('slots') && pick('party')) return { news: pick('news'), slots: pick('slots'), party: pick('party') };
  } catch {
    // not running under Vite
  }
  // Plain Node (no Vite): load the JSON with import attributes. The specifier is built at run time on purpose, so Vite does not
  // try to bundle it and warn that these files are also imported elsewhere without attributes.
  const file = (n: string) => `../../data/${n}.json`;
  const [news, slots, party] = await Promise.all(['news', 'slots', 'party'].map((n) => import(/* @vite-ignore */ file(n), { with: { type: 'json' } })));
  return { news: (news as any).default ?? news, slots: (slots as any).default ?? slots, party: (party as any).default ?? party };
}

export async function getNews(opts: GetNewsOptions = {}): Promise<NewsResult> {
  const now = opts.now || new Date();
  const log = opts.log || ((l: string) => console.log(l));
  const base = { kicker: DEFAULTS.kicker, heading: DEFAULTS.heading };

  const fallback = async (reason: string, settings: any = {}): Promise<NewsResult> => {
    let built: { items: NewsItem[]; wish: NewsWish | null } = { items: [], wish: null };
    try {
      built = builtInNews(opts.data || (await loadBuiltInData()), now);
    } catch {
      reason += '; built-in data unreadable';
    }
    log(`[cms] news: fallback (${reason})`);
    return { enabled: settings.enabled !== false, kicker: settings.kicker || base.kicker, heading: settings.heading || base.heading, ...built, source: 'fallback' };
  };

  try {
    const res = await (opts.query ? opts.query(NEWS_QUERY) : sanityQuery<any>(NEWS_QUERY));
    if (res.data === null || typeof res.data !== 'object') return await fallback(res.reason || 'no data from Sanity');

    const { settings, items, wish } = buildFromSanity(res.data, now);
    const enabled = settings.enabled !== false;
    const result: NewsResult = { enabled, kicker: String(settings.kicker || '').trim() || base.kicker, heading: String(settings.heading || '').trim() || base.heading, items, wish, source: 'sanity' };

    if (items.length === 0 && settings.showBuiltIn !== false) {
      const fb = await fallback('no active cards', settings);
      return { ...fb, wish: wish || fb.wish };
    }
    log(`[cms] news: ${items.length} cards from Sanity`);
    return result;
  } catch {
    return await fallback('unexpected error');
  }
}
