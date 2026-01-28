import type { StructuredPRD, FunctionalRequirement, BusinessRule, Screen } from '@/types/prd';
import type { Entity, Relationship } from '@/types/entity';
import type {
  TaskSet,
  ProgrammableTask,
  TaskType,
  DatabaseSpecification,
  APISpecification,
  UISpecification,
  ValidationSpecification,
  WorkflowSpecification,
  EnvironmentSetupSpec,
  ServiceLayerSpec,
  APIClientSpec,
  E2EFlowSpec,
  TestSetupSpec,
  PageCompositionSpec,
  RouteConfigSpec,
  NavigationSpec,
  TestCase,
} from '@/types/task';
import { generateId } from '@/lib/utils';

export interface TaskGenerationContext {
  prd: StructuredPRD;
  entities: Entity[];
  relationships: Relationship[];
  dbml: string;
}

export interface TaskGenerationOptions {
  generateDatabaseTasks: boolean;
  generateApiTasks: boolean;
  generateUiTasks: boolean;
  generateValidationTasks: boolean;
  generateTestTasks: boolean;
  generateIntegrationTasks: boolean;
  expandReferences: boolean;
}

const DEFAULT_OPTIONS: TaskGenerationOptions = {
  generateDatabaseTasks: true,
  generateApiTasks: true,
  generateUiTasks: true,
  generateValidationTasks: true,
  generateTestTasks: true,
  generateIntegrationTasks: true,
  expandReferences: true,
};

let taskCounter = 0;

function generateTaskId(): string {
  taskCounter++;
  return `TASK-${String(taskCounter).padStart(3, '0')}`;
}

export function generateTasks(
  context: TaskGenerationContext,
  options: Partial<TaskGenerationOptions> = {}
): TaskSet {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  taskCounter = 0;

  const tasks: ProgrammableTask[] = [];

  // Generate database migration tasks for each entity
  if (opts.generateDatabaseTasks) {
    context.entities.forEach((entity) => {
      tasks.push(generateDatabaseMigrationTask(entity, context));
    });
  }

  // Generate API CRUD tasks for each entity
  if (opts.generateApiTasks) {
    context.entities.forEach((entity) => {
      tasks.push(...generateAPICrudTasks(entity, context));
    });
  }

  // Generate UI tasks from screens
  if (opts.generateUiTasks) {
    context.prd.functionalRequirements.forEach((fr) => {
      fr.screens.forEach((screen) => {
        tasks.push(generateUITask(screen, fr, context, opts.expandReferences));
      });
    });
  }

  // Generate validation tasks from business rules
  if (opts.generateValidationTasks) {
    context.prd.functionalRequirements.forEach((fr) => {
      fr.businessRules.forEach((br) => {
        if (br.type === 'validation') {
          tasks.push(generateValidationTask(br, fr, context, opts.expandReferences));
        }
      });
    });

    // Generate workflow tasks
    context.prd.functionalRequirements
      .filter((fr) => fr.isWorkflow && fr.workflowDefinition)
      .forEach((fr) => {
        tasks.push(generateWorkflowTask(fr, context, opts.expandReferences));
      });
  }

  // Generate test tasks
  if (opts.generateTestTasks) {
    context.entities.forEach((entity) => {
      tasks.push(generateEntityTestTask(entity, context));
    });
  }

  // Generate integration/orchestration tasks
  if (opts.generateIntegrationTasks) {
    // Environment setup task (one per project)
    tasks.push(generateEnvironmentSetupTask(context));

    // Service layer tasks (one per entity)
    context.entities.forEach((entity) => {
      tasks.push(generateServiceLayerTask(entity, context));
    });

    // API client setup task (one per project)
    tasks.push(generateAPIClientTask(context));

    // Assembly/Composition tasks - must come BEFORE E2E tests
    // First, collect unique screens
    const uniqueScreens = new Map<string, Screen>();
    context.prd.functionalRequirements.forEach((fr) => {
      fr.screens.forEach((screen) => {
        if (!uniqueScreens.has(screen.route)) {
          uniqueScreens.set(screen.route, screen);
        }
      });
    });

    // Route configuration task (one per project)
    tasks.push(generateRouteConfigTask(context, uniqueScreens));

    // Navigation task (one per project)
    tasks.push(generateNavigationTask(context, uniqueScreens));

    // Page composition tasks - one per unique route/screen combination
    uniqueScreens.forEach((screen) => {
      tasks.push(generatePageCompositionTask(screen, context, tasks));
    });

    // E2E flow tasks (one per functional requirement) - AFTER pages are built
    context.prd.functionalRequirements.forEach((fr) => {
      tasks.push(generateE2EFlowTask(fr, context));
    });

    // Test setup task (one per project)
    tasks.push(generateTestSetupTask(context));
  }

  // Resolve dependencies
  const resolvedTasks = resolveDependencies(tasks);

  // Calculate summary
  const tierBreakdown = {
    T1: resolvedTasks.filter((t) => t.tier === 'T1').length,
    T2: resolvedTasks.filter((t) => t.tier === 'T2').length,
    T3: resolvedTasks.filter((t) => t.tier === 'T3').length,
    T4: resolvedTasks.filter((t) => t.tier === 'T4').length,
  };

  const typeBreakdown: Record<string, number> = {};
  resolvedTasks.forEach((task) => {
    typeBreakdown[task.type] = (typeBreakdown[task.type] || 0) + 1;
  });

  return {
    id: generateId(),
    projectId: context.prd.id,
    tasks: resolvedTasks,
    generatedAt: new Date(),
    summary: {
      totalTasks: resolvedTasks.length,
      tierBreakdown,
      typeBreakdown,
      estimatedComplexity: calculateOverallComplexity(resolvedTasks),
    },
  };
}

function generateDatabaseMigrationTask(
  entity: Entity,
  context: TaskGenerationContext
): ProgrammableTask {
  const dbSpec: DatabaseSpecification = {
    tableName: entity.tableName,
    columns: entity.fields.map((field) => ({
      name: field.columnName,
      type: mapDataTypeToSQL(field.dataType),
      constraints: {
        primaryKey: field.constraints.primaryKey,
        unique: field.constraints.unique,
        nullable: field.constraints.nullable,
        foreignKey: undefined,
        check: undefined,
      },
      defaultValue: field.defaultValue as string | undefined,
    })),
    indexes: entity.fields
      .filter((f) => f.constraints.indexed && !f.constraints.primaryKey)
      .map((f) => ({
        name: `idx_${entity.tableName}_${f.columnName}`,
        columns: [f.columnName],
        unique: f.constraints.unique,
      })),
    foreignKeys: context.relationships
      .filter((r) => r.from.entity.toLowerCase() === entity.name.toLowerCase())
      .map((r) => ({
        column: toSnakeCase(r.from.field),
        references: {
          table: toSnakeCase(r.to.entity),
          column: toSnakeCase(r.to.field),
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      })),
  };

  const taskId = generateTaskId();

  return {
    id: taskId,
    title: `Create database migration for ${entity.name}`,
    type: 'database-migration',
    tier: 'T1',
    module: context.prd.moduleName,
    relatedEntity: entity.name,
    priority: 'critical',
    dependencies: [],
    specification: {
      objective: `Create the database table "${entity.tableName}" with all required columns, constraints, and indexes`,
      context: `This migration creates the ${entity.type} entity "${entity.name}" which stores ${entity.description || 'entity data'}`,
      requirements: [
        `Create table "${entity.tableName}" with ${entity.fields.length} columns`,
        `Set primary key on "id" column with UUID type`,
        ...entity.fields
          .filter((f) => !f.constraints.nullable && !f.constraints.primaryKey)
          .map((f) => `Column "${f.columnName}" must be NOT NULL`),
        ...entity.fields
          .filter((f) => f.constraints.unique && !f.constraints.primaryKey)
          .map((f) => `Column "${f.columnName}" must have UNIQUE constraint`),
        ...(entity.isAuditable
          ? ['Add audit columns: created_at, created_by, updated_at, updated_by']
          : []),
        ...(entity.isSoftDelete ? ['Add soft delete columns: deleted_at, deleted_by'] : []),
      ],
      database: dbSpec,
      technicalNotes: [
        'Use UUID for primary key with gen_random_uuid() default',
        'All timestamp columns should use TIMESTAMPTZ',
        'Apply snake_case naming convention for all columns',
      ],
      edgeCases: [
        'Handle concurrent migrations',
        'Ensure rollback capability',
      ],
      securityNotes: [
        'Audit columns should be populated by database triggers or application middleware',
        'Consider row-level security policies if multi-tenant',
      ],
    },
    acceptanceCriteria: [
      `Table "${entity.tableName}" exists in the database`,
      'All columns have correct data types and constraints',
      'Indexes are created for frequently queried columns',
      'Foreign key constraints are properly defined',
      'Migration can be rolled back without data loss',
    ],
    testCases: [
      {
        id: `TC-${taskId}-1`,
        name: 'Table creation',
        type: 'integration',
        given: 'Empty database',
        when: 'Migration is run',
        then: `Table "${entity.tableName}" exists with correct schema`,
        priority: 'high',
      },
      {
        id: `TC-${taskId}-2`,
        name: 'Rollback',
        type: 'integration',
        given: 'Migration has been applied',
        when: 'Rollback is executed',
        then: 'Table is dropped and database returns to previous state',
        priority: 'high',
      },
    ],
    estimatedComplexity: 'simple',
    tags: ['database', 'migration', entity.type],
    executionMode: 'code-generation',
  };
}

function generateAPICrudTasks(
  entity: Entity,
  context: TaskGenerationContext
): ProgrammableTask[] {
  const tasks: ProgrammableTask[] = [];
  const dbMigrationId = `TASK-${String(context.entities.indexOf(entity) + 1).padStart(3, '0')}`;

  // Create endpoint
  tasks.push(generateAPIEndpointTask(entity, 'create', dbMigrationId, context));

  // Read (list) endpoint
  tasks.push(generateAPIEndpointTask(entity, 'list', dbMigrationId, context));

  // Read (single) endpoint
  tasks.push(generateAPIEndpointTask(entity, 'get', dbMigrationId, context));

  // Update endpoint
  tasks.push(generateAPIEndpointTask(entity, 'update', dbMigrationId, context));

  // Delete endpoint
  tasks.push(generateAPIEndpointTask(entity, 'delete', dbMigrationId, context));

  return tasks;
}

function generateAPIEndpointTask(
  entity: Entity,
  operation: 'create' | 'list' | 'get' | 'update' | 'delete',
  dependencyId: string,
  context: TaskGenerationContext
): ProgrammableTask {
  const baseRoute = `/api/${toKebabCase(entity.tableName)}`;
  const operationConfig = {
    create: {
      method: 'POST' as const,
      route: baseRoute,
      title: `Create ${entity.name}`,
      successCode: 201,
    },
    list: {
      method: 'GET' as const,
      route: baseRoute,
      title: `List ${entity.name} records`,
      successCode: 200,
    },
    get: {
      method: 'GET' as const,
      route: `${baseRoute}/:id`,
      title: `Get ${entity.name} by ID`,
      successCode: 200,
    },
    update: {
      method: 'PUT' as const,
      route: `${baseRoute}/:id`,
      title: `Update ${entity.name}`,
      successCode: 200,
    },
    delete: {
      method: 'DELETE' as const,
      route: `${baseRoute}/:id`,
      title: `Delete ${entity.name}`,
      successCode: 204,
    },
  };

  const config = operationConfig[operation];
  const editableFields = entity.fields.filter(
    (f) =>
      !f.constraints.primaryKey &&
      !['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy'].includes(
        f.name
      )
  );

  const apiSpec: APISpecification = {
    method: config.method,
    route: config.route,
    requestSchema:
      operation === 'create' || operation === 'update'
        ? {
            type: 'object',
            properties: Object.fromEntries(
              editableFields.map((f) => [
                f.name,
                {
                  type: mapDataTypeToJSONType(f.dataType),
                  required: !f.constraints.nullable,
                  description: f.displayName,
                },
              ])
            ),
          }
        : undefined,
    responseSchema: {
      type: 'object',
      properties:
        operation === 'list'
          ? {
              data: { type: 'array', items: { type: 'object' } },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                },
              },
            }
          : Object.fromEntries(
              entity.fields.map((f) => [
                f.name,
                { type: mapDataTypeToJSONType(f.dataType), description: f.displayName },
              ])
            ),
    },
    queryParams:
      operation === 'list'
        ? [
            { name: 'page', type: 'number', required: false, description: 'Page number' },
            { name: 'limit', type: 'number', required: false, description: 'Items per page' },
            { name: 'sort', type: 'string', required: false, description: 'Sort field' },
            { name: 'order', type: 'string', required: false, description: 'Sort order (asc/desc)' },
          ]
        : undefined,
    pathParams:
      operation !== 'create' && operation !== 'list'
        ? [{ name: 'id', type: 'string', required: true, description: `${entity.name} UUID` }]
        : undefined,
    successCode: config.successCode,
    errorCodes: [
      { code: 400, description: 'Invalid request data' },
      { code: 401, description: 'Unauthorized' },
      { code: 404, description: `${entity.name} not found` },
      { code: 500, description: 'Internal server error' },
    ],
  };

  return {
    id: generateTaskId(),
    title: `API: ${config.title}`,
    type: operation === 'create' || operation === 'list' || operation === 'get' || operation === 'update' || operation === 'delete' ? 'api-crud' : 'api-custom',
    tier: 'T2',
    module: context.prd.moduleName,
    relatedEntity: entity.name,
    priority: 'high',
    dependencies: [dependencyId],
    specification: {
      objective: `Implement ${config.method} ${config.route} endpoint for ${operation} operation on ${entity.name}`,
      context: `This endpoint allows ${operation} operation on ${entity.name} entity. ${entity.description || ''}`,
      requirements: [
        `Implement ${config.method} ${config.route} endpoint`,
        ...(operation === 'create' || operation === 'update'
          ? [
              `Validate request body against schema`,
              `Required fields: ${editableFields
                .filter((f) => !f.constraints.nullable)
                .map((f) => f.name)
                .join(', ') || 'none'}`,
            ]
          : []),
        ...(operation === 'list'
          ? ['Support pagination with page and limit parameters', 'Support sorting by any field']
          : []),
        ...(operation === 'delete' && entity.isSoftDelete
          ? ['Implement soft delete by setting deleted_at timestamp']
          : []),
        'Return appropriate HTTP status codes',
        'Handle errors gracefully with proper error responses',
      ],
      api: apiSpec,
      technicalNotes: [
        'Use repository pattern for data access',
        'Apply input validation middleware',
        'Log all operations for audit trail',
      ],
      edgeCases: [
        ...(operation === 'get' || operation === 'update' || operation === 'delete'
          ? ['Handle non-existent ID gracefully']
          : []),
        ...(operation === 'create'
          ? ['Handle duplicate unique constraint violations']
          : []),
        ...(operation === 'list'
          ? ['Handle empty results', 'Handle invalid pagination parameters']
          : []),
      ],
      securityNotes: [
        'Validate user authentication',
        'Check user authorization for this operation',
        'Sanitize all input to prevent injection attacks',
      ],
    },
    acceptanceCriteria: [
      `${config.method} ${config.route} returns ${config.successCode} on success`,
      'Invalid requests return 400 with validation errors',
      'Unauthorized requests return 401',
      ...(operation !== 'create' && operation !== 'list'
        ? ['Non-existent ID returns 404']
        : []),
    ],
    testCases: generateAPITestCases(entity, operation, config),
    estimatedComplexity: 'simple',
    tags: ['api', 'crud', operation, entity.name.toLowerCase()],
    executionMode: 'code-generation',
  };
}

function generateAPITestCases(
  entity: Entity,
  operation: string,
  config: { method: string; route: string; successCode: number }
): TestCase[] {
  const cases: TestCase[] = [
    {
      id: `TC-${operation}-1`,
      name: `${operation} - success`,
      type: 'integration',
      given: operation === 'create' ? 'Valid request data' : `Existing ${entity.name} record`,
      when: `${config.method} ${config.route} is called`,
      then: `Returns ${config.successCode} with expected response`,
      priority: 'high',
    },
  ];

  if (operation !== 'list') {
    cases.push({
      id: `TC-${operation}-2`,
      name: `${operation} - not found`,
      type: 'integration',
      given: 'Non-existent ID',
      when: `${config.method} ${config.route} is called`,
      then: 'Returns 404 Not Found',
      priority: 'high',
    });
  }

  if (operation === 'create' || operation === 'update') {
    cases.push({
      id: `TC-${operation}-3`,
      name: `${operation} - validation error`,
      type: 'integration',
      given: 'Invalid request data',
      when: `${config.method} ${config.route} is called`,
      then: 'Returns 400 with validation errors',
      priority: 'high',
    });
  }

  return cases;
}

function generateUITask(
  screen: Screen,
  fr: FunctionalRequirement,
  context: TaskGenerationContext,
  expandReferences: boolean
): ProgrammableTask {
  const taskType: TaskType = mapScreenTypeToTaskType(screen.type);

  const uiSpec: UISpecification = {
    screenType: screen.type,
    route: screen.route,
    layout: {
      type: screen.layout.type,
      template: screen.layout.content,
    },
    fields: screen.fieldMappings.map((mapping) => ({
      name: mapping.fieldName,
      label: mapping.label,
      type: mapping.inputType,
      validation: mapping.validation,
      required: mapping.isRequired,
      defaultValue: mapping.defaultValue,
    })),
    actions: screen.actions.map((action) => ({
      name: action.label,
      type: action.type,
      handler: action.action,
    })),
    dataSource: screen.fieldMappings.length > 0 ? screen.fieldMappings[0].entityField.split('.')[0] : undefined,
  };

  // Expand business rules inline if option is enabled
  const relatedRules = expandReferences
    ? fr.businessRules.map((br) => ({
        id: br.id,
        name: br.name,
        type: br.type,
        description: br.description,
        formula: br.formula,
        conditions: br.conditions,
        errorMessage: br.errorMessage,
      }))
    : [];

  return {
    id: generateTaskId(),
    title: `UI: ${screen.name}`,
    type: taskType,
    tier: taskType === 'ui-form' ? 'T2' : 'T1',
    module: context.prd.moduleName,
    relatedFR: fr.id,
    priority: 'medium',
    dependencies: [],
    specification: {
      objective: `Implement the "${screen.name}" ${screen.type} screen at route "${screen.route}"`,
      context: expandReferences
        ? `This screen is part of ${fr.id}: ${fr.title}. ${fr.description}`
        : `Part of ${fr.id}`,
      requirements: [
        `Create ${screen.type} component at route "${screen.route}"`,
        `Screen name: "${screen.name}"`,
        ...screen.fieldMappings.map(
          (m) =>
            `Field "${m.label}" (${m.inputType}): maps to ${m.entityField}${m.isRequired ? ' [REQUIRED]' : ''}`
        ),
        ...screen.actions.map((a) => `Action button: "${a.label}" - ${a.action}`),
        ...(expandReferences && relatedRules.length > 0
          ? [
              'VALIDATION RULES (expanded inline):',
              ...relatedRules.map(
                (br) =>
                  `  - ${br.id} ${br.name}: ${br.description}${br.errorMessage ? ` (Error: "${br.errorMessage}")` : ''}`
              ),
            ]
          : []),
      ],
      ui: uiSpec,
      technicalNotes: [
        'Use React Hook Form for form state management',
        'Apply Zod schema validation',
        'Use shadcn/ui components for consistent styling',
      ],
      edgeCases: [
        'Handle loading states',
        'Handle error states',
        'Handle empty data',
        ...(screen.type === 'form' ? ['Handle form submission errors', 'Handle unsaved changes warning'] : []),
      ],
      securityNotes: ['Sanitize user input before display', 'Validate data on both client and server'],
    },
    acceptanceCriteria: [
      `Screen renders at route "${screen.route}"`,
      ...screen.fieldMappings.map((m) => `Field "${m.label}" displays correctly and is ${m.isRequired ? 'required' : 'optional'}`),
      ...screen.actions.map((a) => `"${a.label}" button triggers ${a.action}`),
      'Form validation errors display correctly',
      'Loading and error states are handled',
    ],
    testCases: [
      {
        id: `TC-UI-${screen.id}-1`,
        name: 'Screen renders',
        type: 'e2e',
        given: 'User navigates to the screen',
        when: `Route "${screen.route}" is accessed`,
        then: 'Screen renders with all fields and actions',
        priority: 'high',
      },
      ...(screen.type === 'form'
        ? [
            {
              id: `TC-UI-${screen.id}-2`,
              name: 'Form validation',
              type: 'e2e' as const,
              given: 'User submits form with invalid data',
              when: 'Submit button is clicked',
              then: 'Validation errors are displayed',
              priority: 'high' as const,
            },
          ]
        : []),
    ],
    estimatedComplexity: screen.type === 'form' ? 'moderate' : 'simple',
    tags: ['ui', screen.type, fr.id],
    executionMode: 'code-generation',
  };
}

function generateValidationTask(
  br: BusinessRule,
  fr: FunctionalRequirement,
  context: TaskGenerationContext,
  expandReferences: boolean
): ProgrammableTask {
  const validationSpec: ValidationSpecification = {
    ruleName: br.name,
    ruleType: br.type,
    targetEntity: fr.involvedEntities[0] || 'Unknown',
    targetFields: br.conditions || [],
    condition: br.description,
    errorMessage: br.errorMessage || `Validation failed: ${br.name}`,
    severity: 'error',
  };

  return {
    id: generateTaskId(),
    title: `Validation: ${br.name}`,
    type: 'validation',
    tier: 'T2',
    module: context.prd.moduleName,
    relatedFR: fr.id,
    priority: 'high',
    dependencies: [],
    specification: {
      objective: `Implement validation rule "${br.name}" (${br.id})`,
      context: expandReferences
        ? `This validation is part of ${fr.id}: ${fr.title}. ${br.description}`
        : `Part of ${fr.id}`,
      requirements: [
        `Rule ID: ${br.id}`,
        `Rule Name: ${br.name}`,
        `Type: ${br.type}`,
        `Description: ${br.description}`,
        ...(br.formula ? [`Formula: ${br.formula}`] : []),
        ...(br.conditions ? br.conditions.map((c) => `Condition: ${c}`) : []),
        `Error Message: "${br.errorMessage || 'Validation failed'}"`,
      ],
      validation: validationSpec,
      technicalNotes: [
        'Implement as Zod schema validator',
        'Apply on both client-side and server-side',
        'Log validation failures for debugging',
      ],
      edgeCases: [
        'Handle null/undefined values',
        'Handle edge case values (empty strings, zero, etc.)',
      ],
      securityNotes: ['Never expose internal validation logic in error messages'],
    },
    acceptanceCriteria: [
      `Validation triggers when condition is violated`,
      `Error message "${br.errorMessage || 'Validation failed'}" is displayed`,
      'Validation prevents form submission when invalid',
      'Valid data passes validation',
    ],
    testCases: [
      {
        id: `TC-VAL-${br.id}-1`,
        name: 'Validation fails for invalid data',
        type: 'unit',
        given: 'Invalid data that violates the rule',
        when: 'Validation is executed',
        then: 'Validation returns error with correct message',
        priority: 'high',
      },
      {
        id: `TC-VAL-${br.id}-2`,
        name: 'Validation passes for valid data',
        type: 'unit',
        given: 'Valid data that satisfies the rule',
        when: 'Validation is executed',
        then: 'Validation passes without errors',
        priority: 'high',
      },
    ],
    estimatedComplexity: br.formula ? 'moderate' : 'simple',
    tags: ['validation', br.type, fr.id],
    executionMode: 'code-generation',
  };
}

function generateWorkflowTask(
  fr: FunctionalRequirement,
  context: TaskGenerationContext,
  expandReferences: boolean
): ProgrammableTask {
  const workflow = fr.workflowDefinition!;

  const workflowSpec: WorkflowSpecification = {
    workflowName: workflow.name,
    states: workflow.states.map((s) => ({
      name: s.name,
      type: s.type,
      description: s.description || '',
      allowedTransitions: workflow.transitions
        .filter((t) => t.from === s.name)
        .map((t) => t.to),
    })),
    transitions: workflow.transitions.map((t) => ({
      name: t.name,
      from: t.from,
      to: t.to,
      trigger: t.trigger,
      conditions: t.conditions,
      actions: t.actions,
    })),
    initialState: workflow.initialState,
    finalStates: workflow.finalStates,
  };

  return {
    id: generateTaskId(),
    title: `Workflow: ${workflow.name}`,
    type: 'workflow',
    tier: 'T3',
    module: context.prd.moduleName,
    relatedFR: fr.id,
    priority: 'high',
    dependencies: [],
    specification: {
      objective: `Implement the "${workflow.name}" workflow state machine`,
      context: expandReferences
        ? `This workflow implements ${fr.id}: ${fr.title}. ${fr.description}`
        : `Part of ${fr.id}`,
      requirements: [
        `Workflow: ${workflow.name}`,
        `States: ${workflow.states.map((s) => s.name).join(', ')}`,
        `Initial State: ${workflow.initialState}`,
        `Final States: ${workflow.finalStates.join(', ')}`,
        'TRANSITIONS:',
        ...workflow.transitions.map(
          (t) =>
            `  - ${t.name}: ${t.from} → ${t.to} (trigger: ${t.trigger})${t.conditions?.length ? ` [conditions: ${t.conditions.join(', ')}]` : ''}`
        ),
      ],
      workflow: workflowSpec,
      technicalNotes: [
        'Use XState or similar state machine library',
        'Persist state transitions to database',
        'Implement guards for conditional transitions',
        'Log all state transitions for audit',
      ],
      edgeCases: [
        'Handle invalid state transitions',
        'Handle concurrent transition attempts',
        'Handle timeout scenarios',
      ],
      securityNotes: [
        'Verify user has permission for each transition',
        'Audit log all state changes',
      ],
    },
    acceptanceCriteria: [
      `Workflow starts in "${workflow.initialState}" state`,
      ...workflow.transitions.map(
        (t) => `Transition "${t.name}" moves from ${t.from} to ${t.to}`
      ),
      `Workflow can reach final states: ${workflow.finalStates.join(', ')}`,
      'Invalid transitions are rejected',
      'All transitions are logged',
    ],
    testCases: [
      {
        id: `TC-WF-${fr.id}-1`,
        name: 'Workflow initialization',
        type: 'unit',
        given: 'New workflow instance',
        when: 'Workflow is created',
        then: `Initial state is "${workflow.initialState}"`,
        priority: 'high',
      },
      ...workflow.transitions.slice(0, 3).map((t, i) => ({
        id: `TC-WF-${fr.id}-${i + 2}`,
        name: `Transition: ${t.name}`,
        type: 'unit' as const,
        given: `Workflow in "${t.from}" state`,
        when: `"${t.name}" transition is triggered`,
        then: `Workflow moves to "${t.to}" state`,
        priority: 'high' as const,
      })),
    ],
    estimatedComplexity: 'complex',
    tags: ['workflow', 'state-machine', fr.id],
    executionMode: 'code-generation',
  };
}

function generateEntityTestTask(
  entity: Entity,
  context: TaskGenerationContext
): ProgrammableTask {
  return {
    id: generateTaskId(),
    title: `[USER MUST TEST] Tests: ${entity.name} entity`,
    type: 'test',
    tier: 'T2',
    module: context.prd.moduleName,
    relatedEntity: entity.name,
    priority: 'medium',
    dependencies: [],
    specification: {
      objective: `USER MUST MANUALLY TEST: Create and run comprehensive test suite for ${entity.name} entity`,
      context: `⚠️ MANUAL TASK: This task requires human interaction. The user must write and execute tests for ${entity.name} including unit, integration, and e2e tests. AI code generation is not appropriate for this task - testing requires human judgment and verification.`,
      requirements: [
        '⚠️ THIS IS A MANUAL TASK - USER MUST PERFORM TESTING',
        'Write unit tests for entity validation',
        'Write integration tests for CRUD operations',
        'Write E2E tests for UI interactions',
        `Test all ${entity.fields.length} fields`,
        'Test relationship integrity',
        'Run all tests and verify they pass',
        'Review test coverage and add missing tests',
      ],
      technicalNotes: [
        'Use Vitest for unit/integration tests',
        'Use Playwright for E2E tests',
        'Use factories for test data generation',
        'Run tests in watch mode during development',
      ],
      edgeCases: [
        'Test boundary values',
        'Test null/undefined handling',
        'Test concurrent operations',
      ],
      securityNotes: ['Test authorization for all operations'],
    },
    acceptanceCriteria: [
      'USER HAS WRITTEN AND RUN TESTS MANUALLY',
      'Minimum 80% code coverage',
      'All CRUD operations have integration tests',
      'Critical paths have E2E tests',
      'All tests pass in CI pipeline',
    ],
    testCases: [
      {
        id: `TC-TEST-${entity.name}-1`,
        name: 'Create entity',
        type: 'integration',
        given: 'Valid entity data',
        when: 'Create operation is performed',
        then: 'Entity is created with correct data',
        priority: 'high',
      },
      {
        id: `TC-TEST-${entity.name}-2`,
        name: 'Read entity',
        type: 'integration',
        given: 'Existing entity',
        when: 'Read operation is performed',
        then: 'Entity data is returned correctly',
        priority: 'high',
      },
      {
        id: `TC-TEST-${entity.name}-3`,
        name: 'Update entity',
        type: 'integration',
        given: 'Existing entity',
        when: 'Update operation is performed',
        then: 'Entity is updated with new data',
        priority: 'high',
      },
      {
        id: `TC-TEST-${entity.name}-4`,
        name: 'Delete entity',
        type: 'integration',
        given: 'Existing entity',
        when: 'Delete operation is performed',
        then: entity.isSoftDelete ? 'Entity is soft deleted' : 'Entity is removed',
        priority: 'high',
      },
    ],
    estimatedComplexity: 'moderate',
    tags: ['test', 'coverage', entity.name.toLowerCase(), 'manual-task'],
    executionMode: 'manual',
    notes: '⚠️ MANUAL TASK: This task requires the user to write and execute tests. Click "Mark Complete" after you have finished testing.',
  };
}

function resolveDependencies(tasks: ProgrammableTask[]): ProgrammableTask[] {
  // Create a map of entity to database migration task ID
  const entityToDbTaskId = new Map<string, string>();

  tasks.forEach((task) => {
    if (task.type === 'database-migration' && task.relatedEntity) {
      entityToDbTaskId.set(task.relatedEntity.toLowerCase(), task.id);
    }
  });

  // Update API and UI task dependencies
  return tasks.map((task) => {
    if ((task.type.startsWith('api-') || task.type.startsWith('ui-')) && task.relatedEntity) {
      const dbTaskId = entityToDbTaskId.get(task.relatedEntity.toLowerCase());
      if (dbTaskId && !task.dependencies.includes(dbTaskId)) {
        return {
          ...task,
          dependencies: [...task.dependencies, dbTaskId],
        };
      }
    }
    return task;
  });
}

function calculateOverallComplexity(
  tasks: ProgrammableTask[]
): 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex' {
  const complexityScores = {
    trivial: 1,
    simple: 2,
    moderate: 3,
    complex: 4,
    'very-complex': 5,
  };

  const totalScore = tasks.reduce(
    (sum, task) => sum + complexityScores[task.estimatedComplexity],
    0
  );
  const avgScore = totalScore / tasks.length;

  if (avgScore < 1.5) return 'trivial';
  if (avgScore < 2.5) return 'simple';
  if (avgScore < 3.5) return 'moderate';
  if (avgScore < 4.5) return 'complex';
  return 'very-complex';
}

// ============================================================================
// INTEGRATION/ORCHESTRATION TASK GENERATORS
// ============================================================================

function generateEnvironmentSetupTask(context: TaskGenerationContext): ProgrammableTask {
  const envSpec: EnvironmentSetupSpec = {
    components: [
      {
        name: 'Database',
        type: 'database',
        technology: 'PostgreSQL',
        configuration: {
          host: 'localhost',
          port: '5432',
          database: toSnakeCase(context.prd.projectName || 'app'),
        },
        port: 5432,
        envVariables: [
          { name: 'DATABASE_URL', description: 'PostgreSQL connection string', example: 'postgresql://user:pass@localhost:5432/dbname' },
          { name: 'DATABASE_POOL_SIZE', description: 'Connection pool size', example: '10' },
        ],
      },
      {
        name: 'API Server',
        type: 'api-server',
        technology: 'Node.js/Express or similar',
        configuration: {
          host: 'localhost',
          port: '3000',
        },
        port: 3000,
        envVariables: [
          { name: 'API_PORT', description: 'API server port', example: '3000' },
          { name: 'NODE_ENV', description: 'Environment mode', example: 'development' },
          { name: 'JWT_SECRET', description: 'JWT signing secret', example: 'your-secret-key' },
        ],
      },
      {
        name: 'Frontend',
        type: 'frontend',
        technology: 'React/Vite',
        configuration: {
          host: 'localhost',
          port: '5173',
        },
        port: 5173,
        envVariables: [
          { name: 'VITE_API_URL', description: 'Backend API URL', example: 'http://localhost:3000/api' },
        ],
      },
    ],
    dependencies: [
      { name: 'Node.js', version: '>=18.0.0', installCommand: 'nvm install 18' },
      { name: 'PostgreSQL', version: '>=14.0', installCommand: 'brew install postgresql@14' },
      { name: 'pnpm or npm', version: 'latest', installCommand: 'npm install -g pnpm' },
    ],
    setupSteps: [
      '1. Clone the repository',
      '2. Copy .env.example to .env and fill in values',
      '3. Install dependencies: pnpm install',
      '4. Create database: createdb ' + toSnakeCase(context.prd.projectName || 'app'),
      '5. Run migrations: pnpm db:migrate',
      '6. Seed database (optional): pnpm db:seed',
      '7. Start API server: pnpm dev:api',
      '8. Start frontend: pnpm dev:web',
    ],
    verificationSteps: [
      'Database connection: pnpm db:check',
      'API health check: curl http://localhost:3000/health',
      'Frontend loads: open http://localhost:5173',
      'Run smoke tests: pnpm test:smoke',
    ],
  };

  return {
    id: generateTaskId(),
    title: '[ALREADY SCAFFOLDED] Environment Setup & Configuration',
    type: 'environment-setup',
    tier: 'T1',
    module: 'infrastructure',
    priority: 'critical',
    dependencies: [],
    specification: {
      objective: 'Verify the scaffolded development environment is properly configured',
      context: `✅ ALREADY SCAFFOLDED: This environment was automatically created when you set up the project in Phase 5. The foundation for ${context.prd.projectName || 'the project'} is already in place. Just verify everything works.`,
      requirements: [
        '✅ ALREADY DONE: Project scaffold generated',
        '✅ ALREADY DONE: Basic configuration files created',
        'Verify: Environment variables are correct in .env',
        'Verify: Database connection works',
        'Verify: API server starts without errors',
        'Verify: Frontend starts and can reach API',
      ],
      environmentSetup: envSpec,
      technicalNotes: [
        'Use environment variables for all configuration',
        'Never commit .env files to version control',
        'Use docker-compose for consistent environments across team',
      ],
      edgeCases: [
        'Handle port conflicts',
        'Handle missing environment variables',
        'Handle database connection failures',
      ],
      securityNotes: [
        'Use strong passwords for database',
        'Use different secrets for each environment',
        'Rotate secrets regularly',
      ],
    },
    acceptanceCriteria: [
      'Environment variables configured',
      'Database accessible and migrations run',
      'API server starts without errors',
      'Frontend starts and can reach API',
      'All verification steps pass',
    ],
    estimatedComplexity: 'simple',
    tags: ['setup', 'environment', 'infrastructure', 'configuration', 'scaffolded'],
    executionMode: 'skip',
    notes: '✅ ALREADY SCAFFOLDED: This task was completed during Phase 5 environment setup. Mark as complete if everything is working.',
  };
}

function generateServiceLayerTask(
  entity: Entity,
  context: TaskGenerationContext
): ProgrammableTask {
  const editableFields = entity.fields.filter(
    (f) =>
      !f.constraints.primaryKey &&
      !['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy'].includes(f.name)
  );

  const serviceSpec: ServiceLayerSpec = {
    entityName: entity.name,
    serviceName: `${entity.name}Service`,
    repositoryName: `${entity.name}Repository`,
    methods: [
      {
        name: 'create',
        description: `Create a new ${entity.name}`,
        input: editableFields.map((f) => ({ name: f.name, type: mapDataTypeToJSONType(f.dataType) })),
        output: entity.name,
        dbOperations: ['INSERT'],
        businessLogic: entity.fields
          .filter((f) => f.constraints.unique)
          .map((f) => `Check ${f.name} uniqueness before insert`),
      },
      {
        name: 'findById',
        description: `Find ${entity.name} by ID`,
        input: [{ name: 'id', type: 'string' }],
        output: `${entity.name} | null`,
        dbOperations: ['SELECT'],
      },
      {
        name: 'findAll',
        description: `List all ${entity.name} with pagination`,
        input: [
          { name: 'page', type: 'number' },
          { name: 'limit', type: 'number' },
          { name: 'filters', type: 'object' },
        ],
        output: `{ data: ${entity.name}[], total: number }`,
        dbOperations: ['SELECT', 'COUNT'],
      },
      {
        name: 'update',
        description: `Update ${entity.name}`,
        input: [
          { name: 'id', type: 'string' },
          ...editableFields.map((f) => ({ name: f.name, type: mapDataTypeToJSONType(f.dataType) + ' | undefined' })),
        ],
        output: entity.name,
        dbOperations: ['UPDATE'],
        businessLogic: ['Verify entity exists before update'],
      },
      {
        name: 'delete',
        description: `Delete ${entity.name}${entity.isSoftDelete ? ' (soft delete)' : ''}`,
        input: [{ name: 'id', type: 'string' }],
        output: 'void',
        dbOperations: [entity.isSoftDelete ? 'UPDATE' : 'DELETE'],
        businessLogic: entity.isSoftDelete ? ['Set deleted_at timestamp'] : undefined,
      },
    ],
    dependencies: [
      `${entity.name}Repository`,
      'Database connection',
      ...context.relationships
        .filter((r) => r.from.entity.toLowerCase() === entity.name.toLowerCase())
        .map((r) => `${r.to.entity}Service`),
    ],
    transactionBoundaries: [
      'create: Single transaction',
      'update: Single transaction',
      'delete: Check foreign key constraints before delete',
    ],
  };

  // Find the database migration task ID for this entity
  const dbTaskIndex = context.entities.findIndex(
    (e) => e.name.toLowerCase() === entity.name.toLowerCase()
  );
  const dbTaskId = `TASK-${String(dbTaskIndex + 1).padStart(3, '0')}`;

  return {
    id: generateTaskId(),
    title: `Service Layer: ${entity.name}Service`,
    type: 'service-layer',
    tier: 'T2',
    module: context.prd.moduleName,
    relatedEntity: entity.name,
    priority: 'high',
    dependencies: [dbTaskId],
    specification: {
      objective: `Implement the service layer for ${entity.name} entity, connecting API endpoints to database operations`,
      context: `The service layer encapsulates business logic for ${entity.name}. It sits between the API controllers and the repository/database layer.`,
      requirements: [
        `Create ${entity.name}Service class with all CRUD methods`,
        `Create ${entity.name}Repository for database operations`,
        'Implement input validation in service methods',
        'Handle database errors and convert to application errors',
        'Implement transaction management for write operations',
        ...context.relationships
          .filter((r) => r.from.entity.toLowerCase() === entity.name.toLowerCase())
          .map((r) => `Handle relationship with ${r.to.entity} (${r.type})`),
      ],
      serviceLayer: serviceSpec,
      technicalNotes: [
        'Use dependency injection for repository',
        'Implement repository pattern for testability',
        'Use transactions for multi-step operations',
        'Log all service method calls',
      ],
      edgeCases: [
        'Handle concurrent updates',
        'Handle foreign key constraint violations',
        'Handle not found scenarios',
      ],
      securityNotes: [
        'Validate all input before database operations',
        'Never expose internal database errors to API',
        'Check authorization before each operation',
      ],
    },
    acceptanceCriteria: [
      `${entity.name}Service class exists with all CRUD methods`,
      `${entity.name}Repository class exists with database operations`,
      'All methods handle errors appropriately',
      'Transactions are used for write operations',
      'Unit tests cover all methods',
    ],
    testCases: [
      {
        id: `TC-SVC-${entity.name}-1`,
        name: 'Service creates entity',
        type: 'unit',
        given: 'Valid entity data',
        when: 'create method is called',
        then: 'Entity is created and returned',
        priority: 'high',
      },
      {
        id: `TC-SVC-${entity.name}-2`,
        name: 'Service handles not found',
        type: 'unit',
        given: 'Non-existent entity ID',
        when: 'findById is called',
        then: 'Returns null or throws NotFoundError',
        priority: 'high',
      },
    ],
    estimatedComplexity: 'moderate',
    tags: ['service-layer', 'business-logic', entity.name.toLowerCase()],
    executionMode: 'code-generation',
  };
}

function generateAPIClientTask(context: TaskGenerationContext): ProgrammableTask {
  const apiClientSpec: APIClientSpec = {
    baseUrl: '/api',
    authMethod: 'bearer',
    endpoints: context.entities.flatMap((entity) => {
      const basePath = `/${toKebabCase(entity.tableName)}`;
      return [
        {
          name: `get${entity.name}List`,
          method: 'GET',
          path: basePath,
          responseType: `PaginatedResponse<${entity.name}>`,
          errorHandling: 'Return empty list on error',
        },
        {
          name: `get${entity.name}ById`,
          method: 'GET',
          path: `${basePath}/:id`,
          responseType: entity.name,
          errorHandling: 'Throw NotFoundError on 404',
        },
        {
          name: `create${entity.name}`,
          method: 'POST',
          path: basePath,
          requestType: `Create${entity.name}Input`,
          responseType: entity.name,
          errorHandling: 'Throw ValidationError on 400',
        },
        {
          name: `update${entity.name}`,
          method: 'PUT',
          path: `${basePath}/:id`,
          requestType: `Update${entity.name}Input`,
          responseType: entity.name,
          errorHandling: 'Throw NotFoundError on 404, ValidationError on 400',
        },
        {
          name: `delete${entity.name}`,
          method: 'DELETE',
          path: `${basePath}/:id`,
          responseType: 'void',
          errorHandling: 'Throw NotFoundError on 404',
        },
      ];
    }),
    stateManagement: {
      library: 'React Query or Zustand',
      stores: context.entities.map((entity) => ({
        name: `use${entity.name}Store`,
        purpose: `Manage ${entity.name} list, selected item, and CRUD operations`,
      })),
    },
    errorHandlingStrategy: 'Centralized error handler with toast notifications',
    retryPolicy: '3 retries with exponential backoff for network errors',
  };

  return {
    id: generateTaskId(),
    title: 'Frontend API Client Setup',
    type: 'api-client',
    tier: 'T2',
    module: 'frontend',
    priority: 'high',
    dependencies: [],
    specification: {
      objective: 'Set up the frontend API client layer for communicating with the backend',
      context: 'This task creates the infrastructure for all frontend-to-backend communication, including API calls, state management, and error handling.',
      requirements: [
        'Create API client with base URL configuration',
        'Implement authentication token handling',
        'Create typed API functions for each endpoint',
        'Set up React Query or similar for server state',
        'Implement centralized error handling',
        'Add request/response interceptors for auth',
        ...context.entities.map((e) => `Create API functions for ${e.name} CRUD`),
      ],
      apiClient: apiClientSpec,
      technicalNotes: [
        'Use axios or fetch with wrapper',
        'Type all request/response bodies',
        'Use React Query for caching and refetching',
        'Implement optimistic updates where appropriate',
      ],
      edgeCases: [
        'Handle token expiration and refresh',
        'Handle network offline scenarios',
        'Handle concurrent requests',
        'Handle request cancellation on unmount',
      ],
      securityNotes: [
        'Store tokens securely (httpOnly cookies preferred)',
        'Clear tokens on logout',
        'Never log sensitive data',
      ],
    },
    acceptanceCriteria: [
      'API client configured with base URL',
      'Authentication token sent with all requests',
      'All entity CRUD functions implemented and typed',
      'Error handling shows user-friendly messages',
      'Loading states work correctly',
      'Caching and refetching work as expected',
    ],
    estimatedComplexity: 'moderate',
    tags: ['frontend', 'api-client', 'state-management'],
    executionMode: 'code-generation',
  };
}

function generateE2EFlowTask(
  fr: FunctionalRequirement,
  context: TaskGenerationContext
): ProgrammableTask {
  const screens = fr.screens || [];
  const businessRules = fr.businessRules || [];

  const flowSpec: E2EFlowSpec = {
    flowName: fr.title,
    description: fr.description,
    actors: fr.accessRoles || ['User'],
    preconditions: [
      'User is authenticated',
      ...fr.involvedEntities.map((e) => `${e} data may or may not exist`),
    ],
    steps: screens.map((screen, index) => ({
      stepNumber: index + 1,
      action: `Navigate to ${screen.name}`,
      screen: screen.route,
      api: screen.fieldMappings.length > 0
        ? `API call to load ${screen.fieldMappings[0].entityField.split('.')[0]} data`
        : undefined,
      expectedResult: `${screen.name} screen displays correctly`,
      dataRequired: screen.fieldMappings.map((fm) => fm.label),
    })),
    postconditions: [
      `${fr.title} flow completed successfully`,
      ...businessRules
        .filter((br) => br.type === 'constraint')
        .map((br) => `${br.name} constraint satisfied`),
    ],
    alternativeFlows: businessRules
      .filter((br) => br.errorMessage)
      .map((br) => ({
        name: `Validation: ${br.name}`,
        triggerCondition: br.description,
        steps: [`Show error: "${br.errorMessage}"`, 'User corrects input', 'Retry operation'],
      })),
  };

  return {
    id: generateTaskId(),
    title: `[USER MUST TEST] E2E Flow: ${fr.title}`,
    type: 'e2e-flow',
    tier: 'T3',
    module: context.prd.moduleName,
    relatedFR: fr.id,
    priority: 'medium',
    dependencies: [],
    specification: {
      objective: `USER MUST MANUALLY TEST: Verify the complete end-to-end flow for "${fr.title}"`,
      context: `⚠️ MANUAL TASK: This task requires human interaction. The user must manually test the complete user journey for ${fr.id}: ${fr.title}. This connects multiple screens, API calls, and validations that need human verification.`,
      requirements: [
        '⚠️ THIS IS A MANUAL TASK - USER MUST PERFORM E2E TESTING',
        `Flow: ${fr.title}`,
        `Description: ${fr.description}`,
        `User Roles: ${(fr.accessRoles || ['User']).join(', ')}`,
        '',
        'SCREENS TO TEST IN THIS FLOW:',
        ...screens.map((s) => `- ${s.name} (${s.route}): ${s.type}`),
        '',
        'BUSINESS RULES TO VERIFY:',
        ...businessRules.map((br) => `- ${br.id} ${br.name}: ${br.description}`),
        '',
        'API ENDPOINTS TO TEST:',
        ...fr.involvedEntities.map((e) => `- CRUD endpoints for ${e}`),
      ],
      e2eFlow: flowSpec,
      technicalNotes: [
        'Test manually in the browser first',
        'Then write E2E tests using Playwright or Cypress',
        'Test both happy path and error scenarios',
        'Use test data factories for consistent data',
        'Run E2E tests in CI pipeline',
      ],
      edgeCases: [
        'Test with minimum required data',
        'Test with maximum allowed data',
        'Test concurrent user scenarios if applicable',
        'Test navigation between steps',
      ],
      securityNotes: [
        'Verify authorization at each step',
        'Test with different user roles',
      ],
    },
    acceptanceCriteria: [
      'USER HAS MANUALLY TESTED THE COMPLETE FLOW',
      'All screens in flow are implemented',
      'Navigation between screens works',
      'All business rules are enforced',
      'Error messages display correctly',
      'Flow completes successfully end-to-end',
      'E2E tests written and passing',
    ],
    testCases: [
      {
        id: `TC-E2E-${fr.id}-1`,
        name: `${fr.title} - Happy Path`,
        type: 'e2e',
        given: 'User is on the starting screen',
        when: 'User completes all steps with valid data',
        then: 'Flow completes successfully',
        priority: 'high',
      },
      ...businessRules.slice(0, 2).map((br, i) => ({
        id: `TC-E2E-${fr.id}-${i + 2}`,
        name: `${fr.title} - ${br.name} Validation`,
        type: 'e2e' as const,
        given: 'User is in the flow',
        when: `User violates ${br.name} rule`,
        then: `Error "${br.errorMessage || 'Validation error'}" is shown`,
        priority: 'high' as const,
      })),
    ],
    estimatedComplexity: 'complex',
    tags: ['e2e', 'flow', 'integration', fr.id, 'manual-task'],
    executionMode: 'manual',
    notes: '⚠️ MANUAL TASK: This task requires the user to manually test the complete flow. Open the app in a browser, test all scenarios, and write E2E tests. Click "Mark Complete" after testing.',
  };
}

function generateTestSetupTask(context: TaskGenerationContext): ProgrammableTask {
  const testSetupSpec: TestSetupSpec = {
    testType: 'all',
    prerequisites: [
      {
        component: 'Database',
        requirement: 'Test database running (separate from development)',
        setupCommand: `createdb ${toSnakeCase(context.prd.projectName || 'app')}_test`,
      },
      {
        component: 'API Server',
        requirement: 'API server running in test mode',
        setupCommand: 'NODE_ENV=test pnpm dev:api',
      },
      {
        component: 'Frontend',
        requirement: 'Frontend dev server running (for E2E tests)',
        setupCommand: 'pnpm dev:web',
      },
    ],
    testDatabase: {
      type: 'PostgreSQL',
      setupScript: 'pnpm db:test:setup',
      seedDataRequired: true,
      seedEntities: context.entities.map((e) => e.name),
    },
    mockServices: [
      {
        service: 'External APIs',
        mockStrategy: 'MSW (Mock Service Worker)',
        mockData: 'Use fixtures in __mocks__ folder',
      },
      {
        service: 'Email Service',
        mockStrategy: 'In-memory mock',
        mockData: 'Capture sent emails for assertions',
      },
    ],
    environmentVariables: [
      { name: 'NODE_ENV', value: 'test' },
      { name: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/app_test' },
      { name: 'JWT_SECRET', value: 'test-secret' },
    ],
    runCommands: [
      {
        type: 'unit',
        command: 'pnpm test:unit',
        description: 'Run unit tests with Vitest',
      },
      {
        type: 'integration',
        command: 'pnpm test:integration',
        description: 'Run integration tests (requires test database)',
      },
      {
        type: 'e2e',
        command: 'pnpm test:e2e',
        description: 'Run E2E tests with Playwright',
      },
      {
        type: 'all',
        command: 'pnpm test',
        description: 'Run all tests',
      },
    ],
  };

  return {
    id: generateTaskId(),
    title: '[ALREADY SCAFFOLDED] Test Environment Setup',
    type: 'test-setup',
    tier: 'T2',
    module: 'testing',
    priority: 'high',
    dependencies: [],
    specification: {
      objective: 'Verify the scaffolded test environment is properly configured',
      context: '✅ ALREADY SCAFFOLDED: The basic test infrastructure was created during Phase 5. Just verify it works and add any entity-specific test factories.',
      requirements: [
        '✅ ALREADY DONE: Basic test configuration created',
        '✅ ALREADY DONE: Vitest/Jest configured',
        'Verify: Test database can be created',
        'Verify: Test commands work (npm test)',
        'Create test data factories for each entity:',
        ...context.entities.map((e) => `- ${e.name}Factory`),
      ],
      testSetup: testSetupSpec,
      technicalNotes: [
        'Use separate test database that gets reset between test runs',
        'Use factories instead of fixtures for test data',
        'Mock external services at the network level',
        'Run tests in parallel where possible',
      ],
      edgeCases: [
        'Handle database connection failures in tests',
        'Handle flaky tests with retries',
        'Handle test timeout scenarios',
      ],
      securityNotes: [
        'Never use production data in tests',
        'Use weak credentials for test database',
        'Clear test data after test runs',
      ],
    },
    acceptanceCriteria: [
      'Test commands work correctly',
      'Test database can be created and migrated',
      'Test data can be seeded and cleared',
      'Test factories exist for all entities',
    ],
    testCases: [
      {
        id: 'TC-SETUP-1',
        name: 'Test database setup',
        type: 'integration',
        given: 'Clean environment',
        when: 'Test setup script runs',
        then: 'Test database is created and migrated',
        priority: 'high',
      },
      {
        id: 'TC-SETUP-2',
        name: 'Test data seeding',
        type: 'integration',
        given: 'Empty test database',
        when: 'Seed script runs',
        then: 'Test data is created for all entities',
        priority: 'high',
      },
    ],
    estimatedComplexity: 'moderate',
    tags: ['testing', 'setup', 'infrastructure', 'ci-cd', 'scaffolded'],
    executionMode: 'skip',
    notes: '✅ ALREADY SCAFFOLDED: Basic test setup was completed during Phase 5. You only need to create entity-specific test factories. Mark as complete when verified.',
  };
}

// ============================================================================
// ASSEMBLY/COMPOSITION TASK GENERATORS
// ============================================================================

function generatePageCompositionTask(
  screen: Screen,
  context: TaskGenerationContext,
  existingTasks: ProgrammableTask[]
): ProgrammableTask {
  // Find related UI tasks for this screen
  const relatedUITasks = existingTasks.filter(
    (t) => t.type.startsWith('ui-') && t.specification.ui?.route === screen.route
  );

  const pageSpec: PageCompositionSpec = {
    pageName: screen.name,
    route: screen.route,
    description: `Compose the ${screen.name} page from UI components`,
    layout: {
      type: screen.type === 'form' ? 'form-page' :
            screen.type === 'list' ? 'list-page' :
            screen.type === 'detail' ? 'single-column' : 'single-column',
      template: screen.layout.content,
    },
    components: relatedUITasks.map((t) => ({
      name: t.title.replace('UI: ', ''),
      taskId: t.id,
      position: 'main',
      props: {},
    })),
    dataFetching: {
      onMount: screen.fieldMappings.length > 0
        ? [`fetch${screen.fieldMappings[0].entityField.split('.')[0]}Data`]
        : [],
    },
    stateConnections: [],
    pageActions: screen.actions.map((a) => ({
      name: a.label,
      handler: a.action,
      description: `Handle ${a.label} action`,
    })),
  };

  return {
    id: generateTaskId(),
    title: `Page: ${screen.name}`,
    type: 'page-composition',
    tier: 'T2',
    module: context.prd.moduleName,
    priority: 'medium',
    dependencies: relatedUITasks.map((t) => t.id),
    specification: {
      objective: `Compose the "${screen.name}" page by assembling UI components into a complete, functional page`,
      context: `This task puts together all the UI components created for the ${screen.name} screen into a single page component that can be rendered at route "${screen.route}".`,
      requirements: [
        `Create page component for "${screen.name}"`,
        `Page route: ${screen.route}`,
        `Layout type: ${screen.layout.type}`,
        '',
        'COMPONENTS TO ASSEMBLE:',
        ...relatedUITasks.map((t) => `- ${t.title} (${t.id})`),
        '',
        'PAGE STRUCTURE:',
        '1. Import all required UI components',
        '2. Set up page-level state management',
        '3. Implement data fetching on mount',
        '4. Wire up component props and callbacks',
        '5. Handle loading and error states',
        '',
        'ACTIONS TO WIRE:',
        ...screen.actions.map((a) => `- "${a.label}": ${a.action}`),
      ],
      pageComposition: pageSpec,
      technicalNotes: [
        'Use React.lazy for code splitting if page is large',
        'Implement proper loading skeleton',
        'Handle error boundaries',
        'Set up proper TypeScript types for page props',
      ],
      edgeCases: [
        'Handle component loading failures',
        'Handle data fetch failures',
        'Handle empty data states',
      ],
      securityNotes: [
        'Verify user has access to this page',
        'Sanitize any URL parameters',
      ],
    },
    acceptanceCriteria: [
      `Page renders at route "${screen.route}"`,
      'All UI components are properly composed',
      'Data fetching works on mount',
      'All actions are wired and functional',
      'Loading states are handled',
      'Error states are handled',
    ],
    testCases: [
      {
        id: `TC-PAGE-${screen.id}-1`,
        name: 'Page renders with components',
        type: 'integration',
        given: 'User navigates to page',
        when: `Route "${screen.route}" is accessed`,
        then: 'Page renders with all components visible',
        priority: 'high',
      },
      {
        id: `TC-PAGE-${screen.id}-2`,
        name: 'Page actions work',
        type: 'e2e',
        given: 'Page is rendered',
        when: 'User interacts with actions',
        then: 'Actions trigger expected behavior',
        priority: 'high',
      },
    ],
    estimatedComplexity: 'moderate',
    tags: ['page', 'composition', 'assembly', screen.name.toLowerCase()],
    executionMode: 'code-generation',
  };
}

function generateRouteConfigTask(
  _context: TaskGenerationContext,
  screens: Map<string, Screen>
): ProgrammableTask {
  const routes = Array.from(screens.values()).map((screen) => ({
    path: screen.route,
    component: toPascalCase(screen.name) + 'Page',
    pageName: screen.name,
    isProtected: true,
    requiredRoles: [],
    layoutWrapper: 'MainLayout',
  }));

  const routeSpec: RouteConfigSpec = {
    routerType: 'react-router',
    routes,
    guards: [
      {
        name: 'AuthGuard',
        type: 'auth',
        condition: 'user.isAuthenticated',
        redirectTo: '/login',
      },
    ],
    defaultRoute: routes[0]?.path || '/',
    notFoundRoute: '/404',
  };

  return {
    id: generateTaskId(),
    title: 'Route Configuration',
    type: 'route-config',
    tier: 'T2',
    module: 'frontend',
    priority: 'high',
    dependencies: [],
    specification: {
      objective: 'Configure application routing with all page routes, guards, and navigation',
      context: 'This task sets up the complete routing configuration for the application, connecting all page components to their routes.',
      requirements: [
        'Set up React Router (or chosen router)',
        'Configure all page routes:',
        ...routes.map((r) => `- ${r.path} → ${r.component}`),
        '',
        'ROUTE GUARDS:',
        '- AuthGuard: Redirect unauthenticated users to /login',
        '- RoleGuard: Verify user has required role for route',
        '',
        'LAYOUT WRAPPERS:',
        '- MainLayout: Standard app layout with nav',
        '- AuthLayout: Layout for login/register pages',
        '',
        'SPECIAL ROUTES:',
        `- Default: ${routeSpec.defaultRoute}`,
        '- 404 Not Found: /404',
        '- Login: /login',
      ],
      routeConfig: routeSpec,
      technicalNotes: [
        'Use React Router v6 with data loaders',
        'Implement route-based code splitting',
        'Set up proper TypeScript types for route params',
        'Use nested routes for shared layouts',
      ],
      edgeCases: [
        'Handle deep linking',
        'Handle route not found',
        'Handle unauthorized access',
        'Handle route parameter validation',
      ],
      securityNotes: [
        'Protect routes that require authentication',
        'Validate route parameters',
        'Implement rate limiting for route changes',
      ],
    },
    acceptanceCriteria: [
      'All routes are configured and accessible',
      'Route guards work correctly',
      'Unauthorized access redirects to login',
      'Not found route works',
      'Deep linking works',
      'Route transitions are smooth',
    ],
    testCases: [
      {
        id: 'TC-ROUTE-1',
        name: 'Routes are accessible',
        type: 'e2e',
        given: 'Authenticated user',
        when: 'User navigates to each route',
        then: 'Correct page is rendered',
        priority: 'high',
      },
      {
        id: 'TC-ROUTE-2',
        name: 'Auth guard works',
        type: 'e2e',
        given: 'Unauthenticated user',
        when: 'User tries to access protected route',
        then: 'User is redirected to login',
        priority: 'high',
      },
    ],
    estimatedComplexity: 'moderate',
    tags: ['routing', 'navigation', 'configuration'],
    executionMode: 'code-generation',
  };
}

function generateNavigationTask(
  _context: TaskGenerationContext,
  screens: Map<string, Screen>
): ProgrammableTask {
  const menuItems = Array.from(screens.values()).map((screen) => ({
    label: screen.name,
    icon: getIconForScreenType(screen.type),
    route: screen.route,
  }));

  const navSpec: NavigationSpec = {
    navigationType: 'sidebar',
    menuItems,
    userMenu: {
      items: [
        { label: 'Profile', action: 'navigateToProfile' },
        { label: 'Settings', action: 'navigateToSettings' },
        { label: 'Logout', action: 'logout' },
      ],
    },
    breadcrumbs: {
      enabled: true,
      routes: menuItems.map((item) => ({
        path: item.route,
        label: item.label,
      })),
    },
    mobileNavigation: {
      type: 'drawer',
      breakpoint: 'md',
    },
  };

  return {
    id: generateTaskId(),
    title: 'Navigation Component',
    type: 'navigation',
    tier: 'T2',
    module: 'frontend',
    priority: 'high',
    dependencies: [],
    specification: {
      objective: 'Create the main navigation component with sidebar, menus, and breadcrumbs',
      context: 'This task creates the navigation infrastructure that allows users to move between pages in the application.',
      requirements: [
        'Create sidebar navigation component',
        'Implement menu items:',
        ...menuItems.map((m) => `- ${m.label} → ${m.route}`),
        '',
        'USER MENU:',
        '- Profile link',
        '- Settings link',
        '- Logout action',
        '',
        'ADDITIONAL FEATURES:',
        '- Breadcrumb navigation',
        '- Mobile responsive (drawer on mobile)',
        '- Active state highlighting',
        '- Collapsible sidebar option',
      ],
      navigation: navSpec,
      technicalNotes: [
        'Use shadcn/ui navigation components',
        'Implement keyboard navigation (a11y)',
        'Use React Router NavLink for active states',
        'Store sidebar state in localStorage',
      ],
      edgeCases: [
        'Handle deep nested routes in breadcrumbs',
        'Handle very long menu item labels',
        'Handle mobile/desktop transitions',
      ],
      securityNotes: [
        'Hide menu items user lacks permission for',
        'Validate navigation targets',
      ],
    },
    acceptanceCriteria: [
      'Sidebar navigation renders correctly',
      'All menu items are clickable and navigate',
      'Active state shows current page',
      'User menu works correctly',
      'Breadcrumbs show correct path',
      'Mobile navigation works',
      'Keyboard navigation works',
    ],
    testCases: [
      {
        id: 'TC-NAV-1',
        name: 'Navigation works',
        type: 'e2e',
        given: 'User is on any page',
        when: 'User clicks navigation item',
        then: 'User is navigated to correct page',
        priority: 'high',
      },
      {
        id: 'TC-NAV-2',
        name: 'Active state shows',
        type: 'e2e',
        given: 'User is on a page',
        when: 'User views navigation',
        then: 'Current page is highlighted',
        priority: 'medium',
      },
    ],
    estimatedComplexity: 'moderate',
    tags: ['navigation', 'ui', 'assembly'],
    executionMode: 'code-generation',
  };
}

function getIconForScreenType(screenType: string): string {
  switch (screenType) {
    case 'list':
      return 'List';
    case 'form':
      return 'FileEdit';
    case 'detail':
      return 'FileText';
    case 'modal':
      return 'Square';
    case 'dashboard':
      return 'LayoutDashboard';
    case 'report':
      return 'BarChart';
    default:
      return 'File';
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^(.)/, (chr) => chr.toUpperCase());
}

function mapScreenTypeToTaskType(screenType: string): TaskType {
  switch (screenType) {
    case 'list':
      return 'ui-list';
    case 'form':
      return 'ui-form';
    case 'detail':
      return 'ui-detail';
    case 'modal':
      return 'ui-modal';
    default:
      return 'ui-form';
  }
}

function mapDataTypeToSQL(dataType: string): string {
  const typeMap: Record<string, string> = {
    string: 'VARCHAR(255)',
    text: 'TEXT',
    integer: 'INTEGER',
    bigint: 'BIGINT',
    decimal: 'DECIMAL(18,2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    timestamp: 'TIMESTAMPTZ',
    uuid: 'UUID',
    json: 'JSONB',
    enum: 'VARCHAR(50)',
  };
  return typeMap[dataType] || 'VARCHAR(255)';
}

function mapDataTypeToJSONType(dataType: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    text: 'string',
    integer: 'number',
    bigint: 'number',
    decimal: 'number',
    boolean: 'boolean',
    date: 'string',
    timestamp: 'string',
    uuid: 'string',
    json: 'object',
    enum: 'string',
  };
  return typeMap[dataType] || 'string';
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/_/g, '-');
}

export function exportTasksToMarkdown(taskSet: TaskSet): string {
  const lines: string[] = [];

  lines.push(`# Development Tasks`);
  lines.push('');
  lines.push(`Generated: ${taskSet.generatedAt.toISOString()}`);
  lines.push(`Total Tasks: ${taskSet.summary.totalTasks}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('### By Tier');
  lines.push(`- T1 (Simple): ${taskSet.summary.tierBreakdown?.T1 ?? 0}`);
  lines.push(`- T2 (Standard): ${taskSet.summary.tierBreakdown?.T2 ?? 0}`);
  lines.push(`- T3 (Complex): ${taskSet.summary.tierBreakdown?.T3 ?? 0}`);
  lines.push(`- T4 (Architecture): ${taskSet.summary.tierBreakdown?.T4 ?? 0}`);
  lines.push('');
  lines.push('### By Type');
  if (taskSet.summary.typeBreakdown) {
    Object.entries(taskSet.summary.typeBreakdown).forEach(([type, count]) => {
      lines.push(`- ${type}: ${count}`);
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group tasks by module
  const tasksByModule = new Map<string, ProgrammableTask[]>();
  taskSet.tasks.forEach((task) => {
    const module = task.module || 'General';
    if (!tasksByModule.has(module)) {
      tasksByModule.set(module, []);
    }
    tasksByModule.get(module)!.push(task);
  });

  tasksByModule.forEach((tasks, module) => {
    lines.push(`## Module: ${module}`);
    lines.push('');

    tasks.forEach((task) => {
      lines.push(`### ${task.id}: ${task.title}`);
      lines.push('');
      lines.push(`**Type:** ${task.type} | **Tier:** ${task.tier} | **Priority:** ${task.priority} | **Complexity:** ${task.estimatedComplexity}`);
      lines.push('');

      if (task.dependencies.length > 0) {
        lines.push(`**Dependencies:** ${task.dependencies.join(', ')}`);
        lines.push('');
      }

      lines.push('#### Objective');
      lines.push(task.specification.objective);
      lines.push('');

      lines.push('#### Context');
      lines.push(task.specification.context);
      lines.push('');

      lines.push('#### Requirements');
      task.specification.requirements.forEach((req) => {
        lines.push(`- ${req}`);
      });
      lines.push('');

      lines.push('#### Acceptance Criteria');
      task.acceptanceCriteria.forEach((ac) => {
        lines.push(`- [ ] ${ac}`);
      });
      lines.push('');

      if (task.testCases && task.testCases.length > 0) {
        lines.push('#### Test Cases');
        task.testCases.forEach((tc) => {
          lines.push(`- **${tc.name}** (${tc.type})`);
          lines.push(`  - Given: ${tc.given}`);
          lines.push(`  - When: ${tc.when}`);
          lines.push(`  - Then: ${tc.then}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  });

  return lines.join('\n');
}

export function exportTasksToJSON(taskSet: TaskSet): string {
  return JSON.stringify(taskSet, null, 2);
}
