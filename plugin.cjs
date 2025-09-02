// Proxy CommonJS entry for the Cypress Aurora Reporter plugin
// Ensures require('cypress-aurora-reporter/plugin') returns the plugin function

module.exports = require('./dist/index.cjs').plugin;
