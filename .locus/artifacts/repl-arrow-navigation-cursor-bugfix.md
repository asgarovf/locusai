# REPL Arrow Navigation Cursor Bugfix (2026-02-24)

## Executive summary
Arrow-up/down navigation in the `cli2` REPL could corrupt redraw state, making the visual cursor drift from the true insertion index and causing edits to appear in random places. The root cause was redraw anchor math that assumed the cursor was always on the bottom rendered row. The fix tracks the previously rendered cursor row and clears from the actual top of the prior render block.

## Detailed findings/analysis
- Symptom: After `ArrowUp`/`ArrowDown`, subsequent typing would visually edit unexpected positions.
- Root cause: In `InputHandler.render()`, clearing logic moved up by `renderedRows - 1` before `CSI J` clear. That only works when the cursor is on the last row of the rendered block.
- Failure mode: When cursor was on a middle row (common after vertical movement), redraw started from the wrong terminal row. This caused stale lines/partial clears and visual/internal cursor desynchronization.
- Fix: Persist `renderedCursorRow` from the previous render and move up by that amount before clearing. This anchors clearing to the true top of the old block regardless of cursor row.
- Scope: Localized to renderer state in `packages/cli2/src/repl/input-handler.ts`; no protocol or keybinding behavior changes.

## Actionable recommendations
1. Add integration tests for terminal redraw anchoring with cursor on non-bottom rows to catch regressions in ANSI render math.
2. Keep cursor/rows state explicit in renderer code paths whenever navigation semantics change.
