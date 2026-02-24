# REPL Input Behavior Research (Codex Reference)
Date: 2026-02-24

## Executive Summary
The current `cli2` input issues came from modeling multiline input as multiple submitted readline lines instead of a single editable text buffer. Codex's TUI architecture uses a persistent text area state with explicit cursor movement and key handling, which avoids the history-vs-cursor conflicts seen here. The implemented fix in `cli2` adopts that same model at a smaller scope: one buffer, one cursor, line-aware navigation, and protocol-aware paste/newline handling.

## Detailed Findings
- Codex's composer path separates input orchestration from text-area editing state, rather than relying on line-by-line submission semantics.
  - Source: https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/bottom_pane/chat_composer.rs
- Codex maintains dedicated text state for cursor position and message content (including burst paste behavior), showing that multiline reliability depends on explicit editor state rather than prompt continuation hacks.
  - Source: https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/bottom_pane/chat_composer.rs
- Codex has a dedicated text-area implementation for keyboard editing operations, reinforcing that multiline behavior should be implemented as editor primitives (insert/delete/move) and not by history substitution.
  - Source: https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/bottom_pane/textarea.rs
- Codex issue discussion around paste/newline behavior confirms practical edge cases in terminal key/paste events and the need to avoid heuristic-only handling.
  - Source: https://github.com/openai/codex/issues/3101

## Actionable Recommendations
1. Keep multiline editing in `cli2` as a single-buffer editor model (not readline continuation lists).
2. Prefer deterministic protocol handling first (bracketed paste + modified Enter sequences), then use heuristics only as fallback.
3. Preserve history navigation for single-line drafts only; in multiline drafts, Up/Down should remain cursor movement.
4. Add targeted integration tests for multiline cursor navigation and cross-line deletion in a pseudo-TTY harness when feasible.
