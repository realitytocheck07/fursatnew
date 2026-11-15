// Web3Forms sender. Emails a copy of an enquiry quietly; never blocks the WhatsApp step.
// Use: fkForm.send('restaurant' | 'events', 'Table booking', { name, phone, ... }, honeypotInput)
// Keys are public access keys from site.json "forms" (safe to ship).
(() => {
  const keys = window.__FK_FORMS || {};
  window.fkForm = {
    send(kind, subject, fields, honeypot) {
      const key = keys[kind];
      if (!key) return Promise.resolve(false);
      if (honeypot && (honeypot.checked || honeypot.value)) return Promise.resolve(true);
      const body = { access_key: key, subject: 'FURSAT website: ' + subject, from_name: 'FURSAT website', form: subject, page: location.pathname, ...fields };
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).then((r) => r.ok).catch(() => false);
    },
  };
})();
