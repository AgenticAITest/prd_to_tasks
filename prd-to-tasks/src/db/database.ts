import Dexie, { type Table } from 'dexie';
import type { StructuredPRD, ProjectFile } from '@/types/prd';
import type { Entity, Relationship } from '@/types/entity';
import type { ERDSchema } from '@/types/erd';
import type { TaskSet } from '@/types/task';

// Database schema types
export interface DBProject {
  id?: number;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  prd?: StructuredPRD;
  rawContent?: string; // Raw PRD content for entity extraction
  entities?: Entity[];
  relationships?: Relationship[];
  erdSchema?: ERDSchema;
  taskSet?: TaskSet;
  files?: ProjectFile[];
}

export interface DBSettings {
  key: string;
  value: unknown;
}

export interface DBRecentProject {
  id?: number;
  projectId: string;
  name: string;
  accessedAt: Date;
}

// Generated code files for batch generation
export interface DBGeneratedFile {
  id?: number;
  projectId: string;
  taskId: string;
  path: string;
  content: string;
  language: string;
  status: 'pending' | 'approved' | 'rejected' | 'committed';
  generatedAt: Date;
}

// Task execution status for persistence
export interface DBTaskStatus {
  id?: number;
  projectId: string;
  taskId: string;
  status: 'pending' | 'generating' | 'generated' | 'approved' | 'committed' | 'error' | 'skipped' | 'manual-pending' | 'manual-complete';
  error?: string;
  updatedAt: Date;
}

class PRDDatabase extends Dexie {
  projects!: Table<DBProject, number>;
  settings!: Table<DBSettings, string>;
  recentProjects!: Table<DBRecentProject, number>;
  generatedFiles!: Table<DBGeneratedFile, number>;
  taskStatus!: Table<DBTaskStatus, number>;

  constructor() {
    super('prd-to-tasks');

    this.version(1).stores({
      projects: '++id, projectId, name, updatedAt',
      settings: 'key',
      recentProjects: '++id, projectId, accessedAt',
    });

    // Version 2: Add generated files and task status tables
    this.version(2).stores({
      projects: '++id, projectId, name, updatedAt',
      settings: 'key',
      recentProjects: '++id, projectId, accessedAt',
      generatedFiles: '++id, projectId, taskId, path, status, generatedAt',
      taskStatus: '++id, projectId, taskId, status, updatedAt',
    });

    // Version 3: Add compound indexes for efficient lookups
    this.version(3).stores({
      projects: '++id, projectId, name, updatedAt',
      settings: 'key',
      recentProjects: '++id, projectId, accessedAt',
      generatedFiles: '++id, projectId, taskId, path, status, generatedAt, [projectId+taskId+path], [projectId+taskId], [projectId+status]',
      taskStatus: '++id, projectId, taskId, status, updatedAt, [projectId+taskId]',
    });
  }
}

export const db = new PRDDatabase();

// Helper functions
export async function saveProject(project: DBProject): Promise<number> {
  const existing = await db.projects.where('projectId').equals(project.projectId).first();

  if (existing) {
    await db.projects.update(existing.id!, {
      ...project,
      updatedAt: new Date(),
    });
    return existing.id!;
  }

  return await db.projects.add({
    ...project,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function loadProject(projectId: string): Promise<DBProject | undefined> {
  return await db.projects.where('projectId').equals(projectId).first();
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.projects.where('projectId').equals(projectId).delete();
  await db.recentProjects.where('projectId').equals(projectId).delete();
}

export async function listProjects(): Promise<DBProject[]> {
  return await db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function addRecentProject(projectId: string, name: string): Promise<void> {
  // Remove existing entry if present
  await db.recentProjects.where('projectId').equals(projectId).delete();

  // Add new entry
  await db.recentProjects.add({
    projectId,
    name,
    accessedAt: new Date(),
  });

  // Keep only the last 10 recent projects
  const allRecent = await db.recentProjects.orderBy('accessedAt').reverse().toArray();
  if (allRecent.length > 10) {
    const toDelete = allRecent.slice(10).map(r => r.id!);
    await db.recentProjects.bulkDelete(toDelete);
  }
}

export async function getRecentProjects(): Promise<DBRecentProject[]> {
  return await db.recentProjects.orderBy('accessedAt').reverse().limit(10).toArray();
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await db.settings.get(key);
  return setting ? (setting.value as T) : defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete(key);
}

// Generated files helper functions
export async function saveGeneratedFile(file: Omit<DBGeneratedFile, 'id' | 'generatedAt'>): Promise<number> {
  // Check if file already exists for this task/path
  const existing = await db.generatedFiles
    .where('[projectId+taskId+path]')
    .equals([file.projectId, file.taskId, file.path])
    .first();

  if (existing) {
    await db.generatedFiles.update(existing.id!, {
      ...file,
      generatedAt: new Date(),
    });
    return existing.id!;
  }

  return await db.generatedFiles.add({
    ...file,
    generatedAt: new Date(),
  });
}

export async function saveGeneratedFiles(files: Omit<DBGeneratedFile, 'id' | 'generatedAt'>[]): Promise<void> {
  const filesWithTimestamp = files.map(f => ({
    ...f,
    generatedAt: new Date(),
  }));
  await db.generatedFiles.bulkAdd(filesWithTimestamp);
}

export async function getGeneratedFilesForTask(projectId: string, taskId: string): Promise<DBGeneratedFile[]> {
  return await db.generatedFiles
    .where({ projectId, taskId })
    .toArray();
}

export async function getGeneratedFilesForProject(projectId: string): Promise<DBGeneratedFile[]> {
  return await db.generatedFiles
    .where('projectId')
    .equals(projectId)
    .toArray();
}

export async function getPendingGeneratedFiles(projectId: string): Promise<DBGeneratedFile[]> {
  return await db.generatedFiles
    .where({ projectId, status: 'pending' })
    .toArray();
}

export async function getApprovedGeneratedFiles(projectId: string): Promise<DBGeneratedFile[]> {
  return await db.generatedFiles
    .where({ projectId, status: 'approved' })
    .toArray();
}

export async function updateFileStatus(fileId: number, status: DBGeneratedFile['status']): Promise<void> {
  await db.generatedFiles.update(fileId, { status });
}

export async function approveAllFilesForTask(projectId: string, taskId: string): Promise<void> {
  await db.generatedFiles
    .where({ projectId, taskId })
    .modify({ status: 'approved' });
}

export async function markFilesCommitted(projectId: string, taskIds: string[]): Promise<void> {
  for (const taskId of taskIds) {
    await db.generatedFiles
      .where({ projectId, taskId, status: 'approved' })
      .modify({ status: 'committed' });
  }
}

export async function clearGeneratedFilesForProject(projectId: string): Promise<void> {
  await db.generatedFiles.where('projectId').equals(projectId).delete();
}

export async function clearGeneratedFilesForTask(projectId: string, taskId: string): Promise<void> {
  await db.generatedFiles.where({ projectId, taskId }).delete();
}

// Task status helper functions
export async function saveTaskStatus(status: Omit<DBTaskStatus, 'id' | 'updatedAt'>): Promise<number> {
  const existing = await db.taskStatus
    .where({ projectId: status.projectId, taskId: status.taskId })
    .first();

  if (existing) {
    await db.taskStatus.update(existing.id!, {
      ...status,
      updatedAt: new Date(),
    });
    return existing.id!;
  }

  return await db.taskStatus.add({
    ...status,
    updatedAt: new Date(),
  });
}

export async function getTaskStatus(projectId: string, taskId: string): Promise<DBTaskStatus | undefined> {
  return await db.taskStatus
    .where({ projectId, taskId })
    .first();
}

export async function getAllTaskStatus(projectId: string): Promise<DBTaskStatus[]> {
  return await db.taskStatus
    .where('projectId')
    .equals(projectId)
    .toArray();
}

export async function clearTaskStatusForProject(projectId: string): Promise<void> {
  await db.taskStatus.where('projectId').equals(projectId).delete();
}

// Get summary of generated files
export async function getGeneratedFilesSummary(projectId: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  committed: number;
  byTask: Record<string, number>;
}> {
  const files = await getGeneratedFilesForProject(projectId);
  const byTask: Record<string, number> = {};

  files.forEach(f => {
    byTask[f.taskId] = (byTask[f.taskId] || 0) + 1;
  });

  return {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    approved: files.filter(f => f.status === 'approved').length,
    committed: files.filter(f => f.status === 'committed').length,
    byTask,
  };
}

// Export database instance
export default db;
