# Creating and Managing Locus Projects

This guide explains how to create new projects managed by Locus.

## Quick Start

```bash
# Create a new Locus-managed project
bun run create-project -- --name my-app --path ~/Projects

# Or directly from the package
bun run packages/create-locus-project/index.ts -- --name my-app
```

## What Gets Created

### Project Structure
```
my-app/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── server/       # Express + Bun backend
├── packages/
│   └── shared/       # Shared types and utilities
├── docs/
│   └── getting-started.md
├── .locus/           # Locus workspace
│   ├── db.sqlite    # Tasks, artifacts, CI runs
│   ├── workspace.config.json
│   ├── ci-presets.json
│   ├── artifacts/   # Generated files
│   └── logs/        # CI logs
├── package.json
├── tsconfig.json
├── biome.json
└── README.md
```

### Initial Task
Each new project comes with a "Welcome to Locus!" task in the backlog with:
- Description of what Locus does
- Getting started checklist
- Links to documentation

## Using the Project

### 1. Install Dependencies
```bash
cd my-app
bun install
```

### 2. Start Development
```bash
bun run dev        # Starts web app
bun run dev:server # Starts backend
```

### 3. Point Locus to It

#### Option A: Update MCP Config (for AI assistants)
Edit `~/.gemini/antigravity/mcp_config.json`:
```json
{
  "mcpServers": {
    "locus": {
      "command": "bun",
      "args": [
        "run",
        "--cwd",
        "/Users/yourusername/Desktop/dev/locus-dev/apps/mcp",
        "src/index.ts",
        "--project",
        "/path/to/my-app/.locus"
      ],
      "env": {}
    }
  }
}
```

#### Option B: Start Locus Server
```bash
# From locus-dev repo
bun run server -- --workspace /path/to/my-app/.locus

# Then open http://localhost:3080
```

## Managing Tasks with MCP

Once connected, AI assistants can:
- `kanban.list` - List all tasks
- `kanban.get` - Get task details
- `kanban.create` - Create new tasks
- `kanban.move` - Change task status
- `kanban.check` - Mark acceptance checklist items as completed
- `kanban.comment` - Add comments
- `docs.read/write` - Manage documentation
- `ci.run` - Run CI presets
- `artifacts.list/get` - Access implementation drafts

## Example AI Workflow

```
1. "List all backlog tasks"
   → AI uses kanban.list to show tasks

2. "Work on task #1"
   → AI uses kanban.get to read the task
   → AI uses artifacts.list to find implementation draft
   → AI implements the changes in your repo
   → AI uses kanban.check to mark checklist items complete
   → AI uses kanban.move to move task to "DONE"

3. "Run quick CI for task #1"
   → AI uses ci.run with preset: "quick"
```

## Customizing CI Presets

Edit `.locus/ci-presets.json`:
```json
{
  "quick": ["bun run lint", "bun run typecheck"],
  "full": ["bun run lint", "bun run typecheck", "bun test"],
  "deploy": ["bun run build", "./deploy.sh"]
}
```

## Separation of Concerns

- **locus-dev/** → The Locus platform (this repo)
- **my-app/** → Your product managed BY Locus
- **my-app/.locus/** → Workspace data (tasks, artifacts, etc.)

This separation means:
- Locus itself can be updated independently
- You can manage multiple projects with one Locus installation
- Projects can be version controlled without Locus code
- Easy to share projects (just .gitignore the .locus/ directory for task privacy)
