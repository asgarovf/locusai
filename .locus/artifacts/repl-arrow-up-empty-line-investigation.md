# REPL ArrowUp Empty-Line Cursor Investigation
Date: February 24, 2026

## Executive summary
The `ArrowUp` behavior was failing because render-time cursor mapping in `buildRenderState()` kept reassigning cursor coordinates after the target line was already found. In multiline buffers, this always drifted the visible cursor to the last logical line, making navigation over empty lines look broken. The fix adds a guard so cursor coordinates are computed exactly once per render pass and remain on the intended line.

## Detailed findings/analysis
- `buildRenderState()` tracks cursor location using a `remaining` counter (cursor index relative to logical lines).
- After a matching line was found, the function set `remaining = -1` as a sentinel.
- The loop condition used `if (remaining <= line.length)`, so `remaining = -1` still matched every later line.
- Result: `cursorRow`/`cursorCol` were overwritten repeatedly and ended up pointing to the last line.
- This issue is most visible when moving through empty lines with `ArrowUp`/`ArrowDown` because logical movement is correct but render position is wrong.
- Fix:
  - Match only while `remaining >= 0`.
  - Subtract line lengths only while `remaining >= 0`.
- Added regression coverage in `input-handler-v2.test.ts` for a screenshot-like multiline buffer with consecutive empty lines to ensure previous-empty-line placement remains stable.

## Actionable recommendations
1. Keep render-state functions pure and export narrow test helpers for cursor math regressions.
2. Add one more regression around wrapped-line boundary (`line width == terminal cols`) to guard known terminal edge cases.
