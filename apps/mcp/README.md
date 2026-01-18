<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/refs/heads/master/assets/logo.png" alt="Locus" width="150" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@locusai/mcp"><img src="https://img.shields.io/npm/v/@locusai/mcp?color=blue" alt="npm version" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?color=blue" alt="License" /></a>
  <a href="https://github.com/asgarovf/locusai"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
</p>

# @locusai/mcp

The MCP (Model Context Protocol) server for **Locus** — enabling AI agents to interact with your project.

## Features

- **Task Management** — Create, update, and move tasks via MCP tools
- **Documentation** — Read and write project documentation
- **CI Integration** — Execute CI presets and retrieve results
- **Artifacts** — Access implementation drafts and build artifacts

## MCP Tools

| Tool | Description |
|------|-------------|
| `kanban.list` | List all tasks |
| `kanban.create` | Create a new task |
| `kanban.move` | Move task to a different status |
| `docs.tree` | Get documentation structure |
| `docs.read` | Read a document |
| `docs.write` | Write/update a document |
| `ci.run` | Execute a CI preset |
| `artifacts.list` | List task artifacts |

## Usage

This package is bundled with `@locusai/cli`. You typically don't need to install it directly.

```bash
# Start via CLI (recommended)
npx @locusai/cli dev

# MCP server runs alongside the dashboard
```

## Configuration

Add to your MCP client (Claude, Cursor, etc.):

```json
{
  "mcpServers": {
    "locus": {
      "command": "npx",
      "args": ["@locusai/cli", "mcp", "--project", "/path/to/your/project"]
    }
  }
}
```

## Part of Locus

This package is part of the [Locus](https://github.com/asgarovf/locusai) platform.

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
