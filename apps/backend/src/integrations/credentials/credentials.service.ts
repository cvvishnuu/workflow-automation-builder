/**
 * Credentials Service
 * Manages encrypted storage and retrieval of integration credentials
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { encrypt, decrypt, validateEncryptionKey } from '../utils/encryption.util';

export interface CreateCredentialDto {
  userId: string;
  integrationId: string;
  name: string;
  data: Record<string, any>; // API keys, tokens, etc.
  expiresAt?: Date;
}

export interface UpdateCredentialDto {
  name?: string;
  data?: Record<string, any>;
  isActive?: boolean;
  expiresAt?: Date;
}

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService) {
    // Validate encryption key on startup
    validateEncryptionKey();
  }

  /**
   * Create a new credential
   */
  async create(dto: CreateCredentialDto) {
    // Check if credential with same name already exists for this user and integration
    const existing = await this.prisma.credential.findUnique({
      where: {
        userId_integrationId_name: {
          userId: dto.userId,
          integrationId: dto.integrationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A credential with this name already exists for this integration');
    }

    // Encrypt the credential data
    const encryptedData = encrypt(dto.data);

    // Store in database
    const credential = await this.prisma.credential.create({
      data: {
        userId: dto.userId,
        integrationId: dto.integrationId,
        name: dto.name,
        encryptedData,
        expiresAt: dto.expiresAt,
      },
      include: {
        integration: true,
      },
    });

    return {
      id: credential.id,
      name: credential.name,
      integrationId: credential.integrationId,
      integrationName: credential.integration.name,
      isActive: credential.isActive,
      expiresAt: credential.expiresAt,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  /**
   * Get all credentials for a user
   */
  async findAll(userId: string, integrationId?: string) {
    const credentials = await this.prisma.credential.findMany({
      where: {
        userId,
        ...(integrationId && { integrationId }),
      },
      include: {
        integration: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return credentials.map((c) => ({
      id: c.id,
      name: c.name,
      integrationId: c.integrationId,
      integrationName: c.integration.name,
      integrationType: c.integration.type,
      isActive: c.isActive,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Get a specific credential (returns decrypted data)
   */
  async findOne(id: string, userId: string) {
    const credential = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        integration: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    if (credential.userId !== userId) {
      throw new NotFoundException('Credential not found');
    }

    // Decrypt the data
    const decryptedData = decrypt(credential.encryptedData);

    return {
      id: credential.id,
      name: credential.name,
      integrationId: credential.integrationId,
      integrationName: credential.integration.name,
      integrationType: credential.integration.type,
      data: decryptedData,
      isActive: credential.isActive,
      expiresAt: credential.expiresAt,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  /**
   * Get credential data for use in node execution (internal use)
   */
  async getCredentialData(credentialId: string, userId: string): Promise<Record<string, any>> {
    const credential = await this.findOne(credentialId, userId);

    if (!credential.isActive) {
      throw new Error('Credential is inactive');
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new Error('Credential has expired');
    }

    return credential.data;
  }

  /**
   * Update a credential
   */
  async update(id: string, userId: string, dto: UpdateCredentialDto) {
    const existing = await this.prisma.credential.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Credential not found');
    }

    if (existing.userId !== userId) {
      throw new NotFoundException('Credential not found');
    }

    // If data is being updated, encrypt it
    let encryptedData: string | undefined;
    if (dto.data) {
      encryptedData = encrypt(dto.data);
    }

    const credential = await this.prisma.credential.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(encryptedData && { encryptedData }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt }),
      },
      include: {
        integration: true,
      },
    });

    return {
      id: credential.id,
      name: credential.name,
      integrationId: credential.integrationId,
      integrationName: credential.integration.name,
      isActive: credential.isActive,
      expiresAt: credential.expiresAt,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  /**
   * Delete a credential
   */
  async delete(id: string, userId: string) {
    const existing = await this.prisma.credential.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Credential not found');
    }

    if (existing.userId !== userId) {
      throw new NotFoundException('Credential not found');
    }

    await this.prisma.credential.delete({
      where: { id },
    });

    return { success: true, message: 'Credential deleted successfully' };
  }
}
