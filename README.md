# Locus

A **local-first AI development platform** that combines task management, documentation, and CI coordination to help AI agents build your projects.

> **Locus is the platform** that manages your projects. Your actual product code lives in separate repositories.

## 🌟 Key Features

- **Kanban Board** - Visual task management with AI-friendly workflows.
- **Documentation Hub** - Markdown docs integrated directly with your repository.
- **MCP Integration** - Let AI agents (Claude, Cursor, etc.) read/write docs, manage tasks, and run CI.
- **Acceptance Checklists** - Track implementation progress automatically as agents work.
- **Secure CI** - Execute allowlisted commands with real-time audit logs and artifacts.
- **Local-First** - Your data stays on your machine, stored in a transparent `.locus` folder.

## 🚀 Quick Start

Locus is powered by a unified CLI.

### 1. Install Dependencies
```bash
bun install
```

### 2. Initialize a new project
```bash
bun packages/cli/index.ts init --name my-app
```

### 3. Run the Locus Dashboard
Navigate to your project (or provide the path) and run:
```bash
bun packages/cli/index.ts dev --project /path/to/my-app
```

This starts the Locus engine and the dashboard at `http://localhost:3080`.

---

## 🛠 How It Works

### Architecture

```
locus-dev/           ← The platform
├── apps/
│   ├── server/     ← Locus API
│   ├── web/        ← Locus Dashboard
│   └── mcp/        ← MCP server for AI connectivity
└── packages/
    ├── cli/        ← Unified Locus CLI
    └── shared/     ← Shared types and schemas

my-app/             ← Your product (managed BY Locus)
├── apps/           ← Your frontend and backend code
├── packages/       ← Shared logic for your app
└── .locus/         ← Locus workspace data (Generated)
    ├── db.sqlite          ← Tasks, comments, and CI runs
    ├── workspace.config.json
    └── ci-presets.json
```

### AI Workflow Example

1. **Task Creation**: Define a feature in the Locus UI.
2. **In Progress**: Moving a task to "In Progress" triggers a "Technical Implementation Draft".
3. **Agent Implementation**: Your AI agent reads the draft, applies code changes, and checks off criteria.
4. **CI Validation**: The agent runs `ci.run` to verify the build/lint/tests pass.
5. **Verification**: You review the work and move the task to "Done".

### MCP Tools for Agents

Your AI assistant can use these tools immediately:

- `kanban.*` - List, create, and move tasks.
- `docs.*` - Read and write technical documentation.
- `artifacts.*` - Access implementation drafts and logs.
- `ci.run` - Execute pre-defined CI workflows.

---

## 📜 Documentation

- [CI Presets Guide](./docs/ci-presets.md) - How to configure CI workflows.
- [ROADMAP.md](./ROADMAP.md) - Our vision from MVP to Product.

## 🛠 Development

```bash
# Format code
bun run format

# Type check
bun run typecheck

# Lint
bun run lint
```

## 📄 License

MIT
