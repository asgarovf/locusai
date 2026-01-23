---
title: Getting Started with Locus
---

Locus is a local-first platform designed to give AI agents the context and tools they need to be effective engineers. It combines a local agent runtime with a cloud-based orchestration layer to ensure your intellectual property stays private while enabling powerful autonomous workflows.

## Prerequisites

- **Node.js**: v18 or higher (using `npx`).
- **Git**: Your project must be a git repository.
- **Locus Account**: You need a Workspace ID and API Key from the Locus Cloud dashboard.

## Installation

You can run Locus commands directly using `npx`:

```bash
npx @locusai/cli --help
```

Or install it globally:

```bash
npm install -g @locusai/cli
```

## Quick Start

### 1. Initialize Locus

Run this command in the root of your existing project to set up the configuration:

```bash
locus init
```

This creates a `.locus` directory with your project configuration and a `CLAUDE.md` context file.

### 2. Index Your Codebase

Before the agent can work effectively, it needs to understand your code. Run the indexer:

```bash
locus index
```

This generates a semantic map of your project that allows the agent to navigate and understand dependencies.

### 3. Start the Agent

Now you're ready to let the agent work! You'll need your credentials from the web dashboard.

```bash
locus run --api-key YOUR_KEY --workspace YOUR_WORKSPACE_ID
```

The agent will:
1. Connect to the Locus Cloud.
2. Check for assigned tasks in the backlog.
3. Pull the next high-priority task.
4. Execute the work LOCALLY on your machine.
5. Push changes and report status back to the cloud.

> [!TIP]
> You can set `LOCUS_API_KEY` and `LOCUS_WORKSPACE_ID` as environment variables to avoid typing them every time.

## Next Steps

- **[Explore the CLI](/docs/cli-reference)** to learn about all available commands.
- **[Understand the Architecture](/docs/architecture)** to see how Locus keeps your code safe.
