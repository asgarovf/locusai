---
description: Start interactive AI discussions with structured insight extraction.
---

# discuss

Start an interactive AI discussion on any topic with full project context. The system extracts structured insights — decisions, requirements, ideas, concerns, and learnings — as the conversation progresses.

```bash
locus discuss "topic"
```

---

## How It Works

1. Starts a REPL-style conversation with AI on the given topic
2. Injects project context (codebase structure, documents, instructions)
3. AI responds with informed analysis based on your project
4. Insights are automatically extracted from the conversation
5. The discussion is saved locally for future reference

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `"topic"` | Start a new discussion on the given topic | — |
| `--list` | List all discussions | — |
| `--show <id>` | Show a discussion's details | — |
| `--archive <id>` | Archive a discussion | — |
| `--delete <id>` | Delete a discussion | — |
| `--model <MODEL>` | AI model to use | From config |
| `--provider <PROVIDER>` | AI provider (`claude` or `codex`) | From config |
| `--reasoning-effort <LEVEL>` | Reasoning level (`low`, `medium`, `high`) | — |
| `--dir <PATH>` | Project directory | Current directory |

---

## REPL Commands

While in a discussion, you can use these special commands:

| Command | Description |
|---------|-------------|
| `summary` | Generate a final summary and end the discussion |
| `insights` | Show all extracted insights so far |
| `exit` / `quit` | Save and exit the discussion |
| `help` | Show available REPL commands |

---

## Examples

```bash
# Start a discussion about architecture
locus discuss "How should we handle authentication tokens?"

# List all discussions
locus discuss --list

# Show a specific discussion
locus discuss --show disc-1708300000

# Archive a discussion
locus discuss --archive disc-1708300000

# Delete a discussion
locus discuss --delete disc-1708300000
```

---

## Insight Types

The system extracts five types of insights from discussions:

| Type | Description |
|------|-------------|
| **Decisions** | Choices made during the discussion (e.g., "Use JWT over session cookies") |
| **Requirements** | Functional or technical requirements identified |
| **Ideas** | Potential approaches or features to explore |
| **Concerns** | Risks, trade-offs, or potential issues raised |
| **Learnings** | Knowledge gained or patterns discovered |

---

## What Gets Saved

Discussions are saved locally in the `.locus/` directory. Each discussion includes:

* The full conversation thread (your messages and AI responses)
* All extracted insights with their types
* A generated summary (if you run the `summary` command)
* Metadata (topic, timestamps, model used)

{% hint style="info" %}
Discussions are local-only — they are not synced to the cloud. Use `--list` to see all saved discussions.
{% endhint %}
