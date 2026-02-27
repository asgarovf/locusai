---
description: How Locus executes tasks -- sprint mode, standalone mode, run state, resume, and conflict handling.
---

# Execution Model

{% hint style="info" %}
For operator guidance on safeguards, boundaries, and rollback in high-automation runs, see [Auto-Approval Mode](auto-approval-mode.md).
{% endhint %}

## Overview

Locus supports two execution modes:

- **Sprint mode** -- Tasks run sequentially on a single branch
- **Standalone mode** -- Tasks run in parallel using git worktrees

The mode is determined automatically based on how you invoke `locus run`.

---

## Sprint Mode (Sequential)

Sprint mode is activated when you run `locus run` with an active sprint and no issue numbers.

```bash
# Set active sprint and run
locus sprint active "Sprint 1"
locus run
```

### How It Works

1. Locus creates (or checks out) a branch named `locus/sprint-<name>`, derived from the sprint title. For example, sprint "Sprint 1" produces branch `locus/sprint-sprint-1`.

2. Issues are fetched from the milestone and sorted by their `order:N` labels.

3. Each task is executed sequentially on this single branch. After task N completes, task N+1 begins on the same branch with all of task N's changes already present.

4. Before each task (except the first), Locus provides **sprint context** -- the cumulative diff from the base branch -- so the AI agent knows what previous tasks changed and can build upon that work.

5. Execution state is persisted continuously, and PR creation is handled automatically when `agent.autoPR` is enabled (sprint-level PR for sprint runs, issue PRs for standalone runs).

### Why Sequential

Sprint tasks are designed to build on each other. Task 2 may depend on files created by task 1. Running them on a single branch in order ensures each task sees the full state of all previous work without merge conflicts between tasks.

### Sprint Branch Naming

The branch name follows the pattern:

```
locus/sprint-<normalized-sprint-name>
```

The sprint name is lowercased and spaces are replaced with hyphens. For example:

| Sprint Name       | Branch                          |
|--------------------|---------------------------------|
| Sprint 1           | `locus/sprint-sprint-1`         |
| Auth Feature       | `locus/sprint-auth-feature`     |
| v2.0 Migration     | `locus/sprint-v2.0-migration`   |

---

## Standalone Mode (Parallel)

Standalone mode is activated when you pass one or more issue numbers to `locus run`.

### Single Issue

```bash
locus run 42
```

A single standalone issue runs in a git worktree at `.locus/worktrees/issue-42` on a branch named `locus/issue-42`. The worktree is branched from the configured base branch (typically `main`).

After execution:
- On success, the worktree is cleaned up automatically
- On failure, the worktree is preserved for debugging

### Multiple Issues (Parallel)

```bash
locus run 42 43 44
```

Multiple standalone issues run in parallel, each in its own git worktree. Concurrency is controlled by the `agent.maxParallel` config setting (default: 3).

Issues are processed in batches. If you have 6 issues and `maxParallel` is 3, the first 3 run concurrently, then the next 3 start after the first batch completes.

### Worktree Layout

```
.locus/worktrees/
  issue-42/     # Branch: locus/issue-42
  issue-43/     # Branch: locus/issue-43
  issue-44/     # Branch: locus/issue-44
```

Each worktree is a full checkout of the repository at the base branch. The AI agent works inside the worktree directory, making changes independently of the main working tree.

### Restrictions

Sprint issues (those assigned to a milestone) cannot be run in parallel. If you attempt to pass sprint issue numbers to `locus run`, it will reject the request and direct you to use sprint mode instead.

---

## Task Lifecycle

Each task moves through the following statuses during execution:

```
pending --> in_progress --> done
                       \-> failed
```

### Pending

The task is queued for execution. Its GitHub label is `locus:queued`.

### In Progress

The task is currently being executed by an AI agent. Locus updates the GitHub label to `locus:in-progress` and removes `locus:queued` and `locus:failed` (in case of retry).

### Done

The AI agent completed the task successfully. Locus:
- Updates the label to `locus:done`
- Creates a PR (if `agent.autoPR` is enabled)
- Posts a summary comment on the issue with duration and PR number

### Failed

The AI agent encountered an error. Locus:
- Updates the label to `locus:failed`
- Posts an error comment on the issue with the failure message and duration
- In sprint mode with `sprint.stopOnFailure` enabled (default), stops the sprint

---

## Run State Persistence

Locus tracks execution progress in `.locus/run-state.json`. This file is written after every task status change, providing a checkpoint that survives process interruption.

### Run State Structure

```json
{
  "runId": "run-2026-02-24T10-30-00",
  "type": "sprint",
  "sprint": "Sprint 1",
  "branch": "locus/sprint-sprint-1",
  "startedAt": "2026-02-24T10:30:00.000Z",
  "tasks": [
    { "issue": 15, "order": 1, "status": "done", "pr": 20, "completedAt": "..." },
    { "issue": 16, "order": 2, "status": "failed", "failedAt": "...", "error": "..." },
    { "issue": 17, "order": 3, "status": "pending" }
  ]
}
```

The run state is automatically deleted when all tasks complete successfully.

---

## Resume from Failures

The `--resume` flag picks up where a previous run left off:

```bash
locus run --resume
```

Resume mode:

1. Loads the existing run state from `.locus/run-state.json`
2. For sprint runs, checks out the sprint branch
3. Finds the first failed task (for retry) or the next pending task
4. Resets failed tasks to pending and re-executes them
5. Continues through remaining pending tasks

If `sprint.stopOnFailure` is enabled and a retried task fails again, the sprint stops and you can resume again after addressing the issue.

---

## Conflict Handling and Rebase

During sprint execution, the base branch may advance (e.g., someone merges a PR to `main`). Locus detects this and handles it automatically.

### Detection

Before each task (starting from the second task), if `agent.rebaseBeforeTask` is enabled (default), Locus:

1. Fetches the latest base branch from origin
2. Finds the merge base between the sprint branch and the remote base
3. Checks if the base branch has new commits since the merge base
4. Identifies overlapping files (files changed in both branches)

### Auto-Rebase

If the base branch advanced but there are no file-level conflicts, Locus automatically rebases the sprint branch onto the latest base:

```
Base branch advanced (3 new commits) -- auto-rebasing...
```

### Conflict Resolution

If overlapping files are detected (both the sprint branch and base branch modified the same files), Locus stops the sprint and provides instructions:

```
Merge conflict detected

  Base branch origin/main has 3 new commits
  The following files were modified in both branches:

    - src/auth/login.ts
    - src/middleware/auth.ts

  To resolve:
    1. git rebase origin/main
    2. Resolve conflicts in the listed files
    3. git rebase --continue
    4. locus run --resume to continue the sprint
```

After you resolve the conflicts manually, `locus run --resume` continues execution from where it stopped.

---

## PR Creation

When execution produces completed work and `agent.autoPR` is enabled (default), Locus creates PRs automatically:

1. Checks if there are changes to push (compares the current branch against `origin/<baseBranch>`)
2. Pushes the branch to origin
3. Creates a PR via `gh pr create`:
   - **Standalone issue runs:** title like `<issue title> (#<issue number>)`, body includes `Closes #<issue number>`
   - **Sprint runs:** title like `Sprint: <sprint name>`, body includes `Closes #<issue>` lines for completed tasks
   - **Base/Head:** base is your configured base branch (for example `main`), head is the run branch

In sprint runs, Locus opens a single sprint-level PR that references all completed issues. In standalone issue runs, it opens issue-level PRs.

The `Closes #N` syntax ensures GitHub automatically closes the issue when the PR is merged.

---

## Dry Run

The `--dry-run` flag simulates execution without making any changes:

```bash
locus run --dry-run
```

In dry-run mode, Locus:
- Fetches issues and displays the execution plan
- Shows provider, model, and prompt length for each task
- Does not create branches, run AI agents, update labels, or create PRs

This is useful for verifying sprint configuration and task ordering before committing to a full run.

---

## Interruption

Pressing **ESC** or **Ctrl+C** during execution triggers a graceful interruption:

- First press: sends SIGTERM to the running AI process, preserves partial output, and stops execution
- Second press within 2 seconds: force-exits immediately

The run state is saved before the process exits, so `locus run --resume` can pick up where the interruption occurred.

---

## Configuration Reference

These config values control execution behavior:

| Config Path                | Default    | Description                                     |
|----------------------------|------------|-------------------------------------------------|
| `agent.maxParallel`        | `3`        | Max concurrent tasks in parallel mode            |
| `agent.autoLabel`          | `true`     | Automatically update issue labels during execution |
| `agent.autoPR`             | `true`     | Automatically create PRs for completed tasks     |
| `agent.baseBranch`         | `main`     | Base branch for PRs and worktree creation        |
| `agent.rebaseBeforeTask`   | `true`     | Check for base branch drift between tasks        |
| `sprint.stopOnFailure`     | `true`     | Stop sprint execution when a task fails          |
| `sprint.active`            | `null`     | Name of the currently active sprint              |

## Related Docs

- [Auto-Approval Mode](auto-approval-mode.md)
- [Built-In Tools](../cli/overview.md)
- [locus run](../cli/run.md)
