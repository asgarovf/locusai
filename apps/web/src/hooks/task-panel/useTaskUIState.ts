/**
 * Task Panel UI State Hook
 *
 * Manages UI state (editing, modals, descriptions mode).
 */

"use client";

import { type Task } from "@locusai/shared";
import { useEffect, useState } from "react";

export interface TaskUIState {
  isEditingTitle: boolean;
  editTitle: string;
  editDesc: string;
  newComment: string;
  newChecklistItem: string;
  descMode: "edit" | "preview";
  showRejectModal: boolean;
  rejectReason: string;
}

export interface TaskUIActions {
  setIsEditingTitle: (value: boolean) => void;
  setEditTitle: (value: string) => void;
  setEditDesc: (value: string) => void;
  setNewComment: (value: string) => void;
  setNewChecklistItem: (value: string) => void;
  setDescMode: (value: "edit" | "preview") => void;
  setShowRejectModal: (value: boolean) => void;
  setRejectReason: (value: string) => void;
  resetCommentInput: () => void;
  resetChecklistInput: () => void;
}

/**
 * Manage task panel UI state
 */
export function useTaskUIState(task?: Task): TaskUIState & TaskUIActions {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [descMode, setDescMode] = useState<"edit" | "preview">("preview");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Sync with task data
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || "");
    }
  }, [task]);

  const resetCommentInput = () => setNewComment("");
  const resetChecklistInput = () => setNewChecklistItem("");

  return {
    isEditingTitle,
    editTitle,
    editDesc,
    newComment,
    newChecklistItem,
    descMode,
    showRejectModal,
    rejectReason,
    setIsEditingTitle,
    setEditTitle,
    setEditDesc,
    setNewComment,
    setNewChecklistItem,
    setDescMode,
    setShowRejectModal,
    setRejectReason,
    resetCommentInput,
    resetChecklistInput,
  };
}
