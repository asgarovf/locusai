import type { Discussion, DiscussionManager } from "@locusai/sdk/node";

export interface DiscussionSummary {
  id: string;
  title: string;
  status: string;
  messageCount: number;
  insightCount: number;
  createdAt: string;
}

/**
 * List all discussions with summary info.
 */
export function listDiscussions(
  manager: DiscussionManager
): DiscussionSummary[] {
  const discussions = manager.list();
  return discussions.map((d: Discussion) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    messageCount: d.messages.length,
    insightCount: d.insights.length,
    createdAt: d.createdAt,
  }));
}

/**
 * Get discussion markdown content. Returns null if not found.
 */
export function showDiscussion(
  manager: DiscussionManager,
  id: string
): string | null {
  return manager.getMarkdown(id);
}

/**
 * Archive a discussion by ID. Throws if not found.
 */
export function archiveDiscussion(
  manager: DiscussionManager,
  id: string
): void {
  manager.archive(id);
}

/**
 * Delete a discussion by ID. Throws if not found.
 */
export function deleteDiscussion(manager: DiscussionManager, id: string): void {
  manager.delete(id);
}
