"use client";

import { type SaveAwsCredentialsInput } from "@locusai/sdk";
import { useQuery } from "@tanstack/react-query";
import { useMutationWithToast } from "./useMutationWithToast";
import { useWorkspaceIdOptional } from "./useWorkspaceId";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useAwsCredentialsQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.awsCredentials.detail(workspaceId)
      : [],
    queryFn: async () => {
      if (!workspaceId) return null;
      return locusClient.workspaces.getAwsCredentials(workspaceId);
    },
    enabled: !!workspaceId,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no credentials yet)
      if (error instanceof Error && error.name === "HTTP404") return false;
      return failureCount < 3;
    },
  });
}

export function useSaveAwsCredentials() {
  const workspaceId = useWorkspaceIdOptional();

  return useMutationWithToast<unknown, SaveAwsCredentialsInput>({
    mutationFn: (data) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return locusClient.workspaces.saveAwsCredentials(workspaceId, data);
    },
    successMessage: "AWS credentials saved successfully",
    invalidateKeys: workspaceId
      ? [queryKeys.awsCredentials.detail(workspaceId)]
      : [],
  });
}

export function useDeleteAwsCredentials() {
  const workspaceId = useWorkspaceIdOptional();

  return useMutationWithToast<void, void>({
    mutationFn: () => {
      if (!workspaceId) throw new Error("No workspace selected");
      return locusClient.workspaces.deleteAwsCredentials(workspaceId);
    },
    successMessage: "AWS credentials disconnected",
    invalidateKeys: workspaceId
      ? [queryKeys.awsCredentials.detail(workspaceId)]
      : [],
  });
}
