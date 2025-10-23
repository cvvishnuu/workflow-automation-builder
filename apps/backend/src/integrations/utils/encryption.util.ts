/**
 * Encryption Utility
 * Handles encryption and decryption of sensitive credentials
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Use environment variable for encryption key
// In production, this should be stored securely (e.g., AWS Secrets Manager, HashiCorp Vault)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';

/**
 * Derives a key from the master key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts data using AES-256-GCM
 * @param data - Data to encrypt (will be JSON stringified)
 * @returns Base64 encoded encrypted data with IV, salt, and auth tag
 */
export function encrypt(data: any): string {
  try {
    // Convert data to JSON string
    const text = JSON.stringify(data);

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);

    // Return as base64 string
    return result.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedData - Base64 encoded encrypted data
 * @returns Decrypted and parsed data
 */
export function decrypt(encryptedData: string): any {
  try {
    // Convert from base64
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract salt, IV, tag, and encrypted data
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from master key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Parse JSON and return
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates that the encryption key is properly configured
 */
export function validateEncryptionKey(): boolean {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY === 'default-dev-key-change-in-production') {
    console.warn('WARNING: Using default encryption key. Set ENCRYPTION_KEY environment variable in production!');
    return false;
  }
  return true;
}
