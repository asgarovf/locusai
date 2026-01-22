/**
 * Task Panel Data Hook
 *
 * Manages task fetching and basic mutations.
 */

"use client";

import { type Task } from "@locusai/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UseTaskDataProps {
  taskId: string;
  onUpdated?: () => void;
}

export interface TaskDataState {
  task: Task | undefined;
  isLoading: boolean;
  error: Error | null;
}

export interface TaskDataActions {
  refetchTask: () => Promise<void>;
  updateTask: (updates: Partial<Task> & { docIds?: string[] }) => Promise<void>;
  deleteTask: () => Promise<void>;
}

/**
 * Manage task data fetching and updates
 */
export function useTaskData({
  taskId,
  onUpdated,
}: UseTaskDataProps): TaskDataState & TaskDataActions {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  const {
    data: task,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => locusClient.tasks.getById(taskId, workspaceId),
    enabled: !!workspaceId,
  });

  const refetchTask = async () => {
    await refetch();
  };

  const updateTask = async (updates: Partial<Task> & { docIds?: string[] }) => {
    await locusClient.tasks.update(taskId, workspaceId, updates);
    queryClient.invalidateQueries({
      queryKey: queryKeys.tasks.detail(taskId),
    });
    onUpdated?.();
  };

  const deleteTask = async () => {
    await locusClient.tasks.delete(taskId, workspaceId);
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
  };

  return {
    task,
    isLoading,
    error: error as Error | null,
    refetchTask,
    updateTask,
    deleteTask,
  };
}
