/**
 * Rate Limiting Guard for Public API
 * Implements token bucket algorithm to prevent API abuse
 *
 * Features:
 * - Per-API-key rate limiting
 * - In-memory token bucket implementation
 * - Configurable rate limits
 * - Automatic token refill
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, TokenBucket>();

  // Default configuration
  private readonly DEFAULT_CAPACITY = 10; // Max burst of 10 requests
  private readonly DEFAULT_REFILL_RATE = 1; // 1 request per second = 60 req/min

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get API key from request (set by ApiKeyGuard)
    const apiKeyId = request.apiKey?.id;

    if (!apiKeyId) {
      // If no API key, let ApiKeyGuard handle it
      return true;
    }

    // Get or create bucket for this API key
    let bucket = this.buckets.get(apiKeyId);
    if (!bucket) {
      bucket = {
        tokens: this.DEFAULT_CAPACITY,
        lastRefill: Date.now(),
        capacity: this.DEFAULT_CAPACITY,
        refillRate: this.DEFAULT_REFILL_RATE,
      };
      this.buckets.set(apiKeyId, bucket);
    }

    // Refill tokens based on time passed
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have tokens available
    if (bucket.tokens < 1) {
      // Calculate retry-after time
      const retryAfter = Math.ceil((1 - bucket.tokens) / bucket.refillRate);

      // Set rate limit headers
      response.header('X-RateLimit-Limit', bucket.capacity.toString());
      response.header('X-RateLimit-Remaining', '0');
      response.header('X-RateLimit-Reset', (now + retryAfter * 1000).toString());
      response.header('Retry-After', retryAfter.toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          error: 'Too Many Requests',
          retryAfter: retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Consume one token
    bucket.tokens -= 1;

    // Set rate limit headers
    response.header('X-RateLimit-Limit', bucket.capacity.toString());
    response.header('X-RateLimit-Remaining', Math.floor(bucket.tokens).toString());
    response.header('X-RateLimit-Reset', (now + 60000).toString()); // Reset time (1 minute from now)

    return true;
  }

  /**
   * Clean up old buckets periodically to prevent memory leaks
   */
  cleanupOldBuckets() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for an API key
   */
  getRateLimitStatus(apiKeyId: string): {
    remaining: number;
    limit: number;
    resetAt: number;
  } | null {
    const bucket = this.buckets.get(apiKeyId);
    if (!bucket) {
      return null;
    }

    // Refill tokens first
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * bucket.refillRate;
    const currentTokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);

    return {
      remaining: Math.floor(currentTokens),
      limit: bucket.capacity,
      resetAt: now + 60000, // 1 minute from now
    };
  }

  /**
   * Reset rate limit for a specific API key (admin function)
   */
  resetRateLimit(apiKeyId: string) {
    this.buckets.delete(apiKeyId);
  }
}
