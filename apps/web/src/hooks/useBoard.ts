"use client";

import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SprintStatus, type Task, TaskStatus } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BOARD_STATUSES } from "@/components/board/constants";
import { showToast } from "@/components/ui";
import { useSprintsQuery, useTasksQuery } from "@/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useBoard() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch,
  } = useTasksQuery();
  const { data: sprints = [], isLoading: sprintsLoading } = useSprintsQuery();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskIdState] = useState<string | null>(
    null
  );

  // Sync URL query param with state on mount
  useEffect(() => {
    const taskIdFromUrl = searchParams.get("taskId");
    if (taskIdFromUrl) {
      setSelectedTaskIdState(taskIdFromUrl);
    }
  }, [searchParams]);

  const setSelectedTaskId = (id: string | null) => {
    setSelectedTaskIdState(id);
    if (id) {
      router.push(`/board?taskId=${id}`, { scroll: false });
    } else {
      router.push("/board", { scroll: false });
    }
  };
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "canvas">("board");
  const [isCompact, setIsCompact] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Get active sprint
  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === SprintStatus.ACTIVE),
    [sprints]
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Sprint filter (Always show active sprint only if it exists)
      if (activeSprint) {
        if (task.sprintId !== activeSprint.id) return false;
      } else {
        // If no active sprint, show nothing on board (it will hit empty state)
        return false;
      }
      // Search filter
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Priority filter
      if (priorityFilter && task.priority !== priorityFilter) {
        return false;
      }
      // Role filter
      if (roleFilter && task.assigneeRole !== roleFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, activeSprint, searchQuery, priorityFilter, roleFilter]);

  // Group by status
  const tasksByStatus = useMemo(() => {
    return BOARD_STATUSES.reduce(
      (acc, status) => {
        acc[status.key] = filteredTasks.filter((t) => t.status === status.key);
        return acc;
      },
      {} as Record<TaskStatus, Task[]>
    );
  }, [filteredTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Resolve target status
    const overTask = tasks.find((t) => t.id === overId);
    const newStatus = overTask ? overTask.status : (overId as TaskStatus);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    const previousTasks = queryClient.getQueryData<Task[]>(
      queryKeys.tasks.list(workspaceId)
    );

    if (previousTasks) {
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(workspaceId),
        previousTasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      );
    }

    try {
      await locusClient.tasks.update(taskId, workspaceId, {
        status: newStatus,
      });
      // No need to refetch if optimistic update is successful,
      // but we should eventually to stay in sync.
      // queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(workspaceId) });
    } catch (error) {
      // Rollback
      if (previousTasks) {
        queryClient.setQueryData(
          queryKeys.tasks.list(workspaceId),
          previousTasks
        );
      }
      showToast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = queryClient.getQueryData<Task[]>(
      queryKeys.tasks.list(workspaceId)
    );

    if (previousTasks) {
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(workspaceId),
        previousTasks.filter((t) => t.id !== taskId)
      );
    }

    try {
      await locusClient.tasks.delete(taskId, workspaceId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
    } catch (error) {
      // Rollback
      if (previousTasks) {
        queryClient.setQueryData(
          queryKeys.tasks.list(workspaceId),
          previousTasks
        );
      }
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    }
  };

  const isLoading = tasksLoading || sprintsLoading;
  const shouldShowEmptyState = !activeSprint;

  return {
    tasks,
    activeSprint,
    filteredTasks,
    tasksByStatus,
    activeTask,
    isLoading,
    shouldShowEmptyState,
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    roleFilter,
    setRoleFilter,
    view,
    setView,
    isCompact,
    setIsCompact,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDeleteTask,
    refetch,
  };
}
