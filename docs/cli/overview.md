---
description: Built-in tool inventory for Locus, with categorized commands and practical workflows that extend raw provider CLIs.
---

# Built-In Tools

Locus adds an operational toolchain on top of provider CLIs (Claude/Codex): planning, GitHub-native execution, review loops, status visibility, logging, and package extensibility.

Inventory date: **February 27, 2026**  
Locus CLI version: **0.17.14** (`packages/cli/package.json`)

## Why Built-In Tools (vs Raw Provider CLIs)

Raw provider CLIs can generate code, but they do not natively manage your GitHub workflow end to end.

Locus built-in tools add:

- GitHub task lifecycle control (`issue`, `sprint`, `plan`, `run`)
- Delivery automation (`autoLabel`, `autoPR`, `run --resume`)
- Structured quality loops (`review`, `iterate`)
- Operational visibility (`status`, `logs`, `artifacts`)

## Tool Inventory

### 1) Setup and Configuration

| Tool | Purpose | Example |
|---|---|---|
| [`locus init`](init.md) | Initialize `.locus/`, verify `gh`, and seed label schema | `locus init` |
| [`locus config`](config.md) | Read/write project settings (model, automation, execution behavior) | `locus config set ai.model gpt-5.3-codex` |
| [`locus upgrade`](upgrade.md) | Check and install newer CLI versions | `locus upgrade --check` |

### 2) Work Modeling in GitHub

| Tool | Purpose | Example |
|---|---|---|
| [`locus issue`](issue.md) | Create/manage GitHub issues as execution units | `locus issue create "Add webhook signature validation" --sprint "Sprint 8"` |
| [`locus sprint`](sprint.md) | Create/activate/manage sprint milestones | `locus sprint active "Sprint 8"` |
| [`locus plan`](plan.md) | Generate plan files, review, and approve into GitHub issues | `locus plan "Build billing retries" --sprint "Sprint 8"` then `locus plan approve <id>` |

### 3) Execution, Review, and Iteration

| Tool | Purpose | Example |
|---|---|---|
| [`locus run`](run.md) | Execute active sprint or standalone issue set | `locus run --resume` |
| [`locus review`](review.md) | AI review for open `agent:managed` PRs | `locus review` |
| [`locus iterate`](iterate.md) | Apply PR feedback in loop | `locus iterate --pr 42` |
| [`locus status`](status.md) | Operational dashboard for sprint/issues/PRs | `locus status` |
| [`locus logs`](logs.md) | Tail and inspect run logs for failures/debugging | `locus logs --follow` |

### 4) Interactive and Analysis Tools

| Tool | Purpose | Example |
|---|---|---|
| [`locus exec`](exec.md) | Interactive or one-shot coding session | `locus exec "Add retry guard to webhook handler"` |
| [`locus discuss`](discuss.md) | Architecture discussion and planning prompts | `locus discuss "Should we split webhook processing into a queue worker?"` |
| `locus artifacts` | Inspect and convert AI-generated artifacts in `.locus/artifacts/` | `locus artifacts plan webhook-reliability-prd` |

### 5) Package Ecosystem Tools

| Tool | Purpose | Example |
|---|---|---|
| `locus install` | Install community package from npm | `locus install telegram` |
| `locus uninstall` | Remove installed package | `locus uninstall telegram` |
| `locus packages` | List installed packages / check outdated | `locus packages outdated` |
| `locus pkg` | Run package-provided commands | `locus pkg telegram start` |

## Practical Workflows Where Built-In Tools Win

### Workflow A: Issue-to-PR Delivery with Recovery

```bash
locus sprint active "Sprint 8"
locus run
locus review
locus iterate --sprint
locus run --resume
```

Why this beats raw provider CLI usage:

- Keeps task state in GitHub labels/issues/PRs
- Recovers from interruption without re-running completed tasks
- Preserves one team workflow across Claude/Codex model switching

### Workflow B: Plan Approval Before Execution

```bash
locus plan "Add SSO login and role-based access"
locus plan list
locus plan show <id>
locus plan approve <id> --sprint "Sprint 9"
locus run
```

Why this beats raw provider CLI usage:

- Separates planning from execution with an approval gate
- Converts approved plan into ordered GitHub work automatically
- Keeps execution order explicit via `order:N` labels

## Related Docs

- [Auto-Approval Mode](../concepts/auto-approval-mode.md)
- [Execution Model (Technical)](../concepts/execution-model.md)
- [GitHub-Native Workflows](../concepts/github-native-workflows.md)
- [Unified Interface Across AI Clients](../concepts/unified-interface.md)
