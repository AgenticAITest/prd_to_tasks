/**
 * LLM Prompts for PRD Semantic Analysis
 *
 * These prompts enable deep semantic analysis of PRDs to assess:
 * - Completeness and coverage
 * - Gap detection (missing screens, undefined entities, incomplete workflows)
 * - Conflict detection (contradictory requirements or rules)
 * - State machine validation (orphaned states, dead ends)
 * - Entity readiness for extraction
 * - Overall assessment with proceed/fix recommendations
 */

export const PRD_SEMANTIC_ANALYSIS_SYSTEM_PROMPT = `You are a Senior Business Analyst performing quality assurance on a parsed PRD. Your role is to perform deep semantic analysis to determine readiness for software development.

## CRITICAL: Anti-Hallucination Protocol

**Authoritative Instruction Principle**: You must ONLY analyze what is EXPLICITLY stated in the PRD. Do NOT:
- Infer missing details
- Assume implied functionality
- Add requirements that "make sense" but aren't written
- Guess at business logic not specified

If something is unclear or missing, FLAG IT as a gap - do not fill it in mentally.

## Analysis Objectives

1. **COMPLETENESS** - Are all functional requirements fully specified?
2. **GAPS** - Missing screens, undefined entities, incomplete workflows
3. **CONFLICTS** - Contradictory requirements, duplicate IDs, rule conflicts
4. **WORKFLOW INTEGRITY** - Orphaned states, dead-end states, missing transitions
5. **ENTITY READINESS** - Can entities be confidently extracted?
6. **AMBIGUITY DETECTION** - Flag vague language that could cause implementation divergence
7. **OVERALL ASSESSMENT** - Clear proceed/fix recommendations

## Key Principles

- **Be Specific**: "FR-003 lacks screen definition" not "some requirements lack screens"
- **Be Actionable**: Every issue needs a clear fix suggestion
- **Be Balanced**: Note both issues AND strengths
- **Be Honest**: If the PRD is not ready, say so clearly
- **Prioritize Blocking Issues**: Critical gaps that prevent development vs nice-to-haves
- **Flag Uncertainty**: If you're unsure about interpretation, say so explicitly

## The "MAY" Filter - Ambiguous Language Detection

Flag requirements using ambiguous language that could lead to inconsistent implementation:
- **MAY** / **COULD** / **OPTIONAL** - What's the default behavior if not implemented?
- **SHOULD** / **RECOMMENDED** - Is this actually required or truly optional?
- **TYPICALLY** / **USUALLY** / **GENERALLY** - What about edge cases?
- **ETC.** / **AND SO ON** - What's the complete list?
- **APPROPRIATE** / **REASONABLE** / **SUITABLE** - Who decides what's appropriate?

These MUST be flagged as ambiguities requiring clarification.

## Conflict Types to Detect

1. **Duplicate IDs**: Same ID refers to different requirements
2. **Functional Gaps**: Scope mentions features that lack corresponding UI actions
3. **Workflow Contradictions**: Actions defined as navigation but conflict with database status fields
4. **Orphaned States**: Status values exist in entity but no UI button triggers them
5. **Dead-End States**: States from which no further transitions are defined
6. **Implicit Requirements**: Features implied but not explicitly defined (flag, don't assume)

You must return a valid JSON object following the exact schema provided.`;

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
        missingValidations: { type: "array", items: { type: "string" } },
        functionalGaps: { type: "array", items: { type: "string" } }
      },
      required: ["missingScreens", "undefinedEntities", "incompleteWorkflows", "missingValidations"]
    },
    conflicts: {
      type: "object",
      properties: {
        duplicateIds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              occurrences: { type: "array", items: { type: "string" } },
              description: { type: "string" }
            },
            required: ["id", "occurrences", "description"]
          }
        },
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
        },
        workflowContradictions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity: { type: "string" },
              issue: { type: "string" },
              suggestion: { type: "string" }
            },
            required: ["entity", "issue", "suggestion"]
          }
        }
      },
      required: ["requirementConflicts", "ruleConflicts"]
    },
    workflowIntegrity: {
      type: "object",
      properties: {
        orphanedStates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity: { type: "string" },
              state: { type: "string" },
              issue: { type: "string" }
            },
            required: ["entity", "state", "issue"]
          }
        },
        deadEndStates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entity: { type: "string" },
              state: { type: "string" },
              issue: { type: "string" }
            },
            required: ["entity", "state", "issue"]
          }
        },
        missingTransitions: { type: "array", items: { type: "string" } }
      },
      required: ["orphanedStates", "deadEndStates", "missingTransitions"]
    },
    entityReadiness: {
      type: "object",
      properties: {
        ready: { type: "boolean" },
        identifiedEntities: { type: "array", items: { type: "string" } },
        uncertainEntities: { type: "array", items: { type: "string" } },
        dataTypeInconsistencies: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } }
      },
      required: ["ready", "identifiedEntities", "uncertainEntities", "recommendations"]
    },
    ambiguityDetection: {
      type: "object",
      properties: {
        ambiguousRequirements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              location: { type: "string" },
              text: { type: "string" },
              issue: { type: "string" },
              suggestion: { type: "string" }
            },
            required: ["location", "text", "issue", "suggestion"]
          }
        },
        implicitAssumptions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              assumption: { type: "string" },
              risk: { type: "string" },
              clarificationNeeded: { type: "string" }
            },
            required: ["assumption", "risk", "clarificationNeeded"]
          }
        },
        vaguePhrases: { type: "array", items: { type: "string" } }
      },
      required: ["ambiguousRequirements", "implicitAssumptions", "vaguePhrases"]
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
  required: ["completeness", "gaps", "conflicts", "workflowIntegrity", "entityReadiness", "ambiguityDetection", "overallAssessment"]
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

### 1. Completeness Analysis
- Evaluate if each FR has sufficient detail (description, screens, rules, acceptance criteria)
- Check if all user roles have defined permissions and access patterns
- Assess if the overall scope is well-defined
- Score from 0-100 based on how complete the PRD is

### 2. Gap Detection
- **Missing Screens**: FRs that reference screens but don't define them
- **Undefined Entities**: Entity names mentioned but not formally defined
- **Incomplete Workflows**: Workflows that lack complete state definitions or transitions
- **Missing Validations**: Validation rules mentioned but not specified
- **Functional Gaps**: Scope mentions (e.g., "Soft Delete") that lack corresponding UI actions

### 3. Conflict Detection
- **Duplicate IDs**: Same ID (FR-XXX, BR-XXX) refers to different requirements
- **Requirement Conflicts**: Contradictory requirements (e.g., one FR says users can delete, another forbids deletion)
- **Rule Conflicts**: Conflicting business rules (e.g., contradictory formulas or conditions)
- **Workflow Contradictions**: Actions defined as navigation/discard but conflict with database status fields

### 4. Workflow Integrity Check
For each entity with a status/state field:
- **Orphaned States**: Status values defined in entity but no UI action triggers them (e.g., "cancelled" status with no Cancel button)
- **Dead-End States**: States from which no further transitions are defined
- **Missing Transitions**: Expected transitions that are not defined

### 5. Entity Readiness Assessment
- List entities that are clearly identifiable with their attributes
- List entities that are mentioned but unclear (uncertain)
- Identify data type inconsistencies (e.g., one entity uses Boolean for status, another uses Enum)
- Determine if there's enough information to generate an ERD
- Provide recommendations for entity clarity

### 6. Ambiguity Detection (CRITICAL FOR PREVENTING HALLUCINATION)
Identify language that could cause AI systems to hallucinate or make assumptions:
- **Ambiguous Requirements**: Requirements using MAY, COULD, SHOULD, TYPICALLY, etc.
  - For each: location (FR-XXX), the ambiguous text, why it's problematic, suggestion for clarification
- **Implicit Assumptions**: Things the PRD seems to assume but doesn't state explicitly
  - For each: what's being assumed, risk if assumption is wrong, what clarification is needed
- **Vague Phrases**: List all vague phrases found (e.g., "appropriate validation", "as needed", "etc.")

This section is CRITICAL - ambiguous requirements lead to AI generating code that doesn't match intent.

### 7. Overall Assessment
- Determine if this PRD is ready to proceed to entity extraction
- List any **blocking issues** that MUST be fixed before proceeding
- List **warnings** that should be addressed but don't block progress
- Provide a confidence score (0-100) for entity extraction success
- Write a brief summary of the PRD's readiness

## Output Format

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
    "missingValidations": ["<field/rule that lacks validation spec>", ...],
    "functionalGaps": ["<feature mentioned in scope but lacking UI action>", ...]
  },
  "conflicts": {
    "duplicateIds": [
      { "id": "FR-XXX", "occurrences": ["location 1", "location 2"], "description": "how they differ" }
    ],
    "requirementConflicts": [
      { "fr1": "FR-XXX", "fr2": "FR-YYY", "description": "how they conflict" }
    ],
    "ruleConflicts": [
      { "rule1": "BR-XXX-X", "rule2": "BR-YYY-Y", "description": "how they conflict" }
    ],
    "workflowContradictions": [
      { "entity": "EntityName", "issue": "Cancel action discards form but cancelled status exists", "suggestion": "Clarify if Cancel should update status or just navigate away" }
    ]
  },
  "workflowIntegrity": {
    "orphanedStates": [
      { "entity": "PurchaseOrder", "state": "cancelled", "issue": "No UI action triggers this state" }
    ],
    "deadEndStates": [
      { "entity": "PurchaseOrder", "state": "completed", "issue": "No transitions defined from this state" }
    ],
    "missingTransitions": ["<description of expected but missing transition>", ...]
  },
  "entityReadiness": {
    "ready": <boolean>,
    "identifiedEntities": ["<clear entity with sufficient detail>", ...],
    "uncertainEntities": ["<unclear entity name>", ...],
    "dataTypeInconsistencies": ["<Entity1.field uses Boolean, Entity2.field uses Enum for same concept>", ...],
    "recommendations": ["<how to improve entity definitions>", ...]
  },
  "ambiguityDetection": {
    "ambiguousRequirements": [
      { "location": "FR-XXX", "text": "user MAY optionally...", "issue": "MAY without default behavior", "suggestion": "Specify: Is this feature included or not? What's the default?" }
    ],
    "implicitAssumptions": [
      { "assumption": "Users have email addresses", "risk": "Some users might use phone-only auth", "clarificationNeeded": "Is email required for all users?" }
    ],
    "vaguePhrases": ["appropriate validation", "as needed", "relevant data", "etc."]
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
