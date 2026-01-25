---
title: "Local Terminal Agent"
description: "Run Locus as a standalone agent in your terminal using Claude or other local LLMs."
---

If you prefer working continuously in the terminal or want to use Locus without an MCP-enabled editor, you can run the Locus Agent directly from your command line.

## Overview

The Local Terminal Agent runs as a standalone process. It:
1. Connects to your Locus Workspace.
2. Pulls the active Sprint and assigned Tasks.
3. Uses an authorized LLM to plan and execute code changes autonomously.
4. Reports progress back to the dashboard.

## Supported Models

Locus supports multiple LLM providers to drive the terminal agent. Select your provider for specific setup instructions:

- **[Anthropic Claude](/docs/claude)** (Default & Recommended)
- **[OpenAI Codex](/docs/codex)** (Coming Soon)

## Workflow

1. **Planning**: The agent reads the task description and creates an implementation plan.
2. **Execution**: It iteratively writes code, runs commands, and checks files.
3. **Review**: Once complete, it marks the task as "In Review" or "Done" on the dashboard.
4. **Next Task**: The agent automatically picks up the next task in the queue unless stopped.

## Comparison: MCP vs Terminal Agent

| Feature | MCP Integration | Terminal Agent |
|---------|-----------------|----------------|
| **Interface** | Inside Editor (Cursor, VSCode) | System Terminal |
| **Context** | Shared with Editor (Open Files) | File System Only |
| **Interaction** | Chat-based guidance | Autonomous Loop |
| **Best For** | Pair Programming | Background Execution |

## Future Updates
- **Local Model Support**: Running Locus with local models (e.g., Llama 3 via Ollama).
- **Interactive Mode**: A purely text-based interactive session within the terminal.