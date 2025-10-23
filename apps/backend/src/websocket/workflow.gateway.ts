/**
 * Workflow WebSocket Gateway
 * Provides real-time updates for workflow executions
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles WebSocket communication
 * - Dependency Injection: Services injected through constructor
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketEvent, WebSocketMessage } from '@workflow/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/workflows',
})
export class WorkflowGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, Socket>();

  /**
   * Initialize gateway
   */
  afterInit() {
    console.log('WebSocket Gateway initialized');
  }

  /**
   * Handle client connection
   */
  handleConnection(client: Socket) {
    console.log(`WebSocket client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Subscribe to execution updates
   * Client sends: { executionId: string }
   */
  @SubscribeMessage('subscribe:execution')
  handleSubscribeToExecution(client: Socket, payload: { executionId: string }) {
    const { executionId } = payload;
    console.log(`Client ${client.id} subscribed to execution ${executionId}`);

    // Join room for this execution
    client.join(`execution:${executionId}`);

    return { success: true, message: `Subscribed to execution ${executionId}` };
  }

  /**
   * Unsubscribe from execution updates
   */
  @SubscribeMessage('unsubscribe:execution')
  handleUnsubscribeFromExecution(client: Socket, payload: { executionId: string }) {
    const { executionId } = payload;
    console.log(`Client ${client.id} unsubscribed from execution ${executionId}`);

    client.leave(`execution:${executionId}`);

    return { success: true, message: `Unsubscribed from execution ${executionId}` };
  }

  /**
   * Broadcast execution started event
   */
  emitExecutionStarted(executionId: string, data: any) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_STARTED,
      executionId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`execution:${executionId}`).emit('execution:started', message);
  }

  /**
   * Broadcast execution updated event
   */
  emitExecutionUpdated(executionId: string, data: any) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_UPDATED,
      executionId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`execution:${executionId}`).emit('execution:updated', message);
  }

  /**
   * Broadcast execution completed event
   */
  emitExecutionCompleted(executionId: string, data: any) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_COMPLETED,
      executionId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`execution:${executionId}`).emit('execution:completed', message);
  }

  /**
   * Broadcast execution failed event
   */
  emitExecutionFailed(executionId: string, data: any) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_FAILED,
      executionId,
      timestamp: new Date(),
      data,
    };

    this.server.to(`execution:${executionId}`).emit('execution:failed', message);
  }

  /**
   * Broadcast node started event
   */
  emitNodeStarted(executionId: string, nodeId: string) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.NODE_STARTED,
      executionId,
      timestamp: new Date(),
      data: { nodeId },
    };

    this.server.to(`execution:${executionId}`).emit('node:started', message);
  }

  /**
   * Broadcast node completed event
   */
  emitNodeCompleted(executionId: string, nodeId: string, output: unknown) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.NODE_COMPLETED,
      executionId,
      timestamp: new Date(),
      data: { nodeId, output },
    };

    this.server.to(`execution:${executionId}`).emit('node:completed', message);
  }

  /**
   * Broadcast node failed event
   */
  emitNodeFailed(executionId: string, nodeId: string, error: string) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.NODE_FAILED,
      executionId,
      timestamp: new Date(),
      data: { nodeId, error },
    };

    this.server.to(`execution:${executionId}`).emit('node:failed', message);
  }

  /**
   * Listen for execution.started events from EventEmitter
   */
  @OnEvent('execution.started')
  handleExecutionStartedEvent(payload: any) {
    const { executionId, userId, timestamp } = payload;
    console.log(`Execution started: ${executionId}`);
    this.emitExecutionStarted(executionId, { userId, timestamp });
  }

  /**
   * Listen for execution.completed events
   */
  @OnEvent('execution.completed')
  handleExecutionCompletedEvent(payload: any) {
    const { executionId, workflowId, userId, output, timestamp } = payload;
    console.log(`Execution completed: ${executionId}`);
    this.emitExecutionCompleted(executionId, { workflowId, userId, output, timestamp });
  }

  /**
   * Listen for execution.failed events
   */
  @OnEvent('execution.failed')
  handleExecutionFailedEvent(payload: any) {
    const { executionId, workflowId, userId, error, timestamp } = payload;
    console.log(`Execution failed: ${executionId} - ${error}`);
    this.emitExecutionFailed(executionId, { workflowId, userId, error, timestamp });
  }

  /**
   * Listen for execution.cancelled events
   */
  @OnEvent('execution.cancelled')
  handleExecutionCancelledEvent(payload: any) {
    const { executionId, workflowId, userId } = payload;
    console.log(`Execution cancelled: ${executionId}`);

    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_FAILED,
      executionId,
      timestamp: new Date(),
      data: { workflowId, userId, error: 'Execution cancelled by user' },
    };

    this.server.to(`execution:${executionId}`).emit('execution:cancelled', message);
  }

  /**
   * Listen for node.started events
   */
  @OnEvent('node.started')
  handleNodeStartedEvent(payload: any) {
    const { executionId, nodeId, nodeType, timestamp } = payload;
    console.log(`Node started: ${nodeId} (${nodeType})`);
    this.emitNodeStarted(executionId, nodeId);
  }

  /**
   * Listen for node.completed events
   */
  @OnEvent('node.completed')
  handleNodeCompletedEvent(payload: any) {
    const { executionId, nodeId, nodeType, output, timestamp } = payload;
    console.log(`Node completed: ${nodeId} (${nodeType})`);
    this.emitNodeCompleted(executionId, nodeId, output);
  }

  /**
   * Listen for node.failed events
   */
  @OnEvent('node.failed')
  handleNodeFailedEvent(payload: any) {
    const { executionId, nodeId, nodeType, error, attempts, timestamp } = payload;
    console.log(`Node failed: ${nodeId} (${nodeType}) after ${attempts} attempts - ${error}`);
    this.emitNodeFailed(executionId, nodeId, error);
  }

  /**
   * Listen for node.retry events
   */
  @OnEvent('node.retry')
  handleNodeRetryEvent(payload: any) {
    const { executionId, nodeId, nodeType, attempt, maxRetries, error, timestamp } = payload;
    console.log(`Node retry: ${nodeId} (${nodeType}) - attempt ${attempt}/${maxRetries}`);

    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_UPDATED,
      executionId,
      timestamp: new Date(),
      data: { nodeId, nodeType, attempt, maxRetries, error, status: 'retrying' },
    };

    this.server.to(`execution:${executionId}`).emit('node:retry', message);
  }

  /**
   * Broadcast execution pending approval event
   */
  emitExecutionPendingApproval(executionId: string, data: any) {
    const message: WebSocketMessage = {
      event: WebSocketEvent.EXECUTION_UPDATED,
      executionId,
      timestamp: new Date(),
      data: { ...data, status: 'pending_approval' },
    };

    this.server.to(`execution:${executionId}`).emit('execution:pending_approval', message);
  }

  /**
   * Listen for execution.pending_approval events
   */
  @OnEvent('execution.pending_approval')
  handleExecutionPendingApprovalEvent(payload: any) {
    const { executionId, workflowId, userId, approvalData, timestamp } = payload;
    console.log(`Execution pending approval: ${executionId}`);
    this.emitExecutionPendingApproval(executionId, {
      workflowId,
      userId,
      approvalData,
      timestamp
    });
  }
}
