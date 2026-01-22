/**
 * Task Description Hook
 *
 * Extracts state management for task description editing.
 * Handles title and description editing with save functionality.
 */

"use client";

import { type Task } from "@locusai/shared";
import { useCallback, useState } from "react";

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
  descMode: "edit" | "preview";

  // Handlers
  setIsEditingTitle: (val: boolean) => void;
  setEditTitle: (val: string) => void;
  handleTitleSave: () => void;
  setEditDesc: (val: string) => void;
  handleDescSave: () => void;
  setDescMode: (mode: "edit" | "preview") => void;

  // Quick actions
  toggleEditMode: () => void;
  cancelEdit: () => void;
}

/**
 * Hook for managing task description editing
 *
 * Handles state for:
 * - Title editing mode and content
 * - Description editing mode and content
 * - Save operations for both
 *
 * @example
 * const {
 *   isEditingTitle,
 *   editTitle,
 *   handleTitleSave,
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
  const [descMode, setDescMode] = useState<"edit" | "preview">("preview");

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

  const toggleEditMode = useCallback(() => {
    setDescMode(descMode === "edit" ? "preview" : "edit");
  }, [descMode]);

  const cancelEdit = useCallback(() => {
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setIsEditingTitle(false);
  }, [task]);

  return {
    isEditingTitle,
    editTitle,
    editDesc,
    descMode,
    setIsEditingTitle,
    setEditTitle,
    handleTitleSave,
    setEditDesc,
    handleDescSave,
    setDescMode,
    toggleEditMode,
    cancelEdit,
  };
}
