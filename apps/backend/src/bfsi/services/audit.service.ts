/**
 * Audit Service
 * Logs all compliance checks for regulatory audit trail
 *
 * Features:
 * - Persistent audit logging to database
 * - Compliance check history
 * - Risk score tracking
 * - Searchable audit trail
 * - Report generation
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ComplianceCheckResult, FlaggedTerm } from './compliance.service';

export interface AuditLogEntry {
  id: string;
  userId: string;
  fileUploadId?: string;
  executionId?: string;
  contentType: string;
  originalContent: string;
  riskScore: number;
  flaggedTerms: FlaggedTerm[];
  suggestions: string[];
  complianceRules: string[];
  isPassed: boolean;
  checkedAt: Date;
}

export interface AuditSearchParams {
  userId?: string;
  fileUploadId?: string;
  executionId?: string;
  contentType?: string;
  isPassed?: boolean;
  minRiskScore?: number;
  maxRiskScore?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  passRate: number;
  averageRiskScore: number;
  highRiskChecks: number; // Risk score > 70
  criticalIssues: number;
  commonFlaggedTerms: Array<{ term: string; count: number }>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a compliance check to the database
   */
  async logComplianceCheck(
    userId: string,
    contentType: string,
    originalContent: string,
    complianceResult: ComplianceCheckResult,
    fileUploadId?: string,
    executionId?: string
  ): Promise<AuditLogEntry> {
    const complianceCheck = await this.prisma.complianceCheck.create({
      data: {
        userId,
        fileUploadId,
        executionId,
        contentType,
        originalContent,
        riskScore: complianceResult.riskScore,
        flaggedTerms: complianceResult.flaggedTerms as any,
        suggestions: complianceResult.suggestions as any,
        complianceRules: complianceResult.complianceRules as any,
        isPassed: complianceResult.isPassed,
      },
    });

    return {
      id: complianceCheck.id,
      userId: complianceCheck.userId,
      fileUploadId: complianceCheck.fileUploadId || undefined,
      executionId: complianceCheck.executionId || undefined,
      contentType: complianceCheck.contentType,
      originalContent: complianceCheck.originalContent,
      riskScore: complianceCheck.riskScore,
      flaggedTerms: complianceCheck.flaggedTerms as any,
      suggestions: complianceCheck.suggestions as any,
      complianceRules: complianceCheck.complianceRules as any,
      isPassed: complianceCheck.isPassed,
      checkedAt: complianceCheck.checkedAt,
    };
  }

  /**
   * Retrieve compliance check by ID
   */
  async getComplianceCheck(
    checkId: string,
    userId: string
  ): Promise<AuditLogEntry | null> {
    const check = await this.prisma.complianceCheck.findFirst({
      where: {
        id: checkId,
        userId,
      },
    });

    if (!check) {
      return null;
    }

    return {
      id: check.id,
      userId: check.userId,
      fileUploadId: check.fileUploadId || undefined,
      executionId: check.executionId || undefined,
      contentType: check.contentType,
      originalContent: check.originalContent,
      riskScore: check.riskScore,
      flaggedTerms: check.flaggedTerms as any,
      suggestions: check.suggestions as any,
      complianceRules: check.complianceRules as any,
      isPassed: check.isPassed,
      checkedAt: check.checkedAt,
    };
  }

  /**
   * Search compliance checks with filters
   */
  async searchComplianceChecks(
    params: AuditSearchParams
  ): Promise<AuditLogEntry[]> {
    const where: any = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.fileUploadId) {
      where.fileUploadId = params.fileUploadId;
    }

    if (params.executionId) {
      where.executionId = params.executionId;
    }

    if (params.contentType) {
      where.contentType = params.contentType;
    }

    if (params.isPassed !== undefined) {
      where.isPassed = params.isPassed;
    }

    if (params.minRiskScore !== undefined || params.maxRiskScore !== undefined) {
      where.riskScore = {};
      if (params.minRiskScore !== undefined) {
        where.riskScore.gte = params.minRiskScore;
      }
      if (params.maxRiskScore !== undefined) {
        where.riskScore.lte = params.maxRiskScore;
      }
    }

    if (params.startDate || params.endDate) {
      where.checkedAt = {};
      if (params.startDate) {
        where.checkedAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.checkedAt.lte = params.endDate;
      }
    }

    const checks = await this.prisma.complianceCheck.findMany({
      where,
      orderBy: {
        checkedAt: 'desc',
      },
      take: params.limit || 100,
      skip: params.offset || 0,
    });

    return checks.map((check) => ({
      id: check.id,
      userId: check.userId,
      fileUploadId: check.fileUploadId || undefined,
      executionId: check.executionId || undefined,
      contentType: check.contentType,
      originalContent: check.originalContent,
      riskScore: check.riskScore,
      flaggedTerms: check.flaggedTerms as any,
      suggestions: check.suggestions as any,
      complianceRules: check.complianceRules as any,
      isPassed: check.isPassed,
      checkedAt: check.checkedAt,
    }));
  }

  /**
   * Get compliance statistics for a user
   */
  async getStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditStatistics> {
    const where: any = { userId };

    if (startDate || endDate) {
      where.checkedAt = {};
      if (startDate) {
        where.checkedAt.gte = startDate;
      }
      if (endDate) {
        where.checkedAt.lte = endDate;
      }
    }

    // Get all checks for the user
    const checks = await this.prisma.complianceCheck.findMany({ where });

    const totalChecks = checks.length;
    const passedChecks = checks.filter((c) => c.isPassed).length;
    const failedChecks = totalChecks - passedChecks;
    const passRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

    // Calculate average risk score
    const totalRiskScore = checks.reduce((sum, c) => sum + c.riskScore, 0);
    const averageRiskScore = totalChecks > 0 ? totalRiskScore / totalChecks : 0;

    // Count high risk checks (score > 70)
    const highRiskChecks = checks.filter((c) => c.riskScore > 70).length;

    // Count critical issues
    let criticalIssues = 0;
    for (const check of checks) {
      const flaggedTerms = check.flaggedTerms as any[];
      if (flaggedTerms.some((t: any) => t.severity === 'critical')) {
        criticalIssues++;
      }
    }

    // Find common flagged terms
    const termCounts = new Map<string, number>();
    for (const check of checks) {
      const flaggedTerms = check.flaggedTerms as any[];
      for (const flagged of flaggedTerms) {
        const term = flagged.term.toLowerCase();
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }

    const commonFlaggedTerms = Array.from(termCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      passRate: Math.round(passRate * 10) / 10, // Round to 1 decimal
      averageRiskScore: Math.round(averageRiskScore * 10) / 10,
      highRiskChecks,
      criticalIssues,
      commonFlaggedTerms,
    };
  }

  /**
   * Get checks for a specific file upload
   */
  async getChecksByFileUpload(
    fileUploadId: string,
    userId: string
  ): Promise<AuditLogEntry[]> {
    return this.searchComplianceChecks({
      userId,
      fileUploadId,
    });
  }

  /**
   * Get checks for a specific workflow execution
   */
  async getChecksByExecution(
    executionId: string,
    userId: string
  ): Promise<AuditLogEntry[]> {
    return this.searchComplianceChecks({
      userId,
      executionId,
    });
  }

  /**
   * Delete old audit logs (for data retention compliance)
   */
  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.complianceCheck.deleteMany({
      where: {
        checkedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Generate compliance report for a date range
   */
  async generateComplianceReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: AuditStatistics;
    failedChecks: Array<{
      id: string;
      contentType: string;
      riskScore: number;
      flaggedCount: number;
      checkedAt: Date;
    }>;
    timeline: Array<{
      date: string;
      totalChecks: number;
      passedChecks: number;
      failedChecks: number;
      averageRiskScore: number;
    }>;
  }> {
    const summary = await this.getStatistics(userId, startDate, endDate);

    // Get failed checks
    const failedChecksData = await this.searchComplianceChecks({
      userId,
      isPassed: false,
      startDate,
      endDate,
      limit: 50,
    });

    const failedChecks = failedChecksData.map((check) => ({
      id: check.id,
      contentType: check.contentType,
      riskScore: check.riskScore,
      flaggedCount: check.flaggedTerms.length,
      checkedAt: check.checkedAt,
    }));

    // Generate daily timeline
    const allChecks = await this.searchComplianceChecks({
      userId,
      startDate,
      endDate,
      limit: 10000,
    });

    const dailyStats = new Map<string, any>();

    for (const check of allChecks) {
      const dateKey = check.checkedAt.toISOString().split('T')[0];

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, {
          date: dateKey,
          totalChecks: 0,
          passedChecks: 0,
          failedChecks: 0,
          totalRiskScore: 0,
        });
      }

      const stats = dailyStats.get(dateKey);
      stats.totalChecks++;
      if (check.isPassed) {
        stats.passedChecks++;
      } else {
        stats.failedChecks++;
      }
      stats.totalRiskScore += check.riskScore;
    }

    const timeline = Array.from(dailyStats.values()).map((stats) => ({
      date: stats.date,
      totalChecks: stats.totalChecks,
      passedChecks: stats.passedChecks,
      failedChecks: stats.failedChecks,
      averageRiskScore:
        Math.round((stats.totalRiskScore / stats.totalChecks) * 10) / 10,
    }));

    return {
      summary,
      failedChecks,
      timeline,
    };
  }
}
