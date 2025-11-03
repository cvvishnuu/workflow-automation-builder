/**
 * Webhook Listener Service
 * Listens to execution events and sends webhooks
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebhookService, WebhookConfig } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookListenerService {
  private readonly logger = new Logger(WebhookListenerService.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle execution.started event
   */
  @OnEvent('execution.started')
  async handleExecutionStarted(payload: any) {
    this.logger.log(`Execution started: ${payload.executionId}`);
    await this.sendWebhookForExecution(payload.executionId, 'execution.started');
  }

  /**
   * Handle execution.completed event
   */
  @OnEvent('execution.completed')
  async handleExecutionCompleted(payload: any) {
    this.logger.log(`Execution completed: ${payload.executionId}`);
    await this.sendWebhookForExecution(
      payload.executionId,
      'execution.completed',
    );
  }

  /**
   * Handle execution.failed event
   */
  @OnEvent('execution.failed')
  async handleExecutionFailed(payload: any) {
    this.logger.log(`Execution failed: ${payload.executionId}`);
    await this.sendWebhookForExecution(payload.executionId, 'execution.failed');
  }

  /**
   * Handle execution.pending_approval event
   */
  @OnEvent('execution.pending_approval')
  async handleExecutionPendingApproval(payload: any) {
    this.logger.log(`Execution pending approval: ${payload.executionId}`);
    await this.sendWebhookForExecution(
      payload.executionId,
      'execution.pending_approval',
    );
  }

  /**
   * Send webhook for a specific execution event
   */
  private async sendWebhookForExecution(
    executionId: string,
    event: string,
  ): Promise<void> {
    try {
      // Get execution with API key and workflow
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: {
          apiKey: true,
        },
      });

      if (!execution) {
        this.logger.warn(`Execution ${executionId} not found`);
        return;
      }

      // Only send webhooks for API key-triggered executions
      if (!execution.apiKey) {
        this.logger.debug(
          `Execution ${executionId} not triggered by API key, skipping webhook`,
        );
        return;
      }

      // Check if webhook is configured
      if (!execution.apiKey.webhookUrl) {
        this.logger.debug(
          `No webhook URL configured for API key ${execution.apiKey.id}`,
        );
        return;
      }

      // Build webhook config
      const webhookConfig: WebhookConfig = {
        url: execution.apiKey.webhookUrl,
        secret: execution.apiKey.webhookSecret || undefined,
        events: execution.apiKey.webhookEvents
          ? (execution.apiKey.webhookEvents as string[])
          : [],
      };

      // Build webhook payload based on event type
      let webhookPayload;
      switch (event) {
        case 'execution.started':
          webhookPayload =
            this.webhookService.createExecutionStartedPayload(execution);
          break;
        case 'execution.completed':
          webhookPayload =
            this.webhookService.createExecutionCompletedPayload(execution);
          break;
        case 'execution.failed':
          webhookPayload =
            this.webhookService.createExecutionFailedPayload(execution);
          break;
        case 'execution.pending_approval':
          webhookPayload =
            this.webhookService.createExecutionPendingApprovalPayload(execution);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
          return;
      }

      // Send webhook (async, don't block)
      this.webhookService
        .sendWebhook(webhookConfig, webhookPayload)
        .catch((error) => {
          this.logger.error(
            `Failed to send webhook for ${event}: ${error.message}`,
          );
        });
    } catch (error) {
      this.logger.error(
        `Error processing webhook for execution ${executionId}: ${error.message}`,
      );
    }
  }
}
