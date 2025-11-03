/**
 * Execution Logs Panel
 * Displays real-time execution logs with filtering and scrolling
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useExecutionStore } from '@/stores/execution-store';
import { CheckCircle2, XCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExecutionLogsPanelProps {
  className?: string;
  maxHeight?: string;
}

export function ExecutionLogsPanel({
  className = '',
  maxHeight = '400px',
}: ExecutionLogsPanelProps) {
  const logs = useExecutionStore((state) => state.logs);
  const clearLogs = useExecutionStore((state) => state.clearLogs);
  const executionStatus = useExecutionStore((state) => state.executionStatus);

  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Check if user manually scrolled up
  const handleScroll = () => {
    if (!logsContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (autoScroll && !isScrolledToBottom) {
      setAutoScroll(false);
    } else if (!autoScroll && isScrolledToBottom) {
      setAutoScroll(true);
    }
  };

  // Filter logs based on selected filter
  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter((log) => log.level === filter);

  // Get icon for log level
  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Get text color for log level
  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      default:
        return 'text-gray-700';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-sm">Execution Logs</h3>

          {/* Execution status indicator */}
          {executionStatus !== 'idle' && (
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  executionStatus === 'running'
                    ? 'bg-blue-500 animate-pulse'
                    : executionStatus === 'completed'
                    ? 'bg-green-500'
                    : executionStatus === 'failed'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {executionStatus}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex gap-1">
            {['all', 'info', 'success', 'warning', 'error'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-2 py-1 text-xs rounded ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Auto-scroll toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs"
          >
            Auto-scroll: {autoScroll ? 'On' : 'Off'}
          </Button>

          {/* Clear logs button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            disabled={logs.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Logs container */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto p-4 space-y-2 font-mono text-sm"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {logs.length === 0 ? 'No logs yet' : 'No logs match the current filter'}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.level)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 font-normal">
                    {formatTime(log.timestamp)}
                  </span>
                  {log.nodeId && (
                    <span className="text-xs text-blue-600 font-normal">
                      [{log.nodeId}]
                    </span>
                  )}
                </div>
                <div className={`${getLogColor(log.level)} break-words`}>
                  {log.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer with log count */}
      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
        {filter !== 'all' && ` (filtered from ${logs.length} total)`}
      </div>
    </div>
  );
}
