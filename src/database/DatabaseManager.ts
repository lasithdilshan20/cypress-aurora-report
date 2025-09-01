import * as path from 'path';
import * as fs from 'fs-extra';
import { DatabaseConfig } from '../types';
import { SqliteConnection } from './SqliteConnection';
import { DatabaseSchema } from './DatabaseSchema';
import { TestRunRepositoryImpl } from './TestRunRepository';
import { TestResultRepositoryImpl } from './TestResultRepository';
import { Logger } from '../utils/Logger';

export class DatabaseManager {
  private connection: SqliteConnection;
  private schema: DatabaseSchema;
  private logger: Logger;
  private config: DatabaseConfig;
  
  public testRunRepository: TestRunRepositoryImpl;
  public testResultRepository: TestResultRepositoryImpl;

  private backupInterval?: NodeJS.Timeout;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: './aurora-reports/aurora.db',
      maxConnections: 10,
      enableWAL: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.logger = new Logger('DatabaseManager');

    // Initialize connection
    this.connection = new SqliteConnection(this.config.path!, this.config);
    this.schema = new DatabaseSchema(this.connection);

    // Initialize repositories
    this.testRunRepository = new TestRunRepositoryImpl(this.connection);
    this.testResultRepository = new TestResultRepositoryImpl(this.connection);
  }

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.path!);
      await fs.ensureDir(dbDir);

      // Connect to database
      await this.connection.connect();

      // Initialize schema
      await this.schema.initialize();

      // Setup automatic backups
      if (this.config.backupInterval && this.config.backupInterval > 0) {
        this.setupAutomaticBackups();
      }

      // Run database maintenance
      await this.runMaintenance();

      this.logger.info('Database manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize database manager:', error);
      throw error;
    }
  }

  /**
   * Setup automatic database backups
   */
  private setupAutomaticBackups(): void {
    this.backupInterval = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        this.logger.error('Automatic backup failed:', error);
      }
    }, this.config.backupInterval!);

    this.logger.info(`Automatic backups scheduled every ${this.config.backupInterval! / (60 * 60 * 1000)} hours`);
  }

  /**
   * Create database backup
   */
  async createBackup(backupPath?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultBackupPath = backupPath || path.join(
        path.dirname(this.config.path!),
        'backups',
        `aurora-backup-${timestamp}.db`
      );

      // Ensure backup directory exists
      await fs.ensureDir(path.dirname(defaultBackupPath));

      // Create backup
      await this.connection.backup(defaultBackupPath);

      this.logger.info(`Database backup created: ${defaultBackupPath}`);
      return defaultBackupPath;

    } catch (error) {
      this.logger.error('Failed to create database backup:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      // Verify backup file exists
      const backupExists = await fs.pathExists(backupPath);
      if (!backupExists) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Close current connection
      await this.close();

      // Replace current database with backup
      await fs.copy(backupPath, this.config.path!, { overwrite: true });

      // Reconnect
      await this.initialize();

      this.logger.info(`Database restored from backup: ${backupPath}`);

    } catch (error) {
      this.logger.error('Failed to restore database from backup:', error);
      throw error;
    }
  }

  /**
   * Run database maintenance
   */
  async runMaintenance(): Promise<void> {
    try {
      // Analyze database for query optimization
      await this.connection.analyze();

      // Check if vacuum is needed
      const stats = await this.connection.getStats();
      const freePageRatio = stats.freePages / stats.pageCount;

      if (freePageRatio > 0.1) { // If more than 10% free pages
        this.logger.info('Running database vacuum to reclaim space');
        await this.connection.vacuum();
      }

      this.logger.debug('Database maintenance completed');

    } catch (error) {
      this.logger.error('Database maintenance failed:', error);
      // Don't throw error for maintenance failures
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    size: number;
    pageCount: number;
    pageSize: number;
    freePages: number;
    walSize?: number;
    testRuns: number;
    testResults: number;
    screenshots: number;
  }> {
    try {
      // Get file size
      const dbStats = await fs.stat(this.config.path!);
      const connectionStats = await this.connection.getStats();

      // Get record counts
      const [testRunCount] = await this.connection.query<{ count: number }>('SELECT COUNT(*) as count FROM test_runs');
      const [testResultCount] = await this.connection.query<{ count: number }>('SELECT COUNT(*) as count FROM test_results');
      const [screenshotCount] = await this.connection.query<{ count: number }>('SELECT COUNT(*) as count FROM screenshots');

      return {
        size: dbStats.size,
        pageCount: connectionStats.pageCount,
        pageSize: connectionStats.pageSize,
        freePages: connectionStats.freePages,
        walSize: connectionStats.walSize,
        testRuns: testRunCount?.count || 0,
        testResults: testResultCount?.count || 0,
        screenshots: screenshotCount?.count || 0
      };

    } catch (error) {
      this.logger.error('Failed to get database statistics:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query (for advanced use cases)
   */
  async executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      return await this.connection.query<T>(sql, params);
    } catch (error) {
      this.logger.error('Failed to execute raw query:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL statement (for advanced use cases)
   */
  async executeStatement(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    try {
      return await this.connection.run(sql, params);
    } catch (error) {
      this.logger.error('Failed to execute raw statement:', error);
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.connection.run('BEGIN TRANSACTION');
      
      try {
        const result = await callback();
        await this.connection.run('COMMIT');
        return result;
      } catch (error) {
        await this.connection.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      this.logger.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData(retentionDays: number): Promise<{
    deletedRuns: number;
    deletedResults: number;
    deletedScreenshots: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Get counts before deletion
      const [oldRuns] = await this.connection.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM test_runs WHERE start_time < ?',
        [cutoffDate.toISOString()]
      );

      const [oldResults] = await this.connection.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM test_results WHERE start_time < ?',
        [cutoffDate.toISOString()]
      );

      const [oldScreenshots] = await this.connection.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM screenshots WHERE taken_at < ?',
        [cutoffDate.toISOString()]
      );

      // Delete old data (cascading deletes will handle related records)
      const deletedRuns = await this.testRunRepository.deleteOlderThan(cutoffDate);

      // Additional cleanup for orphaned records
      await this.connection.run('DELETE FROM screenshots WHERE taken_at < ?', [cutoffDate.toISOString()]);

      this.logger.info(`Cleaned up old data: ${deletedRuns} runs, ${oldResults.count} results, ${oldScreenshots.count} screenshots`);

      return {
        deletedRuns,
        deletedResults: oldResults?.count || 0,
        deletedScreenshots: oldScreenshots?.count || 0
      };

    } catch (error) {
      this.logger.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    isConnected: boolean;
    lastBackup?: Date;
    statistics: any;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check connection
      const isConnected = this.connection.isConnectionActive();
      if (!isConnected) {
        issues.push('Database connection is not active');
      }

      // Get statistics
      let statistics = {};
      try {
        statistics = await this.getStatistics();
      } catch (error) {
        issues.push('Unable to retrieve database statistics');
      }

      // Check for backup files
      let lastBackup: Date | undefined;
      try {
        const backupDir = path.join(path.dirname(this.config.path!), 'backups');
        const backupExists = await fs.pathExists(backupDir);
        
        if (backupExists) {
          const backupFiles = await fs.readdir(backupDir);
          if (backupFiles.length > 0) {
            // Find most recent backup
            const backupPaths = backupFiles.map(file => path.join(backupDir, file));
            const backupStats = await Promise.all(backupPaths.map(async file => ({
              file,
              mtime: (await fs.stat(file)).mtime
            })));
            
            backupStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            lastBackup = backupStats[0].mtime;
          }
        }
      } catch (error) {
        issues.push('Unable to check backup status');
      }

      return {
        isConnected,
        lastBackup,
        statistics,
        issues
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      issues.push('Health check failed');
      
      return {
        isConnected: false,
        statistics: {},
        issues
      };
    }
  }

  /**
   * Reset database (for testing purposes)
   */
  async reset(): Promise<void> {
    try {
      await this.schema.dropAllTables();
      await this.schema.initialize();
      this.logger.info('Database reset completed');
    } catch (error) {
      this.logger.error('Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      // Clear backup interval
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
        this.backupInterval = undefined;
      }

      // Close connection
      await this.connection.close();

      this.logger.info('Database manager closed');

    } catch (error) {
      this.logger.error('Failed to close database manager:', error);
      throw error;
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo() {
    return this.connection.getConnectionInfo();
  }

  /**
   * Get configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}