"use client";

import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { taskService } from "@/services";

export function useTasks() {
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading: loading,
    error: queryError,
    refetch: refreshTasks,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => taskService.getAll(),
    refetchInterval: 15000,
  });

  const error = queryError ? (queryError as Error).message : null;

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">(
    "ALL"
  );
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeRole | "ALL">(
    "ALL"
  );

  const hasActiveFilters = useMemo(
    () =>
      searchQuery !== "" ||
      priorityFilter !== "ALL" ||
      assigneeFilter !== "ALL",
    [searchQuery, priorityFilter, assigneeFilter]
  );

  const updateMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      taskService.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated", {
        description: "Status changed successfully",
      });
    },
    onError: (err) => {
      toast.error("Failed to update task", {
        description: (err as Error).message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: number) => taskService.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted", {
        description: "The task has been removed",
      });
    },
    onError: (err) => {
      toast.error("Failed to delete task", {
        description: (err as Error).message,
      });
    },
  });

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setPriorityFilter("ALL");
    setAssigneeFilter("ALL");
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
        return false;
      }
      if (assigneeFilter !== "ALL" && task.assigneeRole !== assigneeFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter]);

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => {
      return filteredTasks.filter((t) => t.status === status);
    },
    [filteredTasks]
  );

  const updateTaskStatus = useCallback(
    async (taskId: number, status: TaskStatus) => {
      await updateMutation.mutateAsync({ taskId, status });
    },
    [updateMutation]
  );

  const deleteTask = useCallback(
    async (taskId: number) => {
      await deleteMutation.mutateAsync(taskId);
    },
    [deleteMutation]
  );

  return {
    tasks,
    loading,
    error,
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
  };
}
