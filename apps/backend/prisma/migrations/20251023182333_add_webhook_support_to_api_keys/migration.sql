-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "webhookEvents" JSONB,
ADD COLUMN     "webhookSecret" TEXT,
ADD COLUMN     "webhookUrl" TEXT;
