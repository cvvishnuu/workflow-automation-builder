/**
 * Data Transfer Object for updating an existing workflow
 * All fields are optional (partial update)
 */

import { IsString, IsOptional, IsObject, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowDefinition } from '@workflow/shared-types';

export class UpdateWorkflowDto {
  @ApiProperty({
    description: 'Updated name of the workflow',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Updated description',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Updated workflow definition',
    required: false,
  })
  @IsObject()
  @IsOptional()
  definition?: WorkflowDefinition;

  @ApiProperty({
    description: 'Whether the workflow is active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
