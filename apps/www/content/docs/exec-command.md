---
title: Exec Command
description: Execute AI prompts with full repository context directly from the terminal
---

The `exec` command lets you run AI prompts with full repository context directly from your terminal. It's the fastest way to leverage AI for one-off tasks without creating formal tasks in the Locus Cloud.

## Quick Start

```bash
# Single prompt execution
locus exec "explain how the authentication system works"

# Interactive mode for multi-turn conversations
locus exec --interactive
locus exec -i

# Resume a previous session
locus exec -i --session <session-id>
```

## Command Syntax

```bash
locus exec [prompt] [options]
locus exec sessions <subcommand> [args]
```

## Options

| Option | Shorthand | Description |
|--------|-----------|-------------|
| `--provider <name>` | | AI provider to use (`claude` or `codex`, default: `claude`) |
| `--model <name>` | | Model override for the chosen provider |
| `--dir <path>` | | Directory context for execution (default: current directory) |
| `--no-stream` | | Disable streaming output |
| `--interactive` | `-i` | Start interactive REPL session |
| `--session <id>` | `-s` | Resume an existing session |

---

## Execution Modes

### Single Execution Mode

The default mode runs a single prompt and returns the result:

```bash
locus exec "refactor the UserService class to use dependency injection"
```

**What happens:**

1. Gathers project context (CLAUDE.md, README.md, project structure, available skills)
2. Includes the codebase index if available
3. Sends your prompt with all context to the AI
4. Streams the response with real-time tool execution
5. Shows execution summary when complete

<Tip>
Single execution mode is ideal for quick, self-contained tasks like asking questions, generating code, or performing refactors.
</Tip>

### Interactive Mode

Start a REPL session for multi-turn conversations:

```bash
locus exec --interactive
# or
locus exec -i
```

**Features:**

- Maintains conversation history across multiple prompts
- Context from previous messages is preserved
- Natural language references work ("update the function we just discussed")
- Sessions are automatically saved for later resumption

**In the REPL:**

- Type your prompts and press Enter
- Use `/help` for available commands
- Use `/exit` or Ctrl+C to exit
- Sessions are saved automatically

### Resuming Sessions

Continue a previous conversation:

```bash
# Resume by session ID (supports partial matching)
locus exec -i --session e7f3a2b1
locus exec -i -s e7f3a2b1
```

---

## Session Management

The exec command includes a complete session management system for tracking and managing your conversation history.

### List Sessions

View your recent exec sessions:

```bash
locus exec sessions list
```

Output shows:
- Short session ID (first 8 characters)
- Preview of the first prompt
- Message count
- Relative timestamp

### Show Session

View the full conversation of a session:

```bash
locus exec sessions show <session-id>
```

Displays:
- Full session ID
- Creation timestamp
- Model and provider used
- Complete conversation history

### Delete Session

Remove a specific session:

```bash
locus exec sessions delete <session-id>
```

### Clear All Sessions

Remove all saved sessions:

```bash
locus exec sessions clear
```

<Note>
Session IDs support partial matching. You only need to provide the first 8 characters to identify a session.
</Note>

---

## Repository Context

The exec command automatically gathers rich context about your project:

| Context Type | Source | Description |
|--------------|--------|-------------|
| Project Instructions | `CLAUDE.md` | Custom instructions and guidelines |
| Documentation | `README.md` | Project description and setup |
| Codebase Index | `.locus/codebase-index.json` | Semantic map of your code |
| Project Structure | Directory analysis | File tree and organization |
| Available Skills | `.locus/skills/` | Specialized agent capabilities |

This context is automatically included with every prompt, giving the AI comprehensive understanding of your codebase.

---

## Streaming Output

By default, exec streams output in real-time with rich progress display:

**What you'll see:**

- **Thinking indicators** - Shows when the AI is processing
- **Tool execution** - Real-time display of tool operations (file reads, writes, bash commands)
- **Text streaming** - Response text appears as it's generated
- **Execution summary** - Final stats on tools used and time taken

To disable streaming:

```bash
locus exec "your prompt" --no-stream
```

---

## Tool Execution

The AI can execute various tools during prompt execution:

| Tool | Description |
|------|-------------|
| `read` | Read file contents |
| `write` | Create or overwrite files |
| `edit` | Modify existing files |
| `bash` | Execute shell commands |
| `grep` | Search file contents |
| `glob` | Find files by pattern |
| `web-fetch` | Fetch web content |
| `task` | Spawn sub-agents |

All tool executions are shown in real-time during streaming mode.

<Important>
Tool executions modify your filesystem. The AI will create, edit, and delete files as needed to complete your task. Review the output carefully.
</Important>

---

## Examples

### Code Understanding

```bash
# Explain a complex function
locus exec "explain how the payment processing works in PaymentService.ts"

# Find where something is implemented
locus exec "where is the user authentication logic?"

# Understand architecture
locus exec "describe the overall architecture of this project"
```

### Code Generation

```bash
# Generate new code
locus exec "create a new React component for displaying user profiles"

# Add tests
locus exec "write unit tests for the OrderService class"

# Generate types
locus exec "add TypeScript types to the utils/helpers.js file"
```

### Refactoring

```bash
# Refactor code
locus exec "refactor the database queries to use connection pooling"

# Fix issues
locus exec "fix the memory leak in the WebSocket handler"

# Improve code quality
locus exec "apply SOLID principles to the UserController"
```

### Interactive Workflows

```bash
# Start interactive session for complex tasks
locus exec -i

> explain the current state of the authentication system
> now add refresh token support
> can you also add rate limiting to the token endpoint?
> /exit
```

---

## Configuration

### Provider Selection

Choose between AI providers:

```bash
# Use Claude (default)
locus exec "your prompt" --provider claude

# Use Codex
locus exec "your prompt" --provider codex
```

### Model Override

Specify a different model:

```bash
locus exec "your prompt" --model opus
locus exec "your prompt" --model gpt-4
```

### Custom Directory

Run exec in a different directory:

```bash
locus exec "your prompt" --dir /path/to/project
```

---

## Best Practices

1. **Be specific** - Clear, detailed prompts get better results
2. **Use interactive mode** - For multi-step tasks or explorations
3. **Resume sessions** - Don't repeat context, resume where you left off
4. **Review changes** - Always review file modifications before committing
5. **Leverage context** - The AI knows your project structure, use it

<Tip>
For complex multi-step tasks, start with `locus exec -i` to have a conversation with the AI. You can iterate on solutions and ask follow-up questions naturally.
</Tip>

---

## Troubleshooting

### "Locus is not initialized"

Run `locus init` first to set up Locus in your project.

### Session not found

Use `locus exec sessions list` to see available sessions. Session IDs support partial matching (first 8 characters).

### Slow execution

- Ensure your codebase is indexed: `locus index`
- Use `--no-stream` for faster output if you don't need real-time updates
- Consider using a faster model for simple tasks
