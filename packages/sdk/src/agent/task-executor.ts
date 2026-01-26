import type { Task } from "@locusai/shared";
import { LogFn } from "src/ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { PromptBuilder } from "../core/prompt-builder.js";

export interface TaskExecutorDeps {
  aiRunner: AiRunner;
  projectPath: string;
  sprintPlan: string | null;
  skipPlanning?: boolean;
  log: LogFn;
}

/**
 * Handles task execution with two-phase approach (planning + execution)
 */
export class TaskExecutor {
  private promptBuilder: PromptBuilder;

  constructor(private deps: TaskExecutorDeps) {
    this.promptBuilder = new PromptBuilder(deps.projectPath);
  }

  updateSprintPlan(sprintPlan: string | null) {
    this.deps.sprintPlan = sprintPlan;
  }

  async execute(task: Task): Promise<{ success: boolean; summary: string }> {
    this.deps.log(`Executing: ${task.title}`, "info");
    let basePrompt = await this.promptBuilder.build(task);

    if (this.deps.sprintPlan) {
      basePrompt = `## Sprint Context\n${this.deps.sprintPlan}\n\n${basePrompt}`;
    }

    try {
      let plan: string | null = null;

      if (this.deps.skipPlanning) {
        this.deps.log("Skipping Phase 1: Planning (CLI)...", "info");
      } else {
        this.deps.log("Phase 1: Planning (CLI)...", "info");
        const planningPrompt = `${basePrompt}

## Phase 1: Planning
Analyze and create a detailed plan for THIS SPECIFIC TASK. Do NOT execute changes yet.`;

        plan = await this.deps.aiRunner.run(planningPrompt, true);
      }

      // Phase 2: Execution (always using the selected CLI)
      this.deps.log("Starting Execution...", "info");

      let executionPrompt = basePrompt;
      if (plan != null) {
        executionPrompt += `\n\n## Phase 2: Execution\nBased on the plan, execute the task:\n\n${plan}`;
      } else {
        executionPrompt += `\n\n## Execution\nExecute the task directly.`;
      }

      executionPrompt += `\n\nWhen finished, output: <promise>COMPLETE</promise>`;
      const output = await this.deps.aiRunner.run(executionPrompt);

      const success = output.includes("<promise>COMPLETE</promise>");

      return {
        success,
        summary: success
          ? "Task completed by the agent"
          : "The agent did not signal completion",
      };
    } catch (error) {
      return { success: false, summary: `Error: ${error}` };
    }
  }
}
