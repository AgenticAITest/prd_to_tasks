import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppSettings,
  StandardsConfig,
  AppearanceSettings,
  TierModelConfig
} from '@/types/settings';
import type { LLMProvider, TaskTierType } from '@/types/llm';
import { defaultSettings } from '@/types/settings';

interface SettingsState extends AppSettings {
  // Computed
  hasValidApiKey: () => boolean;
  getApiKey: (provider: LLMProvider) => string | undefined;
  getModelForTier: (tier: TaskTierType) => TierModelConfig;

  // Actions
  setApiKey: (provider: LLMProvider, key: string) => void;
  removeApiKey: (provider: LLMProvider) => void;
  setModelForTier: (tier: TaskTierType, provider: LLMProvider, model: string) => void;
  updateStandards: (standards: Partial<StandardsConfig>) => void;
  updateAppearance: (appearance: Partial<AppearanceSettings>) => void;
  resetToDefaults: () => void;
  importSettings: (settings: Partial<AppSettings>) => void;
  exportSettings: () => AppSettings;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state from defaults
      ...defaultSettings,

      // Computed
      hasValidApiKey: () => {
        const { apiKeys } = get();
        return Object.values(apiKeys).some(key => key && key.length > 0);
      },

      getApiKey: (provider: LLMProvider) => {
        return get().apiKeys[provider];
      },

      getModelForTier: (tier: TaskTierType) => {
        return get().modelSelection[tier];
      },

      // Actions
      setApiKey: (provider: LLMProvider, key: string) => {
        set(state => ({
          apiKeys: {
            ...state.apiKeys,
            [provider]: key,
          },
        }));
      },

      removeApiKey: (provider: LLMProvider) => {
        set(state => {
          const newApiKeys = { ...state.apiKeys };
          delete newApiKeys[provider];
          return { apiKeys: newApiKeys };
        });
      },

      setModelForTier: (tier: TaskTierType, provider: LLMProvider, model: string) => {
        set(state => ({
          modelSelection: {
            ...state.modelSelection,
            [tier]: {
              provider,
              model,
              enabled: true,
            },
          },
        }));
      },

      updateStandards: (standards: Partial<StandardsConfig>) => {
        set(state => ({
          standards: {
            ...state.standards,
            ...standards,
          },
        }));
      },

      updateAppearance: (appearance: Partial<AppearanceSettings>) => {
        set(state => ({
          appearance: {
            ...state.appearance,
            ...appearance,
          },
        }));
      },

      resetToDefaults: () => {
        set(defaultSettings);
      },

      importSettings: (settings: Partial<AppSettings>) => {
        set(state => ({
          ...state,
          ...settings,
        }));
      },

      exportSettings: () => {
        const state = get();
        return {
          apiKeys: state.apiKeys,
          modelSelection: state.modelSelection,
          standards: state.standards,
          appearance: state.appearance,
          export: state.export,
          advanced: state.advanced,
        };
      },
    }),
    {
      name: 'prd-to-tasks-settings',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        modelSelection: state.modelSelection,
        standards: state.standards,
        appearance: state.appearance,
        export: state.export,
        advanced: state.advanced,
      }),
    }
  )
);
