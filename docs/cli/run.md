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
| `--api-key <KEY>` | Override API key | From config |
| `--api-url <URL>` | Override API base URL | From config |
| `--agents <N>` | Number of agents to run in parallel (max 5) | `1` |
| `--dir <PATH>` | Project directory | Current directory |

---

## Examples

```bash
# Run a single agent
locus run

# Run multiple agents in parallel
locus run --agents 3

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

## Multi-Agent Execution

When you pass the `--agents` flag, Locus spawns multiple agent workers that execute tasks from the sprint **in parallel**. Each agent runs as a separate process and works independently.

```bash
# Spawn 3 agents to work on tasks concurrently
locus run --agents 3
```

### How It Works

1. The orchestrator spawns N agent worker processes (up to a maximum of 5)
2. Each agent independently requests a task from the sprint backlog via the **dispatch** API
3. The server assigns tasks atomically — only one agent can claim a given task
4. Each agent creates its own branch, executes its task, commits, and pushes
5. Agents continue claiming tasks until the backlog is empty
6. A pull request is created for each agent's branch when it finishes

### Task Dispatch and Locking

Locus uses server-side task dispatch to prevent conflicts between agents:

* When an agent requests a task, the API **atomically assigns** it and sets the status to `IN_PROGRESS`
* If two agents request a task at the same time, only one receives it — the other gets a different task or retries
* Each task's `assignedTo` field tracks which agent owns it
* Failed tasks are returned to `BACKLOG` so another agent can pick them up

### Branch Isolation

Each agent works on its own git branch, so parallel agents never interfere with each other's file changes. Branches follow the naming pattern `locus/<identifier>` and are pushed independently.

{% hint style="info" %}
Multi-agent execution works best when your sprint has **independent tasks** that don't modify the same files. For tasks with dependencies, use [task tiers](../concepts/sprints.md) to control execution order.
{% endhint %}

---

## Stopping the Agent

Press `Ctrl+C` to gracefully stop the agent. Locus will signal the running agent to complete its current operation, checkout the base branch, and clean up.
