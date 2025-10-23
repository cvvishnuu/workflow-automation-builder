import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
  });

  if (!workflow || !workflow.definition) {
    console.log('❌ Workflow not found!');
    process.exit(1);
  }

  const def = workflow.definition as any;

  console.log('\n✅ WORKFLOW VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Workflow ID: ${workflow.id}`);
  console.log(`Last Updated: ${workflow.updatedAt}`);
  console.log(`Total Nodes: ${def.nodes.length}`);
  console.log(`Total Edges: ${def.edges.length}`);

  console.log('\n📋 ALL NODES:');
  console.log('='.repeat(70));

  const expectedNodes = [
    'trigger-1',
    'csv-1',
    'ai-gen-1',
    'compliance-1',
    'conditional-1',
    'whatsapp-1',
    'delay-1',
    'compliance-report-1'
  ];

  expectedNodes.forEach((nodeId) => {
    const node = def.nodes.find((n: any) => n.nodeId === nodeId);
    if (node) {
      console.log(`✅ ${node.nodeId.padEnd(20)} | ${node.type.padEnd(25)} | ${node.label}`);
    } else {
      console.log(`❌ ${nodeId.padEnd(20)} | MISSING!`);
    }
  });

  console.log('\n🔗 ALL CONNECTIONS:');
  console.log('='.repeat(70));
  def.edges.forEach((edge: any) => {
    const sourceNode = def.nodes.find((n: any) => n.nodeId === edge.source);
    const targetNode = def.nodes.find((n: any) => n.nodeId === edge.target);
    console.log(`${sourceNode?.label || edge.source} → ${targetNode?.label || edge.target}${edge.sourceHandle ? ` (${edge.sourceHandle})` : ''}`);
  });

  console.log('\n📄 FULL WORKFLOW JSON (for UI debugging):');
  console.log('='.repeat(70));
  console.log(JSON.stringify(workflow.definition, null, 2));

  await prisma.$disconnect();
}

main();
