import { create } from 'zustand';
import type { ProjectFile } from '@/types/prd';
import { generateId } from '@/lib/utils';

export type PhaseNumber = 1 | 2 | 3 | 4;
export type PhaseStatus = 'locked' | 'active' | 'completed' | 'has-issues';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  // Optional attached architecture guide file id
  architectureGuideFileId?: string;
}

interface ProjectState {
  // Current project
  project: Project | null;
  currentPhase: PhaseNumber;
  phaseStatus: Record<PhaseNumber, PhaseStatus>;
  files: ProjectFile[];
  isDirty: boolean;

  // Recent projects
  recentProjects: { id: string; name: string; accessedAt: Date }[];

  // Actions
  createProject: (name: string, description?: string) => void;
  loadProject: (project: Project, files: ProjectFile[]) => void;
  updateProject: (updates: Partial<Project>) => void;
  closeProject: () => void;

  // Phase management
  setPhase: (phase: PhaseNumber) => void;
  setPhaseDirect: (phase: PhaseNumber) => void; // Force-set current phase without guard checks
  setPhaseStatus: (phase: PhaseNumber, status: PhaseStatus) => void;
  canAdvanceToPhase: (phase: PhaseNumber) => boolean;
  advancePhase: () => void;

  // File management
  addFile: (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => string; // returns new file id
  updateFile: (fileId: string, updates: Partial<ProjectFile>) => void;
  removeFile: (fileId: string) => void;
  getFilesByType: (type: ProjectFile['type']) => ProjectFile[];

  // Architecture guide helpers
  setArchitectureGuide: (fileId: string) => void;
  clearArchitectureGuide: () => void;
  getArchitectureGuide: () => ProjectFile | null;

  // State management
  setDirty: (dirty: boolean) => void;
  addRecentProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  // Initial state
  project: null,
  currentPhase: 1,
  phaseStatus: {
    1: 'active',
    2: 'locked',
    3: 'locked',
    4: 'locked',
  },
  files: [],
  isDirty: false,
  recentProjects: [],

  // Actions
  createProject: (name: string, description?: string) => {
    const project: Project = {
      id: generateId(),
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set({
      project,
      currentPhase: 1,
      phaseStatus: {
        1: 'active',
        2: 'locked',
        3: 'locked',
        4: 'locked',
      },
      files: [],
      isDirty: true,
    });

    get().addRecentProject(project);
  },

  loadProject: (project: Project, files: ProjectFile[]) => {
    set({
      project,
      files,
      currentPhase: 1,
      phaseStatus: {
        1: 'active',
        2: 'locked',
        3: 'locked',
        4: 'locked',
      },
      isDirty: false,
    });

    get().addRecentProject(project);
  },

  updateProject: (updates: Partial<Project>) => {
    set(state => ({
      project: state.project ? {
        ...state.project,
        ...updates,
        updatedAt: new Date(),
      } : null,
      isDirty: true,
    }));
  },

  closeProject: () => {
    set({
      project: null,
      currentPhase: 1,
      phaseStatus: {
        1: 'active',
        2: 'locked',
        3: 'locked',
        4: 'locked',
      },
      files: [],
      isDirty: false,
    });
  },

  // Phase management
  setPhase: (phase: PhaseNumber) => {
    const { canAdvanceToPhase } = get();
    if (canAdvanceToPhase(phase)) {
      set({ currentPhase: phase });
    }
  },

  // Force set current phase without performing canAdvance checks
  setPhaseDirect: (phase: PhaseNumber) => {
    set({ currentPhase: phase });
  },

  setPhaseStatus: (phase: PhaseNumber, status: PhaseStatus) => {
    set(state => ({
      phaseStatus: {
        ...state.phaseStatus,
        [phase]: status,
      },
    }));
  },

  canAdvanceToPhase: (phase: PhaseNumber) => {
    const { phaseStatus, currentPhase } = get();

    // Can always go back to completed phases
    if (phase < currentPhase) {
      return phaseStatus[phase] === 'completed' || phaseStatus[phase] === 'active';
    }

    // Can only advance if current phase is completed and target is next
    if (phase === currentPhase + 1) {
      return phaseStatus[currentPhase] === 'completed';
    }

    // Can stay on current phase
    if (phase === currentPhase) {
      return true;
    }

    return false;
  },

  advancePhase: () => {
    const { currentPhase, phaseStatus } = get();

    if (currentPhase < 4 && phaseStatus[currentPhase] === 'completed') {
      const nextPhase = (currentPhase + 1) as PhaseNumber;
      set(state => ({
        currentPhase: nextPhase,
        phaseStatus: {
          ...state.phaseStatus,
          [nextPhase]: 'active',
        },
      }));
    }
  },

  // File management
  addFile: (file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => {
    const newFile: ProjectFile = {
      ...file,
      id: generateId(),
      uploadedAt: new Date(),
    };

    set(state => ({
      files: [...state.files, newFile],
      isDirty: true,
    }));

    // Return the new file id to the caller
    return newFile.id;
  },

  updateFile: (fileId: string, updates: Partial<ProjectFile>) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, ...updates } : f
      ),
      isDirty: true,
    }));
  },

  setArchitectureGuide: (fileId: string) => {
    set(state => ({
      project: state.project ? { ...state.project, architectureGuideFileId: fileId } : null,
      isDirty: true,
    }));
  },

  clearArchitectureGuide: () => {
    set(state => ({
      project: state.project ? { ...state.project, architectureGuideFileId: undefined } : null,
      isDirty: true,
    }));
  },

  getArchitectureGuide: () => {
    const state = get();
    const fileId = state.project?.architectureGuideFileId;
    if (!fileId) return null;
    return state.files.find((f) => f.id === fileId) || null;
  },

  removeFile: (fileId: string) => {
    set(state => ({
      files: state.files.filter(f => f.id !== fileId),
      isDirty: true,
    }));
  },

  getFilesByType: (type: ProjectFile['type']) => {
    return get().files.filter(f => f.type === type);
  },

  // State management
  setDirty: (dirty: boolean) => {
    set({ isDirty: dirty });
  },

  addRecentProject: (project: Project) => {
    set(state => {
      const filtered = state.recentProjects.filter(p => p.id !== project.id);
      const newRecent = [
        { id: project.id, name: project.name, accessedAt: new Date() },
        ...filtered,
      ].slice(0, 10);

      return { recentProjects: newRecent };
    });
  },

  // Replace recent projects (e.g., load from DB)
  setRecentProjects: (recent: { id: string; name: string; accessedAt: Date }[]) => {
    set({ recentProjects: recent.slice(0, 10) });
  },
}));
