/// <reference types="cypress" />

describe('Aurora Reporter Example Tests', () => {
  it('visits the kitchen sink and passes', () => {
    cy.visit('/');
    cy.contains('type').should('be.visible');
    cy.logStep('Visited example site');
  });

  it('demonstrates a failing assertion', () => {
    cy.visit('/commands/actions');
    // Intentional failing assertion to showcase failed test in the report
    cy.contains('This text does not exist').should('be.visible');
  });

  it.skip('a skipped test example', () => {
    // Skipped on purpose
    expect(true).to.equal(false);
  });
});
