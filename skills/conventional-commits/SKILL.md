---
name: conventional-commits
description: Write well-structured conventional commit messages. Use when committing code changes to ensure consistent, parseable commit history that enables automated changelogs and semantic versioning.
allowed-tools: [Bash]
tags: [git, commits, conventional-commits, changelog, versioning, release]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Conventional Commits

## When to use this skill
- Writing commit messages for any code change
- Preparing releases with automated changelogs
- Maintaining consistent commit history
- Working in projects that follow semantic versioning

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | Description | Bumps |
|------|-------------|-------|
| `feat` | New feature for the user | MINOR |
| `fix` | Bug fix for the user | PATCH |
| `docs` | Documentation only changes | - |
| `style` | Formatting, semicolons, etc (no code change) | - |
| `refactor` | Code change that neither fixes a bug nor adds a feature | - |
| `perf` | Performance improvement | PATCH |
| `test` | Adding or fixing tests | - |
| `build` | Build system or external dependencies | - |
| `ci` | CI configuration and scripts | - |
| `chore` | Other changes that don't modify src or test | - |
| `revert` | Reverts a previous commit | - |

## Rules

1. **Subject line**: Imperative mood, lowercase, no period, max 72 chars
2. **Scope**: Optional, in parentheses — identifies the area of change
3. **Body**: Explain *what* and *why*, not *how*. Wrap at 72 chars
4. **Breaking changes**: Add `!` after type/scope, or `BREAKING CHANGE:` footer
5. **Issue references**: Use `Closes #123` or `Fixes #456` in footer

## Examples

```
feat(auth): add OAuth2 login with Google provider

Implements Google OAuth2 flow using passport-google-oauth20.
Users can now sign in with their Google accounts alongside
email/password authentication.

Closes #142
```

```
fix(api): prevent race condition in concurrent order creation

Orders created within the same millisecond could receive
duplicate sequence numbers. Added a database-level unique
constraint and retry logic.

Fixes #891
```

```
refactor(db)!: migrate from MongoDB to PostgreSQL

BREAKING CHANGE: All database connection strings must be updated
to use PostgreSQL format. Run `npm run migrate` before starting.
```

```
chore: update dependencies to latest versions
```

## Multi-line commits in shell

```bash
git commit -m "feat(auth): add OAuth2 login" -m "Implements Google OAuth2 flow." -m "Closes #142"
```

## Commit message checklist

- [ ] Type is correct for the change
- [ ] Subject is imperative, lowercase, concise
- [ ] Scope accurately identifies the changed area
- [ ] Body explains why, not just what
- [ ] Breaking changes are clearly marked
- [ ] Related issues are referenced
