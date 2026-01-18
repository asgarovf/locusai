---
title: Initialization & Configuration
---

This guide covers how to initialize Locus in different scenarios and configure your workspace.

## New Project

To create a brand new project with Locus:

```bash
npx @locusai/cli init --name my-project
```

This creates a new directory with:
- A monorepo structure with `apps/` and `packages/`
- A Next.js web application
- Locus configuration in `.locus/`
- Pre-configured linting and TypeScript

## Existing Project

To add Locus to an existing repository:

```bash
cd your-existing-project
npx @locusai/cli init
```

This will only create the `.locus/` directory without modifying your existing code.

## The `.locus` Directory

After initialization, you'll have a `.locus` folder containing:

```
.locus/
├── db.sqlite              # Local SQLite database
├── workspace.config.json  # Workspace configuration
├── docs/                  # Documentation files
└── artifacts/             # Task artifacts
```

### workspace.config.json

The main configuration file:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "ci": {
    "allowlist": [
      "bun run lint",
      "bun run typecheck",
      "bun run test",
      "bun run build"
    ]
  }
}
```

### Customizing the CI Allowlist

The CI allowlist controls which commands AI agents can execute. Add your own commands:

```json
{
  "ci": {
    "allowlist": [
      "bun run lint",
      "bun run typecheck",
      "bun run test",
      "bun run build",
      "bun run e2e",
      "docker compose up -d"
    ]
  }
}
```

## Starting the Dashboard

Run the Locus dashboard to manage tasks and view documentation:

```bash
npx @locusai/cli dev
```

This starts:
- **Dashboard**: `http://localhost:3080`
- **API Server**: `http://localhost:3080/api`

## Environment Variables

Locus respects the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCUS_PORT` | `3080` | Dashboard port |
| `LOCUS_HOST` | `localhost` | Dashboard host |
| `LOCUS_DB_PATH` | `.locus/db.sqlite` | Database location |

## Git Integration

Locus is designed to work with Git. We recommend:

1. **Commit `.locus`** to version control (except `db.sqlite`)
2. **Add to `.gitignore`**:
   ```
   .locus/db.sqlite
   .locus/db.sqlite-journal
   ```

This ensures your documentation and configuration are shared, while each developer has their own local database.
