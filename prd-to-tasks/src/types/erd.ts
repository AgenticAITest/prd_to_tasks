// ERD (Entity Relationship Diagram) Types

import type { Entity, Relationship } from './entity';

export interface ERDSchema {
  id: string;
  projectId?: string;
  name?: string;
  version?: string;
  description?: string;
  entities: Entity[];
  relationships: Relationship[];
  dbml: string;
  // Optional generated SQL migration accompanying the dbml
  sqlMigration?: string;
  metadata?: ERDMetadata;
  generationOptions?: DBMLGenerationOptions;
  validation?: ERDValidationResult;
  validationResult?: ERDValidationResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface ERDMetadata {
  databaseType: 'postgresql' | 'mysql' | 'sqlite' | 'mssql';
  schemaName?: string;
  tablePrefix?: string;
  namingConvention: NamingConvention;
  standardsApplied: string[];
}

export interface NamingConvention {
  tables: 'snake_case' | 'PascalCase' | 'camelCase';
  columns: 'snake_case' | 'PascalCase' | 'camelCase';
  foreignKeys: string; // pattern like "fk_{table}_{column}"
  indexes: string;     // pattern like "idx_{table}_{columns}"
  constraints: string; // pattern like "chk_{table}_{name}"
}

export interface ERDValidationResult {
  isValid: boolean;
  errors: ERDValidationError[];
  warnings: ERDValidationWarning[];
}

export interface ERDValidationError {
  type: 'missing-pk' | 'invalid-fk' | 'circular-ref' | 'naming-violation' | 'missing-required';
  entity?: string;
  field?: string;
  message: string;
}

export interface ERDValidationWarning {
  type: 'missing-index' | 'missing-audit' | 'denormalization' | 'naming-suggestion';
  entity?: string;
  field?: string;
  message: string;
  suggestion?: string;
}

// DBML Generation
export interface DBMLGenerationOptions {
  includeComments?: boolean;
  includeIndexes?: boolean;
  includeEnums?: boolean;
  includeNotes?: boolean;
  groupByModule?: boolean;
  includeAuditFields?: boolean;
  includeSoftDelete?: boolean;
  namingConvention?: 'snake_case' | 'camelCase' | 'PascalCase';
  schemaName?: string;
}

// Validation issue for erd-generator
export interface ERDValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  entityId?: string;
  fieldId?: string;
  relationshipId?: string;
  message: string;
  suggestion?: string;
}

export interface DBMLTable {
  name: string;
  alias?: string;
  note?: string;
  columns: DBMLColumn[];
  indexes?: DBMLIndex[];
}

export interface DBMLColumn {
  name: string;
  type: string;
  settings: DBMLColumnSettings;
  note?: string;
}

export interface DBMLColumnSettings {
  pk?: boolean;
  unique?: boolean;
  notNull?: boolean;
  increment?: boolean;
  default?: string;
  ref?: string;
}

export interface DBMLIndex {
  columns: string[];
  unique?: boolean;
  name?: string;
  note?: string;
}

export interface DBMLRef {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: '>' | '<' | '-' | '<>';
  name?: string;
}

export interface DBMLEnum {
  name: string;
  values: { name: string; note?: string }[];
  note?: string;
}

// Standards enforcement
export interface StandardsEnforcementResult {
  appliedStandards: AppliedStandard[];
  modifications: StandardModification[];
}

export interface AppliedStandard {
  standard: string;
  rule: string;
  applied: boolean;
  entity?: string;
  field?: string;
}

export interface StandardModification {
  type: 'rename' | 'add-field' | 'add-index' | 'modify-type' | 'add-constraint';
  entity: string;
  field?: string;
  before?: string;
  after: string;
  reason: string;
}
