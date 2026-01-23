"use client";

import { type Task } from "@locusai/shared";
import { useQuery } from "@tanstack/react-query";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceIdOptional } from "./useWorkspaceId";

/**
 * Tasks Query Hook
 * Centralizes task fetching logic.
 */
export function useTasksQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.list(workspaceId),
    queryFn: () =>
      workspaceId ? locusClient.tasks.list(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
    refetchInterval: 10_000,
  });
}

/**
 * Backlog Query Hook
 */
export function useBacklogQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.backlog(workspaceId),
    queryFn: () =>
      workspaceId
        ? locusClient.tasks.getBacklog(workspaceId)
        : Promise.resolve([]),
    enabled: !!workspaceId,
  });
}
