import type { Entity, Field, Relationship, EntityType, DataType } from '@/types/entity';
import type { StructuredPRD } from '@/types/prd';
import { generateId } from '@/lib/utils';

// Re-export AI extractor
export { extractEntitiesWithAI } from './ai-extractor';
export type { AIEntityExtractionResult } from './ai-extractor';

export interface EntityExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
  suggestions: string[];
}

// Standard audit fields
const AUDIT_FIELDS: Omit<Field, 'id'>[] = [
  {
    name: 'createdAt',
    columnName: 'created_at',
    displayName: 'Created At',
    dataType: 'timestamp',
    constraints: { primaryKey: false, unique: false, nullable: false, indexed: true },
    source: { type: 'standard' },
    confidence: 1,
  },
  {
    name: 'createdBy',
    columnName: 'created_by',
    displayName: 'Created By',
    dataType: 'uuid',
    constraints: { primaryKey: false, unique: false, nullable: true, indexed: false },
    source: { type: 'standard' },
    confidence: 1,
  },
  {
    name: 'updatedAt',
    columnName: 'updated_at',
    displayName: 'Updated At',
    dataType: 'timestamp',
    constraints: { primaryKey: false, unique: false, nullable: false, indexed: false },
    source: { type: 'standard' },
    confidence: 1,
  },
  {
    name: 'updatedBy',
    columnName: 'updated_by',
    displayName: 'Updated By',
    dataType: 'uuid',
    constraints: { primaryKey: false, unique: false, nullable: true, indexed: false },
    source: { type: 'standard' },
    confidence: 1,
  },
];

const SOFT_DELETE_FIELDS: Omit<Field, 'id'>[] = [
  {
    name: 'deletedAt',
    columnName: 'deleted_at',
    displayName: 'Deleted At',
    dataType: 'timestamp',
    constraints: { primaryKey: false, unique: false, nullable: true, indexed: true },
    source: { type: 'standard' },
    confidence: 1,
  },
  {
    name: 'deletedBy',
    columnName: 'deleted_by',
    displayName: 'Deleted By',
    dataType: 'uuid',
    constraints: { primaryKey: false, unique: false, nullable: true, indexed: false },
    source: { type: 'standard' },
    confidence: 1,
  },
];

export function extractEntitiesFromPRD(prd: StructuredPRD): EntityExtractionResult {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  const suggestions: string[] = [];

  // Extract entities from data requirements
  prd.dataRequirements.entities.forEach((entityDef) => {
    const entity = createEntityFromDefinition(entityDef);
    entities.push(entity);
  });

  // Extract entities from screen field mappings
  const screenEntities = extractEntitiesFromScreens(prd);
  screenEntities.forEach((screenEntity) => {
    const existing = entities.find(
      (e) => e.name.toLowerCase() === screenEntity.name.toLowerCase()
    );
    if (existing) {
      // Merge fields
      screenEntity.fields.forEach((field) => {
        const existingField = existing.fields.find(
          (f) => f.name.toLowerCase() === field.name.toLowerCase()
        );
        if (!existingField) {
          existing.fields.push(field);
        }
      });
    } else {
      entities.push(screenEntity);
    }
  });

  // Infer relationships from foreign key patterns
  entities.forEach((entity) => {
    entity.fields.forEach((field) => {
      if (field.name.endsWith('Id') && field.name !== 'id') {
        const referencedEntityName = field.name.slice(0, -2);
        const referencedEntity = entities.find(
          (e) => e.name.toLowerCase() === referencedEntityName.toLowerCase()
        );

        if (referencedEntity) {
          relationships.push({
            id: generateId(),
            name: `${entity.name}_${referencedEntity.name}`,
            type: 'many-to-one',
            from: {
              entity: entity.name,
              field: field.name,
              cardinality: '*',
            },
            to: {
              entity: referencedEntity.name,
              field: 'id',
              cardinality: '1',
            },
            source: { type: 'prd-inferred' },
          });
        }
      }
    });
  });

  // Add suggestions
  if (entities.length === 0) {
    suggestions.push('No entities were found. Consider defining entities in the PRD data requirements section.');
  }

  entities.forEach((entity) => {
    if (entity.fields.length < 3) {
      suggestions.push(`Entity "${entity.name}" has very few fields. Consider adding more fields.`);
    }
  });

  return { entities, relationships, suggestions };
}

function createEntityFromDefinition(
  definition: { name: string; description: string; fields: string[] }
): Entity {
  const tableName = toSnakeCase(definition.name);

  // Create ID field
  const idField: Field = {
    id: generateId(),
    name: 'id',
    columnName: 'id',
    displayName: 'ID',
    dataType: 'uuid',
    constraints: { primaryKey: true, unique: true, nullable: false, indexed: true },
    source: { type: 'standard' },
    confidence: 1,
  };

  // Parse field strings into Field objects
  const parsedFields: Field[] = definition.fields.map((fieldStr) => {
    const [name, type] = fieldStr.split(':').map((s) => s.trim());
    return {
      id: generateId(),
      name: toCamelCase(name),
      columnName: toSnakeCase(name),
      displayName: toDisplayName(name),
      dataType: mapToDataType(type || 'string'),
      constraints: {
        primaryKey: false,
        unique: false,
        nullable: true,
        indexed: false,
      },
      source: { type: 'prd-explicit' },
      confidence: 0.9,
    };
  });

  // Add audit fields
  const auditFields = AUDIT_FIELDS.map((f) => ({ ...f, id: generateId() }));
  const softDeleteFields = SOFT_DELETE_FIELDS.map((f) => ({ ...f, id: generateId() }));

  return {
    id: generateId(),
    name: toPascalCase(definition.name),
    displayName: toDisplayName(definition.name),
    tableName,
    description: definition.description,
    type: inferEntityType(definition.name),
    fields: [idField, ...parsedFields, ...auditFields, ...softDeleteFields],
    isAuditable: true,
    isSoftDelete: true,
    source: { type: 'prd-explicit' },
    confidence: 0.95,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function extractEntitiesFromScreens(prd: StructuredPRD): Entity[] {
  const entityMap = new Map<string, Field[]>();

  prd.functionalRequirements.forEach((fr) => {
    fr.screens.forEach((screen) => {
      screen.fieldMappings.forEach((mapping) => {
        const [entityName, fieldName] = mapping.entityField.split('.');
        if (entityName && fieldName) {
          const fields = entityMap.get(entityName) || [];
          const existingField = fields.find((f) => f.name === fieldName);
          if (!existingField) {
            fields.push({
              id: generateId(),
              name: toCamelCase(fieldName),
              columnName: toSnakeCase(fieldName),
              displayName: mapping.label,
              dataType: mapInputTypeToDataType(mapping.inputType),
              constraints: {
                primaryKey: false,
                unique: false,
                nullable: !mapping.isRequired,
                indexed: false,
              },
              source: { type: 'screen-field', reference: screen.id },
              confidence: 0.8,
            });
          }
          entityMap.set(entityName, fields);
        }
      });
    });
  });

  return Array.from(entityMap.entries()).map(([name, fields]) => ({
    id: generateId(),
    name: toPascalCase(name),
    displayName: toDisplayName(name),
    tableName: toSnakeCase(name),
    description: `Extracted from screen mappings`,
    type: 'master' as EntityType,
    fields: [
      {
        id: generateId(),
        name: 'id',
        columnName: 'id',
        displayName: 'ID',
        dataType: 'uuid' as DataType,
        constraints: { primaryKey: true, unique: true, nullable: false, indexed: true },
        source: { type: 'standard' },
        confidence: 1,
      },
      ...fields,
      ...AUDIT_FIELDS.map((f) => ({ ...f, id: generateId() })),
    ],
    isAuditable: true,
    isSoftDelete: true,
    source: { type: 'screen-mapping' as const },
    confidence: 0.7,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function inferEntityType(name: string): EntityType {
  const lowerName = name.toLowerCase();

  if (['order', 'transaction', 'payment', 'log', 'audit', 'event'].some((t) => lowerName.includes(t))) {
    return 'transaction';
  }
  if (['status', 'type', 'category', 'country', 'currency'].some((t) => lowerName.includes(t))) {
    return 'reference';
  }
  if (['setting', 'config', 'option'].some((t) => lowerName.includes(t))) {
    return 'lookup';
  }

  return 'master';
}

function mapToDataType(typeStr: string): DataType {
  const type = typeStr.toLowerCase();

  if (['string', 'varchar', 'char'].includes(type)) return 'string';
  if (['text', 'longtext'].includes(type)) return 'text';
  if (['int', 'integer', 'smallint'].includes(type)) return 'integer';
  if (['bigint', 'long'].includes(type)) return 'bigint';
  if (['decimal', 'numeric', 'float', 'double', 'money'].includes(type)) return 'decimal';
  if (['bool', 'boolean'].includes(type)) return 'boolean';
  if (['date'].includes(type)) return 'date';
  if (['datetime', 'timestamp'].includes(type)) return 'timestamp';
  if (['uuid', 'guid'].includes(type)) return 'uuid';
  if (['json', 'jsonb'].includes(type)) return 'json';

  return 'string';
}

function mapInputTypeToDataType(inputType: string): DataType {
  switch (inputType) {
    case 'number':
      return 'decimal';
    case 'date':
      return 'date';
    case 'checkbox':
      return 'boolean';
    case 'textarea':
      return 'text';
    case 'currency':
    case 'percentage':
      return 'decimal';
    default:
      return 'string';
  }
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
