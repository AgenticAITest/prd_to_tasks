// Analysis Types for PRD Quality and Blocking Issues

export interface AnalysisResult {
  prdId: string;
  analyzedAt: Date;
  qualityScore: QualityScoreResult;
  blockingIssues: BlockingIssue[];
  warnings: AnalysisWarning[];
  suggestions: AnalysisSuggestion[];
  crudAnalysis: CRUDAnalysisResult;
  workflowAnalysis: WorkflowAnalysisResult;
  screenAnalysis: ScreenAnalysisResult;
}

// Quality Score
export interface QualityScoreResult {
  overall: number;              // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    completeness: ScoreDetail;
    clarity: ScoreDetail;
    consistency: ScoreDetail;
    testability: ScoreDetail;
    technicalReadiness: ScoreDetail;
  };
  trendData?: {
    timestamp: Date;
    score: number;
  }[];
}

export interface ScoreDetail {
  score: number;                // 0-100
  weight: number;               // Weight in overall calculation
  factors: {
    name: string;
    score: number;
    impact: 'positive' | 'negative' | 'neutral';
    details?: string;
  }[];
}

// Blocking Issues
export interface BlockingIssue {
  id: string;
  severity: 'critical' | 'major';
  category: BlockingIssueCategory;
  title: string;
  description: string;
  location: IssueLocation;
  impact: string;
  suggestedFix: string;
  autoFixable: boolean;
  autoFix?: () => void;
}

export type BlockingIssueCategory =
  | 'missing-requirement'
  | 'undefined-entity'
  | 'missing-screen'
  | 'incomplete-workflow'
  | 'circular-dependency'
  | 'missing-business-rule'
  | 'invalid-reference'
  | 'security-concern'

export interface IssueLocation {
  type: 'fr' | 'br' | 'screen' | 'entity' | 'workflow' | 'general';
  id?: string;
  section?: string;
  line?: number;
}

// Warnings (non-blocking)
export interface AnalysisWarning {
  id: string;
  severity: 'medium' | 'low';
  category: WarningCategory;
  title: string;
  description: string;
  location: IssueLocation;
  suggestion?: string;
}

export type WarningCategory =
  | 'ambiguous-requirement'
  | 'missing-detail'
  | 'inconsistent-naming'
  | 'potential-issue'
  | 'best-practice'
  | 'performance-concern'

// Suggestions
export interface AnalysisSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export type SuggestionType =
  | 'add-validation'
  | 'add-index'
  | 'add-audit'
  | 'add-test'
  | 'refactor'
  | 'security'
  | 'performance'
  | 'ux'

// CRUD Analysis
export interface CRUDAnalysisResult {
  entities: CRUDEntityCoverage[];
  overallCoverage: number;
  missingOperations: {
    entity: string;
    operations: ('create' | 'read' | 'update' | 'delete')[];
    suggestedFR?: string;
  }[];
}

export interface CRUDEntityCoverage {
  entity: string;
  operations: {
    create: CRUDOperationDetail;
    read: CRUDOperationDetail;
    update: CRUDOperationDetail;
    delete: CRUDOperationDetail;
  };
  coverageScore: number;
}

export interface CRUDOperationDetail {
  covered: boolean;
  frId?: string;
  screenIds?: string[];
  notes?: string;
}

// Workflow Analysis
export interface WorkflowAnalysisResult {
  workflows: WorkflowAnalysisDetail[];
  issues: WorkflowIssue[];
}

export interface WorkflowAnalysisDetail {
  frId: string;
  workflowName: string;
  stateCount: number;
  transitionCount: number;
  hasInitialState: boolean;
  hasFinalStates: boolean;
  hasApprovalFlow: boolean;
  reachabilityMatrix: Record<string, string[]>;
  deadEndStates: string[];
  orphanedStates: string[];
  isComplete: boolean;
}

export interface WorkflowIssue {
  workflowId: string;
  type: 'dead-end' | 'orphaned' | 'missing-initial' | 'missing-final' | 'unreachable' | 'missing-condition';
  description: string;
  affectedStates?: string[];
}

// Screen Analysis
export interface ScreenAnalysisResult {
  totalScreens: number;
  screensByType: Record<string, number>;
  coverage: ScreenCoverageDetail[];
  orphanedScreens: string[];
  missingScreens: MissingScreen[];
  reusedScreens: {
    screenId: string;
    reusedIn: string[];
  }[];
}

export interface ScreenCoverageDetail {
  frId: string;
  requiredScreenTypes: string[];
  coveredScreenTypes: string[];
  missingScreenTypes: string[];
  score: number;
}

export interface MissingScreen {
  forFR: string;
  expectedType: 'list' | 'form' | 'detail' | 'modal';
  reason: string;
}

// Progress tracking
export interface AnalysisProgress {
  phase: 'parsing' | 'extracting' | 'analyzing' | 'scoring' | 'complete';
  currentStep: string;
  progress: number;            // 0-100
  startedAt: Date;
  estimatedCompletion?: Date;
}

// Semantic Analysis (LLM-powered)
export interface SemanticAnalysisResult {
  completeness: {
    score: number; // 0-100
    missingElements: string[];
    recommendations: string[];
  };
  gaps: {
    missingScreens: string[];
    undefinedEntities: string[];
    incompleteWorkflows: string[];
    missingValidations: string[];
  };
  conflicts: {
    requirementConflicts: Array<{
      fr1: string;
      fr2: string;
      description: string;
    }>;
    ruleConflicts: Array<{
      rule1: string;
      rule2: string;
      description: string;
    }>;
  };
  entityReadiness: {
    ready: boolean;
    identifiedEntities: string[];
    uncertainEntities: string[];
    recommendations: string[];
  };
  overallAssessment: {
    canProceed: boolean;
    confidenceScore: number; // 0-100
    blockingIssues: string[];
    warnings: string[];
    summary: string;
  };
  analyzedAt: Date;
}
