import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
  });

  if (workflow && workflow.definition) {
    const def = workflow.definition as any;
    console.log('\n📋 BFSI Workflow Nodes:');
    console.log('='.repeat(60));
    def.nodes.forEach((node: any, idx: number) => {
      console.log(`\n${idx + 1}. ${node.label} (${node.type})`);
      console.log(`   Node ID: ${node.nodeId}`);
      if (node.type === 'conditional' && node.config) {
        console.log(`   Condition: ${node.config.condition}`);
        console.log(`   True Output: ${node.config.trueOutputId || 'NOT SET'}`);
        console.log(`   False Output: ${node.config.falseOutputId || 'NOT SET'}`);
      } else if (node.type === 'whatsapp' && node.config) {
        console.log(`   Credential ID: ${node.config.credentialId || 'NOT SET'}`);
        console.log(`   To: ${node.config.to}`);
        console.log(`   Message: ${node.config.message}`);
      }
    });

    console.log('\n\n🔗 Workflow Connections:');
    console.log('='.repeat(60));
    def.edges.forEach((edge: any, idx: number) => {
      console.log(`${idx + 1}. ${edge.source} → ${edge.target}${edge.sourceHandle ? ` (${edge.sourceHandle})` : ''}`);
    });
  }

  await prisma.$disconnect();
}

main();
