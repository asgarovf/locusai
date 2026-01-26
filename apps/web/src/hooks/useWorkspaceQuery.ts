"use client";

import { useQuery } from "@tanstack/react-query";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceIdOptional } from "./useWorkspaceId";

/**
 * Workspace Detail Query Hook
 */
export function useWorkspaceQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery({
    queryKey: workspaceId ? queryKeys.workspaces.detail(workspaceId) : [],
    queryFn: () =>
      workspaceId
        ? locusClient.workspaces.getById(workspaceId)
        : Promise.reject("No workspaceId"),
    enabled: !!workspaceId,
  });
}
