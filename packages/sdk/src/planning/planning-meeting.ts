import { existsSync, readFileSync } from "node:fs";
import type { AiRunner } from "../ai/runner.js";
import { getLocusPath } from "../core/config.js";
import { KnowledgeBase } from "../project/knowledge-base.js";
import { buildArchitectPrompt } from "./agents/architect.js";
import { buildSprintOrganizerPrompt } from "./agents/sprint-organizer.js";
import { buildTechLeadPrompt } from "./agents/tech-lead.js";
import { parseSprintPlanFromAI, type SprintPlan } from "./sprint-plan.js";

export type PlanningPhase =
  | "tech-lead"
  | "architect"
  | "sprint-organizer"
  | "complete";

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
    techLead: string;
    architect: string;
    sprintOrganizer: string;
  };
}

/**
 * Orchestrates a multi-phase planning meeting where AI agent personas
 * collaborate to produce a sprint plan.
 *
 * Flow: CEO Directive → Tech Lead → Architect → Sprint Organizer → Sprint Plan
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
    const codebaseIndex = this.getCodebaseIndex();

    // Phase 1: Tech Lead
    this.log("Phase 1/3: Tech Lead analyzing directive...", "info");
    const techLeadPrompt = buildTechLeadPrompt({
      directive,
      projectContext,
      codebaseIndex,
      feedback,
    });
    const techLeadOutput = await this.aiRunner.run(techLeadPrompt);
    this.log("Tech Lead phase complete.", "success");

    // Phase 2: Architect
    this.log("Phase 2/3: Architect refining task breakdown...", "info");
    const architectPrompt = buildArchitectPrompt({
      directive,
      projectContext,
      techLeadOutput,
      feedback,
    });
    const architectOutput = await this.aiRunner.run(architectPrompt);
    this.log("Architect phase complete.", "success");

    // Phase 3: Sprint Organizer
    this.log("Phase 3/3: Sprint Organizer finalizing plan...", "info");
    const sprintOrganizerPrompt = buildSprintOrganizerPrompt({
      directive,
      architectOutput,
      feedback,
    });
    const sprintOrganizerOutput = await this.aiRunner.run(
      sprintOrganizerPrompt
    );
    this.log("Sprint Organizer phase complete.", "success");

    // Parse the final output into a SprintPlan
    const plan = parseSprintPlanFromAI(sprintOrganizerOutput, directive);

    if (feedback) {
      plan.feedback = feedback;
    }

    return {
      plan,
      phaseOutputs: {
        techLead: techLeadOutput,
        architect: architectOutput,
        sprintOrganizer: sprintOrganizerOutput,
      },
    };
  }

  private getProjectContext(): string {
    const kb = new KnowledgeBase(this.projectPath);
    return kb.getFullContext();
  }

  private getCodebaseIndex(): string {
    const indexPath = getLocusPath(this.projectPath, "indexFile");
    if (!existsSync(indexPath)) {
      return "";
    }

    try {
      const raw = readFileSync(indexPath, "utf-8");
      const index = JSON.parse(raw);

      // Build a compact summary from the index
      const parts: string[] = [];

      if (index.responsibilities) {
        parts.push("### File Responsibilities");
        const entries = Object.entries(index.responsibilities);
        // Limit to 50 entries to keep prompt size manageable
        for (const [file, summary] of entries.slice(0, 50)) {
          parts.push(`- \`${file}\`: ${summary}`);
        }
        if (entries.length > 50) {
          parts.push(`... and ${entries.length - 50} more files`);
        }
      }

      return parts.join("\n");
    } catch {
      return "";
    }
  }
}
