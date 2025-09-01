import { TestRun, TestFilter, TestRunRepository } from '../types';
import { SqliteConnection } from './SqliteConnection';
import { Logger } from '../utils/Logger';

export class TestRunRepositoryImpl implements TestRunRepository {
  private connection: SqliteConnection;
  private logger: Logger;

  constructor(connection: SqliteConnection) {
    this.connection = connection;
    this.logger = new Logger('TestRunRepository');
  }

  /**
   * Create a new test run
   */
  async create(run: Omit<TestRun, 'id'>): Promise<TestRun> {
    try {
      const testRun: TestRun = {
        ...run,
        id: this.generateId()
      };

      const sql = `
        INSERT INTO test_runs (
          id, start_time, end_time, duration, total_tests, passed, failed, 
          skipped, pending, retries, browser_name, browser_version, 
          cypress_version, spec_files, config, ci_info, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        testRun.id,
        testRun.startTime.toISOString(),
        testRun.endTime?.toISOString() || null,
        testRun.duration || null,
        testRun.totalTests,
        testRun.passed,
        testRun.failed,
        testRun.skipped,
        testRun.pending,
        testRun.retries,
        testRun.browserName,
        testRun.browserVersion,
        testRun.cypressVersion,
        JSON.stringify(testRun.specFiles),
        JSON.stringify(testRun.config),
        testRun.ciInfo ? JSON.stringify(testRun.ciInfo) : null,
        testRun.status
      ];

      await this.connection.run(sql, params);

      this.logger.debug(`Created test run: ${testRun.id}`);
      return testRun;

    } catch (error) {
      this.logger.error('Failed to create test run:', error);
      throw error;
    }
  }

  /**
   * Find test run by ID
   */
  async findById(id: string): Promise<TestRun | null> {
    try {
      const sql = `
        SELECT 
          id, start_time, end_time, duration, total_tests, passed, failed,
          skipped, pending, retries, browser_name, browser_version,
          cypress_version, spec_files, config, ci_info, status,
          created_at, updated_at
        FROM test_runs 
        WHERE id = ?
      `;

      const row = await this.connection.get<any>(sql, [id]);
      
      if (!row) {
        return null;
      }

      return this.mapRowToTestRun(row);

    } catch (error) {
      this.logger.error('Failed to find test run by ID:', error);
      throw error;
    }
  }

  /**
   * Find all test runs with optional filtering
   */
  async findAll(filters?: TestFilter): Promise<TestRun[]> {
    try {
      let sql = `
        SELECT 
          id, start_time, end_time, duration, total_tests, passed, failed,
          skipped, pending, retries, browser_name, browser_version,
          cypress_version, spec_files, config, ci_info, status,
          created_at, updated_at
        FROM test_runs
      `;

      const conditions: string[] = [];
      const params: any[] = [];

      // Apply filters
      if (filters) {
        if (filters.dateRange) {
          conditions.push('start_time >= ? AND start_time <= ?');
          params.push(filters.dateRange.start.toISOString(), filters.dateRange.end.toISOString());
        }

        if (filters.browser && filters.browser.length > 0) {
          conditions.push(`browser_name IN (${filters.browser.map(() => '?').join(', ')})`);
          params.push(...filters.browser);
        }

        if (filters.status && filters.status.length > 0) {
          // Map test status to run status
          const runStatuses = this.mapTestStatusToRunStatus(filters.status);
          if (runStatuses.length > 0) {
            conditions.push(`status IN (${runStatuses.map(() => '?').join(', ')})`);
            params.push(...runStatuses);
          }
        }
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY start_time DESC';

      const rows = await this.connection.query<any>(sql, params);
      return rows.map(row => this.mapRowToTestRun(row));

    } catch (error) {
      this.logger.error('Failed to find test runs:', error);
      throw error;
    }
  }

  /**
   * Update test run
   */
  async update(id: string, updates: Partial<TestRun>): Promise<void> {
    try {
      const setClause: string[] = [];
      const params: any[] = [];

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          const columnName = this.camelToSnakeCase(key);
          
          if (key === 'endTime' || key === 'startTime') {
            setClause.push(`${columnName} = ?`);
            params.push(value instanceof Date ? value.toISOString() : value);
          } else if (key === 'specFiles' || key === 'config' || key === 'ciInfo') {
            setClause.push(`${columnName} = ?`);
            params.push(JSON.stringify(value));
          } else {
            setClause.push(`${columnName} = ?`);
            params.push(value);
          }
        }
      });

      if (setClause.length === 0) {
        return; // Nothing to update
      }

      const sql = `UPDATE test_runs SET ${setClause.join(', ')} WHERE id = ?`;
      params.push(id);

      const result = await this.connection.run(sql, params);
      
      if (result.changes === 0) {
        throw new Error(`Test run not found: ${id}`);
      }

      this.logger.debug(`Updated test run: ${id}`);

    } catch (error) {
      this.logger.error('Failed to update test run:', error);
      throw error;
    }
  }

  /**
   * Delete test run
   */
  async delete(id: string): Promise<void> {
    try {
      const result = await this.connection.run('DELETE FROM test_runs WHERE id = ?', [id]);
      
      if (result.changes === 0) {
        throw new Error(`Test run not found: ${id}`);
      }

      this.logger.debug(`Deleted test run: ${id}`);

    } catch (error) {
      this.logger.error('Failed to delete test run:', error);
      throw error;
    }
  }

  /**
   * Delete test runs older than specified date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const result = await this.connection.run(
        'DELETE FROM test_runs WHERE start_time < ?',
        [date.toISOString()]
      );

      this.logger.info(`Deleted ${result.changes} old test runs`);
      return result.changes;

    } catch (error) {
      this.logger.error('Failed to delete old test runs:', error);
      throw error;
    }
  }

  /**
   * Get test run statistics
   */
  async getStatistics(dateRange?: { start: Date; end: Date }): Promise<{
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    averageDuration: number;
    passRate: number;
  }> {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_runs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_runs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
          AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_duration,
          SUM(passed) as total_passed,
          SUM(total_tests) as total_tests
        FROM test_runs
      `;

      const params: any[] = [];

      if (dateRange) {
        sql += ' WHERE start_time >= ? AND start_time <= ?';
        params.push(dateRange.start.toISOString(), dateRange.end.toISOString());
      }

      const result = await this.connection.get<any>(sql, params);

      return {
        totalRuns: result.total_runs || 0,
        completedRuns: result.completed_runs || 0,
        failedRuns: result.failed_runs || 0,
        averageDuration: Math.round(result.avg_duration || 0),
        passRate: result.total_tests > 0 ? (result.total_passed / result.total_tests) * 100 : 0
      };

    } catch (error) {
      this.logger.error('Failed to get test run statistics:', error);
      throw error;
    }
  }

  /**
   * Get trend data for charts
   */
  async getTrendData(days: number): Promise<Array<{
    date: string;
    runs: number;
    passed: number;
    failed: number;
    duration: number;
  }>> {
    try {
      const sql = `
        SELECT 
          DATE(start_time) as date,
          COUNT(*) as runs,
          SUM(passed) as passed,
          SUM(failed) as failed,
          AVG(duration) as avg_duration
        FROM test_runs
        WHERE start_time >= DATE('now', '-${days} days')
        GROUP BY DATE(start_time)
        ORDER BY date
      `;

      const rows = await this.connection.query<any>(sql);
      
      return rows.map(row => ({
        date: row.date,
        runs: row.runs || 0,
        passed: row.passed || 0,
        failed: row.failed || 0,
        duration: Math.round(row.avg_duration || 0)
      }));

    } catch (error) {
      this.logger.error('Failed to get trend data:', error);
      throw error;
    }
  }

  /**
   * Search test runs by text
   */
  async search(query: string, limit: number = 50): Promise<TestRun[]> {
    try {
      const sql = `
        SELECT 
          id, start_time, end_time, duration, total_tests, passed, failed,
          skipped, pending, retries, browser_name, browser_version,
          cypress_version, spec_files, config, ci_info, status,
          created_at, updated_at
        FROM test_runs
        WHERE browser_name LIKE ? OR spec_files LIKE ?
        ORDER BY start_time DESC
        LIMIT ?
      `;

      const searchTerm = `%${query}%`;
      const rows = await this.connection.query<any>(sql, [searchTerm, searchTerm, limit]);
      
      return rows.map(row => this.mapRowToTestRun(row));

    } catch (error) {
      this.logger.error('Failed to search test runs:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private mapRowToTestRun(row: any): TestRun {
    return {
      id: row.id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      duration: row.duration,
      totalTests: row.total_tests,
      passed: row.passed,
      failed: row.failed,
      skipped: row.skipped,
      pending: row.pending,
      retries: row.retries,
      browserName: row.browser_name,
      browserVersion: row.browser_version,
      cypressVersion: row.cypress_version,
      specFiles: row.spec_files ? JSON.parse(row.spec_files) : [],
      config: row.config ? JSON.parse(row.config) : {},
      ciInfo: row.ci_info ? JSON.parse(row.ci_info) : undefined,
      status: row.status,
      results: [] // Results are loaded separately
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private mapTestStatusToRunStatus(testStatuses: string[]): string[] {
    const runStatuses: string[] = [];
    
    if (testStatuses.includes('failed')) {
      runStatuses.push('failed');
    }
    if (testStatuses.includes('passed')) {
      runStatuses.push('completed');
    }
    
    return [...new Set(runStatuses)]; // Remove duplicates
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}