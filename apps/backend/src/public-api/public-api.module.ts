/**
 * Public API Module
 * Provides public-facing API endpoints for agent execution
 */

import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { WebhookService } from './webhook.service';
import { WebhookListenerService } from './webhook-listener.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PublicApiController],
  providers: [
    PublicApiService,
    WebhookService,
    WebhookListenerService,
    ApiKeyGuard,
    RateLimitGuard,
    PrismaService,
  ],
  exports: [PublicApiService, WebhookService],
})
export class PublicApiModule {}
