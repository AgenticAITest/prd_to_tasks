import { create } from 'zustand';

export type TaskExecutionStatus =
  | 'pending'
  | 'generating'
  | 'review'
  | 'approved'
  | 'committed'
  | 'error'
  | 'skipped'        // For tasks with executionMode='skip' (already scaffolded)
  | 'manual-pending' // For tasks with executionMode='manual' that need user action
  | 'manual-complete'; // For manual tasks that user has marked as done

export interface GeneratedCodeFile {
  path: string;
  content: string;
  language: string;
  taskId: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type AutoExecuteStatus = 'idle' | 'running' | 'paused-manual' | 'paused-error' | 'completed';

interface ExecutionState {
  // Task execution tracking
  selectedTaskId: string | null;
  taskExecutionStatus: Record<string, TaskExecutionStatus>;

  // Code generation
  generatedFiles: GeneratedCodeFile[];
  isGenerating: boolean;
  generationProgress: number;
  generationError: string | null;
  currentGeneratingTaskId: string | null;

  // File tabs
  activeFileIndex: number;

  // Auto-execute state
  autoExecuteStatus: AutoExecuteStatus;
  autoExecuteCurrentTaskId: string | null;
  autoExecuteProgress: { completed: number; total: number };
  autoExecuteError: string | null;
  autoExecuteLog: Array<{ taskId: string; status: 'success' | 'error' | 'skipped'; message: string; timestamp: Date }>;

  // Actions
  selectTask: (taskId: string | null) => void;

  // Task status
  setTaskStatus: (taskId: string, status: TaskExecutionStatus) => void;
  getTaskStatus: (taskId: string) => TaskExecutionStatus;

  // Code generation
  startGeneration: (taskId: string) => void;
  setGenerationProgress: (progress: number) => void;
  setGeneratedFiles: (files: GeneratedCodeFile[]) => void;
  addGeneratedFile: (file: GeneratedCodeFile) => void;
  setGenerationError: (error: string | null) => void;
  finishGeneration: () => void;

  // File approval
  approveFile: (fileIndex: number) => void;
  rejectFile: (fileIndex: number) => void;
  approveAllFiles: () => void;
  getApprovedFiles: () => GeneratedCodeFile[];
  getPendingFiles: () => GeneratedCodeFile[];

  // Tab management
  setActiveFile: (index: number) => void;

  // Task completion
  markTaskCommitted: (taskId: string) => void;
  markTaskError: (taskId: string, error: string) => void;

  // Manual/Skip task handling
  markTaskSkipped: (taskId: string) => void;
  markManualTaskComplete: (taskId: string) => void;
  initializeTaskStatus: (taskId: string, executionMode: 'code-generation' | 'manual' | 'skip') => void;

  // Reset
  clearGeneratedFiles: () => void;
  resetExecution: () => void;

  // Auto-execute actions
  startAutoExecute: (totalTasks: number) => void;
  setAutoExecuteTask: (taskId: string, completed: number) => void;
  pauseAutoExecuteForManual: (taskId: string) => void;
  pauseAutoExecuteForError: (taskId: string, error: string) => void;
  resumeAutoExecute: () => void;
  stopAutoExecute: () => void;
  completeAutoExecute: () => void;
  addAutoExecuteLog: (taskId: string, status: 'success' | 'error' | 'skipped', message: string) => void;
  clearAutoExecuteLog: () => void;
}

export const useExecutionStore = create<ExecutionState>()((set, get) => ({
  // Initial state
  selectedTaskId: null,
  taskExecutionStatus: {},
  generatedFiles: [],
  isGenerating: false,
  generationProgress: 0,
  generationError: null,
  currentGeneratingTaskId: null,
  activeFileIndex: 0,

  // Auto-execute initial state
  autoExecuteStatus: 'idle' as AutoExecuteStatus,
  autoExecuteCurrentTaskId: null,
  autoExecuteProgress: { completed: 0, total: 0 },
  autoExecuteError: null,
  autoExecuteLog: [],

  // Actions
  selectTask: (taskId: string | null) => {
    set({
      selectedTaskId: taskId,
      activeFileIndex: 0,
    });
  },

  // Task status
  setTaskStatus: (taskId: string, status: TaskExecutionStatus) => {
    set((state) => ({
      taskExecutionStatus: {
        ...state.taskExecutionStatus,
        [taskId]: status,
      },
    }));
  },

  getTaskStatus: (taskId: string): TaskExecutionStatus => {
    return get().taskExecutionStatus[taskId] || 'pending';
  },

  // Code generation
  startGeneration: (taskId: string) => {
    set({
      isGenerating: true,
      generationProgress: 0,
      generationError: null,
      currentGeneratingTaskId: taskId,
      generatedFiles: [],
      activeFileIndex: 0,
    });
    get().setTaskStatus(taskId, 'generating');
  },

  setGenerationProgress: (progress: number) => {
    set({ generationProgress: progress });
  },

  setGeneratedFiles: (files: GeneratedCodeFile[]) => {
    set({ generatedFiles: files });
  },

  addGeneratedFile: (file: GeneratedCodeFile) => {
    set((state) => ({
      generatedFiles: [...state.generatedFiles, file],
    }));
  },

  setGenerationError: (error: string | null) => {
    const { currentGeneratingTaskId } = get();
    set({
      generationError: error,
      isGenerating: false,
    });
    if (error && currentGeneratingTaskId) {
      get().setTaskStatus(currentGeneratingTaskId, 'error');
    }
  },

  finishGeneration: () => {
    const { currentGeneratingTaskId } = get();
    set({
      isGenerating: false,
      generationProgress: 100,
    });
    if (currentGeneratingTaskId) {
      get().setTaskStatus(currentGeneratingTaskId, 'review');
    }
  },

  // File approval
  approveFile: (fileIndex: number) => {
    set((state) => ({
      generatedFiles: state.generatedFiles.map((file, i) =>
        i === fileIndex ? { ...file, status: 'approved' as const } : file
      ),
    }));
  },

  rejectFile: (fileIndex: number) => {
    set((state) => ({
      generatedFiles: state.generatedFiles.map((file, i) =>
        i === fileIndex ? { ...file, status: 'rejected' as const } : file
      ),
    }));
  },

  approveAllFiles: () => {
    set((state) => ({
      generatedFiles: state.generatedFiles.map((file) => ({
        ...file,
        status: 'approved' as const,
      })),
    }));
  },

  getApprovedFiles: () => {
    return get().generatedFiles.filter((f) => f.status === 'approved');
  },

  getPendingFiles: () => {
    return get().generatedFiles.filter((f) => f.status === 'pending');
  },

  // Tab management
  setActiveFile: (index: number) => {
    set({ activeFileIndex: index });
  },

  // Task completion
  markTaskCommitted: (taskId: string) => {
    set((state) => ({
      taskExecutionStatus: {
        ...state.taskExecutionStatus,
        [taskId]: 'committed',
      },
      generatedFiles: [],
      currentGeneratingTaskId: null,
    }));
  },

  markTaskError: (taskId: string) => {
    set((state) => ({
      taskExecutionStatus: {
        ...state.taskExecutionStatus,
        [taskId]: 'error',
      },
    }));
  },

  // Manual/Skip task handling
  markTaskSkipped: (taskId: string) => {
    set((state) => ({
      taskExecutionStatus: {
        ...state.taskExecutionStatus,
        [taskId]: 'skipped',
      },
    }));
  },

  markManualTaskComplete: (taskId: string) => {
    set((state) => ({
      taskExecutionStatus: {
        ...state.taskExecutionStatus,
        [taskId]: 'manual-complete',
      },
    }));
  },

  initializeTaskStatus: (taskId: string, executionMode: 'code-generation' | 'manual' | 'skip') => {
    const currentStatus = get().taskExecutionStatus[taskId];
    // Don't override if already set
    if (currentStatus) return;

    let status: TaskExecutionStatus = 'pending';
    if (executionMode === 'skip') {
      status = 'skipped';
    } else if (executionMode === 'manual') {
      status = 'manual-pending';
    }

    set((state) => ({
      taskExecutionStatus: {
        ...state.taskExecutionStatus,
        [taskId]: status,
      },
    }));
  },

  // Reset
  clearGeneratedFiles: () => {
    set({
      generatedFiles: [],
      activeFileIndex: 0,
      generationError: null,
    });
  },

  resetExecution: () => {
    set({
      selectedTaskId: null,
      taskExecutionStatus: {},
      generatedFiles: [],
      isGenerating: false,
      generationProgress: 0,
      generationError: null,
      currentGeneratingTaskId: null,
      activeFileIndex: 0,
      autoExecuteStatus: 'idle',
      autoExecuteCurrentTaskId: null,
      autoExecuteProgress: { completed: 0, total: 0 },
      autoExecuteError: null,
      autoExecuteLog: [],
    });
  },

  // Auto-execute actions
  startAutoExecute: (totalTasks: number) => {
    set({
      autoExecuteStatus: 'running',
      autoExecuteCurrentTaskId: null,
      autoExecuteProgress: { completed: 0, total: totalTasks },
      autoExecuteError: null,
      autoExecuteLog: [],
    });
  },

  setAutoExecuteTask: (taskId: string, completed: number) => {
    set((state) => ({
      autoExecuteCurrentTaskId: taskId,
      selectedTaskId: taskId,
      autoExecuteProgress: { ...state.autoExecuteProgress, completed },
    }));
  },

  pauseAutoExecuteForManual: (taskId: string) => {
    set({
      autoExecuteStatus: 'paused-manual',
      autoExecuteCurrentTaskId: taskId,
      selectedTaskId: taskId,
    });
  },

  pauseAutoExecuteForError: (taskId: string, error: string) => {
    set({
      autoExecuteStatus: 'paused-error',
      autoExecuteCurrentTaskId: taskId,
      autoExecuteError: error,
      selectedTaskId: taskId,
    });
  },

  resumeAutoExecute: () => {
    set({
      autoExecuteStatus: 'running',
      autoExecuteError: null,
    });
  },

  stopAutoExecute: () => {
    set({
      autoExecuteStatus: 'idle',
      autoExecuteCurrentTaskId: null,
      autoExecuteError: null,
    });
  },

  completeAutoExecute: () => {
    set({
      autoExecuteStatus: 'completed',
      autoExecuteCurrentTaskId: null,
    });
  },

  addAutoExecuteLog: (taskId: string, status: 'success' | 'error' | 'skipped', message: string) => {
    set((state) => ({
      autoExecuteLog: [
        ...state.autoExecuteLog,
        { taskId, status, message, timestamp: new Date() },
      ],
    }));
  },

  clearAutoExecuteLog: () => {
    set({ autoExecuteLog: [] });
  },
}));
