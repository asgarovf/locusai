---
description: AI-powered worker that executes your tasks locally.
---

# Agents

## Overview

The agent is an AI-powered worker that executes tasks on your machine. It uses either **Claude** (Anthropic) or **Codex** (OpenAI) as its AI provider to read your codebase, make changes, and create a pull request.

---

## Agent Lifecycle

```mermaid
flowchart TD
    A[Register with API] --> B[Create branch]
    B --> C[Claim task from sprint]
    C --> D[Build execution context]
    D --> E[Execute with AI provider]
    E --> F[Commit and push changes]
    F --> G[Update task status]
    G --> H{More tasks?}
    H -->|Yes| C
    H -->|No| I[Create pull request]
    I --> J[Checkout base branch]
    J --> K[Done]
```

---

## AI Providers

| Provider | CLI Name | Description |
|----------|----------|-------------|
| Claude   | `claude` | Anthropic's Claude (default) |
| Codex    | `codex`  | OpenAI's Codex |

Set your provider during configuration:

```bash
locus config setup --provider claude
```

Or override per run:

```bash
locus run --provider codex
```

---

## Single-Branch Workflow

When you run `locus run`, the agent creates a **single branch** (e.g. `locus/<sprintId>`) and executes all tasks sequentially on that branch.

After each task:
* Changes are committed with a descriptive message
* The branch is pushed to remote

When all tasks are done:
* A pull request is created targeting the base branch
* The base branch is checked out

---

## Parallel Execution

By default, `locus run` spawns a single agent that processes tasks sequentially. To run multiple agents in parallel, use the `--agents` flag:

```bash
locus run --agents 3
```

### Agent Pool

The orchestrator manages a pool of up to **5 agent workers**. Each agent is a separate process that:

* Registers with the Locus API using a unique agent ID
* Independently claims tasks from the sprint backlog
* Works on its own git branch in isolation
* Sends heartbeats so the orchestrator can detect stale agents

### Task Distribution

Tasks are distributed through the **dispatch** API, which provides atomic task assignment:

```mermaid
sequenceDiagram
    participant A1 as Agent 1
    participant A2 as Agent 2
    participant API as Locus API
    participant B as Backlog

    A1->>API: dispatch(agentId)
    API->>B: Claim next task (atomic)
    B-->>API: Task A
    API-->>A1: Task A assigned

    A2->>API: dispatch(agentId)
    API->>B: Claim next task (atomic)
    B-->>API: Task B
    API-->>A2: Task B assigned
```

The server ensures each task is assigned to exactly one agent. If an agent fails a task, it is returned to the backlog so another agent can retry it.

### Agent Coordination

Agents coordinate implicitly through the API rather than communicating directly with each other:

* **No shared state** — each agent operates independently with its own branch and working directory
* **Server-side locking** — the dispatch endpoint prevents double-assignment of tasks
* **Health monitoring** — the orchestrator watches agent heartbeats and kills stale agents (no heartbeat for 10 minutes)
* **Graceful shutdown** — pressing `Ctrl+C` signals all agents to finish their current task and clean up

---

## Agent Context

Before executing a task, Locus builds a rich context for the agent that includes:

* **Project metadata** — from `.locus/config.json`
* **Agent instructions** — from `.locus/LOCUS.md`
* **Codebase index** — from `.locus/codebase-index.json` (if indexed)
* **Workspace documents** — from `.locus/documents/`
* **Task details** — title, description, acceptance checklist
* **Sprint context** — current sprint and related tasks
* **Learnings** — accumulated corrections and patterns from `.locus/LEARNINGS.md`

---

## Health Monitoring

The active agent sends a **heartbeat** to the API every minute. This lets the dashboard and API track whether the agent is alive and working.

---

## Graceful Shutdown

Press `Ctrl+C` during `locus run` to gracefully shut down the agent. Locus will:

1. Signal the running agent to stop
2. Wait for the current operation to complete
3. Checkout the base branch
4. Update task statuses appropriately
