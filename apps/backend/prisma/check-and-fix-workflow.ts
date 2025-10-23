/**
 * Script to check users and fix workflow ownership
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database state...\n');

  // List all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      clerkId: true,
      name: true,
      createdAt: true,
    },
  });

  console.log(`📊 Found ${users.length} users in database:\n`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name || 'Unknown'} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Created: ${user.createdAt}\n`);
  });

  // Find the user with email containing cvishnuu01
  const targetUser = users.find(u => u.email.includes('cvishnuu01'));

  if (!targetUser) {
    console.log('⚠️  No user found with email containing "cvishnuu01"');
    console.log('   Please sign in first at http://localhost:3000\n');
    return;
  }

  console.log(`✅ Found target user: ${targetUser.email}`);
  console.log(`   User ID: ${targetUser.id}\n`);

  // Check current workflow ownership
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
    select: {
      id: true,
      name: true,
      userId: true,
      user: {
        select: {
          email: true,
          clerkId: true,
        },
      },
    },
  });

  if (!workflow) {
    console.log('❌ BFSI workflow not found in database!\n');
    return;
  }

  console.log(`📝 Current workflow ownership:`);
  console.log(`   Workflow: ${workflow.name}`);
  console.log(`   Current Owner: ${workflow.user.email}`);
  console.log(`   Current Owner ID: ${workflow.userId}\n`);

  if (workflow.userId === targetUser.id) {
    console.log('✅ Workflow is already owned by the correct user!');
    console.log('   You should see it at http://localhost:3000/workflows\n');
    return;
  }

  // Update workflow ownership
  console.log(`🔄 Transferring workflow to ${targetUser.email}...\n`);

  await prisma.workflow.update({
    where: { id: 'workflow_bfsi_marketing_template' },
    data: {
      userId: targetUser.id,
    },
  });

  console.log('✅ Workflow ownership updated successfully!');
  console.log(`   View it at: http://localhost:3000/workflows\n`);

  // Verify the update
  const updatedWorkflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  console.log(`✓ Verified: Workflow now owned by ${updatedWorkflow?.user.email}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
