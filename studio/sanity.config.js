import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes/index.js'
import { deskStructure } from './structure/index.js'
import { fursatTheme } from './theme.js'
import Logo from './components/Logo.js'
import { readEnv } from './env.js'

const { projectId, dataset } = readEnv({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET,
})

// The settings document exists once: it can be edited and published, never created again, duplicated or deleted.
const SETTINGS_ACTIONS = ['publish', 'discardChanges', 'restore']

export default defineConfig({
  name: 'fursat',
  title: 'Fursat',
  projectId,
  dataset,
  theme: fursatTheme,
  studio: { components: { logo: Logo } },
  plugins: [structureTool({ structure: deskStructure }), visionTool({ defaultApiVersion: '2024-01-01' })],
  schema: { types: schemaTypes },
  document: {
    actions: (prev, { schemaType }) => (schemaType === 'homeNews' ? prev.filter((a) => SETTINGS_ACTIONS.includes(a.action)) : prev),
    newDocumentOptions: (prev) => prev.filter((o) => o.templateId !== 'homeNews'),
  },
})
