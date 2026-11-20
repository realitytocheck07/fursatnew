// Validation logic kept as plain functions so scripts/check-schemas.mjs can run
// the exact same code Studio runs. Each returns `true` (ok) or an error message.

export const LIMITS = { title: 60, text: 160, buttonLabel: 24, terms: 120, minPhotoWidth: 1200, maxCards: 6, statCaption: 40, askQuestion: 60, askChip: 30 }

const isBlank = (v) => typeof v !== 'string' || v.trim() === ''
const time = (v) => (v ? new Date(v).getTime() : NaN)

export function endAfterStart(endAt, document) {
  if (!endAt) return true
  const end = time(endAt)
  if (Number.isNaN(end)) return 'End is not a valid date.'
  const start = time(document?.startAt)
  if (!Number.isNaN(start) && end <= start) return 'End must be after Start.'
  return true
}

export function endRequiredForType(endAt, document) {
  const type = document?.type
  if ((type === 'offer' || type === 'wish') && !endAt) {
    return `${type === 'offer' ? 'Offers' : 'Wishes'} need an End date, so they come down by themselves.`
  }
  return true
}

export function termsRequiredForOffer(terms, document) {
  if (document?.type === 'offer' && isBlank(terms)) {
    return 'An offer needs its terms: one short line, for example who it is for or what is excluded.'
  }
  return true
}

// Sanity image asset ids look like image-<hash>-<width>x<height>-<ext>
export function parseAssetRef(ref) {
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/i.exec(ref || '')
  return m ? { hash: m[1], width: +m[2], height: +m[3], ext: m[4] } : null
}

export function photoWideEnough(photo) {
  if (!photo?.asset) return true
  const info = parseAssetRef(photo.asset._ref)
  if (!info) return true // cannot read the size, so do not block
  if (info.width < LIMITS.minPhotoWidth) {
    return `This photo is ${info.width}px wide. Please upload one at least ${LIMITS.minPhotoWidth}px wide so it stays sharp.`
  }
  return true
}

export function altRequired(alt, photo) {
  if (photo?.asset && isBlank(alt)) {
    return 'Describe the photo in a few words (for guests who use a screen reader). Required with every photo.'
  }
  return true
}

export function realPhotoTickRequired(tick, document) {
  if (document?.photo?.asset && tick !== true) {
    return 'Tick this box to confirm it is a real photo of Fursat or our food, and we may use it.'
  }
  return true
}

// At most one pinned card. `others` = [{_id, endAt}] of every pinned announcement.
// A pinned card that has already ended no longer counts.
export function pinnedLimit(pinned, documentId, others, now = Date.now()) {
  if (pinned !== true) return true
  const base = String(documentId || '').replace(/^drafts\./, '')
  const clash = (others || []).some((o) => {
    if (String(o._id).replace(/^drafts\./, '') === base) return false
    const end = time(o.endAt)
    return Number.isNaN(end) || end > now
  })
  return clash ? 'Only one card can be pinned. Un-pin the other card first.' : true
}

export function buttonCheck(button) {
  if (!button) return true
  const { label, kind, page, whatsappMessage, url } = button
  const hasLabel = !isBlank(label)
  const dest = kind === 'page' ? page : kind === 'whatsapp' ? whatsappMessage : kind === 'link' ? url : null
  if (!hasLabel && !kind && !dest) return true // button left empty is fine
  if (!hasLabel) return 'Give the button a label, or clear the button.'
  if (!kind) return 'Choose where the button goes.'
  if (isBlank(dest)) {
    return { page: 'Pick the page the button opens.', whatsapp: 'Write the message guests will send on WhatsApp.', link: 'Paste the link the button opens.' }[kind]
  }
  if (kind === 'link' && !isHttpsUrl(url)) return 'The link must start with https://'
  return true
}

export function isHttpsUrl(v) {
  try {
    return new URL(v).protocol === 'https:'
  } catch {
    return false
  }
}

// "Active now" / "Scheduled" / "Ended" label for the list.
export function cardStatus(startAt, endAt, now = Date.now()) {
  const start = time(startAt)
  const end = time(endAt)
  if (!Number.isNaN(end) && end <= now) return 'Ended'
  if (!Number.isNaN(start) && start > now) return 'Scheduled'
  return 'Active now'
}

export const TYPE_LABELS = { offer: 'Offer', event: 'Event', news: 'News', ask: 'Ask Fursat', wish: 'Wish' }

// The Ask Fursat card needs its sample question (the card types it out).
export function askQuestionRequired(question, document) {
  if (document?.type === 'ask' && isBlank(question)) {
    return 'Write the sample question the card types out, for example "Something spicy, not too heavy".'
  }
  return true
}
