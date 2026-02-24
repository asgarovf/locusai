# REPL Default Model Config Persistence Fix
Date: 2026-02-24

## Executive summary
Changing the model via REPL (`/model <name>`) only updated in-memory/session metadata and did not persist to `.locus/config.json`. This caused REPL to reopen with the previous default model instead of the user-selected model. The fix now persists model changes to config immediately and keeps provider synced via model inference.

## Detailed findings/analysis
- Root cause was in `packages/cli2/src/repl/repl.ts` slash command callback wiring.
- `onModelChange` updated `currentModel`, `currentProvider`, and session metadata, then saved session only.
- No config write occurred, so `loadConfig()` on next startup read stale `ai.model`.
- Implemented a dedicated helper (`packages/cli2/src/repl/model-config.ts`) that writes `ai.model` using `updateConfigValue()` and syncs in-memory config.
- `updateConfigValue("ai.model", model)` already infers and stores the matching provider, aligning with model-first architecture.
- Added regression test (`packages/cli2/__tests__/repl-model-config.test.ts`) to verify model switch persists across reload.

## Actionable recommendations
1. Keep `/model` as the persistence trigger for default model behavior in REPL.
2. Treat `/provider` as runtime-only unless product requirements explicitly define a model remapping strategy for provider-only switches.
3. Preserve test coverage around REPL config persistence to prevent future regressions when REPL callback wiring changes.
