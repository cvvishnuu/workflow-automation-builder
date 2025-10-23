const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const exec = await prisma.workflowExecution.findUnique({
    where: { id: 'c4f49d9d-bd64-4a71-b896-da5bdecc184b' },
    include: {
      nodeExecutions: {
        orderBy: { startedAt: 'asc' }
      }
    }
  });

  if (exec) {
    console.log('=== NODE EXECUTION OUTPUTS ===\n');

    exec.nodeExecutions.forEach((ne, i) => {
      console.log(`${i+1}. ${ne.nodeId} (${ne.status})`);
      if (ne.output) {
        console.log('   Output:', JSON.stringify(ne.output, null, 2).substring(0, 500));
        console.log('');
      }
      if (ne.input) {
        console.log('   Input:', JSON.stringify(ne.input, null, 2).substring(0, 500));
        console.log('');
      }
    });
  }

  await prisma.$disconnect();
}

check();
