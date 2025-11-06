#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting Railway deployment..."
echo ""

# Check required environment variables
echo "📊 Checking environment variables..."
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  exit 1
fi

# Sanitize and display DATABASE_URL
SANITIZED_URL=$(echo "$DATABASE_URL" | sed -E 's/:\/\/([^:]+):([^@]+)@/:\/\/***:***@/')
echo "✅ DATABASE_URL is set: ${SANITIZED_URL:0:80}..."
echo "   NODE_ENV: ${NODE_ENV:-development}"
echo ""

# Generate FILE_ENCRYPTION_KEY if not set
if [ -z "${FILE_ENCRYPTION_KEY:-}" ]; then
  echo "⚠️  WARNING: FILE_ENCRYPTION_KEY is not set. Generating one..."
  export FILE_ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "✅ Generated FILE_ENCRYPTION_KEY"
  echo "⚠️  IMPORTANT: Save this key in Railway environment variables!"
  echo "   FILE_ENCRYPTION_KEY=$FILE_ENCRYPTION_KEY"
  echo ""
fi

# Run migrations (let Prisma handle connection retry)
echo "🔄 Running Prisma migrations..."
echo "   This will test the database connection and apply migrations"
echo ""

if pnpm prisma migrate deploy; then
  echo ""
  echo "✅ Migrations completed successfully"
  echo ""
else
  echo ""
  echo "❌ ERROR: Prisma migrations failed"
  echo ""
  echo "🔍 Diagnostic information:"
  echo "   - Check if DATABASE_URL format is correct (postgresql://user:pass@host:port/db)"
  echo "   - Verify PostgreSQL service is running in Railway"
  echo "   - Check if services are properly linked in Railway"
  echo "   - Ensure DATABASE_URL is using Railway's reference variable: \${{Postgres.DATABASE_URL}}"
  echo ""
  exit 1
fi

# Optional seed
if [ "${SEED_ON_DEPLOY:-}" = "true" ]; then
  echo "🌱 Seeding database..."
  pnpm prisma db seed
  echo "✅ Seeding complete"
  echo ""
else
  echo "⏭️  Skipping seed (set SEED_ON_DEPLOY=true to enable)"
  echo ""
fi

# Start the application
echo "🎉 Starting NestJS application..."
echo "   Our PrismaService will handle connection with retry logic"
echo ""
exec node dist/main.js
