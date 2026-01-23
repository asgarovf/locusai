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
└── artifacts/             # Task artifacts and logs
```

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

We recommend adding the following to your `.gitignore`:

```
.locus/artifacts
.locus/codebase-index.json
```

You should **commit** `.locus/config.json` and `CLAUDE.md` to ensure all team members (and their agents) share the same configuration and context.
