const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function monitor() {
  console.log('Monitoring workflow executions...\n');
  console.log('Waiting for you to click RUN in the browser UI...\n');
  
  let lastExecutionId = null;
  
  // Get current latest execution
  const latest = await prisma.workflowExecution.findFirst({
    where: { workflowId: 'workflow_bfsi_marketing_template' },
    orderBy: { startedAt: 'desc' }
  });
  
  if (latest) {
    lastExecutionId = latest.id;
    console.log('Latest execution:', latest.id, '-', latest.status, '\n');
  }
  
  console.log('Waiting for new execution...\n');
  
  // Poll for new executions
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 1000));
    
    const newExec = await prisma.workflowExecution.findFirst({
      where: { 
        workflowId: 'workflow_bfsi_marketing_template',
        startedAt: { gt: latest ? latest.startedAt : new Date(0) }
      },
      orderBy: { startedAt: 'desc' },
      include: { nodeExecutions: true }
    });
    
    if (newExec && newExec.id !== lastExecutionId) {
      console.log('\n🚀 New execution detected!');
      console.log('   ID:', newExec.id);
      console.log('   Status:', newExec.status);
      console.log('   Started:', newExec.startedAt);
      
      lastExecutionId = newExec.id;
      
      // Monitor this execution
      let lastStatus = newExec.status;
      let lastNodeCount = newExec.nodeExecutions.length;
      
      for (let j = 0; j < 120; j++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const exec = await prisma.workflowExecution.findUnique({
          where: { id: newExec.id },
          include: { nodeExecutions: { orderBy: { startedAt: 'asc' } } }
        });
        
        if (exec) {
          if (exec.status !== lastStatus || exec.nodeExecutions.length !== lastNodeCount) {
            lastStatus = exec.status;
            lastNodeCount = exec.nodeExecutions.length;
            
            console.log(`\n   Status: ${exec.status} (${exec.nodeExecutions.length} nodes)`);
            
            if (exec.nodeExecutions.length > 0) {
              const lastNode = exec.nodeExecutions[exec.nodeExecutions.length - 1];
              console.log(`   Last node: ${lastNode.nodeId} - ${lastNode.status}`);
            }
          }
          
          if (exec.status === 'completed' || exec.status === 'failed') {
            console.log('\n✅ Execution finished!');
            console.log('   Final status:', exec.status);
            console.log('   Duration:', (exec.completedAt - exec.startedAt) / 1000, 'seconds');
            
            if (exec.error) {
              console.log('   Error:', exec.error);
            }
            
            console.log('\n   Node execution details:');
            exec.nodeExecutions.forEach(ne => {
              const status = ne.status === 'completed' ? '✅' : ne.status === 'failed' ? '❌' : '⏳';
              const err = ne.error ? ` - ERROR: ${ne.error}` : '';
              console.log(`   ${status} ${ne.nodeId}: ${ne.status}${err}`);
            });
            
            if (exec.status === 'completed') {
              console.log('\n🎉 Workflow completed successfully!');
              console.log('📱 Check WhatsApp +918610560986 for messages!');
            }
            
            break;
          }
        }
      }
      
      break;
    }
    
    if (i % 10 === 0 && i > 0) {
      console.log(`   Still waiting... (${i}s elapsed)`);
    }
  }
  
  await prisma.$disconnect();
}

monitor().catch(console.error);
