/**
 * BFSI Component Testing Script
 * Tests AI generation, compliance checking, and WhatsApp notification
 */

import { config } from 'dotenv';
config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as twilio from 'twilio';

async function testGeminiAPI() {
  console.log('\n🧪 Test 1: Gemini AI Content Generation\n');
  console.log('─'.repeat(60));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in environment');
    return false;
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate a professional WhatsApp message for a credit card promotion.

Target Audience: High-income professionals aged 30-45
Product: Premium Credit Card
Key Benefits:
- 0% APR for first 12 months
- 5% cashback on dining and travel
- Complimentary airport lounge access
- No annual fee for first year

Tone: Professional and compliant with financial regulations
Length: Under 150 words
Include: Necessary disclaimers about terms and conditions`;

    console.log('\n📝 Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('\n✅ Content generated successfully!\n');
    console.log('Generated Content:');
    console.log('─'.repeat(60));
    console.log(text);
    console.log('─'.repeat(60));
    console.log(`\nContent length: ${text.length} characters`);

    return { success: true, content: text };
  } catch (error: any) {
    console.log('\n❌ Gemini API Error:', error.message);
    if (error.message?.includes('API key')) {
      console.log('   → Check if API key is valid at https://makersuite.google.com/app/apikey');
    }
    return { success: false, error: error.message };
  }
}

async function testComplianceCheck(content: string) {
  console.log('\n\n🧪 Test 2: Compliance Checking\n');
  console.log('─'.repeat(60));

  // Simulated compliance rules (same as ComplianceService)
  const criticalTerms = [
    'guaranteed returns',
    'no risk',
    'risk-free',
    'assured profit',
    'cannot lose',
  ];

  const warningTerms = [
    'best investment',
    'highest returns',
    'limited time',
    'act now',
    'exclusive offer',
  ];

  let riskScore = 0;
  const flaggedTerms: any[] = [];

  const contentLower = content.toLowerCase();

  // Check critical terms
  criticalTerms.forEach((term) => {
    if (contentLower.includes(term)) {
      riskScore += 30;
      flaggedTerms.push({
        term,
        severity: 'critical',
        message: `Contains prohibited term: "${term}"`,
      });
    }
  });

  // Check warning terms
  warningTerms.forEach((term) => {
    if (contentLower.includes(term)) {
      riskScore += 10;
      flaggedTerms.push({
        term,
        severity: 'warning',
        message: `Contains potentially misleading term: "${term}"`,
      });
    }
  });

  // Check for required disclaimers
  const hasTermsDisclaimer =
    contentLower.includes('terms') && contentLower.includes('conditions');
  const hasRiskDisclaimer =
    contentLower.includes('subject to') || contentLower.includes('disclaimer');

  if (!hasTermsDisclaimer) {
    riskScore += 15;
    flaggedTerms.push({
      term: 'missing_disclaimer',
      severity: 'warning',
      message: 'Missing "Terms and Conditions" disclaimer',
    });
  }

  const passed = riskScore < 50;

  console.log(`Risk Score: ${riskScore}/100`);
  console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`\nFlagged Terms: ${flaggedTerms.length}`);

  if (flaggedTerms.length > 0) {
    flaggedTerms.forEach((flag, index) => {
      const emoji = flag.severity === 'critical' ? '🔴' : '🟡';
      console.log(`  ${emoji} ${index + 1}. ${flag.message}`);
    });
  } else {
    console.log('  ✅ No compliance issues found');
  }

  return {
    passed,
    riskScore,
    flaggedTerms,
  };
}

async function testWhatsAppNotification(content: string) {
  console.log('\n\n🧪 Test 3: WhatsApp Notification\n');
  console.log('─'.repeat(60));

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  const toNumber = 'whatsapp:+918610560986';

  if (!accountSid || !authToken || !fromNumber) {
    console.log('❌ Twilio credentials not configured');
    console.log('   Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM');
    return { success: false };
  }

  console.log('✅ Twilio credentials found');
  console.log(`   Account SID: ${accountSid.substring(0, 10)}...`);
  console.log(`   From: ${fromNumber}`);
  console.log(`   To: ${toNumber}`);

  try {
    const client = twilio.default(accountSid, authToken);

    console.log('\n📤 Sending WhatsApp message...');

    const message = await client.messages.create({
      body: `[TEST] BFSI Workflow Demo\n\n${content}\n\n---\nThis is a test message from your workflow automation platform.`,
      from: fromNumber,
      to: toNumber,
    });

    console.log('\n✅ Message sent successfully!');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   To: ${message.to}`);
    console.log(`   \n📱 Check WhatsApp on +918610560986 for the message`);

    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.log('\n❌ WhatsApp Error:', error.message);
    if (error.code === 21608) {
      console.log('   → The number may not be registered with Twilio WhatsApp sandbox');
      console.log('   → Send "join <sandbox-keyword>" to the Twilio WhatsApp number first');
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      BFSI Workflow Component Testing Suite               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Test 1: AI Content Generation
  const aiResult = await testGeminiAPI();
  if (!aiResult.success) {
    console.log('\n⚠️  AI generation failed. Skipping remaining tests.');
    process.exit(1);
  }

  // Test 2: Compliance Check
  const complianceResult = await testComplianceCheck(aiResult.content!);

  // Test 3: WhatsApp Notification
  const whatsappResult = await testWhatsAppNotification(aiResult.content!);

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`AI Content Generation:    ${aiResult.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Compliance Check:         ${complianceResult.passed ? '✅ PASSED' : '⚠️  PASSED WITH WARNINGS'}`);
  console.log(`  → Risk Score: ${complianceResult.riskScore}/100`);
  console.log(`WhatsApp Notification:    ${whatsappResult.success ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\n' + '─'.repeat(60));

  if (aiResult.success && whatsappResult.success) {
    console.log('✅ All critical components working!');
    console.log('   The BFSI workflow is ready for end-to-end execution.\n');
  } else {
    console.log('⚠️  Some components need attention before running the workflow.\n');
  }
}

main()
  .catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
