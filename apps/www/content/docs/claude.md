---
title: "Usage with Claude"
description: "Instructions for running the Locus Agent using Anthropic's Claude models."
---

Locus currently uses Anthropic's Claude 3.5 Sonnet as its primary driver for the terminal agent. This provides a balance of high-reasoning capability and coding proficiency.

## Prerequisites

To use Claude with Locus, you need an Anthropic API Key.

1. Get your API Key from the [Anthropic Console](https://console.anthropic.com/).
2. Set it in your environment or pass it as a flag.


## Running the Agent

To start the agent using Claude (default behavior), run:

```bash
locus run
```

If you haven't set your Locus credentials in the environment, pass them explicitly:

```bash
locus run --api-key <YOUR_KEY> --workspace <YOUR_WORKSPACE_ID>
```

### Custom Model Selection

By default, Locus uses `sonnet`. You can specify a different Claude model if needed:

```bash
locus run --model opus
```

### Other options

If you prefer some middle step optimizations, you can pass the Anthropic key to improve your agent's experience. However, these paramters are not well tested and should be used carefully.

```bash
locus run --anthropic-api-key <YOUR_ANTHROPIC_KEY>
```
