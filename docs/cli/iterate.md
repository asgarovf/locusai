---
description: Re-execute tasks based on PR review feedback. Closes the feedback loop between code review and implementation.
---

# locus iterate

Re-execute AI agents on pull requests that have received review feedback. This closes the feedback loop: `run` produces a PR, `review` (or a human) leaves comments, and `iterate` addresses them.

## Usage

```bash
locus iterate [options]
locus iterate <issue-number>
locus iterate --pr <pr-number>
locus iterate --sprint
```

---

## Options

| Flag | Description |
|------|-------------|
| `--pr <number>` | Iterate on a specific PR by number |
| `--sprint` | Iterate on all agent PRs in the active sprint that have feedback |
| `--dry-run` | Show what would be iterated without executing |
| `--model <name>` | Override the AI model |

---

## Modes

### All Agent PRs (default)

When called without arguments, finds all open PRs labeled `agent:managed` that have non-bot comments, and iterates on each one.

```bash
locus iterate
```

### Specific PR

Iterate on a single PR by number.

```bash
locus iterate --pr 15
```

The command fetches all comments on the PR and passes them as context to the AI agent, which then makes the requested changes and pushes an update.

### By Issue Number

Pass an issue number to automatically find its associated PR and iterate.

```bash
locus iterate 42
```

Locus searches for open PRs that reference the issue (via "Closes #N" or the `locus/issue-N` branch naming convention).

### Sprint Mode

Iterate on all agent PRs with feedback that belong to the active sprint.

```bash
locus iterate --sprint
```

---

## How It Works

1. Fetches comments on the target PR(s).
2. Filters for actionable feedback (excludes bot-generated comments).
3. Passes the feedback context to the AI agent.
4. The agent makes changes on the existing PR branch.
5. Changes are committed and pushed to the PR.

---

## Examples

```bash
# Iterate on all agent PRs with feedback
locus iterate

# Iterate on a specific PR
locus iterate --pr 15

# Find PR for issue #42 and iterate
locus iterate 42

# Iterate on all sprint PRs with feedback
locus iterate --sprint

# Preview without executing
locus iterate --dry-run

# Iterate on PR 15 with a specific model
locus iterate --pr 15 --model claude-sonnet-4-6
```
