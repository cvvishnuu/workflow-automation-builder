/**
 * Compliance RAG Service
 * AI-powered compliance checking using Google Gemini with RAG
 *
 * This replaces the hardcoded compliance rules with dynamic AI-based checking
 * using Retrieval-Augmented Generation (RAG) for accurate regulatory compliance.
 *
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ComplianceCheckRequest,
  ComplianceCheckResult,
  FlaggedTerm,
} from '../bfsi/services/compliance.service';
import { ComplianceXaiMetadata } from '@workflow/shared-types';

@Injectable()
export class ComplianceRAGService {
  private readonly logger = new Logger(ComplianceRAGService.name);
  private readonly apiKey: string;
  private readonly GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  // BFSI Compliance Knowledge Base (SIMPLIFIED for faster processing)
  private readonly COMPLIANCE_KNOWLEDGE_BASE = `
**ALLOWED Communications (NOT violations):**
- Financial product promotions (credit cards, loans, insurance) to EXISTING customers are ALLOWED
- WhatsApp/SMS/Email messages to existing customers with opt-out are COMPLIANT
- Do NOT flag promotional content as "unsolicited" for existing bank customers
- These are legitimate business communications, not spam

**CRITICAL Violations (Auto-fail):**
- Guaranteed returns, assured profit, 100% safe, no risk, risk-free
- These are ALWAYS violations regardless of other factors

**MANDATORY Product-Specific Disclaimers:**

CREDIT CARDS (ALL three required):
1. "Subject to credit approval" - RBI MANDATORY
2. "Terms and conditions apply"
3. "Subject to eligibility criteria"
Missing ANY disclaimer = HIGH severity violation

LOANS:
- "Subject to credit approval"
- "Terms and conditions apply"
- "Processing fees may apply"

INVESTMENTS/MUTUAL FUNDS:
- "Subject to market risks"
- "Read all scheme-related documents carefully"
- "Past performance is not indicative of future returns"

INSURANCE:
- "Terms, conditions, and exclusions apply"
- "Please read the policy document carefully"

**UCC Compliance (Marketing Messages):**
- For EXISTING bank customers: Opt-out language is sufficient (e.g., "Reply STOP to opt-out")
- For NEW/UNKNOWN customers: Must have documented explicit opt-in
- IMPORTANT: Messages to existing customers WITH opt-out language are compliant
- Missing opt-out = MEDIUM severity (not auto-fail if targeting existing customers)

**Forbidden Claims:**
- Exaggerated promises without proof ("unparalleled", "best ever")
- Misleading comparisons
- Pressure tactics ("Act now or miss out", "Limited time only")
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

      // First call: compliance verdict (without XAI)
      // Use 4000 tokens (matching content generation) for verdict
      // Gemini 2.5 Flash uses ~1200 tokens for internal reasoning, rest for JSON output
      const verdictResponse = await this.callGeminiWithRetry(prompt, 4000);

      // Debug logging to diagnose empty response issue
      console.error(
        '[ComplianceRAGService] Full compliance verdict response:',
        JSON.stringify(verdictResponse, null, 2)
      );

      const verdictText = verdictResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!verdictText) {
        this.logger.error(
          '[ComplianceRAGService] Gemini returned empty verdictText. Response structure:',
          {
            hasCandidates: !!verdictResponse.candidates,
            candidatesLength: verdictResponse.candidates?.length,
            firstCandidate: verdictResponse.candidates?.[0],
          }
        );
        throw new Error('Empty response from Gemini API');
      }

      this.logger.debug(`[RAG] Gemini verdict response: ${verdictText.substring(0, 500)}...`);
      console.error(
        '[ComplianceRAGService] Full compliance verdict response:',
        JSON.stringify(verdictResponse, null, 2)
      );

      const complianceResult = this.parseComplianceVerdict(verdictText, content);

      // Second call: XAI explanation
      const xaiResult = await this.fetchComplianceXai({
        content,
        contentType,
        productCategory,
        verdict: complianceResult,
      });
      complianceResult.xai = xaiResult?.xai;
      complianceResult.xaiError = xaiResult?.xaiError;

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
    productCategory?: string
  ): string {
    return `BFSI compliance check for ${contentType} ${productCategory ? `(${productCategory})` : ''}.

Content: "${content}"

Compliance Rules:
${this.COMPLIANCE_KNOWLEDGE_BASE}

EVALUATION INSTRUCTIONS:
1. Check for CRITICAL violations (guaranteed returns, etc.) → Auto-fail if found
2. For credit cards: Verify ALL THREE disclaimers are present
3. UCC compliance: Messages to EXISTING customers with opt-out language are COMPLIANT (not a violation)
4. Only flag missing opt-out as MEDIUM severity, NOT critical (existing customers don't need explicit opt-in)
5. Exaggerated claims: Check for "unparalleled", "best ever", etc.
6. IMPORTANT: Financial product promotions (credit cards, loans, insurance) to existing customers are ALLOWED and NOT violations

IMPORTANT CONTEXT:
- These messages are sent to EXISTING bank customers (not cold outreach)
- Existing customer relationship = legitimate business communication
- Opt-out language ("Reply STOP") satisfies UCC/TRAI requirements for existing customers
- Banks are ALLOWED to promote products to existing customers with disclaimers and opt-out

SCORING LOGIC (riskScore represents RISK LEVEL):
- Start at 0 risk points (0 = no risk = compliant)
- Add risk points for violations:
  - CRITICAL violation: +100 (auto-fail)
  - HIGH severity (missing mandatory disclaimer): +30 each
  - MEDIUM severity (exaggerated claim): +15 each
  - LOW severity: +5 each
- Final riskScore: 0-100 (0-49 = pass, 50+ = fail)
- If NO violations found, riskScore = 0 and isPassed = true

Return JSON only, with this schema:
{
  "isPassed": boolean,
  "riskScore": 0-100,
  "scoreCalculation": "human-readable calculation formula showing how risk score was computed",
  "violationsBreakdown": {
    "critical_count": number,
    "high_count": number,
    "medium_count": number,
    "low_count": number
  },
  "violations": [{"term": "text", "severity": "low|medium|high|critical", "reason": "why", "suggestion": "fix", "riskContribution": number}],
  "missingDisclaimers": ["required disclaimers not present"],
  "summary": "brief assessment"
}

Constraints:
- Respond ONLY in JSON.
- Keep summary under 120 characters.
- List all violations clearly with severity and reason.
- For EACH violation, include "riskContribution" showing the risk points added (critical=100, high=30, medium=15, low=5).
- Include "scoreCalculation" with formula, e.g., "2 MEDIUM (15×2=30) + 0 HIGH (0) = 30 total risk".
- Include "violationsBreakdown" object with counts for each severity level.
- Include all missing disclaimers in missingDisclaimers array.`;
  }

  private buildXaiPrompt(payload: {
    content: string;
    contentType: string;
    verdict: ComplianceCheckResult;
  }): string {
    const { content, contentType, verdict } = payload;
    return `Explain compliance verdict for ${contentType}.

Content: "${content}"

Verdict: ${verdict.isPassed ? 'PASS' : 'FAIL'}, Risk: ${verdict.riskScore}
Violations Found: ${verdict.flaggedTerms?.length || 0}

IMPORTANT: This is EXPLANATION ONLY. Do NOT make new compliance judgments.
Provide a detailed explanation of why the existing verdict was reached.

Return JSON only:
{
  "reasoning_trace": ["step-by-step evaluation process", "3-6 detailed steps explaining checks performed"],
  "decision_factors": ["key compliance rules evaluated", "regulatory requirements checked", "top 5 factors"],
  "score_breakdown": {
    "calculation": "human-readable formula showing how ${verdict.riskScore} was computed",
    "violations_by_severity": {
      "critical": number,
      "high": number,
      "medium": number,
      "low": number
    }
  },
  "confidence": 0-1,
  "rule_hits": [
    {
      "rule": "RBI/SEBI/IRDAI/TRAI rule name",
      "severity": "info",
      "reason": "detailed explanation of how this rule was evaluated",
      "evidence": "specific text from the message that was checked"
    }
  ],
  "feature_contributions": [
    {
      "feature": "compliance_factor",
      "weight": 0-1,
      "impact": "how this factor influenced the pass/fail decision"
    }
  ]
}

Guidelines:
- Provide 3-6 detailed reasoning steps explaining the compliance evaluation
- Include top 5 decision factors (regulatory rules, disclaimers, prohibited terms, etc.)
- INCLUDE "score_breakdown" with calculation formula, e.g., "2 MEDIUM violations (15×2) = 30 total risk"
- Count violations by severity level (critical, high, medium, low)
- List all relevant rule_hits with specific evidence from the message
- Use feature_contributions to explain key compliance factors (disclaimers, opt-out, tone, etc.)
- Use "info" severity for explanatory rule_hits (not compliance judgments)
- Make explanations educational and transparent
- Omit empty arrays`;
  }

  /**
   * Parse Gemini's JSON response
   */
  private parseComplianceVerdict(
    geminiResponse: string,
    originalContent: string
  ): ComplianceCheckResult {
    try {
      // Log raw Gemini body for diagnostics before parsing (PII is limited to prompt content)
      console.error('[ComplianceRAGService] Raw compliance response:', geminiResponse);

      // Extract JSON from response (Gemini might add markdown code blocks)
      const parsed = this.safeParseJson(geminiResponse);

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

      // Nuanced pass/fail logic:
      // 1. Check for critical violations (guaranteed returns, etc.) → Auto-fail
      // 2. Check for high severity violations (missing mandatory disclaimers) → Auto-fail if 2+
      // 3. Otherwise trust Gemini's isPassed judgment
      const hasCriticalViolation = flaggedTerms.some((t) => t.severity === 'critical');
      const highSeverityCount = flaggedTerms.filter((t) => t.severity === 'high').length;

      // More lenient pass logic:
      // - Critical violations = auto-fail (guaranteed returns, etc.)
      // - 2+ high severity = fail (multiple missing mandatory disclaimers)
      // - Otherwise trust Gemini's isPassed field (AI knows best)
      const shouldPass = hasCriticalViolation
        ? false // Critical violation = always fail
        : highSeverityCount >= 2
          ? false // 2+ high severity = fail
          : parsed.isPassed !== false; // Trust Gemini's judgment

      return {
        isPassed: shouldPass,
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

      // Build a safe fallback XAI and result when parsing fails
      const fallbackXai = this.buildFallbackXai([], [], 50);

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
        xai: fallbackXai,
        xaiError: 'Gemini returned malformed JSON for compliance XAI',
      };
    }
  }

  /**
   * Build Compliance XAI object from parsed response
   */
  private buildComplianceXai(parsed: any): ComplianceXaiMetadata | undefined {
    // Accept either top-level xai.* or top-level reasoning_trace/decision_factors
    const xaiRoot = parsed.xai || parsed;

    const xai: ComplianceXaiMetadata = {
      reasoningTrace: Array.isArray(xaiRoot?.reasoning_trace)
        ? xaiRoot.reasoning_trace.map((r: any) => String(r))
        : undefined,
      decisionFactors: Array.isArray(xaiRoot?.decision_factors)
        ? xaiRoot.decision_factors.map((f: any) => String(f))
        : undefined,
      scoreBreakdown: xaiRoot?.score_breakdown
        ? {
            calculation: xaiRoot.score_breakdown.calculation
              ? String(xaiRoot.score_breakdown.calculation)
              : undefined,
            violationsBySeverity: xaiRoot.score_breakdown.violations_by_severity
              ? {
                  critical: Number(xaiRoot.score_breakdown.violations_by_severity.critical || 0),
                  high: Number(xaiRoot.score_breakdown.violations_by_severity.high || 0),
                  medium: Number(xaiRoot.score_breakdown.violations_by_severity.medium || 0),
                  low: Number(xaiRoot.score_breakdown.violations_by_severity.low || 0),
                }
              : undefined,
          }
        : undefined,
      confidence:
        typeof xaiRoot?.confidence === 'number'
          ? Math.min(Math.max(xaiRoot.confidence, 0), 1)
          : undefined,
      featureContributions: Array.isArray(xaiRoot?.feature_contributions)
        ? xaiRoot.feature_contributions
            .filter((fc: any) => fc?.feature)
            .map((fc: any) => ({
              feature: String(fc.feature),
              weight:
                typeof fc.weight === 'number' ? Math.min(Math.max(fc.weight, 0), 1) : undefined,
              impact: fc.impact ? String(fc.impact) : '',
            }))
        : undefined,
      ruleHits: Array.isArray(xaiRoot?.rule_hits)
        ? xaiRoot.rule_hits
            .filter((rh: any) => rh?.rule)
            .map((rh: any) => ({
              rule: String(rh.rule),
              severity: rh.severity,
              reason: rh.reason,
              evidence: rh.evidence,
              sourceId: rh.sourceId,
            }))
        : undefined,
      evidence: Array.isArray(xaiRoot?.evidence)
        ? xaiRoot.evidence
            .filter((ev: any) => ev?.text)
            .map((ev: any) => ({
              sourceId: ev.sourceId,
              text: String(ev.text),
            }))
        : undefined,
    };

    const hasXai =
      (xai.reasoningTrace && xai.reasoningTrace.length > 0) ||
      (xai.decisionFactors && xai.decisionFactors.length > 0) ||
      xai.scoreBreakdown !== undefined ||
      xai.confidence !== undefined ||
      (xai.featureContributions && xai.featureContributions.length > 0) ||
      (xai.ruleHits && xai.ruleHits.length > 0) ||
      (xai.evidence && xai.evidence.length > 0);

    return hasXai ? xai : undefined;
  }

  /**
   * Fallback XAI when model omits XAI block: derive from violations, missing disclaimers, and risk score.
   */
  private buildFallbackXai(
    flaggedTerms: FlaggedTerm[],
    suggestions: string[],
    riskScore: number,
    missingDisclaimers?: any[]
  ): ComplianceXaiMetadata | undefined {
    const decisionFactors: string[] = [];
    const ruleHits =
      flaggedTerms.length > 0
        ? flaggedTerms.map((t) => ({
            rule: t.category,
            severity: t.severity,
            reason: t.reason,
            evidence: t.term,
          }))
        : [];

    if (missingDisclaimers && missingDisclaimers.length > 0) {
      decisionFactors.push(`Missing disclaimers: ${missingDisclaimers.join(', ')}`);
    }
    if (flaggedTerms.length > 0) {
      decisionFactors.push(`Flagged ${flaggedTerms.length} term(s)`);
    } else {
      decisionFactors.push('No violations detected under current rules');
    }
    if (suggestions.length > 0) {
      decisionFactors.push('Suggestions issued');
    }

    const reasoningTrace = [
      `Evaluated content against BFSI rules; riskScore=${riskScore ?? 'n/a'}`,
      flaggedTerms.length > 0 ? `Found ${flaggedTerms.length} violation(s)` : 'No violations found',
      missingDisclaimers && missingDisclaimers.length > 0
        ? `Missing disclaimers: ${missingDisclaimers.join(', ')}`
        : 'All required disclaimers present or not detected as missing',
    ];

    return {
      reasoningTrace,
      decisionFactors,
      confidence:
        typeof riskScore === 'number' ? Math.max(0, Math.min(1, 1 - riskScore / 100)) : undefined,
      ruleHits,
      featureContributions: undefined,
      evidence: undefined,
      xaiError: 'Fallback XAI constructed from parsed violations',
    };
  }

  /**
   * Safely parse Gemini JSON with lenient fixes (strip fences, trim to braces, remove trailing commas, quote keys)
   */
  private safeParseJson(raw: string): any {
    let text = raw.trim();

    // Strip markdown fences
    if (text.startsWith('```json')) {
      text = text
        .replace(/^```json\s*/, '')
        .replace(/```$/, '')
        .trim();
    } else if (text.startsWith('```')) {
      text = text
        .replace(/^```\s*/, '')
        .replace(/```$/, '')
        .trim();
    }

    // Try direct parse
    try {
      return JSON.parse(text);
    } catch (_e) {
      // continue
    }

    // Trim to outermost braces
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }

    // Remove trailing commas
    text = text.replace(/,\s*([}\]])/g, '$1');

    // Quote unquoted keys (best effort)
    text = text.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

    try {
      return JSON.parse(text);
    } catch (e) {
      // Log raw for diagnostics; ensure we do not leak PII beyond what the prompt already includes
      console.error('[ComplianceRAGService] Malformed compliance JSON:', raw);
      this.logger.error(`Failed to parse Gemini response after repair: ${e.message}`);
      throw e;
    }
  }

  /**
   * Call Gemini with retries/backoff
   */
  private async callGeminiWithRetry(prompt: string, maxTokens: number = 800): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.GEMINI_API_URL}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: maxTokens,
              responseMimeType: 'application/json',
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

        return await response.json();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Gemini compliance call failed (attempt ${attempt}/${this.MAX_RETRIES}): ${error.message}`
        );
        if (attempt < this.MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY_MS * attempt));
        }
      }
    }

    throw lastError;
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
    const warnings: string[] = [];

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
    const basicXai = this.buildFallbackXai(flaggedTerms, warnings, riskScore);

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
      xai: basicXai,
      xaiError: 'Gemini unavailable; used basic compliance check',
    };
  }

  /**
   * Fetch compliance XAI via separate Gemini call
   */
  private async fetchComplianceXai(payload: {
    content: string;
    contentType: string;
    productCategory?: string;
    verdict: ComplianceCheckResult;
  }): Promise<{ xai?: ComplianceXaiMetadata; xaiError?: string }> {
    try {
      const prompt = this.buildXaiPrompt(payload);
      // Use 8000 tokens for XAI to match content generation token limits (prevents JSON truncation)
      const data = await this.callGeminiWithRetry(prompt, 8000);

      // Debug: Log full response to diagnose empty XAI
      console.error(
        '[ComplianceRAGService] Full compliance XAI API response:',
        JSON.stringify(data, null, 2)
      );

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        this.logger.error('[ComplianceRAGService] Gemini returned empty XAI text. Response:', {
          hasCandidates: !!data.candidates,
          firstCandidate: data.candidates?.[0],
          finishReason: data.candidates?.[0]?.finishReason,
          usageMetadata: data.usageMetadata,
        });
        throw new Error('Empty XAI response from Gemini API');
      }

      this.logger.debug(`[RAG] Gemini XAI response: ${text.substring(0, 500)}...`);
      console.error(
        '[ComplianceRAGService] Full compliance XAI response:',
        JSON.stringify(data, null, 2)
      );

      const parsed = this.safeParseJson(text);
      const xai = this.buildComplianceXai({ xai: parsed });

      if (xai) {
        return { xai };
      }

      const fallbackXai = this.buildFallbackXai(
        payload.verdict.flaggedTerms || [],
        payload.verdict.suggestions || [],
        payload.verdict.riskScore
      );
      return {
        xai: fallbackXai,
        xaiError: 'Gemini omitted compliance XAI; generated fallback from verdict',
      };
    } catch (error) {
      this.logger.error(`Compliance XAI call failed: ${error.message}`);
      const fallbackXai = this.buildFallbackXai(
        payload.verdict.flaggedTerms || [],
        payload.verdict.suggestions || [],
        payload.verdict.riskScore
      );
      return {
        xai: fallbackXai,
        xaiError: 'Gemini compliance XAI call failed; using fallback explanation',
      };
    }
  }
}
