import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find the user with email cvishnuu01@gmail.com
  const user = await prisma.user.findFirst({
    where: { email: 'cvishnuu01@gmail.com' },
  });

  if (!user) {
    console.log('❌ User cvishnuu01@gmail.com not found in database!');
    console.log('Creating user...');

    const newUser = await prisma.user.create({
      data: {
        clerkId: 'clerk_' + Date.now(),
        email: 'cvishnuu01@gmail.com',
        name: 'Vishnu',
      },
    });

    console.log('✅ Created user:', newUser);
  } else {
    console.log('✅ Found user:', user);
  }

  const actualUser = user || await prisma.user.findFirst({
    where: { email: 'cvishnuu01@gmail.com' },
  });

  // Update the workflow to belong to this user
  const workflow = await prisma.workflow.update({
    where: { id: 'workflow_bfsi_marketing_template' },
    data: {
      userId: actualUser!.id,
    },
  });

  console.log('\n✅ Updated workflow ownership to:', actualUser!.email);
  console.log('Workflow ID:', workflow.id);
  console.log('User ID:', workflow.userId);

  await prisma.$disconnect();
}

main();
