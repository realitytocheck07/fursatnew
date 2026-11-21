/* Fursat cursor: cocktail glass follows the mouse. Desktop / fine pointer only; touch, forced-colors and
   reduced-motion are handled. The OS cursor is hidden only once the sprite is loaded, and comes back over
   inputs, selects, iframes, the 360 viewer and the scrollbar. */
(function () {
  'use strict';
  if (window.__fkCursor) return;
  window.__fkCursor = 1;
  var d = document, root = d.documentElement;
  var mq = function (q) { return window.matchMedia(q); };
  var fine = mq('(hover: hover) and (pointer: fine)'), forced = mq('(forced-colors: active)'), rm = mq('(prefers-reduced-motion: reduce)');
  var contrast = mq('(prefers-contrast: more)');
  if (!fine.matches || forced.matches || contrast.matches) return;
  // opt-out for people who rely on their OS pointer (low vision, large cursors): ?cursor=native, undo with ?cursor=glass
  try {
    var q = /[?&]cursor=(native|glass)\b/.exec(location.search);
    if (q) localStorage.setItem('fkCursor', q[1]);
    if (localStorage.getItem('fkCursor') === 'native') return;
  } catch (e) {}

  var SRC = '/assets/brand/fursat-cursor.webp';
  var NATIVE = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]),textarea,select,[contenteditable=""],[contenteditable="true"],iframe,video[controls],.pv,[data-cursor="native"]';
  var HOVER = 'a[href],button:not(:disabled),[role=button],[role=link],[role=tab],summary,label[for],input[type=checkbox],input[type=radio],input[type=submit],input[type=button],input[type=range],.cursor-pointer,.ms-tray,[data-cursor="hover"]';

  var el, tilt, rip, img, loading = false, built = false, active = false;
  var x = 0, y = 0, px = 0, vx = 0, deg = 0, av = 0, raf = 0, ripAnim = null, fx = null, lastB = 0;
  var zNative = false, onBar = false, outside = false, canPop = false, overLink = false, bodyLink = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function load() {
    if (loading) return; loading = true;
    var i = new Image(); i.decoding = 'async'; i.alt = ''; i.draggable = false;
    i.onload = function () { img = i; build(); };
    i.src = SRC;
  }

  function build() {
    if (built || !d.body) return; built = true;
    el = d.createElement('div'); el.className = 'fk-c'; el.setAttribute('aria-hidden', 'true'); el.setAttribute('popover', 'manual');
    el.innerHTML = '<span class="fk-c-rip"></span><div class="fk-c-in"><div class="fk-c-tilt"></div></div><span class="fk-c-pt"></span>';
    tilt = el.querySelector('.fk-c-tilt'); rip = el.querySelector('.fk-c-rip');
    tilt.appendChild(img);
    fx = d.createElement('div'); fx.className = 'fk-cf'; fx.setAttribute('aria-hidden', 'true'); fx.setAttribute('popover', 'manual');   // bubble trail + click sparkles live in world coordinates, under the glass
    d.body.appendChild(fx); d.body.appendChild(el);
    canPop = typeof el.showPopover === 'function';
    promote();
    // react-three-fiber / drei set document.body.style.cursor = 'pointer' over clickable meshes (the 3D booking tables)
    new MutationObserver(function () {
      var b = d.body.style.cursor === 'pointer';
      if (b !== bodyLink) { bodyLink = b; link(); }
    }).observe(d.body, { attributes: true, attributeFilter: ['style'] });
    // dialogs / popovers opened later sit above us in the top layer; re-promote so the glass stays visible over them
    new MutationObserver(function (m) {
      for (var k = 0; k < m.length; k++) if (m[k].target.tagName === 'DIALOG' && m[k].target.open) { requestAnimationFrame(promote); break; }
    }).observe(root, { subtree: true, attributes: true, attributeFilter: ['open'] });
    d.addEventListener('beforetoggle', onToggle, true);
    d.addEventListener('toggle', onToggle, true);
    // seamless across page navigations: pick up where the last page left the pointer
    try {
      var s = JSON.parse(sessionStorage.getItem('fkc') || 'null');
      if (s && Date.now() - s.t < 4000) {
        x = px = s.x; y = s.y;
        el.style.transition = 'none'; activate(); el.getBoundingClientRect();   // restored: appear at once, no fade-in
        requestAnimationFrame(function () { el.style.transition = ''; });
      }
    } catch (e) {}
  }

  function onToggle(e) { if (e.target !== el && (e.newState === 'open')) requestAnimationFrame(promote); }
  function promote() { if (!canPop) return; try { fx.hidePopover(); el.hidePopover(); fx.showPopover(); el.showPopover(); } catch (e) {} }

  function activate() {
    active = true; px = x; vx = 0;
    root.classList.add('fk-cur');
    el.classList.add('is-on');
    sync(); schedule();
  }

  function sync() {
    if (!el) return;
    root.classList.toggle('fk-cur-native', zNative);
    el.classList.toggle('is-hid', zNative || onBar || outside);
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

  function frame() {
    raf = 0;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    if (rm.matches) return;
    vx = vx * 0.7 + (x - px) * 0.3; px = x;
    // spring, not a plain ease: the glass overshoots and settles, like liquid sloshing in it
    av = (av + (clamp(vx * 1.15, -20, 20) - deg) * 0.16) * 0.8; deg += av;
    var now = performance.now();
    if (Math.abs(vx) > 7 && now - lastB > 70) { lastB = now; bubble(); }
    if (Math.abs(vx) > 0.05 || Math.abs(deg) > 0.1 || Math.abs(av) > 0.04) {
      tilt.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
      raf = requestAnimationFrame(frame);
    } else { deg = 0; av = 0; tilt.style.transform = ''; }
  }

  // fizz: a fast sweep sheds a few tiny bubbles that rise and pop (WAAPI transform + opacity, removed when done)
  function bubble() {
    if (!fx || !fx.animate) return;
    var b = d.createElement('i'), s = 3 + Math.random() * 4, ox = 12 + Math.random() * 10;
    b.style.cssText = 'left:' + (x + ox) + 'px;top:' + (y - 2) + 'px;width:' + s + 'px;height:' + s + 'px';
    fx.appendChild(b);
    var a = b.animate([{ transform: 'translate(0,0) scale(.5)', opacity: .9 }, { transform: 'translate(' + ((Math.random() - .5) * 18).toFixed(0) + 'px,-' + (22 + Math.random() * 18).toFixed(0) + 'px) scale(1.15)', opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.23,1,.32,1)' });
    a.onfinish = function () { b.remove(); };
  }
  // cheers: six gold sparks burst from the click point
  function sparks() {
    if (!fx || !fx.animate) return;
    for (var k = 0; k < 6; k++) {
      var t = d.createElement('u'), ang = (k / 6) * Math.PI * 2 + Math.random() * .5, r = 16 + Math.random() * 10;
      t.style.cssText = 'left:' + x + 'px;top:' + y + 'px';
      fx.appendChild(t);
      var a = t.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + (Math.cos(ang) * r).toFixed(1) + 'px), calc(-50% + ' + (Math.sin(ang) * r).toFixed(1) + 'px)) scale(.2)', opacity: 0 }], { duration: 460, easing: 'cubic-bezier(.23,1,.32,1)' });
      a.onfinish = (function (n) { return function () { n.remove(); }; })(t);
    }
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') { zNative = true; sync(); return; }
    x = e.clientX; y = e.clientY;
    if (!built) { load(); return; }
    onBar = x >= root.clientWidth || y >= root.clientHeight;
    if (outside) { outside = false; px = x; }
    if (!active) activate(); else { sync(); schedule(); }
  }

  function onOver(e) {
    var t = e.target; if (!t || !t.closest) return;
    zNative = !!t.closest(NATIVE) || (!canPop && !!t.closest('dialog[open]'));
    overLink = !!t.closest(HOVER);
    if (el) { link(); sync(); }
  }
  function link() { el.classList.toggle('is-link', !zNative && (overLink || bodyLink)); }

  function onDown(e) {
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
    el.classList.add('is-down'); if (!rm.matches) sparks();
    if (ripAnim) ripAnim.cancel();
    if (!rm.matches && rip.animate) ripAnim = rip.animate(
      [{ transform: 'scale(.6)', opacity: .7 }, { transform: 'scale(3.4)', opacity: 0 }],
      { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  function onUp() { if (el) el.classList.remove('is-down'); }

  d.addEventListener('pointermove', onMove, { passive: true });
  d.addEventListener('pointerover', onOver, { passive: true });
  d.addEventListener('pointerdown', onDown, { passive: true });
  d.addEventListener('pointerup', onUp, { passive: true });
  d.addEventListener('pointercancel', onUp, { passive: true });
  d.addEventListener('dragend', onUp, { passive: true });
  window.addEventListener('blur', onUp);
  root.addEventListener('pointerleave', function () { outside = true; sync(); }, { passive: true });
  window.addEventListener('pagehide', function () {
    try { if (active) sessionStorage.setItem('fkc', JSON.stringify({ x: x, y: y, t: Date.now() })); } catch (e) {}
  });
  fine.addEventListener('change', function () {
    if (fine.matches) return;
    root.classList.remove('fk-cur', 'fk-cur-native'); if (el) el.remove(); if (fx) fx.remove();
  });
  // start fetching the 6 KB sprite when the browser is idle, so it never competes with first paint
  (window.requestIdleCallback || function (f) { setTimeout(f, 600); })(load, { timeout: 2000 });
})();
