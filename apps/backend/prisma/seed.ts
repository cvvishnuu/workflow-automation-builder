/**
 * Database Seed Script
 * Creates initial data for development
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create production user (using your actual Clerk user ID)
  const user = await prisma.user.upsert({
    where: { clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3' },
    update: {},
    create: {
      clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3',
      email: 'cvishnuu01@gmail.com',
      name: 'Vishnu',
    },
  });

  console.log('✅ Created/updated user:', user);

  // Create BFSI Marketing Campaign workflow template
  const bfsiWorkflow = await prisma.workflow.upsert({
    where: { id: 'workflow_bfsi_marketing_template' },
    update: {
      name: 'BFSI Marketing Campaign with Compliance',
      description:
        'Complete BFSI-compliant marketing workflow: Upload customer CSV → Generate AI content → Validate compliance → Manual review & approval → Send WhatsApp messages',
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
              fileId: '', // To be filled by user
              anonymizeData: false,
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
              condition: 'input.failedCount === 0 && input.criticalViolations === 0',
              trueOutputId: 'manual-approval-1',
              falseOutputId: 'delay-1',
            },
          },
          {
            nodeId: 'manual-approval-1',
            type: 'manual_approval',
            label: 'Review Content',
            position: { x: 1500, y: 50 },
            config: {
              title: 'Review Generated WhatsApp Messages',
              description:
                'Please review the AI-generated WhatsApp messages before sending. Verify that the content is appropriate and compliant.',
              dataFields: ['customerId', 'name', 'phone', 'generated_content', 'compliance_status'],
              requireComment: false,
              allowBulkApproval: true,
            },
          },
          {
            nodeId: 'whatsapp-1',
            type: 'whatsapp',
            label: 'Send WhatsApp Message',
            position: { x: 1800, y: 50 },
            config: {
              credentialId: '48c2a793-252c-4491-af2a-b5784dcadb82',
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
            position: { x: 2100, y: 150 },
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
            id: 'e-conditional-approval',
            source: 'conditional-1',
            target: 'manual-approval-1',
            sourceHandle: 'true',
          },
          {
            id: 'e-approval-whatsapp',
            source: 'manual-approval-1',
            target: 'whatsapp-1',
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
    create: {
      id: 'workflow_bfsi_marketing_template',
      name: 'BFSI Marketing Campaign with Compliance',
      description:
        'Complete BFSI-compliant marketing workflow: Upload customer CSV → Generate AI content → Validate compliance → Manual review & approval → Send WhatsApp messages',
      userId: user.id,
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
              fileId: '', // To be filled by user
              anonymizeData: false,
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
              condition: 'input.failedCount === 0 && input.criticalViolations === 0',
              trueOutputId: 'manual-approval-1',
              falseOutputId: 'delay-1',
            },
          },
          {
            nodeId: 'manual-approval-1',
            type: 'manual_approval',
            label: 'Review Content',
            position: { x: 1500, y: 50 },
            config: {
              title: 'Review Generated WhatsApp Messages',
              description:
                'Please review the AI-generated WhatsApp messages before sending. Verify that the content is appropriate and compliant.',
              dataFields: ['customerId', 'name', 'phone', 'generated_content', 'compliance_status'],
              requireComment: false,
              allowBulkApproval: true,
            },
          },
          {
            nodeId: 'whatsapp-1',
            type: 'whatsapp',
            label: 'Send WhatsApp Message',
            position: { x: 1800, y: 50 },
            config: {
              credentialId: '48c2a793-252c-4491-af2a-b5784dcadb82',
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
            position: { x: 2100, y: 150 },
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
            id: 'e-conditional-approval',
            source: 'conditional-1',
            target: 'manual-approval-1',
            sourceHandle: 'true',
          },
          {
            id: 'e-approval-whatsapp',
            source: 'manual-approval-1',
            target: 'whatsapp-1',
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

  console.log('✅ Created BFSI workflow template:', bfsiWorkflow);

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    // process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
