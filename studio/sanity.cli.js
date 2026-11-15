import { defineCliConfig } from 'sanity/cli'
import { readEnv } from './env.js'

const { projectId, dataset } = readEnv({
  projectId: process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.SANITY_STUDIO_DATASET,
})

export default defineCliConfig({
  api: { projectId, dataset },
  // First deploy picks https://fursat.sanity.studio (if the name is free).
  studioHost: 'fursat',
})
