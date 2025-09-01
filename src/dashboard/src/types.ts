// Dashboard types - subset of main types
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  PENDING = 'pending',
  RETRIED = 'retried'
}

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
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: TestResult[];
}

export interface TestResult {
  id: string;
  runId: string;
  title: string;
  fullTitle: string;
  state: TestStatus;
  duration: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
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
  browser?: {
    name: string;
    version: string;
  };
  viewport?: {
    width: number;
    height: number;
  };
}

export interface TestFilter {
  status?: TestStatus[];
  specFiles?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  duration?: {
    min?: number;
    max?: number;
  };
  search?: string;
  tags?: string[];
  browser?: string[];
  retries?: boolean;
  hasScreenshots?: boolean;
}

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

export interface TrendData {
  date: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  passRate: number;
}