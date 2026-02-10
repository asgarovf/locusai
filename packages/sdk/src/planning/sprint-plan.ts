import {
  type AssigneeRole,
  type CreateTask,
  type TaskPriority,
  TaskStatus,
} from "@locusai/shared";

export interface PlannedTask {
  /** Sequential index within the plan (1-based) */
  index: number;
  title: string;
  description: string;
  assigneeRole: AssigneeRole;
  priority: TaskPriority;
  /** Relative complexity: 1 (trivial) to 5 (very complex) */
  complexity: number;
  acceptanceCriteria: string[];
  labels: string[];
}

export interface SprintPlanRisk {
  description: string;
  mitigation: string;
  severity: "low" | "medium" | "high";
}

export interface SprintPlan {
  id: string;
  name: string;
  goal: string;
  directive: string;
  tasks: PlannedTask[];
  risks: SprintPlanRisk[];
  estimatedDays: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Render a sprint plan as readable markdown for CEO review.
 */
export function sprintPlanToMarkdown(plan: SprintPlan): string {
  const lines: string[] = [];

  lines.push(`# Sprint Plan: ${plan.name}`);
  lines.push("");
  lines.push(`**Status:** ${plan.status.toUpperCase()}`);
  lines.push(`**Created:** ${plan.createdAt}`);
  lines.push(`**Estimated Duration:** ${plan.estimatedDays} day(s)`);
  lines.push("");
  lines.push(`## Goal`);
  lines.push(plan.goal);
  lines.push("");
  lines.push(`## CEO Directive`);
  lines.push(`> ${plan.directive}`);
  lines.push("");

  if (plan.feedback) {
    lines.push(`## CEO Feedback`);
    lines.push(`> ${plan.feedback}`);
    lines.push("");
  }

  lines.push(`## Tasks (${plan.tasks.length})`);
  lines.push("");

  for (const task of plan.tasks) {
    lines.push(`### ${task.index}. ${task.title}`);
    lines.push(`- **Role:** ${task.assigneeRole}`);
    lines.push(`- **Priority:** ${task.priority}`);
    lines.push(
      `- **Complexity:** ${"█".repeat(task.complexity)}${"░".repeat(
        5 - task.complexity
      )} (${task.complexity}/5)`
    );
    if (task.labels.length > 0) {
      lines.push(`- **Labels:** ${task.labels.join(", ")}`);
    }
    lines.push("");
    lines.push(task.description);
    lines.push("");
    if (task.acceptanceCriteria.length > 0) {
      lines.push(`**Acceptance Criteria:**`);
      for (const ac of task.acceptanceCriteria) {
        lines.push(`- [ ] ${ac}`);
      }
      lines.push("");
    }
  }

  if (plan.risks.length > 0) {
    lines.push(`## Risks`);
    lines.push("");
    for (const risk of plan.risks) {
      lines.push(`- **[${risk.severity.toUpperCase()}]** ${risk.description}`);
      lines.push(`  - Mitigation: ${risk.mitigation}`);
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`*Plan ID: ${plan.id}*`);

  return lines.join("\n");
}

/**
 * Convert planned tasks to API-ready CreateTask payloads.
 * Sets the `order` field based on plan index so dispatch respects the planned ordering.
 */
export function plannedTasksToCreatePayloads(
  plan: SprintPlan,
  sprintId: string
): CreateTask[] {
  return plan.tasks.map((task) => ({
    title: task.title,
    description: task.description,
    status: TaskStatus.BACKLOG,
    assigneeRole: task.assigneeRole,
    priority: task.priority,
    labels: task.labels,
    sprintId,
    order: task.index * 10,
    acceptanceChecklist: task.acceptanceCriteria.map((text, i) => ({
      id: `ac-${i + 1}`,
      text,
      done: false,
    })),
  }));
}

/**
 * Parse a sprint plan from a JSON string (as returned by AI).
 * Validates required fields, assigns defaults, and ensures tasks
 * are topologically sorted by their dependencies.
 */
export function parseSprintPlanFromAI(
  raw: string,
  directive: string
): SprintPlan {
  // Extract JSON from potential markdown code block
  let jsonStr = raw.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1]?.trim() || "";
  }

  const parsed = JSON.parse(jsonStr);

  const now = new Date().toISOString();
  const id = `plan-${Date.now()}`;

  const tasks: PlannedTask[] = (parsed.tasks || []).map(
    (t: Record<string, unknown>, i: number) => ({
      index: i + 1,
      title: (t.title as string) || `Task ${i + 1}`,
      description: (t.description as string) || "",
      assigneeRole: (t.assigneeRole as AssigneeRole) || "BACKEND",
      priority: (t.priority as TaskPriority) || "MEDIUM",
      complexity: (t.complexity as number) || 3,
      acceptanceCriteria: (t.acceptanceCriteria as string[]) || [],
      labels: (t.labels as string[]) || [],
    })
  );

  return {
    id,
    name: parsed.name || "Unnamed Sprint",
    goal: parsed.goal || directive,
    directive,
    tasks,
    risks: (parsed.risks || []).map((r: Record<string, unknown>) => ({
      description: (r.description as string) || "",
      mitigation: (r.mitigation as string) || "",
      severity: (r.severity as "low" | "medium" | "high") || "medium",
    })),
    estimatedDays: parsed.estimatedDays || 1,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

