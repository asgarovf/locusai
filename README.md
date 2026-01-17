# Locus

A **local-first AI development platform** that combines task management, documentation, and CI coordination to help AI agents build your projects.

> [!WARNING]
> **Active Development**: Locus is currently in an early alpha stage and is under active development. Expect breaking changes, bugs, and evolving APIs. Use with caution in production environments.

> **Locus is the platform** that manages your projects. Your actual product code lives in separate repositories.

## 🌟 Key Features

- **Kanban Board** - Visual task management with AI-friendly workflows.
- **Documentation Hub** - Markdown docs integrated directly with your repository.
- **MCP Integration** - Let AI agents (Claude, Cursor, etc.) read/write docs, manage tasks, and run CI.
- **Acceptance Checklists** - Track implementation progress automatically as agents work.
- **Secure CI** - Execute allowlisted commands with real-time audit logs and artifacts.
- **Local-First** - Your data stays on your machine, stored in a transparent `.locus` folder.

## 🚀 Quick Start

The fastest way to use Locus is via `npx`. No installation required.

### 1. Initialize a new project
Run this command in the directory where you want to create your project:
```bash
npx @locusai/cli init --name my-cool-app
```

### 2. Run the Locus Dashboard
Navigate to your project folder and start the engine:
```bash
cd my-cool-app
npx @locusai/cli dev
```

### 3. Open the Dashboard
Locus will automatically open `http://localhost:3080` in your browser.

---

## 📦 Installation (Optional)

If you prefer to have Locus always available as a global command:

```bash
npm install -g @locusai/cli
```

Then you can simply use:
```bash
locus init --name my-app
locus dev
```

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
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to develop the Locus platform.

## 🛠 Development

For detailed instructions on how to set up the development environment, run tests, and contribute code, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
# Quick check
bun run lint && bun run typecheck
```

## 📄 License

[MIT](./LICENSE)
