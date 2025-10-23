/**
 * Test BFSI Workflow Execution
 * Tests the complete flow: CSV Upload → AI Content → Compliance → Conditional → WhatsApp
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WorkflowEngineService } from './src/executions/workflow-engine.service';
import { PrismaService } from './src/prisma/prisma.service';

async function main() {
  console.log('🧪 Testing BFSI Workflow Execution...\n');

  // Create NestJS app context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const workflowEngine = app.get(WorkflowEngineService);
  const prisma = app.get(PrismaService);

  try {
    // Get the BFSI workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: 'workflow_bfsi_marketing_template' },
    });

    if (!workflow) {
      throw new Error('BFSI workflow not found. Run seed script first.');
    }

    console.log('✅ Found workflow:', workflow.name);
    console.log('');

    // Execute the workflow
    console.log('🚀 Starting workflow execution...');
    console.log('');

    const result = await workflowEngine.executeWorkflow(
      workflow.id,
      'user_123',
      {} // Empty input, CSV node will use auto-upload fallback
    );

    const executionId = result.id;
    console.log('Execution started with ID:', executionId);
    console.log('');

    // Wait for execution to complete (poll every 2 seconds)
    console.log('⏳ Waiting for execution to complete...');
    let execution;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (attempts < maxAttempts) {
      execution = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: {
          nodeExecutions: {
            orderBy: { startedAt: 'asc' },
          },
        },
      });

      if (!execution) {
        throw new Error('Execution not found');
      }

      if (execution.status === 'COMPLETED' || execution.status === 'FAILED') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      process.stdout.write('.');
    }

    console.log('\n');

    if (!execution) {
      throw new Error('Execution timeout');
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📊 EXECUTION RESULT');
    console.log('='.repeat(80));
    console.log('');
    console.log('Status:', execution.status);
    console.log('Execution ID:', execution.id);
    console.log('Nodes Executed:', execution.nodeExecutions.length);
    console.log('');

    if (execution.status === 'COMPLETED') {
      console.log('✅ Workflow completed successfully!');
      console.log('');

      if (execution) {
        console.log('📋 Node Execution Summary:');
        console.log('');
        execution.nodeExecutions.forEach((nodeExec, index) => {
          const duration = nodeExec.completedAt && nodeExec.startedAt
            ? (new Date(nodeExec.completedAt).getTime() - new Date(nodeExec.startedAt).getTime())
            : 0;

          console.log(`${index + 1}. ${nodeExec.nodeId}`);
          console.log(`   Status: ${nodeExec.status}`);
          if (nodeExec.error) {
            console.log(`   Error: ${nodeExec.error}`);
          }
          console.log(`   Duration: ${duration}ms`);
          if (nodeExec.output && typeof nodeExec.output === 'object') {
            const output = nodeExec.output as any;
            if (output.rowsProcessed) {
              console.log(`   Rows Processed: ${output.rowsProcessed}`);
            }
            if (output.messageSid) {
              console.log(`   WhatsApp Message SID: ${output.messageSid}`);
              console.log(`   Message Status: ${output.status}`);
            }
          }
          console.log('');
        });

        // Check for AI content generation
        const aiNode = execution.nodeExecutions.find(n => n.nodeId === 'ai-gen-1');
        if (aiNode && aiNode.output) {
          console.log('📝 Sample Generated Content:');
          const output = aiNode.output as any;
          if (output.results && output.results[0]) {
            console.log(output.results[0].content || 'N/A');
          }
          console.log('');
        }

        // Check for compliance violations
        const complianceNode = execution.nodeExecutions.find(n => n.nodeId === 'compliance-1');
        if (complianceNode && complianceNode.output) {
          const output = complianceNode.output as any;
          console.log('🔍 Compliance Check Results:');
          console.log(`   Total Rows: ${output.totalRows || 0}`);
          console.log(`   Passed: ${output.passedCount || 0}`);
          console.log(`   Failed: ${output.failedCount || 0}`);
          console.log(`   Critical Violations: ${output.criticalViolations || 0}`);
          console.log('');
        }

        // Check conditional routing
        const conditionalNode = execution.nodeExecutions.find(n => n.nodeId === 'conditional-1');
        if (conditionalNode && conditionalNode.output) {
          const output = conditionalNode.output as any;
          console.log('🔀 Conditional Routing:');
          console.log(`   Branch Taken: ${output.branchTaken || 'N/A'}`);
          console.log(`   Condition Result: ${output.result}`);
          console.log('');
        }

        // Check WhatsApp messages
        const whatsappNodes = execution.nodeExecutions.filter(n => n.nodeId === 'whatsapp-1');
        if (whatsappNodes.length > 0) {
          console.log('📱 WhatsApp Messages Sent:');
          whatsappNodes.forEach((node, index) => {
            const output = node.output as any;
            console.log(`   Message ${index + 1}:`);
            console.log(`     SID: ${output.messageSid || 'N/A'}`);
            console.log(`     Status: ${output.status || 'N/A'}`);
            console.log(`     To: ${output.to || 'N/A'}`);
          });
          console.log('');
        }
      }

      console.log('🎉 Test completed successfully!');
    } else {
      console.log('❌ Workflow failed!');
      console.log('');
      if (result.error) {
        console.log('Error:', result.error);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

main()
  .then(() => {
    console.log('');
    console.log('✅ Test script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
