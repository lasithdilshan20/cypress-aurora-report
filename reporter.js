// Proxy ESM entry for the Cypress Aurora Reporter reporter
// Ensures import('cypress-aurora-reporter/reporter') returns the reporter constructor as default

export { reporter as default } from './dist/index.esm.js';