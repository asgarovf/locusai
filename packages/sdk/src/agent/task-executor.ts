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

      const output = await this.deps.aiRunner.run(basePrompt);
      const summary = this.extractSummary(output);

      return { success: true, summary };
    } catch (error) {
      return { success: false, summary: `Error: ${error}` };
    }
  }

  /**
   * Extract a concise summary from the agent's raw output.
   * Takes the last non-empty paragraph, truncated to 500 chars.
   */
  private extractSummary(output: string): string {
    if (!output || !output.trim()) {
      return "Task completed by the agent";
    }

    const paragraphs = output
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      return "Task completed by the agent";
    }

    const last = paragraphs[paragraphs.length - 1];
    if (last.length > 500) {
      return `${last.slice(0, 497)}...`;
    }
    return last;
  }
}
