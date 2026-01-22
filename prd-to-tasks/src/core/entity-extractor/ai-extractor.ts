/**
 * AI-Powered Entity Extractor
 *
 * Uses LLM to extract entities, relationships, and provide suggestions
 * from PRD content.
 */

import type { StructuredPRD } from '@/types/prd';
import type {
  Entity,
  Field,
  Relationship,
  EntitySuggestion,
  EntityType,
  DataType,
  RelationshipType,
} from '@/types/entity';
import { getLLMRouter } from '@/core/llm/LLMRouter';
import { buildEntityExtractionPrompt } from '@/core/llm/prompts/entity-extraction';
import { usePromptStore } from '@/store/promptStore';
import { generateId } from '@/lib/utils';

export interface AIEntityExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
  suggestions: EntitySuggestion[];
  rawResponse?: string;
}

interface AIEntityRaw {
  name: string;
  displayName?: string;
  tableName?: string;
  description?: string;
  type?: string;
  fields?: AIFieldRaw[];
  isAuditable?: boolean;
  isSoftDelete?: boolean;
}

interface AIFieldRaw {
  name: string;
  columnName?: string;
  displayName?: string;
  description?: string;
  dataType?: string;
  constraints?: {
    primaryKey?: boolean;
    unique?: boolean;
    nullable?: boolean;
    indexed?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  enumValues?: string[];
  defaultValue?: string;
}

interface AIRelationshipRaw {
  name: string;
  type?: string;
  from?: {
    entity: string;
    field: string;
    cardinality?: string;
  };
  to?: {
    entity: string;
    field: string;
    cardinality?: string;
  };
  description?: string;
}

interface AISuggestionRaw {
  type?: string;
  target?: string;
  suggestion?: string;
  reason?: string;
  confidence?: number;
}

/**
 * Extract entities from PRD using AI
 */
export async function extractEntitiesWithAI(
  rawContent: string,
  parsedPRD: StructuredPRD,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<AIEntityExtractionResult> {
  const router = getLLMRouter();

  // Build functional requirements summary for prompt
  const functionalRequirements = parsedPRD.functionalRequirements
    .map((fr) => {
      const screens = fr.screens.map((s) => `- ${s.name} (${s.type}): ${s.route}`).join('\n');
      const rules = fr.businessRules.map((r) => `- ${r.name}: ${r.description}`).join('\n');
      return `${fr.id}: ${fr.title}\nDescription: ${fr.description}\nScreens:\n${screens}\nBusiness Rules:\n${rules}`;
    })
    .join('\n\n');

  // Build the prompt
  const userPrompt = buildEntityExtractionPrompt(rawContent, functionalRequirements);

  onProgress?.(10);

  // Get system prompt from store (supports custom prompts)
  const systemPrompt = usePromptStore.getState().getPrompt('entityExtraction');

  // Call LLM with entityExtraction tier
  const response = await router.callWithRetry(
    'entityExtraction',
    systemPrompt,
    userPrompt,
    8192, // Allow for detailed entity definitions
    3, // Max retries
    signal
  );

  onProgress?.(80);

  // Parse the response
  const result = parseAIExtractionResponse(response.content);

  onProgress?.(100);

  return result;
}

/**
 * Parse and validate the LLM response
 */
function parseAIExtractionResponse(content: string): AIEntityExtractionResult {
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
    return normalizeExtractionResult(parsed);
  } catch (error) {
    console.error('Failed to parse AI extraction response:', error);
    return {
      entities: [],
      relationships: [],
      suggestions: [{
        type: 'add-entity',
        target: 'general',
        suggestion: 'AI extraction failed to parse response. Please try again or add entities manually.',
        reason: 'Parse error',
        confidence: 0,
      }],
      rawResponse: content,
    };
  }
}

/**
 * Normalize the parsed result to ensure proper typing
 */
function normalizeExtractionResult(
  parsed: Record<string, unknown>
): AIEntityExtractionResult {
  const rawEntities = (parsed.entities as AIEntityRaw[]) || [];
  const rawRelationships = (parsed.relationships as AIRelationshipRaw[]) || [];
  const rawSuggestions = (parsed.suggestions as AISuggestionRaw[]) || [];

  const entities = rawEntities.map(normalizeEntity);
  const relationships = rawRelationships.map(normalizeRelationship);
  const suggestions = rawSuggestions.map(normalizeSuggestion);

  return {
    entities,
    relationships,
    suggestions,
  };
}

/**
 * Normalize a raw entity from AI response
 */
function normalizeEntity(raw: AIEntityRaw): Entity {
  const name = toPascalCase(raw.name || 'UnnamedEntity');
  const fields = (raw.fields || []).map(normalizeField);

  // Ensure there's an ID field
  const hasIdField = fields.some((f) => f.constraints.primaryKey);
  if (!hasIdField) {
    fields.unshift({
      id: generateId(),
      name: 'id',
      columnName: 'id',
      displayName: 'ID',
      dataType: 'uuid',
      constraints: {
        primaryKey: true,
        unique: true,
        nullable: false,
        indexed: true,
      },
      source: { type: 'ai-extracted' },
      confidence: 1,
    });
  }

  // Add audit fields if auditable
  if (raw.isAuditable !== false) {
    const auditFields = getAuditFields();
    auditFields.forEach((af) => {
      if (!fields.some((f) => f.name === af.name)) {
        fields.push({ ...af, id: generateId() });
      }
    });
  }

  // Add soft delete fields if enabled
  if (raw.isSoftDelete !== false) {
    const softDeleteFields = getSoftDeleteFields();
    softDeleteFields.forEach((sf) => {
      if (!fields.some((f) => f.name === sf.name)) {
        fields.push({ ...sf, id: generateId() });
      }
    });
  }

  return {
    id: generateId(),
    name,
    displayName: raw.displayName || toDisplayName(name),
    tableName: raw.tableName || toSnakeCase(name),
    description: raw.description || '',
    type: normalizeEntityType(raw.type),
    fields,
    isAuditable: raw.isAuditable !== false,
    isSoftDelete: raw.isSoftDelete !== false,
    source: { type: 'ai-extracted' },
    confidence: 0.85,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Normalize a raw field from AI response
 */
function normalizeField(raw: AIFieldRaw): Field {
  const name = toCamelCase(raw.name || 'unnamedField');

  return {
    id: generateId(),
    name,
    columnName: raw.columnName || toSnakeCase(name),
    displayName: raw.displayName || toDisplayName(name),
    description: raw.description,
    dataType: normalizeDataType(raw.dataType),
    constraints: {
      primaryKey: raw.constraints?.primaryKey ?? false,
      unique: raw.constraints?.unique ?? false,
      nullable: raw.constraints?.nullable ?? true,
      indexed: raw.constraints?.indexed ?? false,
      minLength: raw.constraints?.minLength,
      maxLength: raw.constraints?.maxLength,
      min: raw.constraints?.min,
      max: raw.constraints?.max,
    },
    enumValues: raw.enumValues,
    defaultValue: raw.defaultValue,
    source: { type: 'ai-extracted' },
    confidence: 0.85,
  };
}

/**
 * Normalize a raw relationship from AI response
 */
function normalizeRelationship(raw: AIRelationshipRaw): Relationship {
  return {
    id: generateId(),
    name: raw.name || 'unnamed_relationship',
    type: normalizeRelationshipType(raw.type),
    from: {
      entity: raw.from?.entity || '',
      field: raw.from?.field || 'id',
      cardinality: normalizeCardinality(raw.from?.cardinality),
    },
    to: {
      entity: raw.to?.entity || '',
      field: raw.to?.field || 'id',
      cardinality: normalizeCardinality(raw.to?.cardinality),
    },
    description: raw.description,
    source: { type: 'ai-extracted' },
  };
}

/**
 * Normalize a raw suggestion from AI response
 */
function normalizeSuggestion(raw: AISuggestionRaw): EntitySuggestion {
  const validTypes = ['add-entity', 'add-field', 'add-relationship', 'modify-type', 'add-index'];
  const type = validTypes.includes(raw.type || '')
    ? (raw.type as EntitySuggestion['type'])
    : 'add-entity';

  return {
    type,
    target: raw.target || '',
    suggestion: raw.suggestion || '',
    reason: raw.reason || '',
    confidence: Math.max(0, Math.min(1, raw.confidence || 0.5)),
  };
}

/**
 * Normalize entity type string to valid EntityType
 */
function normalizeEntityType(type?: string): EntityType {
  const validTypes: EntityType[] = ['master', 'transaction', 'reference', 'lookup', 'junction'];
  if (type && validTypes.includes(type as EntityType)) {
    return type as EntityType;
  }
  return 'master';
}

/**
 * Normalize data type string to valid DataType
 */
function normalizeDataType(type?: string): DataType {
  const typeMap: Record<string, DataType> = {
    string: 'string',
    varchar: 'string',
    char: 'string',
    text: 'text',
    longtext: 'text',
    int: 'integer',
    integer: 'integer',
    smallint: 'integer',
    bigint: 'bigint',
    long: 'bigint',
    decimal: 'decimal',
    numeric: 'decimal',
    float: 'decimal',
    double: 'decimal',
    money: 'decimal',
    bool: 'boolean',
    boolean: 'boolean',
    date: 'date',
    datetime: 'datetime',
    timestamp: 'timestamp',
    uuid: 'uuid',
    guid: 'uuid',
    json: 'json',
    jsonb: 'json',
    enum: 'enum',
    binary: 'binary',
    blob: 'binary',
  };

  const normalized = type?.toLowerCase() || 'string';
  return typeMap[normalized] || 'string';
}

/**
 * Normalize relationship type string to valid RelationshipType
 */
function normalizeRelationshipType(type?: string): RelationshipType {
  const validTypes: RelationshipType[] = ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'];
  if (type && validTypes.includes(type as RelationshipType)) {
    return type as RelationshipType;
  }
  return 'many-to-one';
}

/**
 * Normalize cardinality string
 */
function normalizeCardinality(cardinality?: string): '1' | '0..1' | '*' | '1..*' | '0..*' {
  const validCardinalities = ['1', '0..1', '*', '1..*', '0..*'];
  if (cardinality && validCardinalities.includes(cardinality)) {
    return cardinality as '1' | '0..1' | '*' | '1..*' | '0..*';
  }
  return '1';
}

/**
 * Get standard audit fields
 */
function getAuditFields(): Omit<Field, 'id'>[] {
  return [
    {
      name: 'createdAt',
      columnName: 'created_at',
      displayName: 'Created At',
      dataType: 'timestamp',
      constraints: { primaryKey: false, unique: false, nullable: false, indexed: true },
      source: { type: 'ai-extracted' },
      confidence: 1,
    },
    {
      name: 'createdBy',
      columnName: 'created_by',
      displayName: 'Created By',
      dataType: 'uuid',
      constraints: { primaryKey: false, unique: false, nullable: true, indexed: false },
      source: { type: 'ai-extracted' },
      confidence: 1,
    },
    {
      name: 'updatedAt',
      columnName: 'updated_at',
      displayName: 'Updated At',
      dataType: 'timestamp',
      constraints: { primaryKey: false, unique: false, nullable: false, indexed: false },
      source: { type: 'ai-extracted' },
      confidence: 1,
    },
    {
      name: 'updatedBy',
      columnName: 'updated_by',
      displayName: 'Updated By',
      dataType: 'uuid',
      constraints: { primaryKey: false, unique: false, nullable: true, indexed: false },
      source: { type: 'ai-extracted' },
      confidence: 1,
    },
  ];
}

/**
 * Get soft delete fields
 */
function getSoftDeleteFields(): Omit<Field, 'id'>[] {
  return [
    {
      name: 'deletedAt',
      columnName: 'deleted_at',
      displayName: 'Deleted At',
      dataType: 'timestamp',
      constraints: { primaryKey: false, unique: false, nullable: true, indexed: true },
      source: { type: 'ai-extracted' },
      confidence: 1,
    },
    {
      name: 'deletedBy',
      columnName: 'deleted_by',
      displayName: 'Deleted By',
      dataType: 'uuid',
      constraints: { primaryKey: false, unique: false, nullable: true, indexed: false },
      source: { type: 'ai-extracted' },
      confidence: 1,
    },
  ];
}

// Utility functions
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

function toCamelCase(str: string): string {
  return str
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^([A-Z])/, (_, letter) => letter.toLowerCase());
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function toDisplayName(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
