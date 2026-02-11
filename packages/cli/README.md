# @locusai/cli

Command-line interface for [Locus](https://locusai.dev) - an AI-native project management platform for engineering teams.

## Installation

```bash
npm install -g @locusai/cli
```

Or with other package managers:

```bash
# pnpm
pnpm add -g @locusai/cli

# yarn
yarn global add @locusai/cli

# bun
bun add -g @locusai/cli
```

## Quick Start

```bash
# Initialize Locus in your project
locus init

# Index your codebase for AI context
locus index

# Run an agent to work on tasks
locus run --api-key YOUR_API_KEY

# Execute a prompt with repository context
locus exec "Explain the authentication flow"
```

## Commands

### `locus init`

Initialize Locus in the current directory. Creates the necessary configuration files and directory structure:

- `.locus/` - Configuration directory
- `.locus/config.json` - Project settings
- `.locus/LOCUS.md` - AI agent instructions

Running `init` on an already initialized project will update the configuration to the latest version.

### `locus index`

Index the codebase for AI context. This analyzes your project structure and creates a searchable index that helps AI agents understand your codebase.

```bash
locus index [options]

Options:
  --dir <path>      Project directory (default: current directory)
  --model <name>    AI model to use
  --provider <name> AI provider: claude or codex (default: claude)
```

### `locus run`

Start an agent to work on tasks from your Locus workspace.

```bash
locus run [options]

Options:
  --api-key <key>     Your Locus API key (required)
  --workspace <id>    Workspace ID to connect to
  --sprint <id>       Sprint ID to work on
  --model <name>      AI model to use
  --provider <name>   AI provider: claude or codex (default: claude)
  --api-url <url>     Custom API URL
  --dir <path>        Project directory (default: current directory)
  --skip-planning     Skip the planning phase
```

### `locus exec`

Run a prompt with repository context. Supports both single execution and interactive REPL mode.

```bash
locus exec "your prompt" [options]
locus exec --interactive [options]

Options:
  --interactive, -i   Start interactive REPL mode
  --session, -s <id>  Resume a previous session
  --model <name>      AI model to use
  --provider <name>   AI provider: claude or codex (default: claude)
  --dir <path>        Project directory (default: current directory)
  --no-stream         Disable streaming output
  --no-status         Disable status display
```

#### Session Management

Manage your exec sessions with these subcommands:

```bash
# List recent sessions
locus exec sessions list

# Show messages from a session
locus exec sessions show <session-id>

# Delete a session
locus exec sessions delete <session-id>

# Clear all sessions
locus exec sessions clear
```

## Configuration

Locus stores its configuration in the `.locus/` directory within your project:

- `config.json` - Project settings including workspace ID and version
- `codebase-index.json` - Indexed codebase structure

The `.locus/LOCUS.md` file provides AI instructions and context that agents use when working on your codebase.

## AI Providers

Locus supports multiple AI providers:

- **Claude** (default) - Anthropic's Claude models
- **Codex** - OpenAI Codex models

Specify the provider with the `--provider` flag:

```bash
locus exec "your prompt" --provider codex
locus run --api-key YOUR_KEY --provider claude
```

## Requirements

- Node.js 18 or later
- A Locus API key (for `run` command)

## Links

- [Documentation](https://docs.locusai.dev)
- [Website](https://locusai.dev)

## License

MIT
