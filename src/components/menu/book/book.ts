// FURSAT menu book (kit 40d). Plain DOM + WAAPI (transform and opacity only). No libraries.
// Model: leaf 0 is the cover. Two-page view: content leaf k has front = page 2k, back = page 2k+1.
// One-page view: content leaf k has front = page k and a blank back. `turned` = how many leaves are flipped.

type Dish = { k?: string; ln?: string; x?: boolean; sub?: string; n: string; p: number | null; v: boolean; h: boolean; d: string; vs: [string, number][] | null; ph: string | null; big: string | null; f: number[] | null; pl: boolean };
type Sec = { id: string; name: string; items: Dish[]; alc?: boolean };
type Data = { secs: Sec[]; bar: Sec[]; wa: string; dotpe: string };
type Page = { kind: 'contents' | 'sec' | 'bar'; sec?: Sec; items?: Dish[]; plate?: Dish; first?: boolean; chunk?: Sec[]; cIdx?: number };

const EASE_IO = 'cubic-bezier(.77,0,.175,1)';
const EASE_OUT = 'cubic-bezier(.23,1,.32,1)';
const EASE_DRAWER = 'cubic-bezier(.32,.72,0,1)';
const KEY = 'mb-picks';
const AGE = 'fursat_age_ok'; // the same key the site's own 21+ check uses (menu-v2.ts), so one "yes" counts everywhere
const K = (d: Dish) => d.k ?? d.n, L = (d: Dish) => d.ln ?? d.n;
const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const $ = <T extends HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;

export function initMenuBook() {
  const root = $<HTMLDialogElement>('#mb-root');
  const opener = $<HTMLButtonElement>('[data-mb-open]');
  if (!root || !opener) return;
  const data: Data = JSON.parse($('#mb-data').textContent || '{}');
  const bookEl = $('#mb-book'), tabsEl = $('#mb-tabs'), intro = $('.mb-intro', root), tilt = $('.mb-tilt', root), shift = $('.mb-shift', root);
  const bd = $('.mb-bd', root), top = $('.mb-top', root), dock = $('.mb-dock', root), picksBar = $('#mb-picks-bar');
  const prevBtn = $<HTMLButtonElement>('#mb-prev'), nextBtn = $<HTMLButtonElement>('#mb-next');
  const where = $('#mb-where'), live = $('#mb-live');
  const mq = matchMedia('(min-aspect-ratio: 5/4) and (min-width: 640px)');

  /* ── pages ─────────────────────────────────────────────────
     Pagination is measured, not guessed: the page height and width come from the open book, each row's height is estimated
     (name wrap, description lines), and rows are poured into pages. A section's last page is never left nearly empty. */
  const CAFE = new URLSearchParams(location.search).get('menu') === 'cafe'; // /menu?menu=cafe: café drinks only, no alcohol, so no 21+ question (as on the live menu)
  const ageOk = () => { try { return localStorage.getItem(AGE) === '1'; } catch { return false; } };
  const barOn = () => CAFE || ageOk();
  const barSecs = () => (barOn() ? data.bar.filter((g) => !CAFE || !g.alc) : []);
  const barTitle = () => (CAFE ? 'Drinks' : 'The Bar · 21+');
  let pages: Page[] = [];
  let secStart: Record<string, number> = {};
  let H = 560, W = 360;
  const ROW = 52, CHROME = 107; // row min height; top padding + section header + footer
  const rowH = (d: Dish) => {
    const fs = Math.max(15, W * 0.0335), cpl = Math.max(14, (W - 150) / (fs * 0.5)), cplD = Math.max(16, (W - 150) / (fs * 0.8 * 0.5));
    const nameLines = Math.ceil((d.n.length + (d.h ? 3 : 0) + (d.pl || d.ph ? 3 : 0) + 6) / cpl);
    const dl = d.d ? Math.ceil(d.d.length / cplD) : 0;
    if (d.x) { const base = 4 + nameLines * fs * 1.3 + dl * fs * 0.8 * 1.4; return (d.vs ? base + Math.ceil(d.vs.length / 2) * 56 + 10 : Math.max(ROW, base + 4)) + (d.sub ? 26 : 0); } // drinks: measured on the real rows
    return Math.max(ROW, 11 + nameLines * fs * 1.3 + 3 + dl * fs * 0.8 * 1.42) + (d.vs ? 58 : 0) + (d.sub ? 36 : 0);
  };
  function buildPages() {
    H = bookEl.clientHeight || H; W = bookEl.clientWidth || W;
    // contents: the first page carries the plate, so it holds fewer rows
    const capC0 = Math.max(3, Math.floor((H * 0.64 - 25 - 60 - 30) / ROW)), capC = Math.max(5, Math.floor((H - 25 - 60 - 30 - 8) / ROW));
    const chunks: Sec[][] = [];
    // how many contents pages are needed, then an even split (4 + 4, not 5 + 3)
    const toc: Sec[] = [...data.secs, { id: '__bar', name: barTitle(), items: [] }];
    let nC = 1, left = toc.length - capC0;
    while (left > 0) { nC++; left -= capC; }
    const per = Math.ceil(toc.length / nC);
    for (let i = 0; i < toc.length; i += per) chunks.push(toc.slice(i, i + per));
    if (!chunks.length) chunks.push([]);
    pages = chunks.map((chunk, cIdx) => ({ kind: 'contents' as const, chunk, cIdx }));
    secStart = {};
    const capFull = H - CHROME - 8, capPlate = H * 0.7 - CHROME - 26;
    const all = [...data.secs, ...barSecs()];
    for (const sec of all) {
      if (sec.id === barSecs()[0]?.id) { secStart['__bar'] = pages.length; pages.push({ kind: 'bar' }); }
      secStart[sec.id] = pages.length;
      const pour = (f: number) => {
        const out: Page[] = [];
        let cur: Dish[] = [], used = 0, plate: Dish | undefined, first = true;
        const flush = () => { if (cur.length) out.push({ kind: 'sec', sec, items: cur, plate, first }); cur = []; used = 0; plate = undefined; first = false; };
        for (const it of sec.items) {
          const h = rowH(it);
          if (it.pl && !plate && cur.length && used > (capPlate - h) * f) flush();
          const cap = (plate || (it.pl && !plate) ? capPlate : capFull) * f;
          if (cur.length && used + h > cap) flush();
          if (it.pl && !plate && capPlate > ROW * 2) plate = it;
          cur.push(it); used += h;
        }
        flush();
        return out;
      };
      let best = pour(1);
      for (let f = 0.9; f >= 0.55 && best.length > 1; f -= 0.05) {
        const cand = pour(f);
        if (cand.length !== best.length) break;
        best = cand; // same page count, fuller balance: keep tightening
        const lastH = cand[cand.length - 1].items!.reduce((a, d) => a + rowH(d), 0);
        if (lastH >= capFull * 0.38) break;
      }
      pages.push(...best);
    }
  }
  const sectionOf = (i: number) => { const pg = pages[i]; return !pg ? '' : pg.kind === 'contents' ? 'Contents' : pg.kind === 'bar' ? barTitle() : pg.sec!.name; };
  const tabOf = (pg?: Page) => (!pg || pg.kind === 'contents' ? '' : pg.kind === 'bar' || pg.sec!.id.startsWith('d-') ? '__bar' : pg.sec!.id);

  /* ── picks (sessionStorage only) ───────────────────────── */
  let picks: Record<string, number> = {};
  try { picks = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch { picks = {}; }
  // every orderable thing: a dish with one price, or each of Half / Full where the data has both
  type Opt = { k: string; label: string; p: number; v: boolean };
  const opts = new Map<string, Opt>();
  for (const sc of [...data.secs, ...data.bar]) for (const d of sc.items) {
    if (d.vs) for (const [l, p] of d.vs) opts.set(`${K(d)} (${l})`, { k: `${K(d)} (${l})`, label: `${L(d)} (${l})`, p, v: d.v });
    else if (d.p != null) opts.set(K(d), { k: K(d), label: L(d), p: d.p, v: d.v });
  }
  for (const k of Object.keys(picks)) if (!opts.has(k) || !(picks[k] > 0)) delete picks[k];
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(picks)); } catch { /* ignore */ } };
  const list = () => Object.keys(picks).map((k) => ({ o: opts.get(k)!, q: picks[k] })).filter((x) => x.o);
  const count = () => list().reduce((a, x) => a + x.q, 0);
  const total = () => list().reduce((a, x) => a + x.q * x.o.p, 0);

  /* ── page markup ───────────────────────────────────────── */
  const vm = (v: boolean) => `<span class="mb-vm ${v ? 'v' : 'n'}" role="img" aria-label="${v ? 'Vegetarian' : 'Non-vegetarian'}"></span>`;
  const chili = '<svg class="mb-chili" viewBox="0 0 24 24" width="15" height="15" role="img" aria-label="Spicy"><path fill="currentColor" d="M17.6 3.2c1.5.5 2.3 2 1.9 3.5-.6 2.2-.3 4.3-1.5 7.4-1.5 3.8-5.3 6.4-9.7 6.9-2 .2-3.2-1-2.4-2.4 3.7.2 6.2-1.6 7.5-4.6 1-2.2.7-4.5 1.3-6.7.3-1.3 1.7-1.9 2.9-2.1Z"/></svg>';
  const addBtn = (k: string, label: string) => { const q = picks[k] || 0; return `<button type="button" class="mb-add" data-add="${esc(k)}" aria-label="Add ${esc(label)} to my picks"><span class="mb-plus" aria-hidden="true">+</span><span class="mb-q" data-q="${esc(k)}" ${q ? '' : 'hidden'}>${q}</span></button>`; };
  function row(d: Dish, thumb: boolean) {
    const sub = d.sub ? `<li class="mb-sub" role="presentation"><h3>${esc(d.sub)}</h3></li>` : '';
    return sub + row0(d, thumb);
  }
  function row0(d: Dish, thumb: boolean) {
    const head = `${thumb && d.ph ? `<img class="mb-th" src="${d.ph}" alt="${esc(d.n)}" width="44" height="44" loading="lazy" decoding="async" style="${fit(d, false)}">` : ''}<span class="mb-nm">${esc(d.n)}</span>${d.h ? chili : ''}`;
    const nm = d.x ? ' mb-row--nm' : '', mk = d.x ? '' : vm(d.v);
    if (d.vs) return `<li class="mb-row mb-row--vs${nm}">${mk}<div class="mb-mid"><div class="mb-line">${head}</div>${d.d ? `<p class="mb-ds">${esc(d.d)}</p>` : ''}<div class="mb-vs${d.x ? ' mb-vs-st' : ''}">${d.vs.map(([l, p]) => `<div class="mb-ch"><span class="mb-chl">${esc(l)}</span><span class="mb-pr">${money(p)}</span>${addBtn(`${K(d)} (${l})`, `${L(d)} (${l})`)}</div>`).join('')}</div></div></li>`;
    return `<li class="mb-row${nm}">${mk}<div class="mb-mid"><div class="mb-line">${head}<i class="mb-ld"></i><span class="mb-pr">${d.p != null ? money(d.p) : ''}</span></div>${d.d ? `<p class="mb-ds">${esc(d.d)}</p>` : ''}</div>${d.p != null ? addBtn(K(d), L(d)) : '<span class="mb-add-sp"></span>'}</li>`;
  }
  const fit = (d: Dish, zoom = true) => { const [cx, cy, z] = d.f || [0.5, 0.62, 1.1]; return `object-position:${(cx * 100).toFixed(0)}% ${(cy * 100).toFixed(0)}%;transform-origin:${(cx * 100).toFixed(0)}% ${(cy * 100).toFixed(0)}%;${zoom ? `transform:scale(${z})` : ''}`; };
  const plateHtml = (d: Dish, cls = '') => `<figure class="mb-plate ${cls}" data-plate><span class="mb-plate-sh"></span><div class="mb-plate-in"><img src="${d.big}" alt="${esc(d.n)}" decoding="async" style="${fit(d)}"></div><figcaption>${esc(d.n)}</figcaption></figure>`;
  function pageHtml(i: number) {
    const pg = pages[i];
    if (!pg) return '<div class="mb-pg mb-blank"></div>';
    if (pg.kind === 'contents') {
      const first = data.secs[0]?.items.find((x) => x.pl && x.big);
      return `<div class="mb-pg mb-contents">${pg.cIdx === 0 && first ? plateHtml(first, 'mb-plate-c') : ''}<h2 class="mb-h">${pg.cIdx === 0 ? 'Menu' : 'Menu, continued'}</h2><ol class="mb-toc">${pg.chunk!.map((s) => (s.id === '__bar' && !barOn() ? `<li><button type="button" class="mb-toc-b" data-mb-bar><span class="mb-toc-n">${esc(s.name)}</span><i class="mb-ld"></i><span class="mb-pn mb-pn-21">21+ check</span></button></li>` : `<li><button type="button" class="mb-toc-b" data-mb-go="${secStart[s.id]}"><span class="mb-toc-n">${esc(s.name)}</span><i class="mb-ld"></i><span class="mb-pn">${secStart[s.id] + 1}</span></button></li>`)).join('')}</ol><p class="mb-pf"><span>${i + 1}</span></p></div>`;
    }
    if (pg.kind === 'bar') {
      const g = barSecs();
      return `<div class="mb-pg mb-barp"><header class="mb-sh"><h2>${esc(barTitle())}</h2><p>${g.reduce((n, x) => n + x.items.length, 0)} drinks</p></header>${CAFE ? '' : '<p class="mb-bar-n">Alcohol is served only to guests aged 21 or older, with valid ID on request. Please drink responsibly.</p>'}<ol class="mb-toc">${g.map((s) => `<li><button type="button" class="mb-toc-b" data-mb-go="${secStart[s.id]}"><span class="mb-toc-n">${esc(s.name)}</span><i class="mb-ld"></i><span class="mb-pn">${secStart[s.id] + 1}</span></button></li>`).join('')}</ol><p class="mb-pf"><span>${i + 1}</span></p></div>`;
    }
    const s = pg.sec!;
    return `<div class="mb-pg"><header class="mb-sh"><h2>${esc(s.name)}</h2><p>${pg.first ? s.items.length + (s.id.startsWith('d-') ? ' drinks' : ' dishes') : 'continued'}</p></header>${pg.plate ? plateHtml(pg.plate) : ''}<ul class="mb-rows">${pg.items!.map((d) => row(d, !!d.ph && d !== pg.plate)).join('')}</ul><p class="mb-pf"><span>${i + 1}</span></p></div>`;
  }

  /* ── leaves ────────────────────────────────────────────── */
  let two = mq.matches;
  let leaves: HTMLElement[] = [];
  let turned = 0, busy = false, opened = false, maxTurned = 1;
  // The turn in the air (if any): calling it lands it at once (every turn ends in exactly one of these, run once). A new tap, key, close, resize or
  // swipe lands the old turn first instead of being ignored, so `busy` can never outlive its animations.
  let inflight: (() => void) | null = null;
  const settleNow = () => { if (busy && inflight) inflight(); };
  // dev only: `window.__mbkDebug = true` logs every goTo start / settle (and which of finished / cancel / watchdog / commit ended it) to `window.__mbkLog`
  const dbg = (ev: string, d: Record<string, unknown> = {}) => { const w = window as any; if (w.__mbkDebug) (w.__mbkLog ||= []).push({ ev, t: Math.round(performance.now()), turned, busy, ...d }); };
  const filled = new Set<string>();
  // Leaves in the air (and the pages they uncover) are drawn whole. Every other leaf draws ONLY the face the reader can see: the right page
  // (leaf `turned`, front) and, on the laptop spread, the left page (leaf `turned - 1`, back). The rest of the stack is visibility:hidden,
  // so two pages can never be painted at the same spot and ~70 coplanar 3D layers are no longer composited on every frame.
  const air = new Set<number>();
  const cover = () => `<div class="mb-cover"><span class="mb-spine-gl"></span><div class="mb-plaque"><img src="/assets/brand/fursat-elephant.webp" alt="" width="54" height="69"><img src="/assets/brand/fursat-wordmark.svg" alt="FURSAT" width="170" height="34"><span class="mb-plaque-s">Kitchen &amp; Bar</span></div><p class="mb-cover-t">Menu</p></div>`;
  const shade = '<i class="mb-sd"></i>';
  const leafPages = (k: number): [number, number] => (two ? [2 * k, 2 * k + 1] : [k, -1]);

  function buildLeaves() {
    bookEl.classList.toggle('mb-two', two);
    root.classList.toggle('mb-two', two);
    root.classList.toggle('mb-one', !two);
    buildPages();
    bookEl.innerHTML = '';
    filled.clear(); air.clear();
    const nContent = two ? Math.ceil(pages.length / 2) : pages.length;
    maxTurned = two ? Math.floor(pages.length / 2) + 1 : pages.length;
    leaves = [];
    const mk = (front: string, back: string, cls = '') => { const l = document.createElement('div'); l.className = 'mb-leaf ' + cls; l.innerHTML = `<div class="mb-face mb-front">${front}${shade}</div><div class="mb-face mb-back">${back}${shade}</div>`; bookEl.appendChild(l); leaves.push(l); };
    bookEl.insertAdjacentHTML('beforeend', '<div class="mb-bc"></div><i class="mb-cast mb-cast-r"></i><i class="mb-cast mb-cast-l"></i>');
    mk(cover(), '<div class="mb-endpaper"><div class="mb-ep-pill"><img src="/assets/brand/fursat-wordmark.svg" alt="" width="150" height="30"></div></div>', 'mb-leaf-cover');
    for (let k = 0; k < nContent; k++) mk('<div class="mb-paper"></div>', '<div class="mb-paper"></div>');
    leaves.forEach((l, i) => setStatic(i));
    tabsEl.innerHTML = data.secs.map((s) => `<button type="button" class="mb-tab" data-mb-go="${secStart[s.id]}" data-sec="${s.id}">${esc(s.name)}</button>`).join('')
      + (barOn() ? `<button type="button" class="mb-tab mb-tab-bar" data-mb-go="${secStart['__bar']}" data-sec="__bar">${esc(barTitle())}</button>` : `<button type="button" class="mb-tab mb-tab-bar" data-mb-bar data-sec="__bar">${esc(barTitle())}</button>`);
  }
  function fill(i: number) {
    if (i < 1 || i >= leaves.length || filled.has('' + i)) return;
    filled.add('' + i);
    const [a, b] = leafPages(i - 1);
    const f = leaves[i].querySelectorAll<HTMLElement>('.mb-paper');
    if (f[0]) f[0].outerHTML = pageHtml(a);
    if (f[1]) f[1].outerHTML = two ? pageHtml(b) : '<div class="mb-pg mb-blank"></div>';
  }
  const fillAround = (t: number, n = 3) => { for (let i = Math.max(1, t - 1); i <= Math.min(leaves.length - 1, t + n); i++) fill(i); };
  function place(i: number) {
    const l = leaves[i];
    if (!l) return;
    const live = air.has(i), f = i < turned;
    const sf = live || (!f && i === turned), sb = live || (f && i === turned - 1);
    l.style.visibility = sf || sb ? '' : 'hidden';
    (l.children[0] as HTMLElement).style.visibility = sf ? '' : 'hidden';
    (l.children[1] as HTMLElement).style.visibility = sb ? '' : 'hidden';
  }
  const placeAll = () => leaves.forEach((_, i) => place(i));
  // after a settle: only the visible spread may be drawn and no leaf at rest may still carry an animation; if not, put it right (and count it)
  function assertSettled() {
    if (busy || air.size) return;
    let bad = 0;
    leaves.forEach((l, i) => {
      const f = i < turned, sf = !f && i === turned, sb = f && i === turned - 1;
      const want = [sf || sb ? '' : 'hidden', sf ? '' : 'hidden', sb ? '' : 'hidden'];
      const got = [l.style.visibility, (l.children[0] as HTMLElement).style.visibility, (l.children[1] as HTMLElement).style.visibility];
      const anims = l.getAnimations({ subtree: true });
      if (want[0] !== got[0] || want[1] !== got[1] || want[2] !== got[2] || anims.length) { bad++; anims.forEach((a) => a.cancel()); setStatic(i); }
    });
    if (bad) bookEl.dataset.mbFix = String(+(bookEl.dataset.mbFix || 0) + 1);
  }
  function setStatic(i: number) {
    const f = i < turned;
    leaves[i].style.transform = f ? 'rotateY(-180deg)' : 'none';
    leaves[i].style.zIndex = String(f ? i : leaves.length - i);
    place(i);
  }
  function syncInert() {
    leaves.forEach((l, i) => {
      const fr = l.querySelector<HTMLElement>('.mb-front')!, bk = l.querySelector<HTMLElement>('.mb-back')!;
      fr.inert = !(i === turned);
      bk.inert = !(two && i === turned - 1 && i > 0);
    });
  }

  /* ── flipping ──────────────────────────────────────────── */
  type KF = [number, number][];
  const kfs = (pts: KF, dir: number, prop = 'opacity') => (dir > 0 ? pts : pts.map(([o, v]) => [1 - o, v] as [number, number]).reverse()).map(([o, v]) => ({ offset: o, [prop]: v }) as Keyframe);
  // mkFlip builds the animations of one leaf turn and returns them, so a finger can drive them (paused, currentTime) or flipLeaf can just play them out
  function mkFlip(i: number, dir: 1 | -1, o: { dur: number; delay?: number; cov?: boolean; z?: number; lin?: boolean }) {
    const l = leaves[i];
    const list: Animation[] = [];
    const EIO = o.lin ? 'linear' : EASE_IO;
    const fr = l.querySelector<HTMLElement>('.mb-front .mb-sd')!, bk = l.querySelector<HTMLElement>('.mb-back .mb-sd')!;
    l.style.zIndex = String(o.z ?? 999);
    const f = (a: number, z: number) => `translateZ(${z}px) rotateY(${a}deg)`;
    let frames: Keyframe[]; let mid = 0.5;
    if (o.cov) { mid = 0.43; frames = [{ transform: f(0, 0), offset: 0, easing: EASE_IO }, { transform: f(-165, 22), offset: 0.78, easing: EASE_OUT }, { transform: f(-180, 0), offset: 1 }]; }
    else frames = [{ transform: f(0, 0), offset: 0 }, { transform: f(-90, 26), offset: 0.5 }, { transform: f(-180, 0), offset: 1 }];
    if (dir < 0) frames = frames.map((k) => ({ ...k, offset: 1 - (k.offset as number), easing: o.cov ? EASE_IO : undefined })).reverse();
    const opt: KeyframeAnimationOptions = { duration: o.dur, delay: o.delay || 0, fill: 'both', easing: o.cov ? 'linear' : EIO };
    const a = l.animate(frames, opt);
    list.push(a);
    list.push(fr.animate(kfs([[0, 0], [mid, 0.55], [mid + 0.001, 0.55], [1, 0.55]], dir), { ...opt, easing: o.cov ? 'linear' : EIO }));
    list.push(bk.animate(kfs([[0, 0.55], [mid, 0.55], [1, 0]], dir), { ...opt, easing: o.cov ? 'linear' : EIO }));
    // plain cream paper on the back while the leaf is in the air: the page on it fades in only over the last quarter of the turn, so text is never squashed
    const bp = l.querySelector<HTMLElement>('.mb-back>.mb-pg');
    if (bp && !o.cov) list.push(bp.animate(kfs([[0, 0], [0.88, 0], [1, 1]], dir), { ...opt, easing: EIO }));
    // and the same for the page on the front: its rows are gone within the first stretch of the turn (and come back only at the very end of a turn back),
    // so the old and the new rows are never on screen together, whichever way the browser draws the 3D leaf
    const fp = l.querySelector<HTMLElement>('.mb-front>.mb-pg');
    if (fp && !o.cov) list.push(fp.animate(kfs([[0, 1], [0.14, 0], [1, 0]], dir), { ...opt, easing: EIO }));
    // the outgoing face is switched off at the edge-on moment (-90°, opacity only) instead of relying on backface-visibility alone,
    // which GPU engines do not always apply to composited children of a culled face (the old rows then show over the new page)
    if (!o.cov) {
      list.push((l.children[0] as HTMLElement).animate(kfs([[0, 1], [mid, 1], [mid + 0.001, 0], [1, 0]], dir), { ...opt, easing: EIO }));
      list.push((l.children[1] as HTMLElement).animate(kfs([[0, 0], [mid, 0], [mid + 0.001, 1], [1, 1]], dir), { ...opt, easing: EIO }));
    }
    if (!o.cov) {
      const cr = $('.mb-cast-r', bookEl), cl = $('.mb-cast-l', bookEl);
      list.push(cr.animate(dir > 0 ? [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 0.55, offset: 0.5 }, { transform: 'scaleX(1)', opacity: 0 }] : [{ transform: 'scaleX(1)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 0.55, offset: 0.5 }, { transform: 'scaleX(0)', opacity: 0 }], { ...opt, easing: EIO }));
      if (two) list.push(cl.animate(dir > 0 ? [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(0)', opacity: 0, offset: 0.5 }, { transform: 'scaleX(1)', opacity: 0.5, offset: 0.75 }, { transform: 'scaleX(1)', opacity: 0 }] : [{ transform: 'scaleX(1)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 0.5, offset: 0.25 }, { transform: 'scaleX(0)', opacity: 0, offset: 0.5 }, { transform: 'scaleX(0)', opacity: 0 }], { ...opt, easing: EIO }));
    }
    const fin = () => {
      for (const x of l.getAnimations({ subtree: true })) x.cancel();
      for (const x of list) x.cancel(); // this leaf's own cast-shadow animations only: the other leaves of a long jump are still flying
      setStatic(i);
    };
    return { list, a, fin };
  }
  function flipLeaf(i: number, dir: 1 | -1, o: { dur: number; delay?: number; cov?: boolean; z?: number }) {
    const f = mkFlip(i, dir, o);
    return f.a.finished.then(f.fin);
  }
  async function goTo(t: number) {
    t = Math.max(1, Math.min(maxTurned, t));
    if (!opened) return;
    if (busy) { if (!inflight) return; inflight(); } // land the turn in the air, then carry on with this tap
    if (t === turned) return;
    busy = true; dbg('start', { to: t });
    fillAround(Math.max(t, turned), 3); fill(Math.min(t, turned) - 2); fill(Math.min(t, turned) - 1); // the page uncovered on the left of a turn back is drawn too
    const dir: 1 | -1 = t > turned ? 1 : -1;
    const from = turned, n = Math.abs(t - turned);
    const NF = 9; // a long jump shows the last 9 leaves turning; the ones before them are already over (no 36 leaves in the air at once)
    const dur = n > 1 ? Math.max(440, 700 - Math.min(n, NF) * 30) : 720, gap = n > 1 ? Math.min(80, 700 / Math.min(n, NF)) : 0;
    const all: number[] = [];
    for (let i = 0; i < n; i++) all.push(dir > 0 ? from + i : from - 1 - i);
    const skip = all.slice(0, Math.max(0, n - NF)), ids = all.slice(skip.length);
    turned = t;
    air.clear(); for (const id of ids) { air.add(id - 1); air.add(id); air.add(id + 1); } for (const x of [from, from - 1, t, t - 1]) air.add(x);
    skip.forEach((id) => setStatic(id));
    placeAll();
    syncInert(); // inert states reflect the destination; the leaves are mid-air until the promise resolves
    const flips = ids.map((id, j) => mkFlip(id, dir, { dur, delay: j * gap, z: dir > 0 ? 500 + leaves.length - id : 500 + id }));
    let over = false, wd = 0, done!: () => void;
    const turnDone = new Promise<void>((r) => { done = r; });
    // the ONE ending of this turn: runs once, from whichever comes first: all leaves finished, one was cancelled, or the watchdog
    const finish = (why: string = 'commit') => {
      if (over) return; over = true; clearTimeout(wd); dbg('settle', { via: why, to: t });
      for (const f of flips) f.fin();
      air.clear(); placeAll();
      if (inflight === finish) inflight = null;
      busy = false;
      setTimeout(assertSettled, 60);
      done();
    };
    inflight = finish;
    wd = window.setTimeout(() => finish('watchdog'), dur + (ids.length - 1) * gap + 600);
    flips.forEach((f) => f.a.finished.then(f.fin, () => {})); // each leaf lands as soon as it is over
    Promise.allSettled(flips.map((f) => f.a.finished)).then((r) => finish(r.some((x) => x.status === 'rejected') ? 'cancel' : 'finished'));
    await turnDone;
    if (!busy) update(); // (if a newer turn already took over, it updates the counter itself)
  }
  const pageToTurned = (p: number) => (two ? Math.ceil(p / 2) + 1 : p + 1);
  const visible = () => (two ? [turned > 1 ? 2 * (turned - 1) - 1 : -1, 2 * (turned - 1)] : [turned - 1]).filter((i) => i >= 0 && i < pages.length);
  function update() {
    const v = visible();
    prevBtn.disabled = turned <= 1; nextBtn.disabled = turned >= maxTurned;
    const nm = sectionOf(v[v.length - 1] ?? 0);
    const rng = v.length > 1 ? `${v[0] + 1}–${v[1] + 1}` : `${(v[0] ?? 0) + 1}`;
    where.innerHTML = `<span>${esc(nm)}</span> <b>${rng} / ${pages.length}</b>`;
    live.textContent = `${nm}, page ${rng} of ${pages.length}`;
    const cur = pages[v[v.length - 1]];
    tabsEl.querySelectorAll<HTMLElement>('.mb-tab').forEach((t) => { const on = !!cur && tabOf(cur) === t.dataset.sec; t.classList.toggle('on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); if (on && !two) t.scrollIntoView({ inline: 'center', block: 'nearest' }); });
    syncInert();
    // the pages the next turns need are built now, in idle time, not inside the tap that turns to them
    (window.requestIdleCallback ? (f: () => void) => window.requestIdleCallback(f, { timeout: 400 }) : (f: () => void) => setTimeout(f, 80))(() => { for (let i = turned - 2; i <= turned + 4; i++) fill(i); });
  }

  /* ── open / close ──────────────────────────────────────── */
  const chrome = () => [top, dock, picksBar, tabsEl];
  async function open() {
    if (root.open || busy) return;
    busy = true; opened = false;
    two = mq.matches;
    root.showModal(); // opened first so the page size can be measured; nothing paints before the animation below starts
    buildLeaves(); turned = 0; leaves.forEach((_, i) => setStatic(i)); fill(1); // the rest of the pages are drawn while the cover swings
    chrome().forEach((e) => (e.style.opacity = '0'));
    const pl = bookEl.querySelector<HTMLElement>('[data-plate].mb-plate-c');
    if (pl) pl.style.opacity = '0';
    const r = opener.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const dx = r.left + r.width / 2 - vw / 2, dy = r.top + r.height / 2 - vh / 2;
    bd.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'both' });
    // 1. the closed book tilts in from the button
    await intro.animate([{ transform: `translate(${dx}px,${dy}px) scale(.16) rotateX(12deg)`, opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(0,0) scale(1) rotateX(0deg)', opacity: 1 }], { duration: 640, easing: EASE_OUT, fill: 'both' }).finished;
    await wait(160); // a beat with the book closed, so it reads before it opens
    // 2. cover swings open (-165° in ~900 ms, then settles flat) while the book slides to centre
    const pw = bookEl.getBoundingClientRect().width;
    setTimeout(() => fill(2), 120); setTimeout(() => fill(3), 420); setTimeout(() => fill(4), 700);
    if (two) shift.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${pw / 2}px)` }], { duration: 1160, easing: EASE_IO, fill: 'both' });
    turned = 1; // the cover's final resting state is flipped
    air.clear(); air.add(0); air.add(1); air.add(2); placeAll();
    const flip = flipLeaf(0, 1, { dur: 1160, cov: true });
    // 3. one real dish photo rises out of the page, then settles into it
    setTimeout(() => {
      if (!pl) return;
      pl.style.opacity = '';
      const sh = pl.querySelector<HTMLElement>('.mb-plate-sh');
      pl.animate([{ transform: 'translateY(40px) scale(.9)', opacity: 0 }, { transform: 'translateY(-30px) scale(1)', opacity: 1, offset: 0.55 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: 1150, easing: EASE_OUT, fill: 'backwards' });
      sh?.animate([{ opacity: 0 }, { opacity: 1, offset: 0.55 }, { opacity: 0.7 }], { duration: 1150, easing: EASE_OUT, fill: 'backwards' });
    }, 500);
    await flip;
    air.clear(); placeAll();
    busy = false; opened = true;
    root.classList.add('mb-cover-gone');
    chrome().forEach((e) => { e.style.opacity = ''; e.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE_OUT }); });
    root.querySelector<HTMLElement>('.mb-x')!.focus({ preventScroll: true });
    await wait(60);
    update();
    if (closeAsked) { closeAsked = false; close(); }
  }
  let closeAsked = false; // Esc or Close pressed while the book is still opening: it closes as soon as it has opened
  async function close() {
    if (!root.open) return;
    settleNow();
    if (busy) { if (!opened) closeAsked = true; return; }
    busy = true;
    closeDrawer(true); $('#mb-waiter').hidden = true; setBg(false); root.classList.remove('mb-cover-gone');
    chrome().forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_OUT, fill: 'forwards' }));
    // 1. the pages fold back to the front, last page first. `turned` is set first, so every leaf lands where it belongs.
    //    Like a long jump, only the last 8 leaves are seen flying; the ones nearest the open page are already over.
    const n = turned, NF = 8;
    turned = 1;
    air.clear(); air.add(0); air.add(1); air.add(n);
    if (n > 1) {
      const all: number[] = []; for (let i = n - 1; i >= 1; i--) all.push(i);
      const skip = all.slice(0, Math.max(0, all.length - NF)), ids = all.slice(skip.length);
      for (const id of ids) { air.add(id - 1); air.add(id); air.add(id + 1); }
      if (skip.length) { const e = skip[skip.length - 1]; air.add(e); air.add(e - 1); }
      skip.forEach((id) => setStatic(id));
      placeAll();
      await Promise.all(ids.map((id, j) => flipLeaf(id, -1, { dur: 360, delay: j * 45, z: 500 + id })));
    }
    // 2. the cover closes (the laptop spread slides back to centre with it)
    if (two) shift.animate([{ transform: `translateX(${bookEl.getBoundingClientRect().width / 2}px)` }, { transform: 'translateX(0)' }], { duration: 760, easing: EASE_IO, fill: 'both' });
    await flipLeaf(0, -1, { dur: 760, cov: true, z: 999 });
    turned = 0; air.clear();
    // 3. the closed book shrinks into the button it came from
    const r = opener.getBoundingClientRect();
    const dx = r.left + r.width / 2 - innerWidth / 2, dy = r.top + r.height / 2 - innerHeight / 2;
    bd.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: EASE_OUT, fill: 'both' });
    await intro.animate([{ transform: 'translate(0,0) scale(1) rotateX(0deg)', opacity: 1 }, { opacity: 1, offset: 0.55 }, { transform: `translate(${dx}px,${dy}px) scale(.16) rotateX(12deg)`, opacity: 0 }], { duration: 420, easing: EASE_OUT, fill: 'both' }).finished;
    root.close();
    for (const a of root.getAnimations({ subtree: true })) a.cancel();
    shift.style.transform = '';
    opened = false; busy = false; root.classList.remove('mb-cover-gone');
    opener.focus();
  }

  /* ── events ────────────────────────────────────────────── */
  opener.addEventListener('click', open);
  $('[data-mb-close]', root).addEventListener('click', close);
  root.addEventListener('cancel', (e) => { e.preventDefault(); onEsc(); });
  root.addEventListener('keydown', (e) => {
    if (ageDlg.open) return; // the 21+ question has the keys while it is up (Esc closes only it)
    if (e.key === 'Escape') { e.preventDefault(); onEsc(); }
    else if (!drawerOpen && $('#mb-waiter').hidden && (e.key === 'ArrowRight' || e.key === 'PageDown')) { e.preventDefault(); goTo(turned + 1); }
    else if (!drawerOpen && $('#mb-waiter').hidden && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); goTo(turned - 1); }
  });
  function onEsc() { if (!$('#mb-waiter').hidden) closeWaiter(); else if (drawerOpen) closeDrawer(); else close(); }
  nextBtn.addEventListener('click', () => goTo(turned + 1));
  prevBtn.addEventListener('click', () => goTo(turned - 1));
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const go = t.closest<HTMLElement>('[data-mb-go]');
    if (go) { goTo(pageToTurned(+go.dataset.mbGo!)); return; }
    if (t.closest('[data-mb-bar]')) { openBar(); return; }
    const add = t.closest<HTMLElement>('[data-add]');
    if (add) { setQty(add.dataset.add!, (picks[add.dataset.add!] || 0) + 1); add.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: EASE_OUT }); }
  });
  // rebuild the leaves on the same page: used when the screen changes shape and when the 21+ answer adds the drinks
  function rebuild(p: number) {
    two = mq.matches; buildLeaves();
    root.classList.add('mb-cover-gone'); turned = pageToTurned(p); leaves.forEach((_, i) => setStatic(i)); shift.style.transform = two ? `translateX(${bookEl.getBoundingClientRect().width / 2}px)` : ''; fillAround(turned, 3); update();
  }
  mq.addEventListener('change', () => { settleNow(); if (!root.open || busy || !opened) return; rebuild(visible().pop() ?? 0); });

  /* ── The Bar behind the site's 21+ check ──
     Same question and same storage key as /menu (menu-v2.ts). Before "yes" the drinks are not even built into the book:
     the contents line and the last tab ask first. "Show me food" goes to the food pages; Esc leaves the book where it is. */
  const ageDlg = $<HTMLDialogElement>('#mb-age');
  function askAge(): Promise<'yes' | 'no' | ''> {
    const live = document.getElementById('mv-age'); // the menu page's own wording, if it is there, so the two never drift apart
    if (live) {
      const set = (to: string, from: string) => { const a = document.querySelector(to), b = live.querySelector(from); if (a && b?.textContent) a.textContent = b.textContent; };
      set('#mb-age-t', 'h2'); set('#mb-age-p', 'p'); set('#mb-age-yes', '#mv-age-yes'); set('#mb-age-no', '#mv-age-no');
    }
    ageDlg.returnValue = '';
    return new Promise((res) => {
      ageDlg.addEventListener('close', () => res((ageDlg.returnValue as 'yes' | 'no' | '') || ''), { once: true });
      ageDlg.showModal();
      $('#mb-age-yes').focus({ preventScroll: true });
    });
  }
  async function openBar() {
    settleNow();
    if (busy || !opened) return;
    if (!barOn()) {
      const a = await askAge();
      if (a === 'no') { goTo(pageToTurned(secStart[data.secs[0].id])); return; }
      if (a !== 'yes') return;
      try { localStorage.setItem(AGE, '1'); } catch { /* ignore */ }
      rebuild(visible().pop() ?? 0); // the drinks join the book on the page the guest is on
    }
    await goTo(pageToTurned(secStart['__bar']));
    tabsEl.querySelector<HTMLElement>('.mb-tab-bar')?.focus({ preventScroll: true });
  }
  // laptop: the open book tilts a little with the pointer (max 6°), smoothed
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => { cx += (tx - cx) * 0.09; cy += (ty - cy) * 0.09; (tilt as HTMLElement).style.transform = `rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`; raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.02 ? requestAnimationFrame(loop) : 0; };
  // a press freezes the tilt, so a button never slides out from under the finger or cursor mid-click
  root.addEventListener('pointerdown', () => { tx = cx; ty = cy; if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  root.addEventListener('pointermove', (e) => { if (e.buttons) return; if (e.pointerType !== 'mouse' || !opened) return; tx = Math.max(-6, Math.min(6, (e.clientX / innerWidth - 0.5) * 12)); ty = Math.max(-6, Math.min(6, -(e.clientY / innerHeight - 0.5) * 12)); if (!raf) raf = requestAnimationFrame(loop); });

  /* ── swipe / drag to turn (touch and pen; the mouse uses arrows, keys and tabs) ──
     The finger drives the real turn: the same animations are paused and scrubbed with currentTime, so the curl, the fold shadow and the
     paper that fades in are the ones the buttons play. Let go past 30% or with a flick and it finishes; otherwise it falls back.
     At the first or last page the book gives a little and springs back (friction, no hard stop). */
  const stageEl = $('.mb-stage', root);
  let dragStamp = 0;
  {
    const DUR = 360;
    let pid = -1, x0 = 0, y0 = 0, t0 = 0, mode: 'idle' | 'pending' | 'turn' | 'edge' = 'idle', dir: 1 | -1 = 1, fl: ReturnType<typeof mkFlip> | null = null, span = 300, prog = 0, trail: [number, number][] = [];
    const reset = () => { pid = -1; mode = 'idle'; fl = null; };
    stageEl.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (e.pointerType === 'mouse' || !e.isPrimary || !opened) return;
      // a new primary touch while a drag is still recorded means the old gesture lost its pointerup: abandon it, never wait for it
      if (pid !== -1) { settleNow(); reset(); }
      if (busy) { if (!inflight) return; inflight(); }
      if (e.pointerType === 'mouse' || !e.isPrimary || !opened || busy || drawerOpen || !$('#mb-waiter').hidden || t.closest('.mb-tabs')) return;
      pid = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); mode = 'pending'; trail = [[t0, e.clientX]];
    });
    stageEl.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid || mode === 'idle') return;
      const dx = e.clientX - x0, dy = e.clientY - y0, now = performance.now();
      trail.push([now, e.clientX]); while (trail.length > 2 && now - trail[0][0] > 90) trail.shift();
      if (mode === 'pending') {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { reset(); return; } // a vertical move belongs to the page's own scroll
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        dir = dx < 0 ? 1 : -1;
        const ok = dir > 0 ? turned < maxTurned : turned > 1; // the cover (leaf 0) is not swiped shut: Close does that
        span = Math.max(140, bookEl.clientWidth * 0.9);
        try { stageEl.setPointerCapture(pid); } catch { /* ignore */ }
        busy = true; dragStamp = now;
        // while the finger is down this is the turn's inflight: a tap, key, resize or new touch abandons the drag and frees `busy`
        // even if the pointerup never arrives (browser took the gesture, capture failed, touch id reused)
        const abortDrag = () => {
          dbg('drag-abort');
          bookEl.style.transform = '';
          if (fl) fl.fin();
          reset(); air.clear(); placeAll();
          if (inflight === abortDrag) inflight = null;
          busy = false; update(); setTimeout(assertSettled, 60);
        };
        inflight = abortDrag;
        if (!ok) mode = 'edge';
        else {
          fillAround(Math.max(turned + dir, turned), 3);
          const id = dir > 0 ? turned : turned - 1;
          air.clear(); for (const x of [id - 1, id, id + 1, turned, turned - 1, turned + dir]) air.add(x);
          placeAll();
          fl = mkFlip(id, dir, { dur: DUR, lin: true, z: dir > 0 ? 500 + leaves.length - id : 500 + id });
          fl.list.forEach((a) => { a.pause(); a.currentTime = 0; });
          mode = 'turn'; prog = 0;
        }
      }
      if (mode === 'turn' && fl) {
        prog = Math.max(0, Math.min(1, (dir > 0 ? -dx : dx) / span));
        for (const a of fl.list) a.currentTime = prog * DUR;
      } else if (mode === 'edge') {
        bookEl.style.transform = `translateX(${Math.sign(dx) * Math.min(44, Math.sqrt(Math.abs(dx)) * 3.4)}px)`;
      }
    });
    const up = async (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const m = mode, f = fl, p = prog, d = dir;
      dragStamp = performance.now();
      const a0 = trail[0], vx = trail.length > 1 ? (e.clientX - a0[1]) / Math.max(16, performance.now() - a0[0]) : 0;
      reset();
      if (m === 'edge') {
        const cur = bookEl.style.transform; bookEl.style.transform = '';
        const an = bookEl.animate([{ transform: cur }, { transform: 'none' }], { duration: 300, easing: EASE_OUT });
        let ended = false, w = 0;
        const endE = () => { if (ended) return; ended = true; clearTimeout(w); an.cancel(); if (inflight === endE) inflight = null; busy = false; };
        inflight = endE; w = window.setTimeout(endE, 450); an.finished.then(endE, endE);
        return;
      }
      if (m !== 'turn' || !f) return;
      // a quick flick turns the page even when it is short: 60 px or more within 250 ms of touching down (measured from the press, so it does not
      // depend on how many move events the browser sent), or a fast release speed
      const moved = d > 0 ? x0 - e.clientX : e.clientX - x0;
      const flick = moved >= 60 && performance.now() - t0 <= 250;
      const fast = (d > 0 ? -vx : vx) > 0.35;
      if (e.type !== 'pointercancel' && (p > 0.3 || flick || (fast && p > 0.02))) {
        turned += d; syncInert();
        f.list.forEach((a) => { a.playbackRate = 1; a.play(); });
      } else f.list.forEach((a) => a.reverse());
      let ended = false, w = 0;
      const end = () => { if (ended) return; ended = true; clearTimeout(w); f.fin(); air.clear(); placeAll(); if (inflight === end) inflight = null; busy = false; update(); setTimeout(assertSettled, 60); };
      inflight = end; w = window.setTimeout(end, DUR + 250); // (the turn needs at most DUR more ms from here)
      f.a.finished.then(end, end);
    };
    stageEl.addEventListener('pointerup', up);
    stageEl.addEventListener('pointercancel', up);
    // the tap that ends a swipe must not press a dish's + or a contents line under the finger
    root.addEventListener('click', (e) => { if (performance.now() - dragStamp < 380) { e.preventDefault(); e.stopPropagation(); } }, true);
  }

  /* ── My picks ────────────────────────────────────────────
     Numbers the guest drives (quantity, line price, total, the bar's count and sum) roll like an odometer; words are never rolled.
     The drawer is an iOS-style sheet: 500 ms in, 280 ms out on the drawer curve, the scrim fades with the same timing,
     a drag down past 30% (or a fast flick) closes it, and a drag up past the top edge meets friction. */
  const drawer = $('#mb-drawer'), waiter = $('#mb-waiter'), scrim = $('#mb-dr-bd'), drList = $('#mb-dr-l'), waBtn = $<HTMLAnchorElement>('#mb-wa');
  let drawerOpen = false, dTok = 0, dAnim: Animation[] = [];
  const bgEls = () => [top, dock, tabsEl, stageEl, picksBar];
  const setBg = (v: boolean) => bgEls().forEach((e) => (e.inert = v)); // while the drawer or the waiter screen is up, nothing behind it can be tabbed to

  const digits = (s: string) => +s.replace(/\D/g, '');
  function roll(el: HTMLElement, text: string) {
    const prev = el.dataset.v;
    if (prev === text) return;
    el.dataset.v = text;
    const nw = [...text], old = prev === undefined ? null : [...prev], up = old ? digits(text) >= digits(prev!) : true;
    // the real text stays for screen readers; the rolling digits are decoration
    el.innerHTML = `<span class="mb-sr">${esc(text)}</span><span class="mb-od" aria-hidden="true">${nw.map((c, i) => {
      const o = old ? old[i + old.length - nw.length] : c; // aligned from the right, so ₹999 → ₹1,598 rolls the digits that share a place
      if (o === c) return `<i class="mb-oc"><u class="mb-oc-c"><b>${esc(c)}</b></u></i>`;
      return `<i class="mb-oc"><u class="mb-oc-c" data-c="${esc(c)}" data-r="${up ? 1 : -1}">${up ? `<b>${esc(o ?? '')}</b><b>${esc(c)}</b>` : `<b>${esc(c)}</b><b>${esc(o ?? '')}</b>`}</u></i>`;
    }).join('')}</span>`;
    // a rolling column is exactly as wide as the digit it lands on (measured in the same font), so the number never shows a gap while it rolls and does not jump when it lands
    const cols = [...el.querySelectorAll<HTMLElement>('.mb-oc-c[data-r]')];
    if (cols.length) {
      const m = document.createElement('span'); m.className = 'mb-meas'; m.setAttribute('aria-hidden', 'true');
      m.innerHTML = cols.map((c) => `<i>${esc(c.dataset.c || '')}</i>`).join('');
      el.appendChild(m);
      const ws = [...m.children].map((i) => i.getBoundingClientRect().width);
      m.remove();
      cols.forEach((c, i) => { (c.parentElement as HTMLElement).style.width = `${ws[i]}px`; });
    }
    const run = cols.map((col) => {
      const u = col.dataset.r === '1';
      return col.animate([{ transform: `translateY(${u ? '0' : '-50%'})` }, { transform: `translateY(${u ? '-50%' : '0'})` }], { duration: 220, easing: EASE_OUT, fill: 'both' }).finished;
    });
    // once the columns have landed the number goes back to plain text
    if (run.length) Promise.all(run).then(() => { if (el.dataset.v === text) { const od = el.querySelector('.mb-od'); if (od) od.textContent = text; } }, () => {});
  }

  function setQty(k: string, q: number) {
    if (q > 0) picks[k] = Math.min(q, 99); else delete picks[k];
    save(); renderPicks();
  }
  function dropRow(li: HTMLElement) {
    li.dataset.gone = '1'; li.inert = true;
    li.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-16px)' }], { duration: 180, easing: EASE_OUT, fill: 'forwards' }).finished.then(() => {
      const rest = [...drList.children].filter((x) => x !== li) as HTMLElement[];
      const before = rest.map((x) => x.getBoundingClientRect().top);
      li.remove();
      rest.forEach((x, i) => { const d = before[i] - x.getBoundingClientRect().top; if (d) x.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 240, easing: EASE_OUT }); });
    }).catch(() => li.remove());
  }
  function renderPicks() {
    const L = list();
    roll($('#mb-pb-n'), String(count())); roll($('#mb-pb-s'), money(total()));
    picksBar.classList.toggle('has', L.length > 0);
    picksBar.setAttribute('aria-label', `My picks, ${count()} ${count() === 1 ? 'item' : 'items'}, ${money(total())}`);
    roll($('#mb-dr-total'), money(total())); $('#mb-w-total').textContent = money(total());
    $('#mb-dr-empty').hidden = L.length > 0;
    for (const id of ['#mb-show', '#mb-wa']) $(id).toggleAttribute('aria-disabled', L.length === 0);
    // the drawer list is updated in place, so a quantity can roll and a new line can rise instead of the whole list flashing
    const have = new Map<string, HTMLElement>();
    drList.querySelectorAll<HTMLElement>('li[data-k]').forEach((li) => { if (!li.dataset.gone) have.set(li.dataset.k!, li); });
    for (const { o, q } of L) {
      let li = have.get(o.k);
      if (li) have.delete(o.k);
      else {
        li = document.createElement('li'); li.dataset.k = o.k;
        li.innerHTML = `<span class="mb-dr-n">${vm(o.v)}<span>${esc(o.label)}</span></span><span class="mb-step"><button type="button" data-dec="${esc(o.k)}" aria-label="One less ${esc(o.label)}">−</button><output aria-label="Quantity"></output><button type="button" data-inc="${esc(o.k)}" aria-label="One more ${esc(o.label)}">+</button></span><b class="mb-dr-p"></b>`;
        drList.appendChild(li);
        if (drawerOpen) li.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.19,1,.22,1)' });
      }
      roll(li.querySelector<HTMLElement>('output')!, String(q)); roll(li.querySelector<HTMLElement>('.mb-dr-p')!, money(q * o.p));
    }
    have.forEach((li) => dropRow(li));
    $('#mb-w-l').innerHTML = L.map(({ o, q }) => `<li><span class="mb-w-q">${q}×</span><span class="mb-w-n">${esc(o.label)}</span><b>${money(q * o.p)}</b></li>`).join('');
    const lines = L.map(({ o, q }) => `${q} × ${o.label} — ${money(q * o.p)}`);
    waBtn.href = `https://wa.me/${data.wa}?text=${encodeURIComponent(`Hi FURSAT, my picks:\n${lines.join('\n')}\nTotal: ${money(total())}`)}`;
    bookEl.querySelectorAll<HTMLElement>('[data-q]').forEach((el) => { const q = picks[el.dataset.q!] || 0; el.textContent = String(q); el.hidden = !q; });
  }
  drawer.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const inc = t.closest<HTMLElement>('[data-inc]'), dec = t.closest<HTMLElement>('[data-dec]');
    if (inc) setQty(inc.dataset.inc!, (picks[inc.dataset.inc!] || 0) + 1);
    if (dec) setQty(dec.dataset.dec!, (picks[dec.dataset.dec!] || 0) - 1);
  });

  // drawer and scrim always move together, same duration and curve (paired elements)
  function runDrawer(fromY: string, toY: string, fromO: number, toO: number, dur: number) {
    dAnim.forEach((a) => a.cancel());
    const o: KeyframeAnimationOptions = { duration: dur, easing: EASE_DRAWER, fill: 'both' };
    dAnim = [drawer.animate([{ transform: `translateY(${fromY})` }, { transform: `translateY(${toY})` }], o), scrim.animate([{ opacity: fromO }, { opacity: toO }], o)];
    drawer.style.transform = ''; scrim.style.opacity = '';
    return dAnim[0].finished.then(() => true, () => false);
  }
  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true; dTok++;
    drawer.hidden = false; scrim.hidden = false; drawer.inert = false; scrim.inert = false;
    picksBar.setAttribute('aria-expanded', 'true');
    setBg(true);
    runDrawer('100%', '0px', 0, 1, 500);
    picksBar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    $('#mb-dr-x').focus({ preventScroll: true });
  }
  function closeDrawer(instant = false, from = '0px', fromO = 1) {
    if (!drawerOpen) return;
    drawerOpen = false; const my = ++dTok;
    picksBar.setAttribute('aria-expanded', 'false');
    const fin = () => { dAnim.forEach((a) => a.cancel()); dAnim = []; drawer.hidden = true; scrim.hidden = true; drawer.style.transform = ''; scrim.style.opacity = ''; };
    setBg(false);
    for (const a of picksBar.getAnimations()) a.cancel();
    if (instant) { fin(); return; }
    drawer.inert = true; scrim.inert = true; // closing: it takes no more taps
    picksBar.focus({ preventScroll: true });
    picksBar.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 120, easing: EASE_OUT, fill: 'backwards' });
    runDrawer(from, '100%', fromO, 0, 280).then((done) => { if (done && my === dTok) fin(); });
  }
  picksBar.addEventListener('click', openDrawer);
  $('#mb-dr-x').addEventListener('click', () => closeDrawer());
  scrim.addEventListener('click', () => closeDrawer());
  {
    // drag the sheet down by its top edge: follows the finger, past 30% or a fast flick closes, upwards it meets friction
    const hdr = $('.mb-dr-h', drawer);
    let pid = -1, y0 = 0, t0 = 0, off = 0, hh = 1;
    hdr.addEventListener('pointerdown', (e) => {
      if (!drawerOpen || pid >= 0 || (e.target as HTMLElement).closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (dAnim.some((a) => a.playState === 'running')) return; // not while it is still sliding in
      pid = e.pointerId; y0 = e.clientY; t0 = performance.now(); off = 0; hh = drawer.offsetHeight || 1;
      dTok++; dAnim.forEach((a) => a.cancel()); dAnim = [];
      try { hdr.setPointerCapture(pid); } catch { /* ignore */ }
    });
    hdr.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const dy = e.clientY - y0;
      off = dy >= 0 ? dy : -Math.min(28, Math.sqrt(-dy) * 3.2);
      drawer.style.transform = `translateY(${off}px)`;
      scrim.style.opacity = String(1 - Math.min(1, Math.max(0, off) / hh));
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      const v = off / Math.max(1, performance.now() - t0), o = 1 - Math.min(1, Math.max(0, off) / hh);
      if (e.type !== 'pointercancel' && (off > hh * 0.3 || (v > 0.5 && off > 24))) { dTok++; closeDrawer(false, `${off}px`, o); return; }
      drawer.animate([{ transform: `translateY(${off}px)` }, { transform: 'translateY(0px)' }], { duration: 300, easing: EASE_OUT });
      scrim.animate([{ opacity: o }, { opacity: 1 }], { duration: 300, easing: EASE_OUT });
      drawer.style.transform = ''; scrim.style.opacity = '';
    };
    hdr.addEventListener('pointerup', up);
    hdr.addEventListener('pointercancel', up);
  }
  $('#mb-show').addEventListener('click', () => {
    if (!list().length) return;
    waiter.hidden = false; setBg(true); drawer.inert = true; scrim.inert = true;
    waiter.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE_OUT });
    $('#mb-w-x').focus({ preventScroll: true });
  });
  function closeWaiter() {
    setBg(drawerOpen); drawer.inert = false; scrim.inert = false;
    waiter.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px)' }], { duration: 180, easing: EASE_OUT }).finished.then(() => { waiter.hidden = true; });
    $('#mb-show').focus({ preventScroll: true });
  }
  $('#mb-w-x').addEventListener('click', closeWaiter);
  // Send on WhatsApp: the ✓ draws in a green circle, then WhatsApp opens. A double tap does not send twice.
  let sending = false;
  waBtn.addEventListener('click', (e) => {
    if (!list().length || sending) { e.preventDefault(); return; }
    if (waBtn.dataset.go) { delete waBtn.dataset.go; return; } // the browser blocked the first open: this tap opens it directly
    e.preventDefault(); sending = true; waBtn.classList.add('mb-sent'); live.textContent = 'Opening WhatsApp';
    setTimeout(() => {
      const w = window.open(waBtn.href, '_blank');
      if (w) { try { w.opener = null; } catch { /* ignore */ } } else { waBtn.dataset.go = '1'; live.textContent = 'Tap Send on WhatsApp again to open it'; }
      setTimeout(() => { waBtn.classList.remove('mb-sent'); sending = false; }, w ? 1200 : 0);
    }, 520);
  });
  renderPicks();
}
