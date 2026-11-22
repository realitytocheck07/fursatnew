// /menu hover photo (laptop mouse only). One 220x280 card follows the cursor with a small lag over rows that have a real photo
// (data-prev = the dish-photos.json thumbnail, data-hfit = its 4:5 fit). Rows with no photo show nothing. Never on touch.
// Motion: transform and opacity only. The card is pointer-events:none and is placed so it never sits on the hovered row's price.
const card = document.getElementById('mw-hv') as HTMLElement | null;
const list = document.getElementById('mv-list');
const img = card?.querySelector<HTMLImageElement>('img') ?? null;
const W = 220, H = 280, GAP = 22, EDGE = 8;

if (card && list && img) {
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  let row: HTMLElement | null = null;
  let tx = 0, ty = 0, x = 0, y = 0, side: 1 | -1 = 1, raf = 0, shown = false;

  const hit = (a: DOMRect, b: DOMRect, m = 6) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  function aim(cx: number, cy: number) {
    if (!row) return;
    const price = row.querySelector('.mv-item-price')?.getBoundingClientRect();
    const top = clamp(cy - H * 0.4, EDGE, innerHeight - H - EDGE);
    const spots: [number, number][] = [[cx + GAP, top], [cx - GAP - W, top]];
    if (side === -1) spots.reverse();
    for (const [px, py] of spots) {
      if (px < EDGE || px + W > innerWidth - EDGE) continue;
      if (price && hit(new DOMRect(px, py, W, H), price)) continue;
      tx = px; ty = py; side = px > cx ? 1 : -1;
      return;
    }
    // no free side: sit above the row (or below it when the top of the screen is too close)
    const r = row.getBoundingClientRect();
    tx = clamp(cx - W / 2, EDGE, innerWidth - W - EDGE);
    ty = r.top - H - 10 >= EDGE ? r.top - H - 10 : r.bottom + 10;
  }

  function frame() {
    x += (tx - x) * 0.2; y += (ty - y) * 0.2;
    card!.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    if (shown || Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) raf = requestAnimationFrame(frame);
    else { raf = 0; card!.classList.remove('is-live'); }
  }
  function show(li: HTMLElement, e: PointerEvent) {
    if (row !== li) {
      row = li;
      img!.src = li.dataset.prev!;
      img!.setAttribute('style', li.dataset.hfit || '');
    }
    aim(e.clientX, e.clientY);
    if (!shown) { x = tx; y = ty; card!.style.transform = `translate3d(${x}px,${y}px,0)`; }
    shown = true;
    card!.classList.add('is-live', 'is-on');
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function hide() {
    row = null; shown = false;
    card!.classList.remove('is-on');
  }

  const rowOf = (t: EventTarget | null) => (t instanceof Element ? t.closest<HTMLElement>('[data-row]') : null);
  list.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches) return;
    const li = rowOf(e.target);
    if (li && li.dataset.prev && !li.hidden) show(li, e);
    else if (shown) hide();
  }, { passive: true });
  list.addEventListener('pointerleave', hide);
  // the page scrolls under a still cursor: the row changes without a move, so drop the card until the mouse moves again
  document.addEventListener('scroll', () => { if (shown) hide(); }, { passive: true, capture: true });
  addEventListener('blur', hide);
}
