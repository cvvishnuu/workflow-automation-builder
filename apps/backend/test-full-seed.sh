#!/bin/bash
set -e

echo "🧪 Full Seed Test"
echo "=================="
echo ""

# Delete existing data
echo "1️⃣ Cleaning existing seed data..."
pnpm dlx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  await prisma.fileUpload.deleteMany({ where: { filename: 'test_customers.csv' } });
  await prisma.workflow.deleteMany({ where: { id: 'workflow_bfsi_marketing_template' } });
  await prisma.user.deleteMany({ where: { clerkId: 'user_34CVC4vAJIDZAJQ4N12degrk4P3' } });
  console.log('✅ Cleaned up existing data');
  await prisma.\$disconnect();
})();
"

echo ""
echo "2️⃣ Running seed script..."
pnpm prisma:seed

echo ""
echo "3️⃣ Verifying seed data..."
pnpm dlx tsx verify-seed.ts

echo ""
echo "✅ Full seed test PASSED!"
