# RAILWAY DATABASE CONNECTION FIX

## Problem

Railway backend cannot connect to PostgreSQL database after latest changes.

## ROOT CAUSE

Railway's DATABASE_URL from the Postgres service may not be linking correctly to the backend service.

## IMMEDIATE FIX - Railway Dashboard

### Step 1: Verify Database Service

1. Go to Railway Dashboard → Your Project
2. Check if **PostgreSQL** service exists
3. If not, add it: **New → Database → Add PostgreSQL**

### Step 2: Link Database to Backend

1. Click on your **Backend Service**
2. Go to **Variables** tab
3. **CRITICAL**: Check if `DATABASE_URL` exists
4. If it doesn't exist or looks wrong:
   - Click **New Variable**
   - Click **Add Reference**
   - Select: **Postgres → DATABASE_URL**
   - This creates: `${{Postgres.DATABASE_URL}}`

### Step 3: Set Required Environment Variables

In your Backend service Variables tab, add these:

```bash
# Railway auto-provides these (don't add if already there):
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Reference to Postgres service
PORT=${{PORT}}  # Railway auto-provides

# YOU MUST ADD THESE:
NODE_ENV=production
CLERK_SECRET_KEY=your_actual_clerk_secret_key_here
CLERK_PUBLISHABLE_KEY=your_actual_clerk_publishable_key_here

# Optional (we removed CORS_ORIGIN dependency):
# CORS_ORIGIN=https://your-frontend-url.vercel.app
```

### Step 4: Verify DATABASE_URL Format

The DATABASE_URL should look like:

```
postgresql://postgres:password@host.railway.internal:5432/railway
```

**NOT like:**

```
postgresql://user:password@localhost:5432/workflow_db  ❌ WRONG
```

If it shows `localhost`, you need to use the reference variable from Step 2.

### Step 5: Redeploy

After setting variables:

1. Click **Deploy** button in Railway
2. OR push new commit to trigger deploy

## Alternative Fix - Check Service Connections

### In Railway Dashboard:

1. Go to your **Postgres service**
2. Click on **Connect** tab
3. You should see your backend service listed under "Connected Services"
4. If not listed, click **Connect to Service** → Select your backend

## Verify It's Working

### Check Deployment Logs:

1. Railway Dashboard → Backend Service → Deployments
2. Click latest deployment
3. Look for these SUCCESS messages:

```
✅ Prisma Client generated
✅ Build succeeded
✅ Running postdeploy...
✅ Migrations applied
🌱 Starting database seed...
✅ User ready: cvishnuu01@gmail.com
✅ Workflow created: workflow_bfsi_marketing_template
✅ CSV file created
🎉 Seed completed successfully!
```

### If you see DATABASE CONNECTION ERROR:

```
Error: P1001: Can't reach database server at `localhost:5432`
```

**This means:** DATABASE_URL is pointing to localhost instead of Railway's internal network.

**Fix:** Use the reference variable `${{Postgres.DATABASE_URL}}` as shown in Step 2.

## Common Mistakes

### ❌ WRONG: Hardcoded DATABASE_URL

```
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_db
```

### ✅ CORRECT: Reference Variable

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### ❌ WRONG: Missing NODE_ENV

If NODE_ENV is not set, app may not work correctly in production.

### ✅ CORRECT: Set NODE_ENV

```
NODE_ENV=production
```

## If Database Still Won't Connect

### Nuclear Option - Recreate Database Link:

1. **Unlink Database:**
   - Backend Service → Settings → scroll to "Service Variables"
   - Delete the DATABASE_URL variable

2. **Relink Database:**
   - Backend Service → Variables
   - New Variable → Add Reference
   - Select Postgres → DATABASE_URL

3. **Redeploy**

## Test After Fix

1. **Push your commits:**

   ```bash
   git push origin master
   ```

2. **Watch Railway logs** for seed success messages

3. **Visit your Railway backend URL:**

   ```
   https://your-backend.railway.app/api/v1/health
   ```

   Should return 200 OK

4. **Check database has data:**
   - Railway Dashboard → Postgres → Data tab
   - Should see tables: users, workflows, file_uploads

## Environment Variables Checklist

```bash
# Auto-provided by Railway (don't touch):
✅ DATABASE_URL=${{Postgres.DATABASE_URL}}
✅ PORT=${{PORT}}

# You MUST set:
✅ NODE_ENV=production
✅ CLERK_SECRET_KEY=sk_test_xxxxx or sk_live_xxxxx
✅ CLERK_PUBLISHABLE_KEY=pk_test_xxxxx or pk_live_xxxxx

# Optional:
✅ GEMINI_API_KEY=your_gemini_key (for AI generation)
✅ TWILIO_* variables (for WhatsApp)
✅ SENDGRID_API_KEY (for email)
```

## Quick Verification Script

After deployment, run this to verify database connection:

```bash
# Install Railway CLI if not already
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run command in Railway environment
railway run --service backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Database connected!'))
  .catch(e => console.error('❌ Connection failed:', e.message));
"
```

## NODE_ENV Values

- **Development (local):** `development`
- **Production (Railway):** `production`

Railway should have `NODE_ENV=production` set.

---

**Summary:** The issue is DATABASE_URL not properly referencing the Railway Postgres service. Use the reference variable format `${{Postgres.DATABASE_URL}}` instead of a hardcoded connection string.
