---
description: Get started with the Locus VSCode extension.
---

# VSCode Extension

The Locus VSCode extension brings AI agent capabilities directly into your editor. Chat with AI, explain code selections, and run exec tasks — all without leaving VSCode.

---

## Installation

### From Source

1. Clone the Locus repository
2. Build the extension: `cd packages/vscode && npm run build`
3. Install the generated `.vsix` file in VSCode

### Prerequisites

The extension requires the Locus CLI to be installed and configured:

```bash
# Install the CLI
npm install -g @locusai/cli

# Initialize your project
cd your-project
locus init

# Configure your API key
locus config setup
```

---

## Getting Started

1. **Open the Locus chat view** from the VSCode sidebar
2. **Type a message** to start chatting with AI about your project
3. **Select code** and right-click to use "Explain Selection"
4. **Run exec tasks** directly from the chat interface

The extension communicates with the Locus CLI under the hood, using the same agent capabilities available from the terminal.

---

## Configuration

The extension uses your existing Locus CLI configuration from `.locus/settings.json`. No additional configuration is needed.

Settings that affect the extension:

| Setting | Description |
|---------|-------------|
| `provider` | AI provider (claude or codex) |
| `model` | AI model to use |
| `apiKey` | Your Locus API key |

---

## Architecture

The extension communicates with the CLI using a JSON stream protocol:

```
VSCode Extension → locus --json-stream --session-id <id> -- <prompt> → CLI
```

The CLI processes the request and streams structured JSON events back to the extension, which renders them in the chat view.

{% hint style="info" %}
The extension requires the Locus CLI to be installed globally (`npm install -g @locusai/cli`) and accessible in your PATH.
{% endhint %}
