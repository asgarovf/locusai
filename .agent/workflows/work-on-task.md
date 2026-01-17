---
description: Pick up the next available task from the Locus board and work on it
---

# Work on Next Task

This workflow describes how an agent should pick up and complete tasks from the Locus Kanban board.

## Prerequisites
- Locus server must be running (`bun run dev` in apps/server)
- MCP server must be connected

## Workflow Steps

### 1. Get Available Tasks
// turbo
First, list all tasks to find work:
```
Use kanban.list to get all tasks
```

Look for tasks with:
- `status: "BACKLOG"` - Ready to be picked up
- `status: "IN_PROGRESS"` and `lockedBy: null` - Abandoned tasks

Prioritize by:
1. `priority: "CRITICAL"` first
2. `priority: "HIGH"` second  
3. `priority: "MEDIUM"` third
4. `priority: "LOW"` last

### 2. Claim the Task
// turbo
Move task to IN_PROGRESS and lock it:
```
Use kanban.move with taskId and status="IN_PROGRESS"
```

Add a comment announcing you're starting:
```
Use kanban.comment with author="Agent" and text="Starting implementation..."
```

### 3. Review Task Details
// turbo
Get full task details:
```
Use kanban.get with the taskId
```

Read carefully:
- `description` - What needs to be done
- `acceptanceChecklist` - Definition of done criteria
- `artifacts` - Any existing implementation drafts

If there's an implementation draft artifact, read it:
```
Use artifacts.get with the artifactId
```

### 4. Implement the Changes
Based on the task description and acceptance criteria:
1. Make the necessary code changes
2. Run linting: `bun run lint`
3. Run type checks if available
4. Test the changes manually or with tests

### 5. Update Acceptance Checklist
// turbo
As you complete each acceptance item, update the checklist:
```
Use kanban.check with taskId and the updated acceptanceChecklist array
Mark each item done: true as you complete it
```

### 6. Add Completion Comment
// turbo
Document what was done:
```
Use kanban.comment with author="Agent" and text describing:
- What was implemented
- Files changed
- Any decisions made
```

### 7. Move to Review
// turbo
When all acceptance criteria are met:
```
Use kanban.move with taskId and status="REVIEW"
```

### 8. Auto-Commit (Optional)
If git is configured in the project:
```bash
git add -A
git commit -m "Task #<taskId>: <task title>"
```

## Example Flow

```
1. kanban.list → Find task #5 with status=BACKLOG, priority=HIGH
2. kanban.move → taskId=5, status="IN_PROGRESS"
3. kanban.comment → taskId=5, author="Agent", text="Starting work..."
4. kanban.get → taskId=5 to get full details
5. [Do the implementation work]
6. kanban.check → taskId=5, acceptanceChecklist with items marked done
7. kanban.comment → taskId=5, author="Agent", text="Completed: added new feature..."
8. kanban.move → taskId=5, status="REVIEW"
```

## Error Handling

If you encounter errors:
1. Add a comment explaining the issue: `kanban.comment`
2. Do NOT move to DONE if acceptance criteria aren't met
3. Move to BLOCKED if there's a blocker: `kanban.move(taskId, "BLOCKED")`
