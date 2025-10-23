/**
 * Users Module
 * Provides user synchronization services globally
 */

import { Module, Global } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global() // Make UsersService available globally
@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
