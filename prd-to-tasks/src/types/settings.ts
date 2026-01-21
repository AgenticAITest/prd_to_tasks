// Settings and Configuration Types

import type { LLMProvider } from './llm';

export interface AppSettings {
  apiKeys: APIKeySettings;
  modelSelection: ModelSelectionSettings;
  standards: StandardsConfig;
  appearance: AppearanceSettings;
  export: ExportSettings;
  advanced: AdvancedSettings;
}

export interface APIKeySettings {
  anthropic?: string;
  google?: string;
  deepseek?: string;
  openai?: string;
  openrouter?: string;
}

export interface ModelSelectionSettings {
  T1: TierModelConfig;
  T2: TierModelConfig;
  T3: TierModelConfig;
  T4: TierModelConfig;
  prdAnalysis: TierModelConfig;
  entityExtraction: TierModelConfig;
}

export interface TierModelConfig {
  provider: LLMProvider;
  model: string;
  enabled: boolean;
}

export interface StandardsConfig {
  database: DatabaseStandards;
  api: APIStandards;
  ui: UIStandards;
  validation: ValidationStandards;
  compliance: ComplianceStandards;
}

export interface DatabaseStandards {
  namingConvention: {
    tables: 'snake_case' | 'PascalCase' | 'camelCase';
    columns: 'snake_case' | 'PascalCase' | 'camelCase';
    foreignKeys: string;
    indexes: string;
  };
  auditFields: {
    enabled: boolean;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
  };
  softDelete: {
    enabled: boolean;
    deletedAt: string;
    deletedBy: string;
  };
  versionField: {
    enabled: boolean;
    fieldName: string;
  };
  idGeneration: 'uuid' | 'serial' | 'bigserial' | 'ulid';
  defaultStringLength: number;
  defaultDecimalPrecision: { precision: number; scale: number };
}

export interface APIStandards {
  basePathPattern: string;
  versioningStrategy: 'url' | 'header' | 'query';
  resourceNaming: 'plural' | 'singular';
  errorResponseFormat: {
    codeField: string;
    messageField: string;
    detailsField: string;
  };
  paginationFormat: {
    pageSizeParam: string;
    pageNumberParam: string;
    defaultPageSize: number;
    maxPageSize: number;
  };
  authHeaderName: string;
  responseEnvelope: boolean;
}

export interface UIStandards {
  componentLibrary: string;
  formLayout: 'vertical' | 'horizontal' | 'inline';
  dateFormat: string;
  dateTimeFormat: string;
  currencyFormat: {
    symbol: string;
    position: 'before' | 'after';
    decimals: number;
    thousandsSeparator: string;
    decimalSeparator: string;
  };
  tableDefaults: {
    defaultPageSize: number;
    showRowNumbers: boolean;
    enableSorting: boolean;
    enableFiltering: boolean;
  };
}

export interface ValidationStandards {
  defaultMessages: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    min: string;
    max: string;
    pattern: string;
    unique: string;
  };
  phoneFormat: string;
  emailFormat: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
  };
}

export interface ComplianceStandards {
  region: string;
  taxRate?: number;
  taxName?: string;
  currency: string;
  dateLocale: string;
  privacyFields: string[];
  retentionPeriods: Record<string, number>;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  monacoTheme: string;
  sidebarCollapsed: {
    left: boolean;
    right: boolean;
  };
  panelSizes: {
    left: number;
    middle: number;
    right: number;
  };
}

export interface ExportSettings {
  defaultFormat: 'json' | 'yaml' | 'markdown';
  includeMetadata: boolean;
  includeTestCases: boolean;
  groupTasksBy: 'type' | 'module' | 'priority' | 'tier' | 'none';
  markdownTemplate: 'default' | 'github' | 'jira';
}

export interface AdvancedSettings {
  autoSave: boolean;
  autoSaveInterval: number;  // seconds
  maxRecentProjects: number;
  enableTelemetry: boolean;
  debugMode: boolean;
  llmRetryAttempts: number;
  llmTimeout: number;        // seconds
}

// Validation for settings
export interface SettingsValidation {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
}

// API Key validation result
export interface APIKeyValidation {
  provider: LLMProvider;
  isValid: boolean;
  error?: string;
  models?: string[];
}

// Default settings
export const defaultSettings: AppSettings = {
  apiKeys: {},
  modelSelection: {
    T1: { provider: 'openrouter', model: 'deepseek/deepseek-chat', enabled: true },
    T2: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', enabled: true },
    T3: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', enabled: true },
    T4: { provider: 'openrouter', model: 'anthropic/claude-3-opus', enabled: true },
    prdAnalysis: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', enabled: true },
    entityExtraction: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', enabled: true },
  },
  standards: {
    database: {
      namingConvention: {
        tables: 'snake_case',
        columns: 'snake_case',
        foreignKeys: 'fk_{table}_{column}',
        indexes: 'idx_{table}_{columns}',
      },
      auditFields: {
        enabled: true,
        createdAt: 'created_at',
        createdBy: 'created_by',
        updatedAt: 'updated_at',
        updatedBy: 'updated_by',
      },
      softDelete: {
        enabled: true,
        deletedAt: 'deleted_at',
        deletedBy: 'deleted_by',
      },
      versionField: {
        enabled: false,
        fieldName: 'version',
      },
      idGeneration: 'uuid',
      defaultStringLength: 255,
      defaultDecimalPrecision: { precision: 18, scale: 2 },
    },
    api: {
      basePathPattern: '/api/v1',
      versioningStrategy: 'url',
      resourceNaming: 'plural',
      errorResponseFormat: {
        codeField: 'code',
        messageField: 'message',
        detailsField: 'details',
      },
      paginationFormat: {
        pageSizeParam: 'limit',
        pageNumberParam: 'page',
        defaultPageSize: 20,
        maxPageSize: 100,
      },
      authHeaderName: 'Authorization',
      responseEnvelope: true,
    },
    ui: {
      componentLibrary: 'shadcn/ui',
      formLayout: 'vertical',
      dateFormat: 'yyyy-MM-dd',
      dateTimeFormat: 'yyyy-MM-dd HH:mm:ss',
      currencyFormat: {
        symbol: 'Rp',
        position: 'before',
        decimals: 0,
        thousandsSeparator: '.',
        decimalSeparator: ',',
      },
      tableDefaults: {
        defaultPageSize: 20,
        showRowNumbers: true,
        enableSorting: true,
        enableFiltering: true,
      },
    },
    validation: {
      defaultMessages: {
        required: '{field} is required',
        email: 'Please enter a valid email address',
        minLength: '{field} must be at least {min} characters',
        maxLength: '{field} must be at most {max} characters',
        min: '{field} must be at least {min}',
        max: '{field} must be at most {max}',
        pattern: '{field} format is invalid',
        unique: '{field} already exists',
      },
      phoneFormat: '^\\+?[1-9]\\d{1,14}$',
      emailFormat: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: false,
      },
    },
    compliance: {
      region: 'ID',
      taxRate: 11,
      taxName: 'PPN',
      currency: 'IDR',
      dateLocale: 'id-ID',
      privacyFields: ['nik', 'npwp', 'phone', 'email', 'address'],
      retentionPeriods: {
        transactions: 10,
        logs: 1,
        sessions: 0.25,
      },
    },
  },
  appearance: {
    theme: 'system',
    fontSize: 'medium',
    monacoTheme: 'vs-dark',
    sidebarCollapsed: {
      left: false,
      right: false,
    },
    panelSizes: {
      left: 250,
      middle: 0,
      right: 400,
    },
  },
  export: {
    defaultFormat: 'markdown',
    includeMetadata: true,
    includeTestCases: true,
    groupTasksBy: 'module',
    markdownTemplate: 'default',
  },
  advanced: {
    autoSave: true,
    autoSaveInterval: 30,
    maxRecentProjects: 10,
    enableTelemetry: false,
    debugMode: false,
    llmRetryAttempts: 3,
    llmTimeout: 120,
  },
};
