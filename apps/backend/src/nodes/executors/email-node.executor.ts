/**
 * Email Node Executor
 * Sends emails using SendGrid
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, ExecutionResult } from './node-executor.interface';
import { EmailNodeConfig } from '@workflow/shared-types';
import * as sgMail from '@sendgrid/mail';
import { CredentialsService } from '../../integrations/credentials/credentials.service';

@Injectable()
export class EmailNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly credentialsService: CredentialsService) {
    super();
  }

  /**
   * Execute the email node
   */
  async execute(node: EmailNodeConfig, context: ExecutionContext): Promise<ExecutionResult> {
    try {
      const { config } = node;

      // Get credentials
      const credentialData = await this.credentialsService.getCredentialData(
        config.credentialId,
        context.userId
      );

      // Validate credentials
      if (!credentialData.apiKey) {
        return {
          success: false,
          error: 'SendGrid API key not found in credentials',
        };
      }

      // Initialize SendGrid with API key
      sgMail.setApiKey(credentialData.apiKey);

      // Replace variables in email fields
      const to = this.replaceVariables(config.to, context);
      const subject = this.replaceVariables(config.subject, context);
      const body = this.replaceVariables(config.body, context);
      const from = config.from
        ? this.replaceVariables(config.from, context)
        : credentialData.fromEmail;
      const fromName = config.fromName
        ? this.replaceVariables(config.fromName, context)
        : credentialData.fromName;

      // Parse recipients (support comma-separated emails)
      const recipients = to
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      if (recipients.length === 0) {
        return {
          success: false,
          error: 'No valid recipients found',
        };
      }

      // Build email message
      const msg: sgMail.MailDataRequired = {
        to: recipients,
        from: {
          email: from,
          name: fromName,
        },
        subject,
        html: body,
      };

      // Add attachments if provided
      if (config.attachments && config.attachments.length > 0) {
        msg.attachments = config.attachments.map((att) => ({
          content: att.content,
          filename: att.filename,
          type: 'application/octet-stream',
          disposition: 'attachment',
        }));
      }

      // Send email
      const response = await sgMail.send(msg);

      return {
        success: true,
        output: {
          messageId: response[0].headers['x-message-id'],
          statusCode: response[0].statusCode,
          recipients,
          subject,
          sentAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Email node execution error:', error);

      // Handle SendGrid-specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as any;
        return {
          success: false,
          error: `SendGrid error: ${sgError.response?.body?.errors?.[0]?.message || sgError.message}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }
}
