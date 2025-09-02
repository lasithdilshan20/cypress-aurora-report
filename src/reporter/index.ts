import type { interfaces } from 'mocha';
// Resolve Mocha's Base reporter at runtime without bundling Mocha
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MochaBase: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require('mocha');
  // Try standard reporter paths
  MochaBase = (m && (m.reporters?.Base || (m as any).Base)) || require('mocha/lib/reporters/base');
} catch {
  const g: any = (globalThis as any) || {};
  MochaBase = g.Mocha?.reporters?.Base || g.Mocha?.Base;
  if (!MochaBase) {
    MochaBase = class {};
  }
}
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs-extra';
import { 
  AuroraReporterConfig, 
  TestResult, 
  TestRun, 
  TestStatus, 
  ReporterOptions,
  ReporterEvents,
  Theme
} from '../types';
import { DatabaseManager } from '../database/DatabaseManager';
import { Logger } from '../utils/Logger';
import { ScreenshotManager } from '../utils/ScreenshotManager';

export class AuroraReporter extends MochaBase implements interfaces.ReporterConstructor {
  private config: AuroraReporterConfig;
  private databaseManager: DatabaseManager;
  private screenshotManager: ScreenshotManager;
  private logger: Logger;
  private events: ReporterEvents;
  private currentRun: TestRun | null = null;
  private testResults: Map<string, TestResult> = new Map();
  private startTime: Date = new Date();

  constructor(runner: interfaces.Runner, options: ReporterOptions) {
    super(runner, options);

    // Initialize configuration
    this.config = this.mergeConfig(options.reporterOptions || {});
    this.logger = new Logger('AuroraReporter', this.config.enableDebugLogs);
    this.events = new EventEmitter() as ReporterEvents;

    // Initialize managers
    this.databaseManager = new DatabaseManager(this.config.database);
    this.screenshotManager = new ScreenshotManager(this.config.screenshots);

    // Initialize async components
    this.initialize().catch(error => {
      this.logger.error('Failed to initialize Aurora Reporter:', error);
    });

    // Setup event listeners
    this.setupEventListeners(runner);
  }

  /**
   * Initialize the reporter
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize database
      await this.databaseManager.initialize();

      // Ensure output directories exist
      await fs.ensureDir(this.config.outputDir!);
      if (this.config.screenshots?.enabled) {
        await fs.ensureDir(this.config.screenshotDir!);
      }

      this.logger.info('Aurora Reporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Aurora Reporter:', error);
      throw error;
    }
  }

  /**
   * Setup Mocha event listeners
   */
  private setupEventListeners(runner: interfaces.Runner): void {
    // Run started
    runner.on('start', () => {
      this.handleRunStart();
    });

    // Run ended
    runner.on('end', () => {
      this.handleRunEnd();
    });

    // Suite started
    runner.on('suite', (suite: interfaces.Suite) => {
      this.handleSuiteStart(suite);
    });

    // Suite ended
    runner.on('suite end', (suite: interfaces.Suite) => {
      this.handleSuiteEnd(suite);
    });

    // Test started
    runner.on('test', (test: interfaces.Test) => {
      this.handleTestStart(test);
    });

    // Test passed
    runner.on('pass', (test: interfaces.Test) => {
      this.handleTestPass(test);
    });

    // Test failed
    runner.on('fail', (test: interfaces.Test, err: any) => {
      this.handleTestFail(test, err);
    });

    // Test pending/skipped
    runner.on('pending', (test: interfaces.Test) => {
      this.handleTestPending(test);
    });

    // Hook started
    runner.on('hook', (hook: interfaces.Hook) => {
      this.handleHookStart(hook);
    });

    // Hook ended
    runner.on('hook end', (hook: interfaces.Hook) => {
      this.handleHookEnd(hook);
    });

    // Retry
    runner.on('retry', (test: interfaces.Test, err: any) => {
      this.handleTestRetry(test, err);
    });
  }

  /**
   * Handle run start
   */
  private handleRunStart(): void {
    try {
      const runId = uuidv4();
      this.startTime = new Date();

      this.currentRun = {
        id: runId,
        startTime: this.startTime,
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        retries: 0,
        browserName: this.getBrowserName(),
        browserVersion: this.getBrowserVersion(),
        cypressVersion: this.getCypressVersion(),
        specFiles: this.getSpecFiles(),
        config: this.getRunConfig(),
        ciInfo: this.getCIInfo(),
        status: 'running',
        results: []
      };

      // Save run to database
      this.databaseManager.testRunRepository.create(this.currentRun).catch(error => {
        this.logger.error('Failed to save test run to database:', error);
      });

      // Emit event
      this.events.emit('run:start', this.currentRun);

      this.logger.info(`Started test run ${runId}`);
    } catch (error) {
      this.logger.error('Error handling run start:', error);
    }
  }

  /**
   * Handle run end
   */
  private handleRunEnd(): void {
    if (!this.currentRun) {
      this.logger.warn('No current run found in run end handler');
      return;
    }

    try {
      const endTime = new Date();
      this.currentRun.endTime = endTime;
      this.currentRun.duration = endTime.getTime() - this.startTime.getTime();
      this.currentRun.totalTests = this.testResults.size;
      this.currentRun.results = Array.from(this.testResults.values());
      
      // Calculate stats
      this.currentRun.passed = this.currentRun.results.filter(t => t.state === TestStatus.PASSED).length;
      this.currentRun.failed = this.currentRun.results.filter(t => t.state === TestStatus.FAILED).length;
      this.currentRun.skipped = this.currentRun.results.filter(t => t.state === TestStatus.SKIPPED).length;
      this.currentRun.pending = this.currentRun.results.filter(t => t.state === TestStatus.PENDING).length;

      this.currentRun.status = this.currentRun.failed > 0 ? 'failed' : 'completed';

      // Update in database
      this.databaseManager.testRunRepository.update(this.currentRun.id, this.currentRun).catch(error => {
        this.logger.error('Failed to update test run in database:', error);
      });

      // Generate reports
      this.generateReports().catch(error => {
        this.logger.error('Failed to generate reports:', error);
      });

      // Emit event
      this.events.emit('run:end', this.currentRun);

      this.logger.info(
        `Completed test run ${this.currentRun.id}: ` +
        `${this.currentRun.passed}/${this.currentRun.totalTests} passed ` +
        `(${this.currentRun.duration}ms)`
      );

    } catch (error) {
      this.logger.error('Error handling run end:', error);
    }
  }

  /**
   * Handle suite start
   */
  private handleSuiteStart(suite: interfaces.Suite): void {
    this.logger.debug(`Started suite: ${suite.title}`);
  }

  /**
   * Handle suite end
   */
  private handleSuiteEnd(suite: interfaces.Suite): void {
    this.logger.debug(`Completed suite: ${suite.title}`);
  }

  /**
   * Handle test start
   */
  private handleTestStart(test: interfaces.Test): void {
    try {
      const testResult: TestResult = {
        id: uuidv4(),
        runId: this.currentRun?.id || '',
        title: test.title,
        fullTitle: test.fullTitle(),
        state: TestStatus.PENDING,
        duration: 0,
        retries: test.currentRetry() || 0,
        currentRetry: test.currentRetry() || 0,
        pending: test.pending,
        file: this.getTestFile(test),
        parent: test.parent?.title || '',
        startTime: new Date(),
        tags: this.extractTags(test),
        browser: {
          name: this.getBrowserName(),
          version: this.getBrowserVersion()
        }
      };

      this.testResults.set(test.fullTitle(), testResult);

      // Emit event
      this.events.emit('test:start', testResult);

      this.logger.debug(`Started test: ${test.fullTitle()}`);
    } catch (error) {
      this.logger.error('Error handling test start:', error);
    }
  }

  /**
   * Handle test pass
   */
  private handleTestPass(test: interfaces.Test): void {
    try {
      const testResult = this.testResults.get(test.fullTitle());
      if (!testResult) {
        this.logger.warn(`Test result not found for: ${test.fullTitle()}`);
        return;
      }

      testResult.state = TestStatus.PASSED;
      testResult.duration = test.duration || 0;
      testResult.endTime = new Date();

      // Save to database
      this.saveTestResult(testResult);

      // Emit event
      this.events.emit('test:end', testResult);

      this.logger.debug(`Test passed: ${test.fullTitle()} (${testResult.duration}ms)`);
    } catch (error) {
      this.logger.error('Error handling test pass:', error);
    }
  }

  /**
   * Handle test fail
   */
  private handleTestFail(test: interfaces.Test, err: any): void {
    try {
      const testResult = this.testResults.get(test.fullTitle());
      if (!testResult) {
        this.logger.warn(`Test result not found for: ${test.fullTitle()}`);
        return;
      }

      testResult.state = TestStatus.FAILED;
      testResult.duration = test.duration || 0;
      testResult.endTime = new Date();
      testResult.error = {
        name: err.name || 'Error',
        message: err.message || 'Unknown error',
        stack: err.stack,
        diff: err.diff
      };

      // Take screenshot for failed test
      if (this.config.screenshots?.enabled && !this.config.screenshots?.onFailureOnly) {
        this.takeFailureScreenshot(testResult).catch(error => {
          this.logger.error('Failed to take failure screenshot:', error);
        });
      }

      // Save to database
      this.saveTestResult(testResult);

      // Emit events
      this.events.emit('test:fail', testResult);
      this.events.emit('test:end', testResult);

      this.logger.debug(`Test failed: ${test.fullTitle()} - ${err.message}`);
    } catch (error) {
      this.logger.error('Error handling test fail:', error);
    }
  }

  /**
   * Handle test pending/skipped
   */
  private handleTestPending(test: interfaces.Test): void {
    try {
      const testResult: TestResult = {
        id: uuidv4(),
        runId: this.currentRun?.id || '',
        title: test.title,
        fullTitle: test.fullTitle(),
        state: TestStatus.PENDING,
        duration: 0,
        retries: 0,
        currentRetry: 0,
        pending: true,
        file: this.getTestFile(test),
        parent: test.parent?.title || '',
        startTime: new Date(),
        endTime: new Date(),
        tags: this.extractTags(test),
        browser: {
          name: this.getBrowserName(),
          version: this.getBrowserVersion()
        }
      };

      this.testResults.set(test.fullTitle(), testResult);

      // Save to database
      this.saveTestResult(testResult);

      // Emit event
      this.events.emit('test:end', testResult);

      this.logger.debug(`Test pending: ${test.fullTitle()}`);
    } catch (error) {
      this.logger.error('Error handling test pending:', error);
    }
  }

  /**
   * Handle test retry
   */
  private handleTestRetry(test: interfaces.Test, err: any): void {
    try {
      const testResult = this.testResults.get(test.fullTitle());
      if (testResult) {
        testResult.retries += 1;
        testResult.currentRetry = test.currentRetry() || 0;
      }

      if (this.currentRun) {
        this.currentRun.retries += 1;
      }

      this.logger.debug(`Test retry: ${test.fullTitle()} (attempt ${testResult?.currentRetry})`);
    } catch (error) {
      this.logger.error('Error handling test retry:', error);
    }
  }

  /**
   * Handle hook start
   */
  private handleHookStart(hook: interfaces.Hook): void {
    this.logger.debug(`Started hook: ${hook.title}`);
  }

  /**
   * Handle hook end
   */
  private handleHookEnd(hook: interfaces.Hook): void {
    this.logger.debug(`Completed hook: ${hook.title}`);
  }

  /**
   * Save test result to database
   */
  private async saveTestResult(testResult: TestResult): Promise<void> {
    try {
      await this.databaseManager.testResultRepository.create(testResult);
    } catch (error) {
      this.logger.error('Failed to save test result to database:', error);
    }
  }

  /**
   * Take screenshot for failed test
   */
  private async takeFailureScreenshot(testResult: TestResult): Promise<void> {
    try {
      const screenshotName = `${testResult.title.replace(/[^a-z0-9]/gi, '_')}_${testResult.id}_failed`;
      const screenshotPath = await this.screenshotManager.takeScreenshot({
        name: screenshotName,
        path: path.join(this.config.screenshotDir!, `${screenshotName}.${this.config.screenshots?.format || 'png'}`)
      });

      testResult.screenshot = screenshotPath;

      // Emit screenshot event
      this.events.emit('screenshot:taken', screenshotPath, testResult);

    } catch (error) {
      this.logger.error('Failed to take failure screenshot:', error);
    }
  }

  /**
   * Generate reports
   */
  private async generateReports(): Promise<void> {
    if (!this.currentRun) return;

    try {
      // Generate JSON report
      const jsonReport = {
        run: this.currentRun,
        tests: Array.from(this.testResults.values()),
        summary: {
          total: this.currentRun.totalTests,
          passed: this.currentRun.passed,
          failed: this.currentRun.failed,
          skipped: this.currentRun.skipped,
          pending: this.currentRun.pending,
          duration: this.currentRun.duration,
          passRate: this.currentRun.totalTests > 0 ? (this.currentRun.passed / this.currentRun.totalTests) * 100 : 0
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          reporter: 'aurora-reporter',
          version: this.getPackageVersion()
        }
      };

      const reportBase = path.join(this.config.outputDir!, `aurora-report-${this.currentRun.id}`);
      const reportPath = `${reportBase}.json`;
      await fs.writeJSON(reportPath, jsonReport, { spaces: 2 });

      this.logger.info(`Generated JSON report: ${reportPath}`);

      // Optionally generate a simple HTML report next to JSON
      const shouldGenerateHtml = (this as any).config?.html !== false; // default true for backward compat
      if (shouldGenerateHtml) {
        const html = this.buildSimpleHtmlReport(jsonReport);
        const htmlPath = `${reportBase}.html`;
        await fs.writeFile(htmlPath, html, 'utf8');
        this.logger.info(`Generated HTML report: ${htmlPath}`);
      }

    } catch (error) {
      this.logger.error('Failed to generate reports:', error);
    }
  }

  // Very small, dependency-free HTML report to satisfy basic needs
  private buildSimpleHtmlReport(data: any): string {
    const esc = (s: any) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const { run, summary, tests } = data;
    const fmtMs = (n: number) => `${Math.round(n)} ms`;
    const row = (t: any) => `
      <tr class="status-${t.status}">
        <td>${esc(t.id)}</td>
        <td>${esc(t.title)}</td>
        <td>${esc(t.file || '')}</td>
        <td>${esc(t.status)}</td>
        <td>${t.duration != null ? fmtMs(t.duration) : ''}</td>
        <td>${t.error ? esc(t.error.message || t.error) : ''}</td>
      </tr>`;

    const styles = `
      body{font-family:Segoe UI,Arial,sans-serif;margin:16px;color:#222;background:#fff}
      h1{margin:0 0 8px 0}
      .meta{color:#555;margin-bottom:16px}
      .cards{display:flex;gap:12px;margin:12px 0}
      .card{padding:10px 12px;border-radius:8px;background:#f5f7fa;border:1px solid #e3e7ef;min-width:110px}
      .card .num{font-size:20px;font-weight:700}
      .passed{background:#e6f7ed;border-color:#b7ebc6}
      .failed{background:#fdecea;border-color:#f5c2bc}
      .skipped{background:#f7f7f7;border-color:#e5e5e5}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{border:1px solid #e3e7ef;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#f8fafc}
      tr.status-passed{background:#f8fffb}
      tr.status-failed{background:#fff7f7}
      tr.status-skipped, tr.status-pending{color:#777}
      .footer{margin-top:18px;color:#666;font-size:12px}
    `;

    return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Aurora Report - ${esc(run?.id || '')}</title>
        <style>${styles}</style>
      </head>
      <body>
        <h1>Aurora Report</h1>
        <div class="meta">
          <div><b>Run ID:</b> ${esc(run?.id || '')}</div>
          <div><b>Project:</b> ${esc(run?.project || '')}</div>
          <div><b>Environment:</b> ${esc(run?.environment || '')}</div>
          <div><b>Browser:</b> ${esc(run?.browser?.name || '')} ${esc(run?.browser?.version || '')}</div>
          <div><b>Spec Files:</b> ${esc((run?.specFiles || []).join(', '))}</div>
          <div><b>Started:</b> ${esc(run?.startedAt || '')}</div>
          <div><b>Ended:</b> ${esc(run?.endedAt || '')}</div>
          <div><b>Duration:</b> ${run?.duration != null ? fmtMs(run.duration) : ''}</div>
        </div>
        <div class="cards">
          <div class="card"><div>Total</div><div class="num">${summary.total}</div></div>
          <div class="card passed"><div>Passed</div><div class="num">${summary.passed}</div></div>
          <div class="card failed"><div>Failed</div><div class="num">${summary.failed}</div></div>
          <div class="card skipped"><div>Skipped</div><div class="num">${summary.skipped}</div></div>
          <div class="card"><div>Pending</div><div class="num">${summary.pending}</div></div>
          <div class="card"><div>Pass rate</div><div class="num">${summary.passRate.toFixed(1)}%</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>File</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            ${tests.map((t:any)=>row(t)).join('')}
          </tbody>
        </table>
        <div class="footer">Generated by Aurora Reporter ${esc(data?.metadata?.version || '')} at ${esc(data?.metadata?.generatedAt || '')}</div>
      </body>
    </html>`;
  }

  /**
   * Utility methods
   */
  private mergeConfig(userConfig: AuroraReporterConfig): AuroraReporterConfig {
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
        compressImages: true
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  private getBrowserName(): string {
    return process.env.CYPRESS_BROWSER_NAME || 'unknown';
  }

  private getBrowserVersion(): string {
    return process.env.CYPRESS_BROWSER_VERSION || 'unknown';
  }

  private getCypressVersion(): string {
    try {
      // Try to get Cypress version from package.json
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      return packageJson.devDependencies?.cypress || packageJson.dependencies?.cypress || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private getSpecFiles(): string[] {
    return process.env.CYPRESS_SPEC_FILES ? process.env.CYPRESS_SPEC_FILES.split(',') : [];
  }

  private getRunConfig(): any {
    return process.env.CYPRESS_CONFIG ? JSON.parse(process.env.CYPRESS_CONFIG) : {};
  }

  private getCIInfo(): any {
    // Implementation would be similar to the plugin getCIInfo method
    return undefined;
  }

  private getTestFile(test: interfaces.Test): string {
    return test.file || 'unknown';
  }

  private extractTags(test: interfaces.Test): string[] {
    // Extract tags from test title or description
    const tags: string[] = [];
    const tagRegex = /@(\w+)/g;
    let match;

    while ((match = tagRegex.exec(test.title)) !== null) {
      tags.push(match[1]);
    }

    return tags;
  }

  private getPackageVersion(): string {
    try {
      const packageJson = require(path.join(__dirname, '../../package.json'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.databaseManager.close();
      this.logger.info('Aurora Reporter cleanup completed');
    } catch (error) {
      this.logger.error('Error during reporter cleanup:', error);
    }
  }

  /**
   * Get event emitter for external listeners
   */
  public getEvents(): ReporterEvents {
    return this.events;
  }
}

// Export as default for Mocha
export default AuroraReporter;