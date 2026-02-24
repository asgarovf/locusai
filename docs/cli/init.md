---
description: Initialize Locus in a GitHub repository. Creates the .locus/ directory, config.json, labels, and project context files.
---

# locus init

Initialize Locus in the current GitHub repository. This command sets up the directory structure, configuration, project context templates, GitHub labels, and `.gitignore` entries needed to use Locus.

Running `locus init` is idempotent. Re-running it updates the configuration without overwriting user-edited files like `LOCUS.md` or `LEARNINGS.md`.

## Usage

```bash
locus init
```

## What It Does

The `init` command performs these steps in order:

1. **Verify git repository** -- confirms the current directory is a git repo.
2. **Check GitHub CLI** -- ensures `gh` is installed and authenticated.
3. **Detect repo context** -- reads the GitHub remote to determine `owner`, `repo`, and `defaultBranch`.
4. **Create `.locus/` directory structure** -- creates subdirectories for sessions, discussions, artifacts, plans, and logs.
5. **Generate `config.json`** -- writes default configuration with detected GitHub values. On re-init, existing AI, agent, sprint, and logging settings are preserved.
6. **Generate `LOCUS.md`** -- creates a template for project context that AI agents read before every task. Skipped if the file already exists.
7. **Generate `LEARNINGS.md`** -- creates a file for capturing lessons and corrections. Skipped if the file already exists.
8. **Create GitHub labels** -- ensures all Locus labels exist on the repository (priority, type, status, and `agent:managed`).
9. **Update `.gitignore`** -- adds entries for Locus runtime files (config, sessions, logs, worktrees).

## Directory Structure

After initialization, the `.locus/` directory looks like this:

```
.locus/
  config.json          # Project configuration (gitignored)
  LOCUS.md             # Project context for AI agents (committed)
  LEARNINGS.md         # Lessons and corrections (committed)
  sessions/            # REPL session data (gitignored)
  discussions/         # Architectural discussions
  artifacts/           # Generated artifacts
  plans/               # Sprint plans
  logs/                # Execution logs (gitignored)
```

## GitHub Labels

The following labels are created on the repository:

| Category | Labels |
|----------|--------|
| Priority | `p:critical`, `p:high`, `p:medium`, `p:low` |
| Type | `type:feature`, `type:bug`, `type:chore`, `type:refactor`, `type:docs` |
| Status | `locus:queued`, `locus:in-progress`, `locus:in-review`, `locus:done`, `locus:failed` |
| Agent | `agent:managed` |

## Prerequisites

- A git repository with a GitHub remote
- [GitHub CLI](https://cli.github.com) (`gh`) installed and authenticated (`gh auth login`)

## Examples

```bash
# Initialize in the current repo
locus init

# After initialization, edit the project context
vim .locus/LOCUS.md
```

## Next Steps

After initializing:

1. Edit `.locus/LOCUS.md` to describe your project, tech stack, conventions, and development workflow.
2. Create issues: `locus issue create "My first task"`
3. Plan a sprint: `locus plan "Build feature X"`
4. Start coding: `locus exec`
