import { buildLegacyTheme } from 'sanity'

// Fursat colours: forest green = main action, gold = accent, cream = surfaces (from src/styles/fk-tokens.css).
export const fursatTheme = buildLegacyTheme({
  '--black': '#2b2416',
  '--white': '#fcf7f0',
  '--gray': '#8a7a5c',
  '--gray-base': '#8a7a5c',
  '--component-bg': '#fcf7f0',
  '--component-text-color': '#2b2416',
  '--brand-primary': '#14301c',
  '--default-button-color': '#8a7a5c',
  '--default-button-primary-color': '#14301c',
  '--default-button-success-color': '#2a501b',
  '--default-button-warning-color': '#c27a2c',
  '--default-button-danger-color': '#c0291f',
  '--state-info-color': '#c99a43',
  '--state-success-color': '#2a501b',
  '--state-warning-color': '#c27a2c',
  '--state-danger-color': '#c0291f',
  '--main-navigation-color': '#0e2214',
  '--main-navigation-color--inverted': '#f8eee2',
  '--focus-color': '#8a5a14',
})
