import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs-extra';
import { 
  AuroraReporterConfig, 
  CypressPluginApi, 
  CypressBeforeRunDetails, 
  CypressAfterRunDetails, 
  CypressAfterSpecDetails,
  TestRun,
  CIInfo,
  Theme
} from '../types';
import { DatabaseManager } from '../database/DatabaseManager';
import { ScreenshotManager } from '../utils/ScreenshotManager';
import { Logger } from '../utils/Logger';
import { ConfigValidator } from '../utils/ConfigValidator';

export class AuroraPlugin {
  private config: AuroraReporterConfig;
  private databaseManager: DatabaseManager;
  private screenshotManager: ScreenshotManager;
  private logger: Logger;
  private currentRun: TestRun | null = null;

  constructor(config: AuroraReporterConfig = {}) {
    this.config = this.validateAndMergeConfig(config);
    this.logger = new Logger('AuroraPlugin', this.config.enableDebugLogs);
    this.databaseManager = new DatabaseManager(this.config.database);
    this.screenshotManager = new ScreenshotManager(this.config.screenshots);
  }

  /**
   * Initialize the Aurora Reporter plugin
   */
  public async initialize(on: any, config: any): Promise<AuroraReporterConfig> {
    this.logger.info('Initializing Aurora Reporter plugin');

    try {
      // Initialize database
      await this.databaseManager.initialize();
      
      // Setup plugin hooks
      this.setupHooks(on, config);
      
      // Setup screenshot handling
      await this.setupScreenshotHandling(on, config);
      
      // Setup task handlers
      this.setupTasks(on);

      // Merge plugin config with Cypress config
      const mergedConfig = {
        ...config,
        env: {
          ...config.env,
          AURORA_REPORTER_ENABLED: this.config.enabled,
          AURORA_REPORTER_OUTPUT_DIR: this.config.outputDir,
          AURORA_REPORTER_DASHBOARD_PORT: this.config.dashboardPort
        }
      };

      this.logger.info('Aurora Reporter plugin initialized successfully');
      return mergedConfig;

    } catch (error) {
      this.logger.error('Failed to initialize Aurora Reporter plugin:', error);
      throw error;
    }
  }

  /**
   * Setup Cypress event hooks
   */
  private setupHooks(on: any, config: any): void {
    // Before run starts
    on('before:run', async (details: CypressBeforeRunDetails) => {
      this.logger.debug('Before run event triggered');
      await this.handleBeforeRun(details);
    });

    // After run completes
    on('after:run', async (results: CypressAfterRunDetails) => {
      this.logger.debug('After run event triggered');
      await this.handleAfterRun(results);
    });

    // After each spec file
    on('after:spec', async (spec: any, results: CypressAfterSpecDetails) => {
      this.logger.debug(`After spec event triggered for ${spec.relative}`);
      await this.handleAfterSpec(spec, results);
    });

    // Before spec file
    on('before:spec', async (spec: any) => {
      this.logger.debug(`Before spec event triggered for ${spec.relative}`);
      await this.handleBeforeSpec(spec);
    });
  }

  /**
   * Setup screenshot handling
   */
  private async setupScreenshotHandling(on: any, config: any): Promise<void> {
    if (!this.config.screenshots?.enabled) {
      return;
    }

    // Setup screenshot directory
    const screenshotDir = this.config.screenshotDir || path.join(this.config.outputDir!, 'screenshots');
    await fs.ensureDir(screenshotDir);

    // Configure Cypress screenshot settings
    config.screenshotsFolder = screenshotDir;
    config.screenshotOnRunFailure = true;

    // Handle screenshot events
    on('after:screenshot', async (details: any) => {
      if (this.config.screenshots?.enabled) {
        await this.handleScreenshot(details);
      }
    });
  }

  /**
   * Setup custom tasks
   */
  private setupTasks(on: any): void {
    on('task', {
      // Save test result
      'aurora:saveTestResult': async (testData: any) => {
        return await this.saveTestResult(testData);
      },

      // Take custom screenshot
      'aurora:takeScreenshot': async (options: any) => {
        return await this.takeCustomScreenshot(options);
      },

      // Log custom message
      'aurora:log': (message: string) => {
        this.logger.info(`Custom log: ${message}`);
        return null;
      },

      // Get current run ID
      'aurora:getCurrentRunId': () => {
        return this.currentRun?.id || null;
      },

      // Update test metadata
      'aurora:updateTestMetadata': async (data: any) => {
        return await this.updateTestMetadata(data);
      }
    });
  }

  /**
   * Handle before run event
   */
  private async handleBeforeRun(details: CypressBeforeRunDetails): Promise<void> {
    try {
      const runId = uuidv4();
      const ciInfo = this.getCIInfo();

      this.currentRun = {
        id: runId,
        startTime: new Date(),
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        retries: 0,
        browserName: details.browser.name,
        browserVersion: details.browser.version,
        cypressVersion: process.env.npm_package_version || 'unknown',
        specFiles: details.specs.map(spec => spec.relative),
        config: details.config,
        ciInfo,
        status: 'running',
        results: []
      };

      // Save run to database
      await this.databaseManager.testRunRepository.create(this.currentRun);

      this.logger.info(`Started test run ${runId} with ${details.specs.length} spec files`);

    } catch (error) {
      this.logger.error('Error handling before run event:', error);
      throw error;
    }
  }

  /**
   * Handle after run event
   */
  private async handleAfterRun(results: CypressAfterRunDetails): Promise<void> {
    if (!this.currentRun) {
      this.logger.warn('No current run found in after run handler');
      return;
    }

    try {
      // Update run with final results
      this.currentRun.endTime = new Date();
      this.currentRun.duration = this.currentRun.endTime.getTime() - this.currentRun.startTime.getTime();
      this.currentRun.totalTests = results.totalTests;
      this.currentRun.passed = results.totalPassed;
      this.currentRun.failed = results.totalFailed;
      this.currentRun.skipped = results.totalSkipped;
      this.currentRun.pending = results.totalPending;
      this.currentRun.status = results.totalFailed > 0 ? 'failed' : 'completed';

      // Update in database
      await this.databaseManager.testRunRepository.update(this.currentRun.id, this.currentRun);

      // Cleanup old data if configured
      if (this.config.retentionDays && this.config.retentionDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
        await this.databaseManager.testRunRepository.deleteOlderThan(cutoffDate);
      }

      this.logger.info(`Completed test run ${this.currentRun.id}: ${this.currentRun.passed}/${this.currentRun.totalTests} passed`);

    } catch (error) {
      this.logger.error('Error handling after run event:', error);
    }
  }

  /**
   * Handle before spec event
   */
  private async handleBeforeSpec(spec: any): Promise<void> {
    this.logger.debug(`Starting spec: ${spec.relative}`);
  }

  /**
   * Handle after spec event
   */
  private async handleAfterSpec(spec: any, results: CypressAfterSpecDetails): Promise<void> {
    if (!this.currentRun) {
      this.logger.warn('No current run found in after spec handler');
      return;
    }

    try {
      // Process each test result
      for (const test of results.results.tests) {
        const testResult = {
          id: uuidv4(),
          runId: this.currentRun.id,
          title: test.title,
          fullTitle: test.fullTitle,
          state: test.state,
          duration: test.duration,
          error: test.err ? {
            name: test.err.name || 'Error',
            message: test.err.message || 'Unknown error',
            stack: test.err.stack
          } : undefined,
          screenshot: await this.findTestScreenshot(test),
          retries: test.currentRetry || 0,
          currentRetry: test.currentRetry || 0,
          pending: test.pending,
          file: spec.relative,
          parent: test.parent?.title || '',
          startTime: new Date(test.wallClockStartedAt),
          endTime: new Date(test.wallClockStartedAt + test.wallClockDuration),
          browser: {
            name: this.currentRun.browserName,
            version: this.currentRun.browserVersion
          },
          viewport: results.results.config?.viewportWidth ? {
            width: results.results.config.viewportWidth,
            height: results.results.config.viewportHeight
          } : undefined
        };

        // Save test result
        await this.databaseManager.testResultRepository.create(testResult);
        this.currentRun.results.push(testResult);
      }

      this.logger.debug(`Processed ${results.results.tests.length} tests from spec ${spec.relative}`);

    } catch (error) {
      this.logger.error('Error handling after spec event:', error);
    }
  }

  /**
   * Handle screenshot capture
   */
  private async handleScreenshot(details: any): Promise<void> {
    try {
      if (this.config.screenshots?.compressImages) {
        await this.screenshotManager.compressScreenshot(details.path);
      }

      this.logger.debug(`Screenshot captured: ${details.path}`);

    } catch (error) {
      this.logger.error('Error handling screenshot:', error);
    }
  }

  /**
   * Save test result via task
   */
  private async saveTestResult(testData: any): Promise<boolean> {
    try {
      if (!this.currentRun) {
        return false;
      }

      const testResult = {
        ...testData,
        id: uuidv4(),
        runId: this.currentRun.id,
        startTime: new Date(testData.startTime),
        endTime: new Date(testData.endTime)
      };

      await this.databaseManager.testResultRepository.create(testResult);
      return true;

    } catch (error) {
      this.logger.error('Error saving test result:', error);
      return false;
    }
  }

  /**
   * Take custom screenshot
   */
  private async takeCustomScreenshot(options: any): Promise<string | null> {
    try {
      const screenshotPath = await this.screenshotManager.takeScreenshot(options);
      return screenshotPath;
    } catch (error) {
      this.logger.error('Error taking custom screenshot:', error);
      return null;
    }
  }

  /**
   * Update test metadata
   */
  private async updateTestMetadata(data: any): Promise<boolean> {
    try {
      await this.databaseManager.testResultRepository.update(data.id, data.updates);
      return true;
    } catch (error) {
      this.logger.error('Error updating test metadata:', error);
      return false;
    }
  }

  /**
   * Find screenshot for a test
   */
  private async findTestScreenshot(test: any): Promise<string | undefined> {
    if (!this.config.screenshots?.enabled || !test.err) {
      return undefined;
    }

    try {
      const screenshotDir = this.config.screenshotDir || path.join(this.config.outputDir!, 'screenshots');
      const possibleNames = [
        `${test.title} (failed).png`,
        `${test.fullTitle} (failed).png`,
        `${test.title}.png`
      ];

      for (const name of possibleNames) {
        const screenshotPath = path.join(screenshotDir, name);
        if (await fs.pathExists(screenshotPath)) {
          return screenshotPath;
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error('Error finding test screenshot:', error);
      return undefined;
    }
  }

  /**
   * Get CI information
   */
  private getCIInfo(): CIInfo | undefined {
    const env = process.env;
    
    // GitHub Actions
    if (env.GITHUB_ACTIONS) {
      return {
        provider: 'github-actions',
        branch: env.GITHUB_REF_NAME,
        commit: env.GITHUB_SHA,
        buildNumber: env.GITHUB_RUN_NUMBER,
        buildUrl: `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
        isPR: env.GITHUB_EVENT_NAME === 'pull_request',
        prNumber: env.GITHUB_EVENT_NAME === 'pull_request' ? env.GITHUB_REF_NAME?.split('/')[0] : undefined
      };
    }

    // Jenkins
    if (env.JENKINS_URL) {
      return {
        provider: 'jenkins',
        branch: env.GIT_BRANCH,
        commit: env.GIT_COMMIT,
        buildNumber: env.BUILD_NUMBER,
        buildUrl: env.BUILD_URL
      };
    }

    // GitLab CI
    if (env.GITLAB_CI) {
      return {
        provider: 'gitlab',
        branch: env.CI_COMMIT_REF_NAME,
        commit: env.CI_COMMIT_SHA,
        buildNumber: env.CI_PIPELINE_ID,
        buildUrl: env.CI_PIPELINE_URL,
        isPR: env.CI_MERGE_REQUEST_ID !== undefined,
        prNumber: env.CI_MERGE_REQUEST_ID
      };
    }

    return undefined;
  }

  /**
   * Validate and merge configuration
   */
  private validateAndMergeConfig(userConfig: AuroraReporterConfig): AuroraReporterConfig {
    const defaultConfig: AuroraReporterConfig = {
      enabled: true,
      outputDir: './aurora-reports',
      screenshotDir: './aurora-reports/screenshots',
      dashboardPort: 4200,
      retentionDays: 30,
      realTimeUpdates: true,
      theme: 'auto' as Theme,
      screenshots: {
        enabled: true,
        quality: 90,
        format: 'png',
        onFailureOnly: true,
        compressImages: true,
        viewport: {
          width: 1280,
          height: 720
        }
      },
      database: {
        path: './aurora-reports/aurora.db',
        maxConnections: 10,
        enableWAL: true,
        backupInterval: 24 * 60 * 60 * 1000 // 24 hours
      }
    };

    const merged = { ...defaultConfig, ...userConfig };
    
    // Validate configuration
    const validator = new ConfigValidator();
    const validation = validator.validate(merged);
    
    if (!validation.isValid) {
      throw new Error(`Invalid Aurora Reporter configuration: ${validation.errors.join(', ')}`);
    }

    return merged;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.databaseManager.close();
      this.logger.info('Aurora Reporter plugin cleanup completed');
    } catch (error) {
      this.logger.error('Error during plugin cleanup:', error);
    }
  }
}

/**
 * Plugin factory function for Cypress
 */
export default function auroraPlugin(on: any, config: any): AuroraReporterConfig {
  const reporterConfig = config.env?.AURORA_REPORTER_CONFIG || {};
  const plugin = new AuroraPlugin(reporterConfig);
  
  return plugin.initialize(on, config);
}