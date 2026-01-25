---
title: Getting Started with Locus
---

Locus is an AI-native project management platform for engineering teams. Plan sprints, manage tasks, and coordinate documentation in the cloud—while AI agents run securely on your machine to build, test, and document your software.

## Prerequisites

- **Node.js**: v18 or higher (using `npx`).
- **Git**: Your project must be a git repository.
- **Locus Account**: You need a Workspace ID and API Key from the Locus Cloud dashboard.



## Installation

You can install Locus globally:

```bash
npm install -g @locusai/cli
```

Or run it directly using `npx`:

```bash
npx @locusai/cli --help
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

<Tip>
You can set `LOCUS_API_KEY` and `LOCUS_WORKSPACE_ID` as environment variables to avoid typing them every time.
</Tip>

## Detailed Documentation
Now that you have initialized Locus, choose your preferred way of working:

- **[Using with Editors (MCP)](/docs/mcp-integration)**: Connect Locus mainly with Cursor, Windsurf, or VSCode.
- **[Using Terminal Agent](/docs/terminal-agent)**: Run Locus as a standalone background process in your terminal.

## Further Reading
- **[CLI Reference](/docs/cli-reference)**: Explore all available commands.
- **[Architecture](/docs/architecture)**: Understand how Locus works under the hood.
