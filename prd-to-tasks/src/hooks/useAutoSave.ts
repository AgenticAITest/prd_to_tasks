import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { usePRDStore } from '@/store/prdStore';
import { useEntityStore } from '@/store/entityStore';
import { useERDStore } from '@/store/erdStore';
import { useTaskStore } from '@/store/taskStore';
import { useUIStore } from '@/store/uiStore';
import { saveProject } from '@/db';

export interface AutoSaveOptions {
  /** Interval in milliseconds between auto-saves (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save completes successfully */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

export function useAutoSave(options: AutoSaveOptions = {}) {
  const {
    interval = 30000,
    enabled = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options;

  const projectStore = useProjectStore();
  const prdStore = usePRDStore();
  const entityStore = useEntityStore();
  const erdStore = useERDStore();
  const taskStore = useTaskStore();
  const uiStore = useUIStore();

  const lastSaveRef = useRef<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    const project = projectStore.project;
    if (!project || isSavingRef.current) {
      return;
    }

    if (!projectStore.isDirty) {
      return;
    }

    isSavingRef.current = true;
    onSaveStart?.();

    try {
      const projectData = {
        projectId: project.id,
        name: project.name,
        files: projectStore.files,
        prd: prdStore.prd || undefined,
        entities: entityStore.entities,
        relationships: entityStore.relationships,
        erdSchema: erdStore.dbml
          ? {
              id: `erd-${project.id}`,
              dbml: erdStore.dbml,
              entities: entityStore.entities,
              relationships: entityStore.relationships,
              validationResult: erdStore.validationResult || undefined,
              createdAt: project.createdAt,
              updatedAt: new Date(),
            }
          : undefined,
        taskSet: taskStore.taskSet || undefined,
        // persist semantic analysis too
        semanticAnalysisResult: prdStore.semanticAnalysisResult || undefined,
        // phase state
        currentPhase: projectStore.currentPhase,
        phaseStatus: projectStore.phaseStatus,
        createdAt: project.createdAt,
        updatedAt: new Date(),
      };

      await saveProject(projectData);

      projectStore.setDirty(false);
      lastSaveRef.current = new Date();
      onSaveSuccess?.();

      uiStore.addNotification({
        type: 'success',
        title: 'Auto-saved',
        description: 'Project saved successfully',
        duration: 2000,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown save error');
      onSaveError?.(err);

      uiStore.addNotification({
        type: 'error',
        title: 'Auto-save failed',
        description: err.message,
        duration: 5000,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [
    projectStore,
    prdStore,
    entityStore,
    erdStore,
    taskStore,
    uiStore,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  ]);

  // Debounced save after changes
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, interval);
  }, [save, interval]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled || !projectStore.project) {
      return;
    }

    const intervalId = setInterval(() => {
      if (projectStore.isDirty) {
        save();
      }
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, interval, projectStore.project, projectStore.isDirty, save]);

  // Save on phase change
  useEffect(() => {
    if (projectStore.project && projectStore.isDirty) {
      save();
    }
  }, [projectStore.currentPhase]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (projectStore.isDirty) {
        // Try to save synchronously (may not complete)
        save();
        // Show browser warning
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [projectStore.isDirty, save]);

  // Listen for manual save trigger (from keyboard shortcut)
  useEffect(() => {
    const handleSave = () => {
      save();
    };

    document.addEventListener('app:save', handleSave);
    return () => {
      document.removeEventListener('app:save', handleSave);
    };
  }, [save]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    debouncedSave,
    lastSave: lastSaveRef.current,
    isSaving: isSavingRef.current,
    hasUnsavedChanges: projectStore.isDirty,
  };
}

// Hook for tracking changes and triggering auto-save
export function useTrackChanges() {
  const projectStore = useProjectStore();

  const markChanged = useCallback(() => {
    projectStore.setDirty(true);
  }, [projectStore]);

  return {
    markChanged,
    hasUnsavedChanges: projectStore.isDirty,
  };
}
