// One dish row of the full menu ("App card"), as an HTML string.
// The server renders the first group with it (DishRow.astro) and menu-v2.ts renders every other group on demand
// from compact records (JSON in the page), so both produce the same markup.
import { money } from './cart';

export interface RowRec {
  n: string;                       // shown name (title case)
  an: string;                      // data-n for picks: name + (variant label)
  d?: string;                      // description as in food.json / drinks.json
  o?: string;                      // note
  v: 0 | 1;                        // veg
  s?: 1;                           // spicy
  f?: 1;                           // chef's pick
  a?: 1;                           // contains alcohol
  p: number | null;                // main price (null = no price, no Add button)
  vs?: [string, number][];         // price variants, only when there is more than one
  g?: string;                      // full photo (data-img for the dish sheet)
  ph?: [string, number, number, string]; // thumb src, width, height, fit style
}
export interface RowCtx { sec: string; k: 'food' | 'drink' }

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// "Half ₹599 | Full ₹999" is shown as two price pills, so it is not repeated as a description.
export const cleanDesc = (r: RowRec) =>
  r.vs && r.vs.length > 1 ? (r.d ?? '').replace(/\s*Half\s*₹?\s*[\d,]+\s*\|\s*Full\s*₹?\s*[\d,]+\s*/i, '').trim() : (r.d ?? '');

export function rowHtml(r: RowRec, c: RowCtx): string {
  const desc = cleanDesc(r);
  const text = `${r.n} ${r.d ?? ''} ${c.sec}`.toLowerCase();
  const prices = r.vs && r.vs.length > 1
    ? r.vs.map(([l, v]) => `<span class="mv-pp"><small>${esc(l)}</small> ${money(v)}</span>`).join('')
    : `<span class="mv-pp">${r.p != null ? money(r.p) : '—'}</span>`;
  const thumb = r.ph
    ? `<span class="mv-c-clip"><img class="fk-fit" src="${esc(r.ph[0])}" alt="" width="${r.ph[1]}" height="${r.ph[2]}" loading="lazy" decoding="async" style="${esc(r.ph[3])}"></span>`
    : '<span class="mv-c-ph" aria-hidden="true">F</span>';
  const add = r.p != null
    ? `<button class="mv-add" type="button" aria-pressed="false" aria-label="${esc(`Add ${r.n} to picks`)}" data-add="" data-n="${esc(r.an)}" data-p="${r.p}" data-c="${esc(c.sec)}" data-k="${c.k}" data-v="${r.v ? 'v' : 'n'}"${r.a ? ' data-a="1"' : ''}><span class="mv-add-t" aria-hidden="true">+ Add</span></button>`
    : '';
  return `<li class="mv-item mv-card" data-row="" data-sec="${esc(c.sec)}" data-veg="${r.v}" data-text="${esc(text)}"${r.g ? ` data-img="${esc(r.g)}"` : ''}>`
    + `<div class="mv-c-info"><h4 class="mv-item-name"><button class="mv-open" type="button" aria-haspopup="dialog"><span class="mv-iname">${esc(r.n)}</span></button></h4>`
    + (desc ? `<p class="mv-idesc">${esc(desc)}</p>` : '')
    + (r.o ? `<p class="mv-note">${esc(r.o)}</p>` : '')
    + `<div class="fk-chips"><span class="${r.v ? 'fk-chip fk-chip--veg' : 'fk-chip fk-chip--nonveg'}">${r.v ? 'Veg' : 'Non-veg'}</span>`
    + (r.s ? '<span class="fk-chip fk-chip--spicy">🌶 Spicy</span>' : '')
    + (r.f ? '<span class="fk-chip fk-chip--pick">★ Chef\'s pick</span>' : '')
    + `</div><div class="mv-c-row"><span class="mv-item-price num">${prices}</span></div></div>`
    + `<div class="mv-c-thumb">${thumb}${add}</div></li>`;
}
