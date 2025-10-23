# Workflow Automation Platform MVP

A full-stack TypeScript workflow automation platform built with Next.js and NestJS. Create, manage, and execute automated workflows with a visual node-based editor.

## Features

- **Visual Workflow Editor**: Drag-and-drop interface powered by React Flow
- **Multiple Node Types**: HTTP requests, data transforms, conditionals, delays, and triggers
- **Real-time Execution**: WebSocket-based live execution updates
- **Type Safety**: End-to-end TypeScript with shared types
- **Modern Stack**: Next.js 14, NestJS, PostgreSQL, Prisma ORM
- **State Management**: Zustand for predictable state updates
- **Authentication Ready**: Clerk integration setup for JWT-based auth
- **SOLID Principles**: Clean, maintainable, and extensible architecture

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + ShadCN UI
- **State**: Zustand
- **Workflow Editor**: React Flow
- **Auth**: Clerk (configured)
- **HTTP Client**: Axios
- **WebSocket**: Socket.io Client

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: REST + WebSocket
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

### Monorepo
- **Package Manager**: pnpm
- **Build Tool**: Turborepo
- **Code Quality**: ESLint + Prettier + Husky

## Project Structure

```
workflow-automation-mvp/
├── apps/
│   ├── frontend/           # Next.js application
│   │   ├── src/
│   │   │   ├── app/        # App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── stores/     # Zustand stores
│   │   │   ├── lib/        # Utilities & API client
│   │   │   └── hooks/      # Custom React hooks
│   │   └── package.json
│   │
│   └── backend/            # NestJS application
│       ├── src/
│       │   ├── workflows/  # Workflow CRUD module
│       │   ├── executions/ # Execution engine module
│       │   ├── nodes/      # Node executors
│       │   ├── websocket/  # WebSocket gateway
│       │   ├── prisma/     # Database service
│       │   └── main.ts     # Application entry
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
│
├── packages/
│   └── shared-types/       # Shared TypeScript types
│       └── src/index.ts
│
├── turbo.json              # Turborepo configuration
├── package.json            # Root package.json
└── pnpm-workspace.yaml     # pnpm workspaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL 14+
- (Optional) Clerk account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd workflow-automation-mvp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Backend (`apps/backend/.env`):
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/workflow_db"
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000

   # Optional: Clerk authentication
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

   Frontend (`apps/frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   NEXT_PUBLIC_WS_URL=http://localhost:3001

   # Optional: Clerk authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

4. **Set up the database**
   ```bash
   cd apps/backend
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. **Start development servers**
   ```bash
   # From root directory
   pnpm dev
   ```

   This starts both frontend (http://localhost:3000) and backend (http://localhost:3001)

## Development

### Available Scripts

**Root level:**
- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all apps
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests

**Backend:**
- `pnpm dev` - Start in watch mode
- `pnpm build` - Build for production
- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio

**Frontend:**
- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

## Architecture

### Backend Architecture (SOLID Principles)

The backend follows **SOLID principles** throughout:

#### 1. Single Responsibility Principle
- Each module handles one concern (workflows, executions, nodes)
- Services contain business logic only
- Controllers handle HTTP mapping only

#### 2. Open/Closed Principle
- Node executors use Strategy pattern - add new nodes without modifying existing code
- Executor factory allows runtime registration of new node types

#### 3. Liskov Substitution
- All node executors implement `INodeExecutor` interface
- Any executor can be used interchangeably

#### 4. Interface Segregation
- Focused interfaces like `INodeExecutor`
- Clean, minimal public APIs

#### 5. Dependency Injection
- NestJS built-in DI container
- Services injected through constructors

### Node Execution Engine

The execution engine uses a **Strategy pattern** with an **Executor Factory**:

```
WorkflowEngineService (orchestrates execution)
    ↓
ExecutorFactory (selects appropriate executor)
    ↓
NodeExecutor (implements specific node logic)
    - TriggerNodeExecutor
    - HttpRequestNodeExecutor
    - ConditionalNodeExecutor
    - DataTransformNodeExecutor
    - DelayNodeExecutor
```

**Adding a new node type:**

1. Create executor class extending `BaseNodeExecutor`
2. Implement `executeInternal()` method
3. Register in `ExecutorFactory`
4. Add type to shared types package

### Frontend Architecture

- **Component-based**: Reusable UI components with ShadCN
- **State management**: Zustand stores for workflows and executions
- **Type-safe API**: Axios client with TypeScript types
- **Real-time updates**: Socket.io for live execution status

## Available Node Types

### 1. Trigger Node
- **Purpose**: Start workflow execution
- **Types**: manual, scheduled, webhook
- **Config**: `{ triggerType: 'manual' | 'scheduled' | 'webhook' }`

### 2. HTTP Request Node
- **Purpose**: Make HTTP API calls
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Config**: `{ url, method, headers?, body?, timeout? }`
- **Features**: Variable substitution with `{{variableName}}`

### 3. Data Transform Node
- **Purpose**: Transform data using JavaScript
- **Config**: `{ transformScript, inputMapping? }`
- **Example**: `{ transformScript: "({ data }) => ({ result: data.value * 2 })" }`

### 4. Conditional Node
- **Purpose**: Branch execution based on condition
- **Config**: `{ condition, trueOutputId?, falseOutputId? }`
- **Example**: `{ condition: "previousOutput.value > 10" }`

### 5. Delay Node
- **Purpose**: Pause execution
- **Config**: `{ delayMs }`
- **Max delay**: 300000ms (5 minutes) in MVP

### 6. Webhook Node (Coming Soon)
- **Purpose**: Receive external HTTP requests
- **Config**: `{ webhookId, method }`

## API Documentation

Once the backend is running, access API documentation at:
```
http://localhost:3001/api/docs
```

### Key Endpoints

**Workflows:**
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id` - Get workflow
- `PATCH /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow

**Executions:**
- `POST /api/v1/executions` - Execute workflow
- `GET /api/v1/executions/:id` - Get execution details
- `GET /api/v1/executions/workflow/:workflowId` - Get workflow executions

**WebSocket:**
- Namespace: `/workflows`
- Events: `subscribe:execution`, `execution:started`, `node:completed`, etc.

## Database Schema

### Core Models

**User** - User accounts (linked to Clerk)
**Workflow** - Workflow definitions
**WorkflowExecution** - Execution history
**NodeExecution** - Individual node execution logs
**NodeDefinition** - Reusable node templates (optional)

See `apps/backend/prisma/schema.prisma` for full schema.

## Authentication

The project is configured for **Clerk** authentication but currently uses mock user IDs for development.

To enable Clerk:

1. Create a Clerk application at https://clerk.com
2. Add API keys to environment variables
3. Uncomment Clerk providers in:
   - `apps/frontend/src/app/layout.tsx`
   - `apps/backend/src/workflows/workflows.controller.ts`
4. Update API client to include JWT tokens

## Testing

### Backend Tests
```bash
cd apps/backend
pnpm test        # Run unit tests
pnpm test:e2e    # Run E2E tests
pnpm test:cov    # Generate coverage report
```

### Frontend Tests
```bash
cd apps/frontend
pnpm test
```

## Deployment

### Backend Deployment

1. Build the application:
   ```bash
   cd apps/backend
   pnpm build
   ```

2. Set production environment variables

3. Run migrations:
   ```bash
   pnpm prisma:migrate
   ```

4. Start production server:
   ```bash
   pnpm start:prod
   ```

### Frontend Deployment

Deploy to Vercel (recommended):
```bash
cd apps/frontend
vercel
```

Or build for self-hosting:
```bash
pnpm build
pnpm start
```

## Extending the Platform

### Adding a New Node Type

1. **Define types** in `packages/shared-types/src/index.ts`:
   ```typescript
   export interface CustomNodeConfig extends BaseNodeConfig {
     type: NodeType.CUSTOM;
     config: {
       customField: string;
     };
   }
   ```

2. **Create executor** in `apps/backend/src/nodes/executors/`:
   ```typescript
   @Injectable()
   export class CustomNodeExecutor extends BaseNodeExecutor {
     protected async executeInternal(node, context) {
       // Implementation
     }
   }
   ```

3. **Register in factory**:
   ```typescript
   this.executors.set(NodeType.CUSTOM, customExecutor);
   ```

4. **Add UI components** in frontend for node configuration

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `pnpm prisma:generate` after schema changes

### Port Already in Use
- Frontend: Change port in `package.json` dev script
- Backend: Set `PORT` in `.env`

### Type Errors
- Run `pnpm build` in `packages/shared-types` first
- Restart TypeScript server in your IDE

### WebSocket Connection Failed
- Verify backend is running
- Check `NEXT_PUBLIC_WS_URL` in frontend `.env.local`
- Ensure CORS is configured correctly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `pnpm lint`
5. Run tests: `pnpm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [NestJS](https://nestjs.com/)
- UI components from [ShadCN UI](https://ui.shadcn.com/)
- Workflow visualization with [React Flow](https://reactflow.dev/)
- Database ORM by [Prisma](https://www.prisma.io/)
