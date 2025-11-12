/**
 * Node Executor Interface
 * Defines the contract for all node executors
 *
 * SOLID Principles Applied:
 * - Interface Segregation: Single, focused interface
 * - Liskov Substitution: All executors can be used interchangeably
 * - Open/Closed: New node types can be added without modifying existing code
 */

import { NodeConfig } from '@workflow/shared-types';

/**
 * Context provided to node executors
 * Contains execution state and helper methods
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  variables: Record<string, unknown>; // Global workflow variables
  previousNodeOutput?: unknown; // Output from the previous node
  input?: any; // Original execution input (preserved throughout workflow)
  executionInput?: any; // Alias for input (for backwards compatibility)
}

/**
 * Result returned by node executors
 */
export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  nextNodeId?: string; // For conditional nodes, specify next node
  requiresApproval?: boolean; // For manual approval nodes, pause execution
}

/**
 * Interface that all node executors must implement
 */
export interface INodeExecutor {
  /**
   * Execute the node logic
   * @param node - The node configuration
   * @param context - Execution context
   * @returns Promise with execution result
   */
  execute(node: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult>;

  /**
   * Validate node configuration
   * Called before execution to ensure node is properly configured
   * @param node - The node configuration
   * @returns true if valid, throws error otherwise
   */
  validate(node: NodeConfig): boolean;
}
