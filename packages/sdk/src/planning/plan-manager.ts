import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Sprint, Task } from "@locusai/shared";
import { getLocusPath } from "../core/config.js";
import type { LocusClient } from "../index.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import {
  plannedTasksToCreatePayloads,
  type SprintPlan,
  sprintPlanToMarkdown,
} from "./sprint-plan.js";

/**
 * Manages the lifecycle of sprint plans:
 * save, load, list, approve, reject, cancel.
 */
export class PlanManager {
  private plansDir: string;

  constructor(private projectPath: string) {
    this.plansDir = getLocusPath(projectPath, "plansDir");
  }

  /**
   * Save a sprint plan to disk as both JSON (for machine) and Markdown (for human).
   */
  save(plan: SprintPlan): string {
    this.ensurePlansDir();

    const slug = this.slugify(plan.name);
    const jsonPath = join(this.plansDir, `${slug}.json`);
    const mdPath = join(this.plansDir, `sprint-${slug}.md`);

    writeFileSync(jsonPath, JSON.stringify(plan, null, 2), "utf-8");
    writeFileSync(mdPath, sprintPlanToMarkdown(plan), "utf-8");

    return plan.id;
  }

  /**
   * Load a plan by ID or slug.
   */
  load(idOrSlug: string): SprintPlan | null {
    this.ensurePlansDir();

    const files = readdirSync(this.plansDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const filePath = join(this.plansDir, file);
      try {
        const plan = JSON.parse(readFileSync(filePath, "utf-8")) as SprintPlan;
        if (plan.id === idOrSlug || this.slugify(plan.name) === idOrSlug) {
          return plan;
        }
      } catch {
        // skip unparseable files
      }
    }

    return null;
  }

  /**
   * List all plans, optionally filtered by status.
   */
  list(status?: SprintPlan["status"]): SprintPlan[] {
    this.ensurePlansDir();

    const files = readdirSync(this.plansDir).filter((f) => f.endsWith(".json"));
    const plans: SprintPlan[] = [];

    for (const file of files) {
      try {
        const plan = JSON.parse(
          readFileSync(join(this.plansDir, file), "utf-8")
        ) as SprintPlan;
        if (!status || plan.status === status) {
          plans.push(plan);
        }
      } catch {
        // skip unparseable files
      }
    }

    // Sort by creation date, newest first
    plans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return plans;
  }

  /**
   * Approve a plan: create a sprint and tasks via the API.
   * Returns the created sprint and tasks.
   */
  async approve(
    idOrSlug: string,
    client: LocusClient,
    workspaceId: string
  ): Promise<{ sprint: Sprint; tasks: Task[] }> {
    const plan = this.load(idOrSlug);
    if (!plan) {
      throw new Error(`Plan not found: ${idOrSlug}`);
    }
    if (plan.status !== "pending") {
      throw new Error(
        `Plan "${plan.name}" is ${plan.status}, can only approve pending plans`
      );
    }

    // 1. Create sprint via API
    const sprint = await client.sprints.create(workspaceId, {
      name: plan.name,
    });

    // 2. Create tasks via API, preserving plan ordering
    const payloads = plannedTasksToCreatePayloads(plan, sprint.id);
    const tasks: Task[] = [];

    for (const payload of payloads) {
      const task = await client.tasks.create(workspaceId, payload);
      tasks.push(task);
    }

    // 3. Start the sprint
    await client.sprints.start(sprint.id, workspaceId);

    // 4. Update plan status
    plan.status = "approved";
    plan.updatedAt = new Date().toISOString();
    this.save(plan);

    // 5. Update progress.md
    const kb = new KnowledgeBase(this.projectPath);
    kb.updateProgress({
      type: "sprint_started",
      title: plan.name,
      details: `${tasks.length} tasks created from planning meeting. Sprint goal: ${plan.goal}`,
    });

    return { sprint, tasks };
  }

  /**
   * Reject a plan with feedback. The plan is marked as rejected
   * and the feedback is stored for re-planning.
   */
  reject(idOrSlug: string, feedback: string): SprintPlan {
    const plan = this.load(idOrSlug);
    if (!plan) {
      throw new Error(`Plan not found: ${idOrSlug}`);
    }
    if (plan.status !== "pending") {
      throw new Error(
        `Plan "${plan.name}" is ${plan.status}, can only reject pending plans`
      );
    }

    plan.status = "rejected";
    plan.feedback = feedback;
    plan.updatedAt = new Date().toISOString();
    this.save(plan);

    return plan;
  }

  /**
   * Cancel a plan. Removes it from the pending list.
   */
  cancel(idOrSlug: string): void {
    const plan = this.load(idOrSlug);
    if (!plan) {
      throw new Error(`Plan not found: ${idOrSlug}`);
    }

    plan.status = "cancelled";
    plan.updatedAt = new Date().toISOString();
    this.save(plan);
  }

  /**
   * Delete a plan's files entirely.
   */
  delete(idOrSlug: string): void {
    this.ensurePlansDir();

    const files = readdirSync(this.plansDir);

    for (const file of files) {
      const filePath = join(this.plansDir, file);
      if (!file.endsWith(".json")) continue;

      try {
        const plan = JSON.parse(readFileSync(filePath, "utf-8")) as SprintPlan;
        if (plan.id === idOrSlug || this.slugify(plan.name) === idOrSlug) {
          // Remove both JSON and MD files
          unlinkSync(filePath);
          const mdPath = join(
            this.plansDir,
            `sprint-${this.slugify(plan.name)}.md`
          );
          if (existsSync(mdPath)) {
            unlinkSync(mdPath);
          }
          return;
        }
      } catch {
        // skip unparseable files
      }
    }
  }

  /**
   * Get the markdown content of a plan for display.
   */
  getMarkdown(idOrSlug: string): string | null {
    const plan = this.load(idOrSlug);
    if (!plan) return null;
    return sprintPlanToMarkdown(plan);
  }

  private ensurePlansDir(): void {
    if (!existsSync(this.plansDir)) {
      mkdirSync(this.plansDir, { recursive: true });
    }
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
