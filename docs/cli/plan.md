---
description: AI-powered sprint planning. Break down a goal into structured GitHub issues with execution order, priorities, and types.
---

# locus plan

Use AI to break down a high-level goal into actionable GitHub issues. The AI analyzes your project context (from `LOCUS.md` and `LEARNINGS.md`) and generates structured issues with titles, descriptions, priorities, types, dependencies, and execution order.

## Usage

```bash
locus plan "<directive>" [options]
locus plan --from-issues --sprint "<name>" [options]
```

---

## Options

| Flag | Description |
|------|-------------|
| `--sprint <name>` | Assign generated issues to this sprint (creates the milestone if it does not exist) |
| `--from-issues` | Organize existing open issues in a sprint instead of creating new ones (requires `--sprint`) |
| `--dry-run` | Show the plan without creating issues or updating labels |
| `--model <name>` | Override the AI model for this command |

---

## Modes

### AI Planning (default)

Pass a natural-language directive describing what you want to build. The AI generates a set of issues ordered by dependency.

```bash
locus plan "Build user authentication with OAuth"
locus plan "Improve API performance" --sprint "Sprint 3"
locus plan "Add dark mode support" --dry-run
```

The AI prompt includes:

- Your project context from `.locus/LOCUS.md`
- Past learnings from `.locus/LEARNINGS.md`
- Instructions to produce independently executable issues with acceptance criteria

Each generated issue receives:

- A `p:<priority>` label (critical, high, medium, low)
- A `type:<type>` label (feature, bug, chore, refactor, docs)
- A `locus:queued` status label
- An `agent:managed` label
- An `order:N` label for execution sequencing

### From Existing Issues

Organize issues already in a sprint. The AI reads the issues and suggests an optimal execution order based on dependencies.

```bash
locus plan --from-issues --sprint "Sprint 2"
locus plan --from-issues --sprint "Sprint 2" --dry-run
```

This mode updates `order:N` labels on existing issues without creating new ones.

---

## Examples

```bash
# AI creates issues from a goal
locus plan "Build a REST API for user management"

# AI creates issues and assigns them to a sprint
locus plan "Implement real-time notifications" --sprint "Sprint 4"

# Preview the plan without creating anything
locus plan "Migrate database to PostgreSQL" --dry-run

# Organize existing sprint issues into optimal order
locus plan --from-issues --sprint "Sprint 2"
```

---

## How It Works

1. The AI receives your directive along with project context.
2. It generates structured issue blocks with ORDER, TITLE, PRIORITY, TYPE, DEPENDS_ON, and BODY fields.
3. Locus parses these blocks and displays the plan as a table.
4. Unless `--dry-run` is specified, the issues are created on GitHub with appropriate labels and milestone assignment.
5. If `--sprint` is specified and the milestone does not exist, it is created automatically. If it exists but is closed, it is reopened.
