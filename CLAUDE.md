# CLAUDE.md — Locus AI

## Project Overview

Locus is a **GitHub-native AI engineering CLI** that turns GitHub issues into shipped code. It plans sprints, executes tasks with AI agents (Claude Code, OpenAI Codex), and iterates on feedback — all using GitHub as the backend. No external databases, no dashboards, no vendor lock-in.

- **Version**: 0.21.6 (early alpha — expect breaking changes)
- **License**: MIT
- **Docs**: docs.locusai.dev
- **Repository**: asgarovf/locusai

## Monorepo Structure

```
locusai/
├── packages/
│   ├── cli/          # @locusai/cli — Main CLI application (Node.js >=18)
│   └── sdk/          # @locusai/sdk — SDK for community packages (ESM + CJS)
├── apps/
│   └── www/          # @locusai/www — Marketing website (Next.js 15, React 19)
├── docs/             # Markdown documentation source
│   ├── getting-started/   # Installation, quickstart, sandboxing
│   ├── concepts/          # Architecture deep-dives
│   └── cli/               # CLI command reference
├── .locus/           # Project config, agent instructions, learnings
├── .github/          # CI workflows, PR template
├── .changeset/       # Changesets versioning config
└── .claude/          # Claude Code settings and skills
```

### packages/cli (`@locusai/cli`)

The core CLI. Zero runtime dependencies — only Node.js built-ins.

```
src/
├── cli.ts              # Entry point, command router, arg parser
├── types.ts            # All type definitions (interfaces, unions, labels)
├── commands/           # 19 command implementations
│   ├── run.ts          # Sprint/parallel task execution
│   ├── plan.ts         # AI-powered sprint planning
│   ├── issue.ts        # GitHub issue management
│   ├── sprint.ts       # Sprint lifecycle
│   ├── exec.ts         # Interactive REPL / one-shot execution
│   ├── review.ts       # AI code review on PRs
│   ├── iterate.ts      # Re-execute with PR feedback context
│   ├── discuss.ts      # AI architectural discussions
│   ├── sandbox.ts      # Docker sandbox management
│   ├── install.ts      # Community package installation
│   └── ...
├── ai/                 # AI provider integrations
│   ├── claude.ts       # Claude Code runner
│   ├── codex.ts        # OpenAI Codex runner
│   ├── claude-sandbox.ts / codex-sandbox.ts  # Sandboxed variants
│   ├── run-ai.ts       # Unified AI dispatch
│   └── runner.ts       # AgentRunner interface
├── core/               # Core business logic
│   ├── agent.ts        # Agent execution orchestration
│   ├── github.ts       # GitHub API wrapper (gh CLI)
│   ├── config.ts       # Config loading/saving/merging
│   ├── sandbox.ts      # Docker sandbox management
│   ├── worktree.ts     # Git worktree parallel execution
│   ├── logger.ts       # NDJSON + terminal logging with secret redaction
│   ├── context.ts      # Repo detection (remote parsing, branch info)
│   ├── rate-limiter.ts # GitHub API rate limiting
│   └── ...
├── display/            # Terminal rendering
│   ├── terminal.ts     # ANSI colors, box drawing
│   ├── progress.ts     # Progress indicators
│   ├── stream-renderer.ts / diff-renderer.ts / tool-renderer.ts
│   └── ...
├── repl/               # Interactive REPL
│   ├── repl.ts         # Main REPL loop
│   ├── input-handler.ts / commands.ts / completions.ts
│   └── ...
└── __tests__/          # Test suite
```

### packages/sdk (`@locusai/sdk`)

SDK for building Locus-compatible community packages. Dual output (ESM + CJS).

Key exports: `readLocusConfig`, `invokeLocus`, `invokeLocusStream`, `createLogger`
Key types: `LocusConfig`, `LocusPackageManifest`, `AIProvider`, `LocusLogger`

### apps/www (`@locusai/www`)

Next.js 15 marketing website with React 19, Tailwind CSS 4, Framer Motion, Radix UI.
Uses App Router. Dev server runs on port 3001.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+, Bun 1.2.4 |
| Language | TypeScript 5.8.3 (strict mode) |
| Package Manager | Bun (workspaces) |
| Linter/Formatter | Biome 2.3.11 |
| Test Framework | Bun test (`bun test`) |
| Frontend | React 19, Next.js 15, Tailwind CSS 4, Framer Motion |
| UI Primitives | Radix UI, Lucide React icons |
| Versioning | Changesets |
| CI | GitHub Actions |
| Deployment | Vercel (www), NPM (packages) |
| AI Providers | Claude Code, OpenAI Codex |

## Common Commands

```bash
# Development
bun install                    # Install dependencies
bun run simulate <command>     # Run CLI from source (dev mode)
bun run simulate init          # Example: init in test project

# Quality
bun run lint                   # Biome linter (required for PRs)
bun run format                 # Auto-fix formatting + lint
bun run typecheck              # TypeScript type checking
bun test                       # Run test suite

# Build
bun run build:cli              # Full CLI build (sdk + cli)
bun run build:cli-only         # CLI-only build

# Website
cd apps/www && bun run dev     # Dev server on :3001

# Release
bun changeset                  # Create changeset for version bump
bun run version                # Apply changeset versions
bun run release                # Build + publish to NPM
```

### Package-Level Commands

**CLI** (`packages/cli`):
- `bun run build` — Bundle to `bin/locus.js`
- `bun run dev` — Run from source
- `bun test` — Run tests
- `bun run test:watch` — Watch mode
- `bun run test:coverage` — Coverage report

**SDK** (`packages/sdk`):
- `bun run build` — Build ESM + CJS + type declarations
- `bun run clean` — Remove dist + node_modules

**Website** (`apps/www`):
- `bun run dev` — Start dev server (:3001)
- `bun run build` — Production build

## Code Style & Conventions

### Formatting (enforced by Biome)

- **Indentation**: 2 spaces
- **Line width**: 80 characters
- **Line endings**: LF
- **Semicolons**: Always
- **Quotes**: Double quotes
- **Trailing commas**: ES5
- **Arrow parentheses**: Always
- **Bracket spacing**: Yes
- **Import organization**: Automatic (on save via Biome)

### Naming Conventions

- `camelCase` — variables, functions, parameters
- `PascalCase` — interfaces, types, classes, React components
- `kebab-case` — file names (`stream-renderer.ts`, `input-handler.ts`)
- `SCREAMING_SNAKE_CASE` — constants

### TypeScript Rules

- **Strict mode enabled** — no implicit any, strict null checks
- `noExplicitAny: error` — never use `any` (relaxed in test files)
- `noNonNullAssertion: error` — no `!` assertions (relaxed in test files)
- `noUnusedImports: error` / `noUnusedVariables: error`
- Always use `import type` for type-only imports
- Use `.js` extensions in import paths (ESM convention)
- Union types preferred over enums: `type AIProvider = "claude" | "codex"`

### File Organization

Files use ASCII section dividers:
```typescript
// ─── Types ───────────────────────────────────────────────────────────
// ─── Helpers ─────────────────────────────────────────────────────────
// ─── Public API ──────────────────────────────────────────────────────
```

### Code Patterns

- **Options objects** over multiple parameters for function signatures
- **Result objects** (`{ stdout, stderr, exitCode }`) for operations that can fail gracefully
- **Try-catch with typed errors**: cast `unknown` errors with descriptive messages
- **Singleton pattern** for global logger
- **JSDoc with `@example`** on public SDK functions
- **No runtime dependencies** in CLI — only Node.js built-ins

### Testing Patterns

- Tests live in `__tests__/` directories with `.test.ts` suffix
- Framework: `bun:test` (describe/it/expect pattern)
- Use `beforeEach`/`afterEach` for setup and teardown
- Temp files go in `tmpdir()` with unique names (`Date.now()`)
- Always clean up resources (`logger.destroy()`, `rmSync()`)

## Linter Rules (Key Strictness)

Biome enforces these as **errors** (not warnings):
- `noExplicitAny` — use specific types or `unknown`
- `noUnusedImports` / `noUnusedVariables`
- `noNonNullAssertion` — handle nullability properly
- `noUndeclaredVariables`
- `noEmptyBlockStatements`
- `noDebugger`
- `noParameterAssign`
- `noNamespace`

Test file overrides (relaxed): `noExplicitAny: off`, `noNonNullAssertion: off`
Website overrides: `noDangerouslySetInnerHtml: off` (for `apps/www/**/*.tsx`)

## CI/CD & Workflows

### Pull Requests

- Target branch: `master`
- Required checks: `bun run lint`
- PR template at `.github/PULL_REQUEST_TEMPLATE.md`
- Checklist: lint + typecheck + changeset (if releasing)

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lint.yml` | PR to master | Run Biome linter |
| `release.yml` | Manual dispatch | Build + publish to NPM via Changesets |
| `deploy-www.yml` | Manual dispatch | Deploy website to Vercel |
| `publish-vscode.yml` | Manual | Publish VS Code extension |

### Release Process

1. Create changeset: `bun changeset` (choose packages + semver bump)
2. Changesets bot creates "Version Packages" PR on master
3. Merge PR triggers `release.yml` → builds + publishes to NPM

## Key Architecture Decisions

- **GitHub as backend**: All state lives in GitHub (issues, milestones, PRs, labels). No external DB.
- **Zero infrastructure**: Everything runs locally via CLI. No servers or cloud services needed.
- **Unified AI interface**: Abstracted runner interface (`AgentRunner`) supports multiple AI providers.
- **Docker sandboxing**: Agent execution can be isolated in Docker containers. Configured via `.sandboxignore`.
- **Git worktrees**: Parallel task execution uses git worktrees for isolation.
- **NDJSON logging**: Structured logs in newline-delimited JSON with automatic secret redaction.

## Label System

The CLI manages GitHub labels for tracking:

- **Priority**: `p:critical`, `p:high`, `p:medium`, `p:low`
- **Type**: `type:feature`, `type:bug`, `type:chore`, `type:refactor`, `type:docs`
- **Status**: `locus:queued`, `locus:in-progress`, `locus:in-review`, `locus:done`, `locus:failed`
- **Agent**: `agent:managed`

## Project Config

Config files merge with precedence: project (`.locus/config.json`) > global (`~/.locus/config.json`) > defaults.

The `.locus/` directory contains:
- `config.json` — Project settings (auto-detected)
- `LOCUS.md` — Agent instructions and guidelines
- `LEARNINGS.md` — Accumulated project learnings (append-only)
- `plans/` — Planning documents for complex tasks
- `artifacts/` — AI-generated reports and analyses
- `logs/` — Execution logs (NDJSON format)
- `sessions/` — REPL session history
- `worktrees/` — Git worktrees for parallel execution

## Design Principles

1. **GitHub-Native**: All state lives in GitHub. No external databases or APIs.
2. **Zero Infrastructure**: No servers, no accounts, no cloud dashboard. Everything runs locally.
3. **Agent-Centric**: Every feature accessible via CLI commands that AI agents can execute.
4. **Transparent**: Human-readable formats (Markdown/JSON) wherever possible.
5. **Minimal Dependencies**: CLI has zero runtime dependencies.
