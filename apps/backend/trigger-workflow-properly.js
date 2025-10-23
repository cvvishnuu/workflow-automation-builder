const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Triggering Workflow Execution via API...\n');

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

    console.log(`✅ File uploaded: ${uploadedFile.id}\n`);

    // Step 2: Delete stuck execution if any
    console.log('🗑️  Deleting stuck execution...');
    await prisma.workflowExecution.deleteMany({
      where: {
        workflowId: 'workflow_bfsi_marketing_template',
        status: 'running',
        completedAt: null
      }
    });
    console.log('✅ Deleted stuck executions\n');

    // Step 3: Trigger via HTTP API
    console.log('⚙️  Triggering workflow via HTTP API...');
    const axios = require('axios');
    
    // Note: This will fail due to auth, but let's try via direct service call instead
    console.log('   (Skipping API call due to auth requirements)\n');
    
    // Step 4: Direct service call approach - Import and execute
    console.log('⚙️  Loading NestJS application...');
    
    // We can't easily load NestJS modules here, so let's use a curl command instead
    console.log('\n📋 To trigger the workflow, run this command:');
    console.log(`\ncurl -X POST http://localhost:3001/api/v1/executions \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \\`);
    console.log(`  -d '{`);
    console.log(`    "workflowId": "workflow_bfsi_marketing_template",`);
    console.log(`    "input": {`);
    console.log(`      "fileId": "${uploadedFile.id}",`);
    console.log(`      "csvFilePath": "/tmp/millennials_homeloan_campaign_small.csv"`);
    console.log(`    }`);
    console.log(`  }'`);
    
    console.log('\n\n💡 Alternative: Use the browser UI to click the RUN button!');
    console.log('   Visit: http://localhost:3000/workflows/workflow_bfsi_marketing_template');

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
