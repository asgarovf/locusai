import {
  type AssigneeRole,
  type CreateTask,
  type TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import { z } from "zod";
import { parseJsonWithSchema } from "../utils/structured-output.js";

// ============================================================================
// Zod Schemas for LLM Output Parsing
// ============================================================================

const PlannedTaskSchema = z.object({
  title: z.string().default("Untitled Task"),
  description: z.string().default(""),
  assigneeRole: z
    .enum(["BACKEND", "FRONTEND", "QA", "PM", "DESIGN"])
    .default("BACKEND"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  complexity: z.number().min(1).max(5).default(3),
  acceptanceCriteria: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
});

const SprintPlanRiskSchema = z.object({
  description: z.string().default(""),
  mitigation: z.string().default(""),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});

/**
 * Schema for the raw LLM output from the planner agent.
 */
const PlannerOutputSchema = z.object({
  name: z.string().default("Unnamed Sprint"),
  goal: z.string().default(""),
  estimatedDays: z.number().default(1),
  tasks: z.array(PlannedTaskSchema).default([]),
  risks: z.array(SprintPlanRiskSchema).default([]),
});

/**
 * Schema for the cross-task reviewer output, which wraps the plan
 * inside a `revisedPlan` field alongside review metadata.
 */
const ReviewerOutputSchema = z.object({
  hasIssues: z.boolean().optional(),
  issues: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        affectedTasks: z.array(z.string()).optional(),
        resolution: z.string().optional(),
      })
    )
    .optional(),
  revisedPlan: PlannerOutputSchema,
});

/**
 * Combined schema that accepts either the reviewer format (with revisedPlan)
 * or a direct planner output. The discriminated union tries reviewer first
 * since that's the expected format from the full pipeline.
 */
const SprintPlanAIOutputSchema = z.union([
  ReviewerOutputSchema,
  PlannerOutputSchema,
]);

// ============================================================================
// TypeScript Interfaces (unchanged, remain the public API)
// ============================================================================

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

// ============================================================================
// Rendering & Conversion
// ============================================================================

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
  lines.push("_Tasks are executed sequentially in the order listed below._");
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

// ============================================================================
// AI Output Parsing (Zod-validated)
// ============================================================================

/**
 * Parse a sprint plan from raw LLM output text.
 *
 * Uses Zod schemas to validate the JSON structure instead of manual
 * type assertions. This provides:
 * - Clear error messages when the LLM produces malformed output
 * - Automatic defaults for missing fields
 * - Type-safe parsing without manual casting
 */
export function parseSprintPlanFromAI(
  raw: string,
  directive: string
): SprintPlan {
  const output = parseJsonWithSchema(raw, SprintPlanAIOutputSchema);

  // Extract the plan data — either from revisedPlan or from direct output
  const planData = "revisedPlan" in output ? output.revisedPlan : output;

  const now = new Date().toISOString();
  const id = `plan-${Date.now()}`;

  const tasks: PlannedTask[] = planData.tasks.map((t, i) => ({
    index: i + 1,
    title: t.title,
    description: t.description,
    assigneeRole: t.assigneeRole as AssigneeRole,
    priority: t.priority as TaskPriority,
    complexity: t.complexity,
    acceptanceCriteria: t.acceptanceCriteria,
    labels: t.labels,
  }));

  return {
    id,
    name: planData.name,
    goal: planData.goal || directive,
    directive,
    tasks,
    risks: planData.risks.map((r) => ({
      description: r.description,
      mitigation: r.mitigation,
      severity: r.severity,
    })),
    estimatedDays: planData.estimatedDays,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}
