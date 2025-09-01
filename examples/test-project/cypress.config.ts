import { defineConfig } from 'cypress';

// Note: Since we're using this as an example within the aurora reporter project,
// we'll import the plugin directly from the source
import auroraPlugin from '../../src/plugin/index.js';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Initialize Aurora Reporter plugin
      auroraPlugin(on, config);
      return config;
    },
    // Configure Aurora Reporter as the primary reporter
    reporter: '../../src/reporter/index.js',
    reporterOptions: {
      enabled: true,
      outputDir: './aurora-reports',
      dashboardPort: 4200,
      realTimeUpdates: true,
      screenshots: {
        enabled: true,
        quality: 90,
        onFailureOnly: false,
        compressImages: true
      },
      database: {
        path: './aurora-reports/aurora.db',
        enableWAL: true
      }
    },
    // Cypress configuration
    baseUrl: 'https://example.cypress.io',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    // Test file patterns
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts'
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});