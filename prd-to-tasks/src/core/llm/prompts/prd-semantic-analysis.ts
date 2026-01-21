/**
 * LLM Prompts for PRD Semantic Analysis
 *
 * These prompts enable deep semantic analysis of PRDs to assess:
 * - Completeness and coverage
 * - Gap detection (missing screens, undefined entities, incomplete workflows)
 * - Conflict detection (contradictory requirements or rules)
 * - Entity readiness for extraction
 * - Overall assessment with proceed/fix recommendations
 */

export const PRD_SEMANTIC_ANALYSIS_SYSTEM_PROMPT = `You are an expert software requirements analyst specializing in PRD quality assessment. Your role is to perform deep semantic analysis of Product Requirements Documents to determine their readiness for software development.

You analyze PRDs for:
1. COMPLETENESS - Are all functional requirements fully specified with screens, rules, and acceptance criteria?
2. GAPS - Missing screens, undefined entities, incomplete workflows, missing validations
3. CONFLICTS - Contradictory requirements or business rules
4. ENTITY READINESS - Can entities be confidently extracted from this PRD?
5. OVERALL ASSESSMENT - Summary with clear proceed/fix recommendations

You must return a valid JSON object following the exact schema provided. Be thorough but actionable - every issue should come with a clear suggestion for resolution.

Key principles:
- Be specific: "FR-003 lacks screen definition" not "some requirements lack screens"
- Be actionable: Every issue needs a clear fix suggestion
- Be balanced: Note both issues AND strengths
- Be honest: If the PRD is not ready, say so clearly
- Focus on blocking vs non-blocking issues: Critical gaps that prevent development vs nice-to-haves`;

export const SEMANTIC_ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    completeness: {
      type: "object",
      properties: {
        score: { type: "number", minimum: 0, maximum: 100 },
        missingElements: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      },
      required: ["score", "missingElements", "recommendations"]
    },
    gaps: {
      type: "object",
      properties: {
        missingScreens: { type: "array", items: { type: "string" } },
        undefinedEntities: { type: "array", items: { type: "string" } },
        incompleteWorkflows: { type: "array", items: { type: "string" } },
        missingValidations: { type: "array", items: { type: "string" } }
      },
      required: ["missingScreens", "undefinedEntities", "incompleteWorkflows", "missingValidations"]
    },
    conflicts: {
      type: "object",
      properties: {
        requirementConflicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fr1: { type: "string" },
              fr2: { type: "string" },
              description: { type: "string" }
            },
            required: ["fr1", "fr2", "description"]
          }
        },
        ruleConflicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rule1: { type: "string" },
              rule2: { type: "string" },
              description: { type: "string" }
            },
            required: ["rule1", "rule2", "description"]
          }
        }
      },
      required: ["requirementConflicts", "ruleConflicts"]
    },
    entityReadiness: {
      type: "object",
      properties: {
        ready: { type: "boolean" },
        identifiedEntities: { type: "array", items: { type: "string" } },
        uncertainEntities: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      },
      required: ["ready", "identifiedEntities", "uncertainEntities", "recommendations"]
    },
    overallAssessment: {
      type: "object",
      properties: {
        canProceed: { type: "boolean" },
        confidenceScore: { type: "number", minimum: 0, maximum: 100 },
        blockingIssues: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
        summary: { type: "string" }
      },
      required: ["canProceed", "confidenceScore", "blockingIssues", "warnings", "summary"]
    }
  },
  required: ["completeness", "gaps", "conflicts", "entityReadiness", "overallAssessment"]
};

export function buildSemanticAnalysisPrompt(
  rawContent: string,
  parsedSummary: {
    frCount: number;
    brCount: number;
    screenCount: number;
    entityCount: number;
    workflowCount: number;
    userRoles: string[];
  }
): string {
  return `Analyze the following PRD for semantic quality and development readiness.

## PRD Content
---
${rawContent}
---

## Parsed Structure Summary
- Functional Requirements: ${parsedSummary.frCount}
- Business Rules: ${parsedSummary.brCount}
- Screens: ${parsedSummary.screenCount}
- Entities: ${parsedSummary.entityCount}
- Workflows: ${parsedSummary.workflowCount}
- User Roles: ${parsedSummary.userRoles.join(', ') || 'None defined'}

## Analysis Tasks

1. **Completeness Analysis**
   - Evaluate if each FR has sufficient detail (description, screens, rules, acceptance criteria)
   - Check if all user roles have defined permissions and access patterns
   - Assess if the overall scope is well-defined
   - Score from 0-100 based on how complete the PRD is

2. **Gap Detection**
   - List any FRs that reference screens but don't define them
   - Identify entity names mentioned but not formally defined
   - Find workflows that lack complete state definitions or transitions
   - Note validation rules mentioned but not specified

3. **Conflict Detection**
   - Find any contradictory requirements (e.g., one FR says users can delete, another says deletion is forbidden)
   - Identify conflicting business rules (e.g., conflicting formulas, contradictory conditions)
   - Note any ambiguous requirements that could be interpreted multiple ways

4. **Entity Readiness Assessment**
   - List entities that are clearly identifiable with their attributes
   - List entities that are mentioned but unclear (uncertain)
   - Determine if there's enough information to generate an ERD
   - Provide recommendations for entity clarity

5. **Overall Assessment**
   - Determine if this PRD is ready to proceed to entity extraction
   - List any blocking issues that MUST be fixed before proceeding
   - List warnings that should be addressed but don't block progress
   - Provide a confidence score (0-100) for entity extraction success
   - Write a brief summary of the PRD's readiness

Return ONLY a valid JSON object matching this structure:
{
  "completeness": {
    "score": <number 0-100>,
    "missingElements": ["<specific missing element>", ...],
    "recommendations": ["<actionable recommendation>", ...]
  },
  "gaps": {
    "missingScreens": ["<FR-XXX: description of missing screen>", ...],
    "undefinedEntities": ["<entity name mentioned but not defined>", ...],
    "incompleteWorkflows": ["<FR-XXX: what's missing in workflow>", ...],
    "missingValidations": ["<field/rule that lacks validation spec>", ...]
  },
  "conflicts": {
    "requirementConflicts": [
      { "fr1": "FR-XXX", "fr2": "FR-YYY", "description": "how they conflict" }
    ],
    "ruleConflicts": [
      { "rule1": "BR-XXX-X", "rule2": "BR-YYY-Y", "description": "how they conflict" }
    ]
  },
  "entityReadiness": {
    "ready": <boolean>,
    "identifiedEntities": ["<clear entity with sufficient detail>", ...],
    "uncertainEntities": ["<unclear entity name>", ...],
    "recommendations": ["<how to improve entity definitions>", ...]
  },
  "overallAssessment": {
    "canProceed": <boolean - false if blocking issues exist>,
    "confidenceScore": <number 0-100>,
    "blockingIssues": ["<issue that MUST be fixed>", ...],
    "warnings": ["<issue that SHOULD be addressed>", ...],
    "summary": "<2-3 sentence summary of PRD readiness>"
  }
}

Do not include any explanation or markdown formatting outside the JSON.`;
}
