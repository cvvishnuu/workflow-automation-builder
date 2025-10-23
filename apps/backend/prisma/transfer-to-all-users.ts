/**
 * Script to duplicate BFSI workflow for all users
 * This ensures every user has access to the template
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Duplicating BFSI workflow for all users...\n');

  // Get the BFSI workflow template
  const template = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
  });

  if (!template) {
    console.log('❌ BFSI workflow template not found!');
    return;
  }

  // Get all users except demo user
  const users = await prisma.user.findMany({
    where: {
      clerkId: {
        not: 'clerk_user_123', // Skip demo user
      },
    },
  });

  console.log(`📊 Found ${users.length} users (excluding demo user)\n`);

  for (const user of users) {
    console.log(`👤 Processing user: ${user.email} (${user.clerkId})`);

    // Check if user already has a workflow with this name
    const existing = await prisma.workflow.findFirst({
      where: {
        userId: user.id,
        name: template.name,
      },
    });

    if (existing) {
      console.log(`   ✓ User already has this workflow (ID: ${existing.id})\n`);
      continue;
    }

    // Create a copy of the workflow for this user
    const newWorkflow = await prisma.workflow.create({
      data: {
        name: template.name,
        description: template.description,
        definition: template.definition as any,
        isActive: true,
        userId: user.id,
      },
    });

    console.log(`   ✅ Created workflow copy (ID: ${newWorkflow.id})\n`);
  }

  console.log('🎉 Completed! All users now have access to the BFSI workflow.');
  console.log('   Visit http://localhost:3000/workflows to see it.\n');
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
