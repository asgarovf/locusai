---
description: How to configure AI providers and models in Locus -- Claude (Anthropic) and Codex (OpenAI).
---

# AI Providers

{% hint style="info" %}
For the workflow-focused deep dive, start with [Unified Interface Across AI Clients](unified-interface.md).
{% endhint %}

## Overview

Locus does not include an AI model. It is an orchestrator that delegates code generation to external AI CLIs. Two providers are supported:

- **Claude** (Anthropic) -- via the `claude` CLI
- **Codex** (OpenAI) -- via the `codex` CLI

You choose which provider and model to use through configuration. Locus spawns the appropriate CLI as a subprocess, sends the prompt via stdin, and streams the output back.

---

## Supported Providers

### Claude (Anthropic)

Claude is the default provider. Locus spawns the `claude` CLI in non-interactive print mode with full auto-permissions:

```
claude --print --dangerously-skip-permissions --no-session-persistence
```

**Requirements:**
- The `claude` CLI must be installed and available on your PATH
- An Anthropic API key must be available (typically via the `ANTHROPIC_API_KEY` environment variable, or configured through the Claude CLI itself)

**Supported models:**

| Model Alias            | Description                |
|------------------------|----------------------------|
| `opus`                 | Claude Opus (latest)       |
| `sonnet`               | Claude Sonnet (latest)     |
| `haiku`                | Claude Haiku (latest)      |
| `claude-opus-4-6`      | Claude Opus 4.6            |
| `claude-sonnet-4-6`    | Claude Sonnet 4.6          |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5      |

The default model is `claude-sonnet-4-6`.

### Codex (OpenAI)

Codex runs in full-auto execution mode:

```
codex exec --full-auto --skip-git-repo-check
```

**Requirements:**
- The `codex` CLI must be installed and available on your PATH
- An OpenAI API key must be available (typically via the `OPENAI_API_KEY` environment variable)

**Supported models:**

| Model Alias            | Description                |
|------------------------|----------------------------|
| `gpt-5.3-codex`       | GPT-5.3 Codex              |
| `gpt-5.3-codex-spark` | GPT-5.3 Codex Spark        |
| `gpt-5.2-codex`       | GPT-5.2 Codex              |
| `gpt-5.1-codex-max`   | GPT-5.1 Codex Max          |
| `gpt-5.1-codex`       | GPT-5.1 Codex              |
| `gpt-5.1-codex-mini`  | GPT-5.1 Codex Mini         |
| `gpt-5-codex`         | GPT-5 Codex                |
| `codex-mini-latest`   | Codex Mini (latest)        |

---

## Configuration

### Setting the Model

```bash
# Use Claude Opus
locus config set ai.model opus

# Use Claude Sonnet (default)
locus config set ai.model claude-sonnet-4-6

# Use Codex
locus config set ai.model gpt-5.1-codex
```

When you set the model, Locus automatically infers the correct provider. For example, setting the model to `opus` automatically sets the provider to `claude`. Setting it to `gpt-5.1-codex` automatically sets the provider to `codex`.

### Per-Command Override

You can override the model for a single run without changing your configuration:

```bash
# Run with a specific model
locus run --model sonnet

# Run a single issue with a different model
locus run 42 --model opus
```

The `--model` flag takes precedence over the configured model for that execution only.

---

## Automatic Provider Inference

Locus infers the provider from the model name using these rules:

1. If the model is in the known Claude model list, the provider is `claude`
2. If the model is in the known Codex model list, the provider is `codex`
3. If the model name starts with `claude-`, the provider is `claude`
4. If the model name contains `codex`, the provider is `codex`

This means you rarely need to set `ai.provider` directly -- setting `ai.model` is sufficient.

---

## Environment Variables

AI provider authentication is handled through environment variables, not through Locus configuration.

### Claude

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Alternatively, the Claude CLI supports its own authentication methods (e.g., `claude auth login`). Locus does not manage Claude authentication -- it relies on the `claude` CLI being properly configured.

### Codex

```bash
export OPENAI_API_KEY="sk-..."
```

---

## How Execution Works

When Locus needs to run an AI task, it follows this sequence:

1. **Create runner** -- Instantiates a `ClaudeRunner` or `CodexRunner` based on the resolved provider.

2. **Check availability** -- Verifies the CLI is installed by running `claude --version` or `codex --version`. If the CLI is not found, execution fails with a clear error message.

3. **Spawn process** -- Spawns the CLI as a child process with the appropriate flags, working directory set to the project root (or worktree path for standalone issues).

4. **Send prompt** -- Writes the assembled prompt to the process's stdin and closes the stream. The prompt includes system context, task details, sprint context, repository structure, and execution rules.

5. **Stream output** -- Reads stdout in real time, displaying a streaming markdown renderer in the terminal. The thinking indicator switches from "Thinking..." to showing output as soon as the first chunk arrives.

6. **Handle completion** -- On exit code 0, the task is marked as successful. On non-zero exit, the stderr output is captured as the error message.

7. **Support interruption** -- If the user presses ESC or Ctrl+C, Locus sends SIGTERM to the process. If the process does not exit within 3 seconds, SIGKILL is sent.

---

## Config File Structure

The AI configuration lives in `.locus/config.json`:

```json
{
  "version": "3.0.0",
  "ai": {
    "provider": "claude",
    "model": "claude-sonnet-4-6"
  }
}
```

### Default Configuration

| Key            | Default              | Description                    |
|----------------|----------------------|--------------------------------|
| `ai.provider`  | `claude`             | AI provider (`claude` or `codex`) |
| `ai.model`     | `claude-sonnet-4-6`  | Model identifier               |

---

## Checking Provider Status

To verify your AI provider is properly configured:

```bash
# Check Claude CLI
claude --version

# Check Codex CLI
codex --version
```

If either command fails, install the missing CLI before running Locus. Locus checks availability before every execution and provides a clear error if the required CLI is not installed.
