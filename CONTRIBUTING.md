# Contributing to Locus

Thank you for your interest in contributing to Locus! Locus is a GitHub-native AI sprint execution CLI that turns GitHub issues into shipped code.

## Repository Structure

- `packages/cli`: The unified CLI entry point (`@locusai/cli`)
- `packages/shared`: Shared types and utilities
- `packages/vscode`: The VS Code extension
- `apps/www`: The marketing and documentation website

## Local Development Setup

Locus requires [Bun](https://bun.sh) for development.

### 1. Initial Setup
```bash
# Install dependencies
bun install
```

### 2. Prerequisites
- **GitHub CLI** (`gh`): Required for all GitHub operations. Install from [cli.github.com](https://cli.github.com)
- **AI Agent CLI**: Either [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [OpenAI Codex](https://openai.com/index/codex/)
- Authenticate with GitHub: `gh auth login`

### 3. Running CLI Commands
```bash
# Run the CLI from source
bun run simulate <command>

# Example: initialize Locus in a test project
bun run simulate init --dir /path/to/test-project
```

### 4. Building the CLI Bundle
If you modify the CLI or shared packages, rebuild:
```bash
bun run build:cli
```

### 5. Running the Website Locally
```bash
cd apps/www && bun run dev
```

## Quality Standards

We use [Biome](https://biomejs.dev/) for linting and formatting.

```bash
# Check for lint errors
bun run lint

# Automatically fix and format
bun run format

# Run type checks
bun run typecheck
```

## Submitting Changes

1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Push to the branch (`git push origin feat/amazing-feature`).
5. Open a Pull Request.

## Versioning and Releasing

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

## Design Principles

- **GitHub-Native**: All state lives in GitHub (issues, milestones, PRs). No external databases or APIs.
- **Zero Infrastructure**: No servers, no accounts, no cloud dashboard. Everything runs locally via the CLI.
- **Agent-Centric**: Every feature should be accessible via CLI commands that AI agents can execute.
- **Transparent**: Use human-readable formats (Markdown/JSON) where possible.
