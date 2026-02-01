/**
 * Task Description Hook
 *
 * Extracts state management for task description editing.
 * Handles title and description editing with save functionality.
 */

"use client";

import { type Task } from "@locusai/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseTaskDescriptionProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

interface UseTaskDescriptionReturn {
  // Title state
  isEditingTitle: boolean;
  editTitle: string;

  // Description state
  editDesc: string;
  hasUnsavedChanges: boolean;
  saveStatus: SaveStatus;

  // Handlers
  setIsEditingTitle: (val: boolean) => void;
  setEditTitle: (val: string) => void;
  handleTitleSave: () => void;
  setEditDesc: (val: string) => void;
  handleDescSave: () => void;
  setSaveStatus: (status: SaveStatus) => void;

  // Quick actions
  cancelEdit: () => void;
}

/**
 * Hook for managing task description editing
 *
 * Handles state for:
 * - Title editing mode and content
 * - Description content and save status
 * - Save operations for both
 *
 * @example
 * const {
 *   isEditingTitle,
 *   editTitle,
 *   handleTitleSave,
 *   hasUnsavedChanges,
 *   saveStatus,
 *   // ... other handlers
 * } = useTaskDescription({ task, onUpdate });
 */
export function useTaskDescription({
  task,
  onUpdate,
}: UseTaskDescriptionProps): UseTaskDescriptionReturn {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Derive hasUnsavedChanges from comparing editDesc with task.description
  const hasUnsavedChanges = useMemo(() => {
    return editDesc !== (task.description || "");
  }, [editDesc, task.description]);

  // Synchronize local edit state when task prop changes
  useEffect(() => {
    setEditTitle(task.title);
    setEditDesc(task.description || "");
  }, [task.title, task.description]);

  const handleTitleSave = useCallback(() => {
    if (editTitle !== task.title && editTitle.trim()) {
      onUpdate({ title: editTitle });
    }
    setIsEditingTitle(false);
  }, [editTitle, task.title, onUpdate]);

  const handleDescSave = useCallback(() => {
    if (editDesc !== task.description) {
      onUpdate({ description: editDesc });
    }
  }, [editDesc, task.description, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setIsEditingTitle(false);
  }, [task]);

  return {
    isEditingTitle,
    editTitle,
    editDesc,
    hasUnsavedChanges,
    saveStatus,
    setIsEditingTitle,
    setEditTitle,
    handleTitleSave,
    setEditDesc,
    handleDescSave,
    setSaveStatus,
    cancelEdit,
  };
}
