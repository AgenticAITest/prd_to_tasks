// PRD (Product Requirements Document) Types

export interface StructuredPRD {
  id: string;
  projectName: string;
  moduleName: string;
  version: string;
  overview: PRDOverview;
  userRoles: UserRole[];
  functionalRequirements: FunctionalRequirement[];
  dataRequirements: DataRequirements;
  nonFunctionalRequirements: NonFunctionalRequirements;
  qualityScore: QualityScore;
  analysisResults: FunctionalAnalysis;
  rawContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PRDOverview {
  description: string;
  objectives: string[];
  scope: {
    included: string[];
    excluded: string[];
  };
  assumptions: string[];
  constraints: string[];
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface FunctionalRequirement {
  id: string;                    // FR-001
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  accessRoles: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  screens: Screen[];
  screenFlow: ScreenFlow;
  involvedEntities: string[];
  isWorkflow: boolean;
  workflowDefinition?: WorkflowDefinition;
  completenessScore?: number;
  issues?: string[];
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  type: 'functional' | 'ui' | 'data' | 'performance';
}

export interface BusinessRule {
  id: string;                    // BR-001-A
  name: string;
  type: 'validation' | 'calculation' | 'constraint' | 'workflow';
  description: string;
  formula?: string;
  conditions?: string[];
  errorMessage?: string;
  relatedFR?: string;
}

export interface Screen {
  id: string;                    // SCR-001
  name: string;
  type: 'list' | 'form' | 'detail' | 'modal' | 'dashboard' | 'report';
  route: string;
  layout: ScreenLayout;
  fieldMappings: FieldMapping[];
  actions: ScreenAction[];
  reusedFrom?: string;
  reuseDifferences?: string[];
  relatedFR?: string;
}

export interface ScreenLayout {
  type: 'wireframe' | 'html' | 'image' | 'description';
  content: string;
}

export interface FieldMapping {
  fieldId: string;
  fieldName: string;
  label: string;
  entityField: string;
  inputType: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'textarea' | 'file' | 'currency' | 'percentage';
  validation?: string[];
  defaultValue?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  isRequired: boolean;
  isReadonly?: boolean;
  isHidden?: boolean;
}

export interface ScreenAction {
  id: string;
  label: string;
  type: 'submit' | 'cancel' | 'navigate' | 'modal' | 'api' | 'download' | 'print';
  action: string;
  target?: string;
  confirmMessage?: string;
  validationRules?: string[];
}

export interface ScreenFlow {
  steps: ScreenFlowStep[];
  defaultPath?: string[];
}

export interface ScreenFlowStep {
  screenId: string;
  transitions: ScreenTransition[];
}

export interface ScreenTransition {
  action: string;
  targetScreenId: string;
  condition?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  initialState: string;
  finalStates: string[];
}

export interface WorkflowState {
  id: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'approval';
  description?: string;
  allowedActions: string[];
  assignedRoles?: string[];
}

export interface WorkflowTransition {
  id: string;
  name: string;
  from: string;
  to: string;
  action: string;
  trigger: string;
  conditions?: string[];
  actions?: string[];
  sideEffects?: string[];
}

export interface DataRequirements {
  entities: EntityDefinition[];
  enums: EnumDefinition[];
}

export interface EntityDefinition {
  name: string;
  description: string;
  fields: string[];
  relationships?: string[];
}

export interface EnumDefinition {
  name: string;
  values: { key: string; label: string }[];
}

export interface NonFunctionalRequirements {
  performance?: {
    responseTime?: string;
    throughput?: string;
    concurrentUsers?: number;
  };
  security?: {
    authentication?: string;
    authorization?: string;
    dataProtection?: string[];
  };
  scalability?: string;
  availability?: string;
  compliance?: string[];
}

export interface QualityScore {
  overall: number;
  breakdown: {
    completeness: number;
    clarity: number;
    consistency: number;
    testability: number;
  };
  details: {
    section: string;
    score: number;
    issues: string[];
  }[];
}

export interface FunctionalAnalysis {
  crudCoverage: CRUDCoverage[];
  workflowSummary: WorkflowSummary[];
  screenCoverage: ScreenCoverage;
  entityUsage: EntityUsage[];
}

export interface CRUDCoverage {
  entity: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  missingOperations: string[];
}

export interface WorkflowSummary {
  frId: string;
  name: string;
  stateCount: number;
  transitionCount: number;
  hasApprovalSteps: boolean;
  isComplete: boolean;
}

export interface ScreenCoverage {
  totalScreens: number;
  screensByType: Record<string, number>;
  orphanedScreens: string[];
  missingScreens: string[];
}

export interface EntityUsage {
  entity: string;
  usedInFRs: string[];
  usedInScreens: string[];
  fieldsUsed: string[];
}

// File types
export interface ProjectFile {
  id: string;
  name: string;
  type: 'prd' | 'screen' | 'generated' | 'other';
  content: string;
  format?: 'md' | 'pdf' | 'txt' | 'html' | 'json' | 'yaml' | 'dbml';
  size: number;
  uploadedAt: Date;
}
