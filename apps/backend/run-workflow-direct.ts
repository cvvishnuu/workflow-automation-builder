import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WorkflowEngineService } from './src/executions/workflow-engine.service';
import { PrismaService } from './src/prisma/prisma.service';
import * as fs from 'fs';

async function bootstrap() {
  console.log('🚀 Starting BFSI Workflow Test...\n');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const workflowEngine = app.get(WorkflowEngineService);
  const prisma = app.get(PrismaService);

  try {
    // Step 1: Create uploaded file record
    console.log('📤 Step 1: Creating file upload record...');
    const fileContent = fs.readFileSync('/tmp/millennials_homeloan_campaign.csv', 'utf-8');

    const uploadedFile = await prisma.fileUpload.create({
      data: {
        userId: 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e',
        filename: 'millennials_homeloan_campaign.csv',
        fileHash: 'test-hash-' + Date.now(),
        filePath: '/tmp/millennials_homeloan_campaign.csv',
        mimeType: 'text/csv',
        fileSize: Buffer.byteLength(fileContent),
        encryptionIv: 'test-iv',
        metadata: {
          rowCount: 10,
          columns: ['customerId', 'name', 'phone', 'email', 'city', 'income_bracket', 'age', 'credit_score']
        }
      }
    });

    console.log(`✅ File uploaded: ${uploadedFile.id}\n`);

    // Step 2: Get workflow
    console.log('📋 Step 2: Loading workflow...');
    const workflow = await prisma.workflow.findUnique({
      where: { id: 'workflow_bfsi_marketing_template' }
    });

    if (!workflow) {
      throw new Error('Workflow not found!');
    }

    console.log(`✅ Loaded workflow: ${workflow.name}\n`);

    // Step 3: Execute workflow
    console.log('⚙️  Step 3: Executing workflow...');
    console.log('This will:');
    console.log('  1. Load CSV data (10 customers)');
    console.log('  2. Generate AI content using Gemini');
    console.log('  3. Validate BFSI compliance');
    console.log('  4. Send WhatsApp messages to +918610560986');
    console.log('  5. Generate compliance report\n');

    const executionResult = await workflowEngine.executeWorkflow(
      workflow.id,
      'bdade79d-6df8-4313-8b40-f3de9fc1cc2e',
      {
        fileId: uploadedFile.id,
        csvFilePath: '/tmp/millennials_homeloan_campaign.csv',
      }
    );

    console.log('\n✅ Workflow execution completed!');
    console.log(`📊 Execution ID: ${executionResult.id}`);
    console.log(`📈 Status: ${executionResult.status}`);
    console.log(`⏱️  Started: ${executionResult.startedAt}`);
    console.log(`⏱️  Completed: ${executionResult.completedAt}`);

    if (executionResult.error) {
      console.log(`❌ Error: ${executionResult.error}`);
    } else {
      console.log(`\n🎉 SUCCESS! Check your WhatsApp (+918610560986) for messages!`);
    }

    // Show execution details
    const nodeExecutions = await prisma.nodeExecution.findMany({
      where: { executionId: executionResult.id },
      orderBy: { startedAt: 'asc' }
    });

    console.log(`\n📊 Node Execution Summary (${nodeExecutions.length} nodes):`);
    for (const node of nodeExecutions) {
      const duration = node.completedAt && node.startedAt
        ? Math.round((node.completedAt.getTime() - node.startedAt.getTime()) / 1000)
        : 0;
      const status = node.status === 'success' ? '✅' : node.status === 'failed' ? '❌' : '⏳';
      console.log(`  ${status} ${node.nodeId}: ${node.status} (${duration}s)`);
      if (node.error) {
        console.log(`     Error: ${node.error}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Workflow execution failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
