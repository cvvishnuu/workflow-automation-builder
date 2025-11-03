/**
 * Execution History Page
 * Shows all executions for a specific workflow with real-time monitoring
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useExecutionStore } from '@/stores/execution-store';
import { executionsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { WorkflowExecution, ExecutionStatus } from '@workflow/shared-types';
import { Play, RefreshCw, Eye, ArrowLeft, Loader2 } from 'lucide-react';

export default function ExecutionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { workflows, fetchWorkflows } = useWorkflowStore();
  const { executeWorkflow, startExecutionMonitoring } = useExecutionStore();

  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const workflow = workflows.find((w) => w.id === workflowId);

  // Fetch workflow and executions
  useEffect(() => {
    fetchWorkflows();
    fetchExecutions();
  }, [workflowId, page]);

  const fetchExecutions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await executionsApi.getByWorkflowId(workflowId, page, 20);
      setExecutions(response.data);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch executions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunWorkflow = async () => {
    setIsExecuting(true);
    try {
      const execution = await executeWorkflow(workflowId);

      // Start monitoring the execution
      startExecutionMonitoring(execution.id);

      // Navigate to live monitoring view
      router.push(`/workflows/${workflowId}/executions/${execution.id}/monitor`);
    } catch (err: any) {
      setError(err.message || 'Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleViewExecution = (executionId: string) => {
    router.push(`/workflows/${workflowId}/executions/${executionId}`);
  };

  const handleMonitorExecution = (executionId: string) => {
    startExecutionMonitoring(executionId);
    router.push(`/workflows/${workflowId}/executions/${executionId}/monitor`);
  };

  const getStatusBadge = (status: ExecutionStatus) => {
    const variants: Record<ExecutionStatus, 'default' | 'secondary' | 'destructive'> = {
      PENDING: 'secondary',
      RUNNING: 'default',
      COMPLETED: 'default',
      FAILED: 'destructive',
      CANCELLED: 'secondary',
      pending_approval: 'secondary',
    };

    const colors: Record<ExecutionStatus, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      RUNNING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-yellow-100 text-yellow-800',
      pending_approval: 'bg-purple-100 text-purple-800',
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status === 'pending_approval' ? 'Pending Approval' : status}
      </Badge>
    );
  };

  const getDuration = (execution: WorkflowExecution) => {
    if (!execution.startedAt) return 'N/A';

    const start = new Date(execution.startedAt).getTime();
    const end = execution.completedAt
      ? new Date(execution.completedAt).getTime()
      : Date.now();

    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (isLoading && executions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/workflows/${workflowId}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Workflow
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Execution History</h1>
            {workflow && (
              <p className="text-muted-foreground mt-2">
                {workflow.name}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchExecutions}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleRunWorkflow}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Executions Table */}
      {executions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No executions yet</p>
          <Button onClick={handleRunWorkflow} disabled={isExecuting}>
            <Play className="w-4 h-4 mr-2" />
            Run your first execution
          </Button>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-medium">Execution ID</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Started</th>
                  <th className="text-left p-4 font-medium">Duration</th>
                  <th className="text-left p-4 font-medium">Completed</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <tr key={execution.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-mono text-sm">{execution.id.substring(0, 8)}...</div>
                    </td>
                    <td className="p-4">{getStatusBadge(execution.status)}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {execution.startedAt ? formatDate(execution.startedAt) : 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {getDuration(execution)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {execution.completedAt ? formatDate(execution.completedAt) : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewExecution(execution.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        {execution.status === 'RUNNING' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleMonitorExecution(execution.id)}
                          >
                            Monitor Live
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
