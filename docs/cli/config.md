---
description: View and manage Locus project settings stored in .locus/config.json.
---

# locus config

View and update local project settings. Configuration is stored in `.locus/config.json` and is generated during `locus init`.

## Usage

```bash
locus config <subcommand> [args]
```

If no subcommand is provided, `show` is used by default.

---

## Subcommands

### show

Display the current configuration organized by section.

```bash
locus config show
locus config           # Same as 'locus config show'
```

Sections displayed:

| Section | Keys |
|---------|------|
| **GitHub** | `owner`, `repo`, `defaultBranch` |
| **AI** | `provider`, `model` |
| **Agent** | `maxParallel`, `autoLabel`, `autoPR`, `baseBranch`, `rebaseBeforeTask` |
| **Sprint** | `active`, `stopOnFailure` |
| **Logging** | `level`, `maxFiles`, `maxTotalSizeMB` |

### set

Update a specific configuration value using dot-notation paths.

```bash
locus config set <path> <value>
```

**Examples:**

```bash
locus config set ai.model claude-sonnet-4-6
locus config set ai.provider codex
locus config set agent.maxParallel 5
locus config set agent.baseBranch develop
locus config set agent.rebaseBeforeTask false
locus config set sprint.stopOnFailure false
locus config set logging.level debug
```

### get

Read a specific configuration value. Output goes to stdout for scripting.

```bash
locus config get <path>
```

**Examples:**

```bash
locus config get ai.model
locus config get sprint.active
locus config get agent.maxParallel
```

For nested objects, the output is formatted as JSON.

---

## Configuration Keys

| Path | Type | Default | Description |
|------|------|---------|-------------|
| `github.owner` | string | (detected) | GitHub repository owner |
| `github.repo` | string | (detected) | GitHub repository name |
| `github.defaultBranch` | string | (detected) | Default branch (e.g., `main`) |
| `ai.provider` | string | `"claude"` | AI provider: `claude` or `codex` |
| `ai.model` | string | (provider default) | AI model identifier |
| `agent.maxParallel` | number | `3` | Maximum parallel issue execution |
| `agent.autoLabel` | boolean | `true` | Automatically manage labels during execution |
| `agent.autoPR` | boolean | `true` | Automatically create PRs after task completion |
| `agent.baseBranch` | string | (detected) | Branch that sprint and worktree branches are based on |
| `agent.rebaseBeforeTask` | boolean | `true` | Rebase sprint branch before each task |
| `sprint.active` | string/null | `null` | Name of the active sprint |
| `sprint.stopOnFailure` | boolean | `true` | Stop sprint execution when a task fails |
| `logging.level` | string | `"normal"` | Log level: `silent`, `normal`, `verbose`, `debug` |
| `logging.maxFiles` | number | `10` | Maximum number of log files to keep |
| `logging.maxTotalSizeMB` | number | `50` | Maximum total log size in MB |

---

## Examples

```bash
# Show all settings
locus config show

# Switch AI provider and model
locus config set ai.provider codex
locus config set ai.model gpt-5.3-codex

# Increase parallelism
locus config set agent.maxParallel 8

# Set active sprint
locus config set sprint.active "Sprint 2"

# Read a value for scripting
MODEL=$(locus config get ai.model)
echo "Using model: $MODEL"
```
