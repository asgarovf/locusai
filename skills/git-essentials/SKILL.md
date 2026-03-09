---
name: git-essentials
description: Expert Git workflow assistance for branching, merging, rebasing, conflict resolution, and history management. Use when working with Git operations beyond simple commits.
allowed-tools: [Bash]
tags: [git, branching, merging, rebasing, conflicts, version-control, workflow]
platforms: [Claude, ChatGPT, Gemini]
author: locusai
---

# Git Essentials

## When to use this skill
- Creating and managing branches
- Resolving merge conflicts
- Rebasing and cleaning up history
- Cherry-picking commits
- Investigating history with git log/blame/bisect
- Recovering from mistakes (reset, revert, reflog)

## Branching Strategy

### Branch naming
```
feat/<issue>-<short-description>
fix/<issue>-<short-description>
chore/<short-description>
release/<version>
hotfix/<issue>-<description>
```

### Common workflows
```bash
# Create feature branch from main
git checkout main && git pull
git checkout -b feat/123-add-auth

# Keep branch up to date with main
git fetch origin
git rebase origin/main

# Squash commits before merge
git rebase -i origin/main
# Mark commits as 'squash' or 'fixup'
```

## Conflict Resolution

### Strategy
1. Understand both sides of the conflict
2. Determine which changes to keep (or merge both)
3. Test after resolution
4. Never blindly accept "ours" or "theirs"

```bash
# See which files conflict
git status

# Use merge tool
git mergetool

# After resolving manually
git add <resolved-files>
git rebase --continue   # or git merge --continue
```

## History Investigation

```bash
# Search commits by message
git log --grep="fix auth"

# Find who changed a line
git blame <file> -L <start>,<end>

# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# Git will binary search — test each commit and mark good/bad

# Show changes to a specific function
git log -p -S "functionName" -- <file>
```

## Recovery

```bash
# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Find lost commits
git reflog

# Restore a deleted branch
git checkout -b <branch> <reflog-sha>

# Revert a pushed commit (creates new commit)
git revert <sha>

# Unstage files
git restore --staged <file>

# Discard working tree changes
git restore <file>
```

## Best Practices

1. **Commit often** — small, atomic commits are easier to review and revert
2. **Pull before push** — avoid unnecessary merge commits
3. **Don't rewrite shared history** — never force-push to main/master
4. **Use `.gitignore`** — keep build artifacts, secrets, and IDE files out
5. **Write meaningful messages** — future-you will thank present-you
6. **Review diffs before committing** — `git diff --staged` catches mistakes
