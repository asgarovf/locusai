---
description: High-level overview of how Locus orchestrates AI agents to ship code through GitHub.
---

# How Locus Works

## Overview

Locus is a GitHub-native AI engineering CLI. It turns GitHub Issues into code changes by orchestrating AI agents that read your codebase, implement tasks, and open pull requests -- all through the tools you already use.

There is no custom backend, no dashboard, and no separate account. GitHub **is** the backend. Authentication is handled entirely by the GitHub CLI (`gh auth login`).

---

## The Pipeline

Every Locus workflow follows a four-stage pipeline:

```
Plan --> Execute --> Review --> Iterate
```

### 1. Plan

Define what needs to be done. You can create issues manually or let AI generate a structured sprint plan from a high-level directive.

```bash
# AI-generated sprint plan
locus plan "Add user authentication with OAuth"

# Or create issues directly
locus issue create "Add login page" --type feature --priority high
```

Planning produces GitHub Issues with labels for priority, type, and execution order, grouped under a GitHub Milestone (the sprint).

### 2. Execute

AI agents pick up issues and implement them. In sprint mode, tasks run sequentially on a single branch. For standalone issues, tasks run in parallel using git worktrees.

```bash
# Run the active sprint
locus run

# Run a single issue
locus run 42

# Run multiple issues in parallel
locus run 42 43 44
```

The agent reads the issue description, your project instructions (`LOCUS.md`), accumulated learnings (`LEARNINGS.md`), and repository context to build a rich prompt. It then delegates to an AI provider (Claude or Codex) that makes the actual code changes.

### 3. Review

Each completed task produces a pull request on GitHub. You review the PR using GitHub's standard review tools -- inline comments, suggestions, approvals.

```bash
# Open the review interface
locus review
```

### 4. Iterate

If a PR needs changes, Locus reads the review comments and sends them back to the AI agent for a targeted follow-up pass.

```bash
# Address PR feedback
locus iterate 15
```

The agent receives the PR diff and all review comments, then makes focused changes without rewriting code from scratch.

---

## GitHub-Native Architecture

Locus uses GitHub as its entire data layer:

| Concept       | GitHub Primitive   |
|---------------|--------------------|
| Tasks         | Issues             |
| Sprints       | Milestones         |
| Metadata      | Labels             |
| Deliverables  | Pull Requests      |
| Auth          | `gh auth login`    |

There is no database, no API server, and no cloud service. Every operation is a `gh` CLI call that reads from or writes to your GitHub repository.

---

## Authentication

Locus delegates all authentication to the GitHub CLI. If you can run `gh issue list`, you can use Locus. No API keys are stored locally by Locus itself (AI provider keys are managed separately via environment variables).

```bash
# One-time setup
gh auth login
locus init
```

The `locus init` command detects your repository from the git remote, creates the `.locus/` configuration directory, and sets up GitHub labels.

---

## AI Agents as Execution Engines

Locus does not contain an AI model. It is an orchestrator that delegates code generation to external AI CLIs:

- **Claude** (Anthropic) -- via the `claude` CLI in print mode with `--dangerously-skip-permissions`
- **Codex** (OpenAI) -- via the `codex` CLI in `exec --full-auto` mode

The agent receives a structured prompt via stdin, works in the specified directory, and streams output back to Locus. Locus handles the surrounding lifecycle: branch management, label updates, PR creation, conflict detection, and run state tracking.

---

## Context Injection

Before every task, Locus assembles a prompt from multiple sources:

| Source                 | Purpose                                              |
|------------------------|------------------------------------------------------|
| `LOCUS.md`             | Project instructions, conventions, architecture      |
| `.locus/LEARNINGS.md`  | Accumulated corrections and patterns                 |
| Issue body + comments  | Task requirements and discussion                     |
| Sprint diff            | Changes from previous tasks (sprint mode only)       |
| Repository file tree   | Structural awareness                                 |
| Recent git log         | Understanding of recent work                         |

**LOCUS.md** is the primary file you edit to teach the AI about your project. It lives at the repository root and is read before every execution.

**LEARNINGS.md** captures lessons learned during development -- patterns to follow, mistakes to avoid, project-specific gotchas. It grows over time and prevents the AI from repeating errors.

---

## Recovery Model

Locus persists execution state to `.locus/run-state.json` so that interrupted or failed runs can be resumed without re-executing completed tasks.

The run state tracks:
- Run ID and type (sprint or parallel)
- Sprint name and branch (for sprint runs)
- Per-task status: `pending`, `in_progress`, `done`, or `failed`
- Timestamps, PR numbers, and error messages

If a task fails or the process is interrupted:

```bash
# Resume from where it left off
locus run --resume
```

Resume mode picks up at the first failed or pending task. Failed tasks are retried, and completed tasks are skipped. On full success, the run state file is automatically cleaned up.

---

## Directory Structure

After initialization, Locus creates a `.locus/` directory in your project root:

```
.locus/
  config.json          # Project configuration (provider, model, sprint settings)
  run-state.json       # Active run progress (auto-managed)
  LOCUS.md             # Project instructions for AI agents
  LEARNINGS.md         # Accumulated learnings
  logs/                # Execution logs
  sessions/            # Session history
  discussions/         # Discussion artifacts
  worktrees/           # Git worktrees for parallel execution
```

Sensitive files (`config.json`, `run-state.json`, `sessions/`, `logs/`, `worktrees/`) are added to `.gitignore` during init. `LOCUS.md` and `LEARNINGS.md` should be committed to your repository so the entire team benefits from the accumulated context.
