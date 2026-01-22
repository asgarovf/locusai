"use client";

import { type AcceptanceItem, type Task, TaskStatus } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UseTaskPanelProps {
  taskId: string;
  onUpdated: () => void;
  onDeleted: () => void;
  onClose: () => void;
}

/**
 * Task Panel Hook
 * Handles detailed task view, checklist logic, and operations.
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Support for assignedTo and dueDate fields
 * - Loading states for all mutations
 */
export function useTaskPanel({
  taskId,
  onUpdated,
  onDeleted,
  onClose,
}: UseTaskPanelProps) {
  const { user } = useAuth();
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  // Fetch task details
  const { data: task, refetch: fetchTask } = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => locusClient.tasks.getById(taskId, workspaceId),
    enabled: !!workspaceId,
  });

  // UI State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [descMode, setDescMode] = useState<"edit" | "preview">("preview");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || "");
      setEditAssignedTo(task.assignedTo || "");
      setEditDueDate(
        task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
      );
    }
  }, [task]);

  // Mutations with Optimistic Updates
  const updateTaskMutation = useMutation({
    mutationFn: (updates: Partial<Task> & { docIds?: string[] }) =>
      locusClient.tasks.update(taskId, workspaceId as string, updates),
    // Optimistic update: update cache immediately
    onMutate: async (updates) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });

      // Snapshot previous data
      const previousTask = queryClient.getQueryData<Task>(
        queryKeys.tasks.detail(taskId)
      );

      // Update cache optimistically
      if (previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          ...updates,
          dueDate: updates.dueDate
            ? new Date(updates.dueDate)
            : previousTask.dueDate,
        });
      }

      return { previousTask };
    },
    // On error, rollback to previous data
    onError: (_err, _variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          queryKeys.tasks.detail(taskId),
          context.previousTask
        );
      }
      toast.error("Failed to update task");
    },
    // On success, refetch to confirm
    onSuccess: () => {
      fetchTask();
      onUpdated();
    },
  });

  const handleLinkDoc = async (docId: string) => {
    if (!task) return;
    const currentDocIds = task.docs?.map((d) => d.id) || [];
    if (currentDocIds.includes(docId)) return;

    try {
      await updateTaskMutation.mutateAsync({
        docIds: [...currentDocIds, docId],
      });
      toast.success("Document linked");
    } catch {
      toast.error("Failed to link document");
    }
  };

  const handleUnlinkDoc = async (docId: string) => {
    if (!task) return;
    const currentDocIds = task.docs?.map((d) => d.id) || [];

    try {
      await updateTaskMutation.mutateAsync({
        docIds: currentDocIds.filter((id) => id !== docId),
      });
      toast.success("Document unlinked");
    } catch {
      toast.error("Failed to unlink document");
    }
  };

  const deleteTaskMutation = useMutation({
    mutationFn: () => locusClient.tasks.delete(taskId, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      toast.success("Task deleted");
      onDeleted();
      onClose();
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { author: string; text: string }) =>
      locusClient.tasks.addComment(taskId, workspaceId as string, data),
    onSuccess: () => {
      fetchTask();
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const handleUpdateTask = async (updates: Partial<Task>) => {
    try {
      await updateTaskMutation.mutateAsync(updates);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteTaskMutation.mutateAsync();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== task?.title) {
      handleUpdateTask({ title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    if (editDesc !== task?.description) {
      handleUpdateTask({ description: editDesc });
    }
  };

  const handleAssignedToSave = () => {
    if (editAssignedTo !== (task?.assignedTo || "")) {
      handleUpdateTask({ assignedTo: editAssignedTo || null });
    }
  };

  const handleDueDateSave = () => {
    if (editDueDate) {
      const newDate = new Date(editDueDate);
      handleUpdateTask({ dueDate: newDate });
    } else if (task?.dueDate) {
      handleUpdateTask({ dueDate: null });
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim() || !task) return;
    const newItem: AcceptanceItem = {
      id: crypto.randomUUID(),
      text: newChecklistItem.trim(),
      done: false,
    };
    handleUpdateTask({
      acceptanceChecklist: [...(task.acceptanceChecklist || []), newItem],
    });
    setNewChecklistItem("");
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!task?.acceptanceChecklist) return;
    const updated = task.acceptanceChecklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    handleUpdateTask({ acceptanceChecklist: updated });
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    if (!task?.acceptanceChecklist) return;
    const updated = task.acceptanceChecklist.filter(
      (item) => item.id !== itemId
    );
    handleUpdateTask({ acceptanceChecklist: updated });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        author: user?.name || "Anonymous",
        text: newComment,
      });
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await updateTaskMutation.mutateAsync({
        status: TaskStatus.IN_PROGRESS,
      });
      await addCommentMutation.mutateAsync({
        author: user?.name || "Manager",
        text: `❌ **Rejected**: ${rejectReason}`,
      });
      setShowRejectModal(false);
      setRejectReason("");
      toast.success("Task rejected and moved back to in progress");
      onUpdated();
    } catch (err) {
      console.error("Failed to reject task:", err);
      toast.error("Failed to reject task");
    }
  };

  const handleApprove = async () => {
    try {
      await updateTaskMutation.mutateAsync({ status: TaskStatus.DONE });
      toast.success("Task approved and marked as done");
      onUpdated();
    } catch (err) {
      console.error("Failed to approve task:", err);
      toast.error("Failed to approve task");
    }
  };

  const checklistProgress = task?.acceptanceChecklist?.length
    ? Math.round(
        (task.acceptanceChecklist.filter((i) => i.done).length /
          task.acceptanceChecklist.length) *
          100
      )
    : 0;

  return {
    task,
    isEditingTitle,
    setIsEditingTitle,
    editTitle,
    setEditTitle,
    editDesc,
    setEditDesc,
    editAssignedTo,
    setEditAssignedTo,
    editDueDate,
    setEditDueDate,
    newComment,
    setNewComment,
    newChecklistItem,
    setNewChecklistItem,
    descMode,
    setDescMode,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,
    checklistProgress,
    isLoading: updateTaskMutation.isPending || addCommentMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    handleUpdateTask,
    handleLinkDoc,
    handleUnlinkDoc,
    handleDelete,
    handleTitleSave,
    handleDescSave,
    handleAssignedToSave,
    handleDueDateSave,
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleRemoveChecklistItem,
    handleAddComment,
    handleReject,
    handleApprove,
    refresh: fetchTask,
  };
}
