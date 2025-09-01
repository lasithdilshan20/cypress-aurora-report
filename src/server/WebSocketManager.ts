import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import { DatabaseManager } from '../database';
import { Logger } from '../utils/Logger';
import { WebSocketMessage, TestRun, TestResult } from '../types';

export class WebSocketManager extends EventEmitter {
  private io: SocketIOServer;
  private databaseManager: DatabaseManager;
  private logger: Logger;
  private connectedClients: Set<string> = new Set();
  private clientInfo: Map<string, { id: string; connectTime: Date; userAgent?: string }> = new Map();

  constructor(io: SocketIOServer, databaseManager: DatabaseManager) {
    super();
    this.io = io;
    this.databaseManager = databaseManager;
    this.logger = new Logger('WebSocketManager');
  }

  /**
   * Initialize WebSocket manager
   */
  async initialize(): Promise<void> {
    this.setupEventHandlers();
    this.logger.info('WebSocket manager initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(socket: Socket): void {
    const clientId = socket.id;
    const userAgent = socket.handshake.headers['user-agent'];
    
    this.connectedClients.add(clientId);
    this.clientInfo.set(clientId, {
      id: clientId,
      connectTime: new Date(),
      userAgent
    });

    this.logger.info(`Client connected: ${clientId} (${this.connectedClients.size} total)`);

    // Send welcome message with current state
    this.sendWelcomeMessage(socket);

    // Setup client event handlers
    this.setupClientEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleClientDisconnection(clientId, reason);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      this.logger.error(`Socket error for client ${clientId}:`, error);
    });
  }

  /**
   * Setup event handlers for individual client
   */
  private setupClientEventHandlers(socket: Socket): void {
    const clientId = socket.id;

    // Subscribe to test runs
    socket.on('subscribe:test-runs', async (data) => {
      try {
        socket.join('test-runs');
        this.logger.debug(`Client ${clientId} subscribed to test runs`);
        
        // Send recent test runs
        const recentRuns = await this.databaseManager.testRunRepository.findAll();
        socket.emit('test-runs:initial', recentRuns.slice(0, 10));
      } catch (error) {
        this.logger.error('Failed to handle test runs subscription:', error);
        socket.emit('error', { message: 'Failed to subscribe to test runs' });
      }
    });

    // Subscribe to specific test run
    socket.on('subscribe:test-run', async (data: { runId: string }) => {
      try {
        const room = `test-run:${data.runId}`;
        socket.join(room);
        this.logger.debug(`Client ${clientId} subscribed to test run ${data.runId}`);

        // Send test run details
        const testRun = await this.databaseManager.testRunRepository.findById(data.runId);
        if (testRun) {
          const testResults = await this.databaseManager.testResultRepository.findByRunId(data.runId);
          socket.emit('test-run:details', { ...testRun, results: testResults });
        }
      } catch (error) {
        this.logger.error('Failed to handle test run subscription:', error);
        socket.emit('error', { message: 'Failed to subscribe to test run' });
      }
    });

    // Unsubscribe from test run
    socket.on('unsubscribe:test-run', (data: { runId: string }) => {
      const room = `test-run:${data.runId}`;
      socket.leave(room);
      this.logger.debug(`Client ${clientId} unsubscribed from test run ${data.runId}`);
    });

    // Get live statistics
    socket.on('get:statistics', async () => {
      try {
        const stats = await this.databaseManager.getStatistics();
        socket.emit('statistics:update', stats);
      } catch (error) {
        this.logger.error('Failed to get statistics:', error);
        socket.emit('error', { message: 'Failed to get statistics' });
      }
    });

    // Request test result details
    socket.on('get:test-result', async (data: { testId: string }) => {
      try {
        const testResult = await this.databaseManager.testResultRepository.findById(data.testId);
        socket.emit('test-result:details', testResult);
      } catch (error) {
        this.logger.error('Failed to get test result:', error);
        socket.emit('error', { message: 'Failed to get test result' });
      }
    });

    // Request flaky tests
    socket.on('get:flaky-tests', async (data: { threshold?: number } = {}) => {
      try {
        const flakyTests = await this.databaseManager.testResultRepository.findFlaky(data.threshold);
        socket.emit('flaky-tests:update', flakyTests);
      } catch (error) {
        this.logger.error('Failed to get flaky tests:', error);
        socket.emit('error', { message: 'Failed to get flaky tests' });
      }
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Client info update
    socket.on('client:info', (data: { name?: string; version?: string }) => {
      const clientInfo = this.clientInfo.get(clientId);
      if (clientInfo) {
        Object.assign(clientInfo, data);
      }
    });
  }

  /**
   * Send welcome message to new client
   */
  private async sendWelcomeMessage(socket: Socket): void {
    try {
      const stats = await this.databaseManager.getStatistics();
      const recentRuns = await this.databaseManager.testRunRepository.findAll();
      
      socket.emit('welcome', {
        timestamp: new Date().toISOString(),
        statistics: stats,
        recentRuns: recentRuns.slice(0, 5),
        serverInfo: {
          version: '1.0.0',
          features: ['realtime', 'screenshots', 'exports']
        }
      });
    } catch (error) {
      this.logger.error('Failed to send welcome message:', error);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(clientId: string, reason: string): void {
    this.connectedClients.delete(clientId);
    this.clientInfo.delete(clientId);
    
    this.logger.info(`Client disconnected: ${clientId} (${reason}) (${this.connectedClients.size} remaining)`);
  }

  /**
   * Emit message to all connected clients
   */
  emit(event: string, data: any): void {
    const message: WebSocketMessage = {
      type: event as any,
      payload: data,
      timestamp: new Date()
    };

    this.io.emit(event, message);
    this.logger.debug(`Broadcasted ${event} to ${this.connectedClients.size} clients`);
  }

  /**
   * Emit message to specific room
   */
  emitToRoom(room: string, event: string, data: any): void {
    const message: WebSocketMessage = {
      type: event as any,
      payload: data,
      timestamp: new Date()
    };

    this.io.to(room).emit(event, message);
    this.logger.debug(`Sent ${event} to room ${room}`);
  }

  /**
   * Emit test run started
   */
  emitTestRunStarted(testRun: TestRun): void {
    this.emit('test-run:started', testRun);
    this.emitToRoom('test-runs', 'test-runs:update', testRun);
  }

  /**
   * Emit test run completed
   */
  emitTestRunCompleted(testRun: TestRun): void {
    this.emit('test-run:completed', testRun);
    this.emitToRoom('test-runs', 'test-runs:update', testRun);
    this.emitToRoom(`test-run:${testRun.id}`, 'test-run:completed', testRun);
  }

  /**
   * Emit test started
   */
  emitTestStarted(testResult: TestResult): void {
    this.emitToRoom(`test-run:${testResult.runId}`, 'test:started', testResult);
  }

  /**
   * Emit test completed
   */
  emitTestCompleted(testResult: TestResult): void {
    this.emitToRoom(`test-run:${testResult.runId}`, 'test:completed', testResult);
    
    // Also emit to general test updates room
    this.emitToRoom('test-updates', 'test:update', testResult);
  }

  /**
   * Emit screenshot taken
   */
  emitScreenshotTaken(testResult: TestResult, screenshotPath: string): void {
    this.emitToRoom(`test-run:${testResult.runId}`, 'screenshot:taken', {
      testResult,
      screenshotPath
    });
  }

  /**
   * Emit statistics update
   */
  emitStatisticsUpdate(statistics: any): void {
    this.emit('statistics:update', statistics);
  }

  /**
   * Get number of connected clients
   */
  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  /**
   * Get client information
   */
  getClientInfo(): Array<{ id: string; connectTime: Date; userAgent?: string }> {
    return Array.from(this.clientInfo.values());
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    this.io.disconnectSockets();
    this.connectedClients.clear();
    this.clientInfo.clear();
    this.logger.info('Disconnected all clients');
  }

  /**
   * Disconnect specific client
   */
  disconnectClient(clientId: string): void {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.disconnect();
      this.logger.info(`Disconnected client: ${clientId}`);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: any): void {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Get WebSocket server statistics
   */
  getStatistics(): {
    connectedClients: number;
    totalConnections: number;
    uptime: number;
    rooms: string[];
  } {
    return {
      connectedClients: this.connectedClients.size,
      totalConnections: this.clientInfo.size,
      uptime: process.uptime(),
      rooms: Object.keys(this.io.sockets.adapter.rooms)
    };
  }

  /**
   * Cleanup WebSocket manager
   */
  async cleanup(): Promise<void> {
    this.disconnectAll();
    this.removeAllListeners();
    this.logger.info('WebSocket manager cleaned up');
  }
}