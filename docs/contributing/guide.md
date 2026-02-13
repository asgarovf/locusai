---
description: How to contribute to the Locus project.
---

# Development Guide

## Project Structure

Locus is a monorepo managed with [Turborepo](https://turbo.build/repo) and [Bun](https://bun.sh):

```
locus/
├── apps/
│   ├── api/           # NestJS API server
│   ├── web/           # Next.js dashboard
│   └── www/           # Marketing website
├── packages/
│   ├── cli/           # @locusai/cli — Command-line interface
│   ├── sdk/           # @locusai/sdk — TypeScript SDK
│   ├── telegram/      # @locusai/telegram — Telegram bot
│   └── shared/        # Shared types and utilities
└── scripts/           # Setup and deployment scripts
```

---

## Setting Up the Development Environment

### Prerequisites

* [Bun](https://bun.sh) (latest)
* [Node.js](https://nodejs.org) 18+
* [Git](https://git-scm.com)

### Clone and Install

```bash
git clone https://github.com/asgarovf/locusai.git
cd locusai
bun install
```

### Build All Packages

```bash
bun run build
```

### Run Type Checking

```bash
bun run typecheck
```

### Run Linting

```bash
bun run lint
```

---

## Working on Packages

### CLI

```bash
cd packages/cli
bun run build
# Test locally
node dist/cli.js --help
```

### Telegram Bot

```bash
cd packages/telegram
bun run build
# Test locally
node bin/telegram.js
```

### SDK

```bash
cd packages/sdk
bun run build
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Monorepo | Turborepo + Bun |
| API | NestJS + PostgreSQL |
| Dashboard | Next.js (React) |
| CLI | TypeScript + Commander-style parsing |
| SDK | TypeScript |
| Telegram | Telegraf (Node.js Telegram framework) |
| AI Providers | Claude CLI, Codex CLI |
| Testing | Jest |
