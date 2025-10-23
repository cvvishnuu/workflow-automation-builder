/**
 * Configure BFSI workflow for personalized CSV-driven marketing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Configuring workflow for personalized marketing...\n');

  const workflows = await prisma.workflow.findMany({
    where: {
      name: 'BFSI Marketing Campaign with Compliance',
    },
  });

  for (const workflow of workflows) {
    const definition = workflow.definition as any;

    // Update AI Content Generator node
    const aiNode = definition.nodes.find((n: any) => n.type === 'ai_content_generator');
    if (aiNode) {
      console.log('🤖 Updating AI Content Generator...');

      aiNode.config = {
        contentType: 'whatsapp',
        purpose: 'Promote home loans to millennials',
        targetAudience: 'Young professionals aged 25-35 looking for their first home',
        keyPoints: [
          'Low interest rates starting at 6.5% p.a.',
          'Up to 90% LTV (Loan-to-Value)',
          'Flexible tenure up to 30 years',
          'Minimal documentation required',
          'Quick approval in 48 hours',
          'Special schemes for first-time home buyers',
        ],
        tone: 'friendly',
        maxLength: 300,
        // NEW: Enable CSV data integration
        variableFields: ['name', 'age', 'income', 'employment', 'city'],
        contextTemplate: 'Customer: {{name}}, Age: {{age}}, Annual Income: ₹{{income}}, Occupation: {{employment}}, Location: {{city}}',
      };

      console.log('   ✅ Added personalization fields');
      console.log('   ✅ Added context template for customer data');
    }

    // Update WhatsApp node to use CSV phone numbers
    const whatsappNode = definition.nodes.find((n: any) => n.type === 'whatsapp');
    if (whatsappNode) {
      console.log('\n📱 Updating WhatsApp node...');

      // Restore variable for batch sending
      whatsappNode.config.to = '{{phone}}'; // Will be replaced with each customer's phone
      whatsappNode.config.message = '{{generated_content}}'; // AI-generated content for this customer

      console.log('   ✅ Set to batch mode (sends to each customer in CSV)');
    }

    // Update workflow
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        definition: definition as any,
      },
    });

    console.log(`\n✅ Updated workflow for user: ${workflow.userId}`);
  }

  console.log('\n═'.repeat(70));
  console.log('\n🎉 Workflow configured for personalized marketing!\n');

  console.log('📋 How it works now:\n');
  console.log('1. Upload CSV with customer data (name, age, income, etc.)');
  console.log('2. AI generates PERSONALIZED content for EACH customer');
  console.log('3. Compliance checks each message');
  console.log('4. WhatsApp sends to each customer\'s phone number');
  console.log('5. Each message is unique and relevant to that customer\n');

  console.log('📄 Required CSV format:\n');
  console.log('customer_id,name,age,email,phone,income,employment,city');
  console.log('1,Rahul Kumar,28,rahul@email.com,9876543210,800000,IT Professional,Bangalore\n');

  console.log('💡 Next step: Create sample CSV file\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
