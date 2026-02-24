# REPL Empty Session Persistence Fix
Date: 2026-02-24

## Executive Summary
`cli2` REPL sessions were being persisted even when the user exited without sending a message. This created unnecessary empty session files in `.locus/sessions`. The fix makes session creation lazy (in-memory first) and only persists on exit when the session has messages or was explicitly persisted.

## Detailed Findings/Analysis
- Root cause: `SessionManager.create()` immediately called `save()`, creating a session file before any user input.
- Additional persistence path: REPL always called `sessionManager.save(session)` on exit, which reinforced unwanted empty-session writes.
- Implemented changes:
  - `SessionManager.create()` no longer writes to disk automatically.
  - Added `SessionManager.isPersisted()` to detect whether a session already has a backing file.
  - REPL exit path now conditionally saves only if `session.messages.length > 0` or session was previously persisted.
- Validation:
  - Added unit tests in `packages/cli2/__tests__/session-manager.test.ts` for lazy creation and first-message persistence.
  - Ran `lint`, `typecheck`, full `bun test`, and `build` in `packages/cli2`.

## Actionable Recommendations
- If needed, add a future REPL integration test that exits immediately and asserts no session file is created.
