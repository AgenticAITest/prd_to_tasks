# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

GitHub: https://github.com/AgenticAITest/prd_to_tasks

## Project Overview

PRD-to-Tasks is a web-based tool that converts Product Requirements Documents (PRDs) into Entity-Relationship Diagrams (ERDs) and detailed, self-contained development tasks. The tool follows a 4-phase pipeline: PRD Input & Analysis → Entity Extraction → ERD Builder → Task Generator.

**Note:** The application code is in the `prd-to-tasks/` subdirectory. All development commands should be run from that directory.

## Development Commands

```bash
# Navigate to the application directory first
cd prd-to-tasks

# Development server (Vite) - runs on localhost:5173
npm run dev

# Production build (TypeScript compile + Vite build)
npm run build

# Lint (ESLint)
npm run lint

# Preview production build locally
npm run preview
```

Note: No test framework is currently configured in this project.

## Architecture

### Core Processing Pipeline

The 4-phase pipeline is the heart of the application:

1. **PRD Parser** (`src/core/prd-parser/`): Parses markdown PRDs, extracts FRs (Functional Requirements), BRs (Business Rules), and Screens
2. **Analyzer** (`src/core/analyzer/`): Quality scoring, CRUD coverage analysis, workflow analysis, blocking issue detection
3. **Entity Extractor** (`src/core/entity-extractor/`): AI-powered entity extraction from validated PRD
4. **ERD Generator** (`src/core/erd-generator/`): Schema generation (DBML, SQL), naming conventions, migration SQL
5. **Task Generator** (`src/core/task-generator/`): Generates self-contained, programmable tasks with full specifications

### State Management

Zustand stores (`src/store/`) manage application state with the following pattern:
- `projectStore`: Current project, phase progression (1-4), file management
- `prdStore`: Parsed PRD content
- `entityStore`: Extracted entities
- `erdStore`: ERD schema
- `taskStore`: Generated tasks
- `settingsStore`: API keys and model configuration (persisted to IndexedDB)
- `promptStore`: Editable LLM prompts for each phase
- `uiStore`: Modal state, UI preferences

Phase progression is gated: phases 2-4 start as 'locked' and unlock when the previous phase status is 'completed'.

### LLM Integration

The `LLMRouter` (`src/core/llm/LLMRouter.ts`) is a singleton that routes requests to different providers based on task complexity tiers:
- **T1** (Trivial): Deepseek - DB migrations, boilerplate code generation
- **T2** (Standard): Gemini Flash - Forms, lists, basic validation logic
- **T3** (Complex): Gemini Pro - Business logic, API integrations
- **T4** (Critical): Claude Sonnet - Architecture decisions, security-critical code
- **prdAnalysis**: Special tier for PRD analysis (Phase 1)
- **entityExtraction**: Special tier for entity extraction (Phase 2)

Supported providers: Anthropic, Google, Deepseek, OpenAI, OpenRouter

Provider implementations are in `src/core/llm/providers/`. Each provider exports a `call*` function (e.g., `callAnthropic`, `callGoogle`). The router includes:
- Retry logic with exponential backoff (2^attempt seconds, max 3 retries)
- Abort signal support for cancellation
- No retry on 401/403 auth errors

LLM prompts are defined in `src/core/llm/prompts/` with separate files for each phase.

### Data Persistence

Uses Dexie (IndexedDB wrapper) for local browser persistence (`src/db/database.ts`).

Database tables:
- `projects`: Main project data (PRD, entities, relationships, ERD schema, task set)
- `settings`: Key-value store for app settings
- `recentProjects`: Tracks last 10 accessed projects

### PRD Analysis

The analyzer (`src/core/analyzer/`) calculates a quality score with weighted components:
- Completeness (30%): FRs, user roles, screens, business rules
- Clarity (25%): Description quality
- Consistency (25%): ID patterns
- Testability (10%): Acceptance criteria
- Technical Readiness (10%): Entity definitions

Blocking issues (missing screens, incomplete workflows) must be resolved before proceeding to the next phase.

### UI Layout

Three-column layout using `react-resizable-panels`:
- **Left Panel** (`src/components/panels/left/`): File upload, project actions, file list
- **Middle Panel** (`src/components/panels/middle/`): Phase stepper and phase-specific content
- **Right Panel** (`src/components/panels/right/`): Analysis results, output preview, quality score

Phase components are in `src/components/panels/middle/phases/`.

### Key Principles

1. **FR-centric structure**: Everything (screens, rules, flows) nested under Functional Requirements
2. **PRD can reference, Tasks must be explicit**: Tasks are fully expanded with no external references
3. **AI proposes, human disposes**: Every AI output has a review/edit step
4. **Blocking issues**: Critical issues (missing screens, undefined entities) must be fixed before proceeding

## Type Definitions

Key types are defined in `src/types/`:
- `llm.ts`: `TaskTierType`, `LLMProvider`, provider-specific request/response types
- `prd.ts`: `StructuredPRD`, `ProjectFile`, `FunctionalRequirement`
- `entity.ts`: `Entity`, `Relationship`
- `erd.ts`: `ERDSchema`
- `task.ts`: `TaskSet`, task generation types
- `analysis.ts`: `AnalysisResult`, `BlockingIssue`, `QualityScoreResult`
- `settings.ts`: `APIKeySettings`, `ModelSelectionSettings`

## Path Aliases

Use `@/` for imports from `src/`:
```typescript
import { useSettingsStore } from '@/store/settingsStore';
import { LLMRouter } from '@/core/llm/LLMRouter';
```

## Standards Configuration

Located in `src/standards/`:
- `database.json`: Naming conventions, audit fields, index patterns
- `api.json`: REST conventions, response formats
- `ui.json`: Component library, form/list patterns
- `validation.json`: Common validation rules
- `indonesia-compliance.json`: Indonesian tax (PPN, PPH), currency, NPWP validation
