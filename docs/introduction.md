---
description: GitHub-native AI engineering CLI. Turn issues into shipped code.
---

# Introduction

**Locus** is a CLI tool that turns GitHub issues into shipped code using AI agents. It uses GitHub as its entire backend — Issues are tasks, Milestones are sprints, Labels track status, and Pull Requests are deliverables.

No servers. No database. No accounts. Just `npm install -g @locusai/cli` and go.

## What Locus Does

1. **Plan** — Describe what you want to build. AI analyzes your codebase and creates structured GitHub issues with priority, type, and execution order.
2. **Execute** — Run `locus run` and AI agents claim tasks, write code, run tests, commit, and push — creating a PR for each task.
3. **Review** — AI reviews pull requests and posts inline comments on GitHub.
4. **Iterate** — Address PR feedback automatically. The agent re-executes with review comments as context until the code is ready to merge.

## Key Features

- **GitHub IS the backend** — No custom API, no database. Everything is stored on GitHub.
- **Zero infrastructure** — No server to deploy, no accounts to create. Single auth via `gh auth login`.
- **Sprint execution** — Sequential task execution on a single branch. Each task builds on the last.
- **Parallel worktrees** — Run standalone issues in parallel using git worktrees.
- **AI sprint planning** — Describe a goal, get structured GitHub issues with execution order.
- **Interactive REPL** — Full-featured terminal with streaming, sessions, tab completion, and slash commands.
- **AI code review** — Review PRs with AI analysis and inline comments.
- **AI-agnostic** — Works with Claude (Anthropic) and Codex (OpenAI).
- **Recoverable** — Failed runs resume where they left off. No re-executing completed work.
- **Open source** — MIT licensed, free forever.

## Quick Start

```bash
# Install
npm install -g @locusai/cli

# Initialize in your repo
locus init

# Plan a sprint
locus plan "Build user authentication with OAuth"

# Execute the sprint
locus run

# Review the PRs
locus review
```

## Prerequisites

- [Node.js](https://nodejs.org) 18 or later
- [GitHub CLI](https://cli.github.com) (`gh`) installed and authenticated
- A GitHub repository
- An AI provider CLI: [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [Codex](https://openai.com/index/introducing-codex/)

## How It's Different

Unlike traditional project management tools, Locus doesn't have its own backend. Your GitHub repository **is** the project management system:

| Concept | GitHub Equivalent |
|---------|-------------------|
| Task | GitHub Issue |
| Sprint | GitHub Milestone |
| Status | GitHub Labels (`locus:queued`, `locus:in-progress`, `locus:done`) |
| Priority | GitHub Labels (`p:critical`, `p:high`, `p:medium`, `p:low`) |
| Type | GitHub Labels (`type:feature`, `type:bug`, `type:chore`, etc.) |
| Execution Order | GitHub Labels (`order:1`, `order:2`, ...) |
| Deliverable | Pull Request |

Anyone with access to the GitHub repository can see the project state — no special dashboard required.
