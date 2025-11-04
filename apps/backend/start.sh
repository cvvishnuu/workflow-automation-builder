# #!/bin/bash
# set -e

# echo "🚀 Starting Railway deployment..."

# # Check required environment variables
# if [ -z "$DATABASE_URL" ]; then
#   echo "❌ ERROR: DATABASE_URL is not set"
#   exit 1
# fi

# if [ -z "$FILE_ENCRYPTION_KEY" ]; then
#   echo "⚠️  WARNING: FILE_ENCRYPTION_KEY is not set. Generating one..."
#   export FILE_ENCRYPTION_KEY=$(openssl rand -hex 32)
#   echo "✅ Generated FILE_ENCRYPTION_KEY: $FILE_ENCRYPTION_KEY"
#   echo "⚠️  IMPORTANT: Save this key in Railway environment variables!"
# fi

# echo "📊 Environment check passed"
# echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
# echo "NODE_ENV: $NODE_ENV"

# # Wait for database to be ready with retry logic
# echo "⏳ Waiting for database connection..."
# max_retries=30
# retry_count=0

# until npx prisma db execute --stdin < /dev/null 2>/dev/null || [ $retry_count -eq $max_retries ]; do
#   retry_count=$((retry_count + 1))
#   echo "🔄 Database not ready, attempt $retry_count/$max_retries (waiting 2s)..."
#   sleep 2
# done

# if [ $retry_count -eq $max_retries ]; then
#   echo "❌ ERROR: Could not connect to database after $max_retries attempts"
#   exit 1
# fi

# echo "✅ Database connection established"

# # Run migrations
# echo "🔄 Running Prisma migrations..."
# npx prisma migrate deploy

# if [ $? -ne 0 ]; then
#   echo "❌ ERROR: Prisma migrations failed"
#   exit 1
# fi

# echo "✅ Migrations completed successfully"

# # Start the application
# echo "🎉 Starting NestJS application..."
# exec node dist/main.js
#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting Railway deployment..."

# Check required environment variables
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ -z "${FILE_ENCRYPTION_KEY:-}" ]; then
  echo "⚠️  WARNING: FILE_ENCRYPTION_KEY is not set. Generating one..."
  export FILE_ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "✅ Generated FILE_ENCRYPTION_KEY: $FILE_ENCRYPTION_KEY"
  echo "⚠️  IMPORTANT: Save this key in Railway environment variables!"
fi

echo "📊 Environment check passed"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "NODE_ENV: ${NODE_ENV:-}"

# Wait for database to be ready with retry logic
echo "⏳ Waiting for database connection..."
max_retries=30
retry_count=0

until pnpm dlx prisma db execute --stdin < /dev/null 2>/dev/null || [ $retry_count -eq $max_retries ]; do
  retry_count=$((retry_count + 1))
  echo "🔄 Database not ready, attempt $retry_count/$max_retries (waiting 2s)..."
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "❌ ERROR: Could not connect to database after $max_retries attempts"
  exit 1
fi

echo "✅ Database connection established"

# Run migrations
echo "🔄 Running Prisma migrations..."
pnpm dlx prisma migrate deploy
echo "✅ Migrations completed successfully"

# Optional seed (enable per deploy with SEED_ON_DEPLOY=true)
if [ "${SEED_ON_DEPLOY:-}" = "true" ]; then
  echo "🌱 Seeding database..."
  pnpm dlx prisma db seed
  echo "✅ Seeding complete"
else
  echo "⏭️  Skipping seed (set SEED_ON_DEPLOY=true to enable)"
fi

# Start the application
echo "🎉 Starting NestJS application..."
# Use the actual build output name; Nest usually emits dist/main.js
exec node dist/main.js
