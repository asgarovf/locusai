# Locus V3 — GitHub-Native Architecture Plan

**Date:** 2026-02-23
**Status:** Approved — All questions resolved, ready for Phase 1

## Goal

Rebuild Locus from scratch as a single, lightweight CLI package that uses **GitHub as the entire backend**. No custom API, no workspace management, no database. Just `gh` CLI + AI agents. The tool helps developers manage issues, organize them into sprints, execute them with AI agents, and run them in parallel using git worktrees.

**Why pivot?** The current architecture requires a custom backend (NestJS + PostgreSQL), workspace management, API keys, and significant infrastructure. GitHub already provides issues, milestones, projects, labels, and PRs — everything needed to manage engineering work. By building on GitHub natively, we eliminate all infrastructure, simplify auth to a single token, and give users a tool that enhances their existing workflow instead of replacing it.

---

## Core Principles

1. **GitHub IS the backend** — Issues are tasks, Milestones are sprints, Labels are metadata, PRs are deliverables
2. **Zero infrastructure** — No server, no database, no API to host
3. **Single auth** — GitHub token (via `gh auth login`) is the only credential
4. **Sprint = sequential, standalone = parallel** — Sprint tasks run in order on a single branch (they affect each other). Non-sprint tasks use worktrees for parallel execution
5. **Recoverable execution** — Every task's state is tracked on GitHub. Failed runs can be retried without re-executing completed tasks
6. **Feedback-driven iteration** — PR review comments feed back into agent re-execution until the PR is merged
7. **AI-agnostic** — Support Claude, Codex, or any future provider
8. **Convention over configuration** — Sensible defaults, minimal setup

---

## Data Model (All GitHub-Native)

```
GitHub Issue          = Task / Work Item
GitHub Milestone      = Sprint (time-boxed collection of issues)
GitHub Labels         = Metadata (priority, type, status, agent-managed)
GitHub PR             = Deliverable (linked to issue via "Closes #N")
Git Worktree          = Isolated execution environment for parallel work
```

### Label Schema

Created automatically during `locus init`:

| Category | Labels | Color |
|----------|--------|-------|
| Priority | `p:critical`, `p:high`, `p:medium`, `p:low` | Red shades |
| Type | `type:feature`, `type:bug`, `type:chore`, `type:refactor`, `type:docs` | Blue shades |
| Status | `locus:queued`, `locus:in-progress`, `locus:in-review`, `locus:done`, `locus:failed` | Green shades (`failed` = red) |
| Order | `order:1`, `order:2`, ... `order:N` (created dynamically) | Grey shades |
| Agent | `agent:managed` | Purple |

> **Status labels** (`locus:*`) are managed by the agent during execution. The `agent:managed` label marks issues created or claimed by Locus.
>
> **Order labels** (`order:N`) define execution sequence within a sprint. Set during `locus plan` or manually via `locus sprint order`. These are critical for sprint recovery — if execution fails at task #3, we know to resume from #3.
>
> **`locus:failed`** marks tasks whose execution failed (crash, API limits, etc.). The `locus run` command automatically retries failed tasks before continuing.

### Order Label Management (Dynamic, Logically Constrained)

Order labels (`order:N`) are created **dynamically** on GitHub as needed — no pre-created cap. When `locus plan` creates 5 issues, it creates `order:1` through `order:5`. When a new task is added later, it creates `order:6`. Labels are created via `gh label create` if they don't already exist.

**Core Rule: Completed task orders are frozen. Reordering only affects non-completed tasks, and their new orders always start after the highest completed order.**

#### How Reordering Works

```
Example: Sprint with 8 tasks, tasks 1-5 completed, tasks 6-8 pending.

Current state:
  order:1  #10 "Set up auth middleware"      locus:done    ← FROZEN
  order:2  #11 "Create user model"           locus:done    ← FROZEN
  order:3  #12 "Add login endpoints"         locus:done    ← FROZEN
  order:4  #13 "Add OAuth integration"       locus:done    ← FROZEN
  order:5  #14 "Write auth tests"            locus:done    ← FROZEN
  order:6  #15 "Add rate limiting"           locus:queued  ← Can reorder
  order:7  #16 "Add password reset"          locus:queued  ← Can reorder
  order:8  #17 "Add 2FA support"             locus:queued  ← Can reorder

User runs: locus sprint order "Sprint 1" 17 15 16
(Wants 2FA first, then rate limiting, then password reset)

Result:
  order:1-5 → unchanged (completed tasks frozen)
  order:6  #17 "Add 2FA support"             locus:queued  ← Was order:8
  order:7  #15 "Add rate limiting"           locus:queued  ← Was order:6
  order:8  #16 "Add password reset"          locus:queued  ← Was order:7
```

#### Reorder Algorithm

```
1. Fetch all sprint issues
2. Partition into:
   - completed = issues with locus:done (order frozen, untouched)
   - reorderable = issues with locus:queued, locus:failed, or no locus status
3. Determine floor: max_completed_order = max(order:N for all completed issues)
   - If no completed tasks: floor = 0
4. Validate user's reorder input:
   - Must contain exactly the reorderable issue numbers (no completed ones)
   - Error if user tries to include a completed issue
5. Assign new order labels:
   - First reorderable issue → order:{floor + 1}
   - Second → order:{floor + 2}
   - ... and so on
6. For each reorderable issue:
   - Remove old order:N label
   - Add new order:N label (create label on GitHub if it doesn't exist)
```

#### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Adding a new task to a sprint | Gets `order:{max_current + 1}` automatically |
| Removing a task from sprint | Its `order:N` label is removed. No renumbering (gaps are OK — execution sorts by N numerically) |
| All tasks completed | `locus sprint order` says "All tasks completed, nothing to reorder" |
| Failed task reorder | Failed tasks ARE reorderable (they haven't succeeded yet). They keep their `locus:failed` label; order changes only |
| Task retried via `--resume` | Retries in current order position. If user wants it elsewhere, reorder first, then resume |
| Sprint with gaps (e.g., order 1,2,5,8) | Works fine — execution sorts numerically, gaps are ignored |

#### Why This Approach

- **Logical**: A completed task at position 3 stays at position 3 forever. You never see a "done" task at order:7 with a "queued" task at order:2.
- **Recoverable**: If execution fails at order:5, resuming always starts from order:5. Reordering pending tasks (6+) doesn't confuse the resume logic.
- **Simple on GitHub**: Anyone looking at the repo labels can immediately understand the execution sequence — lower numbers ran first, higher numbers run next.
- **No renumbering churn**: Completed tasks never get label changes. Only pending tasks get relabeled during reorder, minimizing GitHub API calls.

---

## Directory Structure (Single Package)

```
locus-v3/
├── src/
│   ├── cli.ts                  # Entry point, command router
│   ├── commands/
│   │   ├── __tests__/
│   │   │   ├── init.test.ts
│   │   │   ├── issue.test.ts
│   │   │   ├── sprint.test.ts
│   │   │   ├── run.test.ts
│   │   │   ├── exec.test.ts
│   │   │   ├── review.test.ts
│   │   │   └── iterate.test.ts
│   │   ├── init.ts             # Project initialization
│   │   ├── issue.ts            # Issue management (CRUD)
│   │   ├── sprint.ts           # Sprint/milestone management
│   │   ├── plan.ts             # AI-powered sprint planning
│   │   ├── run.ts              # Execute issues (sequential or parallel)
│   │   ├── iterate.ts          # Re-execute tasks with PR feedback
│   │   ├── exec.ts             # Interactive REPL / one-shot prompt entry point
│   │   ├── review.ts           # AI code review on PRs
│   │   ├── discuss.ts          # AI discussions (local)
│   │   ├── status.ts           # Dashboard view of current state
│   │   ├── config.ts           # Settings management
│   │   ├── logs.ts             # View/tail/clean execution logs
│   │   └── upgrade.ts          # Self-upgrade & version management
│   ├── core/
│   │   ├── __tests__/
│   │   │   ├── github.test.ts
│   │   │   ├── config.test.ts
│   │   │   ├── context.test.ts
│   │   │   ├── worktree.test.ts
│   │   │   ├── run-state.test.ts
│   │   │   ├── prompt-builder.test.ts
│   │   │   ├── agent.test.ts
│   │   │   ├── logger.test.ts
│   │   │   ├── rate-limiter.test.ts
│   │   │   └── conflict.test.ts
│   │   ├── github.ts           # GitHub CLI wrapper (all gh interactions)
│   │   ├── worktree.ts         # Git worktree lifecycle management
│   │   ├── agent.ts            # AI agent execution engine
│   │   ├── prompt-builder.ts   # Context assembly for AI prompts
│   │   ├── run-state.ts        # Execution state persistence & recovery
│   │   ├── config.ts           # Configuration loading/saving
│   │   ├── context.ts          # Repository context detection
│   │   ├── logger.ts           # Structured logging (file + terminal, NDJSON format)
│   │   ├── rate-limiter.ts     # GitHub API rate limit tracking & throttling
│   │   └── conflict.ts         # Merge conflict detection & rebase utilities
│   ├── repl/
│   │   ├── __tests__/
│   │   │   ├── input-history.test.ts
│   │   │   ├── commands.test.ts
│   │   │   ├── completions.test.ts
│   │   │   ├── session-manager.test.ts
│   │   │   └── image-detect.test.ts
│   │   ├── repl.ts             # Main REPL orchestrator (session loop, turn lifecycle)
│   │   ├── input-handler.ts    # Raw-mode input (keybindings, cursor, paste detection)
│   │   ├── input-history.ts    # Persistent cross-session input history (Up/Down)
│   │   ├── commands.ts         # Slash commands (/help, /clear, /reset, /diff, /undo, etc.)
│   │   ├── completions.ts      # Tab completion (file paths, slash commands)
│   │   ├── session-manager.ts  # Session CRUD, auto-save, pruning, resume
│   │   └── image-detect.ts     # Image path detection for drag-and-drop
│   ├── ai/
│   │   ├── __tests__/
│   │   │   ├── runner.test.ts
│   │   │   ├── claude.test.ts
│   │   │   └── codex.test.ts
│   │   ├── runner.ts           # AI runner factory (Claude, Codex)
│   │   ├── claude.ts           # Claude Code integration
│   │   └── codex.ts            # Codex CLI integration
│   ├── display/
│   │   ├── __tests__/
│   │   │   ├── stream-renderer.test.ts
│   │   │   ├── tool-renderer.test.ts
│   │   │   ├── diff-renderer.test.ts
│   │   │   ├── json-stream.test.ts
│   │   │   └── terminal.test.ts
│   │   ├── stream-renderer.ts  # Streaming markdown renderer (newline-gated, adaptive pacing)
│   │   ├── tool-renderer.ts    # Tool execution display (compact cards, inline diffs)
│   │   ├── diff-renderer.ts    # Colored unified diff (line numbers, syntax highlighting)
│   │   ├── status-indicator.ts # Animated thinking/working indicator (shimmer effect)
│   │   ├── json-stream.ts      # NDJSON event protocol for VSCode extension
│   │   ├── terminal.ts         # Terminal capabilities, colors, dimensions
│   │   ├── progress.ts         # Progress bars, spinners, elapsed time
│   │   └── table.ts            # Table rendering for lists
│   ├── __tests__/
│   │   ├── test-helpers/
│   │   │   ├── mock-gh.ts      # Mock GitHub CLI (intercepts gh subprocess calls)
│   │   │   ├── mock-fs.ts      # In-memory filesystem for config/session files
│   │   │   ├── mock-runner.ts  # Fake AgentRunner (predetermined results, stream simulation)
│   │   │   └── fixtures.ts     # Reusable test data (issues, milestones, PRs, configs, sessions)
│   │   └── types.test.ts       # Schema validation tests (config, run-state, session schemas)
│   └── types.ts                # All TypeScript types & interfaces
├── bin/
│   └── locus.js                # Built binary entry point
├── package.json
├── tsconfig.json
└── README.md
```

---

## Configuration

### `.locus/` Directory (per-project)

```
.locus/
├── config.json             # Project settings (gitignored: token-related)
├── run-state.json          # Current/last execution state (for recovery)
├── rate-limit.json         # GitHub API rate limit state (persisted between invocations)
├── LOCUS.md                # Agent instructions & project context
├── LEARNINGS.md            # Accumulated lessons
├── sessions/               # REPL session history
├── discussions/            # AI discussion archives
├── artifacts/              # AI-generated knowledge/reports
├── plans/                  # Planning documents
├── logs/                   # Execution logs (NDJSON, auto-pruned: 20 files / 50MB max)
└── worktrees/              # Git worktrees for parallel standalone issues
```

### `config.json` Schema

```jsonc
{
  "$schema": "...",
  "version": "3.0.0",
  "github": {
    "owner": "asgarovf",          // Auto-detected from git remote
    "repo": "my-project",         // Auto-detected from git remote
    "defaultBranch": "main"       // Auto-detected
  },
  "ai": {
    "provider": "claude",         // "claude" | "codex"
    "model": "opus"               // Provider-specific model
  },
  "agent": {
    "maxParallel": 3,             // Max concurrent worktree agents (standalone only)
    "autoLabel": true,            // Auto-manage GitHub labels
    "autoPR": true,               // Auto-create PRs on completion
    "baseBranch": "main",         // Branch to create worktrees/sprint branches from
    "rebaseBeforeTask": true      // Check & rebase base branch before each sprint task (default: true)
  },
  "sprint": {
    "active": "Sprint 1",         // Currently active sprint (set via locus sprint active)
    "stopOnFailure": true         // Stop sprint execution on first failure (default: true)
  },
  "logging": {
    "level": "normal",            // "silent" | "normal" | "verbose" | "debug"
    "maxFiles": 20,               // Max log files before auto-pruning
    "maxTotalSizeMB": 50          // Max total log size before pruning oldest
  }
}
```

> **No API keys stored locally.** GitHub auth is handled by `gh auth login`. AI provider keys use environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) or are read from the provider CLI's own config.

---

## Command Reference

### 1. `locus init`

Initialize Locus in a GitHub repository.

```bash
locus init
```

**Flow:**
1. Check `gh` CLI is installed and authenticated (`gh auth status`)
2. Detect GitHub repo from `git remote` → extract `owner/repo`
3. Detect default branch (`gh repo view --json defaultBranchRef`)
4. Create `.locus/` directory structure
5. Generate `config.json` with detected values
6. Generate `LOCUS.md` (agent instructions template)
7. Generate `LEARNINGS.md` (empty, with format instructions)
8. Create GitHub labels if they don't exist (`gh label create`) — priority, type, status, and agent labels only. Order labels (`order:N`) are created dynamically when sprints are planned.
9. Update `.gitignore` to exclude sensitive `.locus/` files
10. Print success message with next steps

**Idempotent:** Running `init` again updates config without overwriting user content (LOCUS.md, LEARNINGS.md).

---

### 2. `locus issue` (alias: `locus i`)

Manage GitHub issues as work items.

```bash
# Create a new issue
locus issue create "Add user authentication" \
  --body "Implement JWT-based auth with refresh tokens" \
  --priority high \
  --type feature \
  --sprint "Sprint 1"

# List issues (with filters)
locus issue list                          # All open issues
locus issue list --sprint "Sprint 1"     # Issues in a sprint
locus issue list --priority high         # Filter by priority
locus issue list --status queued         # Filter by locus status
locus issue list --mine                  # Assigned to me

# Show issue details
locus issue show 42

# Quick-create from AI analysis
locus issue generate "We need better error handling in the API"
# → AI analyzes codebase, creates multiple structured issues

# Bulk operations
locus issue label 42 43 44 --sprint "Sprint 2"  # Move issues to sprint
locus issue close 42 --reason completed
```

**Implementation:** All operations map to `gh issue create/list/view/edit/close` with label management via `gh issue edit --add-label/--remove-label`.

**Sprint assignment** = Adding issue to a GitHub Milestone:
```bash
gh issue edit <number> --milestone "Sprint 1"
```

---

### 3. `locus sprint` (alias: `locus s`)

Manage sprints via GitHub Milestones.

```bash
# Create a sprint
locus sprint create "Sprint 1" --due "2026-03-07" --description "Auth & onboarding"

# List sprints
locus sprint list                    # All open sprints
locus sprint list --all              # Include closed sprints

# Show sprint details (issues, progress, stats, execution order)
locus sprint show "Sprint 1"

# Set active sprint (stored in config.json)
locus sprint active "Sprint 1"

# Reorder sprint tasks (only affects non-completed tasks)
locus sprint order "Sprint 1"                 # Interactive reorder (shows only pending/failed)
locus sprint order "Sprint 1" 17 15 16        # Explicit order by issue number (pending/failed only)
locus sprint order "Sprint 1" --show          # Show current order with frozen/reorderable status

# Close a sprint
locus sprint close "Sprint 1"
```

**Implementation:** GitHub Milestones API via `gh api`:
```bash
# Create milestone
gh api repos/{owner}/{repo}/milestones -f title="Sprint 1" -f due_on="2026-03-07T00:00:00Z"

# List milestones
gh api repos/{owner}/{repo}/milestones --jq '.[].title'

# Get milestone issues
gh issue list --milestone "Sprint 1"
```

---

### 4. `locus plan`

AI-powered sprint planning that creates GitHub issues.

```bash
# Plan from a high-level description
locus plan "Build a user authentication system with OAuth and JWT"

# Plan from existing issues (re-organize, estimate, prioritize)
locus plan --from-issues --sprint "Sprint 2"

# Plan interactively (AI asks clarifying questions)
locus plan --interactive "Improve API performance"
```

**Flow:**
1. AI reads codebase context (LOCUS.md, LEARNINGS.md, file tree)
2. Analyzes the directive or existing issues
3. Proposes a structured plan with:
   - Task breakdown (each becomes a GitHub issue)
   - **Execution order** (critical — defines which task runs first)
   - Priority assignments
   - Dependency reasoning (why task 2 must come after task 1)
   - Complexity estimates
   - Suggested sprint grouping
4. Presents plan to user for review (**user can reorder before approving**)
5. On approval:
   - Creates GitHub issues with proper labels
   - **Assigns `order:N` labels** (order:1, order:2, ...) to define execution sequence
   - Assigns to milestone if sprint specified
   - Each issue body includes: dependency notes, what prior tasks produce, acceptance criteria
6. Plan saved to `.locus/plans/` for reference

**Output format:**
```
Sprint Plan: "User Authentication"

  Order  Title                              Priority   Type      Depends On
  1      Set up JWT auth middleware          high       feature   —
  2      Create user model & migrations      high       feature   —
  3      Implement login/register endpoints  high       feature   #1, #2
  4      Add OAuth provider integration      medium     feature   #3
  5      Write auth integration tests        medium     chore     #1-#4

Create these 5 issues in sprint "Sprint 3"? (y/n)
Reorder before creating? Enter issue titles by new sequence (e.g., "2,1,3,4,5") or Enter to confirm:
→ Issues will be assigned order:1 through order:5 in the confirmed sequence.
```

**Order labels are the execution contract.** When `locus run` executes a sprint, it sorts issues by `order:N` label and runs them in that exact sequence. This ensures:
- Task #3 can reference code created by tasks #1 and #2
- Recovery works correctly (resume from the right point)
- The user can see execution order on GitHub at a glance

---

### 5. `locus run`

Execute issues using AI agents. This is the core command.

```bash
# Run the active sprint (sequential, no worktrees — tasks affect each other)
locus run

# Run a specific issue (worktree — isolated)
locus run 42

# Run multiple standalone issues in parallel (worktrees)
locus run 42 43 44

# Resume a failed sprint run (skips completed tasks, retries failed)
locus run --resume

# Run with options
locus run 42 --model sonnet --dry-run
```

#### Execution Mode Decision Logic

```
locus run (no args)
  └─ Has active sprint?
       ├─ YES → Sequential mode (no worktrees)
       │         Tasks run in order:N label sequence
       │         Each task builds on previous changes
       │         Single branch: locus/sprint-<name>
       │         One PR per task (linked to issue)
       └─ NO  → Error: "No active sprint. Specify issue numbers or set active sprint"

locus run <numbers...>
  └─ Are these issues in a sprint?
       ├─ ALL in same sprint → Sequential mode (sprint order)
       ├─ NONE in sprint → Parallel mode (worktrees)
       └─ MIXED → Error: "Cannot mix sprint and standalone issues"
```

**Key rule: Sprint tasks NEVER use worktrees.** Sprint tasks are interdependent — task #2 may depend on files created by task #1. They run sequentially on the same branch in order:N sequence.

#### Sprint Mode (Sequential — No Worktrees)

When running a sprint:

```
1. Fetch issues from active sprint milestone
2. Sort by order:N label (order:1, order:2, ..., order:N)
3. Skip issues already marked locus:done (recovery support)
4. Create/checkout branch: locus/sprint-<name>
5. For each issue (in order):
   a. Check if already locus:done → skip
   b. Check if locus:failed → retry from scratch
   c. Add label: locus:in-progress, remove locus:queued / locus:failed
   d. Build prompt with:
      - Issue body + comments (including any PR review feedback)
      - Codebase context, LOCUS.md, LEARNINGS.md
      - Changes from previous tasks in this sprint (git diff from base)
      - PR comments from previous tasks if any exist
   e. Execute AI agent (Claude/Codex)
   f. On SUCCESS:
      - Commit changes: "feat: <issue title> (#<number>)"
      - Push branch
      - Create PR: "Closes #<N>" (one PR per task for reviewability)
      - Update label: locus:in-progress → locus:done
      - Comment on issue with summary of changes
   g. On FAILURE:
      - Update label: locus:in-progress → locus:failed
      - Comment on issue with error details
      - Log failure to .locus/run-state.json
      - STOP sprint execution (next tasks may depend on this one)
      - Print: "Task #N failed. Fix the issue and run `locus run --resume`"
6. When all tasks complete: print summary
```

#### Parallel Mode (Worktrees — Standalone Issues Only)

When running non-sprint issues:

```
1. Verify NONE of the issues are in a sprint
2. For each issue (up to maxParallel):
   a. Create worktree: git worktree add .locus/worktrees/issue-<N> -b locus/issue-<N> <baseBranch>
   b. Spawn agent process in worktree directory
   c. Agent executes:
      - Add label: locus:in-progress
      - Build prompt with full context + issue comments
      - Execute AI agent
      - Commit changes in worktree
      - Push branch
      - Create PR: gh pr create --title "<title>" --body "Closes #<N>"
      - Update label: locus:done
      - Comment on issue with changes summary
   d. On FAILURE:
      - Update label: locus:failed
      - Comment on issue with error details
      - Worktree is NOT cleaned up (preserved for debugging)
   e. On SUCCESS:
      - Clean up worktree: git worktree remove .locus/worktrees/issue-<N>
3. Wait for all agents to complete
4. Report results (success/failure per issue)
5. For failed issues: "Run `locus run <failed-numbers>` to retry"
```

#### Worktree Lifecycle (Standalone Issues Only)

```
                    ┌─────────────┐
                    │  Base Branch │
                    │   (main)     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ Worktree 1 │ │ Worktree 2 │ │ Worktree 3 │
     │ issue-42   │ │ issue-43   │ │ issue-44   │
     │            │ │            │ │            │
     │ Agent ───► │ │ Agent ───► │ │ Agent ───► │
     │ Commits    │ │ Commits    │ │ Commits    │
     │ Push       │ │ Push       │ │ Push       │
     │ PR #42     │ │ PR #43     │ │ PR #44     │
     └────────────┘ └────────────┘ └────────────┘
              │            │            │
              ▼            ▼            ▼
         Cleanup      Cleanup      Cleanup
         (on success) (on success) (on success)
```

**Concurrency control:**
- Default `maxParallel: 3` (configurable)
- Queue remaining issues if more than max
- Each agent runs in its own process (fork/spawn)
- Shared lock on `.locus/run.lock` to prevent overlapping runs

---

### Execution Recovery (`run-state.json`)

Locus persists execution state to `.locus/run-state.json` so runs can be resumed after failures.

```jsonc
{
  "runId": "run-2026-02-23-abc123",
  "type": "sprint",                    // "sprint" | "parallel"
  "sprint": "Sprint 1",               // Only for sprint mode
  "branch": "locus/sprint-sprint-1",  // Only for sprint mode
  "startedAt": "2026-02-23T10:00:00Z",
  "tasks": [
    { "issue": 1, "order": 1, "status": "done", "pr": 10, "completedAt": "..." },
    { "issue": 2, "order": 2, "status": "done", "pr": 11, "completedAt": "..." },
    { "issue": 3, "order": 3, "status": "failed", "error": "API rate limit exceeded", "failedAt": "..." },
    { "issue": 4, "order": 4, "status": "pending" },
    { "issue": 5, "order": 5, "status": "pending" }
  ]
}
```

**`locus run --resume` flow:**
1. Read `.locus/run-state.json`
2. Verify current branch matches (for sprint mode)
3. Cross-reference with GitHub labels (source of truth — in case state file is stale)
4. Skip `done` tasks
5. Retry `failed` tasks from scratch (fresh agent execution, not mid-task resume)
6. Continue with `pending` tasks
7. If no state file exists: "Nothing to resume. Run `locus run` to start."

**GitHub labels are the source of truth.** The `run-state.json` is a convenience cache. If there's a mismatch (e.g., user manually changed a label), GitHub labels win.

---

### 6. `locus exec` (alias: `locus e`)

The **primary interactive interface** for Locus. This is the REPL-first execution command — designed for both manual developer use and programmatic invocation from the VSCode extension. The REPL experience should be on par with Claude Code and Codex CLI.

```bash
# Interactive REPL (default mode — the primary use case)
locus exec
locus exec -i

# Resume a previous session
locus exec -s <session-id>

# One-shot prompt (secondary — less common)
locus exec "Add error handling to the auth middleware"

# Session management
locus exec sessions list
locus exec sessions show <id>
locus exec sessions delete <id>

# JSON stream mode (for VSCode extension)
locus exec --json-stream --session-id <id> -- "prompt here"
```

**No API dependency.** Context comes from:
- Repository file tree
- LOCUS.md instructions
- LEARNINGS.md accumulated knowledge
- Discussion insights (if any)
- Git history (recent commits, branch info)

---

#### REPL Architecture

The REPL is the centerpiece of `locus exec`. It should feel like a polished, production-grade terminal application — not a simple readline loop.

```
┌─────────────────────────────────────────────────────────────┐
│  Locus v3.0.0 • claude/opus • my-project (main)            │
│  Type /help for commands, Ctrl+C to interrupt               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  > Add rate limiting to the API endpoints                   │
│                                                             │
│  ◆ Thinking... (3s)                                         │
│                                                             │
│  I'll add rate limiting using a middleware approach.         │
│  Let me first check the existing middleware structure.       │
│                                                             │
│  ┌─ Read src/middleware/auth.ts (245 lines) ──── 0.2s ──┐  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Edit src/middleware/rate-limit.ts ──── new file ─────┐  │
│  │  + 47 lines                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Edit src/app.ts ──── 2 changes ─────────────────────┐  │
│  │  @@ -12,6 +12,8 @@                                   │  │
│  │    import { authMiddleware } from './middleware/auth'; │  │
│  │  + import { rateLimiter } from './middleware/rate-...  │  │
│  │    ...                                                │  │
│  │  @@ -28,6 +30,7 @@                                   │  │
│  │    app.use(cors());                                   │  │
│  │  + app.use(rateLimiter({ windowMs: 15 * 60 * 1000... │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Bash npm test ─────────────────────────── 4.2s ─────┐  │
│  │  ✓ 42 tests passed                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Done. Added rate limiting middleware (12s, 4 tools, ~2k    │
│  tokens)                                                    │
│                                                             │
│  > _                                                        │
└─────────────────────────────────────────────────────────────┘
```

#### REPL Components

```
src/
├── repl/
│   ├── repl.ts                 # Main REPL orchestrator (session loop)
│   ├── input-handler.ts        # Raw-mode input with rich keybindings
│   ├── input-history.ts        # Persistent cross-session input history
│   ├── commands.ts             # Slash commands (/help, /clear, /reset, etc.)
│   ├── completions.ts          # Tab completion (files, commands, tokens)
│   └── image-detect.ts         # Image path detection for drag-and-drop
├── display/
│   ├── stream-renderer.ts      # Streaming markdown renderer with adaptive pacing
│   ├── tool-renderer.ts        # Tool execution display (compact cards)
│   ├── diff-renderer.ts        # Colored unified diff display
│   ├── status-indicator.ts     # Animated thinking/working indicator
│   ├── terminal.ts             # Terminal formatting, colors, dimensions
│   └── progress.ts             # Progress bars and spinners
```

#### 6a. Streaming Output — Markdown-Aware with Adaptive Pacing

AI text output must be rendered as **markdown** with proper formatting, not raw text dumps. Inspired by Codex CLI's newline-gated rendering and Aider's sliding-window approach.

**Newline-gated rendering:**
- Buffer incoming text deltas until a complete line (`\n`) is received
- Only render complete lines — partial lines stay in buffer
- On stream finalization, flush any remaining partial line
- This prevents flickering and ensures markdown elements (headers, lists, code blocks) render atomically

**Adaptive two-gear pacing (Codex CLI pattern):**
```
Smooth Mode:
  - Drain 1 line per render tick (~16ms / 60fps)
  - Normal typing speed feel
  - Engages when queue is shallow

CatchUp Mode:
  - Batch-drain entire queue at once
  - Engages when queue depth > 8 lines OR oldest line > 120ms old
  - Prevents the output from "falling behind" on fast responses
  - Hysteresis: once in CatchUp, stays until queue empties
```

**Markdown rendering features:**
- **Code blocks**: Syntax-highlighted using ANSI colors (language detection from fence)
- **Inline code**: Dim background or distinct color
- **Headers**: Bold with appropriate sizing
- **Lists**: Proper indentation and bullet rendering
- **Bold/italic**: ANSI bold/italic sequences
- **Links**: Displayed as `text (url)` in terminal
- No external dependencies — pure ANSI escape code rendering

**Sliding window (Aider pattern):**
- Lines that scroll past a configurable window (e.g., 50 lines) become permanent terminal scrollback
- Only the most recent N lines are in the "live" repaintable region
- This ensures terminal scrollback works correctly with long outputs

#### 6b. Tool Execution Display — Compact Cards with Inline Diffs

Every tool invocation gets a **compact card** that shows status, duration, and relevant output summary. This replaces verbose tool logging with a clean, scannable format.

**Tool card format:**
```
┌─ Read src/middleware/auth.ts (245 lines) ──────── 0.2s ──┐
└──────────────────────────────────────────────────────────┘

┌─ Edit src/app.ts ──── 2 changes ────────────────────────┐
│  @@ -12,6 +12,8 @@                                      │
│    import { authMiddleware } from './middleware/auth';    │
│  + import { rateLimiter } from './middleware/rate-limit'; │
│  @@ -28,6 +30,7 @@                                      │
│    app.use(cors());                                      │
│  + app.use(rateLimiter({ windowMs: 15 * 60 * 1000 }));  │
└──────────────────────────────────────────────────────────┘

┌─ Bash npm test ─────────────────────────────── 4.2s ────┐
│  ✓ 42 tests passed                                      │
└──────────────────────────────────────────────────────────┘

┌─ Grep "rateLimiter" src/ ──── 3 matches ────── 0.1s ───┐
└──────────────────────────────────────────────────────────┘
```

**Tool-specific rendering:**

| Tool | Card Shows |
|------|-----------|
| `Read` | File path, line count, offset if partial |
| `Write` | File path, `new file` badge, line count |
| `Edit` | File path, change count, **inline unified diff** (green/red, max 10 lines, expandable) |
| `Bash` | Description or command (truncated), exit code, **output preview** (max 5 lines, head+tail with ellipsis) |
| `Grep` | Pattern, scope, match count |
| `Glob` | Pattern, file count |
| `WebFetch` | URL (truncated), response summary |
| `Task` | Description, agent type, duration |

**Diff rendering for Edit operations:**
```
  @@ -12,6 +12,8 @@
    import { cors } from 'cors';
    import { authMiddleware } from './middleware/auth';
  + import { rateLimiter } from './middleware/rate-limit';
  + import { logger } from './utils/logger';

    const app = express();
```

- Green (`+`) for additions, red (`-`) for deletions
- Line numbers in gutter (right-aligned, dim)
- Context lines (3 above/below each hunk by default)
- Output truncation: max 10 diff lines per tool card. If more, show `+N more lines` with option to expand
- Syntax highlighting within diff hunks (per file extension)

#### 6c. Status Indicator — Shimmer Animation with Context

Replace the simple braille spinner with a visually distinctive status indicator.

**Thinking/Working state:**
```
◆ Thinking... (3s) — esc to interrupt
```

**With context (during tool execution):**
```
◆ Working... (8s) — editing src/app.ts — esc to interrupt
```

**Shimmer effect (true-color terminals):**
- A sweeping gradient highlight that moves across the "Thinking..." text
- 2-second animation period, sinusoidal wave
- Fallback for basic terminals: bold/dim cycling (as current)

**Detection:** Check `$COLORTERM` for `truecolor` or `24bit`. Check `$TERM_PROGRAM` for known true-color terminals (iTerm2, Ghostty, WezTerm, VSCode).

**Always show:**
- Elapsed time (incrementing seconds counter)
- Interrupt hint (`esc to interrupt`)
- Current activity context (which tool is running)

#### 6d. Input Handler — Rich Terminal Input

Build on the current `InputHandler` with significant enhancements.

**Core keybindings (kept from V2):**
- `Enter` → Submit
- `Shift+Enter` / `Alt+Enter` / `Ctrl+J` → Newline
- `Ctrl+C` → Interrupt (during processing) or clear input (at prompt)
- `Ctrl+D` → Exit (on empty input)
- `Backspace` → Delete character
- `Ctrl+U` → Clear entire input
- `Ctrl+W` → Delete last word
- Bracketed paste mode → Multi-line paste

**New keybindings:**
- `Up/Down` → Navigate input history (cross-session persistent)
- `Left/Right` → Move cursor within input (character-level)
- `Home/End` (`Ctrl+A`/`Ctrl+E`) → Jump to start/end of line
- `Ctrl+Left/Right` → Jump by word
- `Tab` → Auto-complete (file paths, slash commands)
- `Ctrl+L` → Clear screen (keep prompt)

**Persistent input history (`input-history.ts`):**
- Stores history in `.locus/sessions/.input-history` (one entry per line, newlines escaped)
- Cross-session persistence — history survives CLI restarts
- Up/Down arrow navigation with prefix search (type partial text, then Up to find matching history)
- Configurable max entries (default: 500)
- Deduplication: consecutive identical entries stored only once

**Tab completion (`completions.ts`):**
- `/` prefix → Slash command completion (`/help`, `/clear`, `/reset`, `/history`, etc.)
- File paths → Fuzzy file name completion from project tree
- Cycle through completions with repeated Tab presses
- Show completion list if multiple matches

**Message queuing (Codex CLI pattern):**
- While the agent is processing, the user **can still type**
- Input is collected into a queue (shown dimmed above the prompt)
- When the current turn completes, queued messages are sent in order
- This prevents the frustrating "locked input" experience

#### 6e. Slash Commands

Built-in commands available during the REPL session:

| Command | Alias | Description |
|---------|-------|-------------|
| `/help` | `/h`, `/?` | Show available commands |
| `/clear` | `/cls` | Clear screen |
| `/reset` | `/r` | Reset conversation context |
| `/history` | `/hist` | List recent sessions |
| `/session` | `/sid` | Show current session info |
| `/compact` | `/c` | Toggle compact tool output (hide diffs, minimize cards) |
| `/verbose` | `/v` | Toggle verbose tool output (show full diffs, all output) |
| `/model` | `/m` | Switch AI model mid-session |
| `/provider` | `/p` | Switch AI provider mid-session |
| `/diff` | `/d` | Show cumulative diff of all changes in this session |
| `/undo` | `/u` | Undo last AI change (git checkout on affected files) |
| `/save` | | Force-save current session |
| `/exit` | `/quit`, `/q` | Exit REPL |

#### 6f. Session Management

Sessions provide continuity across REPL interactions.

**Session storage:**
```
.locus/sessions/
├── .input-history           # Cross-session input history
├── abc123.json              # Session file (conversation + metadata)
├── def456.json
└── ...
```

**Session file schema:**
```jsonc
{
  "id": "abc123",
  "created": "2026-02-23T10:00:00Z",
  "updated": "2026-02-23T11:30:00Z",
  "metadata": {
    "cwd": "/Users/dev/my-project",
    "branch": "main",
    "provider": "claude",
    "model": "opus",
    "totalTokens": 15234,
    "totalTools": 23
  },
  "messages": [
    { "role": "user", "content": "Add rate limiting...", "timestamp": "..." },
    { "role": "assistant", "content": "I'll add rate...", "timestamp": "...", "tools": [...] }
  ]
}
```

**Session resume:**
- `locus exec -s abc` → Partial ID match (like git commit hashes)
- On resume, show session metadata and last few messages for context
- Conversation history is sent as message context to the AI (proper message-role format, not string concatenation)

**Session picker (future):**
- Interactive list of previous sessions with metadata preview
- Columns: ID, Date, Branch, Preview, Token count
- Search/filter by keyword
- Fork a session (create new session from a previous point)

**Auto-pruning:**
- Sessions older than 30 days are automatically cleaned up
- Keep max 50 sessions (configurable)

#### 6g. Error Handling & Resilience

**Retry with exponential backoff (Aider pattern):**
- Transient API errors (rate limits, network timeouts, 5xx) are retried automatically
- Backoff: 1s → 2s → 4s → 8s → 16s → fail
- Max 5 retries per request
- Show retry status: `⟳ Rate limited. Retrying in 4s... (attempt 3/5)`

**Graceful interrupt:**
- First `Ctrl+C` → Cancel current AI request, show partial output, return to prompt
- Second `Ctrl+C` (within 2s) → Exit REPL, save session
- During tool execution: sends SIGTERM to subprocess, waits 3s, then SIGKILL

**Context window management:**
- Track cumulative token count per session
- When approaching provider's context limit, summarize older messages (keep last N exchanges verbatim, summarize the rest)
- Show token usage in session info: `/session` → `Tokens: 15,234 / 200,000`

**Stream error recovery:**
- If the AI stream disconnects mid-response, display what was received so far
- Offer to retry: `Stream interrupted. Retry? (y/n)`
- On retry, include the partial response as context so the AI can continue

#### 6h. JSON Stream Mode (VSCode Extension)

For programmatic invocation from the VSCode extension, the REPL supports a structured event protocol.

```bash
locus exec --json-stream --session-id <id> -- "prompt here"
```

**NDJSON event protocol:**
```jsonc
// Output events (stdout, one JSON per line)
{"type": "start", "sessionId": "abc123", "timestamp": "..."}
{"type": "status", "state": "thinking", "elapsed": 3200}
{"type": "text_delta", "content": "I'll add rate"}
{"type": "thinking", "content": "analyzing middleware..."}
{"type": "tool_started", "tool": "Read", "params": {"file_path": "src/app.ts"}}
{"type": "tool_completed", "tool": "Read", "duration": 200, "summary": "245 lines"}
{"type": "tool_started", "tool": "Edit", "params": {"file_path": "src/app.ts"}}
{"type": "tool_completed", "tool": "Edit", "duration": 150, "diff": "...unified diff..."}
{"type": "text_delta", "content": " limiting middleware."}
{"type": "done", "sessionId": "abc123", "stats": {"duration": 12000, "tools": 4, "tokens": 2048}}
{"type": "error", "message": "Rate limit exceeded", "retryable": true}
```

**Extension integration contract:**
- Extension sends prompts via stdin or CLI args
- Extension receives structured events via stdout
- `--session-id` enables session continuity across extension invocations
- The `diff` field in `tool_completed` events for Edit operations allows the extension to show inline diffs in the editor
- SIGINT/SIGTERM guarantees a `done` event is emitted (for cleanup)

#### 6i. Design Principles for REPL

1. **REPL-first**: Interactive mode is the default and primary experience. One-shot is the secondary mode.
2. **Progressive disclosure**: Compact tool cards by default, expand on demand. Don't overwhelm with output.
3. **Always responsive**: Input is never fully locked. Users can always type, interrupt, or queue messages.
4. **Terminal-native**: Pure ANSI escape codes, no external rendering dependencies. Respect terminal capabilities ($COLORTERM, $COLUMNS).
5. **IDE-ready**: The JSON stream protocol makes the REPL a backend for any IDE extension, not just the terminal.
6. **Session-aware**: Every interaction is part of a persistent, resumable session. Nothing is lost.
7. **Fail gracefully**: Network errors, API limits, and crashes are handled with retries, partial output preservation, and clear recovery instructions.

---

### 7. `locus review`

AI-powered code review on pull requests.

```bash
# Review all open Locus-created PRs
locus review

# Review a specific PR
locus review 15

# Review with specific focus
locus review 15 --focus "security,performance"
```

**Implementation:**
```bash
gh pr list --label "agent:managed" --json number,title,body
gh pr diff <number>
# → Feed diff + PR body + codebase context to AI
# → Post review comments via gh pr review
```

---

### 8. `locus iterate`

Re-execute tasks based on PR feedback (review comments, user comments). This closes the feedback loop: `run → review → iterate → review → merge`.

```bash
# Iterate on all open PRs that have unresolved comments
locus iterate

# Iterate on a specific PR
locus iterate --pr 15

# Iterate on a specific issue (finds its PR automatically)
locus iterate 42

# Iterate on all failed + commented tasks in active sprint
locus iterate --sprint
```

#### Feedback Loop Flow

```
                     ┌──────────┐
                     │ locus run│
                     └────┬─────┘
                          │
                     Creates PRs
                          │
                          ▼
                  ┌───────────────┐
                  │  PRs Open on  │
                  │    GitHub     │
                  └───────┬───────┘
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
        ┌─────────────┐     ┌──────────────┐
        │locus review │     │ User reviews │
        │ (AI review) │     │ on GitHub UI │
        └──────┬──────┘     └──────┬───────┘
               │                   │
               └──────┬────────────┘
                      │
               Comments on PR
                      │
                      ▼
              ┌───────────────┐
              │locus iterate  │
              │               │
              │ For each PR:  │
              │ 1. Read PR    │
              │    comments   │
              │ 2. Read diff  │
              │ 3. Re-execute │
              │    agent with │
              │    feedback   │
              │ 4. Push fixes │
              │ 5. Comment    │
              │    "addressed │
              │    feedback"  │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │  PR updated   │
              │  with fixes   │
              └───────┬───────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
     ┌─────────────┐    ┌──────────────┐
     │  More        │    │   Approved   │
     │  feedback?   │    │   & Merged   │
     │  → iterate   │    │   → Done ✓   │
     │    again      │    └──────────────┘
     └─────────────┘
```

#### `locus iterate` Implementation Detail

```
1. Find PRs to iterate on:
   - If --pr specified: just that PR
   - If issue number specified: find PR linked to that issue
   - If --sprint: all open PRs for active sprint issues
   - Default: all open agent:managed PRs with unresolved comments

2. For each PR:
   a. Fetch PR diff: gh pr diff <number>
   b. Fetch ALL comments (review comments + issue comments):
      - gh api repos/{owner}/{repo}/pulls/<number>/comments  (review line comments)
      - gh api repos/{owner}/{repo}/issues/<number>/comments (general comments)
      - gh api repos/{owner}/{repo}/pulls/<number>/reviews   (review summaries)
   c. Filter to unaddressed feedback:
      - Comments posted AFTER the last agent commit
      - Or comments on the initial review if no iteration yet
   d. Determine execution context:
      - Sprint task → checkout sprint branch, apply on top of current state
      - Standalone task → use existing worktree or create new one
   e. Build prompt with:
      - Original issue body
      - Current PR diff (what the agent already did)
      - All review feedback (formatted with line references)
      - LOCUS.md, LEARNINGS.md
      - Instruction: "Address the following review feedback on your PR"
   f. Execute AI agent
   g. On SUCCESS:
      - Commit: "fix: address review feedback (#<issue>)"
      - Push to same branch (PR auto-updates)
      - Comment on PR: "Addressed feedback from review. Changes: ..."
      - If sprint task: update locus label back to locus:in-review
   h. On FAILURE:
      - Comment on PR with error details
      - Mark issue as locus:failed
      - Log to run-state.json

3. Summary: "Iterated on N PRs. M succeeded, K failed."
```

#### Typical Workflow

```bash
# Day 1: Plan and execute
locus plan "Build auth system"        # Creates issues #1-#5 with order labels
locus sprint create "Sprint 1"        # Create milestone
locus sprint active "Sprint 1"        # Set as active
locus run                             # Execute all 5 tasks sequentially

# Day 1 (later): Review
locus review                          # AI reviews all 5 PRs, posts comments

# Day 2: User adds own comments on GitHub, then iterate
locus iterate                         # Agent re-executes with all feedback
locus review                          # AI re-reviews the updated PRs

# Day 2 (later): Some PRs are good, merge them
# User merges approved PRs on GitHub
# Remaining PRs may need another iteration
locus iterate                         # Address remaining feedback
# Repeat until all PRs merged
```

---

### 9. `locus discuss`

AI-powered architectural discussions (fully local).

```bash
locus discuss "Should we use Redis or in-memory caching?"
locus discuss --list
locus discuss --show <id>
```

**Same as current** — no API dependency. Stored in `.locus/discussions/`.

---

### 10. `locus status`

Dashboard view of the current project state.

```bash
locus status
```

**Output:**
```
╭─ Locus Status ─────────────────────────────────────────╮
│                                                         │
│  Repo:    asgarovf/my-project                          │
│  Branch:  main                                          │
│  Sprint:  Sprint 1 (3 of 7 done, due Mar 7)           │
│                                                         │
│  Active Agents:                                         │
│    ● issue-42  "Add auth middleware"     ██████░░ 75%  │
│    ● issue-43  "Create user model"       ████░░░░ 50%  │
│    ○ issue-44  "Login endpoints"         queued         │
│                                                         │
│  Recent PRs:                                            │
│    ✓ #12  "Set up project structure"     merged         │
│    ⟳ #13  "Add database config"         open           │
│                                                         │
╰─────────────────────────────────────────────────────────╯
```

**Implementation:** Combines data from:
- `gh issue list --milestone "<active>"` → sprint progress
- `gh pr list --label "agent:managed"` → PR status
- `.locus/worktrees/` directory scan → active agents
- Process list → running agent processes

---

### 11. `locus config`

Manage local settings.

```bash
locus config show                    # Display current config
locus config set ai.provider codex   # Change AI provider
locus config set ai.model opus       # Change model
locus config set agent.maxParallel 5 # Change concurrency
```

---

## Initialization → Execution Flow (End-to-End)

```
User installs:
  npm install -g @locusai/cli2
      │
      ▼
User runs: locus init
      │
      ├─ Check: gh cli installed? ──── No ──► "Install gh: https://cli.github.com"
      ├─ Check: gh authenticated? ──── No ──► "Run: gh auth login"
      ├─ Check: git repo? ──────────── No ──► "Initialize a git repo first"
      ├─ Check: github remote? ─────── No ──► "Add a GitHub remote"
      │
      ├─ Detect: owner/repo from remote
      ├─ Detect: default branch
      ├─ Create: .locus/ directory structure
      ├─ Create: config.json with detected values
      ├─ Create: LOCUS.md template
      ├─ Create: LEARNINGS.md
      ├─ Create: GitHub labels (if missing)
      └─ Update: .gitignore
      │
      ▼
User creates issues (two paths):
      │
      ├─ Manual: locus issue create "title" --priority high --type feature
      │
      └─ AI-assisted: locus plan "Build auth system"
         └─ AI proposes issues → user approves → issues created
      │
      ▼
User organizes sprint:
      │
      ├─ locus sprint create "Sprint 1" --due "2026-03-07"
      ├─ locus issue label 1 2 3 --sprint "Sprint 1"
      └─ locus sprint active "Sprint 1"
      │
      ▼
User executes:
      │
      ├─ Sprint mode: locus run
      │  └─ Sequential execution in order:N sequence
      │     └─ One PR per task, all on sprint branch
      │     └─ If task fails → stops, saves state
      │     └─ locus run --resume → continues from failure point
      │
      ├─ Standalone issues: locus run 42 43 44
      │  └─ Parallel via worktrees → one PR per issue
      │
      ├─ Single issue: locus run 42
      │  └─ One worktree → one PR
      │
      └─ Ad-hoc: locus exec "fix the login bug"
         └─ Direct AI execution, no issue tracking
      │
      ▼
User reviews:
      │
      ├─ locus review          # AI reviews agent PRs, posts comments
      ├─ locus status          # Check progress dashboard
      └─ GitHub UI             # User adds own review comments
      │
      ▼
User iterates (feedback loop):
      │
      ├─ locus iterate         # Agent re-executes with PR feedback
      ├─ locus review          # AI re-reviews updated PRs
      └─ Repeat until merged   # Loop: iterate → review → iterate → merge
```

---

## GitHub CLI Wrapper (`core/github.ts`)

Central abstraction over `gh` CLI. All GitHub interactions go through this module.

```typescript
// Key functions (all shell out to `gh` CLI)

// Issues
createIssue(title, body, labels, milestone?) → IssueNumber
listIssues(filters: { milestone?, label?, state?, assignee? }) → Issue[]
getIssue(number) → Issue
updateIssue(number, updates: { labels?, milestone?, state?, body? }) → void
addComment(number, body) → void

// Milestones (Sprints)
createMilestone(title, dueDate?, description?) → MilestoneNumber
listMilestones(state?: 'open' | 'closed') → Milestone[]
getMilestone(title) → Milestone
closeMilestone(title) → void

// Pull Requests
createPR(title, body, head, base) → PRNumber
listPRs(filters: { label?, state? }) → PR[]
getPRDiff(number) → string
addPRReview(number, body, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') → void

// Labels
createLabel(name, color, description?) → void
ensureLabels(labels: LabelDef[]) → void
ensureOrderLabel(n: number) → void  // Create order:N label if it doesn't exist (grey, dynamic)

// Repository
getRepoInfo() → { owner, repo, defaultBranch }
```

**All functions execute `gh` as a child process** using `Bun.spawn` or `child_process.execSync`. Errors from `gh` are caught and presented with helpful context.

---

## Worktree Manager (`core/worktree.ts`)

Manages git worktree lifecycle for parallel execution.

```typescript
// Key functions

createWorktree(issueNumber: number, baseBranch: string) → WorktreeInfo
// git worktree add .locus/worktrees/issue-<N> -b locus/issue-<N> <baseBranch>

removeWorktree(issueNumber: number) → void
// git worktree remove .locus/worktrees/issue-<N>

listWorktrees() → WorktreeInfo[]
// git worktree list --porcelain

cleanupStaleWorktrees() → void
// Remove worktrees for issues that are already closed/merged

getWorktreePath(issueNumber: number) → string
// .locus/worktrees/issue-<N>

interface WorktreeInfo {
  issueNumber: number
  path: string
  branch: string
  status: 'active' | 'stale'
}
```

---

## Agent Execution Engine (`core/agent.ts`)

Orchestrates AI agent execution for issue resolution.

```typescript
interface AgentOptions {
  issueNumber: number
  worktreePath?: string       // Only for standalone (non-sprint) issues
  provider: 'claude' | 'codex'
  model: string
  dryRun?: boolean
  feedbackContext?: string     // PR review comments for iterate mode
  sprintContext?: string       // Diff from previous sprint tasks
}

interface AgentResult {
  issueNumber: number
  success: boolean
  prNumber?: number
  error?: string
  summary?: string
}

async function executeIssue(options: AgentOptions): Promise<AgentResult> {
  // 1. Fetch issue details from GitHub (title, body, comments)
  // 2. Update issue label to locus:in-progress
  // 3. Build prompt with full context (including feedbackContext if iterate)
  // 4. Spawn AI process (claude or codex CLI)
  // 5. Monitor execution, capture output
  // 6. On SUCCESS:
  //    - git add & commit with issue reference
  //    - git push
  //    - Create PR (or push to existing PR branch)
  //    - Update issue label to locus:done
  //    - Comment on issue with summary
  // 7. On FAILURE:
  //    - Update issue label to locus:failed
  //    - Comment on issue with error details
  // 8. Return AgentResult
}

async function runSprint(sprintName: string): Promise<void> {
  // 1. Fetch all issues in sprint milestone
  // 2. Sort by order:N label numerically (NOT priority — order is explicit)
  //    - Gaps in order numbers are OK (sort numerically, ignore gaps)
  //    - Issues without order labels → error (must be ordered before execution)
  // 3. Load run-state.json (for resume support)
  // 4. Skip locus:done issues
  // 5. Execute each remaining issue sequentially on single branch
  // 6. Pass cumulative diff as sprintContext to each subsequent task
  // 7. On failure: save state, stop, print resume instructions
}

async function runParallel(issueNumbers: number[], maxConcurrent: number): Promise<void> {
  // 1. Verify none are sprint issues
  // 2. Create worktrees for each issue
  // 3. Spawn agent processes (up to maxConcurrent)
  // 4. Queue remaining
  // 5. Wait for all to complete
  // 6. Cleanup successful worktrees (keep failed for debugging)
  // 7. Report results
}

async function iterateOnPR(prNumber: number): Promise<AgentResult> {
  // 1. Fetch PR details + diff
  // 2. Fetch all comments (review + general) posted after last agent commit
  // 3. Find linked issue
  // 4. Determine context: sprint branch or worktree
  // 5. Build prompt with original issue + current diff + feedback
  // 6. Execute agent with instruction to address feedback
  // 7. Push to same branch (PR auto-updates)
  // 8. Comment on PR summarizing what was addressed
}
```

---

## Prompt Builder (`core/prompt-builder.ts`)

Assembles rich context for AI agents from local + GitHub data.

```
Prompt Structure (initial execution):
┌──────────────────────────────────────────┐
│ System Context                            │
│  ├─ LOCUS.md (project instructions)      │
│  ├─ LEARNINGS.md (past lessons)          │
│  └─ Discussion insights (if any)         │
├──────────────────────────────────────────┤
│ Task Context                              │
│  ├─ Issue title & body                   │
│  ├─ Issue comments (conversation)        │
│  ├─ Related issues (mentioned)           │
│  └─ Priority & type labels               │
├──────────────────────────────────────────┤
│ Sprint Context (if sprint task)           │
│  ├─ Sprint name & goal                   │
│  ├─ Position in sprint (e.g., "3 of 5") │
│  ├─ What previous tasks accomplished     │
│  └─ Cumulative diff from base branch     │
├──────────────────────────────────────────┤
│ Repository Context                        │
│  ├─ File tree (relevant subset)          │
│  ├─ Recent git log                       │
│  └─ Current branch & status              │
├──────────────────────────────────────────┤
│ Execution Rules                           │
│  ├─ Commit format instructions           │
│  ├─ Code quality standards               │
│  └─ What NOT to do (git push, etc.)      │
└──────────────────────────────────────────┘

Prompt Structure (iterate / feedback mode):
┌──────────────────────────────────────────┐
│ System Context (same as above)            │
├──────────────────────────────────────────┤
│ Original Task Context (issue)             │
├──────────────────────────────────────────┤
│ Current State                             │
│  ├─ PR diff (what was already done)      │
│  ├─ PR description & linked issue        │
│  └─ Files changed in PR                  │
├──────────────────────────────────────────┤
│ Review Feedback                           │
│  ├─ Review comments (with file:line)     │
│  ├─ General PR comments                  │
│  ├─ Review verdict (approve/changes)     │
│  └─ Specific change requests             │
├──────────────────────────────────────────┤
│ Instructions                              │
│  ├─ "Address the following feedback"     │
│  ├─ "Push changes to same branch"        │
│  └─ "Do NOT rewrite from scratch"        │
└──────────────────────────────────────────┘
```

---

## AI Runner Integration (`ai/`)

Modular, multi-provider support. Each provider implements a common `AgentRunner` interface and is invoked as a CLI subprocess.

### `AgentRunner` Interface

```typescript
interface AgentRunner {
  name: string                              // "claude" | "codex"
  isAvailable(): Promise<boolean>           // Check if CLI tool is installed
  getVersion(): Promise<string>             // Get installed version
  execute(options: RunnerOptions): Promise<RunnerResult>
  abort(): void                             // Graceful cancellation
}

interface RunnerOptions {
  prompt: string
  model?: string
  cwd: string                               // Working directory (worktree or project root)
  onOutput?: (chunk: string) => void        // Stream output callback
  signal?: AbortSignal                      // Cancellation signal
}

interface RunnerResult {
  success: boolean
  output: string
  error?: string
  exitCode: number
}
```

### Claude Integration (`ai/claude.ts`)
```bash
# Locus spawns Claude Code as a subprocess
claude --dangerously-skip-permissions \
  --model claude-opus-4-6 \
  --prompt "<assembled prompt>"
```

### Codex Integration (`ai/codex.ts`)
```bash
# Locus spawns Codex CLI as a subprocess
codex --model gpt-5.3-codex \
  --approval-mode full-auto \
  --prompt "<assembled prompt>"
```

### Runner Factory (`ai/runner.ts`)
```typescript
function createRunner(provider: 'claude' | 'codex'): AgentRunner {
  switch (provider) {
    case 'claude': return new ClaudeRunner()
    case 'codex': return new CodexRunner()
  }
}
```

**Key design:** Locus doesn't call AI APIs directly. It orchestrates existing AI CLI tools. This means:
- No API key management (each tool handles its own)
- Automatic access to latest features of each tool
- Users can use whichever AI tool they already have installed
- **Adding new providers** requires only implementing `AgentRunner` and registering in the factory

---

## Operational Concerns

### 12. Logging & Debug Mode

Production-grade observability for diagnosing agent failures, performance issues, and unexpected behavior — especially for long-running sprint executions.

#### Global `--debug` Flag

```bash
# Any command can be run in debug mode
locus --debug run
locus --debug exec
locus --debug init

# Or set via environment variable
LOCUS_LOG_LEVEL=debug locus run
```

#### Log Levels

| Level | What's Logged | When to Use |
|-------|--------------|-------------|
| `silent` | Nothing (JSON stream mode default) | Programmatic/extension use |
| `normal` | Errors, warnings, key milestones | Default for terminal |
| `verbose` | + subprocess commands, API calls, timing | Troubleshooting |
| `debug` | + raw subprocess output, prompt contents, token counts, internal state transitions | Deep debugging |

#### Log File Structure

```
.locus/logs/
├── locus-2026-02-23T10-00-00.log    # Timestamped per-invocation log
├── locus-2026-02-23T11-30-00.log
└── ...
```

**Log format (NDJSON for machine readability):**
```jsonc
{"ts":"2026-02-23T10:00:01.234Z","level":"info","msg":"Starting sprint run","sprint":"Sprint 1","tasks":5}
{"ts":"2026-02-23T10:00:01.500Z","level":"debug","msg":"gh issue list","args":["--milestone","Sprint 1","--json","number,title,labels"],"duration":342}
{"ts":"2026-02-23T10:00:02.100Z","level":"info","msg":"Executing task","issue":42,"order":1,"title":"Add auth middleware"}
{"ts":"2026-02-23T10:00:02.200Z","level":"debug","msg":"Spawning AI agent","provider":"claude","model":"opus","promptTokens":4521}
{"ts":"2026-02-23T10:05:15.000Z","level":"error","msg":"Task failed","issue":42,"error":"API rate limit exceeded","duration":313000}
```

#### `locus logs` Command

```bash
# View most recent log
locus logs

# View logs for a specific run
locus logs --run "run-2026-02-23-abc123"

# Tail logs in real-time (during a run in another terminal)
locus logs --follow

# Filter by level
locus logs --level error

# Clean up old logs (auto-prune: keep last 20 logs, max 50MB total)
locus logs --clean
```

#### Implementation Details

- **Logger module** (`core/logger.ts`): Singleton logger with configurable level, writes to both terminal (formatted) and file (NDJSON) simultaneously
- **Auto-rotation**: Logs auto-prune to keep last 20 files or 50MB total (whichever is smaller)
- **Subprocess logging**: All `gh`, `git`, `claude`, `codex` subprocess invocations are logged with command, args, duration, exit code, and stderr
- **Sensitive data**: API keys and tokens are NEVER logged. Prompt content is only logged at `debug` level and truncated to first 500 chars
- **Performance**: File writes are buffered and flushed on process exit or every 5 seconds (whichever comes first)

---

### 13. GitHub API Rate Limiting

GitHub REST API allows 5,000 requests/hour (authenticated via `gh`). A sprint with 10 issues can easily consume hundreds of calls (label reads, updates, PR creation, commenting). Locus must be a responsible API citizen.

#### Rate Limit Strategy

```
┌──────────────────────────────────────────────────┐
│              Rate Limit Architecture              │
├──────────────────────────────────────────────────┤
│                                                    │
│  Every `gh` call goes through core/github.ts       │
│                                                    │
│  ┌──────────────┐    ┌──────────────┐             │
│  │ gh wrapper   │───►│ Rate tracker │             │
│  │ (all calls)  │    │              │             │
│  └──────┬───────┘    │ • Reads X-   │             │
│         │            │   RateLimit   │             │
│         │            │   headers     │             │
│         │            │ • Tracks      │             │
│         │            │   remaining   │             │
│         │            │ • Tracks      │             │
│         │            │   reset time  │             │
│         │            └──────┬───────┘             │
│         │                   │                      │
│         ▼                   ▼                      │
│  ┌──────────────────────────────────┐              │
│  │ Preemptive throttle              │              │
│  │                                  │              │
│  │ • remaining < 100 → warn user   │              │
│  │ • remaining < 20  → pause +     │              │
│  │   wait until reset window       │              │
│  │ • 403/429 response → backoff    │              │
│  │   + retry (exponential)         │              │
│  └──────────────────────────────────┘              │
└──────────────────────────────────────────────────┘
```

#### Header Tracking

Every `gh` API response includes rate limit headers. The `github.ts` wrapper parses these:

```typescript
interface RateLimitState {
  limit: number        // e.g., 5000
  remaining: number    // e.g., 4832
  reset: Date          // When the window resets
  used: number         // Calls used in current window
}
```

- Tracked globally (singleton) across all commands in a single CLI invocation
- Persisted to `.locus/rate-limit.json` between invocations (so a subsequent `locus run --resume` knows where we stand)

#### Request Batching

Where possible, reduce API calls by batching:

| Instead of... | Batch to... |
|---------------|-------------|
| N separate `gh issue edit --add-label` calls | Single `gh api` call with all labels |
| Separate issue + labels + milestone fetches | `gh issue list --json number,title,labels,milestone` (single call) |
| Individual PR comment reads | `gh api repos/{owner}/{repo}/pulls/{n}/comments` (all comments in one call) |

#### Error Messaging

When rate-limited, show a clear, actionable message:

```
⚠ GitHub API rate limit reached (0/5000 remaining)
  Resets at: 10:45:00 AM (in 12 minutes)

  Options:
    • Wait — execution will auto-resume when the limit resets
    • Ctrl+C — stop now, resume later with `locus run --resume`

  Tip: Use `gh auth login` with a fine-grained token for higher limits.
```

#### Rate Limit Aware Sprint Execution

During sprint runs, the rate limit state is checked:
- **Before each task**: If remaining < 50, warn and ask to continue or pause
- **On 403/429**: Auto-pause with countdown timer, then retry
- **Cumulative tracking**: `locus status` shows API calls used in current session

---

### 14. Merge Conflict Handling

Sprint tasks run sequentially on a single branch, but the base branch (`main`) can advance independently. Parallel standalone issues can also conflict with each other. Locus needs clear strategies for each scenario.

#### Scenario 1: Base Branch Advances During Sprint

```
main:    A ─── B ─── C ─── D (someone pushes to main)
                \
sprint:          E ─── F ─── G (locus sprint tasks)
```

**Strategy: Detect, warn, offer rebase.**

```
Before each sprint task:
  1. Fetch latest from remote: git fetch origin main
  2. Check if main has new commits since sprint branch was created
  3. If yes:
     a. Log warning: "⚠ Base branch (main) has advanced by N commits"
     b. Attempt automatic rebase: git rebase origin/main
     c. If rebase succeeds (no conflicts): continue execution
     d. If rebase has conflicts:
        - Abort the rebase: git rebase --abort
        - Show conflicting files
        - Print: "Merge conflict detected. Options:
            1. Resolve manually and run `locus run --resume`
            2. Continue on current base (skip rebase) with `locus run --resume --no-rebase`"
        - Save state and stop
```

**Config option:**
```jsonc
{
  "agent": {
    "rebaseBeforeTask": true    // Default: true. Check base branch before each task.
  }
}
```

#### Scenario 2: Sprint Task Conflicts with Previous Task's PR

This is rare because sprint tasks run sequentially on the same branch — each task builds on the previous one. But if `locus iterate` pushes changes to a task-3 PR that conflict with task-4's work:

**Strategy: Detect during iterate, fail gracefully.**

```
During `locus iterate`:
  1. Before re-executing the agent for PR #N:
     - Check if the PR branch has diverged from the sprint branch
     - If it has (e.g., force-pushed or rebased externally): warn user
  2. After agent pushes changes:
     - If push fails due to conflict: save error, mark task as `locus:failed`
     - Print: "PR #N has conflicts with the sprint branch.
       Resolve manually: git checkout locus/sprint-sprint-1 && git merge --no-ff origin/locus/issue-42"
```

#### Scenario 3: Parallel Standalone Issues Edit Same Files

Two worktrees both modify `src/app.ts`:

```
worktree-42:  modifies src/app.ts lines 10-20
worktree-43:  modifies src/app.ts lines 15-25
```

**Strategy: Each creates its own PR → GitHub detects merge conflicts at PR level.**

- Locus does NOT try to merge parallel PRs automatically
- GitHub's PR merge conflict detection handles this natively
- When the first PR merges, the second PR shows a conflict badge
- User resolves via `locus iterate 43` (agent sees the conflict and resolves) or manually

#### Conflict Detection Utility (`core/conflict.ts`)

```typescript
interface ConflictCheckResult {
  hasConflict: boolean
  conflictingFiles: string[]
  baseAdvanced: boolean       // Has the base branch moved?
  newCommits: number          // How many new commits on base?
}

// Check before sprint task execution
async function checkForConflicts(sprintBranch: string, baseBranch: string): Promise<ConflictCheckResult>

// Attempt automatic rebase
async function attemptRebase(baseBranch: string): Promise<{ success: boolean; conflicts?: string[] }>
```

---

### 15. Upgrade & Version Management

Locus must handle its own upgrades cleanly, including config migrations between versions.

#### `locus upgrade` Command

```bash
# Check for updates and upgrade
locus upgrade

# Check only (don't install)
locus upgrade --check

# Upgrade to a specific version
locus upgrade --version 3.2.0
```

**Flow:**
```
1. Fetch latest version from npm registry:
   npm view @locusai/cli2 version

2. Compare with current version (from package.json):
   Current: 3.0.0
   Latest:  3.2.0

3. If update available:
   ┌─────────────────────────────────────────────┐
   │  Update available: 3.0.0 → 3.2.0            │
   │                                               │
   │  Changelog:                                   │
   │    3.2.0 — Added /cost command, bug fixes    │
   │    3.1.0 — Improved conflict detection       │
   │                                               │
   │  Run: npm install -g @locusai/cli2@latest    │
   │                                               │
   │  Upgrade now? (y/n)                           │
   └─────────────────────────────────────────────┘

4. On confirm:
   - npm install -g @locusai/cli2@latest
   - Run config migration if needed (see below)
   - Verify: locus --version
```

#### Version Check on Startup (Non-Blocking)

```typescript
// On CLI startup (any command):
// 1. Check last version check timestamp (stored in ~/.locus/version-check.json)
// 2. If more than 24 hours since last check:
//    a. Fire off async npm registry check (non-blocking — don't delay CLI startup)
//    b. If newer version found, show one-line notice AFTER command completes:
//       "Update available: 3.0.0 → 3.2.0. Run `locus upgrade` to update."
//    c. Store check timestamp to avoid repeated checks
```

**Config for version checks:**
```jsonc
// ~/.locus/global-config.json (user-level, not per-project)
{
  "checkForUpdates": true,     // Default: true. Set false to disable.
  "lastVersionCheck": "2026-02-23T10:00:00Z"
}
```

#### Config Version Migration

When `config.json` schema changes between Locus versions:

```typescript
// core/config.ts — migration system

interface ConfigMigration {
  from: string   // semver range
  to: string     // target version
  migrate: (config: any) => any
}

const migrations: ConfigMigration[] = [
  {
    from: '3.0.x',
    to: '3.1.0',
    migrate: (config) => {
      // Example: add new field with default
      config.agent.rebaseBeforeTask ??= true
      config.logging ??= { level: 'normal', maxFiles: 20 }
      config.version = '3.1.0'
      return config
    }
  },
  {
    from: '3.1.x',
    to: '3.2.0',
    migrate: (config) => {
      // Example: rename field
      config.agent.conflictStrategy ??= 'rebase'
      config.version = '3.2.0'
      return config
    }
  }
]

// Applied automatically when config.json is loaded:
// 1. Read config.version
// 2. Find applicable migrations (from current to latest)
// 3. Apply in order
// 4. Write updated config.json
// 5. Log: "Migrated config from 3.0.0 → 3.2.0"
```

#### Backward Compatibility

| File | Strategy |
|------|----------|
| `config.json` | Versioned + migrated automatically. Unknown keys are preserved (forward compat). Missing keys get defaults. |
| `run-state.json` | Schema is simple. New fields get defaults on load. Old fields are ignored. No migration needed. |
| `session files` | Versioned. Old sessions load in new CLI (missing fields get defaults). New sessions in old CLI → graceful error "Session format requires Locus 3.2+". |
| `.locus/logs/` | Append-only, no migration needed. Old logs remain readable. |
| `LOCUS.md` / `LEARNINGS.md` | User-authored text files. Never modified by upgrades. |

#### Rollback

If an upgrade causes issues:

```bash
# Downgrade to specific version
npm install -g @locusai/cli2@3.0.0

# Config is backward-compatible (extra fields from newer version are ignored)
```

---

## Package Details

### package.json

```jsonc
{
  "name": "@locusai/cli2",
  "version": "3.0.0",
  "description": "GitHub-native AI engineering assistant",
  "bin": {
    "locus": "./bin/locus.js"
  },
  "scripts": {
    "build": "bun build src/cli.ts --outfile bin/locus.js --target node",
    "dev": "bun run src/cli.ts",
    "test": "bun test",
    "test:unit": "bun test src/core/__tests__ src/repl/__tests__ src/display/__tests__ src/ai/__tests__",
    "test:integration": "bun test src/commands/__tests__",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.x",
    "@types/bun": "latest"
  },
  "peerDependencies": {},
  "engines": {
    "node": ">=18"
  }
}
```

**Zero runtime dependencies.** Everything is built-in:
- `gh` CLI → external tool (checked at runtime)
- `git` → external tool (always available)
- `claude` / `codex` → external AI tools (checked when needed)
- Terminal colors → ANSI escape codes (no chalk needed)
- Argument parsing → custom minimal parser (or built-in `util.parseArgs`)
- File system → Node.js built-ins

---

## Build & Distribution

- **Bundler:** Bun (`bun build` into single file)
- **Test runner:** Bun test (`bun test` — zero additional deps)
- **Pipeline:** `build → test:unit → test:integration → publish` (tests must pass before release)
- **Distribution:** npm (`npm install -g @locusai/cli2` → `@locusai/cli` when V3 replaces V2)
- **Binary:** Single `bin/locus.js` file
- **No monorepo:** Single package, single build step

---

## Migration from V2

This is a **clean break**, not a migration. V3 starts as `@locusai/cli2` and replaces `@locusai/cli` when ready. Key differences:

| Aspect | V2 (Current) | V3 (New) |
|--------|-------------|----------|
| Package | `@locusai/cli` (monorepo) | `@locusai/cli2` → `@locusai/cli` when ready |
| Backend | NestJS + PostgreSQL | None (GitHub is the backend) |
| Auth | Custom API key + workspace | `gh auth login` only |
| Tasks | Custom API entities | GitHub Issues |
| Sprints | Custom API entities | GitHub Milestones |
| Board | Custom web dashboard | Milestones + Labels (terminal dashboard via `locus status`) |
| Parallel execution | Not implemented | Git worktrees |
| Dependencies | 12+ packages | Zero runtime deps |
| AI integration | Direct API calls via SDK | CLI subprocess (claude/codex) |
| Deployment | npm + server hosting | npm only |

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
- [ ] Set up project scaffolding (package.json, tsconfig, build)
- [ ] Implement `core/logger.ts` — Structured logging (NDJSON file + formatted terminal, log levels, auto-rotation, sensitive data filtering)
- [ ] Implement `core/github.ts` — GitHub CLI wrapper (all `gh` calls, rate limit header parsing)
- [ ] Implement `core/rate-limiter.ts` — Rate limit tracking (header parsing, preemptive throttling, persist to `.locus/rate-limit.json`, request batching helpers)
- [ ] Implement `core/config.ts` — Configuration management (including version migration system)
- [ ] Implement `core/context.ts` — Repository context detection
- [ ] Implement `commands/init.ts` — Project initialization (label creation for priority/type/status/agent — no order labels)
- [ ] Implement `commands/config.ts` — Settings management
- [ ] Implement `commands/logs.ts` — Log viewer (view, tail, filter by level, clean old logs)
- [ ] Implement `display/terminal.ts` — Terminal formatting

### Phase 2: Issue & Sprint Management
- [ ] Implement `commands/issue.ts` — Full issue CRUD
- [ ] Implement `commands/sprint.ts` — Milestone management + `sprint order` subcommand
- [ ] Implement `display/table.ts` — Table rendering

### Phase 3: AI Integration & REPL (The Core Experience)

#### 3a: AI Runner Layer
- [ ] Implement `ai/runner.ts` — `AgentRunner` interface + factory (`createRunner()`)
- [ ] Implement `ai/claude.ts` — Claude subprocess integration (streaming, abort, version detection)
- [ ] Implement `ai/codex.ts` — Codex subprocess integration (streaming, abort, version detection)

#### 3b: Display Engine
- [ ] Implement `display/terminal.ts` — Terminal capability detection (`$COLORTERM`, `$TERM_PROGRAM`, `$COLUMNS`)
- [ ] Implement `display/status-indicator.ts` — Animated thinking indicator (shimmer for true-color, braille fallback, elapsed time, interrupt hint)
- [ ] Implement `display/stream-renderer.ts` — Newline-gated markdown streaming with adaptive two-gear pacing (smooth/catch-up modes)
- [ ] Implement markdown rendering: code blocks (syntax highlighted), headers (bold), lists, inline code, bold/italic — all via ANSI escape codes
- [ ] Implement `display/diff-renderer.ts` — Colored unified diff (line numbers, green/red gutter, context lines, per-extension syntax highlighting)
- [ ] Implement `display/tool-renderer.ts` — Compact tool cards with inline diffs for Edit, output preview for Bash (head+tail truncation), match counts for Grep/Glob
- [ ] Implement `display/json-stream.ts` — NDJSON event protocol for VSCode extension (start, text_delta, thinking, tool_started, tool_completed with diff, done, error)
- [ ] Implement `display/progress.ts` — Progress bars, spinners, elapsed time utilities

#### 3c: REPL Core
- [ ] Implement `repl/input-handler.ts` — Raw-mode input with full keybindings (Up/Down history, Left/Right cursor, Home/End, Ctrl+W word delete, Ctrl+U clear, bracketed paste, heuristic paste fallback)
- [ ] Implement `repl/input-history.ts` — Persistent cross-session history file (`.locus/sessions/.input-history`), Up/Down navigation, prefix search, deduplication, max 500 entries
- [ ] Implement `repl/completions.ts` — Tab completion for slash commands and file paths (cycle through matches with repeated Tab)
- [ ] Implement `repl/commands.ts` — Slash commands (/help, /clear, /reset, /history, /session, /compact, /verbose, /model, /provider, /diff, /undo, /save, /exit)
- [ ] Implement `repl/session-manager.ts` — Session CRUD (create, resume by partial ID, save, prune), session file schema (metadata + messages), auto-save after each exchange
- [ ] Implement `repl/image-detect.ts` — Image path detection (macOS drag-and-drop, escaped paths, quoted paths, ~/expansion, stable temp copy)
- [ ] Implement `repl/repl.ts` — Main REPL orchestrator: session loop, turn lifecycle, message queuing during processing, AI stream consumption, tool display, error handling with retry
- [ ] Implement message queuing — allow typing while agent is processing, show queued messages dimmed, send on turn completion

#### 3d: Exec Command & Error Resilience
- [ ] Implement `commands/exec.ts` — Entry point (REPL default, one-shot mode, session management subcommands, JSON stream mode)
- [ ] Implement retry with exponential backoff for transient API errors (1s→2s→4s→8s→16s, max 5 retries, with status display)
- [ ] Implement graceful interrupt (first Ctrl+C = cancel, second = exit + save)
- [ ] Implement stream error recovery (display partial output, offer retry with context)
- [ ] Implement context window management (token tracking, conversation summarization for long sessions)

#### 3e: Sprint Execution
- [ ] Implement `core/prompt-builder.ts` — Context assembly (with sprint context, feedback context, REPL context)
- [ ] Implement `core/agent.ts` — Agent execution engine (issue execution, sprint runner, parallel runner)
- [ ] Implement `core/run-state.ts` — Execution state persistence & recovery
- [ ] Implement `core/conflict.ts` — Merge conflict detection (base branch drift check, automatic rebase attempt, conflict file reporting)
- [ ] Implement `commands/run.ts` — Sequential sprint execution with order:N sorting, pre-task conflict checks, rate limit awareness
- [ ] Implement `--resume` flag for failure recovery

### Phase 4: Parallel Execution (Worktrees — Standalone Only)
- [ ] Implement `core/worktree.ts` — Worktree lifecycle
- [ ] Extend `commands/run.ts` — Parallel mode (only for non-sprint issues)
- [ ] Implement sprint vs. standalone detection logic
- [ ] Implement `commands/status.ts` — Progress dashboard
- [ ] Implement concurrency control & queue

### Phase 5: Planning, Review & Iterate
- [ ] Implement `commands/plan.ts` — AI sprint planning with order:N label assignment
- [ ] Implement `commands/review.ts` — AI code review on PRs
- [ ] Implement `commands/iterate.ts` — PR feedback loop (re-execute with review comments)
- [ ] Implement PR comment fetching (review comments + general comments)
- [ ] Implement `commands/discuss.ts` — AI discussions

### Phase 6: Testing
- [ ] Set up test infrastructure (`src/__tests__/test-helpers/`: mock-gh, mock-fs, mock-runner, fixtures)
- [ ] **Unit tests — Core:** `config.test.ts` (schema validation, version migration chain), `context.test.ts`, `run-state.test.ts`, `prompt-builder.test.ts`, `logger.test.ts` (log levels, NDJSON format, sensitive data filtering, auto-rotation), `rate-limiter.test.ts` (header parsing, threshold warnings, throttle/pause logic, persistence between invocations), `conflict.test.ts` (base branch drift detection, rebase success/failure paths, conflict file reporting)
- [ ] **Unit tests — Sprint reorder:** frozen orders, floor calculation, gap handling, edge cases (all done, all pending, empty sprint)
- [ ] **Unit tests — REPL:** `input-history.test.ts` (load/save, dedup, prefix search), `commands.test.ts` (parse, dispatch, aliases), `completions.test.ts` (slash commands, file paths, cycling), `session-manager.test.ts` (CRUD, partial-ID, pruning), `image-detect.test.ts` (macOS paths, escaping, multi-image)
- [ ] **Unit tests — Display:** `stream-renderer.test.ts` (newline buffering, gear switching), `diff-renderer.test.ts` (coloring, line numbers, truncation), `tool-renderer.test.ts` (card formatting per tool type), `json-stream.test.ts` (NDJSON events, contract validation), `terminal.test.ts` (capability detection)
- [ ] **Unit tests — AI:** `runner.test.ts` (factory, provider selection), `claude.test.ts` (subprocess args, stream parse, abort), `codex.test.ts` (subprocess args, stream parse, abort)
- [ ] **Integration tests — Commands:** `init.test.ts` (full flow, idempotency), `issue.test.ts` (CRUD + labels), `sprint.test.ts` (create, order, reorder with frozen constraints), `run.test.ts` (sequential, parallel, resume, mode detection), `exec.test.ts` (REPL init, one-shot, JSON stream), `review.test.ts`, `iterate.test.ts` (feedback loop)
- [ ] **Integration tests — Agent orchestration:** `agent.test.ts` (executeIssue, runSprint, runParallel, iterateOnPR), `github.test.ts` (all gh CLI mappings, error handling), `worktree.test.ts` (lifecycle, cleanup, stale detection)
- [ ] **Contract tests:** NDJSON schema validation (all event types round-trip), config.json schema, run-state.json schema, session file schema
- [ ] **Edge case tests:** all scenarios from the "Edge Case Tests" table in Testing Strategy
- [ ] **REPL behavior tests:** turn lifecycle, message queuing, interrupt handling, slash command dispatch, session persistence, retry on API error
- [ ] Verify coverage target: 80%+ on `core/` and `repl/` modules

### Phase 7: Polish & Release
- [ ] Implement `commands/upgrade.ts` — Self-upgrade (`locus upgrade`, `--check`, `--version`, version comparison, config migration trigger)
- [ ] Implement startup version check (non-blocking, async npm registry check, 24h cooldown, one-line notice after command completes)
- [ ] Error handling & edge cases (API limits, network failures, partial state)
- [ ] Graceful shutdown (SIGINT/SIGTERM during sprint run → save state → resume later)
- [ ] Help text & documentation
- [ ] npm publish as `@locusai/cli2` (private initially, replaces `@locusai/cli` when ready)

---

## Open Questions / Decisions Needed

**All resolved.**

1. ~~**Package name:**~~ **Resolved:** `@locusai/cli2` for now (temporary — `@locusai/cli` is taken by V2). When V3 is fully ready, we replace the existing `@locusai/cli` package. The binary name remains `locus`. Branding, landing page, and docs will be updated at that time.
2. ~~**Should we keep Codex support:**~~ **Resolved:** Yes, keep both Claude and Codex support. The current V2 already has Codex integration, so we maintain the same multi-provider structure. Improve the implementations to be more modular with a clean `AgentRunner` interface.
3. ~~**GitHub Projects integration:**~~ **Resolved:** No. Milestones + Labels only. GitHub Projects (v2) adds too much GraphQL complexity for marginal benefit. Users can create Projects manually if they want kanban views — issues/labels/milestones appear there automatically.
4. ~~**Worktree location:**~~ **Resolved:** `.locus/worktrees/` (inside project, gitignored)
5. ~~**Should `locus run` also handle git operations?**~~ **Resolved:** Locus manages git operations (commit, push, PR creation). The AI agent focuses on code changes only.
6. ~~**Parallel vs sequential for sprints?**~~ **Resolved:** Sprints are always sequential (order:N labels). Only standalone issues use worktrees.
7. ~~**Order label limit:**~~ **Resolved:** Dynamic creation. `order:N` labels are created on-the-fly as needed (no pre-created cap). Ordering follows strict logical rules — see "Order Label Management" section below.
8. ~~**Iterate scope:**~~ **Resolved:** `locus iterate` only addresses feedback on the specific PR — no downstream task awareness. The PR review comments are self-contained; the agent re-executes on that PR's branch, applies the requested changes, and commits. If downstream tasks break as a result, that surfaces naturally when those tasks are (re-)executed.

---

## Testing Strategy

V3 uses **Bun test** (`bun:test`) as the sole test framework — no Jest, no additional dependencies. Tests live alongside source code in `__tests__/` directories.

### Test Framework & Conventions

- **Runner:** `bun test` (built-in, zero-config, fast)
- **File pattern:** `src/**/__tests__/*.test.ts`
- **Assertions:** `bun:test` built-in `expect` (Jest-compatible API)
- **No external test deps** — consistent with V3's zero-runtime-dependency philosophy. Mocks use manual stubs & `bun:test`'s `mock()` / `spyOn()`.

### Test Directory Structure

```
locus-v3/
├── src/
│   ├── core/
│   │   ├── __tests__/
│   │   │   ├── github.test.ts         # GitHub CLI wrapper (mocked gh calls)
│   │   │   ├── config.test.ts         # Config loading, saving, defaults, schema validation
│   │   │   ├── context.test.ts        # Repo context detection (remote parsing, branch detection)
│   │   │   ├── worktree.test.ts       # Worktree lifecycle (create, remove, list, cleanup)
│   │   │   ├── run-state.test.ts      # Execution state persistence, resume logic, label reconciliation
│   │   │   ├── prompt-builder.test.ts # Context assembly (sprint context, feedback context, truncation)
│   │   │   └── agent.test.ts          # Agent orchestration (sprint sequential, parallel, iterate)
│   │   ├── github.ts
│   │   ├── config.ts
│   │   └── ...
│   ├── ai/
│   │   ├── __tests__/
│   │   │   ├── runner.test.ts         # Factory pattern, provider selection, fallback
│   │   │   ├── claude.test.ts         # Claude subprocess spawning, stream parsing, abort
│   │   │   └── codex.test.ts          # Codex subprocess spawning, stream parsing, abort
│   │   └── ...
│   ├── repl/
│   │   ├── __tests__/
│   │   │   ├── input-history.test.ts  # Persistent history (load, save, dedup, prefix search, max entries)
│   │   │   ├── commands.test.ts       # Slash command parsing, dispatch, argument handling
│   │   │   ├── completions.test.ts    # Tab completion (slash commands, file paths, cycling)
│   │   │   ├── session-manager.test.ts # Session CRUD, partial-ID resume, pruning, schema migration
│   │   │   └── image-detect.test.ts   # Image path detection (escaped, quoted, ~/, macOS patterns)
│   │   └── ...
│   ├── display/
│   │   ├── __tests__/
│   │   │   ├── stream-renderer.test.ts  # Newline-gated buffering, gear switching, markdown parsing
│   │   │   ├── tool-renderer.test.ts    # Tool card formatting, diff truncation, output preview
│   │   │   ├── diff-renderer.test.ts    # Unified diff rendering, color codes, line numbers
│   │   │   ├── json-stream.test.ts      # NDJSON event serialization, event types, contract validation
│   │   │   └── terminal.test.ts         # Terminal capability detection, dimension handling
│   │   └── ...
│   ├── commands/
│   │   ├── __tests__/
│   │   │   ├── init.test.ts           # Init flow (label creation, config generation, idempotency)
│   │   │   ├── issue.test.ts          # Issue CRUD (create, list, filter, label, close)
│   │   │   ├── sprint.test.ts         # Sprint management (create, order, reorder, active)
│   │   │   ├── run.test.ts            # Run orchestration (mode detection, resume, failure handling)
│   │   │   ├── exec.test.ts           # Exec entry point (REPL init, one-shot, session subcommands)
│   │   │   ├── review.test.ts         # Review flow (PR fetching, AI invocation, comment posting)
│   │   │   └── iterate.test.ts        # Iterate flow (feedback extraction, re-execution, comment filtering)
│   │   └── ...
│   └── __tests__/
│       └── types.test.ts              # Type/schema validation, config schema, run-state schema
```

### Test Categories

#### 1. Unit Tests (Pure Logic — No I/O)

These test internal algorithms and data transformations with no subprocess calls, no file I/O, and no network. They run in milliseconds.

| Module | What to Test |
|--------|-------------|
| `core/config.ts` | Schema validation, default merging, partial config updates, version migration chain (3.0→3.1→3.2), unknown key preservation |
| `core/run-state.ts` | State transitions (`pending→in_progress→done/failed`), resume logic (skip done, retry failed), label-vs-state reconciliation |
| `core/logger.ts` | Log level filtering, NDJSON format validation, sensitive data redaction (API keys, tokens never logged), file rotation (count + size limits), buffered flush on exit |
| `core/rate-limiter.ts` | Header parsing (`X-RateLimit-*`), threshold detection (warn at <100, pause at <20), exponential backoff on 403/429, state persistence (load/save `.locus/rate-limit.json`), request batching helpers |
| `core/conflict.ts` | Base branch drift detection (`git fetch` + `git rev-list`), rebase success path, rebase conflict path (abort + file list), no-drift path (skip rebase) |
| `core/prompt-builder.ts` | Context assembly order, sprint context inclusion, feedback context formatting, token-budget truncation, empty-field handling |
| `core/context.ts` | Git remote URL parsing (`ssh`, `https`, `git@`), owner/repo extraction, default branch detection |
| `repl/input-history.ts` | Load/save cycle, deduplication of consecutive entries, prefix search, max-entry pruning, newline escaping in entries |
| `repl/commands.ts` | Slash command parsing (`/help`, `/model opus`, `/diff`), alias resolution (`/h`→`/help`, `/q`→`/exit`), unknown command handling |
| `repl/completions.ts` | Slash command completion, file path completion, cycling behavior, empty-input completion |
| `repl/session-manager.ts` | Session creation, partial-ID matching (unique vs ambiguous), auto-pruning (age + count), metadata schema |
| `repl/image-detect.ts` | macOS escaped-space paths, quoted paths, `~/` expansion, non-image file rejection, multiple images in one input |
| `display/stream-renderer.ts` | Newline-gated buffering (partial lines stay buffered), gear switching (smooth→catch-up at threshold), flush on finalization |
| `display/diff-renderer.ts` | Addition/deletion coloring, line number gutter, context lines, truncation with "+N more lines" |
| `display/tool-renderer.ts` | Card formatting per tool type (Read, Edit, Bash, Grep), diff embedding for Edit, output truncation for Bash |
| `display/json-stream.ts` | NDJSON event serialization, all event types (`start`, `text_delta`, `tool_started`, `tool_completed`, `done`, `error`), `diff` field in Edit events |
| `display/terminal.ts` | True-color detection from `$COLORTERM`, terminal width from `$COLUMNS`, fallback values |
| `ai/runner.ts` | Factory dispatch (`'claude'`→`ClaudeRunner`, `'codex'`→`CodexRunner`), invalid provider error, fallback behavior |
| Sprint reorder algorithm | Frozen completed orders, floor calculation, gap handling, full-coverage edge cases (all completed, all pending, mixed) |

#### 2. Integration Tests (Mocked External — Subprocess & File System)

These test command flows end-to-end but **mock all external tools** (`gh`, `git`, `claude`, `codex`). They exercise the real wiring between modules.

**Mocking strategy:** Create a `test-helpers/` directory with:

```typescript
// src/__tests__/test-helpers/mock-gh.ts
// Intercepts child_process.spawn/exec calls to `gh` and returns canned responses.
// Usage: mockGh({ 'issue list': '[]', 'label create': '' })

// src/__tests__/test-helpers/mock-fs.ts
// In-memory filesystem for config, sessions, run-state files.
// Usage: const fs = createMockFs({ '.locus/config.json': '{}' })

// src/__tests__/test-helpers/mock-runner.ts
// Fake AgentRunner that returns predetermined results.
// Usage: const runner = createMockRunner({ success: true, output: 'Done' })

// src/__tests__/test-helpers/fixtures.ts
// Reusable test data: sample issues, milestones, PRs, configs, run-states.
```

| Test Suite | What to Test |
|------------|-------------|
| `commands/init.test.ts` | Full init flow: checks → config creation → label creation → .gitignore update. Idempotent re-run doesn't overwrite LOCUS.md. Missing `gh` → helpful error. |
| `commands/issue.test.ts` | Create issue with labels + milestone. List with filters (sprint, priority, status). Show single issue. Label multiple issues. Close with reason. |
| `commands/sprint.test.ts` | Create milestone. Set active sprint. Show sprint with ordered tasks. **Reorder:** verify frozen completed orders, verify pending tasks get `floor+1` numbering, verify gap tolerance. |
| `commands/run.test.ts` | **Sprint mode:** sequential execution in order:N, skip `done`, retry `failed`, stop on failure, save run-state. **Parallel mode:** worktree creation per issue, concurrent execution up to `maxParallel`, cleanup on success. **Resume:** load run-state, reconcile with GitHub labels, continue from correct point. **Mode detection:** sprint issues → sequential, standalone → parallel, mixed → error. |
| `commands/exec.test.ts` | REPL initialization (session creation, greeting). One-shot mode (single prompt → result → exit). Session resume by partial ID. JSON-stream mode event emission. |
| `commands/review.test.ts` | Fetch PRs with `agent:managed` label, get diffs, invoke AI runner, post review comments. |
| `commands/iterate.test.ts` | Fetch PR comments after last agent commit, build feedback prompt, re-execute, push result. Filter stale comments. Handle PR with no new comments (skip). |
| `core/agent.test.ts` | `executeIssue`: label updates (queued→in-progress→done/failed), PR creation, issue commenting. `runSprint`: order enforcement, cumulative diff passing, stop-on-failure. `runParallel`: worktree spawn/cleanup, concurrency queue. `iterateOnPR`: feedback extraction, same-branch push. |
| `core/github.test.ts` | All `gh` CLI invocations map to correct arguments. Error handling: `gh` not installed, auth expired, rate limited, network failure. JSON response parsing. `ensureOrderLabel` creates label only if missing. Rate limit header extraction from subprocess output. Request batching (multiple label changes in single API call). |
| `core/worktree.test.ts` | Create worktree at correct path, branch naming, cleanup on success, preserve on failure, stale worktree detection. |
| `core/conflict.test.ts` | Integration: base branch drift with real `git` (mocked remote), rebase with/without conflicts, abort + file list on conflict. Sprint run with `rebaseBeforeTask: true` triggers conflict check before each task. |
| `commands/logs.test.ts` | View recent logs, filter by level, `--follow` mode, `--clean` prunes old files, respects maxFiles/maxTotalSizeMB config. |
| `commands/upgrade.test.ts` | Version comparison (current < latest → prompt, current = latest → "up to date"), `--check` mode (no install), config migration triggered after upgrade, network failure handling. |

#### 3. REPL Behavior Tests (Simulated TTY)

These test the REPL's interactive behavior by simulating terminal input/output sequences. They don't require a real TTY — they mock `process.stdin`/`process.stdout` and verify the output.

| Test | What to Test |
|------|-------------|
| Turn lifecycle | User input → AI stream → tool display → completion summary → prompt return |
| Message queuing | Type during processing → queued messages visible → sent after turn completes |
| Interrupt handling | First Ctrl+C → cancel current → return to prompt. Second Ctrl+C → exit + save session |
| Slash command dispatch | `/help` → shows command list. `/model opus` → switches model. `/diff` → shows cumulative diff. `/undo` → reverts last change |
| Session persistence | REPL exit → session saved. Resume → previous messages loaded. Auto-prune old sessions |
| Retry on API error | Transient error → backoff display → retry → success. Max retries → fail gracefully |
| Stream rendering | Text deltas → buffered until newline → rendered as markdown. Code blocks syntax highlighted. Tool cards with diffs |

#### 4. Contract Tests (Schema Validation)

These ensure the data contracts between V3 CLI and the VSCode extension remain stable. If schemas change, these tests catch it before the extension breaks.

| Test | What to Test |
|------|-------------|
| `json-stream.test.ts` | All NDJSON event types match the documented schema. Round-trip: create → serialize → parse. Extension-required fields present (`diff` in Edit events, `retryable` in error events) |
| `types.test.ts` | `config.json` schema validates sample configs. `run-state.json` schema validates sample states. Session file schema validates sample sessions. Schema rejects invalid data with descriptive errors |
| Session file format | Backward compatibility: V3.0 session files parse correctly in V3.1. Required fields enforced. Optional fields default correctly |

#### 5. Edge Case Tests

Dedicated tests for known tricky scenarios that could regress:

| Scenario | Test |
|----------|------|
| Sprint with all tasks completed | `locus sprint order` → "Nothing to reorder" |
| Sprint with all tasks pending | Reorder freely from `order:1` |
| Sprint with gaps (1, 2, 5, 8) | Execution sorts numerically, gaps skipped |
| Reorder tries to include completed task | Error: "Task #3 is completed and cannot be reordered" |
| Resume with stale `run-state.json` | GitHub labels override local state |
| `gh` CLI not installed | Helpful error with install link |
| AI provider not installed | Helpful error naming the missing tool |
| Network failure mid-sprint | State saved, clear resume instructions |
| Session resume with ambiguous partial ID | Error listing matching sessions |
| Empty sprint (no issues) | `locus run` → "No issues in sprint" |
| Concurrent `locus run` attempts | Lock file prevents overlap |
| Config file with unknown keys | Ignored (forward compatibility) |
| Config file with missing required keys | Defaults applied, warning shown |
| Image path with spaces and special characters | Correctly detected and copied |
| Very long AI response | Gear switching to catch-up mode, no lag |
| Context window near limit | Conversation summarized, older messages compressed |
| GitHub API rate limit hit mid-sprint | Auto-pause with countdown timer, resume when window resets, state preserved |
| Rate limit remaining < 20 | Preemptive pause before hitting hard limit |
| Base branch advances during sprint | Detect drift, attempt rebase, stop on conflict with instructions |
| Rebase conflict on specific files | Abort rebase, list conflicting files, clear resolution instructions |
| Parallel issues edit same file | Each PR merges independently, GitHub detects conflicts on second PR |
| Config version migration (3.0 → 3.2) | Migrations applied in order, unknown keys preserved, defaults added |
| `locus upgrade` with no network | Graceful error: "Cannot check for updates. Verify network connection." |
| Log directory exceeds size limit | Auto-prune oldest logs to stay under 50MB |

### Test Infrastructure

#### `src/__tests__/test-helpers/`

```typescript
// mock-gh.ts — Mock GitHub CLI
export function createGhMock(responses: Record<string, string | Error>) {
  // Returns a function that intercepts spawn('gh', [...args])
  // Matches command pattern and returns canned stdout/stderr
  // Tracks invocations for assertion: expect(gh.calls).toContainEqual([...])
}

// mock-fs.ts — In-memory filesystem
export function createMockFs(files: Record<string, string>) {
  // Overrides fs.readFileSync, fs.writeFileSync, fs.existsSync
  // Tracks writes for assertion: expect(fs.written['.locus/config.json']).toContain(...)
}

// mock-runner.ts — Fake AI runner
export function createMockRunner(result: Partial<RunnerResult>) {
  // Implements AgentRunner interface
  // Returns predetermined result from execute()
  // Tracks calls: expect(runner.executed).toHaveLength(3)
  // Supports streaming: onOutput callback receives chunked text
}

// fixtures.ts — Reusable test data
export const fixtures = {
  config: { minimal: {...}, full: {...}, invalid: {...} },
  issues: { simple: {...}, withLabels: {...}, sprintIssue: {...} },
  milestones: { active: {...}, completed: {...} },
  prs: { open: {...}, reviewed: {...}, withComments: {...} },
  runState: { fresh: {...}, partiallyCompleted: {...}, allDone: {...} },
  sessions: { empty: {...}, withHistory: {...}, expired: {...} },
}
```

#### Test Scripts (`package.json`)

```jsonc
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test src/core/__tests__ src/repl/__tests__ src/display/__tests__ src/ai/__tests__",
    "test:integration": "bun test src/commands/__tests__",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

### Test Execution in CI

Tests run as part of the Turbo pipeline and are a gate for publishing:

```
build → test:unit → test:integration → (publish only if all pass)
```

- Unit tests run first (fast, catch logic bugs early)
- Integration tests run second (slower, catch wiring bugs)
- No flaky tests allowed — all external I/O is mocked
- Coverage target: **80%+ for core/ and repl/ modules** (display modules may have lower coverage due to ANSI output complexity)

---

## Acceptance Criteria

- [ ] `locus init` successfully sets up a project with GitHub label creation (priority, type, status, agent — order labels are dynamic)
- [ ] `locus issue create/list/show` works for full issue lifecycle
- [ ] `locus sprint create/list/show/active/order` manages milestones with task ordering
- [ ] `locus sprint order` only reorders non-completed tasks; completed task orders are frozen
- [ ] Reordered tasks always get order numbers starting after the highest completed order
- [ ] `locus plan` generates issues with `order:N` labels for sprint execution sequence
- [ ] `locus run` (sprint mode) executes issues sequentially in order:N sequence — **no worktrees**
- [ ] `locus run <numbers>` (standalone) runs issues in parallel via worktrees
- [ ] `locus run --resume` skips completed tasks, retries failed tasks, continues pending
- [ ] Sprint execution stops on failure with clear recovery instructions
- [ ] `run-state.json` persists execution state; GitHub labels are source of truth
- [ ] `locus review` reviews PRs with AI and posts actionable comments
- [ ] `locus iterate` re-executes agents with PR feedback until PR is merged
- [ ] `locus iterate` correctly fetches comments posted after last agent commit
- [ ] `locus exec` provides a polished REPL experience (markdown rendering, tool cards, shimmer indicator)
- [ ] REPL streams AI output with newline-gated rendering and adaptive pacing (no flickering, no lag)
- [ ] Tool executions show compact cards with inline diffs for Edit operations
- [ ] REPL input supports Up/Down history navigation, Left/Right cursor movement, Tab completion
- [ ] Input history persists across sessions (`.locus/sessions/.input-history`)
- [ ] Slash commands work: `/help`, `/clear`, `/reset`, `/diff`, `/undo`, `/model`, `/compact`, `/verbose`
- [ ] Sessions are auto-saved and resumable by partial ID (`locus exec -s abc`)
- [ ] Message queuing works: user can type while agent is processing
- [ ] Transient API errors are retried automatically with exponential backoff (visible to user)
- [ ] JSON stream mode (`--json-stream`) emits structured NDJSON events for VSCode extension
- [ ] JSON stream Edit events include unified diff for inline editor display
- [ ] `locus status` shows project dashboard with sprint order and failure status
- [ ] Graceful handling of API limits, network failures, and process crashes
- [ ] **Logging:** `--debug` flag produces verbose NDJSON log files in `.locus/logs/`
- [ ] **Logging:** `locus logs` shows recent execution logs with level filtering
- [ ] **Logging:** Logs auto-prune (max 20 files / 50MB total)
- [ ] **Logging:** Sensitive data (API keys, tokens) is never written to log files
- [ ] **Rate Limiting:** GitHub API rate limit headers are tracked across all `gh` calls
- [ ] **Rate Limiting:** Preemptive throttle when remaining < 20 (pause with countdown, not a hard crash)
- [ ] **Rate Limiting:** Clear, actionable error message when rate-limited (shows reset time, options)
- [ ] **Rate Limiting:** Sprint execution checks rate budget before each task
- [ ] **Merge Conflicts:** Base branch drift detected before each sprint task (when `rebaseBeforeTask: true`)
- [ ] **Merge Conflicts:** Automatic rebase attempted; on conflict, clean abort with conflicting file list
- [ ] **Merge Conflicts:** Parallel standalone PRs rely on GitHub's native conflict detection (no custom merge)
- [ ] **Upgrade:** `locus upgrade` checks npm registry and installs latest version
- [ ] **Upgrade:** Non-blocking version check on startup (24h cooldown, one-line notice after command completes)
- [ ] **Upgrade:** Config migration runs automatically when `config.json` version is behind CLI version
- [ ] **Upgrade:** Config migrations preserve unknown keys (forward compatibility)
- [ ] Zero runtime dependencies
- [ ] Single `npm install -g` installation
- [ ] Works with any GitHub repository
- [ ] **Testing:** `bun test` passes with 0 failures before any release
- [ ] **Testing:** Unit tests cover all pure-logic modules (config, run-state, reorder, prompt-builder, session-manager, input-history, completions, slash commands, display renderers, AI runner factory)
- [ ] **Testing:** Integration tests cover all command flows with mocked `gh`/`git`/AI (init, issue, sprint, run, exec, review, iterate)
- [ ] **Testing:** Contract tests validate NDJSON event schema, config schema, run-state schema, and session schema
- [ ] **Testing:** Sprint reorder edge cases all pass (frozen orders, floor calculation, gaps, all-done, all-pending, empty sprint)
- [ ] **Testing:** REPL behavior tests cover turn lifecycle, message queuing, interrupt handling, and session persistence
- [ ] **Testing:** 80%+ code coverage on `core/` and `repl/` modules
- [ ] **Testing:** Zero external I/O in unit tests (all mocked — no real `gh`, `git`, or AI calls)
- [ ] **Testing:** Test infrastructure provides reusable helpers (mock-gh, mock-fs, mock-runner, fixtures)
