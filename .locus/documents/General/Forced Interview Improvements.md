```markdown
# Sprint Plan: Forced Interview Completion

## Overview

**Goal**: Users must complete the project manifest (interview) before they can effectively use other features in the Locus platform.

**Sprint Duration**: 2 weeks (recommended)

---

## Current State Analysis

### Existing System Components

1. **Project Manifest** (`packages/ai-sdk/src/interfaces/index.ts:34-49`)
   - 9 required fields: `name`, `mission`, `targetUsers`, `techStack`, `phase`, `features`, `competitors`, `brandVoice`, `successMetrics`
   - `completenessScore` (0-100) tracks interview progress
   - Stored in `workspace.projectManifest` (JSONB column)

2. **Interview Workflow** (`packages/ai-sdk/src/workflows/interview.ts`)
   - Dedicated `AgentMode.INTERVIEW` mode
   - Quality gates enforce meaningful responses (not one-liners)
   - Returns `nextQuestion` and `missingInfo` after each interaction

3. **Workspace Entity** (`apps/api/src/entities/workspace.entity.ts:39-43`)
   - `projectManifest: Partial<ProjectManifest>` - stores manifest data
   - `agentState: Partial<AgentState>` - stores agent state including mode

4. **Dashboard Layout** (`apps/web/src/app/(dashboard)/layout.tsx`)
   - Uses `WorkspaceProtected` component for access control
   - Entry point for feature gating

---

## Sprint Tasks

### Epic 1: Backend - Manifest Completion Tracking

#### Task 1.1: Add Manifest Completion Status to Workspace API
**Priority**: P0 (Critical)
**Estimated Effort**: 3 story points

**Description**:
Add a computed/derived field to the workspace response that indicates whether the manifest is complete.

**Acceptance Criteria**:
- [ ] Add `isManifestComplete` boolean field to workspace response DTO
- [ ] Add `manifestCompletionPercentage` number field (0-100)
- [ ] Calculate completion based on `REQUIRED_MANIFEST_FIELDS` from `packages/ai-sdk/src/constants.ts`
- [ ] A field is considered complete if it has a non-empty, non-trivial value

**Files to Modify**:
- `apps/api/src/workspaces/workspaces.service.ts` - Add completion calculation logic
- `packages/shared/src/models/workspace.ts` - Add response DTO fields

**Implementation Notes**:
```typescript
// Completion calculation logic
function calculateManifestCompletion(manifest: Partial<ProjectManifest>): {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
} {
  const requiredFields = REQUIRED_MANIFEST_FIELDS;
  const filledFields = requiredFields.filter(field => {
    const value = manifest[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== undefined && value !== null;
  });

  return {
    isComplete: filledFields.length === requiredFields.length,
    percentage: Math.round((filledFields.length / requiredFields.length) * 100),
    missingFields: requiredFields.filter(f => !filledFields.includes(f))
  };
}
```

---

#### Task 1.2: Create Manifest Validation Endpoint
**Priority**: P0 (Critical)
**Estimated Effort**: 2 story points

**Description**:
Create a dedicated endpoint to check manifest completion status.

**Acceptance Criteria**:
- [ ] `GET /workspaces/:id/manifest-status` endpoint
- [ ] Returns `{ isComplete, percentage, missingFields, completenessScore }`
- [ ] Include field-level completion details

**Files to Modify**:
- `apps/api/src/workspaces/workspaces.controller.ts` - Add new endpoint
- `apps/api/src/workspaces/workspaces.service.ts` - Add service method

---

#### Task 1.3: Add Minimum Completeness Threshold Configuration
**Priority**: P1 (High)
**Estimated Effort**: 1 story point

**Description**:
Allow configurable threshold for what constitutes a "complete" manifest.

**Acceptance Criteria**:
- [ ] Add `MANIFEST_COMPLETION_THRESHOLD` constant (default: 70%)
- [ ] Admin can configure via environment variable
- [ ] Threshold applies to `completenessScore` from AI evaluation

**Files to Modify**:
- `apps/api/src/config/configuration.ts` - Add threshold config
- `packages/ai-sdk/src/constants.ts` - Add default threshold

---

### Epic 2: Frontend - Interview Gate Implementation

#### Task 2.1: Create Interview Gate Component
**Priority**: P0 (Critical)
**Estimated Effort**: 5 story points

**Description**:
Create a modal/overlay component that blocks access to features until interview is complete.

**Acceptance Criteria**:
- [ ] Full-screen overlay that cannot be dismissed
- [ ] Shows interview progress (progress bar with percentage)
- [ ] Displays which fields are missing
- [ ] "Continue Interview" CTA button redirects to chat
- [ ] Smooth animations for state transitions

**Files to Create**:
- `apps/web/src/components/interview/InterviewGate.tsx`
- `apps/web/src/components/interview/InterviewProgress.tsx`
- `apps/web/src/components/interview/index.ts`

**UI Mockup**:
```
┌─────────────────────────────────────────────┐
│                                             │
│         🎯 Complete Your Project Setup      │
│                                             │
│    Help us understand your project better   │
│    to provide personalized assistance       │
│                                             │
│    ████████░░░░░░░░  56% Complete           │
│                                             │
│    Missing Information:                     │
│    • Tech Stack                             │
│    • Success Metrics                        │
│    • Competitors                            │
│                                             │
│         [Continue Interview →]              │
│                                             │
└─────────────────────────────────────────────┘
```

---

#### Task 2.2: Create useManifestCompletion Hook
**Priority**: P0 (Critical)
**Estimated Effort**: 3 story points

**Description**:
Create a React hook to fetch and manage manifest completion state.

**Acceptance Criteria**:
- [ ] Fetch completion status from workspace query
- [ ] Cache status with React Query
- [ ] Provide `isComplete`, `percentage`, `missingFields`
- [ ] Auto-refresh after chat interactions
- [ ] Include loading and error states

**Files to Create**:
- `apps/web/src/hooks/useManifestCompletion.ts`

**Implementation**:
```typescript
export function useManifestCompletion() {
  const workspaceId = useWorkspaceId();
  const { data: workspace, isLoading } = useWorkspaceQuery();

  const completion = useMemo(() => {
    if (!workspace?.projectManifest) {
      return { isComplete: false, percentage: 0, missingFields: REQUIRED_FIELDS };
    }
    return calculateCompletion(workspace.projectManifest);
  }, [workspace]);

  return {
    ...completion,
    isLoading,
    completenessScore: workspace?.projectManifest?.completenessScore ?? 0,
  };
}
```

---

#### Task 2.3: Integrate Interview Gate into Dashboard Layout
**Priority**: P0 (Critical)
**Estimated Effort**: 3 story points

**Description**:
Modify the dashboard layout to show the interview gate when manifest is incomplete.

**Acceptance Criteria**:
- [ ] Show `InterviewGate` overlay when `isComplete === false`
- [ ] Allow access to `/chat` page even when incomplete (for interview)
- [ ] Block access to `/board`, `/backlog`, `/docs`, `/settings`
- [ ] Show subtle indicator in sidebar when interview is incomplete

**Files to Modify**:
- `apps/web/src/app/(dashboard)/layout.tsx` - Add gate integration
- `apps/web/src/components/Sidebar.tsx` - Add completion indicator
- `apps/web/src/components/WorkspaceProtected.tsx` - Add completion check

**Route Allowlist** (accessible during interview):
- `/chat` - Required for interview
- `/settings/profile` - Basic profile settings
- `/settings/team` - Team management (optional)

---

#### Task 2.4: Add Interview Progress to Chat Page
**Priority**: P1 (High)
**Estimated Effort**: 2 story points

**Description**:
Show interview progress indicator in the chat interface when in interview mode.

**Acceptance Criteria**:
- [ ] Progress bar in chat header when `agentState.mode === 'INTERVIEW'`
- [ ] Show current field being discussed
- [ ] Celebrate completion with confetti/animation
- [ ] Redirect to dashboard on completion

**Files to Modify**:
- `apps/web/src/components/chat/ChatHeader.tsx` - Add progress indicator
- `apps/web/src/app/(dashboard)/chat/page.tsx` - Add completion handler

---

#### Task 2.5: Create Interview Onboarding Flow
**Priority**: P1 (High)
**Estimated Effort**: 4 story points

**Description**:
New user onboarding that automatically starts the interview.

**Acceptance Criteria**:
- [ ] After workspace creation, redirect to chat with interview prompt
- [ ] Send automatic first message: "Hi! Let's set up your project..."
- [ ] Show onboarding tooltips explaining the interview process
- [ ] Skip button for demo/testing (dev mode only)

**Files to Modify**:
- `apps/web/src/app/(auth)/onboarding/workspace/page.tsx` - Add redirect logic
- `apps/web/src/components/onboarding/OnboardingTour.tsx` - Add interview steps

---

### Epic 3: Interview UX Improvements

#### Task 3.1: Add Interview Resume Capability
**Priority**: P1 (High)
**Estimated Effort**: 3 story points

**Description**:
Allow users to resume interrupted interviews seamlessly.

**Acceptance Criteria**:
- [ ] Detect incomplete interview on login
- [ ] Show "Continue where you left off" prompt
- [ ] Load previous interview session automatically
- [ ] Track interview progress in local storage as backup

**Files to Modify**:
- `apps/web/src/hooks/useChat.ts` - Add interview resume logic
- `apps/web/src/components/interview/InterviewGate.tsx` - Add resume CTA

---

#### Task 3.2: Add Field-by-Field Progress Tracking
**Priority**: P2 (Medium)
**Estimated Effort**: 2 story points

**Description**:
Show detailed progress for each manifest field.

**Acceptance Criteria**:
- [ ] Visual checklist of all required fields
- [ ] Check mark for completed fields
- [ ] Highlight current field being discussed
- [ ] Click to jump to specific field question

**Files to Create**:
- `apps/web/src/components/interview/FieldChecklist.tsx`

---

#### Task 3.3: Add Interview Skip Option (Admin Only)
**Priority**: P2 (Medium)
**Estimated Effort**: 2 story points

**Description**:
Allow admins to skip interview for testing or demo purposes.

**Acceptance Criteria**:
- [ ] Hidden admin setting to bypass interview
- [ ] "Mark as Complete" button in settings (admin only)
- [ ] Warning that this may affect AI recommendations

**Files to Modify**:
- `apps/web/src/app/(dashboard)/settings/page.tsx` - Add skip option
- `apps/api/src/workspaces/workspaces.service.ts` - Add skip method

---

### Epic 4: Edge Cases & Error Handling

#### Task 4.1: Handle Partial Manifest Data
**Priority**: P1 (High)
**Estimated Effort**: 2 story points

**Description**:
Gracefully handle workspaces with partial or corrupted manifest data.

**Acceptance Criteria**:
- [ ] Validate manifest data on load
- [ ] Auto-repair missing fields with defaults
- [ ] Log corrupted data for debugging
- [ ] Never crash due to malformed manifest

**Files to Modify**:
- `apps/api/src/workspaces/workspaces.service.ts` - Add validation
- `packages/ai-sdk/src/core/agent.ts` - Add manifest validation

---

#### Task 4.2: Handle Network Failures During Interview
**Priority**: P1 (High)
**Estimated Effort**: 2 story points

**Description**:
Ensure interview progress is not lost due to network issues.

**Acceptance Criteria**:
- [ ] Auto-save manifest updates after each response
- [ ] Show offline indicator when disconnected
- [ ] Queue unsent messages for retry
- [ ] Display "Saving..." indicator during persistence

**Files to Modify**:
- `apps/web/src/hooks/useChat.ts` - Add auto-save logic
- `apps/api/src/ai/ai.service.ts` - Add transaction handling

---

#### Task 4.3: Handle Multiple Workspaces
**Priority**: P2 (Medium)
**Estimated Effort**: 2 story points

**Description**:
Ensure interview gate works correctly with multiple workspaces.

**Acceptance Criteria**:
- [ ] Each workspace has independent completion status
- [ ] Switching workspaces updates gate state
- [ ] User can have one complete and one incomplete workspace

**Files to Modify**:
- `apps/web/src/hooks/useManifestCompletion.ts` - Add workspace-aware logic

---

### Epic 5: Analytics & Monitoring

#### Task 5.1: Track Interview Completion Metrics
**Priority**: P2 (Medium)
**Estimated Effort**: 2 story points

**Description**:
Add analytics to track interview completion rates.

**Acceptance Criteria**:
- [ ] Track time to complete interview
- [ ] Track drop-off points (which fields cause abandonment)
- [ ] Track completion rate by user segment
- [ ] Dashboard for viewing metrics

**Files to Modify**:
- `apps/api/src/workspaces/workspaces.service.ts` - Add event tracking
- `packages/shared/src/models/workspace.ts` - Add tracking fields

---

#### Task 5.2: Add Interview Completion Events
**Priority**: P2 (Medium)
**Estimated Effort**: 1 story point

**Description**:
Emit events when interview milestones are reached.

**Acceptance Criteria**:
- [ ] Event: `interview.started`
- [ ] Event: `interview.field_completed` (with field name)
- [ ] Event: `interview.completed`
- [ ] Event: `interview.abandoned`

**Files to Modify**:
- `apps/api/src/events/events.service.ts` - Add new event types
- `apps/api/src/ai/ai.service.ts` - Emit events

---

## Sprint Schedule

### Week 1: Core Implementation

| Day | Tasks | Owner |
|-----|-------|-------|
| 1-2 | Task 1.1, 1.2 (Backend completion tracking) | Backend Dev |
| 1-2 | Task 2.1 (Interview Gate component) | Frontend Dev |
| 3 | Task 1.3 (Threshold config) | Backend Dev |
| 3-4 | Task 2.2 (useManifestCompletion hook) | Frontend Dev |
| 4-5 | Task 2.3 (Dashboard integration) | Frontend Dev |
| 5 | Integration testing | Both |

### Week 2: Polish & Edge Cases

| Day | Tasks | Owner |
|-----|-------|-------|
| 1-2 | Task 2.4, 2.5 (Chat progress, onboarding) | Frontend Dev |
| 1-2 | Task 3.1 (Interview resume) | Frontend Dev |
| 3 | Task 4.1, 4.2 (Error handling) | Both |
| 4 | Task 3.2, 3.3 (Field tracking, skip option) | Frontend Dev |
| 5 | Task 4.3 (Multiple workspaces) | Frontend Dev |
| 5 | QA & Bug fixes | Both |

---

## Definition of Done

- [ ] All P0 tasks completed and tested
- [ ] Interview gate blocks access to features when manifest is incomplete
- [ ] Users can complete interview through chat interface
- [ ] Progress is persisted and survives page refresh
- [ ] Edge cases handled gracefully (network errors, partial data)
- [ ] Lint and typecheck pass
- [ ] Code reviewed and approved
- [ ] Deployed to staging for QA

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users frustrated by forced interview | Medium | High | Make interview engaging, show clear value |
| Interview takes too long | Medium | Medium | Allow partial completion with reduced features |
| Data loss during interview | Low | High | Auto-save, local storage backup |
| Performance issues with completion checks | Low | Medium | Cache completion status, debounce checks |

---

## Technical Debt Considerations

1. **Existing completenessScore**: The AI-calculated `completenessScore` in `ProjectManifest` may differ from our field-based calculation. Consider using AI score as the source of truth once calibrated.

2. **Interview Mode Detection**: Current system detects mode through `AgentState.mode`. Ensure this is reliably synced between backend and frontend.

3. **Workspace State Sync**: `agentState` and `projectManifest` are stored separately. Consider consolidating or adding explicit sync mechanisms.

---

## Success Metrics

- **Interview Completion Rate**: Target 80% of new users complete interview within first session
- **Time to Complete**: Target < 10 minutes for full interview
- **Feature Engagement**: Track if users who complete interview have higher feature usage
- **Support Tickets**: Reduction in "how do I use this?" support requests

---

## Dependencies

- `packages/ai-sdk` - Interview workflow and manifest types
- `apps/api` - Workspace and AI services
- `apps/web` - Dashboard and chat interfaces
- `packages/shared` - Shared types and models

---

## Appendix: File Reference

### Key Files to Modify

| File | Purpose |
|------|---------|
| `apps/api/src/workspaces/workspaces.service.ts` | Completion calculation |
| `apps/api/src/workspaces/workspaces.controller.ts` | New endpoints |
| `apps/web/src/app/(dashboard)/layout.tsx` | Gate integration |
| `apps/web/src/components/interview/InterviewGate.tsx` | New component |
| `apps/web/src/hooks/useManifestCompletion.ts` | New hook |
| `packages/shared/src/models/workspace.ts` | Response DTOs |

### Key Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/interview/InterviewGate.tsx` | Main gate component |
| `apps/web/src/components/interview/InterviewProgress.tsx` | Progress indicator |
| `apps/web/src/components/interview/FieldChecklist.tsx` | Field-by-field tracker |
| `apps/web/src/hooks/useManifestCompletion.ts` | Completion hook |
```