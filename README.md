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
  <a href="https://locusai.dev/docs"><img src="https://img.shields.io/badge/docs-locusai.dev-blue" alt="Documentation" /></a>
</p>

**Locus is an AI-native project management platform for engineering teams.**

Plan sprints, manage tasks, and coordinate documentation in the cloud—while AI agents run securely on your machine to build, test, and document your software.

Read the [full documentation](https://locusai.dev/docs) to learn more.

> [!WARNING]
> **Active Development**: Locus is currently in an early alpha stage and is under active development. Expect breaking changes, bugs, and evolving APIs. Use with caution in production environments.

> **Locus is the platform** that manages your projects. Your actual product code lives in separate repositories.

## 🌟 Key Features

- **AI-Native Planning** - Plan sprints, define tasks, and write documentation designed for AI agents.
- **Secure Local Execution** - Agents run securely on your machine, keeping your codebase private.
- **Team Coordination** - Cloud-based dashboard for visibility, collaboration, and task management.
- **Cognitive Context** - Agents use project-specific `CLAUDE.md` and semantic indexing to understand your codebase.
- **Sprint Mindmaps** - Agents generate and follow high-level technical plans for cohesive feature implementation.

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
│   └── web/        ← Cloud Dashboard 
│   └── www/        ← Landing Page
└── packages/
    ├── cli/        ← Local Agent Runtime
    ├── sdk/        ← Core Logic
    └── shared/     ← Shared Types
```

### The Workflow

1.  **Plan**: Define tasks and sprints in the cloud dashboard.
2.  **Dispatch**: Assign tasks to agents via the CLI.
3.  **Execute**: Agents run securely on your machine, writing code and running tests.
4.  **Verify**: Review the changes before marking the task as Done.

---

## 🛠 Development

For detailed instructions on how to set up the development environment, run tests, and contribute code, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
# Quick check
bun run lint && bun run typecheck
```

## 📄 License

[MIT](./LICENSE)
