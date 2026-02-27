---
description: Quickstart walkthrough to go from install to GitHub-native issue-to-PR delivery with one Locus workflow.
---

# Quickstart

This quickstart is the fastest working path for a new user. It demonstrates all four core strengths in one journey:

1. One interface across Claude and Codex
2. GitHub-native operational memory
3. Built-in orchestration tools (`plan`, `run`, `review`, `iterate`, `status`)
4. Full-auto execution settings with resumable runs

{% hint style="info" %}
Prerequisite: complete [Installation](installation.md) first.
{% endhint %}

## Step 1: Initialize Locus in Your Repository

```bash
cd /path/to/your-repo
locus init
```

Expected outcome:

- `.locus/` is created with `config.json`, `LOCUS.md`, and `LEARNINGS.md`
- GitHub labels are created or verified (`locus:*`, `p:*`, `type:*`, `agent:managed`)
- Your repository is ready for issue-to-PR execution

Deep dive: [`locus init` reference](../cli/init.md)

## Step 2: Set AI Model (Unified Interface)

```bash
# Start with Claude
locus config set ai.model claude-sonnet-4-6

# Switch to Codex later without changing workflow commands
locus config set ai.model gpt-5.3-codex
```

Expected outcome:

- You can switch provider/model by changing `ai.model`
- The same Locus commands (`plan`, `run`, `review`, `iterate`) continue to work

Deep dive: [AI Providers](../concepts/ai-providers.md)

## Step 3: Plan GitHub-Native Work

```bash
locus plan "Add /health endpoint with tests and API docs" --sprint "Sprint 1"
locus sprint active "Sprint 1"
locus sprint show "Sprint 1"
```

Expected outcome:

- Locus creates a sprint milestone and issue set on GitHub
- Issues are labeled for priority, type, and execution order
- Sprint scope is visible to your whole team in GitHub

Deep dives:

- [GitHub as Backend](../concepts/github-backend.md)
- [Sprints and Issues](../concepts/sprints-and-issues.md)
- [`locus plan` reference](../cli/plan.md)

## Step 4: Execute with Built-In Tools

```bash
# Execute sprint tasks
locus run

# Review generated PRs
locus review

# Apply review feedback
locus iterate --sprint

# Check operational status
locus status
```

Expected outcome:

- `locus run` executes tasks and opens PRs
- `locus review` posts review feedback
- `locus iterate` applies fixes back onto PR branches
- `locus status` shows current sprint/issue progress

Deep dives:

- [How Locus Works](../concepts/how-it-works.md)
- [Execution Model](../concepts/execution-model.md)
- [CLI Overview](../cli/overview.md)

## Step 5: Enable Auto-Approval Settings and Resume

```bash
locus config set agent.autoPR true
locus config set agent.autoLabel true

# If a run is interrupted or fails mid-sprint:
locus run --resume
```

Expected outcome:

- PR creation and lifecycle labeling are automated
- Interrupted execution resumes from the next unfinished task
- Completed tasks are not re-executed

Deep dive: [Execution Model](../concepts/execution-model.md)

## Complete Command Block

Use this when you want the full journey in one copy-paste sequence:

```bash
cd /path/to/your-repo
locus init
locus config set ai.model claude-sonnet-4-6
locus plan "Add /health endpoint with tests and API docs" --sprint "Sprint 1"
locus sprint active "Sprint 1"
locus run
locus review
locus iterate --sprint
locus status
locus config set ai.model gpt-5.3-codex
locus config set agent.autoPR true
locus config set agent.autoLabel true
# Use only when a previous run was interrupted:
locus run --resume
```

## Where to Go Next

1. [How Locus Works](../concepts/how-it-works.md)
2. [AI Providers](../concepts/ai-providers.md)
3. [GitHub as Backend](../concepts/github-backend.md)
4. [Execution Model](../concepts/execution-model.md)
5. [CLI Overview](../cli/overview.md)
