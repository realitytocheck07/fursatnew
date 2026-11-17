/* Drinks video intro: plays once per visit, the first time the Drinks side is opened on /menu.
   Delegated listener (capture) so it never blocks the original click. The <video> is created only when triggered. */
(function () {
  var KEY = 'fk-drinks-intro', BASE = '/assets/menu/drinks-intro/', START_MS = 1500, FADE_MS = 600;
  var TRIGGER = '[data-open-side="drinks"],[data-side-go="drinks"],.mb-spot';
  var active = false;
  var MUSIC = '/assets/audio/drinks-intro-music.mp3', MUSIC_VOL = 0.7;

  // sound is on only if the visit-wide flag says so (see SOUND-CONTRACT.md)
  function soundOn() { try { return sessionStorage.getItem('fk-sound') === '1'; } catch (e) { return false; } }

  function seen() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function mark() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }
  function blocked() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  }

  function play(origin) {
    active = true;
    var phone = matchMedia('(max-width: 820px), (orientation: portrait)').matches;
    var root = document.documentElement, body = document.body;
    var prev = { r: root.style.overflow, b: body.style.overflow };
    var shown = false, closing = false, timer, au = null, fadeT = 0;

    var ov = document.createElement('div');
    ov.className = 'di'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Drinks intro video');
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.autoplay = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.poster = BASE + (phone ? 'drinks-intro-phone-end.webp' : 'drinks-intro-end.webp');
    if (phone) {
      v.src = BASE + 'drinks-intro-phone.mp4';
    } else {
      var w = document.createElement('source'); w.src = BASE + 'drinks-intro-1280.webm'; w.type = 'video/webm';
      var m = document.createElement('source'); m.src = BASE + 'drinks-intro-1280.mp4'; m.type = 'video/mp4';
      v.append(w, m);
    }
    var skip = document.createElement('button');
    skip.type = 'button'; skip.className = 'di-skip'; skip.textContent = 'Skip ✕'; skip.setAttribute('aria-label', 'Skip the drinks intro');
    ov.append(v, skip);

    // music: created only now (never preloaded), plays with the video, fades out over FADE_MS, never restarts
    function musicStop(ms) {
      if (!au) return; var a = au; au = null; window.removeEventListener('fk:sound', onSound); window.removeEventListener('fk:music', onMusic);
      clearInterval(fadeT);
      if (!ms) { a.pause(); return; }
      var t0 = Date.now(), v0 = a.volume;
      fadeT = setInterval(function () {
        var k = Math.min(1, (Date.now() - t0) / ms); a.volume = v0 * (1 - k);
        if (k >= 1) { clearInterval(fadeT); a.pause(); }
      }, 40);
    }
    function onSound(e) { if (!(e.detail && e.detail.on)) musicStop(0); }
    function onMusic(e) { if (e.detail && e.detail.id !== 'drinks') musicStop(0); }
    function musicStart() {
      if (au || !soundOn()) return;
      var a = new Audio(MUSIC); a.volume = MUSIC_VOL; a.loop = false; au = a;
      window.addEventListener('fk:sound', onSound); window.addEventListener('fk:music', onMusic);
      var p = a.play();
      if (p && p.then) p.then(function () { if (au === a) window.dispatchEvent(new CustomEvent('fk:music', { detail: { id: 'drinks' } })); }, function () { if (au === a) musicStop(0); });
    }
    function unlock() { root.style.overflow = prev.r; body.style.overflow = prev.b; }
    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
      clearTimeout(timer); if (au) musicStop(0);
      try { v.pause(); } catch (e) {}
      v.removeAttribute('src'); v.querySelectorAll('source').forEach(function (s) { s.remove(); }); try { v.load(); } catch (e) {}
      ov.remove(); unlock(); active = false;
    }
    function close() {
      if (closing) return; closing = true;
      musicStop(FADE_MS);
      if (!shown) { cleanup(); return; } // never started: no intro at all
      ov.classList.add('is-out'); ov.classList.remove('is-on');
      var done = false, fin = function () {
        if (done) return; done = true; cleanup();
        // back to what was clicked; a tapped half (not focusable) falls back to its keyboard opener
        var f = origin && origin.isConnected && origin.matches('button,a,[tabindex]') ? origin : document.querySelector('[data-open-side="drinks"]');
        if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
      };
      ov.addEventListener('transitionend', fin, { once: true });
      setTimeout(fin, FADE_MS + 80);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if (e.key === 'Tab') { e.preventDefault(); skip.focus(); } // Skip is the only control: keep focus on it
    }
    function start() {
      if (shown || closing) return; shown = true; clearTimeout(timer);
      root.style.overflow = 'hidden'; body.style.overflow = 'hidden';
      requestAnimationFrame(function () { ov.classList.add('is-on'); });
      skip.focus({ preventScroll: true });
      musicStart();
    }

    ov.addEventListener('click', close); // Skip, or a tap anywhere on the video
    v.addEventListener('playing', start);
    v.addEventListener('ended', close);
    v.addEventListener('error', close, true);
    document.addEventListener('keydown', onKey, true);
    document.body.append(ov);
    timer = setTimeout(function () { if (!shown) close(); }, START_MS); // not started in 1.5s: open normally
    var p = v.play(); if (p && p.catch) p.catch(function () { close(); });
  }

  document.addEventListener('click', function (e) {
    if (active || seen() || !e.target || !e.target.closest) return;
    var hit = e.target.closest(TRIGGER);
    if (!hit && !e.target.closest('#md-x')) { // a tap on the closed Drinks half itself also opens the side (MenuDoors)
      var door = e.target.closest('[data-door="drinks"]'), md = door && door.closest('.md');
      if (door && md && md.dataset.open !== 'drinks') hit = door;
    }
    if (!hit || blocked()) return;
    mark();
    play(hit); // the original click is untouched: the side opens underneath
  }, true);
})();
