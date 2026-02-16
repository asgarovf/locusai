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
  <a href="https://www.npmjs.com/package/@locusai/shared"><img src="https://img.shields.io/npm/v/@locusai/shared?label=%40locusai%2Fshared&color=blue" alt="@locusai/shared" /></a>
  <a href="https://docs.locusai.dev"><img src="https://img.shields.io/badge/docs-locusai.dev-blue" alt="Documentation" /></a>
</p>

**Locus is an AI-native project management platform for engineering teams.**

Plan sprints, manage tasks, and coordinate documentation in the cloud—while AI agents run securely on your machine to build, test, and document your software.

Read the [full documentation](https://docs.locusai.dev) to learn more.

> [!WARNING]
> **Active Development**: Locus is currently in an early alpha stage and is under active development. Expect breaking changes, bugs, and evolving APIs. Use with caution in production environments.

> **Locus is the platform** that manages your projects. Your actual product code lives in separate repositories.

## Key Features

- **AI-Native Planning** — Plan sprints, define tasks, and write documentation designed for AI agents. Use AI-powered sprint planning with a multi-agent meeting (Tech Lead, Architect, Sprint Organizer) to break down goals into structured, prioritized tasks.
- **Secure Local Execution** — Agents run on your machine (or your server). Source code never leaves your infrastructure—only task metadata is synced to the cloud.
- **Multiple AI Providers** — Choose between Claude (Anthropic) and Codex (OpenAI) as your agent backend. Switch providers per-command or set a default.
- **Team Coordination** — Cloud-based dashboard for visibility, collaboration, sprint boards, document editing, and task management.
- **Cognitive Context** — Agents receive rich context including project instructions (`.locus/LOCUS.md`), semantic codebase index, workspace documents, sprint progress, and task details.
- **AI Code Review** — Review pull requests or local changes with AI-powered analysis directly from the CLI.
- **Skills System** — Extend agent capabilities with markdown instruction files for specialized domain knowledge.
- **Telegram Bot** — Control agents, plan sprints, approve plans, and monitor execution remotely from your phone.
- **Self-Hosting** — Deploy Locus on your own server for 24/7 agent availability with remote Telegram control.
- **VSCode Extension** (SOON) — Chat with agents, manage tasks, and start work directly from your editor.

## Quick Start

The fastest way to use Locus is via `npx`. No installation required.

### 1. Initialize a new project

```bash
npx @locusai/cli init
```

### 2. Configure your API key

```bash
npx @locusai/cli config setup --api-key <YOUR_KEY>
```

### 3. Index your codebase

Create a semantic map for the agent:

```bash
npx @locusai/cli index
```

### 4. Run the agent

Start agents to pick up and execute tasks from your active sprint:

```bash
npx @locusai/cli run
```

Run multiple agents in parallel:

```bash
npx @locusai/cli run --agents 3
```

Use a different provider:

```bash
npx @locusai/cli run --provider codex
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `locus init` | Initialize a project with the `.locus/` structure |
| `locus config` | Manage settings (API key, provider, model) |
| `locus run` | Start agents to execute sprint tasks |
| `locus plan` | AI sprint planning with a multi-agent meeting |
| `locus exec` | Execute a prompt with repo context (supports interactive REPL) |
| `locus review` | AI code review for PRs and local changes |
| `locus index` | Create a semantic codebase index |
| `locus docs` | Sync workspace documents |
| `locus telegram` | Configure and start the Telegram bot |
| `locus upgrade` | Upgrade CLI to the latest version |
| `locus version` | Show current version |

---

## How It Works

### Architecture

```
locus-dev/                       ← The platform (Open Source)
├── apps/
│   ├── api/                     ← Cloud API & Engine (NestJS)
│   ├── web/                     ← Cloud Dashboard (Next.js)
│   └── www/                     ← Landing Page (Next.js)
└── packages/
    ├── cli/                     ← Local Agent Runtime & CLI
    ├── sdk/                     ← Core Logic & API Client
    ├── shared/                  ← Shared Types & Schemas
    └── telegram/                ← Telegram Bot for Remote Control
```

### The Workflow

1. **Plan** — Define tasks manually in the dashboard, or use `locus plan "your goal"` to have AI agents break down your objective into a structured sprint.
2. **Dispatch** — Start agents with `locus run`. The API dispatches tasks with server-side locking to prevent conflicts.
3. **Execute** — Each agent claims a task, creates an isolated git branch, builds rich context, and executes using your chosen AI provider.
4. **Review** — Agents commit changes, push branches, and create pull requests. Review with `locus review` or in GitHub. Reject tasks with feedback to send them back for rework.

### Project Structure

After running `locus init`, your project will have:

```
your-project/
├── .locus/
│   ├── config.json              # Project metadata
│   ├── settings.json            # API key & provider (gitignored)
│   ├── LOCUS.md                 # Agent instructions
│   ├── LEARNINGS.md             # Continuous learning log
│   ├── codebase-index.json      # Semantic index
│   ├── documents/               # Synced workspace documents
│   ├── artifacts/               # Generated files
│   ├── sessions/                # Exec session history
│   ├── reviews/                 # Code review reports
│   └── plans/                   # Sprint plans
├── .claude/skills/              # Claude-specific skills
└── .codex/skills/               # Codex-specific skills
```

---

## Telegram Bot

Control your agents remotely with the built-in Telegram bot:

- `/plan` — Start AI sprint planning
- `/approve` / `/reject` — Approve or reject generated plans
- `/run` — Start agents remotely
- `/exec` — Execute a prompt with repo context
- `/tasks` — List active tasks
- `/stop` — Stop running processes
- `/git` — Run whitelisted git commands
- `/dev` — Run lint, typecheck, build, or test

Set up with `locus telegram` and connect your Telegram chat.

---

## Self-Hosting

Deploy Locus on your own server for 24/7 agent availability:

```bash
curl -fsSL https://locusai.dev/install.sh | bash
```

The installer sets up Node.js, Bun, GitHub CLI, your chosen AI provider CLI, and configures system services for automatic startup. Supports Linux (systemd), macOS (LaunchAgent), and Windows (Scheduled Tasks).

See the [self-hosting guide](https://docs.locusai.dev/self-hosting/overview) for full details.

---

## Development

For detailed instructions on how to set up the development environment, run tests, and contribute code, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
# Quick check
bun run lint && bun run typecheck
```

## License

[MIT](./LICENSE)
