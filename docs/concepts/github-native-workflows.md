---
description: Practical GitHub-native workflows for operating Locus through issues, milestones, labels, and pull requests.
---

# GitHub-Native Workflows

Locus uses GitHub as an operational layer, not just a code host. Issues, Milestones, Labels, and Pull Requests carry planning and execution state that your whole team can inspect.

Use this guide when you want practical, end-to-end command sequences with clear GitHub-side outcomes.

## Prerequisites

- A git repository with a GitHub remote
- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`)
- Locus installed (`npm install -g @locusai/cli`)
- Repository initialized with Locus (`locus init`)
- An AI provider CLI configured (Claude or Codex)

## Common Setup

Run this once per repository before the scenarios:

```bash
cd /path/to/your-repo
locus init
locus config set ai.model claude-sonnet-4-6
```

Expected outcome:

- `.locus/` is created and configured
- GitHub labels are created/verified (`locus:*`, `p:*`, `type:*`, `agent:managed`)
- Locus can read/write issues, milestones, and PR data via `gh`

---

## Scenario 1: Issue-Driven Execution (Issue -> Sprint -> PR)

This is the core delivery loop when you already know the task.

### Setup

- Run the [Common Setup](#common-setup) section above
- Start on a clean working tree before execution

### Commands

```bash
locus sprint create "Sprint 1"
locus sprint active "Sprint 1"
locus issue create "Add /health endpoint with tests" --sprint "Sprint 1"
locus issue list --sprint "Sprint 1" --status queued
locus run
locus status
```

### Expected Output

- `locus sprint create` prints a created sprint confirmation
- `locus issue create` prints a created issue number (for example `#83`) after confirmation
- `locus run` prints sprint task progress and creates PRs for completed tasks
- `locus status` shows sprint progress plus open `agent:managed` PRs

### GitHub State Sync

- Milestone created/used: `Sprint 1`
- Issue created under that milestone
- Labels used/updated during execution: `locus:queued`, `locus:in-progress`, `locus:in-review`, `locus:done`/`locus:failed`
- Deliverable created as a GitHub PR

---

## Scenario 2: Repo-Backed Planning Artifacts (Plan File -> Approved GitHub Work)

Use this when you want AI planning with a review step before creating GitHub issues.

### Setup

- Run the [Common Setup](#common-setup) section above
- Pick a sprint name that will hold newly approved work (for example, `Sprint 2`)

### Commands

```bash
locus plan "Build billing webhook ingestion with retries" --sprint "Sprint 2"
locus plan list
locus plan show <plan-id>
locus plan approve <plan-id> --sprint "Sprint 2"
locus sprint show "Sprint 2"
```

### Expected Output

- `locus plan` saves a plan file ID (for example `abc123`) and prints approval instructions
- `locus plan list` shows saved plans from `.locus/plans/`
- `locus plan show <plan-id>` prints ordered planned issues
- `locus plan approve ...` creates GitHub issues with labels and execution order
- `locus sprint show "Sprint 2"` shows tasks ordered by `order:N`

### GitHub State Sync

- Before approval: planning data is local in `.locus/plans/<plan-id>.json`
- After approval: planned tasks become GitHub Issues, attached to a Milestone, with labels like `p:*`, `type:*`, `locus:queued`, `agent:managed`, `order:N`
- Team-visible sprint scope now lives in GitHub

---

## Scenario 3: Collaborative Review Loop (PR Feedback -> Iteration)

Use this when PR feedback is coming from teammates and you want Locus to apply fixes in-loop.

### Setup

- Have at least one open `agent:managed` PR (for example, from `locus run`)
- Ensure the PR has feedback comments to iterate on

### Commands

```bash
gh pr list --label agent:managed --state open
gh pr comment <pr-number> --body "Please strengthen error handling and add tests."
locus iterate --pr <pr-number>
locus review <pr-number>
locus status
```

### Expected Output

- `gh pr comment` creates a visible review comment on the target PR
- `locus iterate --pr <pr-number>` applies feedback-driven updates on that PR branch
- `locus review <pr-number>` posts a fresh AI review pass after iteration
- `locus status` reports current sprint health and open PRs

### GitHub State Sync

- Review feedback is persisted as GitHub PR comments
- Iteration updates PR branches and commits
- Label/status lifecycle stays visible on issues and PRs for async team coordination

---

## Limitations of GitHub-Native Operation

- Requires working `gh` auth in the environment where Locus runs
- GitHub API availability and rate limits can delay operations
- Locus depends on repository permissions for issue/PR/milestone writes
- `locus run` sprint mode requires an active sprint (`locus sprint active "..."`)
- Planning has a two-step flow: `locus plan` (save) then `locus plan approve` (create GitHub issues)

## Troubleshooting GitHub Integration

### `gh` is not installed or not authenticated

Symptoms:

- `locus init` fails early with GitHub CLI/auth errors

Recovery:

```bash
gh --version
gh auth status || gh auth login
locus init
```

### Not in a git repository (or missing GitHub remote)

Symptoms:

- `locus init` reports "Not a git repository" or cannot detect owner/repo

Recovery:

```bash
git status
git remote -v
# Add/fix origin, then re-run init
locus init
```

### `locus run` says no active sprint

Symptoms:

- Run exits with guidance to set an active sprint

Recovery:

```bash
locus sprint list
locus sprint active "Sprint 1"
locus run
```

### Sprint exists on GitHub but does not resolve

Symptoms:

- `locus sprint active` or `locus run` cannot find the sprint

Recovery:

```bash
locus sprint list --all
# Re-open/create as needed, then set active
locus sprint active "Sprint 1"
```

### Permission failures when creating issues/PRs/milestones

Symptoms:

- Command fails with GitHub permission errors

Recovery:

```bash
gh auth status
# Ensure token/account has repo write permissions
# Then retry the failed locus command
```

### Rate limit or transient API failures

Symptoms:

- Slowdowns or failures around GitHub API calls

Recovery:

- Wait for GitHub rate limit reset window, then rerun command
- For interrupted sprint execution, continue from saved state:

```bash
locus run --resume
```

## Related Docs

- [GitHub as Backend](github-backend.md)
- [How Locus Works](how-it-works.md)
- [Built-In Tools](../cli/overview.md)
- [Auto-Approval Mode](auto-approval-mode.md)
- [locus plan](../cli/plan.md)
- [locus run](../cli/run.md)
- [locus review](../cli/review.md)
- [locus iterate](../cli/iterate.md)
