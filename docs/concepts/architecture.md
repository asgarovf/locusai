---
description: How Locus separates cloud planning from local code execution.
---

# Architecture

## Design Principle

Locus follows a **split architecture** — planning happens in the cloud, execution happens on your machine. Your source code never leaves your infrastructure.

```mermaid
graph TB
    subgraph Cloud["Locus Cloud"]
        Dashboard["Web Dashboard"]
        API["API Server"]
        DB[("PostgreSQL")]
        Dashboard <--> API
        API <--> DB
    end

    subgraph Local["Your Machine / Server"]
        CLI["Locus CLI"]
        Claude["Claude CLI"]
        Codex["Codex CLI"]
        Git["Git / GitHub"]
        CLI --> Claude
        CLI --> Codex
        CLI --> Git
    end

    subgraph Remote["Remote Control"]
        Telegram["Telegram Bot"]
    end

    API <-->|"Task metadata"| CLI
    Telegram -->|"Commands"| CLI
    Claude -->|"Code changes"| Git
    Codex -->|"Code changes"| Git
```

---

## What Runs Where

| Component | Location | Purpose |
|-----------|----------|---------|
| Dashboard | Cloud (`app.locusai.dev`) | Create tasks, manage sprints, view progress |
| API Server | Cloud (`api.locusai.dev`) | Task dispatch, workspace management, auth |
| Locus CLI | Your machine | Orchestrate agents, run tasks, manage config |
| AI Agents | Your machine | Execute tasks using Claude or Codex |
| Telegram Bot | Your machine | Remote command interface |
| Git Operations | Your machine | Branch creation, commits, PR creation |

{% hint style="info" %}
The cloud API only handles **task metadata** — titles, descriptions, statuses, priorities, and acceptance criteria. No source code is ever transmitted.
{% endhint %}

---

## Data Flow

```mermaid
sequenceDiagram
    participant D as Dashboard
    participant A as Locus API
    participant C as Locus CLI
    participant AI as AI Agent
    participant G as GitHub

    D->>A: Create tasks in sprint
    C->>A: Request next task (dispatch)
    A->>C: Return task details
    C->>AI: Build context + execute
    AI->>AI: Read code, make changes
    AI->>G: Commit + push branch
    AI->>G: Create pull request
    C->>A: Update task status → IN_REVIEW
```

---

## Task Execution Flow

When you run `locus run`, the following happens:

```mermaid
flowchart TD
    A[locus run] --> B[Register agent with API]
    B --> C[Request task dispatch]
    C --> D{Task available?}
    D -->|Yes| E[Claim task]
    D -->|No| F[Wait and retry]
    E --> G[Build agent context]
    G --> H[Execute with AI provider]
    H --> I[Commit and push changes]
    I --> J[Update task → IN_REVIEW]
    J --> C
    F --> C
```

When all tasks are completed, the agent creates a single pull request and checks out the base branch.

---

## Sequential Execution

The agent executes tasks one at a time on a **single branch**:

1. Creates a branch (e.g. `locus/<sprintId>`) at the start
2. Claims tasks one by one via server-side dispatch
3. Commits and pushes after each completed task
4. Creates a **single PR** when all tasks are done
5. Checks out the base branch

```mermaid
graph LR
    CLI[Locus CLI] --> Agent[AI Agent]
    Agent --> Branch["Single Branch<br/>locus/sprint-123"]
    Branch --> Task1["Task 1: Add auth"]
    Task1 --> Task2["Task 2: Fix pagination"]
    Task2 --> Task3["Task 3: Update tests"]
    Task3 --> PR["Pull Request"]
```

{% hint style="info" %}
All tasks are committed to the same branch sequentially. This keeps the workflow simple and avoids merge conflicts.
{% endhint %}
