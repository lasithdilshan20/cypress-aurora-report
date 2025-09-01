import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TestRun, TestResult, TestFilter, Theme } from '../types';

interface DashboardState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Test Runs
  testRuns: TestRun[];
  selectedTestRun: TestRun | null;
  testRunsLoading: boolean;
  setTestRuns: (runs: TestRun[]) => void;
  setSelectedTestRun: (run: TestRun | null) => void;
  setTestRunsLoading: (loading: boolean) => void;
  addTestRun: (run: TestRun) => void;
  updateTestRun: (id: string, updates: Partial<TestRun>) => void;

  // Test Results
  testResults: TestResult[];
  selectedTestResult: TestResult | null;
  testResultsLoading: boolean;
  setTestResults: (results: TestResult[]) => void;
  setSelectedTestResult: (result: TestResult | null) => void;
  setTestResultsLoading: (loading: boolean) => void;
  addTestResult: (result: TestResult) => void;
  updateTestResult: (id: string, updates: Partial<TestResult>) => void;

  // Filters
  filters: TestFilter;
  setFilters: (filters: TestFilter) => void;
  updateFilters: (updates: Partial<TestFilter>) => void;
  resetFilters: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  realTimeEnabled: boolean;
  setRealTimeEnabled: (enabled: boolean) => void;

  // Statistics
  statistics: {
    totalRuns: number;
    totalTests: number;
    passRate: number;
    averageDuration: number;
  };
  setStatistics: (stats: any) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
}

const defaultFilters: TestFilter = {
  status: [],
  specFiles: [],
  tags: [],
  browser: [],
  retries: false,
  hasScreenshots: undefined,
  dateRange: undefined,
  duration: undefined,
  search: undefined,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // Theme
      theme: 'auto' as Theme,
      setTheme: (theme) => {
        set({ theme });
        localStorage.setItem('aurora-theme', theme);
      },

      // Test Runs
      testRuns: [],
      selectedTestRun: null,
      testRunsLoading: false,
      setTestRuns: (testRuns) => set({ testRuns }),
      setSelectedTestRun: (selectedTestRun) => set({ selectedTestRun }),
      setTestRunsLoading: (testRunsLoading) => set({ testRunsLoading }),
      addTestRun: (testRun) => {
        const { testRuns } = get();
        set({ testRuns: [testRun, ...testRuns] });
      },
      updateTestRun: (id, updates) => {
        const { testRuns } = get();
        set({
          testRuns: testRuns.map((run) =>
            run.id === id ? { ...run, ...updates } : run
          ),
        });
      },

      // Test Results
      testResults: [],
      selectedTestResult: null,
      testResultsLoading: false,
      setTestResults: (testResults) => set({ testResults }),
      setSelectedTestResult: (selectedTestResult) => set({ selectedTestResult }),
      setTestResultsLoading: (testResultsLoading) => set({ testResultsLoading }),
      addTestResult: (testResult) => {
        const { testResults } = get();
        set({ testResults: [testResult, ...testResults] });
      },
      updateTestResult: (id, updates) => {
        const { testResults } = get();
        set({
          testResults: testResults.map((result) =>
            result.id === id ? { ...result, ...updates } : result
          ),
        });
      },

      // Filters
      filters: defaultFilters,
      setFilters: (filters) => set({ filters }),
      updateFilters: (updates) => {
        const { filters } = get();
        set({ filters: { ...filters, ...updates } });
      },
      resetFilters: () => set({ filters: defaultFilters }),

      // Search
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      realTimeEnabled: true,
      setRealTimeEnabled: (realTimeEnabled) => set({ realTimeEnabled }),

      // Statistics
      statistics: {
        totalRuns: 0,
        totalTests: 0,
        passRate: 0,
        averageDuration: 0,
      },
      setStatistics: (statistics) => set({ statistics }),

      // Error handling
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'aurora-dashboard',
    }
  )
);

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('aurora-theme') as Theme;
if (savedTheme) {
  useDashboardStore.getState().setTheme(savedTheme);
}