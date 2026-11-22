// /menu first screen (Plan B): 50/50 Drinks | Food, tapped side opens to 75/25.
// Drinks: hexagon hotspots glow, the bar zooms toward the shelf, then its drink group opens
// (the hotspot keeps data-go, so menu-v2 still owns the jump and the 21+ notice).
// Food: a half-visible rotating table. Drag or swipe turns it with momentum and a spring snap,
// the front dish grows, tapping it opens the dish sheet. The scroll landing onto the real table lives in TableLanding.
// Motion = the table spring, in-view; Anime.js = the hotspot glow (loaded on the first hotspot tap).
// The seam (B1): one rAF loop eases toward the cursor; per frame only transforms move (the bar door is a
// counter-translate reveal), so nothing reflows or repaints while the cursor sweeps the doors.
import { animate as mAnimate, inView } from 'motion';

type Side = 'food' | 'drinks';
const md = document.getElementById('md');
if (md) init(md);

function init(md: HTMLElement) {
  const root = (md.closest('.mv') as HTMLElement) || document.body;
  md.classList.add('md--js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const narrow = matchMedia('(max-width: 820px)');
  const xBtn = document.getElementById('md-x') as HTMLButtonElement;

  /* doors in view (the .md-in class pauses the page's idle effects) */
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => root.classList.toggle('md-in', en.isIntersecting), { threshold: 0.35 }).observe(md);

  /* ── the seam: ONE rAF loop eases `cur` toward `target` (the cursor, or the 25 / 50 / 75 rest) ──
     Per frame only transforms move, all without layout or repaint:
       the bar door is a counter-translate reveal (wrapper -x with overflow:hidden, its inner content +x), plus the
       seam line, the tag, the back button, (phone) the two captions, and the table's content (half the seam offset).
     The table keeps a fixed box (--rest). It is measured once when a side opens or closes, never while hovering.
     While the seam moves, .md--moving pauses the ambient loops (light sweep, drift, pulse). */
  const bar = md.querySelector<HTMLElement>('.md-door--bar')!, barIn = md.querySelector<HTMLElement>('.md-bar-in')!;
  const seam = md.querySelector<HTMLElement>('.md-seam')!;
  const tag = md.querySelector<HTMLElement>('.md-tag')!;
  const capB = md.querySelector<HTMLElement>('.md-cap--bar')!, capF = md.querySelector<HTMLElement>('.md-cap--food')!;
  const clampSplit = (v: number) => Math.min(65, Math.max(35, v));
  let rest = 50;    // the layout split: 50 both sides, 75 drinks open, 25 food open (CSS --rest)
  let cur = 50;     // the split on screen
  let target = 50;  // where the loop is heading
  let from = 50, s0 = 1; // an open / close starts with the table at its old size (s0) and eases it to 1
  let raf = 0, idle = 0; // idle: .md--moving (layer promotion, paused loops) stays 250 ms after the seam stops, so a restart does not re-promote
  let box = { L: 0, W: md.clientWidth, H: md.clientHeight }; // filled by the observer below, never read inside the loop
  const vert = () => narrow.matches;
  function paint() {
    const v = vert(), px = ((cur - rest) / 100) * (v ? box.H : box.W);
    const t = v ? `translateY(${px.toFixed(2)}px)` : `translateX(${px.toFixed(2)}px)`;
    // counter-translate reveal: the wrapper slides left/up by x, its content slides back by x, so only the edge moves
    const x = (((100 - cur) / 100) * (v ? box.H : box.W)).toFixed(2), ax = v ? 'Y' : 'X';
    bar.style.transform = `translate${ax}(-${x}px)`;
    barIn.style.transform = `translate${ax}(${x}px)`;
    seam.style.transform = tag.style.transform = xBtn.style.transform = t;
    capB.style.transform = capF.style.transform = v ? t : '';
    const dn = rest - from, p = dn === 0 ? 1 : Math.min(1, Math.max(0, (cur - from) / dn));
    if (p >= 1) s0 = 1;
    const sc = 1 + (s0 - 1) * (1 - p);
    mt.style.transform = (v ? `translateY(${(px / 2).toFixed(2)}px)` : `translateX(${(px / 2).toFixed(2)}px)`) + (sc === 1 ? '' : ` scale(${sc.toFixed(4)})`);
  }
  function frame() {
    cur += (target - cur) * 0.18;
    if (Math.abs(target - cur) < 0.04) cur = target;
    paint();
    if (cur === target) { raf = 0; idle = window.setTimeout(() => md.classList.remove('md--moving'), 250); } else raf = requestAnimationFrame(frame);
  }
  function run() {
    if (reduce) { cur = target; paint(); return; }
    clearTimeout(idle);
    if (!raf) { md.classList.add('md--moving'); raf = requestAnimationFrame(frame); }
  }
  // a side opens / closes: the table box is final at once (one measure); the loop then slides the seam there
  function settle(to: number) {
    const oldD = geo.D;
    rest = to;
    md.style.setProperty('--rest', to + '%');
    measure();
    from = cur; s0 = reduce || !geo.D ? 1 : oldD / geo.D || 1;
    layout();
    target = to; run();
  }
  let open: Side | null = null;
  let dragged = 0; // time of the last table drag: a click right after it is not a tap
  const setOpen = (side: Side | null, px?: number, py?: number) => {
    const prev = open, inside = md.contains(document.activeElement);
    open = side;
    if (side) md.dataset.open = side; else delete md.dataset.open;
    xBtn.hidden = !side;
    // the faded-out side keeps nothing to Tab to except its door opener
    md.querySelector('.md-cap--food')?.toggleAttribute('inert', side === 'drinks');
    md.querySelector('.md-cap--bar')?.toggleAttribute('inert', side === 'food');
    mt.toggleAttribute('inert', side === 'drinks');
    spots.toggleAttribute('inert', side === 'food');
    // back to "Both sides": keyboard focus returns to the opener of the side that was open
    if (!side && prev && inside) md.querySelector<HTMLElement>(`[data-open-side="${prev}"]`)?.focus({ preventScroll: true });
    if (side !== 'food') placeCap();
    settle(side === 'drinks' ? 75 : side === 'food' ? 25 : 50);
    if (side && px != null && py != null && !reduce) flash(px, py);
    if (side === 'food') wake();
  };
  // a small gold ring where the guest tapped, as the side opens
  function flash(x: number, y: number) {
    const r = document.createElement('span'); r.className = 'md-ring';
    Object.assign(r.style, { left: x + 'px', top: y + 'px' });
    root.append(r);
    r.animate([{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(14)' }], { duration: 750, easing: 'cubic-bezier(.23,1,.32,1)' }).finished.then(() => r.remove());
  }
  xBtn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(null); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && !e.defaultPrevented && !document.querySelector('dialog[open]')) setOpen(null); });

  // desktop: the seam eases toward the pointer (35–65 %), only while nothing is open
  md.addEventListener('pointermove', (e) => {
    if (open || reduce || !fine.matches || narrow.matches) return;
    target = clampSplit(((e.clientX - box.L) / box.W) * 100);
    run();
  });
  md.addEventListener('pointerleave', () => { if (!open && fine.matches && !narrow.matches) { target = 50; run(); } });

  // a tap on a closed (or the narrow) side opens it; the buttons inside keep their own jobs
  md.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const door = t.closest<HTMLElement>('[data-door]');
    if (!door || t.closest('[data-side-go], [data-mb-open], #mb-root, #md-x') || performance.now() - dragged < 350) return;
    const side = door.dataset.door as Side;
    if (open !== side) {
      e.stopPropagation(); e.preventDefault();
      setOpen(side, e.clientX || undefined, e.clientY || undefined);
      // opened from its keyboard opener: focus moves to the first control of that side
      if (t.closest('[data-open-side]')) (side === 'drinks' ? spots.querySelector<HTMLElement>('.mb-spot:not([hidden])') : mt)?.focus({ preventScroll: true });
    }
  }, true);

  /* ── DRINKS: hotspots over the bar image (cover math matches object-fit + object-position) ── */
  const ph = document.getElementById('md-ph-bar')!;
  const spots = document.getElementById('mb-spots')!;
  const BW = +md.dataset.barW!, BH = +md.dataset.barH!, BY = +md.dataset.barY!;
  const placeSpots = () => {
    const W = ph.clientWidth, H = ph.clientHeight, s = Math.max(W / BW, H / BH), w = BW * s, h = BH * s;
    // CSS (container units, menu-doors.css) already sizes the box; this is only the fallback for browsers without cq units
    if (!CSS.supports('width', '1cqw')) spots.style.cssText = `left:${(W - w) / 2}px;top:${(H - h) * BY}px;width:${w}px;height:${h}px`;
    // labels near the screen edge open inward
    const mr = md.getBoundingClientRect();
    spots.querySelectorAll<HTMLElement>('.mb-spot').forEach((sp) => {
      const r = sp.getBoundingClientRect(), c = (r.left + r.width / 2 - mr.left) / mr.width;
      sp.hidden = c < 0.03 || c > 0.97; // a shelf cropped off this screen has no hotspot
      if (c > 0.72) sp.dataset.edge = 'r'; else if (c < 0.28) sp.dataset.edge = 'l'; else delete sp.dataset.edge;
    });
  };
  /* The FURSAT sign is part of the photo, so it moves with the crop. The tagline must never sit on it:
     the sign's box (measured on hero-bar-1400.webp, fractions of the photo) is mapped to the screen with the same cover math,
     grown by the slow zoom (1.05) and a margin, and the caption takes the first place that leaves it free. */
  const SIGN = { x0: 0.181, y0: 0.404, x1: 0.338, y1: 0.7 }, MARGIN = 14;
  function signBox() {
    const W = ph.clientWidth, H = ph.clientHeight, s = Math.max(W / BW, H / BH), w = BW * s, h = BH * s, ox = (W - w) / 2, oy = (H - h) * BY;
    const a = { l: ox + SIGN.x0 * w, t: oy + SIGN.y0 * h, r: ox + SIGN.x1 * w, b: oy + SIGN.y1 * h };
    const cx = W * 0.5, cy = H * 0.55, z = (v: number, c: number) => c + (v - c) * 1.05; // end of the drift animation (zoom origin 50% 55%)
    return { l: Math.min(a.l, z(a.l, cx)) - MARGIN, t: Math.min(a.t, z(a.t, cy)) - MARGIN, r: Math.max(a.r, z(a.r, cx)) + MARGIN, b: Math.max(a.b, z(a.b, cy)) + MARGIN };
  }
  const capParts = [...capB.querySelectorAll<HTMLElement>('.md-eyebrow,.md-hl,.md-sub,.md-btn')];
  const hit = (a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  function placeCap() {
    capB.dataset.placed = ''; // shown only once placed (menu-doors.css): its late move no longer counts as a layout shift
    if (open === 'food') return; // the Food side shows only the small "The Bar" tab; placed again when it closes
    const W = md.clientWidth, H = md.clientHeight, S = signBox();
    capB.removeAttribute('data-mode'); capB.removeAttribute('data-compact'); capB.style.removeProperty('--cap-x'); capB.style.removeProperty('--cap-w');
    if (vert()) {
      // phone / narrow tablet: the caption sits above the seam; if the sign is on the left, it moves to the right of the sign
      if (S.r > 0 && S.l < W * 0.5) { capB.dataset.mode = 'shift'; capB.style.setProperty('--cap-x', Math.min(S.r, W * 0.5) + 'px'); }
      return;
    }
    const XV = W * 0.35 - 8; // the narrowest the bar door gets while the seam follows the cursor
    const gap = parseFloat(getComputedStyle(capB).left) || 24;
    const fits = () => {
      const m = md.getBoundingClientRect();
      return capParts.every((e) => { const q = e.getBoundingClientRect(); if (!q.width && !q.height) return true; /* hidden (compact) */ const r = { l: q.left - m.left, t: q.top - m.top, r: q.right - m.left, b: q.bottom - m.top }; return r.t >= 0 && r.b <= H && r.r <= XV + 1 && !hit(r, S); });
    };
    const tries: [string, boolean | 'xs', number?, number?][] = [
      ['split', false], ['top', false], ['bottom', false],
      ['left', false, gap, S.l - gap], ['right', false, S.r, XV - S.r],
      ['split', true], ['top', true], ['bottom', true], ['left', true, gap, S.l - gap], ['right', true, S.r, XV - S.r], ['row', true], ['row', 'xs'],
    ];
    for (const [mode, compact, x, w] of tries) {
      if (x != null && w! < 200) continue; // a side column needs room
      capB.dataset.mode = mode;
      if (compact) capB.dataset.compact = compact === 'xs' ? 'xs' : ''; else capB.removeAttribute('data-compact');
      if (x != null) { capB.style.setProperty('--cap-x', x + 'px'); capB.style.setProperty('--cap-w', w + 'px'); }
      if (fits()) return;
    }
    capB.dataset.mode = 'split'; capB.dataset.compact = ''; capB.style.removeProperty('--cap-x'); capB.style.removeProperty('--cap-w'); // nothing fits: the smallest version
  }
  placeSpots();
  placeCap();
  if ('ResizeObserver' in window) { new ResizeObserver(placeSpots).observe(ph); new ResizeObserver(placeCap).observe(ph); }

  let passing = false;
  spots.addEventListener('click', (e) => {
    if (passing) return;
    const spot = (e.target as HTMLElement).closest<HTMLElement>('.mb-spot');
    if (!spot || open !== 'drinks') return; // first tap opens the side (handled above)
    e.stopPropagation();
    const go = () => { passing = true; spot.click(); passing = false; };
    if (reduce) { go(); return; }
    spot.classList.add('is-hot');
    // zoom the bar toward this shelf, then open its group
    const sr = spot.getBoundingClientRect(), pr = ph.getBoundingClientRect();
    ph.style.setProperty('--zx', ((sr.left + sr.width / 2 - pr.left) / pr.width) * 100 + '%');
    ph.style.setProperty('--zy', ((sr.top + sr.height / 2 - pr.top) / pr.height) * 100 + '%');
    const hex = spot.querySelector('.mb-hex')!;
    import('animejs').then(({ animate }) => animate(hex, { scale: [1.1, 1.35, 1.15], duration: 520, ease: 'outQuad' })); // loaded on the first tap, not with the page
    const z = ph.animate([{ scale: '1' }, { scale: '1.28' }], { duration: 560, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' });
    z.finished.then(() => {
      go();
      setTimeout(() => { z.cancel(); spot.classList.remove('is-hot'); }, 700);
    });
  });

  /* ── FOOD: the rotating table ── */
  const mt = document.getElementById('mt')!;
  const ring = document.getElementById('mt-ring')!;
  const dishes = [...ring.querySelectorAll<HTMLElement>('.mt-dish')];
  const N = dishes.length, STEP = 360 / N;
  const seeBtn = document.getElementById('mt-see')!;
  const lab = document.getElementById('mt-l')!, nm = document.getElementById('mt-n')!, pr = document.getElementById('mt-p')!;
  let angle = 0; // degrees; dish i is in front when angle = i * STEP
  let geo = { W: 0, H: 0, cx: 0, cy: 0, rx: 0, ry: 0, D: 0 };
  let front = -1;

  function measure() {
    const W = mt.clientWidth, H = mt.clientHeight;
    const ph = narrow.matches;
    let D = Math.max(56, Math.min(W * (ph ? 0.27 : 0.19), H * (ph ? 0.34 : 0.24)));
    const rx = W * (ph ? 0.38 : 0.41), ry = Math.min(H * (ph ? 0.13 : 0.14), rx * 0.3);
    // desktop: the caption (headline + "Full food menu") sits above the table; the table never rides up under it
    const capBottom = ph ? 0 : Math.max(0, capF.getBoundingClientRect().bottom - mt.getBoundingClientRect().top) + 10;
    if (capBottom) D = Math.max(56, Math.min(D, (H - 138 - capBottom - 2 * ry) / 0.77));
    // keep the front dish, its name (~50px) and the arrows (~70px) inside the panel
    let cy = Math.min(H * (ph ? 0.36 : 0.56), H - (ph ? 114 : 138) - ry - D * 0.32);
    if (capBottom) cy = Math.max(cy, capBottom + ry + D * 0.45);
    geo = { W, H, cx: W / 2, cy, rx, ry, D };
    mt.style.setProperty('--d', D + 'px');
    mt.style.setProperty('--cy', (cy / H) * 100 + '%');
    mt.style.setProperty('--tw', ((rx * 2 + D * 1.1) / W) * 100 + '%');
    mt.style.setProperty('--th', ((ry * 2 + D * 0.9) / H) * 100 + '%');
    // the front dish's name sits just under it
    mt.style.setProperty('--fy', Math.round(cy + ry - D * 0.18 + D / 2 + 10) + 'px');
  }
  function layout() {
    const { cx, cy, rx, ry, D } = geo;
    let best = 0, bestD = -2;
    dishes.forEach((d, i) => {
      const th = ((i * STEP - angle) * Math.PI) / 180;
      const depth = Math.cos(th); // 1 = front, -1 = back
      const k = (depth + 1) / 2;
      const s = Math.max(0.4 + 0.6 * Math.pow(k, 1.6), 44 / D); // rendered plate >= 44px (tap target)
      const x = cx + rx * Math.sin(th), y = cy + ry * depth;
      d.style.transform = `translate(${(x - D / 2).toFixed(1)}px,${(y - D / 2 - D * 0.18 * k).toFixed(1)}px) scale(${s.toFixed(3)})`;
      d.style.zIndex = String(Math.round(k * 100));
      d.style.opacity = (0.35 + 0.65 * k).toFixed(2);
      d.style.setProperty('--dim', k < 0.55 ? (0.4 - 0.5 * k).toFixed(2) : '0'); // back dishes darken by an overlay (opacity), not by a filter
      if (depth > bestD) { bestD = depth; best = i; }
    });
    if (best !== front) setFront(best);
  }
  function relayout() { measure(); layout(); }
  function setFront(i: number) {
    dishes[front]?.classList.remove('is-front');
    dishes[front]?.querySelector('video')?.remove();
    front = i;
    const d = dishes[i];
    d.classList.add('is-front');
    lab.textContent = d.dataset.label!; nm.textContent = d.dataset.title!; pr.textContent = d.dataset.price!;
    seeBtn.setAttribute('aria-label', `See dish: ${d.dataset.title}`);
    dishes.forEach((x, j) => x.querySelector('.mt-plate')!.setAttribute('aria-current', String(j === i)));
    // spin clip: plays on the front dish only, when the clip exists
    const clip = d.dataset.clip;
    if (clip && !reduce) {
      const v = Object.assign(document.createElement('video'), { src: clip, muted: true, loop: true, playsInline: true, autoplay: true });
      v.setAttribute('aria-hidden', 'true');
      v.addEventListener('playing', () => d.querySelector('.mt-drop img')?.setAttribute('hidden', ''), { once: true });
      v.addEventListener('error', () => v.remove(), { once: true });
      d.querySelector('.mt-drop')!.append(v);
      d.querySelector('.mt-drop img')?.removeAttribute('hidden');
    }
  }
  let spin: { stop: () => void } | null = null;
  const norm = (a: number) => Math.round(a / STEP) * STEP;
  function spinTo(target: number, velocity = 0) {
    spin?.stop();
    if (reduce) { angle = target; layout(); return; }
    spin = mAnimate(angle, target, { type: 'spring', stiffness: 150, damping: 22, velocity, onUpdate: (v: number) => { angle = v; layout(); } });
  }
  const goBy = (n: number) => { interacted(); spinTo(norm(angle) + n * STEP); };
  document.getElementById('mt-prev')!.addEventListener('click', (e) => { e.stopPropagation(); goBy(-1); });
  document.getElementById('mt-next')!.addEventListener('click', (e) => { e.stopPropagation(); goBy(1); });
  document.getElementById('mt-see')!.addEventListener('click', (e) => { e.stopPropagation(); interacted(); openDish(front); });
  mt.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goBy(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goBy(1); }
    // Enter / Space on the ring itself opens the front dish (buttons inside keep their own jobs)
    if ((e.key === 'Enter' || e.key === ' ') && e.target === mt) { e.preventDefault(); interacted(); if (open !== 'food') setOpen('food'); openDish(front); }
  });
  function openDish(i: number) {
    if (i < 0) return;
    document.dispatchEvent(new CustomEvent('mv:open', { detail: dishes[i].dataset.dn }));
  }

  // drag / swipe with momentum, then a spring snap to the nearest dish
  let drag: { id: number; x: number; a: number; t: number; v: number; moved: boolean } | null = null;
  mt.addEventListener('pointerdown', (e) => {
    if (open === 'drinks' || (e.target as HTMLElement).closest('.mt-nav')) return;
    spin?.stop();
    drag = { id: e.pointerId, x: e.clientX, a: angle, t: performance.now(), v: 0, moved: false };
  });
  mt.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; mt.setPointerCapture(e.pointerId); interacted(); }
    if (!drag.moved) return;
    const degPerPx = STEP / Math.max(60, geo.rx * 0.6);
    const now = performance.now(), na = drag.a - dx * degPerPx;
    drag.v = ((na - angle) / Math.max(1, now - drag.t)) * 1000; drag.t = now;
    angle = na; layout();
  });
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.moved) { dragged = performance.now(); spinTo(norm(angle + d.v * 0.18), d.v); return; }
    // a tap: the front dish opens; another dish turns to the front
    const li = (e.target as HTMLElement).closest<HTMLElement>('.mt-dish');
    if (!li || open !== 'food') return; // a closed side opens first (capture click handler)
    interacted();
    const i = +li.dataset.i!;
    if (i === front) openDish(i);
    else { const delta = ((((i * STEP - angle) % 360) + 540) % 360) - 180; spinTo(norm(angle + delta)); }
  };
  mt.addEventListener('pointerup', end);
  mt.addEventListener('pointercancel', () => { drag = null; });
  mt.addEventListener('dragstart', (e) => e.preventDefault());

  // gentle turn every 4.5 s until the guest touches the table
  let auto = 0, touched = false, visible = false;
  function interacted() { touched = true; clearInterval(auto); }
  function wake() {
    if (reduce || touched || auto) return;
    auto = window.setInterval(() => { if (visible && !drag && !document.hidden && open !== 'drinks') spinTo(norm(angle) + STEP); }, 4500);
  }

  relayout();
  box = { L: md.getBoundingClientRect().left, W: md.clientWidth, H: md.clientHeight };
  paint();
  if ('ResizeObserver' in window) {
    // the table is measured again only when its box really changed (a side opened / closed, or the window resized)
    new ResizeObserver(() => { if (mt.clientWidth !== geo.W || mt.clientHeight !== geo.H) relayout(); }).observe(mt);
    new ResizeObserver(() => { box = { L: md.getBoundingClientRect().left, W: md.clientWidth, H: md.clientHeight }; paint(); }).observe(md);
  }
  narrow.addEventListener('change', () => { box = { L: md.getBoundingClientRect().left, W: md.clientWidth, H: md.clientHeight }; paint(); });

  layout();
  inView(mt, () => { visible = true; wake(); return () => { visible = false; }; }, { amount: 0.3 });
}
