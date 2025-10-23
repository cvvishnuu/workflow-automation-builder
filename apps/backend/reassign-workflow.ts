import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Reassigning workflow to current user...');
  
  // Find the user with clerk ID user_34CVC4vAJIDZAJQ4N12degrk4P3
  const currentUser = await prisma.user.findUnique({
    where: { clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3' }
  });
  
  if (!currentUser) {
    console.error('❌ Current user not found');
    process.exit(1);
  }
  
  console.log(`✅ Found current user: ${currentUser.email} (${currentUser.id})`);
  
  // Update the workflow to belong to this user
  const workflow = await prisma.workflow.update({
    where: { id: 'workflow_bfsi_marketing_template' },
    data: { userId: currentUser.id }
  });
  
  console.log(`✅ Workflow reassigned to ${currentUser.email}`);
  console.log(`   Workflow ID: ${workflow.id}`);
  console.log(`   Workflow name: ${workflow.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Reassignment failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
