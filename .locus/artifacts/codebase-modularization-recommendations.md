# Codebase Modularization Recommendations

**Date**: 2026-02-22
**Status**: Proposal

## Executive Summary

The Locus monorepo is already well-structured with clear package boundaries and consistent patterns. However, as the codebase has grown to ~15,000+ lines across 5 packages and 3 apps, several areas of duplication and coupling have emerged. This document identifies the top modularization opportunities ranked by impact, and provides a concrete roadmap for incremental improvement.

---

## Current Architecture (What's Working Well)

```
@locusai/shared  (types, models, protocol)  ← zero dependencies
    ↑
@locusai/sdk     (AI runners, planning, client)  ← builds on shared
    ↑
@locusai/cli     (terminal commands, REPL, display)  ← uses sdk/node
@locusai/telegram (bot commands, executor, callbacks)  ← uses sdk/node
locusai-vscode   (extension, webview, sessions)  ← uses shared + cli
    ↑
apps/api         (NestJS REST API, PostgreSQL)  ← uses shared
apps/web         (Next.js dashboard)  ← uses shared + sdk
apps/www         (Next.js marketing site)  ← uses shared
```

**Strengths:**
- Unidirectional dependency flow (no cycles)
- `@locusai/shared` is a clean, well-organized type foundation (~2,400 lines)
- API follows NestJS module-per-feature pattern consistently
- SDK has clean browser/Node.js separation via dual entry points
- Barrel exports throughout

---

## Problem Areas

### 1. CLI ↔ Telegram Command Duplication (HIGH IMPACT)

The CLI and Telegram packages both implement very similar command logic independently:

| Command | CLI (LOC) | Telegram (LOC) | Duplication |
|---------|-----------|-----------------|-------------|
| discuss | 527 | 481 | ~60% shared logic |
| plan | 513 | ~400 | ~50% shared logic |
| artifacts | 302 | 272 | ~55% shared logic |
| config | 299 | 328 | ~40% shared logic |
| run | 137 | ~150 | ~45% shared logic |
| review | 233 | ~180 | ~50% shared logic |
| exec | 326 | ~120 | ~30% shared logic |

Both packages independently:
- Parse arguments and resolve config
- Initialize `AiRunner`, `DiscussionFacilitator`, `PlanManager`
- Implement the same business workflows
- Format output (differently for terminal vs Telegram)

**The core workflow logic is identical** — only the I/O layer differs.

### 2. Configuration Scattered Across 5+ Locations

Configuration resolution is implemented independently in:
- `packages/cli/src/config-manager.ts` (410 lines)
- `packages/cli/src/settings-manager.ts` (63 lines)
- `packages/telegram/src/config.ts` (107 lines)
- `packages/sdk/src/core/config.ts`
- `apps/api/src/config/config.service.ts` (NestJS-specific)

Each has its own schema, defaults, and resolution logic.

### 3. Large Files That Mix Concerns

Several files exceed 400 lines by mixing orchestration, I/O, and formatting:

| File | LOC | Concerns Mixed |
|------|-----|----------------|
| `cli/display/progress-renderer.ts` | 553 | Spinner animation + tool icons + ANSI helpers |
| `cli/commands/discuss.ts` | 527 | REPL loop + discussion state + insight extraction + formatting |
| `cli/commands/plan.ts` | 513 | Sub-commands + workflow orchestration + formatting |
| `telegram/command-whitelist.ts` | 494 | Validation patterns + command parsing + error messages |
| `sdk/ai/claude-runner.ts` | 587 | Process spawning + streaming + parsing + error handling |
| `vscode/core/chat-controller.ts` | 549 | Session management + message routing + state machine |

### 4. SDK Is a "Kitchen Sink"

The SDK currently contains:
- API client modules (`modules/`)
- AI provider runners (`ai/`)
- Agent orchestration (`agent/`, `orchestrator/`)
- Sprint planning agents (`planning/`)
- Discussion facilitation (`discussion/`)
- Codebase indexing (`core/indexer.ts`)
- Prompt construction (`core/prompt-builder.ts`)
- Git operations (`agent/git-*.ts`)
- Utilities (`utils/`)

This makes it a large, hard-to-navigate package where browser-safe client code coexists with Node.js-only agent infrastructure.

---

## Recommendations (Ordered by Impact)

### Phase 1: Extract Shared Command Logic (HIGH IMPACT, MEDIUM EFFORT)

**Create `packages/commands/` — a headless command library**

Extract the business logic from CLI and Telegram commands into a shared, I/O-agnostic command layer:

```
packages/commands/
├── src/
│   ├── discuss.ts      # Discussion workflow (start, continue, end, summarize)
│   ├── plan.ts         # Planning workflow (create, list, approve, reject)
│   ├── run.ts          # Agent execution workflow
│   ├── review.ts       # Code review workflow
│   ├── artifacts.ts    # Artifact listing/management
│   ├── exec.ts         # Single prompt execution
│   ├── config.ts       # Config resolution & validation
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Pattern: Adapter-based I/O**

Each command function accepts an I/O adapter, making the core logic testable and reusable:

```typescript
// packages/commands/src/discuss.ts
export interface DiscussIO {
  send(message: string): Promise<void>;
  prompt(question: string): Promise<string>;
  showProgress(label: string): () => void;  // returns stop function
}

export interface DiscussContext {
  projectPath: string;
  provider: string;
  model?: string;
  apiKey: string;
  workspaceId?: string;
}

export async function startDiscussion(
  topic: string,
  ctx: DiscussContext,
  io: DiscussIO
): Promise<Discussion> {
  // Core business logic — no terminal or Telegram specifics
}

export async function continueDiscussion(...): Promise<void> { }
export async function endDiscussion(...): Promise<DiscussionSummary> { }
```

Then CLI and Telegram become thin adapters:

```typescript
// packages/cli/src/commands/discuss.ts (becomes ~100 lines)
import { startDiscussion, DiscussIO } from "@locusai/commands";

const cliIO: DiscussIO = {
  send: (msg) => process.stdout.write(renderMarkdown(msg)),
  prompt: (q) => inputHandler.readline(q),
  showProgress: (label) => spinner.start(label),
};
await startDiscussion(topic, ctx, cliIO);

// packages/telegram/src/commands/discuss.ts (becomes ~80 lines)
const telegramIO: DiscussIO = {
  send: (msg) => ctx.reply(escapeHtml(msg), { parse_mode: "HTML" }),
  prompt: () => waitForNextMessage(ctx),
  showProgress: (label) => ctx.reply(`${label}...`),
};
await startDiscussion(topic, ctx, telegramIO);
```

**Impact**: Eliminates ~2,000 lines of duplication. New clients (Discord bot, Slack bot, web terminal) get commands for free.

### Phase 2: Split the SDK (MEDIUM IMPACT, MEDIUM EFFORT)

The SDK currently serves two very different audiences. Split it into focused packages:

```
packages/sdk/         → @locusai/sdk        (browser-safe API client)
  ├── client.ts       # LocusClient
  ├── modules/        # tasks, sprints, docs, workspaces, etc.
  └── events.ts       # EventEmitter patterns

packages/agent/       → @locusai/agent       (Node.js agent infrastructure)
  ├── ai/            # Claude runner, Codex runner, AI factory
  ├── orchestrator/  # Agent orchestration
  ├── worker/        # Worker threads
  ├── git/           # Git operations
  ├── exec/          # Execution sessions, streaming
  └── core/          # Indexer, prompt builder

packages/planning/    → @locusai/planning    (Sprint planning system)
  ├── agents/        # Architect, tech-lead, planner, sprint-organizer
  ├── meeting.ts     # Planning meeting orchestration
  └── manager.ts     # Plan management
```

**Why**:
- `@locusai/sdk` stays small and browser-safe (~800 lines)
- `@locusai/agent` is clearly Node.js infrastructure
- `@locusai/planning` is a self-contained domain that's only used by CLI and Telegram
- Each package has a single, clear responsibility

**Dependency flow stays clean**:
```
@locusai/shared → @locusai/sdk → @locusai/agent → @locusai/planning
                                                  → @locusai/commands
```

### Phase 3: Centralize Configuration (MEDIUM IMPACT, LOW EFFORT)

Create a unified configuration layer in shared or a new micro-package:

```typescript
// packages/shared/src/config/schema.ts
export const LocusConfigSchema = z.object({
  apiKey: z.string().optional(),
  apiBase: z.string().default("https://api.locusai.dev/api"),
  workspaceId: z.string().uuid().optional(),
  provider: z.enum(["claude", "codex"]).default("claude"),
  model: z.string().optional(),
  projectPath: z.string(),
});

// packages/shared/src/config/resolver.ts
export function resolveConfig(overrides?: Partial<LocusConfig>): LocusConfig {
  // 1. Read .locus/settings.json
  // 2. Merge environment variables
  // 3. Apply overrides
  // 4. Validate with schema
}
```

**Impact**: Single source of truth for config shape and resolution. CLI, Telegram, and SDK all use the same resolver.

### Phase 4: Break Down Large Files (LOW IMPACT, LOW EFFORT)

These are incremental improvements within existing packages:

#### progress-renderer.ts (553 lines) → 3 files
```
display/
├── progress-renderer.ts  (~250 lines, orchestration)
├── tool-icons.ts          (~100 lines, icon/label constants)
└── spinner.ts             (~150 lines, animation logic)
```

#### claude-runner.ts (587 lines) → 2-3 files
```
ai/
├── claude-runner.ts       (~300 lines, process management + streaming)
├── claude-parser.ts       (~150 lines, output parsing + extraction)
└── claude-config.ts       (~100 lines, model configs + defaults)
```

#### chat-controller.ts (549 lines) → 2 files
```
core/
├── chat-controller.ts     (~300 lines, message routing + rendering)
└── session-lifecycle.ts   (~200 lines, session state management)
```

#### command-whitelist.ts (494 lines) → 2 files
```
security/
├── command-validator.ts   (~250 lines, validation logic)
└── whitelist-rules.ts     (~200 lines, pattern definitions)
```

---

## Recommended Execution Order

```
Phase 1: Extract @locusai/commands        ← Biggest bang for buck
  └── Week 1-2: discuss, plan, run commands
  └── Week 2-3: review, artifacts, exec, config commands
  └── Week 3: Refactor CLI + Telegram to use adapters

Phase 2: Split SDK                         ← Improves navigability
  └── Week 4: Extract @locusai/agent
  └── Week 5: Extract @locusai/planning
  └── Week 5: Update all imports

Phase 3: Centralize Config                 ← Quick win
  └── Week 6: Config schema + resolver in shared
  └── Week 6: Migrate CLI, Telegram, SDK

Phase 4: File-level Splits                 ← Do as you touch files
  └── Ongoing: Break down large files when modifying them
```

---

## What NOT to Do

1. **Don't create `@locusai/ui`** — web components are app-specific and not shared between apps/web and apps/www. Extracting them adds complexity without reducing duplication.

2. **Don't create `@locusai/hooks`** — React hooks are tightly coupled to the web app's data model and query patterns. They're not reusable outside apps/web.

3. **Don't create `@locusai/testing`** — Test utilities are minimal and specific to each package's framework (Jest for API, Bun test for CLI/SDK).

4. **Don't restructure apps/api** — It already follows NestJS best practices with module-per-feature. Its architecture is mature and consistent.

5. **Don't restructure apps/web** — It follows Next.js App Router conventions with clean component/hook organization. No changes needed.

6. **Don't over-abstract** — Three similar lines of code is better than a premature abstraction. Only extract when there's genuine duplication across package boundaries.

---

## Updated Dependency Graph (Post-Modularization)

```
@locusai/shared         (types, models, protocol, config schema)
    ↑
@locusai/sdk            (browser-safe API client only)
    ↑
@locusai/agent          (AI runners, orchestrator, git, exec)
    ↑
@locusai/planning       (sprint planning agents & meetings)
@locusai/commands       (headless command workflows)
    ↑
@locusai/cli            (thin terminal adapter)
@locusai/telegram       (thin Telegram adapter)
locusai-vscode          (VS Code extension)

apps/api                (NestJS backend, unchanged)
apps/web                (Next.js dashboard, unchanged)
apps/www                (Next.js marketing, unchanged)
```

## Metrics to Track

| Metric | Current | Target (Post Phase 1-2) |
|--------|---------|-------------------------|
| CLI command avg LOC | ~250 | ~100 (adapter only) |
| Telegram command avg LOC | ~200 | ~80 (adapter only) |
| SDK package size | ~3,500 LOC | ~800 LOC (client only) |
| New client onboarding effort | ~2 weeks | ~3 days (implement IO adapter) |
| Cross-package duplication | ~2,000 LOC | ~200 LOC |

---

## Summary

The highest-value change is **Phase 1: extracting a shared commands package**. It addresses the most visible pain point (CLI/Telegram duplication), makes the codebase more testable, and sets up a clean pattern for any future client (Discord, Slack, web terminal). Everything else is incremental improvement that can be done opportunistically.
