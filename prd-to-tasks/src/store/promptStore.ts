import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PROMPTS, type PromptKey } from '@/core/llm/prompts/default-prompts';

interface PromptState {
  // Custom prompts (null = use default)
  customPrompts: Record<PromptKey, string | null>;

  // Actions
  getPrompt: (key: PromptKey) => string;
  setPrompt: (key: PromptKey, value: string) => void;
  resetPrompt: (key: PromptKey) => void;
  resetAllPrompts: () => void;
  isCustomized: (key: PromptKey) => boolean;
  getCustomizedKeys: () => PromptKey[];

  // Import/Export
  exportPrompts: () => string;
  importPrompts: (json: string) => boolean;
}

const initialCustomPrompts: Record<PromptKey, string | null> = {
  prdAnalysis: null,
  semanticAnalysis: null,
  entityExtraction: null,
  taskGeneration: null,
  erdGeneration: null,
  architectureExtraction: null,
  taskImplementation: null,
};

export const usePromptStore = create<PromptState>()(
  persist(
    (set, get) => ({
      customPrompts: { ...initialCustomPrompts },

      getPrompt: (key: PromptKey) => {
        const custom = get().customPrompts[key];
        return custom ?? DEFAULT_PROMPTS[key];
      },

      setPrompt: (key: PromptKey, value: string) => {
        set((state) => ({
          customPrompts: {
            ...state.customPrompts,
            [key]: value,
          },
        }));
      },

      resetPrompt: (key: PromptKey) => {
        set((state) => ({
          customPrompts: {
            ...state.customPrompts,
            [key]: null,
          },
        }));
      },

      resetAllPrompts: () => {
        set({ customPrompts: { ...initialCustomPrompts } });
      },

      isCustomized: (key: PromptKey) => {
        return get().customPrompts[key] !== null;
      },

      getCustomizedKeys: () => {
        const { customPrompts } = get();
        return (Object.keys(customPrompts) as PromptKey[]).filter(
          (key) => customPrompts[key] !== null
        );
      },

      exportPrompts: () => {
        const { customPrompts } = get();
        const exportData: Record<string, string> = {};

        (Object.keys(customPrompts) as PromptKey[]).forEach((key) => {
          const value = customPrompts[key];
          if (value !== null) {
            exportData[key] = value;
          }
        });

        return JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            prompts: exportData,
          },
          null,
          2
        );
      },

      importPrompts: (json: string) => {
        try {
          const data = JSON.parse(json);

          if (!data.prompts || typeof data.prompts !== 'object') {
            console.error('Invalid import format: missing prompts object');
            return false;
          }

          const validKeys: PromptKey[] = [
            'prdAnalysis',
            'semanticAnalysis',
            'entityExtraction',
            'taskGeneration',
            'erdGeneration',
            'architectureExtraction',
            'taskImplementation',
          ];

          const newCustomPrompts = { ...initialCustomPrompts };

          Object.entries(data.prompts).forEach(([key, value]) => {
            if (validKeys.includes(key as PromptKey) && typeof value === 'string') {
              newCustomPrompts[key as PromptKey] = value;
            }
          });

          set({ customPrompts: newCustomPrompts });
          return true;
        } catch (e) {
          console.error('Failed to import prompts:', e);
          return false;
        }
      },
    }),
    {
      name: 'prd-to-tasks-prompts',
      version: 1,
    }
  )
);
