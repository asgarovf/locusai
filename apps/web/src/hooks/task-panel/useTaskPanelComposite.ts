/**
 * Task Panel Composite Hook
 *
 * Combines all task panel hooks for backward compatibility.
 * Prefer using individual hooks for new code.
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useTaskActions } from "./useTaskActions";
import { useTaskComputedValues } from "./useTaskComputedValues";
import { useTaskData } from "./useTaskData";
import { useTaskUIState } from "./useTaskUIState";

interface UseTaskPanelProps {
  taskId: string;
  onUpdated: () => void;
  onDeleted: () => void;
  onClose: () => void;
}

/**
 * All-in-one task panel hook (kept for backward compatibility)
 *
 * @deprecated Prefer using individual hooks:
 * - useTaskData for task fetching
 * - useTaskUIState for UI state
 * - useTaskActions for operations
 * - useTaskComputedValues for derived values
 */
export function useTaskPanelComposite({
  taskId,
  onUpdated,
  onDeleted,
  onClose,
}: UseTaskPanelProps) {
  const { user } = useAuth();
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const { task, isLoading, updateTask, deleteTask, refetchTask } = useTaskData({
    taskId,
    onUpdated,
  });

  const ui = useTaskUIState(task);
  const actions = useTaskActions({
    taskId,
    onUpdateTask: updateTask,
    onAddComment: async (text) => {
      await locusClient.tasks.addComment(taskId, workspaceId, {
        author: user?.name || "Anonymous",
        text,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });
    },
  });

  const computed = useTaskComputedValues(task);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteTask();
      onDeleted();
      onClose();
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleAddComment = async () => {
    if (!ui.newComment.trim()) return;
    try {
      await locusClient.tasks.addComment(taskId, workspaceId, {
        author: user?.name || "Anonymous",
        text: ui.newComment,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });
      ui.resetCommentInput();
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return {
    task,
    isLoading,
    // UI State
    isEditingTitle: ui.isEditingTitle,
    setIsEditingTitle: ui.setIsEditingTitle,
    editTitle: ui.editTitle,
    setEditTitle: ui.setEditTitle,
    editDesc: ui.editDesc,
    setEditDesc: ui.setEditDesc,
    newComment: ui.newComment,
    setNewComment: ui.setNewComment,
    newChecklistItem: ui.newChecklistItem,
    setNewChecklistItem: ui.setNewChecklistItem,
    descMode: ui.descMode,
    setDescMode: ui.setDescMode,
    showRejectModal: ui.showRejectModal,
    setShowRejectModal: ui.setShowRejectModal,
    rejectReason: ui.rejectReason,
    setRejectReason: ui.setRejectReason,
    // Computed
    isLocked: computed.isLocked,
    checklistProgress: computed.checklistProgress,
    // Actions
    handleUpdateTask: updateTask,
    handleLinkDoc: async (docId: string) => {
      const currentDocIds = task?.docs?.map((d) => d.id) || [];
      await actions.handleLinkDoc(docId, currentDocIds);
    },
    handleUnlinkDoc: async (docId: string) => {
      const currentDocIds = task?.docs?.map((d) => d.id) || [];
      await actions.handleUnlinkDoc(docId, currentDocIds);
    },
    handleDelete,
    handleTitleSave: () => actions.handleTitleSave(ui.editTitle, task?.title),
    handleDescSave: () =>
      actions.handleDescSave(ui.editDesc, task?.description),
    handleAddChecklistItem: () =>
      actions.handleAddChecklistItem(
        ui.newChecklistItem,
        task?.acceptanceChecklist || []
      ),
    handleToggleChecklistItem: (itemId: string) =>
      actions.handleToggleChecklistItem(
        itemId,
        task?.acceptanceChecklist || []
      ),
    handleRemoveChecklistItem: (itemId: string) =>
      actions.handleRemoveChecklistItem(
        itemId,
        task?.acceptanceChecklist || []
      ),
    handleAddComment,
    handleLock: actions.handleLock,
    handleUnlock: actions.handleUnlock,
    handleReject: (onSuccess?: () => void) =>
      actions.handleReject(ui.rejectReason, () => {
        ui.setShowRejectModal(false);
        ui.setRejectReason("");
        onSuccess?.();
      }),
    handleApprove: (onSuccess?: () => void) => actions.handleApprove(onSuccess),
    refresh: refetchTask,
  };
}
