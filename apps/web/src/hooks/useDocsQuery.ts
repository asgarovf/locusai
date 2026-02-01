"use client";

import {
  type CreateDoc,
  type CreateDocGroup,
  type Doc,
  type DocGroup,
  type UpdateDoc,
} from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useWorkspaceId } from "./useWorkspaceId";

export function useDocsQuery() {
  const workspaceId = useWorkspaceId();

  return useQuery<Doc[]>({
    queryKey: queryKeys.docs.list(workspaceId),
    queryFn: () => locusClient.docs.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useDocGroupsQuery() {
  const workspaceId = useWorkspaceId();

  return useQuery<DocGroup[]>({
    queryKey: queryKeys.docGroups.list(workspaceId),
    queryFn: () => locusClient.docs.listGroups(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateDocMutation() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDoc) => locusClient.docs.create(workspaceId, data),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.docs.list(workspaceId),
      });
      queryClient.setQueryData(
        queryKeys.docs.detail(newDoc.id, workspaceId),
        newDoc
      );
    },
  });
}

export function useUpdateDocMutation() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDoc }) =>
      locusClient.docs.update(id, workspaceId, updates),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.docs.list(workspaceId),
      });
      queryClient.setQueryData(
        queryKeys.docs.detail(updatedDoc.id, workspaceId),
        updatedDoc
      );
    },
  });
}

export function useDeleteDocMutation() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locusClient.docs.delete(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.docs.list(workspaceId),
      });
    },
  });
}

export function useCreateDocGroupMutation() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocGroup) =>
      locusClient.docs.createGroup(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.docGroups.list(workspaceId),
      });
    },
  });
}

export function useUpdateDocGroupMutation() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      locusClient.docs.updateGroup(id, workspaceId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.docGroups.list(workspaceId),
      });
    },
  });
}

export function useDeleteDocGroupMutation() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locusClient.docs.deleteGroup(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.docGroups.list(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.docs.list(workspaceId),
      });
    },
  });
}
