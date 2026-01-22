/**
 * Backlog Actions Hook
 *
 * Handles API operations for sprints and tasks (create, start, complete, delete).
 */

"use client";

import { type Sprint, SprintStatus } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { notifications } from "@/services/notifications";

export interface BacklogActionsState {
  isSubmitting: boolean;
}

export interface BacklogActionsHandlers {
  handleCreateSprint: (name: string) => Promise<void>;
  handleStartSprint: (sprintId: string) => Promise<void>;
  handleCompleteSprint: (sprintId: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
}

interface BacklogActionsOptions {
  onSprintCreated?: () => void;
  onSprintStarted?: () => void;
  onSprintCompleted?: () => void;
  onTaskDeleted?: () => void;
}

/**
 * Manage backlog operations (sprint and task actions)
 */
export function useBacklogActions(
  options: BacklogActionsOptions = {}
): BacklogActionsState & BacklogActionsHandlers {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSprint = async (name: string) => {
    try {
      setIsSubmitting(true);
      await locusClient.sprints.create(workspaceId, { name });
      notifications.created("Sprint");
      options.onSprintCreated?.();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      notifications.error(
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
      notifications.success("Sprint started");
      options.onSprintStarted?.();
      queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.list(workspaceId),
      });
    } catch (error) {
      notifications.error(
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
      notifications.success("Sprint completed");
      options.onSprintCompleted?.();

      // Full sync
      queryClient.invalidateQueries({ queryKey: sprintKey });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to complete sprint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await locusClient.tasks.delete(taskId, workspaceId);
      notifications.deleted();
      options.onTaskDeleted?.();
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
    } catch (error) {
      notifications.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    }
  };

  return {
    isSubmitting,
    handleCreateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteTask,
  };
}
