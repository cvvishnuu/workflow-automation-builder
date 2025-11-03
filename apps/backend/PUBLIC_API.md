# Public API Documentation

The Public API allows customer-facing websites to execute workflows (agents) using API key authentication.

## Authentication

All Public API endpoints require a Bearer token (API key) in the Authorization header:

```bash
Authorization: Bearer YOUR_API_KEY_HERE
```

## Base URL

- **Development**: `http://localhost:3001/api/v1/public`
- **Production**: `https://your-domain.com/api/v1/public`

## Endpoints

### 1. Execute Agent

Execute a workflow agent with input data.

**Endpoint**: `POST /agents/:workflowId/execute`

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body**:
```json
{
  "input": {
    "csvData": [
      {
        "customerId": "CUST001",
        "name": "John Doe",
        "phone": "+918610560986",
        "email": "john@example.com",
        "city": "Mumbai",
        "income_bracket": "75000-100000",
        "age": "32",
        "credit_score": "750"
      }
    ]
  },
  "description": "Optional description for this execution"
}
```

**Response** (202 Accepted):
```json
{
  "executionId": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "status": "pending",
  "startedAt": "2025-10-23T14:30:45.067Z",
  "message": "Execution started successfully"
}
```

**Notes**:
- CSV data is automatically truncated to 100 rows maximum
- Execution runs asynchronously
- Use the `executionId` to check status

---

### 2. Get Execution Status

Check the current status of an execution.

**Endpoint**: `GET /executions/:id/status`

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
```

**Response** (200 OK):
```json
{
  "id": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "status": "running",
  "startedAt": "2025-10-23T14:30:45.067Z",
  "completedAt": null,
  "error": null,
  "approvalStatus": null
}
```

**Status Values**:
- `pending` - Execution queued but not started
- `running` - Currently executing
- `completed` - Successfully finished
- `failed` - Execution failed
- `cancelled` - Execution was cancelled
- `pending_approval` - Waiting for manual approval

---

### 3. Get Execution Results

Retrieve the output/results of a completed execution.

**Endpoint**: `GET /executions/:id/results`

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
```

**Response** (200 OK):
```json
{
  "id": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "status": "completed",
  "output": {
    "successCount": 3,
    "failedCount": 0,
    "results": [
      {
        "customerId": "CUST001",
        "status": "sent",
        "messageId": "whatsapp_msg_123"
      }
    ]
  },
  "error": null,
  "startedAt": "2025-10-23T14:30:45.067Z",
  "completedAt": "2025-10-23T14:32:10.234Z"
}
```

---

### 4. Get Pending Approval Data

Retrieve data that requires manual approval review.

**Endpoint**: `GET /executions/:id/pending-approval`

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
```

**Response** (200 OK):
```json
{
  "id": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "workflowId": "workflow_bfsi_marketing_template",
  "status": "pending_approval",
  "approvalData": {
    "rows": [
      {
        "customerId": "CUST001",
        "name": "John Doe",
        "phone": "+918610560986",
        "generated_content": "Dear John, special offer...",
        "compliance_status": "passed"
      }
    ],
    "metadata": {
      "totalRows": 3,
      "title": "Review Generated WhatsApp Messages",
      "description": "Please review the AI-generated content",
      "allowBulkApproval": true,
      "requireComment": false
    },
    "displayFields": ["customerId", "name", "phone", "generated_content", "compliance_status"]
  },
  "startedAt": "2025-10-23T14:30:45.067Z"
}
```

---

### 5. Approve Execution

Approve content and resume execution.

**Endpoint**: `POST /executions/:id/approve`

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body**:
```json
{
  "comment": "Content approved, looks good"
}
```

**Response** (200 OK):
```json
{
  "executionId": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "status": "approved",
  "message": "Execution approved and will continue"
}
```

---

### 6. Reject Execution

Reject content and stop execution.

**Endpoint**: `POST /executions/:id/reject`

**Headers**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body**:
```json
{
  "comment": "Content does not meet standards"
}
```

**Response** (200 OK):
```json
{
  "executionId": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "status": "rejected",
  "message": "Execution rejected and stopped"
}
```

---

## Error Responses

### 401 Unauthorized
Missing or invalid API key:
```json
{
  "message": "Invalid API key",
  "error": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden
API key issues:
```json
{
  "message": "API key usage limit exceeded",
  "error": "Forbidden",
  "statusCode": 403
}
```

Possible reasons:
- API key is inactive
- API key has expired
- Usage limit exceeded
- Workflow is inactive

### 404 Not Found
Resource not found:
```json
{
  "message": "Execution not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Rate Limits

All Public API endpoints are rate-limited to prevent abuse and ensure fair usage.

### Rate Limit Configuration

- **Burst Capacity**: 10 requests
- **Refill Rate**: 1 request per second (60 requests per minute)
- **Monthly Limit**: 1000 executions per API key (tracked in database)

### Rate Limit Algorithm

The API uses a **Token Bucket** algorithm:
- You start with 10 tokens (burst capacity)
- Each request consumes 1 token
- Tokens refill at 1 per second
- Maximum tokens is capped at 10

This allows for:
- **Burst traffic**: Up to 10 rapid requests
- **Sustained traffic**: 60 requests per minute
- **Fairness**: Prevents one client from monopolizing resources

### Rate Limit Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 10          # Maximum burst capacity
X-RateLimit-Remaining: 9        # Tokens remaining
X-RateLimit-Reset: 1761233380176  # Unix timestamp when limit resets
```

### 429 Too Many Requests

When rate limit is exceeded:

**Response**:
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests",
  "retryAfter": 5
}
```

**Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1761233385000
Retry-After: 5
```

### Best Practices for Rate Limiting

1. **Check Rate Limit Headers**: Monitor `X-RateLimit-Remaining` to avoid hitting limits
2. **Implement Exponential Backoff**: Wait before retrying after 429 errors
3. **Respect Retry-After**: Use the `Retry-After` header to know when to retry
4. **Cache Results**: Cache execution status locally to reduce API calls
5. **Use Webhooks**: When implemented, use webhooks instead of polling

### Example: Handling Rate Limits

```javascript
async function makeRequestWithRateLimit(url, options) {
  const response = await fetch(url, options);

  // Check rate limit headers
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
  const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '10');

  console.log(`Rate limit: ${remaining}/${limit} remaining`);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    console.log(`Rate limited. Retrying after ${retryAfter} seconds`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeRequestWithRateLimit(url, options);
  }

  return response;
}
```

---

## Webhooks

Webhooks allow you to receive real-time notifications when execution status changes, eliminating the need for polling. When configured, the platform will send HTTP POST requests to your specified webhook URL.

### Webhook Events

The following events trigger webhook notifications:

- `execution.started` - Execution has started
- `execution.completed` - Execution completed successfully
- `execution.failed` - Execution failed with an error
- `execution.pending_approval` - Execution is waiting for manual approval

### Webhook Configuration

Configure webhooks when creating your API key using the backend script or database:

```typescript
{
  webhookUrl: "https://your-domain.com/webhooks/workflow-execution",
  webhookEvents: [
    "execution.started",
    "execution.completed",
    "execution.failed",
    "execution.pending_approval"
  ],
  webhookSecret: "your-webhook-secret-key"  // Optional but recommended
}
```

### Webhook Payload Structure

All webhook requests follow this structure:

```json
{
  "event": "execution.completed",
  "executionId": "16cf01cc-e0b6-49a6-bb8e-5b23475a0957",
  "workflowId": "workflow_bfsi_marketing_template",
  "timestamp": "2025-10-23T14:32:10.234Z",
  "data": {
    "status": "completed",
    "startedAt": "2025-10-23T14:30:45.067Z",
    "completedAt": "2025-10-23T14:32:10.234Z",
    "output": {
      "successCount": 3,
      "failedCount": 0
    }
  }
}
```

### Webhook Headers

Every webhook request includes these headers:

```
Content-Type: application/json
User-Agent: Workflow-Automation-Platform/1.0
X-Webhook-Event: execution.completed
X-Webhook-Execution-Id: 16cf01cc-e0b6-49a6-bb8e-5b23475a0957
X-Webhook-Signature: sha256=<hmac-signature>
```

### Webhook Signature Verification

For security, webhooks include an HMAC-SHA256 signature in the `X-Webhook-Signature` header. Always verify this signature before processing webhook data.

**Example verification (Node.js)**:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js middleware example
app.post('/webhooks/workflow-execution', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body.toString('utf8');

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const data = JSON.parse(payload);

  // Process webhook...
  console.log('Webhook received:', data.event, data.executionId);

  res.status(200).send('OK');
});
```

### Webhook Retry Logic

If your webhook endpoint returns a non-2xx status code or fails to respond, the platform will retry:

- **Retry Attempts**: 3 times
- **Retry Delays**: 1 second, 5 seconds, 15 seconds
- **Timeout**: 10 seconds per request

Ensure your webhook endpoint:
1. Responds quickly (within 10 seconds)
2. Returns a 2xx status code to confirm receipt
3. Processes webhook data asynchronously if needed

### Best Practices for Webhooks

1. **Verify Signatures**: Always validate the `X-Webhook-Signature` header
2. **Idempotency**: Handle duplicate webhook deliveries gracefully using `executionId`
3. **Quick Response**: Return 200 OK immediately, process data asynchronously
4. **Error Handling**: Log failed webhooks for manual review
5. **HTTPS Only**: Use HTTPS endpoints in production
6. **IP Whitelisting**: Consider whitelisting the platform's IP addresses

### Example Webhook Handler

Complete example with signature verification, idempotency, and async processing:

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
const processedExecutions = new Set();  // Simple in-memory cache

app.post(
  '/webhooks/workflow-execution',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // 1. Verify signature
      const signature = req.headers['x-webhook-signature'];
      const payload = req.body.toString('utf8');

      if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
        return res.status(401).send('Invalid signature');
      }

      // 2. Parse payload
      const webhook = JSON.parse(payload);

      // 3. Check idempotency
      const idempotencyKey = `${webhook.executionId}-${webhook.event}`;
      if (processedExecutions.has(idempotencyKey)) {
        console.log('Duplicate webhook ignored:', idempotencyKey);
        return res.status(200).send('OK');
      }

      // 4. Return 200 immediately
      res.status(200).send('OK');

      // 5. Process asynchronously
      processWebhookAsync(webhook)
        .then(() => {
          processedExecutions.add(idempotencyKey);
          console.log('Webhook processed:', webhook.event, webhook.executionId);
        })
        .catch((error) => {
          console.error('Webhook processing failed:', error);
        });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  }
);

async function processWebhookAsync(webhook) {
  switch (webhook.event) {
    case 'execution.started':
      // Update UI to show "In Progress"
      await updateExecutionStatus(webhook.executionId, 'running');
      break;

    case 'execution.completed':
      // Update UI to show results
      await updateExecutionStatus(webhook.executionId, 'completed');
      await saveExecutionResults(webhook.executionId, webhook.data.output);
      break;

    case 'execution.failed':
      // Show error notification
      await updateExecutionStatus(webhook.executionId, 'failed');
      await notifyUser(webhook.data.error);
      break;

    case 'execution.pending_approval':
      // Show approval UI
      await showApprovalDialog(webhook.executionId);
      break;
  }
}

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Best Practices

### 1. Polling for Status
Wait at least 5 seconds between status checks (or use webhooks to avoid polling):

```javascript
async function pollExecutionStatus(executionId, apiKey) {
  const maxAttempts = 60; // 5 minutes timeout
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(
      `http://localhost:3001/api/v1/public/executions/${executionId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const data = await response.json();

    if (data.status === 'completed' || data.status === 'failed') {
      return data;
    }

    if (data.status === 'pending_approval') {
      // Handle approval workflow
      return data;
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;
  }

  throw new Error('Execution timeout');
}
```

### 2. Error Handling
Always handle errors gracefully:

```javascript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.message);
    // Handle specific error codes
    if (response.status === 403) {
      // Check usage limits, renew API key, etc.
    }
  }

  return await response.json();
} catch (error) {
  console.error('Network Error:', error);
  // Implement retry logic
}
```

### 3. CSV Data Format
Ensure CSV data matches the expected format:

```javascript
const input = {
  csvData: [
    {
      customerId: "CUST001",
      name: "Customer Name",
      phone: "+918610560986",
      email: "customer@example.com",
      // ... other required fields
    }
  ]
};

// CSV data is automatically truncated to 100 rows
if (input.csvData.length > 100) {
  console.warn('CSV data will be truncated to 100 rows');
}
```

---

## Complete Example

```javascript
// 1. Execute agent
const executeResponse = await fetch(
  'http://localhost:3001/api/v1/public/agents/workflow_bfsi_marketing_template/execute',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: {
        csvData: [
          {
            customerId: "CUST001",
            name: "John Doe",
            phone: "+918610560986",
            email: "john@example.com",
            city: "Mumbai",
            income_bracket: "75000-100000",
            age: "32",
            credit_score: "750"
          }
        ]
      },
      description: "Marketing campaign execution"
    })
  }
);

const { executionId } = await executeResponse.json();
console.log('Execution started:', executionId);

// 2. Poll for status
let status = 'pending';
while (status === 'pending' || status === 'running') {
  await new Promise(resolve => setTimeout(resolve, 5000));

  const statusResponse = await fetch(
    `http://localhost:3001/api/v1/public/executions/${executionId}/status`,
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  );

  const statusData = await statusResponse.json();
  status = statusData.status;
  console.log('Current status:', status);

  if (status === 'pending_approval') {
    // Handle approval workflow
    console.log('Execution requires approval');
    break;
  }
}

// 3. Get results (if completed)
if (status === 'completed') {
  const resultsResponse = await fetch(
    `http://localhost:3001/api/v1/public/executions/${executionId}/results`,
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  );

  const results = await resultsResponse.json();
  console.log('Execution results:', results.output);
}
```

---

## API Key Management

### Creating API Keys

Use the backend script to generate API keys:

```bash
cd apps/backend
npx ts-node scripts/create-api-key.ts
```

This will generate:
- A random 64-character hexadecimal API key
- A hashed version stored in the database
- Display the API key (save it - it won't be shown again)

### Security Notes

- **Never commit API keys to version control**
- Store API keys securely (use environment variables)
- Rotate API keys regularly
- Monitor usage and set appropriate limits
- Use HTTPS in production

---

## Support

For issues or questions:
- Check the main documentation: `/CLAUDE.md`
- Review workflow definitions in Prisma Studio
- Check backend logs for detailed error messages
