---
description: Pick up the next available task from the active sprint and work on it
---

# Work on Task

Workflow for claiming and completing a single task.

## Steps

### 1. Get Task
```
Use kanban.next to claim the next available task
```

This returns tasks from:
- BACKLOG (new work)
- IN_PROGRESS (rejected tasks needing rework)

### 2. Review Details
Read the returned task:
- `description` - What needs to be done
- `acceptanceChecklist` - Success criteria
- `systemInstructions` - Role-specific guidance (if any)

**For rejected tasks**: Check the task comments for rejection feedback explaining what needs to be fixed.

If an implementation draft artifact exists:
```
Use artifacts.get to read it
```

### 3. Implement
- Make code changes based on the task
- Address any rejection feedback if applicable
- Run `bun run lint` to check for issues
- Run `bun run typecheck` if available
- Test the changes

### 4. Update Checklist
```
Use kanban.check to mark acceptance items as done
```

### 5. Complete
```
Use kanban.move with status VERIFICATION
```

## Error Handling

- Add comment explaining any issues
- Move to BLOCKED if work cannot continue
- Never move to DONE directly (requires human approval)
