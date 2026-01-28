/**
 * Default LLM Prompts
 *
 * This file exports all default system prompts as a centralized map.
 * The promptStore uses these as fallbacks when no custom prompt is set.
 */

import { PRD_ANALYSIS_SYSTEM_PROMPT } from './prd-analysis';
import { PRD_SEMANTIC_ANALYSIS_SYSTEM_PROMPT } from './prd-semantic-analysis';
import { ENTITY_EXTRACTION_SYSTEM_PROMPT } from './entity-extraction';
import { TASK_GENERATION_SYSTEM_PROMPT } from './task-generation';
import { ERD_GENERATION_SYSTEM_PROMPT } from './erd-generation';
import { ARCHITECTURE_EXTRACTION_SYSTEM_PROMPT } from './architecture-extraction';
import { TASK_IMPLEMENTATION_SYSTEM_PROMPT } from './task-implementation';

/**
 * Default footer appended to all copied task prompts.
 * This restricts AI coding assistants from going beyond the specified scope.
 */
export const COPY_PROMPT_FOOTER = `
---

## IMPORTANT: Scope Restriction

**Do NOT do anything beyond what is explicitly specified above.**

- Only implement the requirements listed in this task
- Do not add extra features, utilities, or "nice-to-haves"
- Do not refactor or modify code outside the scope of this task
- Do not add comments, documentation, or type annotations beyond what is required
- Do not "improve" or "clean up" surrounding code
- If something is unclear, ask for clarification instead of assuming

**Stay focused. Implement exactly what is specified, nothing more.**
`;

export type PromptKey =
  | 'prdAnalysis'
  | 'semanticAnalysis'
  | 'entityExtraction'
  | 'taskGeneration'
  | 'erdGeneration'
  | 'architectureExtraction'
  | 'taskImplementation'
  | 'copyPromptFooter';

export interface PromptMetadata {
  key: PromptKey;
  name: string;
  description: string;
  phase: string;
}

export const PROMPT_METADATA: PromptMetadata[] = [
  {
    key: 'prdAnalysis',
    name: 'PRD Analysis',
    description: 'Parses PRD content and extracts structured requirements data (FRs, screens, rules)',
    phase: 'Phase 1: PRD Input & Analysis',
  },
  {
    key: 'semanticAnalysis',
    name: 'Semantic Analysis',
    description: 'Assesses PRD quality, detects gaps, conflicts, and determines readiness',
    phase: 'Phase 1: PRD Input & Analysis',
  },
  {
    key: 'entityExtraction',
    name: 'Entity Extraction',
    description: 'Extracts entities, fields, and relationships from PRD content',
    phase: 'Phase 2: Entity Extraction',
  },
  {
    key: 'erdGeneration',
    name: 'ERD Generation',
    description: 'Generates DBML database schema from entities and relationships',
    phase: 'Phase 3: ERD Builder',
  },
  {
    key: 'taskGeneration',
    name: 'Task Generation',
    description: 'Generates detailed, self-contained development tasks from specifications',
    phase: 'Phase 4: Task Generator',
  },
  {
    key: 'architectureExtraction',
    name: 'Architecture Extraction',
    description: 'Extracts actionable recommendations from a technical architecture guide',
    phase: 'Phase 4: Task Generator (optional)',
  },
  {
    key: 'taskImplementation',
    name: 'Task Implementation',
    description: 'Produces concrete technical implementation guidance per task',
    phase: 'Phase 4: Task Generator (implementation expansion)',
  },
  {
    key: 'copyPromptFooter',
    name: 'Copy Prompt Footer',
    description: 'Instructions appended to every copied task prompt (scope restrictions, guidelines)',
    phase: 'Phase 4: Task Generator',
  },
];

export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
  prdAnalysis: PRD_ANALYSIS_SYSTEM_PROMPT,
  semanticAnalysis: PRD_SEMANTIC_ANALYSIS_SYSTEM_PROMPT,
  entityExtraction: ENTITY_EXTRACTION_SYSTEM_PROMPT,
  taskGeneration: TASK_GENERATION_SYSTEM_PROMPT,
  erdGeneration: ERD_GENERATION_SYSTEM_PROMPT,
  architectureExtraction: ARCHITECTURE_EXTRACTION_SYSTEM_PROMPT,
  taskImplementation: TASK_IMPLEMENTATION_SYSTEM_PROMPT,
  copyPromptFooter: COPY_PROMPT_FOOTER,
};

export function getDefaultPrompt(key: PromptKey): string {
  return DEFAULT_PROMPTS[key];
}

export function getPromptMetadata(key: PromptKey): PromptMetadata | undefined {
  return PROMPT_METADATA.find((m) => m.key === key);
}
