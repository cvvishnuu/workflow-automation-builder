# Testing Guide - Workflow Automation Platform

## ✅ System Status

### Backend (Port 3001)
- **Status**: ✅ Running
- **Authentication**: ✅ Clerk JWT validation active
- **Database**: ✅ PostgreSQL connected
- **API Documentation**: http://localhost:3001/api/docs

### Frontend (Port 3000)
- **Status**: ✅ Running
- **Authentication**: ✅ Clerk provider configured
- **Token Injection**: ✅ Automatic Bearer token in API calls

---

## 🔧 What Was Fixed

### Issue: 500 Internal Server Error on Workflow Creation

**Root Cause:**
- Clerk returns `clerkId` (e.g., `user_2xxx`)
- Database foreign key expects `User.id` (UUID)
- System was trying to use Clerk ID directly → FK constraint violation

**Solution Implemented:**
1. **Created User Sync System** (`/apps/backend/src/users/`)
   - `UsersService` syncs Clerk users to database automatically
   - `findOrCreateUser()` creates/updates user on authentication
   - Made `UsersModule` global for dependency injection

2. **Updated Authentication Guard** (`/apps/backend/src/auth/clerk-auth.guard.ts`)
   - Extracts user info from Clerk JWT (clerkId, email, name)
   - Automatically syncs to database on each request
   - Attaches **database UUID** to request (not Clerk ID)
   - `request.user.userId` now contains the correct database UUID

3. **Fixed Dependency Injection**
   - Created global `AuthModule` (provides ClerkAuthGuard)
   - Created global `UsersModule` (provides UsersService)
   - Fixed module import order in app.module.ts

---

## 🧪 Automated Tests (PASSED)

Run the test script:
```bash
./test-e2e.sh
```

**Test Results:**
- ✅ Backend server health check
- ✅ Frontend server health check
- ✅ Unauthenticated request protection
- ✅ Invalid token rejection
- ✅ BFSI endpoints authentication

---

## 📝 Manual Testing Checklist

### 1. Authentication Flow

**Test Sign Up:**
1. Navigate to http://localhost:3000
2. Click "Sign Up" button
3. Enter email: `cvishnuu01@gmail.com` (or any email)
4. Complete Clerk authentication flow
5. ✅ Verify: Successful redirect to dashboard
6. ✅ Verify: User created in database (check Prisma Studio)

**Test Sign In:**
1. Navigate to http://localhost:3000
2. Click "Sign In" button
3. Enter email: `cvishnuu01@gmail.com`
4. Complete authentication
5. ✅ Verify: Successful sign-in
6. ✅ Verify: Browser console shows token logs from API client

**Expected Console Logs:**
```
[API] Making request to: /workflows
[API] Token provider exists: true
[API] Got token: eyJhbGciOiJSUzI1NiI...
[Auth] Verifying token with Clerk...
[Auth] Token verified successfully, clerkId: user_2xxx
[Auth] Synced user to database, dbUserId: uuid-here
```

---

### 2. Workflow Creation

**Test Create Workflow:**
1. Ensure you're signed in
2. Navigate to "Workflows" page
3. Click "Create New Workflow" button
4. Enter workflow details:
   - Name: "Test Workflow"
   - Description: "Testing workflow creation"
5. ✅ Verify: No 500 errors in browser console
6. ✅ Verify: Workflow appears in list
7. ✅ Verify: Success message displayed

**Test Edit Workflow:**
1. Click on a workflow from the list
2. Open the workflow editor
3. Add nodes from the palette (drag & drop)
4. Connect nodes
5. Click "Save" button
6. ✅ Verify: Changes saved successfully
7. ✅ Verify: No errors in console

**Check Backend Logs:**
```bash
# In terminal, you should see:
[Auth] Token verified successfully, clerkId: user_2xxx
[Auth] Synced user to database, dbUserId: <uuid>
```

---

### 3. CSV File Upload (BFSI Feature)

**Prepare Test CSV:**
Create a test file `/tmp/test_customers.csv`:
```csv
customer_id,name,email,phone,pan,aadhaar
1,John Doe,john@example.com,9876543210,ABCDE1234F,123456789012
2,Jane Smith,jane@example.com,9876543211,XYZPQ5678G,987654321098
```

**Test File Upload:**
1. Navigate to BFSI section (if available in UI)
2. OR use curl to test the endpoint:
```bash
curl -s -X POST http://localhost:3001/api/v1/bfsi/files/upload \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN_HERE" \
  -F "file=@/tmp/test_customers.csv"
```

3. ✅ Verify: File upload succeeds
4. ✅ Verify: Response includes:
   - `fileHash` (SHA-256)
   - `rowCount`, `columnCount`
   - `columns` array
   - `expiresAt` (24 hours from now)
5. ✅ Verify: Encrypted file created in `/uploads/encrypted/`
6. ✅ Verify: PII fields (email, phone, PAN, Aadhaar) detected

**Check Database:**
```bash
# Open Prisma Studio
pnpm --filter @workflow/backend prisma:studio

# Navigate to FileUpload table
# Verify record exists with correct userId (UUID, not Clerk ID)
```

---

### 4. AI Content Generation (Gemini)

**Test Gemini Integration:**
1. Create a workflow with AI Content Generator node
2. Configure node with:
   - Prompt template: "Write a professional email to {customer_name} about {product}"
   - Input data: `{ "customer_name": "John", "product": "savings account" }`
3. Execute the workflow
4. ✅ Verify: Node executes successfully
5. ✅ Verify: Generated content appears in output
6. ✅ Verify: No API errors in backend logs

**Expected Backend Logs:**
```
[AI] Generating content with Gemini API
[AI] Content generated successfully (X tokens)
```

**If Gemini API Fails:**
- Check `GEMINI_API_KEY` in `/apps/backend/.env`
- Verify API key is valid at: https://makersuite.google.com/app/apikey
- Check API quota/limits

---

### 5. Compliance Checking (BFSI)

**Test Compliance Service:**
1. Create a workflow with Compliance Checker node
2. Input test content:
```json
{
  "content": "Guaranteed returns of 20%! No risk investment!",
  "contentType": "email"
}
```

3. Execute workflow
4. ✅ Verify: Compliance check fails (critical violations)
5. ✅ Verify: Flagged terms include:
   - "guaranteed returns" (critical)
   - "no risk" (critical)
6. ✅ Verify: Risk score > 50
7. ✅ Verify: Suggestions provided

**Test Passing Content:**
```json
{
  "content": "Invest in our mutual funds. Subject to market risks. Read all scheme-related documents carefully.",
  "contentType": "email"
}
```

8. ✅ Verify: Compliance check passes
9. ✅ Verify: Risk score < 50

---

## 🐛 Troubleshooting

### Issue: "No authentication token provided"
**Solution:**
- Ensure you're signed in via Clerk
- Check browser console for token logs
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in frontend `.env.local`

### Issue: "Invalid or expired token"
**Solution:**
- Sign out and sign back in
- Check `CLERK_SECRET_KEY` in backend `.env`
- Ensure Clerk keys match (same project)

### Issue: Workflow creation still fails
**Solution:**
- Check backend logs for actual error
- Verify user was created in database (Prisma Studio)
- Check `userId` in request is UUID (not Clerk ID)
- Look for FK constraint errors

### Issue: CSV upload fails
**Solution:**
- Check `FILE_ENCRYPTION_KEY` is set in `.env` (64 hex chars)
- Verify `/uploads/encrypted/` directory exists
- Check file size < 10MB
- Ensure file is valid CSV

### Issue: Gemini API errors
**Solution:**
- Verify `GEMINI_API_KEY` in `.env`
- Check API quota at Google AI Studio
- Test with smaller prompts
- Check backend logs for detailed error

---

## 📊 Database Inspection

**View database records:**
```bash
# Open Prisma Studio
pnpm --filter @workflow/backend prisma:studio
```

**Check user sync:**
1. Navigate to "User" table
2. Find user with your `clerkId`
3. Verify `id` is UUID
4. Note the `id` value

**Check workflows:**
1. Navigate to "Workflow" table
2. Verify `userId` matches the UUID from User table (NOT Clerk ID)
3. This confirms FK constraint is working

---

## ✅ Success Criteria

All of the following should work without errors:

1. ✅ Sign up creates user in database
2. ✅ Sign in succeeds and token is injected
3. ✅ Workflow creation saves successfully
4. ✅ Workflow editing and saving works
5. ✅ CSV upload encrypts and stores file
6. ✅ AI content generation uses Gemini
7. ✅ Compliance checking validates content
8. ✅ No 500 errors in any operation
9. ✅ Backend logs show user sync working
10. ✅ Database has correct UUID foreign keys

---

## 📞 Support

If you encounter issues:

1. Check browser console (F12) for frontend errors
2. Check backend terminal for server logs
3. Run automated tests: `./test-e2e.sh`
4. Check Prisma Studio for database state
5. Verify all environment variables are set correctly

---

## 🎉 Next Steps

Once testing is complete:

1. **Real-time monitoring** - Implement WebSocket updates for workflow execution
2. **Additional integrations** - Google Sheets, Slack, Email adapters
3. **Enhanced UI** - Dashboard with statistics
4. **Production deployment** - Deploy to Vercel (frontend) + Railway (backend)

---

**Last Updated:** 2025-10-17
**System Version:** MVP 1.0
**Authentication:** Clerk v5 + JWT
