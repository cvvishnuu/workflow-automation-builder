/**
 * Script to create user account and transfer BFSI workflow
 * This manually creates the user record and assigns the workflow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting user creation and workflow transfer...');

  const userEmail = 'cvishnuu01@gmail.com';
  const clerkId = 'user_2pbBVTiW9o7ZGK5tQlxqVR8GEZT'; // Clerk ID format

  // Step 1: Create or find the user
  let user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.log('📝 Creating new user...');
    user = await prisma.user.create({
      data: {
        clerkId: clerkId,
        email: userEmail,
        name: 'Vishnu C',
      },
    });
    console.log('✅ Created user:', {
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
    });
  } else {
    console.log('✅ Found existing user:', {
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
    });
  }

  // Step 2: Update the BFSI workflow to belong to this user
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

  // Step 3: Verify the transfer
  const userWorkflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  console.log('✅ Workflows now owned by user:');
  userWorkflows.forEach((wf) => {
    console.log(`   - ${wf.name} (${wf.id})`);
  });

  console.log('🎉 Migration completed successfully!');
  console.log('   You can now see the workflow at http://localhost:3000/workflows');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
