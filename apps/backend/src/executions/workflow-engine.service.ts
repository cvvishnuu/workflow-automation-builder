/**
 * Workflow Engine Service
 * Orchestrates workflow execution
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles workflow execution orchestration
 * - Dependency Injection: Receives dependencies through constructor
 * - Strategy Pattern: Uses ExecutorFactory to get appropriate executors
 */

import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutorFactory } from '../nodes/executors/executor.factory';
import { ExecutionContext } from '../nodes/executors/node-executor.interface';
import {
  WorkflowDefinition,
  NodeConfig,
  ExecutionStatus,
  WorkflowExecution,
} from '@workflow/shared-types';

@Injectable()
export class WorkflowEngineService {
  private runningExecutions = new Map<string, boolean>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly executorFactory: ExecutorFactory,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Event listener for execution.start
   * Triggered when Public API creates a new execution
   */
  @OnEvent('execution.start')
  async handleExecutionStart(payload: {
    executionId: string;
    workflowId: string;
    userId: string;
    input?: unknown;
  }) {
    console.log(`[Workflow Engine] Received execution.start event for execution ${payload.executionId}`);

    try {
      // Load the execution from database
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: payload.executionId },
      });

      if (!execution) {
        console.error(`[Workflow Engine] Execution ${payload.executionId} not found`);
        return;
      }

      if (execution.status !== 'pending') {
        console.log(`[Workflow Engine] Execution ${payload.executionId} is not pending (status: ${execution.status}), skipping`);
        return;
      }

      // Update status to running
      await this.prisma.workflowExecution.update({
        where: { id: payload.executionId },
        data: { status: ExecutionStatus.RUNNING },
      });

      // Get workflow definition from snapshot
      const definition = execution.workflowSnapshot as any as WorkflowDefinition;

      // Start workflow execution asynchronously
      this.runWorkflow(
        payload.executionId,
        definition,
        payload.userId,
        payload.input
      ).catch((error) => {
        console.error(`[Workflow Engine] Workflow execution ${payload.executionId} failed:`, error);
      });

      console.log(`[Workflow Engine] Started workflow execution ${payload.executionId}`);
    } catch (error) {
      console.error(`[Workflow Engine] Error handling execution.start for ${payload.executionId}:`, error);
    }
  }

  /**
   * Execute a workflow
   * @param workflowId - ID of the workflow to execute
   * @param userId - ID of the user executing the workflow
   * @param input - Initial input data
   * @returns Execution result
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    input?: unknown
  ): Promise<WorkflowExecution> {
    // Fetch workflow
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        userId,
        status: ExecutionStatus.RUNNING,
        input: input as any,
        workflowSnapshot: workflow.definition as any,
      },
    });

    // Execute workflow asynchronously
    this.runWorkflow(execution.id, workflow.definition as any, userId, input).catch((error) => {
      console.error('Workflow execution failed:', error);
    });

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status as ExecutionStatus,
      startedAt: execution.startedAt,
      input: execution.input,
      nodeExecutions: [],
    };
  }

  /**
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string, userId: string): Promise<void> {
    // Check if execution exists and belongs to user
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.userId !== userId) {
      throw new Error('Access forbidden');
    }

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new Error('Execution is not running');
    }

    // Mark for cancellation
    this.runningExecutions.set(executionId, false);

    // Update database
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.FAILED,
        error: 'Execution cancelled by user',
        completedAt: new Date(),
      },
    });

    // Emit cancellation event
    this.eventEmitter.emit('execution.cancelled', {
      executionId,
      workflowId: execution.workflowId,
      userId,
    });
  }

  /**
   * Run workflow execution
   * Processes nodes with parallel execution support
   * @private
   */
  private async runWorkflow(
    executionId: string,
    definition: WorkflowDefinition,
    userId: string,
    input?: unknown
  ): Promise<void> {
    // Mark execution as running
    this.runningExecutions.set(executionId, true);

    // Emit execution started event
    this.eventEmitter.emit('execution.started', {
      executionId,
      userId,
      timestamp: new Date(),
    });

    try {
      const { nodes, edges } = definition;

      // Find trigger node (starting point)
      const triggerNode = nodes.find((n) => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('Workflow must have a trigger node');
      }

      // Get workflow from execution
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: executionId },
      });

      // Create execution context
      const context: ExecutionContext = {
        executionId,
        workflowId: execution?.workflowId || '',
        userId,
        variables: definition.variables || {},
        previousNodeOutput: input,
        input: input,
      };

      // Build adjacency list and reverse adjacency list for graph traversal
      const adjacencyList = new Map<string, string[]>();
      const reverseAdjacencyList = new Map<string, string[]>();
      const nodeOutputs = new Map<string, any>();

      edges.forEach((edge) => {
        if (!adjacencyList.has(edge.source)) {
          adjacencyList.set(edge.source, []);
        }
        adjacencyList.get(edge.source)!.push(edge.target);

        if (!reverseAdjacencyList.has(edge.target)) {
          reverseAdjacencyList.set(edge.target, []);
        }
        reverseAdjacencyList.get(edge.target)!.push(edge.source);
      });

      // Execute nodes with parallel support
      const executedNodes = new Set<string>();
      const processingQueue: string[] = [triggerNode.nodeId];
      nodeOutputs.set(triggerNode.nodeId, input);

      while (processingQueue.length > 0) {
        // Check if execution was cancelled
        if (!this.runningExecutions.get(executionId)) {
          throw new Error('Execution cancelled');
        }

        // Get all nodes ready to execute (all dependencies satisfied)
        const readyNodes = processingQueue.filter((nodeId) => {
          const dependencies = reverseAdjacencyList.get(nodeId) || [];
          return dependencies.every((dep) => executedNodes.has(dep));
        });

        if (readyNodes.length === 0) {
          break;
        }

        // Remove ready nodes from queue
        readyNodes.forEach((nodeId) => {
          const index = processingQueue.indexOf(nodeId);
          if (index > -1) {
            processingQueue.splice(index, 1);
          }
        });

        // Execute ready nodes in parallel
        const nodeResults = await Promise.all(
          readyNodes.map(async (nodeId) => {
            const node = nodes.find((n) => n.nodeId === nodeId);
            if (!node) {
              throw new Error(`Node ${nodeId} not found`);
            }

            // Get input from previous node(s)
            const dependencies = reverseAdjacencyList.get(nodeId) || [];
            const previousOutput = dependencies.length > 0
              ? nodeOutputs.get(dependencies[0])
              : nodeOutputs.get(triggerNode.nodeId);

            // Update context
            const nodeContext = {
              ...context,
              previousNodeOutput: previousOutput,
              input: previousOutput,
            };

            // Execute node with retry logic
            const result = await this.executeNodeWithRetry(executionId, node, nodeContext);

            return { nodeId, result };
          })
        );

        // Process results
        for (const { nodeId, result } of nodeResults) {
          if (!result.success) {
            // Node failed after retries
            await this.prisma.workflowExecution.update({
              where: { id: executionId },
              data: {
                status: ExecutionStatus.FAILED,
                error: result.error,
                completedAt: new Date(),
              },
            });

            // Emit failure event
            this.eventEmitter.emit('execution.failed', {
              executionId,
              workflowId: context.workflowId,
              userId,
              error: result.error,
              timestamp: new Date(),
            });

            // Clean up
            this.runningExecutions.delete(executionId);
            return;
          }

          // Check if node requires approval (manual approval node)
          if (result.requiresApproval) {
            // Pause workflow execution and wait for approval
            await this.prisma.workflowExecution.update({
              where: { id: executionId },
              data: {
                status: 'pending_approval' as any,
                approvalData: result.output as any,
                approvalStatus: 'pending_approval',
                output: result.output as any,
              },
            });

            // Emit pending approval event
            this.eventEmitter.emit('execution.pending_approval', {
              executionId,
              workflowId: context.workflowId,
              userId,
              approvalData: result.output,
              timestamp: new Date(),
            });

            console.log(`[Workflow Engine] Execution ${executionId} paused for approval at node ${nodeId}`);

            // Clean up and exit - workflow will resume when approved
            this.runningExecutions.delete(executionId);
            return;
          }

          // Mark node as executed
          executedNodes.add(nodeId);
          nodeOutputs.set(nodeId, result.output);

          // Add child nodes to queue
          const childNodes = adjacencyList.get(nodeId) || [];

          // Handle conditional nodes with nextNodeId
          if (result.nextNodeId) {
            if (!processingQueue.includes(result.nextNodeId)) {
              processingQueue.push(result.nextNodeId);
            }
          } else {
            // Add all child nodes
            childNodes.forEach((childId) => {
              if (!executedNodes.has(childId) && !processingQueue.includes(childId)) {
                processingQueue.push(childId);
              }
            });
          }
        }
      }

      // Execution completed successfully
      const finalOutput = nodeOutputs.get(Array.from(executedNodes).pop() || '');

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          output: finalOutput as any,
          completedAt: new Date(),
        },
      });

      // Emit completion event
      this.eventEmitter.emit('execution.completed', {
        executionId,
        workflowId: context.workflowId,
        userId,
        output: finalOutput,
        timestamp: new Date(),
      });

      // Clean up
      this.runningExecutions.delete(executionId);
    } catch (error) {
      // Handle unexpected errors
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      // Emit failure event
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: executionId },
      });

      this.eventEmitter.emit('execution.failed', {
        executionId,
        workflowId: execution?.workflowId || '',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      // Clean up
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Execute a single node with retry logic
   * @private
   */
  private async executeNodeWithRetry(
    executionId: string,
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<any> {
    let lastError: string | undefined;
    let attempt = 0;

    // Emit node started event
    this.eventEmitter.emit('node.started', {
      executionId,
      nodeId: node.nodeId,
      nodeType: node.type,
      timestamp: new Date(),
    });

    while (attempt < this.MAX_RETRIES) {
      attempt++;

      try {
        const result = await this.executeNode(executionId, node, context, attempt);

        if (result.success) {
          // Emit node completed event
          this.eventEmitter.emit('node.completed', {
            executionId,
            nodeId: node.nodeId,
            nodeType: node.type,
            output: result.output,
            timestamp: new Date(),
          });

          return result;
        }

        lastError = result.error;

        // Don't retry for certain types of errors
        if (
          result.error?.includes('not found') ||
          result.error?.includes('forbidden') ||
          result.error?.includes('unauthorized')
        ) {
          break;
        }

        // Wait before retry
        if (attempt < this.MAX_RETRIES) {
          // Emit retry event
          this.eventEmitter.emit('node.retry', {
            executionId,
            nodeId: node.nodeId,
            nodeType: node.type,
            attempt,
            maxRetries: this.MAX_RETRIES,
            error: lastError,
            timestamp: new Date(),
          });

          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY_MS * attempt));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';

        if (attempt < this.MAX_RETRIES) {
          // Emit retry event
          this.eventEmitter.emit('node.retry', {
            executionId,
            nodeId: node.nodeId,
            nodeType: node.type,
            attempt,
            maxRetries: this.MAX_RETRIES,
            error: lastError,
            timestamp: new Date(),
          });

          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY_MS * attempt));
        }
      }
    }

    // All retries failed
    // Emit node failed event
    this.eventEmitter.emit('node.failed', {
      executionId,
      nodeId: node.nodeId,
      nodeType: node.type,
      error: lastError,
      attempts: this.MAX_RETRIES,
      timestamp: new Date(),
    });

    return {
      success: false,
      error: lastError || 'Node execution failed after retries',
    };
  }

  /**
   * Execute a single node
   * @private
   */
  private async executeNode(
    executionId: string,
    node: NodeConfig,
    context: ExecutionContext,
    attempt: number = 1
  ): Promise<any> {
    // Create node execution record (only on first attempt)
    let nodeExecution;
    if (attempt === 1) {
      nodeExecution = await this.prisma.nodeExecution.create({
        data: {
          executionId,
          nodeId: node.nodeId,
          nodeType: node.type,
          status: ExecutionStatus.RUNNING,
          input: context.previousNodeOutput as any,
        },
      });
    } else {
      // Find existing node execution for retry attempts
      const existingExecutions = await this.prisma.nodeExecution.findMany({
        where: {
          executionId,
          nodeId: node.nodeId,
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: 1,
      });
      nodeExecution = existingExecutions[0];
    }

    if (!nodeExecution) {
      throw new Error('Node execution record not found');
    }

    try {
      // Get appropriate executor
      const executor = this.executorFactory.getExecutor(node.type);

      // Execute node
      const result = await executor.execute(node, context);

      // Update node execution record
      await this.prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
          output: result.output as any,
          error: result.error,
          completedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      // Update node execution with error
      await this.prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string, userId: string): Promise<WorkflowExecution> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        nodeExecutions: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.userId !== userId) {
      throw new Error('Access forbidden');
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status as ExecutionStatus,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt || undefined,
      input: execution.input,
      output: execution.output,
      error: execution.error || undefined,
      nodeExecutions: execution.nodeExecutions.map((ne) => ({
        nodeId: ne.nodeId,
        status: ne.status as ExecutionStatus,
        startedAt: ne.startedAt,
        completedAt: ne.completedAt || undefined,
        output: ne.output,
        error: ne.error || undefined,
      })),
    };
  }

  /**
   * Get all executions for a workflow
   */
  async getExecutions(workflowId: string, userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.prisma.workflowExecution.findMany({
        where: { workflowId, userId },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.workflowExecution.count({ where: { workflowId, userId } }),
    ]);

    return {
      data: executions.map((e) => ({
        id: e.id,
        workflowId: e.workflowId,
        status: e.status as ExecutionStatus,
        startedAt: e.startedAt,
        completedAt: e.completedAt || undefined,
        error: e.error || undefined,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Event listener for execution.approved
   * Triggered when PublicAPI approves an execution
   */
  @OnEvent('execution.approved')
  async handleExecutionApproved(payload: {
    executionId: string;
    workflowId: string;
    userId: string;
    comment?: string;
    timestamp: Date;
  }) {
    console.log(`[Workflow Engine] Received execution.approved event for ${payload.executionId}`);

    try {
      // Check if execution is still pending approval to prevent duplicate processing
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: payload.executionId },
        select: { status: true },
      });

      if (!execution) {
        console.error(`[Workflow Engine] Execution ${payload.executionId} not found`);
        return;
      }

      if (execution.status !== 'pending_approval') {
        console.log(`[Workflow Engine] Execution ${payload.executionId} already processed (status: ${execution.status}), skipping`);
        return;
      }

      await this.resumeExecution(payload.executionId, payload.userId, true, payload.comment);
    } catch (error) {
      console.error(`[Workflow Engine] Error handling execution.approved for ${payload.executionId}:`, error);
    }
  }

  /**
   * Resume a paused execution after approval/rejection
   * @param executionId - ID of the paused execution
   * @param userId - ID of the user approving/rejecting
   * @param approved - Whether the content was approved
   * @param comment - Optional comment from reviewer
   */
  async resumeExecution(
    executionId: string,
    userId: string,
    approved: boolean,
    comment?: string
  ): Promise<void> {
    console.log(`[Workflow Engine] resumeExecution called for ${executionId}, approved=${approved}`);

    // Load the paused execution
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        nodeExecutions: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!execution) {
      console.error(`[Workflow Engine] Execution ${executionId} not found`);
      throw new Error('Execution not found');
    }

    console.log(`[Workflow Engine] Execution status: ${execution.status}`);
    console.log(`[Workflow Engine] Node executions count: ${execution.nodeExecutions.length}`);
    execution.nodeExecutions.forEach((ne) => {
      console.log(`  - Node ${ne.nodeId} (${ne.nodeType}): status=${ne.status}`);
    });

    if (execution.status !== 'pending_approval') {
      console.error(`[Workflow Engine] Execution is not pending approval, status is: ${execution.status}`);
      throw new Error('Execution is not pending approval');
    }

    // Update approval status
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        approvalStatus: approved ? 'approved' : 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    if (!approved) {
      // Rejection - mark execution as cancelled
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.CANCELLED,
          error: comment || 'Content rejected by reviewer',
          completedAt: new Date(),
        },
      });

      // Emit rejection event
      this.eventEmitter.emit('execution.rejected', {
        executionId,
        workflowId: execution.workflowId,
        userId,
        comment,
        timestamp: new Date(),
      });

      console.log(`[Workflow Engine] Execution ${executionId} rejected by user ${userId}`);
      return;
    }

    // Approval - resume workflow execution
    console.log(`[Workflow Engine] Execution ${executionId} approved by user ${userId}, resuming...`);

    // Update status to running
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.RUNNING,
      },
    });

    // Emit approval event
    this.eventEmitter.emit('execution.approved', {
      executionId,
      workflowId: execution.workflowId,
      userId,
      comment,
      timestamp: new Date(),
    });

    // Get workflow definition from snapshot
    const definition = execution.workflowSnapshot as any as WorkflowDefinition;

    // Find the manual approval node that was just completed
    const manualApprovalNodeExecution = execution.nodeExecutions.find(
      (ne) => ne.nodeType === 'manual_approval' && ne.status === ExecutionStatus.COMPLETED
    );

    if (!manualApprovalNodeExecution) {
      console.error(`[Workflow Engine] Manual approval node execution not found!`);
      console.error(`[Workflow Engine] Available node executions:`, execution.nodeExecutions.map(ne => ({
        nodeId: ne.nodeId,
        nodeType: ne.nodeType,
        status: ne.status
      })));
      throw new Error('Manual approval node execution not found');
    }

    console.log(`[Workflow Engine] Found manual approval node: ${manualApprovalNodeExecution.nodeId}`);

    // Get the approved data (this will be passed to next nodes)
    const approvedData = execution.approvalData;
    console.log(`[Workflow Engine] Approved data keys:`, Object.keys(approvedData || {}));

    // Resume execution from the node after manual approval
    console.log(`[Workflow Engine] Calling resumeFromNode...`);
    await this.resumeFromNode(
      executionId,
      execution.workflowId,
      execution.userId,
      definition,
      manualApprovalNodeExecution.nodeId,
      approvedData
    );
    console.log(`[Workflow Engine] resumeFromNode completed`);
  }

  /**
   * Resume workflow execution from a specific node
   * @private
   */
  private async resumeFromNode(
    executionId: string,
    workflowId: string,
    userId: string,
    definition: WorkflowDefinition,
    fromNodeId: string,
    inputData: unknown
  ): Promise<void> {
    console.log(`[Workflow Engine] resumeFromNode called for execution ${executionId}, from node ${fromNodeId}`);

    // Mark execution as running
    this.runningExecutions.set(executionId, true);

    try {
      const { nodes, edges } = definition;
      console.log(`[Workflow Engine] Workflow has ${nodes.length} nodes and ${edges.length} edges`);

      // Build adjacency list
      const adjacencyList = new Map<string, string[]>();
      const reverseAdjacencyList = new Map<string, string[]>();
      const nodeOutputs = new Map<string, any>();

      edges.forEach((edge) => {
        if (!adjacencyList.has(edge.source)) {
          adjacencyList.set(edge.source, []);
        }
        adjacencyList.get(edge.source)!.push(edge.target);

        if (!reverseAdjacencyList.has(edge.target)) {
          reverseAdjacencyList.set(edge.target, []);
        }
        reverseAdjacencyList.get(edge.target)!.push(edge.source);
      });

      // Create execution context
      const context: ExecutionContext = {
        executionId,
        workflowId,
        userId,
        variables: definition.variables || {},
        previousNodeOutput: inputData,
        input: inputData,
      };

      // Get already executed nodes from database
      const executedNodeRecords = await this.prisma.nodeExecution.findMany({
        where: { executionId },
      });
      const executedNodes = new Set(executedNodeRecords.map((ne) => ne.nodeId));
      console.log(`[Workflow Engine] Already executed nodes:`, Array.from(executedNodes));

      // Start from child nodes of the manual approval node
      const childNodes = adjacencyList.get(fromNodeId) || [];
      console.log(`[Workflow Engine] Child nodes of ${fromNodeId}:`, childNodes);
      const processingQueue: string[] = [...childNodes];

      // Set the output of the manual approval node
      nodeOutputs.set(fromNodeId, inputData);

      // Execute remaining nodes
      console.log(`[Workflow Engine] Starting execution loop with ${processingQueue.length} nodes in queue`);
      while (processingQueue.length > 0) {
        // Check if execution was cancelled
        if (!this.runningExecutions.get(executionId)) {
          throw new Error('Execution cancelled');
        }

        // Get all nodes ready to execute
        const readyNodes = processingQueue.filter((nodeId) => {
          const dependencies = reverseAdjacencyList.get(nodeId) || [];
          return dependencies.every((dep) => executedNodes.has(dep));
        });

        console.log(`[Workflow Engine] Ready nodes: ${readyNodes.length}, Queue: ${processingQueue.length}`);

        if (readyNodes.length === 0) {
          console.log(`[Workflow Engine] No ready nodes, breaking out of loop`);
          break;
        }

        // Remove ready nodes from queue
        readyNodes.forEach((nodeId) => {
          const index = processingQueue.indexOf(nodeId);
          if (index > -1) {
            processingQueue.splice(index, 1);
          }
        });

        // Execute ready nodes in parallel
        const nodeResults = await Promise.all(
          readyNodes.map(async (nodeId) => {
            const node = nodes.find((n) => n.nodeId === nodeId);
            if (!node) {
              throw new Error(`Node ${nodeId} not found`);
            }

            // Get input from previous node(s)
            const dependencies = reverseAdjacencyList.get(nodeId) || [];
            const previousOutput = dependencies.length > 0
              ? nodeOutputs.get(dependencies[0])
              : inputData;

            // Update context
            const nodeContext = {
              ...context,
              previousNodeOutput: previousOutput,
              input: previousOutput,
            };

            // Execute node with retry logic
            const result = await this.executeNodeWithRetry(executionId, node, nodeContext);

            return { nodeId, result };
          })
        );

        // Process results
        for (const { nodeId, result } of nodeResults) {
          if (!result.success) {
            // Node failed
            await this.prisma.workflowExecution.update({
              where: { id: executionId },
              data: {
                status: ExecutionStatus.FAILED,
                error: result.error,
                completedAt: new Date(),
              },
            });

            this.eventEmitter.emit('execution.failed', {
              executionId,
              workflowId,
              userId,
              error: result.error,
              timestamp: new Date(),
            });

            this.runningExecutions.delete(executionId);
            return;
          }

          // Mark node as executed
          executedNodes.add(nodeId);
          nodeOutputs.set(nodeId, result.output);

          // Add child nodes to queue
          const children = adjacencyList.get(nodeId) || [];
          children.forEach((childId) => {
            if (!executedNodes.has(childId) && !processingQueue.includes(childId)) {
              processingQueue.push(childId);
            }
          });
        }
      }

      // Execution completed successfully
      const finalOutput = nodeOutputs.get(Array.from(executedNodes).pop() || '');

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          output: finalOutput as any,
          completedAt: new Date(),
        },
      });

      this.eventEmitter.emit('execution.completed', {
        executionId,
        workflowId,
        userId,
        output: finalOutput,
        timestamp: new Date(),
      });

      this.runningExecutions.delete(executionId);
    } catch (error) {
      // Handle errors
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      this.eventEmitter.emit('execution.failed', {
        executionId,
        workflowId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      this.runningExecutions.delete(executionId);
    }
  }
}
