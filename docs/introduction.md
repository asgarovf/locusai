---
description: GitHub-native AI engineering CLI. Turn issues into shipped code.
---

# Introduction

Locus is the unified AI engineering interface for GitHub teams: one CLI to plan, execute, review, and ship code across Claude and Codex.

## Getting Started

If you are new to Locus, follow these pages in order:

1. [Installation](getting-started/installation.md) -- install Locus, `gh`, and one AI provider CLI.
2. [Sandboxing Setup](getting-started/sandboxing-setup.md) -- set up Docker-based isolation for safe AI execution.
3. [Quickstart](getting-started/quickstart.md) -- run one complete end-to-end workflow.

You can reach a working flow by following only those three pages.

## Who This Is For

- Engineering teams already using GitHub Issues, Milestones, labels, and PRs as their delivery workflow.
- Teams that want one operational interface across Claude and Codex instead of provider-specific process.
- Developers who want built-in planning, execution, review, iteration, and status workflows in one CLI.
- Teams that want full-auto execution with Docker sandbox isolation and GitHub-native auditability.

## What Locus Is Not

- Not a replacement for GitHub. GitHub is the system of record.
- Not a hosted SaaS backend. Locus runs locally and uses `gh` for GitHub operations.
- Not "just model access". Locus provides orchestration workflows on top of provider CLIs.
- Not one-click magic. Automation is explicit and configurable (`autoLabel`, `autoPR`, `run --resume`).

## Core Strengths

1. [**Unified interface across AI clients**](concepts/unified-interface.md) -- switch models and providers without changing your workflow commands.
2. [**GitHub-native operational memory**](concepts/github-backend.md) -- issues, milestones, labels, and PRs are the entire data plane. No external database.
3. [**Built-in orchestration tools**](cli/overview.md) -- `plan`, `run`, `review`, `iterate`, `status`, and `logs` go beyond what raw provider CLIs offer.
4. [**Safe automation via auto-approval mode**](concepts/auto-approval-mode.md) -- full-auto execution with Docker sandbox isolation, resumable runs, and configurable safeguards.

## What You Will Learn Next

The [Quickstart](getting-started/quickstart.md) walks through:

1. Switching between Claude and Codex using the same command surface.
2. Creating and executing GitHub-native sprint work.
3. Running built-in `plan -> run -> review -> iterate` workflows.
4. Enabling automation settings and resuming interrupted execution.

After that, dive deeper into:

1. [How Locus Works](concepts/how-it-works.md)
2. [Execution Model](concepts/execution-model.md)
3. [Sprints and Issues](concepts/sprints-and-issues.md)
4. [Built-In Tools](cli/overview.md)
5. [Auto-Approval Mode](concepts/auto-approval-mode.md)
