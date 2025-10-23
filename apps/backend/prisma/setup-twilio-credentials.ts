/**
 * Setup Twilio WhatsApp credentials for testing
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption functions (same as in encryption.util.ts)
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

function encrypt(data: Record<string, any>): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag.toString('hex'),
  });
}

async function main() {
  console.log('🔧 Setting up Twilio WhatsApp credentials...\n');

  // Get Twilio config from environment
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
    console.log('❌ Twilio environment variables not configured');
    console.log('   Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM');
    return;
  }

  console.log('✅ Twilio credentials found in environment');
  console.log(`   Account SID: ${twilioAccountSid.substring(0, 10)}...`);
  console.log(`   WhatsApp From: ${twilioWhatsAppFrom}\n`);

  // Find or create WhatsApp integration
  let integration = await prisma.integration.findUnique({
    where: { type: 'whatsapp' },
  });

  if (!integration) {
    console.log('📝 Creating WhatsApp integration...');
    integration = await prisma.integration.create({
      data: {
        name: 'Twilio WhatsApp',
        type: 'whatsapp',
        description: 'Send WhatsApp messages via Twilio',
        authType: 'api_key',
        configSchema: {
          fields: [
            { name: 'accountSid', type: 'string', required: true },
            { name: 'authToken', type: 'password', required: true },
            { name: 'phoneNumber', type: 'string', required: true, format: 'whatsapp:+1234567890' },
          ],
        },
        isActive: true,
      },
    });
    console.log('✅ WhatsApp integration created\n');
  } else {
    console.log('✅ WhatsApp integration already exists\n');
  }

  // Find all users (except demo user)
  const users = await prisma.user.findMany({
    where: {
      clerkId: {
        not: 'clerk_user_123',
      },
    },
  });

  if (users.length === 0) {
    console.log('⚠️  No users found. Please sign in first.');
    return;
  }

  console.log(`📊 Found ${users.length} user(s)\n`);

  // Create credentials for each user
  for (const user of users) {
    console.log(`👤 Setting up for: ${user.email}`);

    // Check if credential already exists
    const existing = await prisma.credential.findFirst({
      where: {
        userId: user.id,
        integrationId: integration.id,
        name: 'Default Twilio WhatsApp',
      },
    });

    if (existing) {
      console.log(`   ✓ Credentials already exist (ID: ${existing.id})\n`);
      continue;
    }

    // Encrypt credential data
    const credentialData = {
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      phoneNumber: twilioWhatsAppFrom,
    };

    const encryptedData = encrypt(credentialData);

    // Create credential
    const credential = await prisma.credential.create({
      data: {
        userId: user.id,
        integrationId: integration.id,
        name: 'Default Twilio WhatsApp',
        encryptedData,
        isActive: true,
      },
    });

    console.log(`   ✅ Credentials created (ID: ${credential.id})\n`);
  }

  // Now update the workflow to use the credential
  console.log('🔄 Updating BFSI workflow with credential ID...\n');

  const workflows = await prisma.workflow.findMany({
    where: {
      name: 'BFSI Marketing Campaign with Compliance',
    },
  });

  for (const workflow of workflows) {
    const definition = workflow.definition as any;
    const whatsappNode = definition.nodes.find((n: any) => n.type === 'whatsapp');

    if (whatsappNode) {
      // Find the user's credential
      const credential = await prisma.credential.findFirst({
        where: {
          userId: workflow.userId,
          integrationId: integration.id,
        },
      });

      if (credential) {
        whatsappNode.config.credentialId = credential.id;
        console.log(`   ✅ Updated workflow for user ${workflow.userId}`);
        console.log(`      Credential ID: ${credential.id}`);

        await prisma.workflow.update({
          where: { id: workflow.id },
          data: { definition: definition as any },
        });
      }
    }
  }

  console.log('\n🎉 Setup complete!');
  console.log('   Twilio WhatsApp credentials are ready for all users.');
  console.log('   The BFSI workflow is configured to send to: +918610560986\n');
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
