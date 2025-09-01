import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useDashboardStore } from '../store';
import { TestRun, TestResult } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnectAttempts: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const {
    realTimeEnabled,
    addTestRun,
    updateTestRun,
    addTestResult,
    updateTestResult,
    setStatistics,
    setError,
  } = useDashboardStore();

  useEffect(() => {
    if (!realTimeEnabled) {
      return;
    }

    // Create socket connection
    const newSocket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setReconnectAttempts(0);
      setError(null);
      toast.success('Connected to real-time updates');

      // Subscribe to test runs
      newSocket.emit('subscribe:test-runs');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.warn('Disconnected from server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, reconnect manually
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      setReconnectAttempts(prev => prev + 1);
      
      if (reconnectAttempts > 3) {
        setError('Unable to connect to real-time updates');
        toast.error('Real-time connection failed');
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      setReconnectAttempts(0);
      setError(null);
      toast.success('Reconnected to real-time updates');
    });

    newSocket.on('reconnect_error', () => {
      setReconnectAttempts(prev => prev + 1);
    });

    // Welcome message
    newSocket.on('welcome', (data) => {
      console.log('Welcome message received:', data);
      
      if (data.statistics) {
        setStatistics(data.statistics);
      }
    });

    // Test run events
    newSocket.on('test-run:started', (message) => {
      const testRun: TestRun = message.payload;
      addTestRun(testRun);
      toast.success(`Test run started: ${testRun.browserName}`);
    });

    newSocket.on('test-run:completed', (message) => {
      const testRun: TestRun = message.payload;
      updateTestRun(testRun.id, testRun);
      
      const statusText = testRun.failed > 0 ? 'failed' : 'completed';
      const statusIcon = testRun.failed > 0 ? '❌' : '✅';
      toast.success(`Test run ${statusText} ${statusIcon}`, {
        duration: 5000,
      });
    });

    newSocket.on('test-runs:update', (message) => {
      const testRun: TestRun = message.payload;
      updateTestRun(testRun.id, testRun);
    });

    // Test result events
    newSocket.on('test:started', (message) => {
      const testResult: TestResult = message.payload;
      addTestResult(testResult);
    });

    newSocket.on('test:completed', (message) => {
      const testResult: TestResult = message.payload;
      updateTestResult(testResult.id, testResult);
      
      if (testResult.state === 'failed') {
        toast.error(`Test failed: ${testResult.title}`, {
          duration: 3000,
        });
      }
    });

    newSocket.on('test:update', (message) => {
      const testResult: TestResult = message.payload;
      updateTestResult(testResult.id, testResult);
    });

    // Screenshot events
    newSocket.on('screenshot:taken', (message) => {
      const { testResult, screenshotPath } = message.payload;
      updateTestResult(testResult.id, { screenshot: screenshotPath });
      toast.success('Screenshot captured', {
        duration: 2000,
      });
    });

    // Statistics updates
    newSocket.on('statistics:update', (message) => {
      const statistics = message.payload;
      setStatistics(statistics);
    });

    // Error handling
    newSocket.on('error', (message) => {
      console.error('Socket error:', message);
      setError(message.message || 'Socket error occurred');
      toast.error(message.message || 'An error occurred');
    });

    // Ping/Pong for connection health
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);

    newSocket.on('pong', (data) => {
      // Connection is healthy
      setError(null);
    });

    // Cleanup on unmount
    return () => {
      clearInterval(pingInterval);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [realTimeEnabled, reconnectAttempts, addTestRun, updateTestRun, addTestResult, updateTestResult, setStatistics, setError]);

  // Disable real-time updates
  useEffect(() => {
    if (!realTimeEnabled && socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      toast.success('Real-time updates disabled');
    }
  }, [realTimeEnabled, socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        reconnectAttempts,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};