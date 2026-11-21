/* story-hero.js: plays "Inside Fursat" inside the big Story hero window (HyWindows video, data-hv).
   The elephant photo stays as the first paint and the poster. The video loads after first paint, only if the tab is visible
   and the window is on screen, and never with Save-Data, 2g/3g or reduced motion. It pauses when scrolled away or the tab is hidden.
   SOUND (SOUND-CONTRACT): Fursat's own vibe track plays with the video, never the reel's audio (the video is muted).
   sessionStorage['fk-sound'] '1' on / '0' off; a MISSING flag counts as ON here (owner's choice, same as kit 19b). Nothing plays before a user gesture.
   Turning sound on/off sets the flag and fires fk:sound {on}; starting fires fk:music {id:"story"}; any other fk:music fades this track out. */
(function () {
  var vids = [].slice.call(document.querySelectorAll('video[data-hv]'));
  if (!vids.length) return;
  var c = navigator.connection || {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || c.saveData || /(^|-)[23]g$/.test(c.effectiveType || '')) return;

  var ready = false, items = vids.map(function (v) {
    var fig = v.closest('.hy-win'), ctl = fig.parentNode.querySelector('[data-hv-ctl].' + (fig.classList.contains('hy-m') ? 'hy-m' : 'hy-d'));  // the controls layer of the same view
    return { v: v, ctl: ctl, inView: false, loaded: false };
  });

  function allowed() { return ready && !document.hidden; }
  function load(it) {
    if (it.loaded) return; it.loaded = true;
    var v = it.v;
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(function (t) {
      var u = v.dataset[t[0]]; if (!u) return;
      var s = document.createElement('source'); s.src = u; s.type = t[1]; v.appendChild(s);
    });
    v.addEventListener('playing', function () { v.classList.add('is-on'); if (it.ctl) it.ctl.classList.add('is-vid'); reveal(it); }, { once: true });
    v.load();
  }
  function reveal(it) {
    if (!it.ctl) return;
    [].forEach.call(it.ctl.querySelectorAll('[hidden]'), function (e) { e.hidden = false; });
  }
  function sync(it) {
    var v = it.v;
    if (allowed() && it.inView) { load(it); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    else if (it.loaded && !v.paused) v.pause();
  }
  function syncAll() { items.forEach(sync); }

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { items.forEach(function (it) { if (it.v.closest('.hy-win') === e.target) { it.inView = e.isIntersecting; sync(it); } }); });
  }, { threshold: 0.25 });
  items.forEach(function (it) { io.observe(it.v.closest('.hy-win')); });
  document.addEventListener('visibilitychange', syncAll);


  /* ---------- sound ---------- */
  var SRC = '/assets/611fb91032.mp3', START = 27, VOL = .85;
  var au = null, fid = 0, on = true, yielded = false, wanted = false, listening = false, tok = 0, mine = false;
  try { on = sessionStorage.getItem('fk-sound') !== '0'; } catch (e) {}
  function flag(v) { try { sessionStorage.setItem('fk-sound', v ? '1' : '0'); } catch (e) {} }
  function emit(n, d) { mine = true; try { window.dispatchEvent(new CustomEvent(n, { detail: d })); } finally { mine = false; } }  // mine: ignore our own events
  function fade(to, ms, cb) {
    if (!au) return; cancelAnimationFrame(fid);
    var from = au.volume, t0 = performance.now();
    (function f(n) { var k = Math.max(0, Math.min(1, (n - t0) / ms)); au.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k < 1) fid = requestAnimationFrame(f); else if (cb) cb(); })(t0);
  }
  function paint() {
    items.forEach(function (it) {
      var b = it.ctl && it.ctl.querySelector('.hy-snd'); if (!b) return;
      b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    });
  }
  function videoPlaying() { return items.some(function (it) { return it.loaded && !it.v.paused && it.v.readyState > 2; }); }
  function start() {                       // play with a 600 ms fade-in; only called when allowed (gesture or autoplay accepted)
    if (!au) { au = new Audio(SRC); au.loop = true; au.preload = 'none'; au.volume = 0; }
    if (au.currentTime < .5) { try { au.currentTime = START; } catch (e) {} }
    var my = ++tok, p = au.play();
    var ok = function () {
      if (my !== tok || !on || !wanted) { if (au && !wanted) au.pause(); return; }   // stale: the guest turned it off, or the video stopped, while play() was pending
      unlisten(); fade(VOL, 600);
      var was; try { was = sessionStorage.getItem('fk-sound'); } catch (e) {}
      if (was !== '1') { flag(true); emit('fk:sound', { on: true }); }
      emit('fk:music', { id: 'story' });
    };
    if (p && p.then) p.then(ok, function () { listen(); }); else ok();
  }
  function stop(ms) { tok++; if (!au || au.paused) return; fade(0, ms || 300, function () { if (!wanted) au.pause(); }); }
  function want() {                        // should the track be playing right now?
    wanted = on && !yielded && !document.hidden && videoPlaying();
    if (wanted && au && !au.paused) return;   // already playing: no repeat events
    if (wanted) start(); else stop(300);
  }
  // first user gesture starts it when autoplay with sound was blocked (the sound button itself is ignored: it toggles)
  function gesture(e) { if (e.target && e.target.closest && e.target.closest('.hy-snd')) return; want(); }
  function listen() { if (listening) return; listening = true; ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { document.addEventListener(t, gesture, true); }); }
  function unlisten() { if (!listening) return; listening = false; ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { document.removeEventListener(t, gesture, true); }); }
  items.forEach(function (it) {
    it.v.addEventListener('playing', want); it.v.addEventListener('pause', want);
    var b = it.ctl && it.ctl.querySelector('.hy-snd');
    if (b) b.addEventListener('click', function () {
      on = !on; yielded = false; flag(on); paint(); emit('fk:sound', { on: on });
      if (on) { wanted = true; start(); } else { wanted = false; stop(300); }
    });
  });
  addEventListener('fk:sound', function (e) { if (mine) return; var v = !!(e.detail && e.detail.on); if (v === on) return; on = v; paint(); if (on) { yielded = false; want(); } else { wanted = false; stop(300); } });
  addEventListener('fk:music', function (e) { if (e.detail && e.detail.id !== 'story' && au && !au.paused) { yielded = true; wanted = false; stop(300); } });
  paint(); listen();

  // start after first paint: window load, then idle (or 1.5 s)
  function go() { ready = true; syncAll(); }
  function afterLoad() { if ('requestIdleCallback' in window) setTimeout(function () { requestIdleCallback(go, { timeout: 1500 }); }, 1500); else setTimeout(go, 1500); }
  if (document.readyState === 'complete') afterLoad(); else addEventListener('load', afterLoad, { once: true });
})();
