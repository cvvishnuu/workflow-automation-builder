const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing workflow execution via API...\n');

  try {
    const response = await axios.post('http://localhost:3001/api/v1/executions', {
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
      console.log('\nMonitoring execution:', response.data.id);
      
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        const exec = await prisma.workflowExecution.findUnique({
          where: { id: response.data.id },
          include: { nodeExecutions: true }
        });
        
        if (exec) {
          console.log('  ', exec.status, '-', exec.nodeExecutions.length, 'nodes');
          
          if (exec.status === 'completed' || exec.status === 'failed') {
            console.log('\nFinal:', exec.status);
            if (exec.error) console.log('Error:', exec.error);
            
            exec.nodeExecutions.forEach(ne => {
              const err = ne.error ? ' - ' + ne.error : '';
              console.log('  -', ne.nodeId, ':', ne.status + err);
            });
            break;
          }
        }
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
    console.log('\nAuth required. Please run workflow from browser UI.');
  }

  await prisma.$disconnect();
}

main();
