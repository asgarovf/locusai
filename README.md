<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/master/assets/logo.png" alt="Locus" width="200" />
</p>

<h3 align="center">GitHub-native AI engineering CLI</h3>

<p align="center">
  Ship code from GitHub Issues — AI agents plan, execute, review, and iterate inside Docker sandboxes. No servers. No accounts.
</p>

<p align="center">
  <a href="https://github.com/asgarovf/locusai/stargazers"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
  <a href="https://www.npmjs.com/package/@locusai/cli"><img src="https://img.shields.io/npm/v/@locusai/cli?label=%40locusai%2Fcli&color=blue" alt="@locusai/cli" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?style=flat&color=blue" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@locusai/cli"><img src="https://img.shields.io/npm/dt/@locusai/cli?color=blue" alt="npm downloads" /></a>
  <a href="https://github.com/asgarovf/locusai/commits/master"><img src="https://img.shields.io/github/last-commit/asgarovf/locusai?color=blue" alt="Last commit" /></a>
  <a href="https://docs.locusai.dev"><img src="https://img.shields.io/badge/docs-locusai.dev-blue" alt="Documentation" /></a>
</p>

<p align="center">
  <a href="https://docs.locusai.dev">Documentation</a> &middot; <a href="https://docs.locusai.dev/getting-started/quickstart">Quick Start</a> &middot; <a href="#cli-reference">CLI Reference</a> &middot; <a href="https://github.com/asgarovf/locusai/issues">Issues</a>
</p>

---

> [!WARNING]
> **Active Development**: Locus is in early alpha. Expect breaking changes and evolving APIs.

> [!NOTE]
> **Security by default**: AI agents run inside hypervisor-isolated Docker sandboxes.
> `.sandboxignore` excludes `.env` and secrets from sync automatically.
> Use `--sandbox=require` in CI to enforce sandboxed execution.

## Why Locus?

AI coding agents are powerful — but they're point solutions. Locus wraps the entire plan-execute-review loop into a single CLI.

| | Locus | Cursor | Aider | Codex CLI |
|---|---|---|---|---|
| GitHub-native (Issues = tasks) | **Yes** | No | No | No |
| Docker sandbox isolation | **Unified** | N/A | No | Built-in |
| Multi-provider (Claude + Codex) | **Yes** | Claude only | Multi | OpenAI only |
| Sprint planning & orchestration | **Yes** | No | No | No |
| AI code review loop | **Yes** | No | No | No |
| Parallel worktree execution | **Yes** | No | No | No |
| Community packages (SDK) | **Yes** | Extensions | No | No |
| Interactive REPL | **Yes** | Yes | Yes | Yes |

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

## What It Looks Like

```
$ locus run

  ● Sprint: Add OAuth Support (3 tasks)
  ├─ ✓ #12  Create OAuth provider config       [claude-sonnet-4-6]  42s
  ├─ ● #13  Implement login callback endpoint   [claude-sonnet-4-6]  running...
  └─ ○ #14  Add session management middleware

  🔒 Sandbox: Docker (claude-sandbox)
  📁 Branch: locus/sprint-oauth
```

## Sandboxed Execution

Locus provides a **unified Docker sandbox layer** for both Claude and Codex. Every agent runs inside a hypervisor-isolated container — your host machine is never exposed to AI-generated code. One interface, any provider.

```bash
# Create isolated Docker sandboxes for Claude and Codex
locus sandbox

# Authenticate providers inside their sandboxes
locus sandbox claude
locus sandbox codex

# Install tools inside sandboxes without touching your host
locus sandbox install eslint prettier typescript

# Every `locus run` now executes inside the sandbox automatically
locus run
```

### Enforce sandboxing in CI

Use the `--sandbox=require` flag to guarantee sandboxed execution in CI pipelines — the run will fail if Docker is unavailable rather than falling back to unsandboxed mode.

```bash
# CI pipeline — never run without a sandbox
locus run --sandbox=require
```

| Flag | Behavior |
|------|----------|
| *(default)* | Use sandbox when configured and available; warn and fall back if Docker is unavailable |
| `--no-sandbox` | Explicitly disable sandboxing (shows safety warning) |
| `--sandbox=require` | Require sandbox — fail if Docker sandbox is unavailable |

### .sandboxignore

The `.sandboxignore` file (created by `locus init`) controls what is excluded from sandbox-visible workspace content. By default, `.env` and common secret patterns are excluded from sync — sensitive files never enter the sandbox.

Workspace sync is bidirectional for included files; excluded files stay out of sandbox execution entirely.

<details>
<summary>Sandbox configuration (<code>.locus/config.json</code>)</summary>

```json
{
  "sandbox": {
    "enabled": true,
    "extraWorkspaces": ["/path/to/shared/libs"],
    "readOnlyPaths": ["/path/to/configs"]
  }
}
```

- `enabled` — Toggle sandbox mode on/off
- `extraWorkspaces` — Additional directories to mount into the sandbox
- `readOnlyPaths` — Paths mounted as read-only inside the sandbox

</details>

Full setup and security details:
- [Sandboxing Setup (Docker-First)](https://docs.locusai.dev/getting-started/sandboxing-setup)
- [Security & Sandboxing](https://docs.locusai.dev/concepts/security-sandboxing)

## Sprint Orchestration

Locus is GitHub-native — Issues are tasks, Milestones are sprints, Labels track status, and Pull Requests are deliverables. No external dashboards, no vendor lock-in.

**GitHub IS the backend:**

| Concept | GitHub Primitive |
|---------|-----------------|
| Task | Issue |
| Sprint | Milestone |
| Status | Labels (`locus:queued`, `locus:in-progress`, `locus:done`, `locus:failed`) |
| Priority | Labels (`p:critical`, `p:high`, `p:medium`, `p:low`) |
| Execution Order | Labels (`order:1`, `order:2`, ...) |
| Deliverable | Pull Request |

```bash
# AI breaks your goal into ordered GitHub Issues
locus plan "Add SSO login and role-based access"

# Execute sequentially on one branch — resume if interrupted
locus run
locus run --resume

# Or run independent issues in parallel (3 concurrent agents)
locus run 42 43 44
```

## Review & Iterate

Close the feedback loop without manual intervention. AI reviews PRs with inline GitHub comments, then agents address the feedback and update the code automatically.

```bash
# AI reviews PRs, posts inline comments on GitHub
locus review

# Agents address review feedback and update PRs
locus iterate --sprint
```

## Interactive REPL

Full-featured terminal with streaming markdown, session persistence, and slash commands. Use it for exploratory coding, one-shot prompts, or ongoing sessions.

```bash
# Start an interactive session
locus exec

# Or run a one-shot prompt
locus exec "Refactor the auth middleware to use JWT"
```

## Packages & Extensibility

Install community-built packages to extend Locus with new capabilities — or build your own with the [`@locusai/sdk`](https://www.npmjs.com/package/@locusai/sdk).

```bash
# Install a community package
locus install <package-name>

# Run a package command
locus pkg <name>
```

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
| `locus sandbox` | Create provider sandboxes (Claude + Codex) and enable sandbox mode |
| `locus sandbox claude` | Authenticate Claude inside its sandbox |
| `locus sandbox codex` | Authenticate Codex inside its sandbox |
| `locus sandbox install <pkg>` | Install global npm package(s) in provider sandbox(s) |
| `locus sandbox shell <provider>` | Open an interactive shell in a provider sandbox |
| `locus sandbox logs <provider>` | Show provider sandbox logs |
| `locus sandbox rm` | Destroy provider sandboxes and disable sandbox mode |
| `locus sandbox status` | Show current sandbox state |

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
| [`@locusai/sdk`](./packages/sdk) | SDK for building community packages |
| [`@locusai/www`](./apps/www) | Documentation website |

## License

[MIT](./LICENSE)
