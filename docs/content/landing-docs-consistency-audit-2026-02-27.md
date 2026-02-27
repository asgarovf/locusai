---
description: Release-readiness audit for landing and docs consistency, evidence mapping, and validation checks.
---

# Landing/Docs Consistency Audit (2026-02-27)

Issue: **#88**  
Audit date: **February 27, 2026**  
Audited CLI version: **0.17.14**

## Scope

Final pass on updated landing/docs messaging around the four canonical pillars:

1. Unified interface across Claude and Codex
2. GitHub-native operational memory
3. Built-in orchestration tools
4. Auto-approval automation

## Pillar Consistency Results

| Pillar | Landing Evidence | Docs Evidence | Status |
|---|---|---|---|
| Unified interface | `Hero.tsx` headline + `FeatureGrid.tsx` card 1 + `ProductShowcase.tsx` step 1 | `concepts/unified-interface.md`, `getting-started/quickstart.md` step 2, `introduction.md` strengths list | Pass |
| GitHub-native operational memory | `FeatureGrid.tsx` card 2 + `ProductShowcase.tsx` step 3 | `concepts/github-backend.md`, `concepts/github-native-workflows.md`, `introduction.md` strengths list | Pass |
| Built-in orchestration tools | `FeatureGrid.tsx` card 3 + `ProductShowcase.tsx` step 2 | `cli/overview.md`, `getting-started/quickstart.md` step 4, `concepts/how-it-works.md` related flow | Pass |
| Auto-approval automation | `FeatureGrid.tsx` card 4 + `ProductShowcase.tsx` step 4 + `Hero.tsx` quick link | `concepts/auto-approval-mode.md`, `concepts/execution-model.md`, `getting-started/quickstart.md` step 5 | Pass |

## Major Landing Claim -> Docs Mapping

| Landing Claim | Primary Docs Anchor(s) |
|---|---|
| "One interface across Claude and Codex." | `docs/concepts/unified-interface.md` |
| "GitHub is the system of record." | `docs/concepts/github-backend.md`, `docs/concepts/github-native-workflows.md` |
| "Plan, execute, review, and iterate." | `docs/cli/overview.md`, `docs/getting-started/quickstart.md` |
| "Full-auto execution with resumable runs." | `docs/concepts/auto-approval-mode.md`, `docs/concepts/execution-model.md` |

## Findings and Fixes

1. **Fixed contradictory PR wording in docs**
   - File: `docs/concepts/sprints-and-issues.md`
   - Before: "Creates a PR for each completed task"
   - After: PR behavior now matches technical docs: sprint-level PR in sprint mode, issue-level PRs in standalone runs when `agent.autoPR` is enabled.
   - Why: Aligns with `docs/concepts/execution-model.md` and avoids cross-doc contradiction.

No additional contradictory wording was found for the four pillars.

## Validation Checks

1. Docs internal link validation
   - Command: custom Node checker across all `docs/**/*.md`
   - Result: `OK: checked 29 markdown files, no broken relative links.`
2. Landing -> docs navigation validation
   - Command: custom Node checker for `https://docs.locusai.dev/...` links in landing components
   - Result: `OK: 11 landing docs links map to local docs pages.`
3. Landing quality checks
   - Command: `bun run --cwd apps/www lint`
   - Result: `Checked 36 files in 7ms. No fixes applied.`
   - Command: `bun run --cwd apps/www typecheck`
   - Result: success (`tsc -b --noEmit`)

## Release Sign-Off

- [x] Consistency audit completed and findings documented
- [x] Contradictory wording removed for audited pillar messaging
- [x] Link/navigation checks passed for touched landing/docs paths
- [x] Reusable checklist added for future content iterations
- [x] Final content aligns with directive priorities in `docs/content/positioning-brief.md`

Sign-off: **Ready for release**
