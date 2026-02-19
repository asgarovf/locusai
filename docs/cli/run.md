---
description: Start the AI agent to execute sprint tasks.
---

# run

Start an AI agent that claims and executes tasks from your active sprint sequentially on a single branch.

```bash
locus run [options]
```

---

## How It Works

1. Spawns an agent and registers it with the Locus API
2. Creates a single branch for the entire run
3. Requests a task from the active sprint via dispatch
4. Builds context (project metadata, instructions, codebase index, documents)
5. Executes the task using your configured AI provider
6. Commits changes and pushes the branch
7. Updates the task status to `IN_REVIEW`
8. Repeats until no more tasks are available
9. Creates a pull request with all completed tasks
10. Checks out the base branch

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--skip-planning` | Skip the planning phase | `false` |
| `--sprint <ID>` | Target a specific sprint | Active sprint |
| `--workspace <ID>` | Override workspace ID | Auto-resolved |
| `--model <MODEL>` | AI model to use | From config |
| `--provider <PROVIDER>` | AI provider (`claude` or `codex`) | From config |
| `--reasoning-effort <LEVEL>` | Reasoning level (`low`, `medium`, `high`) | — |
| `--api-key <KEY>` | Override API key | From config |
| `--api-url <URL>` | Override API base URL | From config |
| `--dir <PATH>` | Project directory | Current directory |

---

## Examples

```bash
# Run the agent
locus run

# Use a specific provider
locus run --provider codex

# Target a specific sprint
locus run --sprint "sprint-id-123"
```

---

## What Happens

When you run `locus run`, the agent:

* Creates a branch (e.g. `locus/<sprintId>`)
* Claims tasks one at a time from the sprint backlog
* Executes each task with the AI provider
* Commits and pushes after each task
* Opens a single PR when all tasks are done
* Checks out the base branch

{% hint style="warning" %}
Ensure you have an **active sprint** with tasks in `BACKLOG` status before running the agent. Otherwise, no tasks will be dispatched.
{% endhint %}

---

## Stopping the Agent

Press `Ctrl+C` to gracefully stop the agent. Locus will signal the running agent to complete its current operation, checkout the base branch, and clean up.
