/**
 * Public API Service
 * Business logic for public API endpoints
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecuteAgentDto } from './dto/execute-agent.dto';

@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Execute an agent (workflow) via public API
   */
  async executeAgent(
    workflowId: string,
    userId: string,
    apiKeyId: string,
    dto: ExecuteAgentDto,
  ) {
    // Get workflow definition
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new NotFoundException('Workflow is not active');
    }

    // Truncate CSV data if present (max 100 rows)
    const truncatedInput = this.truncateCSVData(dto.input);

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        userId: userId,
        apiKeyId: apiKeyId,
        status: 'pending',
        input: truncatedInput as any,
        workflowSnapshot: workflow.definition as any,
      },
    });

    // Emit event to start execution (WorkflowEngine will pick this up)
    this.eventEmitter.emit('execution.start', {
      executionId: execution.id,
      workflowId: workflow.id,
      userId: userId,
      input: truncatedInput,
    });

    // Emit webhook event for execution started
    this.eventEmitter.emit('execution.started', {
      executionId: execution.id,
      workflowId: workflow.id,
      userId: userId,
    });

    return {
      executionId: execution.id,
      status: execution.status,
      startedAt: execution.startedAt,
      message: 'Execution started successfully',
    };
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string, workflowId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId: workflowId,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        error: true,
        approvalStatus: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return execution;
  }

  /**
   * Get execution results
   */
  async getExecutionResults(executionId: string, workflowId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId: workflowId,
      },
      select: {
        id: true,
        status: true,
        output: true,
        error: true,
        startedAt: true,
        completedAt: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    if (execution.status !== 'completed' && execution.status !== 'failed') {
      return {
        executionId: execution.id,
        status: execution.status,
        message: 'Execution not yet completed',
      };
    }

    return execution;
  }

  /**
   * Get pending approval data
   */
  async getPendingApproval(executionId: string, workflowId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId: workflowId,
        status: 'pending_approval',
      },
      select: {
        id: true,
        workflowId: true,
        status: true,
        approvalData: true,
        startedAt: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found or not pending approval');
    }

    return execution;
  }

  /**
   * Approve execution
   */
  async approveExecution(
    executionId: string,
    workflowId: string,
    userId: string,
    comment?: string,
  ) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId: workflowId,
        status: 'pending_approval',
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found or not pending approval');
    }

    // Update execution with approval
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        approvalStatus: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Emit event to resume execution
    this.eventEmitter.emit('execution.approved', {
      executionId,
      workflowId,
      userId,
      comment,
      timestamp: new Date(),
    });

    return {
      executionId,
      status: 'approved',
      message: 'Execution approved and will continue',
    };
  }

  /**
   * Reject execution
   */
  async rejectExecution(
    executionId: string,
    workflowId: string,
    userId: string,
    comment?: string,
  ) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflowId: workflowId,
        status: 'pending_approval',
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found or not pending approval');
    }

    // Update execution with rejection
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        approvalStatus: 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        error: comment || 'Content rejected by reviewer',
        completedAt: new Date(),
      },
    });

    // Emit event for rejection
    this.eventEmitter.emit('execution.rejected', {
      executionId,
      workflowId,
      userId,
      comment,
      timestamp: new Date(),
    });

    return {
      executionId,
      status: 'rejected',
      message: 'Execution rejected and stopped',
    };
  }

  /**
   * Truncate CSV data to max 100 rows
   */
  private truncateCSVData(input: any): any {
    if (!input || typeof input !== 'object') {
      return input;
    }

    // Check if input has csvData array
    if (Array.isArray(input.csvData) && input.csvData.length > 100) {
      console.log(
        `[PublicAPI] Truncating CSV data from ${input.csvData.length} rows to 100 rows`,
      );
      return {
        ...input,
        csvData: input.csvData.slice(0, 100),
        _truncated: true,
        _originalRowCount: input.csvData.length,
      };
    }

    return input;
  }
}
