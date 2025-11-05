/**
 * Database Seed Script
 * Creates initial data for development and production
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('📍 Environment:', process.env.NODE_ENV || 'development');
  console.log('📍 Database URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');

  try {
    // Create production user (using your actual Clerk user ID)
    console.log('👤 Creating/updating user...');

    // Clean up any conflicting users and ensure correct user exists
    const existingUserByClerkId = await prisma.user.findUnique({
      where: { clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3' },
    });

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: 'cvishnuu01@gmail.com' },
    });

    interface User {
      id: string;
      email: string;
      clerkId: string;
    }

    let user: User;

    // If there's a user with the clerkId but wrong email, UPDATE it
    if (existingUserByClerkId && existingUserByClerkId.email !== 'cvishnuu01@gmail.com') {
      console.log('  Updating user with clerkId but wrong email...');
      user = await prisma.user.update({
        where: { id: existingUserByClerkId.id },
        data: { email: 'cvishnuu01@gmail.com', name: 'Vishnu' },
      });
    }
    // If there's a user with the email but wrong clerkId, UPDATE it
    else if (
      existingUserByEmail &&
      existingUserByEmail.clerkId !== 'user_34CVC4vAJIDZAJQ4N12degrk4P3'
    ) {
      console.log('  Updating user with email but wrong clerkId...');
      user = await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: { clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3', name: 'Vishnu' },
      });
    }
    // If user exists with correct details, use it
    else if (existingUserByClerkId) {
      console.log('  User already exists with correct details');
      user = existingUserByClerkId;
    }
    // Otherwise create new user
    else {
      console.log('  Creating new user...');
      user = await prisma.user.create({
        data: {
          clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3',
          email: 'cvishnuu01@gmail.com',
          name: 'Vishnu',
        },
      });
    }

    console.log('✅ User ready:', { id: user.id, email: user.email, clerkId: user.clerkId });

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
                dataFields: [
                  'customerId',
                  'name',
                  'phone',
                  'generated_content',
                  'compliance_status',
                ],
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
                dataFields: [
                  'customerId',
                  'name',
                  'phone',
                  'generated_content',
                  'compliance_status',
                ],
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

    console.log('✅ Created BFSI workflow template:', {
      id: bfsiWorkflow.id,
      name: bfsiWorkflow.name,
    });

    // Create default CSV file for testing
    // NOTE: We write the plain CSV to /tmp/ so the CSV upload executor can auto-upload it
    // The executor will read it and use FileUploadService.uploadFile() which handles encryption
    console.log('📄 Creating default test CSV file in /tmp/...');
    const defaultCSVData = `customerId,name,phone,email,age,income,creditScore
1,Rajesh Kumar,+919876543210,rajesh.kumar@example.com,35,75000,720
2,Priya Sharma,+919876543211,priya.sharma@example.com,28,90000,780
3,Amit Patel,+919876543212,amit.patel@example.com,42,120000,650`;

    // Write CSV file to /tmp for CSV upload executor fallback
    const fs = await import('fs/promises');
    await fs.writeFile('/tmp/test_customers.csv', defaultCSVData, 'utf-8');

    console.log('✅ Created test CSV file: /tmp/test_customers.csv');
    console.log('   (CSV upload executor will auto-upload and encrypt this when needed)');

    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  • User created:', user.email);
    console.log('  • Workflow created:', bfsiWorkflow.id);
    console.log('  • Test CSV created: /tmp/test_customers.csv');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Seed failed with error:');
    console.error('');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    } else {
      console.error(error);
    }
    console.error('');
    throw error; // Re-throw to fail the deployment if needed
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error in seed script:', e.message);
    process.exit(1); // Exit with error code to fail Railway deployment
  })
  .finally(async () => {
    console.log('🔌 Disconnecting from database...');
    await prisma.$disconnect();
  });
