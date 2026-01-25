# Contributing to Locus

Thank you for your interest in contributing to Locus! Locus is built as a monorepo to provide an AI-native project management experience for engineering teams.

## 🏗 Repository Structure

- `apps/api`: The core engine (NestJS/TypeORM).
- `apps/web`: The Next.js dashboard.
- `apps/www`: The marketing and documentation website.
- `apps/mcp`: The Model Context Protocol server for AI integration.
- `packages/cli`: The unified entry point for users.
- `packages/sdk`: The TypeScript SDK for programmatic API access.
- `packages/shared`: Shared types and database schemas.

## 🛠 Local Development Setup

Locus requires [Bun](https://bun.sh) for development.

### 1. Initial Setup
```bash
# Install dependencies
bun install
```

### 2. Workspace Setup
1. Create a workspace on [app.locusai.dev](https://app.locusai.dev).
2. Generate an API key from your workspace settings.
3. Have a demo project directory ready on your local machine.

### 3. Running CLI Commands
Use the `--dir` argument to point the CLI to your local project:
```bash
bun run cli <command> --dir /path/to/your/demo-project
```

### 4. Testing with Local Backend
To test the CLI against your local API server, use the `--api-base` argument:
```bash
# Start the local backend
bun run dev

# Run CLI commands against local backend
bun run cli <command> --dir /path/to/your/demo-project --api-base http://localhost:8000
```

### 5. Building the CLI Bundle
If you modify the CLI or the bundled logic, you need to rebuild the static assets:
```bash
bun run build:cli
```
This generates single-file snapshots in `packages/cli/bin/`.

## 🧪 Quality Standards

We use [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Check for lint errors
bun run lint

# Automatically fix and format
bun run format

# Run type checks
bun run typecheck
```

## 🚀 Submitting Changes

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feat/amazing-feature`).
5. Open a Pull Request.
6. Once merged to `master`, the automated release workflow will handle the NPM publication.

## 📦 Versioning and Releasing

We use **Changesets** for version management.

### 1. Document your changes
When you create a PR that should trigger a version bump, run:
```bash
bun changeset
```
This will prompt you to choose which packages to bump (usually `@locusai/cli`) and the type of change (patch/minor/major). It creates a small file in `.changeset/`.

### 2. Automated Releases
We use a GitHub Action that automatically:
- Creates a "Version Packages" PR when changesets are detected on `master`.
- Publishes to NPM when that "Version Packages" PR is merged back into `master`.

To publish manually, you would need `NPM_TOKEN` and run:
```bash
bun run release
```

---

## 🎨 Design Principles

- **Cloud Planning, Local Execution**: Planning happens in the cloud; agents run securely on user machines.
- **Agent-Centric**: Every feature should be exposed via MCP so AI agents can use it.
- **Transparent**: Use human-readable formats (Markdown/JSON) where possible.
