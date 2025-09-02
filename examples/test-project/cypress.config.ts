import { defineConfig } from 'cypress';

// Use the package entrypoints so this example validates the published API
import auroraPlugin from 'cypress-aurora-reporter/plugin';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Initialize Aurora Reporter plugin
      auroraPlugin(on, config);
      return config;
    },
    // Configure Aurora Reporter as the primary reporter
    reporter: 'cypress-aurora-reporter/reporter.cjs',
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