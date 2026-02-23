import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LogFn } from "../ai/factory.js";
import { noopLogger } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { getLocusPath } from "../core/config.js";
import { buildPlannerPrompt } from "./agents/planner.js";
import type { SprintPlan } from "./sprint-plan.js";

export interface PlanningMeetingConfig {
  projectPath: string;
  aiRunner: AiRunner;
  log?: LogFn;
}

export interface PlanningMeetingResult {
  plan: SprintPlan;
  /** Raw output from the planning team for debugging/transparency */
  rawOutput: string;
}

/**
 * Orchestrates a single-phase planning meeting where 3 AI team members
 * (Architect, Tech Lead, Sprint Organizer) collaborate in one pass
 * to produce a sprint plan.
 *
 * Flow: CEO Directive → Planning Team (Architect + Tech Lead + Sprint Organizer) → Sprint Plan
 */
export class PlanningMeeting {
  private projectPath: string;
  private aiRunner: AiRunner;
  private log: LogFn;

  constructor(config: PlanningMeetingConfig) {
    this.projectPath = config.projectPath;
    this.aiRunner = config.aiRunner;
    this.log = config.log ?? noopLogger;
  }

  /**
   * Run the planning meeting.
   *
   * The AI agent writes the plan JSON file directly to .locus/plans/
   * using its file writing tools. We then read it back from disk.
   */
  async run(
    directive: string,
    feedback?: string
  ): Promise<PlanningMeetingResult> {
    this.log("Planning sprint...", "info");

    const plansDir = getLocusPath(this.projectPath, "plansDir");

    // Ensure plans directory exists
    if (!existsSync(plansDir)) {
      mkdirSync(plansDir, { recursive: true });
    }

    const ts = Date.now();
    const planId = `plan-${ts}`;
    const fileName = `plan-${ts}`;

    const prompt = buildPlannerPrompt({
      directive,
      feedback,
      plansDir,
      planId,
      fileName,
    });

    const response = await this.aiRunner.run(prompt);

    this.log("Planning meeting complete.", "success");

    // Read the plan JSON file that the AI agent created
    const expectedPath = join(plansDir, `${fileName}.json`);
    let plan: SprintPlan | null = null;

    if (existsSync(expectedPath)) {
      try {
        plan = JSON.parse(readFileSync(expectedPath, "utf-8")) as SprintPlan;
      } catch {
        // JSON parse failed
      }
    }

    if (!plan) {
      throw new Error(
        "Planning agent did not create the expected plan JSON file. " +
          "Check the agent output for errors."
      );
    }

    if (feedback) {
      plan.feedback = feedback;
    }

    return {
      plan,
      rawOutput: response,
    };
  }
}
