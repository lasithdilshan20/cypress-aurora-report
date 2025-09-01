import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as path from 'path';
import cors from 'cors';
import { AuroraReporterConfig } from '../types';
import { DatabaseManager } from '../database';
import { Logger } from '../utils/Logger';
import { setupRoutes } from './routes';
import { WebSocketManager } from './WebSocketManager';

export class AuroraServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private databaseManager: DatabaseManager;
  private webSocketManager: WebSocketManager;
  private logger: Logger;
  private config: AuroraReporterConfig;
  private isRunning: boolean = false;

  constructor(config: AuroraReporterConfig) {
    this.config = config;
    this.logger = new Logger('AuroraServer');
    
    // Initialize Express app
    this.app = express();
    
    // Initialize database
    this.databaseManager = new DatabaseManager(this.config.database);
    
    // Create HTTP server
    this.server = createHttpServer(this.app);
    
    // Initialize Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize WebSocket manager
    this.webSocketManager = new WebSocketManager(this.io, this.databaseManager);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS
    this.app.use(cors({
      origin: "*",
      credentials: true
    }));

    // Parse JSON bodies
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Serve static files
    const dashboardPath = path.join(__dirname, '../dashboard/dist');
    this.app.use(express.static(dashboardPath));

    // Serve screenshots
    if (this.config.screenshotDir) {
      this.app.use('/screenshots', express.static(this.config.screenshotDir));
    }

    // Serve reports
    if (this.config.outputDir) {
      this.app.use('/reports', express.static(this.config.outputDir));
    }

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.debug(`${req.method} ${req.path}`);
      next();
    });

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Express error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
      });
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // API routes
    setupRoutes(this.app, this.databaseManager, this.config);

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.databaseManager.healthCheck();
        res.json({
          success: true,
          data: {
            server: 'running',
            database: health,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Health check failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // WebSocket info endpoint
    this.app.get('/api/websocket/info', (req, res) => {
      res.json({
        success: true,
        data: {
          connected: this.webSocketManager.getConnectedClients(),
          realTimeEnabled: this.config.realTimeUpdates
        }
      });
    });

    // Serve dashboard for all other routes (SPA fallback)
    this.app.get('*', (req, res) => {
      const dashboardPath = path.join(__dirname, '../dashboard/dist/index.html');
      res.sendFile(dashboardPath, (err) => {
        if (err) {
          res.status(404).json({
            success: false,
            error: 'Dashboard not found',
            message: 'The dashboard files are not available. Please build the dashboard first.'
          });
        }
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize database
      await this.databaseManager.initialize();

      // Start WebSocket manager
      await this.webSocketManager.initialize();

      // Start HTTP server
      const port = this.config.dashboardPort || 4200;
      
      return new Promise((resolve, reject) => {
        this.server.listen(port, '0.0.0.0', (err: any) => {
          if (err) {
            reject(err);
            return;
          }

          this.isRunning = true;
          this.logger.info(`Aurora Reporter dashboard started on port ${port}`);
          this.logger.info(`Dashboard: http://localhost:${port}`);
          this.logger.info(`WebSocket: ws://localhost:${port}`);
          resolve();
        });
      });

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        return;
      }

      // Stop WebSocket manager
      await this.webSocketManager.cleanup();

      // Close database connections
      await this.databaseManager.close();

      // Stop HTTP server
      return new Promise((resolve) => {
        this.server.close(() => {
          this.isRunning = false;
          this.logger.info('Aurora Reporter server stopped');
          resolve();
        });
      });

    } catch (error) {
      this.logger.error('Failed to stop server:', error);
      throw error;
    }
  }

  /**
   * Get server info
   */
  getInfo(): {
    isRunning: boolean;
    port: number;
    connectedClients: number;
    config: AuroraReporterConfig;
  } {
    return {
      isRunning: this.isRunning,
      port: this.config.dashboardPort || 4200,
      connectedClients: this.webSocketManager.getConnectedClients(),
      config: this.config
    };
  }

  /**
   * Get Express app (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get Socket.IO server (for testing)
   */
  getSocketServer(): SocketIOServer {
    return this.io;
  }

  /**
   * Get database manager
   */
  getDatabaseManager(): DatabaseManager {
    return this.databaseManager;
  }

  /**
   * Emit real-time update
   */
  emitUpdate(event: string, data: any): void {
    if (this.config.realTimeUpdates) {
      this.webSocketManager.emit(event, data);
    }
  }
}

/**
 * Start dashboard server
 */
export async function startDashboard(config: AuroraReporterConfig = {}): Promise<AuroraServer> {
  const server = new AuroraServer(config);
  await server.start();
  return server;
}

/**
 * Create server instance without starting
 */
export function createServer(config: AuroraReporterConfig = {}): AuroraServer {
  return new AuroraServer(config);
}