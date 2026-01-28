import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntegrationAPIKeys } from '@/types/environment';

type IntegrationProvider = 'neon' | 'github' | 'gitpod';

interface IntegrationState {
  // API Keys
  apiKeys: IntegrationAPIKeys;

  // Actions
  setApiKey: (provider: IntegrationProvider, key: string) => void;
  removeApiKey: (provider: IntegrationProvider) => void;
  hasAllKeys: () => boolean;
  hasKey: (provider: IntegrationProvider) => boolean;
  clearAllKeys: () => void;
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKeys: {},

      // Actions
      setApiKey: (provider: IntegrationProvider, key: string) => {
        set((state) => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: key,
          },
        }));
      },

      removeApiKey: (provider: IntegrationProvider) => {
        set((state) => {
          const newKeys = { ...state.apiKeys };
          delete newKeys[provider];
          return { apiKeys: newKeys };
        });
      },

      hasAllKeys: () => {
        const { apiKeys } = get();
        return !!(apiKeys.neon && apiKeys.github);
        // gitpod is optional - only neon and github are required
      },

      hasKey: (provider: IntegrationProvider) => {
        const { apiKeys } = get();
        return !!apiKeys[provider];
      },

      clearAllKeys: () => {
        set({ apiKeys: {} });
      },
    }),
    {
      name: 'prd-to-tasks-integrations',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
      }),
    }
  )
);
