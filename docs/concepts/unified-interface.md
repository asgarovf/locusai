---
description: One Locus command interface across Claude and Codex -- switch providers without changing workflows.
---

# Unified Interface Across AI Clients

Locus gives you one CLI to plan, execute, review, and iterate -- regardless of whether you use Claude or Codex under the hood.

## What "One Interface" Means

The workflow surface stays the same across providers:

- Plan: `locus plan`
- Execute: `locus run`
- Review: `locus review`
- Iterate: `locus iterate`
- Observe: `locus status`, `locus logs`

Provider choice is a configuration toggle:

```bash
# Use Claude
locus config set ai.model claude-sonnet-4-6

# Switch to Codex
locus config set ai.model gpt-5.3-codex
```

When `ai.model` changes, Locus infers the provider automatically. All commands continue to work identically.

---

## Side-by-Side Workflow Equivalence

The command surface is intentionally identical across clients:

| Workflow Stage | Claude | Codex |
|---|---|---|
| Select model | `locus config set ai.model claude-sonnet-4-6` | `locus config set ai.model gpt-5.3-codex` |
| Plan work | `locus plan "Add webhook retries" --sprint "Sprint 7"` | Same command |
| Execute sprint | `locus sprint active "Sprint 7"` then `locus run` | Same commands |
| Review PRs | `locus review` | Same command |
| Iterate on feedback | `locus iterate --sprint` | Same command |
| Resume interrupted run | `locus run --resume` | Same command |

The only required change is model selection. Everything else stays unchanged.

---

## Supported Models

### Claude (Anthropic)

| Model | Alias |
|---|---|
| Claude Opus 4.6 | `claude-opus-4-6` or `opus` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` or `sonnet` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` or `haiku` |

### Codex (OpenAI)

| Model | Alias |
|---|---|
| GPT-5.3 Codex | `gpt-5.3-codex` |
| GPT-5.3 Codex Spark | `gpt-5.3-codex-spark` |
| GPT-5.2 Codex | `gpt-5.2-codex` |
| GPT-5.1 Codex Max | `gpt-5.1-codex-max` |
| GPT-5.1 Codex | `gpt-5.1-codex` |
| GPT-5.1 Codex Mini | `gpt-5.1-codex-mini` |
| Codex Mini Latest | `codex-mini-latest` |

---

## Automatic Provider Inference

Locus infers the provider from the model name:

1. Known Claude aliases (`opus`, `sonnet`, `haiku`) → Claude
2. Known Codex aliases → Codex
3. Model name starts with `claude-` → Claude
4. Model name contains `codex` → Codex

You rarely need to set `ai.provider` directly -- setting `ai.model` is sufficient.

---

## Per-Command Override

Override the model for a single run without changing your configuration:

```bash
locus run --model opus
locus run 42 --model gpt-5.3-codex
```

The `--model` flag takes precedence for that execution only.

---

## Environment Variables

AI provider authentication is handled through environment variables or provider CLI login, not through Locus:

```bash
# Claude
export ANTHROPIC_API_KEY="sk-ant-..."
# Or use: claude auth login

# Codex
export OPENAI_API_KEY="sk-..."
```

Locus does not store provider API keys.

---

## Recommended Adoption Path

1. Start with [Quickstart](../getting-started/quickstart.md).
2. Standardize team docs around `plan -> run -> review -> iterate`.
3. Treat model/provider as a configuration toggle (`ai.model`), not a workflow fork.

## Related Docs

- [How Locus Works](how-it-works.md)
- [Built-In Tools](../cli/overview.md)
- [Auto-Approval Mode](auto-approval-mode.md)
