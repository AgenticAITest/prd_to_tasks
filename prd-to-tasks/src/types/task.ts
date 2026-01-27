// Programmable Task Types

export interface TaskSet {
  id: string;
  projectId?: string;
  projectName?: string;
  moduleName?: string;
  version?: string;
  generatedAt: Date;
  tasks: ProgrammableTask[];
  summary: TaskSummary;
  metadata?: TaskSetMetadata;
}

export interface ProgrammableTask {
  id: string;
  title: string;
  type: TaskType;
  tier: TaskTier;
  module: string;
  relatedFR?: string;
  relatedEntity?: string;
  priority: TaskPriority;
  dependencies: string[];       // Task IDs this depends on
  dependents?: string[];        // Task IDs that depend on this

  // Full specification - NO REFERENCES, fully expanded
  specification: TaskSpecification;

  // Verification criteria
  acceptanceCriteria: string[];
  testCases?: TestCase[];

  // Metadata
  estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';
  tags: string[];
  notes?: string;

  // Status tracking (optional, for UI)
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
}

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskType =
  | 'database-migration'
  | 'api-crud'
  | 'api-custom'
  | 'ui-list'
  | 'ui-form'
  | 'ui-detail'
  | 'ui-modal'
  | 'ui-dashboard'
  | 'ui-report'
  | 'validation'
  | 'business-logic'
  | 'workflow'
  | 'integration'
  | 'test'
  | 'documentation'

export type TaskTier =
  | 'T1'    // Simple, repetitive (junior dev / AI)
  | 'T2'    // Standard complexity (mid-level dev)
  | 'T3'    // Complex logic (senior dev)
  | 'T4'    // Architecture/design (tech lead)

export interface TaskSpecification {
  // Overview
  objective: string;
  context: string;

  // Detailed requirements - fully expanded, no references
  requirements: string[];

  // For database tasks
  database?: DatabaseTaskSpec | DatabaseSpecification;

  // For API tasks
  api?: APITaskSpec | APISpecification;

  // For UI tasks
  ui?: UITaskSpec | UISpecification;

  // For validation/business logic tasks
  validation?: ValidationTaskSpec | ValidationSpecification;

  // For workflow tasks
  workflow?: WorkflowTaskSpec | WorkflowSpecification;

  // Technical notes
  technicalNotes?: string[];

  // Detailed technical implementation guidance (structured)
  technicalImplementation?: {
    stack?: string[];             // Recommended stack (e.g., ['Node.js','Postgres'])
    libraries?: string[];         // Suggested libraries / frameworks
    infra?: string[];            // Infrastructure notes (queues, caches, infra services)
    config?: string[];           // Configuration / env vars / runtime settings
    steps?: string[];            // Step-by-step implementation plan
    codeExamples?: string[];     // Small code snippets or cli commands
    estimatedEffortHours?: number;
  };
  // Edge cases to handle
  edgeCases?: string[];

  // Security considerations
  securityNotes?: string[];
}

export interface DatabaseTaskSpec {
  tableName: string;
  operation: 'create' | 'alter' | 'migrate';
  schema: {
    columns: {
      name: string;
      type: string;
      constraints: string[];
      description?: string;
    }[];
    indexes?: {
      name: string;
      columns: string[];
      unique: boolean;
    }[];
    foreignKeys?: {
      column: string;
      references: string;
      onDelete?: string;
      onUpdate?: string;
    }[];
  };
  migrationScript?: string;
  rollbackScript?: string;
}

export interface APITaskSpec {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  authentication: string;
  authorization: string[];

  request: {
    params?: FieldSpec[];
    query?: FieldSpec[];
    body?: FieldSpec[];
  };

  response: {
    success: {
      status: number;
      body: string;    // Full schema description
    };
    errors: {
      status: number;
      condition: string;
      body: string;
    }[];
  };

  // Fully expanded business rules
  businessRules: {
    id: string;
    name: string;
    description: string;
    implementation: string;
  }[];
}

export interface UITaskSpec {
  screenName: string;
  route: string;
  screenType: 'list' | 'form' | 'detail' | 'modal' | 'dashboard' | 'report';

  // Fully expanded layout
  layout: {
    description: string;
    wireframe?: string;     // ASCII or HTML wireframe
    components: string[];   // List of UI components needed
  };

  // Fully expanded field specifications
  fields: UIFieldSpec[];

  // Actions with full details
  actions: UIActionSpec[];

  // Data requirements
  dataSource: {
    api: string;
    method: string;
    params?: Record<string, string>;
  };

  // State management notes
  stateManagement?: string;

  // Accessibility requirements
  accessibility?: string[];
}

export interface UIFieldSpec {
  id: string;
  label: string;
  type: string;
  entityMapping: string;
  validation: string[];     // Fully expanded validation rules
  placeholder?: string;
  defaultValue?: string;
  options?: { label: string; value: string }[];
  conditionalDisplay?: string;
  helpText?: string;
}

export interface UIActionSpec {
  id: string;
  label: string;
  type: 'button' | 'link' | 'icon-button';
  action: string;          // What happens when clicked
  position: string;        // Where on screen
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  confirmation?: string;   // Confirmation message if any
  enabledWhen?: string;    // Condition for enabled state
}

export interface ValidationTaskSpec {
  targetEntity: string;
  targetField?: string;
  rules: {
    id: string;
    name: string;
    type: 'field' | 'entity' | 'cross-entity';
    condition: string;     // Fully expanded condition
    errorMessage: string;
    errorCode: string;
    priority: number;
  }[];
}

export interface WorkflowTaskSpec {
  workflowName: string;
  entity: string;
  statusField: string;

  states: {
    id: string;
    name: string;
    description: string;
    isInitial: boolean;
    isFinal: boolean;
    allowedActions: string[];
  }[];

  transitions: {
    id: string;
    from: string;
    to: string;
    trigger: string;
    conditions: string[];   // Fully expanded conditions
    sideEffects: string[];  // Fully expanded side effects
    requiredRoles: string[];
  }[];
}

export interface FieldSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validation?: string[];
  example?: string;
}

export interface TestCase {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  given: string;
  when: string;
  then: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TaskSummary {
  totalTasks: number;
  byType?: Record<TaskType, number>;
  byTier?: Record<TaskTier, number>;
  byModule?: Record<string, number>;
  byPriority?: Record<string, number>;
  criticalPath?: string[];       // Task IDs in critical path
  estimatedComplexity?: {
    trivial: number;
    simple: number;
    moderate: number;
    complex: number;
    veryComplex: number;
  } | 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';
  // Aliases used by task generator
  tierBreakdown?: Record<TaskTier, number>;
  typeBreakdown?: Record<string, number>;
}

export interface TaskSetMetadata {
  generatorVersion: string;
  prdId: string;
  erdId: string;
  standardsApplied: string[];
  exportFormats: ('json' | 'yaml' | 'markdown')[];
  // Optional reference to an attached architecture guide
  architectureGuide?: { id?: string; name?: string };
  // Optional flags to indicate LLM step outcomes
  architectureExtractionSkipped?: string; // reason code
  architectureExtractionRaw?: string; // raw LLM response if available
  architectureRecommendations?: any[];
  // Implementation enrichment status: 'enriched' | 'not_enriched' | 'skipped' | 'failed'
  architectureImplementationStatus?: string;
  architectureImplementationRaw?: string;
  architectureImplementationSkipped?: string;
}

// Export formats
export interface TaskExportOptions {
  format: 'json' | 'yaml' | 'markdown';
  includeMetadata: boolean;
  includeTestCases: boolean;
  groupBy: 'type' | 'module' | 'priority' | 'tier' | 'none';
  filterByType?: TaskType[];
  filterByTier?: TaskTier[];
  filterByModule?: string[];
}

// Type aliases for task generator compatibility
export interface DatabaseSpecification {
  tableName: string;
  columns: {
    name: string;
    type: string;
    constraints: {
      primaryKey?: boolean;
      unique?: boolean;
      nullable?: boolean;
      foreignKey?: {
        table: string;
        column: string;
      };
      check?: string;
    };
    defaultValue?: string;
  }[];
  indexes?: {
    name: string;
    columns: string[];
    unique?: boolean;
  }[];
  foreignKeys?: {
    column: string;
    references: {
      table: string;
      column: string;
    };
    onDelete?: string;
    onUpdate?: string;
  }[];
}

export interface APISpecification {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  route: string;
  requestSchema?: {
    type: string;
    properties: Record<string, { type: string; required?: boolean; description?: string }>;
  };
  responseSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    items?: { type: string };
  };
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  pathParams?: { name: string; type: string; required: boolean; description: string }[];
  successCode: number;
  errorCodes: { code: number; description: string }[];
}

export interface UISpecification {
  screenType: string;
  route: string;
  layout: {
    type: string;
    template?: string;
  };
  fields: {
    name: string;
    label: string;
    type: string;
    validation?: string[];
    required: boolean;
    defaultValue?: string;
  }[];
  actions: {
    name: string;
    type: string;
    handler: string;
  }[];
  dataSource?: string;
}

export interface ValidationSpecification {
  ruleName: string;
  ruleType: string;
  targetEntity: string;
  targetFields: string[];
  condition: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface WorkflowSpecification {
  workflowName: string;
  states: {
    name: string;
    type: string;
    description: string;
    allowedTransitions: string[];
  }[];
  transitions: {
    name: string;
    from: string;
    to: string;
    trigger: string;
    conditions?: string[];
    actions?: string[];
  }[];
  initialState: string;
  finalStates: string[];
}
