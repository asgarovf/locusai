---
title: CLI Reference
---

The `@locusai/cli` provides the core tools for managing your local-first agent workspace.

## Installation

```bash
npm install -g @locusai/cli
# or use via npx
npx @locusai/cli <command>
```

## Commands

### `init`

Initializes Locus in the current directory.

```bash
locus init
```

**What it does:**
- Creates a `.locus` directory.
- Creates `.locus/config.json` with project configuration.
- Creates `CLAUDE.md` context file if it doesn't exist.

**When to use:**
- When setting up Locus for the first time in a repository.

---

### `index`

Indexes your codebase to create a semantic map for the AI agent.

```bash
locus index [options]
```

**Options:**
- `--dir <path>`: Specify the directory to index (defaults to current directory).
- `--provider <name>`: AI provider to use (`claude` or `codex`, default `claude`).
- `--model <name>`: Model override for the chosen provider.

**What it does:**
- Scans your project files.
- Generates a tree summary and semantic index.
- Saves the index to `.locus` for efficient agent retrieval.

**When to use:**
- After significant code changes.
- Before running an agent if the codebase has changed.

---

### `run`

Starts the autonomous agent orchestrator to work on tasks.

```bash
locus run [options]
```

**Options:**
- `--api-key <key>`: (Required) Your Locus API key.
- `--workspace <id>`: (Optional) Your Locus Workspace ID. Usually resolved automatically from the API key.
- `--sprint <id>`: (Optional) Limit work to a specific sprint.
- `--provider <name>`: (Optional) AI provider to use (`claude` or `codex`, default `claude`).
- `--model <name>`: (Optional) AI model to use (defaults to `sonnet` for `claude`).
- `--skip-planning`: (Optional) Skip the planning phase.
- `--api-url <url>`: (Optional) Custom API endpoint.


**What it does:**
- Connects to the Locus Cloud to fetch tasks.
- Spawns a local agent worker.
- Executes tasks, runs tests, and commits changes.
- Reports progress back to the Cloud dashboard.
