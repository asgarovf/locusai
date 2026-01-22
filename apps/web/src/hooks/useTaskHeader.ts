/**
 * Task Header Hook
 *
 * Manages task header state and actions like lock, approve, reject, and delete.
 */

"use client";

import { type Task, TaskStatus } from "@locusai/shared";

interface UseTaskHeaderProps {
  task: Task;
  onClose: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}

interface UseTaskHeaderReturn {
  isLocked: boolean;
  canApproveReject: boolean;
  handlers: {
    onClose: () => void;
    onLock: () => void;
    onUnlock: () => void;
    onDelete: () => void;
    onApprove: () => void;
    onReject: () => void;
  };
}

/**
 * Hook for task header actions
 *
 * Provides:
 * - Lock/unlock state
 * - Approval/rejection capabilities
 * - Delete action
 * - Close action
 *
 * @example
 * const { isLocked, canApproveReject, handlers } = useTaskHeader(props);
 */
export function useTaskHeader({
  task,
  onClose,
  onLock,
  onUnlock,
  onDelete,
  onApprove,
  onReject,
}: UseTaskHeaderProps): UseTaskHeaderReturn {
  // Task is locked if lockedBy is not null and lock hasn't expired
  const isLocked =
    task.lockedBy !== null &&
    (task.lockExpiresAt
      ? new Date(task.lockExpiresAt).getTime() > Date.now()
      : false);

  const canApproveReject = task.status === TaskStatus.VERIFICATION;

  return {
    isLocked,
    canApproveReject,
    handlers: {
      onClose,
      onLock,
      onUnlock,
      onDelete,
      onApprove,
      onReject,
    },
  };
}
