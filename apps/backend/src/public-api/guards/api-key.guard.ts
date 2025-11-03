/**
 * API Key Authentication Guard
 * Validates API keys for public API access
 *
 * Usage:
 * - Add @UseGuards(ApiKeyGuard) to controller or routes
 * - Expects Bearer token in Authorization header
 * - Validates API key against database
 * - Checks key expiration, usage limits, and active status
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing API key');
    }

    // Extract Bearer token
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format. Expected: Bearer <api_key>');
    }

    // Development bypass - allow special dev API key
    if (process.env.NODE_ENV !== 'production' && token === 'your-api-key-here') {
      // Set default development values
      request.apiKey = { id: null }; // null apiKeyId for dev mode
      request.workflowId = 'workflow_bfsi_marketing_template';
      request.userId = 'user_123';
      return true;
    }

    // Hash the API key (we store hashed keys in database)
    const hashedKey = this.hashApiKey(token);

    // Find API key in database
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            isActive: true,
            userId: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check if API key is active
    if (!apiKey.isActive) {
      throw new ForbiddenException('API key is inactive');
    }

    // Check if API key is expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new ForbiddenException('API key has expired');
    }

    // Check if workflow is active
    if (!apiKey.workflow.isActive) {
      throw new ForbiddenException('Associated workflow is inactive');
    }

    // Check usage limit
    if (apiKey.usageCount >= apiKey.usageLimit) {
      throw new ForbiddenException('API key usage limit exceeded');
    }

    // Update last used timestamp and usage count
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    // Attach API key and workflow info to request for use in controllers
    request.apiKey = apiKey;
    request.workflowId = apiKey.workflowId;
    request.userId = apiKey.workflow.userId;

    return true;
  }

  /**
   * Hash API key using SHA-256
   */
  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
