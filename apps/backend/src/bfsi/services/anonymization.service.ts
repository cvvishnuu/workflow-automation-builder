/**
 * Anonymization Service
 * Detects and anonymizes PII (Personally Identifiable Information)
 *
 * Features:
 * - Email detection and masking
 * - Phone number detection (Indian format)
 * - PAN card detection (Indian)
 * - Aadhaar number detection (Indian)
 * - Name detection (basic heuristics)
 * - Custom field-based anonymization
 * - Reversible anonymization with mapping
 */

import { Injectable } from '@nestjs/common';

export interface AnonymizationResult {
  anonymizedData: any;
  detectedPII: PIIDetection[];
  mapping: Record<string, string>; // original -> anonymized
}

export interface PIIDetection {
  type: 'email' | 'phone' | 'pan' | 'aadhaar' | 'name' | 'custom';
  field: string;
  originalValue: string;
  anonymizedValue: string;
  confidence: number; // 0-1
}

export interface AnonymizationOptions {
  detectEmail?: boolean;
  detectPhone?: boolean;
  detectPAN?: boolean;
  detectAadhaar?: boolean;
  detectName?: boolean;
  customFields?: string[]; // Field names to always anonymize
  preserveFormat?: boolean; // Keep format (e.g., XXX-XXX-1234 for phone)
}

@Injectable()
export class AnonymizationService {
  // Regex patterns for PII detection
  private readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private readonly PHONE_REGEX = /(\+91[\s-]?)?[6-9]\d{9}\b/g;
  private readonly PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g;
  private readonly AADHAAR_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

  // Common Indian first names for name detection
  private readonly COMMON_NAMES = new Set([
    'amit', 'priya', 'rahul', 'sneha', 'raj', 'anjali', 'vikram', 'kavya',
    'arjun', 'divya', 'rohan', 'pooja', 'aditya', 'neha', 'sanjay', 'meera',
    'rajesh', 'deepika', 'karan', 'shreya', 'suresh', 'anita', 'vijay', 'ritu',
  ]);

  /**
   * Anonymize a single data object (CSV row)
   */
  anonymize(
    data: Record<string, any>,
    options: AnonymizationOptions = {}
  ): AnonymizationResult {
    const defaults: AnonymizationOptions = {
      detectEmail: true,
      detectPhone: true,
      detectPAN: true,
      detectAadhaar: true,
      detectName: true,
      customFields: [],
      preserveFormat: true,
    };

    const opts = { ...defaults, ...options };
    const detectedPII: PIIDetection[] = [];
    const mapping: Record<string, string> = {};
    const anonymizedData: Record<string, any> = {};

    for (const [field, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        anonymizedData[field] = value;
        continue;
      }

      const strValue = String(value).trim();

      // Check if field is in custom fields to anonymize
      if (opts.customFields?.includes(field.toLowerCase())) {
        const anonymized = this.anonymizeCustomField(strValue);
        anonymizedData[field] = anonymized;
        detectedPII.push({
          type: 'custom',
          field,
          originalValue: strValue,
          anonymizedValue: anonymized,
          confidence: 1.0,
        });
        mapping[strValue] = anonymized;
        continue;
      }

      // Email detection
      if (opts.detectEmail && this.isEmail(strValue)) {
        const anonymized = this.anonymizeEmail(strValue, opts.preserveFormat ?? true);
        anonymizedData[field] = anonymized;
        detectedPII.push({
          type: 'email',
          field,
          originalValue: strValue,
          anonymizedValue: anonymized,
          confidence: 1.0,
        });
        mapping[strValue] = anonymized;
        continue;
      }

      // Phone detection
      if (opts.detectPhone && this.isPhone(strValue)) {
        const anonymized = this.anonymizePhone(strValue, opts.preserveFormat ?? true);
        anonymizedData[field] = anonymized;
        detectedPII.push({
          type: 'phone',
          field,
          originalValue: strValue,
          anonymizedValue: anonymized,
          confidence: 1.0,
        });
        mapping[strValue] = anonymized;
        continue;
      }

      // PAN detection
      if (opts.detectPAN && this.isPAN(strValue)) {
        const anonymized = this.anonymizePAN(strValue, opts.preserveFormat ?? true);
        anonymizedData[field] = anonymized;
        detectedPII.push({
          type: 'pan',
          field,
          originalValue: strValue,
          anonymizedValue: anonymized,
          confidence: 1.0,
        });
        mapping[strValue] = anonymized;
        continue;
      }

      // Aadhaar detection
      if (opts.detectAadhaar && this.isAadhaar(strValue)) {
        const anonymized = this.anonymizeAadhaar(strValue, opts.preserveFormat ?? true);
        anonymizedData[field] = anonymized;
        detectedPII.push({
          type: 'aadhaar',
          field,
          originalValue: strValue,
          anonymizedValue: anonymized,
          confidence: 1.0,
        });
        mapping[strValue] = anonymized;
        continue;
      }

      // Name detection (heuristic-based)
      if (opts.detectName && this.isLikelyName(field, strValue)) {
        const anonymized = this.anonymizeName(strValue);
        anonymizedData[field] = anonymized;
        detectedPII.push({
          type: 'name',
          field,
          originalValue: strValue,
          anonymizedValue: anonymized,
          confidence: 0.7, // Lower confidence for name detection
        });
        mapping[strValue] = anonymized;
        continue;
      }

      // No PII detected, keep original value
      anonymizedData[field] = value;
    }

    return {
      anonymizedData,
      detectedPII,
      mapping,
    };
  }

  /**
   * Anonymize an array of data objects (CSV rows)
   */
  anonymizeBatch(
    dataArray: Record<string, any>[],
    options: AnonymizationOptions = {}
  ): {
    anonymizedData: Record<string, any>[];
    allDetectedPII: PIIDetection[];
    globalMapping: Record<string, string>;
  } {
    const anonymizedData: Record<string, any>[] = [];
    const allDetectedPII: PIIDetection[] = [];
    const globalMapping: Record<string, string> = {};

    for (const data of dataArray) {
      const result = this.anonymize(data, options);
      anonymizedData.push(result.anonymizedData);
      allDetectedPII.push(...result.detectedPII);
      Object.assign(globalMapping, result.mapping);
    }

    return {
      anonymizedData,
      allDetectedPII,
      globalMapping,
    };
  }

  /**
   * Check if string is an email
   */
  private isEmail(value: string): boolean {
    return this.EMAIL_REGEX.test(value);
  }

  /**
   * Check if string is a phone number
   */
  private isPhone(value: string): boolean {
    return this.PHONE_REGEX.test(value);
  }

  /**
   * Check if string is a PAN card number
   */
  private isPAN(value: string): boolean {
    return this.PAN_REGEX.test(value);
  }

  /**
   * Check if string is an Aadhaar number
   */
  private isAadhaar(value: string): boolean {
    // Remove spaces and hyphens for validation
    const cleaned = value.replace(/[\s-]/g, '');
    return /^\d{12}$/.test(cleaned);
  }

  /**
   * Check if field and value likely represent a name
   */
  private isLikelyName(field: string, value: string): boolean {
    // Check field name
    const fieldLower = field.toLowerCase();
    const nameFields = ['name', 'firstname', 'lastname', 'fullname', 'customer', 'client'];
    const hasNameField = nameFields.some((f) => fieldLower.includes(f));

    if (!hasNameField) {
      return false;
    }

    // Check value format (2-4 words, alphabetic, capitalized)
    const words = value.split(/\s+/);
    if (words.length < 1 || words.length > 4) {
      return false;
    }

    // Check if words are alphabetic and capitalized
    const isValidName = words.every((word) => {
      const cleaned = word.replace(/[^a-zA-Z]/g, '');
      return cleaned.length > 0 && /^[A-Z]/.test(word);
    });

    if (!isValidName) {
      return false;
    }

    // Check if any word matches common names
    const hasCommonName = words.some((word) =>
      this.COMMON_NAMES.has(word.toLowerCase())
    );

    return hasCommonName;
  }

  /**
   * Anonymize email address
   */
  private anonymizeEmail(email: string, preserveFormat: boolean): string {
    if (!preserveFormat) {
      return '[EMAIL_REDACTED]';
    }

    const [username, domain] = email.split('@');
    const maskedUsername =
      username.length > 2
        ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
        : '***';

    return `${maskedUsername}@${domain}`;
  }

  /**
   * Anonymize phone number
   */
  private anonymizePhone(phone: string, preserveFormat: boolean): string {
    if (!preserveFormat) {
      return '[PHONE_REDACTED]';
    }

    // Keep format but mask middle digits
    const cleaned = phone.replace(/[\s-]/g, '');
    const masked =
      cleaned.substring(0, cleaned.length - 4).replace(/\d/g, 'X') +
      cleaned.substring(cleaned.length - 4);

    // Preserve original formatting
    if (phone.includes('-')) {
      return masked.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    } else if (phone.includes(' ')) {
      return masked.replace(/(\d{5})(\d{5})/, '$1 $2');
    }

    return masked;
  }

  /**
   * Anonymize PAN card number
   */
  private anonymizePAN(pan: string, preserveFormat: boolean): string {
    if (!preserveFormat) {
      return '[PAN_REDACTED]';
    }

    // Keep first 3 and last 1 characters, mask middle
    return pan.substring(0, 3) + 'XX' + 'XXXX' + pan.substring(pan.length - 1);
  }

  /**
   * Anonymize Aadhaar number
   */
  private anonymizeAadhaar(aadhaar: string, preserveFormat: boolean): string {
    if (!preserveFormat) {
      return '[AADHAAR_REDACTED]';
    }

    // Keep format but mask first 8 digits (as per UIDAI guidelines)
    const cleaned = aadhaar.replace(/[\s-]/g, '');
    const masked = 'XXXX' + 'XXXX' + cleaned.substring(8);

    // Preserve original formatting
    if (aadhaar.includes('-')) {
      return masked.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (aadhaar.includes(' ')) {
      return masked.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }

    return masked;
  }

  /**
   * Anonymize name
   */
  private anonymizeName(name: string): string {
    const words = name.split(/\s+/);
    const anonymized = words.map((word, index) => {
      // Keep first letter of first and last name, mask rest
      if (index === 0 || index === words.length - 1) {
        return word.length > 1 ? word[0] + '*'.repeat(word.length - 1) : word;
      }
      // Completely mask middle names
      return '*'.repeat(word.length);
    });

    return anonymized.join(' ');
  }

  /**
   * Anonymize custom field
   */
  private anonymizeCustomField(value: string): string {
    // Generate a consistent hash-based anonymization
    const hash = this.simpleHash(value);
    return `[REDACTED_${hash}]`;
  }

  /**
   * Simple hash function for consistent anonymization
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
  }
}
