const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Testing FIXED workflow execution...\n');

  try {
    const response = await axios.post('http://localhost:3001/api/v1/executions/test', {
      workflowId: 'workflow_bfsi_marketing_template',
      input: {
        csvFilePath: '/tmp/millennials_homeloan_campaign_small.csv',
      }
    }, {
      validateStatus: () => true
    });

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.id) {
      const executionId = response.data.id;
      console.log(`\n📊 Monitoring execution: ${executionId}\n`);

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));

        const exec = await prisma.workflowExecution.findUnique({
          where: { id: executionId },
          include: { nodeExecutions: { orderBy: { startedAt: 'asc' } } }
        });

        if (exec) {
          const completed = exec.nodeExecutions.filter(ne => ne.status === 'completed').length;
          const failed = exec.nodeExecutions.filter(ne => ne.status === 'failed').length;
          const running = exec.nodeExecutions.filter(ne => ne.status === 'running').length;

          console.log(`  [${exec.status}] Nodes: ${completed}✓ ${failed}✗ ${running}⏳ (${exec.nodeExecutions.length}/8)`);

          if (exec.status === 'completed' || exec.status === 'failed') {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`FINAL STATUS: ${exec.status.toUpperCase()}`);
            console.log('='.repeat(60));

            if (exec.error) {
              console.log(`\n❌ Workflow Error: ${exec.error}\n`);
            }

            console.log('\nNode Execution Details:\n');
            exec.nodeExecutions.forEach((ne, i) => {
              const emoji = ne.status === 'completed' ? '✅' : ne.status === 'failed' ? '❌' : '⏳';
              console.log(`${i+1}. ${emoji} ${ne.nodeId} (${ne.status})`);

              if (ne.error) {
                console.log(`   Error: ${ne.error}`);
              }

              if (ne.nodeId === 'whatsapp-1' && ne.output) {
                const output = ne.output;
                console.log(`   Output:`, JSON.stringify(output, null, 2).substring(0, 300));
              }
            });

            if (exec.status === 'completed') {
              console.log('\n🎉 SUCCESS! Workflow completed!');
              console.log('📱 Check WhatsApp messages on +918610560986\n');
            }

            break;
          }
        }
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  await prisma.$disconnect();
}

main();
