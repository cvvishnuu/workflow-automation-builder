const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing all issues...\n');

  const currentUserId = 'bdade79d-6df8-4313-8b40-f3de9fc1cc2e';

  // Fix 1: Delete duplicate workflow
  console.log('1️⃣ Deleting duplicate workflow (only 6 nodes)...');
  try {
    await prisma.workflow.delete({
      where: { id: '1d55b368-fe44-4e8b-a33c-c8908a1bbaa6' }
    });
    console.log('   ✅ Duplicate workflow deleted\n');
  } catch (error) {
    console.log('   ⚠️  Workflow might already be deleted\n');
  }

  // Fix 2: Transfer WhatsApp credential ownership
  console.log('2️⃣ Transferring WhatsApp credential ownership...');
  const whatsappCred = await prisma.credential.update({
    where: { id: '48c2a793-252c-4491-af2a-b5784dcadb82' },
    data: { userId: currentUserId }
  });
  console.log('   ✅ WhatsApp credential now belongs to current user\n');

  // Fix 3: Reduce CSV test data to 3 customers
  console.log('3️⃣ Creating smaller CSV test file (3 customers)...');
  const csvContent = `customerId,name,phone,email,city,income_bracket,age,credit_score
CUST001,Rahul Sharma,+918610560986,rahul.sharma@email.com,Mumbai,75000-100000,32,750
CUST002,Priya Patel,+918610560986,priya.patel@email.com,Bangalore,100000-150000,28,780
CUST003,Amit Kumar,+918610560986,amit.kumar@email.com,Delhi,50000-75000,35,720`;

  fs.writeFileSync('/tmp/millennials_homeloan_campaign_small.csv', csvContent);
  console.log('   ✅ Created /tmp/millennials_homeloan_campaign_small.csv\n');

  console.log('🎉 All fixes applied!\n');
  console.log('📋 Next Steps:');
  console.log('   1. Open this URL: http://localhost:3000/workflows/workflow_bfsi_marketing_template');
  console.log('   2. You should now see ALL 8 nodes including:');
  console.log('      - compliance-1 (Compliance Checker) ✅');
  console.log('      - conditional-1 (Conditional Logic) ✅');
  console.log('   3. Click the "Run" button');
  console.log('   4. Check WhatsApp (+918610560986) for 3 messages!');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
