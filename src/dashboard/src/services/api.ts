import { TestRun, TestResult, TestFilter, ApiResponse, PaginatedResponse } from '../types';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Test Runs
  async getTestRuns(params?: {
    status?: string[];
    browser?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<ApiResponse<TestRun[]>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      if (params.status?.length) searchParams.set('status', params.status.join(','));
      if (params.browser?.length) searchParams.set('browser', params.browser.join(','));
      if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
      if (params.dateTo) searchParams.set('dateTo', params.dateTo);
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.offset) searchParams.set('offset', params.offset.toString());
      if (params.search) searchParams.set('search', params.search);
    }

    const queryString = searchParams.toString();
    return this.request(`/test-runs${queryString ? `?${queryString}` : ''}`);
  }

  async getTestRun(id: string, includeResults = true): Promise<ApiResponse<TestRun>> {
    return this.request(`/test-runs/${id}?includeResults=${includeResults}`);
  }

  async deleteTestRun(id: string): Promise<ApiResponse<void>> {
    return this.request(`/test-runs/${id}`, { method: 'DELETE' });
  }

  async getTestRunStatistics(id: string): Promise<ApiResponse<any>> {
    return this.request(`/test-runs/${id}/statistics`);
  }

  async getOverviewStatistics(dateRange?: { from: string; to: string }): Promise<ApiResponse<any>> {
    const searchParams = new URLSearchParams();
    if (dateRange) {
      searchParams.set('dateFrom', dateRange.from);
      searchParams.set('dateTo', dateRange.to);
    }
    
    const queryString = searchParams.toString();
    return this.request(`/test-runs/statistics/overview${queryString ? `?${queryString}` : ''}`);
  }

  async getTrendData(days = 30): Promise<ApiResponse<any[]>> {
    return this.request(`/test-runs/statistics/trends?days=${days}`);
  }

  async searchTestRuns(query: string, limit = 50): Promise<ApiResponse<TestRun[]>> {
    return this.request('/test-runs/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  async cleanupOldTestRuns(retentionDays: number): Promise<ApiResponse<any>> {
    return this.request('/test-runs/cleanup', {
      method: 'DELETE',
      body: JSON.stringify({ retentionDays }),
    });
  }

  // Test Results
  async getTestResults(params?: {
    runId?: string;
    status?: string[];
    file?: string[];
    search?: string;
    tags?: string[];
    browser?: string[];
    hasScreenshots?: boolean;
    retries?: boolean;
    durationMin?: number;
    durationMax?: number;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<TestResult[]>> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              searchParams.set(key, value.join(','));
            }
          } else {
            searchParams.set(key, value.toString());
          }
        }
      });
    }

    const queryString = searchParams.toString();
    return this.request(`/test-results${queryString ? `?${queryString}` : ''}`);
  }

  async getTestResult(id: string): Promise<ApiResponse<TestResult>> {
    return this.request(`/test-results/${id}`);
  }

  async updateTestResult(id: string, updates: Partial<TestResult>): Promise<ApiResponse<void>> {
    return this.request(`/test-results/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTestResult(id: string): Promise<ApiResponse<void>> {
    return this.request(`/test-results/${id}`, { method: 'DELETE' });
  }

  async getFlakyTests(threshold = 0.1, limit = 50): Promise<ApiResponse<any[]>> {
    return this.request(`/test-results/flaky?threshold=${threshold}&limit=${limit}`);
  }

  async getTestResultStatistics(runId?: string): Promise<ApiResponse<any>> {
    const queryString = runId ? `?runId=${runId}` : '';
    return this.request(`/test-results/statistics${queryString}`);
  }

  async searchTestResults(query: string, limit = 100): Promise<ApiResponse<TestResult[]>> {
    return this.request('/test-results/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  async getTestResultsByFile(file: string, limit = 100, offset = 0): Promise<ApiResponse<TestResult[]>> {
    const encodedFile = encodeURIComponent(file);
    return this.request(`/test-results/by-file/${encodedFile}?limit=${limit}&offset=${offset}`);
  }

  async getUniqueValues(field: 'files' | 'browsers' | 'states', limit = 100): Promise<ApiResponse<any[]>> {
    return this.request(`/test-results/unique-values/${field}?limit=${limit}`);
  }

  // Database
  async getDatabaseStatistics(): Promise<ApiResponse<any>> {
    return this.request('/database/statistics');
  }

  async getDatabaseHealth(): Promise<ApiResponse<any>> {
    return this.request('/database/health');
  }

  async createBackup(): Promise<ApiResponse<{ backupPath: string }>> {
    return this.request('/database/backup', { method: 'POST' });
  }

  async cleanupDatabase(retentionDays: number): Promise<ApiResponse<any>> {
    return this.request('/database/cleanup', {
      method: 'POST',
      body: JSON.stringify({ retentionDays }),
    });
  }

  // Configuration
  async getConfig(): Promise<ApiResponse<any>> {
    return this.request('/config');
  }

  async updateConfig(updates: any): Promise<ApiResponse<any>> {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // System
  async getSystemInfo(): Promise<ApiResponse<any>> {
    return this.request('/system/info');
  }

  async getWebSocketInfo(): Promise<ApiResponse<any>> {
    return this.request('/websocket/info');
  }

  // Generic search
  async search(query: string, types = ['runs', 'results'], limit = 50): Promise<ApiResponse<any>> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify({ query, types, limit }),
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request('/health', { method: 'GET' });
  }
}

export const apiClient = new ApiClient();