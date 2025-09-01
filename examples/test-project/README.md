# Cypress Aurora Reporter Test Example

This is a complete example project demonstrating how to use the Cypress Aurora Reporter with TypeScript support.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 16+** - Required for running the project
2. **TypeScript support** - The project is configured with TypeScript
3. **Built Aurora Reporter** - The parent project must be built first

### Setup

1. **Navigate to this directory**:
   ```bash
   cd examples/test-project
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the Aurora Reporter** (from the parent directory):
   ```bash
   cd ../../
   npm run build
   cd examples/test-project
   ```

4. **Install Cypress binary**:
   ```bash
   npm run cypress:install
   ```

### Running Tests

1. **Run tests in headless mode**:
   ```bash
   npm test
   ```

2. **Open Cypress Test Runner**:
   ```bash
   npm run test:open
   ```

3. **Start Aurora Dashboard** (in a separate terminal):
   ```bash
   # After running tests, start the dashboard to view results
   npm run aurora:dashboard
   ```

4. **View the dashboard**: Open http://localhost:4200 in your browser

## 📁 Project Structure

```
cypress/
├── e2e/                    # Test files
│   ├── basic-tests.cy.ts   # Basic functionality tests
│   └── advanced-tests.cy.ts # Advanced feature tests
├── fixtures/               # Test data files
│   └── example.json       # Sample fixture data
└── support/               # Support files
    ├── commands.ts        # Custom commands
    └── e2e.ts            # Global configuration
```

## 🔧 Configuration

### TypeScript Configuration (`tsconfig.json`)
- **ES2020 target** with modern module resolution
- **ESM support** with ts-node
- **Cypress types** included automatically

### Cypress Configuration (`cypress.config.ts`)
- **Aurora Reporter integration** with real-time updates
- **Screenshot management** with compression
- **Database configuration** with SQLite and WAL mode
- **TypeScript support** with proper module handling

### Aurora Reporter Configuration
```typescript
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
  }
}
```

## 🧪 Test Examples

### Basic Tests (`basic-tests.cy.ts`)
- **Homepage loading** with smoke tests
- **Navigation testing** between pages
- **Form interactions** and input validation
- **Intentional failure** to demonstrate error handling

### Advanced Tests (`advanced-tests.cy.ts`)
- **Dynamic content** loading with timing
- **Flaky test simulation** with retry configuration
- **File upload** functionality testing
- **Responsive design** testing across viewports
- **API interactions** with network request interception

## 🎯 Features Demonstrated

### Aurora Reporter Integration
- ✅ **Real-time dashboard** updates during test execution
- ✅ **Custom metadata** tracking for tests and suites
- ✅ **Screenshot management** with automatic capture
- ✅ **Test failure analysis** with detailed error reporting
- ✅ **Performance metrics** and timing analysis
- ✅ **Flaky test detection** with retry handling

### Custom Commands
- `cy.takeAuroraScreenshot(name)` - Custom screenshot capture
- `cy.updateTestMetadata(metadata)` - Test metadata management
- `cy.login(username, password)` - Session-based login
- `cy.waitForPageLoad()` - Page load completion

## 🔍 Troubleshooting

### Common Issues

1. **"Unknown file extension .ts"**
   - Ensure `"type": "module"` is set in package.json
   - Verify ts-node configuration in tsconfig.json

2. **Module import errors**
   - Check that Aurora Reporter is built: `npm run build` (from parent directory)
   - Verify the relative import paths in cypress.config.ts

3. **Dashboard not accessible**
   - Ensure tests have been run to generate data
   - Check that port 4200 is not in use by another process
   - Wait for dashboard startup (may take a few seconds)

4. **Screenshots not appearing**
   - Verify screenshot directory permissions
   - Check that screenshot compression is working
   - Ensure sufficient disk space

### Debug Mode

Run tests with debug output:
```bash
DEBUG=cypress:* npm test
```

View Aurora Reporter logs:
```bash
# Set log level in cypress.config.ts
reporterOptions: {
  logLevel: 'debug'
}
```

## 📊 Expected Results

After running the tests, you should see:

1. **Aurora Reports Directory** (`./aurora-reports/`):
   - SQLite database with test results
   - Screenshots organized by test run
   - Generated report files

2. **Dashboard Features**:
   - Test run overview with pass/fail statistics
   - Interactive test result filtering
   - Screenshot gallery for failed tests
   - Performance metrics and timing charts
   - Real-time updates during test execution

3. **Test Results**:
   - 8+ test cases with various scenarios
   - Mix of passing and failing tests (intentional)
   - Custom metadata and tags
   - Screenshots for key test steps

## 🔗 Next Steps

1. **Explore the Dashboard**: Navigate through different views and filters
2. **Customize Configuration**: Modify reporter options for your needs
3. **Add More Tests**: Create additional test files following the examples
4. **Integrate CI/CD**: Use the configuration in your build pipeline
5. **Export Reports**: Try different export formats (PDF, JSON, HTML)

## 📚 Related Documentation

- [Cypress Aurora Reporter Documentation](../../README.md)
- [Cypress Official Documentation](https://docs.cypress.io/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [Usage Examples](../USAGE_EXAMPLES.md)