import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';
import { DatabaseConfig, DatabaseConnection } from '../types';
import { Logger } from '../utils/Logger';

export class SqliteConnection implements DatabaseConnection {
  private db!: sqlite3.Database;
  private logger: Logger;
  private isConnected: boolean = false;

  constructor(private dbPath: string, private config: DatabaseConfig = {}) {
    this.logger = new Logger('SqliteConnection');
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      fs.ensureDirSync(dbDir);

      // Enable verbose mode in development
      const dbMode = this.config.enableWAL ? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;
      
      this.db = new sqlite3.Database(this.dbPath, dbMode, (err) => {
        if (err) {
          this.logger.error('Failed to connect to database:', err);
          reject(err);
          return;
        }

        this.isConnected = true;
        this.logger.info(`Connected to SQLite database: ${this.dbPath}`);
        
        // Configure database
        this.configureDatabase()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * Configure database settings
   */
  private async configureDatabase(): Promise<void> {
    try {
      // Enable WAL mode for better concurrency
      if (this.config.enableWAL) {
        await this.run('PRAGMA journal_mode = WAL');
        this.logger.debug('Enabled WAL mode');
      }

      // Set synchronous mode
      await this.run('PRAGMA synchronous = NORMAL');

      // Set foreign key constraints
      await this.run('PRAGMA foreign_keys = ON');

      // Set busy timeout
      await this.run('PRAGMA busy_timeout = 10000');

      // Optimize cache size
      await this.run('PRAGMA cache_size = -64000'); // 64MB cache

      this.logger.debug('Database configuration completed');
    } catch (error) {
      this.logger.error('Failed to configure database:', error);
      throw error;
    }
  }

  /**
   * Execute a query that returns results
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          this.logger.error('Query failed:', err, { sql, params });
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Execute a statement that doesn't return results
   */
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction(statements: { sql: string; params?: any[] }[]): Promise<any[]> {
    const results: any[] = [];

    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(err);
            return;
          }

          let completed = 0;
          let hasError = false;

          const executeStatement = (stmt: { sql: string; params?: any[] }, index: number) => {
            this.db.run(stmt.sql, stmt.params || [], function(err) {
              if (err && !hasError) {
                hasError = true;
                this.db.run('ROLLBACK', () => {
                  reject(err);
                });
                return;
              }

              if (!hasError) {
                results[index] = {
                  lastID: this.lastID,
                  changes: this.changes
                };

                completed++;
                if (completed === statements.length) {
                  this.db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      reject(commitErr);
                    } else {
                      resolve(results);
                    }
                  });
                }
              }
            });
          };

          statements.forEach(executeStatement);
        });
      });
    });
  }

  /**
   * Get a single row
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          this.logger.error('Get query failed:', err, { sql, params });
          reject(err);
        } else {
          resolve(row as T || null);
        }
      });
    });
  }

  /**
   * Prepare a statement for multiple executions
   */
  async prepare(sql: string): Promise<sqlite3.Statement> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Database not connected'));
        return;
      }

      const stmt = this.db.prepare(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(stmt);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          this.logger.error('Failed to close database:', err);
          reject(err);
        } else {
          this.isConnected = false;
          this.logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }

  /**
   * Check if database is connected
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    pageCount: number;
    pageSize: number;
    freePages: number;
    walSize?: number;
  }> {
    try {
      const [pageCountResult] = await this.query<{ page_count: number }>('PRAGMA page_count');
      const [pageSizeResult] = await this.query<{ page_size: number }>('PRAGMA page_size');
      const [freePagesResult] = await this.query<{ freelist_count: number }>('PRAGMA freelist_count');

      const stats = {
        pageCount: pageCountResult?.page_count || 0,
        pageSize: pageSizeResult?.page_size || 0,
        freePages: freePagesResult?.freelist_count || 0
      };

      // Get WAL size if WAL mode is enabled
      if (this.config.enableWAL) {
        try {
          const walPath = `${this.dbPath}-wal`;
          const walStats = await fs.stat(walPath);
          (stats as any).walSize = walStats.size;
        } catch {
          // WAL file may not exist
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Vacuum database to reclaim space
   */
  async vacuum(): Promise<void> {
    try {
      await this.run('VACUUM');
      this.logger.info('Database vacuum completed');
    } catch (error) {
      this.logger.error('Failed to vacuum database:', error);
      throw error;
    }
  }

  /**
   * Analyze database to update statistics
   */
  async analyze(): Promise<void> {
    try {
      await this.run('ANALYZE');
      this.logger.debug('Database analyze completed');
    } catch (error) {
      this.logger.error('Failed to analyze database:', error);
      throw error;
    }
  }

  /**
   * Create backup of database
   */
  async backup(backupPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Database not connected'));
        return;
      }

      const backup = new sqlite3.Database(backupPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.db.backup(backup, (err, pages) => {
          backup.close((closeErr) => {
            if (err) {
              reject(err);
            } else if (closeErr) {
              reject(closeErr);
            } else {
              this.logger.info(`Database backup completed: ${pages} pages backed up to ${backupPath}`);
              resolve();
            }
          });
        });
      });
    });
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): {
    path: string;
    isConnected: boolean;
    config: DatabaseConfig;
  } {
    return {
      path: this.dbPath,
      isConnected: this.isConnected,
      config: this.config
    };
  }
}