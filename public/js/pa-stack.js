/* /party stacked sticky sections (v5.72).
   CSS does the covering (position:sticky) and the push-back (animation-timeline). This file only:
   1) measures tall panels so their content is never cut (--pa-top), and the cover distance (--pa-d)
   2) fallback push-back (scroll-linked, transform + opacity only) for browsers without scroll-driven animations
   3) hero buttons -> scroll to the landed position of the right panel, on the real scroller
   4) marks a fully covered panel `inert` so Tab never lands on something you cannot see */
(function () {
  var d = document, w = window, root = d.documentElement;
  var stack = d.getElementById('pk-main');
  if (!stack || !stack.classList.contains('pa-stack')) return;
  var panels = [].slice.call(stack.querySelectorAll('[data-pa-panel]'));
  if (panels.length < 2) return;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var native = !!(w.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var BACK = 0.06, DIM = 0.4; /* scale 1 -> .94, dim to ~0.6 brightness (black overlay .4) */

  /* same test as fk-snap.js: on some layouts <body> scrolls (07.css), otherwise the window does */
  function scroller() {
    var b = d.body;
    if (b && getComputedStyle(root).overflowY === 'hidden' && b.scrollHeight > b.clientHeight + 1 && getComputedStyle(b).overflowY !== 'hidden') return b;
    return null;
  }
  function viewH() { var sc = scroller(); return sc ? sc.clientHeight : (w.innerHeight || root.clientHeight); }
  function getY() { var sc = scroller(); return sc ? sc.scrollTop : (w.pageYOffset || 0); }
  function shH() { return parseFloat(getComputedStyle(root).getPropertyValue('--sh-h')) || 104; }

  /* 1) tall panels: stick when their BOTTOM reaches the screen bottom, so the user scrolls through them first */
  /* fixed bars at the bottom of a phone (nav bar, book-a-table bar) hide the last pixels of a panel: reserve them so no content is cut */
  var mb = d.querySelector('.mb-bar'), fx = d.getElementById('fxsticky'), phone = matchMedia('(max-width: 767px)');
  var bars = [mb, fx].filter(Boolean);
  function reserve() { /* constant (heights, not positions), so it never changes while scrolling or when the address bar moves */
    if (!phone.matches) return 0;
    var r = 0;
    if (mb && getComputedStyle(mb).display !== 'none') r += mb.offsetHeight + (parseFloat(getComputedStyle(mb).bottom) || 0);
    if (fx && getComputedStyle(fx).display !== 'none') r += fx.offsetHeight + 8;
    return Math.round(r);
  }
  function measure() {
    /* phone (<=767px): the Feast panel fits its picture (no forced full-screen min-height, so no empty bands); stacking is unchanged */
    panels.forEach(function (p) { if (p.classList.contains('pa-panel--feast')) { p.style.minHeight = phone.matches ? '0' : ''; p.style.justifyContent = phone.matches ? 'flex-start' : ''; } });
    var vh = viewH(), sh = shH(), res = reserve();
    stack.style.setProperty('--pa-d', Math.max(1, vh - sh) + 'px');
    panels.forEach(function (p, i) {
      if (p.hasAttribute('data-pa-last')) return;
      var h = p.offsetHeight, base = i === 0 ? '0px' : 'var(--sh-h, 104px)';
      p.style.setProperty('--pa-top', h > vh - (i === 0 ? 0 : sh) - res ? 'min(' + base + ', ' + Math.round(vh - res - h) + 'px)' : base);
    });
  }
  if ('ResizeObserver' in w) { var ro = new ResizeObserver(measure); panels.forEach(function (p) { ro.observe(p); }); bars.forEach(function (b) { ro.observe(b); }); }
  w.addEventListener('resize', measure); w.addEventListener('load', measure); measure();

  /* 2) fallback push-back (no CSS scroll timelines): one rAF-throttled scroll handler, no CSS variables, no layout writes */
  var dims = [];
  if (!native && !calm) {
    stack.classList.add('pa-fb');
    panels.forEach(function (p, i) { if (i < panels.length - 1) { var s = d.createElement('i'); s.className = 'pa-dim'; s.setAttribute('aria-hidden', 'true'); p.appendChild(s); dims[i] = s; } });
  }
  function frame() {
    var vh = viewH(), sh = shH(), span = Math.max(1, vh - sh);
    for (var i = 0; i < panels.length - 1; i++) {
      var top = panels[i + 1].getBoundingClientRect().top;
      var cover = top <= sh + 2;
      if (cover !== panels[i].hasAttribute('inert')) { if (cover) panels[i].setAttribute('inert', ''); else panels[i].removeAttribute('inert'); }
      if (dims[i]) {
        var p = Math.min(1, Math.max(0, (vh - top) / span));
        panels[i].style.transform = p ? 'scale(' + (1 - BACK * p).toFixed(4) + ')' : '';
        dims[i].style.opacity = (DIM * p).toFixed(3);
      }
    }
  }
  var tick = 0;
  function onScroll() { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; frame(); }); }
  d.addEventListener('scroll', onScroll, { passive: true, capture: true }); /* catches window or <body> scrolling */
  w.addEventListener('resize', onScroll); frame();

  /* 3) hero buttons: land the target panel exactly where it sticks (under the header), smooth on the real scroller */
  var ids = { 'pa-packs': 1, 'pa-plan': 3 };
  function landY(i) {
    var sc = scroller(), y0 = getY(), top = stack.getBoundingClientRect().top + y0;
    if (sc) top = stack.getBoundingClientRect().top - sc.getBoundingClientRect().top + y0;
    for (var j = 0; j < i; j++) top += panels[j].offsetHeight;
    return Math.max(0, Math.round(top - (i === 0 ? 0 : shH())));
  }
  function go(i, smooth) {
    var y = landY(i), sc = scroller();
    if (sc) sc.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    else w.scrollTo({ top: y, left: 0, behavior: smooth ? 'smooth' : 'auto' });
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#pa-"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var k = a.getAttribute('href').slice(1);
    if (!(k in ids)) return;
    e.preventDefault(); go(ids[k], !calm);
    var t = d.getElementById(k); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  });
  var h = location.hash.slice(1);
  if (h in ids) w.addEventListener('load', function () { go(ids[h], false); });
})();
