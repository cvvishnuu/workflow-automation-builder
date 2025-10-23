/**
 * WhatsApp Node Executor
 * Sends WhatsApp messages using Twilio
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { WhatsAppNodeConfig, NodeConfig } from '@workflow/shared-types';
import * as twilio from 'twilio';
import { CredentialsService } from '../../integrations/credentials/credentials.service';

@Injectable()
export class WhatsAppNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly credentialsService: CredentialsService) {
    super();
  }

  /**
   * Execute the WhatsApp node
   */
  protected async executeInternal(node: NodeConfig, context: ExecutionContext): Promise<NodeExecutionResult> {
    const whatsappNode = node as WhatsAppNodeConfig;
    try {
      const { config } = whatsappNode;

      // Get credentials
      const credentialData = await this.credentialsService.getCredentialData(
        config.credentialId,
        context.userId
      );

      // Validate credentials
      if (!credentialData.accountSid || !credentialData.authToken || !credentialData.phoneNumber) {
        return {
          success: false,
          error: 'Twilio credentials (accountSid, authToken, phoneNumber) not found',
        };
      }

      // Initialize Twilio client
      const client = twilio.default(credentialData.accountSid, credentialData.authToken);

      // Check if input contains rows array (batch processing)
      const inputData = context.input as any;
      const rows = inputData?.rows;

      if (Array.isArray(rows) && rows.length > 0) {
        // BATCH MODE: Send messages to all customers in rows
        console.log(`[WhatsApp Batch] Processing ${rows.length} rows`);

        const results: any[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (const row of rows) {
          try {
            // Create context for this specific row
            const rowContext = {
              ...context,
              input: {
                customerData: row, // Make row available as customerData
                generatedContent: row.generated_content || '', // Direct access to generated content
                ...row, // Also flatten row data for direct access
              },
            };

            // Replace variables using row-specific context
            const to = this.replaceVariables(config.to, rowContext);
            const message = this.replaceVariables(config.message, rowContext);
            const mediaUrl = config.mediaUrl
              ? this.replaceVariables(config.mediaUrl, rowContext)
              : undefined;

            // Ensure phone numbers are in E.164 format
            const fromNumber = this.formatWhatsAppNumber(credentialData.phoneNumber);
            const toNumber = this.formatWhatsAppNumber(to);

            // Build message options
            const messageOptions: any = {
              from: fromNumber,
              to: toNumber,
              body: message,
            };

            // Add media if provided
            if (mediaUrl) {
              messageOptions.mediaUrl = [mediaUrl];
            }

            // Send message
            const response = await client.messages.create(messageOptions);

            results.push({
              customerId: row.customerId || row.id || 'unknown',
              success: true,
              messageSid: response.sid,
              status: response.status,
              to: response.to,
            });

            successCount++;
            console.log(`[WhatsApp Batch] ✓ Sent to ${row.customerId || row.phone}`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            results.push({
              customerId: row.customerId || row.id || 'unknown',
              success: false,
              error: errorMsg,
            });
            failureCount++;
            console.error(`[WhatsApp Batch] ✗ Failed for ${row.customerId}:`, errorMsg);
          }
        }

        return {
          success: successCount > 0,
          output: {
            batchMode: true,
            totalRows: rows.length,
            successCount,
            failureCount,
            results,
          },
        };
      } else {
        // SINGLE MODE: Send one message (original behavior)
        // Replace variables in message fields
        const to = this.replaceVariables(config.to, context);
        const message = this.replaceVariables(config.message, context);
        const mediaUrl = config.mediaUrl
          ? this.replaceVariables(config.mediaUrl, context)
          : undefined;

        // Ensure phone numbers are in E.164 format
        const fromNumber = this.formatWhatsAppNumber(credentialData.phoneNumber);
        const toNumber = this.formatWhatsAppNumber(to);

        // Build message options
        const messageOptions: any = {
          from: fromNumber,
          to: toNumber,
          body: message,
        };

        // Add media if provided
        if (mediaUrl) {
          messageOptions.mediaUrl = [mediaUrl];
        }

        // Send message
        const response = await client.messages.create(messageOptions);

        return {
          success: true,
          output: {
            batchMode: false,
            messageSid: response.sid,
            status: response.status,
            to: response.to,
            from: response.from,
            body: response.body,
            numSegments: response.numSegments,
            dateCreated: response.dateCreated,
          },
        };
      }
    } catch (error) {
      console.error('WhatsApp node execution error:', error);

      // Handle Twilio-specific errors
      if (error && typeof error === 'object' && 'message' in error) {
        const twilioError = error as any;
        return {
          success: false,
          error: `Twilio error: ${twilioError.message}${twilioError.code ? ` (Code: ${twilioError.code})` : ''}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
      };
    }
  }

  /**
   * Format phone number for WhatsApp (whatsapp:+1234567890)
   */
  private formatWhatsAppNumber(phoneNumber: string): string {
    // Remove any existing "whatsapp:" prefix
    let formatted = phoneNumber.replace(/^whatsapp:/, '');

    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    // Add WhatsApp prefix
    return `whatsapp:${formatted}`;
  }

  /**
   * Replace variables in string with context values
   */
  private replaceVariables(template: string, context: ExecutionContext): string {
    if (!template) return '';

    let result = template;

    // Replace {{input.field}} patterns
    const inputData = context.input as any;
    if (inputData) {
      result = result.replace(/\{\{input\.(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = this.getNestedValue(inputData, path);
        return value !== undefined ? String(value) : match;
      });
    }

    // Replace {{previousOutput.field}} patterns
    const previousOutput = context.previousNodeOutput as any;
    if (previousOutput) {
      result = result.replace(/\{\{previousOutput\.(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        const value = this.getNestedValue(previousOutput, path);
        return value !== undefined ? String(value) : match;
      });
    }

    // Replace {{variables.field}} patterns
    if (context.variables) {
      result = result.replace(/\{\{variables\.(\w+)\}\}/g, (match, key) => {
        const value = context.variables[key];
        return value !== undefined ? String(value) : match;
      });
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
