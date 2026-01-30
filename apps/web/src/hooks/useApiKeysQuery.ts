import { useQuery } from "@tanstack/react-query";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceIdOptional } from "./useWorkspaceId";

export function useApiKeysQuery() {
  const workspaceId = useWorkspaceIdOptional();

  return useQuery({
    queryKey: workspaceId ? queryKeys.workspaces.apiKeys(workspaceId) : [],
    queryFn: async () => {
      if (!workspaceId) return [];
      return locusClient.workspaces.listApiKeys(workspaceId);
    },
    enabled: !!workspaceId,
  });
}
