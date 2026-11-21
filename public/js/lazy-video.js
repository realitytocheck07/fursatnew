/* Lazy, poster-first video loader for <LazyVideo>. Nothing is downloaded until the clip is near the screen.
   - skips video entirely (poster only) on Save-Data, 2g/3g connections and prefers-reduced-motion
   - plays only while visible, pauses when scrolled away or the tab is hidden, and only one clip plays at a time */
(function () {
  'use strict';
  if (window.__fkLazyVideo) return;
  window.__fkLazyVideo = true;
  var conn = navigator.connection || {};
  var slow = conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vids = [].slice.call(document.querySelectorAll('video[data-lazy-video]'));
  if (!vids.length) return;
  var current = null;

  function attach(v) {
    if (v.__fkReady) return true;
    var mp4 = v.getAttribute('data-src'), webm = v.getAttribute('data-webm');
    if (!mp4 && !webm) return false;
    if (webm) { var a = document.createElement('source'); a.src = webm; a.type = 'video/webm'; v.appendChild(a); }
    if (mp4) { var b = document.createElement('source'); b.src = mp4; b.type = 'video/mp4'; v.appendChild(b); }
    v.preload = 'auto'; v.load(); v.__fkReady = true; return true;
  }
  function play(v) {
    if (!attach(v)) return;
    if (current && current !== v) { try { current.pause(); } catch (e) {} }
    current = v;
    var p = v.play(); if (p && p.catch) p.catch(function () { /* autoplay refused: the poster simply stays */ });
  }
  function stop(v) { try { v.pause(); } catch (e) {} if (current === v) current = null; }

  if (slow || calm || !('IntersectionObserver' in window)) { vids.forEach(function (v) { v.setAttribute('data-state', 'poster'); }); return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting && !document.hidden) play(e.target); else stop(e.target); });
  }, { rootMargin: '200px 0px', threshold: 0.15 });
  vids.forEach(function (v) { io.observe(v); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && current) current.pause(); else if (current) play(current); });
})();
