---
description: Execute issues using AI agents. Supports sprint mode (parallel worktrees, sequential within each sprint), single issue mode, and parallel issue mode.
---

# locus run

The core execution command. Runs AI agents to implement GitHub issues. Supports three execution modes depending on the arguments provided.

## Usage

```bash
locus run [issue-numbers...] [options]
```

---

## Options

| Flag | Description |
|------|-------------|
| `--sprint <name>` | Run a specific sprint instead of all open sprints |
| `--resume` | Resume a previously interrupted run (sprint or parallel) |
| `--dry-run` | Show what would happen without executing agents or making changes |
| `--model <name>` | Override the AI model for this run |
| `--no-sandbox` | Disable Docker sandbox isolation (shows safety warning) |
| `--sandbox=require` | Require Docker sandbox — fail if unavailable |

---

## Execution Modes

### Sprint Mode (no arguments)

When called without issue numbers, Locus auto-detects all open sprints (GitHub Milestones) and runs them. If multiple sprints are open, they execute in parallel — each in its own git worktree. Tasks within a sprint are executed sequentially.

```bash
# Run all open sprints
locus run

# Run a specific sprint
locus run --sprint "Sprint 1"
```

**How it works:**

1. Auto-detects all open milestones via the GitHub API (or uses `--sprint` to target one).
2. For each sprint, creates a worktree at `.locus/worktrees/sprint-<slug>/` with a unique branch.
3. Fetches all open issues in the sprint, sorted by `order:N` labels.
4. Executes each issue sequentially within the worktree using the configured AI agent.
5. Passes a cumulative diff of previous tasks as context to later tasks.
6. Tracks progress in `.locus/run-state/<sprint-slug>.json`.

If `sprint.stopOnFailure` is `true`, the sprint halts when a task fails. The default is `false` — failed tasks are skipped and the sprint continues to the next task. Resume failed tasks with `locus run --resume`.

Before each task (when `agent.rebaseBeforeTask` is enabled), Locus checks for conflicts with the base branch and attempts an auto-rebase.

### Single Issue Mode (one argument)

Run a single issue. If the issue belongs to a sprint, it runs on the current branch without a worktree. If it is a standalone issue, it runs in an isolated git worktree.

```bash
locus run 42
```

**How it works:**

1. Checks if the issue is part of a sprint (has a milestone).
2. For sprint issues: executes directly in the project root.
3. For standalone issues: creates a worktree at `.locus/worktrees/issue-42/` with a branch like `locus/issue-42`.
4. After execution, worktrees are cleaned up on success and preserved on failure for debugging.

### Parallel Mode (multiple arguments)

Run multiple standalone issues concurrently, each in its own worktree.

```bash
locus run 42 43 44
```

**How it works:**

1. Validates that none of the issues are sprint issues (sprint issues must run sequentially).
2. Cleans up any stale worktrees.
3. Creates a worktree for each issue.
4. Executes issues in batches up to `agent.maxParallel` concurrency.
5. Worktrees are cleaned up on success, preserved on failure.

---

## Resuming Runs

If a sprint or parallel run is interrupted (by failure, signal, or crash), use `--resume` to pick up where you left off.

```bash
locus run --resume
```

Resume scans the `.locus/run-state/` directory for resumable runs, skips completed tasks, retries failed tasks, and continues with pending ones. Use `--sprint <name>` to resume a specific sprint. For sprint runs, the worktree is reused automatically.

---

## Run State

Active runs are tracked in `.locus/run-state/<sprint-slug>.json` (sprint runs) or `.locus/run-state/_parallel.json` (parallel runs), with:

- Run ID and type (`sprint` or `parallel`)
- Sprint name and branch (for sprint runs)
- Per-task status: `pending`, `in_progress`, `done`, `failed`
- Associated PR numbers for completed tasks
- Error messages for failed tasks

Each sprint has independent state, enabling parallel sprint execution. The run state file is cleared when all tasks complete successfully.

---

## Sandbox Isolation

Locus runs `locus run` through provider sandboxes created by `locus sandbox`. This uses Docker Desktop sandboxes (4.58+) with the same isolation model for Claude and Codex.

| Scenario | Behavior |
|----------|----------|
| Docker 4.58+ installed and provider sandboxes configured | Sandbox used |
| Docker not available | Warning printed, runs unsandboxed |
| `--no-sandbox` | Sandbox disabled, interactive safety warning shown |
| `--sandbox=require` | Sandbox required — exits with error if unavailable |

Provider sandboxes are persistent and reused across runs until explicitly removed with `locus sandbox rm`.

See also: [locus sandbox](sandbox.md) and [Security & Sandboxing](../concepts/security-sandboxing.md)

---

## Examples

```bash
# Run all open sprints (auto-detected)
locus run

# Run a specific sprint
locus run --sprint "Sprint 1"

# Preview sprint execution
locus run --dry-run

# Run a single issue
locus run 42

# Run multiple issues in parallel
locus run 42 43 44

# Resume after a failure
locus run --resume

# Run with a different model
locus run --model claude-sonnet-4-6

# Disable sandbox
locus run 42 --no-sandbox

# Require sandbox (fail if Docker unavailable)
locus run 42 --sandbox=require
```

---

## Rate Limiting

Locus includes built-in rate limiting to avoid overloading AI provider APIs. Before each task, the rate limiter is consulted. If limits are approaching, execution pauses automatically until capacity is available.
