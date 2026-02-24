# Codex Approval Mode Flag Fix
Date: 2026-02-24

## Executive summary
`packages/cli2` was still launching Codex with the deprecated `--approval-mode full-auto` flags, which now fails with `unexpected argument '--approval-mode'`. The runner was updated to the current invocation style (`codex exec --full-auto`) with stdin prompt mode retained. A focused unit test now guards against reintroducing the deprecated flag.

## Detailed findings
- Root cause: `packages/cli2/src/ai/codex.ts` hardcoded legacy arguments: `--approval-mode full-auto`.
- Current Codex CLI behavior expects `exec` subcommand usage for automated execution.
- Fix implemented:
  - Replaced args with: `exec --full-auto --skip-git-repo-check [--model <model>] -`
  - Kept prompt delivery through stdin (`-` sentinel + stdin write/end).
  - Added `buildCodexArgs()` helper for deterministic argument construction.
- Regression coverage:
  - Added `packages/cli2/__tests__/codex-runner.test.ts`.
  - Tests verify modern args and explicitly assert `--approval-mode` is absent.

## Actionable recommendations
1. Keep CLI integrations behind small argument-builder helpers and test them directly to absorb upstream CLI flag churn safely.
2. When upgrading provider CLIs, include a smoke test that executes `--help` or a no-op `exec` path in CI to detect breaking CLI argument changes early.
