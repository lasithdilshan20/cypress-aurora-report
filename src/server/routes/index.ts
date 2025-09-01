import { Application } from 'express';
import { DatabaseManager } from '../database';
import { AuroraReporterConfig } from '../types';
import { createTestRunsRouter } from './testRuns';
import { createTestResultsRouter } from './testResults';

/**
 * Setup all API routes
 */
export function setupRoutes(app: Application, databaseManager: DatabaseManager, config: AuroraReporterConfig): void {
  // Test runs routes
  app.use('/api/test-runs', createTestRunsRouter(databaseManager, config));
  
  // Test results routes
  app.use('/api/test-results', createTestResultsRouter(databaseManager, config));

  // Additional utility routes
  setupUtilityRoutes(app, databaseManager, config);
}

/**
 * Setup utility routes
 */
function setupUtilityRoutes(app: Application, databaseManager: DatabaseManager, config: AuroraReporterConfig): void {
  
  // Database statistics
  app.get('/api/database/statistics', async (req, res) => {
    try {
      const statistics = await databaseManager.getStatistics();
      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get database statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Database health check
  app.get('/api/database/health', async (req, res) => {
    try {
      const health = await databaseManager.healthCheck();
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create database backup
  app.post('/api/database/backup', async (req, res) => {
    try {
      const backupPath = await databaseManager.createBackup();
      res.json({
        success: true,
        data: { backupPath },
        message: 'Backup created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create backup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Cleanup old data
  app.post('/api/database/cleanup', async (req, res) => {
    try {
      const { retentionDays = config.retentionDays || 30 } = req.body;
      const result = await databaseManager.cleanupOldData(retentionDays);
      
      res.json({
        success: true,
        data: result,
        message: 'Cleanup completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get configuration
  app.get('/api/config', (req, res) => {
    // Only return safe config values (no sensitive data)
    const safeConfig = {
      dashboardPort: config.dashboardPort,
      realTimeUpdates: config.realTimeUpdates,
      theme: config.theme,
      retentionDays: config.retentionDays,
      screenshots: {
        enabled: config.screenshots?.enabled,
        format: config.screenshots?.format
      }
    };

    res.json({
      success: true,
      data: safeConfig,
      timestamp: new Date().toISOString()
    });
  });

  // Update configuration (limited to safe values)
  app.put('/api/config', async (req, res) => {
    try {
      const { theme, realTimeUpdates } = req.body;
      
      // Only allow updating safe configuration values
      const updates: Partial<AuroraReporterConfig> = {};
      
      if (theme) updates.theme = theme;
      if (realTimeUpdates !== undefined) updates.realTimeUpdates = realTimeUpdates;

      // Merge with existing config
      Object.assign(config, updates);

      res.json({
        success: true,
        data: updates,
        message: 'Configuration updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get system information
  app.get('/api/system/info', (req, res) => {
    res.json({
      success: true,
      data: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        version: '1.0.0' // Package version
      },
      timestamp: new Date().toISOString()
    });
  });

  // Generic search endpoint
  app.post('/api/search', async (req, res) => {
    try {
      const { query, types = ['runs', 'results'], limit = 50 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid search query'
        });
      }

      const results: any = {};

      if (types.includes('runs')) {
        results.testRuns = await databaseManager.testRunRepository.search(query, limit);
      }

      if (types.includes('results')) {
        results.testResults = await databaseManager.testResultRepository.search(query, limit);
      }

      res.json({
        success: true,
        data: results,
        query,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}