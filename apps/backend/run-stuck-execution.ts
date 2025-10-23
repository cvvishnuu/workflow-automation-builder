import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WorkflowEngineService } from './src/executions/workflow-engine.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const workflowEngine = app.get(WorkflowEngineService);
  const prisma = app.get(PrismaService);

  console.log('Finding stuck execution...\n');

  const execution = await prisma.workflowExecution.findFirst({
    where: {
      workflowId: 'workflow_bfsi_marketing_template',
      status: 'running',
      completedAt: null
    },
    orderBy: { startedAt: 'desc' }
  });

  if (!execution) {
    console.log('No stuck execution found');
    await app.close();
    return;
  }

  console.log('Found execution:', execution.id);
  console.log('Deleting and recreating...\n');

  await prisma.workflowExecution.delete({ where: { id: execution.id } });

  const newExecution = await workflowEngine.executeWorkflow(
    execution.workflowId,
    execution.userId,
    execution.input
  );

  console.log('New execution started:', newExecution.id);
  console.log('Check backend logs and WhatsApp!\n');

  await new Promise(resolve => setTimeout(resolve, 65000));

  const finalExecution = await prisma.workflowExecution.findUnique({
    where: { id: newExecution.id },
    include: { nodeExecutions: true }
  });

  console.log('Final Status:', finalExecution?.status);
  console.log('Nodes:', finalExecution?.nodeExecutions.length);

  await app.close();
}

bootstrap();
