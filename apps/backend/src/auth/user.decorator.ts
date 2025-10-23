/**
 * User Decorator
 * Extracts authenticated user information from request
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string; // Database user ID (UUID) - use this for foreign keys
  clerkId: string; // Clerk user ID - for reference
  sessionId: string;
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
