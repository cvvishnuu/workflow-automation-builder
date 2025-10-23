/**
 * Clerk Authentication Guard
 * Validates JWT tokens from Clerk and extracts user information
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

      if (!secretKey) {
        console.error('[Auth] Clerk secret key not configured');
        throw new UnauthorizedException('Clerk secret key not configured');
      }

      console.log('[Auth] Verifying token with Clerk...');

      // Verify the token with Clerk
      const payload = await verifyToken(token, {
        secretKey,
      });

      console.log('[Auth] Token verified successfully, clerkId:', payload.sub);

      // Extract user info from JWT payload
      const clerkId = payload.sub;
      const email = (payload as any).email || 'unknown@example.com'; // Clerk includes email in JWT
      const name = (payload as any).name || (payload as any).firstName || null;

      // Find or create user in our database
      const dbUser = await this.usersService.findOrCreateUser({
        clerkId,
        email,
        name,
      });

      console.log('[Auth] Synced user to database, dbUserId:', dbUser.id);

      // Attach user info to request (use database user ID for foreign keys)
      request.user = {
        userId: dbUser.id, // Database user ID (UUID) - this is what we use for foreign keys
        clerkId: clerkId,  // Clerk user ID - for reference
        sessionId: payload.sid,
      };

      return true;
    } catch (error) {
      console.error('[Auth] Token verification failed:', error.message, error.stack);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
