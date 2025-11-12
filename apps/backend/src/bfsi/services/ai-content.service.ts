/**
 * AI Content Service
 * Generates marketing content using OpenAI/Claude API
 *
 * Features:
 * - Marketing email generation
 * - SMS/WhatsApp message generation
 * - Social media post generation
 * - Personalized content with variable substitution
 * - BFSI-compliant tone and language
 * - Batch content generation
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ContentGenerationRequest {
  contentType: 'email' | 'sms' | 'whatsapp' | 'social' | 'custom';
  purpose: string; // e.g., "promotional", "transactional", "reminder"
  targetAudience: string; // e.g., "savings account holders", "credit card users"
  keyPoints: string; // Main points to include (newline-separated)
  tone: 'professional' | 'friendly' | 'formal' | 'casual';
  maxLength?: number; // Character limit
  variables?: Record<string, string>; // Variables for personalization (e.g., {customer_name}, {offer_details})
  context?: string; // Additional context
}

export interface ContentGenerationResult {
  content: string;
  contentType: string;
  tokens: number;
  model: string;
  generatedAt: Date;
}

@Injectable()
export class AIContentService {
  private readonly OPENAI_API_KEY: string;
  private readonly GEMINI_API_KEY: string;
  private readonly AI_PROVIDER: 'openai' | 'gemini';

  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  private readonly OPENAI_MODEL = 'gpt-4o-mini';
  private readonly GEMINI_MODEL = 'gemini-2.5-flash'; // Free tier available
  private readonly MAX_RETRIES = 3;

  constructor(private readonly configService: ConfigService) {
    this.OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.GEMINI_API_KEY = this.configService.get<string>('GEMINI_API_KEY') || '';

    // Use Gemini by default if available, otherwise OpenAI
    this.AI_PROVIDER = this.GEMINI_API_KEY ? 'gemini' : 'openai';
  }

  /**
   * Generate marketing content using AI
   */
  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResult> {
    // Check if API key is configured
    if (this.AI_PROVIDER === 'gemini' && !this.GEMINI_API_KEY) {
      throw new InternalServerErrorException('GEMINI_API_KEY not configured');
    }
    if (this.AI_PROVIDER === 'openai' && !this.OPENAI_API_KEY) {
      throw new InternalServerErrorException('OPENAI_API_KEY not configured');
    }

    const prompt = this.buildPrompt(request);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (this.AI_PROVIDER === 'gemini') {
          return await this.generateWithGemini(request, prompt);
        } else {
          return await this.generateWithOpenAI(request, prompt);
        }
      } catch (error) {
        lastError = error;
        console.error(`AI content generation attempt ${attempt} failed:`, error);

        if (attempt < this.MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          await this.sleep(1000 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw new InternalServerErrorException(
      `Failed to generate content after ${this.MAX_RETRIES} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate content using OpenAI
   */
  private async generateWithOpenAI(
    request: ContentGenerationRequest,
    prompt: string
  ): Promise<ContentGenerationResult> {
    const response = await fetch(this.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: request.maxLength ? Math.min(request.maxLength * 2, 2000) : 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    return this.processGeneratedContent(
      content,
      request,
      data.usage?.total_tokens || 0,
      data.model
    );
  }

  /**
   * Generate content using Gemini
   */
  private async generateWithGemini(
    request: ContentGenerationRequest,
    prompt: string
  ): Promise<ContentGenerationResult> {
    const fullPrompt = `${this.getSystemPrompt()}\n\n${prompt}`;

    const response = await fetch(`${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: request.maxLength ? Math.min(request.maxLength * 4, 8000) : 4000,
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
      console.error('[Gemini API] Error response:', JSON.stringify(errorData, null, 2));
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    console.log('[Gemini API] Full response:', JSON.stringify(data, null, 2));

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!content) {
      console.error(
        '[Gemini API] No content in response. Full data:',
        JSON.stringify(data, null, 2)
      );

      // Check if content was blocked
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Content blocked by Gemini safety filters');
      }

      throw new Error('Empty response from Gemini API');
    }

    // Estimate tokens (Gemini doesn't always return token count)
    const estimatedTokens = Math.ceil(content.length / 4);

    return this.processGeneratedContent(content, request, estimatedTokens, this.GEMINI_MODEL);
  }

  /**
   * Process generated content (common logic for both providers)
   */
  private processGeneratedContent(
    content: string,
    request: ContentGenerationRequest,
    tokens: number,
    model: string
  ): ContentGenerationResult {
    // AI should have already personalized the content with customer data
    // No need for variable replacement since we provided actual values in the prompt
    return {
      content: content,
      contentType: request.contentType,
      tokens,
      model,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate content in batch for multiple requests
   */
  async generateBatch(requests: ContentGenerationRequest[]): Promise<ContentGenerationResult[]> {
    const results: ContentGenerationResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.generateContent(request);
        results.push(result);
      } catch (error) {
        console.error('Batch content generation error:', error);
        // Continue with other requests even if one fails
        results.push({
          content: '[GENERATION_FAILED]',
          contentType: request.contentType,
          tokens: 0,
          model: this.AI_PROVIDER === 'gemini' ? this.GEMINI_MODEL : this.OPENAI_MODEL,
          generatedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Build the user prompt based on request parameters
   */
  private buildPrompt(request: ContentGenerationRequest): string {
    let prompt = `Generate a ${request.contentType} for ${request.purpose} targeting ${request.targetAudience}.\n\n`;

    prompt += `Tone: ${request.tone}\n\n`;

    // Add customer context FIRST for better personalization
    if (request.context) {
      prompt += `${request.context}\n\n`;
    }

    if (request.keyPoints && request.keyPoints.trim().length > 0) {
      prompt += `Key points to include:\n`;
      const points = request.keyPoints.split('\n').filter((p) => p.trim());
      points.forEach((point, index) => {
        prompt += `${index + 1}. ${point.trim()}\n`;
      });
      prompt += '\n';
    }

    if (request.maxLength) {
      prompt += `Maximum length: ${request.maxLength} characters\n\n`;
    }

    if (request.variables && Object.keys(request.variables).length > 0) {
      prompt += `IMPORTANT - Personalization Variables:\n`;
      prompt += `You MUST use these customer details to personalize the message:\n`;
      Object.entries(request.variables).forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });
      prompt += '\nPersonalize the message by:\n';
      prompt += '1. Addressing the customer by their name\n';
      prompt += '2. Mentioning their city/location if relevant\n';
      prompt += '3. Tailoring the offer based on their profile (age, occupation, income, etc.)\n';
      prompt += '4. Making the message feel personal, not generic\n\n';
    }

    // Content type specific instructions
    switch (request.contentType) {
      case 'email':
        prompt += `Format: Include subject line (prefix with "Subject: ") and email body. Keep it concise and actionable.\n`;
        break;
      case 'sms':
        prompt += `Format: Plain text only, no formatting. Keep it under 160 characters if possible.\n`;
        break;
      case 'whatsapp':
        prompt += `Format: Conversational tone, can use emojis sparingly. Include a clear call-to-action.\n`;
        break;
      case 'social':
        prompt += `Format: Engaging social media post. Include relevant hashtags at the end.\n`;
        break;
    }

    prompt += `\nIMPORTANT: Ensure content is compliant with BFSI regulations (no misleading claims, clear disclosures, professional language).`;

    return prompt;
  }

  /**
   * System prompt for AI model
   */
  private getSystemPrompt(): string {
    return `You are a professional marketing content writer specializing in Banking, Financial Services, and Insurance (BFSI) sector.

Your content must:
1. Be compliant with BFSI regulations (RBI, SEBI, IRDAI guidelines)
2. Avoid misleading claims or exaggerations
3. Use clear, professional language
4. Include necessary disclaimers when discussing financial products
5. Be accurate and factual
6. Respect customer privacy
7. Avoid guaranteed returns or unrealistic promises
8. Follow Data Protection and Privacy Act (DPDPA) guidelines

When generating content:
- Use appropriate tone based on the request
- Be concise and actionable
- Include clear call-to-action
- Personalize using provided variables
- Maintain brand professionalism
- Ensure regulatory compliance

For disclaimers on financial products, use phrases like:
- "Terms and conditions apply"
- "Subject to eligibility criteria"
- "Returns are subject to market risks"
- "Please read all scheme-related documents carefully"`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate generated content for common compliance issues
   */
  validateContent(content: string): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for guaranteed returns language
    const guaranteedTerms = [
      /guaranteed?\s+returns?/i,
      /100%\s+safe/i,
      /no\s+risk/i,
      /assured\s+profit/i,
    ];

    for (const term of guaranteedTerms) {
      if (term.test(content)) {
        warnings.push('Content contains potentially misleading guarantee language');
        break;
      }
    }

    // Check for disclaimer presence when discussing returns
    if (/returns?|profit|gains?/i.test(content)) {
      if (!/risk|terms|conditions|subject to/i.test(content)) {
        warnings.push('Content discusses returns but lacks risk disclosure');
      }
    }

    // Check for excessive punctuation (!!!, ???)
    if (/[!?]{3,}/.test(content)) {
      warnings.push('Content contains excessive punctuation (unprofessional)');
    }

    // Check for all caps (shouting)
    const words = content.split(/\s+/);
    const allCapsWords = words.filter((word) => /^[A-Z]{4,}$/.test(word));
    if (allCapsWords.length > 2) {
      warnings.push('Content contains too many ALL CAPS words');
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
}
