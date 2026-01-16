# Locus

A LOCAL-FIRST "Notion-lite + Kanban + Agent Orchestrator + Quality Gates" tool.

## Installation

```bash
bun install
```

## Workspace Initialization

Locus operates on workspace directories outside the product repo.

```bash
# Example
bun run workspace:init -- --repo /path/to/your/product --workspace /path/to/your/workspace.locus
```

## Running the Tool

You need to keep the server running for the UI and MCP to work.

### 1. Start Server & UI
```bash
bun run dev -- --project /path/to/your/workspace.locus
```
- UI: http://localhost:5173
- API: http://localhost:3000

### 2. Start MCP (for Cursor)
```bash
bun run mcp -- --project /path/to/your/workspace.locus
```

## Cursor Configuration

Add this to your Cursor `mcpServers` config:

```json
{
  "mcpServers": {
    "locus": {
      "command": "bun",
      "args": [
        "run",
        "/absolute/path/to/locus-dev/apps/mcp/src/index.ts",
        "--project",
        "/absolute/path/to/your/workspace.locus"
      ]
    }
  }
}
```

## CI Presets

Edit `ci-presets.json` in your workspace directory to define allowlisted commands.

```json
{
  "quick": ["bun run lint"],
  "full": ["bun run lint", "bun run test"]
}
```

## Features

- **Kanban Board**: Manage tasks with status rules.
- **Docs**: Edit Markdown documentation directly in the repo.
- **Secure CI**: Run allowlisted commands and attach logs as artifacts.
- **MCP**: Let Cursor read/write docs and manage tasks.
- **Local-First**: Everything stays on your machine (SQLite + Markdown).
