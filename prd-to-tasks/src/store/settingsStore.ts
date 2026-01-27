import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppSettings,
  StandardsConfig,
  AppearanceSettings,
  TierModelConfig,
  AdvancedSettings
} from '@/types/settings';
import type { LLMProvider, TaskTierType } from '@/types/llm';
import { defaultSettings } from '@/types/settings';
import { getEnvApiKeys } from '@/lib/env-config';

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
  // Advanced settings helper
  updateAdvanced: (adv: Partial<AdvancedSettings>) => void;
  resetToDefaults: () => void;
  importSettings: (settings: Partial<AppSettings>) => void;
  exportSettings: () => AppSettings;
  initializeFromEnv: () => void;
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

      updateAdvanced: (adv: Partial<AdvancedSettings>) => {
        set(state => ({
          advanced: {
            ...state.advanced,
            ...adv,
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

      initializeFromEnv: () => {
        const envKeys = getEnvApiKeys();
        const currentKeys = get().apiKeys;

        // Merge env keys with current keys (current keys take precedence)
        const mergedKeys = { ...currentKeys };

        (Object.keys(envKeys) as Array<keyof typeof envKeys>).forEach((provider) => {
          // Only set from env if current key is empty/undefined
          if (!currentKeys[provider]) {
            mergedKeys[provider] = envKeys[provider];
          }
        });

        // Only update if there are changes
        if (JSON.stringify(mergedKeys) !== JSON.stringify(currentKeys)) {
          set({ apiKeys: mergedKeys });
        }
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
      // Merge persisted state with defaults to handle new properties
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppSettings> | undefined;
        if (!persisted) {
          return currentState;
        }

        // Deep merge to preserve new tier defaults while keeping persisted values
        return {
          ...currentState,
          apiKeys: {
            ...currentState.apiKeys,
            ...(persisted.apiKeys || {}),
          },
          modelSelection: {
            ...currentState.modelSelection,
            ...(persisted.modelSelection || {}),
          },
          standards: persisted.standards
            ? { ...currentState.standards, ...persisted.standards }
            : currentState.standards,
          appearance: persisted.appearance
            ? { ...currentState.appearance, ...persisted.appearance }
            : currentState.appearance,
          export: persisted.export
            ? { ...currentState.export, ...persisted.export }
            : currentState.export,
          advanced: persisted.advanced
            ? { ...currentState.advanced, ...persisted.advanced }
            : currentState.advanced,
        };
      },
    }
  )
);
