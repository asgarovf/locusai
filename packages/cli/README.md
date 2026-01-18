<p align="center">
  <img src="https://raw.githubusercontent.com/asgarovf/locusai/refs/heads/master/assets/logo.png" alt="Locus" width="150" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@locusai/cli"><img src="https://img.shields.io/npm/v/@locusai/cli?color=blue" alt="npm version" /></a>
  <a href="https://github.com/asgarovf/locusai/blob/master/LICENSE"><img src="https://img.shields.io/github/license/asgarovf/locusai?color=blue" alt="License" /></a>
  <a href="https://github.com/asgarovf/locusai"><img src="https://img.shields.io/github/stars/asgarovf/locusai?style=flat&color=blue" alt="GitHub Stars" /></a>
</p>

# @locusai/cli

The unified CLI for **Locus** — a local-first AI development platform that combines task management, documentation, and CI coordination to help AI agents build your projects.

## Quick Start

```bash
# Create a new Locus-managed project
npx @locusai/cli init --name my-app

# Or initialize in an existing repo
npx @locusai/cli init

# Start the development server
npx @locusai/cli dev
```

## Commands

| Command | Description |
|---------|-------------|
| `init --name <name>` | Create a new Locus-managed monorepo project |
| `init` | Initialize Locus in an existing repository |
| `dev` | Start the Locus dashboard and MCP server |

## What It Creates

When creating a new project (`init --name`):
- **Monorepo structure**: `apps/`, `packages/`
- **Locus workspace**: `.locus/` directory with database and config
- **Starter configuration**: TypeScript, Biome, Git
- **Example task**: Getting started task in the backlog

When initializing existing repo (`init`):
- **Locus workspace**: `.locus/` directory with database and config

## Documentation

Visit [locusai.dev/docs](https://locusai.dev/docs) for full documentation.

## License

[MIT](https://github.com/asgarovf/locusai/blob/master/LICENSE)
