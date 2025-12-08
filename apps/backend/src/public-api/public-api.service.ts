/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Public API Service
 * Business logic for public API endpoints
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecuteAgentDto } from './dto/execute-agent.dto';
import { AIContentService } from '../bfsi/services/ai-content.service';
import { ComplianceRAGService } from '../compliance-rag/compliance-rag.service';

@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiContentService: AIContentService,
    private readonly complianceRAGService: ComplianceRAGService
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
        approvalData: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    if (execution.status === 'pending_approval') {
      return {
        executionId: execution.id,
        status: execution.status,
        message: 'Execution pending approval',
        approvalData: this.transformApprovalData(execution.approvalData),
      };
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

    // Extract product from prompt (stored in approvalData.executionInput from manual approval node)
    const prompt = approvalData.executionInput?.prompt || approvalData.prompt || '';
    const product = this.extractProductFromPrompt(prompt);

    // Transform each row to match frontend expectations
    const generatedContent = rows.map((row: any, index: number) => {
      // Extract violations with full details (term, reason, severity, suggestion)
      const flaggedTerms =
        row.compliance_flagged_terms || row.violations || row.flagged_terms || [];
      const violations = flaggedTerms.map((term: any) => {
        // If it's already a string, return it
        if (typeof term === 'string') return term;
        // Otherwise, format it with details
        const parts = [];
        if (term.term) parts.push(`"${term.term}"`);
        if (term.reason) parts.push(term.reason);
        if (term.severity) parts.push(`(${term.severity})`);
        return parts.join(' - ');
      });

      // Add compliance suggestions as additional violations
      const suggestions = row.compliance_suggestions || [];
      if (suggestions.length > 0) {
        violations.push(...suggestions.map((s: string) => `Suggestion: ${s}`));
      }

      return {
        row: row.row || index + 1,
        name: row.name || row.customer_name || 'Unknown',
        product: row.product || row.product_name || product,
        message: row.generated_content || row.message || '',
        xai: row.xai,
        xai_error: row.xai_error,
        generation_error: row.generation_error,
        compliance_xai: row.compliance_xai,
        compliance_xai_error: row.compliance_xai_error,
        // riskScore: 0=no risk/100=high risk → complianceScore: 0=high risk/100=no risk (invert for display)
        complianceScore: 100 - (row.compliance_risk_score || row.complianceScore || 0),
        complianceStatus: this.mapComplianceStatus(row.compliance_status || row.complianceStatus),
        violations,
      };
    });

    return {
      generatedContent,
      metadata: approvalData.approvalData?.metadata || approvalData.metadata,
    };
  }

  /**
   * Extract product name from prompt text
   */
  private extractProductFromPrompt(prompt: string): string {
    if (!prompt) return 'Unknown';

    const lowerPrompt = prompt.toLowerCase();

    // Common BFSI products
    if (lowerPrompt.includes('home loan') || lowerPrompt.includes('housing loan'))
      return 'Home Loan';
    if (lowerPrompt.includes('personal loan')) return 'Personal Loan';
    if (
      lowerPrompt.includes('car loan') ||
      lowerPrompt.includes('auto loan') ||
      lowerPrompt.includes('vehicle loan')
    )
      return 'Car Loan';
    if (lowerPrompt.includes('credit card')) return 'Credit Card';
    if (lowerPrompt.includes('debit card')) return 'Debit Card';
    if (lowerPrompt.includes('savings account') || lowerPrompt.includes('saving account'))
      return 'Savings Account';
    if (lowerPrompt.includes('current account')) return 'Current Account';
    if (lowerPrompt.includes('fixed deposit') || lowerPrompt.includes('fd')) return 'Fixed Deposit';
    if (lowerPrompt.includes('recurring deposit') || lowerPrompt.includes('rd'))
      return 'Recurring Deposit';
    if (
      lowerPrompt.includes('mutual fund') ||
      lowerPrompt.includes('sip') ||
      lowerPrompt.includes('systematic investment')
    )
      return 'Mutual Fund / SIP';
    if (lowerPrompt.includes('life insurance')) return 'Life Insurance';
    if (lowerPrompt.includes('health insurance') || lowerPrompt.includes('medical insurance'))
      return 'Health Insurance';
    if (lowerPrompt.includes('term insurance')) return 'Term Insurance';
    if (lowerPrompt.includes('investment') && lowerPrompt.includes('plan'))
      return 'Investment Plan';
    if (lowerPrompt.includes('gold loan')) return 'Gold Loan';
    if (lowerPrompt.includes('education loan') || lowerPrompt.includes('student loan'))
      return 'Education Loan';
    if (lowerPrompt.includes('business loan')) return 'Business Loan';

    return 'Financial Product';
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

    // Refetch execution to get the LATEST approvalData (after any regenerations/edits)
    const updatedExecution = await this.prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    // Emit event to resume execution with latest approvalData
    // This ensures regenerated/edited messages are passed to next nodes
    this.eventEmitter.emit('execution.approved', {
      executionId,
      workflowId,
      userId,
      comment,
      timestamp: new Date(),
      approvalData: updatedExecution?.approvalData, // Pass LATEST approval data from DB
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
   * Reject and regenerate a single message
   */
  async rejectAndRegenerateMessage(
    executionId: string,
    workflowId: string,
    rowId: number,
    rejectReason: string,
    _userId: string
  ) {
    // Get execution with approval data
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

    // Get approval data
    const approvalData = execution.approvalData as any;
    if (!approvalData) {
      throw new BadRequestException('Approval data not found');
    }

    // Extract rows from nested structure (check both locations)
    const rows = approvalData.approvalData?.rows || approvalData.rows || [];

    if (rows.length === 0) {
      throw new BadRequestException('No rows found in approval data');
    }

    // Row IDs in frontend are 1-indexed, array is 0-indexed
    const rowIndex = rowId - 1;

    if (rowIndex < 0 || rowIndex >= rows.length) {
      throw new NotFoundException(
        `Message with row ID ${rowId} not found (total rows: ${rows.length})`
      );
    }

    const originalRow = rows[rowIndex];

    // Get the original execution input to extract prompt, tone, etc.
    const executionInput = execution.input as any;
    const csvData = executionInput?.csvData || [];
    const csvRow = csvData.find((r: any) => r.customer_id === originalRow.customer_id);

    if (!csvRow) {
      throw new BadRequestException('Original CSV data not found for this customer');
    }

    // Build personalization variables from CSV row
    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(csvRow)) {
      if (value !== undefined && value !== null) {
        variables[key] = String(value);
      }
    }

    // Build customer context
    const customerInfo: string[] = [];
    if (csvRow.name) customerInfo.push(`Customer: ${csvRow.name}`);
    if (csvRow.age) customerInfo.push(`Age: ${csvRow.age}`);
    if (csvRow.city) customerInfo.push(`City: ${csvRow.city}`);
    if (csvRow.occupation) customerInfo.push(`Occupation: ${csvRow.occupation}`);
    const contextString =
      customerInfo.length > 0 ? `Customer Profile:\n${customerInfo.join('\n')}` : '';

    // Regenerate content with reject reason included in prompt
    const enhancedPrompt = executionInput?.prompt
      ? `${executionInput.prompt}\n\nIMPORTANT - Previous message was rejected for the following reason:\n"${rejectReason}"\nPlease address this feedback in the new message.`
      : `Generate marketing message.\n\nIMPORTANT - Previous message was rejected for the following reason:\n"${rejectReason}"\nPlease address this feedback in the new message.`;

    try {
      // Regenerate message
      const regeneratedContent = await this.aiContentService.generateContent({
        contentType: executionInput?.contentType || 'whatsapp',
        purpose: enhancedPrompt,
        targetAudience: executionInput?.targetAudience || '',
        keyPoints: executionInput?.keyPoints || '',
        tone: executionInput?.tone || 'professional',
        maxLength: executionInput?.maxLength,
        variables,
        context: contextString,
      });

      // Rerun compliance check on regenerated content
      const complianceResult = await this.complianceRAGService.checkComplianceWithRAG({
        content: regeneratedContent.content,
        contentType: executionInput?.contentType || 'whatsapp',
        productCategory: executionInput?.productCategory || 'general',
      });

      // Update the row with new message and compliance data
      rows[rowIndex] = {
        ...originalRow,
        generated_content: regeneratedContent.content,
        xai: regeneratedContent.xai,
        xai_error: regeneratedContent.xaiError,
        compliance_status: complianceResult.isPassed ? 'passed' : 'failed',
        compliance_risk_score: complianceResult.riskScore,
        compliance_flagged_terms: complianceResult.flaggedTerms,
        compliance_suggestions: complianceResult.suggestions,
        compliance_xai: complianceResult.xai,
        compliance_xai_error: complianceResult.xaiError,
        isRegenerated: true,
        regeneratedAt: new Date().toISOString(),
        rejectReason: rejectReason,
      };

      // Update execution with modified approval data
      // Preserve the nested structure if it exists
      const updatedApprovalData = approvalData.approvalData
        ? {
            ...approvalData,
            approvalData: {
              ...approvalData.approvalData,
              rows,
            },
          }
        : {
            ...approvalData,
            rows,
          };

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          approvalData: updatedApprovalData as any,
        },
      });

      return {
        success: true,
        message: 'Message regenerated successfully',
        updatedRow: rows[rowIndex],
      };
    } catch (error) {
      throw new BadRequestException(`Failed to regenerate message: ${error.message}`);
    }
  }

  /**
   * Update a single message (manual edit)
   */
  async updateMessage(
    executionId: string,
    workflowId: string,
    rowId: number,
    updatedMessage: string,
    recheckCompliance: boolean,
    userId: string
  ) {
    // Get execution with approval data
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

    // Get approval data
    const approvalData = execution.approvalData as any;
    if (!approvalData) {
      throw new BadRequestException('Approval data not found');
    }

    // Extract rows from nested structure (check both locations)
    const rows = approvalData.approvalData?.rows || approvalData.rows || [];

    if (rows.length === 0) {
      throw new BadRequestException('No rows found in approval data');
    }

    // Row IDs in frontend are 1-indexed, array is 0-indexed
    const rowIndex = rowId - 1;

    if (rowIndex < 0 || rowIndex >= rows.length) {
      throw new NotFoundException(
        `Message with row ID ${rowId} not found (total rows: ${rows.length})`
      );
    }

    const originalRow = rows[rowIndex];

    try {
      // Update the message
      rows[rowIndex] = {
        ...originalRow,
        generated_content: updatedMessage,
        isEdited: true,
        editedAt: new Date().toISOString(),
        editedBy: userId,
      };

      // Optionally recheck compliance on edited message
      if (recheckCompliance) {
        const executionInput = execution.input as any;
        const complianceResult = await this.complianceRAGService.checkComplianceWithRAG({
          content: updatedMessage,
          contentType: executionInput?.contentType || 'whatsapp',
          productCategory: executionInput?.productCategory || 'general',
        });

        rows[rowIndex] = {
          ...rows[rowIndex],
          compliance_status: complianceResult.isPassed ? 'passed' : 'failed',
          compliance_risk_score: complianceResult.riskScore,
          compliance_flagged_terms: complianceResult.flaggedTerms,
          compliance_suggestions: complianceResult.suggestions,
          compliance_xai: complianceResult.xai,
          compliance_xai_error: complianceResult.xaiError,
        };
      }

      // Update execution with modified approval data
      // Preserve the nested structure if it exists
      const updatedApprovalData = approvalData.approvalData
        ? {
            ...approvalData,
            approvalData: {
              ...approvalData.approvalData,
              rows,
            },
          }
        : {
            ...approvalData,
            rows,
          };

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          approvalData: updatedApprovalData as any,
        },
      });

      return {
        success: true,
        message: recheckCompliance
          ? 'Message updated and compliance rechecked successfully'
          : 'Message updated successfully',
        updatedRow: rows[rowIndex],
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update message: ${error.message}`);
    }
  }

  /**
   * Truncate CSV data to max 100 rows
   */
  private truncateCSVData(input: any): any {
    if (!input || typeof input !== 'object') {
      return input;
    }

    // Check if input has csvData array
    if (Array.isArray(input.csvData) && input.csvData.length > 10) {
      console.log(`[PublicAPI] Truncating CSV data from ${input.csvData.length} rows to 10 rows`);
      return {
        ...input,
        csvData: input.csvData.slice(0, 10),
        _truncated: true,
        _originalRowCount: input.csvData.length,
      };
    }

    return input;
  }
}
