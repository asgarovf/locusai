# Lint

This document describes the linting setup for the project.

## Tools

- **Biome** (v2.3.11) - Linter, formatter, and import organizer
- **Turbo** - Monorepo task runner that orchestrates lint across workspaces

## Commands

- `bun run lint` - Run lint across all workspace packages via Turbo
- `bun run format` - Run Biome check with auto-fix enabled

## Configuration

The Biome configuration is defined in `biome.json` at the repo root. It enforces recommended rules with customizations for complexity, correctness, style, and suspicious code patterns. Test files have relaxed rules for `noExplicitAny` and `noNonNullAssertion`.
