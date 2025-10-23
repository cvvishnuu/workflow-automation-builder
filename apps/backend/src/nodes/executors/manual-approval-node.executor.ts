/**
 * Manual Approval Node Executor
 * Pauses workflow execution for human review and approval
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { ManualApprovalNodeConfig, NodeConfig } from '@workflow/shared-types';

@Injectable()
export class ManualApprovalNodeExecutor extends BaseNodeExecutor {
  /**
   * Execute the manual approval node
   * This pauses the workflow and saves data for review
   */
  protected async executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const approvalNode = node as ManualApprovalNodeConfig;

    try {
      const { config } = approvalNode;
      const inputData = context.input as any;

      // Extract the data that needs approval
      // Typically this will be rows with generated content and customer data
      const dataToReview = {
        rows: inputData.rows || [],
        metadata: {
          totalRows: inputData.rows?.length || 0,
          title: config.title || 'Content Approval Required',
          description: config.description || 'Please review the generated content before proceeding',
          allowBulkApproval: config.allowBulkApproval !== false,
          requireComment: config.requireComment || false,
        },
        // Include relevant fields for display
        displayFields: config.dataFields || [
          'customerId',
          'name',
          'phone',
          'generated_content',
          'compliance_status',
        ],
        timestamp: new Date().toISOString(),
      };

      console.log('[Manual Approval] Workflow paused for approval');
      console.log('[Manual Approval] Rows awaiting review:', dataToReview.rows.length);

      // Return success with special flag indicating approval is required
      return {
        success: true,
        output: {
          ...inputData, // Pass through input data
          approvalPending: true,
          approvalData: dataToReview,
        },
        requiresApproval: true, // This flag tells the engine to pause execution
      };
    } catch (error) {
      console.error('[Manual Approval] Node execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause for approval',
      };
    }
  }

  /**
   * Validate manual approval node configuration
   */
  validate(node: NodeConfig): boolean {
    super.validate(node);

    const approvalNode = node as ManualApprovalNodeConfig;

    // Manual approval nodes don't have required fields, all are optional
    // Just ensure it has the correct type
    if (approvalNode.type !== 'manual_approval') {
      throw new Error('Invalid node type for ManualApprovalNodeExecutor');
    }

    return true;
  }
}
