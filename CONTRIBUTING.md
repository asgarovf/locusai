# Contributing to Locus

Thank you for your interest in contributing to Locus! Locus is a GitHub-native AI sprint execution CLI that turns GitHub issues into shipped code.

## Repository Structure

- `packages/cli`: The unified CLI entry point (`@locusai/cli`)
- `packages/sdk`: SDK for building community packages (`@locusai/sdk`)
- `packages/telegram`: Telegram integration package (`@locusai/locus-telegram`)
- `packages/linear`: Linear integration package (`@locusai/locus-linear`)
- `packages/jira`: Jira integration package (`@locusai/locus-jira`)
- `packages/cron`: Cron scheduler package (`@locusai/locus-cron`)
- `packages/mcp`: MCP server management (`@locusai/locus-mcp`)
- `packages/gateway`: Channel-agnostic message gateway (`@locusai/locus-gateway`)
- `packages/pm2`: PM2 process management (`@locusai/locus-pm2`)
- `packages/shared`: Shared types and utilities
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

### 4. Building Packages
```bash
# Build all packages (SDK, Telegram, CLI)
bun run build:packages

# Build individual packages
bun run build:sdk
bun run build:telegram
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

## Contributing a Community Package

Community packages extend Locus with new integrations (Slack, Jira, Discord, etc.). All packages live inside this monorepo under `packages/` and are published to npm through our automated release pipeline.

### Quick overview

1. Create your package in `packages/<name>/`
2. Follow the naming convention: `@locusai/locus-<name>`
3. Use the `@locusai/sdk` for config, logging, and CLI invocation
4. Test locally with `locus pkg <name>`
5. Submit a pull request

### Detailed guide

See the **[Package Author Guide](./packages/sdk/PACKAGE_GUIDE.md)** for the complete walkthrough, including:
- Package structure and required fields
- `package.json` template with all required fields
- SDK usage (config, invocation, logging)
- Step-by-step instructions for creating a new package
- Pre-submission checklist

### Reference implementation

The Telegram package (`packages/telegram/`) is the canonical example. Study it for naming, structure, build scripts, and README format.

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
