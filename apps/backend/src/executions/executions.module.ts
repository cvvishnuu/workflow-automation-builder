/**
 * Executions Module
 * Handles workflow execution functionality
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ExecutionsController } from './executions.controller';
import { WorkflowEngineService } from './workflow-engine.service';
import { NodesModule } from '../nodes/nodes.module';

@Module({
  imports: [
    NodesModule, // Import to access ExecutorFactory
    EventEmitterModule.forRoot(), // Add EventEmitter support
  ],
  controllers: [ExecutionsController],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class ExecutionsModule {}
