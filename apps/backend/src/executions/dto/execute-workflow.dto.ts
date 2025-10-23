/**
 * Data Transfer Object for executing a workflow
 */

import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteWorkflowDto {
  @ApiProperty({
    description: 'ID of the workflow to execute',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiProperty({
    description: 'Input data for the workflow execution',
    required: false,
    example: { userId: 123, action: 'process' },
  })
  @IsOptional()
  input?: unknown;
}
