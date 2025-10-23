/**
 * Check All Workflows Script
 * Lists all workflows and their conditional expressions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching ALL workflows from database...\n');

  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (workflows.length === 0) {
    console.error('❌ No workflows found!');
    return;
  }

  console.log(`Found ${workflows.length} workflow(s):\n`);

  for (const workflow of workflows) {
    console.log('━'.repeat(80));
    console.log(`📋 Workflow: ${workflow.name}`);
    console.log(`   ID: ${workflow.id}`);
    console.log(`   User ID: ${workflow.userId}`);
    console.log(`   Created: ${workflow.createdAt}`);
    console.log(`   Active: ${workflow.isActive}`);

    const definition = workflow.definition as any;
    const conditionalNode = definition.nodes?.find((n: any) => n.type === 'conditional');

    if (conditionalNode) {
      console.log(`\n   ✅ Conditional Node Found:`);
      console.log(`      Node ID: ${conditionalNode.nodeId}`);
      console.log(`      Condition: ${conditionalNode.config?.condition || 'MISSING'}`);
    } else {
      console.log(`   ⚠️  No conditional node found`);
    }
    console.log('');
  }

  console.log('━'.repeat(80));
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
