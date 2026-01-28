# PRD-to-Tasks: Execution Environment Extension

## Vision

**Turn PRDs into working apps without a programmer.**

A non-technical user inputs a PRD, and the tool generates a functional web application deployed in a cloud environment. Target: low-to-medium complexity internal business apps.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase A: Environment Setup](#phase-a-environment-setup)
4. [Phase B: Task Execution](#phase-b-task-execution)
5. [Phase C: Testing & Completion](#phase-c-testing--completion)
6. [Technical Specifications](#technical-specifications)
7. [UI Design](#ui-design)
8. [Security](#security)
9. [Success Metrics](#success-metrics)

---

## Overview

### What This Is

- Internal tool for building simple CRUD apps from PRDs
- No programming knowledge required
- AI generates all code
- Human reviews and tests

### What This Is NOT

- Not for complex enterprise applications
- Not for apps requiring custom algorithms
- Not a replacement for professional developers on critical systems

### Target Applications

- Inventory management
- Order tracking
- Employee directories
- Simple dashboards
- Internal request forms
- Basic reporting tools

---

## Architecture

### Simple Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRD-to-Tasks (Existing)                      │
│  PRD → Entities → ERD → Tasks                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEW: Phase 5 - Execute                       │
│                                                                 │
│  1. Create Environment (one click)                              │
│     └── Neon DB + GitHub Repo + Gitpod Workspace               │
│                                                                 │
│  2. Execute Tasks (one at a time)                               │
│     └── AI generates code → Review → Push → Test               │
│                                                                 │
│  3. Done                                                        │
│     └── Working app in Gitpod                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack (Fixed - No Options)

| Layer | Technology | Why |
|-------|------------|-----|
| Database | Neon (PostgreSQL) | Free tier, no setup |
| Backend | Express + Prisma | Simple, well-documented |
| Frontend | React + shadcn/ui | Good defaults, looks professional |
| Hosting | Gitpod | Browser-based, no local setup |
| AI | Claude API | Best code generation |

---

## Phase A: Environment Setup

**Goal:** One-click environment creation

**Duration:** 1-2 weeks development

### Features

1. **Settings: API Keys**
   - Neon API key
   - GitHub token
   - Gitpod token
   - (Stored locally, like existing LLM keys)

2. **"Create Environment" Button**
   - Enter project name
   - Click button
   - Wait 1-2 minutes
   - Get links to Neon, GitHub, Gitpod

3. **Scaffold Generation**
   - Generate standard PERN project structure
   - Include Prisma schema from ERD
   - Include basic API routes for each entity
   - Include React pages for each screen

### What Gets Created

```
my-app/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── routes/           # One file per entity
│   │   └── middleware/       # Auth, validation, errors
│   ├── prisma/
│   │   └── schema.prisma     # From your ERD
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/            # One folder per entity
│   │   ├── components/       # Shared UI components
│   │   └── api/              # API client
│   └── package.json
│
├── .gitpod.yml               # Auto-starts servers
└── README.md                 # Setup instructions
```

### User Flow

```
1. User completes Phase 4 (Task Generation)
         │
         ▼
2. User clicks "Create Environment"
         │
         ▼
3. System creates:
   • Neon database
   • GitHub repository with scaffold
   • Gitpod workspace
         │
         ▼
4. User sees "Environment Ready" with links
         │
         ▼
5. User clicks "Open Workspace" → Gitpod opens
```

---

## Phase B: Task Execution

**Goal:** Execute tasks one by one with AI

**Duration:** 2-3 weeks development

### Features

1. **Task Queue**
   - Shows all tasks in order
   - User clicks "Execute" on current task
   - One task at a time (simple)

2. **Execute Task Flow**
   - AI generates code based on task prompt
   - User sees code diff
   - User clicks "Apply" or "Edit"
   - Code pushed to GitHub
   - User pulls changes in Gitpod

3. **Simple Sync**
   - After code push, show instruction: "Click 'Sync' in Gitpod"
   - Or: Add a simple sync button in Gitpod terminal
   - No complex WebSocket agent needed

### Execution Flow

```
User clicks "Execute Task"
         │
         ▼
┌─────────────────────────────┐
│ AI generates code           │
│ (using task prompt)         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Show code diff to user      │
│                             │
│ [Apply] [Edit] [Cancel]     │
└─────────────┬───────────────┘
              │ (Apply)
              ▼
┌─────────────────────────────┐
│ Push to GitHub              │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Show: "Sync your workspace" │
│ [Open Gitpod]               │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ User syncs in Gitpod:       │
│ $ git pull                  │
│ $ npx prisma generate       │
│ (servers auto-restart)      │
└─────────────┬───────────────┘
              │
              ▼
         Task complete
```

### Handling Errors

If code doesn't work:
1. User describes the problem in text box
2. AI regenerates with feedback
3. Maximum 3 attempts
4. If still broken: mark task for "manual help"

---

## Phase C: Testing & Completion

**Goal:** Verify the app works

**Duration:** 1-2 weeks development

### Features (Simple)

1. **Manual Testing Checkpoints**
   - After UI tasks: "Test this screen"
   - User tries it in Gitpod
   - User clicks "Works" or "Needs Fix"

2. **Test Instructions**
   - Generated from acceptance criteria
   - Simple checklist format
   - No automated tests (too complex)

3. **Completion**
   - All tasks marked done
   - App is working in Gitpod
   - User can share Gitpod URL

### Testing Flow

```
UI Task Completed
         │
         ▼
┌─────────────────────────────┐
│ "Please test this screen"   │
│                             │
│ Checklist:                  │
│ □ Page loads                │
│ □ Data displays correctly   │
│ □ Forms submit              │
│ □ Buttons work              │
│                             │
│ [Open Gitpod]               │
│                             │
│ [✓ Works] [✗ Needs Fix]     │
└─────────────────────────────┘
```

If "Needs Fix":
- User describes what's wrong
- Goes back to execution with feedback
- AI tries to fix

---

## Technical Specifications

### New Files

```
src/
├── core/
│   ├── environment/
│   │   ├── index.ts              # Main orchestrator
│   │   ├── neon-client.ts        # Create DB
│   │   ├── github-client.ts      # Create repo, push code
│   │   ├── gitpod-client.ts      # Create workspace
│   │   └── scaffold-generator.ts # Generate project files
│   │
│   └── executor/
│       ├── index.ts              # Task execution
│       ├── code-generator.ts     # Call Claude API
│       └── code-pusher.ts        # Commit to GitHub
│
├── store/
│   ├── integrationStore.ts       # API keys
│   └── environmentStore.ts       # Current environment
│
└── components/
    └── panels/middle/phases/
        └── ExecutionPhase.tsx    # Phase 5 UI
```

### API Integrations

#### Neon (Simple)

```typescript
// Create database
const project = await neon.createProject({ name: projectName });
const connectionString = project.connection_uri;

// That's it - Prisma handles the rest
```

#### GitHub (Simple)

```typescript
// Create repo
const repo = await github.createRepo({ name: projectName, private: true });

// Push files
await github.pushFiles(repo.full_name, scaffoldFiles, 'Initial commit');

// Push task code
await github.pushFiles(repo.full_name, generatedFiles, `Task ${taskId}`);
```

#### Gitpod (Simple)

```typescript
// Open workspace (just a URL)
const workspaceUrl = `https://gitpod.io/#${repo.html_url}`;
window.open(workspaceUrl, '_blank');
```

### Scaffold Generator

```typescript
function generateScaffold(context: {
  projectName: string;
  entities: Entity[];
  dbml: string;
}): GeneratedFile[] {
  return [
    // Backend
    generatePackageJson('backend', backendDeps),
    generatePrismaSchema(context.dbml),
    generateExpressServer(),
    ...context.entities.map(e => generateEntityRoute(e)),

    // Frontend
    generatePackageJson('frontend', frontendDeps),
    generateAppTsx(context.entities),
    ...context.entities.map(e => generateEntityPages(e)),

    // Config
    generateGitpodYml(),
    generateEnvExample(),
    generateReadme(context.projectName),
  ];
}
```

### Code Generator (Claude)

```typescript
async function generateCode(task: Task, context: string): Promise<GeneratedFile[]> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: CODE_GENERATION_PROMPT,
    messages: [{
      role: 'user',
      content: `
Context:
${context}

Task:
${task.prompt}

Generate the code files needed. Return as JSON:
{ "files": [{ "path": "...", "content": "..." }] }
`
    }]
  });

  return parseGeneratedFiles(response);
}
```

---

## UI Design

### Phase 5: Execute

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: Execute                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Environment                              [Create New]   │   │
│  │                                                          │   │
│  │  Status: ● Ready                                         │   │
│  │                                                          │   │
│  │  [Open Database]  [Open Repository]  [Open Workspace]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tasks                                    12/35 done     │   │
│  │                                                          │   │
│  │  ✓ DB-001  Create users table                           │   │
│  │  ✓ DB-002  Create orders table                          │   │
│  │  ✓ API-001 Users CRUD                                   │   │
│  │  ► API-002 Orders CRUD              [Execute]           │   │
│  │  ○ UI-001  User list screen                             │   │
│  │  ○ UI-002  Order form                                   │   │
│  │  ...                                                     │   │
│  │                                                          │   │
│  │  ✓ Done  ► Current  ○ Pending                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Execute Task Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Execute: API-002 Orders CRUD                          [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Status: Generating code...                                     │
│  ████████████░░░░░░░░  60%                                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Generated Files:                                               │
│                                                                 │
│  + backend/src/routes/orders.routes.ts                         │
│  + backend/src/controllers/orders.controller.ts                │
│  M backend/src/routes/index.ts                                 │
│                                                                 │
│  [View Diff]                                                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│                              [Cancel]  [Apply Changes]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### After Apply - Sync Instructions

```
┌─────────────────────────────────────────────────────────────────┐
│  Code Pushed Successfully                              [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓ Changes pushed to GitHub                                     │
│                                                                 │
│  Next: Sync your Gitpod workspace                              │
│                                                                 │
│  1. Open your Gitpod workspace                                 │
│  2. In the terminal, run:                                      │
│                                                                 │
│     git pull && npx prisma generate                            │
│                                                                 │
│  3. The servers will restart automatically                     │
│                                                                 │
│  [Open Workspace]                      [Mark Task Complete]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Testing Checkpoint

```
┌─────────────────────────────────────────────────────────────────┐
│  Test: UI-001 User List Screen                         [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Please test the user list screen in your workspace.           │
│                                                                 │
│  Checklist:                                                     │
│  □ Navigate to /users                                          │
│  □ List shows all users                                        │
│  □ Click user row → goes to detail                             │
│  □ Search works                                                │
│  □ Pagination works                                            │
│                                                                 │
│  [Open Workspace]                                               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Does it work?                                                  │
│                                                                 │
│  [✓ Yes, Continue]              [✗ No, Needs Fix]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Needs Fix Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Report Issue: UI-001                                  [X]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What's not working?                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ The search box doesn't filter anything. When I type     │   │
│  │ a name, the list stays the same.                        │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Attempt: 1 of 3                                               │
│                                                                 │
│                              [Cancel]  [Submit & Retry]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security

### API Key Storage

- Stored in browser (IndexedDB), like existing LLM keys
- Never sent to our servers
- User responsible for their own keys

### Generated Code Security

- Basic input validation included
- Prisma prevents SQL injection
- React prevents XSS by default
- No authentication by default (internal tool)

### Gitpod Security

- Workspaces are private by default
- User controls access
- Data stays in user's accounts (Neon, GitHub)

---

## Success Metrics

### Phase A
- [ ] Environment created in < 2 minutes
- [ ] Scaffold compiles without errors
- [ ] Gitpod workspace starts successfully

### Phase B
- [ ] 70% of tasks work on first attempt
- [ ] User can complete task in < 5 minutes average
- [ ] Retry fixes issue 80% of the time

### Phase C
- [ ] User completes testing in < 30 minutes
- [ ] Working app at end of process
- [ ] User satisfaction > 4/5

### Key Metric: Completion Rate

**How many users who start actually finish with a working app?**

Target: > 60% completion rate

---

## What We're NOT Building

To stay focused, we explicitly exclude:

- ❌ Automated E2E tests (Playwright) - manual testing is enough
- ❌ Database branching - too complex for target users
- ❌ Real-time sync agent - simple git pull is fine
- ❌ Multiple tech stack options - one stack only
- ❌ Feature flags - not needed
- ❌ Gantt charts / analytics - simple checklist is enough
- ❌ Authentication system - out of scope for v1
- ❌ Deployment to production - Gitpod is the "deployment"

---

## Future Considerations (v2+)

If v1 succeeds, consider adding:

- Simple authentication (magic link)
- Export to Vercel/Railway for "real" hosting
- More complex workflows (approval chains, notifications)
- Team collaboration features

---

## Implementation Order

1. **Week 1-2:** Settings UI for API keys + connection testing
2. **Week 2-3:** Scaffold generator + Neon/GitHub integration
3. **Week 3-4:** Environment creation flow
4. **Week 4-5:** Task execution with Claude
5. **Week 5-6:** Code diff view + push to GitHub
6. **Week 6-7:** Testing checkpoints + retry flow
7. **Week 7-8:** Polish, error handling, documentation

**Total: ~8 weeks** to MVP

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-26 | Claude | Initial comprehensive plan |
| 1.1 | 2025-01-26 | Claude | Added Hybrid Architecture |
| 1.2 | 2025-01-26 | Claude | Added feedback improvements |
| 2.0 | 2025-01-26 | Claude | **Major simplification** - removed over-engineering, focused on non-programmer users |

---

*End of Planning Document*
