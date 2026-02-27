---
description: Canonical messaging framework for Locus across landing pages and documentation.
---

# Locus Positioning Brief

**Audience:** Landing copywriters, docs authors, marketplace/package page authors.
**Status:** Canonical source of truth. If copy conflicts with this brief, this brief wins.
**Updated:** 2026-02-27

## Primary Value Proposition (Canonical Sentence)

Locus is the unified AI engineering interface for GitHub teams: one CLI to plan, execute, review, and automate delivery across Claude and Codex.

## Four Canonical Pillars

| Pillar | One-line Explanation |
|---|---|
| Unified interface across multiple AI clients | Teams keep one workflow and switch models/providers by changing model selection, not process. |
| GitHub-native workflows as operational memory/database | GitHub Issues, Milestones, Labels, and PRs are the system of record for planning, execution, and status. |
| Built-in tools beyond raw Claude/Codex CLI usage | Locus adds planning, orchestration, review, iteration, status, and logs workflows on top of provider CLIs. |
| Automation via auto-approval mode | Locus runs providers in full-auto execution mode and automates operational steps like labels, PR creation, and resumable runs. |

## Claim-to-Evidence Matrix

| Pillar | Claim | Concrete Product Evidence | Commands and Behaviors | Example Proof Line |
|---|---|---|---|---|
| Unified interface | "Use Claude and Codex with one command surface." | Provider is inferred from `ai.model`; the same commands (`plan`, `run`, `review`, `iterate`) work regardless of provider. | `locus config set ai.model claude-sonnet-4-6`<br/>`locus config set ai.model gpt-5.3-codex`<br/>`locus run --model claude-sonnet-4-6` | "Switch models without rewriting your workflow." |
| GitHub-native memory | "GitHub is where work state lives." | Issues are tasks, Milestones are sprints, Labels track lifecycle, PRs are deliverables; run state persists in `.locus/run-state.json`. | `locus init`<br/>`locus issue create "..."`<br/>`locus sprint create "Sprint 1"`<br/>`locus run`<br/>`locus status` | "No separate PM backend: your repo is the operational database." |
| Built-in engineering tools | "Locus ships orchestration tools, not just model access." | Native workflows for planning, sprint/issue execution, AI review, iteration loops, discussion, and operational visibility. | `locus plan`, `locus run`, `locus review`, `locus iterate`, `locus discuss`, `locus status`, `locus logs` | "From idea to merged PR in one interface." |
| Auto-approval automation | "Locus is designed for execution, not prompt-by-prompt approval." | Provider invocation uses full-auto modes (`claude --dangerously-skip-permissions`, `codex exec --full-auto`); agent automation includes `autoLabel` and `autoPR`; failed runs resume. | `locus run`<br/>`locus run --resume`<br/>`locus config set agent.autoPR true`<br/>`locus config set agent.autoLabel true` | "Automate delivery loops while keeping GitHub as the audit trail." |

## Terminology Guardrails

| Prefer | Avoid | Why |
|---|---|---|
| Unified AI engineering interface | AI wrapper | "Wrapper" understates orchestration, workflow, and operational features. |
| GitHub-native operational memory | GitHub integration | "Integration" sounds optional; GitHub is the core data plane. |
| Issues to PRs workflow | Autonomous coding bot | Keeps focus on observable delivery lifecycle, not hype language. |
| Full-auto execution / auto-approval mode | One-click magic | Avoids overpromising and keeps messaging operationally credible. |
| Built-in orchestration tools | Just Claude/Codex with another UI | Clarifies Locus adds net-new capabilities beyond provider CLIs. |
| Sprint execution (Milestone-based) | Task board | Uses product-native objects and avoids generic PM wording. |
| Parallel standalone issue execution (worktrees) | Multi-agent chaos mode | Keeps language precise and deterministic. |

## Phrases to Reuse

- "One interface across Claude and Codex."
- "GitHub is the system of record."
- "From issue to PR with built-in planning, execution, review, and iteration."
- "Full-auto execution with GitHub-native auditability."

## Phrases to Avoid

- "Works with any model" (unless explicitly listing supported providers/models)
- "No review needed" (Locus supports automation, but review remains a team decision)
- "Replaces GitHub" (incorrect; Locus depends on GitHub as backend)
- "Just a CLI wrapper" (incorrectly minimizes product scope)

## Reusable Snippets

### Landing Hero Snippet

**Eyebrow:** `Unified AI Interface for GitHub Teams`

**Headline:** `From issue to PR with one interface across Claude and Codex.`

**Subheadline:** `Plan, execute, review, and iterate in GitHub-native workflows, with full-auto execution when your team wants speed.`

**Primary CTA:** `Get Started`

**Secondary CTA:** `Read Docs`

### Landing Feature Card Snippets (4 Canonical Cards)

1. **Unified Interface**
   `Run the same Locus workflow across Claude and Codex by switching models, not tooling.`
2. **GitHub as Operational Memory**
   `Issues, milestones, labels, and PRs become your execution database and audit trail.`
3. **Built-in Orchestration Tools**
   `Use planning, execution, review, iteration, and status commands that go beyond raw provider CLIs.`
4. **Auto-Approval Automation**
   `Execute in full-auto mode with automatic labels, PR creation, and resumable runs.`

### Docs Overview Snippet

Locus is a GitHub-native AI engineering CLI that gives teams one interface across Claude and Codex. It combines planning, execution, review, and iteration workflows, uses GitHub as the operational memory layer, and supports full-auto execution patterns for faster delivery.

## Usage Notes for Contributors

- For landing tasks, start from the Hero + Feature Card snippets in this brief.
- For docs tasks, start from the Docs Overview snippet and the terminology guardrails.
- When adding a new claim, attach at least one command-level or behavior-level evidence item.
