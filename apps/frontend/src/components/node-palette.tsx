/**
 * Node Palette Component
 * Displays available node types for drag-and-drop into the workflow editor
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles node palette display and drag initiation
 * - Open/Closed: Easy to extend with new node types
 */

'use client';

import { NodeType } from '@workflow/shared-types';
import {
  Zap,
  Globe,
  Code,
  GitBranch,
  Clock,
  Webhook,
  Mail,
  Calendar,
  MessageCircle,
  FileUp,
  Sparkles,
  ShieldCheck,
  FileText,
  ClipboardCheck,
} from 'lucide-react';

interface NodeTypeConfig {
  type: NodeType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const nodeTypes: NodeTypeConfig[] = [
  {
    type: NodeType.TRIGGER,
    label: 'Trigger',
    icon: Zap,
    description: 'Start your workflow',
    color: 'bg-purple-500',
  },
  {
    type: NodeType.HTTP_REQUEST,
    label: 'HTTP Request',
    icon: Globe,
    description: 'Make an API call',
    color: 'bg-blue-500',
  },
  {
    type: NodeType.DATA_TRANSFORM,
    label: 'Transform',
    icon: Code,
    description: 'Transform data with code',
    color: 'bg-green-500',
  },
  {
    type: NodeType.CONDITIONAL,
    label: 'Conditional',
    icon: GitBranch,
    description: 'Branch based on condition',
    color: 'bg-yellow-500',
  },
  {
    type: NodeType.DELAY,
    label: 'Delay',
    icon: Clock,
    description: 'Wait for a duration',
    color: 'bg-orange-500',
  },
  {
    type: NodeType.WEBHOOK,
    label: 'Webhook',
    icon: Webhook,
    description: 'Receive external requests',
    color: 'bg-pink-500',
  },
  {
    type: NodeType.EMAIL,
    label: 'Send Email',
    icon: Mail,
    description: 'Send email via SendGrid',
    color: 'bg-red-500',
  },
  {
    type: NodeType.GOOGLE_CALENDAR,
    label: 'Google Calendar',
    icon: Calendar,
    description: 'Create calendar event',
    color: 'bg-indigo-500',
  },
  {
    type: NodeType.WHATSAPP,
    label: 'WhatsApp',
    icon: MessageCircle,
    description: 'Send WhatsApp message',
    color: 'bg-emerald-500',
  },
  {
    type: NodeType.MANUAL_APPROVAL,
    label: 'Manual Approval',
    icon: ClipboardCheck,
    description: 'Pause for human review',
    color: 'bg-blue-600',
  },
  {
    type: NodeType.CSV_UPLOAD,
    label: 'CSV Upload',
    icon: FileUp,
    description: 'Upload and process CSV data',
    color: 'bg-cyan-500',
  },
  {
    type: NodeType.AI_CONTENT_GENERATOR,
    label: 'AI Generator',
    icon: Sparkles,
    description: 'Generate content with AI',
    color: 'bg-violet-500',
  },
  {
    type: NodeType.COMPLIANCE_CHECKER,
    label: 'Compliance',
    icon: ShieldCheck,
    description: 'Check BFSI compliance',
    color: 'bg-amber-500',
  },
  {
    type: NodeType.COMPLIANCE_REPORT,
    label: 'Report',
    icon: FileText,
    description: 'Generate compliance report',
    color: 'bg-slate-500',
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r bg-background p-4 space-y-2">
      <div className="mb-4">
        <h3 className="font-semibold text-lg mb-1">Node Palette</h3>
        <p className="text-sm text-muted-foreground">Drag nodes onto the canvas</p>
      </div>

      <div className="space-y-2">
        {nodeTypes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="flex items-start gap-3 p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary hover:bg-accent transition-colors"
            >
              <div className={`${node.color} p-2 rounded-md text-white shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{node.label}</div>
                <div className="text-xs text-muted-foreground">{node.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
