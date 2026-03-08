<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/master/assets/logo.png" alt="Locus" width="200" />
</p>

<h3 align="center">GitHub-native AI engineering CLI</h3>

<p align="center">
  Turn GitHub issues into shipped code — plan sprints, execute tasks with AI agents, and iterate on feedback.
</p>

<p align="center">
  <a href="https://github.com/asgarovf/locusai/stargazers"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
  <a href="https://www.npmjs.com/package/@locusai/cli"><img src="https://img.shields.io/npm/v/@locusai/cli?label=%40locusai%2Fcli&color=blue" alt="@locusai/cli" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?style=flat&color=blue" alt="License" /></a>
  <a href="https://docs.locusai.dev"><img src="https://img.shields.io/badge/docs-locusai.dev-blue" alt="Documentation" /></a>
</p>

<p align="center">
  <a href="https://docs.locusai.dev">Documentation</a> &middot; <a href="https://docs.locusai.dev/getting-started/quickstart">Quick Start</a> &middot; <a href="https://github.com/asgarovf/locusai">GitHub</a> &middot; <a href="https://github.com/asgarovf/locusai/issues">Issues</a>
</p>

---

> GitHub Issues are tasks. Milestones are sprints. Labels track status. Pull Requests are deliverables. **No servers. No database. No accounts.**

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [GitHub CLI](https://cli.github.com) (`gh`) — authenticated via `gh auth login`
- An AI provider CLI: [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [Codex](https://openai.com/index/introducing-codex/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.58+ for sandboxed execution (optional)

## Install

```bash
npm install -g @locusai/cli
```

## Quick Start

```bash
# Initialize in your GitHub repo
locus init

# Plan a sprint from a goal
locus plan "Build user authentication with OAuth"

# Execute the sprint — agents write code, push commits, open PRs
locus run

# Review the PRs with AI
locus review

# Agents address feedback and update the PRs
locus iterate
```

## How It Works

```
locus plan "your goal"    →  AI breaks the goal into GitHub Issues with execution order
locus run                 →  Agents execute tasks sequentially, push code, create PRs
locus review              →  AI reviews PRs, posts inline comments on GitHub
locus iterate             →  Agents address review feedback until ready to merge
```

**GitHub IS the backend:**

| Concept | GitHub Primitive |
|---------|-----------------|
| Task | Issue |
| Sprint | Milestone |
| Status | Labels (`locus:queued`, `locus:in-progress`, `locus:done`, `locus:failed`) |
| Priority | Labels (`p:critical`, `p:high`, `p:medium`, `p:low`) |
| Execution Order | Labels (`order:1`, `order:2`, ...) |
| Deliverable | Pull Request |

## CLI Reference

### Setup & Configuration

| Command | Description |
|---------|-------------|
| `locus init` | Initialize project with `.locus/` structure and GitHub labels |
| `locus config` | View and manage settings |
| `locus upgrade` | Self-upgrade to latest version |

### Work Modeling

| Command | Alias | Description |
|---------|-------|-------------|
| `locus issue` | `locus i` | Create, list, show, label, and close GitHub issues |
| `locus sprint` | `locus s` | Create, list, show, reorder, and close sprints |
| `locus plan` | | AI-powered sprint planning from a goal description |

### Execution & Review

| Command | Alias | Description |
|---------|-------|-------------|
| `locus run` | | Execute sprint tasks or standalone issues with AI agents |
| `locus exec` | `locus e` | Interactive REPL or one-shot prompt execution |
| `locus review` | | AI code review on pull requests |
| `locus iterate` | | Re-execute tasks with PR feedback context |
| `locus discuss` | | AI-powered architectural discussions |
| `locus commit` | | AI-powered commit message generation |

### Visibility

| Command | Description |
|---------|-------------|
| `locus status` | Dashboard view of project state |
| `locus logs` | View, tail, and manage execution logs |
| `locus artifacts` | View and manage AI-generated artifacts |

### Skills

| Command | Description |
|---------|-------------|
| `locus skills` | List available agent skills |
| `locus skills list` | List remote skills from the registry |
| `locus skills list --installed` | List locally installed skills |
| `locus skills install <name>` | Install a skill from the registry |
| `locus skills remove <name>` | Uninstall a skill |
| `locus skills update [name]` | Update all or a specific skill |
| `locus skills info <name>` | Show skill details |

### Packages

| Command | Description |
|---------|-------------|
| `locus install <name>` | Install a community package from npm |
| `locus uninstall <name>` | Remove an installed package |
| `locus packages` | List installed packages |
| `locus pkg <name> [cmd]` | Run a package-provided command |
| `locus create <name>` | Scaffold a new community package |

### Sandbox Management

| Command | Description |
|---------|-------------|
| `locus sandbox` | Create provider sandboxes and enable sandbox mode |
| `locus sandbox claude` | Authenticate Claude inside its sandbox |
| `locus sandbox codex` | Authenticate Codex inside its sandbox |
| `locus sandbox install <pkg>` | Install global npm package(s) in provider sandbox(s) |
| `locus sandbox shell <provider>` | Open an interactive shell in a provider sandbox |
| `locus sandbox logs <provider>` | Show provider sandbox logs |
| `locus sandbox rm` | Destroy provider sandboxes and disable sandbox mode |
| `locus sandbox status` | Show current sandbox state |

## Command Details

### `locus plan`

AI-powered sprint planning with plan management:

```bash
locus plan "Build OAuth login"              # Generate a plan from a goal
locus plan --sprint "v1.0"                  # Assign planned issues to a sprint
locus plan --from-issues --sprint "v1.0"    # Organize existing issues into a plan
locus plan approve <id> <sprintname>        # Create GitHub issues from a plan
locus plan refine <id> "add rate limiting"  # Refine an existing plan with feedback
locus plan list                             # List saved plans
locus plan show <id>                        # Display a saved plan
locus plan --dry-run                        # Preview without creating issues
```

### `locus run`

Execute sprint tasks or standalone issues with AI agents:

```bash
locus run                        # Run all open sprints (parallel)
locus run --sprint "v1.0"        # Run a specific sprint
locus run 42                     # Run a single issue (in worktree)
locus run 42 43 44               # Run multiple issues in parallel
locus run --resume               # Resume an interrupted run
locus run --dry-run              # Preview what would execute
locus run --model claude         # Override AI model
locus run --no-sandbox           # Run without Docker isolation
locus run --sandbox=require      # Fail if Docker sandbox is unavailable
```

### `locus exec`

Interactive REPL or one-shot prompt execution:

```bash
locus exec                          # Start interactive REPL
locus exec "Add error handling"     # One-shot prompt
locus exec -s <session-id>          # Resume a previous session
locus exec sessions list            # List saved sessions
locus exec sessions show <id>       # Show session details
locus exec sessions delete <id>     # Delete a session
locus exec --json-stream            # NDJSON output for IDE integration
```

### `locus commit`

AI-powered commit message generation from staged changes:

```bash
locus commit                # Generate and commit
locus commit --dry-run      # Preview message without committing
locus commit --model <name> # Override AI model
```

### `locus skills`

Discover and install agent skills from a centralized registry:

```bash
locus skills                      # List available skills
locus skills install <name>       # Install a skill
locus skills remove <name>        # Uninstall a skill
locus skills update               # Update all installed skills
locus skills info <name>          # Show skill details
```

## Workflows

### Sprint: plan, execute, review, iterate

```bash
locus plan "Add SSO login and role-based access"
locus run
locus review
locus iterate --sprint
```

### Parallel standalone issues

```bash
# Run 3 independent issues concurrently
locus run 42 43 44
```

### Resume a failed run

```bash
# Pick up where it left off — completed tasks are skipped
locus run --resume
```

### Interactive coding session

```bash
# Start a REPL session
locus exec

# Or one-shot
locus exec "Refactor the auth middleware to use JWT"
```

## Key Flags

| Flag | Description |
|------|-------------|
| `-d, --debug` | Debug logging |
| `-h, --help` | Show help |
| `-V, --version` | Show version |
| `--dry-run` | Simulate without executing |
| `--model <name>` | Override AI model |
| `--resume` | Resume interrupted runs |
| `--sprint <name>` | Target a specific sprint |
| `--from-issues` | Use existing issues for planning |
| `--no-sandbox` | Disable Docker isolation |
| `--sandbox=require` | Require Docker (fail if unavailable) |
| `--json-stream` | NDJSON output for IDE integration |
| `-s, --session-id <id>` | Resume a REPL session |

## Documentation

Full documentation is available at [docs.locusai.dev](https://docs.locusai.dev).

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
