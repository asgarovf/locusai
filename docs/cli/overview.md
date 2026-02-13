---
description: Complete reference for all Locus CLI commands.
---

# CLI Overview

## Usage

```bash
locus <command> [options]
```

---

## Commands

| Command | Description |
|---------|-------------|
| [`init`](../getting-started/initialization.md) | Initialize Locus in the current directory |
| [`config`](config.md) | Manage settings (API key, provider, model) |
| [`run`](run.md) | Start agent to work on sprint tasks sequentially |
| [`plan`](plan.md) | Run AI sprint planning meeting |
| [`exec`](exec.md) | Execute a prompt with repository context |
| [`review`](review.md) | AI code review for PRs and staged changes |
| [`docs`](docs.md) | Sync workspace documents |
| [`index`](index-codebase.md) | Index the codebase for AI context |
| [`telegram`](telegram.md) | Configure the Telegram bot |

---

## Global Options

| Option | Description |
|--------|-------------|
| `--help` | Show help message |
| `--provider <name>` | AI provider: `claude` or `codex` (default: `claude`) |

---

## Getting Started

```bash
# Initialize and configure
locus init
locus config setup

# Start working
locus run

# Or plan first
locus plan "your goal"
```

---

## Common Workflows

### Execute sprint tasks

```bash
locus run
```

### One-off AI execution

```bash
locus exec "add error handling to the login endpoint"
```

### Review pull requests

```bash
locus review
```

### Interactive session

```bash
locus exec -i
```
