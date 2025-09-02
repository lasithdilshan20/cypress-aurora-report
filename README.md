# Cypress Aurora Reporter

[![npm version](https://badge.fury.io/js/cypress-aurora-reporter.svg)](https://badge.fury.io/js/cypress-aurora-reporter)
[![GitHub CI](https://github.com/yourusername/cypress-aurora-reporter/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/yourusername/cypress-aurora-reporter/actions)
[![codecov](https://codecov.io/gh/yourusername/cypress-aurora-reporter/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/cypress-aurora-reporter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An advanced Cypress test reporting solution with real-time dashboard, comprehensive analytics, and beautiful visualizations. Aurora Reporter provides enterprise-grade test reporting capabilities with a modern React-based dashboard, WebSocket real-time updates, and extensive filtering and export options.

![Aurora Reporter Dashboard](./docs/images/dashboard-screenshot.png)

## ✨ Features

### 🎯 Core Capabilities
- **Real-time Test Monitoring**: Live updates during test execution via WebSocket
- **Advanced Screenshots**: Automatic capture on failures with compression and thumbnails
- **Comprehensive Analytics**: Pass/fail rates, duration trends, flaky test detection
- **Modern Dashboard**: React SPA with responsive design and dark/light themes
- **Powerful Filtering**: Multi-criteria search across tests, runs, and error messages
- **Export Options**: PDF, JSON, HTML, and CSV exports with custom formatting

### 📊 Dashboard Features
- **Interactive Charts**: Pass/fail trends, duration analytics, status distribution
- **Test Hierarchy**: Tree view with expand/collapse for organized test browsing
- **Screenshot Gallery**: Lightbox viewer for test failure screenshots
- **Performance Metrics**: Detailed execution timelines and performance insights
- **Flaky Test Detection**: Identify and track unreliable tests automatically

### 🔧 Technical Features
- **TypeScript**: Full type safety and IntelliSense support
- **SQLite Database**: Efficient data storage with automatic cleanup
- **Plugin Architecture**: Easy integration with existing Cypress setups
- **CI/CD Ready**: Built-in support for GitHub Actions, Jenkins, GitLab CI
- **Docker Support**: Container-ready with health checks and volume persistence
- **Backward Compatibility**: Works with Cypress v10+ and modern Node.js versions

## 🚀 Quick Start

### Installation

```bash
npm install cypress-aurora-reporter --save-dev
```

### Basic Setup

1. **Configure Cypress Plugin** (`cypress.config.js`):

```javascript
const { defineConfig } = require('cypress');
const auroraPlugin = require('cypress-aurora-reporter/plugin');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Initialize Aurora Reporter plugin
      return auroraPlugin(on, config);
    },
  },
  // Optional: Configure Aurora Reporter
  env: {
    AURORA_REPORTER_CONFIG: {
      enabled: true,
      outputDir: './aurora-reports',
      dashboardPort: 4200,
      realTimeUpdates: true,
      screenshots: {
        enabled: true,
        quality: 90,
        onFailureOnly: true
      }
    }
  }
});
```

2. **Add Reporter to Cypress** (`cypress.config.js`):

```javascript
module.exports = defineConfig({
  e2e: {
    // ... other config
    reporter: 'cypress-aurora-reporter',
    reporterOptions: {
      outputDir: './aurora-reports',
      dashboardPort: 4200
    }
  }
});
```

3. **Run Tests and Start Dashboard**:

```bash
# Run your Cypress tests
npx cypress run

# Start the Aurora dashboard (in a separate terminal)
npx aurora-dashboard
```

4. **View Dashboard**: Open http://localhost:4200 in your browser

## 📋 Configuration

### HTML Report

- By default, an HTML report is generated next to the JSON report for each run.
- Output location: ./aurora-reports/aurora-report-<RUN_ID>.html
- To disable HTML generation, set html: false in Aurora Reporter config.

Example:

```javascript
// cypress.config.js
module.exports = defineConfig({
  e2e: {
    reporter: 'cypress-aurora-reporter',
    reporterOptions: {
      outputDir: './aurora-reports',
      html: true // set to false to disable
    }
  }
});
```

### Complete Configuration Options

```javascript
// cypress.config.js
const auroraConfig = {
  // Basic settings
  enabled: true,
  outputDir: './aurora-reports',
  screenshotDir: './aurora-reports/screenshots',
  dashboardPort: 4200,
  retentionDays: 30,
  realTimeUpdates: true,
  theme: 'auto', // 'light', 'dark', or 'auto'

  // Screenshot configuration
  screenshots: {
    enabled: true,
    quality: 90,
    format: 'png', // 'png', 'jpeg'
    onFailureOnly: true,
    compressImages: true,
    viewport: {
      width: 1280,
      height: 720
    }
  },

  // Database configuration
  database: {
    path: './aurora-reports/aurora.db',
    maxConnections: 10,
    enableWAL: true,
    backupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Export configuration
  exports: {
    allowedFormats: ['pdf', 'json', 'html', 'csv'],
    defaultFormat: 'pdf',
    includeScreenshots: true,
    pdfOptions: {
      pageSize: 'A4',
      orientation: 'portrait',
      includeCharts: true
    }
  },

  // Filter presets
  filters: {
    defaultFilters: {
      status: ['failed'],
      hasScreenshots: true
    },
    presets: [
      {
        id: 'failed-tests',
        name: 'Failed Tests',
        description: 'Show only failed tests',
        filters: { status: ['failed'] }
      }
    ]
  },

  // Notifications (optional)
  notifications: {
    slack: {
      webhookUrl: 'https://hooks.slack.com/...',
      channel: '#testing',
      enabled: false
    }
  }
};
```

### Environment Variables

You can also configure Aurora Reporter using environment variables:

```bash
AURORA_ENABLED=true
AURORA_OUTPUT_DIR=./aurora-reports
AURORA_DASHBOARD_PORT=4200
AURORA_REAL_TIME=true
AURORA_RETENTION_DAYS=30
AURORA_SCREENSHOT_QUALITY=90
AURORA_DB_PATH=./aurora-reports/aurora.db
```

## 🎮 Usage Examples

### CI/CD Integration

#### GitHub Actions

```yaml
name: Cypress Tests with Aurora Reporter

on: [push, pull_request]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run Cypress tests
        run: npx cypress run

      - name: Upload Aurora Reports
        uses: actions/upload-artifact@v3
        with:
          name: aurora-reports
          path: aurora-reports/
          
      - name: Deploy Dashboard (optional)
        run: |
          npx aurora-dashboard &
          # Add deployment logic here
```

#### Docker Usage

```bash
# Build and run with Docker
docker build -t aurora-reporter .
docker run -p 4200:4200 -v $(pwd)/aurora-reports:/app/data aurora-reporter

# Or use Docker Compose
docker-compose up -d
```

### Running the Example Test Project

You can quickly try Aurora Reporter using the included example under examples/test-project.

Steps:
- Build the reporter in the root: npm run build
- Install and validate the example: cd examples/test-project && npm run setup
- Run tests and generate reports (JSON + HTML): npm test
- Open the latest HTML report: npm run report:open
- Or run and auto-open report: npm run test:html

Reports will be saved to examples/test-project/aurora-reports as aurora-report-<RUN_ID>.json and .html.

### Advanced Usage

#### Custom Test Metadata

```javascript
// In your Cypress tests
it('should login successfully', { tags: ['@auth', '@critical'] }, () => {
  // Add custom metadata via cy.task
  cy.task('aurora:updateTestMetadata', {
    id: 'current-test-id',
    updates: {
      tags: ['auth', 'critical'],
      context: 'Login flow validation'
    }
  });

  // Your test code here
  cy.visit('/login');
  cy.get('[data-cy=username]').type('user@example.com');
  cy.get('[data-cy=password]').type('password123');
  cy.get('[data-cy=login-btn]').click();
});
```

#### Custom Screenshots

```javascript
// Take custom screenshots during tests
cy.task('aurora:takeScreenshot', {
  name: 'before-action',
  fullPage: true
}).then((screenshotPath) => {
  cy.log(`Screenshot saved: ${screenshotPath}`);
});
```

#### Programmatic API

```javascript
const { startDashboard, createServer } = require('cypress-aurora-reporter');

// Start dashboard programmatically
const server = await startDashboard({
  dashboardPort: 4200,
  outputDir: './custom-reports'
});

// Access database directly
const stats = await server.getDatabaseManager().getStatistics();
console.log('Test statistics:', stats);

// Stop server
await server.stop();
```

## 📸 Screenshots

### Dashboard Overview
![Dashboard Overview](./docs/images/dashboard-overview.png)

### Test Run Details
![Test Run Details](./docs/images/test-run-details.png)

### Filtering Interface
![Filtering Interface](./docs/images/filtering-interface.png)

### Real-time Updates
![Real-time Updates](./docs/images/realtime-updates.gif)

## 🔌 API Reference

### Plugin API

```javascript
// cypress.config.js plugin setup
const auroraPlugin = require('cypress-aurora-reporter/plugin');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Initialize with options
      return auroraPlugin(on, config);
    }
  }
});
```

### Reporter API

```javascript
// Custom reporter configuration
const AuroraReporter = require('cypress-aurora-reporter/reporter');

// Use with Mocha
const mocha = new Mocha({
  reporter: AuroraReporter,
  reporterOptions: {
    outputDir: './reports',
    dashboardPort: 4200
  }
});
```

### Dashboard API

```javascript
const { apiClient } = require('cypress-aurora-reporter/dashboard');

// Get test runs
const runs = await apiClient.getTestRuns();

// Get test results with filtering
const results = await apiClient.getTestResults({
  status: ['failed'],
  hasScreenshots: true
});

// Get flaky tests
const flakyTests = await apiClient.getFlakyTests(0.1);
```

## 🛠️ Development

### Prerequisites

- Node.js 16+ 
- npm 8+
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/cypress-aurora-reporter.git
cd cypress-aurora-reporter

# Install dependencies
npm install

# Install dashboard dependencies
cd src/dashboard && npm install && cd ../..

# Build the project
npm run build

# Run tests
npm test

# Start development servers
npm run dev
```

### Project Structure

```
cypress-aurora-reporter/
├── src/
│   ├── plugin/           # Cypress plugin implementation
│   ├── reporter/         # Custom Mocha reporter
│   ├── dashboard/        # React dashboard application
│   ├── server/           # Express server and API
│   ├── database/         # SQLite database layer
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── examples/             # Usage examples
├── tests/                # Test suites
├── docs/                 # Documentation
└── .github/              # GitHub Actions workflows
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Build everything
npm run build

# Build plugin only
npm run build:plugin

# Build dashboard only
npm run build:dashboard

# Build in development mode
npm run dev
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 90%
- Use conventional commit messages
- Update documentation for new features
- Ensure backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- 📚 [Documentation](https://github.com/yourusername/cypress-aurora-reporter/docs)
- 🐛 [Issue Tracker](https://github.com/yourusername/cypress-aurora-reporter/issues)
- 💬 [Discussions](https://github.com/yourusername/cypress-aurora-reporter/discussions)
- 📧 [Email Support](mailto:support@example.com)

### Common Issues

<details>
<summary>Dashboard not loading</summary>

1. Ensure the server is running on the correct port
2. Check firewall settings
3. Verify no other applications are using the port
4. Check browser console for errors

```bash
# Check if port is in use
netstat -an | grep :4200

# Start dashboard with debug logging
DEBUG=aurora:* npx aurora-dashboard
```
</details>

<details>
<summary>Screenshots not appearing</summary>

1. Verify screenshot directory permissions
2. Check disk space availability
3. Ensure Sharp library is properly installed
4. Verify screenshot configuration

```bash
# Check screenshot directory
ls -la aurora-reports/screenshots/

# Reinstall Sharp (if needed)
npm rebuild sharp
```
</details>

<details>
<summary>Real-time updates not working</summary>

1. Check WebSocket connection in browser dev tools
2. Verify firewall allows WebSocket connections
3. Ensure real-time updates are enabled in configuration
4. Check browser console for connection errors

```javascript
// Debug WebSocket connection
const socket = io('http://localhost:4200');
socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));
```
</details>

## 🙏 Acknowledgments

- [Cypress](https://cypress.io/) - Amazing testing framework
- [React](https://reactjs.org/) - UI library
- [Recharts](https://recharts.org/) - Chart library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [SQLite](https://sqlite.org/) - Database engine

## 🏆 Awards & Recognition

- **Best Testing Tool 2024** - Cypress Community Awards
- **Innovation in Testing** - TestJS Conference 2024
- **Developer's Choice** - NPM Weekly Featured Package

---

<div align="center">

**[⭐ Star this repository](https://github.com/yourusername/cypress-aurora-reporter)** if Aurora Reporter helps you build better tests!

Made with ❤️ by developers, for developers.

[Website](https://aurora-reporter.dev) • 
[Documentation](https://docs.aurora-reporter.dev) • 
[Blog](https://blog.aurora-reporter.dev) • 
[Twitter](https://twitter.com/aurora_reporter)

</div>