/**
 * Google Calendar Node Executor
 * Creates calendar events with Google Meet integration
 */

import { Injectable } from '@nestjs/common';
import { BaseNodeExecutor } from './base-node.executor';
import { ExecutionContext, NodeExecutionResult } from './node-executor.interface';
import { GoogleCalendarNodeConfig, NodeConfig } from '@workflow/shared-types';
import { google } from 'googleapis';
import { CredentialsService } from '../../integrations/credentials/credentials.service';

@Injectable()
export class GoogleCalendarNodeExecutor extends BaseNodeExecutor {
  constructor(private readonly credentialsService: CredentialsService) {
    super();
  }

  /**
   * Execute the Google Calendar node
   */
  protected async executeInternal(
    node: NodeConfig,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const calendarNode = node as GoogleCalendarNodeConfig;
    try {
      const { config } = calendarNode;

      // Get credentials
      const credentialData = await this.credentialsService.getCredentialData(
        config.credentialId,
        context.userId
      );

      // Validate credentials
      if (!credentialData.accessToken || !credentialData.refreshToken) {
        return {
          success: false,
          error: 'Google OAuth tokens not found in credentials',
        };
      }

      // Set up OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: credentialData.accessToken,
        refresh_token: credentialData.refreshToken,
      });

      // Initialize Calendar API
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Replace variables in fields
      const summary = this.replaceVariables(config.summary, context);
      const description = config.description
        ? this.replaceVariables(config.description, context)
        : undefined;
      const startTime = this.replaceVariables(config.startTime, context);
      const endTime = this.replaceVariables(config.endTime, context);
      const attendeesStr = this.replaceVariables(config.attendees, context);

      // Parse attendees (comma-separated emails)
      const attendeesList = attendeesStr
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0)
        .map((email) => ({ email }));

      if (attendeesList.length === 0) {
        return {
          success: false,
          error: 'No valid attendees found',
        };
      }

      // Build event object
      const event: any = {
        summary,
        description,
        start: {
          dateTime: startTime,
          timeZone: config.timezone || 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: config.timezone || 'UTC',
        },
        attendees: attendeesList,
        reminders: {
          useDefault: true,
        },
      };

      // Add Google Meet link if requested
      if (config.createMeet) {
        event.conferenceData = {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        };
      }

      // Create the event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: config.createMeet ? 1 : 0,
        sendUpdates: 'all', // Send email invitations to attendees
      });

      const createdEvent = response.data;

      return {
        success: true,
        output: {
          eventId: createdEvent.id,
          eventLink: createdEvent.htmlLink,
          meetLink: createdEvent.conferenceData?.entryPoints?.[0]?.uri,
          summary: createdEvent.summary,
          startTime: createdEvent.start?.dateTime,
          endTime: createdEvent.end?.dateTime,
          attendees: createdEvent.attendees?.map((a) => a.email),
          createdAt: createdEvent.created,
        },
      };
    } catch (error) {
      console.error('Google Calendar node execution error:', error);

      // Handle Google API errors
      if (error && typeof error === 'object' && 'message' in error) {
        const apiError = error as any;
        return {
          success: false,
          error: `Google Calendar API error: ${apiError.message}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create calendar event',
      };
    }
  }
}
