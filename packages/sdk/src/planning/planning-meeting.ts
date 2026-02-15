import type { AiRunner } from "../ai/runner.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { buildCrossTaskReviewerPrompt } from "./agents/cross-task-reviewer.js";
import { buildPlannerPrompt } from "./agents/planner.js";
import { parseSprintPlanFromAI, type SprintPlan } from "./sprint-plan.js";

export type PlanningPhase = "planner" | "review" | "complete";

export interface PlanningMeetingConfig {
  projectPath: string;
  aiRunner: AiRunner;
  log?: (
    message: string,
    level?: "info" | "success" | "warn" | "error"
  ) => void;
}

export interface PlanningMeetingResult {
  plan: SprintPlan;
  /** Raw outputs from each phase for debugging/transparency */
  phaseOutputs: {
    planner: string;
    review: string;
  };
}

/**
 * Orchestrates a two-phase planning meeting where AI agent personas
 * collaborate to produce a sprint plan.
 *
 * Flow: CEO Directive → Planner → Cross-Task Review → Sprint Plan
 */
export class PlanningMeeting {
  private projectPath: string;
  private aiRunner: AiRunner;
  private log: (
    message: string,
    level?: "info" | "success" | "warn" | "error"
  ) => void;

  constructor(config: PlanningMeetingConfig) {
    this.projectPath = config.projectPath;
    this.aiRunner = config.aiRunner;
    this.log = config.log ?? ((_msg: string) => undefined);
  }

  /**
   * Run the full planning meeting pipeline.
   */
  async run(
    directive: string,
    feedback?: string
  ): Promise<PlanningMeetingResult> {
    const projectContext = this.getProjectContext();

    // Phase 1: Planner — produces complete sprint plan
    this.log("Phase 1/2: Planner building sprint plan...", "info");
    const plannerPrompt = buildPlannerPrompt({
      directive,
      projectContext,
      feedback,
    });
    const plannerOutput = await this.aiRunner.run(plannerPrompt);
    this.log("Planner phase complete.", "success");

    // Phase 2: Cross-Task Review — validates ordering, descriptions, scope
    this.log(
      "Phase 2/2: Reviewer checking for conflicts and quality...",
      "info"
    );
    const crossTaskReviewerPrompt = buildCrossTaskReviewerPrompt({
      directive,
      projectContext,
      plannerOutput,
      feedback,
    });
    const reviewOutput = await this.aiRunner.run(crossTaskReviewerPrompt);
    this.log("Review phase complete.", "success");

    // Parse the final output into a SprintPlan
    const plan = parseSprintPlanFromAI(reviewOutput, directive);

    if (feedback) {
      plan.feedback = feedback;
    }

    return {
      plan,
      phaseOutputs: {
        planner: plannerOutput,
        review: reviewOutput,
      },
    };
  }

  private getProjectContext(): string {
    const kb = new KnowledgeBase(this.projectPath);
    return kb.getFullContext();
  }

}
