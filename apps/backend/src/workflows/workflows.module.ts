/**
 * Workflows Module
 * Encapsulates workflow management functionality
 */

import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';

@Module({
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService], // Export for use in other modules (e.g., executions)
})
export class WorkflowsModule {}
