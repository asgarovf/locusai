---
description: Run locus init to set up your repository with the .locus/ directory, config files, and GitHub labels.
---

# Initialization

## Run `locus init`

Navigate to any GitHub repository and run:

```bash
cd your-project
locus init
```

The command performs the following steps in order:

1. Verifies you are inside a git repository
2. Checks that `gh` is installed and authenticated
3. Detects the GitHub owner, repo name, and default branch from your git remote
4. Creates the `.locus/` directory structure
5. Generates `config.json` with detected values
6. Generates `LOCUS.md` (project instructions for AI agents)
7. Generates `LEARNINGS.md` (accumulated knowledge log)
8. Creates GitHub labels for status, priority, type, and agent tracking
9. Updates `.gitignore` with Locus-specific entries

A successful run looks like this:

```
Initializing Locus...

  Git repository detected
  GitHub CLI authenticated
  Repository: your-org/your-project (branch: main)
  Created .locus/ directory structure
  Generated config.json
  Generated LOCUS.md (edit to add project context)
  Generated LEARNINGS.md
  GitHub labels created/verified
  Updated .gitignore

Locus initialized!

Next steps:
  1. Edit .locus/LOCUS.md to add project context
  2. Create issues: locus issue create "My task"
  3. Plan a sprint: locus plan "Build feature X"
  4. Start coding:  locus exec
```

---

## The `.locus/` Directory

After initialization, your project contains:

```
your-project/
  .locus/
    config.json        # Repository metadata and CLI settings
    LOCUS.md           # Project instructions read by AI agents
    LEARNINGS.md       # Accumulated lessons and corrections
    sessions/          # Interactive REPL session history
    discussions/       # Architectural discussion records
    artifacts/         # Generated files and outputs
    plans/             # Sprint planning artifacts
    logs/              # Execution logs
  .gitignore           # Updated with Locus patterns
```

Files added to `.gitignore` automatically:

```gitignore
# Locus
.locus/config.json
.locus/run-state.json
.locus/rate-limit.json
.locus/sessions/
.locus/logs/
.locus/worktrees/
```

{% hint style="info" %}
`LOCUS.md` and `LEARNINGS.md` are **not** gitignored. Commit them to your repository so all contributors (and CI) share the same project context and learnings.
{% endhint %}

---

## Configuration File

The generated `.locus/config.json` contains all CLI settings:

```json
{
  "version": "0.18.0",
  "github": {
    "owner": "your-org",
    "repo": "your-project",
    "defaultBranch": "main"
  },
  "ai": {
    "provider": "claude",
    "model": "claude-sonnet-4-6"
  },
  "agent": {
    "maxParallel": 3,
    "autoLabel": true,
    "autoPR": true,
    "baseBranch": "main",
    "rebaseBeforeTask": true
  },
  "sprint": {
    "active": null,
    "stopOnFailure": true
  },
  "logging": {
    "level": "normal",
    "maxFiles": 20,
    "maxTotalSizeMB": 50
  }
}
```

### Key settings

| Path | Default | Description |
|------|---------|-------------|
| `ai.provider` | `claude` | AI provider: `claude` or `codex` |
| `ai.model` | `claude-sonnet-4-6` | Model used for all AI operations |
| `agent.maxParallel` | `3` | Max concurrent worktrees for parallel runs |
| `agent.autoPR` | `true` | Automatically create PRs after task execution |
| `agent.baseBranch` | `main` | Branch that sprint branches are created from |
| `agent.rebaseBeforeTask` | `true` | Rebase sprint branch before each task |
| `sprint.active` | `null` | Currently active sprint name |
| `sprint.stopOnFailure` | `true` | Stop sprint execution when a task fails |

You can view or change any setting with the `config` command:

```bash
# View all settings
locus config show

# Change a setting
locus config set ai.model claude-opus-4-6
locus config set agent.maxParallel 5
locus config set sprint.stopOnFailure false
```

---

## LOCUS.md -- Project Instructions

`LOCUS.md` is the most important file you will edit. AI agents read it before every task to understand your project. The generated template includes sections for:

* **Project Overview** -- What the project does, tech stack, architecture
* **Conventions** -- Coding style, naming patterns, file organization
* **Development Workflow** -- How to run, test, build, and deploy
* **Important Notes** -- Gotchas, design decisions, constraints

Fill in these sections to give agents the context they need to write code that fits your project.

---

## LEARNINGS.md -- Knowledge Log

`LEARNINGS.md` captures lessons learned during development. When you correct an agent's approach, add the learning here so it is not repeated. Agents read this file before every task.

Example entries:

```markdown
- **[Testing]**: Always use `vitest` instead of `jest` in this project.
- **[API]**: The `/users` endpoint requires the `X-Org-Id` header.
- **[Style]**: Use named exports, not default exports.
```

---

## GitHub Labels

`locus init` creates the following labels on your GitHub repository:

### Status labels

| Label | Description |
|-------|-------------|
| `locus:queued` | Queued for execution |
| `locus:in-progress` | Currently being executed by an agent |
| `locus:in-review` | PR created, awaiting review |
| `locus:done` | Completed successfully |
| `locus:failed` | Execution failed |

### Priority labels

| Label | Description |
|-------|-------------|
| `p:critical` | Critical priority |
| `p:high` | High priority |
| `p:medium` | Medium priority |
| `p:low` | Low priority |

### Type labels

| Label | Description |
|-------|-------------|
| `type:feature` | New feature |
| `type:bug` | Bug fix |
| `type:chore` | Maintenance task |
| `type:refactor` | Code refactoring |
| `type:docs` | Documentation |

### Agent label

| Label | Description |
|-------|-------------|
| `agent:managed` | Managed by Locus AI agent |

Execution order is tracked with dynamically created `order:N` labels (e.g., `order:1`, `order:2`).

---

## Re-running `locus init`

The command is idempotent. Running it again is safe and will:

* Detect the latest repository metadata (owner, repo, default branch)
* Preserve existing `ai`, `agent`, `sprint`, and `logging` settings in `config.json`
* Skip `LOCUS.md` and `LEARNINGS.md` if they already exist
* Create any missing directories
* Verify and create any missing GitHub labels

```bash
# Safe to run at any time
locus init
```

{% hint style="success" %}
Re-run `locus init` after upgrading the CLI to ensure your project structure matches the latest version.
{% endhint %}

---

## Next Steps

Your repository is now set up. Continue to:

* [Quickstart](quickstart.md) -- run the fastest end-to-end path from plan to PR
* [Your First Sprint (Detailed)](first-sprint.md) -- expanded workflow with advanced options
