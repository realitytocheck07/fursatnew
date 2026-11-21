// Instagram feed behaviour. Fetches from the fursat-feed Worker in the browser (image URLs are signed and expire in days: never saved).
// States on [data-igfeed]: idle (no JS: fallback buttons) > loading (skeleton) > ready (posts) | fallback (buttons). No error text, ever.
import { IG_ACCOUNTS, IG_ACCT_KEYS, IG_CACHE_MS, IG_MAX_TILES, IG_TIMEOUT_MS, IG_WORKER_BASE, type IgAcct, type IgPost } from '../lib/instagram-config';

type Tagged = IgPost & { acct: IgAcct };
type Feed = { updated?: number; stale?: boolean; posts: IgPost[] };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.16, 1, .3, 1)';

/* ---------- data ---------- */
// "+0000" has no colon; Safari needs "+00:00".
const parseTs = (ts: string) => new Date(String(ts || '').replace(/(\+|-)(\d{2})(\d{2})$/, '$1$2:$3')).getTime() || 0;

function cacheGet(acct: IgAcct): Feed | null {
  try {
    const raw = sessionStorage.getItem(`fursat-ig:${acct}`);
    if (!raw) return null;
    const v = JSON.parse(raw) as { t: number; d: Feed };
    return Date.now() - v.t < IG_CACHE_MS && Array.isArray(v.d?.posts) ? v.d : null;
  } catch { return null; }
}
function cacheSet(acct: IgAcct, d: Feed) { try { sessionStorage.setItem(`fursat-ig:${acct}`, JSON.stringify({ t: Date.now(), d })); } catch { /* storage full or blocked: fine */ } }

async function load(acct: IgAcct): Promise<Feed> {
  const hit = cacheGet(acct);
  if (hit) return hit;
  const mock = import.meta.env.DEV || import.meta.env.PUBLIC_IG_MOCK === '1' ? devMock(acct) : null; // test builds only: dead code in a normal production build
  if (mock) return mock;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), IG_TIMEOUT_MS);
  try {
    const res = await fetch(`${IG_WORKER_BASE}?acct=${acct}`, { signal: ctl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const d = (await res.json()) as Feed;
    if (!d || !Array.isArray(d.posts)) throw new Error('shape');
    cacheSet(acct, d);
    return d;
  } finally { clearTimeout(timer); }
}

// one request per account per page, shared by every feed on the page (home needs all three; a dedicated page needs one)
const inflight = new Map<IgAcct, Promise<Feed>>();
const loadOnce = (a: IgAcct) => { let p = inflight.get(a); if (!p) { p = load(a); inflight.set(a, p); } return p; };

/* ---------- dev-only mock (?igmock=ok|empty|fail|slow|partial) ---------- */
function devMock(acct: IgAcct): Promise<Feed> | null {
  const mode = new URLSearchParams(location.search).get('igmock');
  if (!mode) return null;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  if (mode === 'fail' || (mode === 'partial' && acct === 'banquets')) return wait(300).then(() => { throw new Error('mock'); });
  if (mode === 'empty') return wait(300).then(() => ({ posts: [] }));
  if (mode === 'slow') return wait(IG_TIMEOUT_MS + 500).then(() => { throw new Error('timeout'); });
  const hue = { main: 38, bites: 12, banquets: 150 }[acct];
  const kinds: IgPost['type'][] = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'IMAGE'];
  const posts: IgPost[] = Array.from({ length: 12 }, (_, i) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='${i % 5 === 3 ? 800 : 640}'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue + i * 9} 62% 58%)'/><stop offset='1' stop-color='hsl(${hue + 40 + i * 9} 55% 28%)'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='52%' fill='white' font-size='64' font-family='Georgia' text-anchor='middle'>${acct} ${i + 1}</text></svg>`;
    const day = (i * 3 + { main: 0, bites: 1, banquets: 2 }[acct]) % 28;
    return { id: `${acct}-${i}`, type: kinds[i % 4], caption: `Mock ${acct} post ${i + 1}. Biryani, wings and a long caption that goes past one hundred characters so the alt text truncation can be checked.\n#fursat #hyderabad`, image: `data:image/svg+xml,${encodeURIComponent(svg)}`, permalink: `https://www.instagram.com/p/mock${acct}${i}/`, timestamp: `2026-11-${String(20 - (day % 19)).padStart(2, '0')}T${String(10 + (i % 9)).padStart(2, '0')}:59:19+0000` };
  });
  return wait(mode === 'ok' ? 500 : 300).then(() => ({ posts }));
}

/* ---------- render ---------- */
const svgNS = 'http://www.w3.org/2000/svg';
function icon(path: string): SVGElement {
  const s = document.createElementNS(svgNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', path); s.appendChild(p); return s;
}
const PLAY = 'M8 5v14l11-7z';
const STACK = 'M7 3h12a2 2 0 0 1 2 2v12h-2V5H7zM3 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';
/* Which posts are shown (B9). A post is hidden when
   1) it is older than 30 days, or
   2) its caption names a date (e.g. "22 Nov", "Nov 22th", "22/11", "22.11.2026") and the latest such date is before today (India time): a finished event.
   A date without a year uses the post's year (next year if that would fall more than a week before the post). Captions without a date are only judged by rule 1. */
const IG_MAX_AGE_DAYS = 30, IG_MIN_FRESH = 4;
const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const DAY = 86400000;
function captionDates(c: string, postTs: number): number[] {
  const out: number[] = [], py = new Date(postTs).getUTCFullYear();
  const push = (d: number, m: number, y?: number) => {
    if (m < 0 || m > 11 || d < 1 || d > 31) return;
    let yy = y ?? py; if (yy < 100) yy += 2000;
    let t = Date.UTC(yy, m, d);
    if (y === undefined && t < postTs - 7 * DAY) t = Date.UTC(yy + 1, m, d);
    out.push(t);
  };
  const mon = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  let m: RegExpExecArray | null;
  const r1 = new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?' + mon + '\\b(?:[,\\s]+(\\d{4}))?', 'gi');
  while ((m = r1.exec(c))) push(+m[1], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), m[3] ? +m[3] : undefined);
  const r2 = new RegExp('\\b' + mon + '\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:[,\\s]+(\\d{4}))?', 'gi');
  while ((m = r2.exec(c))) push(+m[2], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), m[3] ? +m[3] : undefined);
  const r3 = /\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/g;
  while ((m = r3.exec(c))) push(+m[1], +m[2] - 1, m[3] ? +m[3] : undefined);
  return out;
}
function isFresh(p: IgPost): boolean {
  const ts = parseTs(p.timestamp), now = Date.now();
  if (ts && now - ts > IG_MAX_AGE_DAYS * DAY) return false;
  const ds = captionDates(p.caption || '', ts || now);
  if (!ds.length) return true;
  const ist = new Date(now + 5.5 * 3600000), today = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return Math.max(...ds) >= today;
}
const altOf = (p: IgPost) => { const c = (p.caption || '').replace(/\s+/g, ' ').trim(); return c ? c.slice(0, 100) : 'Fursat Instagram post'; };
const fmtDate = (p: IgPost) => { const t = parseTs(p.timestamp); return t ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(t)) : ''; };

function tile(p: Tagged, i: number, showTag: boolean): HTMLLIElement {
  const li = document.createElement('li'); li.className = 'igfeed-li is-pre'; li.style.setProperty('--d', String(i));
  const wave = document.createElement('span'); wave.className = 'igfeed-wave';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'igfeed-tile'; b.dataset.id = p.id;
  b.setAttribute('aria-label', `Open post: ${altOf(p)}`);
  const img = document.createElement('img');
  img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.width = 320; img.height = 320;
  img.onload = () => img.classList.add('is-loaded');
  img.onerror = () => { li.remove(); relayout(li.parentElement); };
  img.src = p.image;
  b.appendChild(img);
  if (p.type === 'VIDEO' || p.type === 'CAROUSEL_ALBUM') {
    const k = document.createElement('span'); k.className = 'igfeed-kind'; k.appendChild(icon(p.type === 'VIDEO' ? PLAY : STACK));
    b.appendChild(k);
    b.setAttribute('aria-label', `Open ${p.type === 'VIDEO' ? 'video' : 'album'}: ${altOf(p)}`);
  }
  if (showTag) { const t = document.createElement('span'); t.className = 'igfeed-tag'; t.textContent = IG_ACCOUNTS[p.acct].label; b.appendChild(t); }
  b.addEventListener('click', () => openLightbox(p, b, img));
  wave.appendChild(b); li.appendChild(wave); return li;
}

// Wave phase = column + row, so the float passes across the grid diagonally.
function relayout(grid: Element | null) {
  if (!grid) return;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
  [...grid.children].forEach((li, i) => (li as HTMLElement).style.setProperty('--ph', String((i % cols) + Math.floor(i / cols))));
}

function reveal(grid: HTMLElement) {
  const items = [...grid.querySelectorAll<HTMLElement>('.igfeed-li')];
  const go = () => items.forEach((li) => { if (li.isConnected) li.classList.add('is-in'); });
  if (!('IntersectionObserver' in window)) return go();
  // Reveals when the grid enters view, or at once if it is already above the viewport (hash link, restored scroll). The observer is never dropped early.
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) { io.disconnect(); go(); } }, { rootMargin: '0px 0px -8% 0px' });
  io.observe(grid);
}

/* ---------- lightbox (native <dialog>: focus trap + Escape; FLIP grows out of the tapped tile) ---------- */
let lb: { dlg: HTMLDialogElement; media: HTMLElement; img: HTMLImageElement; vid: HTMLVideoElement; meta: HTMLElement; cap: HTMLElement; go: HTMLAnchorElement; x: HTMLButtonElement } | null = null;
let lastTile: HTMLElement | null = null;
let closing = false;

function buildLightbox() {
  const dlg = document.createElement('dialog'); dlg.className = 'igfeed-lb'; dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'igfeed-lb-t');
  const card = document.createElement('div'); card.className = 'igfeed-lb-card';
  const media = document.createElement('div'); media.className = 'igfeed-lb-media';
  const img = document.createElement('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async'; media.appendChild(img);
  const vid = document.createElement('video'); vid.controls = true; vid.playsInline = true; vid.preload = 'metadata'; vid.hidden = true; vid.setAttribute('controlslist', 'nodownload'); media.appendChild(vid);
  const x = document.createElement('button'); x.type = 'button'; x.className = 'igfeed-lb-x'; x.setAttribute('aria-label', 'Close');
  const xs = document.createElementNS(svgNS, 'svg'); xs.setAttribute('viewBox', '0 0 24 24'); xs.setAttribute('aria-hidden', 'true');
  const xp = document.createElementNS(svgNS, 'path'); xp.setAttribute('d', 'M5 5l14 14M19 5L5 19'); xs.appendChild(xp); x.appendChild(xs);
  const body = document.createElement('div'); body.className = 'igfeed-lb-body';
  const meta = document.createElement('p'); meta.className = 'igfeed-lb-meta'; meta.id = 'igfeed-lb-t';
  const cap = document.createElement('p'); cap.className = 'igfeed-lb-cap';
  const go = document.createElement('a'); go.className = 'igfeed-lb-go'; go.target = '_blank'; go.rel = 'noopener'; go.textContent = 'View on Instagram';
  const sr = document.createElement('span'); sr.className = 'igfeed-sr'; sr.textContent = ' (opens in a new tab)'; go.appendChild(sr);
  body.append(meta, cap, go); card.append(media, body, x); dlg.appendChild(card); document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeLightbox(); });          // backdrop click
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeLightbox(); });            // Escape: animate out, then close
  x.addEventListener('click', closeLightbox);
  dlg.addEventListener('close', () => { stopVideo(); document.documentElement.classList.remove('igfeed-lock'); document.documentElement.style.removeProperty('padding-right'); });
  lb = { dlg, media, img, vid, meta, cap, go, x };
}

function stopVideo() {
  if (!lb) return;
  lb.vid.pause(); lb.vid.hidden = true; lb.vid.removeAttribute('src'); lb.vid.removeAttribute('poster'); lb.vid.load(); // release the stream
  lb.img.hidden = false;
}

function flipFrom(el: HTMLElement, rect: DOMRect, ms: number, reverse = false) {
  const to = el.getBoundingClientRect();
  const sx = rect.width / to.width, sy = rect.height / to.height;
  const from = `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${sx}, ${sy})`;
  const kf = [{ transform: from, borderRadius: '18px' }, { transform: 'none', borderRadius: '22px 22px 0 0' }];
  return el.animate(reverse ? [...kf].reverse() : kf, { duration: ms, easing: EASE, fill: 'both' });
}

function openLightbox(p: Tagged, tileBtn: HTMLElement, tileImg: HTMLImageElement) {
  if (!lb) buildLightbox();
  const L = lb!; lastTile = tileBtn; closing = false;
  L.img.src = tileImg.currentSrc || p.image;           // the tile's already-loaded pixels first, so the grow is instant
  if (p.image !== L.img.src) { const hi = new Image(); hi.referrerPolicy = 'no-referrer'; hi.onload = () => { if (L.dlg.open && L.img.dataset.id === p.id) L.img.src = p.image; }; hi.src = p.image; }
  L.img.dataset.id = p.id; L.img.alt = altOf(p);
  stopVideo();
  const canPlay = p.type === 'VIDEO' && !!p.video && /^https:\/\//i.test(p.video);
  if (canPlay) {
    L.vid.poster = p.image; L.vid.src = p.video!; L.vid.hidden = false; L.img.hidden = true;
    L.vid.onerror = () => { if (L.dlg.open) { L.vid.hidden = true; L.img.hidden = false; } }; // expired or blocked file: fall back to the still + the Instagram link
  }
  L.meta.textContent = [IG_ACCOUNTS[p.acct].label, fmtDate(p)].filter(Boolean).join(' · ');
  L.cap.textContent = p.caption || ''; L.cap.hidden = !p.caption;
  L.go.href = /^https:\/\/(www\.)?instagram\.com\//i.test(p.permalink) ? p.permalink : IG_ACCOUNTS[p.acct].url; // never trust a link we did not expect
  const gap = innerWidth - document.documentElement.clientWidth;
  document.documentElement.classList.add('igfeed-lock'); if (gap > 0) document.documentElement.style.paddingRight = `${gap}px`;
  const rect = tileBtn.getBoundingClientRect();
  L.dlg.showModal();
  L.x.focus({ preventScroll: true });
  if (canPlay) L.vid.play().catch(() => { /* autoplay refused: the player controls are right there */ });
  if (!reduced()) {
    flipFrom(L.media, rect, 380);
    (L.dlg.querySelector('.igfeed-lb-body') as HTMLElement).animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 140, easing: EASE, fill: 'backwards' });
  } else {
    L.dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
  }
}

function closeLightbox() {
  if (!lb || !lb.dlg.open || closing) return; closing = true;
  const L = lb; const tileBtn = lastTile;
  const done = () => { L.dlg.close(); closing = false; if (tileBtn && tileBtn.isConnected) tileBtn.focus({ preventScroll: true }); };
  if (reduced()) return done();
  const r = tileBtn && tileBtn.isConnected ? tileBtn.getBoundingClientRect() : null;
  const inView = r && r.bottom > 0 && r.top < innerHeight;
  const a = inView && r ? flipFrom(L.media, r, 260, true) : L.dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'both' });
  a.finished.then(() => { a.cancel(); done(); }, done);
}

/* ---------- one feed ---------- */
async function initFeed(root: HTMLElement) {
  const account = (root.dataset.account || 'all') as 'all' | IgAcct;
  const limit = Math.min(parseInt(root.dataset.limit || '', 10) || IG_MAX_TILES, IG_MAX_TILES);
  const grid = root.querySelector<HTMLElement>('.igfeed-grid')!;
  const chips = root.querySelector<HTMLElement>('.igfeed-chips');
  const targets: IgAcct[] = account === 'all' ? IG_ACCT_KEYS : [account];
  root.dataset.state = 'loading'; grid.hidden = false;

  const results = await Promise.allSettled(targets.map(loadOnce));
  const pool: Tagged[] = [];
  const okAccts: IgAcct[] = [];
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const posts = r.value.posts.filter((p) => p && p.image && p.permalink);
    if (!posts.length) return;
    okAccts.push(targets[i]);
    posts.forEach((p) => pool.push({ ...p, acct: targets[i] }));
  });
  pool.sort((a, b) => parseTs(b.timestamp) - parseTs(a.timestamp));
  // old posts and finished events are dropped; with fewer than IG_MIN_FRESH left the grid is replaced by the "Follow us" card (see isFresh)
  for (let i = pool.length - 1; i >= 0; i--) if (!isFresh(pool[i])) pool.splice(i, 1);
  if (pool.length < IG_MIN_FRESH) pool.length = 0;

  if (!pool.length) { root.dataset.state = 'fallback'; return; }  // all failed or empty: buttons, no error text

  // Which accounts have posts decides which chips exist (a failed Banquets feed hides its chip).
  let current: 'all' | IgAcct = 'all';
  const draw = (cur: 'all' | IgAcct, animate: boolean) => {
    const list = (cur === 'all' ? pool : pool.filter((p) => p.acct === cur)).slice(0, limit);
    grid.replaceChildren(...list.map((p, i) => tile(p, i, account === 'all')));
    grid.setAttribute('aria-busy', 'false'); relayout(grid);
    if (animate) reveal(grid); else grid.querySelectorAll('.igfeed-li').forEach((li) => li.classList.add('is-in'));
  };
  root.dataset.state = 'ready';
  draw('all', true);

  if (chips) {
    if (okAccts.length < 2) { chips.hidden = true; }
    else {
      chips.hidden = false;
      chips.querySelectorAll<HTMLButtonElement>('.igfeed-chip').forEach((c) => { if (c.dataset.chip !== 'all') c.hidden = !okAccts.includes(c.dataset.chip as IgAcct); });
      chips.addEventListener('click', (e) => {
        const c = (e.target as HTMLElement).closest<HTMLButtonElement>('.igfeed-chip'); if (!c || c.hidden) return;
        const next = c.dataset.chip as 'all' | IgAcct; if (next === current) return; current = next;
        chips.querySelectorAll('.igfeed-chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        draw(next, !reduced()); // client-side filter: no new requests
      });
    }
  }
  new ResizeObserver(() => relayout(grid)).observe(grid);
}

export function initInstagramFeeds() {
  document.querySelectorAll<HTMLElement>('[data-igfeed]').forEach((el) => {
    if (el.dataset.igInit) return; el.dataset.igInit = '1';
    initFeed(el).catch(() => { el.dataset.state = 'fallback'; });
  });
}
