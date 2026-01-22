/**
 * Semantic Analyzer
 *
 * Performs LLM-powered semantic analysis of PRDs to assess:
 * - Completeness and coverage
 * - Gap detection
 * - Conflict detection
 * - Entity readiness
 * - Overall assessment with proceed/fix recommendations
 */

import type { StructuredPRD } from '@/types/prd';
import type { SemanticAnalysisResult } from '@/types/analysis';
import { getLLMRouter } from '@/core/llm/LLMRouter';
import { buildSemanticAnalysisPrompt } from '@/core/llm/prompts';
import { usePromptStore } from '@/store/promptStore';

/**
 * Performs semantic analysis on a PRD using LLM
 */
export async function analyzeSemantics(
  rawContent: string,
  parsedPRD: StructuredPRD,
  signal?: AbortSignal
): Promise<SemanticAnalysisResult> {
  const router = getLLMRouter();

  // Build summary from parsed PRD
  const parsedSummary = {
    frCount: parsedPRD.functionalRequirements.length,
    brCount: parsedPRD.functionalRequirements.reduce(
      (sum, fr) => sum + fr.businessRules.length,
      0
    ),
    screenCount: parsedPRD.functionalRequirements.reduce(
      (sum, fr) => sum + fr.screens.length,
      0
    ),
    entityCount: parsedPRD.dataRequirements.entities.length,
    workflowCount: parsedPRD.functionalRequirements.filter(
      (fr) => fr.isWorkflow
    ).length,
    userRoles: parsedPRD.userRoles.map((r) => r.name),
  };

  // Build the prompt
  const userPrompt = buildSemanticAnalysisPrompt(rawContent, parsedSummary);

  // Get system prompt from store (supports custom prompts)
  const systemPrompt = usePromptStore.getState().getPrompt('semanticAnalysis');

  // Call LLM (using prdAnalysis tier for complex reasoning)
  const response = await router.callWithRetry(
    'prdAnalysis',
    systemPrompt,
    userPrompt,
    8192, // Allow for detailed analysis
    3, // Max retries
    signal
  );

  // Parse the response
  const result = parseSemanticAnalysisResponse(response.content);

  return {
    ...result,
    analyzedAt: new Date(),
  };
}

/**
 * Parse and validate the LLM response
 */
function parseSemanticAnalysisResponse(
  content: string
): Omit<SemanticAnalysisResult, 'analyzedAt'> {
  // Try to extract JSON from the response
  let jsonContent = content.trim();

  // Handle potential markdown code blocks
  if (jsonContent.startsWith('```')) {
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
  }

  try {
    const parsed = JSON.parse(jsonContent);
    return validateAndNormalizeResult(parsed);
  } catch (error) {
    // If parsing fails, return a default error result
    console.error('Failed to parse semantic analysis response:', error);
    return getDefaultErrorResult('Failed to parse LLM response. Please try again.');
  }
}

/**
 * Validate and normalize the parsed result to ensure all required fields exist
 */
function validateAndNormalizeResult(
  parsed: Record<string, unknown>
): Omit<SemanticAnalysisResult, 'analyzedAt'> {
  // Extract with defaults for missing fields
  const completeness = parsed.completeness as Record<string, unknown> | undefined;
  const gaps = parsed.gaps as Record<string, unknown> | undefined;
  const conflicts = parsed.conflicts as Record<string, unknown> | undefined;
  const entityReadiness = parsed.entityReadiness as Record<string, unknown> | undefined;
  const overallAssessment = parsed.overallAssessment as Record<string, unknown> | undefined;

  return {
    completeness: {
      score: (completeness?.score as number) ?? 0,
      missingElements: (completeness?.missingElements as string[]) ?? [],
      recommendations: (completeness?.recommendations as string[]) ?? [],
    },
    gaps: {
      missingScreens: (gaps?.missingScreens as string[]) ?? [],
      undefinedEntities: (gaps?.undefinedEntities as string[]) ?? [],
      incompleteWorkflows: (gaps?.incompleteWorkflows as string[]) ?? [],
      missingValidations: (gaps?.missingValidations as string[]) ?? [],
    },
    conflicts: {
      requirementConflicts: (conflicts?.requirementConflicts as Array<{
        fr1: string;
        fr2: string;
        description: string;
      }>) ?? [],
      ruleConflicts: (conflicts?.ruleConflicts as Array<{
        rule1: string;
        rule2: string;
        description: string;
      }>) ?? [],
    },
    entityReadiness: {
      ready: (entityReadiness?.ready as boolean) ?? false,
      identifiedEntities: (entityReadiness?.identifiedEntities as string[]) ?? [],
      uncertainEntities: (entityReadiness?.uncertainEntities as string[]) ?? [],
      recommendations: (entityReadiness?.recommendations as string[]) ?? [],
    },
    overallAssessment: {
      canProceed: (overallAssessment?.canProceed as boolean) ?? false,
      confidenceScore: (overallAssessment?.confidenceScore as number) ?? 0,
      blockingIssues: (overallAssessment?.blockingIssues as string[]) ?? [],
      warnings: (overallAssessment?.warnings as string[]) ?? [],
      summary: (overallAssessment?.summary as string) ?? 'Analysis incomplete.',
    },
  };
}

/**
 * Return a default error result when parsing fails
 */
function getDefaultErrorResult(
  errorMessage: string
): Omit<SemanticAnalysisResult, 'analyzedAt'> {
  return {
    completeness: {
      score: 0,
      missingElements: [],
      recommendations: ['Re-run semantic analysis'],
    },
    gaps: {
      missingScreens: [],
      undefinedEntities: [],
      incompleteWorkflows: [],
      missingValidations: [],
    },
    conflicts: {
      requirementConflicts: [],
      ruleConflicts: [],
    },
    entityReadiness: {
      ready: false,
      identifiedEntities: [],
      uncertainEntities: [],
      recommendations: [],
    },
    overallAssessment: {
      canProceed: false,
      confidenceScore: 0,
      blockingIssues: [errorMessage],
      warnings: [],
      summary: errorMessage,
    },
  };
}

/**
 * Merge semantic analysis results with existing analysis
 * Updates blocking issues and warnings based on semantic findings
 */
export function mergeSemanticIntoAnalysis(
  semanticResult: SemanticAnalysisResult
): {
  additionalBlockingIssues: string[];
  additionalWarnings: string[];
  canProceed: boolean;
} {
  const additionalBlockingIssues: string[] = [];
  const additionalWarnings: string[] = [];

  // Add blocking issues from semantic analysis
  additionalBlockingIssues.push(...semanticResult.overallAssessment.blockingIssues);

  // Add gap-related blocking issues
  if (semanticResult.gaps.missingScreens.length > 0) {
    additionalBlockingIssues.push(
      ...semanticResult.gaps.missingScreens.map(
        (s) => `Missing screen: ${s}`
      )
    );
  }

  if (semanticResult.gaps.incompleteWorkflows.length > 0) {
    additionalBlockingIssues.push(
      ...semanticResult.gaps.incompleteWorkflows.map(
        (w) => `Incomplete workflow: ${w}`
      )
    );
  }

  // Add conflicts as blocking issues
  semanticResult.conflicts.requirementConflicts.forEach((c) => {
    additionalBlockingIssues.push(
      `Conflict between ${c.fr1} and ${c.fr2}: ${c.description}`
    );
  });

  semanticResult.conflicts.ruleConflicts.forEach((c) => {
    additionalBlockingIssues.push(
      `Rule conflict between ${c.rule1} and ${c.rule2}: ${c.description}`
    );
  });

  // Add non-blocking issues as warnings
  additionalWarnings.push(...semanticResult.overallAssessment.warnings);

  if (semanticResult.gaps.undefinedEntities.length > 0) {
    additionalWarnings.push(
      ...semanticResult.gaps.undefinedEntities.map(
        (e) => `Undefined entity mentioned: ${e}`
      )
    );
  }

  if (semanticResult.gaps.missingValidations.length > 0) {
    additionalWarnings.push(
      ...semanticResult.gaps.missingValidations.map(
        (v) => `Missing validation: ${v}`
      )
    );
  }

  // Entity readiness issues
  if (!semanticResult.entityReadiness.ready) {
    if (semanticResult.entityReadiness.uncertainEntities.length > 0) {
      additionalWarnings.push(
        `Uncertain entities that may need clarification: ${semanticResult.entityReadiness.uncertainEntities.join(', ')}`
      );
    }
  }

  return {
    additionalBlockingIssues,
    additionalWarnings,
    canProceed: semanticResult.overallAssessment.canProceed,
  };
}
