// React component type definitions

import { ReactNode, ComponentProps } from 'react';
import { TestResult, TestRun, TestFilter, Theme, ChartData, ExportFormat, ExportOptions, TestStatus, FilterPreset } from './index';

// Dashboard Props
export interface DashboardProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  testRuns: TestRun[];
  isLoading: boolean;
  error?: string;
}

// Test List Props
export interface TestListProps {
  tests: TestResult[];
  selectedTest?: string;
  onTestSelect: (testId: string) => void;
  onScreenshotView: (screenshotPath: string) => void;
  filter: TestFilter;
  isLoading?: boolean;
}

// Filter Panel Props
export interface FilterPanelProps {
  filter: TestFilter;
  onFilterChange: (filter: TestFilter) => void;
  availableSpecs: string[];
  availableTags: string[];
  availableBrowsers: string[];
  onReset: () => void;
  onSavePreset: (name: string, description?: string) => void;
}

// Chart Props
export interface ChartProps {
  data: ChartData;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  height?: number;
  options?: any;
}

export interface TrendChartProps extends Omit<ChartProps, 'data'> {
  testRuns: TestRun[];
  timeframe: 'day' | 'week' | 'month';
}

// Export Panel Props
export interface ExportPanelProps {
  selectedRuns: string[];
  onExport: (format: ExportFormat, options: ExportOptions) => void;
  isExporting: boolean;
  availableFormats: ExportFormat[];
}

// Screenshot Viewer Props
export interface ScreenshotViewerProps {
  screenshots: Screenshot[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isOpen: boolean;
}

export interface Screenshot {
  path: string;
  name: string;
  testId: string;
  testTitle: string;
  timestamp: Date;
  size?: {
    width: number;
    height: number;
  };
}

// Search Props
export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  isLoading?: boolean;
}

// Theme Toggle Props
export interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  size?: 'sm' | 'md' | 'lg';
}

// Status Badge Props
export interface StatusBadgeProps {
  status: TestStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// Progress Bar Props
export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

// Date Range Picker Props
export interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  maxDate?: Date;
  minDate?: Date;
  placeholder?: string;
}

// Modal Props
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

// Tooltip Props
export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

// Loading Spinner Props
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

// Error Boundary Props
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentProps<'div'>;
  onError?: (error: Error, errorInfo: any) => void;
}

// Test Detail Props
export interface TestDetailProps {
  test: TestResult;
  onClose: () => void;
  onRetry?: (testId: string) => void;
  showScreenshots?: boolean;
}

// Run Summary Props
export interface RunSummaryProps {
  run: TestRun;
  showDetails?: boolean;
  onTestSelect?: (testId: string) => void;
  onExport?: (format: ExportFormat) => void;
}

// Filter Preset Props
export interface FilterPresetProps {
  presets: FilterPreset[];
  currentFilter: TestFilter;
  onPresetSelect: (preset: FilterPreset) => void;
  onPresetSave: (name: string, description?: string) => void;
  onPresetDelete: (presetId: string) => void;
}

// Real-time Status Props
export interface RealTimeStatusProps {
  isConnected: boolean;
  lastUpdate?: Date;
  onToggle: (enabled: boolean) => void;
  enabled: boolean;
}

// Navigation Props
export interface NavigationProps {
  currentView: 'dashboard' | 'tests' | 'runs' | 'settings';
  onViewChange: (view: string) => void;
  testRuns: TestRun[];
  unreadCount?: number;
}