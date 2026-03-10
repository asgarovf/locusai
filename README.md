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

<p align="center">
  <a href="https://youtu.be/JmHeKq3Ty0s">
    <img src="https://img.shields.io/badge/▶_Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube" alt="Watch Demo" />
  </a>
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
- **Unified sandboxing layer** — Run Claude and Codex through the same Docker-backed sandbox interface
- **Extensible** — Install community packages and agent skills, or build your own with the SDK

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [GitHub CLI](https://cli.github.com) (`gh`) — authenticated via `gh auth login`
- An AI provider CLI: [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [Codex](https://openai.com/index/introducing-codex/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.58+ for sandboxed execution (`docker sandbox`)

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

For Docker-first sandbox setup and operations (create/auth/install/exec/shell/logs), see:
- [Sandboxing Setup (Docker-First)](https://docs.locusai.dev/getting-started/sandboxing-setup)
- [Security & Sandboxing](https://docs.locusai.dev/concepts/security-sandboxing)

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
Describe a goal in plain English. AI decomposes it into structured GitHub issues with priority, type, and execution order — ready for `locus run`. Refine plans with feedback before approving.

### Parallel worktrees
Run standalone issues concurrently using git worktrees. Each issue gets its own isolated branch. Up to 3 concurrent agents by default (configurable via `agent.maxParallel`).

### Interactive REPL
Full-featured terminal with streaming markdown, session persistence, tab completion, and slash commands. Use `locus exec` for interactive mode or `locus exec "prompt"` for one-shot execution.

### AI code review
Review pull requests with AI-powered analysis. Posts inline comments directly on GitHub with actionable suggestions.

### Iterate on feedback
Agents re-execute tasks with PR review comments as context, updating code until it's ready to merge. Close the loop without manual intervention.

### AI-powered commits
Generate conventional commit messages from staged changes. AI analyzes diffs and recent history to produce descriptive commits.

### Docker sandbox isolation
Claude and Codex use the same Docker-backed sandboxing layer. Locus syncs your workspace into sandbox execution while enforcing `.sandboxignore` exclusions to keep sensitive files controlled.

### Agent skills
Install reusable agent skills from a centralized registry. Skills extend AI agent capabilities across your project.

### Extensible packages
Install community packages via `locus install <package>`. Build your own with the [`@locusai/sdk`](https://www.npmjs.com/package/@locusai/sdk) and [submit a pull request](./packages/sdk/PACKAGE_GUIDE.md).

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
| `locus memory` | | List, search, and manage structured project memory |
| `locus commit` | | AI-powered commit message generation |

### Visibility

| Command | Alias | Description |
|---------|-------|-------------|
| `locus status` | | Dashboard view of project state |
| `locus logs` | | View, tail, and manage execution logs |
| `locus artifacts` | | View and manage AI-generated artifacts |

### Skills

| Command | Description |
|---------|-------------|
| `locus skills` | List available agent skills |
| `locus skills install <name>` | Install a skill from the registry |
| `locus skills remove <name>` | Uninstall a skill |
| `locus skills update [name]` | Update all or a specific skill |
| `locus skills info <name>` | Show skill details |

### Packages

| Command | Alias | Description |
|---------|-------|-------------|
| `locus install <name>` | | Install a community package from npm |
| `locus uninstall <name>` | | Remove an installed package |
| `locus packages` | | List installed packages |
| `locus pkg <name> [cmd]` | | Run a package-provided command |
| `locus create <name>` | | Scaffold a new community package |

### MCP Server Management

| Command | Description |
|---------|-------------|
| `locus mcp add <template>` | Add a server from a built-in template (github, postgres, filesystem, etc.) |
| `locus mcp add-custom` | Add a custom MCP server |
| `locus mcp remove <name>` | Remove an MCP server |
| `locus mcp list` | List configured servers |
| `locus mcp sync` | Sync config to provider-specific formats (Claude, Codex) |
| `locus mcp test <name>` | Test an MCP server connection |
| `locus mcp status` | Show config and provider sync status |
| `locus mcp enable <name>` | Enable a server |
| `locus mcp disable <name>` | Disable a server |

### Sandbox Management

| Command | Description |
|---------|-------------|
| `locus sandbox` | Create provider sandboxes (Claude + Codex) and enable sandbox mode |
| `locus sandbox claude` | Authenticate Claude inside its sandbox |
| `locus sandbox codex` | Authenticate Codex inside its sandbox |
| `locus sandbox install <pkg>` | Install global npm package(s) in provider sandbox(s) |
| `locus sandbox shell <provider>` | Open an interactive shell in a provider sandbox |
| `locus sandbox logs <provider>` | Show provider sandbox logs |
| `locus sandbox rm` | Destroy provider sandboxes and disable sandbox mode |
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

## Packages

Locus has a modular package ecosystem. **Core packages** provide the foundation, and **community packages** extend Locus with integrations and new capabilities.

### Core Packages

These packages power the Locus platform and are maintained by the core team:

| Package | npm | Description |
|---------|-----|-------------|
| [`@locusai/cli`](./packages/cli) | [![npm](https://img.shields.io/npm/v/@locusai/cli?color=blue&label=)](https://www.npmjs.com/package/@locusai/cli) | Main CLI — plan, run, review, iterate |
| [`@locusai/sdk`](./packages/sdk) | [![npm](https://img.shields.io/npm/v/@locusai/sdk?color=blue&label=)](https://www.npmjs.com/package/@locusai/sdk) | SDK for building community packages |
| [`@locusai/locus-gateway`](./packages/gateway) | [![npm](https://img.shields.io/npm/v/@locusai/locus-gateway?color=blue&label=)](https://www.npmjs.com/package/@locusai/locus-gateway) | Channel-agnostic message gateway for platform adapters |
| [`@locusai/locus-pm2`](./packages/pm2) | [![npm](https://img.shields.io/npm/v/@locusai/locus-pm2?color=blue&label=)](https://www.npmjs.com/package/@locusai/locus-pm2) | Unified PM2 process management for background workers |

### Community Packages

Installable via `locus install <name>`. Each package runs independently — no other packages required.

| Package | npm | Install | Description |
|---------|-----|---------|-------------|
| [`@locusai/locus-telegram`](./packages/telegram) | [![npm](https://img.shields.io/npm/v/@locusai/locus-telegram?color=blue&label=)](https://www.npmjs.com/package/@locusai/locus-telegram) | `locus install telegram` | Remote-control Locus via Telegram bot |
| [`@locusai/locus-cron`](./packages/cron) | [![npm](https://img.shields.io/npm/v/@locusai/locus-cron?color=blue&label=)](https://www.npmjs.com/package/@locusai/locus-cron) | `locus install cron` | Recurring tasks with output routing (local, Telegram, webhooks) |
| [`@locusai/locus-linear`](./packages/linear) | [![npm](https://img.shields.io/npm/v/@locusai/locus-linear?color=blue&label=)](https://www.npmjs.com/package/@locusai/locus-linear) | `locus install linear` | Linear integration — sync issues, AI workflows, bidirectional management |
| [`@locusai/locus-jira`](./packages/jira) | [![npm](https://img.shields.io/npm/v/@locusai/locus-jira?color=blue&label=)](https://www.npmjs.com/package/@locusai/locus-jira) | `locus install jira` | Jira integration — fetch, execute, and sync issues |

### Building Your Own

Want to build a package? See the [Package Author Guide](./packages/sdk/PACKAGE_GUIDE.md) and submit a pull request.

```bash
# Scaffold a new package
locus create my-package
```

## Project Structure

After `locus init`, your project gets a `.locus/` directory:

```
.locus/
├── config.json        # Project settings (auto-detected)
├── run-state/         # Per-sprint execution state for recovery
├── LOCUS.md           # Agent instructions & project context
├── memory/            # Structured memory system (5 category files)
├── sessions/          # REPL session history
├── discussions/       # AI discussion archives
├── artifacts/         # AI-generated reports
├── plans/             # Planning documents
├── logs/              # Execution logs (NDJSON)
├── cron/              # Cron job output logs (if cron package installed)
└── worktrees/         # Git worktrees for parallel execution
```

## Security & Sandboxing

Locus supports running AI agents inside **Docker Desktop sandboxes** (4.58+) with one interface for Claude and Codex. Sandbox mode isolates execution from your host and enforces sync controls with `.sandboxignore`.

Sandbox execution requires provider sandboxes configured via `locus sandbox`. In default auto mode, Locus uses sandboxing when Docker is available and provider sandboxes are configured; if Docker is unavailable, it warns and can fall back to unsandboxed execution.

Security defaults and controls:

- `.env` and common secret patterns are excluded from sandbox sync by default via `.sandboxignore` (created by `locus init`).
- `.sandboxignore` defines what is excluded from sandbox-visible workspace content.
- Use `--sandbox=require` in CI or critical automation to prevent insecure fallback.
- Workspace sync is bidirectional for included files; excluded files stay out of sandbox execution.

| Flag | Behavior |
|------|----------|
| *(default)* | Use sandbox when configured and available; warn and fall back if Docker is unavailable |
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

Full setup and security details:

- [Sandboxing Setup (Docker-First)](https://docs.locusai.dev/getting-started/sandboxing-setup)
- [Security & Sandboxing](https://docs.locusai.dev/concepts/security-sandboxing)

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

## License

[MIT](./LICENSE)
