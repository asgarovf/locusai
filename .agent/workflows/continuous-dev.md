---
description: Continuously pick up and complete tasks from the backlog
---

# Continuous Development Mode

This workflow enables autonomous continuous development where the agent picks up tasks, implements them, and moves to the next one.

## Quick Start
// turbo-all

### 1. Get Next Task from Priority Queue
```
Use kanban.next to get the highest priority available task
```

This returns:
- The next task to work on (sorted by priority, then age)
- How many tasks remain in the queue

### 2. If Task Available, Start Working
```
Use kanban.move with taskId and status="IN_PROGRESS"
Use kanban.comment with taskId, author="Agent", text="🚀 Starting work on this task"
```

### 3. Get Full Task Details
```
Use kanban.get with taskId
```

Review:
- `description` - What to implement
- `acceptanceChecklist` - Definition of done
- `artifacts` - Any implementation drafts

### 4. Implement Changes
Make the code changes as specified in the task.

### 5. Validate Work
Run these commands to verify:
```bash
bun run lint
bun run typecheck  # if available
```

### 6. Update Acceptance Checklist
```
Use kanban.check with taskId and updated acceptanceChecklist
```

### 7. Commit & Complete
```
Use kanban.commit with taskId to auto-commit with task reference
Use kanban.move with taskId and status="REVIEW"
Use kanban.comment with taskId, author="Agent", text="✅ Implementation complete, ready for review"
```

### 8. Get Next Task
```
Use kanban.next to get the next task
```

Repeat from step 2.

## Example Session

```
Agent: kanban.next
→ { task: { id: 5, title: "Add user auth", priority: "HIGH" }, remaining: 3 }

Agent: kanban.move(5, "IN_PROGRESS")
Agent: kanban.comment(5, "Agent", "Starting implementation...")
Agent: kanban.get(5)
→ { description: "...", acceptanceChecklist: [...] }

[Agent implements changes]

Agent: kanban.check(5, updatedChecklist)
Agent: kanban.commit(5, "Added JWT auth with refresh tokens")
Agent: kanban.move(5, "REVIEW")
Agent: kanban.comment(5, "Agent", "✅ Complete - added auth system")

Agent: kanban.next
→ { task: { id: 8, title: "Fix login bug", priority: "CRITICAL" }, remaining: 2 }

[Continue...]
```

## When to Stop

Stop the loop when:
1. `kanban.next` returns "No tasks available in BACKLOG"
2. A task is BLOCKED and needs human input
3. An error occurs that requires human intervention

## Error Recovery

If implementation fails:
1. `kanban.comment(taskId, "Agent", "❌ Error: <description>")`
2. `kanban.move(taskId, "BLOCKED")`
3. Continue to next task with `kanban.next`
