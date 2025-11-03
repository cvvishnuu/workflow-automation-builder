/**
 * Live Execution Monitor Page
 * Real-time visualization of workflow execution with logs
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useExecutionStore } from '@/stores/execution-store';
import { WorkflowEditor } from '@/components/workflow-editor';
import { ExecutionLogsPanel } from '@/components/execution-logs-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, XCircle, CheckCircle2, StopCircle } from 'lucide-react';
import { executionsApi } from '@/lib/api';

export default function ExecutionMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const executionId = params.executionId as string;

  const { workflows, fetchWorkflow } = useWorkflowStore();
  const {
    currentExecution,
    executionStatus,
    startExecutionMonitoring,
    stopExecutionMonitoring,
    connectWebSocket,
    isConnected,
  } = useExecutionStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const workflow = workflows.find((w) => w.id === workflowId);

  // Initialize monitoring
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);

      // Fetch workflow if not already loaded
      if (!workflow) {
        await fetchWorkflow(workflowId);
      }

      // Connect WebSocket if not connected
      if (!isConnected) {
        connectWebSocket();
      }

      // Start monitoring execution
      await startExecutionMonitoring(executionId);

      setIsInitializing(false);
    };

    initialize();

    // Cleanup on unmount
    return () => {
      stopExecutionMonitoring();
    };
  }, [executionId]);

  const handleBack = () => {
    stopExecutionMonitoring();
    router.push(`/workflows/${workflowId}/executions`);
  };

  const handleCancelExecution = async () => {
    if (!confirm('Are you sure you want to cancel this execution?')) {
      return;
    }

    setIsCancelling(true);
    try {
      await executionsApi.cancel(executionId);
      // The WebSocket will notify us of the cancellation
    } catch (error: any) {
      console.error('Failed to cancel execution:', error);
      alert(error.response?.data?.message || 'Failed to cancel execution');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusIndicator = () => {
    switch (executionStatus) {
      case 'running':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            Idle
          </Badge>
        );
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing execution monitor...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Workflow not found</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="border-l pl-4">
            <h1 className="text-xl font-bold">{workflow.name}</h1>
            <p className="text-sm text-muted-foreground">
              Execution ID: {executionId.substring(0, 8)}...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* WebSocket connection status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Cancel button (only for running executions) */}
          {executionStatus === 'running' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelExecution}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Cancel Execution
                </>
              )}
            </Button>
          )}

          {/* Execution status */}
          {getStatusIndicator()}
        </div>
      </div>

      {/* Main content - split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow visualization (left side) */}
        <div className="flex-1 border-r bg-gray-50">
          <WorkflowEditor
            definition={workflow.definition}
            onDefinitionChange={() => {
              // Read-only during execution
            }}
            onNodeSelect={() => {
              // Disabled during execution
            }}
          />
        </div>

        {/* Execution logs (right side) */}
        <div className="w-1/3 bg-white p-6 overflow-y-auto">
          <ExecutionLogsPanel maxHeight="calc(100vh - 200px)" />

          {/* Execution summary */}
          {currentExecution && (
            <div className="mt-6 p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Execution Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{currentExecution.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span className="font-medium">
                    {currentExecution.startedAt
                      ? new Date(currentExecution.startedAt).toLocaleTimeString()
                      : 'N/A'}
                  </span>
                </div>
                {currentExecution.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium">
                      {new Date(currentExecution.completedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {currentExecution.error && (
                  <div className="pt-2 mt-2 border-t">
                    <span className="text-muted-foreground">Error:</span>
                    <p className="text-red-600 text-xs mt-1 font-mono">
                      {currentExecution.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
