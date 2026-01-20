import type {
  StructuredPRD,
} from '@/types/prd';
import type {
  AnalysisResult,
  BlockingIssue,
  AnalysisWarning,
  QualityScoreResult,
  CRUDAnalysisResult,
} from '@/types/analysis';
import { generateId } from '@/lib/utils';

export function analyzePRD(prd: StructuredPRD): AnalysisResult {
  const qualityScore = calculateQualityScore(prd);
  const blockingIssues = detectBlockingIssues(prd);
  const warnings = detectWarnings(prd);
  const crudAnalysis = analyzeCRUDCoverage(prd);
  const workflowAnalysis = analyzeWorkflows(prd);
  const screenAnalysis = analyzeScreenCoverage(prd);

  return {
    prdId: prd.id,
    analyzedAt: new Date(),
    qualityScore,
    blockingIssues,
    warnings,
    suggestions: [],
    crudAnalysis,
    workflowAnalysis: {
      workflows: workflowAnalysis,
      issues: [],
    },
    screenAnalysis,
  };
}

export function calculateQualityScore(prd: StructuredPRD): QualityScoreResult {
  const completeness = calculateCompletenessScore(prd);
  const clarity = calculateClarityScore(prd);
  const consistency = calculateConsistencyScore(prd);
  const testability = calculateTestabilityScore(prd);
  const technicalReadiness = calculateTechnicalReadinessScore(prd);

  const weights = {
    completeness: 0.3,
    clarity: 0.25,
    consistency: 0.25,
    testability: 0.1,
    technicalReadiness: 0.1,
  };

  const overall =
    completeness.score * weights.completeness +
    clarity.score * weights.clarity +
    consistency.score * weights.consistency +
    testability.score * weights.testability +
    technicalReadiness.score * weights.technicalReadiness;

  return {
    overall: Math.round(overall),
    grade: getGrade(overall),
    breakdown: {
      completeness,
      clarity,
      consistency,
      testability,
      technicalReadiness,
    },
  };
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function calculateCompletenessScore(prd: StructuredPRD) {
  const factors: { name: string; score: number; impact: 'positive' | 'negative' | 'neutral' }[] = [];
  let totalScore = 0;
  let count = 0;

  // Check for functional requirements
  const hasFRs = prd.functionalRequirements.length > 0;
  factors.push({
    name: 'Has functional requirements',
    score: hasFRs ? 100 : 0,
    impact: hasFRs ? 'positive' : 'negative',
  });
  totalScore += hasFRs ? 100 : 0;
  count++;

  // Check for user roles
  const hasRoles = prd.userRoles.length > 0;
  factors.push({
    name: 'Has user roles defined',
    score: hasRoles ? 100 : 50,
    impact: hasRoles ? 'positive' : 'neutral',
  });
  totalScore += hasRoles ? 100 : 50;
  count++;

  // Check FR completeness (screens, business rules)
  let frCompleteness = 0;
  prd.functionalRequirements.forEach((fr) => {
    let frScore = 0;
    if (fr.description) frScore += 25;
    if (fr.screens.length > 0) frScore += 25;
    if (fr.businessRules.length > 0) frScore += 25;
    if (fr.acceptanceCriteria.length > 0) frScore += 25;
    frCompleteness += frScore;
  });
  const avgFRCompleteness = prd.functionalRequirements.length > 0
    ? frCompleteness / prd.functionalRequirements.length
    : 0;

  factors.push({
    name: 'FR completeness',
    score: avgFRCompleteness,
    impact: avgFRCompleteness >= 70 ? 'positive' : avgFRCompleteness >= 50 ? 'neutral' : 'negative',
  });
  totalScore += avgFRCompleteness;
  count++;

  return {
    score: Math.round(totalScore / count),
    weight: 0.3,
    factors,
  };
}

function calculateClarityScore(prd: StructuredPRD) {
  const factors: { name: string; score: number; impact: 'positive' | 'negative' | 'neutral' }[] = [];

  // Check for clear descriptions
  const hasDescriptions = prd.functionalRequirements.every((fr) => fr.description.length > 20);
  factors.push({
    name: 'Clear requirement descriptions',
    score: hasDescriptions ? 100 : 60,
    impact: hasDescriptions ? 'positive' : 'neutral',
  });

  return {
    score: hasDescriptions ? 100 : 60,
    weight: 0.25,
    factors,
  };
}

function calculateConsistencyScore(prd: StructuredPRD) {
  const factors: { name: string; score: number; impact: 'positive' | 'negative' | 'neutral' }[] = [];

  // Check for consistent ID patterns
  const hasConsistentIds = prd.functionalRequirements.every((fr) =>
    fr.id.match(/^FR-\d{3}$/)
  );
  factors.push({
    name: 'Consistent ID patterns',
    score: hasConsistentIds ? 100 : 70,
    impact: hasConsistentIds ? 'positive' : 'neutral',
  });

  return {
    score: hasConsistentIds ? 100 : 70,
    weight: 0.25,
    factors,
  };
}

function calculateTestabilityScore(prd: StructuredPRD) {
  const factors: { name: string; score: number; impact: 'positive' | 'negative' | 'neutral' }[] = [];

  // Check for acceptance criteria
  const hasAC = prd.functionalRequirements.some(
    (fr) => fr.acceptanceCriteria.length > 0
  );
  factors.push({
    name: 'Has acceptance criteria',
    score: hasAC ? 100 : 40,
    impact: hasAC ? 'positive' : 'negative',
  });

  return {
    score: hasAC ? 100 : 40,
    weight: 0.1,
    factors,
  };
}

function calculateTechnicalReadinessScore(prd: StructuredPRD) {
  const factors: { name: string; score: number; impact: 'positive' | 'negative' | 'neutral' }[] = [];

  // Check for entity definitions
  const hasEntities = prd.dataRequirements.entities.length > 0;
  factors.push({
    name: 'Has entity definitions',
    score: hasEntities ? 100 : 50,
    impact: hasEntities ? 'positive' : 'neutral',
  });

  return {
    score: hasEntities ? 100 : 50,
    weight: 0.1,
    factors,
  };
}

export function detectBlockingIssues(prd: StructuredPRD): BlockingIssue[] {
  const issues: BlockingIssue[] = [];

  // Check for FRs without screens
  prd.functionalRequirements.forEach((fr) => {
    if (fr.screens.length === 0 && !fr.isWorkflow) {
      issues.push({
        id: generateId(),
        severity: 'major',
        category: 'missing-screen',
        title: `${fr.id} has no screens defined`,
        description: `The functional requirement ${fr.id} does not have any associated screens.`,
        location: { type: 'fr', id: fr.id },
        impact: 'Cannot generate UI tasks for this requirement',
        suggestedFix: `Add screen definitions to ${fr.id}`,
        autoFixable: false,
      });
    }
  });

  // Check for workflow FRs without state definitions
  prd.functionalRequirements.forEach((fr) => {
    if (fr.isWorkflow && (!fr.workflowDefinition || fr.workflowDefinition.states.length === 0)) {
      issues.push({
        id: generateId(),
        severity: 'critical',
        category: 'incomplete-workflow',
        title: `Workflow ${fr.id} has no states defined`,
        description: `The workflow requirement ${fr.id} is missing state definitions.`,
        location: { type: 'workflow', id: fr.id },
        impact: 'Cannot generate workflow implementation tasks',
        suggestedFix: 'Define workflow states and transitions',
        autoFixable: false,
      });
    }
  });

  return issues;
}

export function detectWarnings(prd: StructuredPRD): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  // Check for business rules without error messages
  prd.functionalRequirements.forEach((fr) => {
    fr.businessRules.forEach((br) => {
      if (br.type === 'validation' && !br.errorMessage) {
        warnings.push({
          id: generateId(),
          severity: 'medium',
          category: 'missing-detail',
          title: `${br.id} lacks error message`,
          description: `Business rule ${br.id} does not specify an error message.`,
          location: { type: 'br', id: br.id },
          suggestion: 'Add an error message to the business rule',
        });
      }
    });
  });

  return warnings;
}

export function analyzeCRUDCoverage(prd: StructuredPRD): CRUDAnalysisResult {
  const entities = prd.dataRequirements.entities;
  const coverage: CRUDAnalysisResult['entities'] = [];

  entities.forEach((entity) => {
    // Simplified CRUD detection
    coverage.push({
      entity: entity.name,
      operations: {
        create: { covered: true },
        read: { covered: true },
        update: { covered: true },
        delete: { covered: false },
      },
      coverageScore: 75,
    });
  });

  return {
    entities: coverage,
    overallCoverage: coverage.length > 0
      ? coverage.reduce((sum, e) => sum + e.coverageScore, 0) / coverage.length
      : 0,
    missingOperations: [],
  };
}

export function analyzeWorkflows(prd: StructuredPRD) {
  return prd.functionalRequirements
    .filter((fr) => fr.isWorkflow && fr.workflowDefinition)
    .map((fr) => ({
      frId: fr.id,
      workflowName: fr.workflowDefinition!.name,
      stateCount: fr.workflowDefinition!.states.length,
      transitionCount: fr.workflowDefinition!.transitions.length,
      hasInitialState: !!fr.workflowDefinition!.initialState,
      hasFinalStates: fr.workflowDefinition!.finalStates.length > 0,
      hasApprovalFlow: fr.workflowDefinition!.states.some(
        (s) => s.type === 'approval'
      ),
      reachabilityMatrix: {},
      deadEndStates: [],
      orphanedStates: [],
      isComplete: true,
    }));
}

export function analyzeScreenCoverage(prd: StructuredPRD) {
  const allScreens = prd.functionalRequirements.flatMap((fr) => fr.screens);
  const screensByType: Record<string, number> = {};

  allScreens.forEach((screen) => {
    screensByType[screen.type] = (screensByType[screen.type] || 0) + 1;
  });

  return {
    totalScreens: allScreens.length,
    screensByType,
    coverage: prd.functionalRequirements.map((fr) => ({
      frId: fr.id,
      requiredScreenTypes: [],
      coveredScreenTypes: fr.screens.map((s) => s.type),
      missingScreenTypes: [],
      score: fr.screens.length > 0 ? 100 : 0,
    })),
    orphanedScreens: [],
    missingScreens: [],
    reusedScreens: [],
  };
}
