// Cypress-specific type definitions

export interface CypressConfig {
  baseUrl?: string;
  defaultCommandTimeout?: number;
  requestTimeout?: number;
  responseTimeout?: number;
  pageLoadTimeout?: number;
  video?: boolean;
  screenshotOnRunFailure?: boolean;
  screenshotsFolder?: string;
  videosFolder?: string;
  downloadsFolder?: string;
  fixturesFolder?: string;
  supportFile?: string;
  specPattern?: string;
  excludeSpecPattern?: string;
  env?: Record<string, any>;
  reporter?: string;
  reporterOptions?: Record<string, any>;
}

export interface CypressTestResult {
  title: string;
  fullTitle: string;
  pending: boolean;
  pass: boolean;
  err: any;
  uuid: string;
  duration: number;
  isHook: boolean;
  skipped: boolean;
  file: string;
  parent: {
    title: string;
    fullTitle: string;
    pending: boolean;
    root: boolean;
    type: string;
  };
  context?: string;
  state: 'passed' | 'failed' | 'pending';
  wallClockStartedAt: string;
  wallClockDuration: number;
  body: string;
}

export interface CypressRunResult {
  status: 'finished' | 'failed';
  startedTestsAt: string;
  endedTestsAt: string;
  totalDuration: number;
  totalSuites: number;
  totalTests: number;
  totalFailed: number;
  totalPassed: number;
  totalPending: number;
  totalSkipped: number;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  cypressVersion: string;
  config: CypressConfig;
  spec: {
    name: string;
    relative: string;
    absolute: string;
  };
  tests: CypressTestResult[];
  hooks: any[];
  error?: string;
  video?: string;
  screenshots: CypressScreenshot[];
  stats: {
    suites: number;
    tests: number;
    passes: number;
    pending: number;
    skipped: number;
    failures: number;
    wallClockStartedAt: string;
    wallClockEndedAt: string;
    wallClockDuration: number;
  };
  reporterStats: {
    suites: number;
    tests: number;
    passes: number;
    pending: number;
    failures: number;
    start: string;
    end: string;
    duration: number;
  };
}

export interface CypressScreenshot {
  name: string;
  takenAt: string;
  path: string;
  height: number;
  width: number;
  size?: number;
}

export interface CypressHookResult {
  title: string;
  fullTitle: string;
  type: 'hook';
  body: string;
  hookName: 'before' | 'beforeEach' | 'afterEach' | 'after';
  hookId: string;
  pending: boolean;
  parent: {
    title: string;
    fullTitle: string;
    pending: boolean;
    root: boolean;
    type: string;
  };
  currentRetry: number;
  err?: any;
  state: 'passed' | 'failed';
  timings?: {
    lifecycle: number;
    before?: number;
    beforeEach?: number;
    afterEach?: number;
    after?: number;
  };
}

export interface CypressBeforeRunDetails {
  config: CypressConfig;
  specs: Array<{
    name: string;
    relative: string;
    absolute: string;
  }>;
  browser: {
    name: string;
    family: string;
    channel: string;
    displayName: string;
    version: string;
    path: string;
    majorVersion: string;
    isHeadless: boolean;
    isHeaded: boolean;
  };
  system?: {
    osName: string;
    osVersion: string;
  };
}

export interface CypressAfterRunDetails {
  config: CypressConfig;
  browserName: string;
  browserPath: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  cypressVersion: string;
  startedTestsAt: string;
  endedTestsAt: string;
  totalDuration: number;
  totalSuites: number;
  totalTests: number;
  totalFailed: number;
  totalPassed: number;
  totalPending: number;
  totalSkipped: number;
  runs: CypressRunResult[];
}

export interface CypressAfterSpecDetails {
  spec: {
    name: string;
    relative: string;
    absolute: string;
  };
  results: CypressRunResult;
}

// Plugin API types
export interface CypressPluginApi {
  on: (event: string, callback: (...args: any[]) => void | Promise<void>) => void;
  config: CypressConfig;
  env: Record<string, any>;
}