---
description: Manage GitHub issues as work items. Create, list, show, label, and close issues with structured priority, type, and sprint labels.
---

# locus issue

Manage GitHub issues as Locus work items. Issues are the primary unit of work in Locus. Each issue can have a priority, type, status, sprint assignment, and execution order.

**Alias:** `locus i`

## Usage

```bash
locus issue <subcommand> [options]
```

If no subcommand is provided, `list` is used by default.

---

## Subcommands

### create (c)

Create a new GitHub issue using AI. Describe the task in plain language and the AI generates a structured issue — title, detailed description, priority, and type — which you can review and confirm before it is posted to GitHub.

```bash
locus issue create [description] [options]
```

If `description` is omitted, you are prompted to enter it interactively.

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--sprint` | `-s` | Assign to a sprint (milestone name) |

The AI selects the appropriate priority (`critical`, `high`, `medium`, `low`) and type (`feature`, `bug`, `chore`, `refactor`, `docs`) from the description. Every created issue automatically receives the `agent:managed` and `locus:queued` labels.

**Flow:**

1. Provide a plain-language description of the task
2. AI generates a title, body, priority, and type
3. A preview is shown for review
4. Confirm with `Y` to post the issue to GitHub

**Examples:**

```bash
# Pass the description directly
locus issue create "Add dark mode support to settings page"

# Assign to a sprint at creation time
locus issue create "Fix broken pagination on user list" --sprint "Sprint 2"

# Prompt interactively
locus issue create
```

---

### list (ls)

List issues with optional filters. This is the default subcommand.

```bash
locus issue list [options]
locus issue              # Same as 'locus issue list'
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--sprint` | `-s` | Filter by sprint (milestone name) |
| `--priority` | `-p` | Filter by priority (`critical`, `high`, `medium`, `low`) |
| `--status` | | Filter by Locus status (`queued`, `in-progress`, `in-review`, `done`, `failed`) |
| `--state` | | GitHub state: `open`, `closed`, `all` (default: `open`) |
| `--mine` | `-m` | Show only issues assigned to you |
| `--label` | `-l` | Filter by a custom label |
| `--limit` | `-n` | Maximum number of results (default: 50) |

**Examples:**

```bash
locus issue list --sprint "Sprint 1" --status queued
locus issue list --priority high --mine
locus issue list --state all --limit 100
locus i ls -s "Sprint 2" -p critical
```

---

### show

Show detailed information about a single issue.

```bash
locus issue show <number>
locus issue <number>       # Shorthand
```

Displays title, state, priority, type, status, sprint, assignees, execution order, labels, creation date, and URL. If the issue has a body, it is printed below the metadata.

**Examples:**

```bash
locus issue show 42
locus issue 42             # Same as 'show 42'
```

---

### label

Bulk-update labels or sprint assignment on one or more issues.

```bash
locus issue label <numbers...> [options]
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--sprint` | `-s` | Assign issues to a sprint (milestone) |
| `--priority` | `-p` | Set priority (replaces existing priority label) |
| `--type` | `-t` | Set type (replaces existing type label) |
| `--status` | | Set Locus status (replaces existing status label) |

When setting priority, type, or status, conflicting labels of the same category are automatically removed.

**Examples:**

```bash
locus issue label 42 43 44 --sprint "Sprint 2"
locus issue label 42 --priority high
locus issue label 17 18 --status queued --type feature
```

---

### close

Close an issue.

```bash
locus issue close <number> [--reason <reason>]
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--reason` | `-r` | Close reason: `completed` (default) or `not_planned` |

**Examples:**

```bash
locus issue close 42
locus issue close 42 --reason not_planned
```

---

## Label System

Locus uses a structured label system on GitHub issues:

| Category | Prefix | Values |
|----------|--------|--------|
| Priority | `p:` | `critical`, `high`, `medium`, `low` |
| Type | `type:` | `feature`, `bug`, `chore`, `refactor`, `docs` |
| Status | `locus:` | `queued`, `in-progress`, `in-review`, `done`, `failed` |
| Order | `order:` | Numeric execution order within a sprint |
| Agent | `agent:` | `managed` (indicates Locus-managed issue) |
