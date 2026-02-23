import type { PlanManager, SprintPlan } from "@locusai/sdk/node";

export interface PlanSummary {
  id: string;
  name: string;
  status: string;
  taskCount: number;
  directive: string;
  createdAt: string;
  feedback?: string;
}

/**
 * List all plans with summary info.
 */
export function listPlans(
  manager: PlanManager,
  status?: SprintPlan["status"]
): PlanSummary[] {
  const plans = manager.list(status);
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    taskCount: p.tasks.length,
    directive: p.directive,
    createdAt: p.createdAt,
    feedback: p.feedback,
  }));
}

/**
 * Get plan markdown content. Returns null if not found.
 */
export function showPlan(
  manager: PlanManager,
  idOrSlug: string
): string | null {
  return manager.getMarkdown(idOrSlug);
}

/**
 * Cancel a plan by ID. Throws if not found.
 */
export function cancelPlan(manager: PlanManager, idOrSlug: string): void {
  manager.cancel(idOrSlug);
}

/**
 * Reject a plan with feedback. Throws if not found or not pending.
 * Returns the rejected plan.
 */
export function rejectPlan(
  manager: PlanManager,
  idOrSlug: string,
  feedback: string
): SprintPlan {
  return manager.reject(idOrSlug, feedback);
}
