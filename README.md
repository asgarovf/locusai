# Locus

A **local-first AI development platform** that combines task management, documentation, and CI coordination to help AI agents build your projects.

> **Locus is the platform** that manages your projects. Your actual product code lives in separate repositories.

## Features

🎯 **Kanban Board** - Visual task management with AI-friendly workflows  
📚 **Documentation Hub** - Markdown docs integrated with your repo  
🤖 **MCP Integration** - Let AI agents read/write docs, manage tasks, and run CI  
✅ **Acceptance Checklists** - Track implementation progress automatically  
🔧 **Secure CI** - Allowlisted commands with artifact logging  
💾 **Local-First** - Everything stays on your machine (SQLite + Markdown)

## Quick Start

### 1. Install Locus (one time)

```bash
git clone <this-repo>
cd locus-dev
bun install
```

### 2. Create a New Project

```bash
# Create a new Locus-managed project
bun run create-project -- --name my-app --path ~/Projects

# Navigate to it
cd ~/Projects/my-app
bun install
```

This creates a monorepo with `apps/`, `packages/`, `docs/`, and a `.locus/` workspace.

### 3. Start Locus Server

```bash
# From locus-dev directory
cd /path/to/locus-dev
bun run dev -- --project ~/Projects/my-app/.locus
```

- **UI**: http://localhost:5173
- **API**: http://localhost:3080

### 4. Configure AI Assistant (Optional)

To let AI assistants (like Claude, Cursor, etc.) manage your project via MCP:

Add to your MCP config (e.g., `~/.gemini/antigravity/mcp_config.json`):

```json
{
  "mcpServers": {
    "locus": {
      "command": "bun",
      "args": [
        "run",
        "--cwd",
        "/path/to/locus-dev/apps/mcp",
        "src/index.ts",
        "--project",
        "/path/to/my-app/.locus"
      ],
      "env": {}
    }
  }
}
```

Then restart your AI assistant to load the Locus MCP server.

## How It Works

### Architecture

```
locus-dev/           ← The platform (this repo)
├── apps/
│   ├── server/     ← Locus API
│   ├── web/        ← Locus UI
│   └── mcp/        ← MCP server for AI
└── packages/
    └── create-locus-project/  ← Project scaffolding CLI

my-app/             ← Your product (managed BY Locus)
├── apps/
│   ├── web/        ← Your React app
│   └── server/     ← Your backend
├── docs/           ← Your product docs
└── .locus/         ← Locus workspace data
    ├── db.sqlite          ← Tasks, artifacts, CI runs
    ├── workspace.config.json
    └── ci-presets.json
```

### AI Workflow Example

1. **Task Creation**: Create a task in Locus UI or via MCP
2. **Implementation Draft**: When moved to "In Progress", an AI can generate a technical implementation plan
3. **Execution**: AI reads the draft, implements changes in your repo, checks off acceptance criteria
4. **Validation**: AI runs CI presets (e.g., `lint`, `typecheck`, `test`)
5. **Completion**: Task moves to "Done" with full audit trail

### MCP Tools

AI assistants can use these tools:

- `kanban.list/get/create/move` - Manage tasks
- `kanban.check` - Check off acceptance criteria
- `kanban.comment` - Add comments
- `docs.read/write` - Manage documentation  
- `artifacts.list/get` - Access implementation drafts
- `ci.run` - Run CI presets

## Documentation

- [Creating Projects Guide](./docs/creating-projects.md) - Full guide on project creation and management
- [CI Presets](./docs/ci-presets.md) - How to configure CI workflows

## Development

```bash
# Format code
bun run format

# Lint
bun run lint

# Type check
bun run typecheck
```

## Legacy Workspace Init

If you need to initialize a workspace manually (not recommended for new projects):

```bash
bun run workspace:init -- --repo /path/to/repo --workspace /path/to/workspace.locus
```

**Note**: Use `bun run create-project` instead for new projects.

## License

MIT
