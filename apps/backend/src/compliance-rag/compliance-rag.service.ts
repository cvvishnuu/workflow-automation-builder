/**
 * Compliance RAG Service
 * AI-powered compliance checking using Google Gemini with RAG
 *
 * This replaces the hardcoded compliance rules with dynamic AI-based checking
 * using Retrieval-Augmented Generation (RAG) for accurate regulatory compliance.
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ComplianceCheckRequest,
  ComplianceCheckResult,
  FlaggedTerm,
} from '../bfsi/services/compliance.service';

@Injectable()
export class ComplianceRAGService {
  private readonly logger = new Logger(ComplianceRAGService.name);
  private readonly apiKey: string;
  private readonly GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  // BFSI Compliance Knowledge Base (SIMPLIFIED for faster processing)
  private readonly COMPLIANCE_KNOWLEDGE_BASE = `
**CRITICAL Violations (Reject immediately):**
- Guaranteed returns, assured profit, 100% safe, no risk, risk-free

**Required Disclaimers:**
- Loans: "Subject to credit approval, terms apply"
- Investments: "Subject to market risks, read documents carefully"
- Insurance: "Terms and exclusions apply"

**Forbidden Claims:**
- Exaggerated promises without proof
- Misleading comparisons
- Pressure tactics ("Act now or miss out")
`;

  constructor(private configService: ConfigService) {
    // Use GEMINI_API_KEY (same as AI content generator) instead of GOOGLE_AI_API_KEY
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      this.logger.warn(
        'Gemini API key not configured. Compliance RAG will not function. Add GEMINI_API_KEY to .env'
      );
    } else {
      this.logger.log('Compliance RAG Service initialized with Gemini 2.5 Flash (direct API)');
    }
  }

  /**
   * Perform AI-powered compliance check using RAG
   */
  async checkComplianceWithRAG(request: ComplianceCheckRequest): Promise<ComplianceCheckResult> {
    try {
      // If Gemini is not configured, fall back to basic validation
      if (!this.apiKey) {
        this.logger.warn('Gemini not configured, using basic validation');
        return this.basicComplianceCheck(request);
      }

      const { content, contentType, productCategory } = request;

      // Build RAG prompt with compliance knowledge
      const prompt = this.buildCompliancePrompt(content, contentType, productCategory);

      // Call Gemini API using direct fetch (same as AI content generator)
      const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent compliance analysis
            maxOutputTokens: 2000,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      // Log Gemini's raw response for debugging
      this.logger.debug(`[RAG] Gemini raw response: ${text.substring(0, 500)}...`);

      // Parse Gemini's response
      const complianceResult = this.parseGeminiResponse(text, content);

      this.logger.log(
        `Compliance check completed: ${complianceResult.isPassed ? 'PASSED' : 'FAILED'} (Risk: ${complianceResult.riskScore})`
      );

      return complianceResult;
    } catch (error) {
      this.logger.error(`Compliance RAG check failed: ${error.message}`, error.stack);

      // Fallback to basic check on error
      return this.basicComplianceCheck(request);
    }
  }

  /**
   * Build RAG-enhanced prompt for Gemini
   */
  private buildCompliancePrompt(
    content: string,
    contentType: string,
    _productCategory?: string
  ): string {
    return `BFSI compliance check for ${contentType}.

Content: "${content}"

Rules:
${this.COMPLIANCE_KNOWLEDGE_BASE}

Return JSON only:
{
  "isPassed": boolean,
  "riskScore": 0-100,
  "violations": [{"term": "text", "severity": "low|medium|high|critical", "reason": "why", "suggestion": "fix"}],
  "missingDisclaimers": ["required disclaimers not present"],
  "summary": "brief assessment"
}`;
  }

  /**
   * Parse Gemini's JSON response
   */
  private parseGeminiResponse(
    geminiResponse: string,
    originalContent: string
  ): ComplianceCheckResult {
    try {
      // Extract JSON from response (Gemini might add markdown code blocks)
      let jsonText = geminiResponse.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Convert to our ComplianceCheckResult format
      const flaggedTerms: FlaggedTerm[] = (parsed.violations || []).map((v: any) => ({
        term: v.term || 'unknown',
        category: v.reason?.includes('guarantee') ? 'misleading' : 'general',
        severity: v.severity || 'medium',
        reason: v.reason || 'Compliance violation detected',
        position: this.findTermPosition(originalContent, v.term),
      }));

      // Add missing disclaimer violations
      if (parsed.missingDisclaimers && parsed.missingDisclaimers.length > 0) {
        parsed.missingDisclaimers.forEach((disclaimer: string) => {
          flaggedTerms.push({
            term: '[MISSING DISCLAIMER]',
            category: 'missing_disclosure',
            severity: 'medium',
            reason: `Missing required disclaimer: "${disclaimer}"`,
            position: { start: 0, end: 0 },
          });
        });
      }

      const suggestions = parsed.suggestions || [];

      // Add suggestions from individual violations
      (parsed.violations || []).forEach((v: any) => {
        if (v.suggestion) {
          suggestions.push(v.suggestion);
        }
      });

      return {
        isPassed: parsed.isPassed !== false && parsed.riskScore < 50,
        riskScore: Math.min(Math.max(parsed.riskScore || 0, 0), 100),
        flaggedTerms,
        suggestions,
        complianceRules: [
          'RBI Consumer Protection Guidelines',
          'SEBI Marketing Code of Conduct',
          'IRDAI Advertisement Regulations',
          'TRAI Communication Guidelines',
          'Data Protection and Privacy Act (DPDPA)',
        ],
        summary: parsed.summary || 'Compliance check completed via AI',
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      this.logger.debug(`Gemini raw response: ${geminiResponse}`);

      // Return a safe fallback
      return {
        isPassed: false,
        riskScore: 50,
        flaggedTerms: [
          {
            term: 'AI parsing error',
            category: 'system',
            severity: 'medium',
            reason: 'Unable to parse AI compliance response',
            position: { start: 0, end: 0 },
          },
        ],
        suggestions: ['Manual review required due to AI parsing error'],
        complianceRules: ['RBI Guidelines', 'SEBI Guidelines', 'IRDAI Guidelines'],
        summary: 'AI compliance check encountered an error, manual review recommended',
      };
    }
  }

  /**
   * Find position of term in content
   */
  private findTermPosition(content: string, term: string): { start: number; end: number } {
    if (!term || term === 'unknown' || term === '[MISSING DISCLAIMER]') {
      return { start: 0, end: 0 };
    }

    const index = content.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) {
      return { start: 0, end: 0 };
    }

    return { start: index, end: index + term.length };
  }

  /**
   * Basic compliance check (fallback when Gemini is not available)
   */
  private basicComplianceCheck(request: ComplianceCheckRequest): ComplianceCheckResult {
    const { content } = request;
    const flaggedTerms: FlaggedTerm[] = [];

    // Basic keyword detection
    const criticalTerms = [
      'guaranteed returns',
      '100% safe',
      'no risk',
      'assured profit',
      'risk-free',
    ];

    for (const term of criticalTerms) {
      if (content.toLowerCase().includes(term)) {
        flaggedTerms.push({
          term,
          category: 'misleading',
          severity: 'critical',
          reason: 'Prohibited term - violates RBI/SEBI guidelines',
          position: this.findTermPosition(content, term),
        });
      }
    }

    const riskScore = flaggedTerms.length > 0 ? 75 : 20;

    return {
      isPassed: flaggedTerms.length === 0,
      riskScore,
      flaggedTerms,
      suggestions:
        flaggedTerms.length > 0
          ? ['Remove prohibited terms', 'Add required disclaimers']
          : ['Content appears compliant'],
      complianceRules: ['RBI Guidelines (Basic Check)', 'SEBI Guidelines (Basic Check)'],
      summary:
        flaggedTerms.length > 0
          ? `Basic check failed: ${flaggedTerms.length} prohibited term(s) found`
          : 'Basic check passed',
    };
  }
}
