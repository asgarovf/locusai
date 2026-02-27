---
description: Reusable checklist for landing/docs messaging updates and release-readiness validation.
---

# Release Content Checklist

Use this checklist for every landing/docs messaging update before release.

## 1) Canonical Messaging Alignment

- [ ] Copy aligns with `docs/content/positioning-brief.md` canonical value proposition.
- [ ] Four pillars are represented consistently:
  - Unified interface across Claude/Codex
  - GitHub-native operational memory
  - Built-in orchestration tools
  - Auto-approval automation
- [ ] Terminology guardrails are followed (`interface`, `system of record`, `full-auto`, `orchestration`).
- [ ] Avoided phrases are not introduced ("AI wrapper", "one-click magic", "works with any model", etc.).

## 2) Claim Accuracy and Evidence

- [ ] Each major landing claim maps to at least one concrete docs section.
- [ ] Behavior-level claims match current implementation (commands/flags/defaults).
- [ ] Versioned or dated assertions include explicit date and version.
- [ ] No conflicting behavior statements remain across docs pages.

## 3) Navigation and Links

- [ ] All touched docs pages are reachable from `docs/SUMMARY.md` where appropriate.
- [ ] Internal markdown links resolve (`../...` and `./...` links).
- [ ] Landing links to `https://docs.locusai.dev/...` map to existing local docs pages.
- [ ] CTA and quick-link destinations match the intended funnel (Install -> How it Works -> Deep Dives).

## 4) Quality Checks

- [ ] Run landing lint (`bun run --cwd apps/www lint`).
- [ ] Run landing typecheck (`bun run --cwd apps/www typecheck`).
- [ ] Run docs link validation (internal links + landing docs-link mapping).
- [ ] Capture command results in the release audit note.

## 5) Release Notes and Sign-Off

- [ ] Add/update a dated audit report in `docs/content/`.
- [ ] Document findings, fixes, and residual risks (if any).
- [ ] Confirm alignment with directive priorities.
- [ ] Mark final sign-off status (`Ready` / `Blocked`) with date.
