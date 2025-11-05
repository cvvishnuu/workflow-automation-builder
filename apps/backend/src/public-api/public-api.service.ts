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
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Execute an agent (workflow) via public API
   */
  async executeAgent(workflowId: string, userId: string, apiKeyId: string, dto: ExecuteAgentDto) {
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

    // Transform approvalData to match frontend expectations
    const transformedApprovalData = this.transformApprovalData(execution.approvalData);

    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      approvalData: transformedApprovalData,
      startedAt: execution.startedAt,
    };
  }

  /**
   * Transform approval data from backend format to frontend format
   * Backend: { rows: [{ generated_content, compliance_status, compliance_risk_score }] }
   * Frontend: { generatedContent: [{ message, complianceStatus, complianceScore }] }
   */
  private transformApprovalData(approvalData: any): any {
    if (!approvalData) {
      return { generatedContent: [] };
    }

    // Extract rows from nested structure
    const rows = approvalData.approvalData?.rows || approvalData.rows || [];

    // Transform each row to match frontend expectations
    const generatedContent = rows.map((row: any, index: number) => ({
      row: row.row || index + 1,
      name: row.name || row.customer_name || 'Unknown',
      product: row.product || row.product_name || 'Unknown',
      message: row.generated_content || row.message || '',
      // Convert risk score to compliance score (risk score: lower is better, compliance score: higher is better)
      complianceScore: 100 - (row.compliance_risk_score || row.complianceScore || 0),
      complianceStatus: this.mapComplianceStatus(row.compliance_status || row.complianceStatus),
      violations: row.violations || row.flagged_terms || [],
    }));

    return {
      generatedContent,
      metadata: approvalData.approvalData?.metadata || approvalData.metadata,
    };
  }

  /**
   * Map compliance status from backend format to frontend format
   */
  private mapComplianceStatus(status: string): 'pass' | 'warning' | 'fail' {
    if (!status) return 'warning';

    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'passed' || lowerStatus === 'pass') return 'pass';
    if (lowerStatus === 'failed' || lowerStatus === 'fail') return 'fail';
    return 'warning';
  }

  /**
   * Approve execution
   */
  async approveExecution(
    executionId: string,
    workflowId: string,
    userId: string,
    comment?: string
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
  async rejectExecution(executionId: string, workflowId: string, userId: string, comment?: string) {
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
      console.log(`[PublicAPI] Truncating CSV data from ${input.csvData.length} rows to 100 rows`);
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
