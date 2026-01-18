---
description: Pick up the next available task from the active sprint and work on it
---

# Work on Task

Workflow for claiming and completing a single task from the active sprint.

## Steps

### 1. Check Sprint Status
```
Use kanban.sprint to verify there is an active sprint
```
If no active sprint exists, notify the user.

### 2. Get Task Details
```
Use kanban.next to claim the next available task
```
This tool returns the task details including:
- `description` - What needs to be done
- `acceptanceChecklist` - Success criteria (includes default quality checks)
- `systemInstructions` - Role-specific guidance

**For rejected tasks**: Check the task comments using `kanban.get` or the returned task object for rejection feedback.

### 3. Implement & Test
- Make code changes based on the task requirements
- Address any rejection feedback if applicable
- **Verify Quality**:
    - Run `bun run lint` to check for issues
    - Run `bun run typecheck` to validate types
    - Perform functional testing of your changes

### 4. Check Success Criteria
Once implementation is complete and verified:
```
Use kanban.check to mark all acceptance items as done
```

### 5. Submit for Verification
Add a summary of your work and move the task to verification:
```
Use kanban.comment to document what was done
Use kanban.move with status 'VERIFICATION'
```

> [!IMPORTANT]
> Never move a task to **DONE** directly. All tasks must pass through **VERIFICATION** for human review and final approval.

## Error Handling
- If you encounter a blocker, move the task to `BLOCKED` and add a comment explaining why.
- If implementation fails due to environmental issues, notify the user.
