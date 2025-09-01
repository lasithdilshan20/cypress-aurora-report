describe('Advanced Aurora Reporter Features', () => {
  before(() => {
    cy.updateTestMetadata({
      suite: 'Advanced Tests',
      tags: ['advanced', 'features'],
      context: 'Testing advanced Aurora Reporter features and capabilities'
    });
  });

  beforeEach(() => {
    cy.visit('/');
  });

  it('should test dynamic content and waiting', { tags: ['@dynamic', '@timing'] }, () => {
    cy.updateTestMetadata({
      testType: 'dynamic',
      priority: 'high',
      description: 'Tests dynamic content loading and timing with Aurora Reporter',
      estimatedDuration: '15s'
    });

    // Navigate to a page with dynamic content
    cy.get('[data-cy="utilities-cmd"]').click();
    cy.url().should('include', '/utilities');
    
    // Take screenshot of initial state
    cy.takeAuroraScreenshot('utilities-page-initial');

    // Test dynamic content loading
    cy.get('.utility-wait').click();
    cy.get('#ajax-content', { timeout: 10000 }).should('be.visible');
    
    // Take screenshot after dynamic content loads
    cy.takeAuroraScreenshot('dynamic-content-loaded');

    // Test multiple interactions
    cy.get('.utility-clock').should('contain.text', new Date().getFullYear().toString());
  });

  it('should handle multiple retries and flaky behavior', { 
    tags: ['@retry', '@flaky'],
    retries: {
      runMode: 2,
      openMode: 1
    }
  }, () => {
    cy.updateTestMetadata({
      testType: 'flaky',
      priority: 'medium',
      description: 'Simulates flaky test behavior to test Aurora Reporter retry handling',
      retryConfig: { runMode: 2, openMode: 1 }
    });

    // Simulate flaky behavior (this might pass or fail randomly)
    cy.visit('/commands/network-requests');
    cy.takeAuroraScreenshot('network-requests-page');

    // Make a network request that might be flaky
    cy.request('GET', 'https://jsonplaceholder.typicode.com/posts/1')
      .then((response) => {
        expect(response.status).to.eq(200);
        cy.takeAuroraScreenshot('network-request-success');
      });

    // Add some timing-sensitive operations
    cy.wait(Math.floor(Math.random() * 1000) + 500); // Random wait between 500-1500ms
    
    cy.get('body').should('be.visible');
  });

  it('should test file upload functionality', { tags: ['@upload', '@files'] }, () => {
    cy.updateTestMetadata({
      testType: 'file-upload',
      priority: 'medium',
      description: 'Tests file upload functionality with Aurora Reporter integration'
    });

    cy.visit('/commands/files');
    cy.takeAuroraScreenshot('files-page');

    // Test file upload (using a fixture file)
    const fileName = 'example.json';
    cy.fixture(fileName).then(() => {
      cy.get('input[type="file"]').selectFile(`cypress/fixtures/${fileName}`);
      cy.takeAuroraScreenshot('file-selected');
      
      // Verify file was selected
      cy.get('input[type="file"]').should(($input) => {
        expect($input[0].files).to.have.length(1);
        expect($input[0].files[0].name).to.equal(fileName);
      });
    });
  });

  it('should test viewport and responsive behavior', { tags: ['@responsive', '@viewport'] }, () => {
    cy.updateTestMetadata({
      testType: 'responsive',
      priority: 'low',
      description: 'Tests responsive behavior at different viewport sizes'
    });

    // Test mobile viewport
    cy.viewport(375, 667); // iPhone 6/7/8
    cy.takeAuroraScreenshot('mobile-viewport');
    
    // Navigate and test mobile layout
    cy.get('[data-cy="querying-cmd"]').click();
    cy.takeAuroraScreenshot('mobile-querying-page');

    // Test tablet viewport
    cy.viewport(768, 1024); // iPad
    cy.takeAuroraScreenshot('tablet-viewport');

    // Test desktop viewport
    cy.viewport(1920, 1080); // Desktop
    cy.takeAuroraScreenshot('desktop-viewport');

    // Verify responsive elements
    cy.get('body').should('be.visible');
    cy.get('.navbar-brand').should('be.visible');
  });

  it('should test API interactions and data handling', { tags: ['@api', '@data'] }, () => {
    cy.updateTestMetadata({
      testType: 'api',
      priority: 'high',
      description: 'Tests API interactions and data handling with Aurora Reporter',
      apiEndpoint: 'https://jsonplaceholder.typicode.com'
    });

    // Test API interactions
    cy.visit('/commands/network-requests');
    cy.takeAuroraScreenshot('network-requests-initial');

    // Intercept and test network requests
    cy.intercept('GET', '**/comments/*').as('getComment');
    
    cy.get('.network-btn').click();
    cy.wait('@getComment').then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
      cy.takeAuroraScreenshot('api-request-intercepted');
    });

    // Test POST request
    cy.request({
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      body: {
        title: 'Aurora Reporter Test',
        body: 'Testing API integration with Aurora Reporter',
        userId: 1
      }
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
      cy.takeAuroraScreenshot('post-request-success');
    });
  });
});