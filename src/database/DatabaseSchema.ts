import { SqliteConnection } from './SqliteConnection';
import { Logger } from '../utils/Logger';

export class DatabaseSchema {
  private connection: SqliteConnection;
  private logger: Logger;

  constructor(connection: SqliteConnection) {
    this.connection = connection;
    this.logger = new Logger('DatabaseSchema');
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    try {
      await this.createTables();
      await this.createIndexes();
      await this.createTriggers();
      await this.runMigrations();
      
      this.logger.info('Database schema initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Create all database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      this.createTestRunsTable(),
      this.createTestResultsTable(),
      this.createScreenshotsTable(),
      this.createFilterPresetsTable(),
      this.createMetadataTable()
    ];

    for (const tableQuery of tables) {
      await this.connection.run(tableQuery);
    }

    this.logger.debug('Database tables created');
  }

  /**
   * Create test_runs table
   */
  private createTestRunsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        total_tests INTEGER DEFAULT 0,
        passed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        skipped INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        retries INTEGER DEFAULT 0,
        browser_name TEXT,
        browser_version TEXT,
        cypress_version TEXT,
        spec_files TEXT, -- JSON array
        config TEXT, -- JSON object
        ci_info TEXT, -- JSON object
        status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  /**
   * Create test_results table
   */
  private createTestResultsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS test_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        title TEXT NOT NULL,
        full_title TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('passed', 'failed', 'skipped', 'pending', 'retried')),
        duration INTEGER DEFAULT 0,
        error_name TEXT,
        error_message TEXT,
        error_stack TEXT,
        error_diff TEXT,
        screenshot_path TEXT,
        retries INTEGER DEFAULT 0,
        current_retry INTEGER DEFAULT 0,
        pending BOOLEAN DEFAULT FALSE,
        file TEXT,
        parent TEXT,
        context TEXT,
        tags TEXT, -- JSON array
        start_time DATETIME,
        end_time DATETIME,
        browser_name TEXT,
        browser_version TEXT,
        viewport_width INTEGER,
        viewport_height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES test_runs (id) ON DELETE CASCADE
      )
    `;
  }

  /**
   * Create screenshots table
   */
  private createScreenshotsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS screenshots (
        id TEXT PRIMARY KEY,
        test_result_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        thumbnail_path TEXT,
        width INTEGER,
        height INTEGER,
        size INTEGER,
        format TEXT,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_result_id) REFERENCES test_results (id) ON DELETE CASCADE
      )
    `;
  }

  /**
   * Create filter_presets table
   */
  private createFilterPresetsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS filter_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        filters TEXT NOT NULL, -- JSON object
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  /**
   * Create metadata table for storing app-level information
   */
  private createMetadataTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    const indexes = [
      // Test runs indexes
      'CREATE INDEX IF NOT EXISTS idx_test_runs_start_time ON test_runs (start_time)',
      'CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs (status)',
      'CREATE INDEX IF NOT EXISTS idx_test_runs_browser ON test_runs (browser_name)',
      
      // Test results indexes
      'CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_state ON test_results (state)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_duration ON test_results (duration)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_file ON test_results (file)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_start_time ON test_results (start_time)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_full_title ON test_results (full_title)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_retries ON test_results (retries)',
      
      // Screenshots indexes
      'CREATE INDEX IF NOT EXISTS idx_screenshots_test_result_id ON screenshots (test_result_id)',
      'CREATE INDEX IF NOT EXISTS idx_screenshots_taken_at ON screenshots (taken_at)',
      
      // Filter presets indexes
      'CREATE INDEX IF NOT EXISTS idx_filter_presets_name ON filter_presets (name)',
      'CREATE INDEX IF NOT EXISTS idx_filter_presets_is_default ON filter_presets (is_default)',
      
      // Composite indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_test_results_run_state ON test_results (run_id, state)',
      'CREATE INDEX IF NOT EXISTS idx_test_results_state_duration ON test_results (state, duration)',
      'CREATE INDEX IF NOT EXISTS idx_test_runs_status_start_time ON test_runs (status, start_time)'
    ];

    for (const indexQuery of indexes) {
      await this.connection.run(indexQuery);
    }

    this.logger.debug('Database indexes created');
  }

  /**
   * Create database triggers
   */
  private async createTriggers(): Promise<void> {
    const triggers = [
      // Update updated_at timestamp on test_runs
      `CREATE TRIGGER IF NOT EXISTS trg_test_runs_updated_at
       AFTER UPDATE ON test_runs
       BEGIN
         UPDATE test_runs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,

      // Update updated_at timestamp on test_results
      `CREATE TRIGGER IF NOT EXISTS trg_test_results_updated_at
       AFTER UPDATE ON test_results
       BEGIN
         UPDATE test_results SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,

      // Update updated_at timestamp on filter_presets
      `CREATE TRIGGER IF NOT EXISTS trg_filter_presets_updated_at
       AFTER UPDATE ON filter_presets
       BEGIN
         UPDATE filter_presets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
       END`,

      // Update updated_at timestamp on metadata
      `CREATE TRIGGER IF NOT EXISTS trg_metadata_updated_at
       AFTER UPDATE ON metadata
       BEGIN
         UPDATE metadata SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
       END`,

      // Ensure only one default filter preset
      `CREATE TRIGGER IF NOT EXISTS trg_filter_presets_single_default
       AFTER UPDATE OF is_default ON filter_presets
       WHEN NEW.is_default = TRUE
       BEGIN
         UPDATE filter_presets SET is_default = FALSE WHERE id != NEW.id AND is_default = TRUE;
       END`,

      // Auto-delete related screenshots when test result is deleted
      `CREATE TRIGGER IF NOT EXISTS trg_test_results_delete_screenshots
       AFTER DELETE ON test_results
       BEGIN
         DELETE FROM screenshots WHERE test_result_id = OLD.id;
       END`
    ];

    for (const triggerQuery of triggers) {
      await this.connection.run(triggerQuery);
    }

    this.logger.debug('Database triggers created');
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      // Check current schema version
      const currentVersion = await this.getCurrentSchemaVersion();
      const targetVersion = this.getTargetSchemaVersion();

      if (currentVersion < targetVersion) {
        this.logger.info(`Running migrations from version ${currentVersion} to ${targetVersion}`);
        
        for (let version = currentVersion + 1; version <= targetVersion; version++) {
          await this.runMigration(version);
          await this.setSchemaVersion(version);
        }

        this.logger.info('Database migrations completed');
      } else {
        this.logger.debug('Database schema is up to date');
      }
    } catch (error) {
      this.logger.error('Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Get current schema version
   */
  private async getCurrentSchemaVersion(): Promise<number> {
    try {
      const result = await this.connection.get<{ value: string }>(
        'SELECT value FROM metadata WHERE key = ?',
        ['schema_version']
      );
      return result ? parseInt(result.value, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Set schema version
   */
  private async setSchemaVersion(version: number): Promise<void> {
    await this.connection.run(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
      ['schema_version', version.toString()]
    );
  }

  /**
   * Get target schema version
   */
  private getTargetSchemaVersion(): number {
    return 1; // Current schema version
  }

  /**
   * Run specific migration
   */
  private async runMigration(version: number): Promise<void> {
    this.logger.info(`Running migration for version ${version}`);

    switch (version) {
      case 1:
        // Initial schema - already created in createTables
        break;
      
      // Future migrations would go here
      // case 2:
      //   await this.runMigrationV2();
      //   break;

      default:
        throw new Error(`Unknown migration version: ${version}`);
    }
  }

  /**
   * Drop all tables (for testing/reset purposes)
   */
  async dropAllTables(): Promise<void> {
    const tables = ['screenshots', 'test_results', 'test_runs', 'filter_presets', 'metadata'];
    
    for (const table of tables) {
      await this.connection.run(`DROP TABLE IF EXISTS ${table}`);
    }

    this.logger.info('All tables dropped');
  }

  /**
   * Get schema information
   */
  async getSchemaInfo(): Promise<{
    version: number;
    tables: string[];
    indexes: string[];
  }> {
    const version = await this.getCurrentSchemaVersion();
    
    const tables = await this.connection.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    const indexes = await this.connection.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    );

    return {
      version,
      tables: tables.map(t => t.name),
      indexes: indexes.map(i => i.name)
    };
  }
}