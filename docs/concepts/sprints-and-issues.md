---
description: How to create, organize, and manage sprints and issues in Locus using GitHub Milestones and Issues.
---

# Sprints and Issues

## Overview

In Locus, **issues are tasks** and **sprints are milestones**. You create GitHub Issues with structured labels to define work, group them under GitHub Milestones to form sprints, and use order labels to control execution sequence.

---

## Creating Issues

Issues can be created through the Locus CLI or directly on GitHub. The CLI adds the correct labels automatically.

### Via the CLI

```bash
# Basic issue
locus issue create "Add input validation for email field"

# With type and priority
locus issue create "Fix broken pagination" --type bug --priority critical

# Assigned to a sprint
locus issue create "Write API documentation" --type docs --priority medium --sprint "Sprint 1"
```

When created through the CLI, issues are automatically labeled with:
- A type label (e.g., `type:feature`)
- A priority label (e.g., `p:high`)
- The status label `locus:queued`
- The `agent:managed` label
- A milestone assignment (if `--sprint` is provided)

### Via GitHub

You can also create issues directly on GitHub. To make them visible to Locus, add the appropriate labels manually:

1. Add a type label: `type:feature`, `type:bug`, `type:chore`, `type:refactor`, or `type:docs`
2. Add a priority label: `p:critical`, `p:high`, `p:medium`, or `p:low`
3. Add the status label `locus:queued`
4. Assign the issue to a milestone (sprint)
5. Optionally add an `order:N` label for execution ordering

---

## Sprints as GitHub Milestones

A sprint in Locus is a GitHub Milestone. Milestones group related issues together and provide a natural progress tracker (GitHub shows completion percentage based on open vs. closed issues).

### Creating a Sprint

```bash
# Create a sprint
locus sprint create "Sprint 1"

# With a due date
locus sprint create "Sprint 1" --due 2026-03-07

# With a description
locus sprint create "Sprint 1" --due 2026-03-07 --description "Authentication and user management"
```

This calls the GitHub Milestones API to create a new milestone in your repository.

### Setting the Active Sprint

Locus tracks which sprint is currently active in `.locus/config.json`. The active sprint is the default target for `locus run`.

```bash
# Set the active sprint
locus sprint active "Sprint 1"

# Check which sprint is active
locus sprint active
```

Only one sprint can be active at a time.

### Listing Sprints

```bash
# List open sprints
locus sprint list

# Include closed sprints
locus sprint list --all
```

The list shows each sprint's name, progress bar, state, due date, and whether it is the active sprint.

### Viewing Sprint Details

```bash
# Show the active sprint
locus sprint show

# Show a specific sprint
locus sprint show "Sprint 1"
```

The detail view shows progress, due date, state, and a table of all tasks sorted by execution order, including their status and whether they are frozen (completed).

### Closing a Sprint

```bash
locus sprint close "Sprint 1"
```

This closes the GitHub Milestone. If the closed sprint was the active sprint, the active sprint setting is cleared.

---

## Execution Order

Order labels (`order:1`, `order:2`, `order:3`, ...) control the sequence in which tasks are executed during a sprint run. Tasks are sorted by their order label in ascending order, with unordered tasks placed at the end.

### How Order Is Assigned

Order can be assigned in several ways:

- **AI planning** -- `locus plan` assigns order labels automatically based on dependency analysis
- **Manual assignment** -- Add `order:N` labels directly on GitHub
- **CLI reordering** -- Use `locus sprint order` to rearrange tasks

### Reordering Tasks

The `locus sprint order` command lets you change the execution sequence of pending tasks while respecting completed tasks.

```bash
# View current order
locus sprint order "Sprint 1" --show

# Reorder pending tasks (list issue numbers in desired order)
locus sprint order "Sprint 1" 17 15 16
```

**Key rules:**

- **Completed tasks are frozen.** Tasks with the `locus:done` label cannot be reordered. Their order labels are preserved.
- **All pending tasks must be included.** When reordering, you must specify every pending issue number. You cannot omit tasks.
- **No duplicates.** Each issue number can appear only once in the new order.
- **Order numbers start after the floor.** The floor is the highest order number among completed tasks. New order numbers are assigned starting from `floor + 1`.

**Example:**

If tasks 1-3 are completed (orders 1-3) and tasks 17, 15, 16 are pending, running:

```bash
locus sprint order "Sprint 1" 17 15 16
```

Assigns `order:4` to #17, `order:5` to #15, and `order:6` to #16.

---

## Sprint Lifecycle

A sprint follows this lifecycle:

```
Create --> Plan --> Execute --> Close
```

### 1. Create

Create the milestone and assign it as the active sprint:

```bash
locus sprint create "Sprint 1" --due 2026-03-14
locus sprint active "Sprint 1"
```

### 2. Plan

Populate the sprint with tasks. You can do this manually or with AI-assisted planning:

```bash
# AI-generated plan
locus plan "Implement user authentication"

# Manual issue creation
locus issue create "Set up OAuth provider" --type feature --priority high --sprint "Sprint 1"
locus issue create "Add login page UI" --type feature --priority high --sprint "Sprint 1"
locus issue create "Write auth middleware" --type feature --priority medium --sprint "Sprint 1"
```

### 3. Execute

Run the sprint. Tasks execute sequentially on a single branch in order-label sequence:

```bash
locus run
```

During execution, Locus:
- Creates a branch named `locus/sprint-<name>` (e.g., `locus/sprint-sprint-1`)
- Picks up tasks in order, updating labels from `locus:queued` to `locus:in-progress`
- Passes sprint context (diff from previous tasks) to the AI agent
- Marks tasks as `locus:done` or `locus:failed` upon completion
- Creates a PR for each completed task
- Persists progress to `run-state.json` for resume capability

### 4. Close

After reviewing and merging PRs, close the sprint:

```bash
locus sprint close "Sprint 1"
```

---

## AI Sprint Planning

The `locus plan` command generates a structured sprint plan from a high-level directive:

```bash
locus plan "Build a REST API for user management with CRUD operations"
```

The AI analyzes your codebase (using `LOCUS.md`, file tree, and recent git history) and produces a plan with:

- Sprint name and goal
- Ordered list of tasks with descriptions
- Priority and type assignments
- Execution sequence optimized for sequential single-branch development

You review the plan and choose to approve (creates the sprint and issues), reject with feedback (triggers replanning), or cancel.

---

## Issue Status Flow

Each issue moves through these statuses during execution:

```
queued --> in-progress --> done
                      \-> failed
```

| Status             | Label               | Meaning                          |
|--------------------|---------------------|----------------------------------|
| Queued             | `locus:queued`      | Ready for execution              |
| In Progress        | `locus:in-progress` | AI agent is currently working    |
| Done               | `locus:done`        | Completed, PR created            |
| Failed             | `locus:failed`      | Execution failed (see error)     |
| In Review          | `locus:in-review`   | PR awaiting human review         |

When a task fails, Locus posts a comment on the issue with the error message and duration. Failed tasks can be retried with `locus run --resume`.
