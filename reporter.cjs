// Proxy CommonJS entry for the Cypress Aurora Reporter reporter
// Ensures require('cypress-aurora-reporter/reporter') returns the reporter constructor

module.exports = require('./dist/index.cjs').reporter;