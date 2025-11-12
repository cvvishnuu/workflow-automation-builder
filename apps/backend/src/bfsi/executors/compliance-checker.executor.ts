/**
 * Compliance Checker Node Executor
 * Validates content against BFSI regulations and logs to audit trail
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles compliance checking
 * - Dependency Injection: Receives services via constructor
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from '../../nodes/executors/base-node.executor';
import {
  ExecutionContext,
  NodeExecutionResult,
} from '../../nodes/executors/node-executor.interface';
import { ComplianceCheckerNodeConfig, NodeConfig } from '@workflow/shared-types';
import { ComplianceService } from '../services/compliance.service';
import { AuditService } from '../services/audit.service';
import { ComplianceRAGService } from '../../compliance-rag/compliance-rag.service';

@Injectable()
export class ComplianceCheckerNodeExecutor extends BaseNodeExecutor {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly auditService: AuditService,
    private readonly complianceRAGService: ComplianceRAGService
  ) {
    super();
  }

  protected async executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = (node as ComplianceCheckerNodeConfig).config;

    try {
      // Get rows from previous node output
      const previousOutput = context.previousNodeOutput as any;
      const inputRows = previousOutput?.rows;

      if (!Array.isArray(inputRows)) {
        return {
          success: false,
          error:
            'Input must contain an array of rows. Connect this node after AI Content Generator.',
        };
      }

      if (inputRows.length === 0) {
        return {
          success: true,
          output: {
            rows: [],
            checkedCount: 0,
            passedCount: 0,
            failedCount: 0,
            message: 'No rows to check',
          },
        };
      }

      // Get userId and executionId from context
      if (!context.userId) {
        return {
          success: false,
          error: 'User context not available. Authentication required.',
        };
      }

      const userId = context.userId;
      const executionId = context.executionId;

      const processedRows: any[] = [];
      let passedCount = 0;
      let failedCount = 0;
      let totalRiskScore = 0;
      let criticalViolations = 0;

      // Check each row for compliance
      for (const row of inputRows) {
        try {
          // Get content from the specified field (default to 'generated_content')
          const fieldToCheck = config.contentField || 'generated_content';
          let content = row[fieldToCheck];

          if (!content || typeof content !== 'string') {
            // Try to find any content field if the specified one doesn't exist
            const possibleFields = ['generated_content', 'content', 'message', 'text'];
            let foundContent: string | null = null;

            for (const field of possibleFields) {
              if (row[field] && typeof row[field] === 'string') {
                foundContent = row[field];
                break;
              }
            }

            if (!foundContent) {
              processedRows.push({
                ...row,
                compliance_status: 'skipped',
                compliance_error: `Field "${fieldToCheck}" not found or not a string. Available fields: ${JSON.stringify(Object.keys(row))}`,
              });
              continue;
            }

            // Use the found content
            content = foundContent;
          }

          // Perform compliance check using RAG (falls back to basic check if Gemini not configured)
          const complianceResult = await this.complianceRAGService.checkComplianceWithRAG({
            content,
            contentType: config.contentType,
            productCategory: config.productCategory,
          });

          // Save to audit trail if enabled
          if (config.saveToAudit !== false) {
            await this.auditService.logComplianceCheck(
              userId,
              config.contentType,
              content,
              complianceResult,
              undefined, // fileUploadId
              executionId
            );
          }

          // Determine if row passes based on minPassingScore
          const minScore = config.minPassingScore || 50;
          const passes = complianceResult.isPassed && complianceResult.riskScore < minScore;

          if (passes) {
            passedCount++;
          } else {
            failedCount++;
          }

          totalRiskScore += complianceResult.riskScore;

          // Count critical violations
          const hasCritical = complianceResult.flaggedTerms.some((t) => t.severity === 'critical');
          if (hasCritical) {
            criticalViolations++;
          }

          // Add compliance data to row
          processedRows.push({
            ...row,
            compliance_status: passes ? 'passed' : 'failed',
            compliance_risk_score: complianceResult.riskScore,
            compliance_flagged_count: complianceResult.flaggedTerms.length,
            compliance_flagged_terms: complianceResult.flaggedTerms.map((t) => ({
              term: t.term,
              severity: t.severity,
              reason: t.reason,
            })),
            compliance_suggestions: complianceResult.suggestions,
            compliance_summary: complianceResult.summary,
          });
        } catch (error) {
          processedRows.push({
            ...row,
            compliance_status: 'error',
            compliance_error: error.message,
          });
          failedCount++;
        }
      }

      const averageRiskScore =
        inputRows.length > 0 ? Math.round(totalRiskScore / inputRows.length) : 0;

      // Check if we should fail the workflow
      const shouldFailWorkflow =
        config.failOnViolation && (criticalViolations > 0 || failedCount > 0);

      if (shouldFailWorkflow) {
        return {
          success: false,
          error: `Compliance check failed: ${failedCount} row(s) failed, ${criticalViolations} critical violation(s) found`,
          output: {
            rows: processedRows,
            checkedCount: inputRows.length,
            passedCount,
            failedCount,
            averageRiskScore,
            criticalViolations,
          },
        };
      }

      return {
        success: true,
        output: {
          rows: processedRows,
          checkedCount: inputRows.length,
          passedCount,
          failedCount,
          passRate: inputRows.length > 0 ? Math.round((passedCount / inputRows.length) * 100) : 0,
          averageRiskScore,
          criticalViolations,
          complianceGuidelines: this.complianceService.getComplianceGuidelines(config.contentType),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Compliance check execution failed: ${error.message}`,
      };
    }
  }

  validate(node: NodeConfig): boolean {
    super.validate(node);

    const config = (node as ComplianceCheckerNodeConfig).config;

    if (!config.contentField) {
      throw new Error('Content field is required');
    }

    if (!config.contentType) {
      throw new Error('Content type is required');
    }

    return true;
  }
}
