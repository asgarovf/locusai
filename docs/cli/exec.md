---
description: Execute AI prompts with full repository context.
---

# exec

Run one-off prompts or interactive sessions with your AI provider, enriched with your project's context.

---

## One-Shot Execution

```bash
locus exec "<your prompt>"
```

**Example:**

```bash
locus exec "add input validation to the signup form"
```

Locus builds context from your project (codebase index, documents, instructions) and sends it along with your prompt to the AI provider.

---

## Interactive Mode

Start a multi-turn REPL session:

```bash
locus exec -i
```

Or resume a previous session:

```bash
locus exec -s <session-id>
```

{% hint style="info" %}
Interactive mode keeps conversation history, so the AI remembers previous messages in the session.
{% endhint %}

---

## Session Management

Locus saves your exec sessions for later reference.

```bash
# List recent sessions
locus exec sessions list

# View a session's conversation
locus exec sessions show <session-id>

# Delete a specific session
locus exec sessions delete <session-id>

# Clear all sessions
locus exec sessions clear
```

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--interactive`, `-i` | Start interactive REPL mode | `false` |
| `--session`, `-s <id>` | Resume a previous session | — |
| `--model <MODEL>` | AI model | From config |
| `--provider <PROVIDER>` | AI provider | From config |
| `--no-stream` | Disable streaming output | `false` |
| `--no-status` | Disable status indicators | `false` |
| `--dir <PATH>` | Project directory | Current directory |

---

## Examples

```bash
# Quick question
locus exec "explain how the auth middleware works"

# Code change
locus exec "refactor the database queries to use connection pooling"

# Interactive session
locus exec -i

# Resume a session
locus exec -s abc123
```
