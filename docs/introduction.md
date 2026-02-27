---
description: GitHub-native AI engineering CLI. Turn issues into shipped code.
---

# Introduction

Locus is the unified AI engineering interface for GitHub teams: one CLI to plan, execute, review, and automate delivery across Claude and Codex.

For canonical landing/docs language, use the [Positioning Brief](content/positioning-brief.md).

## Start Here

If you are new to Locus, follow these pages in order:

1. [Installation](getting-started/installation.md) - install Locus, `gh`, and one AI provider CLI.
2. [Quickstart](getting-started/quickstart.md) - run one complete end-to-end workflow with expected outcomes.

You can reach a working flow by following only those two pages.

## Who This Is For

- Engineering teams already using GitHub Issues, Milestones, labels, and PRs as their delivery workflow.
- Teams that want one operational interface across Claude and Codex instead of provider-specific process.
- Developers who want built-in planning, execution, review, iteration, and status workflows in one CLI.
- Teams that want full-auto execution patterns with GitHub-native auditability.

## What Locus Is Not

- Not a replacement for GitHub. GitHub is the system of record.
- Not a hosted SaaS backend. Locus runs locally and uses `gh` for GitHub operations.
- Not "just model access". Locus provides orchestration workflows on top of provider CLIs.
- Not one-click magic. Automation is explicit and configurable (`autoLabel`, `autoPR`, `run --resume`).

## Four Core Strengths

1. [Unified interface across multiple AI clients](concepts/ai-providers.md) - switch models/providers without changing workflow.
2. [GitHub-native workflows as operational memory](concepts/github-backend.md) - issues, milestones, labels, and PRs are the data plane.
3. [Built-in orchestration tools beyond provider CLIs](cli/overview.md) - use `plan`, `run`, `review`, `iterate`, `status`, and `logs`.
4. [Automation via auto-approval mode](concepts/execution-model.md) - full-auto execution patterns with resumable runs.

## What You Will Learn Next

The [Quickstart](getting-started/quickstart.md) walks through:

1. Switching between Claude and Codex using the same command surface.
2. Creating and executing GitHub-native sprint work.
3. Running built-in `plan -> run -> review -> iterate` workflows.
4. Enabling automation settings and resuming interrupted execution.

After that, continue with:

1. [How Locus Works](concepts/how-it-works.md)
2. [GitHub-Native Workflows](concepts/github-native-workflows.md)
3. [Sprints and Issues](concepts/sprints-and-issues.md)
4. [CLI Overview](cli/overview.md)
