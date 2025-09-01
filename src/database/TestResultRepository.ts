import { TestResult, TestResultRepository, FlakyTest, TestFilter } from '../types';
import { SqliteConnection } from './SqliteConnection';
import { Logger } from '../utils/Logger';

export class TestResultRepositoryImpl implements TestResultRepository {
  private connection: SqliteConnection;
  private logger: Logger;

  constructor(connection: SqliteConnection) {
    this.connection = connection;
    this.logger = new Logger('TestResultRepository');
  }

  /**
   * Create a new test result
   */
  async create(result: Omit<TestResult, 'id'>): Promise<TestResult> {
    try {
      const testResult: TestResult = {
        ...result,
        id: this.generateId()
      };

      const sql = `
        INSERT INTO test_results (
          id, run_id, title, full_title, state, duration, error_name, error_message,
          error_stack, error_diff, screenshot_path, retries, current_retry, pending,
          file, parent, context, tags, start_time, end_time, browser_name,
          browser_version, viewport_width, viewport_height
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        testResult.id,
        testResult.runId,
        testResult.title,
        testResult.fullTitle,
        testResult.state,
        testResult.duration,
        testResult.error?.name || null,
        testResult.error?.message || null,
        testResult.error?.stack || null,
        testResult.error?.diff || null,
        testResult.screenshot || null,
        testResult.retries,
        testResult.currentRetry,
        testResult.pending,
        testResult.file,
        testResult.parent,
        testResult.context || null,
        testResult.tags ? JSON.stringify(testResult.tags) : null,
        testResult.startTime.toISOString(),
        testResult.endTime?.toISOString() || null,
        testResult.browser?.name || null,
        testResult.browser?.version || null,
        testResult.viewport?.width || null,
        testResult.viewport?.height || null
      ];

      await this.connection.run(sql, params);

      this.logger.debug(`Created test result: ${testResult.id}`);
      return testResult;

    } catch (error) {
      this.logger.error('Failed to create test result:', error);
      throw error;
    }
  }

  /**
   * Find test result by ID
   */
  async findById(id: string): Promise<TestResult | null> {
    try {
      const sql = `
        SELECT 
          id, run_id, title, full_title, state, duration, error_name, error_message,
          error_stack, error_diff, screenshot_path, retries, current_retry, pending,
          file, parent, context, tags, start_time, end_time, browser_name,
          browser_version, viewport_width, viewport_height, created_at, updated_at
        FROM test_results 
        WHERE id = ?
      `;

      const row = await this.connection.get<any>(sql, [id]);
      
      if (!row) {
        return null;
      }

      return this.mapRowToTestResult(row);

    } catch (error) {
      this.logger.error('Failed to find test result by ID:', error);
      throw error;
    }
  }

  /**
   * Find test results by run ID
   */
  async findByRunId(runId: string): Promise<TestResult[]> {
    try {
      const sql = `
        SELECT 
          id, run_id, title, full_title, state, duration, error_name, error_message,
          error_stack, error_diff, screenshot_path, retries, current_retry, pending,
          file, parent, context, tags, start_time, end_time, browser_name,
          browser_version, viewport_width, viewport_height, created_at, updated_at
        FROM test_results 
        WHERE run_id = ?
        ORDER BY start_time
      `;

      const rows = await this.connection.query<any>(sql, [runId]);
      return rows.map(row => this.mapRowToTestResult(row));

    } catch (error) {
      this.logger.error('Failed to find test results by run ID:', error);
      throw error;
    }
  }

  /**
   * Find test results with filtering
   */
  async findWithFilters(filters: TestFilter, limit?: number, offset?: number): Promise<TestResult[]> {
    try {
      let sql = `
        SELECT 
          id, run_id, title, full_title, state, duration, error_name, error_message,
          error_stack, error_diff, screenshot_path, retries, current_retry, pending,
          file, parent, context, tags, start_time, end_time, browser_name,
          browser_version, viewport_width, viewport_height, created_at, updated_at
        FROM test_results
      `;

      const conditions: string[] = [];
      const params: any[] = [];

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        conditions.push(`state IN (${filters.status.map(() => '?').join(', ')})`);
        params.push(...filters.status);
      }

      if (filters.specFiles && filters.specFiles.length > 0) {
        conditions.push(`file IN (${filters.specFiles.map(() => '?').join(', ')})`);
        params.push(...filters.specFiles);
      }

      if (filters.duration) {
        if (filters.duration.min !== undefined) {
          conditions.push('duration >= ?');
          params.push(filters.duration.min);
        }
        if (filters.duration.max !== undefined) {
          conditions.push('duration <= ?');
          params.push(filters.duration.max);
        }
      }

      if (filters.search) {
        conditions.push('(title LIKE ? OR full_title LIKE ? OR error_message LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.tags && filters.tags.length > 0) {
        const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
        conditions.push(`(${tagConditions})`);
        filters.tags.forEach(tag => params.push(`%"${tag}"%`));
      }

      if (filters.browser && filters.browser.length > 0) {
        conditions.push(`browser_name IN (${filters.browser.map(() => '?').join(', ')})`);
        params.push(...filters.browser);
      }

      if (filters.retries !== undefined && filters.retries) {
        conditions.push('retries > 0');
      }

      if (filters.hasScreenshots !== undefined) {
        if (filters.hasScreenshots) {
          conditions.push('screenshot_path IS NOT NULL');
        } else {
          conditions.push('screenshot_path IS NULL');
        }
      }

      if (filters.dateRange) {
        conditions.push('start_time >= ? AND start_time <= ?');
        params.push(filters.dateRange.start.toISOString(), filters.dateRange.end.toISOString());
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY start_time DESC';

      if (limit) {
        sql += ' LIMIT ?';
        params.push(limit);
        
        if (offset) {
          sql += ' OFFSET ?';
          params.push(offset);
        }
      }

      const rows = await this.connection.query<any>(sql, params);
      return rows.map(row => this.mapRowToTestResult(row));

    } catch (error) {
      this.logger.error('Failed to find test results with filters:', error);
      throw error;
    }
  }

  /**
   * Find flaky tests
   */
  async findFlaky(threshold: number = 0.1): Promise<FlakyTest[]> {
    try {
      const sql = `
        SELECT 
          full_title as test_title,
          file as spec_file,
          COUNT(*) as total_runs,
          SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) as failures,
          MAX(start_time) as last_failure_time,
          CAST(SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) as flaky_rate
        FROM test_results
        WHERE start_time >= DATE('now', '-30 days')
        GROUP BY full_title, file
        HAVING total_runs >= 5 AND flaky_rate >= ? AND flaky_rate < 1.0
        ORDER BY flaky_rate DESC, total_runs DESC
      `;

      const rows = await this.connection.query<any>(sql, [threshold]);

      return rows.map(row => ({
        testTitle: row.test_title,
        specFile: row.spec_file,
        flakyRate: Math.round(row.flaky_rate * 100) / 100,
        totalRuns: row.total_runs,
        failures: row.failures,
        lastFailure: new Date(row.last_failure_time)
      }));

    } catch (error) {
      this.logger.error('Failed to find flaky tests:', error);
      throw error;
    }
  }

  /**
   * Update test result
   */
  async update(id: string, updates: Partial<TestResult>): Promise<void> {
    try {
      const setClause: string[] = [];
      const params: any[] = [];

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          const columnName = this.camelToSnakeCase(key);
          
          if (key === 'startTime' || key === 'endTime') {
            setClause.push(`${columnName} = ?`);
            params.push(value instanceof Date ? value.toISOString() : value);
          } else if (key === 'error') {
            // Handle error object
            const errorObj = value as any;
            if (errorObj) {
              setClause.push('error_name = ?', 'error_message = ?', 'error_stack = ?', 'error_diff = ?');
              params.push(errorObj.name, errorObj.message, errorObj.stack, errorObj.diff);
            }
          } else if (key === 'tags') {
            setClause.push(`${columnName} = ?`);
            params.push(JSON.stringify(value));
          } else if (key === 'browser') {
            // Handle browser object
            const browserObj = value as any;
            if (browserObj) {
              setClause.push('browser_name = ?', 'browser_version = ?');
              params.push(browserObj.name, browserObj.version);
            }
          } else if (key === 'viewport') {
            // Handle viewport object
            const viewportObj = value as any;
            if (viewportObj) {
              setClause.push('viewport_width = ?', 'viewport_height = ?');
              params.push(viewportObj.width, viewportObj.height);
            }
          } else {
            setClause.push(`${columnName} = ?`);
            params.push(value);
          }
        }
      });

      if (setClause.length === 0) {
        return; // Nothing to update
      }

      const sql = `UPDATE test_results SET ${setClause.join(', ')} WHERE id = ?`;
      params.push(id);

      const result = await this.connection.run(sql, params);
      
      if (result.changes === 0) {
        throw new Error(`Test result not found: ${id}`);
      }

      this.logger.debug(`Updated test result: ${id}`);

    } catch (error) {
      this.logger.error('Failed to update test result:', error);
      throw error;
    }
  }

  /**
   * Delete test result
   */
  async delete(id: string): Promise<void> {
    try {
      const result = await this.connection.run('DELETE FROM test_results WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error(`Test result not found: ${id}`);
      }

      this.logger.debug(`Deleted test result: ${id}`);

    } catch (error) {
      this.logger.error('Failed to delete test result:', error);
      throw error;
    }
  }

  /**
   * Get test result statistics
   */
  async getStatistics(runId?: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    averageDuration: number;
    totalDuration: number;
  }> {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN state = 'passed' THEN 1 END) as passed,
          COUNT(CASE WHEN state = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN state = 'skipped' THEN 1 END) as skipped,
          COUNT(CASE WHEN state = 'pending' THEN 1 END) as pending,
          AVG(duration) as avg_duration,
          SUM(duration) as total_duration
        FROM test_results
      `;

      const params: any[] = [];

      if (runId) {
        sql += ' WHERE run_id = ?';
        params.push(runId);
      }

      const result = await this.connection.get<any>(sql, params);

      return {
        total: result.total || 0,
        passed: result.passed || 0,
        failed: result.failed || 0,
        skipped: result.skipped || 0,
        pending: result.pending || 0,
        averageDuration: Math.round(result.avg_duration || 0),
        totalDuration: result.total_duration || 0
      };

    } catch (error) {
      this.logger.error('Failed to get test result statistics:', error);
      throw error;
    }
  }

  /**
   * Search test results
   */
  async search(query: string, limit: number = 50): Promise<TestResult[]> {
    try {
      const sql = `
        SELECT 
          id, run_id, title, full_title, state, duration, error_name, error_message,
          error_stack, error_diff, screenshot_path, retries, current_retry, pending,
          file, parent, context, tags, start_time, end_time, browser_name,
          browser_version, viewport_width, viewport_height, created_at, updated_at
        FROM test_results
        WHERE title LIKE ? OR full_title LIKE ? OR error_message LIKE ? OR file LIKE ?
        ORDER BY start_time DESC
        LIMIT ?
      `;

      const searchTerm = `%${query}%`;
      const rows = await this.connection.query<any>(sql, [searchTerm, searchTerm, searchTerm, searchTerm, limit]);
      
      return rows.map(row => this.mapRowToTestResult(row));

    } catch (error) {
      this.logger.error('Failed to search test results:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private mapRowToTestResult(row: any): TestResult {
    return {
      id: row.id,
      runId: row.run_id,
      title: row.title,
      fullTitle: row.full_title,
      state: row.state,
      duration: row.duration,
      error: row.error_name ? {
        name: row.error_name,
        message: row.error_message,
        stack: row.error_stack,
        diff: row.error_diff
      } : undefined,
      screenshot: row.screenshot_path,
      retries: row.retries,
      currentRetry: row.current_retry,
      pending: row.pending,
      file: row.file,
      parent: row.parent,
      context: row.context,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      browser: row.browser_name ? {
        name: row.browser_name,
        version: row.browser_version
      } : undefined,
      viewport: row.viewport_width ? {
        width: row.viewport_width,
        height: row.viewport_height
      } : undefined
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}