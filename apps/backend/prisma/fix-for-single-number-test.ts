/**
 * Fix workflow for single-number testing
 * Changes from batch mode to simple test mode
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing workflow for single-number testing...\n');

  const workflows = await prisma.workflow.findMany({
    where: {
      name: 'BFSI Marketing Campaign with Compliance',
    },
  });

  for (const workflow of workflows) {
    const definition = workflow.definition as any;

    // Find the WhatsApp node
    const whatsappNode = definition.nodes.find((n: any) => n.type === 'whatsapp');

    if (whatsappNode) {
      console.log('📱 Updating WhatsApp node...');
      console.log(`   Before: ${whatsappNode.config.to}`);

      // Change to fixed number instead of variable
      whatsappNode.config.to = '+918610560986';
      whatsappNode.config.message = '{{generatedContent}}'; // Simplified variable

      console.log(`   After: ${whatsappNode.config.to}`);
    }

    // Update the workflow
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        definition: definition as any,
      },
    });

    console.log(`✅ Updated workflow for user: ${workflow.userId}\n`);
  }

  console.log('🎉 Workflow fixed!\n');
  console.log('Now the workflow will:');
  console.log('1. ✅ Generate AI content with Gemini');
  console.log('2. ✅ Check compliance');
  console.log('3. ✅ Send WhatsApp to +918610560986 (fixed number)');
  console.log('4. ✅ No CSV required!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
