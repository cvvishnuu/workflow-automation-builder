import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateApiKeyDto {
  @ApiProperty({ example: 'Updated API Key Name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 20000, required: false })
  @IsNumber()
  @Min(1)
  @Max(1000000)
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'https://your-domain.com/webhooks/workflow-execution', required: false })
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({
    example: ['execution.started', 'execution.completed'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  webhookEvents?: string[];

  @ApiProperty({ example: 'updated-webhook-secret', required: false })
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}
