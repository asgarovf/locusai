# Sprint Milestone Lookup Debugging (2026-02-24)

## Executive summary
Sprint commands could not find existing milestones even when `github.owner` and `github.repo` were correct. Root cause was shell parsing of `&` characters in the `gh api` milestone query string. Milestone listing now uses argv-based execution, and a regression test verifies query parameters are passed as a single endpoint argument.

## Detailed findings/analysis
- `listMilestones()` in `packages/cli/src/core/github.ts` previously executed:
  - `gh api repos/<owner>/<repo>/milestones?state=open&sort=...&page=...`
- Because this call went through shell-string execution, `&` was interpreted by the shell as command separators/background operators.
- Result: the `gh api` command did not reliably execute with the full query, causing empty or incorrect milestone results.
- This directly affected `locus sprint list/show/active/close`, plus any planning path that checks milestones.

## Actionable recommendations
1. Keep milestone API calls on argv-based execution (`execFileSync`) when query strings contain `&`.
2. Add/retain regression tests for command execution paths that include query parameters.
3. Prefer argv-based wrappers for all `gh api` calls over shell-string interpolation to avoid shell metacharacter bugs.
