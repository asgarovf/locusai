---
description: Complete reference for all Telegram bot commands.
---

# Command Reference

All commands are sent as messages in your Telegram chat with the bot.

---

## Planning Commands

### `/plan <directive>`

Start an AI planning meeting to create a sprint plan.

```
/plan implement user authentication with OAuth
```

Executes `locus plan` and posts the plan summary when complete.

---

### `/plans`

List all pending plans with their status.

```
/plans
```

---

### `/approve <plan-id>`

Approve a plan and create the sprint and tasks in your workspace.

```
/approve plan-abc123
```

---

### `/reject <plan-id> <feedback>`

Reject a plan with feedback. This triggers a new planning iteration that incorporates your feedback.

```
/reject plan-abc123 split the auth task into login and registration
```

---

### `/cancel <plan-id>`

Cancel a plan entirely.

```
/cancel plan-abc123
```

---

## Task Commands

### `/tasks`

List active tasks (IN\_PROGRESS, IN\_REVIEW, and BLOCKED).

```
/tasks
```

Shows task titles, statuses, IDs, and PR links.

{% hint style="info" %}
Requires a configured API key. The workspace is auto-resolved from the key.
{% endhint %}

---

### `/rejecttask <task-id> <feedback>`

Reject an IN\_REVIEW task and send it back to BACKLOG with feedback.

```
/rejecttask task-456 missing error handling for edge cases
```

The feedback is added as a comment on the task. The next agent run will pick it up and use the feedback.

---

## Execution Commands

### `/run`

Start the agent to execute sprint tasks sequentially.

```
/run
```

* Streams output to Telegram every 10 seconds
* Only one `/run` can be active at a time
* Use `/stop` to cancel

---

### `/exec <prompt>`

Execute a one-off AI prompt with project context.

```
/exec add validation to the login form
```

---

### `/stop`

Stop all running processes (active `/run`, `/plan`, or `/exec`).

```
/stop
```

---

## Git & GitHub Commands

### `/git <command>`

Run whitelisted git and GitHub CLI commands.

**Allowed git commands:**

| Command | Example |
|---------|---------|
| `status` | `/git status` |
| `log` | `/git log` |
| `diff` | `/git diff` |
| `diff --staged` | `/git diff --staged` |
| `branch` | `/git branch` |
| `branch <name>` | `/git branch feature/auth` |
| `checkout <branch>` | `/git checkout main` |
| `checkout -b <branch>` | `/git checkout -b feature/new` |
| `switch <branch>` | `/git switch main` |
| `switch -c <branch>` | `/git switch -c feature/new` |
| `add <files>` | `/git add .` |
| `commit -m "msg"` | `/git commit -m "fix: auth bug"` |
| `push` | `/git push` |
| `push -u origin <branch>` | `/git push -u origin feature/auth` |
| `pull` | `/git pull` |
| `stash` | `/git stash` |
| `stash pop` | `/git stash pop` |
| `stash list` | `/git stash list` |

**Allowed GitHub CLI commands:**

| Command | Example |
|---------|---------|
| `gh pr list` | `/git gh pr list` |
| `gh pr view` | `/git gh pr view 42` |
| `gh pr create` | `/git gh pr create "title" "body"` |

{% hint style="warning" %}
Only whitelisted commands are allowed. Arbitrary shell commands are blocked for security.
{% endhint %}

---

## Development Commands

### `/dev <command>`

Run development tool commands.

| Command | What it runs |
|---------|-------------|
| `/dev lint` | `biome lint` |
| `/dev typecheck` | `bun run typecheck` |
| `/dev build` | `bun run build` |
| `/dev test` | `bun run test` |

---

## Status Commands

### `/status`

Show running processes with elapsed time.

```
/status
```

---

---

## System Commands

### `/start`

Show welcome message.

### `/help`

Show all available commands with usage examples.

---

## Timeouts

| Command | Timeout |
|---------|---------|
| `/run` | 1 hour |
| `/plan` | 5 minutes |
| `/exec` | 10 minutes |
| `/dev` | 2 minutes |
| `/git` | 30 seconds |
