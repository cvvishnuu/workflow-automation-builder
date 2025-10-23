/**
 * Trigger Node Executor
 * Handles the start of workflow execution
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { TriggerNodeConfig } from '@workflow/shared-types';

@Injectable()
export class TriggerNodeExecutor extends BaseNodeExecutor {
  /**
   * Execute trigger node
   * Simply passes through the initial input data
   */
  protected async executeInternal(
    node: TriggerNodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    // Trigger nodes simply pass through the input
    // In a full implementation, this would handle different trigger types
    // (manual, scheduled, webhook) differently

    return {
      success: true,
      output: context.previousNodeOutput || { triggered: true, timestamp: new Date() },
    };
  }

  /**
   * Validate trigger node configuration
   */
  validate(node: TriggerNodeConfig): boolean {
    super.validate(node);

    if (!node.config?.triggerType) {
      throw new Error('Trigger node must have a triggerType');
    }

    return true;
  }
}
