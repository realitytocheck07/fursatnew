import { defineField, defineType } from 'sanity'
import { withCharCount } from '../components/CharCount.js'
import {
  LIMITS,
  TYPE_LABELS,
  altRequired,
  buttonCheck,
  cardStatus,
  endAfterStart,
  endRequiredForType,
  photoWideEnough,
  pinnedLimit,
  realPhotoTickRequired,
  termsRequiredForOffer,
} from './rules.js'
import { SITE_PAGES } from './sitePages.js'

const hasPhoto = ({ document }) => Boolean(document?.photo?.asset)

export default defineType({
  name: 'announcement',
  title: "What's new card",
  type: 'document',
  description: 'One card in the "What\'s new" section on the Home page.',
  fields: [
    defineField({
      name: 'type',
      title: 'What kind of card is this?',
      type: 'string',
      description: 'Offer, Event and News show as a card. Wish (for example a festival greeting) shows as a gold banner instead.',
      options: {
        layout: 'radio',
        direction: 'horizontal',
        list: [
          { title: 'Offer', value: 'offer' },
          { title: 'Event', value: 'event' },
          { title: 'News', value: 'news' },
          { title: 'Wish', value: 'wish' },
        ],
      },
      validation: (Rule) => Rule.required().error('Choose what kind of card this is.'),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: `The big line on the card. Keep it short (up to ${LIMITS.title} characters).`,
      components: { input: withCharCount(LIMITS.title) },
      validation: (Rule) => Rule.required().min(1).max(LIMITS.title).error(`Add a title, up to ${LIMITS.title} characters.`),
    }),
    defineField({
      name: 'text',
      title: 'Short text',
      type: 'text',
      rows: 3,
      description: `One or two short sentences under the title (up to ${LIMITS.text} characters).`,
      components: { input: withCharCount(LIMITS.text) },
      validation: (Rule) => Rule.required().min(1).max(LIMITS.text).error(`Add a short text, up to ${LIMITS.text} characters.`),
    }),
    defineField({
      name: 'photo',
      title: 'Photo (optional)',
      type: 'image',
      description: `A real photo of Fursat or our food, at least ${LIMITS.minPhotoWidth}px wide. Drag the dot in "Edit image" to choose what stays in the picture when it is cropped.`,
      options: { hotspot: true, accept: 'image/jpeg,image/png,image/webp' },
      hidden: ({ document }) => document?.type === 'wish',
      fields: [
        defineField({
          name: 'alt',
          title: 'Describe the photo',
          type: 'string',
          description: 'A few words on what the photo shows, for guests who cannot see it. For example: "Tandoori platter on a wooden table". Required with every photo.',
          validation: (Rule) => Rule.custom((alt, context) => altRequired(alt, context.parent)),
        }),
      ],
      validation: (Rule) => Rule.custom((photo) => photoWideEnough(photo)),
    }),
    defineField({
      name: 'photoIsReal',
      title: 'This is a real photo of Fursat or our food, and we may use it',
      type: 'boolean',
      description: 'Tick only if this is our own photo (not a stock or AI picture) and nobody in it has objected. Required with any photo.',
      initialValue: false,
      hidden: ({ document }) => !hasPhoto({ document }),
      validation: (Rule) => Rule.custom((tick, context) => realPhotoTickRequired(tick, context.document)),
    }),
    defineField({
      name: 'terms',
      title: 'Offer terms',
      type: 'string',
      description: `One short line of conditions, for example who it is for or what is not included (up to ${LIMITS.terms} characters). Guests also see a "Terms apply" link to the Terms page.`,
      components: { input: withCharCount(LIMITS.terms) },
      hidden: ({ document }) => document?.type !== 'offer',
      validation: (Rule) =>
        Rule.max(LIMITS.terms)
          .error(`Terms: up to ${LIMITS.terms} characters.`)
          .custom((terms, context) => termsRequiredForOffer(terms, context.document)),
    }),
    defineField({
      name: 'button',
      title: 'Button (optional)',
      type: 'object',
      description: 'A button on the card. Leave empty for a card with no button.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'label',
          title: 'Button label',
          type: 'string',
          description: `What the button says, for example "Book a table" (up to ${LIMITS.buttonLabel} characters).`,
          components: { input: withCharCount(LIMITS.buttonLabel) },
          validation: (Rule) => Rule.max(LIMITS.buttonLabel).error(`Button label: up to ${LIMITS.buttonLabel} characters.`),
        }),
        defineField({
          name: 'kind',
          title: 'Where does the button go?',
          type: 'string',
          description: 'Choose one. A page on our website is the simplest.',
          options: {
            layout: 'radio',
            list: [
              { title: 'A page on our website', value: 'page' },
              { title: 'WhatsApp, with a message already typed', value: 'whatsapp' },
              { title: 'Another website', value: 'link' },
            ],
          },
        }),
        defineField({
          name: 'page',
          title: 'Which page?',
          type: 'string',
          description: 'Pick from the list of pages on our website.',
          options: { list: SITE_PAGES },
          hidden: ({ parent }) => parent?.kind !== 'page',
        }),
        defineField({
          name: 'whatsappMessage',
          title: 'WhatsApp message',
          type: 'text',
          rows: 2,
          description: 'The message guests will see ready to send to Fursat on WhatsApp. They can edit it before sending.',
          hidden: ({ parent }) => parent?.kind !== 'whatsapp',
        }),
        defineField({
          name: 'url',
          title: 'Link',
          type: 'url',
          description: 'The full address, starting with https://',
          hidden: ({ parent }) => parent?.kind !== 'link',
        }),
      ],
      validation: (Rule) => Rule.custom((button) => buttonCheck(button)),
    }),
    defineField({
      name: 'startAt',
      title: 'Show from',
      type: 'datetime',
      description: 'The card appears on the site from this moment. The site refreshes every morning at 6:00 AM, and whenever you press Publish.',
      options: { timeStep: 15 },
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required().error('Choose when the card starts showing.'),
    }),
    defineField({
      name: 'endAt',
      title: 'Show until',
      type: 'datetime',
      description: 'The card comes down by itself after this moment. Required for Offers and Wishes. Must be after "Show from".',
      options: { timeStep: 15 },
      validation: (Rule) =>
        Rule.custom((endAt, context) => {
          const required = endRequiredForType(endAt, context.document)
          return required === true ? endAfterStart(endAt, context.document) : required
        }),
    }),
    defineField({
      name: 'pinned',
      title: 'Pin to the top',
      type: 'boolean',
      description: 'The pinned card shows first, and bigger on a computer. Only one card can be pinned at a time.',
      initialValue: false,
      validation: (Rule) =>
        Rule.custom(async (pinned, context) => {
          if (pinned !== true) return true
          const others = await context.getClient({ apiVersion: '2024-01-01' }).fetch('*[_type == "announcement" && pinned == true]{_id, endAt}')
          return pinnedLimit(pinned, context.document?._id, others)
        }),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'A small number shows earlier (1 comes before 2). Pinned cards always come first.',
      initialValue: 10,
      validation: (Rule) => Rule.integer().min(0).max(999).error('Order: a whole number from 0 to 999.'),
    }),
  ],
  preview: {
    select: { title: 'title', type: 'type', startAt: 'startAt', endAt: 'endAt', pinned: 'pinned', media: 'photo' },
    prepare({ title, type, startAt, endAt, pinned, media }) {
      const parts = [cardStatus(startAt, endAt), TYPE_LABELS[type] || 'No type yet']
      if (pinned) parts.push('Pinned')
      return { title: title || 'Untitled card', subtitle: parts.join(' · '), media }
    },
  },
  orderings: [
    { title: 'Order, then newest', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }, { field: 'startAt', direction: 'desc' }] },
    { title: 'Ends soonest', name: 'endAsc', by: [{ field: 'endAt', direction: 'asc' }] },
  ],
})
