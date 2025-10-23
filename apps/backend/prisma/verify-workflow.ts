/**
 * Verify Workflow Script
 * Checks the current workflow definition in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching workflow from database...');

  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
  });

  if (!workflow) {
    console.error('❌ Workflow not found!');
    return;
  }

  console.log('✅ Workflow found:', workflow.name);

  const definition = workflow.definition as any;
  const conditionalNode = definition.nodes.find((n: any) => n.nodeId === 'conditional-1');

  if (!conditionalNode) {
    console.error('❌ Conditional node not found!');
    return;
  }

  console.log('\n📋 Conditional Node Config:');
  console.log('Node ID:', conditionalNode.nodeId);
  console.log('Type:', conditionalNode.type);
  console.log('Label:', conditionalNode.label);
  console.log('Condition:', conditionalNode.config.condition);

  console.log('\n✅ Verification complete!');
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
