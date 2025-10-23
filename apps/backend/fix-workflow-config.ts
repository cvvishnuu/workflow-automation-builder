import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking workflow configuration...\n');

  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' }
  });

  if (!workflow) {
    console.log('❌ Workflow not found!');
    return;
  }

  const definition = workflow.definition as any;

  console.log('Current Configuration:');
  console.log('=====================\n');

  // Check AI content generator node
  const aiNode = definition.nodes.find((n: any) => n.nodeId === 'ai-gen-1');
  if (aiNode) {
    console.log('AI Content Generator Node (ai-gen-1):');
    console.log('  keyPoints type:', typeof aiNode.config.keyPoints);
    console.log('  keyPoints value:', aiNode.config.keyPoints);
    console.log('');
  }

  // Check WhatsApp node
  const whatsappNode = definition.nodes.find((n: any) => n.nodeId === 'whatsapp-1');
  if (whatsappNode) {
    console.log('WhatsApp Node (whatsapp-1):');
    console.log('  credentialId:', whatsappNode.config.credentialId);
    console.log('');
  }

  // Check if credentials exist
  const credentials = await prisma.credential.findMany({
    where: {
      isActive: true
    },
    include: {
      integration: true
    }
  });

  console.log('Available Credentials:');
  credentials.forEach(cred => {
    console.log(`  - ${cred.id} (${cred.integration.type}) - ${cred.name}`);
  });
  console.log('');

  // Fix the issues
  console.log('🔧 Fixing issues...\n');

  // Fix keyPoints (convert string to array)
  if (aiNode && typeof aiNode.config.keyPoints === 'string') {
    const keyPointsArray = aiNode.config.keyPoints
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => line.replace(/^-\s*/, '').trim());

    aiNode.config.keyPoints = keyPointsArray;
    console.log('✅ Fixed AI content generator keyPoints (string → array)');
  }

  // Fix WhatsApp credential ID
  const whatsappCred = credentials.find(c => c.integration.type === 'whatsapp');
  if (whatsappNode && whatsappCred) {
    whatsappNode.config.credentialId = whatsappCred.id;
    console.log(`✅ Updated WhatsApp credential ID to: ${whatsappCred.id}`);
  }

  // Update workflow
  await prisma.workflow.update({
    where: { id: 'workflow_bfsi_marketing_template' },
    data: {
      definition: definition
    }
  });

  console.log('\n🎉 Workflow configuration updated successfully!');

  await prisma.$disconnect();
}

main().catch(console.error);
