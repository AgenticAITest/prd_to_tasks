# Technical Architecture Guide

## PRD-to-Tasks Converter

**Version:** 1.0.0  
**Last Updated:** January 23, 2026  
**Document Type:** Technical Architecture Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Technology Stack](#technology-stack)
5. [Application Architecture](#application-architecture)
6. [Core Modules](#core-modules)
7. [Data Flow & Processing Pipeline](#data-flow--processing-pipeline)
8. [State Management](#state-management)
9. [Database Architecture](#database-architecture)
10. [LLM Integration Architecture](#llm-integration-architecture)
11. [UI Component Architecture](#ui-component-architecture)
12. [Standards & Configuration System](#standards--configuration-system)
13. [Export & Integration](#export--integration)
14. [Security Considerations](#security-considerations)
15. [Performance Optimization](#performance-optimization)
16. [Development Guidelines](#development-guidelines)
17. [Deployment Architecture](#deployment-architecture)
18. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The **PRD-to-Tasks Converter** is a sophisticated web application that transforms Product Requirements Documents (PRDs) into actionable, programmable development tasks. It leverages AI/LLM technology to analyze requirements, extract data models, generate database schemas, and produce comprehensive task specifications.

### Key Capabilities

- **Intelligent PRD Analysis**: Semantic analysis with quality scoring and gap detection
- **Entity Extraction**: AI-powered extraction of data models from requirements
- **ERD Generation**: Automatic DBML schema generation with validation
- **Task Generation**: Production of fully-specified, dependency-aware development tasks
- **Multi-LLM Support**: Integration with Anthropic, Google, OpenAI, DeepSeek, and OpenRouter
- **Standards Compliance**: Configurable standards for database, API, UI, and validation

---

## System Overview

### Architecture Type
**Single Page Application (SPA)** with client-side processing and local-first data persistence.

### Design Pattern
**Modular Monolith** with clear separation of concerns:
- **Presentation Layer**: React components with shadcn/ui
- **Business Logic Layer**: Core processing modules
- **Data Layer**: IndexedDB via Dexie.js
- **Integration Layer**: LLM provider adapters

### Key Characteristics

1. **Client-Side Processing**: All computation happens in the browser
2. **Local-First**: Data persisted locally using IndexedDB
3. **AI-Augmented**: LLM integration for intelligent analysis
4. **Phase-Based Workflow**: 4-phase processing pipeline
5. **Standards-Driven**: Configurable coding standards and conventions

---

## Architecture Principles

### 1. Separation of Concerns
- Clear boundaries between UI, business logic, and data layers
- Each module has a single, well-defined responsibility
- Minimal coupling between components

### 2. Composability
- Small, reusable components and functions
- Composition over inheritance
- Functional programming patterns where appropriate

### 3. Type Safety
- Full TypeScript coverage
- Comprehensive type definitions for all data structures
- Strict type checking enabled

### 4. Extensibility
- Plugin-like architecture for LLM providers
- Configurable standards and conventions
- Easy to add new task types and analysis rules

### 5. User Experience First
- Responsive, intuitive UI
- Real-time feedback and progress indicators
- Graceful error handling and recovery

### 6. Performance
- Lazy loading of components
- Efficient state management with Zustand
- Optimized re-renders with React best practices

---

## Technology Stack

### Frontend Framework
- **React 19.2.0**: UI library with latest features
- **TypeScript 5.9.3**: Type-safe development
- **Vite 7.2.4**: Fast build tool and dev server

### UI Components & Styling
- **Radix UI**: Accessible, unstyled component primitives
- **shadcn/ui**: Pre-built, customizable components
- **Tailwind CSS 3.4.19**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Monaco Editor**: Code editor for prompts and DBML

### State Management
- **Zustand 5.0.10**: Lightweight state management
- **Zustand Persist Middleware**: State persistence

### Database
- **Dexie.js 4.2.1**: IndexedDB wrapper
- **dexie-react-hooks**: React integration

### Additional Libraries
- **react-markdown**: Markdown rendering
- **react-resizable-panels**: Resizable layout panels
- **sonner**: Toast notifications
- **class-variance-authority**: Component variants
- **tailwind-merge**: Tailwind class merging

### Development Tools
- **ESLint**: Code linting
- **TypeScript ESLint**: TypeScript-specific linting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

---

## Application Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Left Panel   │  │ Middle Panel │  │ Right Panel  │         │
│  │ - File List  │  │ - Phase UI   │  │ - Analysis   │         │
│  │ - Uploader   │  │ - Stepper    │  │ - Results    │         │
│  │ - Actions    │  │ - Content    │  │ - Preview    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      State Management (Zustand)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Project  │ │   PRD    │ │ Entity   │ │  Task    │          │
│  │  Store   │ │  Store   │ │  Store   │ │  Store   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Settings │ │  Prompt  │ │   ERD    │ │    UI    │          │
│  │  Store   │ │  Store   │ │  Store   │ │  Store   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Core Processing Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PRD Parser   │  │  Analyzer    │  │   Entity     │         │
│  │ - Markdown   │  │ - Semantic   │  │  Extractor   │         │
│  │ - Structure  │  │ - Quality    │  │ - AI-based   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ ERD Generator│  │    Task      │                            │
│  │ - DBML       │  │  Generator   │                            │
│  │ - Validation │  │ - Specs      │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Integration Layer                       │
│                      ┌──────────────┐                           │
│                      │  LLM Router  │                           │
│                      └──────┬───────┘                           │
│         ┌────────────┬──────┴──────┬────────────┬──────────┐   │
│         ▼            ▼             ▼            ▼          ▼   │
│    ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐│
│    │Anthropic│ │ Google  │ │ DeepSeek │ │ OpenAI  │ │OpenRtr ││
│    │Provider │ │Provider │ │ Provider │ │Provider │ │Provider││
│    └─────────┘ └─────────┘ └──────────┘ └─────────┘ └────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Persistence Layer                        │
│                      ┌──────────────┐                           │
│                      │   Dexie.js   │                           │
│                      └──────┬───────┘                           │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │  IndexedDB   │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. User Interface Layer
- **Responsibility**: User interaction and presentation
- **Components**: React functional components
- **Patterns**: Composition, hooks, controlled components
- **Key Features**: Three-column layout, phase stepper, modals

#### 2. State Management Layer
- **Responsibility**: Application state and business logic coordination
- **Technology**: Zustand stores
- **Patterns**: Flux-like unidirectional data flow
- **Persistence**: Local storage via Zustand persist middleware

#### 3. Core Processing Layer
- **Responsibility**: Business logic and data transformation
- **Modules**: Parser, Analyzer, Extractor, Generator
- **Patterns**: Pure functions, dependency injection
- **Key Features**: Modular, testable, reusable

#### 4. LLM Integration Layer
- **Responsibility**: AI/LLM provider abstraction
- **Pattern**: Strategy pattern with router
- **Features**: Multi-provider support, retry logic, error handling

#### 5. Data Persistence Layer
- **Responsibility**: Local data storage and retrieval
- **Technology**: IndexedDB via Dexie.js
- **Features**: Transactions, indexing, versioning

---

## Core Modules

### 1. PRD Parser (`src/core/prd-parser/`)

**Purpose**: Parse and structure markdown PRD documents.

**Key Components**:
- `MarkdownParser.ts`: Generic markdown parsing
- `index.ts`: PRD-specific parsing logic

**Functionality**:
```typescript
interface PRDParseResult {
  structured: StructuredPRD;
  sections: ParsedSection[];
  metadata: ParseMetadata;
}

// Main function
parsePRDMarkdown(content: string): PRDParseResult
```

**Parsing Strategy**:
1. Extract document structure (headers, sections)
2. Identify functional requirements (FR-XXX)
3. Extract business rules (BR-XXX-X)
4. Parse screen definitions (SCR-XXX)
5. Extract data requirements
6. Build structured PRD object

**Output**: Fully structured `StructuredPRD` object with all requirements, rules, screens, and metadata.

---

### 2. Semantic Analyzer (`src/core/analyzer/`)

**Purpose**: Perform deep analysis of PRD quality and completeness.

**Key Components**:
- `semantic-analyzer.ts`: LLM-powered semantic analysis
- `index.ts`: Quality scoring and issue detection

**Analysis Types**:

#### a) Quality Score Analysis
```typescript
interface QualityScoreResult {
  overall: number;              // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    completeness: ScoreDetail;
    clarity: ScoreDetail;
    consistency: ScoreDetail;
    testability: ScoreDetail;
    technicalReadiness: ScoreDetail;
  };
}
```

**Scoring Factors**:
- **Completeness** (30%): Coverage of requirements, entities, screens
- **Clarity** (20%): Clear descriptions, unambiguous language
- **Consistency** (20%): Naming conventions, reference integrity
- **Testability** (15%): Acceptance criteria, test cases
- **Technical Readiness** (15%): Implementation details, constraints

#### b) Blocking Issues Detection
```typescript
interface BlockingIssue {
  severity: 'critical' | 'major';
  category: BlockingIssueCategory;
  title: string;
  description: string;
  suggestedFix: string;
  autoFixable: boolean;
}
```

**Issue Categories**:
- Missing requirements
- Undefined entities
- Missing screens
- Incomplete workflows
- Circular dependencies
- Invalid references
- Security concerns

#### c) CRUD Coverage Analysis
Analyzes whether all entities have proper CRUD operations defined.

#### d) Workflow Analysis
Validates workflow definitions, state transitions, and completeness.

#### e) Screen Coverage Analysis
Ensures all functional requirements have associated screens.

---

### 3. Entity Extractor (`src/core/entity-extractor/`)

**Purpose**: Extract data models and entities from PRD using AI.

**Key Components**:
- `ai-extractor.ts`: LLM-powered entity extraction
- `index.ts`: Entity processing and normalization

**Extraction Process**:

```
PRD Content → LLM Analysis → Raw Entities → Normalization → Validated Entities
```

**Extraction Strategy**:
1. **Explicit Extraction**: Entities defined in data requirements section
2. **Inferred Extraction**: Entities mentioned in functional requirements
3. **Screen-Based Extraction**: Entities from screen field mappings
4. **Business Rule Extraction**: Entities from validation rules

**Entity Structure**:
```typescript
interface Entity {
  id: string;
  name: string;
  tableName: string;
  type: EntityType;  // master, transaction, reference, lookup, junction
  fields: Field[];
  isAuditable: boolean;
  isSoftDelete: boolean;
  source: EntitySource;
  confidence: number;  // 0-1
}
```

**Field Extraction**:
- Data type inference
- Constraint detection (PK, FK, unique, nullable)
- Default value extraction
- Enum value identification

**Relationship Detection**:
```typescript
interface Relationship {
  name: string;
  type: RelationshipType;  // one-to-one, one-to-many, many-to-many
  from: RelationshipEnd;
  to: RelationshipEnd;
  description?: string;
}
```

**AI Suggestions**:
- Missing fields
- Recommended indexes
- Normalization opportunities
- Relationship improvements

---

### 4. ERD Generator (`src/core/erd-generator/`)

**Purpose**: Generate database schemas in DBML format with validation.

**Key Components**:
- `index.ts`: DBML generation and validation

**Generation Process**:

```
Entities + Relationships → Apply Standards → Generate DBML → Validate → Output
```

**DBML Generation Features**:

1. **Table Definitions**:
   - Column definitions with types
   - Primary keys
   - Foreign keys
   - Constraints (unique, not null, check)
   - Default values

2. **Naming Conventions**:
   - Configurable case (snake_case, camelCase, PascalCase)
   - Table pluralization
   - Foreign key patterns
   - Index naming

3. **Standard Fields**:
   - Audit fields (created_at, updated_at, created_by, updated_by)
   - Soft delete (deleted_at, deleted_by)
   - Version control (version)
   - UUID primary keys

4. **Indexes**:
   - Single column indexes
   - Composite indexes
   - Unique indexes
   - Performance optimization indexes

5. **Relationships**:
   - One-to-one
   - One-to-many
   - Many-to-many (with junction tables)
   - Cascade rules (CASCADE, SET NULL, RESTRICT)

**Validation**:
```typescript
interface ERDValidationResult {
  isValid: boolean;
  errors: ERDValidationIssue[];
  warnings: ERDValidationIssue[];
  suggestions: string[];
}
```

**Validation Checks**:
- Orphaned foreign keys
- Missing primary keys
- Circular dependencies
- Naming convention violations
- Missing indexes on foreign keys
- Data type mismatches

**Migration SQL Generation**:
- PostgreSQL DDL statements
- CREATE TABLE statements
- ALTER TABLE for relationships
- CREATE INDEX statements
- Comments and documentation

---

### 5. Task Generator (`src/core/task-generator/`)

**Purpose**: Generate fully-specified, programmable development tasks.

**Key Components**:
- `index.ts`: Task generation logic (1100+ lines)

**Task Generation Strategy**:

```
PRD + Entities + ERD → Task Templates → Expand References → Resolve Dependencies → Task Set
```

**Task Types Generated**:

1. **Database Migration Tasks** (T1)
   - One task per entity
   - Full DDL specifications
   - Migration scripts
   - Rollback procedures

2. **API CRUD Tasks** (T1-T2)
   - Create endpoint
   - Read/List endpoints
   - Update endpoint
   - Delete endpoint
   - Full request/response specs

3. **UI Tasks** (T2-T3)
   - List screens
   - Form screens
   - Detail screens
   - Modal dialogs
   - Dashboard components
   - Report screens

4. **Validation Tasks** (T2)
   - Business rule implementation
   - Input validation
   - Cross-field validation
   - Custom validators

5. **Workflow Tasks** (T3)
   - State machine implementation
   - Transition logic
   - Approval flows
   - Notification triggers

6. **Test Tasks** (T2)
   - Unit tests for entities
   - Integration tests for APIs
   - E2E tests for workflows

**Task Specification Structure**:
```typescript
interface ProgrammableTask {
  id: string;
  title: string;
  type: TaskType;
  tier: TaskTier;  // T1, T2, T3, T4
  module: string;
  priority: TaskPriority;
  dependencies: string[];
  specification: TaskSpecification;
  acceptanceCriteria: string[];
  testCases?: TestCase[];
  estimatedComplexity: ComplexityLevel;
}
```

**Specification Expansion**:
- **NO REFERENCES**: All specifications are fully expanded
- **Complete Context**: All necessary information included
- **Self-Contained**: Can be executed without external lookups
- **Standards Applied**: All coding standards embedded

**Dependency Resolution**:
```
Database Tasks → API Tasks → UI Tasks → Test Tasks
     ↓              ↓           ↓           ↓
  (Phase 1)     (Phase 2)   (Phase 3)   (Phase 4)
```

**Task Tiers**:
- **T1**: Simple, repetitive (junior dev / AI-assisted)
- **T2**: Standard complexity (mid-level dev)
- **T3**: Complex logic (senior dev)
- **T4**: Architecture/design (tech lead)

---

### 6. LLM Router (`src/core/llm/LLMRouter.ts`)

**Purpose**: Abstract and route LLM calls to appropriate providers.

**Architecture**:

```typescript
class LLMRouter {
  private config: LLMRouterConfig;
  
  call(tier: TaskTierType, systemPrompt: string, userPrompt: string): Promise<LLMResponse>
  callWithRetry(tier: TaskTierType, ...): Promise<LLMResponse>
  callProvider(provider: LLMProvider, ...): Promise<LLMResponse>
}
```

**Provider Support**:
1. **Anthropic** (Claude models)
2. **Google** (Gemini models)
3. **DeepSeek** (DeepSeek models)
4. **OpenAI** (GPT models)
5. **OpenRouter** (Multiple models via proxy)

**Tier-Based Routing**:
```typescript
interface ModelSelectionSettings {
  T1: TierModelConfig;           // Simple tasks
  T2: TierModelConfig;           // Standard tasks
  T3: TierModelConfig;           // Complex tasks
  T4: TierModelConfig;           // Architecture tasks
  prdAnalysis: TierModelConfig;  // PRD analysis
  entityExtraction: TierModelConfig;  // Entity extraction
}
```

**Features**:
- **Automatic Retry**: Exponential backoff on failures
- **Error Handling**: Graceful degradation
- **Abort Support**: Cancellable requests
- **Token Management**: Max token configuration
- **Cost Tracking**: Usage and cost estimation

**Provider Adapters** (`src/core/llm/providers/`):
Each provider has a dedicated adapter:
- `anthropic.ts`: Claude API integration
- `google.ts`: Gemini API integration
- `deepseek.ts`: DeepSeek API integration
- `openai.ts`: OpenAI API integration
- `openrouter.ts`: OpenRouter proxy integration

**Adapter Pattern**:
```typescript
async function callProvider(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  signal?: AbortSignal
): Promise<LLMResponse>
```

---

## Data Flow & Processing Pipeline

### Phase-Based Workflow

The application follows a **4-phase sequential workflow**:

```
Phase 1: PRD Analysis
    ↓
Phase 2: Entity Extraction
    ↓
Phase 3: ERD Builder
    ↓
Phase 4: Task Generation
```

### Phase 1: PRD Analysis

**Input**: Raw markdown PRD file(s)

**Process**:
1. File upload and validation
2. Markdown parsing
3. Structure extraction
4. Semantic analysis (LLM)
5. Quality scoring
6. Blocking issue detection

**Output**:
- `StructuredPRD` object
- Quality score
- Blocking issues list
- Analysis warnings
- Suggestions

**State Updates**:
- `prdStore`: Stores parsed PRD
- `projectStore`: Updates phase status

**User Actions**:
- Upload PRD files
- View analysis results
- Review quality score
- Address blocking issues
- Proceed to Phase 2

---

### Phase 2: Entity Extraction

**Input**: Structured PRD from Phase 1

**Process**:
1. AI-powered entity extraction (LLM)
2. Field inference and normalization
3. Relationship detection
4. Confidence scoring
5. Suggestion generation

**Output**:
- List of `Entity` objects
- List of `Relationship` objects
- AI suggestions for improvements

**State Updates**:
- `entityStore`: Stores entities and relationships

**User Actions**:
- Review extracted entities
- Edit entity properties
- Add/remove fields
- Adjust relationships
- Accept AI suggestions
- Proceed to Phase 3

---

### Phase 3: ERD Builder

**Input**: Entities and relationships from Phase 2

**Process**:
1. Apply naming conventions
2. Add standard fields (audit, soft delete)
3. Generate DBML schema
4. Validate schema
5. Generate migration SQL

**Output**:
- DBML schema string
- Validation results
- Migration SQL scripts
- ERD visualization data

**State Updates**:
- `erdStore`: Stores DBML and validation results

**User Actions**:
- Configure generation options
- Review DBML schema
- Edit relationships
- Validate schema
- Export DBML
- Proceed to Phase 4

---

### Phase 4: Task Generation

**Input**: PRD, Entities, ERD from previous phases

**Process**:
1. Generate database migration tasks
2. Generate API CRUD tasks
3. Generate UI tasks from screens
4. Generate validation tasks from business rules
5. Generate workflow tasks
6. Generate test tasks
7. Resolve dependencies
8. Calculate complexity

**Output**:
- `TaskSet` with all tasks
- Task summary and statistics
- Dependency graph

**State Updates**:
- `taskStore`: Stores generated tasks

**User Actions**:
- Configure generation options
- Review task list
- Filter by type/tier
- View task specifications
- Export tasks (JSON, YAML, Markdown)

---

### Data Flow Diagram

```
┌─────────────┐
│ Upload PRD  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Parse Markdown     │
│  Extract Structure  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Semantic Analysis  │◄─── LLM (prdAnalysis tier)
│  Quality Scoring    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Store PRD          │
│  (prdStore)         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Entity Extraction  │◄─── LLM (entityExtraction tier)
│  AI-Powered         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Store Entities     │
│  (entityStore)      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Generate DBML      │
│  Apply Standards    │
│  Validate Schema    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Store ERD          │
│  (erdStore)         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Generate Tasks     │
│  Expand Specs       │
│  Resolve Deps       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Store Tasks        │
│  (taskStore)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Export             │
│  (JSON/YAML/MD)     │
└─────────────────────┘
```

---

## State Management

### Zustand Store Architecture

The application uses **Zustand** for state management with multiple specialized stores.

### Store Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Application State                     │
├─────────────────────────────────────────────────────────┤
│  projectStore    │  Current project and phase state     │
│  prdStore        │  Parsed PRD and analysis results     │
│  entityStore     │  Extracted entities and relationships│
│  erdStore        │  DBML schema and validation          │
│  taskStore       │  Generated tasks and specifications  │
│  settingsStore   │  User settings and API keys          │
│  promptStore     │  Custom LLM prompts                  │
│  uiStore         │  UI state (modals, panels, etc.)     │
└─────────────────────────────────────────────────────────┘
```

---

### 1. Project Store (`projectStore.ts`)

**Purpose**: Manage current project and workflow phase.

**State**:
```typescript
interface ProjectState {
  project: Project | null;
  currentPhase: PhaseNumber;  // 1, 2, 3, 4
  phaseStatus: Record<PhaseNumber, PhaseStatus>;
  files: ProjectFile[];
  isDirty: boolean;
  recentProjects: RecentProject[];
}
```

**Actions**:
- `createProject()`: Initialize new project
- `loadProject()`: Load existing project
- `updateProject()`: Update project metadata
- `closeProject()`: Close current project
- `setPhase()`: Navigate to phase
- `setPhaseStatus()`: Update phase status
- `canAdvanceToPhase()`: Check if phase is unlocked
- `addFile()`: Add PRD file
- `removeFile()`: Remove file

**Phase Status Values**:
- `locked`: Phase not yet accessible
- `active`: Current phase
- `completed`: Phase finished successfully
- `has-issues`: Phase has blocking issues

---

### 2. PRD Store (`prdStore.ts`)

**Purpose**: Store parsed PRD and analysis results.

**State**:
```typescript
interface PRDState {
  prd: StructuredPRD | null;
  rawContent: string;
  qualityScore: QualityScoreResult | null;
  blockingIssues: BlockingIssue[];
  warnings: AnalysisWarning[];
  suggestions: AnalysisSuggestion[];
  isAnalyzing: boolean;
}
```

**Actions**:
- `setPRD()`: Store parsed PRD
- `setQualityScore()`: Update quality score
- `addBlockingIssue()`: Add issue
- `resolveIssue()`: Mark issue as resolved
- `clearPRD()`: Reset state

---

### 3. Entity Store (`entityStore.ts`)

**Purpose**: Manage extracted entities and relationships.

**State**:
```typescript
interface EntityState {
  entities: Entity[];
  relationships: Relationship[];
  suggestions: EntitySuggestion[];
  isExtracting: boolean;
  extractionProgress: number;
}
```

**Actions**:
- `setEntities()`: Store entities
- `addEntity()`: Add new entity
- `updateEntity()`: Modify entity
- `removeEntity()`: Delete entity
- `addField()`: Add field to entity
- `updateField()`: Modify field
- `removeField()`: Delete field
- `setRelationships()`: Store relationships
- `addRelationship()`: Add relationship
- `updateRelationship()`: Modify relationship
- `removeRelationship()`: Delete relationship

---

### 4. ERD Store (`erdStore.ts`)

**Purpose**: Store DBML schema and validation results.

**State**:
```typescript
interface ERDState {
  dbml: string;
  validationResult: ERDValidationResult | null;
  migrationSQL: string;
  generationOptions: DBMLGenerationOptions;
  isGenerating: boolean;
}
```

**Actions**:
- `setDBML()`: Store DBML schema
- `setValidationResult()`: Update validation
- `setMigrationSQL()`: Store SQL
- `updateGenerationOptions()`: Configure options
- `regenerate()`: Regenerate DBML

---

### 5. Task Store (`taskStore.ts`)

**Purpose**: Store generated tasks and specifications.

**State**:
```typescript
interface TaskState {
  taskSet: TaskSet | null;
  filteredTasks: ProgrammableTask[];
  selectedTask: ProgrammableTask | null;
  filters: TaskFilters;
  isGenerating: boolean;
}
```

**Actions**:
- `setTaskSet()`: Store task set
- `selectTask()`: Select task for viewing
- `filterTasks()`: Apply filters
- `updateTask()`: Modify task
- `exportTasks()`: Export in various formats

---

### 6. Settings Store (`settingsStore.ts`)

**Purpose**: Manage user settings and configuration.

**State**:
```typescript
interface SettingsState {
  apiKeys: APIKeySettings;
  modelSelection: ModelSelectionSettings;
  standards: StandardsConfig;
  appearance: AppearanceSettings;
  export: ExportSettings;
  advanced: AdvancedSettings;
}
```

**Persistence**: Stored in localStorage via Zustand persist middleware.

**Actions**:
- `setApiKey()`: Configure API key
- `removeApiKey()`: Remove API key
- `setModelForTier()`: Configure model for tier
- `updateStandards()`: Update coding standards
- `updateAppearance()`: Update UI preferences
- `resetToDefaults()`: Reset all settings
- `importSettings()`: Import configuration
- `exportSettings()`: Export configuration
- `initializeFromEnv()`: Load from environment variables

---

### 7. Prompt Store (`promptStore.ts`)

**Purpose**: Manage custom LLM prompts.

**State**:
```typescript
interface PromptState {
  prompts: Record<PromptType, string>;
  customPrompts: Record<string, string>;
}
```

**Prompt Types**:
- `prdAnalysis`: PRD semantic analysis
- `entityExtraction`: Entity extraction
- `erdGeneration`: ERD generation
- `taskGeneration`: Task generation
- `validation`: Validation rules

**Actions**:
- `getPrompt()`: Get prompt by type
- `setPrompt()`: Update prompt
- `resetPrompt()`: Reset to default
- `importPrompts()`: Import custom prompts
- `exportPrompts()`: Export prompts

---

### 8. UI Store (`uiStore.ts`)

**Purpose**: Manage UI state (modals, panels, etc.).

**State**:
```typescript
interface UIState {
  activeModal: ModalType | null;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  confirmationDialog: ConfirmationDialogState | null;
}
```

**Actions**:
- `openModal()`: Open modal
- `closeModal()`: Close modal
- `toggleLeftPanel()`: Toggle left panel
- `toggleRightPanel()`: Toggle right panel
- `showConfirmation()`: Show confirmation dialog

---

### State Persistence Strategy

**Persistent Stores** (localStorage):
- `settingsStore`: User preferences and API keys
- `promptStore`: Custom prompts

**Session Stores** (memory only):
- `projectStore`: Current project state
- `prdStore`: Current PRD data
- `entityStore`: Current entities
- `erdStore`: Current ERD
- `taskStore`: Current tasks
- `uiStore`: UI state

**Database Persistence** (IndexedDB):
- Projects (via `db.projects`)
- Recent projects (via `db.recentProjects`)
- Settings backup (via `db.settings`)

---

## Database Architecture

### IndexedDB Schema

The application uses **Dexie.js** as a wrapper around IndexedDB.

**Database Name**: `prd-to-tasks`

**Version**: 1

### Tables

#### 1. `projects` Table

**Purpose**: Store project data with all phases.

**Schema**:
```typescript
interface DBProject {
  id?: number;                    // Auto-increment
  projectId: string;              // UUID (indexed)
  name: string;                   // Project name (indexed)
  description?: string;
  createdAt: Date;
  updatedAt: Date;                // Indexed for sorting
  prd?: StructuredPRD;           // Phase 1 output
  entities?: Entity[];            // Phase 2 output
  relationships?: Relationship[]; // Phase 2 output
  erdSchema?: ERDSchema;          // Phase 3 output
  taskSet?: TaskSet;              // Phase 4 output
  files?: ProjectFile[];          // Uploaded files
}
```

**Indexes**:
- `++id`: Primary key (auto-increment)
- `projectId`: Unique project identifier
- `name`: Project name
- `updatedAt`: Last update timestamp

**Operations**:
```typescript
// Save or update project
await saveProject(project: DBProject): Promise<number>

// Load project by ID
await loadProject(projectId: string): Promise<DBProject | undefined>

// Delete project
await deleteProject(projectId: string): Promise<void>

// List all projects
await listProjects(): Promise<DBProject[]>
```

---

#### 2. `settings` Table

**Purpose**: Store application settings as key-value pairs.

**Schema**:
```typescript
interface DBSettings {
  key: string;      // Primary key
  value: unknown;   // JSON-serializable value
}
```

**Indexes**:
- `key`: Primary key

**Usage**:
- Backup for settings store
- Cross-tab synchronization
- Settings export/import

---

#### 3. `recentProjects` Table

**Purpose**: Track recently accessed projects.

**Schema**:
```typescript
interface DBRecentProject {
  id?: number;          // Auto-increment
  projectId: string;    // Project UUID (indexed)
  name: string;         // Project name
  accessedAt: Date;     // Last access time (indexed)
}
```

**Indexes**:
- `++id`: Primary key
- `projectId`: Project reference
- `accessedAt`: For sorting by recency

**Behavior**:
- Automatically updated on project load
- Limited to 10 most recent projects
- Oldest entries automatically pruned

---

### Database Operations

#### Auto-Save Strategy

**Trigger Points**:
- After PRD analysis completion
- After entity extraction
- After ERD generation
- After task generation
- On manual save action

**Implementation**:
```typescript
// useAutoSave hook
useAutoSave({
  data: currentProjectData,
  interval: 30000,  // 30 seconds
  onSave: async (data) => {
    await saveProject(data);
  }
});
```

#### Transaction Management

Dexie.js provides automatic transaction management:

```typescript
// Atomic operations
await db.transaction('rw', db.projects, db.recentProjects, async () => {
  await db.projects.put(project);
  await db.recentProjects.add(recentEntry);
});
```

#### Error Handling

```typescript
try {
  await saveProject(project);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Handle storage quota exceeded
  } else if (error.name === 'ConstraintError') {
    // Handle constraint violation
  }
}
```

---

## LLM Integration Architecture

### Multi-Provider Strategy

The application supports multiple LLM providers for flexibility and redundancy.

### Provider Comparison

| Provider   | Models                  | Context Window | Best For              |
|------------|-------------------------|----------------|-----------------------|
| Anthropic  | Claude 3.5 Sonnet       | 200K tokens    | Complex reasoning     |
| Google     | Gemini 1.5 Pro          | 1M tokens      | Large context         |
| DeepSeek   | DeepSeek V3             | 64K tokens     | Cost-effective        |
| OpenAI     | GPT-4, GPT-4 Turbo      | 128K tokens    | General purpose       |
| OpenRouter | Multiple models         | Varies         | Model flexibility     |

---

### Tier-Based Model Selection

**Tier Configuration**:

```typescript
const defaultModelSelection: ModelSelectionSettings = {
  T1: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    enabled: true
  },
  T2: {
    provider: 'openai',
    model: 'gpt-4-turbo',
    enabled: true
  },
  T3: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    enabled: true
  },
  T4: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    enabled: true
  },
  prdAnalysis: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    enabled: true
  },
  entityExtraction: {
    provider: 'google',
    model: 'gemini-1.5-pro',
    enabled: true
  }
};
```

**Rationale**:
- **T1 (Simple)**: Cost-effective models for repetitive tasks
- **T2 (Standard)**: Balanced performance and cost
- **T3 (Complex)**: High-capability models for complex logic
- **T4 (Architecture)**: Best models for design decisions
- **PRD Analysis**: Strong reasoning for semantic analysis
- **Entity Extraction**: Large context for comprehensive extraction

---

### Prompt Engineering

**Prompt Structure**:

```typescript
interface LLMRequest {
  systemPrompt: string;   // Role and instructions
  userPrompt: string;     // Task-specific content
  maxTokens: number;      // Output limit
  temperature?: number;   // Creativity (0-1)
}
```

**System Prompts** (`src/core/llm/prompts/`):

1. **PRD Analysis** (`prd-analysis.ts`):
   - Role: Expert business analyst
   - Task: Semantic analysis, quality scoring
   - Output: JSON with scores and issues

2. **Entity Extraction** (`entity-extraction.ts`):
   - Role: Database architect
   - Task: Extract entities, fields, relationships
   - Output: JSON with entities and suggestions

3. **ERD Generation** (`erd-generation.ts`):
   - Role: Database designer
   - Task: Generate DBML schema
   - Output: DBML syntax

4. **Task Generation** (`task-generation.ts`):
   - Role: Technical lead
   - Task: Generate task specifications
   - Output: JSON with tasks

**Prompt Customization**:
- Users can customize prompts via Settings
- Custom prompts stored in `promptStore`
- Default prompts always available as fallback

---

### Error Handling & Retry Logic

**Retry Strategy**:

```typescript
async callWithRetry(
  tier: TaskTierType,
  systemPrompt: string,
  userPrompt: string,
  maxRetries: number = 3
): Promise<LLMResponse> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.call(tier, systemPrompt, userPrompt);
    } catch (error) {
      // Don't retry on auth errors
      if (error.message.includes('401') || error.message.includes('403')) {
        throw error;
      }
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Error Types**:
- **Authentication Errors** (401, 403): No retry, prompt for API key
- **Rate Limit Errors** (429): Retry with backoff
- **Server Errors** (500, 503): Retry with backoff
- **Network Errors**: Retry with backoff
- **Timeout Errors**: Retry with increased timeout

**Abort Support**:
```typescript
const abortController = new AbortController();

// Call with abort signal
const response = await router.call(
  'prdAnalysis',
  systemPrompt,
  userPrompt,
  4096,
  abortController.signal
);

// Cancel if needed
abortController.abort();
```

---

### Cost Tracking

**Usage Tracking**:
```typescript
interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}
```

**Cost Calculation**:
```typescript
function calculateCost(usage: LLMUsage, model: LLMModel): number {
  const inputCost = (usage.promptTokens / 1000) * model.costPer1kInput;
  const outputCost = (usage.completionTokens / 1000) * model.costPer1kOutput;
  return inputCost + outputCost;
}
```

---

## UI Component Architecture

### Layout Structure

**Three-Column Layout**:

```
┌────────────────────────────────────────────────────────────┐
│                         Header                             │
├──────────────┬─────────────────────────┬───────────────────┤
│              │                         │                   │
│  Left Panel  │     Middle Panel        │   Right Panel     │
│              │                         │                   │
│  - File List │  - Phase Stepper        │  - Analysis       │
│  - Uploader  │  - Phase Content        │  - Quality Score  │
│  - Actions   │    • PRD Analysis       │  - Blocking Issues│
│              │    • Entity Extraction  │  - Output Preview │
│              │    • ERD Builder        │                   │
│              │    • Task Generation    │                   │
│              │                         │                   │
│  (Resizable) │     (Main Content)      │   (Resizable)     │
│              │                         │                   │
└──────────────┴─────────────────────────┴───────────────────┘
```

**Resizable Panels**:
- Implemented with `react-resizable-panels`
- Persistent panel sizes (stored in localStorage)
- Collapsible left and right panels

---

### Component Hierarchy

```
App
└── TooltipProvider
    └── AppLayout
        ├── Header
        │   ├── Logo
        │   ├── ProjectInfo
        │   └── Actions (Settings, Export, etc.)
        │
        ├── ThreeColumnLayout
        │   ├── LeftPanel
        │   │   ├── FileList
        │   │   ├── FileUploader
        │   │   └── ProjectActions
        │   │
        │   ├── MiddlePanel
        │   │   ├── PhaseStepper
        │   │   └── PhaseContent
        │   │       ├── PRDAnalysisPhase
        │   │       ├── EntityExtractionPhase
        │   │       ├── ERDBuilderPhase
        │   │       └── TaskGenerationPhase
        │   │
        │   └── RightPanel
        │       ├── QualityScore
        │       ├── BlockingIssues
        │       ├── AnalysisResults
        │       └── OutputPreview
        │
        └── Modals
            ├── SettingsModal
            ├── FirstTimeSetupModal
            ├── ExportModal
            └── ConfirmationModal
```

---

### Key Components

#### 1. Phase Components

**PRDAnalysisPhase**:
- File upload interface
- PRD content viewer
- Analysis trigger
- Results display

**EntityExtractionPhase**:
- Entity list view
- Entity editor
- Field management
- Relationship editor
- AI suggestions panel

**ERDBuilderPhase**:
- DBML editor (Monaco)
- Generation options
- Validation results
- Relationship diagram
- SQL preview

**TaskGenerationPhase**:
- Generation options
- Task list (filterable)
- Task detail viewer
- Dependency graph
- Export options

---

#### 2. Shared UI Components (`src/components/ui/`)

Built with **Radix UI** and **shadcn/ui**:

- `button.tsx`: Button variants
- `card.tsx`: Card container
- `dialog.tsx`: Modal dialogs
- `input.tsx`: Text inputs
- `select.tsx`: Dropdown selects
- `tabs.tsx`: Tab navigation
- `textarea.tsx`: Multi-line text
- `badge.tsx`: Status badges
- `progress.tsx`: Progress bars
- `tooltip.tsx`: Tooltips
- `scroll-area.tsx`: Scrollable areas
- `collapsible.tsx`: Collapsible sections
- `dropdown-menu.tsx`: Context menus
- `separator.tsx`: Visual separators
- `skeleton.tsx`: Loading skeletons
- `switch.tsx`: Toggle switches
- `label.tsx`: Form labels

**Design System**:
- Consistent styling with Tailwind CSS
- Accessible (ARIA compliant)
- Dark mode support
- Responsive design

---

#### 3. Settings Components

**SettingsModal**:
- Tabbed interface
- API Keys configuration
- Model selection per tier
- Standards configuration
- Appearance settings
- Export/Import settings

**PromptEditor**:
- Monaco editor for prompts
- Syntax highlighting
- Reset to defaults
- Preview mode

---

### State-to-UI Binding

**React Hooks Integration**:

```typescript
// Component example
function EntityList() {
  const entities = useEntityStore((s) => s.entities);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  
  return (
    <div>
      {entities.map(entity => (
        <EntityCard
          key={entity.id}
          entity={entity}
          onUpdate={updateEntity}
        />
      ))}
    </div>
  );
}
```

**Optimized Re-renders**:
- Zustand selector pattern for minimal re-renders
- React.memo for expensive components
- useMemo/useCallback for derived values

---

## Standards & Configuration System

### Standards Architecture

The application uses a **configurable standards system** to ensure generated code follows organizational conventions.

**Standards Location**: `src/standards/`

### Standard Files

#### 1. Database Standards (`database.json`)

**Configuration**:
```json
{
  "namingConventions": {
    "tables": {
      "case": "snake_case",
      "pluralization": "plural"
    },
    "columns": {
      "case": "snake_case"
    },
    "foreignKeys": {
      "pattern": "fk_{table}_{column}",
      "columnPattern": "{referenced_table}_id"
    }
  },
  "auditFields": {
    "createdAt": { "name": "created_at", "type": "timestamp" },
    "updatedAt": { "name": "updated_at", "type": "timestamp" }
  },
  "softDelete": {
    "enabled": true,
    "deletedAt": { "name": "deleted_at", "type": "timestamp" }
  },
  "idGeneration": {
    "strategy": "uuid"
  }
}
```

**Applied To**:
- Entity table names
- Column names
- Foreign key constraints
- Index names
- Audit field generation

---

#### 2. API Standards (`api.json`)

**Configuration**:
```json
{
  "basePathPattern": "/api/v1",
  "versioningStrategy": "url",
  "resourceNaming": "plural",
  "errorResponseFormat": {
    "codeField": "code",
    "messageField": "message",
    "detailsField": "details"
  },
  "paginationFormat": {
    "pageSizeParam": "pageSize",
    "pageNumberParam": "page",
    "defaultPageSize": 20,
    "maxPageSize": 100
  }
}
```

**Applied To**:
- API endpoint paths
- Request/response formats
- Error handling
- Pagination parameters

---

#### 3. UI Standards (`ui.json`)

**Configuration**:
```json
{
  "componentLibrary": "shadcn/ui",
  "formLayout": "vertical",
  "dateFormat": "YYYY-MM-DD",
  "dateTimeFormat": "YYYY-MM-DD HH:mm:ss",
  "currencyFormat": {
    "symbol": "$",
    "position": "before",
    "decimals": 2
  },
  "tableDefaults": {
    "defaultPageSize": 20,
    "showRowNumbers": true,
    "enableSorting": true,
    "enableFiltering": true
  }
}
```

**Applied To**:
- UI component generation
- Form layouts
- Date/time formatting
- Currency display
- Table configurations

---

#### 4. Validation Standards (`validation.json`)

**Configuration**:
```json
{
  "defaultMessages": {
    "required": "This field is required",
    "email": "Please enter a valid email address",
    "minLength": "Minimum length is {min} characters",
    "maxLength": "Maximum length is {max} characters"
  },
  "phoneFormat": "^\\+?[1-9]\\d{1,14}$",
  "emailFormat": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
  "passwordPolicy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumber": true,
    "requireSpecial": true
  }
}
```

**Applied To**:
- Validation task generation
- Error messages
- Input validation rules
- Password policies

---

#### 5. Compliance Standards (`indonesia-compliance.json`)

**Configuration**:
```json
{
  "region": "Indonesia",
  "taxRate": 11,
  "taxName": "PPN",
  "currency": "IDR",
  "dateLocale": "id-ID",
  "privacyFields": ["email", "phone", "address", "nik"],
  "retentionPeriods": {
    "transactionData": 10,
    "personalData": 5,
    "auditLogs": 7
  }
}
```

**Applied To**:
- Tax calculations
- Currency formatting
- Data privacy handling
- Retention policies

---

### Standards Application

**During ERD Generation**:
```typescript
function applyNamingConvention(
  entityName: string,
  standards: DatabaseStandards
): string {
  const { case: caseStyle, pluralization } = standards.namingConvention.tables;
  
  let tableName = entityName;
  
  // Apply case conversion
  if (caseStyle === 'snake_case') {
    tableName = toSnakeCase(tableName);
  }
  
  // Apply pluralization
  if (pluralization === 'plural') {
    tableName = pluralize(tableName);
  }
  
  return tableName;
}
```

**During Task Generation**:
```typescript
function generateAPITask(
  entity: Entity,
  standards: APIStandards
): ProgrammableTask {
  const basePath = standards.basePathPattern;
  const resourceName = standards.resourceNaming === 'plural' 
    ? pluralize(entity.name) 
    : entity.name;
  
  return {
    // ... task properties
    specification: {
      api: {
        basePath: `${basePath}/${resourceName}`,
        // ... other API specs
      }
    }
  };
}
```

---

## Export & Integration

### Export Formats

The application supports multiple export formats for different use cases.

#### 1. JSON Export

**Use Case**: Machine-readable, API integration

**Structure**:
```json
{
  "id": "task-set-uuid",
  "projectId": "project-uuid",
  "projectName": "My Project",
  "generatedAt": "2026-01-23T10:00:00Z",
  "summary": {
    "totalTasks": 45,
    "tierBreakdown": { "T1": 20, "T2": 15, "T3": 8, "T4": 2 }
  },
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Create users table migration",
      "type": "database-migration",
      "tier": "T1",
      "specification": { /* full spec */ },
      "acceptanceCriteria": [ /* criteria */ ]
    }
  ]
}
```

**Features**:
- Complete task specifications
- Metadata included
- Dependency information
- Acceptance criteria
- Test cases

---

#### 2. YAML Export

**Use Case**: Human-readable, CI/CD integration

**Structure**:
```yaml
id: task-set-uuid
projectId: project-uuid
generatedAt: 2026-01-23T10:00:00Z

summary:
  totalTasks: 45
  tierBreakdown:
    T1: 20
    T2: 15
    T3: 8
    T4: 2

tasks:
  - id: TASK-001
    title: "Create users table migration"
    type: database-migration
    tier: T1
    specification:
      objective: "Create database table for users entity"
      # ... full spec
```

**Features**:
- Readable format
- Comments supported
- Easy to parse
- Git-friendly

---

#### 3. Markdown Export

**Use Case**: Documentation, project management tools

**Structure**:
```markdown
# Task Set: My Project

**Generated:** 2026-01-23 10:00:00

## Summary

- **Total Tasks:** 45
- **T1 Tasks:** 20 (Simple)
- **T2 Tasks:** 15 (Standard)
- **T3 Tasks:** 8 (Complex)
- **T4 Tasks:** 2 (Architecture)

## Tasks

### TASK-001: Create users table migration

**Type:** Database Migration  
**Tier:** T1  
**Priority:** High  
**Module:** Database

#### Objective
Create database table for users entity

#### Specification
<!-- Full specification -->

#### Acceptance Criteria
- [ ] Table created with all columns
- [ ] Indexes created
- [ ] Migration tested
```

**Features**:
- Human-readable
- Checkbox support for tracking
- Hierarchical structure
- Compatible with GitHub, Jira, etc.

---

### DBML Export

**Use Case**: Database design tools (dbdiagram.io, etc.)

**Output**: Complete DBML schema

**Features**:
- Table definitions
- Relationships
- Indexes
- Constraints
- Comments

**Integration**:
- Import into dbdiagram.io for visualization
- Use with database migration tools
- Generate SQL from DBML

---

### Integration Points

#### 1. Project Management Tools

**Jira Integration** (via API):
```typescript
async function exportToJira(tasks: ProgrammableTask[]) {
  for (const task of tasks) {
    await jiraAPI.createIssue({
      project: 'PROJ',
      summary: task.title,
      description: formatTaskForJira(task),
      issuetype: 'Task',
      priority: mapPriority(task.priority),
      labels: task.tags
    });
  }
}
```

**Linear Integration**:
```typescript
async function exportToLinear(tasks: ProgrammableTask[]) {
  for (const task of tasks) {
    await linearAPI.createIssue({
      teamId: 'team-id',
      title: task.title,
      description: formatTaskForLinear(task),
      priority: mapPriority(task.priority),
      labels: task.tags
    });
  }
}
```

---

#### 2. Version Control

**Git Repository Structure**:
```
project-repo/
├── docs/
│   ├── prd/
│   │   └── original-prd.md
│   ├── architecture/
│   │   ├── erd.dbml
│   │   └── entity-model.md
│   └── tasks/
│       ├── tasks.json
│       ├── tasks.yaml
│       └── tasks.md
├── migrations/
│   └── 001_initial_schema.sql
└── tasks/
    ├── database/
    ├── api/
    ├── ui/
    └── tests/
```

---

#### 3. CI/CD Integration

**GitHub Actions Example**:
```yaml
name: Task Validation

on:
  push:
    paths:
      - 'docs/tasks/tasks.yaml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate Tasks
        run: |
          # Parse tasks.yaml
          # Validate structure
          # Check dependencies
          # Generate reports
```

---

## Security Considerations

### API Key Management

**Storage**:
- API keys stored in browser localStorage (encrypted)
- Never transmitted to any server except LLM providers
- Environment variable support for deployment

**Best Practices**:
```typescript
// Environment variables (recommended for production)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
VITE_GOOGLE_API_KEY=...
```

**Key Rotation**:
- Easy key update via Settings
- No data loss on key change
- Multiple provider support for redundancy

---

### Data Privacy

**Local-First Architecture**:
- All data stored locally in browser
- No server-side storage
- No data transmission except to LLM providers

**Data Handling**:
- PRD content sent to LLM providers for analysis
- User controls which providers to use
- Option to use self-hosted LLM providers

**Sensitive Data**:
- Avoid including sensitive data in PRDs
- Use generic examples for testing
- Clear data option available

---

### Content Security

**XSS Prevention**:
- React's built-in XSS protection
- Sanitized markdown rendering
- No `dangerouslySetInnerHTML` usage

**Input Validation**:
- File type validation
- File size limits
- Content validation before processing

---

### LLM Provider Security

**API Communication**:
- HTTPS only
- API key in headers (not URL)
- Request signing where supported

**Rate Limiting**:
- Client-side rate limiting
- Exponential backoff on errors
- Abort support for long-running requests

---

## Performance Optimization

### Frontend Performance

#### 1. Code Splitting
```typescript
// Lazy load phase components
const PRDAnalysisPhase = lazy(() => import('./phases/PRDAnalysisPhase'));
const EntityExtractionPhase = lazy(() => import('./phases/EntityExtractionPhase'));
```

#### 2. Memoization
```typescript
// Expensive computations
const qualityScore = useMemo(() => 
  calculateQualityScore(prd),
  [prd]
);

// Callback stability
const handleUpdate = useCallback((entity: Entity) => {
  updateEntity(entity);
}, [updateEntity]);
```

#### 3. Virtual Scrolling
```typescript
// For large task lists
<VirtualList
  items={tasks}
  itemHeight={80}
  renderItem={(task) => <TaskCard task={task} />}
/>
```

---

### State Management Performance

**Zustand Selectors**:
```typescript
// ❌ Bad: Re-renders on any store change
const store = useProjectStore();

// ✅ Good: Re-renders only when entities change
const entities = useEntityStore((s) => s.entities);
```

**Computed Values**:
```typescript
// Store computed values to avoid recalculation
const tasksByTier = useMemo(() => 
  groupBy(tasks, 'tier'),
  [tasks]
);
```

---

### Database Performance

**Indexing Strategy**:
```typescript
// Dexie schema with indexes
this.version(1).stores({
  projects: '++id, projectId, name, updatedAt',  // Indexed fields
  recentProjects: '++id, projectId, accessedAt'
});
```

**Batch Operations**:
```typescript
// Bulk insert for better performance
await db.projects.bulkPut(projects);
```

**Query Optimization**:
```typescript
// Use indexes for filtering
const recentProjects = await db.projects
  .orderBy('updatedAt')
  .reverse()
  .limit(10)
  .toArray();
```

---

### LLM Call Optimization

**Prompt Optimization**:
- Concise prompts to reduce token usage
- Structured output formats (JSON)
- Reuse system prompts

**Caching Strategy**:
```typescript
// Cache LLM responses for identical inputs
const cacheKey = hash(systemPrompt + userPrompt);
const cached = cache.get(cacheKey);
if (cached) return cached;
```

**Parallel Processing**:
```typescript
// Process multiple entities in parallel
const results = await Promise.all(
  entities.map(entity => extractFields(entity))
);
```

---

## Development Guidelines

### Project Structure

```
src/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── modals/         # Modal dialogs
│   ├── panels/         # Panel components
│   ├── settings/       # Settings components
│   └── ui/             # Shared UI components
├── core/               # Business logic
│   ├── analyzer/       # PRD analysis
│   ├── entity-extractor/  # Entity extraction
│   ├── erd-generator/  # ERD generation
│   ├── llm/            # LLM integration
│   ├── prd-parser/     # PRD parsing
│   └── task-generator/ # Task generation
├── db/                 # Database layer
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── standards/          # Coding standards
├── store/              # Zustand stores
└── types/              # TypeScript types
```

---

### Coding Standards

#### TypeScript

**Strict Mode**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Type Definitions**:
- Explicit return types for functions
- Interface over type for objects
- Avoid `any`, use `unknown` if needed

**Naming Conventions**:
- PascalCase for types, interfaces, components
- camelCase for variables, functions
- UPPER_CASE for constants

---

#### React

**Component Structure**:
```typescript
// 1. Imports
import { useState } from 'react';
import { useStore } from '@/store';

// 2. Types
interface Props {
  title: string;
  onSave: () => void;
}

// 3. Component
export function MyComponent({ title, onSave }: Props) {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 6. Render
  return (
    <div>{title}</div>
  );
}
```

**Best Practices**:
- Functional components only
- Custom hooks for reusable logic
- Prop destructuring
- Early returns for conditionals

---

#### State Management

**Store Structure**:
```typescript
interface StoreState {
  // State
  data: Data | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setData: (data: Data) => void;
  clearData: () => void;
}
```

**Action Naming**:
- `set*`: Set value
- `update*`: Partial update
- `add*`: Add item
- `remove*`: Remove item
- `clear*`: Clear state

---

### Testing Strategy

**Unit Tests**:
- Core modules (parser, analyzer, generator)
- Utility functions
- Store actions

**Integration Tests**:
- Component interactions
- Store integration
- LLM provider adapters

**E2E Tests**:
- Complete workflows
- Phase transitions
- Export functionality

---

### Git Workflow

**Branch Strategy**:
```
main                    # Production
├── develop            # Development
    ├── feature/*      # New features
    ├── bugfix/*       # Bug fixes
    └── refactor/*     # Refactoring
```

**Commit Messages**:
```
feat: Add entity extraction phase
fix: Resolve DBML generation issue
refactor: Improve task generator performance
docs: Update architecture documentation
```

---

## Deployment Architecture

### Build Configuration

**Vite Configuration**:
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', /* ... */],
          'monaco': ['@monaco-editor/react'],
        }
      }
    }
  }
});
```

---

### Deployment Options

#### 1. Static Hosting

**Platforms**:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

**Configuration**:
```json
{
  "build": {
    "command": "npm run build",
    "output": "dist"
  }
}
```

---

#### 2. Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

#### 3. Environment Configuration

**Environment Variables**:
```bash
# API Keys (optional, can be set in UI)
VITE_ANTHROPIC_API_KEY=
VITE_OPENAI_API_KEY=
VITE_GOOGLE_API_KEY=
VITE_DEEPSEEK_API_KEY=
VITE_OPENROUTER_API_KEY=

# Application Config
VITE_APP_NAME="PRD-to-Tasks"
VITE_APP_VERSION="1.0.0"
```

---

### Monitoring & Analytics

**Error Tracking**:
```typescript
// Sentry integration
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "...",
  environment: import.meta.env.MODE,
});
```

**Usage Analytics**:
```typescript
// Google Analytics
import ReactGA from 'react-ga4';

ReactGA.initialize('G-XXXXXXXXXX');
ReactGA.send("pageview");
```

---

## Future Enhancements

### Planned Features

#### 1. Collaboration Features
- Multi-user project sharing
- Real-time collaboration
- Comment system
- Change tracking

#### 2. Advanced AI Features
- Auto-fix for blocking issues
- Intelligent task prioritization
- Code generation from tasks
- Test case generation

#### 3. Integration Enhancements
- Direct Jira/Linear integration
- GitHub/GitLab integration
- Slack notifications
- Webhook support

#### 4. Enhanced Visualization
- Interactive ERD diagrams
- Task dependency graphs
- Gantt charts
- Progress dashboards

#### 5. Template System
- PRD templates
- Project templates
- Task templates
- Standards templates

#### 6. Version Control
- PRD versioning
- Change history
- Diff viewer
- Rollback support

#### 7. Advanced Export
- Confluence export
- Notion export
- PDF generation
- Custom templates

#### 8. Performance Improvements
- Web Workers for heavy processing
- Service Worker for offline support
- Progressive Web App (PWA)
- Optimistic UI updates

---

## Conclusion

The **PRD-to-Tasks Converter** is a sophisticated, well-architected application that bridges the gap between product requirements and actionable development tasks. Its modular design, comprehensive type system, and AI-powered analysis make it a powerful tool for software development teams.

### Key Strengths

1. **Modular Architecture**: Clear separation of concerns, easy to maintain and extend
2. **Type Safety**: Full TypeScript coverage ensures reliability
3. **AI Integration**: Multi-provider LLM support for intelligent analysis
4. **Standards-Driven**: Configurable standards ensure consistency
5. **Local-First**: Privacy-focused, no server dependency
6. **Comprehensive Output**: Fully-specified, dependency-aware tasks

### Architecture Highlights

- **Clean Architecture**: Layered design with clear boundaries
- **Extensibility**: Easy to add new features and integrations
- **Performance**: Optimized for large PRDs and complex projects
- **User Experience**: Intuitive UI with real-time feedback
- **Developer Experience**: Well-structured codebase, comprehensive types

---

**Document Version**: 1.0.0  
**Last Updated**: January 23, 2026  
**Maintained By**: Development Team

For questions or contributions, please refer to the project repository.
