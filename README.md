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
  <a href="https://docs.locusai.dev">Documentation</a> &middot; <a href="https://docs.locusai.dev/getting-started/quickstart">Quick Start</a> &middot; <a href="#cli-reference">CLI Reference</a> &middot; <a href="https://github.com/asgarovf/locusai/issues">Issues</a>
</p>

---

> GitHub Issues are tasks. Milestones are sprints. Labels track status. Pull Requests are deliverables. **No servers. No database. No accounts.**

> [!WARNING]
> **Active Development**: Locus is in early alpha. Expect breaking changes and evolving APIs.

## Why Locus?

AI coding agents are powerful — but they're point solutions. You still need to break down work, sequence tasks, track state, review output, and iterate on feedback. Locus wraps that entire loop into a single CLI that uses GitHub as its backend.

- **Unified AI interface** — Switch between [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) and [Codex](https://openai.com/index/introducing-codex/) without changing your workflow
- **End-to-end orchestration** — Plan, execute, review, and iterate in one tool
- **GitHub-native** — No new accounts, no dashboards, no vendor lock-in. Everything lives in Issues, Milestones, Labels, and PRs
- **Safe by default** — Docker sandbox isolation keeps AI agents in a separate kernel, away from your host

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [GitHub CLI](https://cli.github.com) (`gh`) — authenticated via `gh auth login`
- An AI provider CLI: [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [Codex](https://openai.com/index/introducing-codex/)
- *(Optional)* [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.58+ for sandbox isolation

### Install and run

```bash
# Install globally
npm install -g @locusai/cli

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

## Features

### Sprint execution
Sequential task execution on a single branch. Each task builds on the previous one's output. Resume interrupted runs with `--resume` — no re-executing completed work.

### AI sprint planning
Describe a goal in plain English. AI decomposes it into structured GitHub issues with priority, type, and execution order — ready for `locus run`.

### Parallel worktrees
Run standalone issues concurrently using git worktrees. Each issue gets its own isolated branch. Up to 3 concurrent agents by default (configurable via `agent.maxParallel`).

### Interactive REPL
Full-featured terminal with streaming markdown, session persistence, tab completion, and slash commands. Use `locus exec` for interactive mode or `locus exec "prompt"` for one-shot execution.

### AI code review
Review pull requests with AI-powered analysis. Posts inline comments directly on GitHub with actionable suggestions.

### Iterate on feedback
Agents re-execute tasks with PR review comments as context, updating code until it's ready to merge. Close the loop without manual intervention.

### Docker sandbox isolation
Hypervisor-level isolation via Docker Desktop sandboxes. AI agents run in a separate microVM kernel with no direct access to your host filesystem, network, or credentials. Enabled automatically when Docker 4.58+ is available.

### Extensible packages
Install community packages via `locus install <package>`. Build your own with the [`@locusai/sdk`](https://www.npmjs.com/package/@locusai/sdk).

## CLI Reference

### Setup & Configuration

| Command | Alias | Description |
|---------|-------|-------------|
| `locus init` | | Initialize project with `.locus/` structure and GitHub labels |
| `locus config` | | View and manage settings |
| `locus upgrade` | | Self-upgrade to latest version |

### Work Modeling

| Command | Alias | Description |
|---------|-------|-------------|
| `locus issue` | `locus i` | Create, list, show, label, and close GitHub issues |
| `locus sprint` | `locus s` | Create, list, show, activate, reorder, and close sprints |
| `locus plan` | | AI-powered sprint planning from a goal description |

### Execution & Review

| Command | Alias | Description |
|---------|-------|-------------|
| `locus run` | | Execute sprint tasks or standalone issues with AI agents |
| `locus exec` | `locus e` | Interactive REPL or one-shot prompt execution |
| `locus review` | | AI code review on pull requests |
| `locus iterate` | | Re-execute tasks with PR feedback context |
| `locus discuss` | | AI-powered architectural discussions |

### Visibility

| Command | Alias | Description |
|---------|-------|-------------|
| `locus status` | | Dashboard view of project state |
| `locus logs` | | View, tail, and manage execution logs |
| `locus artifacts` | | View and manage AI-generated artifacts |

### Packages

| Command | Alias | Description |
|---------|-------|-------------|
| `locus install` | | Install a community package from npm |
| `locus uninstall` | | Remove an installed package |
| `locus packages` | | List installed packages |
| `locus pkg <name>` | | Run a package-provided command |

### Sandbox Management

| Command | Description |
|---------|-------------|
| `locus sandbox` | Create a persistent Docker sandbox |
| `locus sandbox claude` | Authenticate Claude inside the sandbox |
| `locus sandbox codex` | Authenticate Codex inside the sandbox |
| `locus sandbox rm` | Destroy the sandbox |
| `locus sandbox status` | Show current sandbox state |

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

## Project Structure

After `locus init`, your project gets a `.locus/` directory:

```
.locus/
├── config.json        # Project settings (auto-detected)
├── run-state.json     # Execution state for recovery
├── LOCUS.md           # Agent instructions & project context
├── LEARNINGS.md       # Accumulated lessons from past runs
├── sessions/          # REPL session history
├── discussions/       # AI discussion archives
├── artifacts/         # AI-generated reports
├── plans/             # Planning documents
├── logs/              # Execution logs (NDJSON)
└── worktrees/         # Git worktrees for parallel execution
```

## Security & Sandboxing

Locus supports running AI agents inside **Docker Desktop sandboxes** — lightweight microVMs that provide hypervisor-level isolation. Each sandbox runs a separate kernel, so the AI agent cannot directly access your host filesystem, network, or environment variables.

When Docker Desktop 4.58+ is installed, Locus **automatically** runs agents inside a sandbox. If Docker is not available, it falls back to unsandboxed execution with a warning.

| Flag | Behavior |
|------|----------|
| *(default)* | Use sandbox if Docker is available; warn and fall back if not |
| `--no-sandbox` | Explicitly disable sandboxing (shows safety warning) |
| `--sandbox=require` | Require sandbox — fail if Docker sandbox is unavailable |

Configure sandbox behavior in `.locus/config.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "extraWorkspaces": ["/path/to/shared/libs"],
    "readOnlyPaths": ["/path/to/configs"]
  }
}
```

## VS Code Extension

Locus includes a [VS Code extension](https://marketplace.visualstudio.com/items?itemName=locusai.locus) with an integrated chat interface for running tasks directly from your editor.

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+L` | Open Locus chat |
| `Ctrl+Shift+E` | Explain selected code |
| `Ctrl+Shift+N` | New session |

## Development

```bash
# Install dependencies
bun install

# Run the CLI in dev mode
bun run simulate <command>

# Lint and typecheck
bun run lint && bun run typecheck
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full development setup, architecture details, and release process.

## Packages

| Package | Description |
|---------|-------------|
| [`@locusai/cli`](./packages/cli) | Main CLI |
| [`@locusai/shared`](./packages/shared) | Shared types and utilities |
| [`@locusai/sdk`](./packages/sdk) | SDK for building community packages |
| [`locus-vscode`](./packages/vscode) | VS Code extension |
| [`@locusai/www`](./apps/www) | Documentation website |

## License

[MIT](./LICENSE)
