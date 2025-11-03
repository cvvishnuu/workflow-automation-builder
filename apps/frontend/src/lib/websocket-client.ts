/**
 * WebSocket Client for real-time workflow execution updates
 * Connects to the backend WebSocket gateway and handles real-time events
 */

import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, WebSocketEvent } from '@workflow/shared-types';

export type WebSocketEventCallback = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<WebSocketEventCallback>> = new Map();
  private subscribedExecutions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    console.log(`[WebSocket] Connecting to ${backendUrl}/workflows`);

    this.socket = io(`${backendUrl}/workflows`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.subscribedExecutions.clear();
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected with ID:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Re-subscribe to executions after reconnection
      this.subscribedExecutions.forEach((executionId) => {
        this.subscribeToExecution(executionId);
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
      }
    });

    // Listen to execution events
    this.socket.on('execution:started', (message: WebSocketMessage) => {
      console.log('[WebSocket] Execution started:', message.executionId);
      this.emit(WebSocketEvent.EXECUTION_STARTED, message);
    });

    this.socket.on('execution:updated', (message: WebSocketMessage) => {
      console.log('[WebSocket] Execution updated:', message.executionId);
      this.emit(WebSocketEvent.EXECUTION_UPDATED, message);
    });

    this.socket.on('execution:completed', (message: WebSocketMessage) => {
      console.log('[WebSocket] Execution completed:', message.executionId);
      this.emit(WebSocketEvent.EXECUTION_COMPLETED, message);
    });

    this.socket.on('execution:failed', (message: WebSocketMessage) => {
      console.log('[WebSocket] Execution failed:', message.executionId);
      this.emit(WebSocketEvent.EXECUTION_FAILED, message);
    });

    this.socket.on('execution:cancelled', (message: WebSocketMessage) => {
      console.log('[WebSocket] Execution cancelled:', message.executionId);
      this.emit(WebSocketEvent.EXECUTION_FAILED, message);
    });

    this.socket.on('execution:pending_approval', (message: WebSocketMessage) => {
      console.log('[WebSocket] Execution pending approval:', message.executionId);
      this.emit(WebSocketEvent.EXECUTION_UPDATED, message);
    });

    // Listen to node events
    this.socket.on('node:started', (message: WebSocketMessage<{ nodeId: string }>) => {
      console.log('[WebSocket] Node started:', message.data?.nodeId);
      this.emit(WebSocketEvent.NODE_STARTED, message);
    });

    this.socket.on('node:completed', (message: WebSocketMessage<{ nodeId: string; result: any }>) => {
      console.log('[WebSocket] Node completed:', message.data?.nodeId);
      this.emit(WebSocketEvent.NODE_COMPLETED, message);
    });

    this.socket.on('node:failed', (message: WebSocketMessage<{ nodeId: string; error: string }>) => {
      console.log('[WebSocket] Node failed:', message.data?.nodeId);
      this.emit(WebSocketEvent.NODE_FAILED, message);
    });

    this.socket.on('node:retry', (message: WebSocketMessage<{ nodeId: string; attempt: number; maxRetries: number }>) => {
      console.log('[WebSocket] Node retry:', message.data?.nodeId,
        `(${message.data?.attempt}/${message.data?.maxRetries})`);
      this.emit(WebSocketEvent.EXECUTION_UPDATED, message);
    });
  }

  /**
   * Subscribe to execution updates
   */
  subscribeToExecution(executionId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot subscribe to execution');
      return;
    }

    console.log('[WebSocket] Subscribing to execution:', executionId);
    this.socket.emit('subscribe:execution', { executionId });
    this.subscribedExecutions.add(executionId);
  }

  /**
   * Unsubscribe from execution updates
   */
  unsubscribeFromExecution(executionId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    console.log('[WebSocket] Unsubscribing from execution:', executionId);
    this.socket.emit('unsubscribe:execution', { executionId });
    this.subscribedExecutions.delete(executionId);
  }

  /**
   * Add event listener for specific WebSocket events
   */
  on(event: WebSocketEvent | string, callback: WebSocketEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: WebSocketEvent | string, callback: WebSocketEventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event to all registered listeners
   */
  private emit(event: WebSocketEvent | string, message: WebSocketMessage): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error('[WebSocket] Error in event callback:', error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get list of subscribed execution IDs
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscribedExecutions);
  }
}

// Singleton instance
let websocketClient: WebSocketClient | null = null;

/**
 * Get the singleton WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!websocketClient) {
    websocketClient = new WebSocketClient();
  }
  return websocketClient;
}
