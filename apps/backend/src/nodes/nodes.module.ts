/**
 * Nodes Module
 * Provides node executor infrastructure
 */

import { Module } from '@nestjs/common';
import { TriggerNodeExecutor } from './executors/trigger-node.executor';
import { HttpRequestNodeExecutor } from './executors/http-request-node.executor';
import { ConditionalNodeExecutor } from './executors/conditional-node.executor';
import { DataTransformNodeExecutor } from './executors/data-transform-node.executor';
import { DelayNodeExecutor } from './executors/delay-node.executor';
import { EmailNodeExecutor } from './executors/email-node.executor';
import { GoogleCalendarNodeExecutor } from './executors/google-calendar-node.executor';
import { WhatsAppNodeExecutor } from './executors/whatsapp-node.executor';
import { ManualApprovalNodeExecutor } from './executors/manual-approval-node.executor';
import { ExecutorFactory } from './executors/executor.factory';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BfsiModule } from '../bfsi/bfsi.module';

@Module({
  imports: [IntegrationsModule, BfsiModule],
  providers: [
    // Individual executors
    TriggerNodeExecutor,
    HttpRequestNodeExecutor,
    ConditionalNodeExecutor,
    DataTransformNodeExecutor,
    DelayNodeExecutor,
    EmailNodeExecutor,
    GoogleCalendarNodeExecutor,
    WhatsAppNodeExecutor,
    ManualApprovalNodeExecutor,

    // Factory
    ExecutorFactory,
  ],
  exports: [ExecutorFactory],
})
export class NodesModule {}
