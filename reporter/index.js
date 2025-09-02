// CommonJS bridge for Cypress to resolve reporter via 'cypress-aurora-reporter/reporter'
// This file is treated as CJS by virtue of local package.json { type: "commonjs" }

module.exports = require('../dist/index.cjs').reporter;