import { create } from 'zustand';
import type {
  Environment,
  EnvironmentStatus,
  EnvironmentCreationStep,
  NeonEnvironment,
  GitHubEnvironment,
  GitpodEnvironment,
} from '@/types/environment';
import { generateId } from '@/lib/utils';

interface EnvironmentState {
  // Environment data
  environment: Environment | null;

  // Creation state
  isCreating: boolean;
  createProgress: number;
  createStep: EnvironmentCreationStep;
  error: string | null;

  // Execution mode flag - controls app layout switch
  isExecutionMode: boolean;

  // Actions
  setEnvironment: (environment: Environment | null) => void;
  createEnvironment: (projectId: string, projectName: string) => string;
  updateEnvironmentStatus: (status: EnvironmentStatus) => void;
  setNeonEnvironment: (neon: NeonEnvironment) => void;
  setGitHubEnvironment: (github: GitHubEnvironment) => void;
  setGitpodEnvironment: (gitpod: GitpodEnvironment) => void;

  // Progress
  setCreating: (isCreating: boolean, progress?: number, step?: EnvironmentCreationStep) => void;
  setProgress: (progress: number, step: EnvironmentCreationStep, message?: string) => void;
  setError: (error: string | null) => void;

  // Execution mode
  enterExecutionMode: () => void;
  exitExecutionMode: () => void;

  // Clear
  clearEnvironment: () => void;
}

export const useEnvironmentStore = create<EnvironmentState>()((set) => ({
  // Initial state
  environment: null,
  isCreating: false,
  createProgress: 0,
  createStep: 'idle',
  error: null,
  isExecutionMode: false,

  // Actions
  setEnvironment: (environment: Environment | null) => {
    set({ environment });
  },

  createEnvironment: (projectId: string, projectName: string) => {
    const id = generateId();
    const environment: Environment = {
      id,
      projectId,
      projectName,
      status: 'creating',
      createdAt: new Date(),
    };
    set({
      environment,
      isCreating: true,
      createProgress: 0,
      createStep: 'idle',
      error: null,
    });
    return id;
  },

  updateEnvironmentStatus: (status: EnvironmentStatus) => {
    set((state) => ({
      environment: state.environment
        ? { ...state.environment, status }
        : null,
    }));
  },

  setNeonEnvironment: (neon: NeonEnvironment) => {
    set((state) => ({
      environment: state.environment
        ? { ...state.environment, neon }
        : null,
    }));
  },

  setGitHubEnvironment: (github: GitHubEnvironment) => {
    set((state) => ({
      environment: state.environment
        ? { ...state.environment, github }
        : null,
    }));
  },

  setGitpodEnvironment: (gitpod: GitpodEnvironment) => {
    set((state) => ({
      environment: state.environment
        ? { ...state.environment, gitpod }
        : null,
    }));
  },

  // Progress
  setCreating: (isCreating: boolean, progress?: number, step?: EnvironmentCreationStep) => {
    set({
      isCreating,
      createProgress: progress ?? (isCreating ? 0 : 100),
      createStep: step ?? (isCreating ? 'idle' : 'complete'),
    });
  },

  setProgress: (progress: number, step: EnvironmentCreationStep) => {
    set({
      createProgress: progress,
      createStep: step,
    });
  },

  setError: (error: string | null) => {
    set((state) => ({
      error,
      isCreating: false,
      createStep: error ? 'error' : state.createStep,
      environment: state.environment
        ? { ...state.environment, status: error ? 'error' : state.environment.status, error: error || undefined }
        : null,
    }));
  },

  // Execution mode
  enterExecutionMode: () => {
    set({ isExecutionMode: true });
  },

  exitExecutionMode: () => {
    set({ isExecutionMode: false });
  },

  // Clear
  clearEnvironment: () => {
    set({
      environment: null,
      isCreating: false,
      createProgress: 0,
      createStep: 'idle',
      error: null,
      isExecutionMode: false,
    });
  },
}));
