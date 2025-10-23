/**
 * Integrations Service
 * Manages available integration types
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all available integrations
   */
  async findAll() {
    return this.prisma.integration.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get a specific integration by ID
   */
  async findOne(id: string) {
    return this.prisma.integration.findUnique({
      where: { id },
    });
  }

  /**
   * Get a specific integration by type
   */
  async findByType(type: string) {
    return this.prisma.integration.findUnique({
      where: { type },
    });
  }

  /**
   * Initialize default integrations (called on app startup)
   */
  async initializeDefaults() {
    const integrations = [
      {
        name: 'SendGrid Email',
        type: 'email',
        description: 'Send emails using SendGrid',
        authType: 'api_key',
        configSchema: {
          type: 'object',
          properties: {
            apiKey: { type: 'string', description: 'SendGrid API Key' },
            fromEmail: { type: 'string', description: 'Default sender email' },
            fromName: { type: 'string', description: 'Default sender name' },
          },
          required: ['apiKey', 'fromEmail'],
        },
      },
      {
        name: 'Google Calendar',
        type: 'google_calendar',
        description: 'Create and manage Google Calendar events',
        authType: 'oauth2',
        configSchema: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'OAuth access token' },
            refreshToken: { type: 'string', description: 'OAuth refresh token' },
            tokenExpiry: { type: 'string', description: 'Token expiration date' },
          },
          required: ['accessToken', 'refreshToken'],
        },
      },
      {
        name: 'Twilio WhatsApp',
        type: 'whatsapp',
        description: 'Send WhatsApp messages via Twilio',
        authType: 'api_key',
        configSchema: {
          type: 'object',
          properties: {
            accountSid: { type: 'string', description: 'Twilio Account SID' },
            authToken: { type: 'string', description: 'Twilio Auth Token' },
            phoneNumber: { type: 'string', description: 'Twilio WhatsApp number' },
          },
          required: ['accountSid', 'authToken', 'phoneNumber'],
        },
      },
    ];

    for (const integration of integrations) {
      await this.prisma.integration.upsert({
        where: { type: integration.type },
        update: integration,
        create: integration,
      });
    }

    console.log('✅ Default integrations initialized');
  }
}
