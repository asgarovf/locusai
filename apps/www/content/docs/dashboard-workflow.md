---
title: Using Workflow through Dashboard
description: Learn how to manage and monitor your agent workflows directly from the Locus dashboard.
---


The Locus Dashboard provides a visual interface for managing your agent workflows, monitoring progress, and reviewing completed tasks. This guide walks you through the key features.

## Starting a Workflow

To start a new workflow from the dashboard:

1. Navigate to the **Backlog** view.
2. Ensure you have tasks in your backlog.
3. Click the **Start Sprint** button (or **Play** icon) to convert your backlog items into an active sprint.
4. The Agent Orchestrator will pick up the active sprint and begin assigning tasks to agents.

## Monitoring Progress

Once a workflow is active, you can monitor it in real-time:

- **Active Tasks**: See which tasks are currently being worked on by agents.
- **Agent Status**: View the status of each agent
- **Task Updates**: Watch as tasks move from *Backlog* to *In Progress* to *PR Open* and *In Review*.

## Reviewing Work

When an agent completes a task, it moves to **PR Open** (if PR creation succeeds) or **In Review**.

1. Click on a task in the **PR Open** or **In Review** column.
2. Review the changes made by the agent (diffs, screenshots, or comments).
3. If satisfied, mark the task as **Done**.
4. If issues are found, reject the task from Task Details, with additional comments. The agents are capable of reading your feedbacks.

## Agent Interventions

Sometimes an agent might get stuck or require human input:

- **Notifications**: You will be notified if an agent fails a task or requests clarification.
- **Logs**: Access detailed agent logs from the task details panel to understand their decision-making process.
