/**
 * File Upload Service
 * Handles secure CSV file uploads with encryption and validation
 *
 * Features:
 * - AES-256-GCM encryption for files at rest
 * - SHA-256 hash for deduplication
 * - CSV validation and parsing
 * - Auto-expiry for uploaded files
 * - 10MB file size limit
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as Papa from 'papaparse';
import type { File as MulterFile } from 'multer';

export interface FileUploadResult {
  id: string;
  filename: string;
  fileHash: string;
  mimeType: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  columns: string[];
  expiresAt: Date;
  createdAt: Date;
}

export interface ParsedCSVData {
  columns: string[];
  rows: any[];
  rowCount: number;
  columnCount: number;
}

@Injectable()
export class FileUploadService {
  private readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'encrypted');
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly EXPIRY_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {
    // Ensure upload directory exists
    this.initializeUploadDirectory();
  }

  private async initializeUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Upload and encrypt a CSV file
   */
  async uploadFile(
    userId: string,
    file: MulterFile
  ): Promise<FileUploadResult> {
    // Validate file
    this.validateFile(file);

    try {
      // Parse CSV to validate structure and extract metadata
      const parsedData = await this.parseCSV(file.buffer);

      // Generate file hash for deduplication
      const fileHash = this.generateFileHash(file.buffer);

      // Check for duplicate file
      const existingFile = await this.prisma.fileUpload.findUnique({
        where: { fileHash },
      });

      if (existingFile) {
        // Return existing file info instead of re-uploading
        const metadata = existingFile.metadata as any;
        return {
          id: existingFile.id,
          filename: existingFile.filename,
          fileHash: existingFile.fileHash,
          mimeType: existingFile.mimeType,
          fileSize: existingFile.fileSize,
          rowCount: metadata?.rowCount || 0,
          columnCount: metadata?.columnCount || 0,
          columns: metadata?.columns || [],
          expiresAt: existingFile.expiresAt!,
          createdAt: existingFile.createdAt,
        };
      }

      // Encrypt file
      const { encryptedData, iv } = this.encryptFile(file.buffer);

      // Generate unique filename
      const encryptedFilename = `${crypto.randomUUID()}.enc`;
      const encryptedFilePath = path.join(this.UPLOAD_DIR, encryptedFilename);

      // Write encrypted file to disk
      await fs.writeFile(encryptedFilePath, encryptedData);

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.EXPIRY_HOURS);

      // Store file metadata in database
      const fileUpload = await this.prisma.fileUpload.create({
        data: {
          userId,
          filename: file.originalname,
          fileHash,
          filePath: encryptedFilename, // Store only filename, not full path
          mimeType: file.mimetype,
          fileSize: file.size,
          encryptionIv: iv.toString('hex'),
          metadata: {
            rowCount: parsedData.rowCount,
            columnCount: parsedData.columnCount,
            columns: parsedData.columns,
          },
          expiresAt,
        },
      });

      return {
        id: fileUpload.id,
        filename: fileUpload.filename,
        fileHash: fileUpload.fileHash,
        mimeType: fileUpload.mimeType,
        fileSize: fileUpload.fileSize,
        rowCount: parsedData.rowCount,
        columnCount: parsedData.columnCount,
        columns: parsedData.columns,
        expiresAt: fileUpload.expiresAt!,
        createdAt: fileUpload.createdAt,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`
      );
    }
  }

  /**
   * Retrieve and decrypt a file
   */
  async getFile(fileId: string, userId: string): Promise<Buffer> {
    const fileUpload = await this.prisma.fileUpload.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!fileUpload) {
      throw new BadRequestException('File not found');
    }

    // Check if file has expired
    if (fileUpload.expiresAt && new Date() > fileUpload.expiresAt) {
      // Clean up expired file
      await this.deleteFile(fileId, userId);
      throw new BadRequestException('File has expired');
    }

    try {
      const encryptedFilePath = path.join(this.UPLOAD_DIR, fileUpload.filePath);
      const encryptedData = await fs.readFile(encryptedFilePath);
      const iv = Buffer.from(fileUpload.encryptionIv, 'hex');

      const decryptedData = this.decryptFile(encryptedData, iv);

      return decryptedData;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to retrieve file: ${error.message}`
      );
    }
  }

  /**
   * Get parsed CSV data (decrypted and parsed)
   */
  async getParsedCSVData(fileId: string, userId: string): Promise<ParsedCSVData> {
    const fileBuffer = await this.getFile(fileId, userId);
    return this.parseCSV(fileBuffer);
  }

  /**
   * Delete a file (both database record and encrypted file)
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const fileUpload = await this.prisma.fileUpload.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!fileUpload) {
      throw new BadRequestException('File not found');
    }

    try {
      // Delete encrypted file from disk
      const encryptedFilePath = path.join(this.UPLOAD_DIR, fileUpload.filePath);
      await fs.unlink(encryptedFilePath).catch(() => {
        // Ignore errors if file doesn't exist
      });

      // Delete database record
      await this.prisma.fileUpload.delete({
        where: { id: fileId },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`
      );
    }
  }

  /**
   * Clean up expired files (should be called by a cron job)
   */
  async cleanupExpiredFiles(): Promise<number> {
    const expiredFiles = await this.prisma.fileUpload.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        const encryptedFilePath = path.join(this.UPLOAD_DIR, file.filePath);
        await fs.unlink(encryptedFilePath).catch(() => {});
        await this.prisma.fileUpload.delete({ where: { id: file.id } });
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete expired file ${file.id}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Validate file size and type
   */
  private validateFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }
  }

  /**
   * Parse CSV file and validate structure
   */
  private async parseCSV(buffer: Buffer): Promise<ParsedCSVData> {
    return new Promise((resolve, reject) => {
      const csvString = buffer.toString('utf-8');

      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(
              new BadRequestException(
                `CSV parsing error: ${results.errors[0].message}`
              )
            );
            return;
          }

          if (results.data.length === 0) {
            reject(new BadRequestException('CSV file is empty'));
            return;
          }

          const columns = results.meta.fields || [];
          const rows = results.data;

          if (columns.length === 0) {
            reject(new BadRequestException('CSV file has no columns'));
            return;
          }

          resolve({
            columns,
            rows,
            rowCount: rows.length,
            columnCount: columns.length,
          });
        },
        error: (error) => {
          reject(new BadRequestException(`CSV parsing error: ${error.message}`));
        },
      });
    });
  }

  /**
   * Generate SHA-256 hash for file deduplication
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Encrypt file using AES-256-GCM
   */
  private encryptFile(buffer: Buffer): { encryptedData: Buffer; iv: Buffer } {
    const encryptionKey = this.getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16 bytes IV for GCM

    const cipher = crypto.createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      encryptionKey,
      iv
    );

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine encrypted data with auth tag
    const encryptedData = Buffer.concat([encrypted, authTag]);

    return { encryptedData, iv };
  }

  /**
   * Decrypt file using AES-256-GCM
   */
  private decryptFile(encryptedData: Buffer, iv: Buffer): Buffer {
    const encryptionKey = this.getEncryptionKey();

    // Extract auth tag (last 16 bytes)
    const authTag = encryptedData.slice(-16);
    const encrypted = encryptedData.slice(0, -16);

    const decipher = crypto.createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted;
  }

  /**
   * Get encryption key from environment (32 bytes for AES-256)
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.FILE_ENCRYPTION_KEY;

    if (!key) {
      throw new InternalServerErrorException(
        'FILE_ENCRYPTION_KEY not configured'
      );
    }

    // Ensure key is exactly 32 bytes
    const keyBuffer = Buffer.from(key, 'hex');

    if (keyBuffer.length !== 32) {
      throw new InternalServerErrorException(
        'FILE_ENCRYPTION_KEY must be 32 bytes (64 hex characters)'
      );
    }

    return keyBuffer;
  }
}
