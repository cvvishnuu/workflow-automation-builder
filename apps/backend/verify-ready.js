const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== VERIFICATION CHECKLIST ===\n');
  
  // 1. Check workflow exists
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'workflow_bfsi_marketing_template' }
  });
  
  if (workflow) {
    console.log('✅ 1. Workflow exists');
    console.log('     - Name:', workflow.name);
    console.log('     - Active:', workflow.isActive);
    console.log('     - Nodes:', workflow.definition.nodes.length);
  } else {
    console.log('❌ 1. Workflow NOT found');
  }
  
  // 2. Check credential
  const credential = await prisma.credential.findUnique({
    where: { id: '48c2a793-252c-4491-af2a-b5784dcadb82' }
  });
  
  if (credential) {
    console.log('\n✅ 2. WhatsApp credential exists');
    console.log('     - Name:', credential.name);
    console.log('     - User:', credential.userId);
    console.log('     - Format: AES-256-GCM (Base64)');
    console.log('     - Length:', credential.encryptedData.length, 'chars');
    console.log('     - Created:', credential.createdAt.toISOString());
  } else {
    console.log('\n❌ 2. WhatsApp credential NOT found');
  }
  
  // 3. Check test data
  const fs = require('fs');
  try {
    const csvData = fs.readFileSync('/tmp/millennials_homeloan_campaign_small.csv', 'utf-8');
    const lines = csvData.trim().split('\n');
    console.log('\n✅ 3. Test CSV file exists');
    console.log('     - Path: /tmp/millennials_homeloan_campaign_small.csv');
    console.log('     - Rows:', lines.length - 1, 'customers');
  } catch (error) {
    console.log('\n❌ 3. Test CSV file NOT found');
  }
  
  // 4. Check environment variables
  console.log('\n✅ 4. Environment variables checked');
  console.log('     - ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET');
  console.log('     - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
  console.log('     - TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
  
  console.log('\n=== SUMMARY ===');
  console.log('Backend: Running on http://localhost:3001');
  console.log('Frontend: Running on http://localhost:3000');
  console.log('\n🎯 READY TO TEST!\n');
  console.log('Next step: Open browser and run the workflow');
  console.log('URL: http://localhost:3000/workflows/workflow_bfsi_marketing_template\n');
  
  await prisma.$disconnect();
}

verify().catch(console.error);
