/**
 * Verification Script
 * Checks that seed data exists in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying seed data...\n');

  // Check user
  const user = await prisma.user.findUnique({
    where: { clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3' },
  });

  if (user) {
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   ClerkId:', user.clerkId);
  } else {
    console.log('❌ User NOT found');
    process.exit(1);
  }

  // Check workflow
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' },
  });

  if (workflow) {
    console.log('\n✅ Workflow found:');
    console.log('   ID:', workflow.id);
    console.log('   Name:', workflow.name);
    console.log('   User ID:', workflow.userId);
  } else {
    console.log('\n❌ Workflow NOT found');
    process.exit(1);
  }

  // Check CSV file
  const csvFile = await prisma.fileUpload.findFirst({
    where: { filename: 'test_customers.csv' },
  });

  if (csvFile) {
    console.log('\n✅ CSV file found:');
    console.log('   ID:', csvFile.id);
    console.log('   Filename:', csvFile.filename);
    console.log('   Size:', csvFile.fileSize, 'bytes');
    console.log('   User ID:', csvFile.userId);
  } else {
    console.log('\n❌ CSV file NOT found');
    process.exit(1);
  }

  console.log('\n🎉 All seed data verified successfully!');
}

verify()
  .catch((e) => {
    console.error('❌ Verification failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
