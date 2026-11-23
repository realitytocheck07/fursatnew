/* fk-wa.js: THE one WhatsApp text format for every FURSAT booking form.
   window.fkWa.format({ kind, name, phone, date, time, guests, lines: [[label, value], ...], note, offer }) -> string
     kind   'table' | 'banquet' | 'catering' | 'party'
     date   "YYYY-MM-DD" (or a Date); printed as "Sat, 28 Nov 2026"
     phone  any 10-digit Indian number; printed as "+91 98765 43210"
     lines  form-specific lines, label: value, in the order given; empty values are skipped
     offer  true = the standard online-booking offer line; a string = that text; falsy = no offer line
   Every line with an empty value is skipped. Output:
     *FURSAT · <Table booking | Banquet enquiry | Catering enquiry | Party enquiry>*
     Name / Phone / Date / Time / Guests / <lines> / Note / Offer
     — sent from fursat website
   Loaded once from Base.astro; classic script, no dependencies. */
(function () {
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var TITLES = { table: 'Table booking', banquet: 'Banquet enquiry', catering: 'Catering enquiry', party: 'Party enquiry' };
  var OFFER = '10% off when you book online';
  function toDate(v) {
    if (v instanceof Date) return isNaN(v) ? null : v;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function date(v) {
    var d = toDate(v);
    return d ? DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() : String(v == null ? '' : v).trim();
  }
  function phone(v) {
    var s = String(v == null ? '' : v).trim(), x = s.replace(/\D/g, '');
    if (x.length > 10 && x.indexOf('91') === 0) x = x.slice(2);
    if (x.length === 11 && x.charAt(0) === '0') x = x.slice(1);
    return x.length === 10 ? '+91 ' + x.slice(0, 5) + ' ' + x.slice(5) : s;
  }
  function format(o) {
    o = o || {};
    var L = ['*FURSAT \u00B7 ' + (TITLES[o.kind] || TITLES.party) + '*'];
    function add(k, v) { v = v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); if (v) L.push(k + ': ' + v); }
    add('Name', o.name); add('Phone', phone(o.phone)); add('Date', date(o.date)); add('Time', o.time); add('Guests', o.guests);
    (o.lines || []).forEach(function (r) { add(r[0], r[1]); });
    add('Note', o.note);
    if (o.offer) add('Offer', o.offer === true ? OFFER : o.offer);
    L.push('\u2014 sent from fursat website');
    return L.join('\n');
  }
  window.fkWa = { format: format, date: date, phone: phone, OFFER: OFFER };
})();
