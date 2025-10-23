/**
 * Workflow Store
 * Manages workflow state using Zustand
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only manages workflow state
 * - Interface Segregation: Clean, focused API
 */

import { create } from 'zustand';
import type { Workflow, WorkflowDefinition } from '@workflow/shared-types';
import { workflowsApi } from '@/lib/api';

interface WorkflowStore {
  // State
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWorkflows: () => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflow: (name: string, description?: string) => Promise<Workflow>;
  updateWorkflow: (
    id: string,
    updates: { name?: string; description?: string; definition?: WorkflowDefinition }
  ) => Promise<void>;
  updateWorkflowLocal: (
    id: string,
    updates: { name?: string; description?: string; definition?: WorkflowDefinition }
  ) => void;
  deleteWorkflow: (id: string) => Promise<void>;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Initial state
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,

  // Fetch all workflows
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await workflowsApi.getAll();
      set({ workflows: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch workflows',
        isLoading: false,
      });
    }
  },

  // Fetch single workflow
  fetchWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const workflow = await workflowsApi.getById(id);
      set({ currentWorkflow: workflow, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch workflow',
        isLoading: false,
      });
    }
  },

  // Create new workflow
  createWorkflow: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Create empty workflow with trigger node
      const workflow = await workflowsApi.create({
        name,
        description,
        definition: {
          nodes: [
            {
              nodeId: 'trigger-1',
              type: 'trigger',
              label: 'Start',
              position: { x: 250, y: 100 },
              config: { triggerType: 'manual' },
            },
          ],
          edges: [],
        },
      });

      set((state) => ({
        workflows: [...state.workflows, workflow],
        currentWorkflow: workflow,
        isLoading: false,
      }));

      return workflow;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create workflow',
        isLoading: false,
      });
      throw error;
    }
  },

  // Update workflow (with API call)
  updateWorkflow: async (
    id: string,
    updates: { name?: string; description?: string; definition?: WorkflowDefinition }
  ) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await workflowsApi.update(id, updates);

      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? updated : w)),
        currentWorkflow: state.currentWorkflow?.id === id ? updated : state.currentWorkflow,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update workflow',
        isLoading: false,
      });
    }
  },

  // Update workflow locally (no API call)
  updateWorkflowLocal: (
    id: string,
    updates: { name?: string; description?: string; definition?: WorkflowDefinition }
  ) => {
    set((state) => {
      const currentWorkflow = state.currentWorkflow;
      if (!currentWorkflow || currentWorkflow.id !== id) return state;

      const updatedWorkflow = {
        ...currentWorkflow,
        ...updates,
        definition: updates.definition || currentWorkflow.definition,
      };

      return {
        workflows: state.workflows.map((w) => (w.id === id ? updatedWorkflow : w)),
        currentWorkflow: updatedWorkflow,
      };
    });
  },

  // Delete workflow
  deleteWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await workflowsApi.delete(id);

      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
        currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
        isLoading: false,
      });
    }
  },

  // Set current workflow
  setCurrentWorkflow: (workflow: Workflow | null) => {
    set({ currentWorkflow: workflow });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
