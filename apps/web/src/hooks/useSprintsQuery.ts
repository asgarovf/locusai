"use client";

import { type Sprint } from "@locusai/shared";
import { useQuery } from "@tanstack/react-query";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceIdOptional } from "./useWorkspaceId";

/**
 * Sprints Query Hook
 * Centralizes sprint fetching logic.
 */
export function useSprintsQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery<Sprint[]>({
    queryKey: queryKeys.sprints.list(workspaceId),
    queryFn: () =>
      workspaceId ? locusClient.sprints.list(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
  });
}

/**
 * Active Sprint Query Hook
 */
export function useActiveSprintQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery<Sprint | null>({
    queryKey: queryKeys.sprints.active(workspaceId),
    queryFn: () =>
      workspaceId
        ? locusClient.sprints.getActive(workspaceId)
        : Promise.resolve(null),
    enabled: !!workspaceId,
  });
}
