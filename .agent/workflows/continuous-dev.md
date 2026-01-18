---
description: Continuously pick up and complete tasks from the active sprint
---

# Continuous Development Mode

Autonomous workflow for picking up and completing tasks in a loop from the active sprint.

## Flow

### 1. Check Sprint Status
```
Use kanban.sprint to verify there is an active sprint
```
If no active sprint exists, notify the user and wait for a sprint to be started.

### 2. Get Next Task
```
Use kanban.next to claim the next available task
```
This tool automatically assigns the highest priority task from the active sprint to you. It will return:
- New tasks from BACKLOG
- Rejected tasks moved back to IN_PROGRESS (need rework)

### 3. Implement & Verify
- Read the task `description` and `acceptanceChecklist`
- If the task was previously rejected, check comments for feedback using `kanban.get` (if not already in `kanban.next` output)
- Make the required code changes
- **Verify Success Criteria**:
    - Run `bun run lint` to ensure code quality
    - Run `bun run typecheck` to ensure type safety
    - Execute any relevant tests or manual verification steps

### 4. Update Progress & Submit
- Mark completed criteria:
```
Use kanban.check with all items marked as 'done: true'
```
- (Optional) Document your work:
```
Use kanban.comment to add notes about implementation or verification results
```
- Move to verification:
```
Use kanban.move with status 'VERIFICATION'
```

> [!IMPORTANT]
> Never move a task to **DONE** directly. All tasks must pass through **VERIFICATION** for final approval.

### 5. Repeat
Continue to the next task using `kanban.next` until no tasks remain.

## Stopping Conditions
- `kanban.next` returns no available tasks
- Encountered a blocker that requires human intervention (move task to `BLOCKED`)
- Unrecoverable error in implementation environment