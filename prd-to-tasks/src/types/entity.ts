// Entity Model Types

export interface Entity {
  id: string;
  name: string;
  displayName: string;
  tableName: string;
  description: string;
  type: EntityType;
  fields: Field[];
  indexes?: Index[];
  constraints?: Constraint[];
  isAuditable: boolean;
  isSoftDelete: boolean;
  source: EntitySource;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EntityType =
  | 'master'       // Long-lived reference data (users, products, categories)
  | 'transaction'  // Event-based data (orders, payments, logs)
  | 'reference'    // Lookup tables (countries, currencies, statuses)
  | 'lookup'       // Simple key-value lookups (enums, settings)
  | 'junction'     // Many-to-many relationship tables

export interface Field {
  id: string;
  name: string;
  columnName: string;
  displayName: string;
  description?: string;
  dataType: DataType;
  constraints: FieldConstraints;
  defaultValue?: string;
  enumValues?: string[];
  source: FieldSource;
  confidence: number;
}

export type DataType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'uuid'
  | 'json'
  | 'enum'
  | 'binary'

export interface FieldConstraints {
  primaryKey: boolean;
  foreignKey?: ForeignKeyConstraint;
  unique: boolean;
  nullable: boolean;
  indexed: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  check?: string;
}

export interface ForeignKeyConstraint {
  referenceTable: string;
  referenceColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface Constraint {
  name: string;
  type: 'check' | 'unique' | 'exclusion';
  definition: string;
}

export interface EntitySource {
  type: 'prd-explicit' | 'prd-inferred' | 'screen-mapping' | 'business-rule' | 'manual' | 'ai-extracted';
  reference?: string;
}

export interface FieldSource {
  type: 'prd-explicit' | 'screen-field' | 'business-rule' | 'standard' | 'inferred' | 'manual' | 'ai-extracted';
  reference?: string;
}

// Relationship types
export interface Relationship {
  id: string;
  name: string;
  type: RelationshipType;
  from: RelationshipEnd;
  to: RelationshipEnd;
  description?: string;
  junctionTable?: string;
  source: EntitySource;
}

export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many'

export interface RelationshipEnd {
  entity: string;
  field: string;
  cardinality: '1' | '0..1' | '*' | '1..*' | '0..*';
}

// Standard/audit fields
export interface AuditFields {
  createdAt: boolean;
  createdBy: boolean;
  updatedAt: boolean;
  updatedBy: boolean;
  deletedAt: boolean;
  deletedBy: boolean;
  version: boolean;
}

// Entity extraction result
export interface EntityExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
  suggestions: EntitySuggestion[];
  warnings: string[];
}

export interface EntitySuggestion {
  type: 'add-entity' | 'add-field' | 'add-relationship' | 'modify-type' | 'add-index';
  target: string;
  suggestion: string;
  reason: string;
  confidence: number;
}
