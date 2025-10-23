/**
 * BFSI Module
 * Provides BFSI-specific services and executors
 *
 * This module is responsible for:
 * - CSV file upload and management
 * - PII anonymization
 * - AI content generation
 * - Compliance checking
 * - Audit trail logging
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { FileUploadService } from './services/file-upload.service';
import { AnonymizationService } from './services/anonymization.service';
import { AIContentService } from './services/ai-content.service';
import { ComplianceService } from './services/compliance.service';
import { AuditService } from './services/audit.service';

// Executors
import { CSVUploadNodeExecutor } from './executors/csv-upload.executor';
import { AIContentGeneratorNodeExecutor } from './executors/ai-content-generator.executor';
import { ComplianceCheckerNodeExecutor } from './executors/compliance-checker.executor';
import { ComplianceReportNodeExecutor } from './executors/compliance-report.executor';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

// Controller
import { BfsiController } from './bfsi.controller';

@Module({
  imports: [
    ConfigModule, // For environment variables
    PrismaModule, // For database access
  ],
  controllers: [BfsiController],
  providers: [
    // Services
    FileUploadService,
    AnonymizationService,
    AIContentService,
    ComplianceService,
    AuditService,

    // Executors
    CSVUploadNodeExecutor,
    AIContentGeneratorNodeExecutor,
    ComplianceCheckerNodeExecutor,
    ComplianceReportNodeExecutor,
  ],
  exports: [
    // Export services for use in other modules
    FileUploadService,
    AnonymizationService,
    AIContentService,
    ComplianceService,
    AuditService,

    // Export executors for registration in ExecutorFactory
    CSVUploadNodeExecutor,
    AIContentGeneratorNodeExecutor,
    ComplianceCheckerNodeExecutor,
    ComplianceReportNodeExecutor,
  ],
})
export class BfsiModule {}
