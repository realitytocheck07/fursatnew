/* Fursat cursor v5.70: the cocktail glass is a real system cursor set in cursor.css (zero lag). This file only adds
   html.fk-cur and the light effects: fizz bubbles on fast moves, click sparkles + gold ripple. Desktop mouse only.
   No per-frame loop: work happens only inside pointer events and WAAPI animations. */
(function () {
  'use strict';
  if (window.__fkCursor) return;
  window.__fkCursor = 1;
  var d = document, root = d.documentElement;
  var mq = function (q) { return window.matchMedia(q); };
  var fine = mq('(hover: hover) and (pointer: fine)'), forced = mq('(forced-colors: active)'), rm = mq('(prefers-reduced-motion: reduce)');
  var contrast = mq('(prefers-contrast: more)');
  // v5.80: touchscreen laptops report pointer:coarse/hover:none even with a touchpad or mouse, so don't gate on media
  // queries; the glass turns on at the first real mouse/touchpad move (a system cursor is never shown to touch anyway).
  if (forced.matches || contrast.matches) return;
  // opt-out for people who rely on their OS pointer (low vision, large cursors): ?cursor=native, undo with ?cursor=glass
  try {
    var q = /[?&]cursor=(native|glass)\b/.exec(location.search);
    if (q) localStorage.setItem('fkCursor', q[1]);
    if (localStorage.getItem('fkCursor') === 'native') return;
  } catch (e) {}

  var fx = null, alive = 0, lastB = 0, lx = 0, ly = 0, lt = 0, bodyLink = false;
  var EASE = 'cubic-bezier(.23,1,.32,1)';

  if (fine.matches) root.classList.add('fk-cur');
  function mouseOn() { if (!root.classList.contains('fk-cur')) root.classList.add('fk-cur'); }

  function build() {
    if (fx || !d.body) return;
    fx = d.createElement('div'); fx.className = 'fk-cf'; fx.setAttribute('aria-hidden', 'true'); fx.setAttribute('popover', 'manual');
    d.body.appendChild(fx);
    promote();
    // react-three-fiber / drei set document.body.style.cursor = 'pointer' over clickable meshes (the 3D booking tables)
    new MutationObserver(function () {
      var b = d.body.style.cursor === 'pointer';
      if (b !== bodyLink) { bodyLink = b; root.classList.toggle('fk-cur-bl', b); }
    }).observe(d.body, { attributes: true, attributeFilter: ['style'] });
    // dialogs / popovers opened later sit above the effects layer in the top layer; re-promote it
    new MutationObserver(function (m) {
      for (var k = 0; k < m.length; k++) if (m[k].target.tagName === 'DIALOG' && m[k].target.open) { requestAnimationFrame(promote); break; }
    }).observe(root, { subtree: true, attributes: true, attributeFilter: ['open'] });
    d.addEventListener('toggle', function (e) { if (e.target !== fx && e.newState === 'open') requestAnimationFrame(promote); }, true);
  }
  function promote() {
    if (!fx || typeof fx.showPopover !== 'function') return;
    try { fx.hidePopover(); fx.showPopover(); } catch (e) {}
  }

  function ok() { return fx && fx.animate && !rm.matches && !d.hidden; }
  function done(el) { return function () { el.remove(); }; }

  // fizz: a fast sweep sheds a few tiny bubbles from the glass rim; they rise and pop (max 6 on screen, 1 per 70 ms)
  function bubble(x, y) {
    if (alive >= 6) return;
    var b = d.createElement('i'), s = 3 + Math.random() * 4, ox = x + 11 + Math.random() * 9, oy = y - 2;
    b.style.width = b.style.height = s + 'px';
    fx.appendChild(b); alive++;
    var a = b.animate([
      { transform: 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) scale(.5)', opacity: .9 },
      { transform: 'translate(' + (ox + (Math.random() - .5) * 18).toFixed(1) + 'px,' + (oy - 22 - Math.random() * 18).toFixed(1) + 'px) scale(1.15)', opacity: 0 }
    ], { duration: 700 + Math.random() * 300, easing: EASE });
    a.onfinish = a.oncancel = function () { b.remove(); alive--; };
  }
  // cheers: six gold sparks burst from the click point, plus a gold ripple ring
  function click(x, y) {
    var k, p = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) ';
    for (k = 0; k < 6; k++) {
      var t = d.createElement('u'), ang = (k / 6) * Math.PI * 2 + Math.random() * .5, r = 16 + Math.random() * 10;
      fx.appendChild(t);
      t.animate([
        { transform: p + 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(' + (x + Math.cos(ang) * r).toFixed(1) + 'px,' + (y + Math.sin(ang) * r).toFixed(1) + 'px) translate(-50%,-50%) scale(.2)', opacity: 0 }
      ], { duration: 460, easing: EASE }).onfinish = done(t);
    }
    var g = d.createElement('s'); fx.appendChild(g);
    g.animate([
      { transform: p + 'translate(-50%,-50%) scale(.6)', opacity: .7 },
      { transform: p + 'translate(-50%,-50%) scale(3.4)', opacity: 0 }
    ], { duration: 520, easing: EASE }).onfinish = done(g);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouseOn();
    if (!fx) { build(); lx = e.clientX; ly = e.clientY; lt = e.timeStamp; return; }
    var dt = e.timeStamp - lt;
    if (dt < 16) return;                                   // speed over ~1 frame of movement
    var sp = Math.hypot(e.clientX - lx, e.clientY - ly) / dt;   // px per ms
    lx = e.clientX; ly = e.clientY; lt = e.timeStamp;
    if (sp > .45 && ok() && e.timeStamp - lastB >= 70) { lastB = e.timeStamp; bubble(lx, ly); }
  }
  function onDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (!fx) build();
    if (ok()) click(e.clientX, e.clientY);
  }

  d.addEventListener('pointermove', onMove, { passive: true });
  d.addEventListener('pointerdown', onDown, { passive: true });
  // a touch tap does not need the class removed: system cursors are only drawn for a mouse or touchpad
})();
