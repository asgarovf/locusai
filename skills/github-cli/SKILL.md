---
name: github-cli
description: Automate GitHub workflows using the gh CLI for pull requests, issues, releases, actions, and repository management. Use when interacting with GitHub beyond basic git operations.
allowed-tools: [Bash]
tags: [github, gh, pull-request, issues, actions, releases, ci-cd, pr, workflow]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# GitHub CLI (gh)

## When to use this skill
- Creating, reviewing, or merging pull requests
- Managing issues (create, close, label, assign)
- Checking CI/CD status and workflow runs
- Creating releases and managing tags
- Repository settings and management
- Querying GitHub API for custom automation

## Pull Requests

```bash
# Create PR
gh pr create --title "feat: add auth" --body "Description here"

# Create PR with template
gh pr create --fill  # Uses commit messages

# List open PRs
gh pr list

# View PR details
gh pr view <number>

# Review PR
gh pr diff <number>
gh pr review <number> --approve
gh pr review <number> --request-changes --body "Please fix X"

# Merge PR
gh pr merge <number> --squash --delete-branch

# Check PR CI status
gh pr checks <number>
```

## Issues

```bash
# Create issue
gh issue create --title "Bug: login fails" --body "Steps to reproduce..."

# Create with labels and assignee
gh issue create --title "Bug" --label bug,urgent --assignee @me

# List issues
gh issue list --label bug --state open

# Close issue
gh issue close <number> --reason completed

# Transfer issue
gh issue transfer <number> <target-repo>
```

## Actions & CI/CD

```bash
# List workflow runs
gh run list --workflow=ci.yml

# View run details
gh run view <run-id>

# Watch a running workflow
gh run watch <run-id>

# Re-run failed jobs
gh run rerun <run-id> --failed

# Trigger workflow manually
gh workflow run <workflow-name> --ref main
```

## Releases

```bash
# Create release
gh release create v1.0.0 --title "v1.0.0" --generate-notes

# Create draft release
gh release create v1.0.0 --draft --notes "Release notes here"

# Upload assets
gh release upload v1.0.0 ./dist/app.tar.gz

# List releases
gh release list
```

## API Queries

```bash
# Custom API calls
gh api repos/{owner}/{repo}/pulls --jq '.[].title'

# GraphQL
gh api graphql -f query='{ viewer { login } }'

# Paginated results
gh api repos/{owner}/{repo}/issues --paginate --jq '.[].title'
```

## Best Practices

1. **Use `--jq`** for filtering JSON output instead of piping to jq
2. **Use `gh api`** for anything not covered by built-in commands
3. **Set defaults**: `gh repo set-default` to avoid specifying repo each time
4. **Use templates**: Create `.github/PULL_REQUEST_TEMPLATE.md` for consistent PRs
