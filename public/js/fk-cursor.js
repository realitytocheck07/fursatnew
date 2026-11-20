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
  var x = 0, y = 0, px = 0, vx = 0, deg = 0, raf = 0, ripAnim = null;
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
    d.body.appendChild(el);
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
  function promote() { if (!canPop) return; try { el.hidePopover(); el.showPopover(); } catch (e) {} }

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
    deg += (clamp(vx * 1.1, -18, 18) - deg) * 0.2;
    if (Math.abs(vx) > 0.05 || Math.abs(deg) > 0.1) {
      tilt.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
      raf = requestAnimationFrame(frame);
    } else { deg = 0; tilt.style.transform = ''; }
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
    el.classList.add('is-down');
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
    root.classList.remove('fk-cur', 'fk-cur-native'); if (el) el.remove();
  });
  // start fetching the 6 KB sprite when the browser is idle, so it never competes with first paint
  (window.requestIdleCallback || function (f) { setTimeout(f, 600); })(load, { timeout: 2000 });
})();
