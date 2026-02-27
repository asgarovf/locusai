---
description: Deep dive on using one Locus command interface across Claude and Codex, including provider constraints and migration patterns.
---

# Unified Interface Across AI Clients

Locus is the unified AI engineering interface for GitHub teams: one CLI to plan, execute, review, and automate delivery across Claude and Codex.

Use this page when you want to standardize team workflows across providers without maintaining separate command playbooks.

## What "One Interface" Means

In Locus, the workflow surface stays stable:

- Plan: `locus plan`
- Execute: `locus run`
- Review: `locus review`
- Iterate: `locus iterate`
- Observe: `locus status`, `locus logs`

Provider choice is handled through model selection:

```bash
locus config set ai.model claude-sonnet-4-6
locus config set ai.model gpt-5.3-codex
```

When `ai.model` changes, Locus infers provider automatically and preserves the same operational commands.

## Side-by-Side Workflow Equivalence (Claude vs Codex)

The command surface is intentionally identical across clients:

| Workflow Stage | Claude Path | Codex Path |
|---|---|---|
| Select model | `locus config set ai.model claude-sonnet-4-6` | `locus config set ai.model gpt-5.3-codex` |
| Plan work | `locus plan "Add billing webhook retries" --sprint "Sprint 7"` | `locus plan "Add billing webhook retries" --sprint "Sprint 7"` |
| Execute sprint | `locus sprint active "Sprint 7"` then `locus run` | `locus sprint active "Sprint 7"` then `locus run` |
| Review PR output | `locus review` | `locus review` |
| Iterate on feedback | `locus iterate --sprint` | `locus iterate --sprint` |
| Resume interrupted run | `locus run --resume` | `locus run --resume` |

The only required difference is model/provider selection. The workflow stays unchanged.

## Provider Capability Matrix (Dated + Versioned)

Matrix date: **February 27, 2026**  
Locus CLI version: **0.17.14** (`packages/cli/package.json`)  
Source of truth: `packages/cli/src/ai/claude.ts`, `packages/cli/src/ai/codex.ts`, `packages/cli/src/core/ai-models.ts`

| Capability | Claude Client Path | Codex Client Path | Locus Interface Behavior |
|---|---|---|---|
| Binary required | `claude` on PATH | `codex` on PATH | Locus checks availability before execution and fails with a clear install error if missing. |
| Auth requirement | Anthropic auth (for example `ANTHROPIC_API_KEY` or Claude CLI login) | OpenAI auth (for example `OPENAI_API_KEY`) | Auth is provider-managed; Locus does not store provider API keys. |
| Execution mode used by Locus | `claude --print --dangerously-skip-permissions --no-session-persistence` | `codex exec --full-auto --skip-git-repo-check --json -` | Full-auto provider execution under one `locus` command surface. |
| Model override support | `--model` supported | `--model` supported | `locus run --model ...` and equivalent command flags override configured model for that run. |
| Provider inference | Known Claude aliases + `claude-*` prefix | Known Codex aliases + `codex` substring | Setting `ai.model` is usually sufficient; provider auto-resolves. |
| Interrupt handling | SIGTERM then SIGKILL after timeout | SIGTERM then SIGKILL after timeout | Same interruption semantics from `locus` regardless of provider. |

Known model aliases in `0.17.14`:

- Claude: `opus`, `sonnet`, `haiku`, `opusplan`, `claude-opus-4-6`, `claude-opus-4-5-20251101`, `claude-sonnet-4-6`, `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`
- Codex: `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex`, `gpt-5.1-codex-mini`, `gpt-5-codex`, `codex-mini-latest`

## Migration: Raw Provider CLIs -> Locus

These examples show before/after command patterns for teams moving from direct Claude/Codex usage.

### Pattern 1: Raw Claude Task Execution -> Locus Workflow

Before (raw Claude CLI):

```bash
cat prompt.md | claude --print --dangerously-skip-permissions --no-session-persistence --model claude-sonnet-4-6
```

After (Locus):

```bash
locus config set ai.model claude-sonnet-4-6
locus plan "Add billing webhook retries" --sprint "Sprint 7"
locus sprint active "Sprint 7"
locus run
```

### Pattern 2: Raw Codex Task Execution -> Locus Workflow

Before (raw Codex CLI):

```bash
cat prompt.md | codex exec --full-auto --skip-git-repo-check --json --model gpt-5.3-codex -
```

After (Locus):

```bash
locus config set ai.model gpt-5.3-codex
locus plan "Add billing webhook retries" --sprint "Sprint 7"
locus sprint active "Sprint 7"
locus run
```

### Pattern 3: Provider-Specific Command Scripts -> Unified Team Runbook

Before:

- Separate Claude and Codex scripts
- Different operational playbooks by provider
- Manual linking between generation and GitHub sprint/PR lifecycle

After:

```bash
locus config set ai.model <provider-model>
locus run
locus review
locus iterate --sprint
locus status
```

Outcome: one runbook for both providers, with GitHub-native planning/execution/review state.

## Recommended Adoption Path

1. Start with [Quickstart](../getting-started/quickstart.md).
2. Standardize team docs around `plan -> run -> review -> iterate`.
3. Treat model/provider as a configuration toggle (`ai.model`), not a workflow fork.

## Related Docs

- [AI Providers (technical reference)](ai-providers.md)
- [How Locus Works](how-it-works.md)
- [GitHub-Native Workflows](github-native-workflows.md)
- [Execution Model](execution-model.md)
