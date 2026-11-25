// /menu client script: side switching, 21+ notice, the one sticky filter bar (toggle, chips, search, Veg / Non-veg, live count), scroll-spy,
// lazy rows, row entrance, dish sheet (any screen, "Ask about this dish on WhatsApp"). No framework, no animation library.
import { rowHtml, esc, type RowRec } from './dish-row';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
type Side = 'food' | 'drinks';

const root = $('.mv');
if (root) init(root);

function init(root: HTMLElement) {
  const stage = $('.mv-stage')!;

  /* ── side, rail, chips, 21+ ───────────────────────────── */
  const AGE = 'fursat_age_ok';
  const ageOk = () => { try { return localStorage.getItem(AGE) === '1'; } catch { return false; } };
  const dlg = $<HTMLDialogElement>('#mv-age')!;
  // CAFÉ MODE: /menu?menu=cafe (header "Café & Coffee", /cafe buttons). Only the café groups are listed (coffee, tea, shakes, smoothies,
  // breakfast, desserts, cookies, soft drinks); the alcohol groups are hidden, so no 21+ question is needed.
  const CAFE = new URLSearchParams(location.search).get('menu') === 'cafe';
  if (CAFE) root.dataset.cafe = '1';
  let pending: (() => void) | null = null;

  function setSide(side: Side) {
    root.dataset.side = side;
    $$('[data-schips]').forEach((d) => d.toggleAttribute('hidden', d.dataset.schips !== side));
    $$('[data-jump]').forEach((d) => d.toggleAttribute('hidden', d.dataset.jump !== side));
    $$('[data-idx]').forEach((d) => d.toggleAttribute('hidden', d.dataset.idx !== side));
    $$('[data-seg]').forEach((b) => { const on = b.dataset.seg === side; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    updateCount();
  }
  function centerIn(btn: HTMLElement | null) {
    const box = btn?.parentElement;
    if (!btn || !box || box.scrollWidth <= box.clientWidth) return;
    const left = btn.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft - box.clientWidth / 2 + btn.offsetWidth / 2;
    box.scrollTo({ left, behavior: 'smooth' });
  }
  function mark(id: string | null) {
    $$('.mv-schip').forEach((b) => { const on = b.dataset.go === id; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); if (on && b.offsetParent) centerIn(b); });
    $$('.mv-idx-b').forEach((b) => { const on = b.dataset.go === id; b.classList.toggle('is-on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  // while we scroll the page ourselves (Full food / drinks menu, hotspots, chips) the scroll-spy must not flip the side:
  // passing through the other side's groups used to switch the list and the jump ended in the wrong menu.
  let autoUntil = 0;
  const scrollTo = (el: Element | null) => {
    if (!el) return;
    autoUntil = performance.now() + 1600;
    const done = () => { autoUntil = 0; removeEventListener('scrollend', done); };
    addEventListener('scrollend', done, { once: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  function need21(side: Side, run: () => void) {
    if (side === 'drinks' && !CAFE && !ageOk()) { pending = run; if (!dlg.open) dlg.showModal(); return; }
    run();
  }
  function go(id: string | null, side?: Side) {
    const sd = side || (id && id.startsWith('d-') ? 'drinks' : id && id.startsWith('f-') ? 'food' : (root.dataset.side as Side));
    need21(sd, () => { const tg = id ? document.getElementById('g-' + id) : null; fillThrough(tg); setSide(sd); mark(id); scrollTo(tg ?? $('#mv-list')); });
  }
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const sgo = t.closest<HTMLElement>('[data-side-go]');
    if (sgo) {
      const s = sgo.dataset.sideGo as Side;
      // the doors' "Full food / drinks menu" buttons land on the category tiles; the filter bar's Food | Drinks switch still goes to the first category
      const tiles = !sgo.closest('#mv-sticky') ? document.getElementById('mc-' + s) : null;
      if (tiles) need21(s, () => { fillThrough(tiles); setSide(s); mark(null); scrollTo(tiles); });
      else go(s === 'drinks' ? 'd-cocktails' : 'f-biryani', s);
      return;
    }
    const mc = t.closest<HTMLElement>('[data-mc-go]');
    if (mc) { pickTile(mc); return; }
    const g = t.closest<HTMLElement>('[data-go]');
    if (g) { go(g.dataset.go!, g.dataset.sideOf as Side | undefined); return; }
  });
  /* ── Jump to: tiles in the page (wide screens) and in the sheet the Categories button opens ── */
  const sheetApi = () => (window as unknown as { fkSheet?: { open: (o: object) => void; close: () => void } }).fkSheet;
  let afterSheet: (() => void) | null = null;
  const jumpTo = (id: string, side: Side) => need21(side, () => {
    const sec = document.getElementById(id);
    fillThrough(sec);
    setSide(side); mark(sec?.closest<HTMLElement>('[data-group]')?.dataset.group ?? null); scrollTo(sec);
  });
  document.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-jump-to]');
    if (!t) return;
    e.preventDefault();
    const run = () => jumpTo(t.dataset.jumpTo!, t.dataset.sideOf as Side);
    if (t.closest('.fk-sheet')) { afterSheet = run; sheetApi()?.close(); } else run();
  });
  const cats = $('#mv-cats');
  cats?.addEventListener('click', () => {
    const side = root.dataset.side as Side, src = $(`[data-jump="${side}"]`), api = sheetApi();
    if (!src || !api) { scrollTo($('.mc-tiles:not([hidden])') || $('#mv-jump')); return; }
    const grid = src.cloneNode(true) as HTMLElement;
    grid.removeAttribute('data-jump'); grid.removeAttribute('hidden');
    api.open({ title: side === 'food' ? 'Jump to · Food' : 'Jump to · Drinks', body: grid, opener: cats, onClose: () => { const r = afterSheet; afterSheet = null; r?.(); } });
  });
  dlg.addEventListener('close', () => {
    if (dlg.returnValue === 'yes') { try { localStorage.setItem(AGE, '1'); } catch { /* ignore */ } const run = pending; pending = null; run?.(); }
    else if (dlg.returnValue === 'no') { pending = null; go('f-biryani', 'food'); }
    dlg.returnValue = '';
  });

  /* ── scroll-spy: keeps the chips on the group in view ── */
  const groups = $$('.mv-grp');
  const spied = [...groups, ...$$('.mc-tiles')];
  const seen = new Set<Element>();
  if ('IntersectionObserver' in window) {
    const run = () => {
      // desktop pages scroll the body, not the window (07.css): window.scrollY is 0 there, which kept the spy asleep and the rail on "Cocktails"
      if ((window.scrollY || document.body.scrollTop || document.documentElement.scrollTop) < stage.offsetHeight * 0.5) return; // stage still in charge
      if (performance.now() < autoUntil) return; // our own jump is running: keep the chosen side
      // the group whose top has passed the sticky offset (largest top <= 200px); else the first one in view
      const inView = spied.filter((g) => seen.has(g)).map((g) => [g, g.getBoundingClientRect().top] as const);
      const passed = inView.filter(([, t]) => t <= 200).sort((a, b) => b[1] - a[1])[0];
      const top = (passed || inView[0])?.[0];
      if (!top) return;
      // a category-tiles block counts as part of its side; no chip is on until a category is chosen
      if (top.classList.contains('mc-tiles')) { setSide(top.id === 'mc-drinks' ? 'drinks' : 'food'); mark(null); return; }
      const id = top.getAttribute('data-group')!;
      setSide(id.startsWith('d-') ? 'drinks' : 'food');
      mark(id);
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? seen.add(en.target) : seen.delete(en.target)));
      run();
    }, { rootMargin: '-140px 0px -62% 0px' });
    spied.forEach((g) => spy.observe(g));
    // a group taller than the screen stays "in view" for many scroll steps, so the intersection callback alone is not enough
    let spyRaf = 0;
    document.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(() => { spyRaf = 0; run(); }); }, { passive: true, capture: true });
  }

  /* ── search (highlight) + diet filters ────────────────── */
  const q = $<HTMLInputElement>('#mv-q')!, countEl = $('#mv-count')!, emptyEl = $('#mv-empty')!;
  const rows = $$<HTMLElement>('[data-row]');
  const names = new Map(rows.map((r) => [r, $('.mv-iname', r)!]));
  const descs = new Map(rows.map((r) => [r, $('.mv-idesc', r)]));
  const orig = new Map<Element, string>();
  names.forEach((el) => orig.set(el, el.textContent || ''));
  descs.forEach((el) => el && orig.set(el, el.textContent || ''));
  /* ── dish rows are filled in on demand: the page ships only the first group; the rest are records in #mv-rows ──
     A section is filled when it is within ~1200px of the screen, or before a search / filter, a jump (chips, tiles, hotspots, #go=),
     a #dish= link or the table's "See dish" needs it. A jump fills every section above its target too, so the page does not move. */
  const LAZY: Record<string, { sec: string; k: 'food' | 'drink'; rows: RowRec[] }> = (() => { try { return JSON.parse($('#mv-rows')?.textContent || '{}'); } catch { return {}; } })();
  let onRows: ((li: HTMLElement[]) => void) | null = null;
  function fillSection(sec: Element) {
    const ul = sec.querySelector<HTMLElement>('.mv-items[data-lazy]');
    if (!ul) return;
    ul.removeAttribute('data-lazy'); ul.style.removeProperty('--n');
    const d = LAZY[sec.id];
    if (!d) return;
    ul.innerHTML = d.rows.map((r) => rowHtml(r, { sec: d.sec, k: d.k })).join('');
    const li = $$<HTMLElement>('[data-row]', ul);
    li.forEach((r) => {
      const n = $('.mv-iname', r)!, ds = $('.mv-idesc', r);
      rows.push(r); names.set(r, n); descs.set(r, ds); orig.set(n, n.textContent || ''); if (ds) orig.set(ds, ds.textContent || '');
    });
    onRows?.(li);
  }
  function fillAll() { $$('.mv-sec').forEach(fillSection); }
  function fillThrough(el: Element | null) {
    if (!el) return;
    $$('.mv-sec').forEach((s) => { if (s === el || el.contains(s) || !(el.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)) fillSection(s); });
  }
  const lazySecs = $$('.mv-sec').filter((s) => s.querySelector('.mv-items[data-lazy]'));
  if ('IntersectionObserver' in window) {
    const lio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { lio.unobserve(e.target); fillSection(e.target); } }), { rootMargin: '1200px 0px' });
    lazySecs.forEach((s) => lio.observe(s));
  } else fillAll();
  const diets = new Set<string>();
  let jumped = false, timer = 0;
  const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function hl(el: Element, text: string, toks: string[]) {
    if (!toks.length) { el.textContent = text; return; }
    const re = new RegExp('(' + toks.map(reEsc).join('|') + ')', 'ig');
    el.innerHTML = esc(text).replace(re, '<mark>$1</mark>');
  }
  // live count of what is showing on the open side, e.g. "24 dishes" (read out by the status region)
  function updateCount() {
    const side = root.dataset.side as Side, n = $$(`[data-side-block="${side}"] [data-row]:not([hidden])`).length + $$(`[data-side-block="${side}"] .mv-items[data-lazy]`).reduce((k, u) => k + Number(u.dataset.n || 0), 0);
    countEl.textContent = n ? `${n} ${side === 'food' ? (n === 1 ? 'dish' : 'dishes') : (n === 1 ? 'drink' : 'drinks')}` : 'No matches';
  }
  function filter() {
    fillAll(); // every dish is searched, filled in or not
    const toks = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const active = toks.length > 0 || diets.size > 0;
    let shown = 0;
    rows.forEach((li) => {
      const veg = li.dataset.veg === '1', text = li.dataset.text || '';
      let ok = toks.every((tk) => text.includes(tk));
      if (ok && diets.has('veg') && !veg) ok = false;
      if (ok && diets.has('nonveg') && veg) ok = false;
      li.toggleAttribute('hidden', !ok);
      if (ok) { shown++; hl(names.get(li)!, orig.get(names.get(li)!)!, toks); const d = descs.get(li); if (d) hl(d, orig.get(d)!, toks); }
    });
    ['.mv-sec', '.mv-grp', '.mv-side'].forEach((sel) => $$(sel).forEach((s) => s.toggleAttribute('hidden', !s.querySelector('[data-row]:not([hidden])'))));
    emptyEl.toggleAttribute('hidden', shown > 0 || !active);
    updateCount();
    // the first search from the top of the page (bar not on screen yet) brings the list into view
    if (active && !jumped) { jumped = true; if ($('#mv-list')!.getBoundingClientRect().top > 8) scrollTo($('#mv-list')); }
    if (!active) jumped = false;
  }
  q.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(filter, 120); });
  q.closest('form')?.addEventListener('submit', (e) => e.preventDefault());
  $$('[data-diet]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.diet!; const on = !diets.has(k);
    on ? diets.add(k) : diets.delete(k);
    if (on && k === 'veg') { diets.delete('nonveg'); $('[data-diet="nonveg"]')!.setAttribute('aria-pressed', 'false'); }
    if (on && k === 'nonveg') { diets.delete('veg'); $('[data-diet="veg"]')!.setAttribute('aria-pressed', 'false'); }
    b.setAttribute('aria-pressed', String(on));
    filter();
  }));

  /* ── row entrance: rows fade up 8px in soft batches (max 8 per batch, 40ms apart); the price settles just after its row ── */
  const rowIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.filter((en) => en.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      .forEach((en, i) => {
        const el = en.target as HTMLElement; rowIO!.unobserve(el);
        el.style.setProperty('--d', `${Math.min(i, 7) * 40}ms`);
        el.classList.add('is-in');
        setTimeout(() => { el.classList.remove('mv-pre', 'is-in'); el.style.removeProperty('--d'); }, 1000);
      });
  }, { rootMargin: '0px 0px -4% 0px' }) : null;
  function watchRows(list: HTMLElement[], first = false) {
    if (!rowIO) return;
    list.forEach((r) => { if (first && r.getBoundingClientRect().top < innerHeight) return; r.classList.add('mv-pre'); rowIO.observe(r); });
  }
  watchRows(rows, true);
  const prevOnRows = onRows;
  onRows = (li) => { watchRows(li); prevOnRows?.(li); };

  /* ── the filter bar's height, so jumps stop just under it ── */
  const stickyEl = $('#mv-sticky');
  if (stickyEl && 'ResizeObserver' in window) new ResizeObserver(() => root.style.setProperty('--mv-stk', Math.round(stickyEl.offsetHeight) + 'px')).observe(stickyEl);

  /* ── the filter bar follows the site header (it slides away on scroll down) ── */
  const header = $('.sh-header');
  if (header) {
    const sync = () => root.style.setProperty('--mv-top', Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + 'px');
    let until = 0, ticking = false;
    const loop = () => { sync(); ticking = performance.now() < until; if (ticking) requestAnimationFrame(loop); };
    const kick = (ms: number) => { until = performance.now() + ms; if (!ticking) { ticking = true; requestAnimationFrame(loop); } };
    new MutationObserver(() => kick(500)).observe(header, { attributes: true, attributeFilter: ['class'] });
    addEventListener('scroll', () => kick(80), { passive: true });
    sync();
  }

  /* ── dish sheet (any screen): tap a row, "See dish", the table or a #dish= link; drag down / Esc / back / X to close ── */
  const sheet = $<HTMLDialogElement>('#mv-sheet');
  const findRow = (key: string) => $$<HTMLElement>('[data-row]').find((r) => r.dataset.an === key);
  if (sheet) {
    const phone = matchMedia('(max-width: 720px)');
    const panelEl = $('#mv-sheet-panel')!, dragEl = $('#mv-sheet-drag')!, phEl = $('#mv-sheet-ph')!;
    const secEl = $('#mv-sheet-sec')!, nameEl = $('#mv-sheet-name')!, tagsEl = $('#mv-sheet-tags')!, descEl = $('#mv-sheet-desc')!;
    const noteEl = $('#mv-sheet-note')!, priceEl = $('#mv-sheet-price')!;
    const waBtn = $<HTMLAnchorElement>('#mv-sheet-wa')!, xBtn = $('#mv-sheet-x')!;
    let opener: HTMLElement | null = null, pushed = false, closing = false, closeT = 0;

    const el = (tag: string, cls: string, text = '') => { const n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; };
    const tag = (cls: string, text: string) => el('span', `mv-stag ${cls}`, text);
    function fill(li: HTMLElement) {
      const nm = orig.get(names.get(li)!) || '', ds = descs.get(li) ? orig.get(descs.get(li)!)! : '';
      secEl.textContent = li.dataset.sec || '';
      nameEl.textContent = nm; descEl.textContent = ds; noteEl.textContent = $('.mv-note', li)?.textContent || '';
      // photo, or a typographic card (real photos only: no stand-in food images)
      phEl.replaceChildren();
      if (li.dataset.img) {
        const im = document.createElement('img'); im.src = li.dataset.img; im.alt = `Photo of ${nm}`; im.decoding = 'async'; im.draggable = false; phEl.appendChild(im);
      } else {
        const c = el('div', 'mv-sheet-card'); c.setAttribute('aria-hidden', 'true');
        const g = el('span', 'mv-ghost', nm.trim()[0] || ''); const o = el('span', 'mv-orn'); o.appendChild(document.createElement('b'));
        c.append(g, o); phEl.appendChild(c);
      }
      // tags: Veg / Non-veg (food only), Spicy, Chef's pick
      const tags: HTMLElement[] = [];
      if (!li.closest('#mv-drinks')) tags.push(tag(li.dataset.veg === '1' ? 'mv-stag--v' : 'mv-stag--n', li.dataset.veg === '1' ? 'Veg' : 'Non-veg'));
      if (li.dataset.s) tags.push(tag('mv-stag--s', 'Spicy'));
      if (li.dataset.f) tags.push(tag('mv-stag--f', "Chef's pick"));
      tagsEl.replaceChildren(...tags);
      // price(s) exactly as in the list, with their labels (Half / Full, 30 ml ...)
      const pr = $('.mv-item-price', li);
      priceEl.innerHTML = pr ? pr.innerHTML : '';
      waBtn.href = `https://wa.me/${waBtn.dataset.wa}?text=${encodeURIComponent(`Hi Fursat! I have a question about: ${li.dataset.an || nm}`)}`;
    }
    function openSheet(li: HTMLElement) {
      if (sheet!.open || closing) return;
      // focus returns to whatever opened the card: its "See dish" / row button, else the row's own button
      const ae = document.activeElement as HTMLElement | null;
      opener = ae && ae !== document.body && !ae.closest('[inert]') && !sheet!.contains(ae) ? ae : $('.mv-open', li);
      fill(li);
      $('.mv-sheet-scroll', sheet!)!.scrollTop = 0;
      panelEl.style.transform = ''; panelEl.classList.remove('is-drag');
      history.pushState({ mvSheet: 1 }, ''); pushed = true;
      sheet!.showModal(); void panelEl.offsetHeight; sheet!.classList.add('is-in');
      xBtn.focus({ preventScroll: true }); // focus moves into the card (the page behind is inert)
    }
    function closeSheet(fromPop = false) {
      if (!sheet!.open || closing) return;
      closing = true;
      panelEl.classList.remove('is-drag'); panelEl.style.transform = ''; sheet!.classList.remove('is-in');
      const done = () => {
        clearTimeout(closeT); panelEl.removeEventListener('transitionend', onEnd);
        sheet!.close(); closing = false;
        opener?.focus({ preventScroll: true });
        const back = pushed && !fromPop; pushed = false;
        if (back && history.state?.mvSheet) history.back();
      };
      const onEnd = (e: TransitionEvent) => { if (e.target === panelEl) done(); };
      panelEl.addEventListener('transitionend', onEnd);
      closeT = window.setTimeout(done, 320);
    }

    $('#mv-list')?.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('a') || getSelection()?.toString()) return;
      const li = t.closest<HTMLElement>('[data-row]'); if (li) openSheet(li);
    });
    // the rotating table (menu-doors.ts) and every "See dish" button open a dish's sheet by its key (name + variant label)
    document.addEventListener('mv:open', (e) => {
      const key = (e as CustomEvent<string>).detail;
      fillAll();
      const li = findRow(key);
      if (li) openSheet(li);
    });
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-see]');
      if (b) document.dispatchEvent(new CustomEvent('mv:open', { detail: b.dataset.see }));
    });
    // deep link: /menu#dish=<menu name, URL-encoded> opens that dish card (same mv:open as "See dish"); unknown name = nothing
    const openFromHash = () => {
      const gm = /^#go=([a-z0-9-]+)$/.exec(location.hash);
      if (gm && document.getElementById('g-' + gm[1])) { go(gm[1]); return; } // /menu/#go=d-cocktails: group jump, 21+ check first for drinks
      const m = /^#dish=(.+)$/.exec(location.hash);
      if (!m) return;
      fillAll();
      let want = '';
      try { want = decodeURIComponent(m[1]).trim().toLowerCase(); } catch { return; }
      const ns = $$<HTMLElement>('[data-row]').map((r) => r.dataset.an ?? '');
      const hit = ns.find((n) => n.toLowerCase() === want) ?? ns.find((n) => n.replace(/ \([^)]*\)$/, '').toLowerCase() === want);
      if (!hit) return;
      // drinks side: the 21+ check comes first, the drink card opens right after "yes" ("no" goes to food, nothing opens)
      const row = findRow(hit);
      const side: Side = row?.closest('[data-side-block]')?.getAttribute('data-side-block') === 'drinks' ? 'drinks' : 'food';
      need21(side, () => document.dispatchEvent(new CustomEvent('mv:open', { detail: hit })));
    };
    openFromHash();
    addEventListener('hashchange', openFromHash);
    dragEl.addEventListener('dragstart', (e) => e.preventDefault()); // a native image drag would cancel our pointer drag
    // explicit focus trap: Tab cycles X <-> WhatsApp instead of leaving for browser chrome
    sheet.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f: HTMLElement[] = [xBtn, waBtn];
      const first = f[0], last = f[f.length - 1], cur = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (cur === first || !cur || !f.includes(cur))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (cur === last || !cur || !f.includes(cur))) { e.preventDefault(); first.focus(); }
    });
    xBtn.addEventListener('click', () => closeSheet());
    sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); }); // Escape
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); }); // outside the panel
    addEventListener('popstate', () => { if (sheet.open) closeSheet(true); });      // back button / swipe-back

    // drag down from the grabber or the photo; a flick (> 0.11 px/ms) is enough
    let sy = 0, dy = 0, pid = -1, dragging = false, trail: [number, number][] = [];
    dragEl.addEventListener('pointerdown', (e) => {
      if (dragging || (e.pointerType === 'mouse' && e.button !== 0) || !phone.matches) return; // drag-to-close is a phone gesture
      dragging = true; pid = e.pointerId; sy = e.clientY; dy = 0; trail = [[e.timeStamp, e.clientY]];
      dragEl.setPointerCapture(pid); panelEl.classList.add('is-drag');
    });
    dragEl.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const raw = e.clientY - sy; dy = raw > 0 ? raw : Math.max(raw / 8, -24); // friction above the resting edge
      panelEl.style.transform = `translateY(${dy}px)`;
      trail.push([e.timeStamp, e.clientY]); while (trail.length > 2 && e.timeStamp - trail[0][0] > 100) trail.shift();
    });
    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false; try { dragEl.releasePointerCapture(pid); } catch { /* already released */ }
      const a = trail[0], b = trail[trail.length - 1], v = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;
      if (e.type !== 'pointercancel' && (dy > panelEl.offsetHeight * 0.3 || (v > 0.11 && dy > 8))) closeSheet();
      else { panelEl.classList.remove('is-drag'); panelEl.style.transform = ''; }
    };
    dragEl.addEventListener('pointerup', endDrag);
    dragEl.addEventListener('pointercancel', endDrag);
  }

  /* ── café mode: land on the café part of the menu, and offer the way back to the whole menu ── */
  if (CAFE) {
    const exit = $<HTMLElement>('#mv-cafe-all');
    exit?.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', location.pathname); delete root.dataset.cafe; go('f-biryani', 'food'); });
    const goId = /^#go=([a-z0-9-]+)$/.exec(location.hash)?.[1];
    if (!(goId && document.getElementById('g-' + goId))) setTimeout(() => go('d-coffee', 'drinks'), 250); // a valid /menu?menu=cafe#go=<group> link keeps its own target
  }

  /* ── category tiles: gold + a check that springs in (400ms), then the smooth jump; drinks ask the 21+ question first ── */
  const tileTimers = new WeakMap<HTMLElement, number>();
  function pickTile(btn: HTMLElement) {
    if (btn.classList.contains('is-picked')) return;
    const id = btn.dataset.mcGo!, side = (btn.dataset.sideOf as Side) || 'food';
    need21(side, () => {
      // a search or Veg / Non-veg filter may have hidden that category: clear it so the jump has somewhere to land
      if (document.getElementById('g-' + id)?.hasAttribute('hidden')) {
        q.value = ''; diets.clear(); $$('[data-diet]').forEach((b) => b.setAttribute('aria-pressed', 'false')); filter();
      }
      btn.classList.add('is-picked');
      setTimeout(() => go(id, side), 380);
      tileTimers.set(btn, window.setTimeout(() => btn.classList.remove('is-picked'), 2000));
    });
  }
  // tiles rise 12px and fade in, 50ms apart, once; below-the-fold tiles only (nothing is hidden before this script runs)
  const tiles = $$<HTMLElement>('.mc-tile');
  if ('IntersectionObserver' in window) {
    const tio = new IntersectionObserver((es) => es.filter((e) => e.isIntersecting).forEach((e) => {
      const el = e.target as HTMLElement; tio.unobserve(el); el.classList.add('is-in');
      setTimeout(() => el.classList.remove('mc-pre', 'is-in'), 900);
    }), { rootMargin: '0px 0px -8% 0px' });
    tiles.forEach((t) => { if (t.getBoundingClientRect().top < innerHeight) return; t.classList.add('mc-pre'); tio.observe(t); });
  }

  /* ── category banners: wipe in once as each one arrives (JS adds mw-pre below the fold, so no-JS and first-screen banners are never hidden) ── */
  const bans = $$<HTMLElement>('.mw-ban');
  if ('IntersectionObserver' in window) {
    const bio = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      bio.unobserve(en.target);
      en.target.classList.add('is-in');
      setTimeout(() => en.target.classList.remove('mw-pre', 'is-in'), 900);
    }), { rootMargin: '0px 0px -12% 0px' });
    bans.forEach((b) => { if (b.getBoundingClientRect().top < innerHeight) return; b.classList.add('mw-pre'); bio.observe(b); });
  }

  /* ── phone: the floating Offers / Instagram / Ask buttons step aside while the dish list is on screen (they read [data-fab-avoid]) ── */
  const listIn = $('.mv-list-in');
  const phoneMq = matchMedia('(max-width: 767px)');
  const tuck = () => listIn?.toggleAttribute('data-fab-avoid', phoneMq.matches);
  tuck(); phoneMq.addEventListener('change', tuck);

  /* ── one-time sheen on primary buttons (a transition, removed after it plays) ── */
  setTimeout(() => {
    const bs = $$('.mv-btn'); bs.forEach((b) => b.classList.add('is-sheen'));
    setTimeout(() => bs.forEach((b) => b.classList.remove('is-sheen')), 1000);
  }, 700);
}
