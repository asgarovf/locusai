---
description: Manage sprints via GitHub Milestones. Create, list, show progress, reorder tasks, and close sprints.
---

# locus sprint

Manage sprints using GitHub Milestones as the backing store. Sprints group issues into time-boxed iterations with execution ordering and progress tracking.

**Alias:** `locus s`

## Usage

```bash
locus sprint <subcommand> [options]
```

If no subcommand is provided, `list` is used by default.

---

## Subcommands

### create (c)

Create a new sprint (GitHub Milestone).

```bash
locus sprint create "<name>" [options]
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--due` | `-d` | Due date in `YYYY-MM-DD` format |
| `--description` | `--desc` | Sprint description |

**Examples:**

```bash
locus sprint create "Sprint 1" --due 2026-03-07
locus sprint create "Sprint 2" --due 2026-03-21 --description "API and auth features"
```

---

### list (ls)

List all sprints with progress indicators.

```bash
locus sprint list [options]
locus sprint              # Same as 'locus sprint list'
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | `-a` | Include closed sprints (default shows only open) |

The output shows each sprint's name, progress bar, open/closed issue counts, state, and due date.

**Examples:**

```bash
locus sprint list
locus sprint list --all
```

---

### show

Show detailed sprint information including issue breakdown and execution order.

```bash
locus sprint show "<name>"
```

Displays progress percentage, due date, state, and a table of all tasks sorted by their `order:N` labels. Completed tasks are marked as "frozen" (their order cannot be changed).

**Examples:**

```bash
locus sprint show "Sprint 1"
```

---

### order

Reorder tasks within a sprint. Completed (done) tasks are "frozen" and cannot be reordered. Only open tasks can have their order changed.

```bash
locus sprint order "<name>" [issue-numbers...]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--show` | Display current order without making changes |

When called without issue numbers, displays the reorderable tasks and a usage hint. When called with issue numbers, assigns new `order:N` labels starting from one position above the highest completed task order.

All reorderable issue numbers must be included in the new order. Duplicates and completed issues are rejected.

**Examples:**

```bash
# View current order
locus sprint order "Sprint 1" --show

# See reorderable tasks and usage hint
locus sprint order "Sprint 1"

# Reorder tasks: issue 17 first, then 15, then 16
locus sprint order "Sprint 1" 17 15 16
```

---

### close

Close a sprint (milestone).

```bash
locus sprint close "<name>"
```

**Examples:**

```bash
locus sprint close "Sprint 1"
```

---

## How Sprints Work

Sprints in Locus are backed by GitHub Milestones:

- **Issues** are assigned to sprints via the milestone field.
- **Execution order** is tracked with `order:N` labels on each issue.
- **Progress** is calculated from the milestone's open vs. closed issue counts.
- **Auto-detection** — `locus run` automatically discovers all open sprints via the GitHub API. No manual activation is needed.

When `locus run` executes a sprint, it creates a worktree at `.locus/worktrees/sprint-<slug>/` and processes issues sequentially within it, in ascending order of their `order:N` labels. Multiple sprints run in parallel, each in its own worktree.
