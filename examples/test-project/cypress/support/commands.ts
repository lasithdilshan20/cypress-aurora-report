// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Aurora Reporter Custom Commands

Cypress.Commands.add('takeAuroraScreenshot', (name: string) => {
  return cy.task('aurora:takeScreenshot', {
    name,
    fullPage: true,
    timestamp: new Date().toISOString()
  });
});

Cypress.Commands.add('updateTestMetadata', (metadata: Record<string, any>) => {
  return cy.task('aurora:updateTestMetadata', {
    ...metadata,
    timestamp: new Date().toISOString()
  });
});

// Example of a custom command to simulate login
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session([username, password], () => {
    cy.visit('/login');
    cy.get('[data-cy=username]').type(username);
    cy.get('[data-cy=password]').type(password);
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/dashboard');
  });
});

// Custom command to wait for page load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.window().its('document.readyState').should('equal', 'complete');
});

// Extend Cypress types for TypeScript support
declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<Element>;
      waitForPageLoad(): Chainable<Element>;
    }
  }
}