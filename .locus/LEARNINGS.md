# Learnings

This file captures important lessons, decisions, and corrections made during development.
It is read by AI agents before every task to avoid repeating mistakes and to follow established patterns.

<!-- Add learnings below this line. Format: - **[Category]**: Description -->
- **[User Preferences]**: Do not record low-level implementation details or one-time fixes in learnings. Focus on architectural decisions, package ownership, and explicit user preference overrides — entries that help any future agent on any task, not just the current one.
- **[Architecture]**: Sandboxed execution is based on provider-specific Docker sandboxes (`locus sandbox`, then `locus sandbox claude|codex` for auth), while model switching still happens through `ai.model`. Avoid docs that imply Docker install alone completes sandbox setup.
- **[Packages]**: CLI tests currently live in `packages/cli/__tests__`; verify script globs in `packages/cli/package.json` against this layout before relying on `test:unit`/`test:integration` commands.
- **[Packages]**: Never use `workspace:*` in package dependencies that get published to npm. `npm publish` does not resolve the `workspace:` protocol (unlike `pnpm publish`), so consumers get `EUNSUPPORTEDPROTOCOL` errors on install. Always use real semver versions (e.g., `"^0.21.7"`) for inter-package deps, even in `devDependencies`.
- **[Conventions]**: All packages are `@locusai/locus-<name>` on npm — no legacy unscoped `locus-<name>` format. Users reference them by short name (e.g., `locus pkg telegram`). `normalizePackageName` only handles short name → `@locusai/locus-<name>` and pass-through of already-scoped names. For scoped npm packages, `.bin/` entries use the name after the scope (e.g., `locus-telegram` not `@locusai/locus-telegram`).
- **[Packages]**: Every publishable package MUST have a `"files"` field in `package.json` listing `"bin"` and `"dist"` (and any other runtime artifacts). Without it, npm falls back to the root `.gitignore` which excludes `dist` — causing published packages to ship without compiled code or binaries. See `packages/cli/package.json` and `packages/sdk/package.json` for reference.
