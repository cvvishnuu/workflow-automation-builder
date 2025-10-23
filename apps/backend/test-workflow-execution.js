const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Testing BFSI Workflow Execution...\n');

  try {
    // Step 1: Create file upload record
    console.log('📤 Creating file upload record...');
    const fileContent = fs.readFileSync('/tmp/millennials_homeloan_campaign_small.csv', 'utf-8');

    const uploadedFile = await prisma.fileUpload.create({
      data: {
        userId: 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e',
        filename: 'millennials_homeloan_campaign_small.csv',
        fileHash: 'test-hash-' + Date.now(),
        filePath: '/tmp/millennials_homeloan_campaign_small.csv',
        mimeType: 'text/csv',
        fileSize: Buffer.byteLength(fileContent),
        encryptionIv: 'test-iv',
        metadata: {
          rowCount: 3,
          columns: ['customerId', 'name', 'phone', 'email', 'city', 'income_bracket', 'age', 'credit_score']
        }
      }
    });

    console.log('✅ File uploaded:', uploadedFile.id, '\n');

    // Step 2: Trigger via HTTP POST to the backend API
    console.log('⚙️  Triggering workflow via HTTP POST...');
    
    const axios = require('axios');
    
    try {
      // Call the executions API endpoint (will fail auth, but let's try without auth for local dev)
      const response = await axios.post('http://localhost:3001/api/v1/executions', {
        workflowId: 'workflow_bfsi_marketing_template',
        input: {
          fileId: uploadedFile.id,
          csvFilePath: '/tmp/millennials_homeloan_campaign_small.csv',
        }
      }, {
        validateStatus: () => true // Don't throw on any status
      });

      if (response.status === 201 || response.status === 200) {
        console.log('✅ Workflow execution started:', response.data.id, '\n');
        
        // Monitor execution
        console.log('⏳ Monitoring execution (60 seconds)...\n');
        
        const executionId = response.data.id;
        let lastStatus = 'running';
        
        for (let i = 0; i < 60; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const execution = await prisma.workflowExecution.findUnique({
            where: { id: executionId },
            include: { nodeExecutions: true }
          });
          
          if (execution && execution.status !== lastStatus) {
            lastStatus = execution.status;
            console.log(`   Status: ${execution.status} (${execution.nodeExecutions.length} nodes executed)`);
            
            if (execution.status === 'completed' || execution.status === 'failed') {
              console.log('\n📊 Final Status:', execution.status);
              console.log('   Nodes executed:', execution.nodeExecutions.length);
              
              if (execution.error) {
                console.log('   Error:', execution.error);
              }
              
              console.log('\n   Node Details:');
              execution.nodeExecutions.forEach(ne => {
                console.log(`     - ${ne.nodeId}: ${ne.status}${ne.error ? ' (' + ne.error + ')' : ''}`);
              });
              
              break;
            }
          }
        }
        
      } else {
        console.log('⚠️  HTTP request returned status:', response.status);
        console.log('   Response:', response.data);
        
        if (response.status === 401 || response.status === 403) {
          console.log('\n   This is expected - authentication is required.');
          console.log('   Creating execution via direct database insert as workaround...\n');
          
          // Fallback: use the workflow from database and manually trigger
          const workflow = await prisma.workflow.findUnique({
            where: { id: 'workflow_bfsi_marketing_template' }
          });
          
          if (!workflow) {
            throw new Error('Workflow not found');
          }
          
          const execution = await prisma.workflowExecution.create({
            data: {
              workflowId: 'workflow_bfsi_marketing_template',
              userId: 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e',
              status: 'pending',
              startedAt: new Date(),
              workflowSnapshot: workflow.definition,
              input: {
                fileId: uploadedFile.id,
                csvFilePath: '/tmp/millennials_homeloan_campaign_small.csv',
              }
            }
          });
          
          console.log('⚠️  Created execution in database:', execution.id);
          console.log('   However, this will NOT trigger automatic execution.');
          console.log('   The workflow engine only processes executions created via executeWorkflow()');
          console.log('\n   Please run the workflow from the browser UI instead.');
        }
      }
      
    } catch (error) {
      console.log('❌ HTTP request failed:', error.message);
      console.log('\n   Please run the workflow from the browser UI:');
      console.log('   http://localhost:3000/workflows/workflow_bfsi_marketing_template');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
