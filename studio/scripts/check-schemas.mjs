// Runs every validation rule of the real schemas against sample good and bad documents.
// No Sanity project or network needed:  node scripts/check-schemas.mjs   (or: npm run check)
import { register } from 'node:module'

register('./stub-loader.mjs', import.meta.url)

const { schemaTypes } = await import('../schemaTypes/index.js')

// --- a tiny stand-in for Sanity's Rule object: records the chain, then runs it ---
class Rule {
  constructor() { this.checks = []; this.level = 'error'; this.message = null }
  required() { this.checks.push(['required']); return this }
  min(n) { this.checks.push(['min', n]); return this }
  max(n) { this.checks.push(['max', n]); return this }
  integer() { this.checks.push(['integer']); return this }
  custom(fn) { this.checks.push(['custom', fn]); return this }
  error(msg) { this.message = msg ?? this.message; this.level = 'error'; return this }
  warning(msg) { this.message = msg ?? this.message; this.level = 'warning'; return this }
}

const isEmpty = (v) => v === undefined || v === null || v === '' || (typeof v === 'string' && v.trim() === '')

async function runRule(rule, value, ctx) {
  const out = []
  const fail = (def) => out.push({ level: rule.level, message: rule.message || def })
  for (const [kind, arg] of rule.checks) {
    if (kind === 'required') { if (isEmpty(value)) fail('Required') }
    else if (kind === 'custom') {
      const r = await arg(value, ctx)
      if (r !== true && r !== undefined && r !== null) out.push({ level: rule.level, message: typeof r === 'string' ? r : r.message })
    } else if (isEmpty(value)) continue
    else if (kind === 'min') { const n = typeof value === 'string' || Array.isArray(value) ? value.length : value; if (n < arg) fail(`Must be at least ${arg}`) }
    else if (kind === 'max') { const n = typeof value === 'string' || Array.isArray(value) ? value.length : value; if (n > arg) fail(`Must be at most ${arg}`) }
    else if (kind === 'integer') { if (!Number.isInteger(value)) fail('Must be a whole number') }
  }
  return out
}

async function validateFields(fields, value, document, getClient) {
  const problems = []
  for (const f of fields) {
    const v = value?.[f.name]
    const ctx = { document, parent: value, getClient }
    if (typeof f.hidden === 'function' && f.hidden({ document, parent: value, value: v })) continue // hidden fields are not validated
    for (const spec of [].concat(f.validation ? f.validation(new Rule()) : [])) {
      for (const p of await runRule(spec, v, ctx)) problems.push({ field: f.name, ...p })
    }
    if (f.fields && v !== undefined && v !== null) problems.push(...(await validateFields(f.fields, v, document, getClient)))
    // array of objects: validate each member's fields too
    const member = Array.isArray(f.of) ? f.of.find((m) => m.fields) : null
    if (member && Array.isArray(v)) for (const item of v) problems.push(...(await validateFields(member.fields, item, document, getClient)))
  }
  return problems
}

const schema = Object.fromEntries(schemaTypes.map((t) => [t.name, t]))
const validate = (type, doc, others = []) =>
  validateFields(schema[type].fields, doc, doc, () => ({ fetch: async () => others }))

// --- sample data ---
const now = Date.now()
const iso = (days) => new Date(now + days * 864e5).toISOString()
const ref = (w, h = 900) => ({ _type: 'reference', _ref: `image-${'a'.repeat(40)}-${w}x${h}-jpg` })
const photo = (w = 1600, alt = 'Tandoori platter on a wooden table') => ({ _type: 'image', asset: ref(w), alt })
const text = (n) => 'x'.repeat(n)

const news = { _id: 'n1', type: 'news', title: 'New weekend brunch', text: 'Join us this weekend.', startAt: iso(-1), order: 10 }
const offer = { ...news, _id: 'o1', type: 'offer', terms: 'TODO(client): sample terms line', endAt: iso(7) }
const wish = { ...news, _id: 'w1', type: 'wish', endAt: iso(3) }

// [name, type, document, expected error text (string) or null for "no error", other pinned docs]
const cases = [
  ['Good: minimal News card', 'announcement', news, null],
  ['Good: Ask Fursat card with question and dishes', 'announcement', { ...news, type: 'ask', askQuestion: 'Something spicy', askChips: ['Dynamite prawns'] }, null],
  ['Bad: Ask Fursat card without a question', 'announcement', { ...news, type: 'ask' }, 'sample question'],
  ['Bad: Ask Fursat card with 4 dishes', 'announcement', { ...news, type: 'ask', askQuestion: 'Q', askChips: ['a', 'b', 'c', 'd'] }, 'Up to 3 dishes'],
  ['Good: one big number', 'announcement', { ...news, stats: [{ _key: 'a', prefix: '₹', value: 925, caption: 'per guest, from' }] }, null],
  ['Bad: three big numbers', 'announcement', { ...news, stats: [{ _key: 'a', value: 1 }, { _key: 'b', value: 2 }, { _key: 'c', value: 3 }] }, 'Up to 2 big numbers'],
  ['Bad: big number caption of 41 characters', 'announcement', { ...news, stats: [{ _key: 'a', value: 1, caption: text(41) }] }, 'Up to 40 characters'],
  ['Good: full Offer with photo, alt, tick, terms, end, button', 'announcement', { ...offer, photo: photo(), photoIsReal: true, button: { label: 'Book a table', kind: 'page', page: '/reserve' } }, null],
  ['Good: Wish with an End date', 'announcement', wish, null],
  ['Good: News with no End date (stays until removed)', 'announcement', news, null],

  ['Bad: End before Start', 'announcement', { ...news, endAt: iso(-2) }, 'End must be after Start'],
  ['Bad: End equal to Start', 'announcement', { ...news, endAt: news.startAt }, 'End must be after Start'],
  ['Bad: Offer without End', 'announcement', { ...offer, endAt: undefined }, 'Offers need an End date'],
  ['Bad: Wish without End', 'announcement', { ...wish, endAt: undefined }, 'Wishes need an End date'],

  ['Good: first pinned card (nothing else pinned)', 'announcement', { ...news, pinned: true }, null, []],
  ['Bad: second pinned card', 'announcement', { ...news, pinned: true }, 'Only one card can be pinned', [{ _id: 'other', endAt: iso(5) }]],
  ['Bad: second pinned card (other has no End)', 'announcement', { ...news, pinned: true }, 'Only one card can be pinned', [{ _id: 'other' }]],
  ['Good: re-saving the card that is already pinned (draft id)', 'announcement', { ...news, _id: 'drafts.n1', pinned: true }, null, [{ _id: 'n1' }]],
  ['Good: other pinned card has already ended', 'announcement', { ...news, pinned: true }, null, [{ _id: 'old', endAt: iso(-1) }]],
  ['Good: not pinned while another card is pinned', 'announcement', { ...news, pinned: false }, null, [{ _id: 'other' }]],

  ['Bad: photo without alt text', 'announcement', { ...news, photo: photo(1600, ''), photoIsReal: true }, 'Describe the photo'],
  ['Bad: photo with blank (spaces) alt text', 'announcement', { ...news, photo: photo(1600, '   '), photoIsReal: true }, 'Describe the photo'],
  ['Bad: photo without the real-photo tick', 'announcement', { ...news, photo: photo(), photoIsReal: false }, 'real photo of Fursat'],
  ['Bad: photo with tick never touched', 'announcement', { ...news, photo: photo() }, 'real photo of Fursat'],
  ['Good: no photo, no tick, no alt needed', 'announcement', { ...news, photoIsReal: false }, null],
  ['Bad: photo 1199px wide', 'announcement', { ...news, photo: photo(1199), photoIsReal: true }, 'at least 1200px'],
  ['Good: photo exactly 1200px wide', 'announcement', { ...news, photo: photo(1200), photoIsReal: true }, null],

  ['Good: title of 60 characters', 'announcement', { ...news, title: text(60) }, null],
  ['Bad: title of 61 characters', 'announcement', { ...news, title: text(61) }, 'up to 60 characters'],
  ['Good: text of 160 characters', 'announcement', { ...news, text: text(160) }, null],
  ['Bad: text of 161 characters', 'announcement', { ...news, text: text(161) }, 'up to 160 characters'],
  ['Good: button label of 24 characters', 'announcement', { ...news, button: { label: text(24), kind: 'page', page: '/menu' } }, null],
  ['Bad: button label of 25 characters', 'announcement', { ...news, button: { label: text(25), kind: 'page', page: '/menu' } }, 'up to 24 characters'],

  ['Bad: Offer without terms', 'announcement', { ...offer, terms: undefined }, 'needs its terms'],
  ['Bad: Offer with blank terms', 'announcement', { ...offer, terms: '  ' }, 'needs its terms'],
  ['Good: News without terms', 'announcement', news, null],

  ['Bad: missing title', 'announcement', { ...news, title: undefined }, 'Add a title'],
  ['Bad: missing short text', 'announcement', { ...news, text: undefined }, 'Add a short text'],
  ['Bad: missing type', 'announcement', { ...news, type: undefined }, 'Choose what kind of card'],
  ['Bad: missing Start', 'announcement', { ...news, startAt: undefined }, 'Choose when the card starts'],

  ['Bad: button label but no destination type', 'announcement', { ...news, button: { label: 'Book' } }, 'Choose where the button goes'],
  ['Bad: button page not picked', 'announcement', { ...news, button: { label: 'Book', kind: 'page' } }, 'Pick the page'],
  ['Bad: WhatsApp button with no message', 'announcement', { ...news, button: { label: 'Chat', kind: 'whatsapp' } }, 'Write the message'],
  ['Bad: link that is not https', 'announcement', { ...news, button: { label: 'Open', kind: 'link', url: 'http://example.com' } }, 'must start with https'],
  ['Good: https link button', 'announcement', { ...news, button: { label: 'Open', kind: 'link', url: 'https://example.com' } }, null],
  ['Bad: button destination but no label', 'announcement', { ...news, button: { kind: 'page', page: '/menu' } }, 'Give the button a label'],

  ['Bad: order not a whole number', 'announcement', { ...news, order: 1.5 }, 'whole number'],

  ['Good: settings with defaults', 'homeNews', { enabled: true, kicker: 'Latest at Fursat', heading: "What's new", maxCards: 4, showBuiltInCards: true }, null],
  ['Good: settings with 6 cards', 'homeNews', { kicker: 'Latest at Fursat', heading: "What's new", maxCards: 6 }, null],
  ['Bad: settings with 7 cards', 'homeNews', { kicker: 'Latest at Fursat', heading: "What's new", maxCards: 7 }, 'from 1 to 6'],
  ['Bad: settings with 0 cards', 'homeNews', { kicker: 'Latest at Fursat', heading: "What's new", maxCards: 0 }, 'from 1 to 6'],
  ['Bad: settings with no heading', 'homeNews', { kicker: 'Latest at Fursat', maxCards: 4 }, 'Add a heading'],
]

// --- structural checks ---
const structure = []
for (const t of schemaTypes) {
  for (const f of t.fields) {
    structure.push([`Help text on ${t.name}.${f.name}`, Boolean(f.description)])
    for (const n of f.fields || []) structure.push([`Help text on ${t.name}.${f.name}.${n.name}`, Boolean(n.description)])
  }
}
structure.push(['Schemas are announcement + homeNews', schemaTypes.map((t) => t.name).join(',') === 'announcement,homeNews'])

// --- desk structure: settings on top, then Active, Scheduled, Ended ---
const { deskStructure, FILTERS } = await import('../structure/index.js')
const chain = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : chain()), apply: () => chain() })
const fakeS = new Proxy({}, {
  get: (_, k) => {
    if (k === 'divider') return () => ({ divider: true })
    if (k === 'listItem') return () => { const o = { title(t) { o.t = t; return o }, id: () => o, icon: () => o, child: () => o }; return o }
    if (k === 'list') return () => { const o = { title: () => o, items(a) { o.items = a; return o } }; return o }
    return () => chain()
  },
})
const deskItems = deskStructure(fakeS).items
const deskOrder = deskItems.map((i) => (i.divider ? '---' : i.t)).join(' | ')
structure.push([`Desk order is: ${deskOrder}`, deskOrder === "What's new settings | --- | Active now | Scheduled | Ended | --- | All cards"])
structure.push(['Desk filters use start/end dates', FILTERS.active.includes('startAt <= now()') && FILTERS.scheduled.includes('startAt > now()') && FILTERS.ended.includes('endAt <= now()')])

let pass = 0, fail = 0
const line = (ok, name, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`) }

console.log('--- Validation rules ---')
for (const [name, type, doc, expected, others] of cases) {
  const errors = (await validate(type, doc, others)).filter((p) => p.level === 'error')
  if (expected === null) line(errors.length === 0, name, errors.map((e) => `${e.field}: ${e.message}`).join(' | '))
  else {
    const hit = errors.some((e) => e.message.includes(expected))
    line(hit, name, hit ? '' : `expected "${expected}", got ${errors.length ? errors.map((e) => `${e.field}: ${e.message}`).join(' | ') : 'no error'}`)
  }
}
console.log('--- Structure ---')
for (const [name, ok] of structure) line(ok, name)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
