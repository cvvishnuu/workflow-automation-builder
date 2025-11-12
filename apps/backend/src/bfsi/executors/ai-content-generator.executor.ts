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
          error: 'Input must contain an array of rows. Connect this node after CSV Upload node.',
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

      // Get execution input (from public API or manual trigger)
      const executionInput = context.input as any;

      // CRITICAL FIX: When user provides a prompt via API, IGNORE all config values
      // Otherwise Gemini gets confused with mixed home loan prompts and credit card keyPoints
      const hasExecutionInput = executionInput?.prompt || executionInput?.keyPoints;

      const purpose = executionInput?.prompt || config.purpose;
      const targetAudience = hasExecutionInput
        ? executionInput?.targetAudience || ''
        : config.targetAudience;
      const tone = executionInput?.tone || config.tone;
      const keyPoints = hasExecutionInput ? executionInput?.keyPoints || '' : config.keyPoints;

      // Process each row and generate content
      const processedRows: any[] = [];
      let successCount = 0;
      let failureCount = 0;
      let totalTokens = 0;

      for (const row of inputRows) {
        try {
          // Build variables from row data - include ALL row fields for personalization
          const variables: Record<string, string> = {};

          // If variableFields specified, use those
          if (config.variableFields && config.variableFields.length > 0) {
            for (const field of config.variableFields) {
              if (row[field] !== undefined) {
                variables[field] = String(row[field]);
              }
            }
          } else {
            // Otherwise, use all available fields from the row
            for (const [key, value] of Object.entries(row)) {
              if (value !== undefined && value !== null) {
                variables[key] = String(value);
              }
            }
          }

          // Build context from row data - include customer profile for better personalization
          let contextString = config.contextTemplate || '';

          // If no context template, create a default one with customer info
          if (!contextString || contextString.trim() === '') {
            const customerInfo: string[] = [];
            if (row.name) customerInfo.push(`Customer: ${row.name}`);
            if (row.age) customerInfo.push(`Age: ${row.age}`);
            if (row.city) customerInfo.push(`City: ${row.city}`);
            if (row.country) customerInfo.push(`Country: ${row.country}`);
            if (row.occupation) customerInfo.push(`Occupation: ${row.occupation}`);
            if (row.income) customerInfo.push(`Income: ₹${row.income}/month`);
            if (row.creditScore) customerInfo.push(`Credit Score: ${row.creditScore}`);

            contextString =
              customerInfo.length > 0 ? `Customer Profile:\n${customerInfo.join('\n')}` : '';
          } else {
            // Replace variables in context template
            for (const [key, value] of Object.entries(row)) {
              contextString = contextString.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                String(value)
              );
            }
          }

          // Generate content using execution input (if provided) or node config
          const result = await this.aiContentService.generateContent({
            contentType: config.contentType,
            purpose: purpose,
            targetAudience: targetAudience,
            keyPoints: keyPoints,
            tone: tone,
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
          const validation = this.aiContentService.validateContent(row.generated_content);
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
          averageTokensPerRow: successCount > 0 ? Math.round(totalTokens / successCount) : 0,
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

    // Note: purpose, targetAudience, keyPoints, and tone can be provided either in node config
    // or via execution input (from public API), so we don't require them here
    // The executor will use execution input if available, otherwise fall back to config

    return true;
  }
}
