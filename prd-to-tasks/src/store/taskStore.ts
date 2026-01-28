import { create } from 'zustand';
import { useProjectStore } from '@/store/projectStore';
import { persist } from 'zustand/middleware';
import type {
  TaskSet,
  ProgrammableTask,
  TaskType,
  TaskTier,
  TaskSummary,
  TaskExportOptions,
} from '@/types/task';

interface TaskState {
  // Task data
  taskSet: TaskSet | null;
  tasks: ProgrammableTask[];
  summary: TaskSummary | null;

  // Filtering
  filters: TaskFilters;
  searchQuery: string;

  // Selected state
  selectedTaskId: string | null;

  // Processing state
  isGenerating: boolean;
  generateProgress: number;
  error: string | null;

  // Actions
  setTaskSet: (taskSet: TaskSet) => void;
  updateTask: (taskId: string, updates: Partial<ProgrammableTask>) => void;
  setTaskStatus: (taskId: string, status: ProgrammableTask['status']) => void;

  // Filtering
  setFilters: (filters: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;

  // Selection
  selectTask: (taskId: string | null) => void;

  // Processing state
  setGenerating: (generating: boolean, progress?: number) => void;
  setError: (error: string | null) => void;

  // Clear
  clearTasks: () => void;

  // Computed
  getFilteredTasks: () => ProgrammableTask[];
  getTaskById: (taskId: string) => ProgrammableTask | undefined;
  getTasksByType: (type: TaskType) => ProgrammableTask[];
  getTasksByTier: (tier: TaskTier) => ProgrammableTask[];
  getTasksByModule: (module: string) => ProgrammableTask[];
  getTaskDependencies: (taskId: string) => ProgrammableTask[];
  getTaskDependents: (taskId: string) => ProgrammableTask[];
  getSelectedTask: () => ProgrammableTask | undefined;

  // Export
  exportTasks: (options: TaskExportOptions) => string;
}

interface TaskFilters {
  types: TaskType[];
  tiers: TaskTier[];
  modules: string[];
  priorities: string[];
  statuses: string[];
}

const defaultFilters: TaskFilters = {
  types: [],
  tiers: [],
  modules: [],
  priorities: [],
  statuses: [],
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
  // Initial state
  taskSet: null,
  tasks: [],
  summary: null,
  filters: defaultFilters,
  searchQuery: '',
  selectedTaskId: null,
  isGenerating: false,
  generateProgress: 0,
  error: null,

  // Actions
  setTaskSet: (taskSet: TaskSet) => {
    console.log('[taskStore] setTaskSet called with', taskSet.tasks.length, 'tasks');
    set({
      taskSet,
      tasks: taskSet.tasks,
      summary: taskSet.summary,
      error: null,
    });

    // Mark project dirty so save actions become enabled
    useProjectStore.getState().setDirty(true);
    console.log('[taskStore] setTaskSet complete');
  },

  updateTask: (taskId: string, updates: Partial<ProgrammableTask>) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  },

  setTaskStatus: (taskId: string, status: ProgrammableTask['status']) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, status } : t
      ),
    }));
  },

  // Filtering
  setFilters: (filters: Partial<TaskFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: defaultFilters, searchQuery: '' });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // Selection
  selectTask: (taskId: string | null) => {
    set({ selectedTaskId: taskId });
  },

  // Processing state
  setGenerating: (generating: boolean, progress?: number) => {
    set({
      isGenerating: generating,
      generateProgress: progress ?? (generating ? 0 : 100),
    });
  },

  setError: (error: string | null) => {
    set({ error, isGenerating: false });
  },

  // Clear
  clearTasks: () => {
    set({
      taskSet: null,
      tasks: [],
      summary: null,
      selectedTaskId: null,
      error: null,
    });
  },

  // Computed
  getFilteredTasks: () => {
    const { tasks, filters, searchQuery } = get();

    return tasks.filter(task => {
      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(task.type)) {
        return false;
      }

      // Tier filter
      if (filters.tiers.length > 0 && !filters.tiers.includes(task.tier)) {
        return false;
      }

      // Module filter
      if (filters.modules.length > 0 && !filters.modules.includes(task.module)) {
        return false;
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && task.status && !filters.statuses.includes(task.status)) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.id.toLowerCase().includes(query) ||
          task.specification.objective.toLowerCase().includes(query)
        );
      }

      return true;
    });
  },

  getTaskById: (taskId: string) => {
    return get().tasks.find(t => t.id === taskId);
  },

  getTasksByType: (type: TaskType) => {
    return get().tasks.filter(t => t.type === type);
  },

  getTasksByTier: (tier: TaskTier) => {
    return get().tasks.filter(t => t.tier === tier);
  },

  getTasksByModule: (module: string) => {
    return get().tasks.filter(t => t.module === module);
  },

  getTaskDependencies: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return [];
    return get().tasks.filter(t => task.dependencies.includes(t.id));
  },

  getTaskDependents: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || !task.dependents) return [];
    return get().tasks.filter(t => task.dependents!.includes(t.id));
  },

  getSelectedTask: () => {
    const { selectedTaskId, tasks } = get();
    if (!selectedTaskId) return undefined;
    return tasks.find(t => t.id === selectedTaskId);
  },

  // Export
  exportTasks: (options: TaskExportOptions) => {
    const { tasks, taskSet } = get();

    // Apply filters
    let filteredTasks = tasks;

    if (options.filterByType?.length) {
      filteredTasks = filteredTasks.filter(t => options.filterByType!.includes(t.type));
    }

    if (options.filterByTier?.length) {
      filteredTasks = filteredTasks.filter(t => options.filterByTier!.includes(t.tier));
    }

    if (options.filterByModule?.length) {
      filteredTasks = filteredTasks.filter(t => options.filterByModule!.includes(t.module));
    }

    // Group tasks
    let groupedTasks: Record<string, ProgrammableTask[]> = {};

    if (options.groupBy === 'none') {
      groupedTasks = { all: filteredTasks };
    } else {
      filteredTasks.forEach(task => {
        const key = task[options.groupBy as keyof ProgrammableTask] as string;
        if (!groupedTasks[key]) {
          groupedTasks[key] = [];
        }
        groupedTasks[key].push(task);
      });
    }

    // Format output
    const output = {
      ...(options.includeMetadata && taskSet ? {
        metadata: taskSet.metadata,
        summary: taskSet.summary,
      } : {}),
      tasks: groupedTasks,
    };

    switch (options.format) {
      case 'json':
        return JSON.stringify(output, null, 2);

      case 'yaml':
        // Simple YAML conversion (for proper YAML, would need a library)
        return toYAML(output);

      case 'markdown':
        return toMarkdown(groupedTasks, options);

      default:
        return JSON.stringify(output, null, 2);
    }
  },
}),
    {
      name: 'prd-to-tasks-tasks',
      partialize: (state) => ({
        taskSet: state.taskSet,
        tasks: state.tasks,
        summary: state.summary,
      }),
      onRehydrateStorage: () => {
        console.log('[taskStore] Starting hydration from localStorage...');
        return (state, error) => {
          if (error) {
            console.error('[taskStore] Hydration error:', error);
          } else {
            console.log('[taskStore] Hydration complete. Tasks:', state?.tasks?.length ?? 0);
          }
        };
      },
    }
  )
);

// Helper functions for export
function toYAML(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':')) {
      return `|\n${obj.split('\n').map(line => spaces + '  ' + line).join('\n')}`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${spaces}- ${toYAML(item, indent + 1).trimStart()}`).join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, value]) => {
        const valueStr = toYAML(value, indent + 1);
        if (typeof value === 'object' && value !== null) {
          return `${spaces}${key}:\n${valueStr}`;
        }
        return `${spaces}${key}: ${valueStr}`;
      })
      .join('\n');
  }

  return String(obj);
}

function toMarkdown(
  groupedTasks: Record<string, ProgrammableTask[]>,
  options: TaskExportOptions
): string {
  let md = '# Generated Tasks\n\n';

  for (const [group, tasks] of Object.entries(groupedTasks)) {
    if (options.groupBy !== 'none') {
      md += `## ${group}\n\n`;
    }

    for (const task of tasks) {
      md += `### ${task.id}: ${task.title}\n\n`;
      md += `**Type:** ${task.type} | **Tier:** ${task.tier} | **Priority:** ${task.priority}\n\n`;
      md += `**Objective:** ${task.specification.objective}\n\n`;
      md += `**Context:** ${task.specification.context}\n\n`;

      if (task.specification.requirements.length > 0) {
        md += '**Requirements:**\n';
        task.specification.requirements.forEach(req => {
          md += `- ${req}\n`;
        });
        md += '\n';
      }

      if (task.acceptanceCriteria.length > 0) {
        md += '**Acceptance Criteria:**\n';
        task.acceptanceCriteria.forEach(ac => {
          md += `- ${ac}\n`;
        });
        md += '\n';
      }

      if (options.includeTestCases && task.testCases?.length) {
        md += '**Test Cases:**\n';
        task.testCases.forEach(tc => {
          md += `- **${tc.name}:** Given ${tc.given}, when ${tc.when}, then ${tc.then}\n`;
        });
        md += '\n';
      }

      md += '---\n\n';
    }
  }

  return md;
}
