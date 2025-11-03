/**
 * Webhook Service
 * Handles sending HTTP callbacks for execution status updates
 * Implements retry logic, HMAC signing, and error handling
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

export interface WebhookPayload {
  event: string; // "execution.started" | "execution.completed" | "execution.failed" | "execution.pending_approval"
  executionId: string;
  workflowId: string;
  timestamp: string; // ISO 8601
  data: any; // Event-specific data
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[];
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

  /**
   * Send webhook notification with retry logic
   */
  async sendWebhook(
    config: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<boolean> {
    // Check if this event is subscribed
    if (!config.events.includes(payload.event)) {
      this.logger.debug(
        `Skipping webhook for event ${payload.event} (not subscribed)`,
      );
      return true;
    }

    this.logger.log(
      `Sending webhook for event ${payload.event} to ${config.url}`,
    );

    // Try sending with retries
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const success = await this.sendWebhookRequest(config, payload);

        if (success) {
          this.logger.log(
            `Webhook delivered successfully on attempt ${attempt + 1}`,
          );
          return true;
        }
      } catch (error) {
        this.logger.warn(
          `Webhook delivery failed on attempt ${attempt + 1}: ${error.message}`,
        );
      }

      // Wait before retrying (except on last attempt)
      if (attempt < this.MAX_RETRIES - 1) {
        await this.delay(this.RETRY_DELAYS[attempt]);
      }
    }

    this.logger.error(
      `Webhook delivery failed after ${this.MAX_RETRIES} attempts`,
    );
    return false;
  }

  /**
   * Send a single webhook HTTP request
   */
  private async sendWebhookRequest(
    config: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<boolean> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Workflow-Automation-Platform/1.0',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Execution-Id': payload.executionId,
    };

    // Add HMAC signature if secret is provided
    if (config.secret) {
      const signature = this.generateSignature(body, config.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      // Consider 2xx status codes as success
      if (response.ok) {
        return true;
      }

      this.logger.warn(
        `Webhook returned non-2xx status: ${response.status} ${response.statusText}`,
      );
      return false;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.warn('Webhook request timed out after 10 seconds');
      } else {
        this.logger.warn(`Webhook request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   * Customers can verify this signature to ensure webhook authenticity
   */
  private generateSignature(body: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create webhook payload for execution.started event
   */
  createExecutionStartedPayload(execution: any): WebhookPayload {
    return {
      event: 'execution.started',
      executionId: execution.id,
      workflowId: execution.workflowId,
      timestamp: new Date().toISOString(),
      data: {
        status: execution.status,
        startedAt: execution.startedAt,
      },
    };
  }

  /**
   * Create webhook payload for execution.completed event
   */
  createExecutionCompletedPayload(execution: any): WebhookPayload {
    return {
      event: 'execution.completed',
      executionId: execution.id,
      workflowId: execution.workflowId,
      timestamp: new Date().toISOString(),
      data: {
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        output: execution.output,
      },
    };
  }

  /**
   * Create webhook payload for execution.failed event
   */
  createExecutionFailedPayload(execution: any): WebhookPayload {
    return {
      event: 'execution.failed',
      executionId: execution.id,
      workflowId: execution.workflowId,
      timestamp: new Date().toISOString(),
      data: {
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        error: execution.error,
      },
    };
  }

  /**
   * Create webhook payload for execution.pending_approval event
   */
  createExecutionPendingApprovalPayload(execution: any): WebhookPayload {
    return {
      event: 'execution.pending_approval',
      executionId: execution.id,
      workflowId: execution.workflowId,
      timestamp: new Date().toISOString(),
      data: {
        status: execution.status,
        startedAt: execution.startedAt,
        approvalStatus: execution.approvalStatus,
      },
    };
  }
}
