/**
 * Users Service
 * Handles user synchronization between Clerk and our database
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserInfo {
  clerkId: string;
  email: string;
  name?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find or create a user in the database
   * This ensures we have a local user record for foreign key relationships
   */
  async findOrCreateUser(userInfo: UserInfo) {
    // Try to find existing user by Clerk ID
    let user = await this.prisma.user.findUnique({
      where: { clerkId: userInfo.clerkId },
    });

    // If user doesn't exist, create it
    user ??= await this.prisma.user.create({
      data: {
        clerkId: userInfo.clerkId,
        email: userInfo.email,
        name: userInfo.name,
      },
    });
    // else {
    //   // Update email/name if changed
    //   user = await this.prisma.user.update({
    //     where: { id: user.id },
    //     data: {
    //       email: userInfo.email,
    //       name: userInfo.name,
    //     },
    //   });
    // }

    return user;
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
    });
  }

  /**
   * Get user by database ID
   */
  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
