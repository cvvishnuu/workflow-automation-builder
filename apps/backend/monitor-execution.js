const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXECUTION_ID = 'c4f49d9d-bd64-4a71-b896-da5bdecc184b';

async function monitor() {
  console.log('Monitoring execution:', EXECUTION_ID);
  console.log('');
  
  let lastStatus = 'running';
  let lastNodeCount = 0;
  
  for (let i = 0; i < 60; i++) {
    const exec = await prisma.workflowExecution.findUnique({
      where: { id: EXECUTION_ID },
      include: { 
        nodeExecutions: { 
          orderBy: { startedAt: 'asc' } 
        } 
      }
    });
    
    if (exec) {
      if (exec.status !== lastStatus || exec.nodeExecutions.length !== lastNodeCount) {
        lastStatus = exec.status;
        lastNodeCount = exec.nodeExecutions.length;
        
        console.log(`[${new Date().toLocaleTimeString()}] Status: ${exec.status} | Nodes: ${exec.nodeExecutions.length}/8`);
        
        if (exec.nodeExecutions.length > 0) {
          const lastNode = exec.nodeExecutions[exec.nodeExecutions.length - 1];
          console.log(`  └─ Latest: ${lastNode.nodeId} (${lastNode.status})`);
          
          if (lastNode.error) {
            console.log(`     Error: ${lastNode.error}`);
          }
        }
      }
      
      if (exec.status === 'completed' || exec.status === 'failed') {
        console.log('');
        console.log('════════════════════════════════════════');
        console.log(' EXECUTION COMPLETE');
        console.log('════════════════════════════════════════');
        console.log('Final Status:', exec.status);
        console.log('Nodes Executed:', exec.nodeExecutions.length);
        
        if (exec.error) {
          console.log('Error:', exec.error);
        }
        
        console.log('');
        console.log('Node Details:');
        exec.nodeExecutions.forEach((ne, i) => {
          const emoji = ne.status === 'completed' ? '✅' : ne.status === 'failed' ? '❌' : '⏳';
          console.log(`  ${i+1}. ${emoji} ${ne.nodeId} (${ne.status})`);
          if (ne.error) {
            console.log(`     └─ Error: ${ne.error}`);
          }
        });
        
        if (exec.status === 'completed') {
          console.log('');
          console.log('🎉 SUCCESS! Check WhatsApp +918610560986 for messages!');
        }
        
        break;
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  await prisma.$disconnect();
}

monitor().catch(console.error);
