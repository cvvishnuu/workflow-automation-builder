const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Check current workflow state
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' }
  });

  if (!workflow) {
    console.log('❌ Workflow not found!');
    return;
  }

  const definition = workflow.definition;

  console.log('📊 WORKFLOW OWNERSHIP:');
  console.log('   Owner User ID:', workflow.userId);

  // Get owner details
  const owner = await prisma.user.findUnique({
    where: { id: workflow.userId }
  });
  console.log('   Owner Email:', owner?.email);
  console.log('   Owner Clerk ID:', owner?.clerkId);

  console.log('\n📋 WORKFLOW NODES (' + definition.nodes.length + ' total):');
  definition.nodes.forEach((node, i) => {
    console.log(`   ${i + 1}. ${node.nodeId} (type: ${node.type})`);
  });

  console.log('\n📊 RECENT WORKFLOW EXECUTIONS:');
  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId: 'workflow_bfsi_marketing_template' },
    orderBy: { startedAt: 'desc' },
    take: 5
  });

  if (executions.length === 0) {
    console.log('   ⚠️  No executions found - workflow has never been run!');
  } else {
    for (const exec of executions) {
      console.log(`\n   Execution: ${exec.id}`);
      console.log(`   Status: ${exec.status}`);
      console.log(`   Started: ${exec.startedAt}`);
      console.log(`   Completed: ${exec.completedAt || 'Not finished'}`);
      if (exec.error) {
        console.log(`   Error: ${exec.error}`);
      }

      // Get node executions
      const nodeExecs = await prisma.nodeExecution.findMany({
        where: { executionId: exec.id },
        orderBy: { startedAt: 'asc' }
      });

      console.log(`   Nodes executed: ${nodeExecs.length}`);
      nodeExecs.forEach((ne) => {
        console.log(`     - ${ne.nodeId}: ${ne.status}${ne.error ? ' (Error: ' + ne.error + ')' : ''}`);
      });
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
