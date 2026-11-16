// /menu Phase 3 (v5.38): cut-out dishes drop onto the plates of the table scene as the page scrolls.
// One scroll-linked rAF loop. After load it only writes transform + opacity (dish, shadow). Layout is read on load and resize only.
// The plate spots are in the scene's own pixels; place() maps them to the screen with the same cover maths as object-fit.
// Reduced motion / no script: nothing moves, the dishes are already on the plates (the CSS default).
const root = document.getElementById('tl');

type Slot = { el: HTMLElement; dish: HTMLElement; shadow: HTMLElement; ph: number; on: number; landed: boolean };

// Empty plate centres in image pixels (measured on the art; tuned on screenshots). pw/ph = plate width/height.
const WIDE = { w: 1672, h: 941, pw: 200, ph: 120, y: 614, x: [194, 516, 836, 1141, 1458] };
const TALL = { w: 941, h: 1672, pw: 210, ph: 104, y: 897, x: [140, 466, 777] };
const ROW = 0.62; // the plate row sits at ~62% of the stage height
const DISH = 1.25; // dish width = plate width x this
const LAG = 0.12; // each dish lands a little after the one before (share of the scroll progress)
const DROP = 60; // px above the plate the dish starts

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const out = (t: number) => 1 - Math.pow(1 - t, 3);

function init(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('#tl-stage')!;
  const img = root.querySelector<HTMLImageElement>('.tl-bg img')!;
  const legend = root.querySelector<HTMLElement>('.tl-legend');
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowQ = matchMedia('(max-width: 820px)');
  root.classList.add('tl--js');

  const slots: Slot[] = [...root.querySelectorAll<HTMLElement>('.tl-spot')].map((el) => ({
    el, dish: el.querySelector<HTMLElement>('.tl-plate')!, shadow: el.querySelector<HTMLElement>('.tl-shadow')!, ph: 100, on: -1, landed: true,
  }));
  let still = reduceQ.matches, tlTop = 0, trackH = 0, stageH = 0, lastP = -1, raf = 0, active = 0;
  let from = 0, to = 1;

  // 1) put the plates on the scene. Cover maths as object-fit; if cover would crop the outer plates (narrow screens), the scene is
  // scaled down to fit them instead and the edges that no longer reach the stage fade into the dark.
  function place() {
    const W = stage.clientWidth, H = stage.clientHeight, nw = narrowQ.matches, g = nw ? TALL : WIDE, xs = g.x;
    const cover = Math.max(W / g.w, H / g.h);
    const fit = W / (xs[xs.length - 1] - xs[0] + g.pw * DISH + 24);
    const sc = Math.min(cover, fit), iw = g.w * sc, ih = g.h * sc;
    const mid = (xs[0] + xs[xs.length - 1]) / 2;
    const left = iw > W ? clamp(W / 2 - mid * sc, W - iw, 0) : (W - iw) / 2;
    const top = ih > H ? clamp(ROW * H - g.y * sc, H - ih, 0) : clamp(ROW * H - g.y * sc, 0, H - ih);
    const gap = sc < cover - 1e-6 && (top > 1 || top + ih < H - 1);
    root!.classList.toggle('tl--fit', gap);
    if (sc < cover - 1e-6) {
      Object.assign(img.style, { objectFit: 'fill', width: iw.toFixed(1) + 'px', height: ih.toFixed(1) + 'px', left: left.toFixed(1) + 'px', top: top.toFixed(1) + 'px' });
    } else {
      Object.assign(img.style, { objectFit: '', width: '', height: '', left: '', top: '' });
      const py = ih > H ? (top / (H - ih)) : 0.5, px = iw > W ? (left / (W - iw)) : 0.5;
      img.style.objectPosition = `${(px * 100).toFixed(2)}% ${(py * 100).toFixed(2)}%`;
    }
    let k = 0;
    slots.forEach((s) => {
      const show = !nw || s.el.dataset.phone === '1';
      s.el.hidden = !show;
      s.on = show ? k : -1;
      if (!show) return;
      const pw = g.pw * sc, ph = g.ph * sc;
      const cx = left + xs[k] * sc, cy = top + g.y * sc;
      s.ph = ph;
      s.el.style.setProperty('--x', cx.toFixed(1) + 'px'); s.el.style.setProperty('--y', cy.toFixed(1) + 'px');
      s.el.style.setProperty('--pw', pw.toFixed(1) + 'px'); s.el.style.setProperty('--ph', ph.toFixed(1) + 'px');
      s.el.style.setProperty('--dw', (pw * DISH).toFixed(1) + 'px');
      k++;
    });
    active = k;
    legend?.querySelectorAll<HTMLElement>('li').forEach((li) => { li.hidden = nw && li.dataset.phone !== '1'; });
  }

  // 2) scroll geometry: from = the stage is 60% up the screen, to = shortly after it pins
  function measure() {
    place();
    tlTop = root!.getBoundingClientRect().top + scrollY;
    trackH = root!.offsetHeight; stageH = stage.offsetHeight;
    const pin = Math.max(0, trackH - stageH);
    from = tlTop - innerHeight * 0.6;
    to = tlTop + pin * (narrowQ.matches ? 0.3 : 0.4);
    if (to - from < 200) to = from + 200;
    lastP = -1;
    schedule();
  }

  function land(s: Slot, on: boolean) {
    if (s.landed === on) return;
    s.landed = on; s.el.classList.toggle('is-landed', on);
  }

  // 3) the loop: scroll position -> progress -> each dish's transform + opacity
  function frame() {
    raf = 0;
    if (still) return;
    const p = clamp((scrollY - from) / (to - from));
    if (p === lastP) return;
    lastP = p;
    const span = 1 - (active - 1) * LAG;
    for (const s of slots) {
      if (s.on < 0) continue;
      const q = clamp((p - s.on * LAG) / span), e = out(q);
      if (q >= 1) { s.dish.style.transform = ''; s.dish.style.opacity = '1'; s.shadow.style.transform = ''; s.shadow.style.opacity = '1'; land(s, true); continue; }
      s.dish.style.transform = `translate3d(0,${(-DROP * (1 - e)).toFixed(1)}px,0) scale(${(1.08 - 0.08 * e).toFixed(4)})`;
      s.dish.style.opacity = clamp(q * 3).toFixed(2);
      s.shadow.style.transform = `scale(${(0.55 + 0.45 * e).toFixed(3)})`;
      s.shadow.style.opacity = (e * e).toFixed(2);
      land(s, false);
    }
  }
  function schedule() { if (!raf && !still) raf = requestAnimationFrame(frame); }

  // reduced motion (also if switched while the page is open): dishes placed, nothing moves
  function mode() {
    still = reduceQ.matches;
    root!.classList.toggle('tl--still', still);
    slots.forEach((s) => {
      s.dish.style.transform = s.shadow.style.transform = '';
      s.dish.style.opacity = s.shadow.style.opacity = still ? '' : '0';
      s.landed = still; s.el.classList.toggle('is-landed', still);
    });
    measure();
  }
  reduceQ.addEventListener('change', mode);
  narrowQ.addEventListener('change', measure);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
  // decode the scene and dishes before they are needed (they are lazy, below the fold)
  const warm = () => [img, ...slots.map((s) => s.dish.querySelector('img'))].forEach((im) => { if (im) { im.loading = 'eager'; im.decode().catch(() => {}); } });
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 800);
  mode();
}

if (root) init(root);
