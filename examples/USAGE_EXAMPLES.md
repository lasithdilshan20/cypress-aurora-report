# Usage Examples

This document provides comprehensive examples of how to use Cypress Aurora Reporter in various scenarios.

## 📋 Table of Contents

- [Basic Setup](#basic-setup)
- [Advanced Configuration](#advanced-configuration)
- [CI/CD Integration](#cicd-integration)
- [Custom Test Metadata](#custom-test-metadata)
- [Screenshot Management](#screenshot-management)
- [Dashboard API Usage](#dashboard-api-usage)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)

## 🚀 Basic Setup

### Minimal Configuration

The simplest way to get started with Aurora Reporter:

```javascript
// cypress.config.js
const { defineConfig } = require('cypress');
const auroraPlugin = require('cypress-aurora-reporter/plugin');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return auroraPlugin(on, config);
    },
    reporter: 'cypress-aurora-reporter',
    reporterOptions: {
      outputDir: './aurora-reports'
    }
  }
});
```

Run your tests and start the dashboard:

```bash
# Run tests
npx cypress run

# Start dashboard
npx aurora-dashboard
```

### TypeScript Configuration

For TypeScript projects, add type definitions:

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';
import auroraPlugin from 'cypress-aurora-reporter/plugin';
import { AuroraReporterConfig } from 'cypress-aurora-reporter/types';

const auroraConfig: AuroraReporterConfig = {
  enabled: true,
  outputDir: './aurora-reports',
  dashboardPort: 4200,
  screenshots: {
    enabled: true,
    quality: 90
  }
};

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return auroraPlugin(on, config);
    },
    reporter: 'cypress-aurora-reporter',
    reporterOptions: auroraConfig
  }
});
```

## ⚙️ Advanced Configuration

### Complete Configuration Example

```javascript
// cypress.config.js
const auroraConfig = {
  // Core settings
  enabled: true,
  outputDir: './test-reports/aurora',
  screenshotDir: './test-reports/screenshots',
  dashboardPort: 4200,
  retentionDays: 60,
  realTimeUpdates: true,
  theme: 'dark',

  // Screenshot configuration
  screenshots: {
    enabled: true,
    quality: 95,
    format: 'png',
    onFailureOnly: false,
    compressImages: true,
    viewport: {
      width: 1920,
      height: 1080
    }
  },

  // Database settings
  database: {
    path: './test-reports/aurora.db',
    maxConnections: 20,
    enableWAL: true,
    backupInterval: 12 * 60 * 60 * 1000 // 12 hours
  },

  // Export options
  exports: {
    allowedFormats: ['pdf', 'json', 'html'],
    defaultFormat: 'pdf',
    includeScreenshots: true,
    pdfOptions: {
      pageSize: 'A4',
      orientation: 'landscape',
      includeCharts: true,
      includeScreenshots: true,
      compress: true
    }
  },

  // Default filters
  filters: {
    defaultFilters: {
      status: [],
      hasScreenshots: undefined
    },
    presets: [
      {
        id: 'critical-failures',
        name: 'Critical Failures',
        description: 'Critical tests that failed',
        filters: {
          status: ['failed'],
          tags: ['@critical']
        },
        isDefault: false
      },
      {
        id: 'flaky-tests',
        name: 'Flaky Tests',
        description: 'Tests with inconsistent results',
        filters: {
          retries: true
        }
      }
    ]
  },

  // Notifications
  notifications: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#qa-automation',
      enabled: process.env.NODE_ENV === 'production'
    },
    email: {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      },
      to: ['qa-team@company.com'],
      enabled: false
    }
  }
};

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return auroraPlugin(on, config);
    },
    reporter: 'cypress-aurora-reporter',
    reporterOptions: auroraConfig
  }
});
```

### Environment-Based Configuration

```javascript
// cypress.config.js
const getAuroraConfig = (env) => {
  const baseConfig = {
    enabled: true,
    outputDir: './aurora-reports',
    screenshots: { enabled: true }
  };

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        dashboardPort: 4200,
        realTimeUpdates: true,
        retentionDays: 7
      };

    case 'staging':
      return {
        ...baseConfig,
        dashboardPort: 4201,
        realTimeUpdates: false,
        retentionDays: 30,
        notifications: {
          slack: {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            enabled: true
          }
        }
      };

    case 'production':
      return {
        ...baseConfig,
        dashboardPort: 4202,
        realTimeUpdates: false,
        retentionDays: 90,
        database: {
          enableWAL: true,
          backupInterval: 6 * 60 * 60 * 1000 // 6 hours
        }
      };

    default:
      return baseConfig;
  }
};

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const auroraConfig = getAuroraConfig(config.env.NODE_ENV);
      return auroraPlugin(on, config);
    },
    reporter: 'cypress-aurora-reporter',
    reporterOptions: getAuroraConfig(process.env.NODE_ENV)
  }
});
```

## 🏗️ CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/cypress.yml
name: Cypress Tests with Aurora Reporter

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        browser: [chrome, firefox, edge]
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Cypress tests
        run: npx cypress run --browser ${{ matrix.browser }}
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
          AURORA_DASHBOARD_PORT: 4200
          NODE_ENV: ci

      - name: Generate Aurora Report
        if: always()
        run: |
          npx aurora-dashboard --generate-report
          
      - name: Upload Aurora Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: aurora-reports-${{ matrix.browser }}
          path: |
            aurora-reports/
            !aurora-reports/node_modules/
          retention-days: 30

      - name: Deploy Dashboard to Staging
        if: github.ref == 'refs/heads/develop'
        run: |
          # Deploy dashboard to staging environment
          docker build -t aurora-dashboard:staging .
          docker run -d -p 4200:4200 --name aurora-staging aurora-dashboard:staging

      - name: Notify Slack
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#qa-automation'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        AURORA_PORT = '4200'
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    // Install Node.js
                    def nodeHome = tool name: "Node-${NODE_VERSION}", type: 'nodejs'
                    env.PATH = "${nodeHome}/bin:${env.PATH}"
                }
                
                // Install dependencies
                sh 'npm ci'
            }
        }
        
        stage('Test') {
            parallel {
                stage('Chrome Tests') {
                    steps {
                        sh 'npx cypress run --browser chrome'
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'aurora-reports/**/*', fingerprint: true
                        }
                    }
                }
                
                stage('Firefox Tests') {
                    steps {
                        sh 'npx cypress run --browser firefox'
                    }
                }
            }
        }
        
        stage('Report') {
            steps {
                script {
                    // Start Aurora dashboard
                    sh 'npx aurora-dashboard --port ${AURORA_PORT} &'
                    
                    // Wait for dashboard to be ready
                    timeout(time: 2, unit: 'MINUTES') {
                        waitUntil {
                            script {
                                def response = sh(
                                    script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:${AURORA_PORT}/health",
                                    returnStdout: true
                                ).trim()
                                return response == '200'
                            }
                        }
                    }
                    
                    // Generate static report
                    sh 'npx aurora-dashboard --export pdf --output ./reports/aurora-report.pdf'
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'aurora-reports',
                        reportFiles: 'index.html',
                        reportName: 'Aurora Test Report'
                    ])
                }
            }
        }
    }
    
    post {
        always {
            // Cleanup
            sh 'pkill -f aurora-dashboard || true'
        }
        
        failure {
            // Send notification
            slackSend(
                channel: '#qa-automation',
                color: 'danger',
                message: "Test run failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }
        
        success {
            slackSend(
                channel: '#qa-automation',
                color: 'good',
                message: "Test run passed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - install
  - test
  - report
  - deploy

variables:
  AURORA_PORT: "4200"

cache:
  paths:
    - node_modules/
    - src/dashboard/node_modules/

install_dependencies:
  stage: install
  script:
    - npm ci
    - cd src/dashboard && npm ci
  artifacts:
    paths:
      - node_modules/
      - src/dashboard/node_modules/
    expire_in: 1 hour

.test_template: &test_template
  stage: test
  script:
    - npx cypress run --browser $BROWSER
  artifacts:
    when: always
    paths:
      - aurora-reports/
      - cypress/screenshots/
      - cypress/videos/
    expire_in: 1 week
    reports:
      junit: aurora-reports/junit/*.xml

test_chrome:
  <<: *test_template
  variables:
    BROWSER: "chrome"

test_firefox:
  <<: *test_template
  variables:
    BROWSER: "firefox"

generate_report:
  stage: report
  dependencies:
    - test_chrome
    - test_firefox
  script:
    - npx aurora-dashboard --generate-static-report
    - npx aurora-dashboard --export pdf --output aurora-report.pdf
  artifacts:
    paths:
      - aurora-report.pdf
      - aurora-reports/
    expire_in: 1 month

deploy_dashboard:
  stage: deploy
  only:
    - main
  script:
    - docker build -t $CI_REGISTRY_IMAGE/aurora-dashboard:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE/aurora-dashboard:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/aurora-dashboard:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/aurora-dashboard:latest
    - docker push $CI_REGISTRY_IMAGE/aurora-dashboard:latest
```

## 🏷️ Custom Test Metadata

### Adding Test Tags and Context

```javascript
// cypress/e2e/auth/login.cy.js
describe('Authentication', { tags: ['@auth', '@critical'] }, () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login with valid credentials', 
    { 
      tags: ['@smoke', '@regression'],
      meta: {
        feature: 'login',
        priority: 'high',
        jira: 'AUTH-123'
      }
    }, 
    () => {
      // Add custom context for Aurora Reporter
      cy.task('aurora:updateTestMetadata', {
        context: 'User authentication flow',
        tags: ['auth', 'smoke', 'regression'],
        customData: {
          testOwner: 'qa-team',
          lastUpdated: '2024-01-15',
          environment: 'staging'
        }
      });

      cy.get('[data-cy=username]').type('user@example.com');
      cy.get('[data-cy=password]').type('securePassword123');
      cy.get('[data-cy=login-button]').click();

      cy.url().should('include', '/dashboard');
      cy.get('[data-cy=user-menu]').should('be.visible');
    }
  );

  it('should show error for invalid credentials', 
    { tags: ['@negative'] }, 
    () => {
      cy.task('aurora:updateTestMetadata', {
        context: 'Invalid login attempt handling',
        expectedBehavior: 'Should display error message and not redirect'
      });

      cy.get('[data-cy=username]').type('invalid@example.com');
      cy.get('[data-cy=password]').type('wrongpassword');
      cy.get('[data-cy=login-button]').click();

      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');
      
      cy.url().should('include', '/login');
    }
  );
});
```

### Dynamic Test Metadata

```javascript
// cypress/support/commands.js
Cypress.Commands.add('setTestContext', (context) => {
  cy.task('aurora:updateTestMetadata', {
    context,
    timestamp: new Date().toISOString(),
    testFile: Cypress.spec.name,
    browser: Cypress.browser.name
  });
});

Cypress.Commands.add('logTestStep', (step, details = {}) => {
  cy.task('aurora:log', `STEP: ${step} | ${JSON.stringify(details)}`);
});

// Usage in tests
it('should complete checkout process', () => {
  cy.setTestContext('E-commerce checkout flow validation');
  
  cy.logTestStep('Add item to cart', { item: 'Test Product', price: '$29.99' });
  cy.addToCart('test-product');
  
  cy.logTestStep('Navigate to checkout');
  cy.get('[data-cy=checkout-button]').click();
  
  cy.logTestStep('Fill shipping information');
  cy.fillShippingForm({
    name: 'John Doe',
    address: '123 Test St',
    city: 'Test City'
  });
  
  cy.logTestStep('Complete payment');
  cy.completePayment('4111111111111111');
  
  cy.logTestStep('Verify order confirmation');
  cy.get('[data-cy=order-confirmation]').should('be.visible');
});
```

## 📸 Screenshot Management

### Automatic Screenshots

```javascript
// cypress.config.js - Configure automatic screenshots
const auroraConfig = {
  screenshots: {
    enabled: true,
    quality: 95,
    format: 'png',
    onFailureOnly: false, // Take screenshots for all tests
    compressImages: true,
    viewport: {
      width: 1920,
      height: 1080
    }
  }
};
```

### Custom Screenshots

```javascript
// cypress/support/commands.js
Cypress.Commands.add('takeAuroraScreenshot', (name, options = {}) => {
  cy.task('aurora:takeScreenshot', {
    name: `${Cypress.currentTest.title}_${name}`,
    fullPage: options.fullPage || false,
    clip: options.clip,
    ...options
  }).then((screenshotPath) => {
    cy.log(`Screenshot saved: ${screenshotPath}`);
  });
});

// Usage in tests
it('should display product gallery', () => {
  cy.visit('/products/sample-product');
  
  // Take screenshot before interaction
  cy.takeAuroraScreenshot('initial_load', { fullPage: true });
  
  // Interact with gallery
  cy.get('[data-cy=thumbnail]').first().click();
  
  // Take screenshot after interaction
  cy.takeAuroraScreenshot('after_thumbnail_click');
  
  // Take screenshot of specific element
  cy.get('[data-cy=product-gallery]').then($gallery => {
    cy.takeAuroraScreenshot('gallery_close_up', {
      clip: {
        x: $gallery[0].offsetLeft,
        y: $gallery[0].offsetTop,
        width: $gallery[0].offsetWidth,
        height: $gallery[0].offsetHeight
      }
    });
  });
});
```

### Screenshot Comparison

```javascript
// cypress/support/commands.js
Cypress.Commands.add('compareScreenshot', (baselineName, threshold = 0.1) => {
  cy.takeAuroraScreenshot(`current_${baselineName}`).then((currentPath) => {
    cy.task('aurora:compareScreenshots', {
      baseline: `baseline_${baselineName}`,
      current: currentPath,
      threshold: threshold
    }).then((result) => {
      if (!result.match) {
        throw new Error(`Screenshot comparison failed: ${result.difference}% difference`);
      }
    });
  });
});

// Usage
it('should maintain visual consistency', () => {
  cy.visit('/homepage');
  cy.compareScreenshot('homepage', 0.05); // 5% threshold
});
```

## 📊 Dashboard API Usage

### Programmatic Dashboard Control

```javascript
// scripts/generate-reports.js
const { createServer } = require('cypress-aurora-reporter');

async function generateReports() {
  const server = createServer({
    outputDir: './test-reports',
    dashboardPort: 4200
  });

  try {
    await server.start();
    
    // Get database manager
    const db = server.getDatabaseManager();
    
    // Get recent test runs
    const recentRuns = await db.testRunRepository.findAll();
    console.log(`Found ${recentRuns.length} test runs`);
    
    // Get failed tests
    const failedTests = await db.testResultRepository.findWithFilters({
      status: ['failed']
    });
    console.log(`Found ${failedTests.length} failed tests`);
    
    // Get flaky tests
    const flakyTests = await db.testResultRepository.findFlaky(0.1);
    console.log(`Found ${flakyTests.length} flaky tests`);
    
    // Generate custom report
    const reportData = {
      summary: {
        totalRuns: recentRuns.length,
        failedTests: failedTests.length,
        flakyTests: flakyTests.length
      },
      details: {
        recentRuns: recentRuns.slice(0, 10),
        criticalFailures: failedTests.filter(test => 
          test.tags?.includes('critical')
        )
      }
    };
    
    // Save custom report
    await fs.writeFile(
      './custom-report.json', 
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('Custom report generated successfully');
    
  } finally {
    await server.stop();
  }
}

generateReports().catch(console.error);
```

### API Client Usage

```javascript
// scripts/dashboard-analytics.js
const { apiClient } = require('cypress-aurora-reporter/dashboard');

async function analyzeTestData() {
  try {
    // Get test runs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const runs = await apiClient.getTestRuns({
      dateFrom: thirtyDaysAgo.toISOString(),
      dateTo: new Date().toISOString(),
      limit: 1000
    });
    
    if (!runs.success) {
      throw new Error('Failed to fetch test runs');
    }
    
    // Analyze data
    const analysis = {
      totalRuns: runs.data.length,
      successRate: runs.data.filter(r => r.failed === 0).length / runs.data.length,
      averageDuration: runs.data.reduce((acc, r) => acc + (r.duration || 0), 0) / runs.data.length,
      browsers: [...new Set(runs.data.map(r => r.browserName))]
    };
    
    console.log('Test Analysis:', analysis);
    
    // Get flaky tests
    const flakyTests = await apiClient.getFlakyTests(0.1, 20);
    if (flakyTests.success) {
      console.log('Top Flaky Tests:');
      flakyTests.data.forEach(test => {
        console.log(`  - ${test.testTitle}: ${test.flakyRate * 100}% flaky rate`);
      });
    }
    
    // Get trend data
    const trends = await apiClient.getTrendData(30);
    if (trends.success) {
      const latestTrend = trends.data[trends.data.length - 1];
      console.log('Latest Trend:', latestTrend);
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeTestData();
```

## 🐳 Docker Deployment

### Basic Docker Setup

```dockerfile
# Dockerfile.aurora
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/
COPY aurora-reports/ ./aurora-reports/

# Create non-root user
RUN addgroup -g 1001 -S aurora && \
    adduser -S aurora -u 1001

# Set permissions
RUN chown -R aurora:aurora /app
USER aurora

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4200/health || exit 1

CMD ["node", "dist/server/index.js"]
```

### Docker Compose for Development

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  aurora-dashboard:
    build:
      context: .
      dockerfile: Dockerfile.aurora
    ports:
      - "4200:4200"
    environment:
      - NODE_ENV=development
      - AURORA_DB_PATH=/app/data/aurora.db
      - AURORA_REAL_TIME=true
    volumes:
      - ./aurora-reports:/app/aurora-reports
      - aurora_data:/app/data
    restart: unless-stopped

  aurora-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: aurora
      POSTGRES_USER: aurora
      POSTGRES_PASSWORD: aurora_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - aurora-dashboard

volumes:
  aurora_data:
  postgres_data:
```

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  aurora-dashboard:
    image: aurora-reporter:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    environment:
      - NODE_ENV=production
      - AURORA_DB_PATH=/app/data/aurora.db
      - AURORA_REAL_TIME=false
      - AURORA_RETENTION_DAYS=90
    volumes:
      - aurora_data:/app/data
      - aurora_reports:/app/aurora-reports:ro
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:4200/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - aurora-dashboard

  backup:
    image: alpine:latest
    volumes:
      - aurora_data:/data:ro
      - backup_storage:/backup
    command: >
      sh -c "
        while true; do
          tar -czf /backup/aurora-backup-$$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
          find /backup -name '*.tar.gz' -mtime +7 -delete
          sleep 86400
        done
      "

volumes:
  aurora_data:
  aurora_reports:
  backup_storage:
```

### Kubernetes Deployment

```yaml
# k8s/aurora-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aurora-dashboard
  labels:
    app: aurora-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aurora-dashboard
  template:
    metadata:
      labels:
        app: aurora-dashboard
    spec:
      containers:
      - name: aurora-dashboard
        image: aurora-reporter:latest
        ports:
        - containerPort: 4200
        env:
        - name: NODE_ENV
          value: "production"
        - name: AURORA_DB_PATH
          value: "/app/data/aurora.db"
        - name: AURORA_RETENTION_DAYS
          value: "90"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: aurora-data
          mountPath: /app/data
        - name: aurora-reports
          mountPath: /app/aurora-reports
          readOnly: true
        livenessProbe:
          httpGet:
            path: /health
            port: 4200
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4200
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: aurora-data
        persistentVolumeClaim:
          claimName: aurora-data-pvc
      - name: aurora-reports
        hostPath:
          path: /opt/aurora-reports
          type: Directory

---
apiVersion: v1
kind: Service
metadata:
  name: aurora-dashboard-service
spec:
  selector:
    app: aurora-dashboard
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4200
  type: LoadBalancer

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: aurora-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Dashboard Not Loading

```bash
# Check if port is in use
netstat -tulpn | grep :4200

# Start with debug logging
DEBUG=aurora:* npx aurora-dashboard

# Check disk space
df -h

# Verify Node.js version
node --version
npm --version
```

#### Database Issues

```javascript
// Check database health
const { DatabaseManager } = require('cypress-aurora-reporter/database');

async function checkDatabase() {
  const db = new DatabaseManager({
    path: './aurora-reports/aurora.db'
  });
  
  try {
    await db.initialize();
    const health = await db.healthCheck();
    console.log('Database health:', health);
    
    const stats = await db.getStatistics();
    console.log('Database stats:', stats);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

checkDatabase();
```

#### Screenshot Issues

```bash
# Reinstall Sharp (common fix)
npm rebuild sharp

# Check screenshot directory permissions
ls -la aurora-reports/screenshots/

# Test Sharp installation
node -e "const sharp = require('sharp'); console.log('Sharp version:', sharp.version);"

# Clear screenshot cache
rm -rf aurora-reports/screenshots/.cache
```

#### Performance Optimization

```javascript
// cypress.config.js - Performance optimizations
const auroraConfig = {
  database: {
    enableWAL: true,
    maxConnections: 5 // Reduce for lower resource usage
  },
  screenshots: {
    compressImages: true,
    quality: 75 // Lower quality for faster processing
  },
  realTimeUpdates: false, // Disable in CI environments
  retentionDays: 7 // Shorter retention for less storage
};
```

This comprehensive examples document should help users understand how to implement Aurora Reporter in various scenarios. Each example is practical and can be directly used or adapted for specific needs.