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

| Command | Description |
|---------|-------------|
| `locus status` | Dashboard view of project state |
| `locus logs` | View, tail, and manage execution logs |
| `locus artifacts` | View and manage AI-generated artifacts |

### Packages

| Command | Description |
|---------|-------------|
| `locus install` | Install a community package from npm |
| `locus uninstall` | Remove an installed package |
| `locus packages` | List installed packages |
| `locus pkg <name>` | Run a package-provided command |

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
| `--no-sandbox` | Disable Docker isolation |
| `--sandbox=require` | Require Docker (fail if unavailable) |

## Documentation

Full documentation is available at [docs.locusai.dev](https://docs.locusai.dev).

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
