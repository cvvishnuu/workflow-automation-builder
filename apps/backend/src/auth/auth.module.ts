/**
 * Auth Module
 * Provides authentication guards and services globally
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Global() // Make this module global so ClerkAuthGuard is available everywhere
@Module({
  imports: [ConfigModule], // UsersModule is global, no need to import
  providers: [ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
