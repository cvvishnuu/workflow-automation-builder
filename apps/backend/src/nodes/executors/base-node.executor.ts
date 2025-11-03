/**
 * Base Node Executor
 * Abstract base class for all node executors
 * Provides common functionality and enforces interface
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Provides common execution infrastructure
 * - Open/Closed: Subclasses extend without modifying base
 * - Template Method Pattern: Defines execution skeleton
 */

import { INodeExecutor, ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { NodeConfig } from '@workflow/shared-types';

export abstract class BaseNodeExecutor implements INodeExecutor {
  /**
   * Template method for node execution
   * Handles common pre/post execution logic
   */
  async execute(node: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
      // Validate configuration before execution
      this.validate(node);

      // Log execution start
      console.log(`Executing node: ${node.nodeId} (${node.type})`);

      // Execute node-specific logic (implemented by subclasses)
      const result = await this.executeInternal(node, context);

      // Log execution completion
      console.log(`Node ${node.nodeId} completed:`, result.success ? 'SUCCESS' : 'FAILED');

      return result;
    } catch (error) {
      // Handle execution errors
      console.error(`Node ${node.nodeId} error:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Abstract method for node-specific execution logic
   * Must be implemented by concrete executor classes
   * @protected
   */
  protected abstract executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;

  /**
   * Default validation - can be overridden by subclasses
   * @param node - The node configuration
   */
  validate(node: NodeConfig): boolean {
    if (!node.nodeId) {
      throw new Error('Node must have an ID');
    }
    if (!node.type) {
      throw new Error('Node must have a type');
    }
    return true;
  }

  /**
   * Helper method to evaluate JavaScript expressions safely
   * Used by conditional and transform nodes
   * @protected
   */
  protected evaluateExpression(expression: string, context: Record<string, unknown>): unknown {
    try {
      // Create a function from the expression
      const func = new Function(...Object.keys(context), `return ${expression}`);
      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${error}`);
    }
  }

  /**
   * Replace variables in string with context values
   * Supports {{input.field}}, {{previousOutput.field}}, and {{variables.field}} patterns
   * @protected
   */
  protected replaceVariables(template: string, context: ExecutionContext): string {
    if (!template) return '';

    let result = template;

    // Replace {{input.field}} patterns
    const inputData = context.input as any;
    if (inputData) {
      result = result.replace(/\{\{input\.(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = this.getNestedValue(inputData, path);
        return value !== undefined ? String(value) : match;
      });
    }

    // Replace {{previousOutput.field}} patterns
    const previousOutput = context.previousNodeOutput as any;
    if (previousOutput) {
      result = result.replace(/\{\{previousOutput\.(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = this.getNestedValue(previousOutput, path);
        return value !== undefined ? String(value) : match;
      });
    }

    // Replace {{variables.field}} patterns
    if (context.variables) {
      result = result.replace(/\{\{variables\.(\w+)\}\}/g, (match, key) => {
        const value = context.variables[key];
        return value !== undefined ? String(value) : match;
      });
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * @protected
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
