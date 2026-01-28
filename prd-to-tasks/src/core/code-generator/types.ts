import type { Entity, Relationship } from '@/types/entity';
import type { ProgrammableTask, TaskType } from '@/types/task';

/**
 * Context for code generation
 */
export interface CodeGenerationContext {
  // Project information
  projectName: string;

  // Entity/ERD data
  entities: Entity[];
  relationships: Relationship[];
  dbml: string;

  // Existing files in the project (for context)
  existingFiles?: ExistingFile[];

  // Target task
  task: ProgrammableTask;

  // Technology stack preferences
  techStack?: TechStackConfig;
}

export interface ExistingFile {
  path: string;
  content: string;
  language: string;
}

export interface TechStackConfig {
  database: 'postgresql' | 'mysql' | 'sqlite';
  orm: 'prisma' | 'drizzle' | 'typeorm';
  backend: 'express' | 'fastify' | 'hono';
  frontend: 'react' | 'vue' | 'svelte';
  styling: 'tailwind' | 'css-modules' | 'styled-components';
}

/**
 * Result of code generation
 */
export interface CodeGenerationResult {
  success: boolean;
  files: GeneratedFile[];
  error?: string;
  rawResponse?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description?: string;
}

/**
 * Maps task types to appropriate LLM tiers
 */
export const TASK_TYPE_TO_TIER: Record<TaskType, 'T1' | 'T2' | 'T3' | 'T4'> = {
  // T1 - Simple, repetitive tasks
  'database-migration': 'T1',
  'documentation': 'T1',

  // T2 - Standard complexity
  'api-crud': 'T2',
  'ui-list': 'T2',
  'ui-form': 'T2',
  'ui-detail': 'T2',
  'ui-modal': 'T2',
  'validation': 'T2',
  'test': 'T2',
  'test-setup': 'T2',
  'api-client': 'T2',
  'service-layer': 'T2',
  'page-composition': 'T2',
  'route-config': 'T2',
  'navigation': 'T2',

  // T3 - Complex logic
  'api-custom': 'T3',
  'ui-dashboard': 'T3',
  'ui-report': 'T3',
  'business-logic': 'T3',
  'workflow': 'T3',
  'e2e-flow': 'T3',

  // T4 - Architecture/critical
  'integration': 'T4',
  'environment-setup': 'T4',
};

/**
 * Get the appropriate LLM tier for a task
 */
export function getTierForTask(task: ProgrammableTask): 'T1' | 'T2' | 'T3' | 'T4' {
  // Use the task's defined tier if available
  if (task.tier) {
    return task.tier;
  }

  // Fall back to mapping based on task type
  return TASK_TYPE_TO_TIER[task.type] || 'T2';
}

/**
 * Language extension mapping
 */
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  'ts': 'typescript',
  'tsx': 'typescript',
  'js': 'javascript',
  'jsx': 'javascript',
  'json': 'json',
  'prisma': 'prisma',
  'sql': 'sql',
  'css': 'css',
  'html': 'html',
  'md': 'markdown',
  'yml': 'yaml',
  'yaml': 'yaml',
};

/**
 * Get language from file path
 */
export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_EXTENSIONS[ext] || 'text';
}
