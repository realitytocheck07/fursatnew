// /menu Phase 3 (v5.39): cut-out dishes fall from above the screen onto the plates of the table scene, scrubbed by the pinned scroll (both directions).
// One scroll-linked rAF loop. After load it only writes transform + opacity (dish, shadow). Layout is read on load and resize only.
// The plate spots are in the scene's own pixels; place() maps them to the screen with the same cover maths as object-fit.
// Reduced motion / no script: nothing moves, the dishes are already on the plates (the CSS default).
const root = document.getElementById('tl');

type Slot = { el: HTMLElement; dish: HTMLElement; shadow: HTMLElement; label: HTMLElement | null; on: number; dy: number; dx: number; k: number; hh: number };

// Empty plate centres in image pixels (measured on the art; tuned on screenshots). pw/ph = plate width/height.
const WIDE = { w: 1672, h: 941, pw: 200, ph: 120, y: 614, x: [194, 516, 836, 1141, 1458] };
const TALL = { w: 941, h: 1672, pw: 210, ph: 104, y: 897, x: [140, 466, 777] };
const ROW = 0.62; // the plate row sits at ~62% of the stage height
const DISH = 1.25; // dish width = plate width x this
const LAG = 0.1; // each dish starts 10% of the pinned scroll after the one before
const END = 0.75; // the last dish has landed by 75%; the last 25% holds the full table while the labels fade in
const START = { sc: 1.5, rot: [-8, 6, -5, 8, -7], sx: 0.3 }; // start scale, start tilt (deg) per dish, sideways start (x dish width)
const FALL = 0.86; // share of a dish's own flight spent falling; the rest is the 2-3px settle

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const out = (t: number) => 1 - Math.pow(1 - t, 3);
const io = (t: number) => t * t * (3 - 2 * t);

function init(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('#tl-stage')!;
  const img = root.querySelector<HTMLImageElement>('.tl-bg img')!;
  const legend = root.querySelector<HTMLElement>('.tl-legend');
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowQ = matchMedia('(max-width: 820px)');
  root.classList.add('tl--js');

  const slots: Slot[] = [...root.querySelectorAll<HTMLElement>('.tl-spot')].map((el) => ({
    el, dish: el.querySelector<HTMLElement>('.tl-plate')!, shadow: el.querySelector<HTMLElement>('.tl-shadow')!, label: el.querySelector<HTMLElement>('.tl-label'), on: -1, dy: 0, dx: 0, k: 0, hh: 100,
  }));
  let still = reduceQ.matches, tlTop = 0, trackH = 0, stageH = 0, lastP = -1, raf = 0, active = 0;
  let pin = 1;

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
      const dw = pw * DISH, hh = dw / (parseFloat(s.el.style.getPropertyValue('--ar')) || 1);
      s.hh = hh; s.k = k; s.dy = -(cy + ph / 2 + hh * START.sc + 24); s.dx = (k % 2 ? 1 : -1) * dw * START.sx;
      s.el.style.setProperty('--x', cx.toFixed(1) + 'px'); s.el.style.setProperty('--y', cy.toFixed(1) + 'px');
      s.el.style.setProperty('--pw', pw.toFixed(1) + 'px'); s.el.style.setProperty('--ph', ph.toFixed(1) + 'px');
      s.el.style.setProperty('--dw', (pw * DISH).toFixed(1) + 'px');
      k++;
    });
    active = k;
    legend?.querySelectorAll<HTMLElement>('li').forEach((li) => { li.hidden = nw && li.dataset.phone !== '1'; });
  }

  // 2) scroll geometry: the stage pins at the top of the track; the flight is scrubbed over the pinned distance
  function measure() {
    place();
    tlTop = root!.getBoundingClientRect().top + scrollY;
    trackH = root!.offsetHeight; stageH = stage.offsetHeight;
    pin = Math.max(1, trackH - stageH);
    lastP = -1;
    frame();
  }

  // 3) the loop: scroll position -> progress -> each dish's transform + opacity (labels: opacity only)
  function frame() {
    raf = 0;
    if (still) return;
    const p = clamp((scrollY - tlTop) / pin);
    if (p === lastP) return;
    lastP = p;
    const dur = END - (active - 1) * LAG;
    for (const s of slots) {
      if (s.on < 0) continue;
      const q = clamp((p - s.k * LAG) / dur), t = clamp(q / FALL), e = out(t);
      const fall = Math.pow(t, 1.8), side = io(t); // gravity down, a softer curve sideways
      const sc = START.sc - (START.sc - 1) * e, rot = START.rot[s.k % START.rot.length] * (1 - side);
      const m = clamp((q - FALL) / (1 - FALL)), sq = 1 - (2.5 / s.hh) * Math.sin(Math.PI * m); // 2-3px squash on touch-down, no bounce
      s.dish.style.transform = `translate3d(${(s.dx * (1 - side)).toFixed(1)}px,${(s.dy * (1 - fall)).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)},${(sc * sq).toFixed(4)})`;
      s.shadow.style.transform = `scale(${(0.3 + 0.7 * t * t).toFixed(3)})`;
      s.shadow.style.opacity = (0.15 + 0.85 * t).toFixed(2);
      if (s.label) s.label.style.opacity = clamp((p - END) / (1 - END)).toFixed(2);
    }
    if (legend) legend.style.opacity = clamp((p - END) / (1 - END)).toFixed(2);
  }
  function schedule() { if (!raf && !still) raf = requestAnimationFrame(frame); }

  // reduced motion (also if switched while the page is open): dishes placed, nothing moves, no pin
  function mode() {
    still = reduceQ.matches;
    root!.classList.toggle('tl--still', still);
    slots.forEach((s) => {
      s.dish.style.transform = s.shadow.style.transform = '';
      s.dish.style.opacity = s.shadow.style.opacity = '';
      if (s.label) s.label.style.opacity = '';
    });
    if (legend) legend.style.opacity = '';
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
