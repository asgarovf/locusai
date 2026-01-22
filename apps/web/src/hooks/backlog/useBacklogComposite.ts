/**
 * Backlog Composite Hook
 *
 * Combines all backlog hooks for backward compatibility.
 * Prefer using individual hooks for new code.
 */

"use client";

import { useBacklogActions } from "./useBacklogActions";
import { useBacklogData } from "./useBacklogData";
import { useBacklogDragDrop } from "./useBacklogDragDrop";
import { useBacklogUI } from "./useBacklogUI";

/**
 * All-in-one backlog hook (kept for backward compatibility)
 *
 * @deprecated Prefer using individual hooks:
 * - useBacklogUI for UI state
 * - useBacklogData for data
 * - useBacklogDragDrop for drag operations
 * - useBacklogActions for API calls
 */
export function useBacklogComposite() {
  const ui = useBacklogUI();
  const data = useBacklogData();
  const dragDrop = useBacklogDragDrop(data.tasks);
  const actions = useBacklogActions({
    onSprintCreated: () => {
      ui.setIsSprintModalOpen(false);
      data.refetchSprints();
    },
  });

  return {
    // Data
    tasks: data.tasks,
    sprints: data.sprints,
    backlogTasks: data.backlogTasks,
    activeSprint: data.activeSprint,
    plannedSprints: data.plannedSprints,
    completedSprints: data.completedSprints,
    getSprintTasks: data.getSprintTasks,
    isLoading: data.isLoading,

    // UI State
    isTaskModalOpen: ui.isTaskModalOpen,
    setIsTaskModalOpen: ui.setIsTaskModalOpen,
    isSprintModalOpen: ui.isSprintModalOpen,
    setIsSprintModalOpen: ui.setIsSprintModalOpen,
    selectedTaskId: ui.selectedTaskId,
    setSelectedTaskId: ui.setSelectedTaskId,
    expandedSections: ui.expandedSections,
    toggleSection: ui.toggleSection,

    // Drag & Drop
    activeTask: dragDrop.activeTask,
    sensors: dragDrop.sensors,
    handleDragStart: dragDrop.handleDragStart,
    handleDragEnd: dragDrop.handleDragEnd,

    // Actions
    isSubmitting: actions.isSubmitting,
    handleCreateSprint: actions.handleCreateSprint,
    handleStartSprint: actions.handleStartSprint,
    handleCompleteSprint: actions.handleCompleteSprint,
    handleDeleteTask: actions.handleDeleteTask,

    // Data actions
    refetchTasks: data.refetchTasks,
    refetchSprints: data.refetchSprints,
  };
}
