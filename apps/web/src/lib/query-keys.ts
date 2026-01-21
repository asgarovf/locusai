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
};
