---
title: "Usage with Codex"
description: "Instructions for running the Locus Agent using the Codex CLI."
---

Locus uses the Codex CLI as one of the terminal agent providers. This provides specialized capabilities for code generation and advanced programming tasks.

## Prerequisites

To use Codex with Locus, install the Codex CLI and make sure you are logged in.

1. Install the Codex CLI.
2. Run `codex` once to complete login.


## Running the Agent

To start the agent using Codex, run:

```bash
locus run --provider codex
```

If you haven't set your Locus credentials in the environment, pass them explicitly:

```bash
locus run --provider codex --api-key <YOUR_KEY>
```

### Custom Model Selection

By default, Locus uses `gpt-5.3-codex-mini`. You can specify a different Codex model if needed:

```bash
locus run --provider codex --model gpt-5.2-codex
```
