"use client";

import {
  AssigneeRole,
  type Task,
  TaskPriority,
  TaskStatus,
} from "@locus/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { taskService } from "@/services";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getAll();
      setTasks(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000); // Polling interval slightly increased
    return () => clearInterval(interval);
  }, [fetchTasks]);

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
      try {
        await taskService.update(taskId, { status });
        fetchTasks();
      } catch (err) {
        console.error("Failed to update task status:", err);
      }
    },
    [fetchTasks]
  );

  const deleteTask = useCallback(
    async (taskId: number) => {
      try {
        await taskService.delete(taskId);
        fetchTasks();
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    },
    [fetchTasks]
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
    refreshTasks: fetchTasks,
  };
}
