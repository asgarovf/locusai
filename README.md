<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/master/assets/logo.png" alt="Locus" width="200" />
</p>

<p align="center">
  <a href="https://github.com/asgarovf/locusai/stargazers"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?style=flat&color=blue" alt="License" /></a>
  <a href="https://github.com/asgarovf/locusai"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@locusai/cli"><img src="https://img.shields.io/npm/v/@locusai/cli?label=%40locusai%2Fcli&color=blue" alt="@locusai/cli" /></a>
  <a href="https://docs.locusai.dev"><img src="https://img.shields.io/badge/docs-locusai.dev-blue" alt="Documentation" /></a>
</p>

**Locus is a GitHub-native AI engineering CLI.** Turn GitHub issues into shipped code — plan sprints, execute tasks with AI agents, and iterate on feedback. All native to GitHub.

> GitHub Issues are tasks. Milestones are sprints. Labels track status. Pull Requests are deliverables. **No servers. No database. No accounts.**

Read the [full documentation](https://docs.locusai.dev) to learn more.

> [!WARNING]
> **Active Development**: Locus is in early alpha and under active development. Expect breaking changes and evolving APIs.

## Quick Start

```bash
# Install
npm install -g @locusai/cli

# Initialize in your GitHub repo
locus init

# Plan a sprint with AI
locus plan "Build user authentication with OAuth"

# Execute the sprint
locus run

# Review the PRs
locus review
```

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [GitHub CLI](https://cli.github.com) (`gh`) — installed and authenticated via `gh auth login`
- An AI provider: [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [Codex](https://openai.com/index/introducing-codex/)

## How It Works

```
locus plan "your goal"      →  AI creates GitHub Issues with order labels
locus run                   →  Agents execute tasks sequentially, push code, create PRs
locus review                →  AI reviews PRs, posts inline comments
locus iterate               →  Agents address review feedback until merged
```

**GitHub IS the backend:**

| Concept | GitHub Equivalent |
|---------|-------------------|
| Task | Issue |
| Sprint | Milestone |
| Status | Labels (`locus:queued`, `locus:in-progress`, `locus:done`, `locus:failed`) |
| Priority | Labels (`p:critical`, `p:high`, `p:medium`, `p:low`) |
| Execution Order | Labels (`order:1`, `order:2`, ...) |
| Deliverable | Pull Request |

## Key Features

- **Zero Infrastructure** — No server, no database, no API. GitHub is your entire backend. Single auth via `gh auth login`.
- **Sprint Execution** — Sequential task execution on a single branch. Each task builds on the last. Resume from failures automatically.
- **AI Sprint Planning** — Describe a goal in plain English. AI creates structured GitHub issues with priority, type, and execution order.
- **Parallel Worktrees** — Run standalone issues in parallel using git worktrees. Up to 3 concurrent agents by default.
- **Interactive REPL** — Full-featured terminal with streaming markdown, session persistence, tab completion, and slash commands.
- **AI Code Review** — Review PRs with AI-powered analysis. Posts inline comments on GitHub.
- **Iterate on Feedback** — Agents re-execute tasks with PR review comments as context until the code is ready to merge.
- **AI-Agnostic** — Works with Claude (Anthropic) and Codex (OpenAI). Switch providers per-command.
- **Recoverable** — Failed runs resume where they left off via `--resume`. No re-executing completed work.
- **Docker Sandbox** — Hypervisor-level isolation via Docker Desktop sandboxes. AI agents run in a separate kernel with no direct access to your host filesystem or credentials.

## CLI Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `locus init` | | Initialize project with `.locus/` structure and GitHub labels |
| `locus issue` | `locus i` | Create, list, show, label, and close GitHub issues |
| `locus sprint` | `locus s` | Create, list, show, activate, reorder, and close sprints |
| `locus plan` | | AI-powered sprint planning from a goal description |
| `locus run` | | Execute sprint tasks or standalone issues with AI agents |
| `locus exec` | `locus e` | Interactive REPL or one-shot prompt execution |
| `locus review` | | AI code review on pull requests |
| `locus iterate` | | Re-execute tasks with PR feedback context |
| `locus discuss` | | AI-powered architectural discussions |
| `locus status` | | Dashboard view of project state |
| `locus config` | | View and manage settings |
| `locus logs` | | View, tail, and manage execution logs |
| `locus upgrade` | | Self-upgrade to latest version |

## Project Structure

After `locus init`, your project has:

```
your-project/
├── .locus/
│   ├── config.json              # Project settings (auto-detected)
│   ├── run-state.json           # Execution state (for recovery)
│   ├── LOCUS.md                 # Agent instructions & project context
│   ├── LEARNINGS.md             # Accumulated lessons from past runs
│   ├── sessions/                # REPL session history
│   ├── discussions/             # AI discussion archives
│   ├── artifacts/               # AI-generated reports
│   ├── plans/                   # Planning documents
│   ├── logs/                    # Execution logs (NDJSON)
│   └── worktrees/               # Git worktrees for parallel execution
```

## Security & Sandboxing

Locus supports running AI agents inside **Docker Desktop sandboxes** — lightweight microVMs that provide hypervisor-level isolation. Each sandbox runs a separate kernel, so the AI agent cannot directly access your host filesystem, network, or environment variables.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **4.58+** with sandbox support enabled

### Default Behavior

When Docker Desktop 4.58+ is installed, Locus **automatically** runs agents inside a sandbox. If Docker is not available, Locus falls back to unsandboxed execution with a warning.

### CLI Flags

| Flag | Behavior |
|------|----------|
| *(default)* | Use sandbox if Docker is available; warn and fall back if not |
| `--no-sandbox` | Explicitly disable sandboxing (shows safety warning) |
| `--sandbox=require` | Require sandbox — fail with an error if Docker sandbox is unavailable |

```bash
# Run with sandbox (default when Docker is available)
locus run 42

# Explicitly disable sandbox
locus run 42 --no-sandbox

# Require sandbox — fail if unavailable
locus run 42 --sandbox=require
```

### Configuration

Control sandbox behavior in `.locus/config.json`:

```json
{
  "sandbox": {
    "enabled": true,
    "extraWorkspaces": ["/path/to/shared/libs"],
    "readOnlyPaths": ["/path/to/configs"]
  }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sandbox.enabled` | boolean | `true` | Enable sandbox by default |
| `sandbox.extraWorkspaces` | string[] | `[]` | Additional paths to sync into the sandbox |
| `sandbox.readOnlyPaths` | string[] | `[]` | Paths mounted as read-only inside the sandbox |

CLI flags (`--no-sandbox`, `--sandbox=require`) override the `sandbox.enabled` config value.

### Troubleshooting

**"Docker sandbox not available"**
Install or upgrade to [Docker Desktop 4.58+](https://www.docker.com/products/docker-desktop/). Ensure Docker is running and the `docker sandbox ls` command works.

**Sandbox performance**
Each sandbox is a lightweight microVM. For parallel runs (`locus run 42 43 44`), each issue gets its own sandbox. Resource usage scales with `agent.maxParallel`. Reduce concurrency if your machine is constrained.

**File sync delays**
Docker sandboxes use bidirectional file sync between your host workspace and the sandbox. There may be slight latency for very large files or high-frequency writes.

**Network restrictions**
Outbound network traffic from the sandbox goes through Docker's network proxy. Most API calls (GitHub, AI providers) work transparently. Custom proxy configurations may require additional Docker Desktop settings.

## Development

```bash
# Install dependencies
bun install

# Quick check
bun run lint && bun run typecheck
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development instructions.

## License

[MIT](./LICENSE)
