# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
- **[User Preferences]**: Do not record low-level implementation details or one-time fixes in learnings. Focus on architectural decisions, package ownership, and explicit user preference overrides — entries that help any future agent on any task, not just the current one.
- **[Architecture]**: Sandboxed execution is based on provider-specific Docker sandboxes (`locus sandbox`, then `locus sandbox claude|codex` for auth), while model switching still happens through `ai.model`. Avoid docs that imply Docker install alone completes sandbox setup.
- **[Packages]**: CLI tests currently live in `packages/cli/__tests__`; verify script globs in `packages/cli/package.json` against this layout before relying on `test:unit`/`test:integration` commands.
