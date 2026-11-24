// fe-swipe.js: swipe-to-send for every send / continue / next button (Home popup, Reserve, Banquet, Catering, Party builder).
// One delegated listener set, installed once. It injects its own small stylesheet, so any page can import it.
//  - tap: the arrow circle slides right -> left across the button (transform only, 350ms, cubic-bezier(.2,0,0,1)) while the label fades.
//         Send buttons keep their original handler inside the tap (window.open / link click untouched); the slide plays beside it.
//         Continue / next buttons run their handler when the slide ends.
//  - touch: dragging the circle follows the finger, fires at 60% of the travel, springs back if released early.
//  - aria-disabled / disabled buttons never slide (their own handler shakes + shows the hint).
//  - double tap = one action (lock window).
if (typeof window !== 'undefined' && !window.__feSwipe) {
  window.__feSwipe = 1;
  const CHIP = '.fe-go-chip, .fl-chip, .rs-cta-chip, .pk-chip';
  const BTN = '.fe-go, .fl-go.pb-wa, .rs-submit, .pk-wa[data-sw]';
  const SEND = '.fe-go--wa, .fl-go.pb-wa, .rs-submit, .pk-wa[data-sw]';
  const MS = 350, FAST = 180;
  const css = `
${BTN}{position:relative}
${CHIP}{transform:translate3d(var(--sw-x,0px),0,0);touch-action:pan-y;will-change:transform}
.sw-go :is(${CHIP}){transition:transform var(--sw-d,${MS}ms) cubic-bezier(.2,0,0,1)}
.sw-back :is(${CHIP}){transition:transform 350ms cubic-bezier(.34,1.3,.64,1)}
.sw-go>:not(:is(${CHIP})){opacity:0;transition:opacity 200ms ease}
.sw-drag>:not(:is(${CHIP})){opacity:calc(1 - var(--sw-p,0));transition:none}
.sw-back>:not(:is(${CHIP})){transition:opacity 250ms ease}
.sw-in>:not(:is(${CHIP})){animation:sw-in 180ms ease both}
@keyframes sw-in{from{opacity:0}to{opacity:1}}
.pk-wa[data-sw]{min-height:44px;white-space:nowrap;align-items:center}
.pk-chip{flex:none;display:grid;place-items:center;width:30px;height:30px;margin-left:4px;border-radius:50%;background:#fff;color:#1a5d23;-webkit-user-select:none;user-select:none}
.pk-chip svg{width:15px;height:15px}`;
  const st = document.createElement('style'); st.id = 'fe-swipe-css'; st.textContent = css; document.head.appendChild(st);

  const now = () => performance.now();
  const dis = (b) => b.disabled || b.getAttribute('aria-disabled') === 'true';
  const isSend = (b) => b.matches(SEND);
  const committed = (b) => b.matches('.pb-wa') || b.classList.contains('is-busy') || b.classList.contains('is-sent');
  const block = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
  let swallow = 0, G = null;

  /* distance the circle travels: from its right-edge spot to the same gap on the left (offsets, so a pressed .96 scale does not skew it) */
  const travelOf = (b) => {
    const c = b.querySelector(CHIP); if (!c) return 0;
    const inset = b.clientWidth - (c.offsetLeft + c.offsetWidth);
    return Math.max(0, c.offsetLeft - inset);
  };
  const vars = (b, x, p, d) => { b.style.setProperty('--sw-x', x + 'px'); b.style.setProperty('--sw-p', String(p)); if (d) b.style.setProperty('--sw-d', d + 'ms'); };
  const clear = (b) => { b.classList.remove('sw-go', 'sw-drag', 'sw-back'); ['--sw-x', '--sw-p', '--sw-d'].forEach((k) => b.style.removeProperty(k)); };
  const slide = (b, t, d) => { b.classList.remove('sw-back', 'sw-drag'); b.classList.add('sw-go'); vars(b, -t, 1, d || MS); };
  const springBack = (b) => {
    b.classList.remove('sw-go', 'sw-drag'); b.classList.add('sw-back'); vars(b, 0, 0);
    setTimeout(() => { if (b.classList.contains('sw-back')) clear(b); }, 420);
  };
  /* send: the circle is home again and the busy state (spinner / "Opening WhatsApp…" / tick) fades in */
  const settle = (b) => { clear(b); b.classList.add('sw-in'); setTimeout(() => b.classList.remove('sw-in'), 220); };
  /* continue / next: run the original handler, then reset (or spring back if the step did not change, e.g. validation) */
  const runNext = (b, d) => {
    b.__lock = now() + 1200;
    setTimeout(() => {
      b.__go = true; try { b.click(); } finally { b.__go = false; }
      setTimeout(() => {
        const s = b.closest('.fe-step');
        if (s && s.classList.contains('is-active')) { b.__lock = 0; springBack(b); }
        else setTimeout(() => { clear(b); b.__lock = 0; }, 340);
      }, 0);
    }, d);
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest(BTN);
    if (!b || b.__go || dis(b)) return;
    const t = now();
    if ((t < swallow && !b.__drag) || (b.__lock && t < b.__lock)) { block(e); return; }
    const tr = travelOf(b); if (!tr) return;
    b.__lock = t + 900;
    if (isSend(b)) {
      const d = b.__drag ? FAST : MS;
      if (!b.__drag) slide(b, tr);
      /* after the original handlers (and a submit event) ran: slide only if the send really started */
      setTimeout(() => {
        if (!committed(b)) { b.__lock = 0; springBack(b); return; }
        b.__lock = now() + 1600;
        setTimeout(() => settle(b), d);
      }, 0);
    } else {
      block(e);
      const d = b.__drag ? FAST : MS;
      if (!b.__drag) slide(b, tr);
      runNext(b, d);
    }
  }, true);

  /* touch / pen: drag the arrow circle */
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.button) return;
    const c = e.target.closest && e.target.closest(CHIP), b = c && c.closest(BTN);
    if (!b || dis(b) || (b.__lock && now() < b.__lock)) return;
    const t = travelOf(b); if (t < 40) return;
    G = { b, c, id: e.pointerId, x0: e.clientX, t, dx: 0, on: false };
    try { c.setPointerCapture(e.pointerId); } catch (_) {}
  }, true);
  addEventListener('pointermove', (e) => {
    if (!G || e.pointerId !== G.id) return;
    const dx = Math.max(-G.t, Math.min(0, e.clientX - G.x0));
    if (!G.on) { if (Math.abs(dx) < 6) return; G.on = true; G.b.classList.remove('sw-back', 'sw-go'); G.b.classList.add('sw-drag'); }
    G.dx = dx; vars(G.b, dx, Math.abs(dx) / G.t);
  }, true);
  const up = (e) => {
    if (!G || e.pointerId !== G.id) return;
    const g = G, b = g.b; G = null;
    if (!g.on) return; /* a plain tap: the click path handles it */
    swallow = now() + 450; /* the click the browser may add after a drag is ignored */
    if (e.type === 'pointerup' && -g.dx >= g.t * 0.6) {
      slide(b, g.t, FAST);
      if (isSend(b)) { b.__drag = true; try { b.click(); } finally { b.__drag = false; } }
      else { b.__drag = true; b.__lock = now() + 1200; runNext(b, FAST); b.__drag = false; }
    } else springBack(b);
  };
  addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}
