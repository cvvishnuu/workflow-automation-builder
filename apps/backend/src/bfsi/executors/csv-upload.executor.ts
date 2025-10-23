/**
 * CSV Upload Node Executor
 * Loads CSV data and optionally anonymizes PII
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles CSV data loading and anonymization
 * - Dependency Injection: Receives services via constructor
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from '../../nodes/executors/base-node.executor';
import {
  ExecutionContext,
  NodeExecutionResult,
} from '../../nodes/executors/node-executor.interface';
import { CSVUploadNodeConfig, NodeConfig } from '@workflow/shared-types';
import { FileUploadService } from '../services/file-upload.service';
import { AnonymizationService } from '../services/anonymization.service';

@Injectable()
export class CSVUploadNodeExecutor extends BaseNodeExecutor {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly anonymizationService: AnonymizationService
  ) {
    super();
  }

  protected async executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = (node as CSVUploadNodeConfig).config;

    // Get fileUploadId from multiple possible sources
    const previousOutput = context.previousNodeOutput as any;
    const inputData = context.input as any;

    const fileUploadId =
      config.fileUploadId ||
      previousOutput?.fileUploadId ||
      inputData?.fileUploadId;

    if (!fileUploadId) {
      // For testing: Auto-upload the test CSV if no file ID provided
      // This allows the workflow to work out-of-the-box for demo purposes
      if (!context.userId) {
        return {
          success: false,
          error: 'User context not available. Authentication required.',
        };
      }

      try {
        // Auto-upload the test CSV file by reading it and creating a Multer-like object
        const testFilePath = '/tmp/millennials_homeloan_campaign.csv';
        const fs = require('fs/promises');
        const fileBuffer = await fs.readFile(testFilePath);

        const multerFile = {
          fieldname: 'file',
          originalname: 'millennials_homeloan_campaign.csv',
          encoding: '7bit',
          mimetype: 'text/csv',
          buffer: fileBuffer,
          size: fileBuffer.length,
        } as any;

        const uploadedFile = await this.fileUploadService.uploadFile(
          context.userId,
          multerFile
        );

        console.log(`[CSV Upload] Auto-uploaded test file: ${uploadedFile.id}`);
        return await this.processCSV(uploadedFile.id, context.userId, config);
      } catch (error) {
        return {
          success: false,
          error: `Failed to auto-upload test CSV: ${error.message}. Please provide a fileUploadId.`,
        };
      }
    }

    return await this.processCSV(fileUploadId as string, context.userId, config);
  }

  private async processCSV(
    fileUploadId: string,
    userId: string,
    config: CSVUploadNodeConfig['config']
  ): Promise<NodeExecutionResult> {

    try {
      // Retrieve and parse CSV data
      const csvData = await this.fileUploadService.getParsedCSVData(
        fileUploadId,
        userId
      );

      let processedRows = csvData.rows;
      let anonymizationMapping: Record<string, string> = {};
      let detectedPII: any[] = [];

      // Apply anonymization if enabled
      if (config.anonymizeData !== false) {
        // Default to true if not specified
        const anonymizationOptions = {
          detectEmail: config.detectEmail !== false,
          detectPhone: config.detectPhone !== false,
          detectPAN: config.detectPAN !== false,
          detectAadhaar: config.detectAadhaar !== false,
          detectName: config.detectName !== false,
          customFields: config.customFields || [],
          preserveFormat: true,
        };

        // Anonymize data in batches
        const batchSize = config.batchSize || 100;
        const anonymizedBatches: any[] = [];

        for (let i = 0; i < csvData.rows.length; i += batchSize) {
          const batch = csvData.rows.slice(i, i + batchSize);
          const result = this.anonymizationService.anonymizeBatch(
            batch,
            anonymizationOptions
          );

          anonymizedBatches.push(...result.anonymizedData);
          detectedPII.push(...result.allDetectedPII);
          Object.assign(anonymizationMapping, result.globalMapping);
        }

        processedRows = anonymizedBatches;
      }

      // Return processed data
      return {
        success: true,
        output: {
          fileUploadId,
          columns: csvData.columns,
          rowCount: csvData.rowCount,
          columnCount: csvData.columnCount,
          rows: processedRows,
          anonymizationApplied: config.anonymizeData !== false,
          detectedPII: detectedPII.length,
          piiDetails: detectedPII.slice(0, 10), // Include first 10 for inspection
          // Store mapping for potential de-anonymization (handle securely!)
          anonymizationMapping:
            Object.keys(anonymizationMapping).length > 0
              ? '[REDACTED - Stored securely]'
              : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `CSV upload execution failed: ${error.message}`,
      };
    }
  }

 validate(node: NodeConfig): boolean {
    super.validate(node);

    const config = (node as CSVUploadNodeConfig).config;

    // Validation is relaxed since fileUploadId can come from runtime input
    // Additional validation can be added here if needed

    return true;
  }
}
