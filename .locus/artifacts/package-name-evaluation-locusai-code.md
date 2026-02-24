# Package Name Evaluation: `@locusai/code`
Date: 2026-02-24

## Executive summary
`@locusai/code` is a strong, product-forward name and more brandable than a technical label like `cli2`. The main trade-off is ambiguity: it can imply an SDK, editor extension, or broader coding platform rather than specifically a CLI. If your priority is migration clarity, `@locusai/locus-cli` remains safer; if your priority is long-term product umbrella branding, `@locusai/code` is a good choice.

## Detailed findings/analysis
- Pros of `@locusai/code`:
  - Short and memorable.
  - Aligns with AI-assisted coding positioning.
  - Future-proof if the package grows beyond pure terminal workflows.
- Risks of `@locusai/code`:
  - Less explicit than a CLI-specific name, which can create confusion during migration and support.
  - May overlap conceptually with editor tooling, SDKs, or hosted features using similar naming.
  - Harder to distinguish in docs where both package purpose and install instructions must be immediately clear.
- Migration impact:
  - If replacing `@locusai/cli`, explicit naming reduces operational mistakes during transition.
  - A broad name like `code` works best when paired with very clear documentation and binary naming conventions.

## Actionable recommendations
1. If migration clarity is the primary goal, prefer `@locusai/locus-cli` now.
2. If strategic branding is the primary goal, adopt `@locusai/code` and keep binary command `locus` unchanged.
3. If using `@locusai/code`, mitigate ambiguity by adding docs language like: "`@locusai/code` is the official Locus CLI package."
