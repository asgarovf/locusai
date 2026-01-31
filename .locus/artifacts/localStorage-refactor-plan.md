# LocalStorage Refactor Plan

## Current State Analysis

### Current Usage Patterns

1. **useLocalStorage hook** (`apps/web/src/hooks/useLocalStorage.ts`)
   - Generic hook that accepts any key string
   - No centralized key management
   - No prefix convention enforced

2. **Direct localStorage usage** (found in 9 files):
   - `apps/web/src/lib/tour-steps.ts` - Tour completion flags
   - `apps/web/src/views/Dashboard.tsx` - Tour completion check
   - `apps/web/src/components/onboarding/OnboardingTour.tsx` - Tour state
   - `apps/web/src/components/backlog/CompletedSprintsSection.tsx` - UI state
   - `apps/web/src/hooks/useTaskPanel.ts` - (appears to use localStorage but need to check full file)
   - `apps/web/src/context/AuthContext.tsx` - Token and workspace ID storage
   - `apps/web/src/app/(auth)/callback/page.tsx` - (need to check)
   - `apps/web/src/lib/api-client.ts` - Token storage

3. **useLocalStorage hook usage** (found in 4 files):
   - `apps/web/src/components/Sidebar.tsx` - `"sidebar-collapsed"` state
   - `apps/web/src/hooks/useChat.ts` - `` `locus-active-chat-session-${workspaceId}` `` (already has prefix!)

### Issues Identified

1. **No centralized key definitions** - Keys are hardcoded strings throughout the codebase
2. **Inconsistent prefixing** - Some keys have `locus_` or `locus-` prefix, most don't
3. **Mixed access patterns** - Direct localStorage calls and useLocalStorage hook usage
4. **Type safety** - No type-safe key access
5. **Maintenance difficulty** - Hard to track what keys are being used where

### Current Keys Found

**With locus prefix:**
- `locus_token` (api-client.ts)
- `locus-active-chat-session-{workspaceId}` (useChat.ts) - dynamic key

**Without prefix:**
- `sidebar-collapsed` (Sidebar.tsx)
- `hasSeenDashboardTour` (tour-steps.ts, Dashboard.tsx, OnboardingTour.tsx)
- `hasSeenBoardTour` (tour-steps.ts, OnboardingTour.tsx)
- `hasSeenChatTour` (tour-steps.ts, OnboardingTour.tsx)
- `hasSeenBacklogTour` (tour-steps.ts, OnboardingTour.tsx)
- `lastWorkspaceId` (AuthContext.tsx)
- `expandCompletedSprints` (CompletedSprintsSection.tsx)

## Proposed Solution

### 1. Create LocalStorage Keys Registry

Create `apps/web/src/lib/local-storage-keys.ts`:

```typescript
/**
 * Centralized LocalStorage Keys Registry
 * All localStorage keys used in the application.
 * All keys are prefixed with 'locus_' for easy identification.
 */

export const STORAGE_KEYS = {
  // Authentication & User
  AUTH_TOKEN: 'locus_token',
  LAST_WORKSPACE_ID: 'locus_lastWorkspaceId',

  // UI State
  SIDEBAR_COLLAPSED: 'locus_sidebarCollapsed',
  EXPAND_COMPLETED_SPRINTS: 'locus_expandCompletedSprints',

  // Onboarding Tours
  TOUR_DASHBOARD_SEEN: 'locus_tour_dashboard',
  TOUR_BOARD_SEEN: 'locus_tour_board',
  TOUR_CHAT_SEEN: 'locus_tour_chat',
  TOUR_BACKLOG_SEEN: 'locus_tour_backlog',

  // Chat (dynamic keys - functions to generate)
  chatSession: (workspaceId: string) => `locus_chatSession_${workspaceId}`,
} as const;

// Type-safe key access
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
```

### 2. Update useLocalStorage Hook

Modify `apps/web/src/hooks/useLocalStorage.ts` to be type-safe:

```typescript
import { useState } from "react";

export function useLocalStorage<T>(
  key: string, // This will accept values from STORAGE_KEYS
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // ... existing implementation
}
```

### 3. Create Storage Helper Module (Optional Enhancement)

Create `apps/web/src/lib/storage.ts` for consistent access:

```typescript
import { STORAGE_KEYS } from './local-storage-keys';

export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue ?? null;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      console.warn('Error reading localStorage key:', key, error);
      return defaultValue ?? null;
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error setting localStorage key:', key, error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error removing localStorage key:', key, error);
    }
  },

  keys: STORAGE_KEYS,
};
```

## Implementation Steps

### Phase 1: Create Infrastructure
1. Create `apps/web/src/lib/local-storage-keys.ts` with STORAGE_KEYS constant
2. Optionally create `apps/web/src/lib/storage.ts` helper module
3. Export from `apps/web/src/lib/index.ts` if it exists

### Phase 2: Update Files (by category)

#### Authentication & User (2 files)
1. `apps/web/src/lib/api-client.ts`
   - Replace `"locus_token"` with `STORAGE_KEYS.AUTH_TOKEN`

2. `apps/web/src/context/AuthContext.tsx`
   - Replace `"locus_token"` with `STORAGE_KEYS.AUTH_TOKEN`
   - Replace `"lastWorkspaceId"` with `STORAGE_KEYS.LAST_WORKSPACE_ID`

#### UI State (2 files)
3. `apps/web/src/components/Sidebar.tsx`
   - Replace `"sidebar-collapsed"` with `STORAGE_KEYS.SIDEBAR_COLLAPSED`

4. `apps/web/src/components/backlog/CompletedSprintsSection.tsx`
   - Replace `"expandCompletedSprints"` with `STORAGE_KEYS.EXPAND_COMPLETED_SPRINTS`

#### Onboarding Tours (3 files)
5. `apps/web/src/lib/tour-steps.ts`
   - Replace `"hasSeenDashboardTour"` with `STORAGE_KEYS.TOUR_DASHBOARD_SEEN`
   - Replace `"hasSeenBoardTour"` with `STORAGE_KEYS.TOUR_BOARD_SEEN`
   - Replace `"hasSeenChatTour"` with `STORAGE_KEYS.TOUR_CHAT_SEEN`
   - Replace `"hasSeenBacklogTour"` with `STORAGE_KEYS.TOUR_BACKLOG_SEEN`

6. `apps/web/src/views/Dashboard.tsx`
   - Replace `"hasSeenDashboardTour"` with `STORAGE_KEYS.TOUR_DASHBOARD_SEEN`

7. `apps/web/src/components/onboarding/OnboardingTour.tsx`
   - Replace all tour keys with STORAGE_KEYS equivalents

#### Chat (1 file)
8. `apps/web/src/hooks/useChat.ts`
   - Replace template literal with `STORAGE_KEYS.chatSession(workspaceId)`

### Phase 3: Verification & Testing
1. Search for any remaining direct localStorage usage without locus_ prefix
2. Run lint and typecheck
3. Test in browser to ensure localStorage keys are properly prefixed
4. Check browser DevTools Application > Local Storage to verify all keys have `locus_` prefix

## Migration Notes

### Backwards Compatibility

Users who have existing localStorage data will lose their settings when we change the keys. We need to handle migration:

```typescript
// Migration helper in storage.ts or a migration file
export function migrateLocalStorage() {
  const migrations = {
    'sidebar-collapsed': STORAGE_KEYS.SIDEBAR_COLLAPSED,
    'hasSeenDashboardTour': STORAGE_KEYS.TOUR_DASHBOARD_SEEN,
    'hasSeenBoardTour': STORAGE_KEYS.TOUR_BOARD_SEEN,
    'hasSeenChatTour': STORAGE_KEYS.TOUR_CHAT_SEEN,
    'hasSeenBacklogTour': STORAGE_KEYS.TOUR_BACKLOG_SEEN,
    'lastWorkspaceId': STORAGE_KEYS.LAST_WORKSPACE_ID,
    'expandCompletedSprints': STORAGE_KEYS.EXPAND_COMPLETED_SPRINTS,
  };

  Object.entries(migrations).forEach(([oldKey, newKey]) => {
    const value = localStorage.getItem(oldKey);
    if (value !== null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  });

  // Mark migration as complete
  localStorage.setItem('locus_migrated', 'true');
}
```

This migration should run once on app initialization.

## Benefits

1. **Discoverability** - All keys in one place, easy to see what's being stored
2. **Type Safety** - Centralized constants prevent typos
3. **Consistency** - All keys follow `locus_` prefix convention
4. **Maintainability** - Easy to add/remove/modify keys
5. **Browser Debugging** - Easy to identify Locus-specific keys in DevTools
6. **Namespace Protection** - Avoid conflicts with other apps on same domain

## Risk Assessment

**Low Risk Changes:**
- Creating new key constants file
- Updating direct localStorage.setItem/getItem calls

**Medium Risk Changes:**
- Migrating existing user data
- Changes to authentication token storage (need careful testing)

**Mitigation:**
- Implement migration strategy
- Test thoroughly in development
- Consider feature flag for rollout
- Have rollback plan ready

## Files to Modify

Total: ~10-11 files

**New Files:**
- `apps/web/src/lib/local-storage-keys.ts` (new)
- `apps/web/src/lib/storage.ts` (new, optional)
- `apps/web/src/lib/migrations.ts` (new, for data migration)

**Modified Files:**
- `apps/web/src/hooks/useLocalStorage.ts` (minor update for types)
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/context/AuthContext.tsx`
- `apps/web/src/components/Sidebar.tsx`
- `apps/web/src/components/backlog/CompletedSprintsSection.tsx`
- `apps/web/src/lib/tour-steps.ts`
- `apps/web/src/views/Dashboard.tsx`
- `apps/web/src/components/onboarding/OnboardingTour.tsx`
- `apps/web/src/hooks/useChat.ts`
- `apps/web/src/app/layout.tsx` or main app entry (to run migration)

## Completion Criteria

- [ ] All localStorage keys defined in centralized registry
- [ ] All keys use `locus_` prefix
- [ ] No hardcoded string keys in codebase
- [ ] Migration strategy implemented and tested
- [ ] Lint and typecheck pass
- [ ] Browser testing confirms all keys properly prefixed
- [ ] Documentation updated if needed
