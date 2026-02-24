# REPL Cursor Row Shrink Delete Fix
Date: 2026-02-24

## Executive summary
A cursor rendering defect remained after multiline delete fixes: visual caret placement could stay on a lower row while edits were applied to an upper line. The root issue was post-render cursor repositioning that depended on end-of-display row arithmetic, which can drift under multiline shrink/edit transitions. The fix anchors redraw at block-top using terminal cursor save/restore and then positions to the logical insertion point.

## Detailed findings/analysis
- The editor uses a single buffer and computes logical cursor coordinates (`cursorRow`, `cursorCol`) from the buffer plus prompt widths.
- After drawing, cursor repositioning used `\r` + `CSI ${rows-1}A` + `CSI ${cursorRow}B`.
- In upper-line deletion flows where total block shape shrinks, relying on `rows`-relative movement from display end is brittle and can leave the rendered cursor on a stale lower line.
- Replacing this with explicit block-top anchoring (`DECSC` / `DECRC`) makes cursor placement independent of display-end assumptions:
  - Save cursor at top-of-block before writing display.
  - Write display.
  - Restore saved top-of-block position.
  - Move down/right to computed insertion-point row/col.
- This keeps visual cursor location aligned with internal cursor index even when deleting lines above.

## Actionable recommendations
1. Keep render anchoring top-relative (save/restore) for multiline editor redraws.
2. Preserve insertion-point math for cursor position, but avoid end-of-display-dependent relocation.
3. Add a future integration test harness with PTY input replay for multiline cursor regressions (`ArrowUp` + delete across lines).
