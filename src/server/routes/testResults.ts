import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../../database';
import { TestFilter, AuroraReporterConfig, TestStatus } from '../../types';
import { Logger } from '../../utils/Logger';

export function createTestResultsRouter(databaseManager: DatabaseManager, config: AuroraReporterConfig): Router {
  const router = Router();
  const logger = new Logger('TestResultsAPI');

  /**
   * GET /api/test-results
   * Get test results with filtering and pagination
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const {
        runId,
        status,
        file,
        search,
        tags,
        browser,
        hasScreenshots,
        retries,
        durationMin,
        durationMax,
        dateFrom,
        dateTo,
        limit = 100,
        offset = 0,
        sortBy = 'startTime',
        sortOrder = 'desc'
      } = req.query;

      // Build filter
      const filter: TestFilter = {};

      if (status && typeof status === 'string') {
        filter.status = status.split(',') as TestStatus[];
      }

      if (file && typeof file === 'string') {
        filter.specFiles = file.split(',');
      }

      if (search && typeof search === 'string') {
        filter.search = search;
      }

      if (tags && typeof tags === 'string') {
        filter.tags = tags.split(',');
      }

      if (browser && typeof browser === 'string') {
        filter.browser = browser.split(',');
      }

      if (hasScreenshots !== undefined) {
        filter.hasScreenshots = hasScreenshots === 'true';
      }

      if (retries !== undefined) {
        filter.retries = retries === 'true';
      }

      if (durationMin || durationMax) {
        filter.duration = {};
        if (durationMin) filter.duration.min = parseInt(durationMin as string, 10);
        if (durationMax) filter.duration.max = parseInt(durationMax as string, 10);
      }

      if (dateFrom && dateTo) {
        filter.dateRange = {
          start: new Date(dateFrom as string),
          end: new Date(dateTo as string)
        };
      }

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      let testResults;

      if (runId) {
        // Get results for specific run
        testResults = await databaseManager.testResultRepository.findByRunId(runId as string);
        
        // Apply client-side filtering if needed
        if (Object.keys(filter).length > 0) {
          testResults = testResults.filter(result => {
            if (filter.status && !filter.status.includes(result.state)) return false;
            if (filter.search && !result.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
            if (filter.hasScreenshots !== undefined) {
              const hasScreenshot = !!result.screenshot;
              if (filter.hasScreenshots !== hasScreenshot) return false;
            }
            return true;
          });
        }
      } else {
        // Get results with database filtering
        testResults = await databaseManager.testResultRepository.findWithFilters(filter, limitNum, offsetNum);
      }

      // Apply sorting
      testResults.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'duration':
            aValue = a.duration;
            bValue = b.duration;
            break;
          case 'title':
            aValue = a.title;
            bValue = b.title;
            break;
          case 'status':
            aValue = a.state;
            bValue = b.state;
            break;
          default:
            aValue = a.startTime;
            bValue = b.startTime;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Apply pagination if not already done by database
      if (runId) {
        testResults = testResults.slice(offsetNum, offsetNum + limitNum);
      }

      res.json({
        success: true,
        data: testResults,
        pagination: {
          total: testResults.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: testResults.length === limitNum
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test results',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-results/:id
   * Get specific test result by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const testResult = await databaseManager.testResultRepository.findById(id);
      
      if (!testResult) {
        return res.status(404).json({
          success: false,
          error: 'Test result not found',
          message: `No test result found with ID: ${id}`
        });
      }

      res.json({
        success: true,
        data: testResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test result',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/test-results/:id
   * Update test result
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate that test result exists
      const existingResult = await databaseManager.testResultRepository.findById(id);
      if (!existingResult) {
        return res.status(404).json({
          success: false,
          error: 'Test result not found'
        });
      }

      await databaseManager.testResultRepository.update(id, updates);

      res.json({
        success: true,
        message: 'Test result updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to update test result:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update test result',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/test-results/:id
   * Delete test result
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await databaseManager.testResultRepository.delete(id);

      res.json({
        success: true,
        message: 'Test result deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to delete test result:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Test result not found',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete test result',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-results/flaky
   * Get flaky tests
   */
  router.get('/flaky', async (req: Request, res: Response) => {
    try {
      const { threshold = 0.1, limit = 50 } = req.query;
      const thresholdNum = parseFloat(threshold as string);

      const flakyTests = await databaseManager.testResultRepository.findFlaky(thresholdNum);

      // Apply limit
      const limitNum = parseInt(limit as string, 10);
      const limitedResults = flakyTests.slice(0, limitNum);

      res.json({
        success: true,
        data: limitedResults,
        count: limitedResults.length,
        total: flakyTests.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get flaky tests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve flaky tests',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-results/statistics
   * Get test results statistics
   */
  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const { runId } = req.query;

      const statistics = await databaseManager.testResultRepository.getStatistics(runId as string);

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test results statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test results statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/test-results/search
   * Search test results
   */
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const { query, limit = 100 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
          message: 'Query parameter is required and must be a string'
        });
      }

      const results = await databaseManager.testResultRepository.search(query, limit);

      res.json({
        success: true,
        data: results,
        count: results.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to search test results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search test results',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-results/by-file/:file
   * Get test results for specific file
   */
  router.get('/by-file/:file', async (req: Request, res: Response) => {
    try {
      const { file } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const decodedFile = decodeURIComponent(file);
      const filter: TestFilter = {
        specFiles: [decodedFile]
      };

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      const testResults = await databaseManager.testResultRepository.findWithFilters(filter, limitNum, offsetNum);

      res.json({
        success: true,
        data: testResults,
        file: decodedFile,
        count: testResults.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get test results by file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve test results by file',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/test-results/unique-values/:field
   * Get unique values for a specific field (for filters)
   */
  router.get('/unique-values/:field', async (req: Request, res: Response) => {
    try {
      const { field } = req.params;
      const { limit = 100 } = req.query;

      let sql: string;
      let column: string;

      switch (field) {
        case 'files':
          column = 'file';
          break;
        case 'browsers':
          column = 'browser_name';
          break;
        case 'states':
          column = 'state';
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid field',
            message: 'Field must be one of: files, browsers, states'
          });
      }

      sql = `
        SELECT DISTINCT ${column} as value, COUNT(*) as count
        FROM test_results 
        WHERE ${column} IS NOT NULL 
        GROUP BY ${column} 
        ORDER BY count DESC 
        LIMIT ?
      `;

      const results = await databaseManager.executeQuery(sql, [parseInt(limit as string, 10)]);

      res.json({
        success: true,
        data: results,
        field,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get unique values:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve unique values',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}