/**
 * Task Panel Computed Values Hook
 *
 * Manages computed values (checklist progress).
 */

"use client";

import { type Task } from "@locusai/shared";

export interface TaskComputedValues {
  checklistProgress: number;
}

/**
 * Compute task-related values
 */
export function useTaskComputedValues(task?: Task): TaskComputedValues {
  const checklistProgress = task?.acceptanceChecklist?.length
    ? Math.round(
        (task.acceptanceChecklist.filter((i) => i.done).length /
          task.acceptanceChecklist.length) *
          100
      )
    : 0;

  return {
    checklistProgress,
  };
}
