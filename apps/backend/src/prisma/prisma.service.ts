/**
 * Prisma Service
 * Handles database connections and provides Prisma Client instance
 * Implements connection lifecycle management
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Initialize database connection when module starts
   */
  async onModuleInit() {
    console.log('🔄 Connecting to database...');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    try {
      await this.$connect();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Clean up database connection when module is destroyed
   */
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  /**
   * Helper method to clean database (useful for testing)
   * WARNING: This deletes all data - use with caution!
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Delete in correct order to respect foreign key constraints
    await this.nodeExecution.deleteMany();
    await this.workflowExecution.deleteMany();
    await this.nodeDefinition.deleteMany();
    await this.workflow.deleteMany();
    await this.user.deleteMany();
  }
}
