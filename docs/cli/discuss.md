---
description: AI-powered architectural discussions. Start discussions on technical topics, get structured analysis, and save for future reference.
---

# locus discuss

Start an AI-powered architectural discussion. Provide a technical topic or question and the AI produces a structured analysis covering options, trade-offs, and a recommendation grounded in your project context.

Discussions are saved locally as markdown files in `.locus/discussions/`.

## Usage

```bash
locus discuss "<topic>"          # Start a new discussion
locus discuss list               # List all discussions
locus discuss show <id>          # Show a discussion
locus discuss delete <id>        # Delete a discussion
```

---

## Options

| Flag | Description |
|------|-------------|
| `--model <name>` | Override the AI model for this discussion |

---

## Subcommands

### Start a Discussion

Pass a question or topic as a string. The AI analyzes it using your project context from `LOCUS.md` and `LEARNINGS.md`.

```bash
locus discuss "Should we use Redis or in-memory caching?"
locus discuss "Monorepo vs polyrepo for our microservices"
```

The AI provides a structured analysis covering:

1. **Context** -- restates the problem and why it matters
2. **Options** -- all viable approaches with pros and cons
3. **Recommendation** -- the suggested approach with reasoning
4. **Trade-offs** -- what is gained and what is sacrificed
5. **Implementation Notes** -- key technical considerations
6. **Decision** -- a clear, actionable conclusion

### List Discussions

View all saved discussions with their IDs, titles, and dates.

```bash
locus discuss list
```

### Show a Discussion

Display the full content of a discussion. Supports partial ID matching.

```bash
locus discuss show abc123
locus discuss show m1a      # Partial ID match
```

### Delete a Discussion

Remove a discussion by ID. Supports partial ID matching.

```bash
locus discuss delete abc123
```

---

## Storage

Each discussion is saved as a markdown file in `.locus/discussions/` with:

- A unique ID (timestamp-based)
- The topic as a heading
- Date and provider/model metadata
- The full AI analysis

---

## Examples

```bash
# Start a discussion about caching strategy
locus discuss "Should we use Redis or in-memory caching?"

# Discuss authentication approaches
locus discuss "JWT vs session cookies for our API auth"

# Use a specific model for the discussion
locus discuss "How to structure our GraphQL schema" --model claude-sonnet-4-6

# List all discussions
locus discuss list

# Read a discussion
locus discuss show m1abc2

# Clean up old discussions
locus discuss delete m1abc2
```
