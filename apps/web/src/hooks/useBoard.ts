"use client";

import { SprintStatus, TaskStatus } from "@locusai/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { sprintService } from "@/services";

export function useBoard() {
  const {
    loading: tasksLoading,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    hasActiveFilters,
    clearFilters,
    getTasksByStatus,
    updateTaskStatus,
    deleteTask,
    refreshTasks,
  } = useTasks();

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ["sprints"],
    queryFn: sprintService.getAll,
  });

  const activeSprint = sprints.find((s) => s.status === SprintStatus.ACTIVE);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus>(
    TaskStatus.BACKLOG
  );
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleOpenCreateModal = useCallback((status: TaskStatus) => {
    setCreateModalStatus(status);
    setIsCreateModalOpen(true);
  }, []);

  const handleDrop = useCallback(
    async (status: TaskStatus, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverColumn(null);
      const taskId = e.dataTransfer.getData("taskId");
      if (!taskId) return;
      await updateTaskStatus(Number(taskId), status);
    },
    [updateTaskStatus]
  );

  const handleDragOver = useCallback(
    (status: TaskStatus, e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumn(status);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  return {
    loading: tasksLoading || sprintsLoading,
    activeSprint,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    hasActiveFilters,
    clearFilters,
    getTasksByStatus,
    updateTaskStatus,
    deleteTask,
    refreshTasks,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createModalStatus,
    handleOpenCreateModal,
    selectedTaskId,
    setSelectedTaskId,
    dragOverColumn,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  };
}
