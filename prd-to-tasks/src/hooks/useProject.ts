import { useCallback, useState } from 'react';
import { useProjectStore, type PhaseNumber } from '@/store/projectStore';
import { usePRDStore } from '@/store/prdStore';
import { useEntityStore } from '@/store/entityStore';
import { useERDStore } from '@/store/erdStore';
import { useTaskStore } from '@/store/taskStore';
import { saveProject, loadProject, deleteProject, addRecentProject } from '@/db';
import { validateERD, generateDBML, generateMigrationSQL } from '@/core/erd-generator';
import { toast } from 'sonner';
import type { ProjectFile } from '@/types/prd';
import type { DBProject } from '@/db/database';
import { generateId } from '@/lib/utils';

export function useProject() {
  const projectStore = useProjectStore();
  const prdStore = usePRDStore();
  const entityStore = useEntityStore();
  const erdStore = useERDStore();
  const taskStore = useTaskStore();
  const [isLoading, setIsLoading] = useState(false);

  const createNewProject = useCallback(
    async (name: string, description?: string) => {
      setIsLoading(true);
      try {
        // Reset all stores
        prdStore.clearPRD();
        entityStore.clearEntities();
        erdStore.clearERD();
        taskStore.clearTasks();

        // Create new project
        projectStore.createProject(name, description);

        // Ensure the generated project id doesn't collide with an existing DB project
        // Use live getter to read current state (not the snapshot on hook initialization)
        let project = useProjectStore.getState().project;
        if (!project) throw new Error('Failed to create project');

        const existing = await loadProject(project.id);
        if (existing) {
          // Regenerate id and update in-store project to avoid overwriting existing project
          const newId = generateId();
          projectStore.updateProject({ id: newId });
          project = useProjectStore.getState().project!;
        }

        // Save to database for the newly created project
        if (project) {
          const projectData: DBProject = {
            projectId: project.id,
            name,
            description: project.description,
            createdAt: new Date(),
            updatedAt: new Date(),
            // initial phase state
            currentPhase: projectStore.currentPhase,
            phaseStatus: projectStore.phaseStatus,
            files: [],
          };

          await saveProject(projectData);
          await addRecentProject(project.id, name);
        }

        return project?.id;
      } finally {
        setIsLoading(false);
      }
    },
    [projectStore, prdStore, entityStore, erdStore, taskStore]
  );

  const loadExistingProject = useCallback(
    async (projectId: string) => {
      setIsLoading(true);
      try {
        const projectData = await loadProject(projectId);
        if (!projectData) {
          throw new Error('Project not found');
        }

        // Restore project state
        projectStore.loadProject(
          {
            id: projectData.projectId,
            name: projectData.name,
            createdAt: projectData.createdAt,
            updatedAt: projectData.updatedAt,
          },
          projectData.files || []
        );

        // Restore PRD if exists
        if (projectData.prd) {
          prdStore.setPRD(projectData.prd, false);
          if ((projectData.prd as any).analysisResults) {
            prdStore.setAnalysisResult((projectData.prd as any).analysisResults, false);
          }
        }

        // Restore entities
        if (projectData.entities && projectData.entities.length > 0) {
          entityStore.clearEntities();
          projectData.entities.forEach((entity) => entityStore.addEntity(entity));
        }

        // Restore relationships
        if (projectData.relationships && projectData.relationships.length > 0) {
          projectData.relationships.forEach((rel) => entityStore.addRelationship(rel));
        }

        // Restore ERD schema (full object) if present
        if (projectData.erdSchema) {
          // Restore schema and associated validation/generation options where possible
          erdStore.setSchema(projectData.erdSchema);

          // Also ensure dbml is set (defensive)
          if (projectData.erdSchema.dbml) {
            erdStore.setDBML(projectData.erdSchema.dbml);
          }

          let val = (projectData.erdSchema as any).validation || (projectData.erdSchema as any).validationResult;
          // If validation result is missing, attempt to re-run validation from entities
          if (!val) {
            try {
              const entitiesToValidate = projectData.entities && projectData.entities.length > 0 ? projectData.entities : useERDStore.getState().schema?.entities || [];
              const relationshipsToValidate = projectData.relationships && projectData.relationships.length > 0 ? projectData.relationships : useERDStore.getState().schema?.relationships || [];
              val = validateERD(entitiesToValidate, relationshipsToValidate);
              erdStore.setValidationResult(val);
            } catch (err) {
              console.warn('Failed to validate ERD during load:', err);
            }
          } else {
            erdStore.setValidationResult(val);
          }

          // If DBML missing, attempt to regenerate from entities + relationships
          if (!projectData.erdSchema.dbml && projectData.entities && projectData.entities.length > 0) {
            try {
              const generatedDBML = generateDBML(projectData.entities, projectData.relationships || [], projectData.erdSchema.generationOptions || useERDStore.getState().generationOptions);
              erdStore.setDBML(generatedDBML);
            } catch (err) {
              console.warn('Failed to generate DBML during load:', err);
            }
          }

          // Determine validity and update phase status + current phase so UI enables the Proceed button
          const isValid = val?.isValid === true;
          const hasDBML = !!(projectData.erdSchema.dbml || useERDStore.getState().dbml);

          if (hasDBML && isValid) {
            projectStore.setPhaseStatus(3, 'completed');
            projectStore.setPhaseDirect(3);
          } else if (val) {
            projectStore.setPhaseStatus(3, 'has-issues');
            projectStore.setPhaseDirect(3);
          }

          if (hasDBML) {
            // Debug: notify about restored ERD state
            const dbmlLen = useERDStore.getState().dbml?.length ?? 0;
            const restoredVal = useERDStore.getState().validationResult;
            toast.info(`ERD restored — dbml ${dbmlLen} chars, valid: ${restoredVal?.isValid === true ? 'yes' : restoredVal?.isValid === false ? 'no' : 'unknown'}`);
          }
        } else if (!projectData.erdSchema && projectData.entities && projectData.entities.length > 0) {
          // No saved ERD schema object exists — attempt to regenerate DBML/SQL/validation from entities and persist it
          try {
            const generatedDBML = generateDBML(projectData.entities, projectData.relationships || [], useERDStore.getState().generationOptions);
            const validation = validateERD(projectData.entities, projectData.relationships || []);
            const sql = generateMigrationSQL(projectData.entities, projectData.relationships || [], useERDStore.getState().generationOptions.schemaName || 'public');

            // Set in-memory ERD state so UI shows the DBML and SQL immediately
            erdStore.setDBML(generatedDBML);
            erdStore.setSqlMigration(sql);
            erdStore.setValidationResult(validation);

            // Construct a minimal ERD schema object and set it so future saves persist it
            const project = useProjectStore.getState().project;
            const erdSchema = {
              id: `erd-${project?.id ?? Date.now()}`,
              projectId: projectData.projectId,
              name: project?.name ?? 'schema',
              version: '1.0.0',
              description: '',
              entities: projectData.entities,
              relationships: projectData.relationships || [],
              dbml: generatedDBML,
              sqlMigration: sql,
              generationOptions: useERDStore.getState().generationOptions,
              validationResult: validation,
              createdAt: project?.createdAt ?? new Date(),
              updatedAt: new Date(),
            };

            erdStore.setSchema(erdSchema);

            // Update phase status so UI is restored to ERD phase
            if (validation.isValid) {
              projectStore.setPhaseStatus(3, 'completed');
              projectStore.setPhaseDirect(3);
            } else {
              projectStore.setPhaseStatus(3, 'has-issues');
              projectStore.setPhaseDirect(3);
            }

            // Persist the regenerated ERD to DB so reopening immediately keeps it
            try {
              await saveProject({
                ...projectData,
                erdSchema,
                updatedAt: new Date(),
              });

              toast.success('ERD regenerated from entities and saved');
            } catch (err) {
              console.warn('Failed to save regenerated ERD during load:', err);
              toast.error('Failed to persist regenerated ERD; please save the project manually');
            }
          } catch (err) {
            console.warn('Failed to regenerate ERD during load:', err);
          }
        }

        // Restore tasks
        if (projectData.taskSet) {
          taskStore.setTaskSet(projectData.taskSet);
        }

        // Restore semantic analysis result if present
        if (projectData.semanticAnalysisResult) {
          prdStore.setSemanticAnalysisResult(projectData.semanticAnalysisResult, false);
        }

        // Restore saved phase statuses and current phase if available
        try {
          if (projectData.phaseStatus) {
            // Apply saved statuses for known phases
            Object.entries(projectData.phaseStatus).forEach(([phaseStr, status]) => {
              const phaseNum = Number(phaseStr) as 1 | 2 | 3 | 4;
              if ([1,2,3,4].includes(phaseNum)) {
                projectStore.setPhaseStatus(phaseNum as 1|2|3|4, status as any);
              }
            });
          }

          if (projectData.currentPhase && [1,2,3,4].includes(projectData.currentPhase)) {
            // Force-set phase directly to ensure UI restores to saved step
            projectStore.setPhaseDirect(projectData.currentPhase as 1|2|3|4);
          } else {
            // Fallback: set phase 1 status based on saved analysis (legacy behavior)
            const hasSemantic = !!projectData.semanticAnalysisResult;
            const hasClassic = !!projectData.prd && !!(projectData.prd as any).analysisResults;

            if (hasSemantic) {
              const canProceed = projectData.semanticAnalysisResult!.overallAssessment?.canProceed;
              if (canProceed) projectStore.setPhaseStatus(1, 'completed');
              else projectStore.setPhaseStatus(1, 'has-issues');
            } else if (hasClassic) {
              const blocking = (projectData.prd as any).analysisResults.blockingIssues || [];
              if (blocking.length > 0) projectStore.setPhaseStatus(1, 'has-issues');
              else projectStore.setPhaseStatus(1, 'completed');
            }
          }
        } catch (err) {
          console.warn('Failed to set phase status from saved analysis:', err);
        }

        // Update recent projects in DB
        await addRecentProject(projectData.projectId, projectData.name);

        // Also update in-memory recent list so UI reflects changes immediately
        projectStore.addRecentProject({
          id: projectData.projectId,
          name: projectData.name,
          createdAt: projectData.createdAt || new Date(),
          updatedAt: projectData.updatedAt || new Date(),
        });
        return projectData; 
      } catch (error) {
        console.error('Failed to load project:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [projectStore, prdStore, entityStore, erdStore, taskStore]
  );

  const saveCurrentProject = useCallback(async () => {
    const project = projectStore.project;
    if (!project) {
      throw new Error('No project to save');
    }

    setIsLoading(true);
    try {
      const projectData: DBProject = {
        projectId: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: new Date(),
        files: projectStore.files,
        prd: prdStore.prd || undefined,
        entities: entityStore.entities,
        relationships: entityStore.relationships,
        erdSchema: erdStore.schema || undefined,
        taskSet: taskStore.taskSet || undefined,
        semanticAnalysisResult: prdStore.semanticAnalysisResult || undefined,
        // Persist phase progress so we can restore where user left off
        currentPhase: projectStore.currentPhase,
        phaseStatus: projectStore.phaseStatus,
      };

      await saveProject(projectData);
      projectStore.setDirty(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectStore, prdStore, entityStore, erdStore, taskStore]);

  const deleteCurrentProject = useCallback(async () => {
    const project = projectStore.project;
    if (!project) {
      throw new Error('No project to delete');
    }

    setIsLoading(true);
    try {
      await deleteProject(project.id);

      // Reset all stores
      prdStore.clearPRD();
      entityStore.clearEntities();
      erdStore.clearERD();
      taskStore.clearTasks();
      projectStore.closeProject();
    } finally {
      setIsLoading(false);
    }
  }, [projectStore, prdStore, entityStore, erdStore, taskStore]);

  const addFile = useCallback(
    (file: File): Promise<ProjectFile> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const content = reader.result as string;
          const projectFile: Omit<ProjectFile, 'id' | 'uploadedAt'> = {
            name: file.name,
            type: getFileType(file.name),
            content,
            size: file.size,
          };

          projectStore.addFile(projectFile);
          // Return the file with generated id
          const files = projectStore.files;
          const addedFile = files[files.length - 1];
          resolve(addedFile);
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
      });
    },
    [projectStore]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      projectStore.removeFile(fileId);
    },
    [projectStore]
  );

  const canProceedToPhase = useCallback(
    (phase: number): boolean => {
      switch (phase) {
        case 2:
          // Need PRD analyzed to proceed to entity extraction
          return prdStore.prd !== null && prdStore.analysisResult !== null;
        case 3:
          // Need entities to proceed to ERD builder
          return entityStore.entities.length > 0;
        case 4:
          // Need DBML to proceed to task generation
          return erdStore.dbml !== '' && erdStore.validationResult?.isValid === true;
        default:
          return true;
      }
    },
    [prdStore, entityStore, erdStore]
  );

  const goToPhase = useCallback(
    (phase: PhaseNumber) => {
      if (phase === 1 || canProceedToPhase(phase)) {
        projectStore.setPhase(phase);
      }
    },
    [projectStore, canProceedToPhase]
  );

  return {
    // Project state
    projectId: projectStore.project?.id ?? null,
    projectName: projectStore.project?.name ?? 'Untitled Project',
    currentPhase: projectStore.currentPhase,
    phaseStatus: projectStore.phaseStatus,
    files: projectStore.files,
    hasUnsavedChanges: projectStore.isDirty,
    isLoading,
    recentProjects: projectStore.recentProjects,

    // Actions
    createNewProject,
    loadExistingProject,
    saveCurrentProject,
    deleteCurrentProject,
    addFile,
    removeFile,
    goToPhase,
    canProceedToPhase,
    setProjectName: (name: string) => projectStore.updateProject({ name }),
  };
}

function getFileType(filename: string): 'prd' | 'screen' | 'generated' | 'other' {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'md' || ext === 'txt' || ext === 'pdf') {
    return 'prd';
  }
  if (ext === 'html' || ext === 'htm') {
    return 'screen';
  }
  if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'dbml') {
    return 'generated';
  }
  return 'other';
}
