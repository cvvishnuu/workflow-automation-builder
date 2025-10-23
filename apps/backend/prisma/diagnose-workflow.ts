/**
 * Comprehensive workflow diagnosis
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 BFSI Workflow Diagnosis\n');
  console.log('═'.repeat(70));

  const workflow = await prisma.workflow.findFirst({
    where: {
      name: 'BFSI Marketing Campaign with Compliance',
    },
  });

  if (!workflow) {
    console.log('❌ Workflow not found');
    return;
  }

  const definition = workflow.definition as any;

  console.log('\n📊 WORKFLOW ANALYSIS\n');

  // Check each node
  const issues: string[] = [];
  const warnings: string[] = [];

  definition.nodes.forEach((node: any, index: number) => {
    console.log(`${index + 1}. ${node.label} (${node.type})`);

    // Check AI Content Generator
    if (node.type === 'ai_content_generator') {
      console.log('   Config:', JSON.stringify(node.config, null, 2));

      if (!node.config.contentType) {
        issues.push('AI node missing contentType');
      }
      if (!node.config.purpose) {
        issues.push('AI node missing purpose');
      }
    }

    // Check CSV Upload
    if (node.type === 'csv_upload') {
      console.log('   Config:', JSON.stringify(node.config, null, 2));

      if (!node.config.fileId && !node.config.fileUploadId) {
        warnings.push('CSV node: No file specified (will need to be uploaded at runtime)');
      }
    }

    // Check WhatsApp
    if (node.type === 'whatsapp') {
      console.log('   Config:', JSON.stringify(node.config, null, 2));

      if (!node.config.credentialId) {
        issues.push('WhatsApp node missing credentialId');
      }

      if (node.config.to.includes('{{input.customerData.phone}}')) {
        issues.push('WhatsApp "to" field expects customer data from CSV (needs CSV upload first)');
      } else if (node.config.to.includes('{{')) {
        warnings.push('WhatsApp "to" uses variable substitution');
      }

      if (node.config.message.includes('{{input.generatedContent}}')) {
        warnings.push('WhatsApp message expects AI-generated content (variable substitution)');
      }
    }

    // Check Compliance
    if (node.type === 'compliance_checker') {
      console.log('   Config:', JSON.stringify(node.config, null, 2));
    }

    console.log('');
  });

  console.log('\n═'.repeat(70));
  console.log('\n🔴 CRITICAL ISSUES:\n');

  if (issues.length === 0) {
    console.log('   ✅ No critical issues found!');
  } else {
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  console.log('\n🟡 WARNINGS:\n');

  if (warnings.length === 0) {
    console.log('   ✅ No warnings!');
  } else {
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  console.log('\n═'.repeat(70));
  console.log('\n📋 WORKFLOW FLOW:\n');

  const csvNode = definition.nodes.find((n: any) => n.type === 'csv_upload');
  const aiNode = definition.nodes.find((n: any) => n.type === 'ai_content_generator');
  const whatsappNode = definition.nodes.find((n: any) => n.type === 'whatsapp');

  if (csvNode) {
    console.log('✅ CSV Upload Node EXISTS');
    console.log('   - This node expects a CSV file with customer data');
    console.log('   - Expected columns: customer_id, name, email, phone, etc.');
    console.log('   - Can process MULTIPLE customers (one message per row)');
  } else {
    console.log('⚠️  NO CSV Upload Node');
    console.log('   - Workflow will send to a SINGLE number only');
  }

  console.log('');

  if (aiNode && whatsappNode) {
    const whatsappUsesVariable = whatsappNode.config.to.includes('{{');

    if (whatsappUsesVariable) {
      console.log('📱 WhatsApp Sending Mode: BATCH (from CSV)');
      console.log('   - Reads phone numbers from CSV');
      console.log('   - Sends personalized messages to each customer');
      console.log('   - Requires CSV upload to work');
    } else {
      console.log('📱 WhatsApp Sending Mode: SINGLE');
      console.log(`   - Sends to fixed number: ${whatsappNode.config.to}`);
      console.log('   - No CSV required');
      console.log('   - Same message content');
    }
  }

  console.log('\n═'.repeat(70));
  console.log('\n💡 RECOMMENDATION:\n');

  if (issues.some(i => i.includes('customerData'))) {
    console.log('Current workflow expects CSV with customer data.');
    console.log('Two options:\n');
    console.log('Option 1: Upload CSV with customer data');
    console.log('   - Format: customer_id,name,email,phone');
    console.log('   - Can send to multiple customers');
    console.log('   - Personalized messages\n');
    console.log('Option 2: Simplify for single-number test');
    console.log('   - Change WhatsApp "to" field to: +918610560986');
    console.log('   - Remove dependency on CSV');
    console.log('   - Quick testing\n');
  } else {
    console.log('✅ Workflow is ready to test!');
    console.log('   Just click "Run" in the UI.\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
