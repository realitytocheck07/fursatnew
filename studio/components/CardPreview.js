import { createElement as h } from 'react'
import { useClient } from 'sanity'
import { TYPE_LABELS, cardStatus, parseAssetRef } from '../schemaTypes/rules.js'

// Fursat colours (from the website's design tokens)
const C = { cream: '#f8eee2', cream50: '#fcf7f0', gold: '#c99a43', edge: '#d6aa5a', brown: '#74501a', ink: '#2b2416', forest: '#14301c', onForest: '#fbf3e6', red: '#c0291f' }

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')

function photoUrl(photo, projectId, dataset) {
  const info = parseAssetRef(photo?.asset?._ref)
  if (!info) return null
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${info.hash}-${info.width}x${info.height}.${info.ext}?w=640&auto=format`
}

function Card({ doc, projectId, dataset }) {
  const url = doc.type !== 'wish' ? photoUrl(doc.photo, projectId, dataset) : null
  const pos = doc.photo?.hotspot ? `${doc.photo.hotspot.x * 100}% ${doc.photo.hotspot.y * 100}%` : '50% 50%'
  const label = doc.button?.label
  const isOffer = doc.type === 'offer'

  if (doc.type === 'wish') {
    return h(
      'div',
      { style: { background: `linear-gradient(180deg,#f4d38c,#e3ab4a)`, color: '#2a1d0c', borderRadius: 14, padding: '16px 20px', textAlign: 'center', border: '1px solid #a8731c' } },
      h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600 } }, doc.title || 'Your wish title'),
      h('div', { style: { fontSize: 14, marginTop: 4 } }, doc.text || 'Your short text'),
      doc.endAt && h('div', { style: { fontSize: 12, marginTop: 8 } }, `Until ${fmt(doc.endAt)}`),
    )
  }

  return h(
    'div',
    { style: { background: C.cream50, border: `1px solid ${C.edge}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 20px -12px rgba(14,34,20,.4)' } },
    url
      ? h('img', { src: url, alt: doc.photo?.alt || '', style: { display: 'block', width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', objectPosition: pos } })
      : null,
    h(
      'div',
      { style: { padding: 16 } },
      h(
        'div',
        { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 } },
        h('span', { style: { background: isOffer ? C.forest : C.cream, color: isOffer ? C.onForest : C.brown, border: `1px solid ${C.edge}`, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600 } }, TYPE_LABELS[doc.type] || 'Type not chosen'),
        isOffer && doc.endAt ? h('span', { style: { fontSize: 12, color: C.brown } }, `Ends ${fmt(doc.endAt)}`) : null,
        doc.pinned ? h('span', { style: { fontSize: 12, color: C.brown } }, 'Pinned') : null,
      ),
      h('div', { style: { fontFamily: 'Georgia, serif', fontSize: 20, lineHeight: 1.2, color: C.ink, fontWeight: 600 } }, doc.title || 'Your title appears here'),
      h('div', { style: { fontSize: 14, lineHeight: 1.5, color: C.ink, marginTop: 6 } }, doc.text || 'Your short text appears here.'),
      isOffer && doc.terms ? h('div', { style: { fontSize: 12, color: C.brown, marginTop: 8 } }, `${doc.terms} · Terms apply`) : null,
      label
        ? h('div', { style: { marginTop: 12, display: 'inline-block', background: C.forest, color: C.onForest, borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 600, boxShadow: `0 0 0 1px ${C.gold}` } }, label)
        : null,
    ),
  )
}

// "Card preview" tab next to the edit form. Updates as the editor types.
export default function CardPreview({ document }) {
  const { projectId, dataset } = useClient({ apiVersion: '2024-01-01' }).config()
  const doc = document?.displayed || {}
  const status = cardStatus(doc.startAt, doc.endAt)
  return h(
    'div',
    { style: { maxWidth: 420, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' } },
    h('div', { style: { fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.brown, marginBottom: 8 } }, `Preview · ${status}`),
    h(Card, { doc, projectId, dataset }),
    h('p', { style: { fontSize: 13, color: '#5c4a2a', marginTop: 16, lineHeight: 1.5 } }, 'This is a close look at how the card will read. The real card on the site may differ slightly in spacing.'),
  )
}
