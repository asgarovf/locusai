/**
 * Task Panel Actions Hook
 *
 * Manages task operations (save, delete, approve, reject, etc.).
 */

"use client";

import { type AcceptanceItem, TaskStatus } from "@locusai/shared";
import { notifications } from "@/services/notifications";

export interface TaskActionHandlers {
  handleTitleSave: (editTitle: string, currentTitle?: string) => Promise<void>;
  handleDescSave: (editDesc: string, currentDesc?: string) => Promise<void>;
  handleAddChecklistItem: (
    newItem: string,
    checklist: AcceptanceItem[]
  ) => Promise<void>;
  handleToggleChecklistItem: (
    itemId: string,
    checklist: AcceptanceItem[]
  ) => Promise<void>;
  handleRemoveChecklistItem: (
    itemId: string,
    checklist: AcceptanceItem[]
  ) => Promise<void>;
  handleLinkDoc: (docId: string, currentDocIds: string[]) => Promise<void>;
  handleUnlinkDoc: (docId: string, currentDocIds: string[]) => Promise<void>;
  handleReject: (reason: string, onSuccess?: () => void) => Promise<void>;
  handleApprove: (onSuccess?: () => void) => Promise<void>;
}

interface UseTaskActionsProps {
  onUpdateTask: (
    updates: Partial<{
      title?: string;
      description?: string;
      acceptanceChecklist?: AcceptanceItem[];
      status?: TaskStatus;
      docIds?: string[];
    }>
  ) => Promise<void>;
  onAddComment?: (text: string) => Promise<void>;
}

/**
 * Manage task operations
 */
export function useTaskActions({
  onUpdateTask,
  onAddComment,
}: UseTaskActionsProps): TaskActionHandlers {
  const handleTitleSave = async (editTitle: string, currentTitle?: string) => {
    if (editTitle.trim() && editTitle !== currentTitle) {
      try {
        await onUpdateTask({ title: editTitle.trim() });
      } catch (error) {
        notifications.error(
          error instanceof Error ? error.message : "Failed to update title"
        );
      }
    }
  };

  const handleDescSave = async (editDesc: string, currentDesc?: string) => {
    if (editDesc !== currentDesc) {
      try {
        await onUpdateTask({ description: editDesc });
      } catch (error) {
        notifications.error(
          error instanceof Error
            ? error.message
            : "Failed to update description"
        );
      }
    }
  };

  const handleAddChecklistItem = async (
    newItem: string,
    checklist: AcceptanceItem[]
  ) => {
    if (!newItem.trim()) return;
    try {
      const item: AcceptanceItem = {
        id: crypto.randomUUID(),
        text: newItem.trim(),
        done: false,
      };
      await onUpdateTask({
        acceptanceChecklist: [...checklist, item],
      });
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to add checklist item"
      );
    }
  };

  const handleToggleChecklistItem = async (
    itemId: string,
    checklist: AcceptanceItem[]
  ) => {
    try {
      const updated = checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      );
      await onUpdateTask({ acceptanceChecklist: updated });
    } catch (error) {
      notifications.error(
        error instanceof Error
          ? error.message
          : "Failed to toggle checklist item"
      );
    }
  };

  const handleRemoveChecklistItem = async (
    itemId: string,
    checklist: AcceptanceItem[]
  ) => {
    try {
      const updated = checklist.filter((item) => item.id !== itemId);
      await onUpdateTask({ acceptanceChecklist: updated });
    } catch (error) {
      notifications.error(
        error instanceof Error
          ? error.message
          : "Failed to remove checklist item"
      );
    }
  };

  const handleLinkDoc = async (docId: string, currentDocIds: string[]) => {
    if (currentDocIds.includes(docId)) return;
    try {
      await onUpdateTask({
        docIds: [...currentDocIds, docId],
      });
      notifications.success("Document linked");
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to link document"
      );
    }
  };

  const handleUnlinkDoc = async (docId: string, currentDocIds: string[]) => {
    try {
      await onUpdateTask({
        docIds: currentDocIds.filter((id) => id !== docId),
      });
      notifications.success("Document unlinked");
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to unlink document"
      );
    }
  };

  const handleReject = async (reason: string, onSuccess?: () => void) => {
    if (!reason.trim()) return;
    try {
      await onUpdateTask({ status: TaskStatus.IN_PROGRESS });
      if (onAddComment) {
        await onAddComment(`❌ **Rejected**: ${reason}`);
      }
      notifications.success("Task rejected");
      onSuccess?.();
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to reject task"
      );
    }
  };

  const handleApprove = async (onSuccess?: () => void) => {
    try {
      await onUpdateTask({ status: TaskStatus.DONE });
      notifications.success("Task approved");
      onSuccess?.();
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to approve task"
      );
    }
  };

  return {
    handleTitleSave,
    handleDescSave,
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleRemoveChecklistItem,
    handleLinkDoc,
    handleUnlinkDoc,
    handleReject,
    handleApprove,
  };
}
