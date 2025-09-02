// Custom Cypress commands for the example project
// You can add reusable commands here. For now we add a simple log command.

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  interface Chainable<Subject = any> {
    logStep(message: string): Chainable<Subject>;
  }
}

Cypress.Commands.add('logStep', (message: string) => {
  // Basic command that logs a step for demonstration
  cy.log(`Step: ${message}`);
});
