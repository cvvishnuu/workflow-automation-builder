/**
 * Integrations Module
 * Provides credential management and integration registry
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CredentialsService } from './credentials/credentials.service';

@Module({
  providers: [IntegrationsService, CredentialsService],
  exports: [IntegrationsService, CredentialsService],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(private readonly integrationsService: IntegrationsService) {}

  async onModuleInit() {
    // Initialize default integrations on app startup
    await this.integrationsService.initializeDefaults();
  }
}
