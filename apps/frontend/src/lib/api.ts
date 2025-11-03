/**
 * API Client
 * Handles communication with the backend API
 */

import axios from 'axios';
import type {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowExecution,
  ExecuteWorkflowRequest,
  PaginatedResponse,
  ApiKey,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  ApiKeyUsageStats,
} from '@workflow/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token provider - will be set by the auth context
let tokenProvider: (() => Promise<string | null>) | null = null;

/**
 * Set the token provider function
 * This should be called from a client component with access to Clerk's auth
 */
export function setTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

// Add auth token interceptor
apiClient.interceptors.request.use(async (config) => {
  console.log('[API] Making request to:', config.url);
  console.log('[API] Token provider exists:', !!tokenProvider);

  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      console.log('[API] Got token:', token ? `${token.substring(0, 20)}...` : 'null');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('[API] No token available - request will be unauthorized');
      }
    } catch (error) {
      console.error('[API] Failed to get auth token:', error);
    }
  } else {
    console.warn('[API] Token provider not initialized!');
  }
  return config;
});

/**
 * Workflows API
 */
export const workflowsApi = {
  /**
   * Get all workflows
   */
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Workflow>> {
    const response = await apiClient.get<PaginatedResponse<Workflow>>('/workflows', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Get workflow by ID
   */
  async getById(id: string): Promise<Workflow> {
    const response = await apiClient.get<Workflow>(`/workflows/${id}`);
    return response.data;
  },

  /**
   * Create new workflow
   */
  async create(data: CreateWorkflowRequest): Promise<Workflow> {
    const response = await apiClient.post<Workflow>('/workflows', data);
    return response.data;
  },

  /**
   * Update workflow
   */
  async update(id: string, data: UpdateWorkflowRequest): Promise<Workflow> {
    const response = await apiClient.patch<Workflow>(`/workflows/${id}`, data);
    return response.data;
  },

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/workflows/${id}`);
  },
};

/**
 * Executions API
 */
export const executionsApi = {
  /**
   * Execute a workflow
   */
  async execute(data: ExecuteWorkflowRequest): Promise<WorkflowExecution> {
    const response = await apiClient.post<WorkflowExecution>('/executions', data);
    return response.data;
  },

  /**
   * Get execution by ID
   */
  async getById(id: string): Promise<WorkflowExecution> {
    const response = await apiClient.get<WorkflowExecution>(`/executions/${id}`);
    return response.data;
  },

  /**
   * Get executions for a workflow
   */
  async getByWorkflowId(
    workflowId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<WorkflowExecution>> {
    const response = await apiClient.get<PaginatedResponse<WorkflowExecution>>(
      `/executions/workflow/${workflowId}`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Get pending approval data for an execution
   */
  async getPendingApproval(executionId: string): Promise<any> {
    const response = await apiClient.get(`/executions/${executionId}/pending-approval`);
    return response.data;
  },

  /**
   * Approve execution and resume workflow
   */
  async approve(executionId: string, comment?: string): Promise<void> {
    await apiClient.post(`/executions/${executionId}/approve`, { comment });
  },

  /**
   * Reject execution and stop workflow
   */
  async reject(executionId: string, comment?: string): Promise<void> {
    await apiClient.post(`/executions/${executionId}/reject`, { comment });
  },

  /**
   * Cancel a running execution
   */
  async cancel(executionId: string): Promise<void> {
    await apiClient.delete(`/executions/${executionId}`);
  },
};

/**
 * API Keys API
 */
export const apiKeysApi = {
  /**
   * Get all API keys for the authenticated user
   */
  async getAll(): Promise<ApiKey[]> {
    const response = await apiClient.get<ApiKey[]>('/api-keys');
    return response.data;
  },

  /**
   * Get a single API key by ID
   */
  async getById(id: string): Promise<ApiKey> {
    const response = await apiClient.get<ApiKey>(`/api-keys/${id}`);
    return response.data;
  },

  /**
   * Create a new API key
   */
  async create(data: CreateApiKeyRequest): Promise<ApiKey> {
    const response = await apiClient.post<ApiKey>('/api-keys', data);
    return response.data;
  },

  /**
   * Update an API key
   */
  async update(id: string, data: UpdateApiKeyRequest): Promise<ApiKey> {
    const response = await apiClient.patch<ApiKey>(`/api-keys/${id}`, data);
    return response.data;
  },

  /**
   * Delete an API key
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api-keys/${id}`);
  },

  /**
   * Regenerate an API key (creates new key, invalidates old)
   */
  async regenerate(id: string): Promise<ApiKey> {
    const response = await apiClient.post<ApiKey>(`/api-keys/${id}/regenerate`);
    return response.data;
  },

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(id: string): Promise<ApiKeyUsageStats> {
    const response = await apiClient.get<ApiKeyUsageStats>(`/api-keys/${id}/usage`);
    return response.data;
  },
};
