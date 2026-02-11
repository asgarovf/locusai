---
description: Start AI agents to execute sprint tasks.
---

# run

Spawn AI agents that claim and execute tasks from your active sprint.

```bash
locus run [options]
```

---

## How It Works

1. Registers agent(s) with the Locus API
2. Requests a task from the active sprint via dispatch
3. Creates a git worktree for isolated execution
4. Builds context (project metadata, instructions, codebase index, documents)
5. Executes the task using your configured AI provider
6. Commits changes, pushes the branch, and creates a pull request
7. Updates the task status to `IN_REVIEW`
8. Repeats until no more tasks are available

---

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--agents <N>` | Number of parallel agents (1-5) | `1` |
| `--worktree` | Enable worktree isolation | `true` |
| `--auto-push` | Push changes to remote automatically | `true` |
| `--skip-planning` | Skip the planning phase | `false` |
| `--sprint <ID>` | Target a specific sprint | Active sprint |
| `--workspace <ID>` | Override workspace ID | Auto-resolved |
| `--model <MODEL>` | AI model to use | From config |
| `--provider <PROVIDER>` | AI provider (`claude` or `codex`) | From config |
| `--api-key <KEY>` | Override API key | From config |
| `--api-url <URL>` | Override API base URL | From config |
| `--dir <PATH>` | Project directory | Current directory |

---

## Examples

```bash
# Run a single agent
locus run

# Run 3 agents in parallel
locus run --agents 3

# Use a specific provider
locus run --provider codex

# Target a specific sprint
locus run --sprint "sprint-id-123"
```

---

## Multi-Agent Mode

When `--agents` is greater than 1, each agent:

* Gets its own git worktree
* Claims a separate task via server-side locking
* Works independently without shared state
* Creates its own branch and pull request

{% hint style="warning" %}
Ensure you have an **active sprint** with tasks in `BACKLOG` status before running agents. Otherwise, no tasks will be dispatched.
{% endhint %}

---

## Stopping Agents

Press `Ctrl+C` to gracefully stop all agents. Locus will signal running agents to complete their current operation and clean up.
