import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as FormData from 'form-data';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Testing BFSI Workflow Execution...\n');

  // Step 1: Upload CSV file
  console.log('📤 Step 1: Uploading CSV file...');

  const formData = new FormData();
  formData.append('file', fs.createReadStream('/tmp/millennials_homeloan_campaign.csv'));

  let fileId: string;
  try {
    // Direct database insert to bypass authentication
    const fileContent = fs.readFileSync('/tmp/millennials_homeloan_campaign.csv', 'utf-8');

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        filename: 'millennials_homeloan_campaign.csv',
        originalName: 'millennials_homeloan_campaign.csv',
        mimeType: 'text/csv',
        size: Buffer.byteLength(fileContent),
        path: '/tmp/millennials_homeloan_campaign.csv',
        userId: 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e',
        metadata: {
          rowCount: 10,
          columns: ['customerId', 'name', 'phone', 'email', 'city', 'income_bracket', 'age', 'credit_score']
        }
      }
    });

    fileId = uploadedFile.id;
    console.log(`✅ File uploaded successfully: ${fileId}\n`);
  } catch (error) {
    console.error('❌ Failed to upload file:', error);
    process.exit(1);
  }

  // Step 2: Execute workflow
  console.log('⚙️  Step 2: Triggering workflow execution...');

  try {
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: 'workflow_bfsi_marketing_template',
        status: 'pending',
        startedAt: new Date(),
        input: {
          fileId: fileId,
          triggerType: 'manual'
        }
      }
    });

    console.log(`✅ Workflow execution created: ${execution.id}`);
    console.log(`📊 Status: ${execution.status}`);
    console.log(`🕐 Started at: ${execution.startedAt}\n`);

    // Trigger execution via API
    console.log('🔄 Calling execution API...');
    const response = await axios.post(`http://localhost:3001/api/v1/executions`, {
      workflowId: 'workflow_bfsi_marketing_template',
      input: {
        fileId: fileId,
        csvFilePath: '/tmp/millennials_homeloan_campaign.csv'
      }
    }, {
      timeout: 120000 // 2 minute timeout
    });

    console.log(`✅ Execution API response:`, response.data);
    console.log(`\n📱 Check your WhatsApp (+918610560986) for messages!`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Execution API error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
    } else {
      console.error('❌ Execution error:', error);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
