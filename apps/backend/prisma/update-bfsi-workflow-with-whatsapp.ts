/**
 * Update BFSI workflow with WhatsApp number for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating BFSI workflow with WhatsApp configuration...\n');

  // Get the workflow
  const workflow = await prisma.workflow.findFirst({
    where: {
      name: 'BFSI Marketing Campaign with Compliance',
    },
  });

  if (!workflow) {
    console.log('❌ BFSI workflow not found');
    return;
  }

  const definition = workflow.definition as any;

  // Update the WhatsApp node configuration
  const whatsappNode = definition.nodes.find((n: any) => n.type === 'whatsapp');

  if (whatsappNode) {
    whatsappNode.config = {
      ...whatsappNode.config,
      to: '+918610560986', // Fixed WhatsApp number
      message: '{{generatedContent}}', // Will be replaced with AI-generated content
      mediaUrl: '',
    };
    console.log('✅ Updated WhatsApp node with number: +918610560986');
  }

  // Update AI content generator with better config
  const aiNode = definition.nodes.find((n: any) => n.type === 'ai_content_generator');

  if (aiNode) {
    aiNode.config = {
      contentType: 'whatsapp',
      purpose: 'Promote new premium credit card',
      targetAudience: 'High-income professionals aged 30-45',
      keyPoints: [
        '0% APR for first 12 months',
        '5% cashback on dining and travel',
        'Complimentary airport lounge access',
        'No annual fee for first year',
        'Subject to eligibility criteria',
        'Terms and conditions apply'
      ],
      tone: 'professional',
      maxLength: 300,
    };
    console.log('✅ Updated AI content generator configuration');
  }

  // Save the updated workflow
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      definition: definition as any,
    },
  });

  console.log('\n✅ Workflow updated successfully!');
  console.log('   The workflow is now configured to:');
  console.log('   1. Generate AI content using Gemini');
  console.log('   2. Check compliance');
  console.log('   3. Send WhatsApp to +918610560986 if compliant\n');
}

main()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
