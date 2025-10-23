/**
 * Compliance Report Node Executor
 * Generates comprehensive compliance reports
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles report generation
 * - Dependency Injection: Receives services via constructor
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from '../../nodes/executors/base-node.executor';
import {
  ExecutionContext,
  NodeExecutionResult,
} from '../../nodes/executors/node-executor.interface';
import { ComplianceReportNodeConfig, NodeConfig } from '@workflow/shared-types';
import { AuditService } from '../services/audit.service';

@Injectable()
export class ComplianceReportNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly auditService: AuditService) {
    super();
  }

  protected async executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = (node as ComplianceReportNodeConfig).config;

    try {
      // Get userId from context
      if (!context.userId) {
        return {
          success: false,
          error: 'User context not available. Authentication required.',
        };
      }

      const userId = context.userId;

      // Determine date range
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (config.dateRange) {
        if (config.dateRange.startDate) {
          startDate = new Date(config.dateRange.startDate);
        }
        if (config.dateRange.endDate) {
          endDate = new Date(config.dateRange.endDate);
        }
      }

      // If no date range, use execution data if available
      if (!startDate && !endDate) {
        // Use current execution timeframe
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Start of day
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of day
      }

      // Generate compliance report
      const report = await this.auditService.generateComplianceReport(
        userId,
        startDate!,
        endDate!
      );

      // Format report based on requested format
      let formattedReport: any;

      switch (config.reportFormat) {
        case 'json':
          formattedReport = this.formatAsJSON(report, config);
          break;

        case 'html':
          formattedReport = this.formatAsHTML(report, config);
          break;

        case 'csv':
          formattedReport = this.formatAsCSV(report, config);
          break;

        case 'pdf':
          // For MVP, return HTML that can be converted to PDF by frontend
          formattedReport = this.formatAsHTML(report, config);
          break;

        default:
          formattedReport = this.formatAsJSON(report, config);
      }

      return {
        success: true,
        output: {
          reportFormat: config.reportFormat,
          report: formattedReport,
          summary: report.summary,
          generatedAt: new Date(),
          dateRange: {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Compliance report generation failed: ${error.message}`,
      };
    }
  }

  /**
   * Format report as JSON
   */
  private formatAsJSON(report: any, config: ComplianceReportNodeConfig['config']): any {
    const result: any = {};

    if (config.includeStatistics !== false) {
      result.statistics = report.summary;
    }

    if (config.includeFailedOnly) {
      result.failedChecks = report.failedChecks;
    } else {
      result.timeline = report.timeline;
      result.failedChecks = report.failedChecks;
    }

    return result;
  }

  /**
   * Format report as HTML
   */
  private formatAsHTML(report: any, config: ComplianceReportNodeConfig['config']): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .stat { display: inline-block; margin-right: 30px; }
    .stat-label { font-weight: bold; }
    .passed { color: green; }
    .failed { color: red; }
    .high-risk { background-color: #ffebee; }
  </style>
</head>
<body>
  <h1>BFSI Compliance Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
`;

    if (config.includeStatistics !== false) {
      const stats = report.summary;
      html += `
  <div class="summary">
    <h2>Summary Statistics</h2>
    <div class="stat">
      <span class="stat-label">Total Checks:</span> ${stats.totalChecks}
    </div>
    <div class="stat">
      <span class="stat-label passed">Passed:</span> ${stats.passedChecks}
    </div>
    <div class="stat">
      <span class="stat-label failed">Failed:</span> ${stats.failedChecks}
    </div>
    <div class="stat">
      <span class="stat-label">Pass Rate:</span> ${stats.passRate}%
    </div>
    <div class="stat">
      <span class="stat-label">Avg Risk Score:</span> ${stats.averageRiskScore}
    </div>
    <div class="stat">
      <span class="stat-label">High Risk:</span> ${stats.highRiskChecks}
    </div>
    <div class="stat">
      <span class="stat-label">Critical Issues:</span> ${stats.criticalIssues}
    </div>
  </div>
`;

      if (stats.commonFlaggedTerms.length > 0) {
        html += `
  <h2>Most Common Flagged Terms</h2>
  <table>
    <tr>
      <th>Term</th>
      <th>Occurrences</th>
    </tr>
`;
        stats.commonFlaggedTerms.forEach((item: any) => {
          html += `
    <tr>
      <td>${item.term}</td>
      <td>${item.count}</td>
    </tr>
`;
        });
        html += `
  </table>
`;
      }
    }

    if (report.failedChecks.length > 0) {
      html += `
  <h2>Failed Compliance Checks</h2>
  <table>
    <tr>
      <th>Date</th>
      <th>Content Type</th>
      <th>Risk Score</th>
      <th>Flagged Terms</th>
    </tr>
`;
      report.failedChecks.forEach((check: any) => {
        const riskClass = check.riskScore > 70 ? 'high-risk' : '';
        html += `
    <tr class="${riskClass}">
      <td>${new Date(check.checkedAt).toLocaleString()}</td>
      <td>${check.contentType}</td>
      <td>${check.riskScore}</td>
      <td>${check.flaggedCount}</td>
    </tr>
`;
      });
      html += `
  </table>
`;
    }

    if (!config.includeFailedOnly && report.timeline.length > 0) {
      html += `
  <h2>Compliance Timeline</h2>
  <table>
    <tr>
      <th>Date</th>
      <th>Total Checks</th>
      <th>Passed</th>
      <th>Failed</th>
      <th>Avg Risk Score</th>
    </tr>
`;
      report.timeline.forEach((day: any) => {
        html += `
    <tr>
      <td>${day.date}</td>
      <td>${day.totalChecks}</td>
      <td class="passed">${day.passedChecks}</td>
      <td class="failed">${day.failedChecks}</td>
      <td>${day.averageRiskScore}</td>
    </tr>
`;
      });
      html += `
  </table>
`;
    }

    html += `
</body>
</html>
`;

    return html;
  }

  /**
   * Format report as CSV
   */
  private formatAsCSV(report: any, config: ComplianceReportNodeConfig['config']): string {
    let csv = '';

    if (config.includeFailedOnly) {
      // CSV of failed checks
      csv = 'Date,Content Type,Risk Score,Flagged Terms\n';
      report.failedChecks.forEach((check: any) => {
        csv += `${new Date(check.checkedAt).toISOString()},${check.contentType},${check.riskScore},${check.flaggedCount}\n`;
      });
    } else {
      // CSV of timeline
      csv = 'Date,Total Checks,Passed,Failed,Avg Risk Score\n';
      report.timeline.forEach((day: any) => {
        csv += `${day.date},${day.totalChecks},${day.passedChecks},${day.failedChecks},${day.averageRiskScore}\n`;
      });
    }

    return csv;
  }

  validate(node: NodeConfig): boolean {
    super.validate(node);

    const config = (node as ComplianceReportNodeConfig).config;

    if (!config.reportFormat) {
      throw new Error('Report format is required');
    }

    const validFormats = ['json', 'html', 'pdf', 'csv'];
    if (!validFormats.includes(config.reportFormat)) {
      throw new Error(
        `Invalid report format. Must be one of: ${validFormats.join(', ')}`
      );
    }

    return true;
  }
}
