const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const credential = await prisma.credential.findUnique({
    where: { id: '48c2a793-252c-4491-af2a-b5784dcadb82' }
  });

  console.log('Credential Details:');
  console.log('  ID:', credential.id);
  console.log('  Name:', credential.name);
  console.log('  Type:', credential.type);
  console.log('  User ID:', credential.userId);
  console.log('  Created:', credential.createdAt);
  console.log('  Updated:', credential.updatedAt);
  console.log('  Encrypted Data Length:', credential.encryptedData?.length);
  console.log('  Encryption IV Length:', credential.encryptionIv?.length);
  console.log('\nEncrypted Data (first 100 chars):', credential.encryptedData?.substring(0, 100));
  console.log('Encryption IV (first 50 chars):', credential.encryptionIv?.substring(0, 50));

  await prisma.$disconnect();
}

main();
