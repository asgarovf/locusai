---
title: Configuring MCP
---

Locus exposes an MCP (Model Context Protocol) server that allows AI agents like Claude, Cursor, and Antigravity to interact with your workspace. This guide covers how to configure MCP for different clients.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol that allows AI models to interact with external tools and data sources. Locus implements an MCP server that exposes your project's tasks, documentation, and CI capabilities to AI agents.

## Configuration for Cursor

To connect Locus to Cursor, add the following to your `.cursor/mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "locus": {
      "command": "bun",
      "args": ["run", "/path/to/locus/bin/mcp.js", "--project", "/path/to/your/project/.locus"]
    }
  }
}
```

> [!TIP]
> You can find the exact configuration for your project by running `npx @locusai/cli init` or `npx @locusai/cli dev`.

After adding this configuration, restart Cursor. The Locus tools will be available to the AI assistant.

## Configuration for Antigravity

Antigravity automatically detects Locus if you have a `.locus` directory in your project. To manually configure it, add to your workspace settings:

```json
{
  "mcpServers": {
    "locus": {
      "command": "bun",
      "args": ["run", "/path/to/locus/bin/mcp.js", "--project", "/path/to/your/project/.locus"]
    }
  }
}
```

## Configuration for Claude Desktop

For Claude Desktop, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "locus": {
      "command": "bun",
      "args": ["run", "/path/to/locus/bin/mcp.js", "--project", "/path/to/your/project/.locus"]
    }
  }
}
```

The config file is typically located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`


## Verifying the Connection

Once configured, you can verify the MCP connection by asking your AI agent:

> "What Locus tools are available?"

The agent should respond with a list of available tools like `kanban.list`, `docs.read`, `ci.run`, etc.

## Troubleshooting

### Server Not Starting

If the MCP server fails to start:

1. Ensure you have a `.locus` directory in your project
2. Run `npx @locusai/cli dev` first to initialize the workspace
3. Check that Bun is installed (`bun --version`)

### Tools Not Appearing

If tools don't appear in your AI client:

1. Restart your AI client completely
2. Check the MCP server logs for errors
3. Ensure your project has a valid `workspace.config.json` in `.locus`
