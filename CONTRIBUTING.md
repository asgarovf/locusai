# Contributing to Locus

Thank you for your interest in contributing to Locus! Locus is built as a monorepo to provide a cohesive experience for local-first AI development.

## 🏗 Repository Structure

- `apps/server`: The core engine (Express/SQLite).
- `apps/web`: The Next.js dashboard.
- `apps/mcp`: The Model Context Protocol server for AI integration.
- `packages/cli`: The unified entry point for users.
- `packages/shared`: Shared types and database schemas.

## 🛠 Local Development Setup

Locus requires [Bun](https://bun.sh) for development.

### 1. Initial Setup
```bash
# Install dependencies
bun install

# Initialize a dummy test workspace
bun run workspace:init
```

### 2. Running in Development Mode
To run the platform using the source code (reloads on change):
```bash
# Start server + dashboard
bun run dev --project ./test-workspace
```

### 3. Building the CLI Bundle
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

- **Local-First**: Always prefer SQLite and local storage over cloud dependencies.
- **Agent-Centric**: Every feature should be exposed via MCP so AI agents can use it.
- **Transparent**: Use human-readable formats (Markdown/JSON) where possible.
