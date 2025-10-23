/**
 * AI Content Generator Node Executor
 * Generates marketing content using AI for each row in CSV data
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles AI content generation
 * - Dependency Injection: Receives services via constructor
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from '../../nodes/executors/base-node.executor';
import {
  ExecutionContext,
  NodeExecutionResult,
} from '../../nodes/executors/node-executor.interface';
import { AIContentGeneratorNodeConfig, NodeConfig } from '@workflow/shared-types';
import { AIContentService } from '../services/ai-content.service';

@Injectable()
export class AIContentGeneratorNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly aiContentService: AIContentService) {
    super();
  }

  protected async executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = (node as AIContentGeneratorNodeConfig).config;

    try {
      // Get rows from previous node output (typically CSV Upload node)
      const previousOutput = context.previousNodeOutput as any;
      const inputRows = previousOutput?.rows;

      if (!Array.isArray(inputRows)) {
        return {
          success: false,
          error:
            'Input must contain an array of rows. Connect this node after CSV Upload node.',
        };
      }

      if (inputRows.length === 0) {
        return {
          success: true,
          output: {
            rows: [],
            generatedCount: 0,
            message: 'No rows to process',
          },
        };
      }

      // Process each row and generate content
      const processedRows: any[] = [];
      let successCount = 0;
      let failureCount = 0;
      let totalTokens = 0;

      for (const row of inputRows) {
        try {
          // Build variables from row data
          const variables: Record<string, string> = {};

          if (config.variableFields && config.variableFields.length > 0) {
            for (const field of config.variableFields) {
              if (row[field] !== undefined) {
                variables[field] = String(row[field]);
              }
            }
          }

          // Build context from row (optional)
          let contextString = config.contextTemplate || '';
          for (const [key, value] of Object.entries(row)) {
            contextString = contextString.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
              String(value)
            );
          }

          // Generate content
          const result = await this.aiContentService.generateContent({
            contentType: config.contentType,
            purpose: config.purpose,
            targetAudience: config.targetAudience,
            keyPoints: config.keyPoints,
            tone: config.tone,
            maxLength: config.maxLength,
            variables,
            context: contextString || undefined,
          });

          // Add generated content to row
          processedRows.push({
            ...row,
            generated_content: result.content,
            generated_at: result.generatedAt,
            content_type: result.contentType,
            tokens_used: result.tokens,
          });

          totalTokens += result.tokens;
          successCount++;
        } catch (error) {
          // Add row with error marker
          processedRows.push({
            ...row,
            generated_content: '[GENERATION_FAILED]',
            generation_error: error.message,
          });
          failureCount++;
        }
      }

      // Validate generated content
      const warnings: string[] = [];
      for (const row of processedRows) {
        if (row.generated_content && row.generated_content !== '[GENERATION_FAILED]') {
          const validation = this.aiContentService.validateContent(
            row.generated_content
          );
          if (!validation.isValid) {
            warnings.push(
              `Row with content starting "${row.generated_content.substring(0, 30)}..." has warnings: ${validation.warnings.join(', ')}`
            );
          }
        }
      }

      return {
        success: true,
        output: {
          rows: processedRows,
          generatedCount: successCount,
          failedCount: failureCount,
          totalRows: inputRows.length,
          totalTokensUsed: totalTokens,
          averageTokensPerRow:
            successCount > 0 ? Math.round(totalTokens / successCount) : 0,
          contentType: config.contentType,
          warnings: warnings.length > 0 ? warnings.slice(0, 5) : undefined, // First 5 warnings
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `AI content generation failed: ${error.message}`,
      };
    }
  }

  validate(node: NodeConfig): boolean {
    super.validate(node);

    const config = (node as AIContentGeneratorNodeConfig).config;

    if (!config.contentType) {
      throw new Error('Content type is required');
    }

    if (!config.purpose) {
      throw new Error('Purpose is required');
    }

    if (!config.targetAudience) {
      throw new Error('Target audience is required');
    }

    if (!config.keyPoints || config.keyPoints.length === 0) {
      throw new Error('At least one key point is required');
    }

    if (!config.tone) {
      throw new Error('Tone is required');
    }

    return true;
  }
}
