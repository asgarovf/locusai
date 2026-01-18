---
title: Getting Started with Locus
---

# Getting Started

Locus is a local-first platform designed to give AI agents the context and tools they need to be effective engineers.

## Quick Start (Zero Config)

The fastest way to use Locus is via `npx`:

```bash
npx @locusai/cli init --name my-app
```

Then start the dashboard:

```bash
cd my-app
npx @locusai/cli dev
```

## How it works

Locus creates a `.locus` folder in your repository. This contains:
1. `db.sqlite` - The local database for tasks and history.
2. `workspace.config.json` - Configuration for your workspace.

Everything is local. No cloud login required.
