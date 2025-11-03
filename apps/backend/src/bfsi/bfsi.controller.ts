/**
 * BFSI Controller
 * API endpoints for BFSI-specific features
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FileUploadService } from './services/file-upload.service';
import { AuditService } from './services/audit.service';
import { FileUploadResponseDto } from './dto/file-upload.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { User, AuthenticatedUser } from '../auth/user.decorator';

type MulterFile = Express.Multer.File;

@ApiTags('BFSI')
@ApiBearerAuth()
@Controller('bfsi')
@UseGuards(ClerkAuthGuard)
export class BfsiController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Upload CSV file
   */
  @Post('files/upload')
  @ApiOperation({ summary: 'Upload CSV file for workflow processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @User() user: AuthenticatedUser,
    @UploadedFile() file: MulterFile
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.fileUploadService.uploadFile(user.userId, file);

    return result;
  }

  /**
   * Get file metadata
   */
  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get file metadata' })
  async getFileMetadata(
    @User() user: AuthenticatedUser,
    @Param('fileId') fileId: string
  ) {
    const fileData = await this.fileUploadService.getParsedCSVData(fileId, user.userId);

    return {
      columns: fileData.columns,
      rowCount: fileData.rowCount,
      columnCount: fileData.columnCount,
      preview: fileData.rows.slice(0, 5), // First 5 rows as preview
    };
  }

  /**
   * Delete uploaded file
   */
  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete uploaded file' })
  async deleteFile(
    @User() user: AuthenticatedUser,
    @Param('fileId') fileId: string
  ) {
    await this.fileUploadService.deleteFile(fileId, user.userId);

    return { message: 'File deleted successfully' };
  }

  /**
   * Get compliance statistics
   */
  @Get('compliance/statistics')
  @ApiOperation({ summary: 'Get compliance statistics for user' })
  async getComplianceStatistics(
    @User() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const statistics = await this.auditService.getStatistics(user.userId, start, end);

    return statistics;
  }

  /**
   * Get compliance checks for execution
   */
  @Get('compliance/execution/:executionId')
  @ApiOperation({ summary: 'Get compliance checks for workflow execution' })
  async getExecutionCompliance(
    @User() user: AuthenticatedUser,
    @Param('executionId') executionId: string
  ) {
    const checks = await this.auditService.getChecksByExecution(
      executionId,
      user.userId
    );

    return checks;
  }

  /**
   * Generate compliance report
   */
  @Post('compliance/report')
  @ApiOperation({ summary: 'Generate compliance report' })
  async generateComplianceReport(
    @User() user: AuthenticatedUser,
    @Body() body: { startDate: string; endDate: string }
  ) {
    const report = await this.auditService.generateComplianceReport(
      user.userId,
      new Date(body.startDate),
      new Date(body.endDate)
    );

    return report;
  }

  /**
   * Get workflow templates
   */
  @Get('templates')
  @ApiOperation({ summary: 'Get available workflow templates' })
  async getTemplates(@Query('category') category?: string) {
    // For MVP, return hardcoded templates
    // In production, this would query the database
    const templates = [
      {
        id: 'bfsi-marketing-campaign',
        name: 'BFSI Marketing Campaign with Compliance',
        description:
          'Upload customer CSV, generate AI-powered marketing content, validate compliance, and send approved messages',
        category: 'Industry-Specific',
        icon: 'shield-check',
        version: '1.0.0',
      },
    ];

    if (category) {
      return templates.filter((t) => t.category === category);
    }

    return templates;
  }

  /**
   * Get template by ID
   */
  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get workflow template definition' })
  async getTemplate(@Param('templateId') templateId: string) {
    // For MVP, return hardcoded template
    // In production, this would query the database
    if (templateId === 'bfsi-marketing-campaign') {
      return {
        id: 'bfsi-marketing-campaign',
        name: 'BFSI Marketing Campaign with Compliance',
        description:
          'Complete BFSI-compliant marketing workflow with CSV upload, AI content generation, and compliance validation',
        category: 'Industry-Specific',
        icon: 'shield-check',
        version: '1.0.0',
        definition: {
          nodes: [],
          edges: [],
        }, // Will be populated in next step
      };
    }

    throw new BadRequestException('Template not found');
  }
}
