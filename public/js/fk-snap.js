/* fk-snap.js: full-section snapping, reusable on any page.
   One gesture (wheel notch, trackpad swipe, touch swipe, Page Down / Space / arrows) = one section.
   Use: mark sections with data-snap="Label", add <script src="/js/fk-snap.js" defer></script>.
   Attributes on a section:
     data-snap="Label"   snap point (the label shows on its side dot)
     data-snap-nodot     snap point without a side dot (it shares the previous dot)
     data-snap-min="768" only a snap point when the viewport is at least that wide
     data-snap-last      last snap point: tall content scrolls freely, then the page scrolls normally
   Script tag option: data-block="css selector" = extra "something is open" selector that pauses snapping.
   A section taller than the screen scrolls freely once its top is reached; snapping resumes at its edges.
   Off for: reduced motion, screens shorter than 420px, a focused text field, any open dialog or sheet. */
(function () {
  'use strict';
  if (window.fkSnap) return;
  var d = document, w = window, root = d.documentElement;
  var self = d.currentScript;
  var BLOCK = 'dialog[open],html.fk-sheet-open,#sh-mobile-panel:not([hidden])' + (self && self.getAttribute('data-block') ? ',' + self.getAttribute('data-block') : '');
  var IDLE = 120, GAP = 400, THRESH = 36, TOUCH_MIN = 48;
  var CSS_EASE = 'cubic-bezier(.77,0,.175,1)';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var anim = null, tick = 0, nav = null, bar = null, dots = [];
  var g = { last: 0, abs: 0, acc: 0, dir: 0, fired: false, free: false };
  var tc = null;

  /* cubic-bezier(.77,0,.175,1) = the kit's --ease-in-out, solved for the scroll position */
  var EASE = (function () {
    var x1 = .77, y1 = 0, x2 = .175, y2 = 1;
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var sx = function (t) { return ((ax * t + bx) * t + cx) * t; };
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) { var e = sx(t) - x; if (Math.abs(e) < 1e-5) break; if (e > 0) hi = t; else lo = t; t = (lo + hi) / 2; }
      return ((ay * t + by) * t + cy) * t;
    };
  })();

  /* html has scroll-behavior:smooth on this site: every programmatic jump must be instant */
  /* On desktop this site scrolls <body>, not the window (07.css sets html,body{overflow:hidden;height:100%} and body scrolls).
     Pick the real scroller every time so snapping works on both layouts. */
  function scroller() {
    var b = d.body;
    if (b && getComputedStyle(root).overflowY === 'hidden' && b.scrollHeight > b.clientHeight + 1 && getComputedStyle(b).overflowY !== 'hidden') return b;
    return null;
  }
  function getY() { var sc = scroller(); return sc ? sc.scrollTop : w.scrollY; }
  function maxY() { var sc = scroller(); return sc ? sc.scrollHeight - sc.clientHeight : root.scrollHeight - w.innerHeight; }
  function jump(y) { var sc = scroller(); if (sc) { sc.style.scrollBehavior = 'auto'; sc.scrollTop = y; } else w.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
  function shH() { return parseFloat(getComputedStyle(root).getPropertyValue('--sh-h')) || 0; }

  /* positions are read fresh each time (a handful of rects): nothing goes stale after a resize or a late image */
  function layout() {
    var vw = w.innerWidth, vh = w.innerHeight, y = getY(), H = shH();
    var els = [].slice.call(d.querySelectorAll('[data-snap]')).filter(function (e) { var m = +e.getAttribute('data-snap-min'); return !m || vw >= m; });
    var cut = -1; els.some(function (e, i) { if (e.hasAttribute('data-snap-last')) { cut = i; return true; } });
    if (cut >= 0) els = els.slice(0, cut + 1);
    var tops = els.map(function (e) { return e.getBoundingClientRect().top + y; });
    return els.map(function (e, i) {
      var off = i === 0 && tops[0] < 40 ? 0 : H;
      var end = i < els.length - 1 ? tops[i + 1] : e.getBoundingClientRect().bottom + y;
      var target = Math.max(0, tops[i] - off), avail = vh - off;
      var tall = end - tops[i] - avail > Math.min(.18 * vh, 120);
      return { el: e, target: target, tall: tall, limit: tall ? Math.max(target, end - vh) : target, last: i === els.length - 1, nodot: e.hasAttribute('data-snap-nodot'), label: e.getAttribute('data-snap') };
    });
  }
  function idxAt(y, L) { var i = 0; for (var k = 0; k < L.length; k++) if (y >= L[k].target - 2) i = k; return i; }

  /* what should one step in direction dir do from scroll position y? */
  function decide(dir, y, L) {
    var i = idxAt(y, L), s = L[i];
    if (dir > 0) {
      if (s.tall && y < s.limit - 2) return { t: 'free', max: s.last ? Infinity : s.limit };
      if (s.last) return { t: 'none' };
      return { t: 'snap', to: L[i + 1].target };
    }
    if (y > s.target + 2) return s.tall || s.last ? { t: 'free', min: s.target } : { t: 'snap', to: s.target };
    if (!i) return { t: 'none' };
    var p = L[i - 1];
    return { t: 'snap', to: p.tall ? p.limit : p.target };
  }

  function supported() { return !reduce.matches && w.innerHeight >= 420 && d.querySelectorAll('[data-snap]').length > 1; }
  function dialogOpen() { return !!d.querySelector(BLOCK) || root.style.overflow === 'hidden'; }
  function fieldFocused() {
    var a = d.activeElement; if (!a || a === d.body) return false;
    if (a.isContentEditable || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') return true;
    return a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|range|image|file)$/.test(a.type);
  }
  function enabled() { return supported() && !dialogOpen() && !fieldFocused(); }

  /* an inner scroller (sheet, textarea, list) that can still move keeps the gesture */
  function innerScroll(el, dir) {
    for (; el && el !== d.body && el !== root; el = el.parentElement) {
      if (el.scrollHeight - el.clientHeight < 40) continue; /* a sideways rail with a few px of vertical slack is not a vertical scroller */
      var oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll') continue;
      if (dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
    return false;
  }

  /* incoming section: slides up + scales .98 -> 1 + fades in; outgoing: dims a little. transform/opacity only */
  function fx(el, dir, dur, incoming) {
    if (!el.animate) return;
    el.animate(incoming
      ? [{ opacity: .55, transform: 'translate3d(0,' + dir * 28 + 'px,0) scale(.98)', transformOrigin: '50% 0' }, { opacity: 1, transform: 'none', transformOrigin: '50% 0' }]
      : [{ opacity: 1 }, { opacity: .7, offset: .5 }, { opacity: 1 }], { duration: dur, easing: CSS_EASE });
  }

  function go(to) {
    var y = getY(), max = maxY();
    to = Math.max(0, Math.min(to, max));
    if (anim || Math.abs(to - y) < 2) return;
    if (reduce.matches) { jump(to); sync(); return; }
    var L = layout(), a = idxAt(y, L), b = idxAt(to, L), dir = to > y ? 1 : -1;
    var dur = Math.max(700, Math.min(900, 560 + Math.abs(to - y) * .22)), t0 = performance.now();
    root.classList.add('fk-snap-run');
    if (L[a] && L[b] && a !== b) { fx(L[b].el, dir, dur, true); fx(L[a].el, dir, dur, false); }
    anim = true;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      jump(y + (to - y) * EASE(p));
      if (p < 1) requestAnimationFrame(step);
      else { anim = null; root.classList.remove('fk-snap-run'); sync(); }
    })(t0);
  }

  function onWheel(e) {
    if (e.ctrlKey || e.defaultPrevented || !enabled()) return;
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * w.innerHeight : e.deltaY;
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
    /* a new gesture = a pause, or a longer gap with a harder push (a trackpad tail only gets weaker) */
    var now = performance.now(), ady = Math.abs(dy), gap = now - g.last;
    if (gap > GAP || (gap > IDLE && ady > g.abs + 2)) { g.acc = 0; g.fired = false; g.free = false; }
    g.last = now; g.abs = ady;
    var dir = dy > 0 ? 1 : -1;
    if (anim) { e.preventDefault(); return; }
    if (innerScroll(e.target, dir)) return;
    var y = getY(), dec = decide(dir, y, layout());
    if (dec.t === 'none') return;
    if (dec.t === 'free') {
      g.free = true;
      if (dy > 0 && y + dy > dec.max) { e.preventDefault(); jump(dec.max); }
      else if (dy < 0 && y + dy < dec.min) { e.preventDefault(); jump(dec.min); }
      return;
    }
    e.preventDefault();
    if (g.fired || g.free) return;
    if (g.dir !== dir) { g.dir = dir; g.acc = 0; }
    g.acc += Math.abs(dy);
    if (g.acc >= THRESH) { g.fired = true; go(dec.to); }
  }

  function onTouchStart(e) {
    tc = null;
    if (e.touches.length !== 1 || anim || !enabled()) return;
    tc = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), axis: '', free: false, snap: null, dy: 0 };
  }
  function onTouchMove(e) {
    if (!tc) return;
    if (anim) { if (e.cancelable) e.preventDefault(); return; }
    var dx = tc.x - e.touches[0].clientX, dy = tc.y - e.touches[0].clientY;
    if (!tc.axis) { if (Math.hypot(dx, dy) < 4) return; tc.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'; }
    if (tc.axis !== 'y' || tc.free) return;
    tc.dy = dy;
    var dir = dy > 0 ? 1 : -1;
    if (innerScroll(e.target, dir)) { tc.free = true; return; }
    var dec = decide(dir, getY(), layout());
    if (dec.t !== 'snap') { tc.free = true; tc.snap = null; return; }
    if (e.cancelable) e.preventDefault();
    tc.snap = dec;
  }
  function onTouchEnd() {
    if (tc && tc.snap && !tc.free) {
      var dist = Math.abs(tc.dy), v = dist / Math.max(1, performance.now() - tc.t);
      if (dist >= TOUCH_MIN || (dist > 18 && v > .35)) go(tc.snap.to);
    }
    tc = null;
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !enabled()) return;
    var t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,button,summary,[contenteditable],[role=radio],[role=slider],[role=tab],[role=listbox],[role=menu]')) return;
    var k = e.key;
    if (k === 'Home') { if (getY() > 2) { e.preventDefault(); go(0); } return; }
    var dir = k === 'PageDown' || k === 'ArrowDown' || (k === ' ' && !e.shiftKey) ? 1 : k === 'PageUp' || k === 'ArrowUp' || (k === ' ' && e.shiftKey) ? -1 : 0;
    if (!dir) return;
    if (anim) { e.preventDefault(); return; }
    var dec = decide(dir, getY(), layout());
    if (dec.t !== 'snap') return;
    e.preventDefault();
    if (!e.repeat) go(dec.to);
  }

  /* links to #id inside a snap section use the same transition (and keep the header offset) */
  function sectionOf(id) {
    var t = id && d.getElementById(id), s = t && t.closest('[data-snap]');
    return s && layout().filter(function (x) { return x.el === s; })[0];
  }
  /* jump to the snap section holding el (same transition, hash kept). false = not handled: use normal scrolling */
  function goTo(el) {
    var s = supported() && el && sectionOf(el.id);
    if (!s) return false;
    if (location.hash !== '#' + el.id) history.pushState(null, '', '#' + el.id);
    go(s.target);
    return true;
  }
  function onClick(e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && a.getAttribute('href').length > 1 && goTo(d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))))) e.preventDefault();
  }
  function onHash() {
    if (!supported()) return;
    var s = sectionOf(decodeURIComponent(location.hash.slice(1)));
    go(s ? s.target : 0);
  }

  /* side dots (desktop + tablet) and a thin progress bar (phone) */
  function build() {
    var st = d.createElement('style');
    st.textContent =
      'html.fk-snap-run{scroll-behavior:auto!important}html.fk-snap-on{overscroll-behavior-y:none}' +
      '[data-snap],[data-snap] [id]{scroll-margin-top:calc(var(--sh-h,0px) + 4px)}' +
      '.fk-snap-dots{position:fixed;right:max(4px,env(safe-area-inset-right));top:50%;translate:0 -50%;z-index:900;display:none;flex-direction:column;transition:opacity .2s}' +
      '.fk-snap-dots.is-off{opacity:0;pointer-events:none;visibility:hidden}' +
      '.fk-snap-dots button{position:relative;width:44px;height:44px;border:0;padding:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '.fk-snap-dots button::before{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fcf7f0;border:1.5px solid rgba(27,58,38,.7);box-shadow:0 0 0 1px rgba(252,247,240,.8);transition:transform .2s,background-color .2s,border-color .2s}' +
      '.fk-snap-dots button.is-on::before{background:var(--fk-gold,#c99a43);border-color:#8a6420;transform:scale(1.35)}' +
      '.fk-snap-lab{position:absolute;right:38px;top:50%;translate:6px -50%;padding:5px 11px;border-radius:999px;background:#fcf7f0;border:1px solid #c99a43;color:#1b3a26;font:600 12px/1.2 var(--fk-sans,Poppins,sans-serif);white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s,translate .15s}' +
      '.fk-snap-dots button:hover .fk-snap-lab,.fk-snap-dots button:focus-visible .fk-snap-lab{opacity:1;translate:0 -50%}' +
      '.fk-snap-dots button:focus-visible{outline:2px solid #2a5019;outline-offset:-6px;border-radius:50%}' +
      '.fk-snap-bar{position:fixed;left:0;right:0;top:0;height:3px;z-index:9100;pointer-events:none;display:none;transition:opacity .2s}' +
      '.fk-snap-bar.is-off{opacity:0}' +
      '.fk-snap-bar i{display:block;height:100%;background:linear-gradient(90deg,#b98a35,#f3c56b);transform:scaleX(0);transform-origin:0 50%}' +
      '@media(min-width:768px){.fk-snap-dots{display:flex}}@media(max-width:767px){.fk-snap-bar{display:block}}';
    d.head.appendChild(st);
    nav = d.createElement('nav'); nav.className = 'fk-snap-dots is-off'; nav.setAttribute('aria-label', 'Page sections');
    [].slice.call(d.querySelectorAll('[data-snap]:not([data-snap-nodot])')).forEach(function (el) {
      var b = d.createElement('button'), lab = el.getAttribute('data-snap');
      b.type = 'button'; b.setAttribute('aria-label', lab);
      b.innerHTML = '<span class="fk-snap-lab"></span>'; b.firstChild.textContent = lab;
      b.addEventListener('click', function () { var s = layout().filter(function (x) { return x.el === el; })[0]; if (s) go(s.target); });
      nav.appendChild(b); dots.push({ el: el, b: b });
    });
    bar = d.createElement('div'); bar.className = 'fk-snap-bar is-off'; bar.setAttribute('aria-hidden', 'true'); bar.appendChild(d.createElement('i'));
    d.body.appendChild(nav); d.body.appendChild(bar);
  }

  function paint() {
    tick = 0;
    var sup = supported(), L = sup ? layout() : [], y = getY();
    root.classList.toggle('fk-snap-on', sup);
    if (!L.length) { nav.classList.add('is-off'); bar.classList.add('is-off'); return; }
    var i = idxAt(y, L), j = i; while (j > 0 && L[j].nodot) j--;
    var last = L[L.length - 1], inRange = y <= last.limit + 40, shown = !dialogOpen() && inRange;
    dots.forEach(function (o) { var on = o.el === L[j].el; o.b.classList.toggle('is-on', on); if (on) o.b.setAttribute('aria-current', 'true'); else o.b.removeAttribute('aria-current'); });
    nav.classList.toggle('is-off', !shown); bar.classList.toggle('is-off', !shown);
    bar.firstChild.style.transform = 'scaleX(' + Math.max(0, Math.min(1, (y - L[0].target) / Math.max(1, last.limit - L[0].target))) + ')';
  }
  function sync() { if (!tick) tick = requestAnimationFrame(paint); }

  function init() {
    if (d.querySelectorAll('[data-snap]').length < 2) return;
    build();
    w.addEventListener('wheel', onWheel, { passive: false });
    d.addEventListener('touchstart', onTouchStart, { passive: true });
    d.addEventListener('touchmove', onTouchMove, { passive: false });
    d.addEventListener('touchend', onTouchEnd, { passive: true });
    d.addEventListener('touchcancel', onTouchEnd, { passive: true });
    d.addEventListener('keydown', onKey);
    d.addEventListener('click', onClick);
    w.addEventListener('hashchange', onHash);
    w.addEventListener('scroll', sync, { passive: true });
    if (d.body) d.body.addEventListener('scroll', sync, { passive: true });
    w.addEventListener('resize', sync);
    reduce.addEventListener('change', sync);
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var open = function () { var s = location.hash.length > 1 && supported() && sectionOf(decodeURIComponent(location.hash.slice(1))); if (s) jump(s.target); sync(); };
    if (d.readyState === 'complete') open(); else w.addEventListener('load', open);
    sync();
  }

  /* console help: fkSnap.why() says if snapping is on and, if not, why */
  function why() {
    var r = { snapOn: enabled(), reducedMotion: reduce.matches, viewportHeight: w.innerHeight, minHeight: 420, snapSections: d.querySelectorAll('[data-snap]').length, dialogOrLockOpen: dialogOpen(), fieldFocused: fieldFocused(), scrollerIsBody: !!scroller(), scrollY: getY(), maxY: maxY() };
    console.table(r); return r;
  }
  w.fkSnap = { goTo: goTo, why: why };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
