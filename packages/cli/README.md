# create-locus-project

CLI tool to scaffold new Locus-managed projects.

## Usage

```bash
# Using bun create
bun create locus-project --name my-app

# Or with npx (when published)
npx create-locus-project --name my-app
```

## What it creates

- **Monorepo structure**: `apps/`, `packages/`, `docs/`
- **Locus workspace**: `.locus/` directory with database and config
- **Starter configuration**: TypeScript, Biome, Git
- **Example task**: Getting started task in the backlog
- **Documentation**: Basic getting started guide

## Options

- `--name <project-name>` (required) - Name of your project
- `--path <directory>` (optional) - Parent directory (defaults to current directory)

## After creation

```bash
cd my-app
bun install
bun run dev
```

## Managing with Locus

Point Locus to your project:

```bash
# Update your MCP config or start Locus with:
locus start --project /path/to/my-app/.locus
```

Then use the Locus UI, MCP server, or CLI to manage tasks, docs, and CI.
