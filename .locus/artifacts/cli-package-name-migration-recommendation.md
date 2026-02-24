# CLI Package Name Recommendation for Migration
Date: 2026-02-24

## Executive summary
The best separate name for the new CLI package is `@locusai/locus-cli`. It is explicit, avoids the temporary-sounding `cli2` label, and keeps a clean migration path while both old and new CLIs coexist. Keep the executable binary as `locus` to avoid user-facing command churn.

## Detailed findings/analysis
- Current state:
  - Legacy CLI package is `@locusai/cli` and ships `bin.locus`.
  - New CLI package is `@locusai/cli2` and also ships `bin.locus`.
  - Most docs and extension references still point to `@locusai/cli`.
  - New CLI upgrade flow currently targets `@locusai/cli2`.
- Problem with `@locusai/cli2`:
  - Numeric suffixes are migration scaffolding, not durable product naming.
  - It creates permanent ambiguity in support/docs (“use cli or cli2?”).
  - It becomes awkward for future rewrites (`cli3`, etc.).
- Naming criteria used:
  - Must clearly indicate package purpose.
  - Must remain valid long-term after migration completes.
  - Must support a phased rollout without forcing immediate command changes.

## Actionable recommendations
1. Recommended new package name: `@locusai/locus-cli`.
2. Keep binary name unchanged as `locus` in both migration phases.
3. Migration rollout:
   - Phase 1: Publish new CLI as `@locusai/locus-cli` and update its internal upgrade target to this package.
   - Phase 2: Keep `@locusai/cli` as legacy for a transition period; add clear deprecation notice pointing to `@locusai/locus-cli`.
   - Phase 3: When ready, make `@locusai/cli` a thin compatibility wrapper or deprecate it with explicit migration guidance.
4. Secondary options if you want different positioning:
   - `@locusai/locus` (shortest, very product-centric).
   - `@locusai/cli-next` (only if you want an explicitly temporary pre-GA channel).

