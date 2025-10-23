# Architecture Documentation

## Overview

This document describes the architectural decisions and patterns used in the Workflow Automation Platform MVP.

## Design Principles

### SOLID Principles

The entire codebase strictly follows SOLID principles:

#### 1. Single Responsibility Principle (SRP)
Every class and module has one reason to change.

**Examples:**
- `WorkflowsService`: Only handles workflow CRUD operations
- `WorkflowEngineService`: Only orchestrates workflow execution
- `WorkflowsController`: Only handles HTTP request/response mapping
- `ExecutorFactory`: Only creates and manages executor instances

#### 2. Open/Closed Principle (OCP)
Software entities should be open for extension but closed for modification.

**Implementation:**
- **Node Executors**: Add new node types by creating new executor classes without modifying existing ones
- **Executor Factory**: Register new executors at runtime
- **Strategy Pattern**: Different execution strategies for different node types

```typescript
// Adding a new node type doesn't modify existing code
export class NewNodeExecutor extends BaseNodeExecutor {
  protected async executeInternal(node, context) {
    // New implementation
  }
}

// Just register it
executorFactory.registerExecutor(NodeType.NEW, newExecutor);
```

#### 3. Liskov Substitution Principle (LSP)
Subtypes must be substitutable for their base types.

**Implementation:**
- All node executors implement `INodeExecutor` interface
- Any executor can be used interchangeably in the engine
- `BaseNodeExecutor` provides common functionality

```typescript
// Any executor can be used here
const executor: INodeExecutor = factory.getExecutor(nodeType);
const result = await executor.execute(node, context);
```

#### 4. Interface Segregation Principle (ISP)
Clients shouldn't depend on interfaces they don't use.

**Implementation:**
- `INodeExecutor`: Minimal, focused interface with only `execute()` and `validate()`
- Separate DTOs for create vs update operations
- Focused service interfaces

#### 5. Dependency Injection Principle (DIP)
Depend on abstractions, not concretions.

**Implementation:**
- NestJS built-in DI container
- Services receive dependencies through constructors
- Interfaces define contracts, not implementations

```typescript
@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService, // Abstraction
    private readonly executorFactory: ExecutorFactory // Abstraction
  ) {}
}
```

## Design Patterns

### 1. Strategy Pattern

**Used in:** Node execution engine

**Purpose:** Allow runtime selection of execution strategy based on node type

```
ExecutorFactory
    ├── TriggerNodeExecutor
    ├── HttpRequestNodeExecutor
    ├── ConditionalNodeExecutor
    ├── DataTransformNodeExecutor
    └── DelayNodeExecutor
```

**Benefits:**
- Easy to add new node types
- No if/else chains for node type checking
- Each strategy is independently testable

### 2. Factory Pattern

**Used in:** Executor creation

**Purpose:** Centralize executor instantiation and management

```typescript
export class ExecutorFactory {
  getExecutor(nodeType: NodeType): INodeExecutor {
    const executor = this.executors.get(nodeType);
    if (!executor) {
      throw new Error(`No executor found for ${nodeType}`);
    }
    return executor;
  }
}
```

**Benefits:**
- Single point of executor management
- Easy to extend with new executors
- Supports runtime registration

### 3. Template Method Pattern

**Used in:** Base node executor

**Purpose:** Define execution skeleton while allowing subclasses to customize steps

```typescript
export abstract class BaseNodeExecutor {
  async execute(node, context) {
    // 1. Validate (can be overridden)
    this.validate(node);

    // 2. Execute (must be implemented)
    const result = await this.executeInternal(node, context);

    // 3. Log and return
    return result;
  }

  protected abstract executeInternal(node, context): Promise<Result>;
}
```

**Benefits:**
- Common execution flow for all nodes
- Subclasses focus on specific logic
- Error handling in one place

### 4. Repository Pattern

**Used in:** Data access via Prisma

**Purpose:** Abstract database operations

**Implementation:**
- `PrismaService` wraps Prisma Client
- Services use PrismaService, not direct database access
- Easy to swap ORMs or databases

### 5. Observer Pattern

**Used in:** WebSocket real-time updates

**Purpose:** Notify clients of execution events

```typescript
// Server emits events
gateway.emitNodeCompleted(executionId, nodeId, output);

// Clients subscribe
socket.on('node:completed', (message) => {
  // Handle update
});
```

## Module Architecture

### Backend Modules

```
AppModule (root)
  ├── ConfigModule (global)
  ├── PrismaModule (global)
  ├── WorkflowsModule
  │   ├── WorkflowsController
  │   └── WorkflowsService
  ├── ExecutionsModule
  │   ├── ExecutionsController
  │   └── WorkflowEngineService
  ├── NodesModule
  │   ├── Node Executors
  │   └── ExecutorFactory
  └── WebSocketModule
      └── WorkflowGateway
```

**Module Responsibilities:**

- **WorkflowsModule**: Workflow CRUD operations
- **ExecutionsModule**: Workflow execution orchestration
- **NodesModule**: Node execution logic
- **WebSocketModule**: Real-time communication
- **PrismaModule**: Database access

### Frontend Architecture

```
App
  ├── Stores (Zustand)
  │   ├── WorkflowStore
  │   └── ExecutionStore
  ├── API Client (Axios)
  ├── Pages (Next.js App Router)
  │   ├── Home
  │   ├── Workflows List
  │   └── Workflow Editor
  └── Components
      ├── UI Components (ShadCN)
      └── WorkflowEditor (React Flow)
```

**Responsibilities:**

- **Stores**: Global state management
- **API Client**: Backend communication
- **Pages**: Routing and page-level logic
- **Components**: Reusable UI elements

## Data Flow

### Workflow Creation Flow

```
User → WorkflowsPage
    → WorkflowStore.createWorkflow()
    → API Client (POST /workflows)
    → WorkflowsController.create()
    → WorkflowsService.create()
    → PrismaService.workflow.create()
    → Database
```

### Workflow Execution Flow

```
User → Execute Button
    → ExecutionStore.executeWorkflow()
    → API Client (POST /executions)
    → ExecutionsController.execute()
    → WorkflowEngineService.executeWorkflow()
    → Create execution record
    → Run workflow asynchronously
        → For each node:
            → ExecutorFactory.getExecutor()
            → Executor.execute()
            → Save node execution
            → WebSocket: emit node events
        → Update execution status
        → WebSocket: emit completion event
```

### Real-time Update Flow

```
Backend Execution
    → WorkflowGateway.emitNodeCompleted()
    → Socket.IO broadcast to room
    → Frontend Socket.IO client receives
    → ExecutionStore.updateExecution()
    → UI re-renders with new state
```

## Database Schema Design

### Key Relationships

```
User (1) ──────────── (*) Workflow
Workflow (1) ──────── (*) WorkflowExecution
WorkflowExecution (1) ─ (*) NodeExecution
```

### Design Decisions

1. **Workflow Snapshot in Execution**
   - Stores workflow definition at execution time
   - Allows replaying executions even if workflow changes
   - Supports audit trail

2. **Separate NodeExecution Table**
   - Detailed logs for each node
   - Supports debugging and monitoring
   - Enables per-node execution history

3. **JSON Storage for Definitions**
   - Flexible schema for workflow definitions
   - Easy to extend with new node types
   - No migrations needed for new node properties

## Security Considerations

### Current State (MVP)

- Mock user authentication (for development)
- Basic input validation with class-validator
- CORS enabled for frontend communication

### Production Recommendations

1. **Enable Clerk Authentication**
   - JWT token validation on all endpoints
   - User context in all operations
   - Rate limiting per user

2. **Input Sanitization**
   - Validate all user inputs
   - Sanitize JavaScript expressions in transform nodes
   - Limit execution time and resources

3. **Access Control**
   - Users can only access their own workflows
   - Role-based permissions (viewer, editor, admin)
   - Audit logging for sensitive operations

4. **Network Security**
   - HTTPS in production
   - Secure WebSocket connections (WSS)
   - Environment variable management

## Performance Considerations

### Backend Optimization

1. **Async Execution**
   - Workflows execute asynchronously
   - Non-blocking API responses
   - Queue-based processing for scale

2. **Database Queries**
   - Indexed foreign keys
   - Pagination for list endpoints
   - Selective field loading

3. **Caching**
   - Cache workflow definitions (future)
   - Redis for session management (future)

### Frontend Optimization

1. **Code Splitting**
   - Next.js automatic code splitting
   - Lazy load workflow editor
   - Dynamic imports for large components

2. **State Management**
   - Zustand lightweight store
   - Minimal re-renders
   - Selective subscriptions

3. **API Calls**
   - Request deduplication
   - Optimistic updates
   - WebSocket for real-time data

## Scalability Strategy

### Horizontal Scaling

1. **Backend**
   - Stateless API servers
   - Load balancer in front
   - Shared database

2. **Execution Engine**
   - Move to queue-based (Bull/BullMQ)
   - Separate worker processes
   - Distributed execution

3. **Database**
   - Read replicas
   - Connection pooling
   - Partitioning by user

### Monitoring

1. **Logging**
   - Structured logging (JSON)
   - Centralized log aggregation
   - Log levels (debug, info, warn, error)

2. **Metrics**
   - Execution success/failure rates
   - Node execution times
   - API response times

3. **Alerting**
   - Failed executions
   - High error rates
   - Performance degradation

## Testing Strategy

### Backend Testing

1. **Unit Tests**
   - Service methods
   - Node executors
   - Business logic

2. **Integration Tests**
   - API endpoints
   - Database operations
   - WebSocket events

3. **E2E Tests**
   - Complete workflow execution
   - Error scenarios
   - Real-time updates

### Frontend Testing

1. **Component Tests**
   - UI components
   - User interactions
   - State updates

2. **Integration Tests**
   - API integration
   - Store actions
   - Page flows

## Future Enhancements

### Short-term (1-3 months)

1. **More Node Types**
   - Email node
   - Database query node
   - File operations node

2. **Scheduling**
   - Cron-based triggers
   - Recurring workflows
   - Scheduled executions

3. **Error Handling**
   - Retry logic
   - Error notifications
   - Fallback workflows

### Medium-term (3-6 months)

1. **Workflow Variables**
   - User-defined variables
   - Environment-specific configs
   - Secrets management

2. **Workflow Templates**
   - Pre-built workflows
   - Template marketplace
   - Import/export

3. **Collaboration**
   - Shared workflows
   - Comments and notes
   - Version history

### Long-term (6+ months)

1. **Advanced Features**
   - Parallel execution
   - Sub-workflows
   - Loop nodes

2. **Analytics**
   - Execution analytics
   - Performance insights
   - Cost tracking

3. **Enterprise Features**
   - SSO integration
   - Advanced permissions
   - Compliance features
