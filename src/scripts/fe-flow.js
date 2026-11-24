// fe-flow.js: the F2 three-step celebrate flow (Banquet "Lock your date", Catering quote). Same wiring as the old forms:
// WhatsApp text field by field (cfg.order), email copy via window.fkForm?.send, honeypot, data-wa-form hooks, validation.
import "./fe-swipe.js";
export function feFlow(cfg) {
  const form = document.querySelector(cfg.form);
  if (!form) return;
  const $ = (s, r = form) => r.querySelector(s);
  const $$ = (s, r = form) => [...r.querySelectorAll(s)];
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const digits = (v) => { let x = v.replace(/\D/g, ''); if (x.length > 10 && x.startsWith('91')) x = x.slice(2); if (x.length === 11 && x[0] === '0') x = x.slice(1); return x; };
  /* all dates are Hyderabad (IST) dates; a Date here is that calendar day at 12:00 UTC */
  const istDay = () => { const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = () => iso(istDay());
  /* "Today" starts from Tomorrow once the last slot (src/data/slots.json) has begun */
  const startDay = () => { const d = istDay(); const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(new Date())); if (h >= Number(form.dataset.lastHour || 23)) d.setUTCDate(d.getUTCDate() + 1); return d; };
  const errOf = (el) => document.getElementById(el.getAttribute('aria-describedby') || '');
  const check = (el) => {
    const v = el.value.trim(), t = el.dataset.v;
    if (t === 'text') return v.length < 2 ? el.dataset.msg : '';
    if (t === 'phone') return /^[6-9]\d{9}$/.test(digits(v)) ? '' : 'Please enter a valid 10-digit mobile number.';
    if (t === 'count') { const n = Number(v), lo = Number(el.min), hi = Number(el.max); return n >= lo && n <= hi ? '' : 'Please enter ' + lo + ' to ' + hi + ' guests.'; }
    if (t === 'date') return v && v >= today() ? '' : 'Please choose today or a later date.';
    return '';
  };
  const show = (el, msg) => { const e = errOf(el); if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); if (e) { e.textContent = ''; if (msg) { void e.offsetWidth; e.textContent = msg; } } };
  const shake = (el) => { el.classList.remove('fe-shake'); void el.offsetWidth; el.classList.add('fe-shake'); el.addEventListener('animationend', () => el.classList.remove('fe-shake'), { once: true }); };

  const card = form.closest('.fe-card');
  const steps = $$('.fe-step'), bar = $('#fe-bar'), stepLabel = $('#fe-steplabel');
  const occ = $('#fe-occ'), next1 = $('#fe-next1');
  const dateEl = $('[data-v="date"]'), gEl = $('[data-v="count"]'), daysEl = $('#fe-days');
  const nameEl = $('[data-v="text"][autocomplete="name"]'), phoneEl = $('[data-v="phone"]'), emailEl = $('input[type="email"]');
  const sendBtn = $('#fe-send'), ring = $('#fe-ring'), done = $('#fe-done');
  /* sending state: the width is locked before the label swaps; a double tap is one open (sending guard + pointer-events off) */
  const sendLab = $$('.fe-go-roll > span', sendBtn), sendTxt = sendLab[0].textContent;
  const setSendLab = (t) => sendLab.forEach((s) => { s.textContent = t; });
  const sendReset = () => { sendBtn.removeAttribute('aria-busy'); sendBtn.classList.remove('is-busy', 'is-ok'); sendBtn.style.width = ''; setSendLab(sendTxt); };
  /* F2d: gold sparkles that burst in on open (25ms stagger, spring) and then STAY, drifting gently.
     [left %, top %, kind (r = 4x9 piece, d = 4px dot), rotation] around the arch; CSS does the rest. */
  const SPARK = [[8, 30, 'r', -28], [13, 16, 'd', 0], [24, 8, 'r', 22], [37, 3, 'd', 0], [50, 1, 'r', -12], [63, 4, 'd', 0], [75, 8, 'r', 34], [89, 19, 'r', -40], [94, 33, 'd', 0], [86, 44, 'r', 58], [6, 47, 'r', 40], [9, 60, 'd', 0], [94, 56, 'd', 0], [3, 15, 'd', 0], [82, 2, 'd', 0], [31, 14, 'r', -52], [97, 10, 'r', 15], [4, 74, 'r', -50]];
  const conf = $('.fe-confetti', done);
  if (conf) SPARK.forEach((p, k) => { const i = document.createElement('i'); i.className = 'fe-sp fe-sp--' + p[2]; i.style.cssText = '--k:' + k + ';--l:' + p[0] + ';--t:' + p[1] + ';--r:' + p[3] + 'deg;--dd:' + (3 + (k % 3) * .5) + 's;--dl:' + (-(k * 0.43) % 3).toFixed(2) + 's'; conf.appendChild(i); });
  const step2 = $$('[data-v]', steps[1]), step3 = $$('[data-v]', steps[2]);
  const gStep = Number(cfg.guestStep), gMin = Number(gEl.min), gMax = Number(gEl.max);
  const tpl = $('#fe-tk-tpl');
  $$('.fe-tk-slot').forEach((s) => s.appendChild(tpl.content.cloneNode(true)));
  const tks = $$('[data-fe-tk]');
  $$('.fe-sw', form).forEach((el) => { el.innerHTML = '<span>—</span>'; });

  /* words slide (old up + fade, new in); numbers the guest drives roll like an odometer */
  const swap = (el, text) => {
    const cur = el.lastElementChild; if (cur && cur.textContent === text) return;
    const n = document.createElement('span'); n.textContent = text; el.appendChild(n);
    if (!cur) return;
    cur.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-8px)', opacity: 0 }], { duration: 220, easing: EASE, fill: 'forwards' }).onfinish = () => cur.remove();
    n.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: EASE });
  };
  const odo = (el, val) => {
    const prev = el.dataset.v || ''; if (prev === val) return; el.dataset.v = val;
    if (!val) { el.textContent = '—'; return; }
    if (!prev) el.textContent = '';
    const dir = !prev || Number(val) >= Number(prev) ? 1 : -1;
    const slots = $$('.fe-od-slot', el);
    while (slots.length < val.length) { const s = document.createElement('span'); s.className = 'fe-od-slot'; el.insertBefore(s, el.firstChild); slots.unshift(s); }
    while (slots.length > val.length) slots.shift().remove();
    [...val].forEach((ch, i) => {
      const s = slots[i]; if (s.dataset.d === ch) return; s.dataset.d = ch;
      const old = s.firstElementChild, n = document.createElement('span'); n.textContent = ch;
      if (old) { n.className = 'fe-od-abs'; s.appendChild(n); old.animate([{ transform: 'none' }, { transform: 'translateY(' + -dir * 100 + '%)' }], { duration: 220, easing: EASE, fill: 'forwards' }).onfinish = () => { old.remove(); n.classList.remove('fe-od-abs'); }; }
      else s.appendChild(n);
      n.animate([{ transform: 'translateY(' + dir * 100 + '%)' }, { transform: 'none' }], { duration: 220, easing: EASE });
    });
  };
  /* 4 · live summary: opens once there is a real choice; only real choices appear */
  const sum = $('#fe-sum'), sumP = $('#fe-sum-p');
  const sumRefresh = () => {
    const has = { occ: !!occ.value, date: !!dateEl.value, guests: /^\d{1,3}$/.test(gEl.value.trim()) };
    $$('[data-s]', sumP).forEach((w) => { w.hidden = !has[w.dataset.s]; });
    sum.classList.toggle('is-open', has.occ || has.date || has.guests);
  };
  const setTk = (key, text) => { $$('[data-tk="' + key + '"]').forEach((el) => swap(el, text || '—')); sumRefresh(); };
  const setGuests = () => { const v = gEl.value.trim(); const s = /^\d{1,3}$/.test(v) ? String(Number(v)) : ''; $$('[data-tk="guests"]').forEach((el) => odo(el, s)); sumRefresh(); };
  const fmtTk = (v) => v ? new Date(v + 'T12:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(',', '') : '';

  /* 2 · ready ring: on when every required field is valid; Send itself is never disabled */
  const ready = () => ring.classList.toggle('is-ready', [...step2, ...step3].every((el) => !check(el)) && (!emailEl.value.trim() || emailEl.validity.valid));
  /* 7 · green tick when a field is valid */
  const tick = (el) => { const w = el.closest('.fe-fl'); if (!w) return; const v = el.value.trim(); w.classList.toggle('is-ok', !!v && !check(el) && el.validity.valid); };

  /* steps */
  const LABELS = cfg.labels;
  let step = 1, sending = false;
  /* card height follows the active step (CSS animates it, 300ms ease); the done screen asks for its own height */
  const vp = $('.fe-vp'), vcs = getComputedStyle(vp);
  const fit = () => {
    let h = steps[step - 1].offsetHeight + parseFloat(vcs.paddingTop) + parseFloat(vcs.paddingBottom);
    if (!done.hidden) h = Math.max(h, (parseFloat(getComputedStyle(done).getPropertyValue('--fe-done-h')) || 560) - (form.offsetHeight - vp.offsetHeight) + 18);
    vp.style.height = h + 'px';
  };
  const go = (n) => {
    if (n === step) return;
    if (n > step && step === 2 && !validate(step2)) return;
    step = n; card.dataset.step = String(n);
    steps.forEach((s, i) => { const k = i + 1; s.classList.toggle('is-active', k === n); s.classList.toggle('is-before', k < n); if (k === n) s.removeAttribute('inert'); else s.setAttribute('inert', ''); });
    bar.style.setProperty('--fkf-p', (n / 3).toFixed(3));
    stepLabel.textContent = 'Step ' + n + ' of 3 · ' + LABELS[n - 1];
    const s = steps[n - 1]; s.setAttribute('tabindex', '-1'); s.focus({ preventScroll: true });
    const r = card.getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * .4) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fit();
    ready();
  };
  const focusFirst = (el) => {
    const t = el.dataset.v === 'date' ? (dateEl.hidden ? $('.fe-days button') : dateEl) : el;
    t.focus({ preventScroll: true }); t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const fail = (el) => shake(el.dataset.v === 'date' ? daysEl : el.dataset.v === 'count' ? el.closest('.fe-guests') : el);
  const validate = (list) => {
    let first = null;
    list.forEach((el) => { const m = check(el); show(el, m); if (m) { fail(el); if (!first) first = el; } });
    if (first) focusFirst(first);
    return !first;
  };
  /* F2d: Next stays strong red before a tile is picked. It is aria-disabled, never `disabled`, so a tap is never dead:
     one gentle shake + a hint ("Pick an occasion, or tap Skip"). Same go() path once a tile is picked. */
  const nudge = document.createElement('p');
  nudge.className = 'fe-nudge'; nudge.id = 'fe-nudge'; nudge.setAttribute('role', 'status'); nudge.textContent = cfg.nudge || 'Pick an occasion, or tap Skip';
  next1.closest('.fe-actions').prepend(nudge);
  /* house style: scale-only press, no ripples or bubble pops on the form (the site's own opt-out hook in fk-fx.js) */
  card.setAttribute('data-fx', 'off');
  let nudgeT = 0;
  const hideNudge = () => { clearTimeout(nudgeT); nudge.classList.remove('is-on'); };
  const nudgeNext = () => {
    nudge.classList.add('is-on'); clearTimeout(nudgeT); nudgeT = setTimeout(hideNudge, 3200);
    next1.animate([{ translate: '0 0' }, { translate: '-5px 0' }, { translate: '5px 0' }, { translate: '-3px 0' }, { translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.25, 1, .5, 1)' });
  };
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => { if (b === next1 && b.getAttribute('aria-disabled') === 'true') { nudgeNext(); return; } go(Number(b.dataset.go)); }));

  /* step 1 tiles (radios) -> hidden field with the exact original option text */
  $$('input[name="fe-occ"]').forEach((r) => r.addEventListener('change', () => { occ.value = r.value; next1.setAttribute('aria-disabled', 'false'); hideNudge(); setTk('occ', r.dataset.t); }));
  $('[data-skip]').addEventListener('click', () => { $$('input[name="fe-occ"]').forEach((r) => { r.checked = false; }); occ.value = ''; next1.setAttribute('aria-disabled', 'true'); setTk('occ', ''); });

  /* step 2: week strip of day chips (green) */
  const start = startDay(); let weekOff = 0;
  const dayDate = (i) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + weekOff * 7 + i); return d; };
  const CK = '<span class="fe-ck" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  const renderDays = () => {
    daysEl.textContent = '';
    for (let i = 0; i < 7; i++) {
      const d = dayDate(i), v = iso(d), isToday = v === today();
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fk-f-chip fk-f-chip--day'; b.dataset.v = v;
      b.setAttribute('aria-pressed', v === dateEl.value ? 'true' : 'false');
      b.setAttribute('aria-label', d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) + (isToday ? ', today' : ''));
      b.innerHTML = '<small>' + CK + (isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })) + '</small><b>' + d.getUTCDate() + '</b>';
      daysEl.appendChild(b);
    }
    $('#fe-week-prev').hidden = weekOff === 0;
    $('#fe-week-next').hidden = weekOff >= 26;
  };
  const setDate = (v) => { dateEl.value = v; setTk('date', fmtTk(v)); if (dateEl.hasAttribute('aria-invalid')) show(dateEl, ''); $$('.fe-days button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === v ? 'true' : 'false')); ready(); };
  dateEl.min = iso(start);
  renderDays();
  daysEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setDate(b.dataset.v); });
  $('#fe-week-next').addEventListener('click', () => { weekOff++; renderDays(); });
  $('#fe-week-prev').addEventListener('click', () => { weekOff--; renderDays(); });
  const pick = $('#fe-pick');
  pick.addEventListener('click', () => { dateEl.hidden = false; pick.setAttribute('aria-expanded', 'true'); dateEl.focus(); try { dateEl.showPicker && dateEl.showPicker(); } catch (x) {} });
  dateEl.addEventListener('change', () => setDate(dateEl.value));

  /* guests stepper */
  const stepG = (d) => { const v = parseInt(gEl.value, 10); const n = Number.isFinite(v) ? v + d : (d > 0 ? Number(cfg.guestFirst) : gMin); gEl.value = Math.min(gMax, Math.max(gMin, n)); if (gEl.hasAttribute('aria-invalid')) show(gEl, ''); setGuests(); ready(); };
  $('#fe-minus').addEventListener('click', () => stepG(-gStep));
  $('#fe-plus').addEventListener('click', () => stepG(gStep));
  gEl.addEventListener('input', () => { if (gEl.hasAttribute('aria-invalid')) show(gEl, ''); setGuests(); ready(); });

  /* text fields: clear the error on the first corrective keystroke, tick when valid, ready ring */
  [...step2, ...step3].filter((el) => el.dataset.v === 'text' || el.dataset.v === 'phone').concat(emailEl).forEach((el) => {
    el.addEventListener('input', () => { if (el.hasAttribute('aria-invalid')) show(el, ''); tick(el); ready(); });
    el.addEventListener('blur', () => tick(el));
  });

  /* remember me (after a send) */
  const rem = $('#fe-remember');
  const showMe = (n) => { $('#fe-rname').textContent = n.trim().split(/\s+/)[0]; rem.hidden = false; };
  try { const me = JSON.parse(localStorage.getItem('fk-me') || 'null'); if (me && me.name) { nameEl.value = me.name || ''; phoneEl.value = me.phone || ''; emailEl.value = me.email || ''; showMe(me.name); [nameEl, phoneEl, emailEl].forEach(tick); } } catch (x) {}
  $('#fe-clear').addEventListener('click', () => { try { localStorage.removeItem('fk-me'); } catch (x) {} nameEl.value = phoneEl.value = emailEl.value = ''; rem.hidden = true; [nameEl, phoneEl, emailEl].forEach(tick); ready(); nameEl.focus(); });

  /* send: WhatsApp opens inside the tap; the tear and the check play at the same moment */
  const ding = () => { try { if (sessionStorage.getItem('fk-sound') !== '1') return; const C = window.AudioContext || window.webkitAudioContext, a = new C(), o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(.12, a.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + .35); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + .4); } catch (x) {} };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending) return;
    if (step < 3) { go(step + 1); return; }
    let first = null;
    [...step2, ...step3].forEach((el) => { const m = check(el); show(el, m); if (m) { fail(el); if (!first) first = el; } });
    if (first) { if (step2.includes(first)) go(2); focusFirst(first); return; }
    sending = true; sendBtn.setAttribute('aria-busy', 'true');
    sendBtn.style.width = sendBtn.offsetWidth + 'px'; sendBtn.classList.add('is-busy'); setSendLab('Opening WhatsApp…');
    /* one shared WhatsApp format (public/js/fk-wa.js); the Web3Forms payload (sent) is unchanged */
    const core = {}, extra = [], sent = {};
    cfg.order.forEach((id) => {
      const el = document.getElementById(id), t = el.dataset.v; let v = el.value.trim();
      if (el.type === 'email' && !v) return; // optional: only sent when filled
      if (el.type === 'hidden' && !v) return; // occasion / cuisine step skipped
      if (t === 'phone') { const x = digits(v); v = '+91 ' + x.slice(0, 5) + ' ' + x.slice(5); }
      else if (t === 'date') v = new Date(v + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      else if (el.tagName === 'SELECT') v = (!el.value && el.dataset.empty) ? el.dataset.empty : el.selectedOptions[0].textContent.trim();
      const l = el.dataset.l;
      if (l === 'Name') core.name = el.value.trim(); else if (l === 'Phone') core.phone = el.value.trim(); else if (l === 'Date') core.date = el.value.trim(); else if (l === 'Guests') core.guests = el.value.trim(); else extra.push([l, v]);
      sent[l] = v;
    });
    window.fkForm?.send('events', cfg.subject, sent, $('[name=botcheck]'));
    try { localStorage.setItem('fk-me', JSON.stringify({ name: nameEl.value.trim(), phone: phoneEl.value.trim(), email: emailEl.value.trim() })); } catch (x) {}
    const url = 'https://wa.me/919059670033?text=' + encodeURIComponent(window.fkWa.format({ kind: cfg.kind, name: core.name, phone: core.phone, date: core.date, guests: core.guests, lines: extra }));
    $('#fe-done-wa').href = url;
    const w = window.open(url, '_blank'); if (w) { try { w.opener = null; } catch (x) {} }
    /* the tick pops in the chip, then the tear and the done screen play together */
    setTimeout(() => sendBtn.classList.add('is-ok'), 450);
    setTimeout(() => {
      $('.fe-step[data-step="3"] [data-fe-tk]').classList.add('is-torn');
      done.hidden = false; void done.offsetWidth; done.classList.add('is-in'); if (innerWidth < 821) card.scrollIntoView({ behavior: 'smooth', block: 'end' }); ding();
    }, 750);
  });
  $('#fe-again').addEventListener('click', () => { done.classList.remove('is-in'); done.hidden = true; $$('.fe-tk').forEach((t) => t.classList.remove('is-torn')); sending = false; sendReset(); });

  /* height fit: first fit has no transition; later size changes (summary opens, errors, fonts) animate */
  vp.classList.add('fe-nofit'); fit(); requestAnimationFrame(() => requestAnimationFrame(() => vp.classList.remove('fe-nofit')));
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => fit()); steps.forEach((x) => ro.observe(x)); }
  new MutationObserver(fit).observe(done, { attributes: true, attributeFilter: ['hidden', 'class'] });
  /* the welcome elephant nods once when a tile is picked */
  const nod = () => [$('.fe-masc', steps[0]), document.querySelector('.fe-side-m')].forEach((m) => m && m.animate([{ translate: '0 0' }, { translate: '0 -6px' }, { translate: '0 0' }], { duration: 360, easing: 'cubic-bezier(.34, 1.56, .64, 1)' }));
  $$('input[name="fe-occ"]').forEach((r) => r.addEventListener('change', nod));

  /* tiles rise in once the card scrolls into view */
  form.classList.add('fe-pre');
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { form.classList.add('fe-in'); io.disconnect(); } }, { threshold: .15 }); io.observe(card); }
  else form.classList.add('fe-in');
  ready();
}
