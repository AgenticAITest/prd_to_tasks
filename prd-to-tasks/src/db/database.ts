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
  entities?: Entity[];
  relationships?: Relationship[];
  erdSchema?: ERDSchema;
  taskSet?: TaskSet;
  semanticAnalysisResult?: import('@/types/analysis').SemanticAnalysisResult;

  // Phase tracking (optional) — persists where the user left off
  currentPhase?: number;
  phaseStatus?: Record<number, 'locked' | 'active' | 'completed' | 'has-issues'>;

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

class PRDDatabase extends Dexie {
  projects!: Table<DBProject, number>;
  settings!: Table<DBSettings, string>;
  recentProjects!: Table<DBRecentProject, number>;

  constructor() {
    super('prd-to-tasks');

    this.version(1).stores({
      projects: '++id, projectId, name, updatedAt',
      settings: 'key',
      recentProjects: '++id, projectId, accessedAt',
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

// Export database instance
export default db;
