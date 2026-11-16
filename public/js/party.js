/* Party page: package cards -> Build Your Celebration (estimate, menu, bottom sheet, summary bar, WhatsApp + email copy). */
(function () {
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var dataEl = $('#pb-data'); if (!dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  /* the sheet and the summary bar are position:fixed: move them out of the page's stacking context so they sit above the mobile nav bar */
  ['pb-sheet', 'pb-bar'].forEach(function (id) { var el = document.getElementById(id); if (el && el.parentNode !== document.body) document.body.appendChild(el); });
  var st = { group: D.init.group, pkg: D.init.pkg, guests: D.init.guests, touched: false };
  var phone = matchMedia('(max-width: 767px)');
  var pkgOf = function (id) { return D.pkgs.filter(function (p) { return p.id === id; })[0]; };
  var inr = function (v) { return '\u20b9' + Math.round(v).toLocaleString('en-IN'); };
  var clampN = function (v) { return Math.max(1, Math.min(500, v)); };

  var plan = $('#pa-plan'), host = $('#pa-host'), stage = host && $('.pa-stage', host), pt = 0;
  var total = $('#pb-total'), sub = $('#pb-sub'), live = $('#pb-live'), wa = $('#pa-wa'), nIn = $('#pb-n');
  var seg = $('.pb-seg'), blurb = $('#pb-blurb'), bar = $('#pb-bar'), barT = $('#pb-bar-t'), barWa = $('#pb-bar-wa');
  var groupLabel = function (id) { return D.groups.filter(function (g) { return g.id === id; })[0].label; };
  var blurbs = {}; $$('.pb-opt').forEach(function (o) { blurbs[$('input', o).value] = $('small', o).textContent; });

  /* mascot */
  function pose(p, ms) { if (!host) return; clearTimeout(pt); host.setAttribute('data-pose', p); if (ms) pt = setTimeout(function () { host.setAttribute('data-pose', 'idle'); }, ms); }
  function stars() {
    if (calm || !stage) return;
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('span'), a = i / 8 * Math.PI * 2, d = 50 + Math.random() * 22;
      s.className = 'pa-star'; s.style.setProperty('--sx', Math.cos(a) * d + 'px'); s.style.setProperty('--sy', Math.sin(a) * d - 14 + 'px');
      s.addEventListener('animationend', function () { this.remove(); }); stage.appendChild(s);
    }
  }
  function cheer() { pose('cheer', 1500); stars(); }

  /* count-up */
  var shown = +total.getAttribute('data-val') || 0, raf = 0;
  function countTo(to, text) {
    cancelAnimationFrame(raf);
    total.setAttribute('data-val', to);
    if (calm || !isFinite(to) || text) { shown = to; total.textContent = text || inr(to); return; }
    var from = shown, t0 = performance.now(), dur = 650;
    (function tick(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = from + (to - from) * e; total.textContent = inr(shown);
      if (k < 1) raf = requestAnimationFrame(tick); else { shown = to; total.textContent = inr(to); }
    })(t0);
  }

  /* menu + packages */
  function setMenu() {
    var p = pkgOf(st.pkg);
    $$('.pb-menu').forEach(function (m) { m.hidden = m.getAttribute('data-menu') !== p.menu; });
    if (p.menu === 'choices') {
      $$('.pb-menu[data-menu="choices"] .pb-row').forEach(function (r, i) {
        var n = p.picks[i], k = $('[data-pick]', r);
        r.hidden = n === null || n === undefined;
        k.textContent = n ? 'Pick any ' + n : '';
      });
    }
  }
  function render(opts) {
    opts = opts || {};
    var p = pkgOf(st.pkg), g = clampN(st.guests), ok = st.guests >= 1;
    /* event type */
    $$('input[name="pb-evt"]').forEach(function (r) { r.checked = r.value === st.group; });
    $$('input[name="pb-evt-s"]').forEach(function (r) { r.checked = r.value === st.group; });
    var gi = D.groups.map(function (x) { return x.id; }).indexOf(st.group);
    if (seg) seg.style.setProperty('--i', gi);
    $('[data-out="event"]').textContent = groupLabel(st.group);
    $('[data-out="guests"]').textContent = ok ? st.guests : '\u2013';
    if (blurb) blurb.textContent = blurbs[st.group] || '';
    $$('.pb-pkgs').forEach(function (f) { f.hidden = f.getAttribute('data-group') !== st.group; });
    $$('.pb-pk').forEach(function (el) {
      var on = el.getAttribute('data-pkg') === st.pkg; el.classList.toggle('is-on', on);
      var r = $('.pb-r', el); r.checked = on;
    });
    /* guests */
    $$('.pb-step input').forEach(function (i) { if (document.activeElement !== i) i.value = ok ? st.guests : ''; });
    $$('.pb-qk').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-n') === st.guests)); });
    /* estimate */
    var sum = p.price * g;
    if (ok) {
      sub.textContent = g + (g === 1 ? ' guest' : ' guests') + ' \u00d7 ' + inr(p.price) + ' ' + D.unit + ' \u00b7 before taxes';
      countTo(sum);
      live.textContent = 'Estimated value ' + inr(sum) + ' before taxes, ' + p.label + ', ' + g + ' guests.';
    } else {
      sub.textContent = inr(p.price) + ' ' + D.unit + ' \u00b7 before taxes';
      countTo(0, 'Enter the number of guests'); live.textContent = 'Enter the number of guests.';
    }
    var msg = ['Hi Fursat! I would like to plan a party:', '\u2022 Package: ' + p.label, '\u2022 Price: ' + inr(p.price) + ' + taxes per guest', '\u2022 Guests: ' + (ok ? g : 'to be confirmed')].concat(ok ? ['\u2022 Estimate: ' + inr(sum) + ' + taxes'] : []).join('\n');
    var href = 'https://wa.me/' + D.wa + '?text=' + encodeURIComponent(msg);
    wa.href = href; if (barWa) barWa.href = href;
    if (barT) barT.textContent = p.label + ' \u00b7 ' + (ok ? g : '?') + ' \u00b7 ' + (ok ? inr(sum) : 'add guests');
    setMenu(); syncBar();
  }

  function setGroup(id, keepPkg) {
    if (id !== st.group) { st.group = id; var cur = pkgOf(st.pkg); if (!cur || cur.group !== id || !keepPkg) st.pkg = D.pkgs.filter(function (p) { return p.group === id; })[0].id; }
  }
  function choose(pkg, fromUser) { st.pkg = pkg; if (fromUser) { st.touched = true; cheer(); } render(); }

  /* wire: event type, packages, guests */
  $$('input[name="pb-evt"]').forEach(function (r) { r.addEventListener('change', function () { setGroup(r.value); st.touched = true; render(); }); });
  $$('.pb-r').forEach(function (r) { r.addEventListener('change', function () { choose(r.value, true); }); });
  function setGuests(v) { st.guests = v; st.touched = true; render(); }
  $$('.pb-step').forEach(function (box) {
    var inp = $('input', box);
    inp.addEventListener('input', function () { var v = parseInt(inp.value, 10); st.guests = isNaN(v) ? 0 : clampN(v); st.touched = true; render(); });
    inp.addEventListener('blur', function () { render(); });
    $$('.pb-sb', box).forEach(function (b) { b.addEventListener('click', function () { setGuests(clampN((st.guests || 0) + (+b.getAttribute('data-step')))); }); });
  });
  $$('.pb-qk').forEach(function (b) { b.addEventListener('click', function () { setGuests(+b.getAttribute('data-n')); }); });

  /* menu rows: tap to open the dish chips */
  $$('.pb-row-b').forEach(function (b) {
    b.addEventListener('click', function () { var row = b.closest('.pb-row'), on = !row.classList.contains('is-open'); row.classList.toggle('is-open', on); b.setAttribute('aria-expanded', String(on)); });
  });

  /* WhatsApp (keeps today's flow): email copy first, then the link opens as normal; the WhatsApp flow never waits for the email */
  function mail() {
    var p = pkgOf(st.pkg), g = clampN(st.guests);
    if (window.fkForm) window.fkForm.send('events', 'Party plan', { package: p.label, guests: st.guests >= 1 ? g : 'to be confirmed' }, $('#pa-plan [name=botcheck]'));
  }
  wa.addEventListener('click', mail); if (barWa) barWa.addEventListener('click', mail);

  /* occasion cards -> pre-select the group, scroll to the builder */
  function toBuilder() { if (plan) plan.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); }
  $$('.pc-card').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); setGroup(a.getAttribute('data-occ'), true); st.touched = true; render(); cheer(); toBuilder(); });
  });
  var qg = new URLSearchParams(location.search).get('group');
  if (qg && D.groups.some(function (g) { return g.id === qg; })) { setGroup(qg, true); render(); requestAnimationFrame(toBuilder); }
  /* hero buttons */
  $$('a[href="#pa-plan"],a[href="#pa-packs"]').forEach(function (a) {
    if (a.classList.contains('pc-card')) return;
    a.addEventListener('click', function (e) { var t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); t.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); });
  });

  /* card rail dots (phones) */
  var row = $('#pc-row'), dots = $$('.pc-dot');
  if (row && dots.length) {
    var cards = $$('.pc-li', row);
    function active() { var x = row.scrollLeft, best = 0, bd = 1e9; cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - row.offsetLeft - 16 - x); if (d < bd) { bd = d; best = i; } }); dots.forEach(function (d, i) { if (i === best) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); }
    var ticking = 0; row.addEventListener('scroll', function () { if (ticking) return; ticking = requestAnimationFrame(function () { ticking = 0; active(); }); }, { passive: true });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { row.scrollTo({ left: cards[i].offsetLeft - row.offsetLeft - 16, behavior: calm ? 'auto' : 'smooth' }); }); });
  }

  /* summary bar (phones): after a choice is made, hidden while the builder's own button or the closing band is on screen */
  var seen = { wa: false, close: false };
  function syncBar() { if (!bar) return; var on = phone.matches && st.touched && !seen.wa && !seen.close && !(sheet && sheet.classList.contains('is-open')); bar.classList.toggle('is-in', on); bar.setAttribute('aria-hidden', String(!on)); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { seen[e.target === wa ? 'wa' : 'close'] = e.isIntersecting; }); syncBar(); });
    io.observe(wa); var cl = $('.pa-close'); if (cl) io.observe(cl);
  }
  phone.addEventListener('change', function () { if (!phone.matches) closeSheet(true); syncBar(); });

  /* bottom sheet (phones): focus trapped, Esc / close button / backdrop / drag down to close */
  var sheet = $('#pb-sheet'), panel = $('.pb-sheet-p', sheet), title = $('#pb-sheet-t'), opener = null, lastY = 0, dragY0 = null, dragT0 = 0;
  var FOC = 'button,input,[href],[tabindex]:not([tabindex="-1"])';
  function focusables() { return $$(FOC, panel).filter(function (el) { return !el.disabled && el.offsetParent !== null && !el.closest('[hidden]'); }); }
  function openSheet(kind, from) {
    opener = from; title.textContent = kind === 'event' ? 'Event type' : 'Guests';
    $$('.pb-sheet-b', sheet).forEach(function (b) { b.hidden = b.getAttribute('data-body') !== kind; });
    sheet.hidden = false; sheet.getBoundingClientRect(); sheet.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden'; syncBar();
    var first = kind === 'event' ? $('input[name="pb-evt-s"]:checked', sheet) : $('[data-gin]', sheet);
    setTimeout(function () { (first || panel).focus({ preventScroll: true }); }, calm ? 0 : 60);
  }
  function closeSheet(now) {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open', 'is-drag'); panel.style.removeProperty('--dy'); document.documentElement.style.overflow = '';
    var done = function () { sheet.hidden = true; syncBar(); };
    if (now || calm) done(); else setTimeout(done, 340);
    if (opener) opener.focus({ preventScroll: true });
  }
  $$('[data-sheet]').forEach(function (b) { b.addEventListener('click', function () { openSheet(b.getAttribute('data-sheet'), b); }); });
  $$('[data-close]', sheet).forEach(function (b) { b.addEventListener('click', function () { closeSheet(); }); });
  $$('input[name="pb-evt-s"]', sheet).forEach(function (r) { r.addEventListener('change', function () { setGroup(r.value); st.touched = true; render(); setTimeout(function () { closeSheet(); }, calm ? 0 : 180); }); });
  sheet.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === a || document.activeElement === panel)) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  var grab = $('#pb-grab');
  grab.addEventListener('pointerdown', function (e) { dragY0 = e.clientY; lastY = 0; dragT0 = performance.now(); sheet.classList.add('is-drag'); grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', function (e) { if (dragY0 === null) return; lastY = Math.max(0, e.clientY - dragY0); panel.style.setProperty('--dy', lastY + 'px'); });
  function endDrag() { if (dragY0 === null) return; var v = lastY / Math.max(1, performance.now() - dragT0); dragY0 = null; sheet.classList.remove('is-drag'); if (lastY > 90 || v > 0.6) closeSheet(); else panel.style.removeProperty('--dy'); }
  grab.addEventListener('pointerup', endDrag); grab.addEventListener('pointercancel', endDrag);

  render();
})();
