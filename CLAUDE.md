# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

GitHub: https://github.com/AgenticAITest/prd_to_tasks

## Project Overview

PRD-to-Tasks is a web-based tool that converts Product Requirements Documents (PRDs) into Entity-Relationship Diagrams (ERDs) and detailed, self-contained development tasks. The tool follows a 4-phase pipeline: PRD Input & Analysis → Entity Extraction → ERD Builder → Task Generator.

## Development Commands

```bash
# Navigate to the application directory first
cd prd-to-tasks

# Development server (Vite)
npm run dev

# Production build (TypeScript compile + Vite build)
npm run build

# Lint (ESLint)
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Directory Structure

```
prd-to-tasks/
├── src/
│   ├── core/           # Business logic (prd-parser, analyzer, entity-extractor, erd-generator, task-generator, llm)
│   ├── components/     # React components (layout, panels, modals, ui)
│   ├── store/          # Zustand stores (projectStore, prdStore, entityStore, erdStore, taskStore, settingsStore, uiStore)
│   ├── types/          # TypeScript type definitions
│   ├── hooks/          # Custom React hooks (useLLM, useProject, useAutoSave, useKeyboardShortcuts)
│   ├── standards/      # JSON configuration files for database/API/UI/validation standards
│   ├── constants/      # LLM model configurations
│   └── lib/            # Utilities (utils.ts, export.ts, file-handlers.ts)
```

### Core Processing Pipeline

1. **PRD Parser** (`src/core/prd-parser/`): Parses markdown PRDs, extracts FRs (Functional Requirements), BRs (Business Rules), and Screens
2. **Analyzer** (`src/core/analyzer/`): Quality scoring, CRUD coverage analysis, workflow analysis, blocking issue detection
3. **Entity Extractor** (`src/core/entity-extractor/`): AI-powered entity extraction from validated PRD
4. **ERD Generator** (`src/core/erd-generator/`): Schema generation (DBML, SQL), naming conventions, migration SQL
5. **Task Generator** (`src/core/task-generator/`): Generates self-contained, programmable tasks with full specifications

### State Management

Zustand stores manage application state:
- `projectStore`: Current project and phase progression
- `prdStore`: Parsed PRD content
- `entityStore`: Extracted entities
- `erdStore`: ERD schema
- `taskStore`: Generated tasks
- `settingsStore`: API keys and model configuration
- `uiStore`: Modal state, UI preferences

### LLM Integration

The `LLMRouter` (`src/core/llm/LLMRouter.ts`) routes requests to different providers based on task complexity tiers:
- **T1** (Trivial): Deepseek - DB migrations, boilerplate
- **T2** (Standard): Gemini Flash - Forms, lists, validation
- **T3** (Complex): Gemini Pro - Business logic, integrations
- **T4** (Critical): Claude Sonnet - Architecture, security
- **prdAnalysis** / **entityExtraction**: Special tiers for analysis phases

Supported providers: Anthropic, Google, Deepseek, OpenAI, OpenRouter

Provider implementations are in `src/core/llm/providers/`. Each provider exports a `call*` function (e.g., `callAnthropic`, `callGoogle`). The router includes retry logic with exponential backoff and automatic auth error handling.

LLM prompts are defined in `src/core/llm/prompts/` with separate files for each phase (prd-analysis, entity-extraction, erd-generation, task-generation).

### Data Persistence

Uses Dexie (IndexedDB wrapper) for local persistence (`src/db/database.ts`). Projects and their associated PRD/entity/ERD/task data are stored in the browser's IndexedDB.

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

Three-column layout with resizable panels:
- **Left Panel**: File upload, project actions, file list
- **Middle Panel**: Phase stepper and phase-specific content (PRDAnalysis, EntityExtraction, ERDBuilder, TaskGeneration)
- **Right Panel**: Analysis results, output preview, quality score

### Key Principles

1. **FR-centric structure**: Everything (screens, rules, flows) nested under Functional Requirements
2. **PRD can reference, Tasks must be explicit**: Tasks are fully expanded with no external references
3. **AI proposes, human disposes**: Every AI output has a review/edit step
4. **Blocking issues**: Critical issues (missing screens, undefined entities) must be fixed before proceeding

## Tech Stack

- React 19 + TypeScript
- Vite 7 (build tool)
- Tailwind CSS 3 + tailwindcss-animate
- Zustand 5 (state management)
- Radix UI (component primitives)
- Monaco Editor (PRD editing)
- Sonner (toast notifications)
- Dexie (IndexedDB wrapper for persistence)
- react-resizable-panels (layout)

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
