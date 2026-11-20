import { CheckmarkCircleIcon, ClockIcon, CogIcon, DocumentsIcon, PlayIcon } from '@sanity/icons'
import CardPreview from '../components/CardPreview.js'

const TYPE = '_type == "announcement"'
const LIVE_START = 'defined(startAt) && startAt <= now()'
const NOT_ENDED = '(!defined(endAt) || endAt > now())'

export const FILTERS = {
  active: `${TYPE} && ${LIVE_START} && ${NOT_ENDED}`,
  scheduled: `${TYPE} && defined(startAt) && startAt > now()`,
  ended: `${TYPE} && defined(endAt) && endAt <= now()`,
  all: TYPE,
}

// Edit form + a live card preview tab
const cardDocument = (S, id) =>
  S.document()
    .documentId(id)
    .schemaType('announcement')
    .views([S.view.form(), S.view.component(CardPreview).title('Card preview')])

const cardList = (S, title, id, icon, filter) =>
  S.listItem()
    .title(title)
    .id(id)
    .icon(icon)
    .child(
      S.documentList()
        .title(title)
        .schemaType('announcement')
        .filter(filter)
        .defaultOrdering([{ field: 'pinned', direction: 'desc' }, { field: 'order', direction: 'asc' }])
        .child((docId) => cardDocument(S, docId)),
    )

export const deskStructure = (S) =>
  S.list()
    .title("What's new")
    .items([
      S.listItem()
        .title("What's new settings")
        .id('homeNews')
        .icon(CogIcon)
        .child(S.document().schemaType('homeNews').documentId('homeNews').title("What's new settings")),
      S.divider(),
      cardList(S, 'Active now', 'active', PlayIcon, FILTERS.active),
      cardList(S, 'Scheduled', 'scheduled', ClockIcon, FILTERS.scheduled),
      cardList(S, 'Ended', 'ended', CheckmarkCircleIcon, FILTERS.ended),
      S.divider(),
      cardList(S, 'All cards', 'all', DocumentsIcon, FILTERS.all),
    ])
