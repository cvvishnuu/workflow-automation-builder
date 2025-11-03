/**
 * Node Configuration Sidebar
 * Allows users to configure properties of selected workflow nodes
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles node configuration UI
 * - Open/Closed: Easy to extend with new node type configurations
 */

'use client';

import { useState, useEffect } from 'react';
import {
  NodeType,
  NodeConfig,
  HttpMethod,
  TriggerNodeConfig,
  HttpRequestNodeConfig,
  DataTransformNodeConfig,
  ConditionalNodeConfig,
  DelayNodeConfig,
  WebhookNodeConfig,
  EmailNodeConfig,
  GoogleCalendarNodeConfig,
  WhatsAppNodeConfig,
  CSVUploadNodeConfig,
  AIContentGeneratorNodeConfig,
  ComplianceCheckerNodeConfig,
  ComplianceReportNodeConfig,
} from '@workflow/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface NodeConfigSidebarProps {
  node: NodeConfig | null;
  onClose: () => void;
  onSave: (node: NodeConfig) => void;
}

export function NodeConfigSidebar({ node, onClose, onSave }: NodeConfigSidebarProps) {
  const [editedNode, setEditedNode] = useState<NodeConfig | null>(node);

  useEffect(() => {
    setEditedNode(node);
  }, [node]);

  if (!node || !editedNode) {
    return null;
  }

  const updateNodeField = (field: string, value: any) => {
    setEditedNode((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const updateNodeConfig = (configField: string, value: any) => {
    setEditedNode((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          [configField]: value,
        },
      } as NodeConfig;
    });
  };

  const handleSave = () => {
    if (editedNode) {
      onSave(editedNode);
      onClose();
    }
  };

  const renderConfigFields = () => {
    switch (editedNode.type) {
      case NodeType.TRIGGER: {
        const config = (editedNode as TriggerNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={config.triggerType}
                onValueChange={(value) => updateNodeConfig('triggerType', value)}
              >
                <SelectTrigger id="triggerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.triggerType === 'scheduled' && (
              <div className="space-y-2">
                <Label htmlFor="schedule">Cron Schedule</Label>
                <Input
                  id="schedule"
                  placeholder="0 0 * * *"
                  value={config.schedule || ''}
                  onChange={(e) => updateNodeConfig('schedule', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a cron expression (e.g., "0 0 * * *" for daily at midnight)
                </p>
              </div>
            )}
          </>
        );
      }

      case NodeType.HTTP_REQUEST: {
        const config = (editedNode as HttpRequestNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://api.example.com/endpoint"
                value={config.url || ''}
                onChange={(e) => updateNodeConfig('url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={config.method}
                onValueChange={(value) => updateNodeConfig('method', value)}
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(HttpMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Request Body (JSON)</Label>
              <Textarea
                id="body"
                placeholder='{"key": "value"}'
                value={config.body || ''}
                onChange={(e) => updateNodeConfig('body', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                placeholder="5000"
                value={config.timeout || ''}
                onChange={(e) => updateNodeConfig('timeout', parseInt(e.target.value))}
              />
            </div>
          </>
        );
      }

      case NodeType.DATA_TRANSFORM: {
        const config = (editedNode as DataTransformNodeConfig).config;
        return (
          <div className="space-y-2">
            <Label htmlFor="transformScript">Transform Script (JavaScript)</Label>
            <Textarea
              id="transformScript"
              placeholder="// Transform input data&#10;return { result: input.value * 2 };"
              value={config.transformScript || ''}
              onChange={(e) => updateNodeConfig('transformScript', e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Write JavaScript code to transform data. Input is available as "input" variable.
            </p>
          </div>
        );
      }

      case NodeType.CONDITIONAL: {
        const config = (editedNode as ConditionalNodeConfig).config;
        return (
          <div className="space-y-2">
            <Label htmlFor="condition">Condition (JavaScript Expression)</Label>
            <Textarea
              id="condition"
              placeholder="input.value > 100"
              value={config.condition || ''}
              onChange={(e) => updateNodeConfig('condition', e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Write a JavaScript expression that returns true or false.
            </p>
          </div>
        );
      }

      case NodeType.DELAY: {
        const config = (editedNode as DelayNodeConfig).config;
        return (
          <div className="space-y-2">
            <Label htmlFor="delayMs">Delay (milliseconds)</Label>
            <Input
              id="delayMs"
              type="number"
              placeholder="1000"
              value={config.delayMs || ''}
              onChange={(e) => updateNodeConfig('delayMs', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {config.delayMs ? `${(config.delayMs / 1000).toFixed(1)} seconds` : 'Enter delay in milliseconds'}
            </p>
          </div>
        );
      }

      case NodeType.WEBHOOK: {
        const config = (editedNode as WebhookNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="webhookId">Webhook ID</Label>
              <Input
                id="webhookId"
                placeholder="my-webhook"
                value={config.webhookId || ''}
                onChange={(e) => updateNodeConfig('webhookId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookMethod">HTTP Method</Label>
              <Select
                value={config.method}
                onValueChange={(value) => updateNodeConfig('method', value)}
              >
                <SelectTrigger id="webhookMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(HttpMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }

      case NodeType.EMAIL: {
        const config = (editedNode as EmailNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <Input
                id="credentialId"
                placeholder="your-sendgrid-credential-id"
                value={config.credentialId || ''}
                onChange={(e) => updateNodeConfig('credentialId', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reference to stored SendGrid credentials
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To (Recipients)</Label>
              <Input
                id="to"
                placeholder="recipient@example.com"
                value={config.to || ''}
                onChange={(e) => updateNodeConfig('to', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated email addresses or variable (e.g., {'{{input.email}}'}))
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Meeting Scheduled"
                value={config.subject || ''}
                onChange={(e) => updateNodeConfig('subject', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Email Body (HTML)</Label>
              <Textarea
                id="body"
                placeholder="<h1>Hello!</h1><p>Your meeting has been scheduled.</p>"
                value={config.body || ''}
                onChange={(e) => updateNodeConfig('body', e.target.value)}
                rows={6}
              />
            </div>
          </>
        );
      }

      case NodeType.GOOGLE_CALENDAR: {
        const config = (editedNode as GoogleCalendarNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <Input
                id="credentialId"
                placeholder="your-google-oauth-credential-id"
                value={config.credentialId || ''}
                onChange={(e) => updateNodeConfig('credentialId', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reference to stored Google OAuth credentials
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Event Title</Label>
              <Input
                id="summary"
                placeholder="Team Meeting"
                value={config.summary || ''}
                onChange={(e) => updateNodeConfig('summary', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Discuss Q1 planning"
                value={config.description || ''}
                onChange={(e) => updateNodeConfig('description', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time (ISO 8601)</Label>
              <Input
                id="startTime"
                placeholder="2025-10-15T10:00:00Z"
                value={config.startTime || ''}
                onChange={(e) => updateNodeConfig('startTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time (ISO 8601)</Label>
              <Input
                id="endTime"
                placeholder="2025-10-15T11:00:00Z"
                value={config.endTime || ''}
                onChange={(e) => updateNodeConfig('endTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendees">Attendees</Label>
              <Input
                id="attendees"
                placeholder="user1@example.com, user2@example.com"
                value={config.attendees || ''}
                onChange={(e) => updateNodeConfig('attendees', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated email addresses
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createMeet">Create Google Meet Link</Label>
              <Select
                value={config.createMeet ? 'true' : 'false'}
                onValueChange={(value) => updateNodeConfig('createMeet', value === 'true')}
              >
                <SelectTrigger id="createMeet">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }

      case NodeType.WHATSAPP: {
        const config = (editedNode as WhatsAppNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="credentialId">Credential ID</Label>
              <Input
                id="credentialId"
                placeholder="your-twilio-credential-id"
                value={config.credentialId || ''}
                onChange={(e) => updateNodeConfig('credentialId', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reference to stored Twilio WhatsApp credentials
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To (Phone Number)</Label>
              <Input
                id="to"
                placeholder="+1234567890"
                value={config.to || ''}
                onChange={(e) => updateNodeConfig('to', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                E.164 format (e.g., +1234567890) or variable
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Your meeting has been scheduled!"
                value={config.message || ''}
                onChange={(e) => updateNodeConfig('message', e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">Media URL (Optional)</Label>
              <Input
                id="mediaUrl"
                placeholder="https://example.com/image.jpg"
                value={config.mediaUrl || ''}
                onChange={(e) => updateNodeConfig('mediaUrl', e.target.value)}
              />
            </div>
          </>
        );
      }

      case NodeType.CSV_UPLOAD: {
        const config = (editedNode as CSVUploadNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="fileUploadId">File Upload ID</Label>
              <Input
                id="fileUploadId"
                placeholder="file_123abc"
                value={config.fileUploadId || ''}
                onChange={(e) => updateNodeConfig('fileUploadId', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ID of the uploaded CSV file from /api/v1/bfsi/files/upload
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anonymizeData">Anonymize PII</Label>
              <Select
                value={config.anonymizeData ? 'true' : 'false'}
                onValueChange={(value) => updateNodeConfig('anonymizeData', value === 'true')}
              >
                <SelectTrigger id="anonymizeData">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Detect and mask PII</SelectItem>
                  <SelectItem value="false">No - Keep data as-is</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automatically detects email, phone, PAN, Aadhaar, and names
              </p>
            </div>
          </>
        );
      }

      case NodeType.AI_CONTENT_GENERATOR: {
        const config = (editedNode as AIContentGeneratorNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select
                value={config.contentType}
                onValueChange={(value) => updateNodeConfig('contentType', value)}
              >
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="notification">Push Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="Marketing campaign for new credit card"
                value={config.purpose || ''}
                onChange={(e) => updateNodeConfig('purpose', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Describe the marketing campaign purpose
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Input
                id="targetAudience"
                placeholder="High-income professionals aged 30-45"
                value={config.targetAudience || ''}
                onChange={(e) => updateNodeConfig('targetAudience', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyPoints">Key Points</Label>
              <Textarea
                id="keyPoints"
                placeholder="- 0% APR for first 12 months&#10;- 5% cashback on dining&#10;- No annual fee"
                value={config.keyPoints || ''}
                onChange={(e) => updateNodeConfig('keyPoints', e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Enter key selling points (one per line)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={config.tone || 'professional'}
                onValueChange={(value) => updateNodeConfig('tone', value)}
              >
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }

      case NodeType.COMPLIANCE_CHECKER: {
        const config = (editedNode as ComplianceCheckerNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="contentField">Content Field</Label>
              <Input
                id="contentField"
                placeholder="generatedContent"
                value={config.contentField || ''}
                onChange={(e) => updateNodeConfig('contentField', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Field name containing the content to validate (from previous node)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select
                value={config.contentType}
                onValueChange={(value) => updateNodeConfig('contentType', value)}
              >
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="notification">Push Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="productCategory">Product Category</Label>
              <Select
                value={config.productCategory}
                onValueChange={(value) => updateNodeConfig('productCategory', value)}
              >
                <SelectTrigger id="productCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit-card">Credit Card</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="general">General Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumScore">Minimum Compliance Score</Label>
              <Input
                id="minimumScore"
                type="number"
                placeholder="80"
                value={config.minimumScore || 80}
                onChange={(e) => updateNodeConfig('minimumScore', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Reject content with compliance score below this threshold (0-100)
              </p>
            </div>
          </>
        );
      }

      case NodeType.COMPLIANCE_REPORT: {
        const config = (editedNode as ComplianceReportNodeConfig).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="reportFormat">Report Format</Label>
              <Select
                value={config.reportFormat}
                onValueChange={(value) => updateNodeConfig('reportFormat', value)}
              >
                <SelectTrigger id="reportFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="includeStatistics">Include Statistics</Label>
              <Select
                value={config.includeStatistics ? 'true' : 'false'}
                onValueChange={(value) => updateNodeConfig('includeStatistics', value === 'true')}
              >
                <SelectTrigger id="includeStatistics">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Include aggregate statistics (total checks, pass rate, avg score)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="includeViolations">Include Violations</Label>
              <Select
                value={config.includeViolations ? 'true' : 'false'}
                onValueChange={(value) => updateNodeConfig('includeViolations', value === 'true')}
              >
                <SelectTrigger id="includeViolations">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Show all flagged content</SelectItem>
                  <SelectItem value="false">No - Summary only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupBy">Group By</Label>
              <Select
                value={config.groupBy || 'execution'}
                onValueChange={(value) => updateNodeConfig('groupBy', value)}
              >
                <SelectTrigger id="groupBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="execution">Execution</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="contentType">Content Type</SelectItem>
                  <SelectItem value="productCategory">Product Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }

      case NodeType.MANUAL_APPROVAL: {
        const config = (editedNode as any).config;
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Review Generated WhatsApp Messages"
                value={config.title || ''}
                onChange={(e) => updateNodeConfig('title', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Title shown on the approval page
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please review the AI-generated content before sending..."
                value={config.description || ''}
                onChange={(e) => updateNodeConfig('description', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requireComment">Require Comment</Label>
              <Select
                value={config.requireComment ? 'true' : 'false'}
                onValueChange={(value) => updateNodeConfig('requireComment', value === 'true')}
              >
                <SelectTrigger id="requireComment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Comment required</SelectItem>
                  <SelectItem value="false">No - Comment optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowBulkApproval">Allow Bulk Approval</Label>
              <Select
                value={config.allowBulkApproval ? 'true' : 'false'}
                onValueChange={(value) => updateNodeConfig('allowBulkApproval', value === 'true')}
              >
                <SelectTrigger id="allowBulkApproval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Allow approving all items at once</SelectItem>
                  <SelectItem value="false">No - Review items individually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }

      default:
        return <p className="text-sm text-muted-foreground">No configuration available for this node type.</p>;
    }
  };

  return (
    <div className="w-96 border-l bg-background p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Configure Node</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Node Label */}
      <div className="space-y-2">
        <Label htmlFor="nodeLabel">Node Label</Label>
        <Input
          id="nodeLabel"
          value={editedNode.label}
          onChange={(e) => updateNodeField('label', e.target.value)}
        />
      </div>

      {/* Node Type Display */}
      <div className="space-y-2">
        <Label>Node Type</Label>
        <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
          {editedNode.type}
        </div>
      </div>

      {/* Configuration Fields */}
      <div className="space-y-4">{renderConfigFields()}</div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
