describe('Basic Aurora Reporter Test Suite', () => {
  before(() => {
    // Set suite-level metadata for Aurora Reporter
    cy.updateTestMetadata({
      suite: 'Basic Tests',
      tags: ['smoke', 'basic'],
      context: 'Testing Aurora Reporter integration with basic functionality'
    });
  });

  beforeEach(() => {
    cy.visit('/');
    cy.waitForPageLoad();
  });

  it('should load the homepage successfully', { tags: ['@smoke', '@critical'] }, () => {
    // Update test metadata
    cy.updateTestMetadata({
      testType: 'smoke',
      priority: 'high',
      description: 'Verifies that the homepage loads without errors'
    });

    // Take a screenshot before assertions
    cy.takeAuroraScreenshot('homepage-loaded');

    // Basic assertions
    cy.get('h1').should('be.visible');
    cy.get('h1').should('contain.text', 'Kitchen Sink');
    
    // Verify page title
    cy.title().should('include', 'Cypress');

    // Take another screenshot after assertions
    cy.takeAuroraScreenshot('homepage-assertions-complete');
  });

  it('should navigate to different sections', { tags: ['@navigation'] }, () => {
    cy.updateTestMetadata({
      testType: 'functional',
      priority: 'medium',
      description: 'Tests navigation between different sections of the site'
    });

    // Test navigation
    cy.get('[data-cy="navigation-commands"]').click();
    cy.url().should('include', '/commands/navigation');
    cy.takeAuroraScreenshot('navigation-page');

    // Go back and test another navigation
    cy.go('back');
    cy.get('[data-cy="actions-cmd"]').click();
    cy.url().should('include', '/commands/actions');
    cy.takeAuroraScreenshot('actions-page');
  });

  it('should demonstrate form interactions', { tags: ['@forms', '@interaction'] }, () => {
    cy.updateTestMetadata({
      testType: 'interaction',
      priority: 'medium',
      description: 'Tests form input and interaction capabilities'
    });

    // Navigate to actions page
    cy.get('[data-cy="actions-cmd"]').click();
    
    // Test text input
    cy.get('.action-email')
      .type('test@example.com')
      .should('have.value', 'test@example.com');

    cy.takeAuroraScreenshot('form-filled');

    // Test button click
    cy.get('.action-btn').click();
    
    // Test disabled input
    cy.get('.action-disabled')
      .should('be.disabled');

    cy.takeAuroraScreenshot('form-interactions-complete');
  });

  it('should handle a test that fails intentionally', { tags: ['@negative'] }, () => {
    cy.updateTestMetadata({
      testType: 'negative',
      priority: 'low',
      description: 'Intentionally failing test to demonstrate error handling in Aurora Reporter',
      expectedToFail: true
    });

    // Take screenshot before failure
    cy.takeAuroraScreenshot('before-intentional-failure');

    // This will intentionally fail to demonstrate Aurora Reporter's failure handling
    cy.get('.non-existent-element').should('exist');
  });
});