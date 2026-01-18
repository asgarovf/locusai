---
description: Continuously pick up and complete tasks from the active sprint
---

# Continuous Development Mode

Autonomous workflow for picking up and completing tasks in a loop.

## Flow

### 1. Get Next Task
```
Use kanban.next to claim the next available task
```

This returns:
- New tasks from BACKLOG (by priority)
- Rejected tasks in IN_PROGRESS (need to be reworked)

### 2. Implement Changes
- Read the task description and acceptance checklist
- Check for rejection feedback in comments (if task was previously rejected)
- Make the required code changes
- Run `bun run lint` and `bun run typecheck` to validate

### 3. Update Progress
```
Use kanban.check to mark completed acceptance criteria
Use kanban.comment to document progress
```

### 4. Complete Task
```
Use kanban.move to set status to VERIFICATION
```

### 5. Repeat
```
Use kanban.next to get the next task
```

Continue until no tasks remain or a blocker is encountered.

## Stopping Conditions

- `kanban.next` returns no available tasks
- Task requires human input (mark as BLOCKED)
- Unrecoverable error occurs

## Error Handling

If implementation fails:
1. Add comment explaining the issue
2. Move task to BLOCKED
3. Continue to next task
