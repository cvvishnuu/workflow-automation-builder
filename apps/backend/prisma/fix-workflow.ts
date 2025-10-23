/**
 * Fix Workflow Script
 * Directly updates the BFSI workflow with correct conditional expression
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing workflow definition...');

  // Update the workflow with correct conditional expression
  const workflow = await prisma.workflow.update({
    where: { id: 'workflow_bfsi_marketing_template' },
    data: {
      definition: {
        nodes: [
          {
            nodeId: 'trigger-1',
            type: 'trigger',
            label: 'Manual Trigger',
            position: { x: 100, y: 100 },
            config: {
              triggerType: 'manual',
            },
          },
          {
            nodeId: 'csv-1',
            type: 'csv_upload',
            label: 'Upload Customer CSV',
            position: { x: 350, y: 100 },
            config: {
              fileId: '',
              anonymize: true,
            },
          },
          {
            nodeId: 'ai-gen-1',
            type: 'ai_content_generator',
            label: 'Generate Marketing Content',
            position: { x: 600, y: 100 },
            config: {
              contentType: 'whatsapp',
              purpose: 'Promote new credit card offering',
              targetAudience: 'High-income professionals aged 30-45',
              keyPoints:
                '- 0% APR for first 12 months\n- 5% cashback on dining and travel\n- Complimentary airport lounge access\n- No annual fee for first year',
              tone: 'professional',
            },
          },
          {
            nodeId: 'compliance-1',
            type: 'compliance_checker',
            label: 'Validate BFSI Compliance',
            position: { x: 900, y: 100 },
            config: {
              contentField: 'generatedContent',
              contentType: 'whatsapp',
              productCategory: 'credit-card',
              minimumScore: 85,
            },
          },
          {
            nodeId: 'conditional-1',
            type: 'conditional',
            label: 'Check Compliance Pass',
            position: { x: 1200, y: 100 },
            config: {
              // ✅ CORRECT EXPRESSION - matches compliance checker output structure
              condition: 'input.failedCount === 0 && input.criticalViolations === 0',
            },
          },
          {
            nodeId: 'whatsapp-1',
            type: 'whatsapp',
            label: 'Send WhatsApp Message',
            position: { x: 1500, y: 50 },
            config: {
              credentialId: '',
              to: '{{input.customerData.phone}}',
              message: '{{input.generatedContent}}',
              mediaUrl: '',
            },
          },
          {
            nodeId: 'delay-1',
            type: 'delay',
            label: 'Wait for Review',
            position: { x: 1500, y: 250 },
            config: {
              delayMs: 86400000, // 24 hours
            },
          },
          {
            nodeId: 'compliance-report-1',
            type: 'compliance_report',
            label: 'Generate Compliance Report',
            position: { x: 1800, y: 150 },
            config: {
              reportFormat: 'json',
              includeStatistics: true,
              includeViolations: true,
              groupBy: 'execution',
            },
          },
        ],
        edges: [
          {
            id: 'e-trigger-csv',
            source: 'trigger-1',
            target: 'csv-1',
          },
          {
            id: 'e-csv-ai',
            source: 'csv-1',
            target: 'ai-gen-1',
          },
          {
            id: 'e-ai-compliance',
            source: 'ai-gen-1',
            target: 'compliance-1',
          },
          {
            id: 'e-compliance-conditional',
            source: 'compliance-1',
            target: 'conditional-1',
          },
          {
            id: 'e-conditional-whatsapp',
            source: 'conditional-1',
            target: 'whatsapp-1',
            sourceHandle: 'true',
          },
          {
            id: 'e-conditional-delay',
            source: 'conditional-1',
            target: 'delay-1',
            sourceHandle: 'false',
          },
          {
            id: 'e-whatsapp-report',
            source: 'whatsapp-1',
            target: 'compliance-report-1',
          },
          {
            id: 'e-delay-report',
            source: 'delay-1',
            target: 'compliance-report-1',
          },
        ],
      },
    },
  });

  console.log('✅ Workflow updated successfully!');
  console.log('Workflow ID:', workflow.id);
  console.log('Workflow Name:', workflow.name);

  // Verify the conditional expression
  const definition = workflow.definition as any;
  const conditionalNode = definition.nodes.find((n: any) => n.nodeId === 'conditional-1');
  console.log('\n✅ Conditional node expression:', conditionalNode.config.condition);
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
