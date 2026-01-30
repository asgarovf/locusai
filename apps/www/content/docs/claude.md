---
title: "Usage with Claude"
description: "Instructions for running the Locus Agent using the Claude CLI."
---

Locus uses the Claude CLI as one of the terminal agent providers. This provides a balance of high-reasoning capability and coding proficiency.

## Prerequisites

To use Claude with Locus, install the Claude CLI and make sure you are logged in.

1. Install the Claude CLI.
2. Run `claude` once to complete login.


## Running the Agent

To start the agent using Claude (default behavior), run:

```bash
locus run
```

If you haven't set your Locus credentials in the environment, pass them explicitly:

```bash
locus run --api-key <YOUR_KEY>
```

### Custom Model Selection

By default, Locus uses `sonnet`. You can specify a different Claude model if needed:

```bash
locus run --model opus
```
