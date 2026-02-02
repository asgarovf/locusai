"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceIdOptional } from "./useWorkspaceId";

/**
 * Hook for managing manifest completion state.
 *
 * Provides reactive state for UI components to display manifest completion status,
 * including completion percentage and missing fields.
 *
 * Data is cached via React Query and can be invalidated after chat interactions.
 */
export function useManifestCompletion() {
  const workspaceId = useWorkspaceIdOptional();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: workspaceId
      ? queryKeys.workspaces.manifestStatus(workspaceId)
      : [],
    queryFn: () =>
      workspaceId
        ? locusClient.workspaces.getManifestStatus(workspaceId)
        : Promise.reject("No workspaceId"),
    enabled: !!workspaceId,
  });

  /**
   * Invalidate the manifest status cache.
   * Call this after chat interactions that may have updated the manifest.
   */
  const invalidate = useCallback(() => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.manifestStatus(workspaceId),
      });
    }
  }, [queryClient, workspaceId]);

  return {
    // Completion state
    isComplete: query.data?.isComplete ?? false,
    percentage: query.data?.percentage ?? 0,
    missingFields: query.data?.missingFields ?? [],
    filledFields: query.data?.filledFields ?? [],

    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Actions
    refetch: query.refetch,
    invalidate,
  };
}
