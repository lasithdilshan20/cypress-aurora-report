// Proxy ESM entry for the Cypress Aurora Reporter plugin
// Ensures import('cypress-aurora-reporter/plugin') returns the plugin function as default

export { plugin as default } from './dist/index.esm.js';
