| name | description |
| --- | --- |
| locus-review | AI-powered code review on pull requests. Analyzes diffs for bugs, security issues, performance problems, and posts structured review comments on GitHub. |

# PR Code Review

## Process

1. **Determine scope**:
   - No args → review all open agent-managed PRs (label: `agent:managed`)
   - PR number → review that specific PR
2. **Execute review**:
   - If MCP tool available: call `locus_review` with optional PR number and focus areas
   - If CLI available: run `locus review [pr-number] [--focus areas]` via Bash
3. **Show results** — display the review summary

## Arguments

- PR number (optional): specific PR to review
- `--focus <areas>`: comma-separated focus areas (e.g. "security,performance,testing")
- `--dry-run`: generate review without posting to GitHub

## Review Categories

- Correctness: bugs, logic errors, edge cases
- Security: injection, XSS, auth issues, secret exposure
- Performance: N+1 queries, unnecessary allocations, missing caching
- Maintainability: naming, complexity, code organization
- Testing: missing tests, inadequate coverage

## Output

Review is posted as a GitHub PR comment. The assessment ends with one of:
- **APPROVE** — code is ready to merge
- **REQUEST_CHANGES** — issues that must be fixed
- **COMMENT** — suggestions, no blockers
