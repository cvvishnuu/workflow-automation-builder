import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing workflow routing...');

  // Delete the old workflow
  await prisma.workflow.deleteMany({
    where: { id: 'workflow_bfsi_marketing_template' },
  });

  console.log('✅ Deleted old workflow');

  // Run the seed
  const { execSync } = require('child_process');
  execSync('pnpm prisma:seed', { stdio: 'inherit', cwd: __dirname });

  console.log('✅ Workflow fixed!');
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
