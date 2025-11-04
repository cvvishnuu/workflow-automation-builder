/**
 * Prisma Service
 * Handles database connections and provides Prisma Client instance
 * Implements connection lifecycle management
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  /**
   * Initialize database connection when module starts
   * Includes retry logic for Railway cold starts
   */
  async onModuleInit() {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    console.log('🔄 Connecting to database...');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        console.log(`✅ Database connected successfully (attempt ${attempt}/${maxRetries})`);
        return;
      } catch (error) {
        console.error(
          `❌ Database connection attempt ${attempt}/${maxRetries} failed:`,
          error.message
        );

        if (attempt === maxRetries) {
          console.error('');
          console.error('💥 FATAL: Could not connect to database after', maxRetries, 'attempts');
          console.error('');
          console.error('Troubleshooting:');
          console.error('1. Verify DATABASE_URL is correct');
          console.error('2. Check if Postgres service is running on Railway');
          console.error('3. Ensure backend service is connected to Postgres');
          console.error('4. Check Railway logs for Postgres errors');
          console.error('');
          throw error;
        }

        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
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
