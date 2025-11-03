/**
 * API Keys Service
 * Business logic for managing API keys (admin only)
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  workflowId: string;
  projectId?: string;
  usageLimit?: number;
  expiresAt?: Date;
  webhookUrl?: string;
  webhookEvents?: string[];
  webhookSecret?: string;
}

export interface UpdateApiKeyDto {
  name?: string;
  description?: string;
  usageLimit?: number;
  isActive?: boolean;
  webhookUrl?: string;
  webhookEvents?: string[];
  webhookSecret?: string;
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new API key
   * Returns both the plain key (shown once) and creates the hashed version in DB
   */
  async create(userId: string, dto: CreateApiKeyDto) {
    // Verify workflow exists and belongs to user
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: dto.workflowId,
        userId: userId,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found or access denied');
    }

    // Generate random API key (64 characters hex)
    const plainKey = randomBytes(32).toString('hex');

    // Hash the key for storage (SHA-256)
    const hashedKey = createHash('sha256').update(plainKey).digest('hex');

    // Create API key in database
    const apiKey = await this.prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: dto.name,
        description: dto.description,
        workflowId: dto.workflowId,
        projectId: dto.projectId,
        usageLimit: dto.usageLimit || 10000,
        expiresAt: dto.expiresAt,
        webhookUrl: dto.webhookUrl,
        webhookEvents: dto.webhookEvents as any,
        webhookSecret: dto.webhookSecret,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Return the plain key (this is the ONLY time we can show it)
    return {
      ...apiKey,
      plainKey, // This should be saved by the user
      key: undefined, // Don't return the hash
    };
  }

  /**
   * List all API keys for a user
   */
  async findAll(userId: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        workflow: {
          userId: userId,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Don't return the hashed keys
    return apiKeys.map((key) => ({
      ...key,
      key: undefined,
    }));
  }

  /**
   * Get a single API key by ID
   */
  async findOne(userId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id,
        workflow: {
          userId: userId,
        },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        executions: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found or access denied');
    }

    return {
      ...apiKey,
      key: undefined,
    };
  }

  /**
   * Update an API key
   */
  async update(userId: string, id: string, dto: UpdateApiKeyDto) {
    // Verify ownership
    const existing = await this.prisma.apiKey.findFirst({
      where: {
        id,
        workflow: {
          userId: userId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('API key not found or access denied');
    }

    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        usageLimit: dto.usageLimit,
        isActive: dto.isActive,
        webhookUrl: dto.webhookUrl,
        webhookEvents: dto.webhookEvents as any,
        webhookSecret: dto.webhookSecret,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...apiKey,
      key: undefined,
    };
  }

  /**
   * Regenerate an API key (creates new key, invalidates old one)
   */
  async regenerate(userId: string, id: string) {
    // Verify ownership
    const existing = await this.prisma.apiKey.findFirst({
      where: {
        id,
        workflow: {
          userId: userId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('API key not found or access denied');
    }

    // Generate new key
    const plainKey = randomBytes(32).toString('hex');
    const hashedKey = createHash('sha256').update(plainKey).digest('hex');

    // Update with new key and reset usage
    const apiKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        key: hashedKey,
        usageCount: 0,
        lastUsedAt: null,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...apiKey,
      plainKey,
      key: undefined,
    };
  }

  /**
   * Delete an API key
   */
  async remove(userId: string, id: string) {
    // Verify ownership
    const existing = await this.prisma.apiKey.findFirst({
      where: {
        id,
        workflow: {
          userId: userId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('API key not found or access denied');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });

    return { message: 'API key deleted successfully' };
  }

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(userId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        id,
        workflow: {
          userId: userId,
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found or access denied');
    }

    // Get execution count by status
    const executions = await this.prisma.workflowExecution.groupBy({
      by: ['status'],
      where: {
        apiKeyId: id,
      },
      _count: true,
    });

    const stats = executions.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      apiKeyId: id,
      usageCount: apiKey.usageCount,
      usageLimit: apiKey.usageLimit,
      usagePercentage:
        apiKey.usageLimit > 0
          ? Math.round((apiKey.usageCount / apiKey.usageLimit) * 100)
          : 0,
      lastUsedAt: apiKey.lastUsedAt,
      executionStats: stats,
    };
  }
}
