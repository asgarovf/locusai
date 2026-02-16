---
description: Complete reference for all Telegram bot commands.
---

# Command Reference

All commands are sent as messages in your Telegram chat with the bot.

---

## Monitoring Commands

### `/dashboard`

CEO executive overview of your workspace. Shows sprint progress, task breakdown by status, active agents, and recent activity in a single view.

```
/dashboard
```

Displays:
* Active sprint name and task completion (e.g. 4/6 tasks done)
* Task counts by status (BACKLOG, IN\_PROGRESS, IN\_REVIEW, BLOCKED, DONE)
* Active agents and their current task assignments
* Last 5 workspace events

---

### `/workspace`

Show workspace details and statistics.

```
/workspace
```

Displays:
* Workspace name, ID, and org ID
* Member count
* Total tasks and breakdown by status

---

### `/activity [count]`

Show a feed of recent workspace events. Defaults to the last 10 events.

```
/activity
/activity 5
/activity 20
```

* `count` — Optional. Number of events to show (1–20, default 10)

Events include task updates, status changes, PR activity, sprint changes, CI runs, and more.

---

### `/agents`

List all active AI agents in the workspace with their current status.

```
/agents
```

Displays per agent:
* Agent ID (short)
* Status (WORKING, IDLE, COMPLETED, FAILED)
* Current task assignment
* Last heartbeat time

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

### `/tasks [status]`

List tasks filtered by status. Defaults to active tasks (IN\_PROGRESS, IN\_REVIEW, and BLOCKED).

```
/tasks
/tasks BACKLOG
/tasks DONE
```

Shows task titles, priorities, statuses, IDs, and PR links. IN\_REVIEW tasks include inline buttons to approve or view.

{% hint style="info" %}
Requires a configured API key. The workspace is auto-resolved from the key.
{% endhint %}

---

### `/task <task-id>`

Show detailed information about a specific task.

```
/task task-abc123
```

Displays:
* Title, status, and priority
* Sprint and assignee (if set)
* PR link (if available)
* Full description (truncated at 1000 chars)
* Acceptance criteria checklist with completion status
* Last 3 comments

---

### `/backlog`

List all tasks in BACKLOG status that haven't been picked up yet.

```
/backlog
```

Shows up to 15 tasks with their priority and sprint assignment. Use `/tasks BACKLOG` for the full list.

---

### `/approvetask <task-id>`

Approve a completed task and move it from IN\_REVIEW to DONE.

```
/approvetask task-abc123
```

Only works on tasks with IN\_REVIEW status.

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

### `/review [pr-number]`

Trigger an AI code review. Reviews a specific PR by number, or staged local changes if no number is provided.

```
/review
/review 42
```

* With no argument — reviews staged local changes
* With a PR number — reviews that pull request

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
| `/plan` | 1 hour |
| `/exec` | 1 hour |
| `/review` | 1 hour |
| `/dev` | 10 minutes |
| `/git` | 1 minute |
