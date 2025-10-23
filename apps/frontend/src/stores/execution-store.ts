/**
 * Execution Store
 * Manages real-time execution state and WebSocket connections
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { WorkflowExecution } from '@workflow/shared-types';
import { executionsApi } from '@/lib/api';

interface NodeExecutionStatus {
  nodeId: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'retrying';
  output?: unknown;
  error?: string;
  attempt?: number;
  maxRetries?: number;
}

interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  nodeId?: string;
}

interface ExecutionStore {
  // Existing state
  executions: Record<string, WorkflowExecution>;
  currentExecution: WorkflowExecution | null;
  isExecuting: boolean;
  error: string | null;

  // Real-time state
  executionId: string | null;
  executionStatus: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  logs: ExecutionLog[];
  socket: Socket | null;
  isConnected: boolean;

  // Existing actions
  executeWorkflow: (workflowId: string, input?: unknown) => Promise<WorkflowExecution>;
  fetchExecution: (id: string) => Promise<void>;
  updateExecution: (execution: WorkflowExecution) => void;
  setCurrentExecution: (execution: WorkflowExecution | null) => void;
  clearError: () => void;

  // Real-time actions
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  startExecutionMonitoring: (executionId: string) => void;
  stopExecutionMonitoring: () => void;
  clearLogs: () => void;
  subscribeToExecution: (executionId: string) => void;
  unsubscribeFromExecution: () => void;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  // Initial state
  executions: {},
  currentExecution: null,
  isExecuting: false,
  error: null,

  // Real-time state
  executionId: null,
  executionStatus: 'idle',
  nodeStatuses: {},
  logs: [],
  socket: null,
  isConnected: false,

  // Execute workflow
  executeWorkflow: async (workflowId: string, input?: unknown) => {
    set({ isExecuting: true, error: null });
    try {
      const execution = await executionsApi.execute({ workflowId, input });

      set((state) => ({
        executions: { ...state.executions, [execution.id]: execution },
        currentExecution: execution,
        isExecuting: false,
      }));

      // Start monitoring this execution
      get().startExecutionMonitoring(execution.id);

      return execution;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to execute workflow',
        isExecuting: false,
      });
      throw error;
    }
  },

  // Fetch execution
  fetchExecution: async (id: string) => {
    try {
      const execution = await executionsApi.getById(id);

      set((state) => ({
        executions: { ...state.executions, [id]: execution },
        currentExecution: execution,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch execution',
      });
    }
  },

  // Update execution (for real-time updates)
  updateExecution: (execution: WorkflowExecution) => {
    set((state) => ({
      executions: { ...state.executions, [execution.id]: execution },
      currentExecution:
        state.currentExecution?.id === execution.id ? execution : state.currentExecution,
    }));
  },

  // Set current execution
  setCurrentExecution: (execution: WorkflowExecution | null) => {
    set({ currentExecution: execution });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  /**
   * Connect to WebSocket server
   */
  connectWebSocket: () => {
    const { socket: existingSocket } = get();
    if (existingSocket && existingSocket.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const socket = io(`${WEBSOCKET_URL}/workflows`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      set({ isConnected: true });

      // Resubscribe to execution if we were tracking one
      const { executionId } = get();
      if (executionId) {
        socket.emit('subscribe:execution', { executionId });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      set({ isConnected: false });
    });

    // Listen for execution events
    socket.on('execution:started', (message) => {
      console.log('Execution started:', message);
      set((state) => ({
        executionStatus: 'running',
        startedAt: new Date(message.timestamp),
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'info',
            message: 'Workflow execution started',
          },
        ],
      }));
    });

    socket.on('execution:completed', (message) => {
      console.log('Execution completed:', message);
      set((state) => ({
        executionStatus: 'completed',
        completedAt: new Date(message.timestamp),
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'success',
            message: 'Workflow execution completed successfully',
          },
        ],
      }));
    });

    socket.on('execution:failed', (message) => {
      console.log('Execution failed:', message);
      set((state) => ({
        executionStatus: 'failed',
        completedAt: new Date(message.timestamp),
        error: message.data.error,
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'error',
            message: `Workflow execution failed: ${message.data.error}`,
          },
        ],
      }));
    });

    socket.on('execution:cancelled', (message) => {
      console.log('Execution cancelled:', message);
      set((state) => ({
        executionStatus: 'cancelled',
        completedAt: new Date(message.timestamp),
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'warning',
            message: 'Workflow execution cancelled',
          },
        ],
      }));
    });

    socket.on('execution:pending_approval', (message) => {
      console.log('Execution pending approval:', message);
      set((state) => {
        const currentExecution = state.currentExecution;
        if (currentExecution && currentExecution.id === message.executionId) {
          // Auto-redirect to review page
          if (typeof window !== 'undefined') {
            console.log(`[ExecutionStore] Redirecting to review page for execution ${message.executionId}`);
            window.location.href = `/executions/${message.executionId}/review`;
          }

          return {
            currentExecution: {
              ...currentExecution,
              status: 'pending_approval' as any,
            },
            executionStatus: 'idle',
            completedAt: new Date(message.timestamp),
            logs: [
              ...state.logs,
              {
                timestamp: new Date(message.timestamp),
                level: 'warning',
                message: 'Workflow execution paused - approval required',
              },
            ],
          };
        }
        return {
          logs: [
            ...state.logs,
            {
              timestamp: new Date(message.timestamp),
              level: 'warning',
              message: 'Workflow execution paused - approval required',
            },
          ],
        };
      });
    });

    socket.on('node:started', (message) => {
      console.log('Node started:', message);
      const { nodeId } = message.data;

      set((state) => ({
        nodeStatuses: {
          ...state.nodeStatuses,
          [nodeId]: {
            nodeId,
            status: 'running',
          },
        },
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'info',
            message: `Node ${nodeId} started`,
            nodeId,
          },
        ],
      }));
    });

    socket.on('node:completed', (message) => {
      console.log('Node completed:', message);
      const { nodeId, output } = message.data;

      set((state) => ({
        nodeStatuses: {
          ...state.nodeStatuses,
          [nodeId]: {
            nodeId,
            status: 'success',
            output,
          },
        },
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'success',
            message: `Node ${nodeId} completed successfully`,
            nodeId,
          },
        ],
      }));
    });

    socket.on('node:failed', (message) => {
      console.log('Node failed:', message);
      const { nodeId, error } = message.data;

      set((state) => ({
        nodeStatuses: {
          ...state.nodeStatuses,
          [nodeId]: {
            nodeId,
            status: 'error',
            error,
          },
        },
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'error',
            message: `Node ${nodeId} failed: ${error}`,
            nodeId,
          },
        ],
      }));
    });

    socket.on('node:retry', (message) => {
      console.log('Node retry:', message);
      const { nodeId, attempt, maxRetries, error } = message.data;

      set((state) => ({
        nodeStatuses: {
          ...state.nodeStatuses,
          [nodeId]: {
            nodeId,
            status: 'retrying',
            attempt,
            maxRetries,
            error,
          },
        },
        logs: [
          ...state.logs,
          {
            timestamp: new Date(message.timestamp),
            level: 'warning',
            message: `Node ${nodeId} retrying (attempt ${attempt}/${maxRetries})`,
            nodeId,
          },
        ],
      }));
    });

    set({ socket });
  },

  /**
   * Disconnect from WebSocket server
   */
  disconnectWebSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  /**
   * Start tracking an execution
   */
  startExecutionMonitoring: (executionId: string) => {
    set({
      executionId,
      executionStatus: 'running',
      startedAt: new Date(),
      completedAt: undefined,
      error: undefined,
      nodeStatuses: {},
      logs: [],
    });

    // Connect WebSocket if not already connected
    const { socket, connectWebSocket } = get();
    if (!socket) {
      connectWebSocket();
    }

    // Subscribe to this execution
    get().subscribeToExecution(executionId);
  },

  /**
   * Stop tracking execution
   */
  stopExecutionMonitoring: () => {
    get().unsubscribeFromExecution();
    set({
      executionId: null,
      executionStatus: 'idle',
      nodeStatuses: {},
    });
  },

  /**
   * Clear execution logs
   */
  clearLogs: () => {
    set({ logs: [] });
  },

  /**
   * Subscribe to execution updates
   */
  subscribeToExecution: (executionId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('subscribe:execution', { executionId });
      console.log(`Subscribed to execution: ${executionId}`);
    } else {
      // If socket not connected, retry after a short delay
      setTimeout(() => {
        const { socket: retrySocket } = get();
        if (retrySocket && retrySocket.connected) {
          retrySocket.emit('subscribe:execution', { executionId });
          console.log(`Subscribed to execution (retry): ${executionId}`);
        }
      }, 1000);
    }
  },

  /**
   * Unsubscribe from execution updates
   */
  unsubscribeFromExecution: () => {
    const { socket, executionId } = get();
    if (socket && socket.connected && executionId) {
      socket.emit('unsubscribe:execution', { executionId });
      console.log(`Unsubscribed from execution: ${executionId}`);
    }
  },
}));
