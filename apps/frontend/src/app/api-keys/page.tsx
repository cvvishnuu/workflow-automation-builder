/**
 * API Keys Management Page
 * Admin interface for managing API keys
 */

'use client';

import { useEffect, useState } from 'react';
import { useApiKeyStore } from '@/stores/api-key-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ApiKey, CreateApiKeyRequest } from '@workflow/shared-types';
import { formatDate } from '@/lib/utils';

export default function ApiKeysPage() {
  const { apiKeys, isLoading, error, fetchApiKeys, createApiKey, updateApiKey, deleteApiKey, regenerateApiKey } =
    useApiKeyStore();
  const { workflows, fetchWorkflows } = useWorkflowStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateApiKeyRequest>({
    name: '',
    description: '',
    workflowId: '',
    usageLimit: 10000,
  });

  useEffect(() => {
    fetchApiKeys();
    fetchWorkflows();
  }, [fetchApiKeys, fetchWorkflows]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createApiKey(formData);
      if (created.plainKey) {
        setNewApiKey(created.plainKey);
      }
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        workflowId: '',
        usageLimit: 10000,
      });
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedKey) return;
    try {
      const regenerated = await regenerateApiKey(selectedKey.id);
      if (regenerated.plainKey) {
        setNewApiKey(regenerated.plainKey);
      }
      setRegenerateDialogOpen(false);
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    try {
      await deleteApiKey(selectedKey.id);
      setDeleteDialogOpen(false);
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      await updateApiKey(key.id, { isActive: !key.isActive });
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (isLoading && apiKeys.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading API keys...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys for programmatic access to workflows
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>Create API Key</Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* New API Key Display */}
      {newApiKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">API Key Created Successfully!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please copy your API key now. You won't be able to see it again!
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={newApiKey}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={() => copyToClipboard(newApiKey)}>
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={() => setNewApiKey(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* API Keys Table */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No API keys yet</p>
          <Button onClick={() => setCreateDialogOpen(true)}>Create your first API key</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Workflow</th>
                <th className="text-left p-4 font-medium">Usage</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => {
                const workflow = workflows.find((w) => w.id === key.workflowId);
                const usagePercent = Math.round((key.usageCount / key.usageLimit) * 100);

                return (
                  <tr key={key.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{key.name}</div>
                        {key.description && (
                          <div className="text-sm text-muted-foreground">{key.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {workflow?.name || 'Unknown workflow'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="mb-1">
                          {key.usageCount.toLocaleString()} / {key.usageLimit.toLocaleString()}
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              usagePercent >= 90
                                ? 'bg-red-500'
                                : usagePercent >= 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={key.isActive ? 'default' : 'secondary'}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(key)}
                        >
                          {key.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedKey(key);
                            setRegenerateDialogOpen(true);
                          }}
                        >
                          Regenerate
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedKey(key);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to access your workflow programmatically
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My API Key"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <Label htmlFor="workflow">Workflow *</Label>
                <Select
                  value={formData.workflowId}
                  onValueChange={(value) => setFormData({ ...formData, workflowId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min="1"
                  max="1000000"
                  value={formData.usageLimit || 10000}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of workflow executions allowed
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.name || !formData.workflowId}>
                Create API Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
            <DialogDescription>
              This will invalidate the old key and generate a new one. Any applications using the old
              key will stop working. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRegenerate}>
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedKey?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
