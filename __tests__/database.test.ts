import { DatabaseManager } from '../src/database/DatabaseManager';
import { TestRunRepositoryImpl } from '../src/database/TestRunRepository';
import { TestResultRepositoryImpl } from '../src/database/TestResultRepository';
import { SqliteConnection } from '../src/database/SqliteConnection';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('DatabaseManager', () => {
  let databaseManager: DatabaseManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database for testing
    testDbPath = path.join(__dirname, 'test.db');
    await fs.remove(testDbPath);

    databaseManager = new DatabaseManager({
      path: testDbPath,
      enableWAL: false, // Disable WAL for tests
    });

    await databaseManager.initialize();
  });

  afterEach(async () => {
    await databaseManager.close();
    await fs.remove(testDbPath);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(databaseManager).toBeDefined();
      expect(databaseManager.testRunRepository).toBeInstanceOf(TestRunRepositoryImpl);
      expect(databaseManager.testResultRepository).toBeInstanceOf(TestResultRepositoryImpl);
    });

    it('should create database file', async () => {
      expect(await fs.pathExists(testDbPath)).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should return database statistics', async () => {
      const stats = await databaseManager.getStatistics();
      
      expect(stats).toMatchObject({
        size: expect.any(Number),
        pageCount: expect.any(Number),
        pageSize: expect.any(Number),
        freePages: expect.any(Number),
        testRuns: expect.any(Number),
        testResults: expect.any(Number),
        screenshots: expect.any(Number),
      });
    });
  });

  describe('health check', () => {
    it('should perform health check', async () => {
      const health = await databaseManager.healthCheck();
      
      expect(health).toMatchObject({
        isConnected: true,
        statistics: expect.any(Object),
        issues: expect.any(Array),
      });
    });
  });

  describe('backup and restore', () => {
    it('should create backup', async () => {
      const backupPath = await databaseManager.createBackup();
      
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      // Cleanup
      await fs.remove(backupPath);
    });
  });

  describe('cleanup', () => {
    it('should cleanup old data', async () => {
      // Create some test data first
      const testRun = await databaseManager.testRunRepository.create({
        startTime: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        totalTests: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        pending: 0,
        retries: 0,
        browserName: 'chrome',
        browserVersion: '100.0.0',
        cypressVersion: '12.0.0',
        specFiles: ['test.spec.js'],
        config: {},
        status: 'completed',
        results: [],
      });

      const result = await databaseManager.cleanupOldData(30); // Keep 30 days

      expect(result.deletedRuns).toBeGreaterThanOrEqual(1);
    });
  });
});