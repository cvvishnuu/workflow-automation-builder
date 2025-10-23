/**
 * Migration Script - Transfer BFSI Workflow to Current User
 * This script updates the BFSI workflow to belong to the authenticated user
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting BFSI workflow migration...');

  // Find the user with email cvishnuu01@gmail.com
  const user = await prisma.user.findUnique({
    where: { email: 'cvishnuu01@gmail.com' },
  });

  if (!user) {
    console.log('⚠️  User not found. Please sign in first to create your account.');
    console.log('   Visit http://localhost:3000 and sign in with cvishnuu01@gmail.com');
    process.exit(1);
  }

  console.log('✅ Found user:', {
    id: user.id,
    email: user.email,
    clerkId: user.clerkId,
  });

  // Update the BFSI workflow to belong to this user
  const workflow = await prisma.workflow.update({
    where: { id: 'workflow_bfsi_marketing_template' },
    data: {
      userId: user.id,
    },
  });

  console.log('✅ Updated workflow ownership:', {
    workflowId: workflow.id,
    workflowName: workflow.name,
    newOwnerId: workflow.userId,
  });

  console.log('🎉 Migration completed successfully!');
  console.log('   You can now see the workflow in your account at http://localhost:3000/workflows');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
