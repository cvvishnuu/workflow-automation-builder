-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "definition" JSONB NOT NULL,
    "metadata" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_checks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUploadId" TEXT,
    "executionId" TEXT,
    "contentType" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "flaggedTerms" JSONB NOT NULL,
    "suggestions" JSONB,
    "complianceRules" JSONB NOT NULL,
    "isPassed" BOOLEAN NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_templates_category_idx" ON "workflow_templates"("category");

-- CreateIndex
CREATE INDEX "workflow_templates_isPublic_idx" ON "workflow_templates"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "file_uploads_fileHash_key" ON "file_uploads"("fileHash");

-- CreateIndex
CREATE INDEX "file_uploads_userId_idx" ON "file_uploads"("userId");

-- CreateIndex
CREATE INDEX "file_uploads_fileHash_idx" ON "file_uploads"("fileHash");

-- CreateIndex
CREATE INDEX "file_uploads_expiresAt_idx" ON "file_uploads"("expiresAt");

-- CreateIndex
CREATE INDEX "compliance_checks_userId_idx" ON "compliance_checks"("userId");

-- CreateIndex
CREATE INDEX "compliance_checks_fileUploadId_idx" ON "compliance_checks"("fileUploadId");

-- CreateIndex
CREATE INDEX "compliance_checks_executionId_idx" ON "compliance_checks"("executionId");

-- CreateIndex
CREATE INDEX "compliance_checks_riskScore_idx" ON "compliance_checks"("riskScore");

-- CreateIndex
CREATE INDEX "compliance_checks_checkedAt_idx" ON "compliance_checks"("checkedAt");

-- AddForeignKey
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "file_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
