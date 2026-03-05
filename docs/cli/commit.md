---
description: AI-powered commit message generation. Analyzes staged changes and recent commit history to produce conventional commit messages.
---

# locus commit

Generate commit messages using AI. Reads your staged changes and recent commit history, then produces a conventional commit message with a `Co-Authored-By` trailer.

## Usage

```bash
locus commit [options]
```

---

## Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview the generated message without committing |
| `--model <name>` | Override the AI model for message generation |

---

## How It Works

1. Reads your staged changes (`git diff --cached`)
2. Reads the file change summary (`git diff --cached --stat`)
3. Reads recent commit messages (`git log --oneline -10`) for style matching
4. Sends the diff and context to AI with instructions to produce a conventional commit message
5. Appends a `Co-Authored-By: LocusAgent <agent@locusai.team>` trailer
6. Commits the staged changes with the generated message

---

## Commit Message Format

The AI generates messages following the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description
```

Supported types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`, `ci`, `build`

A body paragraph is added only when the changes are complex enough to warrant explanation.

---

## Examples

```bash
# Stage changes, then generate and commit
git add -A
locus commit

# Preview the generated message without committing
locus commit --dry-run

# Use a specific model
locus commit --model claude-sonnet-4-6
```
