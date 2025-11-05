# Railway Deployment Guide

## Overview

This guide explains how to properly configure your Railway deployment for the Workflow Automation MVP backend.

## Prerequisites

- Railway account
- GitHub repository connected to Railway
- PostgreSQL database service added to your Railway project

## Database Connection Setup

### Step 1: Verify PostgreSQL Service

1. Log into Railway Dashboard
2. Open your project
3. Confirm you have a **PostgreSQL** service running
4. If not, add it: Click **New** → **Database** → **Add PostgreSQL**

### Step 2: Connect Database to Backend

The most common issue is the DATABASE_URL not being properly linked to the PostgreSQL service.

**DO NOT hardcode DATABASE_URL!** Instead, use Railway's reference variable system:

1. Click on your **Backend Service**
2. Go to the **Variables** tab
3. Check if `DATABASE_URL` exists
4. If it's hardcoded (looks like `postgresql://user:pass@localhost:5432/db`), **delete it**
5. Click **New Variable** → **Add Reference**
6. Select **Postgres** → **DATABASE_URL**
7. This creates: `${{Postgres.DATABASE_URL}}`

Railway will automatically resolve this to the correct internal PostgreSQL connection string.

### Step 3: Verify Connection in Postgres Service

1. Go to your **Postgres service**
2. Click the **Connect** tab
3. Under "Connected Services", verify your backend service is listed
4. If not listed, click **Connect to Service** → Select your backend

## Required Environment Variables

Set these in your Backend service's Variables tab:

### Auto-Provided by Railway (verify, don't override):

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=${{PORT}}
```

### You MUST Add:

```bash
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for development
CLERK_PUBLISHABLE_KEY=pk_live_xxxxx  # or pk_test_xxxxx
```

### Optional (for full functionality):

```bash
GEMINI_API_KEY=your_gemini_api_key  # For AI content generation
TWILIO_ACCOUNT_SID=ACxxxxx  # For WhatsApp messaging
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
SENDGRID_API_KEY=SG.xxxxx  # For email notifications
```

## Deployment Process

### Automatic Deployment

Railway automatically deploys when you push to your connected GitHub branch (usually `master` or `main`).

**Build Process:**

1. Railway detects git push
2. Builds Docker image using your Dockerfile
3. Runs `pnpm install`
4. Runs `pnpm prisma:generate` (generates Prisma client)
5. Runs `pnpm build` (compiles NestJS app)
6. Runs `pnpm postdeploy` (applies migrations and seeds database)
7. Starts the application

### Post-Deploy Script

Our `package.json` includes a `postdeploy` script that runs automatically:

```json
{
  "scripts": {
    "postdeploy": "prisma migrate deploy && prisma db seed"
  }
}
```

This ensures:

- Database migrations are applied
- Seed data is created (default user, BFSI workflow, test CSV file)

## Verify Deployment

### 1. Check Build Logs

In Railway Dashboard → Backend Service → Deployments → Latest Deployment

Look for these success messages:

```
✅ Prisma Client generated
✅ Build succeeded
✅ Running postdeploy...
✅ Migrations applied
🌱 Starting database seed...
✅ User ready: cvishnuu01@gmail.com
✅ Workflow created: workflow_bfsi_marketing_template
✅ CSV file created: test_customers.csv
🎉 Seed completed successfully!
🚀 Application is running on: http://[...].railway.app
```

### 2. Check Application Health

Visit your Railway backend URL + `/api/v1/health`:

```bash
curl https://your-backend.railway.app/api/v1/health
```

Should return `200 OK`

### 3. Verify Database

Railway Dashboard → Postgres → Data tab

Confirm these tables exist and have data:

- `users` - Should have at least 1 user (cvishnuu01@gmail.com)
- `workflows` - Should have the BFSI workflow template
- `file_uploads` - Should have test_customers.csv

## Common Issues & Solutions

### Issue: "Can't reach database server"

**Error:**

```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Cause:** DATABASE_URL is pointing to localhost instead of Railway's internal PostgreSQL.

**Fix:**

1. Delete the hardcoded DATABASE_URL variable
2. Add reference variable: `${{Postgres.DATABASE_URL}}`
3. Redeploy

### Issue: "Prisma generate failed"

**Error:**

```
The "path" argument must be of type string. Received undefined
```

**Cause:** Using `pnpm dlx prisma generate --schema` which doesn't work in Railway environment.

**Fix:** Already fixed in latest code - we now use `prisma generate` without the schema flag.

### Issue: "No tables in database"

**Cause:** Migrations didn't run or failed.

**Fix:**

1. Check deployment logs for migration errors
2. Verify DATABASE_URL is correct
3. Manually run migrations (if needed):
   ```bash
   # In Railway CLI (if you have it)
   railway run --service backend pnpm prisma:migrate:deploy
   ```

### Issue: "Seed data not appearing"

**Cause:** Seed script failed or wasn't run.

**Fix:**

1. Check for seed errors in deployment logs
2. Verify postdeploy script ran successfully
3. Manually run seed (if needed):
   ```bash
   railway run --service backend pnpm prisma:seed
   ```

## Testing After Deployment

### 1. Login to Frontend

Visit your Vercel-deployed frontend URL (or localhost if testing locally with Railway backend):

```
https://your-frontend.vercel.app
```

Login with a Clerk account.

### 2. Verify BFSI Workflow Exists

Navigate to the Workflows page. You should see:

- **BFSI Marketing Campaign with Compliance**

### 3. Create API Key

1. Click on the BFSI workflow
2. Go to API Keys tab (or similar)
3. Create a new API key
4. Copy the generated key

### 4. Update Vercel Environment Variables

In your Vercel project settings:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
NEXT_PUBLIC_API_KEY=<the-api-key-you-just-created>
NEXT_PUBLIC_WORKFLOW_ID=workflow_bfsi_marketing_template
```

Redeploy Vercel frontend.

### 5. Test BFSI Campaign Generator

Visit your BFSI campaign generator site:

```
https://your-bfsi-site.vercel.app
```

1. Upload a CSV or use the default data
2. Generate campaign
3. Verify content appears in review page
4. Test approve/reject functionality

## Rollback Strategy

If deployment fails:

1. **Rollback in Railway:**
   - Railway Dashboard → Backend Service → Deployments
   - Click on a previous successful deployment
   - Click **Redeploy**

2. **Revert Git Changes:**
   ```bash
   git revert HEAD
   git push origin master
   ```

## Monitoring & Debugging

### View Real-Time Logs

Railway Dashboard → Backend Service → Deployments → Latest → View Logs

### Database Access

Use Prisma Studio to inspect database:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Run Prisma Studio
railway run --service backend pnpm dlx prisma studio
```

### Check Environment Variables

Railway Dashboard → Backend Service → Variables

Verify all required variables are set correctly.

## Production Checklist

Before going live:

- [ ] DATABASE_URL uses reference variable `${{Postgres.DATABASE_URL}}`
- [ ] NODE_ENV=production
- [ ] CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY set (live keys, not test)
- [ ] All optional API keys set (Gemini, Twilio, SendGrid) if using those features
- [ ] Migrations applied successfully
- [ ] Seed data created (verify in Postgres Data tab)
- [ ] Health endpoint returns 200 OK
- [ ] Frontend can connect to backend (test API calls)
- [ ] CORS configured correctly (currently allows all origins - consider restricting in production)

## Security Considerations

### CORS Configuration

Current configuration in `apps/backend/src/main.ts` allows all origins:

```typescript
app.enableCors({
  origin: true, // Allows all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

**For production, consider restricting to specific domains:**

```typescript
app.enableCors({
  origin: ['https://your-frontend.vercel.app', 'https://your-bfsi-site.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```

### API Keys

- Store API keys securely in Railway environment variables
- Never commit keys to git
- Rotate keys periodically
- Use different keys for development and production

## Support

For issues:

1. Check Railway deployment logs first
2. Verify all environment variables
3. Test database connection
4. Check GitHub repository issues

---

**Last Updated:** November 2025
**Status:** Production Ready ✅
