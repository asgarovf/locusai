/**
 * Task Header Component
 *
 * Displays task metadata and action buttons in the panel header.
 * Shows task ID, status, priority, and contextual actions.
 *
 * @example
 * <TaskHeader
 *   task={task}
 *   onClose={handleClose}
 *   onDelete={handleDelete}
 *   onApprove={handleApprove}
 *   onReject={handleReject}
 * />
 */

"use client";

import { type Task, TaskPriority, TaskStatus } from "@locusai/shared";
import { CheckCircle, ChevronRight, Trash2 } from "lucide-react";
import { MetadataText } from "@/components/typography";
import { Button, PriorityBadge, StatusBadge } from "@/components/ui";

interface TaskHeaderProps {
  /** Task to display in header */
  task: Task;
  /** Whether a task mutation is loading */
  isLoading?: boolean;
  /** Whether task deletion is in progress */
  isDeleting?: boolean;
  /** Callback when closing panel */
  onClose: () => void;
  /** Callback to delete task */
  onDelete: () => void;
  /** Callback to approve task (if in review) */
  onApprove: () => void;
  /** Callback to reject task (if in review) */
  onReject: () => void;
}

/**
 * Task Header Component
 *
 * Features:
 * - Task ID reference
 * - Status and priority badges
 * - Approve/reject buttons (if in review status)
 * - Delete button
 * - Close button
 *
 * @component
 */
export function TaskHeader({
  task,
  isLoading = false,
  isDeleting = false,
  onClose,
  onDelete,
  onApprove,
  onReject,
}: TaskHeaderProps) {
  const canApproveReject =
    task.status === TaskStatus.PR_OPEN || task.status === TaskStatus.IN_REVIEW;

  return (
    <header className="flex items-center gap-6 px-10 border-b border-border bg-card/50 backdrop-blur-md h-[84px] shrink-0">
      <button
        className="p-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200 border border-transparent hover:border-border"
        onClick={onClose}
        aria-label="Close task panel"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      <div className="flex-1 min-w-0">
        <MetadataText size="sm" className="mb-1.5 block">
          ID: #{task.id}
        </MetadataText>
        <div className="flex gap-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority || TaskPriority.MEDIUM} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canApproveReject && (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={onReject}
              disabled={isLoading}
              className="h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px]"
              aria-label="Reject task"
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={onApprove}
              disabled={isLoading}
              className="h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px]"
              aria-label="Approve task"
            >
              <CheckCircle size={16} className="mr-2" aria-hidden="true" />
              Approve
            </Button>
            <div className="w-px h-6 bg-border mx-2" aria-hidden="true" />
          </>
        )}
        <Button
          size="icon"
          variant="danger"
          onClick={onDelete}
          disabled={isDeleting}
          title="Delete"
          className="h-10 w-10 hover:scale-105 active:scale-95 transition-transform rounded-xl"
          aria-label="Delete task"
        >
          <Trash2 size={18} aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
