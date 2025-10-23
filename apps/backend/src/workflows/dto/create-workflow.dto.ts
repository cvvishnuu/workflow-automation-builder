/**
 * Data Transfer Object for creating a new workflow
 * Uses class-validator for automatic validation
 */

import { IsString, IsOptional, IsObject, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkflowDefinition } from '@workflow/shared-types';

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'Name of the workflow',
    example: 'Data Processing Pipeline',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Description of what the workflow does',
    example: 'Fetches data from API, transforms it, and sends notifications',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Complete workflow definition including nodes and edges',
    example: {
      nodes: [
        {
          nodeId: 'node1',
          type: 'trigger',
          label: 'Start',
          position: { x: 0, y: 0 },
          config: { triggerType: 'manual' },
        },
      ],
      edges: [],
    },
  })
  @IsObject()
  @IsNotEmpty()
  definition: WorkflowDefinition;
}
