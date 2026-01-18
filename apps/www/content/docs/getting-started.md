---
title: Getting Started with Locus
---

Locus is a local-first platform designed to give AI agents the context and tools they need to be effective engineers. By running locally within your repository, it ensures your intellectual property stays private while giving agents direct access to run tests, linters, and builds.

## Prerequisites

- **Bun**: Locus uses Bun for fast execution. [Install Bun](https://bun.sh).
- **Node.js**: v18 or higher (if not using Bun directly).
- **Git**: Your project must be a git repository.

## Installation

You don't need to install Locus globally. We recommend using `npx` (or `bunx`) to ensure you always use the latest version compatible with your project.

### 1. Initialize Locus

Run this command in the root of your existing project:

```bash
npx @locusai/cli init
```

This will create a `.locus` directory containing:
- `db.sqlite`: Your local task database.
- `workspace.config.json`: Project settings.

### 2. Start the Dashboard

Locus comes with a built-in dashboard for managing tasks and viewing documentation.

```bash
npx @locusai/cli dev
```

Visit `http://localhost:3080` to see your workspace.

## Next Steps

Now that you have Locus running, you can:
- **[Create your first Task](/docs/core-concepts#tasks)** using the Kanban board.
- **Connect an AI Agent** via MCP (Model Context Protocol).
