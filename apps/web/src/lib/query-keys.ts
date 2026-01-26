/**
 * Query Key Factory
 *
 * Centralizes all React Query keys to ensure consistent caching and invalidation.
 * Follows the pattern: [entity, scope, ...params]
 */

export const queryKeys = {
  workspaces: {
    all: () => ["workspaces"] as const,
    list: () => [...queryKeys.workspaces.all(), "list"] as const,
    detail: (id: string) =>
      [...queryKeys.workspaces.all(), "detail", id] as const,
    stats: (id: string) =>
      [...queryKeys.workspaces.all(), "stats", id] as const,
    activity: (id: string) =>
      [...queryKeys.workspaces.all(), "activity", id] as const,
  },
  tasks: {
    all: () => ["tasks"] as const,
    list: (workspaceId?: string | null) =>
      [
        ...queryKeys.tasks.all(),
        "list",
        { workspaceId: workspaceId ?? undefined },
      ] as const,
    detail: (id: string, workspaceId?: string) =>
      [...queryKeys.tasks.all(), "detail", id, { workspaceId }] as const,
    backlog: (workspaceId?: string | null) =>
      [
        ...queryKeys.tasks.all(),
        "backlog",
        { workspaceId: workspaceId ?? undefined },
      ] as const,
  },
  sprints: {
    all: () => ["sprints"] as const,
    list: (workspaceId?: string | null) =>
      [
        ...queryKeys.sprints.all(),
        "list",
        { workspaceId: workspaceId ?? undefined },
      ] as const,
    active: (workspaceId?: string | null) =>
      [
        ...queryKeys.sprints.all(),
        "active",
        { workspaceId: workspaceId ?? undefined },
      ] as const,
    detail: (id: string, workspaceId?: string) =>
      [...queryKeys.sprints.all(), "detail", id, { workspaceId }] as const,
  },
  docs: {
    all: () => ["docs"] as const,
    list: (workspaceId?: string | null) =>
      [
        ...queryKeys.docs.all(),
        "list",
        { workspaceId: workspaceId ?? undefined },
      ] as const,
    detail: (id: string, workspaceId?: string | null) =>
      [
        ...queryKeys.docs.all(),
        "detail",
        id,
        { workspaceId: workspaceId ?? undefined },
      ] as const,
  },
  docGroups: {
    all: () => ["doc-groups"] as const,
    list: (workspaceId?: string | null) =>
      [
        ...queryKeys.docGroups.all(),
        "list",
        { workspaceId: workspaceId ?? undefined },
      ] as const,
  },
  organizations: {
    all: () => ["organizations"] as const,
    list: () => [...queryKeys.organizations.all(), "list"] as const,
    detail: (id: string) =>
      [...queryKeys.organizations.all(), "detail", id] as const,
    members: (id: string) =>
      [...queryKeys.organizations.all(), "members", id] as const,
    apiKeys: (id: string) =>
      [...queryKeys.organizations.all(), "api-keys", id] as const,
  },
  invitations: {
    all: () => ["invitations"] as const,
    list: (orgId: string) =>
      [...queryKeys.invitations.all(), "list", orgId] as const,
  },
};
