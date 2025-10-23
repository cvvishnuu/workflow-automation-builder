/**
 * Compliance Service
 * Validates content against BFSI regulations and industry standards
 *
 * Features:
 * - Prohibited term detection (RBI, SEBI, IRDAI)
 * - Risk scoring (0-100)
 * - Compliance rule enforcement
 * - Suggestion generation for fixes
 * - Multi-category validation (email, SMS, WhatsApp, social)
 */

import { Injectable } from '@nestjs/common';

export interface ComplianceCheckRequest {
  content: string;
  contentType: 'email' | 'sms' | 'whatsapp' | 'social';
  productCategory?: 'banking' | 'investment' | 'insurance' | 'loan' | 'general';
}

export interface ComplianceCheckResult {
  isPassed: boolean;
  riskScore: number; // 0-100 (0 = no risk, 100 = severe violations)
  flaggedTerms: FlaggedTerm[];
  suggestions: string[];
  complianceRules: string[];
  summary: string;
}

export interface FlaggedTerm {
  term: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  position: { start: number; end: number };
}

@Injectable()
export class ComplianceService {
  // Prohibited terms with severity levels
  private readonly PROHIBITED_TERMS = [
    // Critical - Absolute guarantees (RBI/SEBI violation)
    { pattern: /guaranteed?\s+returns?/gi, category: 'misleading', severity: 'critical', reason: 'Prohibited: Cannot guarantee investment returns' },
    { pattern: /100%\s+safe/gi, category: 'misleading', severity: 'critical', reason: 'Prohibited: Cannot claim absolute safety' },
    { pattern: /no\s+risk/gi, category: 'misleading', severity: 'critical', reason: 'Prohibited: All investments carry some risk' },
    { pattern: /assured\s+profit/gi, category: 'misleading', severity: 'critical', reason: 'Prohibited: Cannot assure profits' },
    { pattern: /risk[- ]?free/gi, category: 'misleading', severity: 'critical', reason: 'Prohibited: No investment is risk-free' },

    // High severity - Exaggerated claims
    { pattern: /unlimited\s+returns?/gi, category: 'exaggeration', severity: 'high', reason: 'Exaggerated claim not allowed' },
    { pattern: /get\s+rich\s+quick/gi, category: 'exaggeration', severity: 'high', reason: 'Misleading promise' },
    { pattern: /double\s+your\s+money/gi, category: 'exaggeration', severity: 'high', reason: 'Unrealistic promise' },
    { pattern: /instant\s+approval/gi, category: 'exaggeration', severity: 'high', reason: 'May be misleading; approvals have processes' },
    { pattern: /zero\s+interest/gi, category: 'incomplete', severity: 'high', reason: 'Requires full disclosure of terms' },

    // Medium severity - Missing disclosures
    { pattern: /best\s+returns?/gi, category: 'comparison', severity: 'medium', reason: 'Comparative claims need substantiation' },
    { pattern: /highest\s+interest/gi, category: 'comparison', severity: 'medium', reason: 'Comparative claims need substantiation' },
    { pattern: /lowest\s+rate/gi, category: 'comparison', severity: 'medium', reason: 'Comparative claims need substantiation' },
    { pattern: /pre[- ]?approved/gi, category: 'incomplete', severity: 'medium', reason: 'Requires clear eligibility criteria' },

    // Low severity - Aggressive language
    { pattern: /act\s+now/gi, category: 'pressure', severity: 'low', reason: 'May create undue pressure' },
    { pattern: /limited\s+time\s+offer/gi, category: 'pressure', severity: 'low', reason: 'Should specify exact deadline' },
    { pattern: /don\'t\s+miss\s+out/gi, category: 'pressure', severity: 'low', reason: 'Avoid fear-of-missing-out tactics' },
  ];

  // Required disclaimers based on product category
  private readonly REQUIRED_DISCLAIMERS = {
    banking: ['terms and conditions apply', 'eligibility criteria'],
    investment: ['subject to market risks', 'read all scheme-related documents', 'past performance'],
    insurance: ['terms and conditions', 'exclusions apply', 'claim settlement'],
    loan: ['subject to credit approval', 'processing fees', 'terms and conditions'],
    general: ['terms and conditions'],
  };

  // Product-specific keywords that trigger disclaimer requirements
  private readonly PRODUCT_KEYWORDS = {
    investment: ['mutual fund', 'sip', 'equity', 'stock', 'returns', 'profit', 'gains'],
    insurance: ['policy', 'premium', 'coverage', 'claim', 'sum assured'],
    loan: ['loan', 'emi', 'interest rate', 'credit', 'repayment'],
    banking: ['account', 'deposit', 'savings', 'current account', 'fixed deposit'],
  };

  /**
   * Perform comprehensive compliance check
   */
  checkCompliance(request: ComplianceCheckRequest): ComplianceCheckResult {
    const content = request.content;
    const flaggedTerms: FlaggedTerm[] = [];
    const suggestions: string[] = [];
    const complianceRules: string[] = [];

    // 1. Check for prohibited terms
    for (const { pattern, category, severity, reason } of this.PROHIBITED_TERMS) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match.index !== undefined) {
          flaggedTerms.push({
            term: match[0],
            category,
            severity: severity as any,
            reason,
            position: {
              start: match.index,
              end: match.index + match[0].length,
            },
          });
        }
      }
    }

    // 2. Detect product category if not provided
    const detectedCategory = request.productCategory || this.detectProductCategory(content);

    // 3. Check for required disclaimers
    const requiredDisclaimers = this.REQUIRED_DISCLAIMERS[detectedCategory] || this.REQUIRED_DISCLAIMERS.general;
    const missingDisclaimers = requiredDisclaimers.filter(
      (disclaimer) => !new RegExp(disclaimer, 'i').test(content)
    );

    if (missingDisclaimers.length > 0) {
      missingDisclaimers.forEach((disclaimer) => {
        flaggedTerms.push({
          term: '[MISSING DISCLAIMER]',
          category: 'missing_disclosure',
          severity: 'medium',
          reason: `Missing required disclaimer: "${disclaimer}"`,
          position: { start: 0, end: 0 },
        });
        suggestions.push(`Add disclaimer: "${disclaimer}"`);
      });
    }

    // 4. Check for all-caps usage (unprofessional/aggressive)
    const allCapsMatches = content.match(/\b[A-Z]{5,}\b/g);
    if (allCapsMatches && allCapsMatches.length > 2) {
      flaggedTerms.push({
        term: allCapsMatches.join(', '),
        category: 'formatting',
        severity: 'low',
        reason: 'Excessive use of ALL CAPS (appears aggressive)',
        position: { start: 0, end: 0 },
      });
      suggestions.push('Reduce use of ALL CAPS for professional tone');
    }

    // 5. Check for excessive exclamation marks
    const exclamationCount = (content.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      flaggedTerms.push({
        term: '!!!',
        category: 'formatting',
        severity: 'low',
        reason: 'Excessive exclamation marks (unprofessional)',
        position: { start: 0, end: 0 },
      });
      suggestions.push('Reduce exclamation marks for professional communication');
    }

    // 6. Content-type specific checks
    this.performContentTypeChecks(request.contentType, content, flaggedTerms, suggestions);

    // 7. Calculate risk score
    const riskScore = this.calculateRiskScore(flaggedTerms);

    // 8. Generate compliance rules applied
    complianceRules.push('RBI Consumer Protection Guidelines');
    complianceRules.push('SEBI Marketing Code of Conduct');
    complianceRules.push('IRDAI Advertisement Regulations');
    complianceRules.push('Data Protection and Privacy Act (DPDPA)');
    if (detectedCategory === 'investment') {
      complianceRules.push('SEBI Mutual Fund Regulations');
    }

    // 9. Determine pass/fail
    const isPassed = riskScore < 50 && !flaggedTerms.some((t) => t.severity === 'critical');

    // 10. Generate summary
    const summary = this.generateSummary(isPassed, riskScore, flaggedTerms);

    // 11. Add general suggestions if failed
    if (!isPassed) {
      if (flaggedTerms.some((t) => t.severity === 'critical')) {
        suggestions.unshift('CRITICAL: Remove all prohibited terms before distribution');
      }
      if (missingDisclaimers.length > 0) {
        suggestions.push('Add all required disclaimers at the end of the message');
      }
    }

    return {
      isPassed,
      riskScore,
      flaggedTerms,
      suggestions,
      complianceRules,
      summary,
    };
  }

  /**
   * Detect product category based on content keywords
   */
  private detectProductCategory(
    content: string
  ): 'banking' | 'investment' | 'insurance' | 'loan' | 'general' {
    const contentLower = content.toLowerCase();

    for (const [category, keywords] of Object.entries(this.PRODUCT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          return category as any;
        }
      }
    }

    return 'general';
  }

  /**
   * Perform content-type specific validation
   */
  private performContentTypeChecks(
    contentType: string,
    content: string,
    flaggedTerms: FlaggedTerm[],
    suggestions: string[]
  ): void {
    switch (contentType) {
      case 'sms':
        // SMS should be concise
        if (content.length > 160) {
          suggestions.push(
            `SMS is ${content.length} characters. Consider splitting or shortening to 160 characters.`
          );
        }
        // SMS should have opt-out option for promotional messages
        if (!/reply\s+stop|opt[- ]?out|unsubscribe/i.test(content)) {
          flaggedTerms.push({
            term: '[MISSING OPT-OUT]',
            category: 'missing_disclosure',
            severity: 'medium',
            reason: 'Promotional SMS should include opt-out instructions',
            position: { start: 0, end: 0 },
          });
          suggestions.push('Add opt-out instructions (e.g., "Reply STOP to unsubscribe")');
        }
        break;

      case 'whatsapp':
        // WhatsApp should not be overly promotional
        if (content.toLowerCase().includes('click here') && /http[s]?:\/\//.test(content)) {
          suggestions.push('Ensure WhatsApp links are from verified business account');
        }
        break;

      case 'email':
        // Email should have unsubscribe option
        if (!/unsubscribe|opt[- ]?out|manage\s+preferences/i.test(content)) {
          flaggedTerms.push({
            term: '[MISSING UNSUBSCRIBE]',
            category: 'missing_disclosure',
            severity: 'medium',
            reason: 'Marketing emails should include unsubscribe option',
            position: { start: 0, end: 0 },
          });
          suggestions.push('Add unsubscribe link at the bottom of the email');
        }
        break;

      case 'social':
        // Social media should have hashtag limits
        const hashtagCount = (content.match(/#/g) || []).length;
        if (hashtagCount > 5) {
          suggestions.push(`Reduce hashtags from ${hashtagCount} to 3-5 for better engagement`);
        }
        break;
    }
  }

  /**
   * Calculate risk score based on flagged terms
   */
  private calculateRiskScore(flaggedTerms: FlaggedTerm[]): number {
    if (flaggedTerms.length === 0) {
      return 0;
    }

    const severityWeights = {
      low: 10,
      medium: 25,
      high: 50,
      critical: 100,
    };

    let totalScore = 0;

    for (const term of flaggedTerms) {
      totalScore += severityWeights[term.severity];
    }

    // Cap at 100
    return Math.min(Math.round(totalScore / flaggedTerms.length), 100);
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    isPassed: boolean,
    riskScore: number,
    flaggedTerms: FlaggedTerm[]
  ): string {
    if (isPassed) {
      if (riskScore === 0) {
        return 'Content passed all compliance checks. No issues detected.';
      }
      return `Content passed with minor issues. Risk score: ${riskScore}/100. Review suggestions for improvements.`;
    }

    const criticalCount = flaggedTerms.filter((t) => t.severity === 'critical').length;
    const highCount = flaggedTerms.filter((t) => t.severity === 'high').length;

    if (criticalCount > 0) {
      return `FAILED: Content contains ${criticalCount} critical violation(s). Risk score: ${riskScore}/100. Cannot be distributed without modifications.`;
    }

    if (highCount > 0) {
      return `FAILED: Content contains ${highCount} high-severity issue(s). Risk score: ${riskScore}/100. Requires review before distribution.`;
    }

    return `FAILED: Content requires modifications. Risk score: ${riskScore}/100. Review all flagged items and suggestions.`;
  }

  /**
   * Get compliance guidelines for a specific content type
   */
  getComplianceGuidelines(contentType: string): string[] {
    const general = [
      'Avoid making absolute guarantees about returns or safety',
      'Include all required disclaimers and terms & conditions',
      'Use professional, non-aggressive language',
      'Substantiate all comparative claims',
      'Ensure transparency about fees, charges, and eligibility criteria',
      'Protect customer data and privacy',
    ];

    const specific: Record<string, string[]> = {
      email: [
        'Include unsubscribe option in all marketing emails',
        'Use clear subject lines (no misleading headers)',
        'Include sender information and contact details',
      ],
      sms: [
        'Keep messages concise (under 160 characters for single SMS)',
        'Include opt-out instructions (Reply STOP)',
        'Send only during permitted hours (9 AM - 9 PM)',
      ],
      whatsapp: [
        'Obtain consent before sending promotional messages',
        'Use WhatsApp Business API for commercial purposes',
        'Respect privacy and do not share customer data',
      ],
      social: [
        'Use appropriate hashtags (#AD for paid promotions)',
        'Ensure accuracy of all claims',
        'Respond to customer queries promptly',
      ],
    };

    return [...general, ...(specific[contentType] || [])];
  }
}
