import { defineField, defineType } from 'sanity'
import { withCharCount } from '../components/CharCount.js'
import { LIMITS } from './rules.js'

export default defineType({
  name: 'homeNews',
  title: "What's new settings",
  type: 'document',
  description: 'Settings for the whole "What\'s new" section on the Home page. There is only one of these.',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show this section on the Home page',
      type: 'boolean',
      description: 'Switch off to hide the whole section. Your cards are kept.',
      initialValue: true,
    }),
    defineField({
      name: 'kicker',
      title: 'Small line above the heading',
      type: 'string',
      description: 'Default: "Latest at Fursat".',
      initialValue: 'Latest at Fursat',
      components: { input: withCharCount(30) },
      validation: (Rule) => Rule.required().max(30).error('Add a small line, up to 30 characters.'),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Default: "What\'s new".',
      initialValue: "What's new",
      components: { input: withCharCount(40) },
      validation: (Rule) => Rule.required().max(40).error('Add a heading, up to 40 characters.'),
    }),
    defineField({
      name: 'maxCards',
      title: 'Most cards to show at once',
      type: 'number',
      description: `A number from 1 to ${LIMITS.maxCards}. Default is 4. If you have more live cards, the pinned one and the lowest "Order" numbers win.`,
      initialValue: 4,
      validation: (Rule) => Rule.required().integer().min(1).max(LIMITS.maxCards).error(`Choose a whole number from 1 to ${LIMITS.maxCards}.`),
    }),
    defineField({
      name: 'showBuiltInCards',
      title: 'Show the built-in cards when there are no live cards',
      type: 'boolean',
      description: 'Keep this on so the section is never empty: when none of your cards is live, the four standard cards are shown instead.',
      initialValue: true,
    }),
  ],
  preview: {
    prepare: () => ({ title: "What's new settings" }),
  },
})
