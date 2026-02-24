# Locus AI for Visual Studio Code

**GitHub-native AI sprint execution — right inside your editor.**

Locus AI brings AI-powered coding, task execution, and project context into VS Code. Chat with AI agents, execute tasks, and review code without leaving your editor.

> **Preview** — This extension is in active development. Expect new features and improvements with each release.

## Features

### Chat Panel

A dedicated sidebar panel for conversing with AI agents. Ask questions, request code changes, and get explanations — all with full workspace context.

- Streaming responses with rich markdown rendering
- Syntax-highlighted code blocks
- Session history with resume support

### Explain Selection

Highlight any code and get an instant AI-powered explanation. Available from the right-click context menu or via keyboard shortcut.

### Task Execution

Run tasks directly from VS Code. The extension spawns the Locus CLI locally — your code never leaves your machine.

### Session Management

Create, resume, and switch between sessions. Sessions persist across editor restarts so you never lose context.

### Tool Visualization

Watch the AI agent work in real time. The chat panel displays tool calls (file reads, writes, edits, shell commands, searches) with color-coded cards showing what the agent is doing.

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| **Locus: Open Chat** | `Cmd+Shift+L` | Open the Locus AI chat panel |
| **Locus: New Session** | `Cmd+Shift+N` | Start a new chat session |
| **Locus: Stop Session** | `Escape` | Stop the current session |
| **Locus: Explain Selection** | `Cmd+Shift+E` | Explain the selected code |
| **Locus: Run Exec Task** | — | Execute a task with AI |
| **Locus: Resume Last Session** | — | Resume an interrupted session |

> On Windows/Linux, replace `Cmd` with `Ctrl`.

## Requirements

- **Locus CLI** — Install with `npm install -g @locusai/cli`
- **GitHub CLI** (`gh`) — Install from [cli.github.com](https://cli.github.com) and authenticate with `gh auth login`
- **AI Agent CLI** — Either [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) or [OpenAI Codex](https://openai.com/index/codex/)
- **VS Code 1.85+**

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `locusai.cliBinaryPath` | *(empty)* | Path to the Locus CLI binary. Leave empty to use `locus` from PATH |
| `locusai.defaultModel` | *(empty)* | Default AI model for new sessions. Leave empty to use the CLI default |
| `locusai.execution.confirmBeforeRun` | `true` | Require confirmation before running exec tasks |

## Getting Started

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=locusai.locusai-vscode) or [Open VSX](https://open-vsx.org/extension/locusai/locusai-vscode)
2. Install the Locus CLI: `npm install -g @locusai/cli`
3. Install and authenticate GitHub CLI: `gh auth login`
4. Initialize your project: `locus init`
5. Open the chat panel with `Cmd+Shift+L` and start a conversation

## Privacy & Security

Locus is fully local and GitHub-native. All AI agents run on your machine, and project state is stored in GitHub (issues, milestones, PRs). No cloud servers, no accounts, no data leaves your infrastructure.

## Links

- [Documentation](https://locusai.dev/docs)
- [GitHub](https://github.com/asgarovf/locusai)
- [Changelog](CHANGELOG.md)
- [Report an Issue](https://github.com/asgarovf/locusai/issues)

## License

[MIT](LICENSE)
