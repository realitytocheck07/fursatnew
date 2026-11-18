/* rista-live.js: marks dishes "Sold out" on /menu using the live Rista stock (GET /api/menu).
   Loaded only when site.json -> rista.live is true. If the call fails, the static menu is left exactly as it is.
   Matches Rista items to menu rows by name slug (same rule as transform.js item.key). Prices are NOT changed here. */
(function () {
  var slug = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var ctl = typeof AbortController === 'function' ? new AbortController() : null;
  var t = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : null;
  fetch('/api/menu', { headers: { accept: 'application/json' }, signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      if (t) clearTimeout(t);
      if (!m || !m.soldOutKnown || !Array.isArray(m.categories)) return;
      var out = {};
      m.categories.forEach(function (c) { (c.items || []).forEach(function (i) { if (i.soldOut && i.key) out[i.key] = true; }); });
      document.querySelectorAll('li[data-row]').forEach(function (li) {
        var n = li.querySelector('.mv-iname');
        if (!n || !out[slug(n.textContent)] || li.hasAttribute('data-soldout')) return;
        li.setAttribute('data-soldout', '1');
        var chips = li.querySelector('.fk-chips');
        if (chips) { var c = document.createElement('span'); c.className = 'fk-chip fk-chip--soldout'; c.textContent = 'Sold out'; chips.appendChild(c); }
        var b = li.querySelector('.mv-add');
        if (b) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); var s = b.querySelector('.mv-add-t'); if (s) s.textContent = 'Sold out'; }
      });
    })
    .catch(function () { if (t) clearTimeout(t); });
})();
