# Ctrl+C Run-State Interrupt Debugging
Date: 2026-02-24

## Executive summary
`locus run` handled `ESC` interrupts through the AI execution path, which correctly persisted a user-interrupted task result. `Ctrl+C` could instead terminate via process `SIGINT`, bypassing task-level interruption state updates and leaving inconsistent run-state outcomes. The fix wires shutdown handlers into `run` and persists in-progress tasks as user-interrupted failures before exit.

## Detailed findings
- `runAI()` already supports dual interrupt handling (`ESC`/`Ctrl+C`) when stdin keystrokes are captured during active AI execution.
- `run` command execution did not register `SIGINT/SIGTERM` shutdown handling, so signal-driven exits could skip the normal `executeIssue()` interrupted return path.
- Existing shutdown mutation logic converted `in_progress` tasks back to `pending`, which hid the fact that a user explicitly interrupted execution.
- Result: `ESC` and signal-based `Ctrl+C` could produce different persisted task states.

## Actionable recommendations
- Keep `registerShutdownHandlers()` active for the full `runCommand()` lifecycle.
- Persist `in_progress` tasks interrupted by signal as `failed` with `error: "Interrupted by user"` and `failedAt` timestamp, so interruption intent is explicit.
- Retain resume behavior by relying on existing `getNextTask()` semantics (failed tasks are retried first).
