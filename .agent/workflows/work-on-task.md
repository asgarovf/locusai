---
description: Pick up the next available task from the active sprint and work on it
---

# Work on Task

Workflow for claiming and completing a single task.

## Steps

### 0. Check Sprint Status
```
Use kanban.sprint to verify there is an active sprint
```
If no active sprint exists, stop and notify the user.

### 1. Get Task
```
Use kanban.next to claim the next available task from the active sprint
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

### 5. Save and Submit
First, commit your changes:
```
Use kanban.commit with taskId and a summary of your work
```

Then, move the task to verification:
```
Use kanban.move with status VERIFICATION
```

> [!IMPORTANT]
> Never move a task to **DONE** directly. All tasks must pass through **VERIFICATION** for human review.


## Error Handling

- Add comment explaining any issues
- Move to BLOCKED if work cannot continue
- Never move to DONE directly (requires human approval)
