/**
 * Workflow Editor Page
 * Edit and manage individual workflows
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useExecutionStore } from '@/stores/execution-store';
import { Button } from '@/components/ui/button';
import { WorkflowEditor } from '@/components/workflow-editor';
import { NodePalette } from '@/components/node-palette';
import { NodeConfigSidebar } from '@/components/node-config-sidebar';
import type { WorkflowDefinition, NodeConfig } from '@workflow/shared-types';

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { currentWorkflow, isLoading, error, fetchWorkflow, updateWorkflow, updateWorkflowLocal } = useWorkflowStore();
  const { executeWorkflow, isExecuting, connectWebSocket, disconnectWebSocket } = useExecutionStore();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeConfig | null>(null);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, [connectWebSocket, disconnectWebSocket]);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow(workflowId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Handle Ctrl+S keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (currentWorkflow && !isSaving) {
          handleSave(currentWorkflow.definition);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentWorkflow, isSaving]);

  const handleSave = async (definition: WorkflowDefinition, silent = false) => {
    if (!currentWorkflow) return;

    setIsSaving(true);
    try {
      await updateWorkflow(currentWorkflow.id, {
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        definition,
      });
      if (!silent) {
        console.log('Workflow saved successfully');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      if (!silent) {
        alert('Failed to save workflow');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNodeSave = (updatedNode: NodeConfig) => {
    if (!currentWorkflow) return;

    const updatedNodes = currentWorkflow.definition.nodes.map((node) =>
      node.nodeId === updatedNode.nodeId ? updatedNode : node
    );

    updateWorkflowLocal(currentWorkflow.id, {
      definition: {
        ...currentWorkflow.definition,
        nodes: updatedNodes,
      },
    });
  };

  const handleRun = async () => {
    if (!currentWorkflow) return;

    try {
      console.log('[WorkflowEditor] Starting workflow execution...');

      // First save the current workflow silently
      await handleSave(currentWorkflow.definition, true);

      // Then execute it using the execution store (with authentication)
      // The execution store's WebSocket listener will auto-redirect to review page if approval is needed
      const execution = await executeWorkflow(currentWorkflow.id);

      console.log('[WorkflowEditor] Execution started:', execution.id);
      console.log('[WorkflowEditor] WebSocket will auto-redirect to review page if approval is needed');
    } catch (error) {
      console.error('[WorkflowEditor] Failed to run workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to execute workflow: ${errorMessage}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading workflow...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push('/workflows')}>Back to Workflows</Button>
        </div>
      </div>
    );
  }

  if (!currentWorkflow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Workflow not found</p>
          <Button onClick={() => router.push('/workflows')}>Back to Workflows</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/workflows')}>
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentWorkflow.name}</h1>
            {currentWorkflow.description && (
              <p className="text-sm text-muted-foreground">{currentWorkflow.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const newName = prompt('Workflow name:', currentWorkflow.name);
              if (newName) {
                updateWorkflow(currentWorkflow.id, { name: newName });
              }
            }}
          >
            Rename
          </Button>
          <Button variant="default" onClick={handleRun} disabled={isExecuting}>
            {isExecuting ? '⏳ Running...' : '▶ Run'}
          </Button>
          <Button onClick={() => handleSave(currentWorkflow.definition)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Workflow Editor */}
      <div className="flex-1 flex">
        <NodePalette />
        <div className="flex-1">
          <WorkflowEditor
            definition={currentWorkflow.definition}
            onDefinitionChange={(newDefinition) => {
              // Update local state only (no API call)
              // This happens automatically as nodes are dragged/connected
              updateWorkflowLocal(currentWorkflow.id, {
                definition: newDefinition,
              });
            }}
            onNodeSelect={setSelectedNode}
          />
        </div>
        {selectedNode && (
          <NodeConfigSidebar
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onSave={handleNodeSave}
          />
        )}
      </div>
    </div>
  );
}
