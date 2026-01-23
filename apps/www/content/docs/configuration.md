---
title: Configuration Guide
---

Locus is designed to work with minimal configuration, but it offers powerful customization options for advanced users.

## Workspace Configuration

The core configuration file lives at `.locus/workspace.config.json`.

```json
{
  "name": "my-project",
  "version": "1.0.0"
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | The name of your project (used in the dashboard). |
| `version` | string | The current version of your project. |


## The Indexer

The Locus Indexer creates a semantic map of your codebase. It automatically ignores common non-source directories to keep the index efficient.

### Default Ignore Patterns

The following patterns are **always** ignored:
- `**/node_modules/**`
- `**/dist/**`, `**/build/**`, `**/out/**`
- `**/.next/**`
- `**/.git/**`
- `bun.lock`, `package-lock.json`, `yarn.lock`
- `**/.locus/**` (except artifacts)

### Customizing Ignores

To ignore additional files, you can rely on the standard `.gitignore` file. Locus respects your gitignore patterns when scanning for files.

## Artifact Storage

Agents save useful outputs to `.locus/artifacts/`.

- These are markdown files.
- They are synced to the Locus Cloud for team visibility.
- You should generally **ignore** this directory in git (`.gitignore`) if you don't want to commit transient agent outputs, OR commit them if you treat them as permanent documentation.

