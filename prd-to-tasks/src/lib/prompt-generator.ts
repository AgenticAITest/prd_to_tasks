/**
 * Prompt Generator
 *
 * Generates AI-ready prompts from structured task specifications.
 * Each function converts a ProgrammableTask into a natural-language prompt
 * optimized for AI coding assistants.
 */

import type {
  ProgrammableTask,
  DatabaseTaskSpec,
  DatabaseSpecification,
  APITaskSpec,
  APISpecification,
  UITaskSpec,
  UISpecification,
  ValidationTaskSpec,
  ValidationSpecification,
  WorkflowTaskSpec,
  WorkflowSpecification,
  EnvironmentSetupSpec,
  ServiceLayerSpec,
  APIClientSpec,
  E2EFlowSpec,
  TestSetupSpec,
} from '@/types/task';
import { usePromptStore } from '@/store/promptStore';

/**
 * Gets the configurable footer from the prompt store.
 * Uses zustand's getState() to access store outside React components.
 */
function getPromptFooter(): string {
  return usePromptStore.getState().getPrompt('copyPromptFooter');
}

/**
 * Main entry point - generates a prompt based on task type
 */
export function generateTaskPrompt(task: ProgrammableTask): string {
  const spec = task.specification;

  // Route to appropriate formatter based on task type
  switch (task.type) {
    case 'database-migration':
      if (spec.database) {
        return formatDatabaseMigrationPrompt(task, spec.database);
      }
      break;
    case 'api-crud':
    case 'api-custom':
      if (spec.api) {
        return formatAPICrudPrompt(task, spec.api);
      }
      break;
    case 'ui-list':
    case 'ui-form':
    case 'ui-detail':
    case 'ui-modal':
    case 'ui-dashboard':
    case 'ui-report':
      if (spec.ui) {
        return formatUIPrompt(task, spec.ui);
      }
      break;
    case 'validation':
    case 'business-logic':
      if (spec.validation) {
        return formatValidationPrompt(task, spec.validation);
      }
      break;
    case 'workflow':
      if (spec.workflow) {
        return formatWorkflowPrompt(task, spec.workflow);
      }
      break;
    case 'environment-setup':
      if (spec.environmentSetup) {
        return formatEnvironmentSetupPrompt(task, spec.environmentSetup);
      }
      break;
    case 'service-layer':
      if (spec.serviceLayer) {
        return formatServiceLayerPrompt(task, spec.serviceLayer);
      }
      break;
    case 'api-client':
      if (spec.apiClient) {
        return formatAPIClientPrompt(task, spec.apiClient);
      }
      break;
    case 'e2e-flow':
      if (spec.e2eFlow) {
        return formatE2EFlowPrompt(task, spec.e2eFlow);
      }
      break;
    case 'test-setup':
      if (spec.testSetup) {
        return formatTestSetupPrompt(task, spec.testSetup);
      }
      break;
  }

  // Fallback to generic prompt format
  return formatGenericPrompt(task);
}

/**
 * Formats a database migration task into an AI-ready prompt
 */
function formatDatabaseMigrationPrompt(
  task: ProgrammableTask,
  dbSpec: DatabaseTaskSpec | DatabaseSpecification
): string {
  const lines: string[] = [];
  const tableName = dbSpec.tableName;

  lines.push(`# Create Database Migration: ${tableName}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  // Generate SQL CREATE TABLE statement
  lines.push('```sql');
  lines.push(`CREATE TABLE ${tableName} (`);

  const columnDefs: string[] = [];
  const constraints: string[] = [];

  // Handle both DatabaseTaskSpec and DatabaseSpecification formats
  if ('schema' in dbSpec && dbSpec.schema) {
    // DatabaseTaskSpec format
    const schema = dbSpec.schema;
    for (const col of schema.columns) {
      let colDef = `  ${col.name} ${col.type.toUpperCase()}`;
      if (col.constraints.includes('NOT NULL') || col.constraints.includes('not null')) {
        colDef += ' NOT NULL';
      }
      if (col.constraints.includes('PRIMARY KEY') || col.constraints.includes('primary key')) {
        colDef += ' PRIMARY KEY';
      }
      if (col.constraints.includes('UNIQUE') || col.constraints.includes('unique')) {
        colDef += ' UNIQUE';
      }
      // Check for default value in constraints
      const defaultMatch = col.constraints.find(c => c.toLowerCase().startsWith('default'));
      if (defaultMatch) {
        colDef += ` ${defaultMatch.toUpperCase()}`;
      }
      columnDefs.push(colDef);
    }

    // Foreign key constraints
    if (schema.foreignKeys) {
      for (const fk of schema.foreignKeys) {
        constraints.push(
          `  CONSTRAINT fk_${tableName}_${fk.column}\n` +
          `    FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}\n` +
          `    ON DELETE ${fk.onDelete || 'RESTRICT'} ON UPDATE ${fk.onUpdate || 'CASCADE'}`
        );
      }
    }
  } else if ('columns' in dbSpec) {
    // DatabaseSpecification format
    for (const col of dbSpec.columns) {
      let colDef = `  ${col.name} ${col.type.toUpperCase()}`;
      if (col.constraints?.primaryKey) {
        colDef += ' PRIMARY KEY';
      }
      if (!col.constraints?.nullable) {
        colDef += ' NOT NULL';
      }
      if (col.constraints?.unique) {
        colDef += ' UNIQUE';
      }
      if (col.defaultValue) {
        colDef += ` DEFAULT ${col.defaultValue}`;
      }
      columnDefs.push(colDef);
    }

    // Foreign key constraints
    if (dbSpec.foreignKeys) {
      for (const fk of dbSpec.foreignKeys) {
        constraints.push(
          `  CONSTRAINT fk_${tableName}_${fk.column}\n` +
          `    FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})\n` +
          `    ON DELETE ${fk.onDelete || 'RESTRICT'} ON UPDATE ${fk.onUpdate || 'CASCADE'}`
        );
      }
    }
  }

  // Combine column definitions and constraints
  const allDefs = [...columnDefs, ...constraints];
  lines.push(allDefs.join(',\n'));
  lines.push(');');

  // Add indexes
  const indexes = 'schema' in dbSpec ? dbSpec.schema?.indexes : dbSpec.indexes;
  if (indexes && indexes.length > 0) {
    lines.push('');
    for (const idx of indexes) {
      const uniqueStr = idx.unique ? 'UNIQUE ' : '';
      lines.push(`CREATE ${uniqueStr}INDEX ${idx.name} ON ${tableName}(${idx.columns.join(', ')});`);
    }
  }

  lines.push('```');
  lines.push('');

  // Column details table
  lines.push('## Column Details');
  lines.push('| Column | Type | Nullable | Default | Notes |');
  lines.push('|--------|------|----------|---------|-------|');

  if ('schema' in dbSpec && dbSpec.schema) {
    for (const col of dbSpec.schema.columns) {
      const nullable = col.constraints.includes('NOT NULL') ? 'NO' : 'YES';
      const defaultVal = col.constraints.find(c => c.toLowerCase().startsWith('default'))?.split(' ')[1] || '-';
      const notes = col.description || col.constraints.filter(c => !c.toLowerCase().includes('null') && !c.toLowerCase().startsWith('default')).join(', ') || '-';
      lines.push(`| ${col.name} | ${col.type.toUpperCase()} | ${nullable} | ${defaultVal} | ${notes} |`);
    }
  } else if ('columns' in dbSpec) {
    for (const col of dbSpec.columns) {
      const nullable = col.constraints?.nullable ? 'YES' : 'NO';
      const notes: string[] = [];
      if (col.constraints?.primaryKey) notes.push('Primary key');
      if (col.constraints?.unique) notes.push('Unique');
      if (col.constraints?.foreignKey) notes.push(`FK to ${col.constraints.foreignKey.table}`);
      lines.push(`| ${col.name} | ${col.type.toUpperCase()} | ${nullable} | ${col.defaultValue || '-'} | ${notes.join(', ') || '-'} |`);
    }
  }

  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  // Add technical notes if available
  if (task.specification.technicalNotes && task.specification.technicalNotes.length > 0) {
    lines.push('');
    lines.push('## Technical Notes');
    for (const note of task.specification.technicalNotes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats an API CRUD task into an AI-ready prompt
 */
function formatAPICrudPrompt(
  task: ProgrammableTask,
  apiSpec: APITaskSpec | APISpecification
): string {
  const lines: string[] = [];

  // Determine method and endpoint
  const method = apiSpec.method;
  const endpoint = 'endpoint' in apiSpec ? apiSpec.endpoint : apiSpec.route;

  lines.push(`# Implement API Endpoint: ${task.title}`);
  lines.push('');
  lines.push(`**Endpoint:** \`${method} ${endpoint}\``);
  lines.push('');

  // Request body section (for POST/PUT/PATCH)
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    lines.push('## Request Body');
    lines.push('');
    lines.push('```typescript');

    if ('request' in apiSpec && apiSpec.request?.body) {
      const interfaceName = `${method === 'POST' ? 'Create' : 'Update'}${extractEntityName(endpoint)}Request`;
      lines.push(`interface ${interfaceName} {`);
      for (const field of apiSpec.request.body) {
        const required = field.required ? '' : '?';
        const comment = field.description ? `  // ${field.description}` : '';
        lines.push(`  ${field.name}${required}: ${mapToTsType(field.type)};${comment}`);
      }
      lines.push('}');
    } else if ('requestSchema' in apiSpec && apiSpec.requestSchema) {
      const interfaceName = `${method === 'POST' ? 'Create' : 'Update'}${extractEntityName(endpoint)}Request`;
      lines.push(`interface ${interfaceName} {`);
      for (const [name, prop] of Object.entries(apiSpec.requestSchema.properties)) {
        const required = prop.required ? '' : '?';
        const comment = prop.description ? `  // ${prop.description}` : '';
        lines.push(`  ${name}${required}: ${mapToTsType(prop.type)};${comment}`);
      }
      lines.push('}');
    }

    lines.push('```');
    lines.push('');
  }

  // Query parameters (for GET)
  if (method === 'GET') {
    const queryParams = 'request' in apiSpec ? apiSpec.request?.query : apiSpec.queryParams;
    if (queryParams && queryParams.length > 0) {
      lines.push('## Query Parameters');
      lines.push('| Parameter | Type | Required | Description |');
      lines.push('|-----------|------|----------|-------------|');
      for (const param of queryParams) {
        const required = param.required ? 'Yes' : 'No';
        lines.push(`| ${param.name} | ${param.type} | ${required} | ${param.description} |`);
      }
      lines.push('');
    }
  }

  // Path parameters
  const pathParams = 'request' in apiSpec ? apiSpec.request?.params : apiSpec.pathParams;
  if (pathParams && pathParams.length > 0) {
    lines.push('## Path Parameters');
    lines.push('| Parameter | Type | Required | Description |');
    lines.push('|-----------|------|----------|-------------|');
    for (const param of pathParams) {
      const required = param.required ? 'Yes' : 'No';
      lines.push(`| ${param.name} | ${param.type} | ${required} | ${param.description} |`);
    }
    lines.push('');
  }

  // Response section
  lines.push('## Response');
  lines.push('');

  if ('response' in apiSpec && apiSpec.response) {
    lines.push(`**Success (${apiSpec.response.success.status}):**`);
    lines.push('```typescript');
    lines.push(apiSpec.response.success.body);
    lines.push('```');
    lines.push('');

    if (apiSpec.response.errors.length > 0) {
      lines.push('## Error Responses');
      lines.push('| Code | Condition |');
      lines.push('|------|-----------|');
      for (const err of apiSpec.response.errors) {
        lines.push(`| ${err.status} | ${err.condition} |`);
      }
      lines.push('');
    }
  } else if ('successCode' in apiSpec) {
    lines.push(`**Success Code:** ${apiSpec.successCode}`);
    lines.push('');

    if (apiSpec.responseSchema) {
      lines.push('```typescript');
      lines.push(`interface Response {`);
      if (apiSpec.responseSchema.properties) {
        for (const [name, prop] of Object.entries(apiSpec.responseSchema.properties)) {
          lines.push(`  ${name}: ${JSON.stringify(prop)};`);
        }
      } else if (apiSpec.responseSchema.items) {
        lines.push(`  // Array of ${apiSpec.responseSchema.items.type}`);
      }
      lines.push('}');
      lines.push('```');
      lines.push('');
    }

    if (apiSpec.errorCodes && apiSpec.errorCodes.length > 0) {
      lines.push('## Error Responses');
      lines.push('| Code | Description |');
      lines.push('|------|-------------|');
      for (const err of apiSpec.errorCodes) {
        lines.push(`| ${err.code} | ${err.description} |`);
      }
      lines.push('');
    }
  }

  // Business rules (if APITaskSpec)
  if ('businessRules' in apiSpec && apiSpec.businessRules?.length > 0) {
    lines.push('## Business Rules');
    for (const rule of apiSpec.businessRules) {
      lines.push(`- **${rule.name}**: ${rule.description}`);
      if (rule.implementation) {
        lines.push(`  - Implementation: ${rule.implementation}`);
      }
    }
    lines.push('');
  }

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  // Security notes
  if (task.specification.securityNotes && task.specification.securityNotes.length > 0) {
    lines.push('');
    lines.push('## Security Considerations');
    for (const note of task.specification.securityNotes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats a UI task into an AI-ready prompt
 */
function formatUIPrompt(
  task: ProgrammableTask,
  uiSpec: UITaskSpec | UISpecification
): string {
  const lines: string[] = [];

  const screenType = uiSpec.screenType;
  const route = uiSpec.route;

  lines.push(`# Implement UI: ${task.title}`);
  lines.push('');
  lines.push(`**Route:** \`${route}\``);
  lines.push(`**Screen Type:** ${screenType}`);
  lines.push('');

  // Data source
  if ('dataSource' in uiSpec && typeof uiSpec.dataSource === 'object') {
    lines.push('## Data Source');
    lines.push(`- **API:** \`${uiSpec.dataSource.method} ${uiSpec.dataSource.api}\``);
    if (uiSpec.dataSource.params) {
      lines.push(`- **Params:** ${JSON.stringify(uiSpec.dataSource.params)}`);
    }
    lines.push('');
  } else if ('dataSource' in uiSpec && typeof uiSpec.dataSource === 'string') {
    lines.push('## Data Source');
    lines.push(`Entity: \`${uiSpec.dataSource}\``);
    lines.push('');
  }

  // Layout description
  if ('layout' in uiSpec) {
    const layout = uiSpec.layout;
    if (typeof layout === 'object' && 'description' in layout) {
      lines.push('## Layout');
      lines.push(layout.description);
      if (layout.components && layout.components.length > 0) {
        lines.push('');
        lines.push('**Components needed:**');
        for (const comp of layout.components) {
          lines.push(`- ${comp}`);
        }
      }
      lines.push('');
    } else if (typeof layout === 'object' && 'type' in layout) {
      lines.push('## Layout');
      lines.push(`- **Type:** ${layout.type}`);
      if (layout.template) {
        lines.push(`- **Template:** ${layout.template}`);
      }
      lines.push('');
    }
  }

  // Fields table
  if (uiSpec.fields && uiSpec.fields.length > 0) {
    lines.push('## Fields');

    if (screenType === 'list' || task.type === 'ui-list') {
      lines.push('| Column | Label | Type | Sortable | Notes |');
      lines.push('|--------|-------|------|----------|-------|');
      for (const field of uiSpec.fields) {
        const fieldName = 'id' in field ? field.id : field.name;
        const label = field.label;
        const type = field.type;
        const notes = 'entityMapping' in field ? field.entityMapping : (field.required ? 'Required' : '');
        lines.push(`| ${fieldName} | ${label} | ${type} | Yes | ${notes} |`);
      }
    } else {
      lines.push('| Field | Label | Type | Required | Validation |');
      lines.push('|-------|-------|------|----------|------------|');
      for (const field of uiSpec.fields) {
        const fieldName = 'id' in field ? field.id : field.name;
        const label = field.label;
        const type = field.type;
        const required = 'required' in field ? (field.required ? 'Yes' : 'No') : '-';
        const validation = field.validation?.join(', ') || '-';
        lines.push(`| ${fieldName} | ${label} | ${type} | ${required} | ${validation} |`);
      }
    }
    lines.push('');
  }

  // Actions table
  if (uiSpec.actions && uiSpec.actions.length > 0) {
    lines.push('## Actions');
    lines.push('| Action | Type | Handler |');
    lines.push('|--------|------|---------|');
    for (const action of uiSpec.actions) {
      const actionName = 'id' in action ? action.id : action.name;
      const actionLabel = 'label' in action ? action.label : actionName;
      const actionType = action.type;
      const handler = 'action' in action ? action.action : action.handler;
      lines.push(`| ${actionLabel} | ${actionType} | ${handler} |`);
    }
    lines.push('');
  }

  // Accessibility requirements
  if ('accessibility' in uiSpec && uiSpec.accessibility && uiSpec.accessibility.length > 0) {
    lines.push('## Accessibility Requirements');
    for (const req of uiSpec.accessibility) {
      lines.push(`- ${req}`);
    }
    lines.push('');
  }

  // Features required based on screen type
  if (screenType === 'list' || task.type === 'ui-list') {
    lines.push('## Features Required');
    lines.push('- [ ] Pagination (page, limit params)');
    lines.push('- [ ] Sorting by all sortable columns');
    lines.push('- [ ] Search/filter functionality');
    lines.push('- [ ] Loading skeleton while fetching');
    lines.push('- [ ] Empty state when no results');
    lines.push('- [ ] Error state with retry option');
    lines.push('');
  }

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats a validation/business logic task into an AI-ready prompt
 */
function formatValidationPrompt(
  task: ProgrammableTask,
  valSpec: ValidationTaskSpec | ValidationSpecification
): string {
  const lines: string[] = [];

  lines.push(`# Implement Validation: ${task.title}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  const targetEntity = valSpec.targetEntity;
  lines.push(`**Target Entity:** \`${targetEntity}\``);

  if ('targetField' in valSpec && valSpec.targetField) {
    lines.push(`**Target Field:** \`${valSpec.targetField}\``);
  } else if ('targetFields' in valSpec && valSpec.targetFields) {
    lines.push(`**Target Fields:** ${valSpec.targetFields.map(f => `\`${f}\``).join(', ')}`);
  }

  lines.push('');

  // Validation rules
  lines.push('## Validation Rules');
  lines.push('');

  if ('rules' in valSpec && Array.isArray(valSpec.rules)) {
    for (const rule of valSpec.rules) {
      lines.push(`### ${rule.name} (${rule.id})`);
      lines.push(`- **Type:** ${rule.type}`);
      lines.push(`- **Condition:** ${rule.condition}`);
      lines.push(`- **Error Message:** "${rule.errorMessage}"`);
      lines.push(`- **Error Code:** \`${rule.errorCode}\``);
      lines.push(`- **Priority:** ${rule.priority}`);
      lines.push('');
    }
  } else if ('ruleName' in valSpec) {
    // ValidationSpecification format
    const specVal = valSpec as ValidationSpecification;
    lines.push(`### ${specVal.ruleName}`);
    lines.push(`- **Type:** ${specVal.ruleType}`);
    lines.push(`- **Condition:** ${specVal.condition}`);
    lines.push(`- **Error Message:** "${specVal.errorMessage}"`);
    lines.push(`- **Severity:** ${specVal.severity}`);
    lines.push('');
  }

  // Implementation example
  lines.push('## Implementation');
  lines.push('```typescript');
  lines.push('// Implement validation logic here');
  lines.push(`function validate${toPascalCase(targetEntity)}(data: ${toPascalCase(targetEntity)}): ValidationResult {`);
  lines.push('  const errors: ValidationError[] = [];');
  lines.push('');
  lines.push('  // Add validation rules...');
  lines.push('');
  lines.push('  return { valid: errors.length === 0, errors };');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats a workflow task into an AI-ready prompt
 */
function formatWorkflowPrompt(
  task: ProgrammableTask,
  wfSpec: WorkflowTaskSpec | WorkflowSpecification
): string {
  const lines: string[] = [];

  const workflowName = wfSpec.workflowName;

  lines.push(`# Implement Workflow: ${workflowName}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  if ('entity' in wfSpec) {
    lines.push(`**Entity:** \`${wfSpec.entity}\``);
  }
  if ('statusField' in wfSpec) {
    lines.push(`**Status Field:** \`${wfSpec.statusField}\``);
  }
  lines.push('');

  // State diagram
  lines.push('## State Diagram');
  lines.push('```');

  const states = wfSpec.states;
  const transitions = wfSpec.transitions;

  // Find initial state
  const initialState = 'initialState' in wfSpec
    ? wfSpec.initialState
    : states.find(s => 'isInitial' in s && s.isInitial)?.name || states[0]?.name;

  lines.push(`[*] --> ${initialState}`);

  for (const trans of transitions) {
    lines.push(`${trans.from} --> ${trans.to} : ${trans.trigger}`);
  }

  // Find final states
  const finalStates = 'finalStates' in wfSpec
    ? wfSpec.finalStates
    : states.filter(s => 'isFinal' in s && s.isFinal).map(s => s.name);

  for (const final of finalStates) {
    lines.push(`${final} --> [*]`);
  }

  lines.push('```');
  lines.push('');

  // States table
  lines.push('## States');
  lines.push('| State | Description | Allowed Actions |');
  lines.push('|-------|-------------|-----------------|');

  for (const state of states) {
    const name = 'id' in state ? state.id : state.name;
    const description = state.description;
    const actions = 'allowedActions' in state
      ? state.allowedActions.join(', ')
      : state.allowedTransitions?.join(', ') || '-';
    lines.push(`| ${name} | ${description} | ${actions} |`);
  }
  lines.push('');

  // Transitions table
  lines.push('## Transitions');
  lines.push('| From | To | Trigger | Conditions |');
  lines.push('|------|-----|---------|------------|');

  for (const trans of transitions) {
    const from = trans.from;
    const to = trans.to;
    const trigger = 'name' in trans ? trans.name : trans.trigger;
    const conditions = trans.conditions?.join('; ') || '-';
    lines.push(`| ${from} | ${to} | ${trigger} | ${conditions} |`);
  }
  lines.push('');

  // Side effects (if available in WorkflowTaskSpec format)
  const transitionsWithEffects = transitions.filter(t =>
    ('sideEffects' in t && t.sideEffects && t.sideEffects.length > 0) ||
    ('actions' in t && t.actions && t.actions.length > 0)
  );

  if (transitionsWithEffects.length > 0) {
    lines.push('## Side Effects');
    for (const trans of transitionsWithEffects) {
      const trigger = 'name' in trans ? trans.name : trans.trigger;
      lines.push(`### On ${trans.from} -> ${trans.to} (${trigger})`);
      const effects = 'sideEffects' in trans ? trans.sideEffects : trans.actions;
      for (const effect of effects || []) {
        lines.push(`- ${effect}`);
      }
    }
    lines.push('');
  }

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Fallback formatter for tasks without specific type handlers
 */
function formatGenericPrompt(task: ProgrammableTask): string {
  const lines: string[] = [];
  const spec = task.specification;

  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(`**Type:** ${task.type}`);
  lines.push(`**Module:** ${task.module}`);
  lines.push(`**Priority:** ${task.priority}`);
  lines.push(`**Complexity:** ${task.estimatedComplexity}`);
  lines.push('');

  lines.push('## Objective');
  lines.push(spec.objective);
  lines.push('');

  lines.push('## Context');
  lines.push(spec.context);
  lines.push('');

  lines.push('## Requirements');
  for (const req of spec.requirements) {
    lines.push(`- ${req}`);
  }
  lines.push('');

  if (spec.technicalNotes && spec.technicalNotes.length > 0) {
    lines.push('## Technical Notes');
    for (const note of spec.technicalNotes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  if (spec.edgeCases && spec.edgeCases.length > 0) {
    lines.push('## Edge Cases');
    for (const edge of spec.edgeCases) {
      lines.push(`- ${edge}`);
    }
    lines.push('');
  }

  if (spec.securityNotes && spec.securityNotes.length > 0) {
    lines.push('## Security Considerations');
    for (const note of spec.securityNotes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  if (task.tags.length > 0) {
    lines.push('');
    lines.push(`**Tags:** ${task.tags.join(', ')}`);
  }

  return lines.join('\n') + getPromptFooter();
}

// ============================================================================
// INTEGRATION/ORCHESTRATION TASK FORMATTERS
// ============================================================================

/**
 * Formats an environment setup task into an AI-ready prompt
 */
function formatEnvironmentSetupPrompt(
  task: ProgrammableTask,
  envSpec: EnvironmentSetupSpec
): string {
  const lines: string[] = [];

  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  // Components
  lines.push('## Components to Configure');
  lines.push('');

  for (const component of envSpec.components) {
    lines.push(`### ${component.name} (${component.technology})`);
    lines.push(`- **Type:** ${component.type}`);
    if (component.port) {
      lines.push(`- **Port:** ${component.port}`);
    }
    lines.push('');

    lines.push('**Configuration:**');
    lines.push('```');
    for (const [key, value] of Object.entries(component.configuration)) {
      lines.push(`${key}=${value}`);
    }
    lines.push('```');
    lines.push('');

    lines.push('**Environment Variables:**');
    lines.push('| Variable | Description | Example |');
    lines.push('|----------|-------------|---------|');
    for (const env of component.envVariables) {
      lines.push(`| ${env.name} | ${env.description} | \`${env.example}\` |`);
    }
    lines.push('');
  }

  // Dependencies
  lines.push('## Dependencies');
  lines.push('| Dependency | Version | Install Command |');
  lines.push('|------------|---------|-----------------|');
  for (const dep of envSpec.dependencies) {
    lines.push(`| ${dep.name} | ${dep.version} | \`${dep.installCommand}\` |`);
  }
  lines.push('');

  // Setup steps
  lines.push('## Setup Steps');
  for (const step of envSpec.setupSteps) {
    lines.push(step);
  }
  lines.push('');

  // Verification
  lines.push('## Verification');
  for (const step of envSpec.verificationSteps) {
    lines.push(`- [ ] ${step}`);
  }
  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats a service layer task into an AI-ready prompt
 */
function formatServiceLayerPrompt(
  task: ProgrammableTask,
  svcSpec: ServiceLayerSpec
): string {
  const lines: string[] = [];

  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(`**Entity:** ${svcSpec.entityName}`);
  lines.push(`**Service:** ${svcSpec.serviceName}`);
  lines.push(`**Repository:** ${svcSpec.repositoryName}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  // Service interface
  lines.push('## Service Interface');
  lines.push('');
  lines.push('```typescript');
  lines.push(`interface ${svcSpec.serviceName} {`);
  for (const method of svcSpec.methods) {
    const params = method.input.map(i => `${i.name}: ${i.type}`).join(', ');
    lines.push(`  ${method.name}(${params}): Promise<${method.output}>;`);
  }
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Method details
  lines.push('## Methods');
  lines.push('');

  for (const method of svcSpec.methods) {
    lines.push(`### ${method.name}`);
    lines.push(method.description);
    lines.push('');

    lines.push('**Input:**');
    for (const input of method.input) {
      lines.push(`- \`${input.name}: ${input.type}\``);
    }
    lines.push('');

    lines.push(`**Output:** \`${method.output}\``);
    lines.push('');

    lines.push(`**Database Operations:** ${method.dbOperations.join(', ')}`);
    lines.push('');

    if (method.businessLogic && method.businessLogic.length > 0) {
      lines.push('**Business Logic:**');
      for (const logic of method.businessLogic) {
        lines.push(`- ${logic}`);
      }
      lines.push('');
    }
  }

  // Dependencies
  lines.push('## Dependencies');
  for (const dep of svcSpec.dependencies) {
    lines.push(`- ${dep}`);
  }
  lines.push('');

  // Transaction boundaries
  if (svcSpec.transactionBoundaries && svcSpec.transactionBoundaries.length > 0) {
    lines.push('## Transaction Boundaries');
    for (const boundary of svcSpec.transactionBoundaries) {
      lines.push(`- ${boundary}`);
    }
    lines.push('');
  }

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats an API client setup task into an AI-ready prompt
 */
function formatAPIClientPrompt(
  task: ProgrammableTask,
  clientSpec: APIClientSpec
): string {
  const lines: string[] = [];

  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(`**Base URL:** ${clientSpec.baseUrl}`);
  lines.push(`**Auth Method:** ${clientSpec.authMethod}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  // API Client setup
  lines.push('## API Client Configuration');
  lines.push('');
  lines.push('```typescript');
  lines.push('const apiClient = createApiClient({');
  lines.push(`  baseUrl: '${clientSpec.baseUrl}',`);
  lines.push(`  authMethod: '${clientSpec.authMethod}',`);
  lines.push('  retryPolicy: { maxRetries: 3, backoff: "exponential" },');
  lines.push('});');
  lines.push('```');
  lines.push('');

  // Endpoints
  lines.push('## API Functions');
  lines.push('');
  lines.push('| Function | Method | Path | Request | Response |');
  lines.push('|----------|--------|------|---------|----------|');
  for (const endpoint of clientSpec.endpoints) {
    const req = endpoint.requestType || '-';
    lines.push(`| ${endpoint.name} | ${endpoint.method} | ${endpoint.path} | ${req} | ${endpoint.responseType} |`);
  }
  lines.push('');

  // State management
  lines.push('## State Management');
  lines.push(`**Library:** ${clientSpec.stateManagement.library}`);
  lines.push('');
  lines.push('**Stores:**');
  for (const store of clientSpec.stateManagement.stores) {
    lines.push(`- \`${store.name}\`: ${store.purpose}`);
  }
  lines.push('');

  // Error handling
  lines.push('## Error Handling');
  lines.push(`**Strategy:** ${clientSpec.errorHandlingStrategy}`);
  if (clientSpec.retryPolicy) {
    lines.push(`**Retry Policy:** ${clientSpec.retryPolicy}`);
  }
  lines.push('');

  // Example implementation
  lines.push('## Example Implementation');
  lines.push('');
  lines.push('```typescript');
  lines.push('// API function example');
  const firstEndpoint = clientSpec.endpoints[0];
  if (firstEndpoint) {
    lines.push(`export async function ${firstEndpoint.name}(): Promise<${firstEndpoint.responseType}> {`);
    lines.push(`  const response = await apiClient.${firstEndpoint.method.toLowerCase()}('${firstEndpoint.path}');`);
    lines.push('  return response.data;');
    lines.push('}');
  }
  lines.push('```');
  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats an E2E flow task into an AI-ready prompt
 */
function formatE2EFlowPrompt(
  task: ProgrammableTask,
  flowSpec: E2EFlowSpec
): string {
  const lines: string[] = [];

  lines.push(`# E2E Flow: ${flowSpec.flowName}`);
  lines.push('');
  lines.push(flowSpec.description);
  lines.push('');
  lines.push(`**Actors:** ${flowSpec.actors.join(', ')}`);
  lines.push('');

  // Preconditions
  lines.push('## Preconditions');
  for (const pre of flowSpec.preconditions) {
    lines.push(`- ${pre}`);
  }
  lines.push('');

  // Flow steps
  lines.push('## Flow Steps');
  lines.push('');
  lines.push('```mermaid');
  lines.push('sequenceDiagram');
  lines.push(`    actor User`);
  for (const step of flowSpec.steps) {
    const target = step.screen || step.api || 'System';
    lines.push(`    User->>+${target}: ${step.action}`);
    lines.push(`    ${target}-->>-User: ${step.expectedResult}`);
  }
  lines.push('```');
  lines.push('');

  // Detailed steps
  lines.push('## Step Details');
  lines.push('');
  for (const step of flowSpec.steps) {
    lines.push(`### Step ${step.stepNumber}: ${step.action}`);
    if (step.screen) {
      lines.push(`- **Screen:** ${step.screen}`);
    }
    if (step.api) {
      lines.push(`- **API:** ${step.api}`);
    }
    lines.push(`- **Expected Result:** ${step.expectedResult}`);
    if (step.dataRequired && step.dataRequired.length > 0) {
      lines.push(`- **Data Required:** ${step.dataRequired.join(', ')}`);
    }
    lines.push('');
  }

  // Postconditions
  lines.push('## Postconditions');
  for (const post of flowSpec.postconditions) {
    lines.push(`- ${post}`);
  }
  lines.push('');

  // Alternative flows
  if (flowSpec.alternativeFlows && flowSpec.alternativeFlows.length > 0) {
    lines.push('## Alternative Flows');
    lines.push('');
    for (const alt of flowSpec.alternativeFlows) {
      lines.push(`### ${alt.name}`);
      lines.push(`**Trigger:** ${alt.triggerCondition}`);
      lines.push('');
      lines.push('**Steps:**');
      for (const step of alt.steps) {
        lines.push(`1. ${step}`);
      }
      lines.push('');
    }
  }

  // E2E Test template
  lines.push('## E2E Test Template');
  lines.push('');
  lines.push('```typescript');
  lines.push(`test('${flowSpec.flowName} - Happy Path', async ({ page }) => {`);
  for (const step of flowSpec.steps) {
    lines.push(`  // Step ${step.stepNumber}: ${step.action}`);
    if (step.screen) {
      lines.push(`  await page.goto('${step.screen}');`);
    }
    lines.push(`  // Assert: ${step.expectedResult}`);
  }
  lines.push('});');
  lines.push('```');
  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

/**
 * Formats a test setup task into an AI-ready prompt
 */
function formatTestSetupPrompt(
  task: ProgrammableTask,
  testSpec: TestSetupSpec
): string {
  const lines: string[] = [];

  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push(`**Test Types:** ${testSpec.testType}`);
  lines.push('');
  lines.push(task.specification.objective);
  lines.push('');

  // Prerequisites
  lines.push('## Prerequisites');
  lines.push('');
  lines.push('| Component | Requirement | Setup Command |');
  lines.push('|-----------|-------------|---------------|');
  for (const prereq of testSpec.prerequisites) {
    lines.push(`| ${prereq.component} | ${prereq.requirement} | \`${prereq.setupCommand || '-'}\` |`);
  }
  lines.push('');

  // Test database
  lines.push('## Test Database');
  lines.push(`- **Type:** ${testSpec.testDatabase.type}`);
  if (testSpec.testDatabase.setupScript) {
    lines.push(`- **Setup Script:** \`${testSpec.testDatabase.setupScript}\``);
  }
  lines.push(`- **Seed Data Required:** ${testSpec.testDatabase.seedDataRequired ? 'Yes' : 'No'}`);
  if (testSpec.testDatabase.seedEntities && testSpec.testDatabase.seedEntities.length > 0) {
    lines.push(`- **Entities to Seed:** ${testSpec.testDatabase.seedEntities.join(', ')}`);
  }
  lines.push('');

  // Mock services
  lines.push('## Mock Services');
  lines.push('');
  for (const mock of testSpec.mockServices) {
    lines.push(`### ${mock.service}`);
    lines.push(`- **Strategy:** ${mock.mockStrategy}`);
    if (mock.mockData) {
      lines.push(`- **Mock Data:** ${mock.mockData}`);
    }
    lines.push('');
  }

  // Environment variables
  lines.push('## Environment Variables');
  lines.push('```bash');
  for (const env of testSpec.environmentVariables) {
    lines.push(`${env.name}=${env.value}`);
  }
  lines.push('```');
  lines.push('');

  // Run commands
  lines.push('## Test Commands');
  lines.push('');
  lines.push('| Type | Command | Description |');
  lines.push('|------|---------|-------------|');
  for (const cmd of testSpec.runCommands) {
    lines.push(`| ${cmd.type} | \`${cmd.command}\` | ${cmd.description} |`);
  }
  lines.push('');

  // Test factory template
  lines.push('## Test Factory Template');
  lines.push('');
  lines.push('```typescript');
  lines.push('// Example factory');
  if (testSpec.testDatabase.seedEntities && testSpec.testDatabase.seedEntities.length > 0) {
    const entity = testSpec.testDatabase.seedEntities[0];
    lines.push(`export const ${entity}Factory = {`);
    lines.push('  build: (overrides = {}) => ({');
    lines.push('    id: faker.string.uuid(),');
    lines.push('    createdAt: new Date(),');
    lines.push('    ...overrides,');
    lines.push('  }),');
    lines.push('  create: async (overrides = {}) => {');
    lines.push(`    const data = ${entity}Factory.build(overrides);`);
    lines.push('    return await db.insert(data);');
    lines.push('  },');
    lines.push('};');
  }
  lines.push('```');
  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  for (const ac of task.acceptanceCriteria) {
    lines.push(`- [ ] ${ac}`);
  }

  return lines.join('\n') + getPromptFooter();
}

// Helper functions

/**
 * Extracts entity name from an API endpoint path
 * e.g., "/api/purchase-orders" -> "PurchaseOrder"
 */
function extractEntityName(endpoint: string): string {
  const parts = endpoint.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1] || 'Entity';

  // Remove :id patterns
  const cleaned = lastPart.replace(/:[a-zA-Z_]+/g, '');

  // Convert kebab-case to PascalCase and singularize (simple version)
  return cleaned
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
    .replace(/s$/, ''); // Simple singularization
}

/**
 * Maps common type names to TypeScript types
 */
function mapToTsType(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'varchar': 'string',
    'text': 'string',
    'uuid': 'string',
    'integer': 'number',
    'int': 'number',
    'decimal': 'number',
    'float': 'number',
    'number': 'number',
    'boolean': 'boolean',
    'bool': 'boolean',
    'date': 'string', // ISO date string
    'datetime': 'string',
    'timestamp': 'string',
    'timestamptz': 'string',
    'json': 'object',
    'jsonb': 'object',
    'array': 'unknown[]',
  };

  const lowerType = type.toLowerCase();
  return typeMap[lowerType] || 'unknown';
}

/**
 * Converts a string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
