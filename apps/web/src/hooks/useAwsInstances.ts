"use client";

import {
  type InstanceInfo,
  type UpdateApplyInfo,
  type UpdateCheckInfo,
} from "@locusai/sdk";
import { type InstanceAction, InstanceStatus } from "@locusai/shared";
import { useQuery } from "@tanstack/react-query";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useMutationWithToast } from "./useMutationWithToast";
import { useWorkspaceId } from "./useWorkspaceId";

export function useAwsInstances() {
  const workspaceId = useWorkspaceId();

  const query = useQuery({
    queryKey: queryKeys.awsInstances.list(workspaceId),
    queryFn: () => locusClient.instances.list(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: (query) => {
      const instances = query.state.data;
      if (!instances) return false;
      const hasProvisioning = instances.some(
        (i: InstanceInfo) => i.status === InstanceStatus.PROVISIONING
      );
      return hasProvisioning ? 30_000 : false;
    },
  });

  return query;
}

export function useAwsInstance(instanceId: string) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.awsInstances.detail(workspaceId, instanceId),
    queryFn: () => locusClient.instances.get(workspaceId, instanceId),
    enabled: !!workspaceId && !!instanceId,
  });
}

export function useProvisionInstance() {
  const workspaceId = useWorkspaceId();

  return useMutationWithToast<
    InstanceInfo,
    {
      repoUrl: string;
      githubToken: string;
      instanceType: string;
      integrations?: { name: string; config: Record<string, string> }[];
    }
  >({
    mutationFn: (data) =>
      locusClient.instances.provision(workspaceId, {
        repoUrl: data.repoUrl,
        githubToken: data.githubToken,
        instanceType: data.instanceType as
          | "t3.micro"
          | "t3.small"
          | "t3.medium",
        integrations: data.integrations ?? [],
      }),
    successMessage: "Instance provisioning started",
    invalidateKeys: [queryKeys.awsInstances.list(workspaceId)],
  });
}

export function useInstanceAction() {
  const workspaceId = useWorkspaceId();

  return useMutationWithToast<
    InstanceInfo,
    { instanceId: string; action: InstanceAction }
  >({
    mutationFn: ({ instanceId, action }) =>
      locusClient.instances.performAction(workspaceId, instanceId, action),
    successMessage: "Instance action performed",
    invalidateKeys: [queryKeys.awsInstances.list(workspaceId)],
  });
}

export function useSyncInstance() {
  const workspaceId = useWorkspaceId();

  return useMutationWithToast<InstanceInfo, { instanceId: string }>({
    mutationFn: ({ instanceId }) =>
      locusClient.instances.sync(workspaceId, instanceId),
    successMessage: "Instance status synced",
    invalidateKeys: [queryKeys.awsInstances.list(workspaceId)],
  });
}

export function useCheckUpdates(instanceId: string, enabled: boolean) {
  const workspaceId = useWorkspaceId();

  return useQuery<UpdateCheckInfo>({
    queryKey: queryKeys.awsInstances.updates(workspaceId, instanceId),
    queryFn: () => locusClient.instances.checkUpdates(workspaceId, instanceId),
    enabled: !!workspaceId && !!instanceId && enabled,
  });
}

export function useApplyUpdate() {
  const workspaceId = useWorkspaceId();

  return useMutationWithToast<UpdateApplyInfo, { instanceId: string }>({
    mutationFn: ({ instanceId }) =>
      locusClient.instances.applyUpdate(workspaceId, instanceId),
    successMessage: "Instance updated successfully",
    invalidateKeys: [
      queryKeys.awsInstances.list(workspaceId),
      queryKeys.awsInstances.all(),
    ],
  });
}
