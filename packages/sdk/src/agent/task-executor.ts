import type { Task } from "@locusai/shared";
import type { AnthropicClient } from "../ai/anthropic-client.js";
import type { ClaudeRunner } from "../ai/claude-runner.js";
import { PromptBuilder } from "../core/prompt-builder.js";

export interface TaskExecutorDeps {
  anthropicClient: AnthropicClient | null;
  claudeRunner: ClaudeRunner;
  projectPath: string;
  sprintPlan: string | null;
  log: (message: string, level?: "info" | "success" | "warn" | "error") => void;
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
      let plan: string = "";

      if (this.deps.anthropicClient) {
        // Phase 1: Planning (using Anthropic SDK with caching)
        this.deps.log("Phase 1: Planning (Anthropic SDK)...", "info");

        // Build cacheable context blocks
        const cacheableContext: string[] = [basePrompt];

        plan = await this.deps.anthropicClient.run({
          systemPrompt:
            "You are an expert software engineer. Analyze the task carefully and create a detailed implementation plan.",
          cacheableContext,
          userPrompt:
            "## Phase 1: Planning\nAnalyze and create a detailed plan for THIS SPECIFIC TASK. Do NOT execute changes yet.",
        });
      } else {
        this.deps.log(
          "Skipping Phase 1: Planning (No Anthropic API Key)...",
          "info"
        );
      }

      // Phase 2: Execution (always using Claude CLI for agentic tools)
      this.deps.log("Starting Execution...", "info");

      let executionPrompt = basePrompt;
      if (plan) {
        executionPrompt += `\n\n## Phase 2: Execution\nBased on the plan, execute the task:\n\n${plan}`;
      } else {
        executionPrompt += `\n\n## Execution\nExecute the task directly.`;
      }

      executionPrompt += `\n\nWhen finished, output: <promise>COMPLETE</promise>`;
      const output = await this.deps.claudeRunner.run(executionPrompt);

      const success = output.includes("<promise>COMPLETE</promise>");

      return {
        success,
        summary: success
          ? "Task completed by Claude"
          : "Claude did not signal completion",
      };
    } catch (error) {
      return { success: false, summary: `Error: ${error}` };
    }
  }
}
