/**
 * Batch Generation Store
 * Manages batch code generation with IndexedDB persistence
 */

import { generateCodeForTask } from '@/core/code-generator';
import { pushFilesToRepo } from '@/core/environment/github-client';
import {
  approveAllFilesForTask,
  clearGeneratedFilesForProject,
  clearTaskStatusForProject,
  getAllTaskStatus,
  getApprovedGeneratedFiles,
  getGeneratedFilesForProject,
  getGeneratedFilesSummary,
  markFilesCommitted,
  saveGeneratedFile,
  saveTaskStatus
} from '@/db/database';
import type { Entity, Relationship } from '@/types/entity';
import type { GeneratedFile as EnvironmentGeneratedFile } from '@/types/environment';
import type { ProgrammableTask } from '@/types/task';
import { toast } from 'sonner';
import { create } from 'zustand';

export type BatchStatus = 'idle' | 'generating' | 'paused' | 'completed' | 'pushing' | 'error';
export type TaskGenStatus = 'pending' | 'generating' | 'generated' | 'approved' | 'committed' | 'error' | 'skipped' | 'manual-pending' | 'manual-complete';

interface BatchGenerationState {
  // Status
  status: BatchStatus;
  currentTaskId: string | null;
  currentTaskIndex: number;
  totalTasks: number;
  error: string | null;

  // Progress
  generatedCount: number;
  approvedCount: number;
  committedCount: number;

  // Task status map (in-memory cache, synced with IndexedDB)
  taskStatusMap: Record<string, TaskGenStatus>;

  // Files summary
  totalFiles: number;
  pendingFiles: number;
  approvedFiles: number;

  // Actions
  startBatchGeneration: (
    projectId: string,
    tasks: ProgrammableTask[],
    context: {
      projectName: string;
      entities: Entity[];
      relationships: Relationship[];
      dbml: string;
    }
  ) => Promise<void>;

  pauseBatchGeneration: () => void;
  resumeBatchGeneration: () => void;
  stopBatchGeneration: () => void;

  approveTaskFiles: (projectId: string, taskId: string) => Promise<void>;
  approveAllPendingFiles: (projectId: string) => Promise<void>;

  pushAllToGitHub: (
    projectId: string,
    githubToken: string,
    owner: string,
    repo: string,
    branch: string
  ) => Promise<void>;

  loadFromDB: (projectId: string) => Promise<void>;
  clearAll: (projectId: string) => Promise<void>;
  refreshSummary: (projectId: string) => Promise<void>;
}

export const useBatchGenerationStore = create<BatchGenerationState>()((set, get) => ({
  // Initial state
  status: 'idle',
  currentTaskId: null,
  currentTaskIndex: 0,
  totalTasks: 0,
  error: null,

  generatedCount: 0,
  approvedCount: 0,
  committedCount: 0,

  taskStatusMap: {},

  totalFiles: 0,
  pendingFiles: 0,
  approvedFiles: 0,

  // Load existing state from IndexedDB
  loadFromDB: async (projectId: string) => {
    try {
      const taskStatuses = await getAllTaskStatus(projectId);
      const taskStatusMap: Record<string, TaskGenStatus> = {};

      taskStatuses.forEach(ts => {
        taskStatusMap[ts.taskId] = ts.status as TaskGenStatus;
      });

      const summary = await getGeneratedFilesSummary(projectId);

      set({
        taskStatusMap,
        totalFiles: summary.total,
        pendingFiles: summary.pending,
        approvedFiles: summary.approved,
        generatedCount: Object.values(taskStatusMap).filter(s =>
          s === 'generated' || s === 'approved' || s === 'committed'
        ).length,
        approvedCount: Object.values(taskStatusMap).filter(s => s === 'approved').length,
        committedCount: Object.values(taskStatusMap).filter(s => s === 'committed').length,
      });
    } catch (error) {
      console.error('[BatchGeneration] Failed to load from DB:', error);
    }
  },

  // Start batch generation
  startBatchGeneration: async (projectId, tasks, context) => {
    const { status } = get();
    if (status === 'generating') return;

    set({
      status: 'generating',
      currentTaskIndex: 0,
      totalTasks: tasks.length,
      error: null,
    });

    const abortController = { aborted: false };
    (window as unknown as { __batchAbort?: { aborted: boolean } }).__batchAbort = abortController;

    // Filter tasks that need code generation
    const codeTasks = tasks.filter(t =>
      t.executionMode === 'code-generation' || !t.executionMode
    );

    let generatedCount = get().generatedCount;

    for (let i = 0; i < codeTasks.length; i++) {
      if (abortController.aborted) {
        set({ status: 'paused' });
        toast.info('Batch generation paused');
        return;
      }

      const task = codeTasks[i];

      // Skip already generated tasks
      const currentStatus = get().taskStatusMap[task.id];
      if (currentStatus === 'generated' || currentStatus === 'approved' || currentStatus === 'committed') {
        continue;
      }

      set({
        currentTaskId: task.id,
        currentTaskIndex: i + 1,
      });

      // Update task status to generating
      await saveTaskStatus({
        projectId,
        taskId: task.id,
        status: 'generating',
      });
      set(state => ({
        taskStatusMap: { ...state.taskStatusMap, [task.id]: 'generating' },
      }));

      console.log(`[BatchGeneration] Generating task ${i + 1}/${codeTasks.length}: ${task.title}`);
      toast.loading(`Generating ${i + 1}/${codeTasks.length}: ${task.title}`, { id: 'batch-progress' });

      try {
        const result = await generateCodeForTask({
          task,
          projectName: context.projectName,
          entities: context.entities,
          relationships: context.relationships,
          dbml: context.dbml,
          onProgress: (progress, message) => {
            console.log(`[BatchGeneration]   [${progress}%] ${message}`);
          },
        });

        if (result.success && result.files.length > 0) {
          // Save generated files to IndexedDB
          for (const file of result.files) {
            await saveGeneratedFile({
              projectId,
              taskId: task.id,
              path: file.path,
              content: file.content,
              language: file.language,
              status: 'pending',
            });
          }

          // Update task status
          await saveTaskStatus({
            projectId,
            taskId: task.id,
            status: 'generated',
          });

          generatedCount++;
          set(state => ({
            taskStatusMap: { ...state.taskStatusMap, [task.id]: 'generated' },
            generatedCount,
            totalFiles: state.totalFiles + result.files.length,
            pendingFiles: state.pendingFiles + result.files.length,
          }));

          console.log(`[BatchGeneration]   ✓ Generated ${result.files.length} file(s)`);
        } else {
          // Mark as error
          await saveTaskStatus({
            projectId,
            taskId: task.id,
            status: 'error',
            error: result.error || 'No files generated',
          });
          set(state => ({
            taskStatusMap: { ...state.taskStatusMap, [task.id]: 'error' },
          }));
          console.log(`[BatchGeneration]   ✗ Failed: ${result.error}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        await saveTaskStatus({
          projectId,
          taskId: task.id,
          status: 'error',
          error: message,
        });
        set(state => ({
          taskStatusMap: { ...state.taskStatusMap, [task.id]: 'error' },
        }));
        console.log(`[BatchGeneration]   ✗ Error: ${message}`);
      }
    }

    toast.dismiss('batch-progress');
    toast.success(`Batch generation complete! ${generatedCount} tasks generated.`);
    set({
      status: 'completed',
      currentTaskId: null,
    });
  },

  pauseBatchGeneration: () => {
    const abort = (window as unknown as { __batchAbort?: { aborted: boolean } }).__batchAbort;
    if (abort) abort.aborted = true;
    set({ status: 'paused' });
  },

  resumeBatchGeneration: () => {
    // Will be called with startBatchGeneration again with remaining tasks
    set({ status: 'idle' });
  },

  stopBatchGeneration: () => {
    const abort = (window as unknown as { __batchAbort?: { aborted: boolean } }).__batchAbort;
    if (abort) abort.aborted = true;
    set({
      status: 'idle',
      currentTaskId: null,
      error: null,
    });
    toast.info('Batch generation stopped');
  },

  // Approve files for a task
  approveTaskFiles: async (projectId, taskId) => {
    await approveAllFilesForTask(projectId, taskId);
    await saveTaskStatus({
      projectId,
      taskId,
      status: 'approved',
    });

    const files = await getGeneratedFilesForProject(projectId);
    const taskFiles = files.filter(f => f.taskId === taskId);

    set(state => ({
      taskStatusMap: { ...state.taskStatusMap, [taskId]: 'approved' },
      approvedCount: state.approvedCount + 1,
      pendingFiles: state.pendingFiles - taskFiles.length,
      approvedFiles: state.approvedFiles + taskFiles.length,
    }));
  },

  // Approve all pending files
  approveAllPendingFiles: async (projectId) => {
    const files = await getGeneratedFilesForProject(projectId);
    const pendingTaskIds = [...new Set(files.filter(f => f.status === 'pending').map(f => f.taskId))];

    for (const taskId of pendingTaskIds) {
      await approveAllFilesForTask(projectId, taskId);
      await saveTaskStatus({
        projectId,
        taskId,
        status: 'approved',
      });
    }

    await get().refreshSummary(projectId);
    toast.success(`Approved files for ${pendingTaskIds.length} tasks`);
  },

  // Push all approved files to GitHub
  pushAllToGitHub: async (projectId, githubToken, owner, repo, branch) => {
    set({ status: 'pushing' });

    try {
      const approvedFiles = await getApprovedGeneratedFiles(projectId);

      if (approvedFiles.length === 0) {
        toast.error('No approved files to push');
        set({ status: 'idle' });
        return;
      }

      // Group files by task for commit message
      const taskIds = [...new Set(approvedFiles.map(f => f.taskId))];

      console.log(`[BatchGeneration] Pushing ${approvedFiles.length} files from ${taskIds.length} tasks to GitHub...`);
      toast.loading(`Pushing ${approvedFiles.length} files to GitHub...`, { id: 'push-progress' });

      // Convert to environment file format
      const filesToPush: EnvironmentGeneratedFile[] = approvedFiles.map(f => ({
        path: f.path,
        content: f.content,
      }));

      // Push all files in a single commit
      await pushFilesToRepo(
        githubToken,
        owner,
        repo,
        filesToPush,
        `feat: Batch commit for ${taskIds.length} tasks\n\nTasks: ${taskIds.join(', ')}\nGenerated by PRD-to-Tasks`,
        branch
      );

      // Mark files as committed
      await markFilesCommitted(projectId, taskIds);

      // Update task statuses
      for (const taskId of taskIds) {
        await saveTaskStatus({
          projectId,
          taskId,
          status: 'committed',
        });
      }

      await get().refreshSummary(projectId);

      toast.dismiss('push-progress');
      toast.success(`Successfully pushed ${approvedFiles.length} files to GitHub!`);
      set({ status: 'completed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push failed';
      toast.dismiss('push-progress');
      toast.error(`Failed to push to GitHub: ${message}`);
      set({ status: 'error', error: message });
    }
  },

  // Refresh summary from DB
  refreshSummary: async (projectId) => {
    const summary = await getGeneratedFilesSummary(projectId);
    const taskStatuses = await getAllTaskStatus(projectId);
    const taskStatusMap: Record<string, TaskGenStatus> = {};

    taskStatuses.forEach(ts => {
      taskStatusMap[ts.taskId] = ts.status as TaskGenStatus;
    });

    set({
      taskStatusMap,
      totalFiles: summary.total,
      pendingFiles: summary.pending,
      approvedFiles: summary.approved,
      committedCount: summary.committed,
      generatedCount: Object.values(taskStatusMap).filter(s =>
        s === 'generated' || s === 'approved' || s === 'committed'
      ).length,
      approvedCount: Object.values(taskStatusMap).filter(s => s === 'approved').length,
    });
  },

  // Clear all generated files and status
  clearAll: async (projectId) => {
    await clearGeneratedFilesForProject(projectId);
    await clearTaskStatusForProject(projectId);
    set({
      status: 'idle',
      currentTaskId: null,
      currentTaskIndex: 0,
      totalTasks: 0,
      error: null,
      generatedCount: 0,
      approvedCount: 0,
      committedCount: 0,
      taskStatusMap: {},
      totalFiles: 0,
      pendingFiles: 0,
      approvedFiles: 0,
    });
    toast.success('Cleared all generated files');
  },
}));
