"use client";

import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { type Sprint, SprintStatus, type Task } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/ui";
import { useSprintsQuery, useTasksQuery } from "@/hooks";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useBacklog() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useTasksQuery();
  const {
    data: sprints = [],
    isLoading: sprintsLoading,
    refetch: refetchSprints,
  } = useSprintsQuery();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
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
      router.push(`/backlog?taskId=${id}`, { scroll: false });
    } else {
      router.push("/backlog", { scroll: false });
    }
  };
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(["completed"])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle query parameters for new task/sprint
  useEffect(() => {
    const createTask = searchParams.get("createTask");
    const createSprint = searchParams.get("createSprint");

    if (createTask === "true") {
      setIsTaskModalOpen(true);
      router.replace("/backlog");
    } else if (createSprint === "true") {
      setIsSprintModalOpen(true);
      router.replace("/backlog");
    }
  }, [searchParams, router]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Group tasks efficiently
  const { backlogTasks, activeSprint, plannedSprints, completedSprints } =
    useMemo(() => {
      return {
        backlogTasks: tasks.filter((t) => !t.sprintId),
        activeSprint: sprints.find((s) => s.status === SprintStatus.ACTIVE),
        plannedSprints: sprints.filter(
          (s) => s.status === SprintStatus.PLANNED
        ),
        completedSprints: sprints.filter(
          (s) => s.status === SprintStatus.COMPLETED
        ),
      };
    }, [tasks, sprints]);

  const getSprintTasks = (sprintId: string) =>
    tasks.filter((t) => t.sprintId === sprintId);

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section);
    } else {
      newCollapsed.add(section);
    }
    setCollapsedSections(newCollapsed);
  };

  // Drag handlers
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

    // Find the actual target container (sprint ID or "backlog")
    let targetContainerId = overId;
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      targetContainerId = overTask.sprintId
        ? `sprint-${overTask.sprintId}`
        : "backlog";
    }

    let newSprintId: string | null = null;
    if (targetContainerId === "backlog") {
      newSprintId = null;
    } else if (targetContainerId.startsWith("sprint-")) {
      newSprintId = targetContainerId.replace("sprint-", "");
    } else {
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.sprintId === newSprintId) return;

    // Optimistic update
    const queryKey = queryKeys.tasks.list(workspaceId);
    await queryClient.cancelQueries({ queryKey });

    const previousTasks = queryClient.getQueryData<Task[]>(queryKey);

    if (previousTasks) {
      queryClient.setQueryData<Task[]>(
        queryKey,
        previousTasks.map((t) =>
          t.id === taskId ? { ...t, sprintId: newSprintId } : t
        )
      );
    }

    try {
      await locusClient.tasks.update(taskId, workspaceId, {
        sprintId: newSprintId,
      });
      // Invalidate to ensure sync
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      // Rollback
      if (previousTasks) {
        queryClient.setQueryData(queryKey, previousTasks);
      }
      showToast.error(
        error instanceof Error ? error.message : "Failed to move task"
      );
    }
  };

  // Sprint actions
  const handleCreateSprint = async (name: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.create(workspaceId, { name });
      showToast.success("Sprint created");
      setIsSprintModalOpen(false);
      refetchSprints();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to create sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.start(sprintId, workspaceId);
      showToast.success("Sprint started");
      refetchSprints();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to start sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      setIsSubmitting(true);

      // Optimistic update
      const sprintKey = queryKeys.sprints.list(workspaceId);
      const previousSprints = queryClient.getQueryData<Sprint[]>(sprintKey);

      if (previousSprints) {
        queryClient.setQueryData<Sprint[]>(
          sprintKey,
          previousSprints.map((s) =>
            s.id === sprintId
              ? {
                  ...s,
                  status: SprintStatus.COMPLETED,
                  endDate: Date.now(),
                }
              : s
          )
        );
      }

      await locusClient.sprints.complete(sprintId, workspaceId);
      showToast.success("Sprint completed");

      // Full sync
      queryClient.invalidateQueries({ queryKey: sprintKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to complete sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.delete(sprintId, workspaceId);
      refetchSprints();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
      // Also refetch tasks because tasks from deleted sprint return to backlog
      refetchTasks();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await locusClient.tasks.delete(taskId, workspaceId);
      refetchTasks();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    }
  };

  const handleBulkMoveToSprint = async (taskIds: string[], sprintId: string) => {
    const tasksKey = queryKeys.tasks.list(workspaceId);
    const previousTasks = queryClient.getQueryData<Task[]>(tasksKey);

    try {
      setIsSubmitting(true);

      // Optimistic update
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          tasksKey,
          previousTasks.map((task) =>
            taskIds.includes(task.id) ? { ...task, sprintId } : task
          )
        );
      }

      // Execute all updates in parallel
      await Promise.all(
        taskIds.map((taskId) =>
          locusClient.tasks.update(taskId, workspaceId, { sprintId })
        )
      );

      showToast.success(
        `${taskIds.length} task${taskIds.length > 1 ? "s" : ""} moved to sprint`
      );

      // Full sync
      queryClient.invalidateQueries({ queryKey: tasksKey });
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to move tasks"
      );
      // Rollback on error
      if (previousTasks) {
        queryClient.setQueryData(tasksKey, previousTasks);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = tasksLoading || sprintsLoading;

  return {
    tasks,
    sprints,
    backlogTasks,
    activeSprint,
    plannedSprints,
    completedSprints,
    getSprintTasks,
    isLoading,
    isTaskModalOpen,
    setIsTaskModalOpen,
    isSprintModalOpen,
    setIsSprintModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    activeTask,
    collapsedSections,
    isSubmitting,
    sensors,
    toggleSection,
    handleDragStart,
    handleDragEnd,
    handleCreateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleDeleteTask,
    handleBulkMoveToSprint,
    refetchTasks,
    refetchSprints,
  };
}
