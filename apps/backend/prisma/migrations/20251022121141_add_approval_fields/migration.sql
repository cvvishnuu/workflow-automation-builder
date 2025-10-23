-- AlterTable
ALTER TABLE "workflow_executions" ADD COLUMN     "approvalData" JSONB,
ADD COLUMN     "approvalStatus" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT;

-- CreateIndex
CREATE INDEX "workflow_executions_approvalStatus_idx" ON "workflow_executions"("approvalStatus");
