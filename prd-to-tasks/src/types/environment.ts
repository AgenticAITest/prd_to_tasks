// Environment and Integration Types for Phase 5: Execute

export type EnvironmentStatus = 'not-created' | 'creating' | 'ready' | 'error';

export interface Environment {
  id: string;
  projectId: string;
  projectName: string;
  status: EnvironmentStatus;
  neon?: NeonEnvironment;
  github?: GitHubEnvironment;
  gitpod?: GitpodEnvironment;
  createdAt: Date;
  error?: string;
}

export interface NeonEnvironment {
  projectId: string;
  connectionUri: string;
  databaseName: string;
  region: string;
  host: string;
  user: string;
}

export interface GitHubEnvironment {
  repoName: string;
  repoUrl: string;
  cloneUrl: string;
  owner: string;
  defaultBranch: string;
}

export interface GitpodEnvironment {
  workspaceUrl: string;
}

export interface IntegrationAPIKeys {
  neon?: string;
  github?: string;
  gitpod?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ScaffoldContext {
  projectName: string;
  entities: import('./entity').Entity[];
  relationships: import('./entity').Relationship[];
  dbml: string;
}

// Progress tracking for environment creation
export interface EnvironmentCreationProgress {
  step: EnvironmentCreationStep;
  progress: number;
  message: string;
}

export type EnvironmentCreationStep =
  | 'idle'
  | 'creating-database'
  | 'generating-scaffold'
  | 'creating-repo'
  | 'pushing-files'
  | 'creating-workspace'
  | 'complete'
  | 'error';
