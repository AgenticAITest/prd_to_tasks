# Copilot / AI Agent Instructions — PRD-to-Tasks

Goal: Help an AI coding agent get productive quickly in this repository by summarizing the "big picture", important workflows, repository-specific conventions, and concrete code examples to follow.

## Quick start (commands)
- Dev: `npm run dev` (starts Vite dev server)
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Preview build: `npm run preview`
- Lint: `npm run lint` (ESLint)

No test script exists; add tests under `src/` and a `test` script if needed.

## Big picture (what the app does)
- SPA (React + TypeScript + Vite) that converts PRD markdown into structured data, ERD (DBML), and a fully-expanded task set.
- Local-first architecture: state stored with Zustand (some stores persisted), and long-lived project data in IndexedDB (Dexie).
- AI/LLM is central: a tiered LLM router (`src/core/llm/LLMRouter.ts`) routes calls to provider adapters (`src/core/llm/providers/*`).
- Phase pipeline: 4 sequential phases — PRD Analysis → Entity Extraction → ERD Builder → Task Generation (see `docs/TECHNICAL_ARCHITECTURE.md`).

## Key directories and files (for reference)
- `src/core/` — business logic (parser, analyzer, extractor, generator)
  - `src/core/prd-parser/MarkdownParser.ts` — canonical PRD parsing logic
  - `src/core/llm/LLMRouter.ts` — how LLM calls are routed and retried
  - `src/core/entity-extractor/` — entity inference
  - `src/core/erd-generator/` — DBML generation & validation
  - `src/core/task-generator/` — produces the `TaskSet`
- `src/store/` — Zustand stores (use selectors to avoid over-rendering)
- `src/standards/` — JSON standards (db, api, ui, validation) applied during generation
- `db/` — Dexie DB integration and persistence
- `src/components/` — UI layout (three-column, phases, modals)

## Project-specific conventions & patterns (follow these)
- Types & strictness: TypeScript with `strict` set. Always type function returns and prefer interfaces for objects (see `src/types/`).
- Stores: Use Zustand selectors (e.g., `useEntityStore(s => s.entities)`) to minimize re-renders.
- Prompt & LLM usage:
  - Prompts live under `src/core/llm/prompts/` and can be overridden by settings stored in `promptStore`.
  - LLMRouter expects a `modelSelection` and `apiKeys` configuration; missing API keys should raise clear errors (see `getLLMRouter` behavior).
- DBML/Monaco: DBML is edited using Monaco (`@monaco-editor/react`) for `erd` screens — preserve code formatting and DBML validity when modifying.
- Standards are authoritative: Naming and generation must respect JSON standards in `src/standards/*`.

## Integration & secrets
- External LLM providers supported: Anthropic, Google, DeepSeek, OpenAI, OpenRouter via provider adapters in `src/core/llm/providers/`.
- API keys are handled in `settingsStore` (persisted locally) and referenced by `LLMRouter` at runtime. Environment variables `VITE_*` are optionally supported for initial configuration.
- All external calls are made client-side; watch for rate-limit & privacy implications when adding telemetry or server-side calls.

## Tests & edge cases to look for
- There are no tests today — prioritize unit tests for core modules: `MarkdownParser`, `semantic-analyzer`, `ai-extractor`, `erd-generator`, and `task-generator`.
- Typical failure modes: malformed PRD markdown (unclosed code blocks / tables), unsupported DB relationship patterns, missing API keys or disabled tiers in model selection.

## Example snippets (how to interact with core pieces)
- Parse markdown: `import { markdownParser } from 'src/core/prd-parser/MarkdownParser'; const parsed = markdownParser.parse(markdownText);`
- Call LLM with retry: `getLLMRouter(cfg).callWithRetry('prdAnalysis', systemPrompt, userPrompt)` (observe abort signal handling).
- Update global router config: `updateLLMRouter(config)` to change keys/models at runtime.

## What NOT to change lightly
- `src/standards/*` JSON files — they drive naming, types, and generation rules across the pipeline.
- Contract files / types in `src/types/` — changing these requires updating many modules and tests.
- DB schema generation flow in `src/core/erd-generator/` — migrations and validation are brittle to silent changes.

## When to ask maintainers (be explicit)
- Before adding a new external LLM provider or changing model selection defaults.
- When changing the persistence strategy (e.g., moving from IndexedDB to remote storage).
- When adding CI or build steps that require secrets or external services.

---
If you'd like, I can tune this further (shorter, or more focused on LLM prompt editing, DBML generation, or tests). Any sections unclear or missing examples you want added?