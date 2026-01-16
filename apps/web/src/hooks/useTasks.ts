import {
  AssigneeRole,
  type Task,
  TaskPriority,
  TaskStatus,
} from "@locus/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

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
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
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
    const interval = setInterval(fetchTasks, 10000);
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
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchTasks();
    },
    [fetchTasks]
  );

  const deleteTask = useCallback(
    async (taskId: number) => {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      fetchTasks();
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
