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
  TestCase,
} from '@/types/task';
import { usePromptStore } from '@/store/promptStore';
import { useSettingsStore } from '@/store/settingsStore';
import { generateId } from '@/lib/utils';
import { getLLMRouter } from '@/core/llm/LLMRouter';
import { buildArchitectureExtractionPrompt } from '@/core/llm/prompts/architecture-extraction';
import { buildTaskImplementationPrompt } from '@/core/llm/prompts/task-implementation';

export interface TaskGenerationContext {
  prd: StructuredPRD;
  entities: Entity[];
  relationships: Relationship[];
  dbml: string;
  // Optional attached architecture guide (raw content and metadata)
  architectureGuide?: {
    id?: string;
    name?: string;
    content?: string;
    format?: string;
  };
}

export interface TaskGenerationOptions {
  generateDatabaseTasks: boolean;
  generateApiTasks: boolean;
  generateUiTasks: boolean;
  generateValidationTasks: boolean;
  generateTestTasks: boolean;
  expandReferences: boolean;
}

const DEFAULT_OPTIONS: TaskGenerationOptions = {
  generateDatabaseTasks: true,
  generateApiTasks: true,
  generateUiTasks: true,
  generateValidationTasks: true,
  generateTestTasks: true,
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
  // legacy synchronous generator kept for compatibility

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

  // Resolve dependencies
  let resolvedTasks = resolveDependencies(tasks);

  // Ensure every task has a technicalImplementation object (may be empty)
  resolvedTasks = resolvedTasks.map((t) => ({
    ...t,
    specification: {
      ...t.specification,
      technicalImplementation: (t.specification as any).technicalImplementation || {},
    },
  }));

  // Calculate summary
  const tierBreakdown = {
    T1: resolvedTasks.filter((t: ProgrammableTask) => t.tier === 'T1').length,
    T2: resolvedTasks.filter((t: ProgrammableTask) => t.tier === 'T2').length,
    T3: resolvedTasks.filter((t: ProgrammableTask) => t.tier === 'T3').length,
    T4: resolvedTasks.filter((t: ProgrammableTask) => t.tier === 'T4').length,
  };

  const typeBreakdown: Record<string, number> = {};
  resolvedTasks.forEach((task: ProgrammableTask) => {
    typeBreakdown[task.type] = (typeBreakdown[task.type] || 0) + 1;
  });

  const metadata: TaskSet['metadata'] = {
    generatorVersion: '1.0.0',
    prdId: context.prd.id,
    erdId: 'erd-unknown',
    standardsApplied: ['database', 'api'],
    exportFormats: ['json', 'yaml', 'markdown'],
    architectureGuide: undefined,
    architectureRecommendations: [],
  };

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
    metadata,
  };
}

/**
 * If an architecture guide is provided, call an LLM to extract recommendations
 * and apply them to generated tasks. Returns a new TaskSet.
 */
export async function generateTasksWithArchitecture(
  context: TaskGenerationContext,
  options: Partial<TaskGenerationOptions> = {},
  signal?: AbortSignal,
  previewOnly: boolean = false
): Promise<TaskSet> {
  // Generate base task set synchronously
  const base = generateTasks(context, options);

  // If no architecture guide attached, return base but ensure metadata and technicalImplementation placeholders
  if (!context.architectureGuide || !context.architectureGuide.content) {
    return {
      ...base,
      metadata: {
        generatorVersion: base.metadata?.generatorVersion ?? '1.0.0',
        prdId: base.metadata?.prdId ?? context.prd.id,
        erdId: base.metadata?.erdId ?? 'erd-unknown',
        standardsApplied: base.metadata?.standardsApplied ?? ['database', 'api'],
        exportFormats: base.metadata?.exportFormats ?? ['json', 'yaml', 'markdown'],
        architectureGuide: undefined,
        architectureRecommendations: [],
      },
    } as TaskSet;
  }

  // Try to call LLM for recommendations
  try {
    const { getPrompt } = usePromptStore.getState();
    const systemPrompt = getPrompt('architectureExtraction');

    const prdSummary = `${context.prd.projectName} - ${context.prd.moduleName} - ${context.prd.version}`;
    const entitiesSummary = context.entities.map((e) => `${e.name} (${e.type})`).join('\n');

    const userPrompt = buildArchitectureExtractionPrompt(
      context.architectureGuide.content || '',
      prdSummary,
      entitiesSummary
    );

    const router = getLLMRouter();

    // If no API keys configured, skip LLM extraction and mark metadata
    if (!router.hasAnyApiKey()) {
      console.warn('No LLM provider API key configured — skipping architecture extraction');
      return {
        ...base,
        metadata: {
          generatorVersion: base.metadata?.generatorVersion ?? '1.0.0',
          prdId: base.metadata?.prdId ?? context.prd.id,
          erdId: base.metadata?.erdId ?? 'erd-unknown',
          standardsApplied: base.metadata?.standardsApplied ?? ['database', 'api'],
          exportFormats: base.metadata?.exportFormats ?? ['json', 'yaml', 'markdown'],
        },
      };
    }

    const response = await router.callWithRetry(
      'prdAnalysis', // reuse prdAnalysis tier for architecture extraction
      systemPrompt,
      userPrompt,
      8192,
      3,
      signal
    );

    const parsed = parseArchitectureExtractionResponse(response.content);

    // If previewOnly requested, return recommendations in metadata without applying
    if (previewOnly) {
      // Ensure tasks have technicalImplementation placeholder
      const previewTasks = base.tasks.map((t) => ({
        ...t,
        specification: {
          ...t.specification,
          technicalImplementation: (t.specification as any).technicalImplementation || {},
        },
      }));

      return {
        ...base,
        tasks: previewTasks,
        metadata: {
          generatorVersion: base.metadata?.generatorVersion ?? '1.0.0',
          prdId: base.metadata?.prdId ?? context.prd.id,
          erdId: base.metadata?.erdId ?? 'erd-unknown',
          standardsApplied: base.metadata?.standardsApplied ?? ['database', 'api'],
          exportFormats: base.metadata?.exportFormats ?? ['json', 'yaml', 'markdown'],
          architectureGuide: {
            id: context.architectureGuide.id,
            name: context.architectureGuide.name,
          },
          architectureRecommendations: parsed.recommendations || [],
          architectureExtractionRaw: parsed.raw || response.content,
        },
      } as TaskSet;
    }

    // Apply recommendations to the base tasks
    let modifiedTasks = applyRecommendationsToTasks(parsed.recommendations || [], base.tasks);
    // If we have raw response, attach it to metadata for debugging
    const extractionRaw = parsed.raw || response.content;
    // Placeholder for implementation enrichment raw response
    let implementationRaw: string | undefined = undefined;

    // Optionally enrich tasks with detailed technical implementation guidance
    let implSkippedReason: string | undefined = undefined;
    // Read user setting to decide whether to attempt enrichment
    const settings = useSettingsStore.getState();
    const enrichmentEnabled = settings?.advanced?.enableImplementationEnrichment ?? true;

    if (!enrichmentEnabled) {
      implSkippedReason = 'implementation_enrichment_disabled';
    } else if (options && (options as any).expandTechnicalImplementation === false) {
      implSkippedReason = 'implementation_enrichment_disabled_via_option';
    } else {
      // Ensure we have API keys for enrichment
      const router2 = getLLMRouter();
      if (!router2.hasAnyApiKey()) {
        implSkippedReason = 'no_api_key';
      } else {
        try {
          const implResult = await enrichTasksWithImplementation(modifiedTasks, context, signal);
          modifiedTasks = implResult.tasks;
          implementationRaw = implementationRaw || implResult.raw; // prefer existing if already set
        } catch (err) {
          console.warn('Task implementation enrichment failed, continuing with modified tasks', err);
          implSkippedReason = 'implementation_enrichment_failed';
        }
      }
    }

    // Recalculate summary and ensure metadata conforms to TaskSetMetadata
    // Ensure every task has technicalImplementation object
    const tasksWithImpl = modifiedTasks.map((t) => ({
      ...t,
      specification: {
        ...t.specification,
        technicalImplementation: (t.specification as any).technicalImplementation || {},
      },
    }));

    // Determine implementation enrichment status
    const anyEnriched = tasksWithImpl.some((t) => {
      const impl = (t.specification as any).technicalImplementation;
      return impl && Object.keys(impl).length > 0;
    });

    const updatedTaskSet: TaskSet = {
      ...base,
      tasks: tasksWithImpl,
      summary: {
        ...base.summary,
        totalTasks: tasksWithImpl.length,
      },
      metadata: {
        generatorVersion: base.metadata?.generatorVersion ?? '1.0.0',
        prdId: base.metadata?.prdId ?? context.prd.id,
        erdId: base.metadata?.erdId ?? 'erd-unknown',
        standardsApplied: base.metadata?.standardsApplied ?? (base.metadata?.standardsApplied ?? ['database', 'api']),
        exportFormats: base.metadata?.exportFormats ?? ['json', 'yaml', 'markdown'],
        architectureGuide: {
          id: context.architectureGuide.id,
          name: context.architectureGuide.name,
        },
        architectureRecommendations: parsed.recommendations || [],
        ...(extractionRaw ? { architectureExtractionRaw: extractionRaw } : {}),
        ...(implSkippedReason ? { architectureExtractionSkipped: implSkippedReason } : {}),
        ...(implementationRaw ? { architectureImplementationRaw: implementationRaw } : {}),
        ...(implSkippedReason ? { architectureImplementationSkipped: implSkippedReason } : {}),
        architectureImplementationStatus: anyEnriched ? 'enriched' : (implSkippedReason ? 'skipped' : 'not_enriched'),
      },
    };

    return updatedTaskSet;
  } catch (error) {
    console.error('Architecture extraction failed:', error);
    // Return base as fallback but ensure metadata placeholders
    return {
      ...base,
      metadata: {
        generatorVersion: base.metadata?.generatorVersion ?? '1.0.0',
        prdId: base.metadata?.prdId ?? context.prd.id,
        erdId: base.metadata?.erdId ?? 'erd-unknown',
        standardsApplied: base.metadata?.standardsApplied ?? ['database', 'api'],
        exportFormats: base.metadata?.exportFormats ?? ['json', 'yaml', 'markdown'],
        architectureGuide: {
          id: context.architectureGuide.id,
          name: context.architectureGuide.name,
        },
        architectureRecommendations: [],
        architectureExtractionSkipped: 'error',
      },
    };
  }
}



/**
 * Apply parsed architecture recommendations to an array of tasks
 */
function applyRecommendationsToTasks(recommendations: any[], tasks: ProgrammableTask[]): ProgrammableTask[] {
  return applyRecommendationsToTasksRaw(recommendations, tasks);
}

function applyRecommendationsToTasksRaw(recommendations: any[], tasks: ProgrammableTask[]): ProgrammableTask[] {
  const resultTasks = [...tasks.map((t) => ({ ...t }))];

  for (const rec of recommendations) {
    if (rec.action === 'add_task') {
      const newTask: ProgrammableTask = {
        id: generateTaskId(),
        title: rec.title || 'New Task',
        type: (rec.type as any) || 'documentation',
        tier: (rec.tier as any) || 'T2',
        module: rec.module || 'integration',
        priority: rec.priority || 'medium',
        dependencies: rec.dependencies || [],
        dependents: [],
        specification: rec.specification || { objective: rec.title || 'See spec', context: rec.context || '', requirements: rec.specification?.requirements || [] },
        acceptanceCriteria: rec.specification?.acceptanceCriteria || [],
        estimatedComplexity: 'moderate',
        tags: rec.tags || ['architecture-guidance'],
      };

      resultTasks.push(newTask);
    } else if (rec.action === 'modify_task') {
      // Locate task by id or title
      let target: ProgrammableTask | undefined;
      if (rec.target?.byId) {
        target = resultTasks.find((t) => t.id === rec.target.byId);
      } else if (rec.target?.byTitle) {
        target = resultTasks.find((t) => t.title === rec.target.byTitle);
      }

      if (target) {
        if (rec.changes?.tier) target.tier = rec.changes.tier;
        if (rec.changes?.priority) target.priority = rec.changes.priority;
        if (rec.changes?.addTechnicalNotes) target.specification.technicalNotes = [...(target.specification.technicalNotes || []), ...(rec.changes.addTechnicalNotes || [])];
        if (rec.changes?.addTags) target.tags = [...new Set([...(target.tags || []), ...(rec.changes.addTags || [])])];
        if (rec.changes?.addDependencies) target.dependencies = [...new Set([...(target.dependencies || []), ...(rec.changes.addDependencies || [])])];
      }
    }
  }

  return resultTasks;
}

function parseArchitectureExtractionResponse(content: string): { recommendations: any[]; raw?: string } {
  // ensure content length limit
  const trimmed = (content || '').slice(0, 200000);
  let jsonContent = trimmed.trim();

  // Strip code fences
  if (jsonContent.startsWith('```')) {
    const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonContent = match[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonContent);
    if (Array.isArray(parsed.recommendations) || parsed.recommendations) {
      return { recommendations: parsed.recommendations || [], raw: content };
    }

    // Fallback - maybe the root is the recommendations array
    if (Array.isArray(parsed)) {
      return { recommendations: parsed, raw: content };
    }

    return { recommendations: [], raw: content };
  } catch (error) {
    console.warn('Failed to parse architecture extraction response. Raw (truncated):', (content || '').slice(0, 1000));
    return { recommendations: [], raw: content };
  }
}

/**
 * Enrich tasks with technical implementation guidance using LLM
 */
async function enrichTasksWithImplementation(
  tasks: ProgrammableTask[],
  context: TaskGenerationContext,
  signal?: AbortSignal
): Promise<{ tasks: ProgrammableTask[]; raw?: string }> {
  if (!context.architectureGuide || !context.architectureGuide.content) return { tasks };

  let responseContent: string | undefined;

  try {
    const prdSummary = `${context.prd.projectName} - ${context.prd.moduleName} - ${context.prd.version}`;
    const tasksSummary = tasks
      .map((t) => `${t.id}: ${t.title}\nRequirements:\n- ${t.specification.requirements.join('\n- ')}`)
      .join('\n\n');

    const userPrompt = buildTaskImplementationPrompt(tasksSummary, prdSummary, context.architectureGuide.content || '');

    const systemPrompt = usePromptStore.getState().getPrompt('taskImplementation');
    const router = getLLMRouter();

    const response = await router.callWithRetry('T3', systemPrompt, userPrompt, 8192, 2, signal);
    responseContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    // Parse response JSON with robust extraction
    let jsonContent = (responseContent || '').trim();
    if (jsonContent.startsWith('```')) {
      const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonContent = match[1].trim();
    }

    const tryParseJson = (text: string): any | null => {
      try {
        return JSON.parse(text);
      } catch (err) {
        return null;
      }
    };

    // Helper to find the first balanced JSON block (object or array)
    const extractBalancedJson = (text: string): string | null => {
      const startIdx = Math.min(
        ...['{', '[']
          .map((ch) => text.indexOf(ch))
          .filter((i) => i >= 0)
      );

      if (isFinite(startIdx)) {
        const open = text[startIdx];
        const close = open === '{' ? '}' : ']';
        let depth = 0;
        for (let i = startIdx; i < text.length; i++) {
          const c = text[i];
          if (c === open) depth++;
          else if (c === close) depth--;

          if (depth === 0) {
            return text.slice(startIdx, i + 1);
          }
        }
      }

      return null;
    };

    let parsed: any = tryParseJson(jsonContent);

    if (!parsed) {
      // Try to extract balanced substring
      const candidate = extractBalancedJson(jsonContent);
      if (candidate) parsed = tryParseJson(candidate);
    }

    if (!parsed) {
      // As a last resort, try to progressively trim trailing chars until valid
      let attempt = jsonContent;
      while (attempt.length > 20) {
        attempt = attempt.slice(0, -1);
        const p = tryParseJson(attempt);
        if (p) {
          parsed = p;
          break;
        }
      }
    }

    if (!parsed) {
      console.warn('Failed to parse task implementation JSON. Raw (truncated):', (responseContent || '').slice(0, 1000));
      return { tasks, raw: responseContent };
    }

    // Robust extraction of implementations array
    let implementations: any[] = [];

    if (Array.isArray(parsed.implementations)) {
      implementations = parsed.implementations;
    } else if (Array.isArray(parsed)) {
      implementations = parsed;
    } else {
      // Try to find an array-like field that looks like implementations
      for (const k of Object.keys(parsed)) {
        if (Array.isArray((parsed as any)[k])) {
          const candidate = (parsed as any)[k];
          if (candidate.length > 0 && (candidate[0].id || candidate[0].title || candidate[0].stack || candidate[0].steps)) {
            implementations = candidate;
            break;
          }
        }
      }
    }

    // Apply to tasks
    const tasksById = new Map(tasks.map((t) => [t.id, { ...t }]));

    for (const impl of implementations) {
      const target = impl.id ? tasksById.get(impl.id) : tasks.find((tt) => tt.title === impl.title);
      if (target) {
        target.specification.technicalNotes = target.specification.technicalNotes || [];

        // Accept either { technicalImplementation: { ... } } or fields directly on impl
        const rawImpl = impl.technicalImplementation ? impl.technicalImplementation : impl;

        // Normalize fields
        const normalizeArray = (v: any): string[] | undefined => {
          if (v === undefined || v === null) return undefined;
          if (Array.isArray(v)) return v.map(String);
          if (typeof v === 'string') return v.split('\n').map((s) => s.trim()).filter(Boolean);
          return [String(v)];
        };

        const normalized: any = {};
        const maybeStack = normalizeArray(rawImpl.stack || rawImpl.tech || rawImpl.frameworks);
        if (maybeStack) normalized.stack = maybeStack;
        const maybeLibs = normalizeArray(rawImpl.libraries || rawImpl.libs);
        if (maybeLibs) normalized.libraries = maybeLibs;
        const maybeInfra = normalizeArray(rawImpl.infra || rawImpl.infrastructure);
        if (maybeInfra) normalized.infra = maybeInfra;
        const maybeConfig = normalizeArray(rawImpl.config);
        if (maybeConfig) normalized.config = maybeConfig;
        const maybeSteps = normalizeArray(rawImpl.steps || rawImpl.plan || rawImpl.implementationSteps);
        if (maybeSteps) normalized.steps = maybeSteps;
        const maybeCode = normalizeArray(rawImpl.codeExamples || rawImpl.code);
        if (maybeCode) normalized.codeExamples = maybeCode;
        if (rawImpl.estimatedEffortHours || rawImpl.estimatedEffort) {
          const n = Number(rawImpl.estimatedEffortHours ?? rawImpl.estimatedEffort);
          if (!Number.isNaN(n)) normalized.estimatedEffortHours = n;
        }

        // Only set if there's at least one property
        if (Object.keys(normalized).length > 0) {
          (target.specification as any).technicalImplementation = normalized;
        } else {
          // leave existing implementation if present
          (target.specification as any).technicalImplementation = (target.specification as any).technicalImplementation || {};
        }
      }
    }

    return { tasks: tasks.map((t) => tasksById.get(t.id) || t), raw: response.content };
  } catch (err) {
    console.error('Failed to enrich tasks with implementation details:', err);
    return { tasks };
  }
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

  return {
    id: generateTaskId(),
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
        id: `TC-${generateTaskId()}-1`,
        name: 'Table creation',
        type: 'integration',
        given: 'Empty database',
        when: 'Migration is run',
        then: `Table "${entity.tableName}" exists with correct schema`,
        priority: 'high',
      },
      {
        id: `TC-${generateTaskId()}-2`,
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
  };
}

function generateEntityTestTask(
  entity: Entity,
  context: TaskGenerationContext
): ProgrammableTask {
  return {
    id: generateTaskId(),
    title: `Tests: ${entity.name} entity`,
    type: 'test',
    tier: 'T2',
    module: context.prd.moduleName,
    relatedEntity: entity.name,
    priority: 'medium',
    dependencies: [],
    specification: {
      objective: `Create comprehensive test suite for ${entity.name} entity`,
      context: `Test coverage for ${entity.name} including unit, integration, and e2e tests`,
      requirements: [
        'Unit tests for entity validation',
        'Integration tests for CRUD operations',
        'E2E tests for UI interactions',
        `Test all ${entity.fields.length} fields`,
        'Test relationship integrity',
      ],
      technicalNotes: [
        'Use Vitest for unit/integration tests',
        'Use Playwright for E2E tests',
        'Use factories for test data generation',
      ],
      edgeCases: [
        'Test boundary values',
        'Test null/undefined handling',
        'Test concurrent operations',
      ],
      securityNotes: ['Test authorization for all operations'],
    },
    acceptanceCriteria: [
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
    tags: ['test', 'coverage', entity.name.toLowerCase()],
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
