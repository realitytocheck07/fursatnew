(function () {
  var D = document, H = D.documentElement;
  var SPRING = 'cubic-bezier(.34,1.56,.64,1)', OUT = 'cubic-bezier(.23,1,.32,1)';
  var slots = [].slice.call(D.querySelectorAll('.mx-m'));
  if (!slots.length || !D.documentElement.animate) return;
  function mk(c) { var s = D.createElement('span'); s.className = c; return s; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function obs(el, cb, opt) { if (!('MutationObserver' in window)) return; new MutationObserver(cb).observe(el, opt); }
  slots.forEach(init);

  function init(el) {
    var kind = el.getAttribute('data-mx'), base = el.getAttribute('data-base') || '/assets/brand/mascot/';
    var sizes = el.getAttribute('data-sizes') || '100px', from = parseFloat(el.getAttribute('data-from')) || 0;
    var par = mk('mx-par'), br = mk('mx-br'), sw = mk('mx-sw');
    var poses = {}, cur = 'namaste', tk = 0, loaded = false, done = false;
    var first = el.querySelector('img');
    first.classList.add('mx-p', 'is-front'); first.setAttribute('data-pose', 'namaste'); poses.namaste = first;
    sw.appendChild(first); br.appendChild(sw); par.appendChild(br); el.appendChild(par);
    (el.getAttribute('data-poses') || '').split(',').forEach(function (n) {
      n = n.trim(); if (!n) return;
      var im = D.createElement('img'); im.className = 'mx-p'; im.setAttribute('data-pose', n);
      im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.decoding = 'async'; im.draggable = false;
      im.width = 720; im.height = 720; im.sizes = sizes; sw.appendChild(im); poses[n] = im;
    });
    function load() {
      if (loaded) return; loaded = true;
      Object.keys(poses).forEach(function (n) {
        var im = poses[n]; if (im.getAttribute('src')) return;
        im.srcset = base + n + '-480.webp 480w, ' + base + n + '-720.webp 720w'; im.src = base + n + '-480.webp';
      });
    }
    if ('IntersectionObserver' in window) {
      var lio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { load(); lio.disconnect(); } }, { rootMargin: '100% 0px' });
      lio.observe(el);
      new IntersectionObserver(function (es) { el.classList.toggle('is-off', !es[es.length - 1].isIntersecting); }).observe(el);
    } else load();

    function show(name) {
      var nx = poses[name]; if (!nx || cur === name) return Promise.resolve();
      var prev = poses[cur]; cur = name; load();
      var ready = nx.decode ? nx.decode().catch(function () {}) : Promise.resolve();
      return ready.then(function () {
        if (cur !== name) return;
        nx.classList.add('is-front');
        return wait(150).then(function () { if (cur === name && prev) prev.classList.remove('is-front'); });
      });
    }
    function snap(name) { Object.keys(poses).forEach(function (n) { poses[n].classList.toggle('is-front', n === name); }); cur = name; }
    function cancel() { tk++; par.getAnimations().forEach(function (a) { a.cancel(); }); el.classList.remove('is-live'); }
    function reset() { cancel(); done = false; el.classList.remove('mx-on'); snap('namaste'); }
    function play() {
      cancel(); done = false; load(); snap('namaste'); var t = tk;
      el.classList.add('mx-on');
      var en = par.animate([{ transform: 'translateX(' + from + 'px) scale(.6) rotate(-8deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 700, easing: SPRING, fill: 'backwards' });
      en.finished.then(function () { return wait(1200); }).then(function () {
        if (t !== tk) return;
        var bow = par.animate([{ transform: 'none' }, { transform: 'rotate(6deg) translateY(4px)', offset: .5 }, { transform: 'none' }], { duration: 500, easing: OUT });
        return bow.finished;
      }).then(function () { if (t !== tk) return; return show('welcome'); })
        .then(function () { if (t === tk) el.classList.add('is-live'); }).catch(function () {});
    }
    function sparkle() {
      if (typeof window.__fxSparks !== 'function') return;
      var r = el.getBoundingClientRect(); window.__fxSparks(r.left + r.width / 2, r.top + r.height / 2, 14, 2);
    }

    if (kind === 'rs') {
      var panel = el.parentNode, modes = D.getElementById('rs-modes');
      var place = function () {
        var pr = panel.getBoundingClientRect(), s = pr.width / (panel.offsetWidth || pr.width) || 1;
        var w = el.offsetWidth, wide = panel.offsetWidth > 600, left, top;
        if (wide) {
          if (done) { left = panel.offsetWidth - w - 22; top = 25; }
          else { var mr = modes && modes.offsetParent ? modes.getBoundingClientRect() : null; left = mr ? (mr.left - pr.left) / s - 26 - w : panel.offsetWidth * .38; top = -43; }
        } else { left = panel.offsetWidth - 14 - w; top = done ? 14 : -40; }
        el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(top) + 'px';
      };
      place();
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(panel); else addEventListener('resize', place);
      var started = false, inView = false;
      var go = function () {
        if (started || !inView || H.classList.contains('fx-pre')) return;
        started = true; place(); if (!done) play();
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].intersectionRatio >= .5; go(); }, { threshold: [.5] }).observe(el);
      else { inView = true; }
      obs(H, go, { attributes: true, attributeFilter: ['class'] });
      var sync = function () {
        var d = panel.classList.contains('is-done');
        if (d === done && started) return;
        done = d;
        if (d) {
          started = true; cancel(); el.classList.add('mx-on'); place(); show('thumbs').then(function () { el.classList.add('is-live'); }); sparkle();
        } else { cancel(); el.classList.add('mx-on'); place(); show('welcome').then(function () { el.classList.add('is-live'); }); }
      };
      obs(panel, function () { if (panel.classList.contains('is-done') !== done) sync(); }, { attributes: true, attributeFilter: ['class'] });
      go();
    } else {
      var dlg = D.getElementById('bkdlg'), sheet = D.getElementById('bk-sheet'), dn = D.getElementById('bk-done'), ct;
      if (dlg) {
        var onDlg = function () {
          if (dlg.classList.contains('is-in')) { clearTimeout(ct); el.classList.toggle('mx-hide', sheet.getAttribute('data-step') !== '1'); play(); }
          else { clearTimeout(ct); ct = setTimeout(reset, 260); }
        };
        obs(dlg, onDlg, { attributes: true, attributeFilter: ['class'] });
        if (dlg.classList.contains('is-in')) onDlg();
      }
      if (sheet) obs(sheet, function () { el.classList.toggle('mx-hide', sheet.getAttribute('data-step') !== '1'); }, { attributes: true, attributeFilter: ['data-step'] });
      if (dn) obs(dn, function () { dn.classList.toggle('mx-thumbs', dn.classList.contains('is-in')); }, { attributes: true, attributeFilter: ['class'] });
    }
  }
})();
