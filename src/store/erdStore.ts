import { create } from 'zustand';
import type {
  ERDSchema,
  ERDValidationResult,
  StandardsEnforcementResult,
  DBMLGenerationOptions,
} from '@/types/erd';

interface ERDState {
  // ERD data
  schema: ERDSchema | null;
  dbml: string;

  // Validation
  validationResult: ERDValidationResult | null;
  standardsResult: StandardsEnforcementResult | null;

  // Generation options
  generationOptions: DBMLGenerationOptions;

  // Processing state
  isGenerating: boolean;
  isValidating: boolean;
  generateProgress: number;
  error: string | null;

  // Actions
  setSchema: (schema: ERDSchema) => void;
  setDBML: (dbml: string) => void;
  setValidationResult: (result: ERDValidationResult) => void;
  setStandardsResult: (result: StandardsEnforcementResult) => void;
  updateGenerationOptions: (options: Partial<DBMLGenerationOptions>) => void;

  // Processing state
  setGenerating: (generating: boolean, progress?: number) => void;
  setValidating: (validating: boolean) => void;
  setError: (error: string | null) => void;

  // Clear
  clearERD: () => void;

  // Export
  exportDBML: () => string;
}

const defaultGenerationOptions: DBMLGenerationOptions = {
  includeComments: true,
  includeIndexes: true,
  includeEnums: true,
  includeNotes: true,
  groupByModule: false,
};

export const useERDStore = create<ERDState>()((set, get) => ({
  // Initial state
  schema: null,
  dbml: '',
  validationResult: null,
  standardsResult: null,
  generationOptions: defaultGenerationOptions,
  isGenerating: false,
  isValidating: false,
  generateProgress: 0,
  error: null,

  // Actions
  setSchema: (schema: ERDSchema) => {
    set({ schema, dbml: schema.dbml, error: null });
  },

  setDBML: (dbml: string) => {
    set({ dbml });
  },

  setValidationResult: (result: ERDValidationResult) => {
    set({ validationResult: result });
  },

  setStandardsResult: (result: StandardsEnforcementResult) => {
    set({ standardsResult: result });
  },

  updateGenerationOptions: (options: Partial<DBMLGenerationOptions>) => {
    set(state => ({
      generationOptions: { ...state.generationOptions, ...options },
    }));
  },

  // Processing state
  setGenerating: (generating: boolean, progress?: number) => {
    set({
      isGenerating: generating,
      generateProgress: progress ?? (generating ? 0 : 100),
    });
  },

  setValidating: (validating: boolean) => {
    set({ isValidating: validating });
  },

  setError: (error: string | null) => {
    set({ error, isGenerating: false, isValidating: false });
  },

  // Clear
  clearERD: () => {
    set({
      schema: null,
      dbml: '',
      validationResult: null,
      standardsResult: null,
      error: null,
    });
  },

  // Export
  exportDBML: () => {
    return get().dbml;
  },
}));
