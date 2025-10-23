const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function monitor() {
  const execId = '46283b9d-4c17-4d89-874d-af1e20344235';
  console.log(`📊 Monitoring execution: ${execId}\n`);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const exec = await prisma.workflowExecution.findUnique({
      where: { id: execId },
      include: { nodeExecutions: { orderBy: { startedAt: 'asc' } } }
    });

    if (exec) {
      const completed = exec.nodeExecutions.filter(ne => ne.status === 'completed').length;
      const failed = exec.nodeExecutions.filter(ne => ne.status === 'failed').length;
      const running = exec.nodeExecutions.filter(ne => ne.status === 'running').length;

      console.log(`[${new Date().toLocaleTimeString()}] ${exec.status} - Nodes: ${completed}✓ ${failed}✗ ${running}⏳ (${exec.nodeExecutions.length}/8)`);

      if (exec.status === 'completed' || exec.status === 'failed') {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`FINAL STATUS: ${exec.status.toUpperCase()}`);
        console.log('='.repeat(70));

        if (exec.error) {
          console.log(`\n❌ Workflow Error:\n${exec.error}\n`);
        }

        console.log('\nNode Execution Details:\n');
        exec.nodeExecutions.forEach((ne, i) => {
          const emoji = ne.status === 'completed' ? '✅' : ne.status === 'failed' ? '❌' : '⏳';
          console.log(`${i+1}. ${emoji} ${ne.nodeId} (${ne.status})`);

          if (ne.error) {
            console.log(`   ❌ Error: ${ne.error}\n`);
          }

          if (ne.nodeId === 'whatsapp-1') {
            console.log(`   📱 WhatsApp Node Output:`);
            if (ne.output) {
              const output = ne.output;
              if (output.batchMode) {
                console.log(`      Batch Mode: YES`);
                console.log(`      Total Rows: ${output.totalRows}`);
                console.log(`      Success: ${output.successCount}`);
                console.log(`      Failed: ${output.failureCount}`);
                if (output.results) {
                  console.log(`\n      Results:`);
                  output.results.forEach((r, idx) => {
                    const status = r.success ? '✓' : '✗';
                    console.log(`        ${idx+1}. ${status} ${r.customerId} - ${r.success ? r.to : r.error}`);
                  });
                }
              }
            }
            console.log('');
          }
        });

        if (exec.status === 'completed') {
          console.log('\n🎉 SUCCESS! Workflow completed successfully!');
          console.log('📱 WhatsApp messages should be delivered to +918610560986');
        }

        break;
      }
    }
  }

  await prisma.$disconnect();
}

monitor().catch(console.error);
