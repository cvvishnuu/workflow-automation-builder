/**
 * Prisma Service
 * Handles database connections and provides Prisma Client instance
 * Implements connection lifecycle management
 *
 * Features:
 * - Retry logic with exponential backoff for Railway deployments
 * - Connection pool configuration for production
 * - Detailed connection diagnostics
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Configure connection pool for Railway environment
    const isProduction = process.env.NODE_ENV === 'production';
    const databaseUrl = process.env.DATABASE_URL;

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: isProduction ? ['error', 'warn'] : ['query', 'info', 'warn', 'error'],
    });
  }

  /**
   * Initialize database connection with retry logic
   */
  async onModuleInit() {
    console.log('🔄 Connecting to database...');
    console.log('   Environment:', process.env.NODE_ENV || 'development');

    // Validate DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable is not set');
      throw new Error('DATABASE_URL is required');
    }

    // Hide password in logs
    const safeUrl = databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
    console.log('   DATABASE_URL:', safeUrl.substring(0, 80) + '...');

    // Retry connection with exponential backoff
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);

        await this.$connect();

        // Test connection with a simple query
        await this.$queryRaw`SELECT 1`;

        console.log('✅ Database connected successfully');
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        console.error(`❌ Connection attempt ${attempt} failed:`, error.message);

        if (error.code) {
          console.error('   Error code:', error.code);
        }

        if (error.meta) {
          console.error('   Error details:', error.meta);
        }

        if (isLastAttempt) {
          console.error('');
          console.error('❌ All connection attempts failed. Diagnostics:');
          console.error('   1. Verify DATABASE_URL is correct in environment variables');
          console.error('   2. Check if PostgreSQL service is running');
          console.error('   3. Verify network connectivity to database host');
          console.error('   4. Check if connection limit has been reached');
          console.error('');
          throw error;
        }

        // Wait with exponential backoff before retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
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
