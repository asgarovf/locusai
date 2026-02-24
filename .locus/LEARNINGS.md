# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
- **[Patterns]**: `packages/cli/src/commands/run.ts` must register `registerShutdownHandlers()` for the full run lifecycle; signal-based interrupts (`Ctrl+C`/`SIGINT`) should persist `in_progress` tasks as `failed` with `Interrupted by user` so run-state matches explicit user stop intent and remains resumable.
