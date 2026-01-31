# Sprint Completion Task Handling Implementation

## Overview
Enhanced the `completeSprint` functionality to automatically handle task status transitions when a sprint is marked as complete.

## Changes Made

### 1. Updated `SprintsService.completeSprint()`
**File:** `apps/api/src/sprints/sprints.service.ts:140-202`

#### New Behavior:
When a sprint is completed, the system now automatically processes all tasks in the sprint:

1. **Tasks in VERIFICATION status**
   - Automatically moved to DONE (auto-approved)
   - Sprint association remains
   - Assignee remains

2. **Tasks in IN_PROGRESS status**
   - Moved to BACKLOG
   - Sprint association removed (`sprintId = null`)
   - Assignee removed (`assignedTo = null`)
   - This allows these tasks to be reassigned to different sprints later

3. **Tasks in other statuses** (DONE, BACKLOG, REVIEW, BLOCKED)
   - Remain unchanged

#### Event Logging:
- Each task status change is logged as a `STATUS_CHANGED` event with reason "Sprint completed"
- The sprint status change continues to be logged as `SPRINT_STATUS_CHANGED`

### 2. Added Comprehensive Unit Tests
**File:** `apps/api/src/sprints/__tests__/sprints.service.jest.ts`

Added 5 new test cases:
1. ✅ Verify tasks in VERIFICATION are moved to DONE
2. ✅ Verify tasks in IN_PROGRESS are moved to BACKLOG with sprint and assignee removed
3. ✅ Verify tasks with other statuses remain unchanged
4. ✅ Verify multiple tasks with different statuses are handled correctly
5. ✅ Verify events are logged correctly for each status change

All tests passing: **6 pass / 0 fail**

## Technical Details

### Dependencies Added:
- Imported `TaskStatus` enum from `@locusai/shared`
- Used TypeORM's repository manager to access Task entity

### Code Quality:
- ✅ Lint: All checks passed
- ✅ TypeCheck: No type errors
- ✅ Tests: All 6 tests passing

## Impact

### User Benefits:
1. **Reduced Manual Work**: No need to manually approve VERIFICATION tasks when completing a sprint
2. **Cleaner Backlog**: IN_PROGRESS tasks that weren't completed are automatically moved to backlog
3. **Better Sprint Planning**: Uncompleted tasks can be easily reassigned to new sprints

### API Endpoint:
- Endpoint: `POST /workspaces/:workspaceId/sprints/:sprintId/complete`
- No breaking changes to the API contract
- Enhanced behavior is transparent to frontend

## Example Usage

When calling the complete sprint endpoint:
```typescript
POST /workspaces/ws-123/sprints/sprint-456/complete
```

Before:
- Task A (VERIFICATION) → remains in VERIFICATION
- Task B (IN_PROGRESS, assigned to worker-1) → remains in IN_PROGRESS

After:
- Task A (VERIFICATION) → automatically moved to DONE ✓
- Task B (IN_PROGRESS) → moved to BACKLOG, unassigned, sprint removed ✓
