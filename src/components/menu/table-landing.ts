// /menu Phase 3: the dishes leave the food door and land on the real table photo as the page scrolls (prototype 02).
// One scroll-linked rAF loop. After load it only writes transform + opacity (plates, shadows) and toggles a class when a plate lands.
// Layout is read on load and on resize only, never per frame. Each plate starts exactly where its plate sits on the food door
// (read from #mt-ring), the door copy hides while the flyer travels, and comes back when the page returns to the top.
// Reduced motion / no script: nothing moves, the plates are already on the table (the CSS default).
const root = document.getElementById('tl');

type Pt = { x: number; y: number; s: number };
type Slot = { el: HTMLElement; plate: HTMLElement; shadow: HTMLElement; drop: HTMLElement; title: string; cx: number; cy: number; d: number; landed: boolean };
type Start = { x: number; y: number; w: number; o: number };

// Where the plates sit on the table photo. Coordinates are in the photo's own 720 x 960 frame (all three sizes share the 3:4 ratio);
// s = perspective, the far end of the table is smaller. Phones show a narrower slice of the photo, so they get 4 closer plates.
const IMG = { w: 720, h: 960, band: 640 };
const WIDE: Pt[] = [{ x: 90, y: 650, s: 1 }, { x: 190, y: 628, s: 0.9 }, { x: 300, y: 604, s: 0.8 }, { x: 410, y: 580, s: 0.7 }, { x: 520, y: 556, s: 0.62 }];
const NARROW: Pt[] = [{ x: 85, y: 651, s: 1 }, { x: 185, y: 629, s: 0.9 }, { x: 285, y: 607, s: 0.8 }, { x: 385, y: 585, s: 0.7 }];
const BASE_D = { wide: 104, narrow: 100 }; // plate size at s = 1, in photo pixels
const LAG = 0.06; // each plate leaves a little after the one before
const A = 8; // scroll px where the hand-off starts (the door's own float has stopped by then)

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function init(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('#tl-stage')!;
  const img = root.querySelector<HTMLImageElement>('.tl-bg img')!;
  const legend = root.querySelector<HTMLElement>('.tl-legend');
  const md = document.getElementById('md');
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowQ = matchMedia('(max-width: 820px)');
  root.classList.add('tl--js');

  const slots: Slot[] = [...root.querySelectorAll<HTMLElement>('.tl-spot')].map((el) => ({
    el, plate: el.querySelector<HTMLElement>('.tl-plate')!, shadow: el.querySelector<HTMLElement>('.tl-shadow')!, drop: el.querySelector<HTMLElement>('.tl-drop')!,
    title: el.dataset.title || '', cx: 0, cy: 0, d: 100, landed: true,
  }));
  const n = slots.length;
  const spin = slots.map((_, i) => (i % 2 ? 14 : -14));
  const swing = slots.map((_, i) => (i % 2 ? 1 : -1));
  const doorDish = (title: string) => [...(md?.querySelectorAll<HTMLElement>('.mt-dish') ?? [])].find((li) => li.dataset.title === title) ?? null;

  // geometry, cached (document coordinates; read on load and resize only)
  let still = reduceQ.matches, active = 0, tlTop = 0, trackH = 0, stageH = 0, stageL = 0, B = 1;
  let starts: Start[] = [];
  let doorLis: (HTMLElement | null)[] = [];
  let flying = false, lastP = -1, raf = 0;

  // 1) put the plates on the table: same cover math as object-fit, so each plate sits on its place in the photo
  function place() {
    const W = stage.clientWidth, H = stage.clientHeight, nw = narrowQ.matches;
    const pts = nw ? NARROW : WIDE;
    const sc = Math.max(W / IMG.w, H / IMG.h), iw = IMG.w * sc, ih = IMG.h * sc;
    // keep the table band at ~60% (52% on phones) of the stage; on phones also centre the plates horizontally
    const py = ih > H ? clamp(((nw ? 0.52 : 0.6) * H - IMG.band * sc) / (H - ih)) : 0.5;
    const mid = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const px = iw > W ? clamp(nw ? (-(mid - W / (2 * sc)) * sc) / (W - iw) : 0.5) : 0.5;
    img.style.objectPosition = `${(px * 100).toFixed(2)}% ${(py * 100).toFixed(2)}%`;
    active = Math.min(n, pts.length);
    slots.forEach((s, i) => {
      s.el.hidden = i >= active;
      legend?.children[i]?.toggleAttribute('hidden', i >= active);
      if (i >= active) return;
      const p = pts[i], d = Math.max(56, (nw ? BASE_D.narrow : BASE_D.wide) * p.s * sc);
      s.cx = (W - iw) * px + p.x * sc; s.cy = (H - ih) * py + p.y * sc; s.d = d;
      s.el.style.setProperty('--x', s.cx.toFixed(1) + 'px'); s.el.style.setProperty('--y', s.cy.toFixed(1) + 'px'); s.el.style.setProperty('--d', d.toFixed(1) + 'px');
    });
  }

  // 2) scroll geometry: the track top, the pinned length, and where (scroll px) the last plate has landed
  function measure() {
    place();
    tlTop = root!.getBoundingClientRect().top + scrollY;
    trackH = root!.offsetHeight; stageH = stage.offsetHeight; stageL = stage.getBoundingClientRect().left;
    const pin = Math.max(0, trackH - stageH);
    B = Math.max(A + 200, tlTop + pin * (narrowQ.matches ? 0.25 : 0.4)); // landed a little after the stage pins, then a short rest
    lastP = -1;
    schedule();
  }

  // 3) hand-off: each flyer starts where its dish sits on the door right now (document coordinates)
  function capture() {
    const mr = md?.getBoundingClientRect();
    doorLis = slots.map((s) => doorDish(s.title));
    starts = slots.map((s, i) => {
      const r = doorLis[i]?.getBoundingClientRect();
      if (r && r.width > 8) return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY, w: r.width, o: parseFloat(doorLis[i]!.style.opacity) || 1 };
      // no door table on the page: spread the starts over the food side of the doors, else just above the track
      if (mr) return { x: mr.left + mr.width * (0.56 + 0.09 * i) + scrollX, y: mr.top + mr.height * 0.45 + scrollY, w: Math.min(150, mr.width * 0.14), o: 1 };
      return { x: stageL + stage.clientWidth * (0.3 + 0.1 * i), y: tlTop - 200, w: 120, o: 1 };
    });
    doorLis.forEach((li) => li && (li.style.visibility = 'hidden')); // the flyer takes over from the door copy
  }
  function release() {
    doorLis.forEach((li) => li && (li.style.visibility = ''));
    slots.forEach((s, i) => { s.plate.style.transform = ''; s.plate.style.opacity = i < active ? '0' : ''; s.shadow.style.opacity = '0'; s.shadow.style.transform = ''; setLanded(s, false); });
    flying = false;
  }
  function setLanded(s: Slot, on: boolean) {
    if (s.landed === on) return;
    s.landed = on; s.el.classList.toggle('is-landed', on);
    if (on && !still) {
      // a small squash as it touches the table, and a ring that spreads (transform + opacity only)
      s.drop.animate({ scale: ['1 .88', '1 1.05', '1 1'] }, { duration: 460, easing: 'cubic-bezier(.23,1,.32,1)' });
      s.el.querySelector('.tl-ring--solid')?.animate({ transform: ['scale(.92)', 'scale(1.3)'], opacity: [.9, 0] }, { duration: 800, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }

  // 4) the loop: scroll position -> progress -> each plate's transform + opacity
  function frame() {
    raf = 0;
    if (still) return;
    const sy = scrollY, p = clamp((sy - A) / (B - A));
    if (p <= 0) { if (flying || lastP !== 0) { release(); lastP = 0; } return; }
    if (!flying) { capture(); flying = true; }
    if (p >= 1 && lastP >= 1) return; // landed: the plates ride the pinned stage by themselves
    lastP = p;
    // where the sticky stage is on screen right now, from cached numbers (no layout read)
    const top = Math.min(Math.max(tlTop - sy, 0), tlTop + trackH - stageH - sy);
    const span = 1 - (active - 1) * LAG;
    for (let i = 0; i < active; i++) {
      const s = slots[i], st = starts[i], q = clamp((p - i * LAG) / span), e = ease(q), ey = e * (0.35 + 0.65 * e);
      if (q >= 1) { s.plate.style.transform = ''; s.plate.style.opacity = '1'; s.shadow.style.transform = ''; s.shadow.style.opacity = '1'; setLanded(s, true); continue; }
      const dx = (st.x - (stageL + s.cx)) * (1 - e) + Math.sin(Math.PI * q) * swing[i] * stage.clientWidth * 0.04;
      const dy = (st.y - sy - (top + s.cy)) * (1 - ey);
      const sc = (st.w / s.d) * (1 - e) + e, rot = (1 - e) * spin[i] + Math.sin(Math.PI * e) * swing[i] * -8;
      s.plate.style.transform = `translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      s.plate.style.opacity = (st.o + (1 - st.o) * clamp(q * 4)).toFixed(2);
      // the shadow waits on the table: wide and faint while the plate is high, tight and dark as it lands
      s.shadow.style.opacity = (0.12 + 0.88 * e * e).toFixed(2);
      s.shadow.style.transform = `scale(${(1.5 - 0.5 * e).toFixed(3)})`;
      setLanded(s, false);
    }
  }
  function schedule() { if (!raf && !still) raf = requestAnimationFrame(frame); }

  // reduced motion (also if it is switched while the page is open): plates placed, nothing moves
  function mode() {
    still = reduceQ.matches;
    root!.classList.toggle('tl--still', still);
    if (flying) release();
    slots.forEach((s) => {
      s.plate.style.transform = ''; s.shadow.style.transform = '';
      s.plate.style.opacity = s.shadow.style.opacity = still ? '' : '0';
      s.landed = still; s.el.classList.toggle('is-landed', still);
    });
    lastP = -1;
    measure();
  }
  reduceQ.addEventListener('change', mode);
  narrowQ.addEventListener('change', measure);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('load', measure);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    if (md) ro.observe(md); // a late layout change above the track (fonts, images) moves tlTop
  }
  // decode the table photo and the plates while the guest is still on the doors: their first paint (a 1200 x 1600 photo, five 640 px plates)
  // would otherwise land on the frame where the flight starts
  const warm = () => [img, ...slots.map((s) => s.drop.querySelector('img'))].forEach((im) => { if (im) { im.loading = 'eager'; im.decode().catch(() => {}); } });
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2000 }); else setTimeout(warm, 600);
  mode();
}

if (root) init(root);
