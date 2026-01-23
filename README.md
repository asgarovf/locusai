<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/master/assets/logo.png" alt="Locus" width="200" />
</p>

<p align="center">
  <a href="https://github.com/asgarovf/locusai/stargazers"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?style=flat&color=blue" alt="License" /></a>
  <a href="https://github.com/asgarovf/locusai"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@locusai/cli"><img src="https://img.shields.io/npm/v/@locusai/cli?label=%40locusai%2Fcli&color=blue" alt="@locusai/cli" /></a>
  <a href="https://www.npmjs.com/package/@locusai/shared"><img src="https://img.shields.io/npm/v/@locusai/shared?label=%40locusai%2Fshared&color=blue" alt="@locusai/shared" /></a>
</p>

**Locus is a local-first platform for autonomous software engineering.**

It combines a cloud-based coordination layer with strictly local execution to enable AI agents to build, test, and document your software without your code leaving your machine.

> [!WARNING]
> **Active Development**: Locus is currently in an early alpha stage and is under active development. Expect breaking changes, bugs, and evolving APIs. Use with caution in production environments.

> **Locus is the platform** that manages your projects. Your actual product code lives in separate repositories.

## 🌟 Key Features

- **Hybrid Architecture** - Cloud coordination for teams, local execution for privacy and security.
- **Autonomous Agents** - Run agents locally that plan, code, and verify their own work.
- **Cognitive Context** - Agents use project-specific `CLAUDE.md` and semantic indexing to understand your codebase.
- **Sprint Mindmaps** - Agents generate and follow high-level technical plans for cohesive feature implementation.
- **Artifact Sync** - Documenation and plans generated locally are automatically synced to the cloud dashboard.

## 🚀 Quick Start

The fastest way to use Locus is via `npx`. No installation required.

### 1. Initialize a new project
Run this command in the directory where you want to create your project:
```bash
npx @locusai/cli init
```

### 2. Index Your Codebase
Create a semantic map for the agent:
```bash
npx @locusai/cli index
```

### 3. Run the Agent
Connect to the Locus Cloud and start working:
```bash
npx @locusai/cli run --api-key <YOUR_KEY> --workspace <WORKSPACE_ID>
```

---

## 🛠 How It Works

### Architecture

```
locus-dev/           ← The platform (Open Source)
├── apps/
│   ├── api/        ← Cloud API & Engine
│   └── www/        ← Cloud Dashboard & Landing Page
└── packages/
    ├── cli/        ← Local Agent Runtime
    ├── sdk/        ← Core Logic
    └── shared/     ← Shared Types
```

### The "Local-First" Workflow

1.  **Dispatch**: You request work via the CLI.
2.  **Assignment**: The Cloud assigns the next high-priority task.
3.  **Planning**: The Local Agent reads the task and your code, then creates a plan.
4.  **Execution**: The Agent modifies files and runs tests locally on your machine.
5.  **Verification**: You review the changes before marking the task as Done.

---

## 🛠 Development

For detailed instructions on how to set up the development environment, run tests, and contribute code, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
# Quick check
bun run lint && bun run typecheck
```

## 📄 License

[MIT](./LICENSE)
