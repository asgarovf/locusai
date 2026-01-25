---
title: "Using with MCP"
description: "Learn how to integrate Locus with MCP-compatible editors like Cursor, VSCode, and Antigravity."
---

The Model Context Protocol (MCP) allows AI coding assistants to interact directly with your local tools and environment. Locus provides a robust MCP server that enables your AI editor to act as a fully autonomous agent within your Locus workspace.

## Supported Editors

Locus MCP is compatible with any editor or AI tool that supports the Model Context Protocol. Optimized experiences are available for:

- **Cursor**
- **Antigravity**
- **VSCode** (with MCP extension)
- **Windsurf** / **PearAI** (and other forks)

## Setup Guide

### 1. Prerequisites
Ensure you have the latest version of the Locus CLI installed and initialized in your project.

```bash
npm install -g locus
locus init
```

### 2. Configure Your Editor

Most MCP-compatible editors (like Cursor, Windsurf, or VSCode with the MCP extension) allow you to configure servers via a JSON config file (e.g., `mcp_config.json` or in settings).

Use the following configuration to connect to the Locus MCP server directly via HTTP/SSE:

```json
{
  "mcpServers": {
    "locus-mcp": {
      "url": "https://mcp.locusai.dev/mcp",
      "headers": {
        "x-api-key": "<YOUR_LOCUS_API_KEY>",
        "x-workspace-id": "<YOUR_WORKSPACE_ID>"
      },
      "alwaysAllow": ["read_resource", "list_resources", "call_tool"]
    }
  }
}
```

<Note>
If you are running the MCP server locally (e.g. for development), change the `url` to `http://localhost:3000/mcp`.
</Note>

### 3. Editor-Specific Steps

#### For Cursor
1. Go to **Settings** > **Features** > **MCP**.
2. Click **"Add New MCP Server"**.
3. Choose **"SSE"** (Server-Sent Events) as the type.
4. Enter the URL: `https://mcp.locusai.dev/mcp`
5. *Note: Cursor UI might not yet support custom headers for SSE. In that case, use the config file method if available, or wait for updates.*

*(If you are setting it up via the `command` method for local CLI usage, point it to your local node process, but HTTP/SSE is recommended for cloud connectivity.)*

#### For VSCode / Forks
1. Open your MCP settings file.
2. Paste the JSON configuration from above.
3. Replace `<YOUR_LOCUS_API_KEY>` and `<YOUR_WORKSPACE_ID>` with your actual credentials from the dashboard.

## Usage

Once configured, you can interact with Locus directly through your AI chat.

**Deep Integration**:
The MCP server exposes tools that allow the AI to:
- Read your current sprint and active tasks.
- Create, update, and complete tasks.
- Read documentation and architectural guidelines.

**Trigger Phrases**:
To start a session, simply ask your AI assistant:
- "Start Locus session"
- "Run Locus agent"
- "What is my next task?"

The AI will automatically trigger the `start_agent_session` tool, analyse your codebase, and begin working on your assigned Locus tasks.

## Troubleshooting

- **Server Connection**: If the server fails to start, ensure `locus` is in your system PATH.
- **Permissions**: Some editors may require you to approve tool execution. Always allow Locus to run commands if you trust the operation.
