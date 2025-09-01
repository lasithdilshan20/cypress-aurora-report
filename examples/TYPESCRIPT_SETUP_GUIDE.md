# Cypress TypeScript Configuration Issue - Solution Guide

## 🚨 The Problem

You encountered this error when running `npx cypress run`:

```
TypeError: Unknown file extension ".ts" for C:\RnD\TEST\test_plg\cypress.config.ts
    at Object.getFileProtocolModuleFormat [as file:] (node:internal/modules/esm/get_format:160:9)
```

This error occurs because **Node.js doesn't know how to handle TypeScript files directly** without proper configuration.

## 🔧 Root Cause Analysis

The issue stems from several configuration problems:

1. **Missing `"type": "module"` in package.json** - Required for ES modules
2. **Incomplete TypeScript configuration** - ts-node needs proper ESM setup
3. **Missing or incorrect ts-node configuration** - Node.js can't process .ts files
4. **Import/export syntax mismatches** - ES modules vs CommonJS conflicts

## ✅ Complete Solution

### Step 1: Fix package.json

Your project needs the correct module type and dependencies:

```json
{
  "name": "your-project-name",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "cypress run",
    "test:open": "cypress open"
  },
  "devDependencies": {
    "cypress": "^13.6.0",
    "typescript": "^5.2.2",
    "ts-node": "^10.9.1",
    "@types/node": "^20.9.0"
  },
  "dependencies": {
    "cypress-aurora-reporter": "^1.0.0"
  }
}
```

### Step 2: Configure TypeScript properly

Create or update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "cypress/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ],
  "ts-node": {
    "esm": true,
    "compilerOptions": {
      "module": "ESNext"
    }
  }
}
```

### Step 3: Create correct Cypress configuration

Use this `cypress.config.ts` template:

```typescript
import { defineConfig } from 'cypress';
import auroraPlugin from 'cypress-aurora-reporter/plugin';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Initialize Aurora Reporter plugin
      return auroraPlugin(on, config);
    },
    // Configure Aurora Reporter
    reporter: 'cypress-aurora-reporter',
    reporterOptions: {
      enabled: true,
      outputDir: './aurora-reports',
      dashboardPort: 4200,
      realTimeUpdates: true,
      screenshots: {
        enabled: true,
        quality: 90,
        onFailureOnly: false
      }
    },
    // Cypress settings
    baseUrl: 'https://example.cypress.io',
    viewportWidth: 1280,
    viewportHeight: 720,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts'
  }
});
```

### Step 4: Setup Cypress support files

Create `cypress/support/e2e.ts`:

```typescript
// Import commands
import './commands';

// Global setup for Aurora Reporter
beforeEach(() => {
  cy.task('aurora:updateTestMetadata', {
    testTitle: Cypress.currentTest.title,
    specName: Cypress.spec.name,
    browser: Cypress.browser.name,
    timestamp: new Date().toISOString()
  });
});
```

Create `cypress/support/commands.ts`:

```typescript
// Aurora Reporter custom commands
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

// TypeScript declarations
declare global {
  namespace Cypress {
    interface Chainable {
      takeAuroraScreenshot(name: string): Chainable<Element>;
      updateTestMetadata(metadata: Record<string, any>): Chainable<Element>;
    }
  }
}
```

## 🧪 Working Example

I've created a complete working example in `examples/test-project/` that demonstrates:

✅ **Proper TypeScript configuration**  
✅ **Aurora Reporter integration**  
✅ **Custom commands and metadata**  
✅ **Sample test files with various scenarios**  
✅ **Complete documentation**  

### To use the working example:

1. **Navigate to the example**:
   ```bash
   cd examples/test-project
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build Aurora Reporter** (from parent directory):
   ```bash
   cd ../../
   npm run build
   cd examples/test-project
   ```

4. **Run the tests**:
   ```bash
   npm test
   ```

5. **Start the dashboard**:
   ```bash
   npm run aurora:dashboard
   ```

## 🔍 Troubleshooting Common Issues

### Issue 1: "Cannot use import statement outside a module"
**Solution**: Add `"type": "module"` to package.json

### Issue 2: "Unknown file extension .ts"
**Solution**: Configure ts-node with ESM support in tsconfig.json

### Issue 3: Module resolution errors
**Solution**: Use proper import syntax and verify file paths

### Issue 4: Cypress can't find the reporter
**Solution**: Ensure Aurora Reporter is built and accessible

### Issue 5: Dashboard won't start
**Solution**: Run tests first to generate data, check port availability

## 📋 Quick Fix Checklist

- [ ] `"type": "module"` in package.json
- [ ] TypeScript 5.2+ installed
- [ ] ts-node 10.9+ with ESM configuration
- [ ] Proper tsconfig.json with ESM support
- [ ] Correct import syntax in cypress.config.ts
- [ ] Aurora Reporter built and accessible
- [ ] Cypress support files properly configured

## 🚀 Next Steps

1. **Try the working example** to see everything in action
2. **Copy the configuration** to your project
3. **Adapt the settings** to your specific needs
4. **Run your tests** and explore the Aurora Dashboard
5. **Customize the reporter** options as needed

The key is ensuring all the TypeScript and ES module configurations are aligned properly!