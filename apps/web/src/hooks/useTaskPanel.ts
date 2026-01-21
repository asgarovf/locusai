"use client";

import { type AcceptanceItem, type Task, TaskStatus } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
  // Note: workspaceId is guaranteed by WorkspaceProtected wrapper
  const { data: task, refetch: fetchTask } = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => locusClient.tasks.getById(taskId, workspaceId),
    enabled: !!workspaceId,
  });

  // UI State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [descMode, setDescMode] = useState<"edit" | "preview">("preview");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || "");
    }
  }, [task]);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: (updates: Partial<Task>) =>
      locusClient.tasks.update(taskId, workspaceId as string, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });
      onUpdated();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => locusClient.tasks.delete(taskId, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      onDeleted();
      onClose();
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { author: string; text: string }) =>
      locusClient.tasks.addComment(taskId, workspaceId as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(taskId),
      });
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
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleLock = async () => {
    try {
      await locusClient.tasks.lock(taskId, workspaceId as string, {
        agentId: "human",
        ttlSeconds: 3600,
      });
      await fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to lock task:", err);
    }
  };

  const handleUnlock = async () => {
    try {
      await locusClient.tasks.unlock(taskId, workspaceId as string, {
        agentId: "human",
      });
      await fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to unlock task:", err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await updateTaskMutation.mutateAsync({
        status: TaskStatus.IN_PROGRESS,
      });
      await addCommentMutation.mutateAsync({
        author: "Manager",
        text: `❌ **Rejected**: ${rejectReason}`,
      });
      setShowRejectModal(false);
      setRejectReason("");
      onUpdated();
    } catch (err) {
      console.error("Failed to reject task:", err);
    }
  };

  const handleApprove = async () => {
    try {
      await updateTaskMutation.mutateAsync({ status: TaskStatus.DONE });
      onUpdated();
    } catch (err) {
      console.error("Failed to approve task:", err);
    }
  };

  const isLocked =
    task?.lockedBy &&
    (!task.lockExpiresAt ||
      new Date(task.lockExpiresAt).getTime() > Date.now());
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
    isLocked,
    checklistProgress,
    handleUpdateTask,
    handleDelete,
    handleTitleSave,
    handleDescSave,
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleRemoveChecklistItem,
    handleAddComment,
    handleLock,
    handleUnlock,
    handleReject,
    handleApprove,
    refresh: fetchTask,
  };
}
