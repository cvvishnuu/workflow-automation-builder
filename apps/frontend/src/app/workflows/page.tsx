/**
 * Workflows List Page
 * Displays all workflows with actions
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function WorkflowsPage() {
  const { workflows, isLoading, error, fetchWorkflows, createWorkflow, deleteWorkflow } =
    useWorkflowStore();

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreateWorkflow = async () => {
    try {
      const workflow = await createWorkflow('New Workflow', 'Created from UI');
      // Redirect to editor
      window.location.href = `/workflows/${workflow.id}`;
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  if (isLoading && workflows.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">My Workflows</h1>
        <Button onClick={handleCreateWorkflow}>Create Workflow</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No workflows yet</p>
          <Button onClick={handleCreateWorkflow}>Create your first workflow</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{workflow.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {workflow.description || 'No description'}
              </p>
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                <span>{workflow.definition.nodes.length} nodes</span>
                <span>{formatDate(workflow.updatedAt)}</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/workflows/${workflow.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={async () => {
                    if (confirm('Delete this workflow?')) {
                      await deleteWorkflow(workflow.id);
                    }
                  }}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
