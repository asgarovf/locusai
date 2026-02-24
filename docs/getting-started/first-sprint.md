---
description: End-to-end walkthrough of planning, executing, reviewing, and iterating on your first sprint.
---

# Your First Sprint

This guide walks through the full Locus workflow: **plan, run, review, iterate**. By the end, you will have GitHub issues created from a high-level goal, AI-generated pull requests, code reviews, and automated iteration on feedback.

---

## Overview

The Locus workflow follows four stages:

```
plan  -->  run  -->  review  -->  iterate
  |                                  |
  +---- repeat as needed ------------+
```

1. **Plan** -- Break a goal into GitHub issues with priority, type, and execution order
2. **Run** -- AI agents execute each issue sequentially, creating PRs
3. **Review** -- AI reviews the PRs and posts inline feedback
4. **Iterate** -- AI addresses review comments and pushes fixes

---

## Step 1: Create Issues

You have two options for creating work items: manually or with AI planning.

### Option A: Manual Issue Creation

Create individual issues with `locus issue create`. Describe the task in plain language — the AI generates a structured issue (title, body, priority, type) for you to review before it is posted to GitHub:

```bash
# Describe the task; AI fills in all details
locus issue create "Add user authentication endpoint"

# Assign to a sprint at creation time
locus issue create "Add rate limiting to API" --sprint "Sprint 1"

# Prompt interactively
locus issue create
```

The AI chooses the appropriate priority and type, writes a detailed body with acceptance criteria, and shows a preview. Confirm with `Y` to post. Each issue is created on GitHub with the appropriate labels (`p:high`, `type:feature`, `locus:queued`, `agent:managed`).

### Option B: AI-Powered Planning

Let AI break down a high-level goal into structured issues:

```bash
locus plan "Build user authentication with OAuth"
```

The AI analyzes your codebase (reading `LOCUS.md` and `LEARNINGS.md` for context), then creates multiple GitHub issues with:

* Titles and detailed descriptions with acceptance criteria
* Priority labels (`p:critical`, `p:high`, `p:medium`, `p:low`)
* Type labels (`type:feature`, `type:bug`, `type:chore`, `type:refactor`, `type:docs`)
* Execution order labels (`order:1`, `order:2`, ...)
* Dependency awareness (foundational tasks are ordered first)

You can assign the planned issues directly to a sprint:

```bash
locus plan "Build user authentication with OAuth" --sprint "Sprint 1"
```

Preview without creating anything:

```bash
locus plan "Build user authentication with OAuth" --dry-run
```

Organize existing issues into a sprint instead of creating new ones:

```bash
locus plan --from-issues --sprint "Sprint 1"
```

---

## Step 2: Create and Activate a Sprint

A sprint in Locus is a GitHub Milestone. Create one and set it as active:

```bash
# Create a sprint
locus sprint create "Sprint 1"

# Create with a due date
locus sprint create "Sprint 1" --due 2026-03-07

# Create with a description
locus sprint create "Sprint 1" --due 2026-03-07 --description "User auth and onboarding"
```

Set the sprint as active so `locus run` knows which sprint to execute:

```bash
locus sprint active "Sprint 1"
```

{% hint style="info" %}
If you used `locus plan "..." --sprint "Sprint 1"`, the sprint milestone is created automatically. You only need to set it as active.
{% endhint %}

### View Sprint Status

```bash
# List all sprints
locus sprint list

# Show sprint details with task order
locus sprint show "Sprint 1"

# View current execution order
locus sprint order "Sprint 1" --show
```

### Reorder Tasks

If you need to change the execution order after planning:

```bash
# List issue numbers in desired order
locus sprint order "Sprint 1" 17 15 16 18
```

Completed tasks are frozen and cannot be reordered. Only pending and failed tasks can be moved.

---

## Step 3: Run the Sprint

Execute all tasks in the active sprint:

```bash
locus run
```

This command:

1. Reads the active sprint from `config.json`
2. Fetches all open issues in the sprint, sorted by `order:N` labels
3. Creates a sprint branch (`locus/sprint-sprint-1`)
4. Executes each task sequentially using the configured AI provider
5. For each task: reads the issue, generates code, commits, and creates a PR
6. Labels issues as they progress (`locus:in-progress` then `locus:done` or `locus:failed`)
7. Tracks state in `.locus/run-state.json` for recovery

### Sprint Execution Output

```
Sprint: Sprint 1
  4 tasks, branch: locus/sprint-sprint-1

  [ ] #17  Set up database schema                    order:1
  [ ] #15  Add user registration endpoint            order:2
  [ ] #16  Add OAuth integration                     order:3
  [ ] #18  Add auth middleware                        order:4

Sprint Progress  [====                ] 25%

  #17  Set up database schema  ...
```

### Preview Without Executing

```bash
locus run --dry-run
```

### Run a Single Issue

Run one issue in an isolated git worktree:

```bash
locus run 42
```

### Run Multiple Issues in Parallel

Run standalone (non-sprint) issues concurrently using worktrees:

```bash
locus run 42 43 44
```

Parallel execution respects the `agent.maxParallel` setting (default: 3).

### Resume a Failed Sprint

If a task fails and `sprint.stopOnFailure` is `true` (the default), the sprint halts. Fix the issue and resume:

```bash
locus run --resume
```

The resume picks up where execution stopped -- completed tasks are not re-run.

---

## Step 4: Review the PRs

After execution, review the generated pull requests with AI:

```bash
# Review all open agent-managed PRs
locus review

# Review a specific PR
locus review 15

# Focus the review on specific areas
locus review 15 --focus "security,error-handling"
```

The AI reads the PR diff, analyzes it against your project context (`LOCUS.md`), and posts a detailed review as a comment on the pull request. The review covers:

* Correctness (bugs, logic errors, edge cases)
* Security (injection, XSS, auth issues)
* Performance (N+1 queries, unnecessary allocations)
* Maintainability (naming, complexity, code organization)
* Testing (missing tests, inadequate coverage)

Preview without posting:

```bash
locus review --dry-run
```

---

## Step 5: Iterate on Feedback

After reviewing (or after you leave comments on a PR yourself), tell Locus to address the feedback:

```bash
# Iterate on all open agent PRs that have comments
locus iterate

# Iterate on a specific PR
locus iterate --pr 15

# Find the PR for a specific issue and iterate
locus iterate 42

# Iterate on all PRs in the active sprint
locus iterate --sprint
```

The iterate command:

1. Finds PRs with unaddressed comments
2. Reads the review feedback
3. Re-executes the AI agent with the feedback as context
4. Pushes fixes to the existing PR branch

You can repeat the review-iterate cycle until the code is ready to merge:

```bash
locus review 15
# Read the review, maybe add your own comments
locus iterate --pr 15
locus review 15
# Satisfied? Merge the PR
```

---

## Complete Example

Here is the full workflow from start to finish:

```bash
# 1. Initialize (one time)
locus init

# 2. Edit project context
#    Open .locus/LOCUS.md and describe your project

# 3. Plan a sprint
locus plan "Build user authentication with OAuth" --sprint "Sprint 1"

# 4. Set the sprint as active
locus sprint active "Sprint 1"

# 5. Check the plan
locus sprint show "Sprint 1"

# 6. Execute the sprint
locus run

# 7. Review the PRs
locus review

# 8. Iterate on feedback
locus iterate --sprint

# 9. Review again
locus review

# 10. Merge the PRs on GitHub when satisfied

# 11. Close the sprint
locus sprint close "Sprint 1"
```

---

## Tips

* **Fill in `LOCUS.md` before running.** The more context you provide about your project -- tech stack, conventions, how to run tests -- the better the generated code will be.
* **Use `--dry-run` liberally.** Both `locus run --dry-run` and `locus plan --dry-run` let you preview what will happen without making changes.
* **Check sprint order before running.** Use `locus sprint order "Sprint 1" --show` to verify the execution sequence makes sense. Reorder if needed.
* **Use `locus status` for a dashboard.** See the current state of your sprint, active runs, and recent PRs at a glance.
* **Sprint issues run sequentially, standalone issues run in parallel.** Issues assigned to a sprint execute on a single branch in order. Issues without a sprint use isolated worktrees and can run concurrently.
* **Failed runs are recoverable.** State is saved to `.locus/run-state.json`. Use `locus run --resume` to continue where you left off.

---

## Next Steps

* [How Locus Works](../concepts/how-it-works.md) -- Understand the architecture and execution model
* [GitHub as Backend](../concepts/github-backend.md) -- How issues, milestones, and labels map to project management
* [CLI Reference](../cli/overview.md) -- Full documentation for every command
