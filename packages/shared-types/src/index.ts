/**
 * Shared TypeScript types and interfaces for the Workflow Automation Platform
 * Used by both frontend and backend applications
 */

// ============================================================================
// Node Types and Definitions
// ============================================================================

/**
 * Available node types in the workflow system
 * Each node type represents a different action or operation
 */
export enum NodeType {
  TRIGGER = 'trigger',
  HTTP_REQUEST = 'http_request',
  DATA_TRANSFORM = 'data_transform',
  CONDITIONAL = 'conditional',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  EMAIL = 'email',
  GOOGLE_CALENDAR = 'google_calendar',
  WHATSAPP = 'whatsapp',
  MANUAL_APPROVAL = 'manual_approval',
  // BFSI-specific nodes
  CSV_UPLOAD = 'csv_upload',
  AI_CONTENT_GENERATOR = 'ai_content_generator',
  COMPLIANCE_CHECKER = 'compliance_checker',
  COMPLIANCE_REPORT = 'compliance_report',
}

/**
 * HTTP methods supported by HTTP Request nodes
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * Base interface for all node configurations
 * Each node type extends this with specific configuration
 */
export interface BaseNodeConfig {
  nodeId: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
}

/**
 * Configuration for HTTP Request nodes
 */
export interface HttpRequestNodeConfig extends BaseNodeConfig {
  type: NodeType.HTTP_REQUEST;
  config: {
    url: string;
    method: HttpMethod;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number; // in milliseconds
  };
}

/**
 * Configuration for Data Transform nodes
 * Uses JavaScript expressions to transform data
 */
export interface DataTransformNodeConfig extends BaseNodeConfig {
  type: NodeType.DATA_TRANSFORM;
  config: {
    transformScript: string; // JavaScript code to transform data
    inputMapping?: Record<string, string>;
  };
}

/**
 * Configuration for Conditional nodes
 * Evaluates a condition and routes to different paths
 */
export interface ConditionalNodeConfig extends BaseNodeConfig {
  type: NodeType.CONDITIONAL;
  config: {
    condition: string; // JavaScript expression that returns boolean
    trueOutputId?: string;
    falseOutputId?: string;
  };
}

/**
 * Configuration for Delay nodes
 * Pauses execution for a specified duration
 */
export interface DelayNodeConfig extends BaseNodeConfig {
  type: NodeType.DELAY;
  config: {
    delayMs: number;
  };
}

/**
 * Configuration for Trigger nodes
 * Represents the starting point of a workflow
 */
export interface TriggerNodeConfig extends BaseNodeConfig {
  type: NodeType.TRIGGER;
  config: {
    triggerType: 'manual' | 'scheduled' | 'webhook';
    schedule?: string; // Cron expression for scheduled triggers
  };
}

/**
 * Configuration for Webhook nodes
 * Receives external HTTP requests
 */
export interface WebhookNodeConfig extends BaseNodeConfig {
  type: NodeType.WEBHOOK;
  config: {
    webhookId: string;
    method: HttpMethod;
  };
}

/**
 * Configuration for Email nodes
 * Sends emails via SendGrid
 */
export interface EmailNodeConfig extends BaseNodeConfig {
  type: NodeType.EMAIL;
  config: {
    credentialId: string; // Reference to stored SendGrid credentials
    to: string; // Email recipient(s) - comma separated or variable
    subject: string; // Email subject - supports variables
    body: string; // Email body (HTML or plain text) - supports variables
    from?: string; // Override default sender email
    fromName?: string; // Override default sender name
    attachments?: Array<{
      filename: string;
      content: string; // Base64 encoded
    }>;
  };
}

/**
 * Configuration for Google Calendar nodes
 * Creates calendar events with Google Meet
 */
export interface GoogleCalendarNodeConfig extends BaseNodeConfig {
  type: NodeType.GOOGLE_CALENDAR;
  config: {
    credentialId: string; // Reference to stored OAuth credentials
    summary: string; // Event title - supports variables
    description?: string; // Event description - supports variables
    startTime: string; // ISO 8601 date-time or variable
    endTime: string; // ISO 8601 date-time or variable
    attendees: string; // Comma-separated email addresses or variable
    createMeet?: boolean; // Auto-generate Google Meet link
    timezone?: string; // IANA timezone (default: UTC)
  };
}

/**
 * Configuration for WhatsApp nodes
 * Sends WhatsApp messages via Twilio
 */
export interface WhatsAppNodeConfig extends BaseNodeConfig {
  type: NodeType.WHATSAPP;
  config: {
    credentialId: string; // Reference to stored Twilio credentials
    to: string; // Recipient phone number (E.164 format) or variable
    message: string; // Message content - supports variables
    mediaUrl?: string; // Optional media attachment URL
  };
}

/**
 * Configuration for Manual Approval nodes
 * Pauses workflow execution for human review
 */
export interface ManualApprovalNodeConfig extends BaseNodeConfig {
  type: NodeType.MANUAL_APPROVAL;
  config: {
    title?: string; // Title for the approval request
    description?: string; // Description/instructions for reviewer
    dataFields?: string[]; // Which fields from input to show for review
    requireComment?: boolean; // Require comment when approving/rejecting
    allowBulkApproval?: boolean; // Allow approving all items at once
    approvalRoles?: string[]; // Which user roles can approve (optional)
  };
}

/**
 * Configuration for CSV Upload nodes
 * Handles CSV file upload with encryption and PII anonymization
 */
export interface CSVUploadNodeConfig extends BaseNodeConfig {
  type: NodeType.CSV_UPLOAD;
  config: {
    fileUploadId?: string; // ID of uploaded file (set at runtime)
    anonymizeData?: boolean; // Whether to anonymize PII
    detectEmail?: boolean; // Detect and anonymize emails
    detectPhone?: boolean; // Detect and anonymize phone numbers
    detectPAN?: boolean; // Detect and anonymize PAN cards
    detectAadhaar?: boolean; // Detect and anonymize Aadhaar numbers
    detectName?: boolean; // Detect and anonymize names
    customFields?: string[]; // Custom fields to anonymize
    batchSize?: number; // Process rows in batches (default: 100)
  };
}

/**
 * Configuration for AI Content Generator nodes
 * Generates marketing content using OpenAI/Claude
 */
export interface AIContentGeneratorNodeConfig extends BaseNodeConfig {
  type: NodeType.AI_CONTENT_GENERATOR;
  config: {
    contentType: 'email' | 'sms' | 'whatsapp' | 'social' | 'custom';
    purpose: string; // e.g., "promotional", "transactional", "reminder"
    targetAudience: string; // e.g., "savings account holders"
    keyPoints: string; // Main points to include (can use newlines for multiple points)
    tone: 'professional' | 'friendly' | 'formal' | 'casual';
    maxLength?: number; // Character limit
    variableFields?: string[]; // CSV columns to use as variables (e.g., ["customer_name", "account_number"])
    contextTemplate?: string; // Optional context template
  };
}

/**
 * Configuration for Compliance Checker nodes
 * Validates content against BFSI regulations
 */
export interface ComplianceCheckerNodeConfig extends BaseNodeConfig {
  type: NodeType.COMPLIANCE_CHECKER;
  config: {
    contentField: string; // Field name containing content to check (e.g., "generated_content")
    contentType: 'email' | 'sms' | 'whatsapp' | 'social';
    productCategory?: 'banking' | 'investment' | 'insurance' | 'loan' | 'credit-card' | 'general';
    failOnViolation?: boolean; // Stop workflow on compliance failure (default: false)
    minimumScore?: number; // Minimum score to pass (0-100, default: 50)
    minPassingScore?: number; // Alias for minimumScore (deprecated)
    saveToAudit?: boolean; // Save to compliance audit trail (default: true)
  };
}

/**
 * Configuration for Compliance Report nodes
 * Generates compliance reports for a workflow execution
 */
export interface ComplianceReportNodeConfig extends BaseNodeConfig {
  type: NodeType.COMPLIANCE_REPORT;
  config: {
    reportFormat: 'json' | 'html' | 'pdf' | 'csv';
    includeFailedOnly?: boolean; // Only include failed checks
    includeSuggestions?: boolean; // Include improvement suggestions
    includeStatistics?: boolean; // Include summary statistics
    includeViolations?: boolean; // Include violation details
    groupBy?: 'execution' | 'customer' | 'violation_type'; // How to group the report
    dateRange?: {
      startDate?: string; // ISO date string
      endDate?: string; // ISO date string
    };
    outputPath?: string; // Optional output path for file
  };
}

/**
 * Union type of all possible node configurations
 */
export type NodeConfig =
  | TriggerNodeConfig
  | HttpRequestNodeConfig
  | DataTransformNodeConfig
  | ConditionalNodeConfig
  | DelayNodeConfig
  | WebhookNodeConfig
  | EmailNodeConfig
  | GoogleCalendarNodeConfig
  | WhatsAppNodeConfig
  | ManualApprovalNodeConfig
  | CSVUploadNodeConfig
  | AIContentGeneratorNodeConfig
  | ComplianceCheckerNodeConfig
  | ComplianceReportNodeConfig;

/**
 * Represents an edge (connection) between two nodes
 */
export interface WorkflowEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  sourceHandle?: string; // For conditional nodes (true/false outputs)
  targetHandle?: string;
}

// ============================================================================
// Workflow Definition and Execution
// ============================================================================

/**
 * Complete workflow definition
 * Contains all nodes, edges, and metadata
 */
export interface WorkflowDefinition {
  nodes: NodeConfig[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>; // Global workflow variables
}

/**
 * Workflow execution status
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PENDING_APPROVAL = 'pending_approval',
}

/**
 * Status of individual node execution
 */
export interface NodeExecutionStatus {
  nodeId: string;
  status: ExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

/**
 * Complete execution result for a workflow
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  input?: unknown;
  output?: unknown;
  error?: string;
  nodeExecutions: NodeExecutionStatus[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a new workflow
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
}

/**
 * Request to update an existing workflow
 */
export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  isActive?: boolean;
}

/**
 * Workflow entity (as stored in database)
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to execute a workflow
 */
export interface ExecuteWorkflowRequest {
  workflowId: string;
  input?: unknown;
}

/**
 * Response with paginated results
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

/**
 * WebSocket event types for real-time updates
 */
export enum WebSocketEvent {
  EXECUTION_STARTED = 'execution:started',
  EXECUTION_UPDATED = 'execution:updated',
  EXECUTION_COMPLETED = 'execution:completed',
  EXECUTION_FAILED = 'execution:failed',
  NODE_STARTED = 'node:started',
  NODE_COMPLETED = 'node:completed',
  NODE_FAILED = 'node:failed',
}

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  event: WebSocketEvent;
  executionId: string;
  timestamp: Date;
  data: T;
}

/**
 * Message when a node starts executing
 */
export interface NodeStartedMessage extends WebSocketMessage<{ nodeId: string }> {
  event: WebSocketEvent.NODE_STARTED;
}

/**
 * Message when a node completes
 */
export interface NodeCompletedMessage
  extends WebSocketMessage<{ nodeId: string; output: unknown }> {
  event: WebSocketEvent.NODE_COMPLETED;
}

/**
 * Message when a node fails
 */
export interface NodeFailedMessage extends WebSocketMessage<{ nodeId: string; error: string }> {
  event: WebSocketEvent.NODE_FAILED;
}

/**
 * Message when execution completes
 */
export interface ExecutionCompletedMessage extends WebSocketMessage<{ output: unknown }> {
  event: WebSocketEvent.EXECUTION_COMPLETED;
}

/**
 * Union type of all WebSocket messages
 */
export type WebSocketEventMessage =
  | NodeStartedMessage
  | NodeCompletedMessage
  | NodeFailedMessage
  | ExecutionCompletedMessage
  | WebSocketMessage;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: Date;
  path?: string;
}
