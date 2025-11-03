/**
 * Script to create an API key for testing the Public API
 * Usage: npx ts-node scripts/create-api-key.ts
 */

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Generate a random API key (32 bytes = 64 hex characters)
  const apiKey = randomBytes(32).toString('hex');

  // Hash the API key (this is what we store in the database)
  const hashedKey = createHash('sha256').update(apiKey).digest('hex');

  // Get the BFSI workflow ID
  const workflowId = 'workflow_bfsi_marketing_template';

  // Check if workflow exists
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    console.error(`❌ Workflow ${workflowId} not found. Please run: pnpm --filter @workflow/backend prisma:seed`);
    process.exit(1);
  }

  // Create API key record
  const apiKeyRecord = await prisma.apiKey.create({
    data: {
      key: hashedKey,
      name: 'Test API Key - BFSI Campaign Generator',
      description: 'API key for testing public API endpoints',
      workflowId: workflowId,
      projectId: 'bfsi-campaign-generator-test',
      usageLimit: 1000,
      usageCount: 0,
      isActive: true,
    },
  });

  console.log('\n✅ API Key created successfully!\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔑 API KEY (Save this - it won\'t be shown again):');
  console.log(`   ${apiKey}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n📋 API Key Details:`);
  console.log(`   ID:          ${apiKeyRecord.id}`);
  console.log(`   Name:        ${apiKeyRecord.name}`);
  console.log(`   Workflow ID: ${apiKeyRecord.workflowId}`);
  console.log(`   Project ID:  ${apiKeyRecord.projectId}`);
  console.log(`   Usage Limit: ${apiKeyRecord.usageLimit}`);
  console.log(`   Is Active:   ${apiKeyRecord.isActive}`);
  console.log('');
  console.log('📖 Usage:');
  console.log('   Authorization: Bearer ' + apiKey);
  console.log('');
  console.log('🔗 Test Endpoints:');
  console.log(`   POST   http://localhost:3001/api/v1/public/agents/${workflowId}/execute`);
  console.log(`   GET    http://localhost:3001/api/v1/public/executions/:id/status`);
  console.log(`   GET    http://localhost:3001/api/v1/public/executions/:id/results`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating API key:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
