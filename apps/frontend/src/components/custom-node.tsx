/**
 * Custom Node Component for React Flow
 * Displays workflow nodes with icons and styling based on type
 */

'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '@workflow/shared-types';
import {
  Zap,
  Globe,
  Code,
  GitBranch,
  Clock,
  Webhook,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Calendar,
  MessageCircle,
  FileUp,
  Sparkles,
  ShieldCheck,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { useExecutionStore } from '@/stores/execution-store';

interface CustomNodeData {
  label: string;
  type: NodeType;
  status?: 'idle' | 'running' | 'success' | 'error';
}

const nodeIcons: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  [NodeType.TRIGGER]: Zap,
  [NodeType.HTTP_REQUEST]: Globe,
  [NodeType.DATA_TRANSFORM]: Code,
  [NodeType.CONDITIONAL]: GitBranch,
  [NodeType.DELAY]: Clock,
  [NodeType.WEBHOOK]: Webhook,
  [NodeType.EMAIL]: Mail,
  [NodeType.GOOGLE_CALENDAR]: Calendar,
  [NodeType.WHATSAPP]: MessageCircle,
  [NodeType.MANUAL_APPROVAL]: ClipboardCheck,
  [NodeType.CSV_UPLOAD]: FileUp,
  [NodeType.AI_CONTENT_GENERATOR]: Sparkles,
  [NodeType.COMPLIANCE_CHECKER]: ShieldCheck,
  [NodeType.COMPLIANCE_REPORT]: FileText,
};

const nodeColors: Record<NodeType, { bg: string; border: string; icon: string }> = {
  [NodeType.TRIGGER]: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    icon: 'bg-purple-500',
  },
  [NodeType.HTTP_REQUEST]: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: 'bg-blue-500',
  },
  [NodeType.DATA_TRANSFORM]: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    icon: 'bg-green-500',
  },
  [NodeType.CONDITIONAL]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    icon: 'bg-yellow-500',
  },
  [NodeType.DELAY]: {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    icon: 'bg-orange-500',
  },
  [NodeType.WEBHOOK]: {
    bg: 'bg-pink-50',
    border: 'border-pink-500',
    icon: 'bg-pink-500',
  },
  [NodeType.EMAIL]: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: 'bg-red-500',
  },
  [NodeType.GOOGLE_CALENDAR]: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    icon: 'bg-indigo-500',
  },
  [NodeType.WHATSAPP]: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    icon: 'bg-emerald-500',
  },
  [NodeType.MANUAL_APPROVAL]: {
    bg: 'bg-blue-50',
    border: 'border-blue-600',
    icon: 'bg-blue-600',
  },
  [NodeType.CSV_UPLOAD]: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-500',
    icon: 'bg-cyan-500',
  },
  [NodeType.AI_CONTENT_GENERATOR]: {
    bg: 'bg-violet-50',
    border: 'border-violet-500',
    icon: 'bg-violet-500',
  },
  [NodeType.COMPLIANCE_CHECKER]: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    icon: 'bg-amber-500',
  },
  [NodeType.COMPLIANCE_REPORT]: {
    bg: 'bg-slate-50',
    border: 'border-slate-500',
    icon: 'bg-slate-500',
  },
};

const statusColors: Record<string, string> = {
  idle: 'border-gray-300',
  running: 'border-blue-500 animate-pulse',
  success: 'border-green-500',
  error: 'border-red-500',
};

function CustomNode({ data, selected, id }: NodeProps<CustomNodeData>) {
  const Icon = nodeIcons[data.type];
  const colors = nodeColors[data.type];

  // Get real-time execution status from store
  const nodeStatuses = useExecutionStore((state) => state.nodeStatuses);
  const nodeStatus = nodeStatuses[id];

  // Determine effective status (real-time status takes precedence)
  const status = nodeStatus?.status || data.status || 'idle';
  const statusBorder = statusColors[status];

  // Status icon component
  const StatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'retrying':
        return <AlertCircle className="w-3 h-3 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[180px] shadow-md relative
        ${colors.bg} ${selected ? 'border-primary' : statusBorder}
        transition-all duration-200
      `}
    >
      {/* Status indicator badge */}
      {status !== 'idle' && (
        <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
          <StatusIcon />
        </div>
      )}

      {/* Input handles on all sides (except for trigger nodes) */}
      {data.type !== NodeType.TRIGGER && (
        <>
          <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />
          <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-400" />
          <Handle type="target" position={Position.Right} className="w-3 h-3 !bg-gray-400" />
          <Handle type="target" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
        </>
      )}

      <div className="flex items-center gap-3">
        <div className={`${colors.icon} p-2 rounded-md text-white shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground capitalize">{data.type}</div>
          {/* Show retry attempt if retrying */}
          {nodeStatus?.status === 'retrying' && nodeStatus.attempt && (
            <div className="text-xs text-yellow-600 mt-1">
              Retry {nodeStatus.attempt}/{nodeStatus.maxRetries}
            </div>
          )}
        </div>
      </div>

      {/* Output handles on all sides */}
      {data.type === NodeType.CONDITIONAL ? (
        <>
          {/* True branch - right side */}
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: '40%' }}
            className="w-3 h-3 !bg-green-500"
          />
          {/* False branch - bottom */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-3 h-3 !bg-red-500"
          />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
          <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500" />
          <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-blue-500" />
          <Handle type="source" position={Position.Left} className="w-3 h-3 !bg-blue-500" />
        </>
      )}
    </div>
  );
}

export default memo(CustomNode);
