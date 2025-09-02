// Core types for the cypress-aurora-reporter package

import { EventEmitter } from 'events';

// Test status enumeration
export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  PENDING = 'pending',
  RETRIED = 'retried'
}

// Theme types
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

// Export formats
export enum ExportFormat {
  PDF = 'pdf',
  JSON = 'json',
  HTML = 'html',
  CSV = 'csv'
}

// Configuration interfaces
export interface AuroraReporterConfig {
  enabled?: boolean;
  outputDir?: string;
  screenshotDir?: string;
  dashboardPort?: number;
  retentionDays?: number;
  realTimeUpdates?: boolean;
  theme?: Theme;
  enableDebugLogs?: boolean;
  // When true (default), an HTML report will be generated alongside JSON
  html?: boolean;
  screenshots?: ScreenshotConfig;
  database?: DatabaseConfig;
  filters?: FilterConfig;
  exports?: ExportConfig;
  notifications?: NotificationConfig;
}

export interface ScreenshotConfig {
  enabled?: boolean;
  quality?: number;
  format?: 'png' | 'jpeg';
  onFailureOnly?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  compressImages?: boolean;
}

export interface DatabaseConfig {
  path?: string;
  maxConnections?: number;
  enableWAL?: boolean;
  backupInterval?: number;
}

export interface FilterConfig {
  defaultFilters?: Partial<TestFilter>;
  presets?: FilterPreset[];
  enableUrlState?: boolean;
}

export interface ExportConfig {
  allowedFormats?: ExportFormat[];
  defaultFormat?: ExportFormat;
  includeScreenshots?: boolean;
  pdfOptions?: PDFExportOptions;
}

export interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    channel?: string;
    enabled?: boolean;
  };
  email?: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    to: string[];
    enabled?: boolean;
  };
}

// Test result interfaces
export interface TestResult {
  id: string;
  runId: string;
  title: string;
  fullTitle: string;
  state: TestStatus;
  duration: number;
  error?: TestError;
  screenshot?: string;
  retries: number;
  currentRetry: number;
  pending: boolean;
  file: string;
  parent: string;
  context?: string;
  tags?: string[];
  startTime: Date;
  endTime?: Date;
  browser?: BrowserInfo;
  viewport?: ViewportInfo;
}

export interface TestError {
  name: string;
  message: string;
  stack?: string;
  codeFrame?: CodeFrame;
  diff?: string;
}

export interface CodeFrame {
  frame: string;
  line: number;
  column: number;
}

export interface BrowserInfo {
  name: string;
  version: string;
  family?: string;
  channel?: string;
  displayName?: string;
  majorVersion?: string;
  path?: string;
  isHeadless?: boolean;
  isHeaded?: boolean;
}

export interface ViewportInfo {
  width: number;
  height: number;
}

// Test run interfaces
export interface TestRun {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  retries: number;
  browserName: string;
  browserVersion: string;
  cypressVersion: string;
  specFiles: string[];
  config: any;
  ciInfo?: CIInfo;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: TestResult[];
}

export interface CIInfo {
  branch?: string;
  commit?: string;
  buildNumber?: string;
  buildUrl?: string;
  provider?: string;
  isPR?: boolean;
  prNumber?: string;
}

// Spec file interface
export interface SpecFile {
  name: string;
  relative: string;
  absolute: string;
  duration?: number;
  tests: TestResult[];
  stats: SpecStats;
}

export interface SpecStats {
  tests: number;
  passes: number;
  failures: number;
  pending: number;
  skipped: number;
  duration: number;
  passPercent: number;
}

// Dashboard interfaces
export interface DashboardState {
  theme: Theme;
  filters: TestFilter;
  selectedRun?: string;
  selectedTest?: string;
  isLoading: boolean;
  error?: string;
  realTimeEnabled: boolean;
}

export interface TestFilter {
  status?: TestStatus[];
  specFiles?: string[];
  dateRange?: DateRange;
  duration?: DurationFilter;
  search?: string;
  tags?: string[];
  browser?: string[];
  retries?: boolean;
  hasScreenshots?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DurationFilter {
  min?: number;
  max?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: TestFilter;
  isDefault?: boolean;
}

// Chart data interfaces
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface TrendData {
  date: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  passRate: number;
}

// Export interfaces
export interface ExportOptions {
  format: ExportFormat;
  runIds?: string[];
  includeScreenshots?: boolean;
  dateRange?: DateRange;
  filters?: TestFilter;
  fileName?: string;
}

export interface PDFExportOptions {
  pageSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
  includeScreenshots?: boolean;
  compress?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  size?: number;
  format: ExportFormat;
}

// Server interfaces
export interface ServerConfig {
  port: number;
  host: string;
  cors: boolean;
  staticDir: string;
  uploadsDir: string;
}

export interface WebSocketMessage {
  type: 'test-start' | 'test-end' | 'run-start' | 'run-end' | 'error';
  payload: any;
  timestamp: Date;
}

// Plugin interfaces
export interface PluginOptions {
  config: AuroraReporterConfig;
  on: any;
}

export interface ReporterOptions {
  reporterOptions: AuroraReporterConfig;
}

// Database interfaces
export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
  close(): Promise<void>;
}

export interface TestRunRepository {
  create(run: Omit<TestRun, 'id'>): Promise<TestRun>;
  findById(id: string): Promise<TestRun | null>;
  findAll(filters?: TestFilter): Promise<TestRun[]>;
  update(id: string, updates: Partial<TestRun>): Promise<void>;
  delete(id: string): Promise<void>;
  deleteOlderThan(date: Date): Promise<number>;
}

export interface TestResultRepository {
  create(result: Omit<TestResult, 'id'>): Promise<TestResult>;
  findById(id: string): Promise<TestResult | null>;
  findByRunId(runId: string): Promise<TestResult[]>;
  findFlaky(threshold?: number): Promise<FlakyTest[]>;
  update(id: string, updates: Partial<TestResult>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface FlakyTest {
  testTitle: string;
  specFile: string;
  flakyRate: number;
  totalRuns: number;
  failures: number;
  lastFailure: Date;
}

// Utility interfaces
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface FileUtils {
  ensureDir(path: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readJSON<T>(path: string): Promise<T>;
  writeJSON(path: string, data: any): Promise<void>;
}

// Event interfaces
export interface ReporterEvents extends EventEmitter {
  on(event: 'run:start', listener: (run: TestRun) => void): this;
  on(event: 'run:end', listener: (run: TestRun) => void): this;
  on(event: 'test:start', listener: (test: TestResult) => void): this;
  on(event: 'test:end', listener: (test: TestResult) => void): this;
  on(event: 'test:fail', listener: (test: TestResult) => void): this;
  on(event: 'screenshot:taken', listener: (path: string, test: TestResult) => void): this;
  emit(event: 'run:start', run: TestRun): boolean;
  emit(event: 'run:end', run: TestRun): boolean;
  emit(event: 'test:start', test: TestResult): boolean;
  emit(event: 'test:end', test: TestResult): boolean;
  emit(event: 'test:fail', test: TestResult): boolean;
  emit(event: 'screenshot:taken', path: string, test: TestResult): boolean;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search interfaces
export interface SearchResult {
  tests: TestResult[];
  runs: TestRun[];
  totalResults: number;
  searchTime: number;
}

export interface SearchOptions {
  query: string;
  filters?: TestFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'duration';
  sortOrder?: 'asc' | 'desc';
}