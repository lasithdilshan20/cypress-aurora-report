// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Setup Aurora Reporter custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to take Aurora screenshots
       * @example cy.takeAuroraScreenshot('custom-name')
       */
      takeAuroraScreenshot(name: string): Chainable<Element>;
      
      /**
       * Custom command to update test metadata for Aurora Reporter
       * @example cy.updateTestMetadata({ tags: ['smoke'], context: 'Login flow' })
       */
      updateTestMetadata(metadata: Record<string, any>): Chainable<Element>;
    }
  }
}

// Setup global error handling for Aurora Reporter
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log uncaught exceptions to Aurora Reporter
  cy.task('aurora:log', `Uncaught exception: ${err.message}`);
  
  // Return false to prevent Cypress from failing the test
  // You can customize this behavior based on your needs
  return false;
});

// Setup beforeEach hook to initialize test metadata
beforeEach(() => {
  // Set basic test metadata for Aurora Reporter
  const testTitle = Cypress.currentTest.title;
  const specName = Cypress.spec.name;
  
  cy.task('aurora:updateTestMetadata', {
    testTitle,
    specName,
    browser: Cypress.browser.name,
    timestamp: new Date().toISOString()
  });
});