import { create } from 'zustand';
import type {
  StructuredPRD,
  FunctionalRequirement,
  BusinessRule,
  Screen,
  UserRole,
} from '@/types/prd';
import type { AnalysisResult, BlockingIssue, AnalysisWarning } from '@/types/analysis';
import { generateId } from '@/lib/utils';

interface PRDState {
  // Parsed PRD data
  prd: StructuredPRD | null;
  rawContent: string;

  // Analysis results
  analysisResult: AnalysisResult | null;
  blockingIssues: BlockingIssue[];
  warnings: AnalysisWarning[];

  // Processing state
  isLoading: boolean;
  isParsing: boolean;
  isAnalyzing: boolean;
  parseProgress: number;
  analyzeProgress: number;
  error: string | null;

  // Actions
  setRawContent: (content: string) => void;
  setPRD: (prd: StructuredPRD) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
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
  setError: (error: string | null) => void;

  // Computed
  getFRById: (frId: string) => FunctionalRequirement | undefined;
  getBRById: (brId: string) => BusinessRule | undefined;
  getScreenById: (screenId: string) => Screen | undefined;
  getAllBusinessRules: () => BusinessRule[];
  getAllScreens: () => Screen[];
  hasBlockingIssues: () => boolean;
}

export const usePRDStore = create<PRDState>()((set, get) => ({
  // Initial state
  prd: null,
  rawContent: '',
  analysisResult: null,
  blockingIssues: [],
  warnings: [],
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

  setPRD: (prd: StructuredPRD) => {
    set({ prd, error: null });
  },

  setAnalysisResult: (result: AnalysisResult) => {
    set({
      analysisResult: result,
      blockingIssues: result.blockingIssues,
      warnings: result.warnings,
    });
  },

  clearPRD: () => {
    set({
      prd: null,
      rawContent: '',
      analysisResult: null,
      blockingIssues: [],
      warnings: [],
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

  setError: (error: string | null) => {
    set({ error, isLoading: false, isParsing: false, isAnalyzing: false });
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
}));
