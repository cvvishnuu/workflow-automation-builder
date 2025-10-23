/**
 * Data Transform Node Executor
 * Transforms data using JavaScript expressions
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { DataTransformNodeConfig } from '@workflow/shared-types';

@Injectable()
export class DataTransformNodeExecutor extends BaseNodeExecutor {
  /**
   * Execute data transformation
   */
  protected async executeInternal(
    node: DataTransformNodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const { transformScript, inputMapping } = node.config;

    try {
      // Prepare input data
      let input = context.previousNodeOutput;

      // Apply input mapping if specified
      if (inputMapping) {
        input = this.applyInputMapping(input, inputMapping, context);
      }

      // Prepare evaluation context
      const evalContext = {
        input,
        previousOutput: context.previousNodeOutput,
        variables: context.variables,
      };

      // Execute transformation script
      const result = this.evaluateExpression(transformScript, evalContext);

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Transform failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Apply input mapping to transform input structure
   * @private
   */
  private applyInputMapping(
    input: unknown,
    mapping: Record<string, string>,
    context: ExecutionContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      // Evaluate source path (can be a simple path or expression)
      try {
        const evalContext = {
          input,
          previousOutput: context.previousNodeOutput,
          variables: context.variables,
        };
        result[targetKey] = this.evaluateExpression(sourcePath, evalContext);
      } catch {
        // If evaluation fails, treat as literal path
        result[targetKey] = this.getNestedValue(input, sourcePath);
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate data transform node configuration
   */
  validate(node: DataTransformNodeConfig): boolean {
    super.validate(node);

    if (!node.config?.transformScript) {
      throw new Error('Data transform node must have a transformScript');
    }

    return true;
  }
}
