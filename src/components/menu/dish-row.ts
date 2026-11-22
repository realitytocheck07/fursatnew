// One dish row of the full menu ("printed menu" line: mark · Name ····· price), as an HTML string.
// The server renders the first group with it (DishRow.astro) and menu-v2.ts renders every other group on demand
// from compact records (JSON in the page), so both produce the same markup.

// Manual en-IN grouping: Intl output differs between Node and browsers and breaks hydration.
export const money = (n: number) => {
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3), rest = s.slice(0, -3);
  const g = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return (n < 0 ? '-' : '') + '\u20B9' + g;
};

export interface RowRec {
  n: string;                       // shown name (title case)
  an: string;                      // dish key: name + (variant label); the table, #dish= links and the sheet find a row by it
  d?: string;                      // description as in food.json / drinks.json
  o?: string;                      // note
  v: 0 | 1;                        // veg
  s?: 1;                           // spicy
  f?: 1;                           // chef's pick
  a?: 1;                           // contains alcohol
  p: number | null;                // main price (null = no price)
  vs?: [string, number][];         // price variants, only when there is more than one
  g?: string;                      // full photo (data-img for the dish sheet)
  ph?: [string, number, number, string, string]; // thumb src, width, height, fit style (1:1), fit style (4:5 hover card)
}
export interface RowCtx { sec: string; k: 'food' | 'drink' }

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// "Half ₹599 | Full ₹999" is shown as "₹599 / ₹999", so it is not repeated as a description.
export const cleanDesc = (r: RowRec) =>
  r.vs && r.vs.length > 1 ? (r.d ?? '').replace(/\s*Half\s*₹?\s*[\d,]+\s*\|\s*Full\s*₹?\s*[\d,]+\s*/i, '').trim() : (r.d ?? '');

const SPICY = '<span class="mv-tg mv-tg--s"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.5 3.5c-1 .2-1.8.8-2.2 1.6-3.8 0-9.8 3.8-10.3 11.8 0 1.6 1.2 2.8 2.7 2.8 7.7-.5 11.3-6.4 11.3-10.3 1-.3 1.6-1.1 1.6-2.1-1 .1-1.8-.1-2.1-.6z" fill="currentColor"/></svg><span class="mv-sr">Spicy</span></span>';
const CAM = '<span class="mw-cam" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.3-2h6l1.3 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="currentColor"/></svg></span>';
const PICK = '<span class="mv-tg mv-tg--f"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2.8 2.7 5.8 6.3.7-4.7 4.3 1.3 6.3L12 16.7 6.4 19.9l1.3-6.3L3 9.3l6.3-.7z" fill="currentColor"/></svg><span class="mv-sr">Chef\'s pick</span></span>';

export function rowHtml(r: RowRec, c: RowCtx): string {
  const desc = cleanDesc(r);
  const text = `${r.n} ${r.d ?? ''} ${c.sec}`.toLowerCase();
  const multi = !!(r.vs && r.vs.length > 1);
  const price = multi
    ? r.vs!.map(([l, v]) => `<span class="mv-pp"><small class="mv-vl">${esc(l)} </small>${money(v)}</span>`).join('')
    : `<span class="mv-pp">${r.p != null ? money(r.p) : '—'}</span>`;
  const mark = `<i class="mv-mk ${r.v ? 'mv-mk--v' : 'mv-mk--n'}" role="img" aria-label="${r.v ? 'Vegetarian' : 'Non-vegetarian'}"></i>`;
  const thumb = r.ph
    ? `<span class="mv-th" aria-hidden="true"><img class="fk-fit" src="${esc(r.ph[0])}" alt="" width="32" height="32" loading="lazy" decoding="async" style="${esc(r.ph[3])}"></span>`
    : '';
  return `<li class="mv-item mv-row" data-row="" data-sec="${esc(c.sec)}" data-veg="${r.v}" data-an="${esc(r.an)}" data-text="${esc(text)}"`
    + `${r.s ? ' data-s="1"' : ''}${r.f ? ' data-f="1"' : ''}${r.a ? ' data-a="1"' : ''}`
    + `${r.g ? ` data-img="${esc(r.g)}"` : ''}${r.ph ? ` data-prev="${esc(r.ph[0])}" data-hfit="${esc(r.ph[4])}"` : ''}>`
    + `<div class="mv-rl">${mark}${thumb}`
    + `<h4 class="mv-item-name"><button class="mv-open" type="button" aria-haspopup="dialog"><span class="mv-iname">${esc(r.n)}</span></button></h4>`
    + `${r.ph ? CAM : ''}${r.s ? SPICY : ''}${r.f ? PICK : ''}<span class="fk-chips mv-chips"></span>`
    + `<span class="mv-ld" aria-hidden="true"></span><span class="mv-item-price num">${price}</span></div>`
    + (desc ? `<p class="mv-idesc">${esc(desc)}</p>` : '')
    + (r.o ? `<p class="mv-note">${esc(r.o)}</p>` : '')
    + '</li>';
}
