---
description: Multi-provider MCP server management — configure, sync, and manage MCP servers across AI coding agents.
---

# locus mcp

Manage MCP (Model Context Protocol) servers across AI coding agents. Locus maintains a canonical config at `.locus/mcp.json` and syncs it to provider-specific formats (Claude, Codex).

## Usage

```bash
locus mcp <command> [options]
```

---

## Commands

| Command | Description |
|---------|-------------|
| `add <template>` | Add a server from a built-in template |
| `add-custom` | Add a custom MCP server |
| `remove <name>` | Remove an MCP server |
| `list` | List configured servers |
| `sync` | Sync config to provider-specific formats |
| `test <name>` | Test an MCP server connection |
| `status` | Show config and provider sync status |
| `enable <name>` | Enable a server |
| `disable <name>` | Disable a server |

---

## Built-in Templates

Locus ships with pre-configured templates for popular MCP servers:

| Template | Description | Required Environment |
|----------|-------------|---------------------|
| `postgres` | Query and manage PostgreSQL databases | `POSTGRES_CONNECTION` |
| `filesystem` | Read, write, and manage files locally | — |
| `github` | Interact with GitHub repositories, issues, and PRs | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `fetch` | Fetch and process content from URLs | — |
| `memory` | Persistent memory and knowledge graph storage | — |

---

## How It Works

1. Servers are stored in `.locus/mcp.json` — the canonical config shared across providers
2. `locus mcp sync` translates the canonical config into provider-specific formats (e.g., `.claude/mcp.json` for Claude)
3. Each server can be scoped to specific providers via the config
4. Health checks verify that configured servers are reachable and responding

---

## Examples

### Add a server from a built-in template

```bash
# Add GitHub MCP server
locus mcp add github

# Add PostgreSQL with connection string
locus mcp add postgres --name mydb --env POSTGRES_CONNECTION=postgresql://user:pass@localhost:5432/db

# Add filesystem server
locus mcp add filesystem
```

### Add a custom MCP server

```bash
locus mcp add-custom --name api --transport stdio --command node --args server.js
```

### Manage servers

```bash
# List all configured servers
locus mcp list
locus mcp list --json

# Test a server connection
locus mcp test mydb

# Enable/disable a server
locus mcp disable mydb
locus mcp enable mydb

# Remove a server
locus mcp remove mydb
```

### Sync to providers

```bash
# Sync to all providers
locus mcp sync

# Sync to a specific provider
locus mcp sync --provider claude

# Preview sync without writing
locus mcp sync --dry-run
```

### Check status

```bash
# Show config and provider sync status
locus mcp status
```
