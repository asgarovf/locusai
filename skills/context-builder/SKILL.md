---
name: context-builder
description: Gather comprehensive project context before starting implementation. Use at the beginning of complex tasks to understand codebase structure, dependencies, patterns, and conventions before writing code.
allowed-tools: [Read, Grep, Glob, Bash]
tags: [context, codebase, analysis, exploration, architecture, onboarding, understanding]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Context Builder

## When to use this skill
- Starting work on an unfamiliar codebase or module
- Before implementing a feature that spans multiple files
- When you need to understand existing patterns before writing code
- Before refactoring to avoid breaking implicit contracts
- When onboarding to a new project area

## Step 1: Project Structure

Understand the high-level layout:

```bash
# Top-level structure
ls -la

# Directory tree (2 levels, excluding noise)
find . -maxdepth 2 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' | head -60

# Package manager and scripts
cat package.json | head -40
```

Key things to note:
- Monorepo vs single package
- Build system (webpack, vite, esbuild, tsc)
- Test framework (jest, vitest, mocha)
- Available scripts (lint, format, test, build)

## Step 2: Dependencies

```bash
# Key dependencies
cat package.json | grep -A 30 '"dependencies"'

# Dev dependencies (reveals tooling choices)
cat package.json | grep -A 30 '"devDependencies"'
```

Identify:
- Framework (React, Vue, Express, Fastify, etc.)
- ORM/database (Prisma, TypeORM, Drizzle, etc.)
- Validation (Zod, Joi, Yup, etc.)
- State management (Redux, Zustand, etc.)
- Testing tools (Jest, Vitest, Playwright, etc.)

## Step 3: Configuration

Read configuration files to understand project conventions:

- `tsconfig.json` — TypeScript settings, path aliases
- `.eslintrc` / `eslint.config.js` — Linting rules
- `.prettierrc` — Formatting rules
- `.env.example` — Required environment variables
- `CLAUDE.md` / `LOCUS.md` — AI agent instructions

## Step 4: Patterns

Before writing new code, find existing patterns:

```bash
# How are API routes structured?
grep -r "router\.\|app\.\(get\|post\|put\|delete\)" --include="*.ts" -l

# How are components organized?
find src/components -name "*.tsx" -maxdepth 2

# How are tests structured?
find . -name "*.test.*" -o -name "*.spec.*" | head -20

# How are types/interfaces defined?
grep -r "^export interface\|^export type" --include="*.ts" -l | head -10
```

## Step 5: Related Code

Find code related to your task:

```bash
# Search by keyword
grep -r "authentication\|login\|session" --include="*.ts" -l

# Find similar implementations
grep -r "export function create" --include="*.ts" | head -10

# Check imports to understand module boundaries
grep -r "from.*@/\|from.*\.\./\.\." --include="*.ts" <file>
```

## Context Checklist

Before starting implementation, confirm you know:

- [ ] Project structure and key directories
- [ ] Framework and major libraries in use
- [ ] Existing patterns for the type of code you're writing
- [ ] Naming conventions (files, functions, variables)
- [ ] Error handling patterns
- [ ] Testing patterns and test locations
- [ ] Import/export conventions
- [ ] Configuration and environment setup

## Anti-patterns

- **Don't skip context gathering** — writing code that doesn't match existing patterns creates inconsistency
- **Don't read every file** — focus on files related to your task and one example of each pattern
- **Don't assume** — verify conventions by reading actual code, not guessing from file names
