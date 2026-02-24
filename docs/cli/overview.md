---
description: Complete reference for all Locus v3 CLI commands, global options, and common workflows.
---

# CLI Overview

Locus is a GitHub-native AI engineering CLI. All project state lives in GitHub (issues, milestones, PRs, labels) while Locus orchestrates AI agents to plan, execute, review, and iterate on your codebase.

## Usage

```bash
locus <command> [options]
```

---

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| [`init`](init.md) | | Initialize Locus in a GitHub repository |
| [`issue`](issue.md) | `i` | Manage GitHub issues as work items |
| [`sprint`](sprint.md) | `s` | Manage sprints via GitHub Milestones |
| [`plan`](plan.md) | | AI-powered sprint planning |
| [`run`](run.md) | | Execute issues using AI agents |
| [`exec`](exec.md) | `e` | Interactive REPL or one-shot execution |
| [`review`](review.md) | | AI-powered code review on PRs |
| [`iterate`](iterate.md) | | Re-execute tasks with PR feedback |
| [`discuss`](discuss.md) | | AI-powered architectural discussions |
| [`status`](status.md) | | Dashboard view of current project state |
| [`config`](config.md) | | View and manage settings |
| [`logs`](logs.md) | | View, tail, and manage execution logs |
| [`upgrade`](upgrade.md) | | Check for and install updates |

---

## Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help message |
| `--version` | `-V` | Print installed version |
| `--debug` | `-d` | Enable debug-level logging |
| `--model` | `-m` | Override AI model for the command |
| `--dry-run` | | Preview what the command would do without side effects |
| `--resume` | | Resume a previously interrupted sprint or parallel run |

---

## Getting Started

```bash
# 1. Initialize Locus in your repo
locus init

# 2. Edit the generated project context file
vim .locus/LOCUS.md

# 3. Create issues manually or let AI plan them
locus plan "Build user authentication with OAuth"

# 4. Run the active sprint
locus run
```

---

## Common Workflows

### Sprint execution (sequential, single branch)

```bash
locus sprint active "Sprint 1"
locus run
```

### Run a single issue in a worktree

```bash
locus run 42
```

### Run multiple issues in parallel (worktrees)

```bash
locus run 42 43 44
```

### Interactive AI coding session

```bash
locus exec
```

### One-shot AI execution

```bash
locus exec "Add error handling to the payment endpoint"
```

### AI code review

```bash
locus review          # All open agent PRs
locus review 15       # Specific PR
```

### Iterate on PR feedback

```bash
locus iterate --pr 15
```

### Check project status

```bash
locus status
```
