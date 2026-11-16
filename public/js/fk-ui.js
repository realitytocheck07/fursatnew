/* fk-ui.js (UI2, v5.37): small helpers for the shared kit in fk-tokens.css.
   .fk-rail   edge fades (data-start / data-end), tap-to-centre on .fk-pill, arrow keys, optional dots
   .fk-seg    sliding thumb (reads aria-pressed / aria-selected / .is-on)
   .fk-sheet  bottom sheet: window.fkSheet.open({ title, body, opener }) + select[data-fk-sheet] on phones
   .fk-reveal fade + rise once, only for things below the fold
   No framework. Everything works without it (the rails still scroll, the selects stay native). */
(function () {
  'use strict';
  var d = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = matchMedia('(max-width: 760px)');
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* ---------- rail ---------- */
  function edges(box) {
    var max = box.scrollWidth - box.clientWidth;
    box.setAttribute('data-start', box.scrollLeft > 4 ? '1' : '0');
    box.setAttribute('data-end', max > 4 && box.scrollLeft < max - 4 ? '1' : '0');
  }
  function centerIn(btn) {
    var box = btn && btn.closest('.fk-rail');
    if (!box || box.scrollWidth <= box.clientWidth + 1) return;
    var left = btn.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft - box.clientWidth / 2 + btn.offsetWidth / 2;
    box.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
  }
  function initRail(box) {
    if (box._fk) return; box._fk = 1;
    var raf = 0, dots = null, items = [];
    var upd = function () { raf = 0; edges(box); if (dots) markDots(); };
    var queue = function () { if (!raf) raf = requestAnimationFrame(upd); };
    function markDots() {
      var best = 0, bd = 1e9, base = box.scrollLeft;
      items.forEach(function (it, i) { var dd = Math.abs(it.offsetLeft - box.offsetLeft - base - (parseFloat(getComputedStyle(box).paddingLeft) || 0)); if (dd < bd) { bd = dd; best = i; } });
      if (box.scrollLeft + box.clientWidth >= box.scrollWidth - 2) best = items.length - 1;
      $$('i', dots).forEach(function (el, i) { el.classList.toggle('is-on', i === best); });
    }
    if (box.hasAttribute('data-dots')) {
      items = Array.prototype.slice.call(box.children);
      if (items.length > 1) {
        dots = d.createElement('div'); dots.className = 'fk-dots'; dots.setAttribute('aria-hidden', 'true');
        items.forEach(function () { dots.appendChild(d.createElement('i')); });
        box.insertAdjacentElement('afterend', dots);
      }
    }
    box.addEventListener('scroll', queue, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(box);
    addEventListener('resize', queue);
    box.addEventListener('click', function (e) {
      var p = e.target.closest && e.target.closest('.fk-pill');
      if (p && box.contains(p)) centerIn(p);
    });
    box.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
      var list = $$('.fk-pill', box).filter(function (b) { return !b.disabled && b.offsetParent; });
      var i = list.indexOf(d.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = k === 'Home' ? 0 : k === 'End' ? list.length - 1 : Math.max(0, Math.min(list.length - 1, i + (k === 'ArrowRight' ? 1 : -1)));
      list[n].focus(); centerIn(list[n]);
    });
    upd();
  }

  /* ---------- segmented switch ---------- */
  function initSeg(seg) {
    if (seg._fk) return; seg._fk = 1;
    var btns = Array.prototype.filter.call(seg.children, function (c) { return c.matches('button,[role="tab"]'); });
    if (btns.length < 2) return;
    var thumb = d.createElement('span'); thumb.className = 'fk-seg__thumb'; thumb.setAttribute('aria-hidden', 'true');
    seg.insertBefore(thumb, seg.firstChild);
    seg.style.setProperty('--n', btns.length);
    var sync = function () {
      var on = btns.findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true' || b.classList.contains('is-on'); });
      seg.style.setProperty('--i', Math.max(0, on));
    };
    sync();
    // first paint without a slide, then enable the transition
    thumb.style.transition = 'none'; seg.setAttribute('data-ready', '');
    requestAnimationFrame(function () { requestAnimationFrame(function () { thumb.style.transition = ''; }); });
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(sync);
      btns.forEach(function (b) { mo.observe(b, { attributes: true, attributeFilter: ['aria-pressed', 'aria-selected', 'class'] }); });
    }
  }

  /* ---------- bottom sheet ---------- */
  var sheet = null;
  function buildSheet() {
    if (sheet) return sheet;
    var dlg = d.createElement('dialog');
    dlg.className = 'fk-sheet'; dlg.setAttribute('aria-labelledby', 'fk-sheet-t');
    dlg.innerHTML = '<div class="fk-sheet__panel"><div class="fk-sheet__head"><h2 class="fk-sheet__t" id="fk-sheet-t"></h2>' +
      '<button class="fk-sheet__x" type="button" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<div class="fk-sheet__body"></div></div>';
    d.body.appendChild(dlg);
    sheet = { dlg: dlg, panel: dlg.firstChild, head: dlg.querySelector('.fk-sheet__head'), title: dlg.querySelector('.fk-sheet__t'), body: dlg.querySelector('.fk-sheet__body'), x: dlg.querySelector('.fk-sheet__x'), opener: null, closing: false, t: 0 };
    sheet.x.addEventListener('click', function () { closeSheet(); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeSheet(); });
    dlg.addEventListener('keydown', function (e) {   // focus trap: Tab stays inside the sheet
      if (e.key !== 'Tab') return;
      var f = $$('button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', dlg).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (d.activeElement === first || !dlg.contains(d.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (d.activeElement === last || !dlg.contains(d.activeElement))) { e.preventDefault(); first.focus(); }
    });
    // swipe down on the header (phones)
    var sy = 0, dy = 0, pid = -1, drag = false, t0 = 0;
    sheet.head.addEventListener('pointerdown', function (e) {
      if (!phone.matches || e.target.closest('.fk-sheet__x') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = true; pid = e.pointerId; sy = e.clientY; dy = 0; t0 = e.timeStamp;
      sheet.head.setPointerCapture(pid); sheet.panel.classList.add('is-drag');
    });
    sheet.head.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== pid) return;
      dy = Math.max(0, e.clientY - sy); sheet.panel.style.transform = 'translateY(' + dy + 'px)';
    });
    var end = function (e) {
      if (!drag || e.pointerId !== pid) return;
      drag = false; try { sheet.head.releasePointerCapture(pid); } catch (x) { /* released */ }
      var v = dy / Math.max(1, e.timeStamp - t0);
      sheet.panel.classList.remove('is-drag');
      if (e.type !== 'pointercancel' && (dy > sheet.panel.offsetHeight * 0.3 || (v > 0.4 && dy > 24))) closeSheet();
      else sheet.panel.style.transform = '';
    };
    sheet.head.addEventListener('pointerup', end); sheet.head.addEventListener('pointercancel', end);
    return sheet;
  }
  function openSheet(o) {
    var s = buildSheet();
    if (s.dlg.open) return;
    s.opener = o.opener || d.activeElement;
    s.title.textContent = o.title || '';
    s.body.replaceChildren();
    if (typeof o.body === 'function') o.body(s.body); else if (o.body) s.body.appendChild(o.body);
    s.onClose = o.onClose || null;
    s.panel.style.transform = '';
    s.dlg.showModal();
    d.documentElement.classList.add('fk-sheet-open');
    void s.panel.offsetHeight; s.dlg.classList.add('is-in');
    var first = s.body.querySelector('[aria-selected="true"],button,a[href]') || s.x;
    first.focus({ preventScroll: true });
    if (first.scrollIntoView) first.scrollIntoView({ block: 'nearest' });
  }
  function closeSheet() {
    var s = sheet;
    if (!s || !s.dlg.open || s.closing) return;
    s.closing = true; s.dlg.classList.remove('is-in'); s.panel.style.transform = '';
    var done = function () {
      clearTimeout(s.t); s.panel.removeEventListener('transitionend', onEnd);
      s.dlg.close(); s.closing = false; d.documentElement.classList.remove('fk-sheet-open');
      var op = s.opener; s.opener = null;
      if (op && op.focus && d.contains(op)) op.focus({ preventScroll: true });
      if (s.onClose) { var f = s.onClose; s.onClose = null; f(); }
    };
    var onEnd = function (e) { if (e.target === s.panel) done(); };
    if (reduce) return done();
    s.panel.addEventListener('transitionend', onEnd);
    s.t = setTimeout(done, 320);
  }
  window.fkSheet = { open: openSheet, close: closeSheet };

  /* ---------- select -> sheet on phones (the real <select> stays the source of truth) ---------- */
  var lastOpen = 0;
  function openSelect(sel) {
    if (Date.now() - lastOpen < 400 || sel.disabled) return;
    lastOpen = Date.now();
    var lab = sel.id && d.querySelector('label[for="' + sel.id + '"]');
    var title = sel.getAttribute('data-fk-sheet') || sel.getAttribute('aria-label') || (lab && lab.textContent.trim()) || 'Choose';
    openSheet({
      title: title, opener: sel,
      body: function (box) {
        var make = function (o) {
          var b = d.createElement('button'); b.type = 'button'; b.className = 'fk-sheet__opt'; b.setAttribute('role', 'option');
          b.setAttribute('aria-selected', String(o.selected)); b.textContent = o.textContent;
          b.addEventListener('click', function () {
            if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
            closeSheet();
          });
          return b;
        };
        box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', title);
        Array.prototype.forEach.call(sel.children, function (c) {
          if (c.tagName === 'OPTGROUP') {
            var g = d.createElement('p'); g.className = 'fk-sheet__grp'; g.textContent = c.label; box.appendChild(g);
            Array.prototype.forEach.call(c.children, function (o) { if (!o.disabled && !o.hidden) box.appendChild(make(o)); });
          } else if (c.tagName === 'OPTION' && !c.disabled && !c.hidden) box.appendChild(make(c));
        });
      }
    });
  }
  function selFrom(e) { var t = e.target; return t && t.closest ? t.closest('select[data-fk-sheet]') : null; }
  d.addEventListener('mousedown', function (e) { if (phone.matches && selFrom(e)) e.preventDefault(); }, true);
  d.addEventListener('click', function (e) { var s = phone.matches && selFrom(e); if (s) { e.preventDefault(); openSelect(s); } }, true);
  d.addEventListener('touchend', function (e) { var s = phone.matches && selFrom(e); if (s && e.cancelable) { e.preventDefault(); openSelect(s); } }, { capture: true, passive: false });
  d.addEventListener('keydown', function (e) {
    var s = phone.matches && selFrom(e);
    if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSelect(s); }
  }, true);

  /* ---------- reveal: fade + 16px rise once; only what starts below the fold is hidden ---------- */
  function initReveal(root) {
    var els = $$('.fk-reveal:not([data-fk-r])', root);
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.setAttribute('data-fk-r', ''); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        el.classList.add('is-in');
        setTimeout(function () { el.classList.remove('is-armed', 'is-in'); }, 600);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) {
      el.setAttribute('data-fk-r', '');
      if (el.getBoundingClientRect().top > innerHeight * 0.98) { el.classList.add('is-armed'); io.observe(el); }
    });
  }

  function init(root) {
    $$('.fk-rail', root).forEach(initRail);
    $$('.fk-seg', root).forEach(initSeg);
    initReveal(root);
  }
  window.fkUI = { init: init, centerIn: centerIn };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { init(d); }); else init(d);
})();
