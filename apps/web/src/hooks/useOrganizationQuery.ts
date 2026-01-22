"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Organization Members Query Hook
 */
export function useOrganizationMembersQuery() {
  const { user } = useAuth();
  const orgId = user?.orgId;

  return useQuery({
    queryKey: orgId ? queryKeys.organizations.members(orgId) : [],
    queryFn: () =>
      orgId
        ? locusClient.organizations.listMembers(orgId)
        : Promise.resolve([]),
    enabled: !!orgId,
  });
}

/**
 * Invitations Query Hook
 */
export function useInvitationsQuery(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const orgId = user?.orgId;

  return useQuery({
    queryKey: orgId ? queryKeys.invitations.list(orgId) : [],
    queryFn: () =>
      orgId ? locusClient.invitations.list(orgId) : Promise.resolve([]),
    enabled: !!orgId && (options?.enabled ?? true),
  });
}

/**
 * Organization Detail Query Hook
 */
export function useOrganizationQuery() {
  const { user } = useAuth();
  const orgId = user?.orgId;

  return useQuery({
    queryKey: orgId ? queryKeys.organizations.detail(orgId) : [],
    queryFn: () =>
      orgId
        ? locusClient.organizations.getById(orgId)
        : Promise.reject("No orgId"),
    enabled: !!orgId,
  });
}
