/**
 * Conditional Node Executor
 * Evaluates a condition and determines the next execution path
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { ConditionalNodeConfig } from '@workflow/shared-types';

@Injectable()
export class ConditionalNodeExecutor extends BaseNodeExecutor {
  /**
   * Execute conditional logic
   */
  protected async executeInternal(
    node: ConditionalNodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { condition, trueOutputId, falseOutputId } = node.config;

    try {
      // Prepare evaluation context with available data
      const evalContext = {
        input: context.previousNodeOutput || context.input,
        previousOutput: context.previousNodeOutput,
        variables: context.variables,
      };

      // DEBUG: Log condition and input structure
      console.log('[CONDITIONAL DEBUG] Node ID:', node.nodeId);
      console.log('[CONDITIONAL DEBUG] Condition:', condition);
      console.log('[CONDITIONAL DEBUG] Input keys:', Object.keys(evalContext.input || {}));
      console.log('[CONDITIONAL DEBUG] Input data:', JSON.stringify(evalContext.input, null, 2));

      // Evaluate the condition expression
      const result = this.evaluateExpression(condition, evalContext);
      const isTrue = Boolean(result);

      console.log('[CONDITIONAL DEBUG] Evaluation result:', isTrue);

      // Determine next node based on condition result
      const nextNodeId = isTrue ? trueOutputId : falseOutputId;

      return {
        success: true,
        output: {
          ...(evalContext.input || {}), // Pass through all input data (including rows from previous nodes)
          conditionResult: isTrue,
          evaluatedValue: result,
        },
        nextNodeId,
      };
    } catch (error) {
      console.error('[CONDITIONAL DEBUG] Evaluation failed:', error);
      console.error('[CONDITIONAL DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return {
        success: false,
        error: `Failed to evaluate condition: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate conditional node configuration
   */
  validate(node: ConditionalNodeConfig): boolean {
    super.validate(node);

    if (!node.config?.condition) {
      throw new Error('Conditional node must have a condition');
    }

    return true;
  }
}
