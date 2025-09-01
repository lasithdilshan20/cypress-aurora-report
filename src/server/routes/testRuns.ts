import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../../database';
import { TestFilter, AuroraReporterConfig, TestStatus } from '../../types';
import { Logger } from '../../utils/Logger';

export function createTestRunsRouter(databaseManager: DatabaseManager, config: AuroraReporterConfig): Router {
  const router = Router();
  const logger = new Logger('TestRunsAPI');

  /**
   * GET /api/test-runs
   * Get all test runs with optional filtering
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        status,
        browser,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0,
        search
      } = req.query;

      // Build filter
      const filter: TestFilter = {};
      
      if (status && typeof status === 'string') {
        filter.status = status.split(',') as TestStatus[];
      }
      
      if (browser && typeof browser === 'string') {
        filter.browser = browser.split(',');
      }
      
      if (dateFrom && dateTo) {
        filter.dateRange = {
          start: new Date(dateFrom as string),
          end: new Date(dateTo as string)
        };
      }

      if (search && typeof search === 'string') {
        filter.search = search;
      }

      const testRuns = await databaseManager.testRunRepository.findAll(filter);

      // Apply pagination
      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);
      const paginatedRuns = testRuns.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: paginatedRuns,
        pagination: {
          total: testRuns.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < testRuns.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test runs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test runs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-runs/:id
   * Get specific test run by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { includeResults = true } = req.query;

      const testRun = await databaseManager.testRunRepository.findById(id);
      
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found',
          message: `No test run found with ID: ${id}`
        });
      }

      // Include test results if requested
      if (includeResults === 'true') {
        const testResults = await databaseManager.testResultRepository.findByRunId(id);
        testRun.results = testResults;
      }

      res.json({
        success: true,
        data: testRun,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test run:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test run',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/test-runs/:id
   * Delete specific test run
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await databaseManager.testRunRepository.delete(id);

      res.json({
        success: true,
        message: 'Test run deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to delete test run:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete test run',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-runs/:id/statistics
   * Get statistics for specific test run
   */
  router.get('/:id/statistics', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verify test run exists
      const testRun = await databaseManager.testRunRepository.findById(id);
      if (!testRun) {
        return res.status(404).json({
          success: false,
          error: 'Test run not found'
        });
      }

      const statistics = await databaseManager.testResultRepository.getStatistics(id);

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test run statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test run statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-runs/statistics/overview
   * Get overall statistics across all test runs
   */
  router.get('/statistics/overview', async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.query;

      let dateRange;
      if (dateFrom && dateTo) {
        dateRange = {
          start: new Date(dateFrom as string),
          end: new Date(dateTo as string)
        };
      }

      const statistics = await databaseManager.testRunRepository.getStatistics(dateRange);

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get overview statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overview statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-runs/statistics/trends
   * Get trend data for charts
   */
  router.get('/statistics/trends', async (req: Request, res: Response) => {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string, 10);

      const trendData = await databaseManager.testRunRepository.getTrendData(daysNum);

      res.json({
        success: true,
        data: trendData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get trend data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trend data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/test-runs/search
   * Search test runs
   */
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const { query, limit = 50 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
          message: 'Query parameter is required and must be a string'
        });
      }

      const results = await databaseManager.testRunRepository.search(query, limit);

      res.json({
        success: true,
        data: results,
        count: results.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to search test runs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search test runs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/test-runs/cleanup
   * Cleanup old test runs
   */
  router.delete('/cleanup', async (req: Request, res: Response) => {
    try {
      const { retentionDays = config.retentionDays || 30 } = req.body;
      const retentionDaysNum = parseInt(retentionDays as string, 10);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDaysNum);

      const deletedCount = await databaseManager.testRunRepository.deleteOlderThan(cutoffDate);

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old test runs`,
        data: {
          deletedCount,
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: retentionDaysNum
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to cleanup test runs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup test runs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}