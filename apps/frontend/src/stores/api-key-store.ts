/**
 * API Keys Store
 * Manages API key state using Zustand
 */

import { create } from 'zustand';
import type { ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest, ApiKeyUsageStats } from '@workflow/shared-types';
import { apiKeysApi } from '@/lib/api';

interface ApiKeyState {
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchApiKeys: () => Promise<void>;
  createApiKey: (data: CreateApiKeyRequest) => Promise<ApiKey>;
  updateApiKey: (id: string, data: UpdateApiKeyRequest) => Promise<ApiKey>;
  deleteApiKey: (id: string) => Promise<void>;
  regenerateApiKey: (id: string) => Promise<ApiKey>;
  getUsageStats: (id: string) => Promise<ApiKeyUsageStats>;
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  apiKeys: [],
  isLoading: false,
  error: null,

  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiKeys = await apiKeysApi.getAll();
      set({ apiKeys, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch API keys:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch API keys',
        isLoading: false
      });
    }
  },

  createApiKey: async (data: CreateApiKeyRequest) => {
    set({ isLoading: true, error: null });
    try {
      const apiKey = await apiKeysApi.create(data);
      set((state) => ({
        apiKeys: [...state.apiKeys, apiKey],
        isLoading: false
      }));
      return apiKey;
    } catch (error: any) {
      console.error('Failed to create API key:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create API key';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  updateApiKey: async (id: string, data: UpdateApiKeyRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedApiKey = await apiKeysApi.update(id, data);
      set((state) => ({
        apiKeys: state.apiKeys.map((key) =>
          key.id === id ? updatedApiKey : key
        ),
        isLoading: false
      }));
      return updatedApiKey;
    } catch (error: any) {
      console.error('Failed to update API key:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update API key';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  deleteApiKey: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiKeysApi.delete(id);
      set((state) => ({
        apiKeys: state.apiKeys.filter((key) => key.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to delete API key:', error);
      set({
        error: error.response?.data?.message || 'Failed to delete API key',
        isLoading: false
      });
      throw error;
    }
  },

  regenerateApiKey: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const regeneratedKey = await apiKeysApi.regenerate(id);
      set((state) => ({
        apiKeys: state.apiKeys.map((key) =>
          key.id === id ? regeneratedKey : key
        ),
        isLoading: false
      }));
      return regeneratedKey;
    } catch (error: any) {
      console.error('Failed to regenerate API key:', error);
      const errorMsg = error.response?.data?.message || 'Failed to regenerate API key';
      set({ error: errorMsg, isLoading: false });
      throw new Error(errorMsg);
    }
  },

  getUsageStats: async (id: string) => {
    try {
      const stats = await apiKeysApi.getUsageStats(id);
      return stats;
    } catch (error: any) {
      console.error('Failed to get usage stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to get usage stats');
    }
  },
}));
