---
title: Initialization & Configuration
---

This guide covers how to initialize Locus in your project and configure it for your needs.

## Initialization

To add Locus to an existing repository:

```bash
locus init
```

This will create a `.locus` directory in your project root. This process is non-destructive and only adds Locus-specific configuration files.

## The `.locus` Directory

After initialization, you'll see the following structure:

```
.locus/
├── config.json            # Project configuration
├── codebase-index.json    # Codebase semantic index (generated)
├── artifacts/             # Local-only artifacts (not synced to cloud)
├── documents/             # Documents synced from cloud
└── sessions/              # Session data for interactive mode

.agent/
└── skills/                # Agent-specific skill definitions
```

## Agent Skills

`locus init` automatically creates a `.agent/skills` directory containing default skills to help agents work more efficiently in your codebase. These skills include:

- **locus-expert**: Specialized knowledge about Locus commands and configuration.
- **project-navigator**: Best practices for exploring and understanding the repository.

You can add your own custom skills by creating new directories within `.agent/skills/` containing a `SKILL.md` file.

The `config.json` file contains basic project metadata:

```json
{
  "version": "0.1.7",
  "createdAt": "2024-01-20T10:00:00.000Z",
  "projectPath": "."
}
```

## Context File (CLAUDE.md)

`locus init` also creates (or checks for) a `CLAUDE.md` file in your root. This file serves as the high-level "brain" or context for the AI agent.

Use this file to document:
- Project architecture overview.
- Coding standards and patterns.
- Important commands (build, test, lint).
- Known issues or "gotchas".

The agent reads this file before starting every task to ensure it adheres to your project's specific guidelines.

## Git Integration

The `locus init` command automatically adds the following to your `.gitignore`:

```
# Locus AI - Session data (user-specific, can grow large)
.locus/sessions/

# Locus AI - Artifacts (local-only, user-specific)
.locus/artifacts/
```

These directories are gitignored by default because:
- **Artifacts** are local-only and not synced to the cloud. Each developer can generate their own artifacts without conflicting with others.
- **Sessions** contain user-specific interactive session data.

You should **commit** `.locus/config.json` and `CLAUDE.md` to ensure all team members (and their agents) share the same configuration and context.

The `.locus/documents/` directory contains documents synced from the cloud dashboard. You can choose to commit these if you want version control, or gitignore them if you prefer the cloud as the source of truth.


