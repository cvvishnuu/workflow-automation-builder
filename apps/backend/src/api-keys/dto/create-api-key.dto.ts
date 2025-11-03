import { IsString, IsOptional, IsNumber, IsArray, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key', description: 'Friendly name for the API key' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'API key for production environment', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'workflow_bfsi_marketing_template', description: 'ID of the workflow this key can access' })
  @IsString()
  workflowId: string;

  @ApiProperty({ example: 'bfsi-campaign-generator', required: false })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ example: 10000, required: false, default: 10000 })
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({ example: '2026-12-31T23:59:59Z', required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({ example: 'https://your-domain.com/webhooks/workflow-execution', required: false })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({
    example: ['execution.started', 'execution.completed', 'execution.failed', 'execution.pending_approval'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  webhookEvents?: string[];

  @ApiProperty({ example: 'your-webhook-secret-key', required: false })
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}
