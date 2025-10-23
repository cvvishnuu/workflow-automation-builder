/**
 * Prisma Module
 * Makes PrismaService available globally throughout the application
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Makes this module globally available
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export for use in other modules
})
export class PrismaModule {}
