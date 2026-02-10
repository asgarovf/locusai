import type { Task } from "@locusai/shared";
import { LogFn } from "../ai/factory.js";
import type { AiRunner } from "../ai/runner.js";
import { PromptBuilder } from "../core/prompt-builder.js";

export interface TaskExecutorDeps {
  aiRunner: AiRunner;
  projectPath: string;
  log: LogFn;
}

/**
 * Handles direct task execution (single-pass, no separate planning phase)
 */
export class TaskExecutor {
  private promptBuilder: PromptBuilder;

  constructor(private deps: TaskExecutorDeps) {
    this.promptBuilder = new PromptBuilder(deps.projectPath);
  }

  async execute(task: Task): Promise<{ success: boolean; summary: string }> {
    this.deps.log(`Executing: ${task.title}`, "info");

    const basePrompt = await this.promptBuilder.build(task);

    try {
      this.deps.log("Starting Execution...", "info");

      await this.deps.aiRunner.run(basePrompt);

      return {
        success: true,
        summary: "Task completed by the agent",
      };
    } catch (error) {
      return { success: false, summary: `Error: ${error}` };
    }
  }
}
