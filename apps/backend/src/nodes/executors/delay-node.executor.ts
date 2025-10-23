/**
 * Delay Node Executor
 * Pauses workflow execution for a specified duration
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { DelayNodeConfig } from '@workflow/shared-types';

@Injectable()
export class DelayNodeExecutor extends BaseNodeExecutor {
  /**
   * Execute delay
   */
  protected async executeInternal(
    node: DelayNodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { delayMs } = node.config;

    // Wait for specified duration
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    return {
      success: true,
      output: {
        delayed: delayMs,
        previousOutput: context.previousNodeOutput,
      },
    };
  }

  /**
   * Validate delay node configuration
   */
  validate(node: DelayNodeConfig): boolean {
    super.validate(node);

    if (node.config?.delayMs === undefined || node.config.delayMs < 0) {
      throw new Error('Delay node must have a valid delayMs (>= 0)');
    }

    if (node.config.delayMs > 300000) {
      // Max 5 minutes for MVP
      throw new Error('Delay cannot exceed 300000ms (5 minutes)');
    }

    return true;
  }
}
