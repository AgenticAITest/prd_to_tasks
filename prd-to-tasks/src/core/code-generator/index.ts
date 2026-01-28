/**
 * Code Generator
 * Orchestrates code generation for tasks using LLMRouter
 */

import { getLLMRouter } from '@/core/llm/LLMRouter';
import { useSettingsStore } from '@/store/settingsStore';
import type { ProgrammableTask } from '@/types/task';
import type { Entity, Relationship } from '@/types/entity';
import type {
  CodeGenerationContext,
  CodeGenerationResult,
  GeneratedFile,
} from './types';
import { getTierForTask, getLanguageFromPath } from './types';
import {
  getSystemPrompt,
  getUserPrompt,
  parseCodeGenerationResponse,
} from './prompts';

export interface GenerateCodeOptions {
  task: ProgrammableTask;
  projectName: string;
  entities: Entity[];
  relationships: Relationship[];
  dbml: string;
  onProgress?: (progress: number, message: string) => void;
  signal?: AbortSignal;
}

/**
 * Generate code for a task using the LLM
 */
export async function generateCodeForTask(
  options: GenerateCodeOptions
): Promise<CodeGenerationResult> {
  const { task, projectName, entities, relationships, dbml, onProgress, signal } =
    options;

  const reportProgress = (progress: number, message: string) => {
    onProgress?.(progress, message);
  };

  try {
    // Build context
    const context: CodeGenerationContext = {
      projectName,
      entities,
      relationships,
      dbml,
      task,
    };

    reportProgress(10, 'Preparing code generation context...');

    // Get appropriate tier for the task
    const tier = getTierForTask(task);

    // Get prompts
    const systemPrompt = getSystemPrompt(task.type);
    const userPrompt = getUserPrompt(context);

    reportProgress(20, `Generating code using ${tier} model...`);

    // Get settings for router config
    const { apiKeys, modelSelection } = useSettingsStore.getState();

    // Initialize/update router
    const router = getLLMRouter({ apiKeys, modelSelection });

    // Check if API key is available for the tier
    if (!router.hasApiKeyForTier(tier)) {
      return {
        success: false,
        files: [],
        error: `No API key configured for tier ${tier}. Please configure API keys in Settings.`,
      };
    }

    reportProgress(30, 'Calling AI model...');

    // Call LLM with retry logic
    const response = await router.callWithRetry(
      tier,
      systemPrompt,
      userPrompt,
      8192, // Max tokens for code generation
      3, // Max retries
      signal
    );

    reportProgress(70, 'Parsing generated code...');

    // Parse response
    const parsed = parseCodeGenerationResponse(response.content);

    if (!parsed.success) {
      return {
        success: false,
        files: [],
        error: parsed.error || 'Failed to parse code generation response',
        rawResponse: response.content,
      };
    }

    reportProgress(90, 'Processing generated files...');

    // Add language info to files
    const files: GeneratedFile[] = parsed.files.map((f) => ({
      path: f.path,
      content: f.content,
      language: getLanguageFromPath(f.path),
      description: f.description,
    }));

    reportProgress(100, 'Code generation complete');

    return {
      success: true,
      files,
      rawResponse: response.content,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        files: [],
        error: 'Code generation was cancelled',
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      success: false,
      files: [],
      error: errorMessage,
    };
  }
}

/**
 * Regenerate code for a specific file with additional instructions
 */
export async function regenerateFile(
  originalContext: GenerateCodeOptions,
  filePath: string,
  instructions: string
): Promise<CodeGenerationResult> {
  const modifiedTask = {
    ...originalContext.task,
    specification: {
      ...originalContext.task.specification,
      requirements: [
        ...originalContext.task.specification.requirements,
        `REGENERATION INSTRUCTIONS for ${filePath}: ${instructions}`,
      ],
    },
  };

  return generateCodeForTask({
    ...originalContext,
    task: modifiedTask,
  });
}

// Re-export types
export type {
  CodeGenerationContext,
  CodeGenerationResult,
  GeneratedFile,
  TechStackConfig,
} from './types';

export { getTierForTask, getLanguageFromPath } from './types';
