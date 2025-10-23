const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Testing BFSI Workflow Execution...\n');

  try {
    // Step 1: Create file upload record
    console.log('📤 Creating file upload record...');
    const fs = require('fs');
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

    // Step 2: Fetch workflow definition
    console.log('📋 Fetching workflow definition...');
    const workflow = await prisma.workflow.findUnique({
      where: { id: 'workflow_bfsi_marketing_template' }
    });

    if (!workflow) {
      throw new Error('Workflow not found!');
    }

    console.log(`✅ Workflow found: ${workflow.name}\n`);

    // Step 3: Create workflow execution directly in database
    console.log('⚙️  Creating workflow execution...');
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: 'workflow_bfsi_marketing_template',
        userId: 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e',
        status: 'running',
        startedAt: new Date(),
        workflowSnapshot: workflow.definition,
        input: {
          fileId: uploadedFile.id,
          csvFilePath: '/tmp/millennials_homeloan_campaign_small.csv',
        }
      }
    });

    console.log(`✅ Execution created: ${execution.id}`);
    console.log(`📊 Status: ${execution.status}`);
    console.log(`\n⏳ Workflow is now executing...`);
    console.log(`\nYou can monitor progress in the backend logs.`);
    console.log(`Check your WhatsApp (+918610560986) for messages!\n`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
