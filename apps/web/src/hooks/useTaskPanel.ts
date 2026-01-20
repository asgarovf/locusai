"use client";

import { type AcceptanceItem, type Task, TaskStatus } from "@locusai/shared";
import { useCallback, useEffect, useState } from "react";
import { taskService } from "@/services";

interface UseTaskPanelProps {
  taskId: number;
  onUpdated: () => void;
  onDeleted: () => void;
  onClose: () => void;
}

export function useTaskPanel({
  taskId,
  onUpdated,
  onDeleted,
  onClose,
}: UseTaskPanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [descMode, setDescMode] = useState<"edit" | "preview">("preview");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchTask = useCallback(async () => {
    try {
      const taskData = await taskService.getById(taskId);
      const initializedTask: Task = {
        ...taskData,
        acceptanceChecklist: taskData.acceptanceChecklist || [],
        artifacts: taskData.artifacts || [],
        activityLog: taskData.activityLog || [],
        comments: taskData.comments || [],
      };
      setTask(initializedTask);
      setEditTitle(taskData.title);
      setEditDesc(taskData.description || "");
    } catch (err) {
      console.error("Failed to fetch task:", err);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleUpdateTask = async (updates: Partial<Task>) => {
    try {
      await taskService.update(taskId, updates);
      await fetchTask();
      onUpdated();
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
      await taskService.delete(taskId);
      onDeleted();
      onClose();
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
      acceptanceChecklist: [...task.acceptanceChecklist, newItem],
    });
    setNewChecklistItem("");
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!task) return;
    const updated = task.acceptanceChecklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    handleUpdateTask({ acceptanceChecklist: updated });
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    if (!task) return;
    const updated = task.acceptanceChecklist.filter(
      (item) => item.id !== itemId
    );
    handleUpdateTask({ acceptanceChecklist: updated });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await taskService.addComment(taskId, {
        author: "Human",
        text: newComment,
      });
      setNewComment("");
      await fetchTask();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleRunCi = async (preset: string) => {
    try {
      const data = await taskService.runCi(taskId, preset);
      alert(data.summary);
      await fetchTask();
    } catch (err) {
      console.error("Failed to run CI:", err);
    }
  };

  const handleLock = async () => {
    try {
      await taskService.lock(taskId, "human", 3600);
      await fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to lock task:", err);
    }
  };

  const handleUnlock = async () => {
    try {
      await taskService.unlock(taskId, "human");
      await fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to unlock task:", err);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await taskService.update(taskId, { status: TaskStatus.IN_PROGRESS });
      await taskService.addComment(taskId, {
        author: "Manager",
        text: `❌ **Rejected**: ${rejectReason}`,
      });
      setShowRejectModal(false);
      setRejectReason("");
      await fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to reject task:", err);
    }
  };

  const handleApprove = async () => {
    try {
      await taskService.update(taskId, { status: TaskStatus.DONE });
      await fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to approve task:", err);
    }
  };

  const isLocked =
    task?.lockedBy && (!task.lockExpiresAt || task.lockExpiresAt > Date.now());
  const checklistProgress = task?.acceptanceChecklist.length
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
    handleRunCi,
    handleLock,
    handleUnlock,
    handleReject,
    handleApprove,
    refresh: fetchTask,
  };
}
