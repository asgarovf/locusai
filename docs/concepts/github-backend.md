---
description: How Locus maps its data model onto native GitHub primitives with zero infrastructure.
---

# GitHub as Backend

## Overview

Locus has no custom backend. It uses GitHub Issues, Milestones, Labels, and Pull Requests as its entire data layer. Every read and write goes through the `gh` CLI, which handles authentication, rate limiting, and API access.

This means:
- Zero infrastructure to deploy or maintain
- Full transparency -- all task state is visible in your GitHub repository
- Works with your existing workflow (issue templates, project boards, branch protection rules)
- No additional accounts, API keys, or services

---

## Data Model Mapping

| Locus Concept  | GitHub Primitive | How It Is Used                                      |
|----------------|------------------|-----------------------------------------------------|
| Task           | Issue            | Each task is a GitHub Issue with structured labels   |
| Sprint         | Milestone        | Sprints group issues under a Milestone              |
| Metadata       | Labels           | Priority, type, status, order, and agent management |
| Deliverable    | Pull Request     | Each completed task produces a PR                   |
| Auth           | `gh auth login`  | Single authentication flow for everything           |

---

## Label Schema

Locus uses a structured label system to encode task metadata. Labels are created automatically during `locus init`.

### Priority Labels

Priority labels indicate how important a task is:

| Label         | Color   | Description       |
|---------------|---------|-------------------|
| `p:critical`  | #B60205 | Critical priority |
| `p:high`      | #D93F0B | High priority     |
| `p:medium`    | #E99695 | Medium priority   |
| `p:low`       | #F9D0C4 | Low priority      |

### Type Labels

Type labels classify the nature of the work:

| Label           | Color   | Description       |
|-----------------|---------|-------------------|
| `type:feature`  | #0075CA | New feature       |
| `type:bug`      | #1D76DB | Bug fix           |
| `type:chore`    | #5319E7 | Maintenance/chore |
| `type:refactor` | #6E5494 | Code refactoring  |
| `type:docs`     | #0E8A16 | Documentation     |

### Status Labels

Status labels track where a task is in the execution lifecycle. Locus updates these automatically as it processes tasks:

| Label               | Color   | Description                    |
|---------------------|---------|--------------------------------|
| `locus:queued`      | #C2E0C6 | Queued for execution           |
| `locus:in-progress` | #0E8A16 | Currently being executed       |
| `locus:in-review`   | #FBCA04 | PR created, awaiting review    |
| `locus:done`        | #006B75 | Completed successfully         |
| `locus:failed`      | #B60205 | Execution failed               |

### Order Labels

Order labels define the execution sequence within a sprint:

| Label      | Color   | Description                  |
|------------|---------|------------------------------|
| `order:1`  | #CCCCCC | Sprint execution order 1     |
| `order:2`  | #CCCCCC | Sprint execution order 2     |
| `order:3`  | #CCCCCC | Sprint execution order 3     |
| ...        | #CCCCCC | And so on                    |

Order labels are created on demand as tasks are assigned execution positions.

### Agent Label

A single label identifies issues managed by Locus:

| Label           | Color   | Description                   |
|-----------------|---------|-------------------------------|
| `agent:managed` | #7057FF | Managed by Locus AI agent     |

---

## How It Works in Practice

### Creating a Task

When you run `locus issue create`, Locus calls `gh issue create` with the appropriate labels and milestone:

```bash
locus issue create "Add input validation" --type feature --priority high --sprint "Sprint 1"
```

This creates a GitHub Issue with labels `type:feature`, `p:high`, and `locus:queued`, assigned to the "Sprint 1" Milestone.

### Running a Sprint

When you run `locus run`, Locus:

1. Calls `gh api repos/{owner}/{repo}/milestones` to find the active sprint
2. Calls `gh issue list --milestone "Sprint 1"` to fetch all issues
3. Reads `order:N` labels to determine execution sequence
4. For each task, updates labels via `gh issue edit` (e.g., removes `locus:queued`, adds `locus:in-progress`)
5. After successful execution, creates a PR via `gh pr create`
6. Updates labels to `locus:done`

### Viewing Progress

Because everything is stored in GitHub, you can check sprint progress using standard GitHub tools:

- **GitHub Issues tab** -- filter by milestone and status labels
- **GitHub Milestones page** -- see completion percentage
- **GitHub Pull Requests tab** -- review deliverables
- **Locus CLI** -- `locus sprint show` and `locus status`

---

## Why This Approach

### Zero Infrastructure

There is no server to deploy, no database to manage, and no SaaS subscription. Locus runs entirely on your machine and talks to GitHub's existing API.

### Transparency

Every piece of state is visible in your repository. Labels, milestones, issues, and PRs are standard GitHub objects that any team member can inspect without installing Locus.

### Existing Workflow Compatibility

Locus does not replace your workflow -- it augments it. You can still:

- Manually create and edit issues
- Use GitHub Projects to organize work
- Set up branch protection rules
- Require PR reviews before merging
- Use GitHub Actions for CI/CD

### No API Keys Stored Locally

Locus does not store any GitHub credentials. Authentication is handled entirely by the `gh` CLI, which manages tokens securely through `gh auth login`. AI provider keys (for Claude or Codex) are managed separately via environment variables, not by Locus.

---

## Rate Limiting

Locus includes a built-in rate limiter that tracks GitHub API usage across all `gh` calls. Before each API request, it checks remaining quota and backs off when limits are approached. Rate limit state is persisted to `.locus/rate-limit.json` between runs.

If GitHub returns a rate limit error (HTTP 403 with rate limit headers), Locus will pause and wait for the reset window before retrying.
