const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const exec = await prisma.workflowExecution.findUnique({
    where: { id: 'c4f49d9d-bd64-4a71-b896-da5bdecc184b' },
    include: { nodeExecutions: { orderBy: { startedAt: 'asc' } } }
  });
  
  if (exec) {
    console.log('Status:', exec.status);
    console.log('Nodes:', exec.nodeExecutions.length, '/ 8');
    console.log('');
    
    if (exec.error) {
      console.log('Error:', exec.error);
      console.log('');
    }
    
    console.log('Node Details:');
    exec.nodeExecutions.forEach((ne, i) => {
      const emoji = ne.status === 'completed' ? 'OK' : ne.status === 'failed' ? 'FAIL' : 'RUN';
      console.log(`  ${i+1}. [${emoji}] ${ne.nodeId}`);
      if (ne.error) {
        console.log(`      Error: ${ne.error}`);
      }
    });
  }
  
  await prisma.$disconnect();
}

check();
