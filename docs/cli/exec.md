---
description: Interactive REPL and one-shot AI execution with session management, slash commands, and VSCode integration.
---

# locus exec

Start an interactive AI coding session (REPL) or execute a one-shot prompt. Sessions are persisted locally so you can resume previous conversations.

**Alias:** `locus e`

## Usage

```bash
locus exec                           # Interactive REPL
locus exec "<prompt>"                # One-shot mode
locus exec -s <session-id>          # Resume a session
locus exec sessions <subcommand>    # Manage sessions
locus exec --json-stream "<prompt>" # NDJSON mode for VSCode
```

---

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--session-id` | `-s` | Resume a previous session by ID |
| `--json-stream` | | Output NDJSON events (for VSCode extension integration) |

---

## Modes

### Interactive REPL (default)

When called with no arguments, starts an interactive read-eval-print loop. Type prompts, see AI responses streamed in real time, and use slash commands for session control.

```bash
locus exec
```

The REPL provides:

- Multi-line input support
- Tab completion for slash commands
- Session auto-save
- Full project context (reads `LOCUS.md`, `LEARNINGS.md`, and repository state)

### One-Shot Mode

Pass a prompt string to execute a single AI task without entering the REPL.

```bash
locus exec "Add input validation to the signup endpoint"
locus exec "Refactor the database connection pool for better error handling"
```

### Resume Session

Resume a previously saved session to continue where you left off, preserving full conversation history.

```bash
locus exec -s abc123def456
```

---

## Slash Commands

Inside the interactive REPL, the following slash commands are available:

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `/h`, `/?` | Show available commands |
| `/clear` | `/cls` | Clear the terminal screen |
| `/reset` | `/r` | Reset conversation context (starts fresh) |
| `/history` | `/hist` | Show recent input history |
| `/session` | `/sid` | Show current session info (ID, provider, tokens, messages) |
| `/model` | `/m` | Switch AI model (e.g., `/model claude-sonnet-4-6`) |
| `/provider` | `/p` | Switch AI provider (`claude` or `codex`) |
| `/diff` | `/d` | Show cumulative `git diff` of all changes in the session |
| `/undo` | `/u` | Revert all unstaged git changes |
| `/save` | | Force-save the current session |
| `/exit` | `/quit`, `/q` | Exit the REPL |

---

## Session Management

Sessions are stored in `.locus/sessions/` and can be managed with subcommands.

### List sessions

```bash
locus exec sessions list
```

Displays session ID (truncated), age, message count, and provider/model.

### Show session details

```bash
locus exec sessions show <id>
```

Displays creation time, update time, provider, model, message count, token usage, and the last 10 messages.

### Delete a session

```bash
locus exec sessions delete <id>
```

---

## JSON Stream Mode

For integration with the Locus VSCode extension, `--json-stream` outputs NDJSON events on stdout.

```bash
locus exec --json-stream "Fix the failing tests"
locus exec --json-stream -s <session-id> "Continue implementing the feature"
```

Events emitted:

| Event Type | Description |
|------------|-------------|
| `start` | Session started, includes session ID |
| `status` | State change: `thinking` or `working` |
| `text_delta` | Incremental text output from the AI |
| `done` | Execution complete with stats (duration, tools, tokens) |
| `error` | Error occurred, includes message and `retryable` flag |

---

## Examples

```bash
# Start interactive session
locus exec

# One-shot task
locus exec "Add rate limiting middleware to the Express app"

# Resume a session
locus exec -s m1abc2

# List all sessions
locus exec sessions list

# Show session details
locus exec sessions show m1abc2

# Delete old session
locus exec sessions delete m1abc2
```
