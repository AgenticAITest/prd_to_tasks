import { create } from 'zustand';
import { useProjectStore } from '@/store/projectStore';
import type {
  StructuredPRD,
  FunctionalRequirement,
  BusinessRule,
  Screen,
  UserRole,
} from '@/types/prd';
import type { AnalysisResult, BlockingIssue, AnalysisWarning, SemanticAnalysisResult } from '@/types/analysis';
import { generateId } from '@/lib/utils';

interface PRDState {
  // Parsed PRD data
  prd: StructuredPRD | null;
  rawContent: string;

  // Analysis results
  analysisResult: AnalysisResult | null;
  blockingIssues: BlockingIssue[];
  warnings: AnalysisWarning[];

  // Semantic analysis (LLM-powered)
  semanticAnalysisResult: SemanticAnalysisResult | null;
  isSemanticAnalyzing: boolean;
  semanticAnalyzeProgress: number;

  // Processing state
  isLoading: boolean;
  isParsing: boolean;
  isAnalyzing: boolean;
  parseProgress: number;
  analyzeProgress: number;
  error: string | null;

  // Actions
  setRawContent: (content: string) => void;
  setPRD: (prd: StructuredPRD, markDirty?: boolean) => void;
  setAnalysisResult: (result: AnalysisResult, markDirty?: boolean) => void;
  clearPRD: () => void;

  // FR management
  updateFR: (frId: string, updates: Partial<FunctionalRequirement>) => void;
  addFR: (fr: Omit<FunctionalRequirement, 'id'>) => void;
  removeFR: (frId: string) => void;

  // BR management
  updateBR: (brId: string, updates: Partial<BusinessRule>) => void;
  addBR: (br: Omit<BusinessRule, 'id'>, frId: string) => void;
  removeBR: (brId: string) => void;

  // Screen management
  updateScreen: (screenId: string, updates: Partial<Screen>) => void;
  addScreen: (screen: Omit<Screen, 'id'>, frId: string) => void;
  removeScreen: (screenId: string) => void;

  // User role management
  updateUserRole: (roleId: string, updates: Partial<UserRole>) => void;
  addUserRole: (role: Omit<UserRole, 'id'>) => void;
  removeUserRole: (roleId: string) => void;

  // Processing state management
  setLoading: (loading: boolean) => void;
  setParsing: (parsing: boolean, progress?: number) => void;
  setAnalyzing: (analyzing: boolean, progress?: number) => void;
  setSemanticAnalyzing: (analyzing: boolean, progress?: number) => void;
  setSemanticAnalysisResult: (result: SemanticAnalysisResult, markDirty?: boolean) => void;
  clearSemanticAnalysis: () => void;
  setError: (error: string | null) => void;

  // Computed
  getFRById: (frId: string) => FunctionalRequirement | undefined;
  getBRById: (brId: string) => BusinessRule | undefined;
  getScreenById: (screenId: string) => Screen | undefined;
  getAllBusinessRules: () => BusinessRule[];
  getAllScreens: () => Screen[];
  hasBlockingIssues: () => boolean;
  hasSemanticBlockingIssues: () => boolean;
  canProceedToEntities: () => boolean;
}

export const usePRDStore = create<PRDState>()((set, get) => ({
  // Initial state
  prd: null,
  rawContent: '',
  analysisResult: null,
  blockingIssues: [],
  warnings: [],
  semanticAnalysisResult: null,
  isSemanticAnalyzing: false,
  semanticAnalyzeProgress: 0,
  isLoading: false,
  isParsing: false,
  isAnalyzing: false,
  parseProgress: 0,
  analyzeProgress: 0,
  error: null,

  // Actions
  setRawContent: (content: string) => {
    set({ rawContent: content });
  },

  setPRD: (prd: StructuredPRD, markDirty: boolean = true) => {
    set({ prd, error: null });
    if (markDirty) useProjectStore.getState().setDirty(true);
  },

  setAnalysisResult: (result: AnalysisResult, markDirty: boolean = true) => {
    set(state => ({
      analysisResult: result,
      blockingIssues: result.blockingIssues,
      warnings: result.warnings,
      prd: state.prd ? { ...state.prd, analysisResults: result, updatedAt: new Date() } : state.prd,
    }));
    if (markDirty) useProjectStore.getState().setDirty(true);
  },

  clearPRD: () => {
    set({
      prd: null,
      rawContent: '',
      analysisResult: null,
      blockingIssues: [],
      warnings: [],
      semanticAnalysisResult: null,
      isSemanticAnalyzing: false,
      semanticAnalyzeProgress: 0,
      error: null,
    });
  },

  // FR management
  updateFR: (frId: string, updates: Partial<FunctionalRequirement>) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(fr =>
            fr.id === frId ? { ...fr, ...updates } : fr
          ),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  addFR: (fr: Omit<FunctionalRequirement, 'id'>) => {
    const newFR: FunctionalRequirement = {
      ...fr,
      id: `FR-${String(get().prd?.functionalRequirements.length ?? 0 + 1).padStart(3, '0')}`,
    };

    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: [...state.prd.functionalRequirements, newFR],
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  removeFR: (frId: string) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.filter(fr => fr.id !== frId),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  // BR management
  updateBR: (brId: string, updates: Partial<BusinessRule>) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(fr => ({
            ...fr,
            businessRules: fr.businessRules.map(br =>
              br.id === brId ? { ...br, ...updates } : br
            ),
          })),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  addBR: (br: Omit<BusinessRule, 'id'>, frId: string) => {
    set(state => {
      if (!state.prd) return state;
      const fr = state.prd.functionalRequirements.find(f => f.id === frId);
      const brCount = fr?.businessRules.length ?? 0;
      const suffix = String.fromCharCode(65 + brCount); // A, B, C, ...

      const newBR: BusinessRule = {
        ...br,
        id: `BR-${frId.replace('FR-', '')}-${suffix}`,
      };

      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(f =>
            f.id === frId
              ? { ...f, businessRules: [...f.businessRules, newBR] }
              : f
          ),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  removeBR: (brId: string) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(fr => ({
            ...fr,
            businessRules: fr.businessRules.filter(br => br.id !== brId),
          })),
          updatedAt: new Date(),
        },
      };
    });
  },

  // Screen management
  updateScreen: (screenId: string, updates: Partial<Screen>) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(fr => ({
            ...fr,
            screens: fr.screens.map(s =>
              s.id === screenId ? { ...s, ...updates } : s
            ),
          })),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  addScreen: (screen: Omit<Screen, 'id'>, frId: string) => {
    const screensCount = get().getAllScreens().length;
    const newScreen: Screen = {
      ...screen,
      id: `SCR-${String(screensCount + 1).padStart(3, '0')}`,
    };

    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(fr =>
            fr.id === frId
              ? { ...fr, screens: [...fr.screens, newScreen] }
              : fr
          ),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  removeScreen: (screenId: string) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          functionalRequirements: state.prd.functionalRequirements.map(fr => ({
            ...fr,
            screens: fr.screens.filter(s => s.id !== screenId),
          })),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  // User role management
  updateUserRole: (roleId: string, updates: Partial<UserRole>) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          userRoles: state.prd.userRoles.map(role =>
            role.id === roleId ? { ...role, ...updates } : role
          ),
          updatedAt: new Date(),
        },
      };
    });
  },

  addUserRole: (role: Omit<UserRole, 'id'>) => {
    const newRole: UserRole = {
      ...role,
      id: generateId(),
    };

    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          userRoles: [...state.prd.userRoles, newRole],
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  removeUserRole: (roleId: string) => {
    set(state => {
      if (!state.prd) return state;
      return {
        prd: {
          ...state.prd,
          userRoles: state.prd.userRoles.filter(role => role.id !== roleId),
          updatedAt: new Date(),
        },
      };
    });
    useProjectStore.getState().setDirty(true);
  },

  // Processing state management
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setParsing: (parsing: boolean, progress?: number) => {
    set({
      isParsing: parsing,
      parseProgress: progress ?? (parsing ? 0 : 100),
    });
  },

  setAnalyzing: (analyzing: boolean, progress?: number) => {
    set({
      isAnalyzing: analyzing,
      analyzeProgress: progress ?? (analyzing ? 0 : 100),
    });
  },

  setSemanticAnalyzing: (analyzing: boolean, progress?: number) => {
    set({
      isSemanticAnalyzing: analyzing,
      semanticAnalyzeProgress: progress ?? (analyzing ? 0 : 100),
    });
  },

  setSemanticAnalysisResult: (result: SemanticAnalysisResult, markDirty: boolean = true) => {
    set({ semanticAnalysisResult: result });
    if (markDirty) useProjectStore.getState().setDirty(true);
  },

  clearSemanticAnalysis: () => {
    set({
      semanticAnalysisResult: null,
      isSemanticAnalyzing: false,
      semanticAnalyzeProgress: 0,
    });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false, isParsing: false, isAnalyzing: false, isSemanticAnalyzing: false });
  },

  // Computed
  getFRById: (frId: string) => {
    return get().prd?.functionalRequirements.find(fr => fr.id === frId);
  },

  getBRById: (brId: string) => {
    const prd = get().prd;
    if (!prd) return undefined;

    for (const fr of prd.functionalRequirements) {
      const br = fr.businessRules.find(b => b.id === brId);
      if (br) return br;
    }
    return undefined;
  },

  getScreenById: (screenId: string) => {
    const prd = get().prd;
    if (!prd) return undefined;

    for (const fr of prd.functionalRequirements) {
      const screen = fr.screens.find(s => s.id === screenId);
      if (screen) return screen;
    }
    return undefined;
  },

  getAllBusinessRules: () => {
    const prd = get().prd;
    if (!prd) return [];
    return prd.functionalRequirements.flatMap(fr => fr.businessRules);
  },

  getAllScreens: () => {
    const prd = get().prd;
    if (!prd) return [];
    return prd.functionalRequirements.flatMap(fr => fr.screens);
  },

  hasBlockingIssues: () => {
    return get().blockingIssues.length > 0;
  },

  hasSemanticBlockingIssues: () => {
    const semanticResult = get().semanticAnalysisResult;
    if (!semanticResult) return false;
    return semanticResult.overallAssessment.blockingIssues.length > 0;
  },

  canProceedToEntities: () => {
    const state = get();
    // Must have PRD parsed
    if (!state.prd) return false;
    // Must have semantic analysis completed
    if (!state.semanticAnalysisResult) return false;
    // Check if semantic analysis allows proceeding
    return state.semanticAnalysisResult.overallAssessment.canProceed;
  },
}));
