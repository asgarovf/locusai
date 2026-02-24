---
description: AI-powered code review on pull requests. Reviews agent-managed PRs or specific PRs with optional focus areas.
---

# locus review

Run AI-powered code reviews on GitHub pull requests. By default, reviews all open PRs with the `agent:managed` label. Can also target a specific PR by number.

## Usage

```bash
locus review [pr-number] [options]
```

---

## Options

| Flag | Description |
|------|-------------|
| `--focus <areas>` | Comma-separated review focus areas (e.g., `"security,performance,testing"`) |
| `--dry-run` | Generate the review without posting it as a PR comment |
| `--model <name>` | Override the AI model for this review |

---

## Modes

### Review All Agent PRs

When called without arguments, finds all open PRs labeled `agent:managed` and reviews each one.

```bash
locus review
```

### Review a Specific PR

Pass a PR number to review a single pull request.

```bash
locus review 15
```

### Focused Review

Use `--focus` to direct the AI's attention to specific areas.

```bash
locus review 15 --focus "security,error-handling"
locus review --focus "performance,testing"
```

---

## What the Review Covers

The AI reviewer checks the PR diff for:

- **Correctness** -- bugs, logic errors, edge cases
- **Security** -- injection, XSS, auth issues, secret exposure
- **Performance** -- N+1 queries, unnecessary allocations, missing caching
- **Maintainability** -- naming, complexity, code organization
- **Testing** -- missing tests, inadequate coverage

Each finding includes the file location, description of the issue, why it matters, and how to fix it. The review ends with an overall assessment: APPROVE, REQUEST_CHANGES, or COMMENT.

---

## Review Output

Unless `--dry-run` is specified, the review is posted as a comment on the PR with the heading "Locus AI Review". The comment includes the provider and model used.

In dry-run mode, the review is generated and streamed to the terminal but not posted.

---

## Project Context

The reviewer has access to your project context via `LOCUS.md`, so it understands your tech stack, conventions, and constraints when evaluating changes.

---

## Examples

```bash
# Review all open agent PRs
locus review

# Review a specific PR
locus review 15

# Focus on security and performance
locus review 15 --focus "security,performance"

# Preview the review without posting
locus review 15 --dry-run

# Use a different model
locus review 15 --model claude-sonnet-4-6
```
