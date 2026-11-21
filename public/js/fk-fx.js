/* fk-fx.js  v5.66  Fursat effects engine.
   ONE NUMBER controls the feel:  FX_DEFAULT  1 = subtle   2 = strong   3 = wow
   Override while testing: add ?fx=1 / ?fx=2 / ?fx=3 to any URL (remembered), ?fx=reset to clear.
   Floor (never relaxed): canvas + transform/opacity only, rAF runs only while particles exist, steam pauses off-screen,
   everything off under prefers-reduced-motion, capped particle counts, lighter automatically on phones and weak devices. */
(function () {
  'use strict';
  if (window.__fkFx) return; window.__fkFx = 1;
  var FX_DEFAULT = 3;                     // desktop default. Phones are capped to 2, weak devices to 1.

  var d = document, root = d.documentElement;
  var rm = matchMedia('(prefers-reduced-motion: reduce)');
  if (rm.matches) return;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var nav = navigator, conn = nav.connection || {};
  var weak = conn.saveData || (nav.deviceMemory && nav.deviceMemory <= 2) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 3);

  var level = FX_DEFAULT, forced = false;
  try {
    var q = /[?&]fx=(1|2|3|reset)\b/.exec(location.search);
    if (q) { if (q[1] === 'reset') localStorage.removeItem('fkFx'); else localStorage.setItem('fkFx', q[1]); }
    var s = parseInt(localStorage.getItem('fkFx'), 10);
    if (s >= 1 && s <= 3) { level = s; forced = true; }
  } catch (e) {}
  if (!forced) { if (!fine.matches) level = Math.min(level, 2); if (weak) level = 1; }
  root.setAttribute('data-fx', ['', 'subtle', 'strong', 'wow'][level]);

  //            trail bubbles, trail sparks, click bubbles, click sparks, hover-burst bubbles, dust, steam wisps per source, fizz, particle cap
  var T = { 1: { bub: 12, spk: 6,  cb: 7,  cs: 4,  hb: 6,  dust: 7,  st: 2, fz: 2, cap: 70 },
            2: { bub: 24, spk: 12, cb: 14, cs: 8,  hb: 11, dust: 12, st: 4, fz: 4, cap: 130 },
            3: { bub: 34, spk: 20, cb: 22, cs: 14, hb: 16, dust: 18, st: 6, fz: 6, cap: 200 } }[level];
  window.FK_FX = { level: level, set: function (n) { try { localStorage.setItem('fkFx', n); } catch (e) {} location.reload(); } };

  /* ---------------- particle canvas ---------------- */
  var cv, cx, W = 0, H = 0, dpr = 1, P = [], raf = 0, last = 0, nBub = 0, nSpk = 0;
  function build() {
    if (cv) return; cv = d.createElement('canvas'); cv.className = 'fk-fx-canvas'; cv.setAttribute('aria-hidden', 'true');
    d.body.appendChild(cv); cx = cv.getContext('2d'); size();
    addEventListener('resize', size, { passive: true });
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function add(p) { if (P.length >= T.cap) return false; build(); P.push(p); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } return true; }

  function bubble(x, y, o) {
    o = o || {};
    if (!o.free && nBub >= T.bub) return; nBub++;
    add({ k: 'b', x: x, y: y, vx: o.vx != null ? o.vx : rnd(-14, 14), vy: o.vy != null ? o.vy : rnd(-46, -18), r: o.r || rnd(3, 9), t: 0, life: o.life || rnd(.8, 1.5), ph: rnd(0, 6.28), free: !!o.free });
  }
  function spark(x, y, o) {
    o = o || {};
    if (!o.free && nSpk >= T.spk) return; nSpk++;
    var a = o.a != null ? o.a : rnd(0, 6.28), sp = o.sp || rnd(20, 70);
    add({ k: 's', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, r: rnd(1.3, 2.8), t: 0, life: rnd(.4, .85), free: !!o.free });
  }
  function ring(x, y) { add({ k: 'r', x: x, y: y, r: 6, t: 0, life: .6 }); add({ k: 'r', x: x, y: y, r: 2, t: -.08, life: .75, thin: 1 }); }
  function dust(x, y, n) {
    for (var i = 0; i < n; i++) {
      var side = i % 2 ? 1 : -1, sp = rnd(30, 110);
      add({ k: 'd', x: x + side * rnd(0, 8), y: y, vx: side * sp, vy: rnd(-34, -6), r: rnd(3, 8), t: 0, life: rnd(.35, .7) });
    }
  }

  function tick(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    cx.clearRect(0, 0, W, H);
    nBub = 0; nSpk = 0;
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i]; p.t += dt;
      if (p.t < 0) { continue; }
      var u = p.t / p.life;
      if (u >= 1) { P.splice(i, 1); continue; }
      if (p.k === 'b') {
        if (!p.free) nBub++;
        p.x += (p.vx + Math.sin(p.t * 6 + p.ph) * 14) * dt; p.y += p.vy * dt; p.vy -= 10 * dt;
        var a = u < .15 ? u / .15 : 1 - Math.pow((u - .15) / .85, 2.2);
        cx.globalAlpha = Math.max(0, a) * .95;
        var g = cx.createRadialGradient(p.x - p.r * .35, p.y - p.r * .35, p.r * .1, p.x, p.y, p.r);
        g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.7, 'rgba(255,236,190,.14)'); g.addColorStop(1, 'rgba(214,170,90,.55)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.2832); cx.fill();
        cx.strokeStyle = 'rgba(201,154,67,.85)'; cx.lineWidth = 1; cx.stroke();
        cx.fillStyle = 'rgba(255,255,255,.9)'; cx.beginPath(); cx.arc(p.x - p.r * .35, p.y - p.r * .38, Math.max(.8, p.r * .17), 0, 6.2832); cx.fill();
        if (p.pop && u > .85) { cx.globalAlpha = (u - .85) / .15 * .8; cx.strokeStyle = 'rgba(255,230,160,.9)'; cx.beginPath(); cx.arc(p.x, p.y, p.r * 1.5, 0, 6.2832); cx.stroke(); }
      } else if (p.k === 's') {
        if (!p.free) nSpk++;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.vx *= .985;
        cx.globalAlpha = 1 - u; var r = p.r * (1 - u * .5);
        cx.fillStyle = 'rgba(255,214,120,1)'; cx.shadowColor = 'rgba(255,200,90,.9)'; cx.shadowBlur = 8;
        cx.beginPath(); cx.moveTo(p.x, p.y - r * 2); cx.lineTo(p.x + r * .6, p.y - r * .6); cx.lineTo(p.x + r * 2, p.y); cx.lineTo(p.x + r * .6, p.y + r * .6);
        cx.lineTo(p.x, p.y + r * 2); cx.lineTo(p.x - r * .6, p.y + r * .6); cx.lineTo(p.x - r * 2, p.y); cx.lineTo(p.x - r * .6, p.y - r * .6); cx.closePath(); cx.fill(); cx.shadowBlur = 0;
      } else if (p.k === 'r') {
        var e = 1 - Math.pow(1 - u, 3), rr = p.r + e * (p.thin ? 78 : 56);
        cx.globalAlpha = (1 - u) * (p.thin ? .55 : .9); cx.lineWidth = p.thin ? 1 : 2.2;
        cx.strokeStyle = 'rgba(224,176,80,1)'; cx.shadowColor = 'rgba(255,205,100,.85)'; cx.shadowBlur = p.thin ? 0 : 10;
        cx.beginPath(); cx.arc(p.x, p.y, rr, 0, 6.2832); cx.stroke(); cx.shadowBlur = 0;
      } else if (p.k === 'd') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .93; p.vy *= .93;
        cx.globalAlpha = (1 - u) * .65; var dr = p.r * (1 + u * 1.6);
        cx.fillStyle = 'rgba(232,214,184,1)'; cx.beginPath(); cx.arc(p.x, p.y, dr, 0, 6.2832); cx.fill();
      }
    }
    cx.globalAlpha = 1;
    raf = P.length ? requestAnimationFrame(tick) : 0;
    if (!raf) cx.clearRect(0, 0, W, H);
  }

  /* ---------------- cursor trail + click pop (mouse only) ---------------- */
  var lx = -1, ly = -1, acc = 0;
  var SKIP = 'input,textarea,select,[contenteditable=""],[contenteditable="true"],iframe,video[controls],.pv,[data-fx="off"]';
  d.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    if (lx < 0) { lx = e.clientX; ly = e.clientY; return; }
    var dx = e.clientX - lx, dy = e.clientY - ly, dist = Math.sqrt(dx * dx + dy * dy); lx = e.clientX; ly = e.clientY;
    if (e.target.closest && e.target.closest(SKIP)) return;
    acc += dist;
    var step = level === 3 ? 20 : level === 2 ? 28 : 40;
    while (acc > step) { acc -= step; bubble(e.clientX + rnd(-6, 6), e.clientY + rnd(0, 10)); if (level > 1 && Math.random() < .55) spark(e.clientX, e.clientY, { sp: rnd(14, 44) }); }
  }, { passive: true });
  d.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'mouse' && level < 2) return;
    if (e.target.closest && e.target.closest(SKIP)) return;
    var x = e.clientX, y = e.clientY, i;
    for (i = 0; i < T.cb; i++) { var a = (i / T.cb) * 6.2832 + rnd(-.2, .2), sp = rnd(50, 150); bubble(x, y, { free: 1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 24, r: rnd(3, 10), life: rnd(.55, 1.1) }); }
    for (i = 0; i < T.cs; i++) spark(x, y, { free: 1, sp: rnd(60, 180) });
    ring(x, y);
  }, { passive: true });

  /* ---------------- hover burst on drinks / dishes ---------------- */
  var hoverAt = new WeakMap();
  // stage 3: drinks/dishes on the menu, Ask Fursat mood chips and party tiles also burst on hover
  var BURST = '[data-fx-burst],.mv-c-thumb,.ah-chips button,.pc-card,.mv-add';
  d.addEventListener('pointerover', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var el = e.target.closest && e.target.closest(BURST); if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    var now = performance.now(); if (now - (hoverAt.get(el) || 0) < 700) return; hoverAt.set(el, now);
    var r = el.getBoundingClientRect();
    for (var i = 0; i < T.hb; i++) bubble(r.left + rnd(.15, .85) * r.width, r.top + r.height * rnd(.45, .95), { free: 1, vx: rnd(-18, 18), vy: rnd(-90, -40), r: rnd(3, 8), life: rnd(.8, 1.4) });
    if (level > 1) for (var k = 0; k < Math.ceil(T.cs / 2); k++) spark(r.left + r.width / 2, r.top + r.height / 2, { free: 1, sp: rnd(40, 120) });
  }, { passive: true });
  // "+ Add" on the menu: gold coins hop out of the button (Mario coin)
  d.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.mv-add'); if (!b) return;
    var r = b.getBoundingClientRect(), n = Math.ceil(T.cs * .7);
    for (var i = 0; i < n; i++) spark(r.left + r.width / 2, r.top + r.height / 2, { free: 1, a: -Math.PI / 2 + rnd(-.7, .7), sp: rnd(70, 150) });
  }, { passive: true });
  function mark() { d.querySelectorAll('.od-dishes img,.od-pimg,[data-drink],.mv-thumb[data-drink]').forEach(function (n) { n.setAttribute('data-fx-burst', ''); }); }

  /* ---------------- Mario: dust burst + landing squash ---------------- */
  d.addEventListener('animationend', function (e) {
    var a = e.target; if (!a.classList || !a.classList.contains('afab')) return;
    if (!/^afab-(drop|hop|jump|big|flip|spin|power)$/.test(e.animationName)) return;
    var r = a.getBoundingClientRect(); if (!r.width || a.offsetParent === null && getComputedStyle(a).position !== 'fixed') return;
    var big = /drop|big|power|flip/.test(e.animationName);
    dust(r.left + r.width / 2, r.bottom - 4, big ? T.dust : Math.ceil(T.dust * .55));
    if (big && level > 1) for (var i = 0; i < Math.ceil(T.cs / 2); i++) spark(r.left + r.width / 2, r.bottom - 8, { free: 1, a: -Math.PI * rnd(.15, .85), sp: rnd(50, 130) });
    a.classList.remove('fx-land'); void a.offsetWidth; a.classList.add('fx-land'); setTimeout(function () { a.classList.remove('fx-land'); }, 380);
  }, true);

  /* ---------------- order hero: steam + cocktail fizz (every layout; positions are mapped through the photo's cover crop) ---------------- */
  // sources are fractions of the photo itself, measured per image variant: [x, y, spread px, rise px]
  var SRC_WIDE = { st: [[.225, .60, 70, 120], [.49, .70, 90, 150], [.38, .66, 40, 110]], fz: [.662, .684, .38, .50] };
  var SRC_TALL = { st: [[.21, .69, 60, 100], [.1, .72, 40, 90], [.45, .68, 50, 100]], fz: [.49, .53, .22, .38] };
  function steam() {
    var pic = d.querySelector('.od-hero-pic'), img = pic && pic.querySelector('.od-hero-bg'); if (!pic || !img) return;
    var box = pic.querySelector('.fx-steam');
    if (!box) {
      box = d.createElement('div'); box.className = 'fx-steam'; box.setAttribute('aria-hidden', 'true'); pic.appendChild(box);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { box.classList.toggle('is-off', !en[0].isIntersecting); }).observe(pic);
      var tm = 0; addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(steam, 200); }, { passive: true });
      if (!img.complete) img.addEventListener('load', steam, { once: true });
    }
    var nw = img.naturalWidth, nh = img.naturalHeight, pw = pic.clientWidth, ph = pic.clientHeight;
    if (!nw || !pw || !ph) return;
    var sc = Math.max(pw / nw, ph / nh), rw = nw * sc, rh = nh * sc, op = (getComputedStyle(img).objectPosition || '50% 50%').split(' ');
    var ox = (pw - rw) * (parseFloat(op[0]) || 0) / 100, oy = (ph - rh) * (parseFloat(op[1]) || 0) / 100;
    var S = nw / nh > 1.5 ? SRC_WIDE : SRC_TALL, k = Math.max(.45, Math.min(1.2, pw / 760)), h = '';
    function X(f) { return (ox + f * rw).toFixed(0) + 'px'; }
    function Y(f) { return (oy + f * rh).toFixed(0) + 'px'; }
    S.st.forEach(function (c) {
      for (var i = 0; i < T.st; i++) {
        var sz = rnd(26, 52) * Math.max(.6, k);
        h += '<i style="--x:' + X(c[0] + rnd(-c[2], c[2]) / rw) + ';--y:' + Y(c[1]) + ';--s:' + sz.toFixed(0) + 'px;--dx:' + (rnd(-26, 26) * k).toFixed(0) + 'px;--rise:' + (c[3] * rnd(.8, 1.3) * k).toFixed(0) + 'px;--o:' + (level === 1 ? .5 : level === 2 ? .8 : 1) + ';--dur:' + rnd(3.2, 5.2).toFixed(1) + 's;--d:-' + rnd(0, 5).toFixed(1) + 's"></i>';
      }
    });
    for (var j = 0; j < T.fz * 2; j++) h += '<b style="--x:' + X(rnd(S.fz[0], S.fz[1])) + ';--y:' + Y(rnd(S.fz[2], S.fz[3])) + ';--s:' + (rnd(3, 6) * Math.max(.7, k)).toFixed(0) + 'px;--dx:' + rnd(-4, 4).toFixed(0) + 'px;--rise:' + (rnd(34, 70) * k).toFixed(0) + 'px;--dur:' + rnd(1.6, 3).toFixed(1) + 's;--d:-' + rnd(0, 3).toFixed(1) + 's"></b>';
    box.innerHTML = h;
  }

  /* ---------------- stage 5: Ask Fursat ambience (only on /ask) ---------------- */
  function ask() {
    var m = d.getElementById('ask-main'); if (!m) return;
    var every = level === 3 ? 380 : level === 2 ? 800 : 1700, tm = 0;
    function drift() {
      tm = setTimeout(drift, every * rnd(.7, 1.4));
      if (d.hidden) return;
      var x = rnd(.04, .96) * W0(), y = H0() + 10;
      bubble(x, y, { free: 1, vx: rnd(-8, 8), vy: rnd(-70, -38), r: rnd(3, 11), life: rnd(3.2, 5.2) });
      if (level > 1 && Math.random() < .6) spark(rnd(.05, .95) * W0(), rnd(.2, .9) * H0(), { free: 1, sp: rnd(2, 8), a: -1.57 });
    }
    function W0() { return innerWidth; } function H0() { return innerHeight; }
    drift();
    // when an answer opens, a gold burst crosses the top of the answer card
    var ans = d.getElementById('ah-ans');
    if (ans) {
      var shown = !ans.hidden;
      new MutationObserver(function () {
        var now = !ans.hidden; if (now && !shown) {
          var r = ans.getBoundingClientRect(), y = Math.max(40, Math.min(innerHeight - 40, r.top + 40));
          for (var i = 0; i < T.cb; i++) bubble(r.left + rnd(.05, .95) * r.width, y + rnd(0, 30), { free: 1, vx: rnd(-30, 30), vy: rnd(-120, -50), r: rnd(3, 9), life: rnd(.9, 1.6) });
          for (var k = 0; k < T.cs; k++) spark(r.left + rnd(.05, .95) * r.width, y, { free: 1, sp: rnd(50, 140) });
          ring(r.left + r.width / 2, y);
        }
        shown = now;
      }).observe(ans, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  function init() { mark(); steam(); ask(); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})();
