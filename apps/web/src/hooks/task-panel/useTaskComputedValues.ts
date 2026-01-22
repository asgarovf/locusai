/**
 * Task Panel Computed Values Hook
 *
 * Manages computed values (lock state, checklist progress).
 */

"use client";

import { type Task } from "@locusai/shared";

export interface TaskComputedValues {
  isLocked: boolean;
  checklistProgress: number;
}

/**
 * Compute task-related values
 */
export function useTaskComputedValues(task?: Task): TaskComputedValues {
  const isLocked: boolean = !!(
    task?.lockedBy &&
    (!task.lockExpiresAt || new Date(task.lockExpiresAt).getTime() > Date.now())
  );

  const checklistProgress = task?.acceptanceChecklist?.length
    ? Math.round(
        (task.acceptanceChecklist.filter((i) => i.done).length /
          task.acceptanceChecklist.length) *
          100
      )
    : 0;

  return {
    isLocked,
    checklistProgress,
  };
}
