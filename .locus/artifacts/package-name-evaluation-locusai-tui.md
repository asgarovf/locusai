# Package Name Evaluation: `@locusai/tui`
Date: 2026-02-24

## Executive summary
`@locusai/tui` is a solid, modern name if your primary positioning is an interactive terminal experience. It keeps migration manageable while allowing the binary to stay `locus`. The main trade-off is future scope: if the package grows beyond TUI-first UX, the name can feel too narrow.

## Detailed findings/analysis
- Strengths:
  - Clear that this is terminal-focused, which helps users understand behavior quickly.
  - Distinct from legacy `@locusai/cli` while still preserving the same binary (`locus`).
  - Feels current and product-like, which supports the “new generation CLI” narrative.
- Risks:
  - `tui` implies interface style, not full product scope; it can age poorly if workflows become more automation/API-heavy.
  - Slightly less explicit than `locus-cli` for operators reading install scripts and migration docs.
  - Could create naming pressure later if you introduce a non-interactive package and need clearer separation.
- Migration impact:
  - Migration remains operationally simple if binary stays `locus`.
  - Documentation must explicitly state package rename mapping (`@locusai/cli` -> `@locusai/tui`) to avoid support churn.

## Actionable recommendations
1. `@locusai/tui` is a good choice if product identity is “interactive terminal experience first.”
2. Keep binary name unchanged as `locus` to minimize user-facing migration risk.
3. Add explicit migration docs and deprecation messaging in `@locusai/cli` to reduce confusion.
4. If you expect broader non-TUI scope soon, prefer `@locusai/locus-cli` for long-term naming durability.
