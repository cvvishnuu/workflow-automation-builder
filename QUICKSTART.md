# Quick Start Guide

Get the Workflow Automation Platform running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- PostgreSQL running locally or accessible remotely

## Steps

### 1. Install Dependencies

```bash
cd workflow-automation-mvp
pnpm install
```

### 2. Configure Environment

Create `.env` file in `apps/backend/`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/workflow_db"
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

Create `.env.local` file in `apps/frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 3. Set Up Database

```bash
cd apps/backend

# Generate Prisma Client
pnpm prisma:generate

# Run migrations (creates tables)
pnpm prisma:migrate
```

If you don't have a PostgreSQL database yet:

```bash
# Using Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=workflow_db -p 5432:5432 -d postgres:14
```

### 4. Start Development Servers

From the root directory:

```bash
pnpm dev
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

### 5. Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Get Started" or "View Workflows"
3. Click "Create Workflow"
4. You'll see the workflow editor with a default trigger node
5. Save and execute your first workflow!

## Building Your First Workflow

### Example: Simple HTTP Request Workflow

1. **Create a new workflow**
   - Click "Create Workflow"
   - Name it "Fetch User Data"

2. **Add an HTTP Request node**
   - In the workflow editor (future feature in UI)
   - Or via API:

```bash
curl -X PATCH http://localhost:3001/api/v1/workflows/{workflow-id} \
  -H "Content-Type: application/json" \
  -d '{
    "definition": {
      "nodes": [
        {
          "nodeId": "trigger-1",
          "type": "trigger",
          "label": "Start",
          "position": { "x": 100, "y": 100 },
          "config": { "triggerType": "manual" }
        },
        {
          "nodeId": "http-1",
          "type": "http_request",
          "label": "Fetch Users",
          "position": { "x": 300, "y": 100 },
          "config": {
            "url": "https://jsonplaceholder.typicode.com/users/1",
            "method": "GET"
          }
        }
      ],
      "edges": [
        {
          "id": "edge-1",
          "source": "trigger-1",
          "target": "http-1"
        }
      ]
    }
  }'
```

3. **Execute the workflow**

```bash
curl -X POST http://localhost:3001/api/v1/executions \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "your-workflow-id"
  }'
```

4. **Check execution status**

```bash
curl http://localhost:3001/api/v1/executions/{execution-id}
```

## Common Commands

### Backend

```bash
cd apps/backend

# Development
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Database
pnpm prisma:studio    # Visual database editor
pnpm prisma:generate  # Regenerate Prisma Client
pnpm prisma:migrate   # Run migrations
```

### Frontend

```bash
cd apps/frontend

# Development
pnpm dev

# Build
pnpm build

# Start production server
pnpm start
```

### Root Commands

```bash
# Start all apps
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Format all code
pnpm format
```

## Troubleshooting

### "Port 3000 already in use"

Kill the process or change the port:

```bash
# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9

# Or change port in apps/frontend/package.json
"dev": "next dev -p 3001"
```

### "Cannot connect to database"

1. Verify PostgreSQL is running:
   ```bash
   psql -U postgres -c "SELECT 1"
   ```

2. Check DATABASE_URL in `.env`

3. Create database manually:
   ```bash
   createdb workflow_db
   ```

### "Module not found @workflow/shared-types"

Build the shared types package:

```bash
cd packages/shared-types
pnpm build
```

### "Prisma Client not generated"

```bash
cd apps/backend
pnpm prisma:generate
```

## Next Steps

1. **Read the full README**: `README.md`
2. **Understand the architecture**: `ARCHITECTURE.md`
3. **Explore the API**: http://localhost:3001/api/docs
4. **Build workflows**: Create more complex workflows with multiple nodes
5. **Extend functionality**: Add custom node types (see ARCHITECTURE.md)

## Production Deployment

For production deployment instructions, see the "Deployment" section in `README.md`.

## Getting Help

- Check `README.md` for detailed documentation
- Review `ARCHITECTURE.md` for design decisions
- Open an issue on GitHub
- Check API docs at http://localhost:3001/api/docs

Happy automating! 🚀
