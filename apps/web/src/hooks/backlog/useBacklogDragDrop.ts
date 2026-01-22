/**
 * Backlog Drag & Drop Hook
 *
 * Handles drag and drop logic for task moving between sprints/backlog.
 */

"use client";

import {
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { type Task } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifications } from "@/services/notifications";

export interface BacklogDragDropActions {
  activeTask: Task | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

/**
 * Manage drag and drop operations for backlog tasks
 */
export function useBacklogDragDrop(tasks: Task[]): BacklogDragDropActions {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
      notifications.error(
        error instanceof Error ? error.message : "Failed to move task"
      );
    }
  };

  return {
    activeTask,
    sensors,
    handleDragStart,
    handleDragEnd,
  };
}
