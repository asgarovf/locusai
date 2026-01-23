---
title: Architecture
---

Locus employs a **Hybrid Architecture** that balances the privacy and performance of local execution with the coordination capabilities of the cloud.

## The "Local-First" Model

Unlike cloud-only coding assistants that require you to upload your entire codebase to a remote server, Locus executes **locally on your machine**.

### 1. Verification & Security
Because the agent runs locally, it allows for:
- **Local File Access**: No need to sync files to a remote sandbox.
- **Local Tool Execution**: The agent can run `npm install`, `docker build`, or `cargo test` exactly as you would.
- **Privacy**: Your source code never leaves your machine. Only task descriptions, patches/diffs, and summaries are sent to the cloud for coordination.

### 2. Cloud Orchestration
The Locus Cloud (API & Dashboard) acts as the control plane:
- **Task Management**: Stores the backlog, sprints, and task statuses.
- **Agent Coordination**: Dispatches tasks to available local workers.
- **Knowledge Graph**: Maintains high-level project metadata (but not the raw code).

## Component Overview

```mermaid
graph TD
    subgraph Cloud [Locus Cloud]
        API[API Server]
        DB[(Database)]
        Dashboard[Web Dashboard]
    end

    subgraph Local [Your Machine]
        CLI[Locus CLI / Agent Worker]
        Code[Your Source Code]
        Tools[Local Tools (Git, Node, etc.)]
    end

    CLI <-->|Polls Tasks / Updates Status| API
    CLI <-->|Reads/Writes| Code
    CLI <-->|Executes| Tools
    API --- DB
    Dashboard --- API
```

## Workflow

1. **Task Creation**: You create a task in the Web Dashboard (or ask the agent to create one).
2. **Dispatch**: You run `locus run` on your terminal. The CLI connects to the API and asks for work.
3. **Execution**: The CLI receives the task assignment. It reads your code, plans a solution, and executes changes.
4. **Verification**: The agent runs local tests to verify the fix.
5. **Completion**: The agent commits the changes locally and updates the task status to "Verification" on the cloud.
