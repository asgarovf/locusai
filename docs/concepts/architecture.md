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
    E --> G[Create git worktree]
    G --> H[Build agent context]
    H --> I[Execute with AI provider]
    I --> J[Commit changes]
    J --> K[Push branch]
    K --> L[Create PR on GitHub]
    L --> M[Update task → IN_REVIEW]
    M --> C
    F --> C
```

---

## Multi-Agent Execution

When running multiple agents (`locus run --agents 3`), each agent:

1. Gets its own **git worktree** — an isolated copy of the repository
2. Claims a **separate task** — server-side locking prevents conflicts
3. Works **independently** — no shared state between agents
4. Creates its own **branch and PR** — named `agent/<taskId>-<slug>`

```mermaid
graph LR
    CLI[Locus CLI] --> A1[Agent 1]
    CLI --> A2[Agent 2]
    CLI --> A3[Agent 3]

    A1 --> W1[Worktree 1<br/>Task: Add auth]
    A2 --> W2[Worktree 2<br/>Task: Fix pagination]
    A3 --> W3[Worktree 3<br/>Task: Update tests]

    W1 --> PR1[PR #1]
    W2 --> PR2[PR #2]
    W3 --> PR3[PR #3]
```

{% hint style="warning" %}
Maximum of **5 parallel agents** per CLI instance. Each agent requires its own worktree, so ensure you have sufficient disk space.
{% endhint %}
