/**
 * Root application module
 * Imports and configures all feature modules
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ExecutionsModule } from './executions/executions.module';
import { NodesModule } from './nodes/nodes.module';
import { WebSocketModule } from './websocket/websocket.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { BfsiModule } from './bfsi/bfsi.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database module
    PrismaModule,

    // Users module (global - must be loaded before Auth)
    UsersModule,

    // Auth module (provides authentication guards and user sync)
    AuthModule,

    // Feature modules
    WorkflowsModule,
    ExecutionsModule,
    NodesModule,
    WebSocketModule,
    IntegrationsModule,
    BfsiModule,
  ],
})
export class AppModule {}
